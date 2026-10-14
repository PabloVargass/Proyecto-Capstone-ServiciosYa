import type { Metadata } from "next";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: "Administración | ServiciosYa",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
