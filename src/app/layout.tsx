import type { ReactNode } from "react";

export const metadata = {
  title: "SubAudit",
  description: "Recurring-charge auditor",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
