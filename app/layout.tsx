import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockPilot AI — Smart Inventory Management',
  description: 'AI-assisted inventory management system for small businesses with OCR invoice import and demand forecasting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

