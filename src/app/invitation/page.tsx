import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { dayNumber, formatDay, isDay, today } from '@/lib/dates';
import { urlFor } from '@/lib/storage';
import { trainCode, weddingDateParts, weddingReady } from '@/lib/wedding';
import { Icon } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { WindowCarousel } from '@/components/PhotoGroups';
import { MusicPlayer, RevealObserver } from '@/components/Ambient';
import { Ticket } from '@/components/Ticket';
import { GuestbookForm } from '@/components/Guestbook';
import { InviteCard } from '@/components/InviteCard';
import { PublicNav } from '@/components/PublicNav';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const guestName = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.replace(/[<>\n\r\t]/g, '').trim().slice(0, 20) || null;

export async function generateMetadata(): Promise<Metadata> {
  const { settings: s, featured } = await loadPublicAlbum();
  const title = `${s.partnerA} & ${s.partnerB} 的婚礼请柬`;
  const description = weddingReady(s)
    ? `${formatDay(s.weddingDate)} ${s.weddingTime}${s.weddingVenue ? ` · ${s.weddingVenue}` : ''}，诚邀你来。`
    : s.tagline;
  const cover = featured[0]?.src;
  return {
    title,
    description,
    openGraph: { title, description, images: cover ? [cover] : undefined, type: 'website' },
  };
}

/**
 * /invitation — the wedding invitation, one entry of the album.
 * Personal links: /invitation?to=王小明 prints the guest's name on the ticket.
 */
export default async function InvitationPage({ searchParams }: Props) {
  const [album, session, params] = await Promise.all([loadPublicAlbum(), getSession(), searchParams]);
  const { settings: s, featured, chapters, loose } = album;
  // No wedding set up (or it was switched off afterwards): printed QR codes still land in the album.
  if (!weddingReady(s)) redirect('/');

  const to = guestName(params.to);
  const date = weddingDateParts(s);
  const since = isDay(s.togetherSince) ? s.togetherSince : null;
  const music = s.music ? await urlFor(s.music, false) : null;
  const rsvp = s.rsvpEnabled;
  // The window shows our favourites first, then whatever else is public.
  const seen = new Set(featured.map((photo) => photo.id));
  const scenery = [...featured, ...chapters.flatMap((c) => c.photos), ...loose]
    .filter((photo, i) => i < featured.length || !seen.has(photo.id))
    .slice(0, 10);

  return (
    <LightboxProvider>
      {s.envelopeEnabled ? (
        <Ticket
          to={to}
          line={s.envelopeLine}
          names={`${s.partnerA} & ${s.partnerB}`}
          carrier={s.initials}
          date={date.dot}
          time={s.weddingTime}
          venue={s.weddingVenue}
          code={trainCode(s)}
        />
      ) : null}
      <RevealObserver />
      <PublicNav settings={s} wedding signedIn={Boolean(session)} active="invitation" />

      <main className="inv">
        <InviteCard settings={s} to={to} />

        <section className="section inv-album">
          <div className="section-head" data-reveal>
            <p className="kicker">Our album · 相册</p>
            <h2 className="section-title">窗外的风景</h2>
            <p className="section-sub">
              {since
                ? `从 ${formatDay(since, 'dot')} 到现在，这条线开了 ${dayNumber(since, today()).toLocaleString('zh-CN')} 天。`
                : '这些年，我们一起走过的路。'}
              {chapters.length > 0 ? `沿途停了 ${chapters.length} 站，想让你也看看。` : ''}
            </p>
          </div>
          {scenery.length > 0 ? (
            <div className="inv-window" data-reveal>
              <WindowCarousel photos={scenery} />
            </div>
          ) : null}
          <div className="inv-cta" data-reveal>
            <Link href="/" className="btn btn-ink">
              翻开我们的相册 <Icon name="right" size={16} />
            </Link>
          </div>
        </section>

        {rsvp ? (
          <section className="section" id="rsvp">
            <div className="section-head" data-reveal>
              <p className="kicker">RSVP · 回执</p>
              <h2 className="section-title">来不来，说一声</h2>
              <p className="section-sub">告诉我们你能不能来、来几位，顺便留一句话给我们。</p>
            </div>
            <div className="gb-card inv-rsvp" data-reveal>
              <GuestbookForm
                rsvp
                deadline={isDay(s.rsvpDeadline) ? formatDay(s.rsvpDeadline) : null}
                wallBelow={false}
              />
            </div>
          </section>
        ) : null}
      </main>

      <footer className="terminus">
        <div className="terminus-sign">
          <span className="terminus-dot" aria-hidden />
          <p className="kicker">婚礼站</p>
          <p className="terminus-line">到时候见。</p>
          <p className="terminus-sub">
            {s.partnerA} &amp; {s.partnerB} · {date.dot} · {s.weddingTime}
          </p>
        </div>
        <p className="terminus-fine">
          <Link href="/">我们的相册</Link>
        </p>
      </footer>

      {music ? <MusicPlayer src={music} autoplayInWeChat={!s.envelopeEnabled} /> : null}
    </LightboxProvider>
  );
}
