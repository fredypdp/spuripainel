"use client"
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import RouteGuard from "@/components/guards/RouteGuard";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({children}: {children: React.ReactNode;}) {
  return (
    <RouteGuard>
      <div className="relative min-h-screen bg-white z-1 dark:bg-gray-900">
        <ThemeProvider>
          <div className="relative flex min-h-screen w-full flex-col justify-center dark:bg-gray-900 lg:flex-row">
            {children}
            <div className="hidden min-h-screen w-full bg-brand-950 dark:bg-white/5 lg:grid lg:w-1/2 lg:items-stretch">
              <div className="relative z-1 flex h-full items-center justify-center">
                <GridShape />
                <div className="flex flex-col items-center max-w-xs">
                  <Link href="/" className="block mb-4">
                    <Image
                      width={231}
                      height={48}
                      src="./images/logo/auth-logo.svg"
                      alt="Logo"
                    />
                  </Link>
                  <p className="text-center text-gray-400 dark:text-white/60">Gestão académica eficiente e registos protegidos</p>
                </div>
              </div>
            </div>
            <div className="fixed bottom-6 right-6 z-50">
              <ThemeTogglerTwo />
            </div>
          </div>
        </ThemeProvider>
      </div>
    </RouteGuard>
  );
}
