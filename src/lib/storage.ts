import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { DEMO_KEY, newToken } from './ids';

/**
 * Same storage providers and environment variables as exif-photo-blog
 * (Cloudflare R2, AWS S3, MinIO, Vercel Blob), plus any S3-compatible bucket
 * (阿里云 OSS, 腾讯云 COS …) and a local folder for development / Docker.
 *
 * Files are uploaded straight from the browser, so the server never has to
 * carry photo bytes; the database only stores the storage *key*.
 */
export type StorageKind =
  | 'vercel-blob'
  | 'cloudflare-r2'
  | 'aws-s3'
  | 'minio'
  | 's3-compatible'
  | 'local';

const env = process.env;
const stripProtocol = (value?: string) => value?.replace(/^https?:\/\//, '').replace(/\/+$/, '');

const BLOB_STORE_ID = env.BLOB_READ_WRITE_TOKEN?.match(
  /^vercel_blob_rw_([a-z0-9]+)_[a-z0-9]+$/i,
)?.[1]?.toLowerCase();

const configured: Record<StorageKind, boolean> = {
  'vercel-blob': Boolean(BLOB_STORE_ID),
  'cloudflare-r2': Boolean(
    env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET &&
      env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID &&
      env.CLOUDFLARE_R2_ACCESS_KEY &&
      env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  ),
  'aws-s3': Boolean(
    env.NEXT_PUBLIC_AWS_S3_BUCKET &&
      env.NEXT_PUBLIC_AWS_S3_REGION &&
      env.AWS_S3_ACCESS_KEY &&
      env.AWS_S3_SECRET_ACCESS_KEY,
  ),
  minio: Boolean(
    env.NEXT_PUBLIC_MINIO_BUCKET &&
      env.NEXT_PUBLIC_MINIO_DOMAIN &&
      env.MINIO_ACCESS_KEY &&
      env.MINIO_SECRET_ACCESS_KEY,
  ),
  's3-compatible': Boolean(
    env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_ACCESS_KEY,
  ),
  local: true,
};

function pickStorage(): StorageKind {
  const preferred = env.NEXT_PUBLIC_STORAGE_PREFERENCE as StorageKind | undefined;
  if (preferred && configured[preferred]) return preferred;
  // Object storage we recommend first; Vercel Blob stays supported as an alternative.
  const order: StorageKind[] = ['cloudflare-r2', 'aws-s3', 'minio', 's3-compatible', 'vercel-blob'];
  return order.find((kind) => configured[kind]) ?? 'local';
}

export const STORAGE: StorageKind = pickStorage();

export const STORAGE_LABEL: Record<StorageKind, string> = {
  'vercel-blob': 'Vercel Blob',
  'cloudflare-r2': 'Cloudflare R2',
  'aws-s3': 'AWS S3',
  minio: 'MinIO',
  's3-compatible': 'S3 兼容存储',
  local: '本地磁盘',
};

/** `STORAGE_SIGNED_URLS=1`: the bucket is private, every read gets a signed URL. */
const SIGN_EVERYTHING = env.STORAGE_SIGNED_URLS === '1';

type S3Target = {
  bucket: string;
  client: () => Promise<S3Client>;
  /** Base URL for public reads; undefined means "always sign". */
  publicBase?: string;
  /** Where the S3 API lives, for messages. */
  host: string;
  /** Environment variable names, so the storage check can say which one to fix. */
  vars: { bucket: string; key: string; secret: string; endpoint: string; publicDomain?: string };
};

let s3ClientCache: Promise<S3Client> | undefined;
function s3Client(options: S3ClientConfig) {
  return () => {
    s3ClientCache ??= import('@aws-sdk/client-s3').then(
      ({ S3Client: Client }) =>
        new Client({
          ...options,
          // Newer SDKs add CRC checksums to every request by default, which R2,
          // OSS, COS and older MinIO reject; only send them where S3 requires.
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
        }),
    );
    return s3ClientCache;
  };
}

function s3Target(): S3Target | null {
  switch (STORAGE) {
    case 'cloudflare-r2': {
      const domain = stripProtocol(env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN);
      const host = `${env.NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      return {
        bucket: env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET!,
        publicBase: domain ? `https://${domain}` : undefined,
        host,
        vars: {
          bucket: 'NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET',
          key: 'CLOUDFLARE_R2_ACCESS_KEY',
          secret: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
          endpoint: 'NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID',
          publicDomain: 'NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_DOMAIN',
        },
        client: s3Client({
          region: 'auto',
          endpoint: `https://${host}`,
          credentials: {
            accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY!,
            secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
          },
        }),
      };
    }
    case 'aws-s3': {
      const bucket = env.NEXT_PUBLIC_AWS_S3_BUCKET!;
      const region = env.NEXT_PUBLIC_AWS_S3_REGION!;
      return {
        bucket,
        publicBase: `https://${bucket}.s3.${region}.amazonaws.com`,
        host: `s3.${region}.amazonaws.com`,
        vars: {
          bucket: 'NEXT_PUBLIC_AWS_S3_BUCKET',
          key: 'AWS_S3_ACCESS_KEY',
          secret: 'AWS_S3_SECRET_ACCESS_KEY',
          endpoint: 'NEXT_PUBLIC_AWS_S3_REGION',
        },
        client: s3Client({
          region,
          credentials: {
            accessKeyId: env.AWS_S3_ACCESS_KEY!,
            secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY!,
          },
        }),
      };
    }
    case 'minio': {
      const protocol = env.NEXT_PUBLIC_MINIO_DISABLE_SSL === '1' ? 'http' : 'https';
      const port = env.NEXT_PUBLIC_MINIO_PORT ? `:${env.NEXT_PUBLIC_MINIO_PORT}` : '';
      const endpoint = `${protocol}://${stripProtocol(env.NEXT_PUBLIC_MINIO_DOMAIN)}${port}`;
      const bucket = env.NEXT_PUBLIC_MINIO_BUCKET!;
      return {
        bucket,
        publicBase: `${endpoint}/${bucket}`,
        host: stripProtocol(endpoint)!,
        vars: {
          bucket: 'NEXT_PUBLIC_MINIO_BUCKET',
          key: 'MINIO_ACCESS_KEY',
          secret: 'MINIO_SECRET_ACCESS_KEY',
          endpoint: 'NEXT_PUBLIC_MINIO_DOMAIN',
        },
        client: s3Client({
          region: 'us-east-1',
          endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: env.MINIO_ACCESS_KEY!,
            secretAccessKey: env.MINIO_SECRET_ACCESS_KEY!,
          },
        }),
      };
    }
    case 's3-compatible': {
      const base = env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '');
      return {
        bucket: env.S3_BUCKET!,
        publicBase: base || undefined,
        host: stripProtocol(env.S3_ENDPOINT)!,
        vars: {
          bucket: 'S3_BUCKET',
          key: 'S3_ACCESS_KEY',
          secret: 'S3_SECRET_ACCESS_KEY',
          endpoint: 'S3_ENDPOINT',
          publicDomain: 'S3_PUBLIC_BASE_URL',
        },
        client: s3Client({
          region: env.S3_REGION || 'auto',
          endpoint: env.S3_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE === '1',
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY!,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
          },
        }),
      };
    }
    default:
      return null;
  }
}

