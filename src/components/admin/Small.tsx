'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon, type IconName } from '@/components/Icon';

/** Submit button that asks first. */
export function ConfirmSubmit({
  message,
  children,
  className = 'btn btn-danger',
  icon = 'trash',
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  icon?: IconName;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <Icon name={icon} size={16} />
      {children}
    </button>
  );
}

export function SaveButton({ children = '保存', className = 'btn btn-red' }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      <Icon name="check" size={17} />
      {pending ? '保存中…' : children}
    </button>
  );
}

/** Copies `text`, falling back to a hidden textarea where the clipboard API is missing. */
export function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const area = document.createElement('textarea');
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      <Icon name={done ? 'check' : 'link'} size={15} />
      {done ? '已复制' : label}
    </button>
  );
}
