import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/razorpay';
import { generateOrderNumber } from '@/lib/utils';
import { MOCK_PRODUCTS } from '@/lib/mockData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, customer, customerId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!customer?.fullName || !customer?.mobile || !customer?.whatsappNumber || !customer?.houseFlat || !customer?.streetArea || !customer?.city || !customer?.district || !customer?.state || !customer?.pincode) {
      return NextResponse.json({ error: 'Missing required customer delivery details' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    // 1. Fetch live product prices and verify stock from Supabase to prevent client-side tampering
    let validatedItems: Array<{
      productId: string;
      name: string;
      price: number;
      discountPrice: number | null;
      effectivePrice: number;
      quantity: number;
      subtotal: number;
    }> = [];

    let calculatedSubtotal = 0;

    for (const item of items) {
      let product = null;

      if (!isMock) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, discount_price, stock_quantity, status')
          .eq('id', item.productId)
          .single();

        if (!error && data) {
          product = data;
        }
      }

      // Fallback to mock product if offline/demo
      if (!product) {
        product = MOCK_PRODUCTS.find(p => p.id === item.productId);
      }

      if (!product) {
        return NextResponse.json({ error: `Product with ID ${item.productId} not found` }, { status: 404 });
      }

      if (product.status === 'out_of_stock' || product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}` },
          { status: 400 }
        );
      }

      const effectivePrice = Number(product.discount_price ?? product.price);
      const lineSubtotal = effectivePrice * item.quantity;
      calculatedSubtotal += lineSubtotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        discountPrice: product.discount_price ? Number(product.discount_price) : null,
        effectivePrice,
        quantity: item.quantity,
        subtotal: lineSubtotal,
      });
    }

    const deliveryCharge = calculatedSubtotal >= 999 ? 0 : 50;
    const totalAmount = calculatedSubtotal + deliveryCharge;
    const orderNumber = generateOrderNumber();

    let createdOrderId = 'ord-' + Date.now();

    // 2. Insert into Supabase Orders table with payment_status = 'pending'
    if (!isMock) {
      const fullAddress = `${customer.houseFlat}, ${customer.streetArea}`;
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            customer_id: customerId || null,
            customer_name: customer.fullName,
            phone: customer.mobile,
            whatsapp_number: customer.whatsappNumber,
            email: customer.email || null,
            address: fullAddress,
            city: customer.city,
            district: customer.district,
            state: customer.state,
            pincode: customer.pincode,
            landmark: customer.landmark || null,
            subtotal: calculatedSubtotal,
            delivery_charge: deliveryCharge,
            total_amount: totalAmount,
            payment_status: 'pending',
            order_status: 'pending',
          },
        ])
        .select('id')
        .single();

      if (orderError) {
        console.error('Supabase order creation error:', orderError);
        return NextResponse.json({ error: 'Failed to create order in database' }, { status: 500 });
      }

      createdOrderId = orderData.id;

      // Insert order items
      const orderItemsRows = validatedItems.map(item => ({
        order_id: createdOrderId,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        discount_price: item.discountPrice,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsError) {
        console.error('Supabase order items error:', itemsError);
      }
    }

    // 3. Create Razorpay Order
    const razorpay = getRazorpayClient();
    let razorpayOrderId = `order_mock_${Date.now()}`;
    let isLiveGateway = false;

    if (razorpay) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100), // in paise
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            supabase_order_id: createdOrderId,
            order_number: orderNumber,
          },
        });
        razorpayOrderId = rzpOrder.id;
        isLiveGateway = true;
      } catch (rzpErr: any) {
        console.warn('Razorpay order creation fallback:', rzpErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrderId,
      orderNumber,
      razorpayOrderId,
      amount: totalAmount,
      amountPaise: Math.round(totalAmount * 100),
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_PAYMENT_KEY_ID || 'rzp_test_placeholder',
      isLiveGateway,
      customer: {
        name: customer.fullName,
        email: customer.email || '',
        contact: customer.mobile,
      },
    });
  } catch (err: any) {
    console.error('Error in create-order API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
