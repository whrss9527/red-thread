import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadPublicAlbum } from '@/lib/album';
import { getSession } from '@/lib/auth';
import { dayNumber, formatDay, formatDotRange, isDay, today } from '@/lib/dates';
import { MOMENT_KINDS } from '@/lib/moments';
import { siteTitle } from '@/lib/settings';
import { urlFor } from '@/lib/storage';
import { weddingDateParts, weddingReady } from '@/lib/wedding';
import { Icon } from '@/components/Icon';
import { LightboxProvider } from '@/components/Lightbox';
import { ContactSheet, ShapeCollage, StationPhotos } from '@/components/PhotoGroups';
import { DaysCounter, MusicPlayer, RevealObserver } from '@/components/Ambient';
import { HeroLines, LineTrack, StripMap, Terminus } from '@/components/Line';
import { GuestbookForm } from '@/components/Guestbook';
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

/** Moments that are a change of line rather than just another stop. */
const TRANSFERS = new Set(['meet', 'anniversary', 'milestone']);

/**
 * The album. Our days together drawn as a metro line: two lines merge into
 * one red line, every public moment is a station on it, and everything we
 * chose to share hangs off those stations.
 */
export default async function AlbumHome({ searchParams }: Props) {
  const [album, session, params] = await Promise.all([loadPublicAlbum(), getSession(), searchParams]);
  const { settings: s, chapters, loose, featured, stamps, blessings, stats } = album;
  const wedding = weddingReady(s);

  // A personal link (?to=名字) belongs to the invitation, which greets the guest by name.
  const to = Array.isArray(params.to) ? params.to[0] : params.to;
  if (to && wedding) redirect(`/invitation?to=${encodeURIComponent(to)}`);

  const since = isDay(s.togetherSince) ? s.togetherSince : today();
  const sinceDot = formatDay(since, 'dot');
  const day = dayNumber(since, today());
  const music = s.music ? await urlFor(s.music, false) : null;
  const kindLabel = Object.fromEntries(MOMENT_KINDS.map((k) => [k.value, k.label]));
  const publicCount = chapters.reduce((sum, c) => sum + c.photos.length, 0) + loose.length;
  const outtakes = loose.slice(0, 24);
  const firstAfter = chapters.findIndex((chapter) => chapter.moment.startsOn >= since);
  const mergeAt = firstAfter === -1 ? chapters.length : firstAfter;
  const mergeStation = (
    <div className="station merge-stop" data-reveal>
      <span className="station-dot" data-stop />
      <div className="station-text">
        <p className="station-meta">
          <span className="station-kind">并线</span>
          <time>{sinceDot}</time>
        </p>
        <h3 className="station-title">
          {s.partnerA}线 × {s.partnerB}线，在这里并成一条
        </h3>
      </div>
    </div>
  );

  return (
    <LightboxProvider>
      <RevealObserver />
      <PublicNav settings={s} wedding={wedding} signedIn={Boolean(session)} active="home" />

      <header className="hero">
        <div className="hero-main">
          <div className="hero-copy">
            <p className="kicker">红线 · 两人专线</p>
            <h1 className="hero-names">
              <span className="name-a">{s.partnerA}</span>
              <span className="hero-amp" aria-label="和">
                &amp;
              </span>
              <span className="name-b">{s.partnerB}</span>
            </h1>
            {s.tagline ? <p className="hero-tagline">{s.tagline}</p> : null}
            {wedding ? <InviteEntry settings={s} /> : null}
          </div>
          {featured.length > 0 ? (
            <ShapeCollage
              photos={featured}
              sticker={`本线已安全运行 ${day.toLocaleString('zh-CN')} 天 · SINCE ${sinceDot} · `}
            />
          ) : (
            <p className="collage-empty quip">这里会放上我们最喜欢的几张照片</p>
          )}
        </div>
        <div className="hero-line">
          <HeroLines a={s.partnerA} b={s.partnerB} since={sinceDot} />
          <DaysCounter since={since} initialDay={day} />
        </div>
      </header>

      <main>
        <section className="section" id="story">
          <div className="section-head" data-reveal>
            <p className="kicker">Stations · 沿线站点</p>
            <h2 className="section-title">一站一站，都下车看过</h2>
            {s.intro ? <p className="section-sub">{s.intro}</p> : null}
          </div>

          <div className="stations">
            <LineTrack />
            {chapters.map(({ moment, photos, sealed }, i) => (
              <Fragment key={moment.id}>
                {i === mergeAt ? mergeStation : null}
                <article
                  id={`m-${moment.id}`}
                  className={`station ${TRANSFERS.has(moment.kind) ? 'transfer' : ''}`}
                  data-reveal
                >
                  <span className="station-dot" data-stop />
                  <div className="station-text">
                    <p className="station-meta">
                      <span className="station-no">{String(i + 1).padStart(2, '0')}</span>
                      <span className="station-kind">{kindLabel[moment.kind]}</span>
                      <time>{formatDotRange(moment.startsOn, moment.endsOn)}</time>
                      {moment.place ? <span>{moment.place}</span> : null}
                    </p>
                    <h3 className="station-title">
                      <Link href={`/moments/${moment.id}`}>{moment.title}</Link>
                    </h3>
                    {moment.story ? <p className="station-story">{moment.story}</p> : null}
                    <p className="station-foot">
                      {photos.length > 0 ? (
                        <Link href={`/moments/${moment.id}`} className="go">
                          进站看看 · {photos.length} 张 <Icon name="right" size={15} />
                        </Link>
                      ) : null}
                      {sealed > 0 ? (
                        <span className="sealed">
                          <Icon name="lock" size={13} /> 另有 {sealed} 张，仅限两位乘客
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {photos.length > 0 ? <StationPhotos photos={photos} label={moment.title} /> : null}
                </article>
              </Fragment>
            ))}
            {mergeAt === chapters.length ? mergeStation : null}

            <div className="station terminal" data-reveal>
              <span className="station-dot" data-stop />
              <div className="station-text">
                {wedding ? (
                  <>
                    <p className="station-meta">
                      <span className="station-kind soon">即将开通</span>
                      <time>{weddingDateParts(s).dot}</time>
                    </p>
                    <h3 className="station-title">下一站：婚礼</h3>
                    <p className="station-story">这一站，想请你一起来。</p>
                    <p className="station-foot">
                      <Link href="/invitation" className="btn btn-red">
                        看看请柬 <Icon name="right" size={16} />
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="station-meta">
                      <span className="station-kind soon">列车运行中</span>
                    </p>
                    <h3 className="station-title">{chapters.length === 0 ? '首班车，马上发车' : '下一站，还没想好'}</h3>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {outtakes.length > 0 ? (
          <section className="section" id="outtakes">
            <div className="section-head" data-reveal>
              <p className="kicker">Outtakes · 花絮</p>
              <h2 className="section-title">没进正片的</h2>
              <p className="section-sub">
                没写进任何一站，但一张也舍不得删。
                {outtakes.some((photo) => photo.note) ? '红笔圈出来的，背面写了字。' : ''}
              </p>
            </div>
            <div data-reveal>
              <ContactSheet photos={outtakes} />
            </div>
          </section>
        ) : null}

        {publicCount > 0 ? (
          <div className="all-photos" data-reveal>
            <Link href="/photos" className="all-photos-link">
              <span className="all-photos-num">{publicCount.toLocaleString('zh-CN')}</span>
              <span className="all-photos-text">张照片，按时间一张张看</span>
              <Icon name="right" size={30} />
            </Link>
          </div>
        ) : null}

        {stamps.length > 0 ? (
          <section className="section" id="places">
            <div className="section-head" data-reveal>
              <p className="kicker">Route map · 途经</p>
              <h2 className="section-title">一起去过的地方</h2>
              <p className="section-sub">按第一次到达的顺序排好，一共 {stamps.length} 站。</p>
            </div>
            <div data-reveal>
              <StripMap stops={stamps.map((stamp) => ({ place: stamp.place, year: stamp.day?.slice(0, 4) ?? null }))} />
            </div>
          </section>
        ) : null}

        <section className="section" id="numbers">
          <div className="section-head" data-reveal>
            <p className="kicker">Operations · 运营数据</p>
            <h2 className="section-title">本线运营数据</h2>
          </div>
          <dl className="ops" data-reveal>
            <div className="op op-red">
              <dt>安全运行</dt>
              <dd>
                {stats.days.toLocaleString('zh-CN')}
                <small>天</small>
              </dd>
            </div>
            <div className="op">
              <dt>一起过的周末</dt>
              <dd>
                {stats.weekends.toLocaleString('zh-CN')}
                <small>个</small>
              </dd>
            </div>
            {stats.places > 0 ? (
              <div className="op">
                <dt>途经站点</dt>
                <dd>
                  {stats.places}
                  <small>站</small>
                </dd>
              </div>
            ) : null}
            {stats.photos > 0 ? (
              <div className="op">
                <dt>拍下的照片</dt>
                <dd>
                  {stats.photos.toLocaleString('zh-CN')}
                  <small>张</small>
                </dd>
                <p>{stats.hidden > 0 ? `其中 ${stats.hidden} 张不对外开放` : '全部对外开放'}</p>
              </div>
            ) : null}
            {stats.valentines > 0 ? (
              <div className="op">
                <dt>情人节</dt>
                <dd>
                  {stats.valentines}
                  <small>个</small>
                </dd>
                <p>全部准点</p>
              </div>
            ) : null}
            <div className="op op-blue">
              <dt>剩余里程</dt>
              <dd>∞</dd>
              <p>本线路不设终点</p>
            </div>
          </dl>
        </section>

        <section className="section" id="guestbook">
          <div className="section-head" data-reveal>
            <p className="kicker">Messages · 留言</p>
            <h2 className="section-title">路过，请留言</h2>
            <p className="section-sub">
              写一句话给我们。{s.autoApproveNotes ? '' : '我们读过之后，会把它贴在这里。'}
            </p>
          </div>
          <div className="gb" data-reveal>
            <div className="gb-card">
              <GuestbookForm rsvp={false} deadline={null} />
            </div>
            {blessings.length > 0 ? (
              <div className="notes">
                {blessings.map((note, i) => (
                  <article key={note.id} className={`note note-${i % 4}`}>
                    <p>{note.message}</p>
                    <footer>{note.name}</footer>
                  </article>
                ))}
              </div>
            ) : (
              <p className="notes-empty quip">第一条留言的位置，给你留着。</p>
            )}
          </div>
        </section>
      </main>

      <footer className="terminus">
        <Terminus line={s.closingLine} sub={`${s.partnerA} & ${s.partnerB} 联合运营 · SINCE ${sinceDot}`} />
        <p className="terminus-fine">
          {wedding ? (
            <>
              <Link href="/invitation">婚礼请柬</Link>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <Link href="/photos">全部照片</Link>
          <span aria-hidden>·</span>
          <Link href="/login">员工通道</Link>
        </p>
      </footer>

      {music ? <MusicPlayer src={music} autoplayInWeChat={false} /> : null}
    </LightboxProvider>
  );
}
