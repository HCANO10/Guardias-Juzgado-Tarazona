import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const font = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Guardias Juzgado Tarazona",
  description: "Sistema de gestión de personal, guardias y vacaciones",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${font.className} h-full antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
