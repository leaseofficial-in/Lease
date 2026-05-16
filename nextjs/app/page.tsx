'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LogoMark } from '@/components/brand'

/* ── helpers ───────────────────────────────────────────────── */
const useCount = (target: number, active: boolean, duration = 1200) => {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number, start: number
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / duration)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return v
}

const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN')

/* ── Icon ──────────────────────────────────────────────────── */
function Icon({ name, size = 20, sw = 1.75, color = 'currentColor' }: { name: string; size?: number; sw?: number; color?: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'shield': return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    case 'camera': return <svg {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>
    case 'receipt': return <svg {...p}><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-2-2-2 2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
    case 'vault': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1"/></svg>
    case 'wrench': return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5z"/></svg>
    case 'bolt': return <svg {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
    case 'ledger': return <svg {...p}><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z"/><path d="M4 8h16M4 12h16M4 16h16"/></svg>
    case 'arrow-right': return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    case 'lock': return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
    default: return null
  }
}

/* ── PhoneScreens ──────────────────────────────────────────── */
function PhoneScreens({ idx }: { idx: number }) {
  return (
    <>
      <div className={'screen' + (idx === 0 ? ' active' : '')}>
        <div className="s-eyebrow">Good morning, Priya</div>
        <div className="s-hero-amount">
          <div className="label">Collected this month</div>
          <div className="amt mono">₹1,24,000</div>
          <div className="row">
            <div><div className="k">PROPS</div><div className="v">3</div></div>
            <div><div className="k">ON TIME</div><div className="v mono">2 / 3</div></div>
            <div><div className="k">PENDING</div><div className="v" style={{ color: '#F6E6CA' }}>₹18,500</div></div>
          </div>
        </div>
        <div className="s-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><div className="s-eyebrow">Mumbai</div><div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>Bandra 2BHK</div><div style={{ fontSize: 10, color: '#5C645F' }}>Aarav Mehta · paid 5 Nov</div></div>
            <span className="s-pill success">Paid</span>
          </div>
        </div>
        <div className="s-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><div className="s-eyebrow">Pune</div><div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>Koregaon 1BHK</div><div style={{ fontSize: 10, color: '#5C645F' }}>due in 3 days</div></div>
            <span className="s-pill warning">Due</span>
          </div>
        </div>
      </div>

      <div className={'screen' + (idx === 1 ? ' active' : '')}>
        <div className="s-eyebrow">Pay rent</div>
        <div className="s-card">
          <div style={{ fontSize: 11, color: '#5C645F' }}>To · Priya Sharma</div>
          <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 36, marginTop: 6, letterSpacing: '-.02em' }}>₹28,500</div>
          <div style={{ fontSize: 10, color: '#5C645F', marginTop: 2 }}>Koregaon 1BHK · Nov 2025</div>
        </div>
        <div className="s-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 11, fontWeight: 600 }}>UPI</div><div style={{ fontSize: 10, color: '#5C645F' }}>priya@oksbi</div></div>
          <div className="mono" style={{ fontSize: 10, color: '#5C645F' }}>‹ select ›</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: 'var(--rb-action)', color: '#fff', borderRadius: 12, padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>Pay ₹28,500</div>
      </div>

      <div className={'screen' + (idx === 2 ? ' active' : '')}>
        <div className="s-eyebrow">HRA receipt</div>
        <div className="s-receipt">
          <div className="top">
            <div><div style={{ fontSize: 9, color: '#5C645F' }}>RECEIPT</div><div className="title">November 2025</div></div>
            <div className="seal">VERIFIED<br />RECORD</div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="row"><span>Rent</span><span className="v">₹28,500</span></div>
            <div className="row"><span>Property</span><span className="v">Koregaon 1BHK</span></div>
            <div className="row"><span>Period</span><span className="v">1 – 30 Nov &apos;25</span></div>
            <div className="row"><span>UTR</span><span className="v">4581 2210</span></div>
            <div className="row"><span>PAN</span><span className="v">AKWPS****K</span></div>
          </div>
          <div className="total">
            <div style={{ fontSize: 10, color: '#5C645F', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 }}>HRA Eligible</div>
            <div className="v mono">₹28,500</div>
          </div>
        </div>
      </div>

      <div className={'screen' + (idx === 3 ? ' active' : '')}>
        <div className="s-eyebrow">Move-in proof</div>
        <div className="s-proof">
          <div className="photo">
            <span className="ts">12 NOV 2025 · 11:42 IST<br />Lat 19.0760, Lon 72.8777</span>
            <span className="seal">SEALED<br />11:43</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'linear-gradient(135deg,#c9b388,#7a6042)' }} />)}
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#5C645F' }}>12 photos · locked permanently</div>
        </div>
      </div>
    </>
  )
}

