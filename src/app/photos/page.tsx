import type { Metadata } from 'next';
import Link from 'next/link';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { siteTitle } from '@/lib/settings';
import { weddingReady } from '@/lib/wedding';
import { LightboxProvider } from '@/components/Lightbox';
import { PhotoMasonry } from '@/components/PhotoGroups';
import { RevealObserver } from '@/components/Ambient';
import { PublicNav } from '@/components/PublicNav';
import type { PhotoCard } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await loadPublicAlbum();
  return { title: `全部照片 · ${siteTitle(settings)}` };
}

/** Every public photo, newest year first. */
export default async function PhotosPage() {
  const [album, session] = await Promise.all([loadPublicAlbum(), getSession()]);
  const s = album.settings;
  const photos = [...album.chapters.flatMap((c) => c.photos), ...album.loose].sort((a, b) =>
    (b.takenAt ?? '').localeCompare(a.takenAt ?? ''),
  );
  const years = new Map<string, PhotoCard[]>();
  for (const photo of photos) {
    const year = photo.takenAt?.slice(0, 4) ?? '某一天';
    years.set(year, [...(years.get(year) ?? []), photo]);
  }

  return (
    <LightboxProvider>
      <RevealObserver />
      <PublicNav settings={s} wedding={weddingReady(s)} signedIn={Boolean(session)} active="photos" />
      <main className="album-page">
        <header className="album-page-head">
          <p className="section-kicker">All Photos</p>
          <h1>全部照片</h1>
          <p className="muted">
            {photos.length > 0 ? `${photos.length} 张，按时间从近到远。点开照片，还可以翻到背面。` : '相册正在整理中……'}
          </p>
        </header>
        {[...years.entries()].map(([year, list]) => (
          <section key={year} className="year-group" data-reveal>
            <h2 className="year-title">
              {year}
              <small>{list.length} 张</small>
            </h2>
            <PhotoMasonry photos={list} />
          </section>
        ))}
        <p className="album-cta">
          <Link href="/#story" className="btn">
            ← 回到我们的故事
          </Link>
        </p>
      </main>
    </LightboxProvider>
  );
}
