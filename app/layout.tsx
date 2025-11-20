import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SizeProvider } from '@/lib/size-context'
import NextAuthSessionProvider from '@/components/session-provider'

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700']
})

export const metadata: Metadata = {
  title: 'Vexitey Portal',
  description: 'Project management software for low voltage installations',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('size-mode');
                  const sizeMode = saved || 'large';
                  document.documentElement.setAttribute('data-size-mode', sizeMode);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={roboto.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SizeProvider>
            <NextAuthSessionProvider>
              {children}
            </NextAuthSessionProvider>
          </SizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

