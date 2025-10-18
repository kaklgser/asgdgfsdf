// supabase/functions/create-order/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Razorpay from 'https://esm.sh/razorpay@2.9.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateOrderRequest {
  planId: string;
  amount: number; // Amount in paise
  couponCode?: string;
  walletDeduction?: number; // Amount in paise
  addOnsTotal?: number; // Amount in paise
  selectedAddOns?: { [key: string]: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { planId, amount, couponCode, walletDeduction, addOnsTotal, selectedAddOns }: CreateOrderRequest = await req.json();

    console.log('create-order: Received request:', { planId, amount, couponCode, walletDeduction, addOnsTotal, selectedAddOns });

    if (!planId || amount === undefined) {
      throw new Error('Missing required fields: planId and amount');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing.');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized: Invalid user token.');
    }

    console.log('create-order: Authenticated user:', user.id);

    // ✅ NEW: Enhanced coupon validation with special handling for DIWALI
    if (couponCode) {
      console.log('create-order: Validating coupon code:', couponCode);
      
      // Check if coupon has been used before by this user
      const { count, error: couponUsageError } = await supabase
        .from('payment_transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('coupon_code', couponCode.toLowerCase())
        .in('status', ['success', 'pending']);

      if (couponUsageError) {
        console.error('create-order: Error checking coupon usage:', couponUsageError);
        throw new Error('Failed to verify coupon usage.');
      }

      const isUsed = count && count > 0;

      if (isUsed) {
        // ✅ UPDATED: Special message for DIWALI coupon
        if (couponCode.toLowerCase() === 'diwali') {
          throw new Error('You have already redeemed your Diwali 90% OFF coupon. Each user can use this offer only once.');
        }
        throw new Error(`Coupon "${couponCode}" has already been used by this account.`);
      }

      // ✅ NEW: Check IP-based restriction for DIWALI coupon
      if (couponCode.toLowerCase() === 'diwali') {
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';
        console.log('create-order: Checking IP restriction for DIWALI coupon. IP:', clientIP);

        const { count: ipCount, error: ipError } = await supabase
          .from('ip_coupon_usage')
          .select('id', { count: 'exact' })
          .eq('ip_address', clientIP)
          .eq('coupon_code', 'diwali');

        if (ipError) {
          console.error('create-order: Error checking IP coupon usage:', ipError);
        } else if (ipCount && ipCount > 0) {
          throw new Error('This Diwali offer has already been claimed from your network. Each household/IP can use it only once.');
        }
      }

      console.log('create-order: Coupon validation passed for:', couponCode);
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials are not configured.');
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const orderOptions = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    console.log('create-order: Creating Razorpay order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);

    console.log('create-order: Razorpay order created:', order.id);

    const purchaseType = planId === 'addon_only_purchase' 
      ? 'addon_only' 
      : (selectedAddOns && Object.keys(selectedAddOns).length > 0 ? 'plan_with_addons' : 'plan');

    // Calculate discount amount based on original price minus final amount
    let discountAmount = 0;
    if (couponCode) {
      // ✅ UPDATED: Calculate discount for DIWALI (90%) and other coupons
      if (couponCode.toLowerCase() === 'diwali') {
        // For DIWALI, the discount should be 90% of the plan price (before wallet deduction)
        // Amount received here is already after coupon discount
        // So we need to reverse-calculate the original price
        // If final amount = original * 0.1, then original = final / 0.1
        const originalPlanPrice = amount / 0.1;
        discountAmount = Math.floor(originalPlanPrice * 0.9);
        console.log('create-order: DIWALI coupon - Original:', originalPlanPrice, 'Discount:', discountAmount, 'Final:', amount);
      }
      // Add logic for other coupons if needed
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        plan_id: planId === 'addon_only_purchase' ? null : planId,
        status: 'pending',
        amount: amount + (discountAmount || 0) + (walletDeduction || 0), // Original amount before discounts
        currency: 'INR',
        order_id: order.id,
        coupon_code: couponCode?.toLowerCase() || null,
        discount_amount: discountAmount || 0,
        final_amount: amount,
        purchase_type: purchaseType,
        wallet_deduction_amount: walletDeduction || 0,
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('create-order: Error inserting payment transaction:', transactionError);
      throw new Error('Failed to create payment transaction record.');
    }

    const transactionId = transaction.id;
    console.log('create-order: Payment transaction created with ID:', transactionId);

    // ✅ NEW: Record IP usage for DIWALI coupon
    if (couponCode?.toLowerCase() === 'diwali') {
      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0';
      
      const { error: ipRecordError } = await supabase
        .from('ip_coupon_usage')
        .insert({
          ip_address: clientIP,
          coupon_code: 'diwali',
          user_id: user.id,
        });

      if (ipRecordError) {
        console.error('create-order: Error recording IP coupon usage:', ipRecordError);
        // Don't throw error here, just log it
      } else {
        console.log('create-order: IP coupon usage recorded for DIWALI');
      }
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
        transactionId: transactionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('create-order: Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
