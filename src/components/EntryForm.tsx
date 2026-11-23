import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CategoryKey, EntryInput, FootprintEntry } from '../types';
import { CAT_ORDER, CAT_SHORT, DAILY_BUDGET, buildEntry, categories } from '../data/catalogue';
import { fmt, lowerFirst, shiftDate, todayStr } from '../utils/format';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { RadioGroup } from './ui/RadioGroup';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

interface EntryFormProps {
  /** When set, the form edits this record (Update). Otherwise it creates one. */
  editing: FootprintEntry | null;
  /** Resolves true when the server accepted the record. */
  onSubmit: (input: EntryInput) => Promise<boolean>;
  onCancel: () => void;
  tripPrefill?: { kind: string; amount: number; version: number } | null;
}

interface Errors {
  amount?: string;
  date?: string;
}

const CATEGORY_OPTIONS = CAT_ORDER.map((k) => ({ value: k, label: CAT_SHORT[k] }));

export function EntryForm({ editing, onSubmit, onCancel, tripPrefill = null }: EntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  // Controlled form state (useState) for every input
  const [cat, setCat] = useState<CategoryKey>('travel');
  const [kind, setKind] = useState(categories.travel.options[0].id);
  const [amount, setAmount] = useState(String(categories.travel.start));
  const [date, setDate] = useState(todayStr());
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem('cfi.draft') ?? 'null');
      if (typeof saved !== 'object' || saved === null || !('cat' in saved) || !('kind' in saved) || !('amount' in saved)) return;
      const savedCategoryKey = CAT_ORDER.find((key) => key === saved.cat);
      if (!savedCategoryKey) return;
      const savedCategory = categories[savedCategoryKey];
      if (typeof saved.kind === 'string' && savedCategory.options.some((option) => option.id === saved.kind)) {
        setCat(savedCategoryKey);
        setKind(saved.kind);
      }
      if (typeof saved.amount === 'string') setAmount(saved.amount);
    } catch {
      // The form still works when session storage is disabled.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('cfi.draft', JSON.stringify({ cat, kind, amount }));
    } catch {
      // Some private browsing modes disable session storage.
    }
  }, [cat, kind, amount]);

  // Fill the form when an entry is chosen for editing
  useEffect(() => {
    if (!editing) return;
    setCat(editing.cat);
    setKind(editing.kind);
    setAmount(String(editing.amount));
    setDate(editing.date);
    setErrors({});
  }, [editing]);

  useEffect(() => {
    if (!tripPrefill || editing) return;
    setCat('travel');
    setKind(tripPrefill.kind);
    setAmount(String(tripPrefill.amount));
    setDate(todayStr());
    setErrors({});
  }, [editing, tripPrefill]);

  const def = categories[cat];
  const option = def.options.find((o) => o.id === kind) ?? def.options[0];
  const unit = option.unit ?? def.unit;
  const max = option.max ?? def.max;

  function changeCategory(next: CategoryKey) {
    setCat(next);
    setKind(categories[next].options[0].id);
    setAmount(String(categories[next].start));
    setErrors({});
  }

  function validate(): Errors {
    const found: Errors = {};
    const n = parseFloat(amount);
    if (amount.trim() === '' || Number.isNaN(n)) found.amount = 'Enter how much you did, for example 12.5.';
    else if (n <= 0) found.amount = 'Enter an amount above 0.';
    else if (n > max) found.amount = `That is more than ${fmt(max)} ${unit} in one entry. Check the number.`;

    if (!date) found.date = 'Choose the date of the activity.';
    else if (date > todayStr()) found.date = 'The date cannot be in the future.';
    else if (date < shiftDate(todayStr(), -730)) found.date = 'Choose a date within the last two years.';
    return found;
  }

  // Live estimate (same maths and wording as Part 1)
  const n = parseFloat(amount);
  const valid = !Number.isNaN(n) && n > 0 && n <= max;
  const kg = valid ? n * option.factor : 0;
  let context = 'Fix the amount to see the estimate.';
  let tip = '';
  if (valid) {
    context =
      kg < DAILY_BUDGET
        ? `That is ${Math.round((kg / DAILY_BUDGET) * 100)}% of one day’s budget of ${DAILY_BUDGET} kg.`
        : `That is ${fmt(kg / DAILY_BUDGET)} days of a ${DAILY_BUDGET} kg daily budget.`;
    if (def.compare) {
      const best = def.options
        .filter((o) => o.factor > 0 && (option.id === 'flight' ? o.id === 'train' : o.id !== 'train'))
        .reduce((a, b) => (b.factor < a.factor ? b : a));
      if (option.factor === 0) tip = 'Zero emissions. Nothing to cut here.';
      else if (option.factor > best.factor) {
        const alt = n * best.factor;
        tip = `Choosing ${lowerFirst(best.label)} instead would emit ${fmt(alt)} kg, saving ${fmt(kg - alt)} kg.`;
      } else tip = 'This is already among the lowest-carbon choices here.';
    } else tip = def.note ?? '';
  }

  useGSAP(() => {
    if (!valid || prefersReducedMotion()) return;
    gsap.fromTo('[data-estimate]', { y: 8, autoAlpha: 0.55 }, { y: 0, autoAlpha: 1, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
  }, { scope: formRef, dependencies: [kg, valid] });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (found.amount || found.date) return;

    setSaving(true);
    const ok = await onSubmit(buildEntry(date, option.id, n));
    setSaving(false);
    if (ok && !editing) {
      setAmount(String(def.start)); // ready for the next entry
      try {
        sessionStorage.removeItem('cfi.draft');
      } catch {
        // The saved draft is optional.
      }
    }
  }

  return (
    <form ref={formRef} className="card estimator" onSubmit={handleSubmit} noValidate>
      <div className="form-kicker"><span>{editing ? 'Updating your record' : 'Quick capture'}</span><span className="form-step-count">1—3</span></div>
      <h3 className="form-title">{editing ? 'Edit entry' : 'New entry'}</h3>
      <ol className="form-steps" aria-label="Entry steps">
        <li className="is-current"><span>01</span> Choose a category</li>
        <li><span>02</span> Describe it</li>
        <li><span>03</span> See the impact</li>
      </ol>

      <RadioGroup legend="Category" name="category" value={cat} options={CATEGORY_OPTIONS} onChange={changeCategory} />

      <div className="form-grid">
        <FormField label="What did you do?" htmlFor="kind">
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {def.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="How much?" htmlFor="amount" error={errors.amount}>
          <div className="input-unit">
            <input
              id="amount"
              type="number"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onPaste={(event) => {
                const text = event.clipboardData.getData('text');
                const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/);
                if (!match) return;
                event.preventDefault();
                setAmount(match[0]);
              }}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby="amount-error"
            />
            <span>{unit}</span>
          </div>
        </FormField>

        <FormField label="Date" htmlFor="entry-date" error={errors.date}>
          <input
            id="entry-date"
            type="date"
            value={date}
            max={todayStr()}
            min={shiftDate(todayStr(), -730)}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby="entry-date-error"
          />
        </FormField>

        <div className="form-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to my log'}
          </Button>
          {editing && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="result" data-estimate aria-live="polite">
        <p className="result-num">
          {fmt(kg)} <small>kg CO₂e</small>
        </p>
        <p className="result-context">{context}</p>
        <p className="result-tip">{tip}</p>
      </div>
      <p className="muted form-hint">Shortcuts: Ctrl+Enter to save · Alt+1–4 to choose a category · paste “12 km” into the amount.</p>
    </form>
  );
}
