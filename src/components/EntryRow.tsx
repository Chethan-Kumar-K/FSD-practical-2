import { useRef, useState, type TouchEvent } from 'react';
import type { FootprintEntry } from '../types';
import { CAT_NAME } from '../data/catalogue';
import { amountText, fmt, niceDate } from '../utils/format';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { Button } from './ui/Button';

interface EntryRowProps {
  entry: FootprintEntry;
  editing: boolean;
  onEdit: (entry: FootprintEntry) => void;
  onRepeat: (entry: FootprintEntry) => void;
  /** Resolves true when the server removed the record. */
  onDelete: (id: number) => Promise<boolean>;
}

export function EntryRow({ entry, editing, onEdit, onRepeat, onDelete }: EntryRowProps) {
  const ref = useRef<HTMLLIElement>(null);
  const touchStart = useRef<number | null>(null);
  const touchDelta = useRef(0);
  const [swipeX, setSwipeX] = useState(0);

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

  function onTouchStart(event: TouchEvent<HTMLLIElement>) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    touchStart.current = event.touches[0]?.clientX ?? null;
    touchDelta.current = 0;
  }

  function onTouchMove(event: TouchEvent<HTMLLIElement>) {
    if (touchStart.current === null) return;
    touchDelta.current = Math.min(0, event.touches[0].clientX - touchStart.current);
    setSwipeX(touchDelta.current);
  }

  function onTouchEnd() {
    const shouldDelete = touchDelta.current < -90;
    touchStart.current = null;
    touchDelta.current = 0;
    setSwipeX(0);
    if (shouldDelete) void handleDelete();
  }

  function onTouchCancel() {
    touchStart.current = null;
    touchDelta.current = 0;
    setSwipeX(0);
  }

  const description = `${entry.label}, ${amountText(entry.amount, entry.unit)}, ${niceDate(entry.date)}`;

  return (
    <li
      ref={ref}
      className={'entry-row' + (editing ? ' is-editing' : '')}
      data-row
      data-id={entry.id}
      style={{ transform: `translateX(${swipeX}px)`, opacity: Math.max(0.35, 1 + swipeX / 250) }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onDoubleClick={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest('button')) onRepeat(entry);
      }}
      title="Double-click to log this again today"
    >
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
        <Button variant="outline" small onClick={() => onRepeat(entry)} aria-label={`Log ${description} again today`}>
          Repeat
        </Button>
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
