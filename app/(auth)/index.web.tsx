/**
 * Web-only landing page for rentybase.com
 * Replaces app/(auth)/index.tsx on web via Expo Router platform routing.
 *
 * Design: cinematic scroll-driven experience — Apple/Linear/Stripe quality.
 * Libraries: Framer Motion (animations), native DOM (no RN primitives).
 */

import React, {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Design tokens (mirrors constants/theme.ts) ─────────────────────────────

const C = {
  bg: '#08090A',
  ink2: '#2A2D31',
  ink3: '#5C6068',
  action: '#5046E4',
  success: '#0E8E63',
  surface: '#FFFFFF',
  border: '#E4E6EA',
  muted: '#9097A0',
  background: '#F5F6F8',
  fill: '#F5F6F8',
  fill2: '#ECEEF1',
  actionSoft: '#EDEAFF',
  successSoft: '#E1F4EC',
  canvas: '#F2F0EB',
  warningSoft: '#FBEDD3',
  warning: '#B8740F',
} as const;

const F = {
  sans:        "'Geist_400Regular', -apple-system, 'Helvetica Neue', sans-serif",
  sansMedium:  "'Geist_500Medium', -apple-system, 'Helvetica Neue', sans-serif",
  sansSemiBold:"'Geist_600SemiBold', -apple-system, 'Helvetica Neue', sans-serif",
  sansBold:    "'Geist_700Bold', -apple-system, 'Helvetica Neue', sans-serif",
  serif:       "'InstrumentSerif_400Regular', Georgia, serif",
  serifItalic: "'InstrumentSerif_400Regular_Italic', Georgia, serif",
  mono:        "'Geist_500Medium', -apple-system, 'Helvetica Neue', sans-serif",
} as const;

// ─── Animation presets ──────────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.7, ease } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.6, ease } },
};

const stagger = (delay = 0.08) => ({
  show: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
});

// ─── Responsive hook ────────────────────────────────────────────────────────

