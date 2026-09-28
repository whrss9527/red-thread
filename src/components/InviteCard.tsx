import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Settings } from '@/lib/types';
import { mapLinks, trainCode, weddingDateParts, weddingSchedule } from '@/lib/wedding';
import { WeddingCountdown } from './Ambient';
import { Icon } from './Icon';

/** Each character on its own split-flap tile; the tiles flip in when the board comes into view. */
function Flaps({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <span className="flaps" aria-label={text}>
      {[...text].map((char, i) =>
        char === '.' || char === ':' ? (
          <span key={i} className="flap-sep" aria-hidden>
            {char}
          </span>
        ) : (
          <span key={i} className="flap" style={{ '--i': from + i } as CSSProperties} aria-hidden>
            {char}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * The invitation: who we are and what we would like, then a departure board
 * with the date, time and place, and the day's timetable.
 */
export function InviteCard({ settings: s, to }: { settings: Settings; to: string | null }) {
  const date = weddingDateParts(s);
  const schedule = weddingSchedule(s);
  const monthDay = `${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}`;
  return (
    <article className="invite">
      <header className="invite-head" data-reveal>
        <p className="kicker">Wedding special · 婚礼专列</p>
        {to ? (
          <p className="invite-to">
            诚挚邀请 <b>{to}</b>
          </p>
        ) : null}
        <h1 className="invite-names">
          <span className="name-a">{s.partnerA}</span>
          <i>&amp;</i>
          <span className="name-b">{s.partnerB}</span>
        </h1>
        <p className="invite-words">{s.weddingInvitation}</p>
      </header>

      <div className="board" data-reveal>
        <div className="board-top">
          <span>{trainCode(s)} 次 · 婚礼专列</span>
          <span className="board-live">正在检票</span>
        </div>
        <div className="board-main">
          <div className="board-date">
            <Flaps text={monthDay} />
            <span className="board-sub">
              {date.year} 年 · {date.weekday}
            </span>
          </div>
          <div className="board-time">
            <small>发车</small>
            <Flaps text={s.weddingTime} from={5} />
          </div>
        </div>
        {s.weddingVenue || s.weddingAddress ? (
          <div className="board-place">
            <small>到达</small>
            {s.weddingVenue ? <b>{s.weddingVenue}</b> : null}
            {s.weddingAddress ? <span>{s.weddingAddress}</span> : null}
          </div>
        ) : null}
        <div className="board-actions">
          {mapLinks(s).map((link) => (
            <a key={link.label} className="btn btn-sm" href={link.href} target="_blank" rel="noreferrer">
              <Icon name="map" size={15} /> {link.label}
            </a>
          ))}
          <a className="btn btn-sm" href="/wedding.ics" download>
            <Icon name="calendar" size={15} /> 加入日历
          </a>
        </div>
      </div>

      {schedule.length > 0 ? (
        <div className="timetable" data-reveal>
          <p className="kicker">Timetable · 时刻表</p>
          <ol>
            {schedule.map((item, i) => (
              <li key={i}>
                <time>{item.time}</time>
                <span>{item.what}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="invite-foot" data-reveal>
        {s.dressCode ? (
          <p className="invite-dress">
            <small>着装建议</small>
            {s.dressCode}
          </p>
        ) : null}
        <WeddingCountdown date={s.weddingDate} time={s.weddingTime} />
      </div>
    </article>
  );
}

/** The way into the invitation from the album: a ticket stub for the next stop. */
export function InviteEntry({ settings: s }: { settings: Settings }) {
  const date = weddingDateParts(s);
  return (
    <Link href="/invitation" className="stub">
      <span className="stub-main">
        <span className="stub-kicker">下一站 · 婚礼</span>
        <span className="stub-date">{date.dot}</span>
        <span className="stub-sub">
          {date.weekday} {s.weddingTime}
          {s.weddingVenue ? ` · ${s.weddingVenue}` : ''}
        </span>
      </span>
      <span className="stub-tear">
        请柬
        <Icon name="right" size={16} />
      </span>
    </Link>
  );
}