const S3 = s3Target();

async function presign(key: string, method: 'GET' | 'PUT', contentType?: string) {
  const [{ GetObjectCommand, PutObjectCommand }, { getSignedUrl }] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('@aws-sdk/s3-request-presigner'),
  ]);
  const client = await S3!.client();
  if (method === 'PUT') {
    const command = new PutObjectCommand({
      Bucket: S3!.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    return getSignedUrl(client, command, { expiresIn: 60 * 15 });
  }
  // Sign from the start of the UTC day, valid for two days: every visitor gets
  // the same URL all day long, so browsers and CDNs can actually cache it.
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const command = new GetObjectCommand({ Bucket: S3!.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 60 * 60 * 48, signingDate: day });
}

/**
 * Resolve a stored key to something an <img> can load.
 * `isPrivate` photos never use a public bucket domain when signing is possible.
 */
export async function urlFor(key: string, isPrivate: boolean): Promise<string> {
  if (/^https?:\/\//.test(key)) return key;
  if (DEMO_KEY.test(key)) return `/${key}`;
  switch (STORAGE) {
    case 'vercel-blob':
      return `https://${BLOB_STORE_ID}.public.blob.vercel-storage.com/${key}`;
    case 'local':
      return `/files/${key}`;
    default:
      if (!isPrivate && !SIGN_EVERYTHING && S3?.publicBase) return `${S3.publicBase}/${key}`;
      return presign(key, 'GET');
  }
}

export type UploadTicket =
  | { via: 'vercel-blob' }
  | { via: 'put'; url: string; headers: Record<string, string> };

/** How the browser should upload a file to `key`. */
export async function uploadTicket(key: string, contentType: string): Promise<UploadTicket> {
  switch (STORAGE) {
    case 'vercel-blob':
      return { via: 'vercel-blob' };
    case 'local':
      return {
        via: 'put',
        url: `/api/upload/local?key=${encodeURIComponent(key)}`,
        headers: { 'Content-Type': contentType },
      };
    default:
      return {
        via: 'put',
        url: await presign(key, 'PUT', contentType),
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      };
  }
}

export function localPath(key: string) {
  const root = path.resolve(
    /*turbopackIgnore: true*/ env.LOCAL_STORAGE_DIR || path.join(process.cwd(), '.data', 'uploads'),
  );
  const file = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!file.startsWith(root + path.sep)) throw new Error('Invalid key');
  return file;
}

export async function deleteKeys(keys: (string | null | undefined)[]) {
  const real = keys.filter((key): key is string => Boolean(key) && !DEMO_KEY.test(key!));
  if (real.length === 0) return;
  switch (STORAGE) {
    case 'vercel-blob': {
      const { del } = await import('@vercel/blob');
      await del(real.map((key) => `https://${BLOB_STORE_ID}.public.blob.vercel-storage.com/${key}`));
      return;
    }
    case 'local':
      await Promise.all(real.map((key) => fs.rm(localPath(key), { force: true })));
      return;
    default: {
      // One request per file: multi-object delete needs Content-MD5 on some
      // S3-compatible services, a plain DeleteObject works everywhere.
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = await S3!.client();
      await Promise.all(real.map((Key) => client.send(new DeleteObjectCommand({ Bucket: S3!.bucket, Key }))));
    }
  }
}


const R2_VARS = [
  'NEXT_PUBLIC_CLOUDFLARE_R2_ACCOUNT_ID',
  'NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET',
  'CLOUDFLARE_R2_ACCESS_KEY',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
];

/** Shown on the login page and in the admin so a misconfiguration is obvious. */
export function storageWarning(): string | null {
  const missing = R2_VARS.filter((name) => !env[name]);
  if (STORAGE !== 'cloudflare-r2' && missing.length > 0 && missing.length < R2_VARS.length) {
    return `Cloudflare R2 还没接上：还差 ${missing.join('、')}。在 Vercel 项目的 Settings → Environment Variables 里补上，然后重新部署。`;
  }
  if (STORAGE === 'local' && env.VERCEL) {
    return '还没有连接照片存储：照片要放在对象存储里。按 README 的“准备 Cloudflare R2”建一个存储桶，把 R2 的四个环境变量填进 Vercel 项目的 Settings → Environment Variables，然后重新部署。';
  }
  return null;
}

/* ------------------------------------------------------------ self-check */

export type CheckState = 'ok' | 'warn' | 'fail';
export type CheckLine = { label: string; state: CheckState; detail?: string };
export type ProbeLoad = { label: string; url: string; hint: string };
export type StorageCheck = {
  label: string;
  lines: CheckLine[];
  /** A test photo for the browser to upload and open; null when there is no point trying. */
  probe: { key: string; loads: ProbeLoad[] } | null;
  /** The CORS policy to paste, when the bucket does not have one yet. */
  cors: string | null;
};

/** Browsers upload straight to the bucket, so it has to allow cross-origin PUTs. */
const CORS_POLICY = `[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type", "cache-control"],
    "MaxAgeSeconds": 3600
  }
]`;

/** Test photos look like real ones (every upload route accepts them) but start with `check`. */
const PROBE_KEY = /^photos\/check[a-z0-9]{7}-[a-z0-9]{20}-sm\.jpg$/;

const NETWORK_ERRORS = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'CERT_HAS_EXPIRED']);

