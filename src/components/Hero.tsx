import { useMemo, useRef } from 'react';
import type { FootprintEntry } from '../types';
import { DAILY_BUDGET, KIND } from '../data/catalogue';
import { fmt, niceDate, todayStr } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { AnimatedNumber } from './ui/AnimatedNumber';

const HEADLINE = 'Your day has a carbon bill. See it, then cut the biggest line.';
const MAX_LINES = 6;

interface HeroProps {
  entries: FootprintEntry[];
}

export function Hero({ entries }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const today = todayStr();

  // Group today's entries by activity, largest first (the "carbon receipt")
  const lines = useMemo(() => {
    const groups = new Map<string, { kind: string; amount: number; kg: number }>();
    for (const e of entries) {
      if (e.date !== today) continue;
      const g = groups.get(e.kind) ?? { kind: e.kind, amount: 0, kg: 0 };
      g.amount += e.amount;
      g.kg += e.kg;
      groups.set(e.kind, g);
    }
    return [...groups.values()].sort((a, b) => b.kg - a.kg);
  }, [entries, today]);

  const total = lines.reduce((s, g) => s + g.kg, 0);
  const rest = lines.slice(MAX_LINES);

  // Intro timeline: headline words, copy, buttons, then the receipt drops in
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.word', { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.05 })
        .from('.hero-lead, .hero-cta a', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.3')
        .from('.receipt', { y: 70, rotate: -3, opacity: 0, duration: 0.9, ease: 'back.out(1.4)' }, '-=0.8');
    },
    { scope: root },
  );

  return (
    <section id="home" ref={root} className="hero on-dark">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1 aria-label={HEADLINE}>
            {HEADLINE.split(' ').map((w, i) => (
              <span className="word-mask" key={i} aria-hidden="true">
                <span className="word">{w}</span>{' '}
              </span>
            ))}
          </h1>
          <p className="hero-lead">
            CarbonFootprint India turns your travel, electricity, food and shopping into a running total, and shows
            which changes cut it most.
          </p>
          <div className="hero-cta">
            <a className="btn btn-accent" href="#activities">
              Log today’s activity
            </a>
            <a className="btn btn-ghost-light" href="#insights">
              See where a month goes
            </a>
          </div>
        </div>

        <section className="receipt" aria-labelledby="receipt-title">
          <div className="receipt-paper">
            <div className="receipt-head">
              <h2 id="receipt-title">Your carbon receipt</h2>
              <p>
                <time dateTime={today}>Today, {niceDate(today)}</time>
              </p>
            </div>

            <ul className="receipt-lines">
              {lines.length === 0 && <li className="muted">Nothing logged today yet. Add an activity to start your receipt.</li>}
              {lines.slice(0, MAX_LINES).map((g, i) => {
                const k = KIND[g.kind];
                const largest = i === 0 && lines.length > 1;
                const unit = ['km', 'kWh', 'kg'].includes(k.unit) ? ' ' + k.unit : '';
                return (
                  <li key={g.kind} className={largest ? 'largest' : ''}>
                    <span>
                      {k.label}, {fmt(g.amount)}
                      {unit}
                      {largest && <span className="badge">Largest</span>}
                    </span>
                    <span className="dots" aria-hidden="true" />
                    <span className="num">{fmt(g.kg)} kg</span>
                  </li>
                );
              })}
              {rest.length > 0 && (
                <li>
                  <span>{rest.length} more activities</span>
                  <span className="dots" aria-hidden="true" />
                  <span className="num">{fmt(rest.reduce((s, g) => s + g.kg, 0))} kg</span>
                </li>
              )}
            </ul>

            <div className="receipt-total">
              <p>Total today</p>
              <p className="big">
                <AnimatedNumber value={total} /> <small>kg CO₂e</small>
              </p>
            </div>
            <p className="receipt-note">
              A 2.3 t a year target allows {DAILY_BUDGET} kg a day.{' '}
              {total === 0
                ? 'Log something to see where today stands.'
                : total > DAILY_BUDGET
                  ? `Today is ${fmt(total - DAILY_BUDGET)} kg over.`
                  : `Today is ${fmt(DAILY_BUDGET - total)} kg under.`}
            </p>
          </div>
          <svg className="receipt-teeth" aria-hidden="true">
            <defs>
              <pattern id="teeth" width="16" height="12" patternUnits="userSpaceOnUse">
                <path d="M0 0H16L8 12Z" className="teeth-fill" />
              </pattern>
            </defs>
            <rect width="100%" height="12" fill="url(#teeth)" />
          </svg>
        </section>
      </div>
    </section>
  );
}
