import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';

export interface ToastMessage {
  id: number;
  text: string;
}

export function Toast({ message }: { message: ToastMessage | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!message || !ref.current || prefersReducedMotion()) return;
      gsap.fromTo(ref.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' });
    },
    { dependencies: [message?.id] },
  );

  return (
    <div ref={ref} className="toast" role="status" aria-live="polite" hidden={!message}>
      {message?.text}
    </div>
  );
}
