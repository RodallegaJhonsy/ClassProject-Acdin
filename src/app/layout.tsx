import type { Metadata, Viewport } from "next";
import "./globals.css";
import { data } from "@/lib/data";

export const metadata: Metadata = {
  title: data.site.title,
  description: data.site.intro,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1530",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

