import type { Analysis, CategoryKey, FootprintEntry, Recommendation } from '../types';
import { FACTORS as F } from '../data/catalogue';

/**
 * Pure function ported from Part 1 (tools.js): totals, 14/30 day series and
 * the "biggest saving first" recommendations, all derived from the log.
 */
export function analyse(entries: FootprintEntry[], today: string): Analysis {
  const DAY = 86400000;
  const t = (s: string) => Date.parse(s + 'T00:00:00Z');
  const todayT = t(today);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const cats: Record<CategoryKey, number> = { travel: 0, energy: 0, food: 0, shopping: 0 };
  const kinds: Record<string, { amount: number; kg: number }> = {};
  const byDay14: number[] = new Array(14).fill(0);
  const byDay30: number[] = new Array(30).fill(0);
  let monthTotal = 0;
  let prevTotal = 0;
  let todayTotal = 0;

  for (const e of entries) {
    const age = Math.round((todayT - t(e.date)) / DAY); // 0 = today
    if (age < 0 || !(e.cat in cats)) continue;
    if (age === 0) todayTotal += e.kg;
    if (age < 14) byDay14[13 - age] += e.kg;
    if (age < 30) byDay30[29 - age] += e.kg;
    if (age < 30) {
      monthTotal += e.kg;
      cats[e.cat] += e.kg;
      const k = kinds[e.kind] ?? (kinds[e.kind] = { amount: 0, kg: 0 });
      k.amount += e.amount;
      k.kg += e.kg;
    } else if (age < 60) {
      prevTotal += e.kg;
    }
  }

  const recs: Recommendation[] = [];
  const push = (id: string, title: string, detail: string, saving: number) => {
    if (saving >= 0.5) recs.push({ id, title, detail, saving: r1(saving) });
  };

  if (kinds.car) {
    const km = kinds.car.amount;
    push(
      'car-metro',
      'Take the metro or a bus for half your car trips',
      `You drove ${r1(km)} km in the last 30 days. Moving half of that to the metro saves the most for the least change.`,
      km * 0.5 * (F.car - F.metro),
    );
  }
  if (kinds.auto) {
    const km = kinds.auto.amount;
    push(
      'auto-metro',
      'Use the metro instead of an auto-rickshaw on regular routes',
      `You rode ${r1(km)} km by auto-rickshaw. Switching half of it to the metro or a bus trims those routes.`,
      km * 0.5 * (F.auto - F.metro),
    );
  }
  if (kinds.flight) {
    const km = kinds.flight.amount;
    push(
      'flight-train',
      'Take the train instead of flying',
      `You flew ${r1(km)} km. The same distance by train emits about a fifth as much.`,
      km * (F.flight - F.train),
    );
  }
  if (kinds.elec) {
    const kwh = kinds.elec.amount;
    push(
      'ac',
      'Set the air conditioner to 24–26 °C',
      `You used ${r1(kwh)} kWh of electricity. A few degrees higher on the thermostat cuts cooling use. This estimate assumes 10% less.`,
      kwh * 0.1 * F.elec,
    );
  }
  if (kinds.mutton) {
    const n = Math.min(Math.floor(kinds.mutton.amount), 4);
    if (n >= 1) {
      push(
        'mutton-veg',
        `Swap ${n} mutton meal${n > 1 ? 's' : ''} for vegetarian ones`,
        `Mutton is the highest-carbon meal on the list. Each swap saves about ${r1(F.mutton - F.veg)} kg.`,
        n * (F.mutton - F.veg),
      );
    }
  }
  if (kinds.chicken) {
    const n = Math.min(Math.floor(kinds.chicken.amount), 4);
    if (n >= 1) {
      push(
        'chicken-veg',
        `Swap ${n} chicken meal${n > 1 ? 's' : ''} for vegetarian ones`,
        `Each swap saves about ${r1(F.chicken - F.veg)} kg, so a few a month adds up without changing how you eat the rest of the time.`,
        n * (F.chicken - F.veg),
      );
    }
  }
  if (cats.shopping > 0) {
    push(
      'shop-secondhand',
      'Repair, or buy second-hand, half of what you buy new',
      `Clothes and devices made ${r1(cats.shopping)} kg of your last 30 days. Second-hand and repaired goods avoid most of that.`,
      cats.shopping * 0.5,
    );
  }
  recs.sort((a, b) => b.saving - a.saving);

  return { today, cats, byDay14, byDay30, monthTotal, prevTotal, todayTotal, recs: recs.slice(0, 5) };
}
