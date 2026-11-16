import type { FootprintEntry } from '../types';
import { DAILY_BUDGET } from '../data/catalogue';
import { fmt, shiftDate, todayStr } from '../utils/format';

export function ProgressPanel({ entries, previousTotal, monthTotal }: {
  entries: FootprintEntry[];
  previousTotal: number;
  monthTotal: number;
}) {
  const today = todayStr();
  const byDate = new Map<string, number>();
  for (const entry of entries) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.kg);

  let date = byDate.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (byDate.has(date) && (byDate.get(date) ?? 0) <= DAILY_BUDGET) {
    streak++;
    date = shiftDate(date, -1);
  }
  const daysUnderBudget = Array.from({ length: 7 }, (_, index) => byDate.get(shiftDate(today, -index)))
    .filter((value) => value !== undefined && value <= DAILY_BUDGET).length;
  const reduction = previousTotal > 0 ? Math.max(0, ((previousTotal - monthTotal) / previousTotal) * 100) : 0;

  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div>
        <h3 id="progress-title" className="section-subtitle">Your goals and streak</h3>
        <p><strong className="progress-number">{streak}-day streak</strong></p>
        <p className="muted">{streak ? `Days in a row at or under ${DAILY_BUDGET} kg.` : 'Log a day under budget to start a streak.'}</p>
      </div>
      <div>
        <label htmlFor="weekly-goal">Days under budget this week</label>
        <progress id="weekly-goal" max={7} value={daysUnderBudget} />
        <p className="muted">{daysUnderBudget} of 7 days under budget.</p>
      </div>
      <div>
        <label htmlFor="reduction-goal">Progress toward a 10% reduction</label>
        <progress id="reduction-goal" max={100} value={Math.min(100, reduction * 10)} />
        <p className="muted">
          {previousTotal > 0 ? `${fmt(reduction)}% lower than the previous 30 days. Target: 10%.` : 'Needs 60 days of data to compare.'}
        </p>
      </div>
    </section>
  );
}
