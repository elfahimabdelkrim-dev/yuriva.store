// =====================
// YURIVA Types
// =====================

export type ProductStatus = "active" | "inactive";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface ProductColor {
  name: string;
  hex: string;
  label: string; // بالدارجة
}

export interface ProductImage {
  id?: string;
  url: string;
  alt: string;
  sort_order?: number;
  image_type?: "main" | "gallery";
}

export interface ProductFAQ {
  id?: string;
  question: string;
  answer: string;
  sort_order?: number;
}

export interface Product {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
  details?: string;
  price: number;
  old_price?: number;
  main_image: string;
  images?: ProductImage[];
  video_url?: string;
  sizes: string[];
  colors: ProductColor[];
  stock_status: StockStatus;
  stock_quantity?: number;
  show_stock_message?: boolean;
  is_pack: boolean;
  pack_pieces?: number;
  allow_piece_colors?: boolean;
  one_size_for_pack?: boolean;
  required_color_count?: number;
  is_featured?: boolean;
  is_active: boolean;
  is_best_seller?: boolean;
  is_new_arrival?: boolean;
  badge?: string;
  sku?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  og_image?: string;
  reviews?: ProductReview[];
  faqs?: ProductFAQ[];
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  banner_url?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductReview {
  id?: string;
  product_id?: string;
  customer_name: string;
  rating: number;
  review_text: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export type OrderStatus =
  | "جديد"
  | "تم الاتصال"
  | "تم التأكيد"
  | "ما جاوبش"
  | "رفض الطلب"
  | "في التوصيل"
  | "تم التسليم"
  | "ملغي"
  | "رجع";

export interface PackColorChoice {
  pieceIndex: number;
  color: ProductColor;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_title: string;
  product_slug: string;
  product_image: string;
  price: number;
  quantity: number;
  size: string;
  color?: ProductColor;
  pack_colors?: PackColorChoice[];
  is_pack: boolean;
  pack_pieces?: number;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_title: string;
  product_price: number;
  quantity: number;
  size: string;
  colors: string; // JSON string
  total: number;
}

export interface Order {
  id?: string;
  customer_first_name: string;
  customer_last_name: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  total_amount: number;
  delivery_price: number;
  payment_method: "cod";
  status: OrderStatus;
  source?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  // Attribution / tracking fields
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  landing_page?: string;
  referrer?: string;
  purchase_event_id?: string;
  capi_status?: string;
  pixel_status?: string;
  google_sheet_synced?: boolean;
  google_sheet_error?: string;
  internal_notes?: string;
  is_duplicate?: boolean;
  is_blacklisted?: boolean;
  whatsapp_notify_status?: string;
  whatsapp_notify_error?: string;
  whatsapp_notify_sent_at?: string;
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
  created_at?: string;
  updated_at?: string;
}

export interface OrderStatusHistory {
  id?: string;
  order_id?: string;
  old_status: OrderStatus;
  new_status: OrderStatus;
  note?: string;
  changed_by?: string;
  created_at?: string;
}

export interface DeliveryZone {
  id?: string;
  city: string;
  is_active: boolean;
  delivery_price: number;
  estimated_time: string;
  note?: string;
}

export interface StoreSettings {
  id?: string;
  store_name: string;
  logo_url?: string;
  email?: string;
  whatsapp_number: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  announcement_text: string;
  announcement_active: boolean;
  default_seo_title: string;
  default_seo_description: string;
  default_og_image?: string;
  delivery_text: string;
  return_policy_text: string;
  footer_text?: string;
  // Header style
  header_bg_color?: string;
  header_bg_image?: string;
  header_text_color?: string;
  header_accent_color?: string;
  // Footer style
  footer_bg_color?: string;
  footer_bg_image?: string;
  footer_text_color?: string;
  footer_accent_color?: string;
  // Announcement bar custom styling (requires SQL migration)
  announcement_bg_color?: string;
  announcement_text_color?: string;
  announcement_link_text?: string;
  announcement_link_url?: string;
}

export interface TrackingSettings {
  id?: string;
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  meta_pixel_enabled: boolean;
  tiktok_pixel_enabled: boolean;
  google_analytics_enabled: boolean;
  google_tag_manager_enabled: boolean;
}

export interface GoogleSheetsSettings {
  id?: string;
  enabled: boolean;
  sheet_id?: string;
  service_account_email?: string;
  private_key_env_reference?: string;
  last_sync_status?: string;
}

export interface HeroSlide {
  id?: string;
  title: string;
  subtitle?: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: boolean;
  sort_order?: number;
}

export interface CheckoutFormData {
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
}

export interface WhatsAppOrderData {
  order_id?: string;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  total: number;
  delivery_price: number;
  items: CartItem[];
}
