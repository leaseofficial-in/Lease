'use client'

import { useState, useEffect, useRef } from 'react'

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

/* ── LogoMark ──────────────────────────────────────────────── */
function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <rect width="40" height="40" rx="9" fill="#0E1413"/>
      <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
      <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
      <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
      <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
    </svg>
  )
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
        <p className="sub">A shared, calm record between landlord and tenant — built for India.</p>
      </div>
      <div className="hero-grid">
        <div className="hero-side">
          <span className="eyebrow"><span className="pip" />For landlords</span>
          <div className="hero-stat">
            <div className="num">{fmtINR(collected)}</div>
            <div className="label">COLLECTED THIS MONTH · 3 PROPERTIES</div>
          </div>
          <p className="hero-tag">Rent in. Receipts out. Disputes never. One quiet ledger that handles every signature, photo, and rupee.</p>
          <div className="hero-cta"><a className="btn btn-primary" href="/signin">Add a property <Icon name="arrow-right" size={16} /></a></div>
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
          <p className="hero-tag">One tap and the receipt is in your inbox — fields filled, PAN attached, year-on-year stored. Tax season, sorted.</p>
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
    { n: '01', t: 'Add the property. Invite your tenant.', d: 'Property in 30 seconds. Send a link — your tenant signs in with Google. No app install required, no phone numbers exchanged.', meta: [['Setup', '30 sec'], ['Install', 'Not required']] },
    { n: '02', t: ['Rent', 'in one tap.'], d: '₹28,500 lands. UPI, NEFT, or cash with a UTR. The amount, date, and method get stamped into the shared record automatically.', meta: [['Methods', 'UPI · NEFT · Cash'], ['Settles in', 'Instant']] },
    { n: '03', t: ['Receipt', 'drops itself.'], d: 'A Section 10(13A)-valid HRA receipt generates the moment payment clears. PAN, period, address — every field already filled.', meta: [['Format', 'PDF · 10(13A)'], ['Delivery', 'Email + dashboard']] },
    { n: '04', t: ['Proof, sealed', 'for years.'], d: 'Move-in photos, repair logs, deposit history — all timestamped, locked, and visible to both sides. The same record. Always.', meta: [['Photos', 'Locked at submit'], ['Retention', 'Permanent']] },
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
          <p>Twelve photos. One timestamp. A geotag and a seal. Once submitted, neither side can edit them — the proof outlives the dispute.</p>
          <div className="proof-points">
            <div className="proof-point"><div className="ico"><Icon name="camera" size={16} /></div><div><div className="t">Timestamped at the door</div><div className="d">Server time + GPS captured at submit. Photos can&apos;t be backdated, swapped, or re-uploaded.</div></div></div>
            <div className="proof-point"><div className="ico"><Icon name="lock" size={16} /></div><div><div className="t">Locked for both sides</div><div className="d">Once sealed, neither landlord nor tenant can delete. Same record, same view, forever.</div></div></div>
            <div className="proof-point"><div className="ico"><Icon name="shield" size={16} /></div><div><div className="t">Court-ready in PDF</div><div className="d">Export the full set as a signed PDF — embedded EXIF, hash, and the Section 10(13A) receipt for the year.</div></div></div>
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
          <p>No add-ons, no upsells. Free during beta — every feature, no limits.</p>
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
          <p className="tag">Most disputes between landlord and tenant come down to &ldquo;what did we agree?&rdquo; RentyBase keeps both of you looking at the same page — literally the same row in the same ledger — for as long as the property exists.</p>
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
          <p>The same record builds two scores — one for tenants, one for landlords. Carry your history to the next rental. No more starting from zero.</p>
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
          <a className="btn btn-primary" href="/signin">Add a property <Icon name="arrow-right" size={16} /></a>
          <a className="btn btn-ghost" href="#proof">I&apos;m a tenant</a>
        </div>
      </div>
    </section>
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
          <a className="btn btn-primary" href="/signin" style={{ padding: '8px 16px' }}>Start free</a>
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
    <>
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
            <a href="#">About</a><a href="#">Privacy</a><a href="#">Terms</a><a href="mailto:hello@rentybase.in">hello@rentybase.in</a>
          </div>
        </div>
        <div className="foot-rule" />
        <div className="container foot-bot">
          <div className="foot-meta">&copy; 2026 RentyBase Technologies Pvt Ltd · Section 10(13A) compliant · No data sold, ever.</div>
          <div className="foot-stamp">
            <svg viewBox="0 0 80 80" width="40" height="40"><circle cx="40" cy="40" r="36" fill="none" stroke="#C97A3A" strokeWidth="1.5" /><circle cx="40" cy="40" r="30" fill="none" stroke="#C97A3A" strokeWidth=".7" strokeDasharray="1.5 2" /><text x="40" y="44" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="13" fill="#C97A3A">RB</text></svg>
            <span>Sealed for India · Made by 4 humans in Bengaluru</span>
          </div>
        </div>
      </footer>
    </>
  )
}
