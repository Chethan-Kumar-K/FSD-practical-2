import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { Button } from './ui/Button';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#activities', label: 'Log Activity' },
  { href: '#log', label: 'My Log' },
  { href: '#insights', label: 'Insights' },
];

interface HeaderProps {
  dark: boolean;
  onToggleTheme: () => void;
}

export function Header({ dark, onToggleTheme }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Header slides in once on load
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('.brand, .nav-list > li', { y: -24, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' });
    },
    { scope: ref },
  );

  return (
    <header ref={ref} className="site-header">
      <div className="container header-inner">
        <a href="#home" className="brand" aria-label="CarbonFootprint India, home">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect width="36" height="36" rx="8" fill="#0F4C47" />
            <path d="M11 9h14v18l-3.5-2.5L18 27l-3.5-2.5L11 27V9Z" fill="#fff" />
            <path d="M14 14h8M14 18h8" stroke="#0F4C47" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="26" cy="26" r="5" fill="#F2A900" />
          </svg>
          <span>
            <span className="brand-name">CarbonFootprint India</span>
            <span className="brand-tag">Track. Understand. Reduce.</span>
          </span>
        </a>

        <button
          type="button"
          className="menu-btn"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>

        <nav id="main-nav" className={'main-nav' + (open ? ' open' : '')} aria-label="Main navigation">
          <ul className="nav-list">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Button variant="outline" small aria-pressed={dark} onClick={onToggleTheme}>
                {dark ? '☀ Light' : '☾ Dark'}
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
