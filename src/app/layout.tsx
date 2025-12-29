import { Outfit } from 'next/font/google';
import './globals.css';
import { PrimeReactProvider } from 'primereact/api'; // https://primereact.org/installation/
import 'primereact/resources/themes/saga-blue/theme.css'; // tema visual
import 'primereact/resources/primereact.min.css'; // estilos principais

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Metadata } from 'next';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Spuri",
    template: "%s | Spuri",
  },
  description: "Mapeamento e registros acadêmicos"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <PrimeReactProvider>
              {children}
            </PrimeReactProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
