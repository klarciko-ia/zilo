import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/lib/cart-context";
import { PaymentProvider } from "@/lib/payment-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zilo QR Payments",
  description: "Mobile-first restaurant QR ordering and payment MVP"
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <PaymentProvider>
            <main className="mx-auto min-h-screen w-full max-w-md px-4 py-4">
              {children}
            </main>
          </PaymentProvider>
        </CartProvider>
      </body>
    </html>
  );
}
