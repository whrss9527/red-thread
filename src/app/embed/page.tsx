import type { Metadata } from 'next';
import Link from 'next/link';
import { loadPublicAlbum } from '@/lib/album';
import { formatDay, isDay } from '@/lib/dates';
import { siteTitle } from '@/lib/settings';
import { weddingDateParts, weddingReady } from '@/lib/wedding';
import { EmbedDeck } from '@/components/EmbedDeck';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await loadPublicAlbum();
  return { title: siteTitle(settings), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * /embed — a compact, frameable showcase of the album for other pages
 * (an H5 wedding invitation, a blog post):
 *   <iframe src="https://你的域名/embed" width="360" height="600"></iframe>
 * Option: ?bg=transparent
 */
export default async function Embed({ searchParams }: Props) {
  const [{ settings: s, featured, chapters, loose }, params] = await Promise.all([loadPublicAlbum(), searchParams]);
  const bg = Array.isArray(params.bg) ? params.bg[0] : params.bg;
  const transparent = bg === 'transparent';

  // Featured first, then the rest of the public photos, capped at 16 cards.
  const seen = new Set(featured.map((p) => p.id));
  const rest = [...chapters.flatMap((c) => c.photos), ...loose].filter((p) => !seen.has(p.id));
  const photos = [...featured, ...rest].slice(0, 16);
  const wedding = weddingReady(s);

  return (
    <div className={`embed ${transparent ? 'transparent' : ''}`}>
      {transparent ? <style>{'body{background:transparent}'}</style> : null}
      <header>
        <p className="section-kicker">Our Love Story</p>
        <h1 className="embed-names">
          {s.partnerA}
          <span className="amp">&amp;</span>
          {s.partnerB}
        </h1>
      </header>
      {photos.length > 0 ? <EmbedDeck photos={photos} /> : <p className="hand empty">相册正在整理中……</p>}
      <footer className="embed-foot">
        <p className="embed-date">
          {wedding ? weddingDateParts(s).dot : isDay(s.togetherSince) ? `SINCE ${formatDay(s.togetherSince, 'dot')}` : ''}
        </p>
        {/* target="_top" leaves the iframe; Next's Link hands such clicks to the browser. */}
        <Link className="btn btn-red" href="/" target="_top">
          <Icon name="book" size={18} /> 翻开我们的相册
        </Link>
      </footer>
    </div>
  );
}
