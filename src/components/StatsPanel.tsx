import { useRef } from 'react';
import type { Analysis } from '../types';
import { CAT_COLOR, CAT_NAME, CAT_ORDER, DAILY_BUDGET } from '../data/catalogue';
import { fmt, fmtT } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { AnimatedNumber } from './ui/AnimatedNumber';

export function StatsPanel({ analysis: a }: { analysis: Analysis }) {
  const catRef = useRef<HTMLUListElement>(null);
  const total = a.monthTotal;
  const annualT = ((total / 30) * 365) / 1000;

  const ordered = CAT_ORDER.map((k) => [k, a.cats[k]] as const).sort((x, y) => y[1] - x[1]);
  const top = Math.max(...ordered.map((x) => x[1]), 0.0001);

  let lead = 'Footprints are lopsided. Seeing the split shows which habit is worth changing first.';
  if (total > 0 && a.prevTotal > 0) {
    const pct = Math.round((Math.abs(total - a.prevTotal) / a.prevTotal) * 100);
    lead =
      `${pct}% ${total <= a.prevTotal ? 'lower' : 'higher'} than the 30 days before. ` +
      (annualT <= 2.3
        ? 'At this pace you would land under the 2.3 t a year target.'
        : `At this pace you would emit ${fmtT(annualT)} t a year, against a 2.3 t target.`);
  } else if (total > 0) {
    lead += ' Keep logging and this page will compare you with earlier weeks.';
  }

  // Category bars grow from the left when the numbers change
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        '.cat-fill',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08, transformOrigin: 'left center', clearProps: 'transform' },
      );
    },
    { scope: catRef, dependencies: [ordered.map((o) => o[1].toFixed(1)).join(',')] },
  );

  return (
    <div className="insights-grid">
      <div>
        <h2 className="section-title">
          {total > 0 ? `Where the last 30 days’ ${fmt(total)} kg came from` : 'Log a few activities to see where your carbon goes'}
        </h2>
        <p className="lead">{lead}</p>

        <dl className="stats">
          <div>
            <dt>Today</dt>
            <dd>
              <AnimatedNumber value={a.todayTotal} /> <small>kg</small>
            </dd>
          </div>
          <div>
            <dt>Last 30 days</dt>
            <dd>
              <AnimatedNumber value={total} /> <small>kg</small>
            </dd>
          </div>
          <div>
            <dt>Yearly pace</dt>
            <dd>
              <AnimatedNumber value={total > 0 ? annualT : 0} format={fmtT} /> <small>t</small>
            </dd>
          </div>
        </dl>

        <label htmlFor="budget-meter" className="meter-label">
          Today against the {DAILY_BUDGET} kg daily budget
        </label>
        <meter
          id="budget-meter"
          min={0}
          max={Math.max(DAILY_BUDGET * 2, a.todayTotal)}
          low={DAILY_BUDGET}
          high={DAILY_BUDGET}
          optimum={0}
          value={a.todayTotal}
        />
        <p className="muted">
          {a.todayTotal > DAILY_BUDGET
            ? `${fmt(a.todayTotal)} kg so far, ${fmt(a.todayTotal - DAILY_BUDGET)} kg over budget.`
            : `${fmt(a.todayTotal)} kg so far, ${fmt(DAILY_BUDGET - a.todayTotal)} kg left in today’s budget.`}
        </p>
      </div>

      <div>
        <ul ref={catRef} className="cat-list">
          {ordered.map(([key, val]) => (
            <li key={key}>
              <div className="cat-head">
                <span>
                  <i className="swatch" style={{ background: CAT_COLOR[key] }} aria-hidden="true" />
                  {CAT_NAME[key]}
                </span>
                <span className="num">
                  {fmt(val)} kg · {total > 0 ? Math.round((val / total) * 100) : 0}%
                </span>
              </div>
              <div className="cat-track" aria-hidden="true">
                <div className="cat-fill" style={{ width: `${(val / top) * 100}%`, background: CAT_COLOR[key] }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="cat-total">
          <p>Total, last 30 days</p>
          <p className="big">
            <AnimatedNumber value={total} /> kg
          </p>
        </div>
      </div>
    </div>
  );
}
