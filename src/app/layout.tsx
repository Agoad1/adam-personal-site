import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JarvisBackground from "@/components/JarvisBackground";

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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
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

        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
