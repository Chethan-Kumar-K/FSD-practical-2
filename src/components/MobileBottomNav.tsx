import { useEffect, useState } from 'react';

const ITEMS = [
  { href: '#home', label: 'Home', icon: '⌂' },
  { href: '#activities', label: 'Log', icon: '+' },
  { href: '#log', label: 'Records', icon: '≡' },
  { href: '#insights', label: 'Insights', icon: '◒' },
  { href: '#pledges', label: 'Pledges', icon: '→' },
];

export function MobileBottomNav() {
  const [active, setActive] = useState('#home');

  useEffect(() => {
    const sections = ITEMS.map((item) => document.querySelector(item.href)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      {ITEMS.map((item) => (
        <a key={item.href} className={active === item.href ? 'is-active' : ''} href={item.href} aria-current={active === item.href ? 'page' : undefined}>
          <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
