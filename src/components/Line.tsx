'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

/**
 * The album's mark: two lines, one blue and one yellow, running into a
 * single red one. Also drawn large in the hero and small in the favicon.
 */
export function LineMark({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <svg
      className={`line-mark ${className ?? ''}`}
      width={(height * 48) / 32}
      height={height}
      viewBox="0 0 48 32"
      fill="none"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h10l9 9" stroke="var(--blue)" />
      <path d="M4 25h10l9-9" stroke="var(--yellow)" />
      <path d="M21 16h20" stroke="var(--red)" />
      <circle cx="41" cy="16" r="3.4" fill="var(--paper)" stroke="var(--red)" strokeWidth={2.8} />
    </svg>
  );
}

/**
 * The hero's line map: each of us on our own line until the day they merge,
 * then one red line running on to today. Drawn at the container's real pixel
 * size (measured after mount) so labels never stretch.
 */
export function HeroLines({ a, b, since }: { a: string; b: string; since: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const narrow = width < 560;
  const yA = 36;
  const yB = narrow ? 108 : 124;
  const yM = (yA + yB) / 2;
  const bend = yM - yA;
  const xM = Math.round(Math.min(Math.max(width * (narrow ? 0.42 : 0.3), 150), 420));
  const end = width - 16;

  return (
    <div ref={ref} className="merge" data-reveal style={{ height: yB + 40 }}>
      {width > 0 ? (
        <svg width={width} height={yB + 40} viewBox={`0 0 ${width} ${yB + 40}`} aria-hidden>
          <g fill="none" strokeWidth={narrow ? 7 : 9} strokeLinecap="round" strokeLinejoin="round">
            <path className="draw draw-a" pathLength={1} d={`M10 ${yA}H${xM - bend}L${xM} ${yM}`} stroke="var(--blue)" />
            <path className="draw draw-b" pathLength={1} d={`M10 ${yB}H${xM - bend}L${xM} ${yM}`} stroke="var(--yellow)" />
            <path className="draw draw-red" pathLength={1} d={`M${xM} ${yM}H${end}`} stroke="var(--red)" />
          </g>
          <g className="merge-stops">
            <circle cx={10} cy={yA} r={7} className="stop stop-a" />
            <circle cx={10} cy={yB} r={7} className="stop stop-b" />
            <circle cx={xM} cy={yM} r={narrow ? 11 : 13} className="stop stop-x" />
            <circle cx={end} cy={yM} r={narrow ? 7 : 8} className="now-dot" />
            <circle cx={end} cy={yM} r={narrow ? 7 : 8} className="now-ping" />
          </g>
          <text x={28} y={yA - 14} className="merge-name">
            {a}
          </text>
          <text x={28} y={yB + 32} className="merge-name">
            {b}
          </text>
          <text x={xM} y={yM + (narrow ? 34 : 40)} textAnchor="middle" className="merge-date">
            {since}
          </text>
          <text x={end} y={yM - 20} textAnchor="end" className="merge-now">
            现在
          </text>
        </svg>
      ) : null}
    </div>
  );
}

/**
 * The red line down the side of the stations. It fills in as the reader
 * scrolls, a dot marks where the train is, and stations light up once
 * they have been passed.
 */
export function LineTrack() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = ref.current;
    const host = track?.parentElement;
    if (!track || !host) return;
    let stops: { el: Element; y: number }[] = [];
    let from = 0;
    let to = 0;
    let frame = 0;

    // Positions are relative to the host; the track runs from the first stop to the last.
    const update = () => {
      frame = 0;
      const reach = window.innerHeight * 0.62 - host.getBoundingClientRect().top;
      track.style.setProperty('--reach', `${Math.min(Math.max(reach - from, 0), to - from)}px`);
      for (const stop of stops) stop.el.classList.toggle('lit', stop.y <= reach + 2);
    };
    const measure = () => {
      const top = host.getBoundingClientRect().top;
      stops = Array.from(host.querySelectorAll('[data-stop]')).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, y: r.top + r.height / 2 - top };
      });
      from = stops[0]?.y ?? 0;
      to = stops[stops.length - 1]?.y ?? host.offsetHeight;
      track.style.top = `${from}px`;
      track.style.height = `${Math.max(to - from, 0)}px`;
      update();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const resize = new ResizeObserver(measure);
    resize.observe(host);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(measure).catch(() => {});
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="track" aria-hidden>
      <span className="track-fill" />
      <span className="train" />
    </div>
  );
}

/** The places we have been, as the line diagram above a train door. */
export function StripMap({ stops }: { stops: { place: string; year: string | null }[] }) {
  return (
    <div className="strip-map">
      <ol className="strip-inner">
        {stops.map((stop, i) => (
          <li key={stop.place} className={`strip-stop ${i === 0 ? 'first' : ''}`}>
            <span className="strip-name">{stop.place}</span>
            <span className="strip-dot" />
            <span className="strip-year">{stop.year ?? '—'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A circle of text that turns slowly; used as a sticker on the hero photos. */
export function Sticker({ text }: { text: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <span className="sticker" aria-hidden>
      <svg viewBox="0 0 120 120" className="sticker-ring">
        <defs>
          <path id={`ring-${id}`} d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" />
        </defs>
        <circle cx="60" cy="60" r="59" className="sticker-bg" />
        <text className="sticker-text">
          <textPath href={`#ring-${id}`} textLength={280} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="sticker-core">
        <LineMark height={20} />
      </span>
    </span>
  );
}

/**
 * The end of the line. Tap the last station five times and the doors to
 * the driver's cab open — a way home only the two of us know about.
 */
export function Terminus({ line, sub }: { line: string; sub: string }) {
  const router = useRouter();
  const [taps, setTaps] = useState(0);
  const dot = useRef<HTMLButtonElement>(null);
  return (
    <div className="terminus-sign">
      <button
        ref={dot}
        type="button"
        className="terminus-dot"
        aria-label="终点站"
        onClick={() => {
          const el = dot.current;
          el?.classList.remove('bump');
          void el?.offsetWidth;
          el?.classList.add('bump');
          const next = taps + 1;
          setTaps(next);
          if (next >= 5) router.push('/us');
        }}
      />
      <p className="kicker">终点站</p>
      <p className="terminus-line">{line}</p>
      <p className="terminus-sub">{sub}</p>
    </div>
  );
}
