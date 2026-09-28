/** Stable pseudo-random number in [0, 1) from a string, so layouts don't jump between renders. */
export function seeded(key: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const clampText = (value: string | null | undefined, max: number) =>
  (value ?? '').trim().slice(0, max);
