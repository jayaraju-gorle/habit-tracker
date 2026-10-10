import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { CONTENT_SECURITY_POLICY } from "@/lib/csp";
import { publicPath } from "@/lib/public-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habits",
  description: "A habit tracker that stays on this device.",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        <script src={publicPath("/frame-guard.js")} />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
