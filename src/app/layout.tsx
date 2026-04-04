import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JarvisBackground from "@/components/JarvisBackground";
import ScrollOverlay from "@/components/ScrollOverlay";
import { Inter, Playfair_Display, Fira_Code } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira", display: "swap" });

export const metadata: Metadata = {
  title: "Adam Goad — AI Builder & Automation Specialist",
  description:
    "Personal site of Adam Goad. AI builder, automation specialist, and systems thinker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${firaCode.variable} min-h-screen flex flex-col antialiased font-sans`}>
        {/* Base image layer — the room, desk, and physical elements */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -2,
            backgroundColor: "#03060f",
          }}
        >
          <img
            src="/Gemini_Generated_Image_ffg8r7ffg8r7ffg8.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center center",
              opacity: 0.52,
              display: "block",
            }}
          />
        </div>
        {/* Canvas overlay — animated panels and effects */}
        <JarvisBackground />
        
        {/* Scroll overlay — darkens background on scroll */}
        <ScrollOverlay />

        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