/** What went wrong, in words; `null` when the key was refused (the caller knows what it asked for). */
function s3Reason(error: unknown, t: S3Target): string | null {
  const e = error as {
    name?: string;
    code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
    $response?: { statusCode?: number };
  };
  const status = e.$metadata?.httpStatusCode ?? e.$response?.statusCode;
  // R2 keys belong to one Cloudflare account, so a wrong Account ID looks like a wrong key.
  const account = STORAGE === 'cloudflare-r2' ? `，也看看 ${t.vars.endpoint} 是不是同一个 Cloudflare 账号的` : '';
  switch (e.name) {
    case 'InvalidAccessKeyId':
      return `Access Key 不对：检查 ${t.vars.key}${account}。`;
    case 'SignatureDoesNotMatch':
      return `Secret Access Key 不对：检查 ${t.vars.secret}（复制时别带上空格）。`;
    case 'NoSuchBucket':
      return `找不到名叫“${t.bucket}”的存储桶：检查 ${t.vars.bucket}，名字区分大小写。`;
    case 'PermanentRedirect':
    case 'AuthorizationHeaderMalformed':
      return `存储桶不在这个区域：检查 ${t.vars.endpoint}。`;
  }
  if (status === 401 || e.name === 'Unauthorized') return `密钥不对：检查 ${t.vars.key} 和 ${t.vars.secret}${account}。`;
  if (status === 403 || e.name === 'AccessDenied') return null;
  if (NETWORK_ERRORS.has(e.code ?? '') || e.name === 'TimeoutError') {
    return `连不上 ${t.host}：检查 ${t.vars.endpoint}。`;
  }
  // Not an S3 answer at all (a plain-text or HTML error page): wrong address, or the service is down.
  if (status && (status >= 500 || /Deserialization error/i.test(e.message ?? ''))) {
    return `${t.host} 没有正常回应（HTTP ${status}）：检查 ${t.vars.endpoint}；没填错的话，可能是存储服务暂时出了问题，过一会儿再检查一次。`;
  }
  return `${e.name ?? 'Error'}：${e.message ?? ''}（检查 ${t.vars.endpoint}、${t.vars.key} 和 ${t.vars.secret}）`;
}

