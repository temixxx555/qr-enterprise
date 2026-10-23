import "./globals.css";

export const metadata = {
  title: {
    default: "EnterpriseQR · Campaign workspace",
    template: "%s · EnterpriseQR",
  },
  description:
    "Create meaningful connections through QR campaigns, feedback and rewards.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body    cz-shortcut-listen="true">{children}</body>
    </html>
  );
}
