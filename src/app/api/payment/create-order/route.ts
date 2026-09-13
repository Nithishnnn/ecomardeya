import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/razorpay';
import { generateOrderNumber } from '@/lib/utils';
import { MOCK_PRODUCTS } from '@/lib/mockData';
import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, customer, customerId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (
      !customer?.fullName ||
      !customer?.mobile ||
      !customer?.whatsappNumber ||
      !customer?.houseFlat ||
      !customer?.streetArea ||
      !customer?.city ||
      !customer?.district ||
      !customer?.state ||
      !customer?.pincode
    ) {
      return NextResponse.json({ error: 'Missing required customer delivery details' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    // 1. Profile & Authentication Verification
    let validProfileId: string | null = null;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!isMock) {
      let resolvedUserId: string | null = null;

      // If token provided, verify authenticated customer session
      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authClient = createClient(supabaseUrl, anonKey);
        const { data: userData, error: userError } = await authClient.auth.getUser(token);
        if (!userError && userData?.user) {
          resolvedUserId = userData.user.id;
        }
      }

      // If no token but valid customerId provided, verify in auth.users
      if (!resolvedUserId && customerId && typeof customerId === 'string' && UUID_REGEX.test(customerId)) {
        const { data: authUserData } = await supabase.auth.admin.getUserById(customerId);
        if (authUserData?.user) {
          resolvedUserId = authUserData.user.id;
        }
      }

      // Ensure profile exists in public.profiles to satisfy orders_profile_id_fkey
      if (resolvedUserId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', resolvedUserId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileUpsertErr } = await supabase.from('profiles').upsert(
            {
              id: resolvedUserId,
              full_name: customer.fullName || 'Customer',
              role: 'customer',
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );

          if (profileUpsertErr) {
            console.warn('Profile auto-creation warning:', profileUpsertErr.message);
          }
        }

        validProfileId = resolvedUserId;
      }
    }

    // 2. Fetch live product prices & verify stock from Supabase to prevent client tampering
    const validatedItems: Array<{
      productId: string;
      name: string;
      unitPriceCents: number;
      quantity: number;
      totalPriceCents: number;
    }> = [];

    let calculatedSubtotalCents = 0;

    for (const item of items) {
      let product: {
        id: string;
        name: string;
        priceCents: number;
        stockQuantity: number;
        isActive: boolean;
      } | null = null;

      if (!isMock) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price_cents, stock_quantity, is_active')
          .eq('id', item.productId)
          .single();

        if (!error && data) {
          product = {
            id: data.id,
            name: data.name,
            priceCents: typeof data.price_cents === 'number' ? data.price_cents : 0,
            stockQuantity: data.stock_quantity ?? 0,
            isActive: Boolean(data.is_active),
          };
        }
      }

      // Fallback to mock product if offline/demo
      if (!product) {
        const mockP = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        if (mockP) {
          product = {
            id: mockP.id,
            name: mockP.name,
            priceCents: Math.round(Number(mockP.price) * 100),
            stockQuantity: mockP.stock_quantity ?? 0,
            isActive: mockP.status === 'active',
          };
        }
      }

      if (!product) {
        return NextResponse.json({ error: `Product with ID ${item.productId} not found` }, { status: 404 });
      }

      if (!product.isActive || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }

      const unitPriceCents = product.priceCents;
      const lineTotalCents = unitPriceCents * item.quantity;
      calculatedSubtotalCents += lineTotalCents;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        unitPriceCents,
        quantity: item.quantity,
        totalPriceCents: lineTotalCents,
      });
    }

    // 3. Integer paise calculations
    // Free delivery if subtotal >= ₹999 (99900 paise), else ₹50 (5000 paise)
    const shippingCents = calculatedSubtotalCents >= 99900 ? 0 : 5000;

    // 3.5% Customer Checkout Charge in paise
    const checkoutChargeCents = Math.round(calculatedSubtotalCents * 0.035);

    // Final total in paise
    const totalCents = calculatedSubtotalCents + shippingCents + checkoutChargeCents;

    const orderNumber = generateOrderNumber();
    let createdOrderId = 'ord-' + Date.now();

    // 4. Insert into Supabase public.orders
    if (!isMock) {
      const fullAddress = `${customer.houseFlat}, ${customer.streetArea}`;
      const orderNotes = JSON.stringify({
        order_number: orderNumber,
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
        subtotal_cents: calculatedSubtotalCents,
        checkout_charge_cents: checkoutChargeCents,
        delivery_charge_cents: shippingCents,
        total_cents: totalCents,
      });

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            profile_id: validProfileId,
            status: 'pending',
            currency: 'INR',
            subtotal_cents: calculatedSubtotalCents,
            tax_cents: checkoutChargeCents, // 3.5% checkout charge stored in tax_cents
            shipping_cents: shippingCents,
            total_cents: totalCents,
            notes: orderNotes,
          },
        ])
        .select('id')
        .single();

      if (orderError) {
        console.error('Supabase order creation error:', {
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
        });
        return NextResponse.json(
          {
            error: 'Unable to create your order. Please try again.',
            debug: process.env.NODE_ENV === 'development' ? orderError.message : undefined,
          },
          { status: 500 }
        );
      }

      createdOrderId = orderData.id;

      // 5. Insert order items into public.order_items
      const orderItemsRows = validatedItems.map((item) => ({
        order_id: createdOrderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
        total_price_cents: item.totalPriceCents,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsRows);
      if (itemsError) {
        console.error('Supabase order items error:', {
          code: itemsError.code,
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
        });
        // Rollback pending order to maintain database integrity
        await supabase.from('orders').delete().eq('id', createdOrderId);
        return NextResponse.json({ error: 'Unable to save order items. Please try again.' }, { status: 500 });
      }
    }

    // 6. Create Razorpay Order with FINAL total in paise
    const razorpay = getRazorpayClient();
    let razorpayOrderId = `order_mock_${Date.now()}`;
    let isLiveGateway = false;

    if (razorpay) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: totalCents, // in paise! (e.g. ₹1035 -> 103500)
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
      amount: totalCents / 100,
      amountPaise: totalCents,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_PAYMENT_KEY_ID || 'rzp_test_placeholder',
      isLiveGateway,
      customer: {
        name: customer.fullName,
        email: customer.email || '',
        contact: customer.mobile,
      },
      breakdown: {
        subtotal: calculatedSubtotalCents / 100,
        checkoutCharge: checkoutChargeCents / 100,
        deliveryCharge: shippingCents / 100,
        total: totalCents / 100,
      },
    });
  } catch (err: any) {
    console.error('Error in create-order API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
