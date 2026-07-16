// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Roboto_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { getCalendarThemeBootstrapScript } from "@/lib/calendar-theme"

const RobotoMono = Roboto_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-roboto-mono",
  weight: ["400", "500", "700"],
  display: "swap",
})
import Script from "next/script"
import "./globals.css"


export const metadata: Metadata = {
  metadataBase: new URL("https://bdsite.ru"),
  title: {
    default: "Календарь дней рождения",
    template: "%s | BDsite",
  },
  description:
    "BDsite — простой календарь дней рождения: добавляй людей, заметки и получай напоминания по email. Регистрация с подтверждением, быстрый поиск, удобная сетка по месяцам.",
  keywords: [
    "календарь дней рождения",
    "дни рождения",
    "напоминания",
    "уведомления email",
    "birthday calendar",
    "органайзер",
  ],
  applicationName: "BDsite",
  authors: [{ name: "BDsite", url: "https://bdsite.ru" }],
  creator: "BDsite",
  publisher: "BDsite",
  category: "productivity",
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: { ru: "/" },
  },
  openGraph: {
    type: "website",
    url: "https://bdsite.ru",
    siteName: "BDsite",
    title: "BDsite — календарь дней рождения",
    description:
      "Добавляй дни рождения близких, заметки и получай напоминания по email. Удобная сетка по месяцам.",
    images: [
      {
        url: "/og/cover.svg",
        width: 1200,
        height: 630,
        alt: "BDsite — календарь дней рождения",
      },
    ],
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "BDsite — календарь дней рождения",
    description:
      "Добавляй людей и заметки, получай напоминания по email. Удобная сетка по месяцам.",
    images: ["/og/cover.svg"],
  },

  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/site.webmanifest",
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark">
      <body className={`font-mono font-bold ${RobotoMono.variable}`}>
        <Script
          id="calendar-theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getCalendarThemeBootstrapScript() }}
        />
        {/* JSON-LD Schema.org */}
        <Script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "BDsite",
              url: "https://bdsite.ru",
            }),
          }}
        />
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
