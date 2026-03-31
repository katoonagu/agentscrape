export function renderNextLayout(): string {
  return `import type { ReactNode } from "react";
import "./globals.css";
import type { Metadata } from "next";
import siteContent from "@/content/site-content.json";
import type { SiteContentModel } from "@/components/site/types";

const content = siteContent as SiteContentModel;

export const metadata: Metadata = {
  title: \`\${content.meta.businessName} | Draft front-only scaffold\`,
  description: content.page.hero.body
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}
