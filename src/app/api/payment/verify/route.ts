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
        // Mark payment as failed in database
        if (!isMock) {
          const supabase = getAdminClient();
          await supabase
            .from('orders')
            .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        }
        return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
      }
    }

    const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;

    // 2. Update Supabase order and stock atomically
    if (!isMock) {
      const supabase = getAdminClient();

      // Fetch order total for payment record
      const { data: orderData } = await supabase
        .from('orders')
        .select('total_amount, order_number')
        .eq('id', orderId)
        .single();

      // Mark order as paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'paid',
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order to paid:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Record in payments table
      if (orderData) {
        await supabase.from('payments').insert([
          {
            order_id: orderId,
            payment_gateway: 'razorpay',
            payment_id: paymentId,
            amount: orderData.total_amount,
            currency: 'INR',
            status: 'paid',
          },
        ]);
      }

      // Safely decrement product stock using PostgreSQL RPC (with row-level lock)
      const { error: rpcError } = await supabase.rpc('decrease_stock_for_order', {
        p_order_id: orderId,
      });

      if (rpcError) {
        console.warn('RPC decrease_stock_for_order notice/error:', rpcError.message);
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
