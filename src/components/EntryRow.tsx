import { useRef } from 'react';
import type { FootprintEntry } from '../types';
import { CAT_NAME } from '../data/catalogue';
import { amountText, fmt, niceDate } from '../utils/format';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { Button } from './ui/Button';

interface EntryRowProps {
  entry: FootprintEntry;
  editing: boolean;
  onEdit: (entry: FootprintEntry) => void;
  /** Resolves true when the server removed the record. */
  onDelete: (id: number) => Promise<boolean>;
}

export function EntryRow({ entry, editing, onEdit, onDelete }: EntryRowProps) {
  const ref = useRef<HTMLLIElement>(null);

  // Slide the row out first, then delete; put it back if the server refuses.
  async function handleDelete() {
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      await onDelete(entry.id);
      return;
    }
    const slide = gsap.to(el, { opacity: 0, x: 80, duration: 0.3, ease: 'power2.in' });
    const ok = await onDelete(entry.id);
    if (!ok) {
      slide.kill();
      gsap.to(el, { opacity: 1, x: 0, duration: 0.25, clearProps: 'all' });
    }
  }

  const description = `${entry.label}, ${amountText(entry.amount, entry.unit)}, ${niceDate(entry.date)}`;

  return (
    <li ref={ref} className={'entry-row' + (editing ? ' is-editing' : '')} data-row data-id={entry.id}>
      <time className="entry-date" dateTime={entry.date}>
        {niceDate(entry.date, true)}
      </time>
      <div className="entry-main">
        <p className="entry-label">{entry.label}</p>
        <p className="entry-sub">
          {amountText(entry.amount, entry.unit)} · {CAT_NAME[entry.cat]}
        </p>
      </div>
      <p className="entry-kg">
        {fmt(entry.kg)} <small>kg</small>
      </p>
      <div className="entry-actions">
        <Button variant="outline" small onClick={() => onEdit(entry)} aria-label={`Edit ${description}`}>
          Edit
        </Button>
        <Button variant="danger" small onClick={handleDelete} aria-label={`Delete ${description}`}>
          Delete
        </Button>
      </div>
    </li>
  );
}
