import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google"
import "./globals.css";
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"], 
})

export const metadata: Metadata = {
  title: "Metaverse",
  description: "metaverse is a virtual reality space where users can interact with a computer-generated environment and other users in real-time.",
  icons : {
    icon: [
      { url: '/metaverse_logo.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', rel: 'shortcut icon' },
    ],
    apple: "/metaverse_logo.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
