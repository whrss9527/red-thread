import type { Metadata, Viewport } from 'next';
import { configuredOrigin } from '@/lib/env';
// 得意黑 (Smiley Sans), split by unicode range: a page only downloads the slices it uses.
import '@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css';
import '@fontsource/chivo-mono/400.css';
import '@fontsource/chivo-mono/500.css';
import '@/styles/base.css';
import '@/styles/lightbox.css';
import '@/styles/public.css';
import '@/styles/us.css';
import '@/styles/admin.css';

export function generateMetadata(): Metadata {
  const origin = configuredOrigin();
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { default: '红线 · 我们的相册', template: '%s' },
    description: '一条只有两位乘客的线路：我们的相册。',
    icons: { icon: '/icon.svg' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <noscript>
          <style>{`[data-reveal]{opacity:1;transform:none}.ph img,.tile img{opacity:1}.ticket-overlay{display:none}`}</style>
        </noscript>
      </body>
    </html>
  );
}
