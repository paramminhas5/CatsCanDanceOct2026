// App Router is used only for /ops (internal dashboard). The public site runs on the Pages Router.
export const metadata = { title: "CCD Ops", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
