'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { PhotoCard } from '@/lib/types';
import { formatDay } from '@/lib/dates';
import { Circled, FadeImg, PhotoButton, blurStyle } from './Photo';
import { useLightbox } from './Lightbox';
import { Sticker } from './Line';
import { Icon } from './Icon';

/** Keeps extreme panoramas and slivers from wrecking a row. */
const ratioOf = (photo: PhotoCard) => Math.min(Math.max(photo.width / photo.height || 1, 0.6), 1.9);

const SHAPES = ['arch', 'circle', 'pill'] as const;

/** Our favourite photos in three shapes, with a turning sticker on top. */
export function ShapeCollage({ photos, sticker }: { photos: PhotoCard[]; sticker: string }) {
  const { open } = useLightbox();
  const shown = photos.slice(0, 3);
  return (
    <div className={`collage collage-${shown.length}`}>
      {shown.map((photo, i) => (
        <PhotoButton
          key={photo.id}
          photo={photo}
          eager
          className={`collage-${SHAPES[i]}`}
          onOpen={() => open(photos, i)}
        />
      ))}
      <Sticker text={sticker} />
    </div>
  );
}

/**
 * A station's photos in one justified row: every photo keeps its shape and
 * the row keeps one height. Four on wide screens, three on phones.
 */
export function StationPhotos({ photos, label }: { photos: PhotoCard[]; label: string }) {
  const { open } = useLightbox();
  const shown = photos.slice(0, 4);
  return (
    <div className="row-photos">
      {shown.map((photo, i) => {
        const ratio = ratioOf(photo);
        return (
          <button
            key={photo.id}
            type="button"
            className="ph row-photo"
            style={{ ...blurStyle(photo), flexGrow: ratio, aspectRatio: String(ratio) } as CSSProperties}
            onClick={() => open(photos, i)}
            aria-label={photo.caption || `${label} 的照片`}
          >
            <FadeImg src={photo.thumb} alt={photo.caption ?? ''} />
            {i === 2 && photos.length > 3 ? <span className="row-more row-more-3">+{photos.length - 3}</span> : null}
            {i === 3 && photos.length > 4 ? <span className="row-more row-more-4">+{photos.length - 4}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Photos that belong to no station, printed as a contact sheet. The frames
 * with something written on the back are circled in red grease pencil.
 */
export function ContactSheet({ photos }: { photos: PhotoCard[] }) {
  const { open } = useLightbox();
  return (
    <div className="sheet">
      <p className="sheet-edge" aria-hidden>
        {'RED LINE 400 ▸ 红线 ▸ '.repeat(8)}
      </p>
      <div className="sheet-grid">
        {photos.map((photo, i) => (
          <figure key={photo.id} className="frame">
            <PhotoButton photo={photo} className="frame-img" onOpen={() => open(photos, i)} />
            {photo.note ? <Circled seed={photo.id} /> : null}
            <figcaption className="frame-no">
              {i + 1}
              <small>A</small>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="sheet-edge sheet-edge-bottom" aria-hidden>
        {'▸ 24 ▸ 25 ▸ 26 ▸ 27 ▸ 28 ▸ 29 ▸ 30 ▸ 31 '.repeat(4)}
      </p>
    </div>
  );
}

/** A station's full set: every photo in its own shape, with its caption. */
export function PhotoWall({ photos }: { photos: PhotoCard[] }) {
  const { open } = useLightbox();
  return (
    <div className="wall-grid">
      {photos.map((photo, i) => (
        <figure key={photo.id} className="wall-item">
          <PhotoButton
            photo={photo}
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            onOpen={() => open(photos, i)}
          />
          {photo.caption || photo.takenAt || photo.note ? (
            <figcaption>
              {photo.caption ? <span className="wall-cap">{photo.caption}</span> : null}
              <span className="wall-meta">
                {photo.takenAt ? formatDay(photo.takenAt.slice(0, 10), 'dot') : ''}
                {photo.note ? (
                  <span className="wall-back">
                    <Icon name="flip" size={12} /> 背面有字
                  </span>
                ) : null}
              </span>
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

/** A horizontal row of photos at one height (那年今日, 我们最爱的). */
export function PhotoStrip({ photos }: { photos: PhotoCard[] }) {
  const { open } = useLightbox();
  return (
    <div className="pstrip">
      {photos.map((photo, i) => (
        <PhotoButton
          key={photo.id}
          photo={photo}
          showLock
          className="pstrip-item"
          style={{ aspectRatio: String(ratioOf(photo)) }}
          onOpen={() => open(photos, i)}
        />
      ))}
    </div>
  );
}

/** Masonry that keeps every photo's shape, lock and favourite badges included. */
export function PhotoMasonry({ photos }: { photos: PhotoCard[] }) {
  const { open } = useLightbox();
  return (
    <div className="masonry">
      {photos.map((photo, i) => (
        <button
          type="button"
          key={photo.id}
          className="tile"
          style={{ ...blurStyle(photo), aspectRatio: `${photo.width} / ${photo.height}` }}
          onClick={() => open(photos, i)}
          aria-label={photo.caption || '打开照片'}
        >
          <FadeImg src={photo.thumb} alt={photo.caption ?? ''} width={photo.width} height={photo.height} />
          {photo.isPrivate ? (
            <span className="lock-badge" title="只有我们看得到">
              <Icon name="lock" size={13} />
            </span>
          ) : null}
          {photo.favorite ? (
            <span className="tile-fav" title="我们最爱的">
              <Icon name="heart" filled size={14} />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Opens one photo (used for "抽一张回忆"). */
export function OpenPhotoButton({
  photos,
  index = 0,
  className,
  children,
}: {
  photos: PhotoCard[];
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useLightbox();
  return (
    <button type="button" className={className} onClick={() => open(photos, index)}>
      {children}
    </button>
  );
}

/**
 * A train window with our photos going past like scenery. Tapping opens the
 * photo when there is a lightbox around, otherwise the window is decoration.
 */
export function WindowCarousel({ photos, interval = 3400 }: { photos: PhotoCard[]; interval?: number }) {
  const { open } = useLightbox();
  const [{ index, previous }, setSlide] = useState<{ index: number; previous: number | null }>({
    index: 0,
    previous: null,
  });
  const [paused, setPaused] = useState(false);
  const count = photos.length;

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setSlide((current) => ({ index: (current.index + 1) % count, previous: current.index }));
    }, interval);
    return () => window.clearInterval(timer);
  }, [paused, count, interval]);

  if (count === 0) return null;
  const photo = photos[index];
  const where = [photo.place, photo.takenAt ? formatDay(photo.takenAt.slice(0, 10), 'dot') : null].filter(Boolean);

  return (
    <figure
      className="window"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button type="button" className="window-glass" onClick={() => open(photos, index)} aria-label="打开这张照片">
        {photos.map((p, i) => (
          <span
            key={p.id}
            className={`window-slide ${i === index ? 'on' : i === previous ? 'off' : ''}`}
            style={blurStyle(p)}
          >
            <FadeImg src={p.thumb} alt="" eager={i < 2} />
          </span>
        ))}
        <span className="window-shine" />
      </button>
      <figcaption className="window-caption">
        <span>窗外{where.length ? ` · ${where.join(' · ')}` : ''}</span>
        <span className="window-count">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
      </figcaption>
    </figure>
  );
}
