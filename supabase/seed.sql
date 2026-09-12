-- ==============================================================================
-- SUPABASE SEED DATA
-- Populate sample categories and initial premium products
-- ==============================================================================

-- 1. Sample Categories
INSERT INTO public.categories (id, name, slug, description)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'Apparel & Fashion', 'apparel-fashion', 'Premium crafted clothing, t-shirts, and everyday casual wear.'),
    ('c2222222-2222-2222-2222-222222222222', 'Electronics & Audio', 'electronics-audio', 'High performance wireless audio, accessories and modern tech.'),
    ('c3333333-3333-3333-3333-333333333333', 'Footwear', 'footwear', 'Ergonomic, comfortable and durable sneakers and footwear.'),
    ('c4444444-4444-4444-4444-444444444444', 'Accessories', 'accessories', 'Luxury leather goods, backpacks, sunglasses, and minimal watches.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Sample Products
INSERT INTO public.products (id, name, slug, description, price, discount_price, category_id, stock_quantity, sku, status)
VALUES
    (
        'p1111111-1111-1111-1111-111111111111',
        'Supima Cotton Heavyweight Oversized T-Shirt',
        'supima-cotton-heavyweight-oversized-t-shirt',
        'Engineered from 100% long-staple Supima cotton with a substantial 240 GSM drape. Pre-shrunk, breathable, and designed with a relaxed dropped-shoulder silhouette.',
        999.00,
        799.00,
        'c1111111-1111-1111-1111-111111111111',
        45,
        'APP-TEE-001',
        'active'
    ),
    (
        'p2222222-2222-2222-2222-222222222222',
        'AeroBass Pro Wireless Noise Cancelling Earbuds',
        'aerobass-pro-wireless-noise-cancelling-earbuds',
        'Immersive 42dB Hybrid Active Noise Cancellation, custom 11mm beryllium drivers, 36-hour total battery endurance, and IPX5 sweat resistance.',
        2999.00,
        2499.00,
        'c2222222-2222-2222-2222-222222222222',
        28,
        'ELE-EAR-002',
        'active'
    ),
    (
        'p3333333-3333-3333-3333-333333333333',
        'StrideMesh Ultra Lightweight Running Shoes',
        'stridemesh-ultra-lightweight-running-shoes',
        'Responsive EVA cushioning coupled with high-grip thermoplastic rubber soles. Breathable engineered mesh upper keeps your feet cool across long runs.',
        3499.00,
        2899.00,
        'c3333333-3333-3333-3333-333333333333',
        18,
        'FW-RUN-003',
        'active'
    ),
    (
        'p4444444-4444-4444-4444-444444444444',
        'Handcrafted Full Grain Leather Minimalist Wallet',
        'handcrafted-full-grain-leather-minimalist-wallet',
        'Artisan vegetable-tanned full-grain leather with RFID shielding. Holds up to 10 cards and folded currency without unnecessary bulk.',
        1299.00,
        899.00,
        'c4444444-4444-4444-4444-444444444444',
        60,
        'ACC-WAL-004',
        'active'
    ),
    (
        'p5555555-5555-5555-5555-555555555555',
        'Monochrome Everyday Commuter Canvas Backpack',
        'monochrome-everyday-commuter-canvas-backpack',
        'Water-repellent 900D coated canvas, dedicated 16-inch padded laptop sleeve, quick-access passport pocket, and contoured lumbar support.',
        2499.00,
        1899.00,
        'c4444444-4444-4444-4444-444444444444',
        12,
        'ACC-BPK-005',
        'active'
    ),
    (
        'p6666666-6666-6666-6666-666666666666',
        'Polarized Titanium Aviator Sunglasses',
        'polarized-titanium-aviator-sunglasses',
        'Ultra-light aerospace titanium frames with polarized UV400 lenses. Glare-free optical clarity and corrosion-resistant hinge mechanism.',
        1999.00,
        1499.00,
        'c4444444-4444-4444-4444-444444444444',
        0,
        'ACC-SUN-006',
        'out_of_stock'
    )
ON CONFLICT (slug) DO NOTHING;

-- 3. Product Images
INSERT INTO public.product_images (product_id, image_url, storage_path, is_primary, display_order)
VALUES
    (
        'p1111111-1111-1111-1111-111111111111',
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
        'seed/tshirt_front.jpg',
        true,
        1
    ),
    (
        'p1111111-1111-1111-1111-111111111111',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80',
        'seed/tshirt_model.jpg',
        false,
        2
    ),
    (
        'p2222222-2222-2222-2222-222222222222',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80',
        'seed/earbuds_front.jpg',
        true,
        1
    ),
    (
        'p3333333-3333-3333-3333-333333333333',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
        'seed/shoes_red.jpg',
        true,
        1
    ),
    (
        'p4444444-4444-4444-4444-444444444444',
        'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1000&q=80',
        'seed/wallet_brown.jpg',
        true,
        1
    ),
    (
        'p5555555-5555-5555-5555-555555555555',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80',
        'seed/backpack_dark.jpg',
        true,
        1
    ),
    (
        'p6666666-6666-6666-6666-666666666666',
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
        'seed/sunglasses_black.jpg',
        true,
        1
    );
