export type UserRole = 'customer' | 'admin';

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  category_id: string | null;
  stock_quantity: number;
  sku: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  images?: ProductImage[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  discount_price: number | null;
  subtotal: number;
  created_at: string;
  product?: Product | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  whatsapp_number: string;
  email: string | null;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string | null;
  subtotal: number;
  checkout_charge?: number;
  delivery_charge: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface Payment {
  id: string;
  order_id: string;
  payment_gateway: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerCheckoutForm {
  fullName: string;
  mobile: string;
  whatsappNumber: string;
  email?: string;
  houseFlat: string;
  streetArea: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
}
