import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { formatDay, formatDotRange, formatRange } from '@/lib/dates';
import { MOMENT_KINDS } from '@/lib/moments';
import { siteTitle } from '@/lib/settings';
import { weddingReady } from '@/lib/wedding';
import { Icon } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { PhotoWall } from '@/components/PhotoGroups';
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
  const sub = [moment.place, formatDotRange(moment.startsOn, moment.endsOn), `${photos.length} 张照片`].filter(Boolean);

  return (
    <LightboxProvider>
      <RevealObserver />
      <PublicNav settings={s} wedding={weddingReady(s)} signedIn={Boolean(session)} active="moment" />
      <main className="page">
        <Link href={`/#m-${moment.id}`} className="back-link">
          <Icon name="left" size={16} /> 回到线路图
        </Link>

        <header className="stop-sign" data-reveal>
          <div className="stop-sign-board">
            <p className="kicker">
              第 {String(index + 1).padStart(2, '0')} 站 · {kind}
            </p>
            <h1>{moment.title}</h1>
            <p className="stop-sign-sub">{sub.join(' · ')}</p>
          </div>
          <nav className="stop-sign-bar" aria-label="上一站 / 下一站">
            {previous ? (
              <Link href={`/moments/${previous.id}`}>
                <Icon name="left" size={16} />
                <small>上一站</small>
                <b>{previous.title}</b>
              </Link>
            ) : (
              <span>
                <small>始发站</small>
              </span>
            )}
            {next ? (
              <Link href={`/moments/${next.id}`}>
                <small>下一站</small>
                <b>{next.title}</b>
                <Icon name="right" size={16} />
              </Link>
            ) : (
              <span>
                <small>本线路仍在延长中</small>
              </span>
            )}
          </nav>
        </header>

        {moment.story ? <p className="stop-story">{moment.story}</p> : null}

        {photos.length > 0 ? (
          <PhotoWall photos={photos} />
        ) : (
          <div className="empty">
            <p className="quip">这一站的照片，我们悄悄收起来了</p>
          </div>
        )}
        {sealed > 0 ? (
          <p className="stop-sealed">
            <Icon name="lock" size={15} />
            另有 {sealed} 张，仅限两位乘客查看
          </p>
        ) : null}

        <nav className="stop-pager" aria-label="上一站 / 下一站">
          {previous ? (
            <Link href={`/moments/${previous.id}`}>
              <small>← 上一站 · {formatDay(previous.startsOn, 'dot')}</small>
              <b>{previous.title}</b>
            </Link>
          ) : null}
          {next ? (
            <Link href={`/moments/${next.id}`} className="next">
              <small>下一站 · {formatDay(next.startsOn, 'dot')} →</small>
              <b>{next.title}</b>
            </Link>
          ) : null}
        </nav>
      </main>
    </LightboxProvider>
  );
}