/* ── Hero ──────────────────────────────────────────────────── */
function Hero() {
  const phoneRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [heroScreen, setHeroScreen] = useState(0)
  const collected = useCount(124000, true, 1800)

  useEffect(() => {
    const id = setInterval(() => setHeroScreen(s => (s + 1) % 4), 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onMove = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      if (phoneRef.current) phoneRef.current.style.transform = `rotateY(${-12 + x * 16}deg) rotateX(${4 - y * 10}deg) translateZ(40px)`
      stage.querySelectorAll<HTMLElement>('[data-px]').forEach(el => {
        const f = parseFloat(el.dataset.px!)
        el.style.transform = el.dataset.base + ` translate3d(${x * f * 30}px,${y * f * 22}px,0)`
      })
    }
    stage.addEventListener('mousemove', onMove)
    return () => stage.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <section className="hero">
      <div className="hero-headline-top">
        <h1>Rent that <em>trusts itself.</em></h1>
        <p className="sub">A shared, calm record between landlord and tenant. Built for India.</p>
      </div>
      <div className="hero-grid">
        <div className="hero-side">
          <span className="eyebrow"><span className="pip" />For landlords</span>
          <div className="hero-stat">
            <div className="num">{fmtINR(collected)}</div>
            <div className="label">COLLECTED THIS MONTH · 3 PROPERTIES</div>
          </div>
          <p className="hero-tag">Rent in. Receipts out. Disputes never. One quiet ledger that handles every signature, photo, and rupee.</p>
          <div className="hero-cta"><a className="btn btn-primary" href="/signup">Add a property <Icon name="arrow-right" size={16} /></a></div>
        </div>
        <div className="hero-center" ref={stageRef}>
          <div className="hero-spotlight" />
          <div className="float-receipt" data-px="-1.4" data-base="rotate3d(0,1,0,18deg) rotate(-6deg)" style={{ width: 180, top: 120, left: 0, padding: 12, transform: 'rotate3d(0,1,0,18deg) rotate(-6deg)' }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>Receipt · Nov</div>
            <div className="strip" /><div className="strip short" /><div className="strip tiny" />
            <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 18, marginTop: 6, color: 'var(--rb-action)' }}>₹28,500</div>
          </div>
          <div className="float-receipt" data-px="-1.0" data-base="rotate3d(0,1,0,-22deg) rotate(7deg)" style={{ width: 160, top: 80, right: 0, padding: 12, transform: 'rotate3d(0,1,0,-22deg) rotate(7deg)' }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>Move-in proof</div>
            <div style={{ height: 48, borderRadius: 6, marginTop: 6, background: 'linear-gradient(135deg,#c9b388,#7a6042)' }} />
            <div className="strip tiny" style={{ marginTop: 6 }} />
          </div>
          <div className="float-receipt" data-px="-1.8" data-base="rotate3d(0,1,0,12deg) rotate(2deg)" style={{ width: 140, bottom: 80, left: -20, padding: 10, transform: 'rotate3d(0,1,0,12deg) rotate(2deg)' }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>Ledger</div>
            <div className="strip" /><div className="strip short" />
          </div>
          <div className="float-receipt" data-px="-1.2" data-base="rotate3d(0,1,0,-14deg) rotate(-4deg)" style={{ width: 150, bottom: 60, right: -20, padding: 10, transform: 'rotate3d(0,1,0,-14deg) rotate(-4deg)' }}>
            <div className="eyebrow" style={{ fontSize: 9 }}>UTR sealed</div>
            <div className="mono" style={{ fontSize: 11, marginTop: 6 }}>4581 2210 9914</div>
          </div>
          <div className="phone-stage">
            <div className="phone" ref={phoneRef} style={{ transform: 'rotateY(-12deg) rotateX(4deg) translateZ(40px)' }}>
              <div className="phone-body" /><div className="phone-side" /><div className="phone-side left" /><div className="phone-side left2" /><div className="phone-notch" />
              <div className="phone-screen-stack"><PhoneScreens idx={heroScreen} /></div>
            </div>
          </div>
        </div>
        <div className="hero-side right">
          <span className="eyebrow"><span className="pip" />For tenants</span>
          <div className="hero-stat">
            <div className="num"><span className="accent">₹{(0.62 * 12).toFixed(2)}L</span></div>
            <div className="label">HRA SAVED · ANNUAL · ON ₹62K RENT</div>
          </div>
          <p className="hero-tag">One tap and the receipt is in your inbox. Fields filled, PAN attached, year-on-year stored. Tax season, sorted.</p>
          <div className="hero-cta"><a className="btn btn-ghost" href="#proof">See HRA receipt <Icon name="arrow-right" size={16} /></a></div>
        </div>
      </div>
    </section>
  )
}

/* ── Cinema ────────────────────────────────────────────────── */
function Cinema() {
  const ref = useRef<HTMLElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const floatRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const [step, setStep] = useState(0)

  useEffect(() => {
    const wrap = ref.current
    if (!wrap) return
    const onScroll = () => {
      const r = wrap.getBoundingClientRect()
      const total = wrap.offsetHeight - window.innerHeight
      const t = Math.max(0, Math.min(1, -r.top / total))
      setStep(Math.min(3, Math.floor(t * 4.0)))
      const isMobile = window.innerWidth <= 768
      const yaw = isMobile ? -20 + t * 40 : -55 + t * 110
      const pitch = isMobile ? 0 : Math.sin(t * Math.PI) * -8
      const lift = isMobile ? 0 : Math.sin(t * Math.PI) * 30
      if (phoneRef.current) phoneRef.current.style.transform = `rotateY(${yaw}deg) rotateX(${pitch}deg) translateY(${-lift}px) translateZ(${isMobile ? 10 : 40}px)`
      floatRefs.forEach((fr, i) => {
        if (!fr.current) return
        const phase = (t * 4 + i * 0.2) % 1
        fr.current.style.transform = fr.current.dataset.base + ` translate3d(${Math.cos(phase * Math.PI * 2) * 10}px,${Math.sin(phase * Math.PI * 2) * 14}px,0)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const steps = [
    { n: '01', t: 'Add the property. Invite your tenant.', d: 'Property in 30 seconds. Send a link. Your tenant signs in with Google. No app install required, no phone numbers exchanged.', meta: [['Setup', '30 sec'], ['Install', 'Not required']] },
    { n: '02', t: ['Rent', 'in one tap.'], d: '₹28,500 lands. UPI, NEFT, or cash with a UTR. The amount, date, and method get stamped into the shared record automatically.', meta: [['Methods', 'UPI · NEFT · Cash'], ['Settles in', 'Instant']] },
    { n: '03', t: ['Receipt', 'drops itself.'], d: 'A Section 10(13A)-valid HRA receipt generates the moment payment clears. PAN, period, address: every field already filled.', meta: [['Format', 'PDF · 10(13A)'], ['Delivery', 'Email + dashboard']] },
    { n: '04', t: ['Proof, sealed', 'for years.'], d: 'Move-in photos, repair logs, deposit history. All timestamped, locked, and visible to both sides. The same record. Always.', meta: [['Photos', 'Locked at submit'], ['Retention', 'Permanent']] },
  ]

  const floatData = [
    { base: 'translate3d(-220px,-180px,60px) rotate(-4deg)', k: 'Property added', v: 'Bandra 2BHK', show: step >= 0 },
    { base: 'translate3d(240px,-150px,80px) rotate(5deg)', k: 'Rent received', v: '₹28,500', amt: true, show: step >= 1 },
    { base: 'translate3d(-260px,140px,70px) rotate(3deg)', k: 'Receipt no.', v: 'RB-2511-04', show: step >= 2 },
    { base: 'translate3d(220px,180px,50px) rotate(-3deg)', k: 'Move-in proof', v: '12 photos · sealed', show: step >= 3 },
    { base: 'translate3d(0,-260px,120px) rotate(0deg)', k: 'UTR', v: '4581 2210 9914', show: step >= 1 },
  ]

  return (
    <section className="cinema" ref={ref}>
      <div className="cinema-pin">
        <div className="cinema-stage">
          <div className="cinema-floats">
            {floatData.map((f, i) => (
              <div key={i} ref={floatRefs[i]} className={'cinema-float' + (f.show ? ' show' : '')} data-base={f.base} style={{ transform: f.base, left: '50%', top: '50%' }}>
                <div className="k">{f.k}</div>
                <div className={'v' + (f.amt ? ' amt' : '')}>{f.v}</div>
              </div>
            ))}
          </div>
          <div className="phone" ref={phoneRef} style={{ transform: 'rotateY(-55deg) rotateX(0deg) translateZ(40px)' }}>
            <div className="phone-body" /><div className="phone-side" /><div className="phone-side left" /><div className="phone-side left2" /><div className="phone-notch" />
            <div className="phone-screen-stack"><PhoneScreens idx={step} /></div>
          </div>
        </div>
        <div className="cinema-copy">
          {steps.map((s, i) => (
            <div key={i} className={'cinema-step' + (step === i ? ' active' : '')}>
              <div className="num">{s.n}</div>
              <h2>{Array.isArray(s.t) ? <>{s.t[0]} <em>{s.t[1]}</em></> : s.t}</h2>
              <p>{s.d}</p>
              <div className="meta">{s.meta.map(([k, v]) => <div key={k}><div style={{ fontSize: 11, color: 'var(--rb-ink-3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{k}</div><b>{v}</b></div>)}</div>
            </div>
          ))}
          <div className="cinema-progress">
            {[0, 1, 2, 3].map(i => <div key={i} className={'seg' + (i < step ? ' done' : '') + (i === step ? ' active' : '')} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── ProofFilm ─────────────────────────────────────────────── */
function ProofFilm() {
  const ref = useRef<HTMLElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const sealRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [stamped, setStamped] = useState(false)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !open) {
        setOpen(true)
        setTimeout(() => { flashRef.current?.classList.add('flashing'); setTimeout(() => flashRef.current?.classList.remove('flashing'), 600) }, 800)
        setTimeout(() => setStamped(true), 1400)
      }
    }, { threshold: 0.35 })
    obs.observe(el); return () => obs.disconnect()
  }, [open])

  useEffect(() => {
    const onScroll = () => {
      if (!photoRef.current || !ref.current) return
      const r = ref.current.getBoundingClientRect()
      const t = Math.max(0, Math.min(1, 1 - (r.top / window.innerHeight)))
      photoRef.current.style.transform = `rotateX(${-22 + t * 14}deg) rotateY(${-10 + t * 12}deg) translateZ(${t * 40}px)`
    }
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="proof-film" ref={ref} id="proof">
      <div className="container proof-grid">
        <div className="proof-copy">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Move-in proof</div>
          <h2>The day you moved in,<br /><em>recorded forever.</em></h2>
          <p>Twelve photos. One timestamp. A geotag and a seal. Once submitted, neither side can edit them. The proof outlives the dispute.</p>
          <div className="proof-points">
            <div className="proof-point"><div className="ico"><Icon name="camera" size={16} /></div><div><div className="t">Timestamped at the door</div><div className="d">Server time + GPS captured at submit. Photos can&apos;t be backdated, swapped, or re-uploaded.</div></div></div>
            <div className="proof-point"><div className="ico"><Icon name="lock" size={16} /></div><div><div className="t">Locked for both sides</div><div className="d">Once sealed, neither landlord nor tenant can delete. Same record, same view, forever.</div></div></div>
            <div className="proof-point"><div className="ico"><Icon name="shield" size={16} /></div><div><div className="t">Court-ready in PDF</div><div className="d">Export the full set as a signed PDF with embedded EXIF, hash, and the Section 10(13A) receipt for the year.</div></div></div>
          </div>
        </div>
        <div className="proof-stage">
          <div className="proof-photo" ref={photoRef}>
            <div className="frame">
              <div style={{ borderRadius: 6, overflow: 'hidden', background: 'linear-gradient(135deg,#a87a4f 0%,#5b3a20 60%,#2c1c0e 100%)' }} />
              <div style={{ borderRadius: 6, overflow: 'hidden', background: 'linear-gradient(135deg,#c9a878 0%,#7a5d35 55%,#3a2811 100%)' }} />
              <div style={{ borderRadius: 6, overflow: 'hidden', background: 'linear-gradient(135deg,#9aa6a3 0%,#4f5e5b 55%,#1f2724 100%)' }} />
              <div style={{ borderRadius: 6, overflow: 'hidden', background: 'linear-gradient(135deg,#a89280 0%,#5e483a 55%,#28190f 100%)' }} />
            </div>
            <span className="ts"><span className="lbl">Timestamp</span>12 NOV 2025 · 11:42 IST<br />Lat 19.0760  Lon 72.8777</span>
            <div className="proof-flash" ref={flashRef} />
          </div>
          <div className={'proof-seal' + (stamped ? ' stamped' : '')} ref={sealRef}>
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" fill="none" stroke="#C97A3A" strokeWidth="3" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#C97A3A" strokeWidth="1.5" strokeDasharray="2 4" />
              <text x="100" y="86" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="11" letterSpacing="3" fill="#C97A3A" fontWeight="600">VERIFIED RECORD</text>
              <path d="M70 110 l18 18 l42 -42" fill="none" stroke="#C97A3A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <text x="100" y="160" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="14" fill="#C97A3A">RentyBase</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Features ──────────────────────────────────────────────── */
function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="features-head">
          <div className="eyebrow" style={{ display: 'inline-block', marginBottom: 14 }}>Everything else, included</div>
          <h2>One quiet record.<br /><em>Six small certainties.</em></h2>
          <p>No add-ons, no upsells. Free during beta. Every feature, no limits.</p>
        </div>
        <div className="features-grid"><div className="features-grid-inner">
          <div className="feat-card wide">
            <div className="ico"><Icon name="receipt" size={20} /></div>
            <h3>HRA receipts in one tap.</h3>
            <p>Section 10(13A)-compliant PDF with PAN, address, period, and UTR. Year-on-year archived. Export the whole financial year as a single bundle.</p>
            <div className="stat"><div><div className="l">SAVED PER YEAR</div><div className="n">₹62,400</div></div><div><div className="l">FORMAT</div><div className="n" style={{ fontSize: 18 }}>PDF · 10(13A)</div></div></div>
          </div>
          <div className="feat-card accent">
            <div className="ico"><Icon name="vault" size={20} /></div>
            <h3>Deposit ledger.</h3>
            <p>Every deduction logged with a photo, an amount, and a reason. The day you move out, the math is already done.</p>
          </div>
          <div className="feat-card">
            <div className="ico"><Icon name="wrench" size={20} /></div>
            <h3>Repair requests.</h3>
            <p>Tenant raises, landlord sees, both watch the status. With photos, vendor quotes, and a closed-by signature.</p>
          </div>
          <div className="feat-card">
            <div className="ico"><Icon name="ledger" size={20} /></div>
            <h3>Leave &amp; License.</h3>
            <p>Templated agreement built for state-level stamp duty. Generate, e-sign, attach to the property.</p>
          </div>
          <div className="feat-card accent wide">
            <div className="ico"><Icon name="bolt" size={20} /></div>
            <h3>Reminders that don&apos;t nag.</h3>
            <p>Three calm nudges at 5/3/0 days. SMS + email. No marketing copy. The kind of message you&apos;d actually want a landlord to send.</p>
            <div className="stat"><div><div className="l">ON-TIME RATE</div><div className="n">94%</div></div><div><div className="l">NUDGES PER MONTH</div><div className="n">≤ 3</div></div></div>
          </div>
        </div></div>
      </div>
    </section>
  )
}

/* ── Trust ─────────────────────────────────────────────────── */
function Trust() {
  const ref = useRef<HTMLElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true) }, { threshold: 0.3 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current || !stackRef.current) return
      const r = ref.current.getBoundingClientRect()
      const t = Math.max(0, Math.min(1, 1 - r.top / window.innerHeight))
      stackRef.current.style.transform = `rotateY(${-16 + t * 8}deg) rotateX(${6 - t * 4}deg)`
    }
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const records = [
    { t: 'Nov 2025 · Rent', v: '₹28,500' }, { t: 'Oct 2025 · Rent', v: '₹28,500' },
    { t: 'Move-in · 12 photos', v: 'Sealed' }, { t: 'Deposit · 3-month', v: '₹85,500' },
    { t: 'Repair · plumbing', v: '₹1,200' }, { t: 'Sep 2025 · Rent', v: '₹28,500' },
  ]
  const onTime = useCount(94, shown)
  const sealed = useCount(12, shown)
  const years = useCount(7, shown)

  return (
    <section className="trust" ref={ref}>
      <div className="container trust-grid">
        <div>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,.55)', marginBottom: 18 }}>Trust &amp; security</div>
          <h2>A record both sides<br /><em>actually trust.</em></h2>
          <p className="tag">Most disputes between landlord and tenant come down to &ldquo;what did we agree?&rdquo; RentyBase keeps both of you looking at the same page. Literally the same row in the same ledger, for as long as the property exists.</p>
          <div className="trust-stats">
            <div className="s"><div className="n">{onTime}<span className="ochre">%</span></div><div className="l">on-time rent rate</div></div>
            <div className="s"><div className="n">{sealed}.4<span className="ochre">k</span></div><div className="l">photos sealed</div></div>
            <div className="s"><div className="n">{years}<span className="ochre">y</span></div><div className="l">retention, minimum</div></div>
          </div>
        </div>
        <div className="vault-stage">
          <div className="vault" ref={stackRef}>
            <div className="vault-body">
              <div className="vault-glow" />
              <div className="vault-stack">
                {records.map((r, i) => (
                  <div className="vault-rec" key={i} style={{ transform: `translateZ(${(records.length - i) * 6}px)`, opacity: shown ? 1 : 0, transition: `opacity .5s ${.05 * i}s,transform .5s ${.05 * i}s` }}>
                    <span>{r.t}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="v">{r.v}</span><span className="seal">✓</span></span>
                  </div>
                ))}
              </div>
              <div className="vault-base">SEALED LEDGER</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Scores ────────────────────────────────────────────────── */
function Scores() {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true) }, { threshold: 0.3 })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const tScore = useCount(842, shown, 1600)
  const lScore = useCount(786, shown, 1600)

  const Dial = ({ value, max = 900, color }: { value: number; max?: number; color: string }) => {
    const pct = value / max, C = 2 * Math.PI * 78
    return (
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs><linearGradient id={`g${color.replace('#', '')}`} x1="0" x2="1"><stop offset="0" stopColor={color} stopOpacity=".4" /><stop offset="1" stopColor={color} /></linearGradient></defs>
        <circle cx="100" cy="100" r="78" fill="none" stroke="#E6E2D7" strokeWidth="10" />
        <circle cx="100" cy="100" r="78" fill="none" stroke={`url(#g${color.replace('#', '')})`} strokeWidth="10" strokeDasharray={`${C * pct} ${C}`} strokeLinecap="round" transform="rotate(-90 100 100)" style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
    )
  }

  const tBreak = [{ k: 'On-time rent', v: '23/24 months', w: 0.92 }, { k: 'Move-in proof', v: 'Submitted', w: 1.0 }, { k: 'Repair reports', v: 'All resolved', w: 0.85 }, { k: 'Deposit history', v: '2 returned in full', w: 0.95 }]
  const lBreak = [{ k: 'Deposit returned', v: '100% on time', w: 1.0 }, { k: 'Repair response', v: 'Avg 1.2 days', w: 0.88 }, { k: 'HRA receipts', v: 'Issued every month', w: 0.95 }, { k: 'Lease compliance', v: '0 violations', w: 1.0 }]

  return (
    <section className="scores" ref={ref}>
      <div className="container">
        <div className="features-head">
          <div className="eyebrow" style={{ display: 'inline-block', marginBottom: 14 }}>Trust, scored</div>
          <h2>A reputation <em>both sides earn.</em></h2>
          <p>The same record builds two scores: one for tenants, one for landlords. Carry your history to the next rental. No more starting from zero.</p>
        </div>
        <div className="score-grid">
          <div className="score-card">
            <div className="score-tag">For tenants</div>
            <div className="score-dial"><Dial value={tScore} color="#0F4C5C" /><div className="score-num"><div className="n">{tScore}</div><div className="l">/ 900</div><div className="band action">EXCELLENT</div></div></div>
            <div className="score-id"><div className="who"><div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#c9b388,#7a6042)' }} /><div><div style={{ fontWeight: 600, fontSize: 14 }}>Aarav Mehta</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)' }}>Tenant since Aug 2023 · Mumbai</div></div></div><span className="s-pill action" style={{ padding: '4px 10px' }}>Verified</span></div>
            <div className="score-break">{tBreak.map(b => <div key={b.k} className="b"><div className="row"><span>{b.k}</span><span className="v">{b.v}</span></div><div className="bar"><div className="fill action" style={{ width: shown ? `${b.w * 100}%` : '0%' }} /></div></div>)}</div>
            <div className="score-foot">Carry this to your next landlord →</div>
          </div>
          <div className="score-card accent">
            <div className="score-tag">For landlords</div>
            <div className="score-dial"><Dial value={lScore} color="#C97A3A" /><div className="score-num"><div className="n">{lScore}</div><div className="l">/ 900</div><div className="band ochre">TRUSTED</div></div></div>
            <div className="score-id"><div className="who"><div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0F4C5C,#163A47)' }} /><div><div style={{ fontWeight: 600, fontSize: 14 }}>Priya Sharma</div><div style={{ fontSize: 11, color: 'var(--rb-ink-3)' }}>3 properties · Bandra, Pune, HSR</div></div></div><span className="s-pill" style={{ background: 'var(--rb-accent-soft)', color: 'var(--rb-accent)', padding: '4px 10px' }}>Verified</span></div>
            <div className="score-break">{lBreak.map(b => <div key={b.k} className="b"><div className="row"><span>{b.k}</span><span className="v">{b.v}</span></div><div className="bar"><div className="fill ochre" style={{ width: shown ? `${b.w * 100}%` : '0%' }} /></div></div>)}</div>
            <div className="score-foot">Tenants see this before they even ask →</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── FinalCTA ──────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="cta" id="start">
      <div className="container">
        <div className="stamp-wrap">
          <h2 className="display">One ledger.<br /><em>Both sides.</em></h2>
          <div className="ochre-stamp">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" fill="none" stroke="#C97A3A" strokeWidth="3" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#C97A3A" strokeWidth="1.5" strokeDasharray="2 4" />
              <text x="100" y="92" textAnchor="middle" fontFamily="DM Sans" fontSize="11" letterSpacing="3" fill="#C97A3A" fontWeight="600">FREE · BETA</text>
              <text x="100" y="115" textAnchor="middle" fontFamily="Instrument Serif" fontStyle="italic" fontSize="22" fill="#C97A3A">2026</text>
            </svg>
          </div>
        </div>
        <p>Free during beta. All features, no card. Export your data any time.</p>
        <div className="actions">
          <a className="btn btn-primary" href="/signup">Add a property <Icon name="arrow-right" size={16} /></a>
          <a className="btn btn-ghost" href="/signup">I&apos;m a tenant</a>
        </div>
      </div>
    </section>
  )
}

/* ── Mobile marketing helpers ──────────────────────────────── */
function findScrollParent(el: Element | null): Element | Window {
  let p = el?.parentElement
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return window
}

function useScrollProgress(ref: React.RefObject<HTMLElement | null>, opts: { start?: number; end?: number } = {}) {
  const { start = 0, end = 1 } = opts
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scroller = findScrollParent(el)
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const scR = scroller === window
        ? { top: 0, height: window.innerHeight }
        : (scroller as Element).getBoundingClientRect()
      const sH = scR.height
      const elTop = r.top - scR.top
      const passed = sH - elTop
      const total = r.height + sH
      let t = passed / total
      t = (t - start) / (end - start)
      t = Math.max(0, Math.min(1, t))
      setP(t)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    window.addEventListener('resize', onScroll)
    const t1 = setTimeout(onScroll, 80)
    const t2 = setTimeout(onScroll, 400)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ref, start, end])
  return p
}

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.25) {
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scroller = findScrollParent(el)
    const check = () => {
      const r = el.getBoundingClientRect()
      const scR = scroller === window
        ? { top: 0, height: window.innerHeight }
        : (scroller as Element).getBoundingClientRect()
      const visTop = Math.max(r.top, scR.top)
      const visBot = Math.min(r.bottom, scR.top + scR.height)
      const visible = Math.max(0, visBot - visTop)
      const ratio = r.height > 0 ? visible / r.height : 0
      if (ratio >= threshold) { setV(true); return true }
      return false
    }
    if (check()) return
    const onScroll = () => {
      if (check()) {
        scroller.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }
    scroller.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    window.addEventListener('resize', onScroll)
    const t1 = setTimeout(onScroll, 80)
    const t2 = setTimeout(onScroll, 400)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ref, threshold])
  return v
}

/* ── Mobile marketing SVGs ─────────────────────────────────── */
const MMMark = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
    <rect width="40" height="40" rx="9" fill="#0E1413"/>
    <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
    <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
    <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
    <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
  </svg>
)

const MMSeal = ({ size = 140 }: { size?: number }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
    <defs>
      <radialGradient id="mmSealG" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#E29457"/>
        <stop offset="55%" stopColor="#C97A3A"/>
        <stop offset="100%" stopColor="#8E4C1B"/>
      </radialGradient>
      <radialGradient id="mmSealH" cx="35%" cy="28%" r="35%">
        <stop offset="0%" stopColor="rgba(255,255,255,.45)"/>
        <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <path d="M100 8 C140 8, 188 36, 192 86 C196 134, 168 184, 116 192 C68 199, 22 168, 10 124 C-2 76, 30 22, 78 12 C84 11, 92 8, 100 8 Z" fill="url(#mmSealG)"/>
    <path d="M100 8 C140 8, 188 36, 192 86 C196 134, 168 184, 116 192 C68 199, 22 168, 10 124 C-2 76, 30 22, 78 12 C84 11, 92 8, 100 8 Z" fill="url(#mmSealH)"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(244,229,212,.5)" strokeWidth="1.4" strokeDasharray="2 3"/>
    <text x="100" y="48" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="10" letterSpacing="3.2" fill="#F4E5D4" fontWeight="700">VERIFIED · SEALED</text>
    <path d="M68 102 l22 22 l44 -44" fill="none" stroke="#F6F4EE" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="100" y="170" textAnchor="middle" fontFamily="'Instrument Serif', serif" fontSize="14" fill="#F4E5D4" fontStyle="italic">RentyBase</text>
  </svg>
)

const MMSealCTA = ({ size = 170 }: { size?: number }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
    <defs>
      <radialGradient id="mmCTASealG" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#E29457"/>
        <stop offset="55%" stopColor="#C97A3A"/>
        <stop offset="100%" stopColor="#8E4C1B"/>
      </radialGradient>
    </defs>
    <path d="M100 8 C140 8, 188 36, 192 86 C196 134, 168 184, 116 192 C68 199, 22 168, 10 124 C-2 76, 30 22, 78 12 C84 11, 92 8, 100 8 Z" fill="url(#mmCTASealG)"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(244,229,212,.55)" strokeWidth="1.4" strokeDasharray="2 3"/>
    <text x="100" y="62" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="3.4" fill="#F4E5D4" fontWeight="700">FREE · BETA</text>
    <text x="100" y="120" textAnchor="middle" fontFamily="'Instrument Serif', serif" fontStyle="italic" fontSize="34" fill="#F4E5D4">2026</text>
    <text x="100" y="146" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="8" letterSpacing="2.2" fill="rgba(244,229,212,.7)" fontWeight="700">RB · MUMBAI · INDIA</text>
  </svg>
)

/* ── MMHero ─────────────────────────────────────────────────── */
function MMHero() {
  const stageRef = useRef<HTMLElement>(null)
  const p = useScrollProgress(stageRef, { start: 0.1, end: 0.7 })
  const yaw = -10 + p * 25
  const pitch = 5 - p * 12

  useEffect(() => {
    if (!stageRef.current) return
    stageRef.current.style.setProperty('--phone-yaw', `${yaw}deg`)
    stageRef.current.style.setProperty('--phone-pitch', `${pitch}deg`)
    stageRef.current.querySelectorAll<HTMLElement>('[data-px]').forEach(el => {
      const f = parseFloat(el.dataset.px || '0')
      const base = getComputedStyle(el).getPropertyValue('--base') || ''
      el.style.transform = `${base} translate3d(0, ${p * f * 30}px, 0)`
    })
  }, [p, yaw, pitch])

  return (
    <section className="mm-hero">
      <span className="city"><span className="dot"/> MUMBAI · INDIA</span>
      <h1>Rent that<br/><em>trusts itself.</em></h1>
      <p>A shared, calm record between landlord and tenant. Built for India. One ledger, both sides, forever.</p>
      <div className="ctas">
        <a href="/signup" className="mm-btn">Start free <span className="arr">→</span></a>
        <a href="/signin" className="mm-btn ghost">Sign in</a>
      </div>
      <div className="mm-stage" ref={stageRef as React.RefObject<HTMLDivElement>}>
        <div className="mm-float r1" data-px="-1.4">
          <div className="lbl">Receipt · Nov</div>
          <div className="val">₹28,500</div>
          <div className="strip"/><div className="strip s"/>
        </div>
        <div className="mm-float r2" data-px="-1.0">
          <div className="lbl">Move-in proof</div>
          <div className="thumb"/>
          <div className="mono">12 · sealed</div>
        </div>
        <div className="mm-float r3" data-px="-1.6">
          <div className="lbl">UTR sealed</div>
          <div className="mono">4581 2210 9914</div>
          <div className="strip"/>
        </div>
        <div className="mm-float r4" data-px="-1.2">
          <div className="lbl">HRA · annual</div>
          <div className="val">₹7.44L</div>
          <div className="strip s"/>
        </div>
        <div className="mm-phone">
          <div className="body"/><div className="notch"/>
          <div className="scr">
            <div className="scr-inner">
              <span className="scr-pill">RENT RECEIVED</span>
              <span className="scr-eyebrow">NOV 2025 · BANDRA W</span>
              <span className="scr-amt">₹28,500</span>
              <div className="scr-card"><span>UPI · auto-pay</span><span className="v">SETTLED</span></div>
              <div className="scr-card"><span>HRA receipt</span><span className="v vw">ISSUED ↗</span></div>
              <div className="scr-card"><span>Move-in proof</span><span className="v">12 SEALED</span></div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--rb-font-mono)', fontSize: 7, color: 'var(--rb-ink-3)', letterSpacing: '.14em', fontWeight: 700 }}>
                <span>RB·024·M11</span><span>SEALED ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="stat-row">
        <div>
          <div className="n">₹1.24<span className="ochre">L</span></div>
          <div className="l">COLLECTED · MONTH<br/>3 PROPERTIES</div>
        </div>
        <div className="div"/>
        <div>
          <div className="n">94<span className="ochre">%</span></div>
          <div className="l">ON-TIME RATE<br/>AVG TENANT</div>
        </div>
      </div>
    </section>
  )
}

