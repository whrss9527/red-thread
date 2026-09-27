import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { dayNumber, formatDay, formatRange, isDay, today } from '@/lib/dates';
import { MOMENT_KINDS } from '@/lib/moments';
import { siteTitle } from '@/lib/settings';
import { urlFor } from '@/lib/storage';
import { seeded } from '@/lib/ui';
import { weddingReady } from '@/lib/wedding';
import { Icon, KIND_ICON } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { Corkboard, HeroFan, PolaroidCluster } from '@/components/PhotoGroups';
import { DaysCounter, MusicPlayer, RevealObserver } from '@/components/Ambient';
import { RedThread } from '@/components/RedThread';
import { GuestbookForm } from '@/components/Guestbook';
import { Bow, Stamp } from '@/components/Bits';
import { InviteEntry } from '@/components/InviteCard';
import { PublicNav } from '@/components/PublicNav';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const album = await loadPublicAlbum();
  const { settings: s } = album;
  const title = siteTitle(s);
  const cover = album.featured[0]?.src;
  return {
    title,
    description: s.tagline,
    openGraph: { title, description: s.tagline, images: cover ? [cover] : undefined, type: 'website' },
    twitter: { card: cover ? 'summary_large_image' : 'summary', title, description: s.tagline },
  };
}

const NOTE_COLORS = ['#fdf1c8', '#fbe0e0', '#e3efd9', '#e0e9f5', '#f3e2f0', '#fde6cf'];

