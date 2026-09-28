import 'server-only';
import { cache } from 'react';
import { now, query, queryOne } from './db';
import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  siteTitle: '',
  partnerA: '阿初',
  partnerB: '小满',
  initials: 'C & M',
  togetherSince: '2020-05-20',
  firstMet: '',
  tagline: '一条只有两位乘客的线路。',
  intro: '我们把在一起的日子，画成了一张线路图。\n每一站都下车看过，照片也都拍了。',
  envelopeEnabled: true,
  envelopeLine: '给你留了一张票',
  weddingEnabled: false,
  weddingDate: '',
  weddingTime: '11:58',
  weddingVenue: '',
  weddingAddress: '',
  weddingLngLat: '',
  weddingInvitation: '这条线开了好几年，我们决定让它一直开下去。\n婚礼那天，想请你上车，一起热闹热闹。',
  weddingSchedule: '11:18 迎宾签到\n11:58 仪式开始\n12:30 喜宴',
  dressCode: '',
  rsvpEnabled: true,
  rsvpDeadline: '',
  autoApproveNotes: false,
  music: '',
  closingLine: '本线路仍在延长中',
};

const KEY = 'site';

/**
 * Wording the album used to ship with. Saving settings stores every field,
 * so a value still equal to one of these was never edited by us: it follows
 * the current default instead.
 */
const RETIRED_DEFAULTS: Partial<Record<keyof Settings, string>> = {
  tagline: '从一个人的晴天，走到两个人的四季。',
  intro: '传说月下老人会用一根看不见的红线，把注定的两个人系在一起。\n这是我们那根红线上，打过的每一个结。',
  envelopeLine: '有一封信，想亲手交给你',
  weddingInvitation: '我们决定把往后的日子，都过成一起的日子。\n诚邀你来见证这个重要的时刻，分享我们的喜悦。',
  closingLine: '余生请多指教',
};

function withCurrentDefaults(stored: Partial<Settings>): Settings {
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  for (const [key, retired] of Object.entries(RETIRED_DEFAULTS) as [keyof Settings, string][]) {
    if (settings[key] === retired) Object.assign(settings, { [key]: DEFAULT_SETTINGS[key] });
  }
  return settings;
}

/** Always reads the database; use it before writing. */
export async function readSettings(): Promise<Settings> {
  const row = await queryOne<{ value: string }>('SELECT value FROM settings WHERE key = $1', [KEY]);
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return withCurrentDefaults(JSON.parse(row.value) as Partial<Settings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Settings for rendering, read once per request. */
export const getSettings = cache(readSettings);

export async function saveSettings(patch: Partial<Settings>) {
  const current = await readSettings();
  const next = { ...current, ...patch };
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [KEY, JSON.stringify(next), now()],
  );
  return next;
}

export const siteTitle = (s: Settings) => s.siteTitle || `${s.partnerA} & ${s.partnerB} 的红线`;

export const partnerName = (s: Settings, partner: string | null | undefined) =>
  partner === 'a' ? s.partnerA : partner === 'b' ? s.partnerB : null;
