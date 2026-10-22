import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Gainvera | Workflow intelligence",
  description:
    "Smarter workflows. Proven results. An offline workflow audit and outcome tracker.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
