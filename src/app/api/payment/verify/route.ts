import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { MOCK_ORDERS } from '@/lib/mockData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isDemoPayment,
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const isLiveGateway = !isDemoPayment && Boolean(process.env.PAYMENT_KEY_SECRET && process.env.PAYMENT_KEY_SECRET !== 'placeholder_secret');

    // 1. Server-side payment verification
    if (isLiveGateway) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment signature details' }, { status: 400 });
      }

      const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        // Mark order as cancelled in database (orders_status_check allows 'pending', 'paid', 'cancelled')
        if (!isMock) {
          const supabase = getAdminClient();
          await supabase
            .from('orders')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        }
        return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
      }
    }

    const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;

    // 2. Update Supabase order, payments table, and stock atomically
    if (!isMock) {
      const supabase = getAdminClient();

      // Fetch existing order details
      const { data: orderData, error: orderFetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderFetchErr || !orderData) {
        console.error('Order not found during payment verification:', orderFetchErr);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Preserve all existing notes data (customer address, name, phone, etc.)
      let notesObj: Record<string, any> = {};
      if (orderData.notes) {
        try {
          notesObj = JSON.parse(orderData.notes);
        } catch {
          notesObj = { note: orderData.notes };
        }
      }
      notesObj.payment_id = paymentId;
      notesObj.paid_at = new Date().toISOString();
      if (razorpay_order_id) notesObj.razorpay_order_id = razorpay_order_id;

      // Mark order as paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid', // Allowed by orders_status_check
          notes: JSON.stringify(notesObj),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order to paid:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Record in payments table with status = 'succeeded' (allowed by payments_status_check)
      const totalCents = typeof orderData.total_cents === 'number'
        ? orderData.total_cents
        : Math.round((orderData.total_amount || 0) * 100);

      const { error: paymentInsertErr } = await supabase.from('payments').insert([
        {
          order_id: orderId,
          provider: 'razorpay',
          provider_payment_id: paymentId,
          amount_cents: totalCents,
          currency: orderData.currency || 'INR',
          status: 'succeeded',
          paid_at: new Date().toISOString(),
        },
      ]);

      if (paymentInsertErr) {
        console.warn('Payment record insertion notice:', paymentInsertErr.message);
      }

      // Safely decrement product stock
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (orderItems && Array.isArray(orderItems)) {
        for (const item of orderItems) {
          if (item.product_id && item.quantity > 0) {
            const { data: prod } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            if (prod && typeof prod.stock_quantity === 'number') {
              const newStock = Math.max(0, prod.stock_quantity - item.quantity);
              await supabase
                .from('products')
                .update({
                  stock_quantity: newStock,
                  is_active: newStock > 0,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.product_id);
            }
          }
        }
      }
    } else {
      // Mock order update
      const existing = MOCK_ORDERS.find(o => o.id === orderId || o.order_number === orderNumber);
      if (existing) {
        existing.payment_status = 'paid';
        existing.order_status = 'paid';
        existing.payment_id = paymentId;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      orderId,
      orderNumber,
      paymentId,
    });
  } catch (err: any) {
    console.error('Error in verify payment API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
