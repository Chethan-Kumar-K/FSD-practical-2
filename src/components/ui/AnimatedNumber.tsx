import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap';
import { fmt } from '../../utils/format';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
}

/** Counts up (or down) to `value` with a GSAP tween whenever it changes. */
export function AnimatedNumber({ value, format = fmt }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        shown.current = value;
        return;
      }
      const counter = { v: shown.current };
      gsap.to(counter, {
        v: value,
        duration: 0.9,
        ease: 'power3.out',
        onUpdate: () => {
          shown.current = counter.v;
          el.textContent = format(counter.v);
        },
        onComplete: () => {
          shown.current = value;
          el.textContent = format(value);
        },
      });
    },
    { dependencies: [value], revertOnUpdate: true },
  );

  return <span ref={ref}>{format(value)}</span>;
}
