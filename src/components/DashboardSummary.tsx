import { useRef } from 'react';
import type { Analysis, FootprintEntry } from '../types';
import { DAILY_BUDGET } from '../data/catalogue';
import { fmt, shiftDate, todayStr } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

interface DashboardSummaryProps {
  analysis: Analysis;
  entries: FootprintEntry[];
}

function getStreak(entries: FootprintEntry[]): number {
  const today = todayStr();
  const byDate = new Map<string, number>();
  for (const entry of entries) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.kg);
  let date = byDate.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (byDate.has(date) && (byDate.get(date) ?? 0) <= DAILY_BUDGET) {
    streak += 1;
    date = shiftDate(date, -1);
  }
  return streak;
}

export function DashboardSummary({ analysis, entries }: DashboardSummaryProps) {
  const ref = useRef<HTMLElement>(null);
  const streak = getStreak(entries);
  const reduction = analysis.prevTotal > 0 ? ((analysis.prevTotal - analysis.monthTotal) / analysis.prevTotal) * 100 : 0;
  const budgetState = analysis.todayTotal === 0 ? 'Waiting for today' : analysis.todayTotal <= DAILY_BUDGET ? 'Under today’s budget' : 'Over today’s budget';
  const budgetTone = analysis.todayTotal === 0 ? 'neutral' : analysis.todayTotal <= DAILY_BUDGET ? 'good' : 'warn';

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from('[data-summary-card]', {
      y: 20,
      autoAlpha: 0,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="summary-wrap" aria-labelledby="summary-title">
      <div className="summary-heading">
        <div>
          <p className="eyebrow">Your live footprint</p>
          <h2 id="summary-title" className="section-title">A clearer picture, one day at a time</h2>
        </div>
        <a className="summary-link" href="#insights">See the full readout <span aria-hidden="true">↗</span></a>
      </div>
      <div className="summary-grid">
        <article className="summary-card summary-card-featured" data-summary-card>
          <span className="summary-label">Today</span>
          <strong className="summary-value">{fmt(analysis.todayTotal)} <small>kg</small></strong>
          <span className={`summary-status ${budgetTone}`}>{budgetState}</span>
          <div className="summary-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (analysis.todayTotal / DAILY_BUDGET) * 100)}%` }} /></div>
          <span className="summary-meta">Daily reference: {DAILY_BUDGET} kg CO₂e</span>
        </article>
        <article className="summary-card" data-summary-card>
          <span className="summary-label">Last 30 days</span>
          <strong className="summary-value">{fmt(analysis.monthTotal)} <small>kg</small></strong>
          <span className="summary-meta">{entries.length} logged {entries.length === 1 ? 'activity' : 'activities'}</span>
        </article>
        <article className="summary-card" data-summary-card>
          <span className="summary-label">Change vs previous</span>
          <strong className={`summary-value ${reduction >= 0 ? 'positive' : 'negative'}`}>{analysis.prevTotal > 0 ? `${reduction >= 0 ? '↓' : '↑'} ${fmt(Math.abs(reduction))}%` : '—'}</strong>
          <span className="summary-meta">{analysis.prevTotal > 0 ? '30-day comparison' : 'Keep logging to unlock this'}</span>
        </article>
        <article className="summary-card" data-summary-card>
          <span className="summary-label">Streak</span>
          <strong className="summary-value">{streak} <small>{streak === 1 ? 'day' : 'days'}</small></strong>
          <span className="summary-meta">{streak ? 'At or under budget' : 'Log an under-budget day to begin'}</span>
        </article>
      </div>
    </section>
  );
}
