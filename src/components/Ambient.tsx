'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TIMEZONE, dayNumber, today, zonedToEpoch } from '@/lib/dates';
import { Icon } from './Icon';

/** Adds `.in` to every `[data-reveal]` element as it scrolls into view. */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]:not(.in)');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

const TIME_OF_DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const subscribeClock = (tick: () => void) => {
  const timer = window.setInterval(tick, 1000);
  return () => window.clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const serverClock = () => null;

/** Current time, ticking every second; `null` while server rendering / hydrating. */
function useNow(): number | null {
  return useSyncExternalStore(subscribeClock, clockSnapshot, serverClock);
}

/** "本线已安全运行 N 天", with today's hours, minutes and seconds running on. */
export function DaysCounter({ since, initialDay }: { since: string; initialDay: number }) {
  const now = useNow();
  let day = initialDay;
  let clock = '';
  if (now !== null) {
    // Counted in the album's time zone, so it agrees with the server wherever the reader is.
    day = dayNumber(since, today(TIMEZONE, new Date(now)));
    clock = TIME_OF_DAY.format(now);
  }
  return (
    <div className="counter">
      <p className="kicker">本线已安全运行</p>
      <p className="counter-number">
        <span suppressHydrationWarning>{day.toLocaleString('zh-CN')}</span>
        <small>天</small>
        <span className="counter-clock" suppressHydrationWarning>
          {clock}
        </span>
      </p>
    </div>
  );
}

export function WeddingCountdown({ date, time }: { date: string; time: string }) {
  const now = useNow();
  if (now === null) return <p className="countdown">&nbsp;</p>;
  const target = zonedToEpoch(date, time);
  const diff = target - now;
  if (diff <= 0) {
    const days = Math.floor(-diff / 86_400_000);
    return (
      <p className="countdown">
        {days === 0 ? '就是今天！' : `我们已经结婚 ${days.toLocaleString('zh-CN')} 天啦`}
      </p>
    );
  }
  const days = Math.floor(diff / 86_400_000);
  const rest = Math.floor((diff % 86_400_000) / 1000);
  return (
    <p className="countdown">
      <span className="countdown-label">距离婚礼还有</span>
      <b>{days}</b> 天
      <span className="countdown-clock">
        {pad(Math.floor(rest / 3600))}:{pad(Math.floor((rest % 3600) / 60))}:{pad(rest % 60)}
      </span>
    </p>
  );
}

/** Background music; starts on the ticket's `rt:play` event or a tap. */
export function MusicPlayer({ src, autoplayInWeChat }: { src: string; autoplayInWeChat: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const play = () => {
      el.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    };
    window.addEventListener('rt:play', play);
    // WeChat allows sound once its JS bridge is ready, the way most H5 invitations do it.
    if (autoplayInWeChat) document.addEventListener('WeixinJSBridgeReady', play, { once: true });
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    el.addEventListener('pause', onPause);
    el.addEventListener('play', onPlay);
    return () => {
      window.removeEventListener('rt:play', play);
      document.removeEventListener('WeixinJSBridgeReady', play);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('play', onPlay);
    };
  }, [autoplayInWeChat]);

  return (
    <>
      <audio ref={audio} src={src} loop preload="none" />
      <button
        type="button"
        className={`music ${playing ? 'on' : ''}`}
        aria-label={playing ? '暂停音乐' : '播放音乐'}
        onClick={() => {
          const el = audio.current;
          if (!el) return;
          if (el.paused) void el.play().catch(() => {});
          else el.pause();
        }}
      >
        {playing ? (
          <span className="music-bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Icon name="music" size={18} />
        )}
      </button>
    </>
  );
}
