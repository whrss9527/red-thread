import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '坐过站了', robots: { index: false } };

/** Any address that is not on the map. */
export default function NotFound() {
  return (
    <main className="login">
      <div className="login-card">
        <p className="kicker">404 · 此站不存在</p>
        <h1 className="login-title">你好像坐过站了</h1>
        <p className="muted">这一站不在我们的线路图上。可能是链接抄错了，也可能是这一页被我们收起来了。</p>
        <div className="error-actions">
          <Link href="/" className="btn btn-red">
            回到线路图
          </Link>
          <Link href="/photos" className="btn">
            看看全部照片
          </Link>
        </div>
      </div>
    </main>
  );
}
