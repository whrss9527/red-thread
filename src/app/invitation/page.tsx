import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { dayNumber, formatDay, isDay, today } from '@/lib/dates';
import { urlFor } from '@/lib/storage';
import { weddingDateParts, weddingReady } from '@/lib/wedding';
import { Icon } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { HeroFan } from '@/components/PhotoGroups';
import { MusicPlayer, Petals, RevealObserver } from '@/components/Ambient';
import { Envelope } from '@/components/Envelope';
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
 * Personal links: /invitation?to=王小明 greets the guest by name.
 */
export default async function InvitationPage({ searchParams }: Props) {
  const [album, session, params] = await Promise.all([loadPublicAlbum(), getSession(), searchParams]);
  const { settings: s, featured, chapters } = album;
  // No wedding set up (or it was switched off afterwards): printed QR codes still land in the album.
  if (!weddingReady(s)) redirect('/');

  const to = guestName(params.to);
  const date = weddingDateParts(s);
  const since = isDay(s.togetherSince) ? s.togetherSince : null;
  const music = s.music ? await urlFor(s.music, false) : null;
  const rsvp = s.rsvpEnabled;

  return (
    <LightboxProvider>
      {s.envelopeEnabled ? (
        <Envelope
          to={to}
          line={s.envelopeLine}
          initials={s.initials}
          names={`${s.partnerA} & ${s.partnerB}`}
          letterTop="Save the Date"
          letterBottom={date.dot}
        />
      ) : null}
      <Petals />
      <RevealObserver />
      <PublicNav settings={s} wedding signedIn={Boolean(session)} active="invitation" />

      <main className="inv">
        <section className="section inv-top">
          <InviteCard settings={s} to={to} />
        </section>

        <section className="section inv-album">
          <div className="section-head" data-reveal>
            <p className="section-kicker">Our Album</p>
            <h2 className="section-title">我们的相册</h2>
            <p className="section-sub">
              {since
                ? `从 ${formatDay(since, 'dot')} 到现在，我们一起走过了 ${dayNumber(since, today()).toLocaleString('zh-CN')} 天。`
                : '这些年，我们一起走过的路。'}
              {chapters.length > 0 ? `相册里写着 ${chapters.length} 段回忆，想让你也看看。` : ''}
            </p>
          </div>
          {featured.length > 0 ? (
            <div className="inv-fan" data-reveal>
              <HeroFan photos={featured} />
            </div>
          ) : null}
          <div className="album-cta" data-reveal>
            <Link href="/" className="btn btn-red">
              <Icon name="book" size={18} /> 翻开我们的相册
            </Link>
          </div>
        </section>

        {rsvp ? (
          <section className="section" id="rsvp">
            <div className="section-head" data-reveal>
              <p className="section-kicker">RSVP</p>
              <h2 className="section-title">回执</h2>
              <p className="section-sub">告诉我们你能不能来，顺便留一句话给我们吧。</p>
            </div>
            <div className="gb-paper" data-reveal>
              <GuestbookForm
                rsvp
                deadline={isDay(s.rsvpDeadline) ? formatDay(s.rsvpDeadline) : null}
                wallBelow={false}
              />
            </div>
          </section>
        ) : null}
      </main>

      <footer className="closing">
        <p className="closing-line">期待你的到来</p>
        <p className="closing-names">
          {s.partnerA} &amp; {s.partnerB}
        </p>
        <p className="closing-since">{date.dot}</p>
        <p className="closing-fine">
          <Link href="/">我们的相册</Link>
        </p>
      </footer>

      {music ? <MusicPlayer src={music} autoplayInWeChat={!s.envelopeEnabled} /> : null}
    </LightboxProvider>
  );
}
