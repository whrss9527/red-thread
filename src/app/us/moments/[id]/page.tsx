import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { MOMENT_KINDS, getMoment } from '@/lib/moments';
import { listPhotos, toCards } from '@/lib/photos';
import { getSettings } from '@/lib/settings';
import { formatDotRange } from '@/lib/dates';
import { Icon } from '@/components/Icon';
import { PhotoMasonry } from '@/components/PhotoGroups';

export const dynamic = 'force-dynamic';

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/us/moments/${id}`);
  const moment = await getMoment(id);
  if (!moment) notFound();
  const [settings, rows] = await Promise.all([getSettings(), listPhotos({ momentId: id })]);
  const cards = await toCards(rows, settings, { forUs: true });
  const kind = MOMENT_KINDS.find((k) => k.value === moment.kind)?.label;

  return (
    <article className="moment-page">
      <Link href="/us/moments" className="muted back-link">
        <Icon name="left" size={16} /> 所有回忆
      </Link>
      <header className="moment-head">
        <p className="kicker">
          {kind} · {moment.visibility === 'private' ? '只给彼此' : '公开'}
        </p>
        <h1>{moment.title}</h1>
        <p className="moment-meta">
          {[formatDotRange(moment.startsOn, moment.endsOn), moment.place, `${rows.length} 张`].filter(Boolean).join(' · ')}
        </p>
        {moment.story ? <p className="moment-story">{moment.story}</p> : null}
        <div className="moment-actions">
          <Link href={`/admin/moments/${moment.id}`} className="btn btn-sm">
            <Icon name="edit" size={15} /> 编辑这段回忆
          </Link>
          <Link href={`/admin/upload?moment=${moment.id}`} className="btn btn-sm">
            <Icon name="upload" size={15} /> 往里放照片
          </Link>
        </div>
      </header>
      {cards.length > 0 ? (
        <PhotoMasonry photos={cards} />
      ) : (
        <div className="empty">
          <p className="quip">这段回忆还没有照片</p>
        </div>
      )}
    </article>
  );
}
