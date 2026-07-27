import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Frontdesk — the assistant that answers your customers for you",
    template: "%s · Frontdesk",
  },
  description:
    "Turn your price list, FAQ and policies into a chat assistant that answers customer questions on your website — day or night. Built for salons, studios, clinics and local service businesses.",
  openGraph: {
    title: "Frontdesk — the assistant that answers your customers for you",
    description:
      "Upload what you already have. Get a chat assistant for your website in ten minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (password managers, antivirus) inject attributes into
    // <html> and <body> before React hydrates, which reads as a mismatch. The
    // suppression is one level deep, so real mismatches inside the page still
    // surface.
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