function useWindowWidth() {
  const [w, setW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const handle = () => setW(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return w;
}

// ─── Global CSS injection ───────────────────────────────────────────────────

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
      body { background: ${C.bg}; overflow-x: hidden; }
      ::selection { background: ${C.action}33; color: ${C.surface}; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: ${C.bg}; }
      ::-webkit-scrollbar-thumb { background: #2a2d31; border-radius: 3px; }
      a { color: inherit; text-decoration: none; }
    `;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);
  return null;
}

// ─── NAV ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

function NavLink({ label, href }: { label: string; href: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <a
      href={href}
      onClick={handleClick}
      style={{
        fontFamily: F.sansMedium, fontSize: 14, color: 'rgba(255,255,255,0.55)',
        transition: 'color 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.surface; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; }}
    >
      {label}
    </a>
  );
}

function Nav({ onCta }: { onCta: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const w = useWindowWidth();
  const isMobile = w < 820;

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 5%', height: 60,
          background: scrolled ? 'rgba(8,9,10,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.sansBold, fontSize: 13, color: C.bg, letterSpacing: -0.5 }}>R</span>
          </div>
          <span style={{ fontFamily: F.sansSemiBold, fontSize: 15, color: C.surface, letterSpacing: -0.3 }}>RentyBase</span>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {NAV_LINKS.map(l => <NavLink key={l.label} {...l} />)}
          </div>
        )}

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!isMobile && (
            <button
              onClick={onCta}
              style={{ height: 34, paddingInline: 18, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: C.surface, fontFamily: F.sansMedium, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >Sign in</button>
          )}
          <button
            onClick={onCta}
            style={{ height: 34, paddingInline: 18, borderRadius: 9999, background: C.surface, color: C.bg, fontFamily: F.sansSemiBold, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >Get Started</button>
          {isMobile && (
            <button
              onClick={() => setMenuOpen(true)}
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
            >
              {[0,1,2].map(i => <span key={i} style={{ width: 16, height: 1.5, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />)}
            </button>
          )}
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#08090A', display: 'flex', flexDirection: 'column', padding: '20px 6%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <span style={{ fontFamily: F.sansSemiBold, fontSize: 18, color: C.surface }}>RentyBase</span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={e => { e.preventDefault(); setMenuOpen(false); const el = document.getElementById(l.href.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ fontFamily: F.sansSemiBold, fontSize: 22, color: C.surface, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >{l.label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
            <button onClick={() => { setMenuOpen(false); onCta(); }} style={{ height: 54, borderRadius: 14, background: C.surface, color: C.bg, fontFamily: F.sansSemiBold, fontSize: 16, border: 'none', cursor: 'pointer' }}>Get Started Free</button>
            <button onClick={() => { setMenuOpen(false); onCta(); }} style={{ height: 54, borderRadius: 14, background: 'transparent', color: C.surface, fontFamily: F.sansMedium, fontSize: 16, border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}>Sign In</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────────

function Hero({ onCta }: { onCta: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const cardY  = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const textY  = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacityOut = useTransform(scrollYProgress, [0.4, 0.7], [1, 0]);
  const w = useWindowWidth();
  const isMobile = w < 768;

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: C.bg,
        padding: isMobile ? '120px 6% 80px' : '120px 6% 100px',
      }}
    >
      {/* Subtle ambient glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: `radial-gradient(ellipse at center, ${C.action}1A 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '-10%',
        width: 400, height: 400,
        background: `radial-gradient(ellipse at center, #7C3AED0F 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Dot grid */}
      <DotGrid />

      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 48 : 0,
        width: '100%',
        maxWidth: 1160,
        margin: '0 auto',
      }}>
        {/* Left — copy */}
        <motion.div
          style={{ flex: 1, maxWidth: 580, y: textY, opacity: opacityOut }}
        >
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            animate="show"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9999,
              padding: '5px 13px', marginBottom: 32,
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>🇮🇳</span>
              <span style={{
                fontFamily: F.sansMedium, fontSize: 12,
                color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3,
              }}>
                Built for Indian rentals
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1 variants={fadeUp} style={{ margin: 0, lineHeight: 1 }}>
              <span style={{
                display: 'block',
                fontFamily: F.sansSemiBold,
                fontSize: isMobile ? 52 : 72,
                color: C.surface,
                letterSpacing: isMobile ? -1.5 : -2.5,
                lineHeight: 1.02,
              }}>
                Your rental.
              </span>
              <span style={{
                display: 'block',
                fontFamily: F.serifItalic,
                fontSize: isMobile ? 52 : 72,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: isMobile ? -0.5 : -1,
                lineHeight: 1.12,
                marginTop: 4,
              }}>
                On record.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} style={{
              fontFamily: F.sans,
              fontSize: isMobile ? 15 : 17,
              color: 'rgba(255,255,255,0.48)',
              lineHeight: 1.65,
              maxWidth: 460,
              marginTop: 24,
              marginBottom: 40,
            }}>
              RentyBase connects landlords and tenants in a shared workspace —
              rent tracking, HRA receipts, agreements, proof photos and repair
              requests. No WhatsApp, no spreadsheets.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={onCta}
                style={{
                  height: 52, paddingInline: 28,
                  borderRadius: 16, border: 'none',
                  background: C.surface, color: C.bg,
                  fontFamily: F.sansSemiBold, fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 0 0 0 rgba(255,255,255,0)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(255,255,255,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(255,255,255,0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.88 8.45l-1.36 6.41c-.1.47-.37.59-.74.36l-2.06-1.52-.99.96c-.11.11-.2.2-.41.2l.15-2.08 3.77-3.41c.16-.15-.03-.23-.25-.08L7.11 13.54 5.08 12.9c-.46-.14-.47-.46.1-.68l11.21-4.32c.38-.14.72.09.59.6z" fill="#0088cc"/>
                </svg>
                Get Started — It's Free
              </button>
              <button
                onClick={onCta}
                style={{
                  height: 52, paddingInline: 24,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent', color: 'rgba(255,255,255,0.7)',
                  fontFamily: F.sansMedium, fontSize: 15,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.color = C.surface;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                Sign in with Google →
              </button>
            </motion.div>

            {/* Sub text */}
            <motion.p variants={fadeUp} style={{
              fontFamily: F.sans, fontSize: 12,
              color: 'rgba(255,255,255,0.28)', marginTop: 18,
            }}>
              Free · No credit card · 2 minutes to set up
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Right — floating UI cards */}
        {!isMobile && (
          <motion.div
            style={{ position: 'relative', width: 320, height: 420, y: cardY, flexShrink: 0 }}
          >
            <HeroCard />
          </motion.div>
        )}
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: 28, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          opacity: 0.35,
        }}
      >
        <span style={{ fontFamily: F.sans, fontSize: 10, color: C.surface, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Scroll
        </span>
        <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)' }} />
      </motion.div>
    </section>
  );
}

// Floating UI card stack in hero
function HeroCard() {
  return (
    <>
      {/* Back card */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ delay: 0.9, duration: 0.8, ease }}
        style={{
          position: 'absolute', top: 20, left: -20,
          width: 240, padding: 18, borderRadius: 18,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: F.sansSemiBold, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Deposit</div>
            <div style={{ fontFamily: F.sansSemiBold, fontSize: 22, color: C.surface }}>₹50,000</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.success}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
          </div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: F.sans, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Held by landlord</span>
          <span style={{ fontFamily: F.sansMedium, fontSize: 11, color: C.success }}>● Protected</span>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 32, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ delay: 0.6, duration: 0.9, ease }}
        style={{
          position: 'absolute', top: 80, right: -20,
          width: 260, padding: 20, borderRadius: 20,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: F.sansSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>September 2025</div>
            <div style={{ fontFamily: F.sansSemiBold, fontSize: 26, color: C.surface, letterSpacing: -0.5 }}>₹18,500</div>
          </div>
          <div style={{ background: `${C.success}22`, color: C.success, fontFamily: F.sansSemiBold, fontSize: 10, padding: '4px 10px', borderRadius: 9999 }}>
            PAID
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 14, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1.4, duration: 1, ease }}
            style={{ height: '100%', background: C.success, borderRadius: 2 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['UPI', 'Cash', 'Bank'].map((m, i) => (
            <div key={m} style={{
              flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8,
              background: i === 0 ? 'rgba(80,70,228,0.3)' : 'rgba(255,255,255,0.05)',
              border: i === 0 ? `1px solid ${C.action}66` : '1px solid rgba(255,255,255,0.06)',
              fontFamily: F.sansMedium, fontSize: 10, color: i === 0 ? C.action : 'rgba(255,255,255,0.3)',
            }}>
              {m}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating receipt chip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.3, duration: 0.5, ease }}
        style={{
          position: 'absolute', bottom: 40, left: 20,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(14,142,99,0.2)', border: `1px solid ${C.success}44`,
          borderRadius: 9999, padding: '7px 14px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
        <span style={{ fontFamily: F.sansMedium, fontSize: 12, color: C.success }}>HRA receipt ready</span>
      </motion.div>
    </>
  );
}

// Dot grid background
function DotGrid() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
        {/* Radial fade mask */}
        <rect
          width="100%" height="100%"
          fill="url(#fade-mask)"
          style={{ mixBlendMode: 'multiply' }}
        />
        <defs>
          <radialGradient id="fade-mask" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={C.bg} stopOpacity="0.7" />
            <stop offset="100%" stopColor={C.bg} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── METRIC STRIP ───────────────────────────────────────────────────────────

function MetricStrip() {
  const metrics = [
    { value: '₹0',   label: 'Platform fee',         sub: 'Zero transaction costs' },
    { value: 'HRA',  label: 'Tax-compliant receipts', sub: 'Ready for 80GG claims' },
    { value: '🇮🇳', label: 'India-first',             sub: 'INR · L&L · PAN-ready' },
  ];

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger(0.06)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {metrics.map((m, i) => (
        <motion.div
          key={m.value}
          variants={fadeUp}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '28px 16px', gap: 4, textAlign: 'center',
            borderRight: i < metrics.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}
        >
          <span style={{ fontFamily: F.sansSemiBold, fontSize: 22, color: C.surface, letterSpacing: -0.5 }}>
            {m.value}
          </span>
          <span style={{ fontFamily: F.sansMedium, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            {m.label}
          </span>
          <span style={{ fontFamily: F.sans, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {m.sub}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── FEATURE SECTIONS ────────────────────────────────────────────────────────

interface FeatureSectionProps {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  body: string;
  perks: string[];
  visual: React.ReactNode;
  flip?: boolean;
  dark?: boolean;
}

function FeatureSection({ eyebrow, title, titleAccent, body, perks, visual, flip, dark }: FeatureSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const w = useWindowWidth();
  const isMobile = w < 768;

  const bg   = dark ? C.bg : C.surface;
  const text = dark ? C.surface : C.bg;
  const sub  = dark ? 'rgba(255,255,255,0.5)' : C.ink3;
  const mut  = dark ? 'rgba(255,255,255,0.3)' : C.muted;

  return (
    <section
      ref={ref}
      style={{
        background: bg,
        borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}
    >
      <div style={{
        maxWidth: 1160, margin: '0 auto',
        padding: isMobile ? '72px 6%' : '100px 6%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : flip ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: isMobile ? 48 : 80,
      }}>
        {/* Copy side */}
        <div style={{ flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, ease }}
          >
            <div style={{
              display: 'inline-block',
              fontFamily: F.mono,
              fontSize: 10, letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: mut, marginBottom: 16,
            } as CSSProperties}>
              {eyebrow}
            </div>
            <h2 style={{
              fontFamily: F.sansSemiBold,
              fontSize: isMobile ? 34 : 46,
              color: text, lineHeight: 1.08,
              letterSpacing: -1.2, marginBottom: 8,
            }}>
              {title}
              {titleAccent && (
                <span style={{ fontFamily: F.serifItalic, color: sub, display: 'block' }}>
                  {titleAccent}
                </span>
              )}
            </h2>
            <p style={{
              fontFamily: F.sans, fontSize: 16,
              color: sub, lineHeight: 1.7,
              maxWidth: 420, marginBottom: 28,
            }}>
              {body}
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {perks.map((perk, i) => (
                <motion.li
                  key={perk}
                  initial={{ opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : undefined}
                  transition={{ duration: 0.4, ease, delay: 0.2 + i * 0.06 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: dark ? 'rgba(14,142,99,0.2)' : C.successSoft,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke={C.success} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: F.sans, fontSize: 14, color: sub }}>{perk}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Visual side */}
        <motion.div
          style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
        >
          {visual}
        </motion.div>
      </div>
    </section>
  );
}

// ─── APP UI MOCKUPS ──────────────────────────────────────────────────────────

function RentMockup() {
  const months = ['July', 'August', 'September'];
  const statuses = [
    { label: 'Paid', color: C.success, bg: C.successSoft },
    { label: 'Paid', color: C.success, bg: C.successSoft },
    { label: 'Pending', color: C.warning, bg: C.warningSoft },
  ];
  return (
    <div style={{
      width: 300, background: C.surface,
      borderRadius: 24, padding: 0, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(8,9,10,0.12), 0 0 0 1px rgba(8,9,10,0.06)',
    }}>
      {/* Header */}
      <div style={{ background: C.bg, padding: '20px 20px 16px', borderRadius: '24px 24px 0 0' }}>
        <div style={{ fontFamily: F.sansSemiBold, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          Rent Collection
        </div>
        <div style={{ fontFamily: F.sansSemiBold, fontSize: 26, color: C.surface, letterSpacing: -0.5 }}>₹55,500</div>
        <div style={{ fontFamily: F.sans, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          Collected this quarter
        </div>
      </div>
      {/* Rows */}
      <div style={{ padding: '8px 0' }}>
        {months.map((m, i) => (
          <div key={m} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: i < months.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div>
              <div style={{ fontFamily: F.sansMedium, fontSize: 14, color: C.bg }}>{m} 2025</div>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: C.muted, marginTop: 1 }}>₹18,500 · Due 5th</div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 9999,
              background: statuses[i].bg, color: statuses[i].color,
              fontFamily: F.sansSemiBold, fontSize: 11,
            }}>
              {statuses[i].label}
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ padding: '12px 20px', background: C.fill }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: F.sans, fontSize: 12, color: C.muted }}>Next due: 5 Oct 2025</span>
          <div style={{
            background: C.action, color: C.surface, padding: '6px 14px',
            borderRadius: 9999, fontFamily: F.sansSemiBold, fontSize: 12, cursor: 'pointer',
          }}>
            Remind
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptMockup() {
  return (
    <div style={{
      width: 300, background: C.surface,
      borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(8,9,10,0.12), 0 0 0 1px rgba(8,9,10,0.06)',
    }}>
      <div style={{ background: C.successSoft, padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: F.sansSemiBold, fontSize: 13, color: C.success }}>HRA Receipt</div>
          <div style={{ fontFamily: F.sansSemiBold, fontSize: 10, color: C.success, background: C.surface, padding: '3px 8px', borderRadius: 9999 }}>
            VALID
          </div>
        </div>
        <div style={{ fontFamily: F.sansSemiBold, fontSize: 28, color: C.bg, letterSpacing: -0.5 }}>₹18,500</div>
        <div style={{ fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 }}>September 2025</div>
      </div>
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { l: 'Property', v: '302, Elm Residency' },
          { l: 'Landlord PAN', v: 'ABCDE1234F' },
          { l: 'Payment Mode', v: 'UPI Transfer' },
          { l: 'Reference', v: 'UTR123456789' },
        ].map(({ l, v }) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: F.sans, fontSize: 12, color: C.muted }}>{l}</span>
            <span style={{ fontFamily: F.sansMedium, fontSize: 12, color: C.bg }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ margin: '0 22px 20px', padding: 14, borderRadius: 14, background: C.actionSoft, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.action, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📄</span>
        </div>
        <div>
          <div style={{ fontFamily: F.sansSemiBold, fontSize: 12, color: C.action }}>Download PDF</div>
          <div style={{ fontFamily: F.sans, fontSize: 11, color: `${C.action}99` }}>80GG · Form 16 ready</div>
        </div>
      </div>
    </div>
  );
}

function RepairMockup() {
  const steps = [
    { status: 'Open', desc: 'Kitchen tap leaking', date: '12 Sep', color: '#C2362F', done: true },
    { status: 'In Progress', desc: 'Plumber visiting Thu', date: '14 Sep', color: C.warning, done: true },
    { status: 'Resolved', desc: 'Fixed and confirmed', date: '15 Sep', color: C.success, done: false },
  ];
  return (
    <div style={{
      width: 300, background: C.surface,
      borderRadius: 24, padding: 22, overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(8,9,10,0.12), 0 0 0 1px rgba(8,9,10,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: F.sansSemiBold, fontSize: 15, color: C.bg, marginBottom: 3 }}>
            Kitchen tap leak
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
            <span style={{ fontFamily: F.sansMedium, fontSize: 11, color: C.success }}>Resolved</span>
          </div>
        </div>
        <div style={{
          background: C.successSoft, color: C.success, borderRadius: 9,
          padding: '4px 10px', fontFamily: F.sansSemiBold, fontSize: 11,
        }}>
          High
        </div>
      </div>
      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {steps.map((step, i) => (
          <div key={step.status} style={{ display: 'flex', gap: 14, paddingBottom: i < steps.length - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: step.done ? step.color : C.fill2,
                border: `2px solid ${step.done ? step.color : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step.done && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3 5.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 16, background: step.done ? step.color + '40' : C.border, marginTop: 3 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: F.sansMedium, fontSize: 13, color: C.bg }}>{step.status}</span>
                <span style={{ fontFamily: F.sans, fontSize: 11, color: C.muted }}>{step.date}</span>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: C.ink3, marginTop: 2 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROLE PICKER ─────────────────────────────────────────────────────────────

interface RolePickerProps {
  onGetStarted: () => void;
  selectedRole: 'landlord' | 'tenant' | null;
  onSelectRole: (r: 'landlord' | 'tenant') => void;
}

const ROLES = [
  {
    id: 'landlord' as const,
    label: "I'm a Landlord",
    sub: 'I own or manage a property',
    color: C.action,
    bg: C.actionSoft,
    perks: ['Create rentals and invite tenants', 'Track rent and confirm payments', 'Review move-in proof and repairs'],
  },
  {
    id: 'tenant' as const,
    label: "I'm a Tenant",
    sub: 'I rent or am looking to rent',
    color: C.success,
    bg: C.successSoft,
    perks: ['Join your rental via invite link', 'Pay rent and get HRA receipts', 'Raise repairs with photo proof'],
  },
];

function RolePicker({ onGetStarted, selectedRole, onSelectRole }: RolePickerProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const w = useWindowWidth();
  const isMobile = w < 768;

  return (
    <section
      ref={ref}
      style={{ background: C.surface, padding: isMobile ? '72px 6%' : '100px 6%' }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <div style={{
            fontFamily: F.mono,
            fontSize: 10, letterSpacing: 1.4,
            color: C.muted, textTransform: 'uppercase', marginBottom: 12,
          } as CSSProperties}>
            Choose your portal
          </div>
          <h2 style={{
            fontFamily: F.sansSemiBold,
            fontSize: isMobile ? 36 : 48, letterSpacing: -1.2,
            color: C.bg, lineHeight: 1.08, marginBottom: 12,
          }}>
            Who are you?
          </h2>
          <p style={{ fontFamily: F.sans, fontSize: 16, color: C.ink3, maxWidth: 380, margin: '0 auto' }}>
            RentyBase sets up different tools for each role. Pick yours to get started.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 16, marginBottom: 24,
        }}>
          {ROLES.map((role, i) => {
            const selected = selectedRole === role.id;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.1 }}
                onClick={() => onSelectRole(role.id)}
                whileHover={{ y: -4, boxShadow: selected ? undefined : '0 16px 48px rgba(8,9,10,0.1)' }}
                style={{
                  borderRadius: 24,
                  border: `${selected ? 2.5 : 1}px solid ${selected ? role.color : C.border}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: C.surface,
                  transition: 'border-color 0.2s',
                  boxShadow: selected ? `0 0 0 4px ${role.color}18` : undefined,
                }}
              >
                {/* Colored header */}
                <div style={{
                  background: selected ? role.color : role.bg,
                  padding: '20px 22px',
                  display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 16,
                      background: selected ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 22 }}>{role.id === 'landlord' ? '🏢' : '🏠'}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: F.sansSemiBold, fontSize: 17, color: selected ? C.surface : role.color }}>
                        {role.label}
                      </div>
                      <div style={{ fontFamily: F.sans, fontSize: 13, color: selected ? 'rgba(255,255,255,0.7)' : C.ink3, marginTop: 2 }}>
                        {role.sub}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: selected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected ? (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke={role.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                        <path d="M1 1l6 5.5L1 12" stroke={role.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                {/* Perks */}
                <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {role.perks.map((perk) => (
                    <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: selected ? role.bg : C.fill,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke={selected ? role.color : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{ fontFamily: F.sans, fontSize: 13, color: C.ink2 }}>{perk}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          animate={{ opacity: selectedRole ? 1 : 0.45 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <button
            onClick={onGetStarted}
            style={{
              width: '100%', maxWidth: 420, height: 56,
              borderRadius: 16, border: 'none',
              background: C.bg, color: C.surface,
              fontFamily: F.sansSemiBold, fontSize: 16,
              cursor: selectedRole ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              if (!selectedRole) return;
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(8,9,10,0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {selectedRole
              ? `Continue as ${selectedRole === 'landlord' ? 'Landlord' : 'Tenant'} →`
              : 'Select a role to continue'}
          </button>
        </motion.div>

        <p style={{
          textAlign: 'center', fontFamily: F.sans, fontSize: 12,
          color: C.muted, marginTop: 14,
        }}>
          Your role is permanent — sign in with Google, free, 2 minutes.
        </p>
      </div>
    </section>
  );
}

// ─── TESTIMONIAL ─────────────────────────────────────────────────────────────

function Testimonial() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const w = useWindowWidth();
  const isMobile = w < 768;

  return (
    <section
      ref={ref}
      style={{ background: C.canvas, padding: isMobile ? '72px 6%' : '100px 6%' }}
    >
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.7, ease }}
        >
          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 24 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} style={{ fontSize: 18, color: '#F59E0B' }}>★</span>
            ))}
          </div>
          {/* Quote */}
          <blockquote style={{
            fontFamily: F.serif, fontSize: isMobile ? 24 : 30,
            color: C.bg, lineHeight: 1.5, marginBottom: 32,
            fontStyle: 'normal',
          }}>
            "Finally, my tenant and I are on the same page. HRA receipts, move-in photos, everything in one place. No more WhatsApp back-and-forth."
          </blockquote>
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: C.actionSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: F.sansBold, fontSize: 18, color: C.action }}>R</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: F.sansSemiBold, fontSize: 14, color: C.bg }}>Ravi K.</div>
              <div style={{ fontFamily: F.sans, fontSize: 12, color: C.ink3 }}>Landlord · Bangalore</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA SECTION ─────────────────────────────────────────────────────────────

function CtaSection({ onGetStarted }: { onGetStarted: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const w = useWindowWidth();
  const isMobile = w < 768;

  return (
    <section
      ref={ref}
      style={{
        background: C.bg,
        padding: isMobile ? '72px 6% 80px' : '120px 6% 100px',
        position: 'relative', overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 300,
        background: `radial-gradient(ellipse, ${C.action}14 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, ease }}
        style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', position: 'relative' }}
      >
        <div style={{
          fontFamily: F.mono,
          fontSize: 10, letterSpacing: 1.4,
          color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 20,
        } as CSSProperties}>
          Get started
        </div>
        <h2 style={{
          fontFamily: F.sansSemiBold,
          fontSize: isMobile ? 38 : 54,
          color: C.surface, lineHeight: 1.06,
          letterSpacing: isMobile ? -1 : -1.8,
          marginBottom: 16,
        }}>
          Set up your rental{'\n'}in 2 minutes.
        </h2>
        <p style={{
          fontFamily: F.sans, fontSize: 16,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65, marginBottom: 40, maxWidth: 400, margin: '0 auto 40px',
        }}>
          Add a property, invite your tenant, and start tracking rent from day one. Free, always.
        </p>
        <button
          onClick={onGetStarted}
          style={{
            height: 58, paddingInline: 36,
            borderRadius: 18, border: 'none',
            background: C.surface, color: C.bg,
            fontFamily: F.sansSemiBold, fontSize: 16,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 40px rgba(255,255,255,0.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <p style={{
          fontFamily: F.sans, fontSize: 12,
          color: 'rgba(255,255,255,0.22)', marginTop: 16,
        }}>
          Free · No credit card · Android, iOS & Web
        </p>
      </motion.div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

function Footer() {
  const footerLinks: Record<string, { label: string; href: string }[]> = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'For Landlords', href: 'https://rentybase.com/for/landlords' },
      { label: 'For Tenants', href: 'https://rentybase.com/for/tenants' },
    ],
    Resources: [
      { label: 'Blog', href: 'https://rentybase.com/blog' },
      { label: 'HRA Receipt Guide', href: 'https://rentybase.com/blog/how-to-claim-hra-when-landlord-wont-give-rent-receipts' },
      { label: 'HRA Calculator', href: 'https://rentybase.com/tools/hra-receipt-generator' },
      { label: 'FAQ', href: '#faq' },
    ],
    Company: [
      { label: 'Contact', href: '#contact' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Use', href: '#' },
    ],
  };
  const scrollTo = (href: string) => {
    if (!href.startsWith('#')) return true;
    const el = document.getElementById(href.slice(1));
    if (el) { el.scrollIntoView({ behavior: 'smooth' }); return false; }
    return true;
  };
  return (
    <footer style={{ background: C.bg, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 6% 40px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(3, 1fr)', gap: '40px 48px', marginBottom: 56, flexWrap: 'wrap' as const }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: F.sansBold, fontSize: 12, color: C.bg }}>R</span>
              </div>
              <span style={{ fontFamily: F.sansSemiBold, fontSize: 15, color: C.surface }}>RentyBase</span>
            </div>
            <p style={{ fontFamily: F.sans, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: 200 }}>
              Rent tracking, HRA receipts, and dispute-free move-outs for Indian landlords and tenants.
            </p>
            <a href="mailto:support@rentybase.com" style={{ display: 'inline-block', marginTop: 16, fontFamily: F.sans, fontSize: 13, color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)'; }}
            >support@rentybase.com</a>
          </div>
          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <div style={{ fontFamily: F.sansSemiBold, fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 18 }}>{group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {links.map(l => (
                  <a key={l.label} href={l.href} onClick={e => { if (!scrollTo(l.href)) e.preventDefault(); }}
                    style={{ fontFamily: F.sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.surface; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; }}
                  >{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
          <span style={{ fontFamily: F.sans, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} RentyBase. Made in India 🇮🇳
          </span>
          <span style={{ fontFamily: F.sans, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            Free during beta · All features included
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

const PRICING_FEATURES = [
  'Unlimited rent payments & history',
  'HRA receipts — PDF in one tap',
  'Room-by-room move-in photo proof',
  'Security deposit ledger',
  'Repair request tracking',
  'Push + WhatsApp notifications',
  'Digital Leave & License agreement',
  'Landlord + tenant dashboards',
];

function PricingSection({ onGetStarted }: { onGetStarted: () => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section id="pricing" ref={ref} style={{ background: C.surface, padding: '100px 6%' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontFamily: F.sansSemiBold, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.action, marginBottom: 14 }}>
            Pricing
          </div>
          <h2 style={{ fontFamily: F.sansSemiBold, fontSize: 'clamp(32px,5vw,52px)', color: C.bg, letterSpacing: -1, marginBottom: 16, lineHeight: 1.08 }}>
            Free during beta.
          </h2>
          <p style={{ fontFamily: F.sans, fontSize: 17, color: C.ink3, maxWidth: 500, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Every feature, no limits, no credit card. When paid tiers launch, beta users get 30 days notice and a better rate.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.75, ease, delay: 0.15 }}
          style={{ background: C.bg, borderRadius: 28, padding: '44px 48px', textAlign: 'left', position: 'relative', overflow: 'hidden' }}
        >
          {/* Glow */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, ${C.action}33 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 32 }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Beta price</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: F.sansBold, fontSize: 64, color: C.surface, letterSpacing: -2, lineHeight: 1 }}>₹0</span>
                <span style={{ fontFamily: F.sans, fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>/month</span>
              </div>
              <div style={{ marginTop: 8, fontFamily: F.sans, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No credit card required</div>
            </div>
            <button
              onClick={onGetStarted}
              style={{ height: 52, paddingInline: 32, borderRadius: 14, background: C.surface, color: C.bg, fontFamily: F.sansSemiBold, fontSize: 15, border: 'none', cursor: 'pointer', alignSelf: 'center', transition: 'opacity 0.15s, transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              Start for free →
            </button>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px 24px' }}>
            {PRICING_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(14,142,99,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#0E8E63' }}>✓</span>
                <span style={{ fontFamily: F.sans, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'Is RentyBase really free?', a: 'Yes — completely free during beta. All features, no limits, no credit card required. When paid tiers launch, beta users get 30 days notice and a better rate.' },
  { q: 'Does my tenant need to download an app?', a: 'No. The invite link opens in any browser. Your tenant can sign in with Google and access everything from the web without installing anything.' },
  { q: 'Are the HRA receipts valid for tax filing in India?', a: 'Yes. Every receipt includes landlord name, PAN, tenant name, property address, period, amount, and payment method — all required for HRA exemption under Section 10(13A).' },
  { q: 'Can I manage a PG or hostel?', a: 'Yes. Choose PG/Hostel as your property type and add multiple rooms — each with its own tenant, rent amount, and proof photos — all under one landlord dashboard.' },
  { q: 'What happens to move-in photos? Can they be deleted?', a: 'Once submitted, move-in photos are locked and cannot be edited or deleted by either party. They stay permanently attached to the rental record.' },
  { q: 'Which cities does RentyBase support?', a: 'All cities in India. RentyBase is built for Indian rentals — INR currency, PAN-linked receipts, L&L agreements, and rent laws as per Indian tenancy norms.' },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section id="faq" ref={ref} style={{ background: C.fill, padding: '100px 6%', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease }} style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontFamily: F.sansSemiBold, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.action, marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontFamily: F.sansSemiBold, fontSize: 'clamp(30px,4.5vw,48px)', color: C.bg, letterSpacing: -1, lineHeight: 1.1 }}>Common questions</h2>
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, ease, delay: i * 0.06 }}
              style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}
              >
                <span style={{ fontFamily: F.sansSemiBold, fontSize: 15, color: C.bg, textAlign: 'left' as const }}>{item.q}</span>
                <span style={{ fontFamily: F.sansSemiBold, fontSize: 20, color: C.muted, lineHeight: 1, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 24px 20px', fontFamily: F.sans, fontSize: 14, color: C.ink3, lineHeight: 1.75 }}>
                  {item.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────

function ContactSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section id="contact" ref={ref} style={{ background: C.surface, padding: '88px 6%', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease }}>
          <div style={{ fontSize: 11, fontFamily: F.sansSemiBold, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: C.action, marginBottom: 14 }}>Contact</div>
          <h2 style={{ fontFamily: F.sansSemiBold, fontSize: 'clamp(28px,4vw,44px)', color: C.bg, letterSpacing: -1, marginBottom: 16, lineHeight: 1.1 }}>Got a question?</h2>
          <p style={{ fontFamily: F.sans, fontSize: 17, color: C.ink3, marginBottom: 36, lineHeight: 1.7 }}>
            We read every email. Whether you're a landlord managing 30 units or a tenant trying to claim HRA — reach out.
          </p>
          <a
            href="mailto:support@rentybase.com"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 54, paddingInline: 32, borderRadius: 14, background: C.bg, color: C.surface, fontFamily: F.sansSemiBold, fontSize: 15, transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'; }}
          >
            <span>✉</span> support@rentybase.com
          </a>
          <p style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 20 }}>
            We typically reply within 24 hours on business days.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Missing font const (for CSSProperties usage inside FeatureSection)
// @ts-ignore — mono font family for Cap-style labels
// eslint-disable-next-line
(F as Record<string, string>).mono = F.sansMedium;

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export default function WelcomeWebScreen() {
  const router = useRouter();
  const { role, ref, signin } = useLocalSearchParams<{ role?: string; ref?: string; signin?: string }>();
  const [selectedRole, setSelectedRole] = useState<'landlord' | 'tenant' | null>(null);

  useEffect(() => {
    const validRole = role === 'landlord' || role === 'tenant' ? role : null;
    if (validRole) void AsyncStorage.setItem('rentybase.pending_role', validRole);
    if (typeof ref === 'string' && ref.trim()) {
      void AsyncStorage.setItem('rentybase.pending_referrer_tenant', ref.trim());
    }
    if (validRole || signin === '1') {
      void router.replace('/(auth)/login');
      return;
    }
    if (validRole) setSelectedRole(validRole);
  }, [ref, role, signin, router]);

  const handleGetStarted = async () => {
    if (selectedRole) {
      await AsyncStorage.setItem('rentybase.pending_role', selectedRole);
    }
    router.push('/(auth)/login');
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ fontFamily: F.sans }}>
        <Nav onCta={handleGetStarted} />
        <Hero onCta={handleGetStarted} />
        <MetricStrip />

        <div id="features" />
        <FeatureSection
          eyebrow="Rent collection"
          title="Stop chasing"
          titleAccent="rent on WhatsApp."
          body="See every payment — paid, pending, overdue — in one shared dashboard. Landlords confirm. Tenants get receipts. Everyone's aligned."
          perks={[
            'Real-time payment status for both sides',
            'Automatic overdue detection',
            'WhatsApp-style nudges via push notification',
          ]}
          visual={<RentMockup />}
          dark
        />

        <FeatureSection
          eyebrow="HRA receipts"
          title="Tax-ready receipts,"
          titleAccent="in one tap."
          body="Every payment generates an HRA-compliant receipt with landlord PAN, property address, UTR reference, and signature. Download PDF instantly."
          perks={[
            'Compliant with 80GG deduction requirements',
            'Landlord PAN + signature included',
            'Shareable PDF in one tap',
          ]}
          visual={<ReceiptMockup />}
          flip
        />

        <FeatureSection
          eyebrow="Maintenance"
          title="Repairs tracked."
          titleAccent="Disputes closed."
          body="Tenants raise requests with photos. Landlords update status and add notes. Both get notified. No more screenshots in WhatsApp groups."
          perks={[
            'Photo-attached repair requests',
            'Status timeline: Open → In Progress → Resolved',
            'Push notifications at every step',
          ]}
          visual={<RepairMockup />}
          dark
          flip
        />

        <div id="how-it-works" />
        <RolePicker
          onGetStarted={handleGetStarted}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
        />

        <Testimonial />

        <PricingSection onGetStarted={handleGetStarted} />
        <FaqSection />
        <ContactSection />
        <CtaSection onGetStarted={handleGetStarted} />
        <Footer />
      </div>
    </>
  );
}