/* ── MMCinema ───────────────────────────────────────────────── */
function MMCinema() {
  const ref = useRef<HTMLElement>(null)
  const p = useScrollProgress(ref, { start: 0.15, end: 0.85 })
  const step = Math.min(3, Math.floor(p * 4.0))
  const yaw = -45 + p * 90
  const pitch = Math.sin(p * Math.PI) * -6

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--cin-yaw', `${yaw}deg`)
    ref.current.style.setProperty('--cin-pitch', `${pitch}deg`)
  }, [yaw, pitch])

  const steps = [
    { num: '01', a: 'Add the property.', b: 'Invite your tenant.', em: true,
      d: 'Property in 30 seconds. Send a link. Your tenant signs in with Google. No app install required.',
      meta: [['Setup', '30 sec'], ['Install', 'Not required']],
      phone: { eb: 'STEP 1 · SETUP', h: 'Bandra W', sub: '2BHK · ₹62,000/mo' } },
    { num: '02', a: 'Rent in', b: 'one tap.', em: true,
      d: '₹28,500 lands. UPI, NEFT, or cash with a UTR. The amount and date stamp into the ledger automatically.',
      meta: [['Methods', 'UPI · NEFT'], ['Settles', 'Instant']],
      phone: { eb: 'RENT RECEIVED', h: '₹28,500', sub: 'UTR · 4581 2210' } },
    { num: '03', a: 'Receipt', b: 'drops itself.', em: true,
      d: 'A Section 10(13A)-valid HRA receipt generates the moment payment clears. PAN, period, address: all filled.',
      meta: [['Format', 'PDF · 10(13A)'], ['Sent to', 'Both inboxes']],
      phone: { eb: 'HRA · ISSUED', h: 'RB-2511-04', sub: 'PDF · 10(13A) ready' } },
    { num: '04', a: 'Proof, sealed', b: 'for years.', em: false,
      d: 'Move-in photos, repair logs, deposit history. All timestamped, locked, visible to both sides. Forever.',
      meta: [['Retention', 'Permanent'], ['Editable', 'Never']],
      phone: { eb: 'VAULT · SEALED', h: '12 photos', sub: 'Locked 12 Nov 2025' } },
  ]

  const phoneScreens = [
    /* Step 0 — Dashboard: add property, see tenants */
    <div key={0} className="scr">
      <span className="lbl">GOOD MORNING, PRIYA</span>
      <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 20, letterSpacing: '-.02em', marginTop: 4, lineHeight: 1 }}>₹1,24,000</div>
      <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 5.5, color: 'var(--rb-ink-3)', letterSpacing: '.1em', marginTop: 2 }}>COLLECTED · 3 PROPERTIES</div>
      <div className="card" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 8 }}>Bandra 2BHK</span>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 7, fontWeight: 700, color: '#1F7A55' }}>PAID</span>
      </div>
      <div className="card">
        <span style={{ fontSize: 8 }}>Koregaon 1BHK</span>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 7, fontWeight: 700, color: '#B8740F' }}>DUE</span>
      </div>
    </div>,
    /* Step 1 — Pay rent: amount + UPI + button */
    <div key={1} className="scr">
      <span className="lbl">PAY RENT</span>
      <div style={{ fontSize: 8, color: 'var(--rb-ink-3)', marginTop: 4 }}>To · Priya Sharma</div>
      <div style={{ fontFamily: 'var(--rb-font-display)', fontSize: 24, letterSpacing: '-.025em', marginTop: 2, lineHeight: 1 }}>₹28,500</div>
      <div className="card" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 8 }}>UPI · priya@oksbi</span>
        <span className="v" style={{ fontSize: 8 }}>›</span>
      </div>
      <div style={{ background: 'var(--rb-action)', color: '#fff', borderRadius: 7, padding: '7px', textAlign: 'center' as const, fontWeight: 600, fontSize: 9, marginTop: 6 }}>
        Pay ₹28,500
      </div>
    </div>,
    /* Step 2 — HRA receipt: rows + verified seal */
    <div key={2} className="scr">
      <span className="lbl">HRA RECEIPT</span>
      <div style={{ fontSize: 7, color: 'var(--rb-ink-3)', marginTop: 4 }}>November 2025</div>
      <div className="card" style={{ flexDirection: 'column' as const, alignItems: 'stretch', gap: 5, marginTop: 6, padding: '6px 7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7 }}>
          <span>Rent</span><span style={{ fontFamily: 'var(--rb-font-mono)', fontWeight: 700, color: 'var(--rb-action)' }}>₹28,500</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7 }}>
          <span>UTR</span><span style={{ fontFamily: 'var(--rb-font-mono)', fontWeight: 700 }}>4581 2210</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7 }}>
          <span>PAN</span><span style={{ fontFamily: 'var(--rb-font-mono)', fontWeight: 700 }}>AKWPS****K</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
        <svg viewBox="0 0 16 16" width="13" height="13">
          <circle cx="8" cy="8" r="7" fill="rgba(201,122,58,.18)" stroke="#C97A3A" strokeWidth="0.8"/>
          <path d="M4 8l3 3 5-5" fill="none" stroke="#C97A3A" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 6, color: 'var(--rb-accent)', letterSpacing: '.1em', fontWeight: 700 }}>VERIFIED RECORD</span>
      </div>
    </div>,
    /* Step 3 — Move-in proof: photo grid + sealed */
    <div key={3} className="scr">
      <span className="lbl">MOVE-IN PROOF</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 7 }}>
        {(['LIVING', '#c9b388', '#7a6042'] as const).map && [['LIVING','#c9b388','#7a6042'],['KITCHEN','#9aa6a3','#4f5e5b']].map(([room, c1, c2]) => (
          <div key={room} style={{ aspectRatio: '1', borderRadius: 5, background: `linear-gradient(135deg, ${c1}, ${c2})`, position: 'relative' }}>
            <span style={{ position: 'absolute', bottom: 3, left: 4, fontFamily: 'var(--rb-font-mono)', fontSize: 5, color: 'rgba(246,244,238,.9)', fontWeight: 700 }}>{room}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 6, color: 'var(--rb-ink-3)', letterSpacing: '.08em', marginTop: 6 }}>12 NOV 2025 · 11:42 IST</div>
      <div className="card" style={{ marginTop: 5 }}>
        <span style={{ fontSize: 8 }}>12 photos</span>
        <span style={{ fontFamily: 'var(--rb-font-mono)', fontSize: 7, fontWeight: 700, color: 'var(--rb-accent)' }}>SEALED ✓</span>
      </div>
    </div>,
  ]

  return (
    <section className="mm-cinema" ref={ref}>
      <div className="intro">
        <span className="mm-eyebrow">THE LIFECYCLE</span>
        <h2>Four moments.<br/>One <em>quiet ledger.</em></h2>
        <p className="mm-sub">From the day you list to the day you move out, every event lands in the same record. Scroll through.</p>
      </div>
      <div className="mm-cinema-stage">
        <div className="mm-cinema-progress">
          {[0,1,2,3].map(i => (
            <div key={i} className={'seg' + (i < step ? ' done' : '') + (i === step ? ' on' : '')}/>
          ))}
        </div>
        <div className="mm-cinema-pin">
          <div className="mm-cinema-phone">
            <div className="body"/>
            {phoneScreens[step]}
          </div>
          <div className="mm-cinema-orbit">
            <div className={'item i0' + (step >= 0 ? ' on' : '')}><div className="k">Property</div><div className="v">Bandra 2BHK</div></div>
            <div className={'item i1' + (step >= 1 ? ' on' : '')}><div className="k">Rent received</div><div className="v amt">₹28,500</div></div>
            <div className={'item i2' + (step >= 2 ? ' on' : '')}><div className="k">Receipt</div><div className="v">RB-2511-04</div></div>
            <div className={'item i3' + (step >= 3 ? ' on' : '')}><div className="k">Move-in proof</div><div className="v">12 · sealed</div></div>
          </div>
        </div>
        <div className="mm-cinema-steps">
          {steps.map((s, i) => (
            <div key={i} className={'mm-cinema-step' + (step === i ? ' on' : '')}>
              <div className="num">{s.num}</div>
              <h3>{s.a}<br/>{s.em ? <em>{s.b}</em> : s.b}</h3>
              <p>{s.d}</p>
              <div className="meta">
                {s.meta.map(([k, v]) => (
                  <div className="col" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── MMProof ────────────────────────────────────────────────── */
function MMProof() {
  const ref = useRef<HTMLElement>(null)
  const p = useScrollProgress(ref, { start: 0.2, end: 0.7 })
  const [flash, setFlash] = useState(false)
  const sealOn = p > 0.5
  const tilt = 22 - p * 30
  const yaw = -10 + p * 14

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--proof-tilt', `${tilt}deg`)
    ref.current.style.setProperty('--proof-yaw', `${yaw}deg`)
  }, [tilt, yaw])

  useEffect(() => {
    if (sealOn && !flash) {
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
    }
  }, [sealOn]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="mm-proof" ref={ref}>
      <span className="eyebrow">MOVE-IN PROOF</span>
      <h2>The day you moved in,<br/><em>recorded forever.</em></h2>
      <p>Twelve photos. One timestamp. A geotag, and a wax seal. Once submitted, neither side can edit them.</p>
      <div className="mm-proof-photo">
        <div className="grid">
          <div className="cell"><span className="room">LIVING</span></div>
          <div className="cell"><span className="room">KITCHEN</span></div>
          <div className="cell"><span className="room">BATH</span></div>
          <div className="cell"><span className="room">BEDROOM</span></div>
        </div>
        <span className="ts"><b>12 NOV 2025 · 11:42 IST</b><br/>LAT 19.0760 · LON 72.8777</span>
        <div className={'mm-proof-flash' + (flash ? ' on' : '')}/>
        <div className={'mm-proof-seal' + (sealOn ? ' on' : '')} style={{ '--seal-rot': sealOn ? '-14deg' : '-36deg' } as React.CSSProperties}>
          <MMSeal size={100}/>
        </div>
      </div>
      <div className="mm-proof-points">
        <div className="mm-proof-point">
          <div className="ic">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M3 8 L21 8 L21 19 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 Z M3 8 L7 4 L17 4 L21 8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              <circle cx="12" cy="14" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
            </svg>
          </div>
          <div><div className="t">Timestamped at the door</div><div className="d">Server time + GPS captured at submit. Photos can&apos;t be backdated, swapped, or re-uploaded.</div></div>
        </div>
        <div className="mm-proof-point">
          <div className="ic">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
              <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" fill="none" stroke="currentColor" strokeWidth="1.7"/>
            </svg>
          </div>
          <div><div className="t">Locked for both sides</div><div className="d">Once sealed, neither landlord nor tenant can delete. Same record, same view, forever.</div></div>
        </div>
        <div className="mm-proof-point">
          <div className="ic">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M12 3 L20 6 V12 a8 9 0 0 1 -8 9 a8 9 0 0 1 -8 -9 V6 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              <path d="M8 12 L11 15 L16 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div><div className="t">Court-ready in PDF</div><div className="d">Export the full set as a signed PDF with EXIF, hash, and the Section 10(13A) receipt for the year.</div></div>
        </div>
      </div>
    </section>
  )
}

/* ── MMVault ────────────────────────────────────────────────── */
function MMVault() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, 0.35)
  const p = useScrollProgress(ref, { start: 0.1, end: 0.8 })
  const yaw = -18 + p * 14
  const pitch = 22 - p * 12

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--vault-yaw', `${yaw}deg`)
    ref.current.style.setProperty('--vault-pitch', `${pitch}deg`)
  }, [yaw, pitch])

  const records = [
    { t: 'Nov 2025 · Rent',      s: 'RB·024·M11',   v: '₹28,500' },
    { t: 'Oct 2025 · Rent',      s: 'RB·024·M10',   v: '₹28,500' },
    { t: 'Move-in · 12 photos',  s: 'Sealed 12 Nov', v: '12 · ✓' },
    { t: 'Deposit · 3 months',   s: 'Held in escrow', v: '₹85,500' },
    { t: 'Repair · plumbing',    s: 'Closed by both', v: '₹1,200' },
    { t: 'Sep 2025 · Rent',      s: 'RB·024·M09',   v: '₹28,500' },
  ]

  return (
    <section className="mm-vault" ref={ref}>
      <span className="mm-eyebrow">THE VAULT</span>
      <h2>A record both sides<br/><em>actually trust.</em></h2>
      <p>Most disputes come down to &ldquo;what did we agree?&rdquo; RentyBase keeps both of you looking at the same row in the same ledger.</p>
      <div className="mm-vault-stage">
        <div className="mm-vault-stack">
          {records.map((r, i) => {
            const offset = i - (records.length - 1) / 2
            const z = -i * 14
            const y = offset * 30
            const rot = (offset * 1.4).toFixed(2)
            return (
              <div key={i} className={'mm-vault-card' + (inView ? ' on' : '')}
                style={{ '--z': `${z}px`, '--y': `${y}px`, '--rot': `${rot}deg`, transitionDelay: `${0.06 * i}s`, zIndex: records.length - i } as React.CSSProperties}>
                <div><div className="t">{r.t}</div><div className="s">{r.s}</div></div>
                <span className="v">{r.v}<span className="seal">✓</span></span>
              </div>
            )
          })}
        </div>
        <span className="mm-vault-base">SEALED LEDGER</span>
      </div>
      <div className="mm-vault-stats">
        <div className="s"><div className="n">94<span className="ochre">%</span></div><div className="l">ON-TIME<br/>RENT RATE</div></div>
        <div className="s"><div className="n">12<span className="ochre">k</span></div><div className="l">PHOTOS<br/>SEALED</div></div>
        <div className="s"><div className="n">7<span className="ochre">y</span></div><div className="l">RETENTION<br/>MIN.</div></div>
      </div>
    </section>
  )
}

/* ── MMFeatures ─────────────────────────────────────────────── */
function MMFeatures() {
  return (
    <section className="mm-features">
      <span className="mm-eyebrow">EVERYTHING ELSE, INCLUDED</span>
      <h2>Six small<br/><em>certainties.</em></h2>
      <p className="mm-sub">No add-ons, no upsells. Every feature, free during beta.</p>
      <div className="feat-grid">
        <div className="mm-feat wide dark">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 4 L19 4 L19 21 L16 19 L13 21 L10 19 L7 21 L5 19 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 9 L15 9 M9 13 L15 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></div>
          <div className="t">HRA receipts<br/>in <em>one tap.</em></div>
          <div className="d">Section 10(13A)-compliant PDF with PAN, address, period, and UTR. Year-on-year archived.</div>
          <div className="stat"><div><div className="l">SAVED · YEAR</div><div className="n amt">₹62,400</div></div><div><div className="l">FORMAT</div><div className="n">10(13A)</div></div></div>
        </div>
        <div className="mm-feat">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 4 L15 4 L15 8 L9 8 Z" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></div>
          <div className="t">Deposit ledger</div>
          <div className="d">Every deduction with a photo, an amount, and a reason. Move-out math, pre-done.</div>
        </div>
        <div className="mm-feat ochre">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M14 3 L20 9 L11 18 L4 18 L4 11 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M15 8 L19 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></div>
          <div className="t">Repair requests</div>
          <div className="d">Tenant raises, landlord sees, both watch the status. Photos + vendor quotes.</div>
        </div>
        <div className="mm-feat">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 3 L18 3 L18 21 L6 21 Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 8 L15 8 M9 12 L15 12 M9 16 L13 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></div>
          <div className="t">Leave &amp; License</div>
          <div className="d">State-level stamp duty templates. Generate, e-sign, file. Done.</div>
        </div>
        <div className="mm-feat">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M13 3 L4 14 L11 14 L9 21 L20 9 L13 9 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></div>
          <div className="t">Calm reminders</div>
          <div className="d">3 nudges at 5/3/0 days. SMS + email. Never marketing.</div>
        </div>
        <div className="mm-feat wide">
          <div className="ic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M4 10 H20" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/><circle cx="13" cy="15" r="1.4" fill="currentColor"/><circle cx="17" cy="15" r="1.4" fill="currentColor"/></svg></div>
          <div className="t">PG floor plan, per-bed billing</div>
          <div className="d">For PGs and hostels: bed-level rent, vacancy heatmaps, auto-collect via UPI 2.0.</div>
          <div className="stat"><div><div className="l">PROPERTIES</div><div className="n amt">120+</div></div><div><div className="l">UTILIZATION</div><div className="n">96%</div></div></div>
        </div>
      </div>
    </section>
  )
}

/* ── MMCTA ──────────────────────────────────────────────────── */
function MMCTA() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, 0.4)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--cta-seal-rot', inView ? '-10deg' : '-30deg')
    ref.current.style.setProperty('--cta-seal-scale', inView ? '1' : '1.4')
  }, [inView])

  return (
    <section className="mm-cta" ref={ref}>
      <div className="seal-wrap"><MMSealCTA size={170}/></div>
      <h2>One ledger.<br/><em>Both sides.</em></h2>
      <p>Free during beta. All features, no card. Export your data any time.</p>
      <div className="ctas">
        <a href="/signup" className="mm-btn ochre">Add a property <span className="arr">→</span></a>
        <a href="/signin" className="mm-btn ghost">Sign in</a>
      </div>
    </section>
  )
}

