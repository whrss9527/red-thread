'use client';

import { useCallback, type CSSProperties } from 'react';
import type { PhotoCard } from '@/lib/types';
import { seeded } from '@/lib/ui';
import { Icon } from './Icon';

/** An <img> that fades in once loaded, over the photo's tiny blurred preview. */
export function FadeImg({
  src,
  alt,
  width,
  height,
  eager = false,
  className,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  eager?: boolean;
  className?: string;
}) {
  // Cached images can finish before hydration, when onLoad has no listener yet.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) img.classList.add('loaded');
  }, []);
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={(event) => event.currentTarget.classList.add('loaded')}
      onError={(event) => event.currentTarget.classList.add('loaded')}
    />
  );
}

export const blurStyle = (photo: Pick<PhotoCard, 'blurData' | 'color'>): CSSProperties => ({
  backgroundImage: photo.blurData ? `url("${photo.blurData}")` : undefined,
  backgroundColor: photo.color ?? undefined,
});

/**
 * A quick loop of red grease pencil, the mark a photographer leaves around
 * the frame they want on a contact sheet. Every loop is a little different.
 */
export function Circled({ seed, className = 'circled' }: { seed: string; className?: string }) {
  const start = -1.9 + seeded(seed, 1) * 0.6;
  const sweep = Math.PI * 2 + 0.35 + seeded(seed, 2) * 0.35;
  const steps = 44;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = start + sweep * t;
    // The hand drifts outward as it comes round, so the ends don't meet.
    const drift = 1 + t * 0.06 + (seeded(seed, 10 + (i % 6)) - 0.5) * 0.025;
    const x = 50 + Math.cos(angle) * 46 * drift;
    const y = 50 + Math.sin(angle) * 45 * drift;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d={d} pathLength={1} />
    </svg>
  );
}

/** A photo in a rounded frame that opens the lightbox. */
export function PhotoButton({
  photo,
  onOpen,
  className,
  style,
  eager,
  showLock,
  label,
}: {
  photo: PhotoCard;
  onOpen: () => void;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
  showLock?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`ph ${className ?? ''}`}
      style={{ ...blurStyle(photo), ...style }}
      onClick={onOpen}
      aria-label={label ?? (photo.caption || '打开照片')}
    >
      <FadeImg src={photo.thumb} alt={photo.caption ?? ''} eager={eager} />
      {showLock && photo.isPrivate ? (
        <span className="lock-badge" title="只有我们看得到">
          <Icon name="lock" size={13} />
        </span>
      ) : null}
    </button>
  );
}
