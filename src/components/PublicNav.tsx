import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { Icon } from './Icon';
import { LineMark } from './Line';

type Active = 'home' | 'photos' | 'moment' | 'invitation';

/** The album's top bar. The wedding invitation is one entry among the album's pages. */
export function PublicNav({
  settings,
  wedding,
  signedIn,
  active,
}: {
  settings: Settings;
  wedding: boolean;
  signedIn: boolean;
  active: Active;
}) {
  return (
    <header className="pnav">
      <Link href="/" className="pnav-brand" aria-current={active === 'home' ? 'page' : undefined}>
        <LineMark height={18} />
        <span>
          {settings.partnerA}
          <i>&amp;</i>
          {settings.partnerB}
        </span>
      </Link>
      <nav className="pnav-links" aria-label="相册">
        <Link href="/#story">故事</Link>
        <Link href="/photos" className={active === 'photos' ? 'active' : undefined}>
          照片
        </Link>
        <Link href="/#places" className="hide-xs">
          足迹
        </Link>
        <Link href="/#guestbook" className="hide-xs">
          留言
        </Link>
        {wedding ? (
          <Link href="/invitation" className={`pnav-invite ${active === 'invitation' ? 'active' : ''}`}>
            <Icon name="ticket" size={16} />
            请柬
          </Link>
        ) : null}
        {signedIn ? (
          <Link href="/us" className="pnav-us" title="我们的小窝">
            <Icon name="home" size={16} />
            <span className="hide-xs">小窝</span>
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
