import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PromoBar from "@/components/layout/PromoBar";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { CartProvider } from "@/components/layout/CartContext";
import { getStoreSettings } from "@/lib/settings";

// Force dynamic rendering so header/footer settings are always fresh from Supabase
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();

  const headerStyle = {
    bgColor:     settings.header_bg_color,
    bgImage:     settings.header_bg_image,
    textColor:   settings.header_text_color,
    accentColor: settings.header_accent_color,
    logoUrl:     settings.logo_url,
  };

  const footerStyle = {
    bgColor:     settings.footer_bg_color,
    bgImage:     settings.footer_bg_image,
    textColor:   settings.footer_text_color,
    accentColor: settings.footer_accent_color,
  };

  return (
    <CartProvider>
      {settings.announcement_active && settings.announcement_text && (
        <PromoBar
          text={settings.announcement_text}
          bgColor={settings.announcement_bg_color}
          textColor={settings.announcement_text_color}
          linkText={settings.announcement_link_text}
          linkUrl={settings.announcement_link_url}
        />
      )}
      <Header headerStyle={headerStyle} />
      <main>{children}</main>
      <WhatsAppButton />
      <Footer footerStyle={footerStyle} />
    </CartProvider>
  );
}
