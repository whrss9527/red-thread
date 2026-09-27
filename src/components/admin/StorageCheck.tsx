'use client';

import { useState } from 'react';
import { finishStorageCheck, startStorageCheck } from '@/app/admin/actions';
import { uploadFiles } from '@/lib/image-client';
import type { CheckLine } from '@/lib/storage';
import { CopyButton } from '@/components/admin/Small';

const UPLOAD = '从这台设备上传一张测试照片';

/** A tiny red square: small enough to be instant, a real JPEG so every route accepts it. */
function testPhoto(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#c2343f';
  context.fillRect(0, 0, 8, 8);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('浏览器没能生成测试照片'))), 'image/jpeg', 0.9),
  );
}

/** Loads `src` the way the album does, as an <img>, so CORS on reads does not matter. */
function opens(src: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => resolve(false), 12000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    image.src = src;
  });
}

function uploadProblem(error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 0) return '浏览器没能把文件交给存储：多半是存储桶的 CORS 规则没配好（看上一项），也可能是这台设备的网络连不上存储。';
  if (status === 403) return '存储拒绝了这次上传：检查密钥有没有写入权限（R2 的 API 令牌要选 Object Read & Write）。';
  return (error as Error).message || '上传失败';
}

/**
 * "检查照片存储": walks through what an upload does — reach the bucket, upload
 * from this browser, open the photo publicly and privately, delete it — and
 * says in plain words which setting to fix.
 */
export function StorageCheck({ label }: { label: string }) {
  const [lines, setLines] = useState<CheckLine[]>([]);
  const [cors, setCors] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');

  async function run() {
    setState('running');
    setLines([]);
    setCors(null);
    const add = (line: CheckLine) => setLines((previous) => [...previous, line]);
    try {
      const check = await startStorageCheck(window.location.origin);
      check.lines.forEach(add);
      setCors(check.cors);
      if (check.probe) {
        const { key, loads } = check.probe;
        let uploaded = false;
        try {
          await uploadFiles([{ key, blob: await testPhoto() }]);
          uploaded = true;
          add({ label: UPLOAD, state: 'ok' });
        } catch (error) {
          add({ label: UPLOAD, state: 'fail', detail: uploadProblem(error) });
        }
        if (uploaded) {
          for (const load of loads) {
            add((await opens(load.url)) ? { label: load.label, state: 'ok' } : { label: load.label, state: 'fail', detail: load.hint });
          }
          add(await finishStorageCheck(key));
        }
      }
    } catch (error) {
      add({ label: '检查没能做完', state: 'fail', detail: (error as Error).message });
    }
    setState('done');
  }

  const failed = lines.filter((line) => line.state === 'fail').length;
  return (
    <section className="card storage-check" aria-live="polite">
      <div className="storage-check-head">
        <p className="small">
          照片存在 <strong>{label}</strong>
          {state === 'done' ? (failed ? ` · 有 ${failed} 项要处理` : ' · 一切正常，放心上传吧 ♡') : ''}
        </p>
        <button type="button" className="btn btn-sm" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? '检查中…' : state === 'done' ? '再检查一次' : '检查照片存储'}
        </button>
      </div>
      {lines.length > 0 ? (
        <ul className="probe-list">
          {lines.map((line, i) => (
            <li key={i} className={`probe-${line.state}`}>
              <strong>{line.label}</strong>
              {line.detail ? <span>{line.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {cors ? (
        <div className="probe-cors">
          <pre>{cors}</pre>
          <CopyButton text={cors} label="复制 CORS 规则" />
        </div>
      ) : null}
    </section>
  );
}
