import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoDB CRM",
  description: "Inbound + outbound lead management for VideoDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
