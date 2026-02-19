import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://certisen.com'),
  title: {
    default: 'CertiSen - TSN Network Certification & Formal Verification for Safety-Critical Systems',
    template: '%s | CertiSen'
  },
  description: 'CertiSen provides AI-optimized Time-Sensitive Networking (TSN) certification with formal verification at ASIL-D confidence level. Design, validate, and certify deterministic Ethernet networks for automotive, industrial, and safety-critical systems.',
  keywords: ['TSN', 'Time-Sensitive Networking', 'IEEE 802.1Qbv', 'ASIL-D', 'formal verification', 'network certification', 'automotive Ethernet', 'deterministic networking', 'safety-critical systems', 'AI optimization', 'TSN configuration', 'network validation'],
  authors: [{ name: 'CertiSen' }],
  creator: 'CertiSen',
  publisher: 'CertiSen',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://certisen.com',
    title: 'CertiSen - TSN Network Certification & Formal Verification',
    description: 'AI-optimized Time-Sensitive Networking certification with formal verification at ASIL-D confidence level for safety-critical systems.',
    siteName: 'CertiSen',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CertiSen - TSN Network Certification & Formal Verification',
    description: 'AI-optimized TSN certification with formal verification at ASIL-D confidence level.',
    creator: '@certisen',
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
           <NextIntlClientProvider>{children}</NextIntlClientProvider>

       </body>
    </html>
  );
}