/** Asks the bucket, like a browser would, whether this site may PUT to it. */
async function checkCors(t: S3Target, key: string, origin: string): Promise<CheckLine> {
  const label = '允许网页直接上传（CORS）';
  try {
    const response = await fetch(await presign(key, 'PUT', 'image/jpeg'), {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'cache-control,content-type',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const allowed = response.headers.get('access-control-allow-origin');
    if (response.ok && (allowed === '*' || allowed === origin)) return { label, state: 'ok' };
    const where = STORAGE === 'cloudflare-r2' ? '（R2：存储桶 → Settings → CORS Policy）' : '';
    return {
      label,
      state: 'fail',
      detail: `存储桶还不允许 ${origin} 直接上传：把下面这段 CORS 规则贴进存储桶的 CORS 设置${where}，保存后再检查一次。`,
    };
  } catch (error) {
    return { label, state: 'warn', detail: `没能检查：${(error as Error).message}` };
  }
}

/**
 * Server half of the storage check on /admin/upload. The browser then uploads
 * the test photo through the normal upload path, opens it the ways the album
 * does, and asks for it to be deleted (`removeProbe`).
 */
export async function checkStorage(origin: string): Promise<StorageCheck> {
  const label = STORAGE_LABEL[STORAGE];
  const key = `photos/check${newToken().slice(0, 7)}-${newToken()}-sm.jpg`;

  if (STORAGE === 'local') {
    const warning = storageWarning();
    if (warning) return { label, lines: [{ label: '照片存储', state: 'fail', detail: warning }], probe: null, cors: null };
    // /files only serves photos that are in the database, so there is nothing to open.
    return { label, lines: [], probe: { key, loads: [] }, cors: null };
  }

  if (STORAGE === 'vercel-blob') {
    try {
      const { list } = await import('@vercel/blob');
      await list({ limit: 1 });
    } catch (error) {
      const line: CheckLine = { label: '连接 Vercel Blob', state: 'fail', detail: (error as Error).message };
      return { label, lines: [line], probe: null, cors: null };
    }
    const hint = '打不开：确认 Blob 存储的访问方式是 Public。';
    return {
      label,
      lines: [{ label: '连接 Vercel Blob', state: 'ok' }],
      probe: { key, loads: [{ label: '打开刚传上去的照片', url: await urlFor(key, false), hint }] },
      cors: null,
    };
  }

  const t = S3!;
  const lines: CheckLine[] = [];
  const bucketLabel = `连接存储桶 ${t.bucket}`;
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    await (await t.client()).send(new ListObjectsV2Command({ Bucket: t.bucket, MaxKeys: 1 }));
    lines.push({ label: bucketLabel, state: 'ok' });
  } catch (error) {
    const reason = s3Reason(error, t);
    if (reason) return { label, lines: [{ label: bucketLabel, state: 'fail', detail: reason }], probe: null, cors: null };
    lines.push({
      label: bucketLabel,
      state: 'warn',
      detail: '这把密钥不能列出桶里的文件。有的权限设置就是这样，不影响使用；下面的上传测试会告诉你它能不能写入。',
    });
  }

  const cors = await checkCors(t, key, origin);
  lines.push(cors);

  const loads: ProbeLoad[] = [];
  if (t.publicBase && !SIGN_EVERYTHING) {
    const where =
      STORAGE === 'cloudflare-r2'
        ? '确认这个域名已经连到存储桶（R2：存储桶 → Settings → Custom Domains）'
        : '确认存储桶允许公开读取，或者设置 STORAGE_SIGNED_URLS=1 让所有照片都走签名链接';
    loads.push({
      label: `打开公开照片（${stripProtocol(t.publicBase)}）`,
      url: `${t.publicBase}/${key}`,
      hint: `打不开：${where}。`,
    });
  } else {
    lines.push({
      label: '公开照片',
      state: 'ok',
      detail: SIGN_EVERYTHING
        ? 'STORAGE_SIGNED_URLS=1：所有照片都用签名链接。'
        : `没有设置公开域名，所有照片都用签名链接，也能用。${t.vars.publicDomain ? `给存储桶绑定自己的域名并填进 ${t.vars.publicDomain}，公开照片会打开得更快。` : ''}`,
    });
  }
  loads.push({
    label: '打开私密照片（签名链接）',
    url: await presign(key, 'GET'),
    hint: `这台设备打不开 ${t.host} 上的签名链接：可能是网络连不上它，也可能是服务器时间不准。`,
  });

  return { label, lines, probe: { key, loads }, cors: cors.state === 'fail' ? CORS_POLICY : null };
}

/** Deletes the storage check's test photo, which also proves the key may delete. */
export async function removeProbe(key: string): Promise<CheckLine> {
  const label = '删除测试照片';
  if (!PROBE_KEY.test(key)) return { label, state: 'fail', detail: 'Invalid key' };
  try {
    await deleteKeys([key]);
    return { label, state: 'ok' };
  } catch (error) {
    const reason = S3 ? s3Reason(error, S3) : (error as Error).message;
    return {
      label,
      state: 'fail',
      detail: reason ?? '这把密钥没有删除权限：以后删照片时，存储里的文件会留下来（R2 的 API 令牌选 Object Read & Write 就有）。',
    };
  }
}
