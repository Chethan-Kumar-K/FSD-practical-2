import { useMemo, useRef, type CSSProperties } from 'react';
import type { Analysis, CategoryKey, FootprintEntry } from '../types';
import { CAT_COLOR, CAT_NAME, CAT_ORDER, DAILY_BUDGET } from '../data/catalogue';
import { fmt } from '../utils/format';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

interface CarbonStoryProps {
  analysis: Analysis;
  entries: FootprintEntry[];
}

const STORY_BEATS = [
  {
    kicker: 'Name the line',
    title: 'The biggest line is not a verdict. It is a lever.',
    copy: 'A receipt makes the invisible legible. Find the category carrying the most weight today, then decide what deserves a second look.',
  },
  {
    kicker: 'Turn the receipt',
    title: 'Scroll until the total becomes a map.',
    copy: 'The paper opens into your live footprint. Every bar below is calculated from the entries already in this tracker.',
  },
  {
    kicker: 'Make the next move',
    title: 'A smaller receipt starts with one logged choice.',
    copy: 'No perfect streak required. Log what happened, see the estimate, and let the next decision be more informed than the last.',
  },
];

function largestCategory(values: Record<CategoryKey, number>): CategoryKey | null {
  const available = CAT_ORDER.filter((cat) => values[cat] > 0);
  return available.sort((a, b) => values[b] - values[a])[0] ?? null;
}

