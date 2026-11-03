import { useRef, useState } from 'react';
import type { Analysis } from '../types';
import { DAILY_BUDGET } from '../data/catalogue';
import { fmt, niceDate, shiftDate } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { Button } from './ui/Button';

const HINT = 'Hover or tap a bar to see that day. Dark bars stayed within budget, amber bars went over.';

export function BarChart({ analysis }: { analysis: Analysis }) {
  const [range, setRange] = useState<14 | 30>(14);
  const [active, setActive] = useState(-1);
  const plot = useRef<HTMLDivElement>(null);

  const values = range === 14 ? analysis.byDay14 : analysis.byDay30;
  const labels = values.map((_, i) => shiftDate(analysis.today, i - (values.length - 1)));
  const maxV = Math.max(DAILY_BUDGET * 1.3, ...values);

  // Bars grow up from the baseline whenever the data or range changes
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(
        '.bar',
        { scaleY: 0 },
        { scaleY: 1, duration: 0.6, ease: 'power3.out', stagger: 0.025, transformOrigin: 'bottom', clearProps: 'transform' },
      );
    },
    { scope: plot, dependencies: [range, values.join(',')] },
  );

  const readout =
    active < 0
      ? HINT
      : `${niceDate(labels[active], true)}: ${fmt(values[active])} kg CO₂e, ` +
        (values[active] === 0
          ? 'nothing logged.'
          : values[active] > DAILY_BUDGET
            ? `${fmt(values[active] - DAILY_BUDGET)} kg over budget.`
            : 'within budget.');

  return (
    <figure className="chart">
      <figcaption>The last {range} days against your daily budget</figcaption>
      <div className="range" role="group" aria-label="Chart range">
        {([14, 30] as const).map((n) => (
          <Button key={n} variant="outline" small aria-pressed={range === n} onClick={() => setRange(n)}>
            {n} days
          </Button>
        ))}
      </div>

      <div ref={plot} className="plot" onPointerLeave={() => setActive(-1)}>
        <div className="budget-line" style={{ bottom: `${(DAILY_BUDGET / maxV) * 100}%` }}>
          <span>Daily budget, {DAILY_BUDGET} kg</span>
        </div>
        {values.map((v, i) => (
          <div
            key={labels[i]}
            className={'bar-slot' + (i === active ? ' active' : '')}
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
          >
            <div className="bar-track">
              <div
                className={'bar' + (v > DAILY_BUDGET ? ' over' : '')}
                style={{ height: `${(v / maxV) * 100}%` }}
                role="img"
                aria-label={`${niceDate(labels[i], true)}: ${fmt(v)} kg`}
              />
            </div>
            <span className="bar-label">
              {i === values.length - 1 ? 'Today' : range === 14 || i % 2 === values.length % 2 ? Number(labels[i].slice(8)) : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="readout">{readout}</p>
    </figure>
  );
}
