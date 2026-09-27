import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { mapLinks, weddingDateParts, weddingSchedule } from '@/lib/wedding';
import { WeddingCountdown } from './Ambient';
import { Icon } from './Icon';

/** The formal invitation card: date, place, directions, schedule. */
export function InviteCard({ settings: s, to }: { settings: Settings; to: string | null }) {
  const date = weddingDateParts(s);
  const schedule = weddingSchedule(s);
  return (
    <div className="invite" data-reveal>
      <span className="xi" aria-hidden>
        囍
      </span>
      <p className="invite-kicker">Wedding Invitation</p>
      <p className="invite-to">{to ? `诚挚邀请 ${to}` : `${s.partnerA} & ${s.partnerB}`}</p>
      <p className="invite-words">{s.weddingInvitation}</p>
      <div className="invite-date">
        <span>
          {date.year} 年 {date.month} 月
        </span>
        <span className="invite-day">{String(date.day).padStart(2, '0')}</span>
        <span>
          {date.weekday} {s.weddingTime}
        </span>
      </div>
      {s.weddingVenue || s.weddingAddress ? (
        <div>
          {s.weddingVenue ? <p className="invite-venue">{s.weddingVenue}</p> : null}
          {s.weddingAddress ? <p className="invite-address">{s.weddingAddress}</p> : null}
        </div>
      ) : null}
      <div className="invite-actions">
        {mapLinks(s).map((link) => (
          <a key={link.label} className="btn btn-sm" href={link.href} target="_blank" rel="noreferrer">
            <Icon name="map" size={15} /> {link.label}
          </a>
        ))}
        <a className="btn btn-sm" href="/wedding.ics" download>
          <Icon name="calendar" size={15} /> 加入日历
        </a>
      </div>
      {schedule.length > 0 ? (
        <ol className="invite-schedule">
          {schedule.map((item, i) => (
            <li key={i}>
              <time>{item.time}</time>
              <span>{item.what}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {s.dressCode ? <p className="invite-dress">着装建议：{s.dressCode}</p> : null}
      <WeddingCountdown date={s.weddingDate} time={s.weddingTime} />
    </div>
  );
}

/** The way into the invitation from the album: a little sealed envelope. */
export function InviteEntry({ settings: s }: { settings: Settings }) {
  const date = weddingDateParts(s);
  return (
    <Link href="/invitation" className="invite-entry">
      <span className="invite-entry-env" aria-hidden>
        <span className="invite-entry-seal">囍</span>
      </span>
      <span className="invite-entry-text">
        <span className="invite-entry-kicker">我们要结婚啦</span>
        <span className="invite-entry-date">
          {date.dot} · {date.weekday}
        </span>
        <span className="invite-entry-cta">
          打开请柬 <Icon name="right" size={14} />
        </span>
      </span>
    </Link>
  );
}