/* ── MMFoot ─────────────────────────────────────────────────── */
function MMFoot() {
  return (
    <footer className="mm-foot">
      <div className="brand">
        <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
          <rect width="40" height="40" rx="9" fill="#F6F4EE"/>
          <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#0E1413"/>
          <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#F6F4EE"/>
          <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
        </svg>
        <span>Renty<em>Base</em></span>
      </div>
      <p className="tag">A shared, calm record between landlord and tenant. Built in Bengaluru, for India.</p>
      <div className="links">
        <div>
          <h4>Product</h4>
          <a href="/features">Move-in proof</a>
          <a href="/tools">HRA receipts</a>
          <a href="/features">Repair ledger</a>
          <a href="/features">Leave &amp; License</a>
        </div>
        <div>
          <h4>Company</h4>
          <a href="/company">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
      <div className="links" style={{ marginTop: 0 }}>
        <div>
          <h4>Account</h4>
          <a href="/signup">Start free</a>
          <a href="/signin">Sign in</a>
        </div>
      </div>
      <div className="rule"/>
      <div className="meta">
        <span>© 2026 RENTYBASE TECH PVT LTD</span>
        <span>SECTION 10(13A) COMPLIANT</span>
        <span>NO DATA SOLD, EVER</span>
        <span>FOUNDED BY AKHIL MADHAVARAM</span>
      </div>
    </footer>
  )
}

