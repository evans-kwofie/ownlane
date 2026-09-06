import type { Metadata, Viewport } from "next";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const siteUrl = new URL("https://useownlane.com");
const description = "Ownlane is the creator operating system: one branded home for products, services, memberships, support, and the audience behind your business.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Ownlane | Your brand. Your audience. Your business.", template: "%s | Ownlane" },
  description,
  applicationName: "Ownlane",
  keywords: ["creator platform", "creator storefront", "sell digital products", "creator business", "AI products", "creator memberships", "creator bookings"],
  authors: [{ name: "Ownlane", url: siteUrl }],
  creator: "Ownlane",
  publisher: "Ownlane",
  category: "Creator economy",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", locale: "en_US", url: "/", siteName: "Ownlane", title: "Ownlane | Your brand. Your audience. Your business.", description },
  twitter: { card: "summary_large_image", title: "Ownlane | Your brand. Your audience. Your business.", description },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#ff4d00", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className="h-full antialiased"><body className="flex min-h-full flex-col"><SmoothScroll>{children}</SmoothScroll></body></html>;
}
