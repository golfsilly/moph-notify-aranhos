import type { Metadata } from "next";
import "./globals.css";
import { APP_CONFIG } from "@/config/app-config";
import { sarabun } from "@/config/fonts";
import { ProvidersReactQuery } from "@/provider/react-query-provider";

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.hospital.website),
  title: {
    default: APP_CONFIG.seo.title,
    template: `%s | ${APP_CONFIG.seo.title}`,
  },
  description: APP_CONFIG.seo.description,
  icons: {
    icon: "/favicons/aranhoslogo/favicon.ico",
    apple: [
      {
        url: "/favicons/aranhoslogo/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`$${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProvidersReactQuery>{children}</ProvidersReactQuery>
      </body>
    </html>
  );
}
