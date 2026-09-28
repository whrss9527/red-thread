'use client';

import Link from 'next/link';

/** Anything that fails while rendering a page lands here instead of a bare error screen. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="login">
      <div className="login-card">
        <p className="kicker">Signal fault · 信号故障</p>
        <h1 className="login-title">这一站暂时停运</h1>
        <p className="muted">可能只是网络打了个盹，过一会儿再试一次。</p>
        <p className="muted small">
          如果网站刚刚部署好，多半是数据库或照片存储还没连接上，登录页会列出还差哪一步。
        </p>
        <div className="error-actions">
          <button type="button" className="btn btn-red" onClick={() => retry()}>
            再试一次
          </button>
          <Link href="/login" className="btn">
            检查设置
          </Link>
        </div>
        {error.digest ? <p className="faint small">错误编号 {error.digest}</p> : null}
      </div>
    </main>
  );
}