/* ── Nav ───────────────────────────────────────────────────── */
function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const nav = document.querySelector('.nav')
    const onS = () => nav?.classList.toggle('scrolled', window.scrollY > 4)
    onS(); window.addEventListener('scroll', onS, { passive: true })
    return () => window.removeEventListener('scroll', onS)
  }, [])

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a href="#" className="nav-logo" aria-label="RentyBase">
          <span className="nav-mark" aria-hidden="true"><LogoMark size={32} /></span>
          <span className="nav-word">Renty<span className="ochre">Base</span></span>
        </a>
        <div className="nav-links">
          <a href="#proof">Proof</a>
          <a href="#features">Features</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/signin" style={{ fontSize: 14, fontWeight: 500, color: 'var(--rb-ink-3)' }}>Sign in</a>
          <a className="btn btn-primary" href="/signup" style={{ padding: '8px 16px' }}>Start free</a>
          <button className={'nav-hamburger' + (menuOpen ? ' open' : '')} aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      <div className={'nav-drawer' + (menuOpen ? ' open' : '')} onClick={() => setMenuOpen(false)}>
        <a href="#proof">Proof</a>
        <a href="#features">Features</a>
        <a href="/signin">Sign in</a>
      </div>
    </nav>
  )
}

/* ── Page ──────────────────────────────────────────────────── */
export default function Page() {
  return (
    <div className="lp-page">
      {/* Desktop marketing — hidden on mobile via CSS */}
      <div className="lp-desktop">
        <Nav />
        <Hero />
        <Cinema />
        <ProofFilm />
        <Features />
        <Trust />
        <Scores />
        <FinalCTA />
        <footer className="rb-foot">
          <div className="container foot-grid">
            <div className="foot-brand">
              <div className="foot-mark"><LogoMark size={40} /><span className="foot-word">Renty<span className="ochre">Base</span></span></div>
              <p className="foot-tag">A shared, calm record between landlord and tenant. Built in Bengaluru, for India.</p>
              <div className="foot-mini"><span className="dot-pulse" /> Free during beta · v0.4</div>
            </div>
            <div className="foot-col">
              <div className="foot-h">Product</div>
              <a href="#proof">Move-in proof</a><a href="#features">HRA receipts</a><a href="#features">Repair ledger</a><a href="#features">Leave &amp; License</a>
            </div>
            <div className="foot-col">
              <div className="foot-h">Coming soon</div>
              <a href="#">Rent listings</a><a href="#">Sale listings</a><a href="#">UPI auto-collect</a><a href="#">Tax export · 26AS</a>
            </div>
            <div className="foot-col">
              <div className="foot-h">Company</div>
              <a href="/company">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:hello@rentybase.com">hello@rentybase.com</a>
            </div>
          </div>
          <div className="foot-rule" />
          <div className="container foot-bot">
            <div className="foot-meta">&copy; 2026 RentyBase Technologies Pvt Ltd · Section 10(13A) compliant · No data sold, ever.</div>
            <div className="foot-stamp">
              <svg viewBox="0 0 80 80" width="40" height="40"><circle cx="40" cy="40" r="36" fill="none" stroke="#C97A3A" strokeWidth="1.5" /><circle cx="40" cy="40" r="30" fill="none" stroke="#C97A3A" strokeWidth=".7" strokeDasharray="1.5 2" /><text x="40" y="44" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="13" fill="#C97A3A">RB</text></svg>
              <span>Sealed for India · Founded by Akhil Madhavaram · Made by humans on Earth</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile marketing — shown on mobile only via CSS */}
      <div className="mm">
        <div className="mm-hat">
          <span className="brand"><MMMark size={22}/><span>Renty<em>Base</em></span></span>
          <a href="/signup" className="cta">Start free <span className="arr">→</span></a>
        </div>
        <MMHero/>
        <MMCinema/>
        <MMProof/>
        <MMVault/>
        <MMFeatures/>
        <MMCTA/>
        <MMFoot/>
      </div>
    </div>
  )
}
