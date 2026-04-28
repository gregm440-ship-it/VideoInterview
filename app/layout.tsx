import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Outsorcy Video Interview",
    template: "%s · Outsorcy",
  },
  description:
    "Outsorcy's AI-augmented async video interview tool. Reduce recruiter screening time and deliver scored, watchable candidate packages to clients.",
  metadataBase: new URL("https://interview.outsorcy.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
