import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'ARDEYA ENTERPRISES | Smart Home & Kitchen Essentials',
  description: 'ARDEYA ENTERPRISES - Practical home, kitchen, storage, cleaning, tools, and everyday utility essentials. Secure payments in Indian Rupees with fast delivery across India.',
  keywords: ['ARDEYA ENTERPRISES', 'home essentials', 'kitchen products', 'storage organizers', 'cleaning products', 'tools hardware', 'household essentials', 'india shopping'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-['Plus_Jakarta_Sans',sans-serif] antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </AuthProvider>

        {/* Razorpay Standard Checkout Script */}
        <Script
          id="razorpay-checkout"
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