/** The album: our story along the red thread, every photo we chose to share. */
export default async function AlbumHome({ searchParams }: Props) {
  const [album, session, params] = await Promise.all([loadPublicAlbum(), getSession(), searchParams]);
  const { settings: s, chapters, loose, featured, stamps, blessings, stats } = album;
  const wedding = weddingReady(s);

  // A personal link (?to=名字) belongs to the invitation, which greets the guest by name.
  const to = Array.isArray(params.to) ? params.to[0] : params.to;
  if (to && wedding) redirect(`/invitation?to=${encodeURIComponent(to)}`);

  const since = isDay(s.togetherSince) ? s.togetherSince : today();
  const music = s.music ? await urlFor(s.music, false) : null;
  const kindLabel = Object.fromEntries(MOMENT_KINDS.map((k) => [k.value, k.label]));
  const publicCount = chapters.reduce((sum, c) => sum + c.photos.length, 0) + loose.length;

  return (
    <LightboxProvider>
      <RevealObserver />
      <PublicNav settings={s} wedding={wedding} signedIn={Boolean(session)} active="home" />

      <header className="hero">
        <p className="hero-kicker">Our Love Story</p>
        <h1 className="hero-names">
          <span>{s.partnerA}</span>
          <span className="amp script">&amp;</span>
          <span>{s.partnerB}</span>
        </h1>
        {s.tagline ? <p className="hero-tagline hand">{s.tagline}</p> : null}
        {featured.length > 0 ? (
          <HeroFan photos={featured} />
        ) : (
          <div className="fan-empty hand">这里会放上我们最喜欢的几张照片</div>
        )}
        <div className="hero-bottom">
          <DaysCounter since={since} initialDay={dayNumber(since, today())} />
          {wedding ? <InviteEntry settings={s} /> : null}
        </div>
        <a href="#story" className="scroll-cue">
          <span className="hand">顺着红线往下走</span>
          <Icon name="down" size={18} />
        </a>
      </header>

      <main>
        <section className="story" id="story">
          <RedThread />
          <header className="story-intro" data-reveal>
            <span className="knot knot-heart" data-knot>
              <Icon name="heart" size={28} />
            </span>
            <div className="story-intro-text">
              <p className="section-kicker">Our Story</p>
              <h2 className="section-title">我们的故事</h2>
              {s.intro ? <p>{s.intro}</p> : null}
            </div>
          </header>

          {chapters.map(({ moment, photos, sealed }) => {
            const special = moment.kind === 'meet' || moment.kind === 'anniversary' || moment.kind === 'milestone';
            return (
              <article
                key={moment.id}
                id={`m-${moment.id}`}
                className={`chapter ${special ? 'milestone' : ''}`}
                data-reveal
              >
                <span className={`knot ${special ? 'knot-heart' : ''}`} data-knot>
                  {special ? <Icon name="heart" size={28} /> : null}
                  <span className="knot-date">{formatDay(moment.startsOn, 'dot')}</span>
                </span>
                <div className="chapter-text">
                  <span className="chapter-kind">
                    <Icon name={KIND_ICON[moment.kind]} size={14} />
                    {kindLabel[moment.kind]}
                  </span>
                  <h3 className="chapter-title">
                    <Link href={`/moments/${moment.id}`}>{moment.title}</Link>
                  </h3>
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
                  </p>
                  {moment.story ? <p className="chapter-story">{moment.story}</p> : null}
                  {sealed > 0 ? (
                    <p className="chapter-sealed">
                      <Icon name="lock" size={15} />
                      还有 {sealed} 张，只给彼此看
                    </p>
                  ) : null}
                  {photos.length > 0 ? (
                    <Link href={`/moments/${moment.id}`} className="chapter-open">
                      翻开这一页 · {photos.length} 张照片 <Icon name="right" size={14} />
                    </Link>
                  ) : null}
                </div>
                {photos.length > 0 ? (
                  <div className="chapter-photos">
                    <PolaroidCluster photos={photos} label={moment.title} />
                  </div>
                ) : null}
              </article>
            );
          })}

          <div className="story-end" data-reveal>
            <span className="knot knot-heart" data-knot>
              <Icon name="heart" size={28} />
            </span>
            <div className="story-end-text">
              {chapters.length === 0 ? (
                <p className="hand">故事才刚刚开始写呢</p>
              ) : wedding ? (
                <>
                  <p className="hand">下一个结，想请你一起来系</p>
                  <Link href="/invitation" className="btn btn-red">
                    <Icon name="envelope" size={18} /> 打开婚礼请柬
                  </Link>
                </>
              ) : (
                <p className="hand">未完，待续……</p>
              )}
            </div>
          </div>
        </section>

        {loose.length > 0 ? (
          <section className="section">
            <div className="section-head" data-reveal>
              <p className="section-kicker">Little Things</p>
              <h2 className="section-title">零零碎碎的日常</h2>
              <p className="section-sub">没有被写进章节的那些瞬间，也一样重要。</p>
            </div>
            <div data-reveal>
              <Corkboard photos={loose} />
            </div>
          </section>
        ) : null}

        {publicCount > 0 ? (
          <div className="album-cta" data-reveal>
            <Link href="/photos" className="btn">
              <Icon name="image" size={17} /> 按时间看全部 {publicCount} 张照片
            </Link>
          </div>
        ) : null}

        {stamps.length > 0 ? (
          <section className="section" id="places">
            <div className="section-head" data-reveal>
              <p className="section-kicker">Places</p>
              <h2 className="section-title">一起去过的地方</h2>
              <p className="section-sub">每一枚邮戳，都是一段一起出发的路。</p>
            </div>
            <div className="stamps" data-reveal>
              {stamps.map((stamp) => (
                <Stamp
                  key={stamp.place}
                  place={stamp.place}
                  date={stamp.day ? formatDay(stamp.day, 'dot').slice(0, 7) : '♡'}
                  thumb={stamp.thumb}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="section">
          <div className="section-head" data-reveal>
            <p className="section-kicker">In Numbers</p>
            <h2 className="section-title">我们的数字</h2>
          </div>
          <div className="numbers" data-reveal>
            <div className="number">
              <b>{stats.days.toLocaleString('zh-CN')}</b>
              <span>天，在一起</span>
            </div>
            <div className="number">
              <b>{stats.weekends.toLocaleString('zh-CN')}</b>
              <span>个周末，一起过</span>
            </div>
            {stats.places > 0 ? (
              <div className="number">
                <b>{stats.places}</b>
                <span>个地方，一起去过</span>
              </div>
            ) : null}
            {stats.photos > 0 ? (
              <div className="number">
                <b>{stats.photos.toLocaleString('zh-CN')}</b>
                <span>{stats.hidden > 0 ? `张照片，${stats.hidden} 张悄悄藏着` : '张照片，都在这里'}</span>
              </div>
            ) : null}
            {stats.valentines > 0 ? (
              <div className="number">
                <b>{stats.valentines}</b>
                <span>个情人节，都是你</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="section" id="guestbook">
          <div className="section-head" data-reveal>
            <p className="section-kicker">Guestbook</p>
            <h2 className="section-title">写给我们</h2>
            <p className="section-sub">留一句话给我们，我们会好好收着。</p>
          </div>
          <div className="gb-paper" data-reveal>
            <GuestbookForm rsvp={false} deadline={null} />
          </div>
          {blessings.length > 0 ? (
            <div className="wall">
              {blessings.map((note) => (
                <article
                  key={note.id}
                  className="note"
                  data-reveal
                  style={
                    {
                      '--tilt': `${(seeded(note.id) - 0.5) * 6}deg`,
                      '--note': NOTE_COLORS[Math.floor(seeded(note.id, 2) * NOTE_COLORS.length)],
                    } as CSSProperties
                  }
                >
                  <span className="tape" />
                  <p>{note.message}</p>
                  <footer>— {note.name}</footer>
                </article>
              ))}
            </div>
          ) : (
            <p className="wall-empty">第一个写下留言的人，会被我们记很久很久。</p>
          )}
        </section>
      </main>

      <footer className="closing">
        <Bow />
        <p className="closing-line">{s.closingLine}</p>
        <p className="closing-names">
          {s.partnerA} &amp; {s.partnerB}
        </p>
        <p className="closing-since">SINCE {formatDay(since, 'dot')}</p>
        <p className="closing-fine">
          {wedding ? (
            <>
              <Link href="/invitation">婚礼请柬</Link>
              {' · '}
            </>
          ) : null}
          <Link href="/login" aria-label="我们的入口">
            ♡
          </Link>
        </p>
      </footer>

      {music ? <MusicPlayer src={music} autoplayInWeChat={false} /> : null}
    </LightboxProvider>
  );
}
