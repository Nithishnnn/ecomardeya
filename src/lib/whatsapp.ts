import { Order, OrderItem, Product } from './types';
import { formatCurrency } from './utils';

export function getBusinessWhatsAppNumber(): string {
  const num = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP_NUMBER || process.env.BUSINESS_WHATSAPP_NUMBER || '919498109777';
  return num.replace(/[^0-9]/g, '');
}

/**
 * Creates the exact WhatsApp order notification message format requested:
 * New Order
 * Order ID: [ORDER_ID]
 * Customer Name: [CUSTOMER_NAME]
 * Mobile: [MOBILE]
 * Product: [PRODUCT_NAME]
 * Quantity: [QUANTITY]
 * Total: ₹[TOTAL]
 * Payment: [PAYMENT_STATUS]
 * Delivery Address:
 * [ADDRESS]
 */
export function buildOrderWhatsAppMessage(order: Order, items?: OrderItem[]): string {
  const productNames = items && items.length > 0 
    ? items.map(item => `${item.product_name} (x${item.quantity})`).join(', ')
    : 'Store Items';

  const totalQuantity = items && items.length > 0
    ? items.reduce((acc, item) => acc + item.quantity, 0)
    : 1;

  const fullAddress = `${order.address}, ${order.city}, ${order.district}, ${order.state} - ${order.pincode}${order.landmark ? ` (Landmark: ${order.landmark})` : ''}`;

  return [
    `*New Order*`,
    ``,
    `*Order ID:* ${order.order_number}`,
    `*Customer Name:* ${order.customer_name}`,
    `*Mobile:* ${order.phone}`,
    `*Product:* ${productNames}`,
    `*Quantity:* ${totalQuantity}`,
    `*Total:* ${formatCurrency(order.total_amount)}`,
    `*Payment:* ${order.payment_status.toUpperCase()}`,
    ``,
    `*Delivery Address:*`,
    fullAddress
  ].join('\n');
}

export function createOrderWhatsAppUrl(order: Order, items?: OrderItem[]): string {
  const phone = getBusinessWhatsAppNumber();
  const text = encodeURIComponent(buildOrderWhatsAppMessage(order, items));
  return `https://wa.me/${phone}?text=${text}`;
}

export function createProductEnquiryWhatsAppUrl(product: Product, currentUrl?: string): string {
  const phone = getBusinessWhatsAppNumber();
  const price = formatCurrency(product.discount_price || product.price);
  const text = encodeURIComponent(
    `Hello! I am interested in purchasing:\n*${product.name}*\nPrice: ${price}\nSKU: ${product.sku || 'N/A'}${currentUrl ? `\nLink: ${currentUrl}` : ''}\n\nCould you please share more details?`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export function createGeneralWhatsAppUrl(customMessage?: string): string {
  const phone = getBusinessWhatsAppNumber();
  const text = encodeURIComponent(
    customMessage || `Hello! I would like to enquire about your products and services.`
  );
  return `https://wa.me/${phone}?text=${text}`;
}
