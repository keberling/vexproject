import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SizeProvider } from '@/lib/size-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VEX Project Management',
  description: 'Project management software for low voltage installations',
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
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SizeProvider>
            {children}
          </SizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