export function CarbonStory({ analysis, entries }: CarbonStoryProps) {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const total = analysis.todayTotal;
  const todayCategories = useMemo(() => {
    const values = { travel: 0, energy: 0, food: 0, shopping: 0 } satisfies Record<CategoryKey, number>;
    for (const entry of entries) {
      if (entry.date === analysis.today) values[entry.cat] += entry.kg;
    }
    return values;
  }, [analysis.today, entries]);
  const largest = largestCategory(todayCategories);
  const loggedToday = entries.filter((entry) => entry.date === analysis.today).length;
  const categories = useMemo(
    () => CAT_ORDER.map((key) => ({ key, value: analysis.cats[key], color: CAT_COLOR[key], label: CAT_NAME[key] })),
    [analysis.cats],
  );
  const receiptCategories = categories.map((category) => ({ ...category, value: todayCategories[category.key] }));
  const maxReceiptCategory = Math.max(...receiptCategories.map((category) => category.value), 1);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: '(min-width: 900px)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { desktop, reduceMotion } = context.conditions as { desktop: boolean; reduceMotion: boolean };
        if (reduceMotion) return;

        const enter = gsap.timeline({ defaults: { ease: 'power3.out' } });
        enter
          .from('.story-intro > *', { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.1 })
          .from('.story-orb', { scale: 0.5, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.5)' }, '-=0.6');

        const sequence = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            pin: desktop ? pin.current : false,
            start: 'top top',
            end: desktop ? '+=1700' : '+=950',
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });

        sequence
          .to('.story-gridline', { opacity: 0.9, scale: 1.08, duration: 0.18 }, 0)
          .to('.story-orb', { xPercent: 18, yPercent: -10, scale: 1.25, rotation: 28, duration: 0.22 }, 0)
          .to('.story-receipt', { rotation: -5, yPercent: -5, scale: 0.9, duration: 0.25 }, 0.08)
          .to('.story-copy-panel', { xPercent: -4, duration: 0.25 }, 0.1)
          .to('.story-beat', { autoAlpha: 0, y: 24, duration: 0.08, stagger: 0.02 }, 0.05)
          .to('.story-beat:nth-child(1)', { autoAlpha: 1, y: 0, duration: 0.08 }, 0.12)
          .to('.story-category-ring', { rotation: 80, scale: 1.04, duration: 0.2 }, 0.2)
          .to('.story-beat:nth-child(1)', { autoAlpha: 0, y: -24, duration: 0.07 }, 0.28)
          .to('.story-beat:nth-child(2)', { autoAlpha: 1, y: 0, duration: 0.09 }, 0.3)
          .to('.story-receipt', { rotation: 3, yPercent: 2, scale: 1.02, duration: 0.2 }, 0.34)
          .to('.story-total-mark', { scale: 1.25, color: '#f7c65b', duration: 0.14 }, 0.4)
          .to('.story-beat:nth-child(2)', { autoAlpha: 0, y: -24, duration: 0.07 }, 0.52)
          .to('.story-beat:nth-child(3)', { autoAlpha: 1, y: 0, duration: 0.09 }, 0.54)
          .to('.story-receipt', { xPercent: 18, rotation: 8, scale: 0.88, duration: 0.22 }, 0.62)
          .to('.story-category-ring', { rotation: 180, scale: 1.12, duration: 0.22 }, 0.62)
          .to('.story-orb', { xPercent: -8, yPercent: 18, scale: 1.45, duration: 0.2 }, 0.72);

        if (!desktop) {
          gsap.set('.story-beat', { autoAlpha: 1, y: 0 });
          gsap.set('.story-pin', { minHeight: 'auto' });
        }
      },
      root,
    );

    return () => mm.revert();
  }, { scope: root });

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const rail = root.current?.querySelector<HTMLElement>('.story-rail');
    if (!rail) return;
    const tween = gsap.to(rail, {
      x: () => Math.min(0, window.innerWidth - rail.scrollWidth - 48),
      ease: 'none',
      scrollTrigger: {
        trigger: root.current?.querySelector('.story-rail-stage'),
        start: 'top 78%',
        end: 'bottom 20%',
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
    });
    return () => tween.kill();
  }, { scope: root });

  return (
    <section ref={root} className="carbon-story" aria-labelledby="story-title">
      <div className="story-atmosphere" aria-hidden="true">
        <div className="story-orb" />
        <div className="story-gridline" />
        <div className="story-contour story-contour-one" />
        <div className="story-contour story-contour-two" />
      </div>
      <div className="container story-intro">
        <p className="eyebrow">The carbon receipt, opened up</p>
        <h2 id="story-title">Your habits leave a shape behind.</h2>
        <p className="story-intro-copy">Scroll through the receipt, meet the biggest lever, then use the tracker to make the next choice visible.</p>
      </div>
      <div ref={pin} className="story-pin">
        <div className="container story-pin-inner">
          <div className="story-copy-panel">
            {STORY_BEATS.map((beat, index) => (
              <article className={`story-beat ${index === 0 ? 'is-visible' : ''}`} key={beat.kicker}>
                <p className="story-kicker">{beat.kicker}</p>
                <h3>{beat.title}</h3>
                <p>{beat.copy}</p>
              </article>
            ))}
            <div className="story-proof">
              <span>Live today</span>
              <strong>{loggedToday} {loggedToday === 1 ? 'entry' : 'entries'}</strong>
              <small>{entries.length ? 'from your activity log' : 'waiting for your first log'}</small>
            </div>
          </div>
          <div className="story-instrument" aria-label="Live carbon receipt transformation">
            <div className="story-category-ring" aria-hidden="true">
              {categories.map((category, index) => (
                <span key={category.key} style={{ '--ring-angle': `${index * 90}deg`, '--ring-color': category.color } as CSSProperties} />
              ))}
            </div>
            <div className="story-receipt">
              <div className="story-receipt-top"><span>CFI / LIVE</span><span>{analysis.today}</span></div>
              <div className="story-receipt-title">Carbon receipt</div>
              <div className="story-receipt-rule" />
              <div className="story-total-mark"><strong>{fmt(total)}</strong><span>kg CO₂e</span></div>
              <div className="story-budget-line"><span>daily reference</span><strong>{DAILY_BUDGET} kg</strong></div>
              <div className="story-bars">
                {receiptCategories.map((category) => (
                  <div className={`story-bar-row ${largest === category.key ? 'is-largest' : ''}`} key={category.key}>
                    <span>{category.label}</span>
                    <i><b style={{ width: `${(category.value / maxReceiptCategory) * 100}%`, background: category.color }} /></i>
                    <strong>{fmt(category.value)}</strong>
                  </div>
                ))}
              </div>
              <div className="story-receipt-foot">{largest ? `Largest line: ${CAT_NAME[largest]}` : 'Log an activity to print your first line'}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="container story-rail-stage">
        <div className="story-rail-heading">
          <div>
            <p className="eyebrow">Four places to look</p>
            <h3>Change is more useful when it has a category.</h3>
          </div>
          <p>Every colour and value below comes from the current 30-day analysis.</p>
        </div>
        <div className="story-rail-wrap">
          <div className="story-rail">
            {categories.map((category, index) => (
              <article className="story-category-card" key={category.key} style={{ '--category-color': category.color } as CSSProperties}>
                <span className="story-category-index">0{index + 1}</span>
                <span className="story-category-dot" aria-hidden="true" />
                <h4>{category.label}</h4>
                <strong>{fmt(category.value)} <small>kg</small></strong>
                <p>{category.value > 0 ? `Your recent ${category.label.toLowerCase()} footprint.` : `No ${category.label.toLowerCase()} logged yet.`}</p>
                <div className="story-category-track" aria-hidden="true"><span style={{ width: `${(category.value / Math.max(...categories.map((item) => item.value), 1)) * 100}%` }} /></div>
              </article>
            ))}
          </div>
        </div>
        <a className="story-next-link" href="#activities">Take it to the tracker <span aria-hidden="true">↘</span></a>
      </div>
    </section>
  );
}
