import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'গুঞ্জন — বেনামী প্রকাশনা | Gunjon - Anonymous Reports',
  description:
    'গুঞ্জন হলো একটি বেনামী প্রকাশনা প্ল্যাটফর্ম। অ্যাকাউন্ট ছাড়াই চাঁদাবাজি, ঘুষ, দুর্নীতি, হয়রানি সহ সকল অনিয়মের রিপোর্ট করুন। পরিচয় গোপন রেখে আপনার কণ্ঠস্বর তুলে ধরুন।',
  keywords: [
    'গুঞ্জন',
    'Gunjon',
    'anonymous',
    'বেনামী',
    'চাঁদাবাজি',
    'ঘুষ',
    'দুর্নীতি',
    'রিপোর্ট',
    'হয়রানি',
    'বাংলাদেশ',
  ],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
