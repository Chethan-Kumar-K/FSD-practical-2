import { useRef, type DragEvent } from 'react';
import type { Pledge, Recommendation } from '../types';
import { fmt } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { Button } from './ui/Button';

interface RecommendationsProps {
  recs: Recommendation[];
  pledges: Pledge[];
  onAdd: (recommendation: Recommendation) => void;
  onRemove: (id: string) => void;
}

export function Recommendations({ recs, pledges, onAdd, onRemove }: RecommendationsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pledgedIds = new Set(pledges.map((pledge) => pledge.id));
  const available = recs.filter((recommendation) => !pledgedIds.has(recommendation.id));

  function startDrag(event: DragEvent<HTMLLIElement>, id: string, from: 'suggestion' | 'pledge') {
    event.dataTransfer.setData('text/plain', `${from}:${id}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: 'suggestion' | 'pledge') {
    event.preventDefault();
    const [from, id] = event.dataTransfer.getData('text/plain').split(':');
    if (from === 'suggestion' && target === 'pledge') {
      const recommendation = recs.find((item) => item.id === id);
      if (recommendation) onAdd(recommendation);
    } else if (from === 'pledge' && target === 'suggestion') {
      onRemove(id);
    }
  }

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current?.querySelector('.rec')) return;
      gsap.from('.rec', { opacity: 0, x: -24, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'all' });
    },
    { scope: ref, dependencies: [recs.map((r) => r.id).join(',')] },
  );

  return (
    <div ref={ref} className="recs">
      <h3 className="section-subtitle">Changes that would cut the most</h3>
      {available.length === 0 ? (
        <p className="muted">
          {pledges.length > 0 ? 'You have pledged every suggested change. Keep logging to see new ideas.' : 'Log a few days of travel, electricity and meals and the biggest savings will appear here.'}
        </p>
      ) : (
        <ol
          className="suggest-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, 'suggestion')}
        >
          {available.map((r, i) => (
            <li key={r.id} className="rec" draggable onDragStart={(event) => startDrag(event, r.id, 'suggestion')}>
              <span className="rec-n">{i + 1}</span>
              <div>
                <h4>{r.title}</h4>
                <p>{r.detail}</p>
                <Button variant="outline" small onClick={() => onAdd(r)}>Pledge this</Button>
              </div>
              <p className="rec-saving">
                <strong>−{fmt(r.saving)} kg</strong>
                <span>per month</span>
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="muted">Savings are estimates for the last 30 days of your log, using illustrative emission factors.</p>
      <aside
        className="pledge-board"
        aria-labelledby="pledge-title"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, 'pledge')}
      >
        <h3 id="pledge-title" className="section-subtitle">My pledges</h3>
        {pledges.length === 0 ? (
          <p className="muted">Drag a change here, or press “Pledge this”.</p>
        ) : (
          <>
            <ul className="pledge-list">
              {pledges.map((pledge) => (
                <li key={pledge.id} className="pledge-item" draggable onDragStart={(event) => startDrag(event, pledge.id, 'pledge')}>
                  <div>
                    <p>{pledge.title}</p>
                    <strong>−{fmt(pledge.saving)} kg a month</strong>
                  </div>
                  <Button variant="outline" small onClick={() => onRemove(pledge.id)}>Remove</Button>
                </li>
              ))}
            </ul>
            <p className="pledge-total">
              {fmt(pledges.reduce((sum, pledge) => sum + pledge.saving, 0))} kg/month ·{' '}
              {fmt(pledges.reduce((sum, pledge) => sum + pledge.saving, 0) * 12)} kg/year
            </p>
            <p className="muted">Drag a pledge back to the suggestions to remove it.</p>
          </>
        )}
      </aside>
    </div>
  );
}
