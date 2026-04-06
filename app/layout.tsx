import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { PaymentProvider } from "@/lib/payment-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Zilo QR Payments",
  description: "Mobile-first restaurant QR ordering and payment MVP"
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} font-sans`}>
        <CartProvider>
          <PaymentProvider>
            {children}
          </PaymentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
