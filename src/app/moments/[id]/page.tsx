import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { formatDay, formatRange } from '@/lib/dates';
import { MOMENT_KINDS } from '@/lib/moments';
import { siteTitle } from '@/lib/settings';
import { weddingReady } from '@/lib/wedding';
import { Icon, KIND_ICON } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { PolaroidWall } from '@/components/PhotoGroups';
import { RevealObserver } from '@/components/Ambient';
import { PublicNav } from '@/components/PublicNav';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/** Only public moments exist for guests; everything comes from the same filtered album. */
async function findChapter(id: string) {
  const album = await loadPublicAlbum();
  const index = album.chapters.findIndex((chapter) => chapter.moment.id === id);
  return index === -1 ? null : { album, index, chapter: album.chapters[index] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findChapter((await params).id);
  if (!found) return { title: '找不到这一页' };
  const { album, chapter } = found;
  const title = `${chapter.moment.title} · ${siteTitle(album.settings)}`;
  const description = chapter.moment.story?.split('\n')[0] ?? formatRange(chapter.moment.startsOn, chapter.moment.endsOn);
  const cover = chapter.photos[0]?.src;
  return { title, description, openGraph: { title, description, images: cover ? [cover] : undefined } };
}

export default async function MomentPage({ params }: Props) {
  const [found, session] = await Promise.all([params.then(({ id }) => findChapter(id)), getSession()]);
  if (!found) notFound();
  const { album, index, chapter } = found;
  const { moment, photos, sealed } = chapter;
  const s = album.settings;
  const previous = album.chapters[index - 1]?.moment;
  const next = album.chapters[index + 1]?.moment;
  const kind = MOMENT_KINDS.find((k) => k.value === moment.kind)?.label;

  return (
    <LightboxProvider>
      <RevealObserver />
      <PublicNav settings={s} wedding={weddingReady(s)} signedIn={Boolean(session)} active="moment" />
      <main className="album-page">
        <Link href={`/#m-${moment.id}`} className="back-link muted">
          ← 回到我们的故事
        </Link>
        <header className="album-page-head" data-reveal>
          <span className="chapter-kind">
            <Icon name={KIND_ICON[moment.kind]} size={14} />
            {kind}
          </span>
          <h1>{moment.title}</h1>
          <p className="chapter-meta">
            <span>
              <Icon name="calendar" size={14} />
              {formatRange(moment.startsOn, moment.endsOn)}
            </span>
            {moment.place ? (
              <span>
                <Icon name="pin" size={14} />
                {moment.place}
              </span>
            ) : null}
            <span>
              <Icon name="image" size={14} />
              {photos.length} 张
            </span>
          </p>
          {moment.story ? <p className="chapter-story">{moment.story}</p> : null}
        </header>

        {photos.length > 0 ? (
          <PolaroidWall photos={photos} />
        ) : (
          <div className="empty">
            <p className="hand">这一页的照片，我们悄悄收起来了</p>
          </div>
        )}
        {sealed > 0 ? (
          <p className="chapter-sealed album-page-sealed">
            <Icon name="lock" size={15} />
            还有 {sealed} 张，只给彼此看
          </p>
        ) : null}

        <nav className="album-pager" aria-label="上一页 / 下一页">
          {previous ? (
            <Link href={`/moments/${previous.id}`} className="album-pager-link">
              <small>← 上一页 · {formatDay(previous.startsOn, 'dot')}</small>
              <span>{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/moments/${next.id}`} className="album-pager-link next">
              <small>下一页 · {formatDay(next.startsOn, 'dot')} →</small>
              <span>{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </main>
    </LightboxProvider>
  );
}
