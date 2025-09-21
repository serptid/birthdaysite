// app/layout.tsx
import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import Script from "next/script"
import "./globals.css"


export const metadata: Metadata = {
  metadataBase: new URL("https://bdsite.ru"),
  title: {
    default: "BDsite — календарь дней рождения",
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
    languages: { "ru": "/", "en": "/en" }, // при наличии /en
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
        url: "/og/cover.png", // TODO: положи картинку 1200×630
        width: 1200,
        height: 630,
        alt: "BDsite — календарь дней рождения",
      },
    ],
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    site: "@bdsite", // TODO: при наличии
    creator: "@bdsite", // TODO
    title: "BDsite — календарь дней рождения",
    description:
      "Добавляй людей и заметки, получай напоминания по email. Удобная сетка по месяцам.",
    images: ["/og/cover.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest", // TODO: добавь manifest
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
  formatDetection: { telephone: false, email: false, address: false },
  verification: {
    // TODO: вставь коды, если нужно
    google: "",
    yandex: "",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0c",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
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
              potentialAction: {
                "@type": "SearchAction",
                target: "https://bdsite.ru/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
