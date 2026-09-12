import Razorpay from 'razorpay';
import crypto from 'crypto';

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.NEXT_PUBLIC_PAYMENT_KEY_ID;
  const key_secret = process.env.PAYMENT_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes('placeholder')) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Validates the HMAC SHA256 signature returned by Razorpay Standard Checkout
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const key_secret = process.env.PAYMENT_KEY_SECRET;
  if (!key_secret) return false;

  // Handle mock/demo bypass in local test environment if explicitly flagged
  if (key_secret === 'placeholder_secret' && signature === 'mock_signature_valid') {
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}
