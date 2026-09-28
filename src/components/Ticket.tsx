'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { LineMark } from './Line';

const PUNCHED_KEY = 'rt-ticket-punched';

const noSubscribe = () => () => {};
function readPunched() {
  try {
    return sessionStorage.getItem(PUNCHED_KEY) === '1';
  } catch {
    return false;
  }
}

type Chad = {
  id: number;
  dx: number;
  dy: number;
  turn: number;
  size: number;
  color: string;
  delay: number;
};
const CHAD_COLORS = ['#fff', '#f2402f', '#2f5bea', '#171614', '#fff', '#f2402f'];

/** The paper dots a ticket punch leaves behind, flying out and falling. */
function makeChads(): Chad[] {
  return Array.from({ length: 22 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const reach = 40 + Math.random() * 90;
    return {
      id: i,
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach * 0.6 + 60 + Math.random() * 120,
      turn: (Math.random() - 0.5) * 720,
      size: 7 + Math.random() * 8,
      color: CHAD_COLORS[i % CHAD_COLORS.length],
      delay: Math.random() * 0.08,
    };
  });
}

/**
 * The first thing a guest sees: a ticket with their name on it. Tapping
 * 检票 punches a hole (this tap is a user gesture, so the music may start),
 * and the ticket slides away to show the invitation.
 */
export function Ticket({
  to,
  line,
  names,
  carrier,
  date,
  time,
  venue,
  code,
}: {
  to: string | null;
  line: string;
  names: string;
  carrier: string;
  date: string;
  time: string;
  venue: string;
  code: string;
}) {
  const [stage, setStage] = useState<'ticket' | 'punched' | 'leaving' | 'gone'>('ticket');
  const [chads, setChads] = useState<Chad[]>([]);

  // Guests who already went through this visit go straight in,
  // unless they arrived through a personal link addressed to them.
  const punched = useSyncExternalStore(noSubscribe, readPunched, () => false);
  const hidden = stage === 'gone' || (stage === 'ticket' && punched && !to);

  useEffect(() => {
    if (hidden || stage === 'leaving') return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [hidden, stage]);

  const remember = () => {
    try {
      sessionStorage.setItem(PUNCHED_KEY, '1');
    } catch {}
  };

  const punch = useCallback(() => {
    if (stage !== 'ticket') return;
    remember();
    window.dispatchEvent(new Event('rt:play'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage('gone');
      return;
    }
    setChads(makeChads());
    setStage('punched');
    window.setTimeout(() => setStage('leaving'), 750);
    window.setTimeout(() => setStage('gone'), 1500);
  }, [stage]);

  if (hidden) return null;

  return (
    <div className={`ticket-overlay stage-${stage}`} role="dialog" aria-modal="true" aria-label="一张车票">
      <div className="ticket-wrap">
        <p className="ticket-lead">{to ? `${to}，这是你的车票` : line}</p>

        <div className="ticket">
          <div className="ticket-main">
            <div className="ticket-head">
              <span className="ticket-brand">
                <LineMark height={16} />
                红线 · 婚礼专列
              </span>
              <span className="ticket-code">{code}</span>
            </div>
            <div className="ticket-route">
              <p>
                <small>出发</small>
                <b>你在的地方</b>
              </p>
              <span className="ticket-arrow" aria-hidden>
                →
              </span>
              <p>
                <small>到达</small>
                <b>{venue || '我们的婚礼'}</b>
              </p>
            </div>
            <dl className="ticket-fields">
              <div>
                <dt>乘客</dt>
                <dd>{to ?? '亲爱的你'}</dd>
              </div>
              <div>
                <dt>日期</dt>
                <dd>{date}</dd>
              </div>
              <div>
                <dt>发车</dt>
                <dd>{time}</dd>
              </div>
              <div>
                <dt>座位</dt>
                <dd>随便坐，离我们近点</dd>
              </div>
              <div>
                <dt>票价</dt>
                <dd>一句祝福</dd>
              </div>
              <div>
                <dt>承运</dt>
                <dd>{carrier || names}</dd>
              </div>
            </dl>
          </div>

          <div className="ticket-stub">
            <button
              type="button"
              className="punch"
              onClick={punch}
              disabled={stage !== 'ticket'}
              aria-label="检票，打开请柬"
            >
              <span className="punch-hole" aria-hidden />
              <span className="punch-text">检票</span>
              {chads.map((chad) => (
                <span
                  key={chad.id}
                  className="chad"
                  aria-hidden
                  style={
                    {
                      '--dx': `${chad.dx}px`,
                      '--dy': `${chad.dy}px`,
                      '--turn': `${chad.turn}deg`,
                      '--size': `${chad.size}px`,
                      '--delay': `${chad.delay}s`,
                      background: chad.color,
                    } as CSSProperties
                  }
                />
              ))}
            </button>
            <span className="ticket-stub-names">{names}</span>
          </div>
        </div>

        <p className="ticket-hint">{stage === 'ticket' ? '点「检票」，进站看请柬' : ' '}</p>
      </div>
      {stage === 'ticket' ? (
        <button
          type="button"
          className="ticket-skip"
          onClick={() => {
            remember();
            setStage('gone');
          }}
        >
          跳过
        </button>
      ) : null}
    </div>
  );
}
