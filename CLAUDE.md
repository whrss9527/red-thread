@AGENTS.md

# 红线 (red-thread)

A couple's photo album. The public side is the album (`/`, `/moments/[id]`, `/photos`); the wedding invitation
(`/invitation`, envelope + card + RSVP) is one entry of it, shown only when `weddingEnabled` and a date are set.
The private side is `/us` (browsing, everything) and `/admin` (managing). Next.js 16 (App Router, Turbopack,
`src/proxy.ts` instead of middleware), React 19, hand-written CSS in `src/styles/` (no UI framework).
See README.md (Chinese).

## Commands

- `npm run dev` — zero config: PGlite in `.data/pglite`, photos in `.data/uploads`, dev login `us@love.local` / `together`
- `npm run typecheck`, `npm run lint`, `npm test` (node:test, `src/**/*.test.ts`), `npm run build`
- `node scripts/demo-art.mjs` regenerates `public/demo/*.svg` (sample album illustrations)

## Design

- The album is drawn as a metro line: each of us is a line (`--blue`, `--yellow`) until the day they merge into the
  red line (`--red`); moments are stations, the wedding is the next station, the invitation is a ticket. Keep new UI
  and copy inside that picture, and keep the voice playful and plain (no 余生请多指教-style clichés).
- Tokens live in `src/styles/base.css`. `--red` is for lines and large type only; small red text and red buttons use
  `--red-ink` (contrast). `--card` stays white in dark mode: cards are paper objects on a dark table.
- Type: 得意黑 Smiley Sans (`--display`, from `@chinese-fonts/dyh`, split by unicode range), Chivo Mono (`--mono`,
  chosen for its plain zero — dates are everywhere), system sans for text. Headings get `--display` by default.
- All stylesheets are global: grep for a class name before using it (`.stat` once collided with the admin).
- Default copy that has shipped goes into `RETIRED_DEFAULTS` (`src/lib/settings.ts`) when it changes, so stored
  settings that were never edited follow the new wording.

## Conventions

- Pages that read the database export `dynamic = 'force-dynamic'` (Cache Components are not enabled).
- Every page under `/us` and `/admin` calls `requireSession()`; every server action / route handler calls
  `assertSession()` / `getSession()` itself. The proxy is only an optimistic redirect.
- The browser only ever receives `PhotoCard` (`toCards`), never raw `Photo` rows: GPS, camera and the original
  file key stay on the server. Pass `{ forUs: true }` only on signed-in pages.
- Guests see public photos only (`visibility = 'public'`), and public moments only. Private photos inside a
  public moment are shown as a count (`sealed`), nothing else. Every public page reads through
  `loadPublicAlbum()` (`src/lib/album.ts`), which is where that filtering lives.
- Dates are stored as text (`YYYY-MM-DD`, wall-clock `YYYY-MM-DDTHH:mm:ss` for `taken_at`, ISO UTC for
  `created_at`) so PGlite and node-postgres return identical values. Calendar maths lives in `src/lib/dates.ts`.
- Schema changes: append idempotent statements to `src/lib/schema.ts` (`ADD COLUMN IF NOT EXISTS`).
- Storage keys: `photos/<id12>-<token20>-{lg,sm,orig}.<ext>`, `media/<token20>.<ext>`; validated by
  `src/lib/ids.ts`. Images are resized and stripped of EXIF in the browser (`src/lib/image-client.ts`).
- Read `NEXT_PUBLIC_*` values that the server needs at runtime through `src/lib/env.ts`
  (`process.env.NEXT_PUBLIC_X` is inlined at build time).
- Forms using `useActionState` must return what the user typed on error: React 19 resets the form after an action.
- Error boundaries (`error.tsx`) receive `retry()` in Next 16.3, not `reset()`.
- Photos live in object storage, Cloudflare R2 first (`src/lib/storage.ts` picks R2 → S3 → MinIO → S3-compatible →
  Vercel Blob → local disk); the database only stores keys. Browsers upload straight to the bucket with presigned PUTs.
  The S3 client sets `requestChecksumCalculation` / `responseChecksumValidation` to `WHEN_REQUIRED`: newer AWS SDKs
  otherwise put CRC checksum parameters in presigned URLs, which R2, OSS, COS and older MinIO reject.
- "检查照片存储" on `/admin/upload` (`checkStorage` / `removeProbe`, `StorageCheck.tsx`) lists the bucket, sends a CORS
  preflight, then the browser uploads a test photo (`photos/check…-sm.jpg`) through the normal upload path, opens it
  publicly and signed, and deletes it. Keep its messages naming the environment variable or setting to fix.
  moto answers every preflight permissively, so test CORS failures through a proxy that refuses OPTIONS.
- The README's "Deploy with Vercel" URL appears twice (top and 部署 section) and is generated: `stores` provisions
  Neon only, `env` asks for AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD and the four R2 variables, `envLink` points
  to `#准备-cloudflare-r2`. Keep both copies in sync.
- `src/lib/setup.ts` lists missing configuration (database, storage, secrets) on the login page; keep it free of
  database access so it still works when the database is what's missing.
- README, comments and UI text describe the album on its own terms: no "like / same as / based on <another project>"
  comparisons, in Chinese or English.
