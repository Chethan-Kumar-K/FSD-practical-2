import { useRef } from 'react';
import type { Recommendation } from '../types';
import { fmt } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

export function Recommendations({ recs }: { recs: Recommendation[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.rec', { opacity: 0, x: -24, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'all' });
    },
    { scope: ref, dependencies: [recs.map((r) => r.id).join(',')] },
  );

  return (
    <div className="recs">
      <h3 className="section-subtitle">Changes that would cut the most</h3>
      {recs.length === 0 ? (
        <p className="muted">Log a few days of travel, electricity and meals and the biggest savings will appear here.</p>
      ) : (
        <ol ref={ref}>
          {recs.map((r, i) => (
            <li key={r.id} className="rec">
              <span className="rec-n">{i + 1}</span>
              <div>
                <h4>{r.title}</h4>
                <p>{r.detail}</p>
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
    </div>
  );
}
