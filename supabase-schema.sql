Terminer le programme de commandes (O/N)-- =============================================
-- YURIVA — Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  banner_url TEXT,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  details TEXT,
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  main_image TEXT,
  video_url TEXT,
  sizes TEXT[] DEFAULT '{}',
  colors JSONB DEFAULT '[]',
  stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock','low_stock','out_of_stock')),
  stock_quantity INTEGER,
  show_stock_message BOOLEAN DEFAULT false,
  is_pack BOOLEAN DEFAULT false,
  pack_pieces INTEGER,
  allow_piece_colors BOOLEAN DEFAULT true,
  one_size_for_pack BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_best_seller BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  badge TEXT,
  sku TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);

-- =============================================
-- PRODUCT IMAGES
-- =============================================
CREATE TABLE product_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  image_type TEXT DEFAULT 'gallery' CHECK (image_type IN ('main','gallery')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- =============================================
-- PRODUCT REVIEWS
-- =============================================
CREATE TABLE product_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCT FAQs
-- =============================================
CREATE TABLE product_faqs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_price DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cod',
  status TEXT DEFAULT 'جديد',
  source TEXT DEFAULT 'website',
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  google_sheet_synced BOOLEAN DEFAULT false,
  google_sheet_error TEXT,
  internal_notes TEXT,
  is_duplicate BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_phone ON orders(phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- =============================================
-- ORDER ITEMS
-- =============================================
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_title TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  colors TEXT,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =============================================
-- ORDER STATUS HISTORY
-- =============================================
CREATE TABLE order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BLACKLIST
-- =============================================
CREATE TABLE blacklist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blacklist_phone ON blacklist(phone);

-- =============================================
-- DELIVERY ZONES
-- =============================================
CREATE TABLE delivery_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  delivery_price DECIMAL(10,2) DEFAULT 0,
  estimated_time TEXT DEFAULT '24-72 ساعة',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HERO SLIDES
-- =============================================
CREATE TABLE hero_slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  button_text TEXT DEFAULT 'اطلب دابا',
  button_link TEXT DEFAULT '/products',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HOMEPAGE SECTIONS
-- =============================================
CREATE TABLE homepage_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STORE SETTINGS
-- =============================================
CREATE TABLE store_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_name TEXT DEFAULT 'YURIVA',
  logo_url TEXT,
  whatsapp_number TEXT NOT NULL DEFAULT '212600000000',
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  announcement_text TEXT DEFAULT 'توصيل مجاني | الدفع عند الاستلام',
  announcement_active BOOLEAN DEFAULT true,
  default_seo_title TEXT,
  default_seo_description TEXT,
  default_og_image TEXT,
  delivery_text TEXT DEFAULT 'التوصيل مجاني لجميع مدن المغرب',
  return_policy_text TEXT DEFAULT 'التبديل ممكن خلال 7 أيام',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO store_settings (store_name, whatsapp_number, announcement_text, announcement_active, default_seo_title, default_seo_description, delivery_text, return_policy_text)
VALUES ('YURIVA', '212600000000', '🔥 عرض محدود اليوم فقط | توصيل مجاني داخل المغرب | الدفع عند الاستلام', true, 'YURIVA | سراول Para وShorts الرجالية — توصيل مجاني المغرب', 'اشري أحسن سراول Para، Shorts Para وCargo pants فالمغرب. توصيل مجاني، الدفع عند الاستلام.', 'التوصيل مجاني لجميع مدن المغرب. مدة التوصيل 24-72 ساعة.', 'التبديل ممكن خلال 7 أيام إلى كان مشكل فالقياس أو المنتج.');

-- =============================================
-- TRACKING SETTINGS
-- =============================================
CREATE TABLE tracking_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meta_pixel_id TEXT,
  tiktok_pixel_id TEXT,
  google_analytics_id TEXT,
  google_tag_manager_id TEXT,
  meta_pixel_enabled BOOLEAN DEFAULT false,
  tiktok_pixel_enabled BOOLEAN DEFAULT false,
  google_analytics_enabled BOOLEAN DEFAULT false,
  google_tag_manager_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tracking_settings DEFAULT VALUES;

-- =============================================
-- GOOGLE SHEETS SETTINGS
-- =============================================
CREATE TABLE google_sheets_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  sheet_id TEXT,
  service_account_email TEXT,
  private_key_env_reference TEXT,
  last_sync_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO google_sheets_settings DEFAULT VALUES;

-- =============================================
-- COUPONS
-- =============================================
CREATE TABLE coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEDIA
-- =============================================
CREATE TABLE media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL,
  alt_text TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN PROFILES
-- =============================================
CREATE TABLE admin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner','manager','editor','viewer')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Public read for products/categories
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access products" ON products FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active reviews" ON product_reviews FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access reviews" ON product_reviews FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Admin full access images" ON product_images FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE product_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read product faqs" ON product_faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access faqs" ON product_faqs FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active slides" ON hero_slides FOR SELECT USING (is_active = true);
CREATE POLICY "Admin full access slides" ON hero_slides FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admin full access settings" ON store_settings FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE tracking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tracking" ON tracking_settings FOR SELECT USING (true);
CREATE POLICY "Admin full access tracking" ON tracking_settings FOR ALL USING (auth.role() = 'service_role');

-- Orders — only via service role
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access orders" ON orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access order_items" ON order_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can insert order_items" ON order_items FOR INSERT WITH CHECK (true);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access history" ON order_status_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can insert history" ON order_status_history FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
