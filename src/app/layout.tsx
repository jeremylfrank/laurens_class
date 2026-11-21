import type { Metadata, Viewport } from "next";
// Fonts are bundled from npm and served from our own origin. No calls to Google Fonts.
import "@fontsource/alfa-slab-one/latin-400.css";
import "@fontsource-variable/nunito/wght.css";
import "@/themes/national-parks/theme.css";
import "./globals.css";
import "@/board/board.css";

export const metadata: Metadata = {
  title: "Trail Games",
  description: "Touchscreen learning games for the classroom board.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24533f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
