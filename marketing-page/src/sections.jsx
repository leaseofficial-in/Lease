/* global React */
const { useEffect: useES, useRef: useRS, useState: useSS } = React;

// ── Hero ────────────────────────────────────────
window.Hero = ({ accent }) => {
  const phoneRef = useRS(null);
  const stageRef = useRS(null);

  // Mouse parallax for hero phone
  useES(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const yaw = x * 16;
      const pitch = -y * 10;
      if (phoneRef.current) {
        phoneRef.current.style.transform = `rotateY(${-12 + yaw}deg) rotateX(${4 + pitch}deg) translateZ(40px)`;
      }
      // floating receipts parallax
      stage.querySelectorAll("[data-px]").forEach(el => {
        const f = parseFloat(el.dataset.px);
        el.style.transform = el.dataset.base + ` translate3d(${x * f * 30}px, ${y * f * 22}px, 0)`;
      });
    };
    stage.addEventListener("mousemove", onMove);
    return () => stage.removeEventListener("mousemove", onMove);
  }, []);

  // Animated count for hero stat
  const collected = window.useCount(124000, true, 1800);

  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="hero-headline-top">
        <h1>Rent that <em>trusts itself.</em></h1>
        <p className="sub">A shared, calm record between landlord and tenant — built for India.</p>
      </div>
      <div className="hero-grid">
        <div className="hero-side">
          <span className="eyebrow"><span className="pip"/>For landlords</span>
          <div className="hero-stat">
            <div className="num">{window.fmtINR(collected)}</div>
            <div className="label">COLLECTED THIS MONTH · 3 PROPERTIES</div>
          </div>
          <p className="hero-tag">Rent in. Receipts out. Disputes never. One quiet ledger that handles every signature, photo, and rupee.</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#start">Add a property <window.Icon name="arrow-right" size={16}/></a>
          </div>
        </div>

        <div className="hero-center" ref={stageRef}>
          <div className="hero-spotlight"/>

          {/* floating receipts */}
          <div className="float-receipt" data-px="-1.4" data-base="rotate3d(0,1,0,18deg) rotate(-6deg)" style={{ width: 180, top: 120, left: 0, padding: 12, transform: "rotate3d(0,1,0,18deg) rotate(-6deg)" }}>
            <div className="eyebrow" style={{fontSize:9}}>Receipt · Nov</div>
            <div className="strip"/><div className="strip short"/><div className="strip tiny"/>
            <div style={{fontFamily:"var(--rb-font-display)", fontSize:18, marginTop:6, color:"var(--rb-action)"}}>₹28,500</div>
          </div>
          <div className="float-receipt" data-px="-1.0" data-base="rotate3d(0,1,0,-22deg) rotate(7deg)" style={{ width: 160, top: 80, right: 0, padding: 12, transform: "rotate3d(0,1,0,-22deg) rotate(7deg)" }}>
            <div className="eyebrow" style={{fontSize:9}}>Move-in proof</div>
            <div style={{height:48, borderRadius:6, marginTop:6, background:"linear-gradient(135deg,#c9b388,#7a6042)"}}/>
            <div className="strip tiny" style={{marginTop:6}}/>
          </div>
          <div className="float-receipt" data-px="-1.8" data-base="rotate3d(0,1,0,12deg) rotate(2deg)" style={{ width: 140, bottom: 80, left: -20, padding: 10, transform: "rotate3d(0,1,0,12deg) rotate(2deg)" }}>
            <div className="eyebrow" style={{fontSize:9}}>Ledger</div>
            <div className="strip"/><div className="strip short"/>
          </div>
          <div className="float-receipt" data-px="-1.2" data-base="rotate3d(0,1,0,-14deg) rotate(-4deg)" style={{ width: 150, bottom: 60, right: -20, padding: 10, transform: "rotate3d(0,1,0,-14deg) rotate(-4deg)" }}>
            <div className="eyebrow" style={{fontSize:9}}>UTR sealed</div>
            <div className="mono" style={{fontSize:11, marginTop:6}}>4581 2210 9914</div>
          </div>

          {/* the phone */}
          <div className="phone-stage">
            <div className="phone" ref={phoneRef} style={{transform:"rotateY(-12deg) rotateX(4deg) translateZ(40px)"}}>
              <div className="phone-body"/>
              <div className="phone-side"/>
              <div className="phone-side left"/>
              <div className="phone-side left2"/>
              <div className="phone-notch"/>
              <div className="phone-screen-stack">
                <window.PhoneScreens idx={0}/>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-side right">
          <span className="eyebrow"><span className="pip"/>For tenants</span>
          <div className="hero-stat">
            <div className="num"><span className="accent">₹{(0.62 * 12).toFixed(2)}L</span></div>
            <div className="label">HRA SAVED · ANNUAL · ON ₹62K RENT</div>
          </div>
          <p className="hero-tag">One tap and the receipt is in your inbox — fields filled, PAN attached, year-on-year stored. Tax season, sorted.</p>
          <div className="hero-cta">
            <a className="btn btn-ghost" href="#proof">See HRA receipt <window.Icon name="arrow-right" size={16}/></a>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Cinema (scroll-pinned 4-step lifecycle) ─────
window.Cinema = () => {
  const ref = useRS(null);
  const phoneRef = useRS(null);
  const stepRefs = [useRS(null), useRS(null), useRS(null), useRS(null)];
  const segRefs = [useRS(null), useRS(null), useRS(null), useRS(null)];
  const floatRefs = [useRS(null), useRS(null), useRS(null), useRS(null), useRS(null)];
  const [step, setStep] = useSS(0);

  useES(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const t = Math.max(0, Math.min(1, -r.top / total));
      // 4 steps spread across t [0..1]
      const live = Math.min(3, Math.floor(t * 4.0));
      setStep(live);

      // Phone rotation: -45 → +45 across the journey
      const yaw = -55 + t * 110;
      const pitch = Math.sin(t * Math.PI) * -8;
      const lift = Math.sin(t * Math.PI) * 30;
      if (phoneRef.current) {
        phoneRef.current.style.transform = `rotateY(${yaw}deg) rotateX(${pitch}deg) translateY(${-lift}px) translateZ(40px)`;
      }
      // floating cards drift
      floatRefs.forEach((r, i) => {
        if (!r.current) return;
        const phase = (t * 4 + i * 0.2) % 1;
        const y = Math.sin(phase * Math.PI * 2) * 14;
        const x = Math.cos(phase * Math.PI * 2) * 10;
        r.current.style.transform = r.current.dataset.base + ` translate3d(${x}px, ${y}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const steps = [
    { n: "01", t: ["Add the property.", "Invite your tenant."], em: 0,
      d: "Property in 30 seconds. Send a link — your tenant signs in with Google. No app install required, no phone numbers exchanged.",
      meta: [["Setup", "30 sec"], ["Install", "Not required"]] },
    { n: "02", t: ["Rent", "in one tap."], em: 1,
      d: "₹28,500 lands. UPI, NEFT, or cash with a UTR. The amount, date, and method get stamped into the shared record automatically.",
      meta: [["Methods", "UPI · NEFT · Cash"], ["Settles in", "Instant"]] },
    { n: "03", t: ["Receipt", "drops itself."], em: 1,
      d: "A Section 10(13A)-valid HRA receipt generates the moment payment clears. PAN, period, address — every field already filled.",
      meta: [["Format", "PDF · 10(13A)"], ["Delivery", "Email + dashboard"]] },
    { n: "04", t: ["Proof, sealed", "for years."], em: 0,
      d: "Move-in photos, repair logs, deposit history — all timestamped, locked, and visible to both sides. The same record. Always.",
      meta: [["Photos", "Locked at submit"], ["Retention", "Permanent"]] },
  ];

  return (
    <section className="cinema" data-screen-label="02 Lifecycle" ref={ref}>
      <div className="cinema-pin">
        <div className="cinema-stage">
          <div className="cinema-floats">
            <div ref={floatRefs[0]} className={"cinema-float" + (step >= 0 ? " show" : "")} data-base="translate3d(-220px, -180px, 60px) rotate(-4deg)" style={{transform:"translate3d(-220px,-180px,60px) rotate(-4deg)", left:"50%", top:"50%"}}>
              <div className="k">Property added</div>
              <div className="v">Bandra 2BHK</div>
            </div>
            <div ref={floatRefs[1]} className={"cinema-float" + (step >= 1 ? " show" : "")} data-base="translate3d(240px, -150px, 80px) rotate(5deg)" style={{transform:"translate3d(240px,-150px,80px) rotate(5deg)", left:"50%", top:"50%"}}>
              <div className="k">Rent received</div>
              <div className="v amt">₹28,500</div>
            </div>
            <div ref={floatRefs[2]} className={"cinema-float" + (step >= 2 ? " show" : "")} data-base="translate3d(-260px, 140px, 70px) rotate(3deg)" style={{transform:"translate3d(-260px,140px,70px) rotate(3deg)", left:"50%", top:"50%"}}>
              <div className="k">Receipt no.</div>
              <div className="v">RB-2511-04</div>
            </div>
            <div ref={floatRefs[3]} className={"cinema-float" + (step >= 3 ? " show" : "")} data-base="translate3d(220px, 180px, 50px) rotate(-3deg)" style={{transform:"translate3d(220px,180px,50px) rotate(-3deg)", left:"50%", top:"50%"}}>
              <div className="k">Move-in proof</div>
              <div className="v">12 photos · sealed</div>
            </div>
            <div ref={floatRefs[4]} className={"cinema-float" + (step >= 1 ? " show" : "")} data-base="translate3d(0, -260px, 120px) rotate(0deg)" style={{transform:"translate3d(0,-260px,120px) rotate(0deg)", left:"50%", top:"50%"}}>
              <div className="k">UTR</div>
              <div className="v" style={{fontSize:13}}>4581 2210 9914</div>
            </div>
          </div>

          <div className="phone" ref={phoneRef} style={{transform:"rotateY(-55deg) rotateX(0deg) translateZ(40px)"}}>
            <div className="phone-body"/>
            <div className="phone-side"/>
            <div className="phone-side left"/>
            <div className="phone-side left2"/>
            <div className="phone-notch"/>
            <div className="phone-screen-stack">
              <window.PhoneScreens idx={step}/>
            </div>
          </div>
        </div>

        <div className="cinema-copy">
          {steps.map((s, i) => (
            <div key={i} className={"cinema-step" + (step === i ? " active" : "")}>
              <div className="num">{s.n}</div>
              <h2>{s.t[0]} {s.t[1] && (s.em === 1 ? <em>{s.t[1]}</em> : <em>{s.t[1]}</em>)}</h2>
              <p>{s.d}</p>
              <div className="meta">
                {s.meta.map(([k,v]) => <div key={k}><div style={{fontSize:11, color:"var(--rb-ink-3)", letterSpacing:".1em", textTransform:"uppercase"}}>{k}</div><b>{v}</b></div>)}
              </div>
            </div>
          ))}
          <div className="cinema-progress">
            {[0,1,2,3].map(i => <div key={i} ref={segRefs[i]} className={"seg" + (i < step ? " done" : "") + (i === step ? " active" : "")}/>)}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Proof Film ─────────────────────────────────
window.ProofFilm = () => {
  const ref = useRS(null);
  const photoRef = useRS(null);
  const sealRef = useRS(null);
  const flashRef = useRS(null);
  const [open, setOpen] = useSS(false);
  const [stamped, setStamped] = useSS(false);

  useES(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !open) {
        setOpen(true);
        setTimeout(() => {
          flashRef.current?.classList.add("flashing");
          setTimeout(() => flashRef.current?.classList.remove("flashing"), 600);
        }, 800);
        setTimeout(() => setStamped(true), 1400);
      }
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [open]);

  // Scroll-driven photo unfold
  useES(() => {
    const onScroll = () => {
      if (!photoRef.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, 1 - (r.top / window.innerHeight)));
      const tilt = -22 + t * 14;
      const yaw = -10 + t * 12;
      photoRef.current.style.transform = `rotateX(${tilt}deg) rotateY(${yaw}deg) translateZ(${t*40}px)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="proof-film" ref={ref} id="proof" data-screen-label="03 Move-in proof">
      <div className="container proof-grid">
        <div className="proof-copy">
          <div className="eyebrow" style={{marginBottom:18}}>Move-in proof</div>
          <h2>The day you moved in,<br/><em>recorded forever.</em></h2>
          <p>Twelve photos. One timestamp. A geotag and a seal. Once submitted, neither side can edit them — the proof outlives the dispute.</p>
          <div className="proof-points">
            <div className="proof-point"><div className="ico"><window.Icon name="camera" size={16}/></div><div><div className="t">Timestamped at the door</div><div className="d">Server time + GPS captured at submit. Photos can't be backdated, swapped, or re-uploaded.</div></div></div>
            <div className="proof-point"><div className="ico"><window.Icon name="lock" size={16}/></div><div><div className="t">Locked for both sides</div><div className="d">Once sealed, neither landlord nor tenant can delete. Same record, same view, forever.</div></div></div>
            <div className="proof-point"><div className="ico"><window.Icon name="shield" size={16}/></div><div><div className="t">Court-ready in PDF</div><div className="d">Export the full set as a signed PDF — embedded EXIF, hash, and the Section 10(13A) receipt for the year.</div></div></div>
          </div>
        </div>

        <div className="proof-stage">
          <div className="proof-photo" ref={photoRef}>
            <div className="frame">
              <image-slot id="proof-1" shape="rounded" radius="6" placeholder="Living room"></image-slot>
              <image-slot id="proof-2" shape="rounded" radius="6" placeholder="Kitchen"></image-slot>
              <image-slot id="proof-3" shape="rounded" radius="6" placeholder="Bathroom"></image-slot>
              <image-slot id="proof-4" shape="rounded" radius="6" placeholder="Bedroom"></image-slot>
            </div>
            <span className="ts"><span className="lbl">Timestamp</span>12 NOV 2025 · 11:42 IST<br/>Lat 19.0760  Lon 72.8777</span>
            <div className={"proof-flash"} ref={flashRef}/>
          </div>
          <div className={"proof-seal" + (stamped ? " stamped" : "")} ref={sealRef}>
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" fill="none" stroke="#C97A3A" strokeWidth="3"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#C97A3A" strokeWidth="1.5" strokeDasharray="2 4"/>
              <text x="100" y="86" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="11" letterSpacing="3" fill="#C97A3A" fontWeight="600">VERIFIED RECORD</text>
              <path d="M70 110 l18 18 l42 -42" fill="none" stroke="#C97A3A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="100" y="160" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="14" fill="#C97A3A">RentyBase</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Features ───────────────────────────────────
window.Features = () => (
  <section className="features" data-screen-label="04 Features">
    <div className="container">
      <div className="features-head">
        <div className="eyebrow" style={{display:"inline-block", marginBottom:14}}>Everything else, included</div>
        <h2>One quiet record.<br/><em>Six small certainties.</em></h2>
        <p>No add-ons, no upsells. Free during beta — every feature, no limits.</p>
      </div>
      <div className="features-grid">
        <div className="features-grid-inner">
          <div className="feat-card wide">
            <div className="ico"><window.Icon name="receipt" size={20}/></div>
            <h3>HRA receipts in one tap.</h3>
            <p>Section 10(13A)-compliant PDF with PAN, address, period, and UTR. Year-on-year archived. Export the whole financial year as a single bundle.</p>
            <div className="stat">
              <div><div className="l">SAVED PER YEAR</div><div className="n">₹62,400</div></div>
              <div><div className="l">FORMAT</div><div className="n" style={{fontSize:18}}>PDF · 10(13A)</div></div>
            </div>
          </div>
          <div className="feat-card accent">
            <div className="ico"><window.Icon name="vault" size={20}/></div>
            <h3>Deposit ledger.</h3>
            <p>Every deduction logged with a photo, an amount, and a reason. The day you move out, the math is already done.</p>
          </div>
          <div className="feat-card">
            <div className="ico"><window.Icon name="wrench" size={20}/></div>
            <h3>Repair requests.</h3>
            <p>Tenant raises, landlord sees, both watch the status. With photos, vendor quotes, and a closed-by signature.</p>
          </div>
          <div className="feat-card">
            <div className="ico"><window.Icon name="ledger" size={20}/></div>
            <h3>Leave &amp; License.</h3>
            <p>Templated agreement built for state-level stamp duty. Generate, e-sign, attach to the property.</p>
          </div>
          <div className="feat-card accent wide">
            <div className="ico"><window.Icon name="bolt" size={20}/></div>
            <h3>Reminders that don't nag.</h3>
            <p>Three calm nudges at 5/3/0 days. SMS + email. No marketing copy. The kind of message you'd actually want a landlord to send.</p>
            <div className="stat">
              <div><div className="l">ON-TIME RATE</div><div className="n">94%</div></div>
              <div><div className="l">NUDGES PER MONTH</div><div className="n">≤ 3</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Trust / Vault ──────────────────────────────
window.Trust = () => {
  const ref = useRS(null);
  const stackRef = useRS(null);
  const [shown, setShown] = useSS(false);

  useES(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true); }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  // Scroll-driven vault rotation
  useES(() => {
    const onScroll = () => {
      if (!ref.current || !stackRef.current) return;
      const r = ref.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, 1 - r.top / window.innerHeight));
      const yaw = -16 + t * 8;
      const pitch = 6 - t * 4;
      stackRef.current.style.transform = `rotateY(${yaw}deg) rotateX(${pitch}deg)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const records = [
    { t: "Nov 2025 · Rent", v: "₹28,500" },
    { t: "Oct 2025 · Rent", v: "₹28,500" },
    { t: "Move-in · 12 photos", v: "Sealed" },
    { t: "Deposit · 3-month", v: "₹85,500" },
    { t: "Repair · plumbing", v: "₹1,200" },
    { t: "Sep 2025 · Rent", v: "₹28,500" },
  ];

  const onTime = window.useCount(94, shown);
  const sealed = window.useCount(12, shown);
  const years = window.useCount(7, shown);

  return (
    <section className="trust" ref={ref} data-screen-label="05 Trust">
      <div className="container trust-grid">
        <div>
          <div className="eyebrow" style={{color:"rgba(255,255,255,.55)", marginBottom:18}}>Trust &amp; security</div>
          <h2>A record both sides<br/><em>actually trust.</em></h2>
          <p className="tag">Most disputes between landlord and tenant come down to "what did we agree?" RentyBase keeps both of you looking at the same page — literally the same row in the same ledger — for as long as the property exists.</p>
          <div className="trust-stats">
            <div className="s"><div className="n">{onTime}<span className="ochre">%</span></div><div className="l">on-time rent rate</div></div>
            <div className="s"><div className="n">{sealed}.4<span className="ochre">k</span></div><div className="l">photos sealed</div></div>
            <div className="s"><div className="n">{years}<span className="ochre">y</span></div><div className="l">retention, minimum</div></div>
          </div>
        </div>

        <div className="vault-stage">
          <div className="vault" ref={stackRef}>
            <div className="vault-body">
              <div className="vault-glow"/>
              <div className="vault-stack">
                {records.map((r, i) => (
                  <div className="vault-rec" key={i} style={{ transform: `translateZ(${(records.length - i) * 6}px) translateY(0)`, opacity: shown ? 1 : 0, transition: `opacity .5s ${.05 * i}s, transform .5s ${.05 * i}s`}}>
                    <span>{r.t}</span>
                    <span style={{display:"flex", alignItems:"center", gap:8}}><span className="v">{r.v}</span><span className="seal">✓</span></span>
                  </div>
                ))}
              </div>
              <div className="vault-base">SEALED LEDGER</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── CTA ────────────────────────────────────────
window.FinalCTA = () => (
  <section className="cta" id="start" data-screen-label="06 Start">
    <div className="container">
      <div className="stamp-wrap">
        <h2 className="display">
          One ledger.<br/>
          <em>Both sides.</em>
        </h2>
        <div className="ochre-stamp">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="none" stroke="#C97A3A" strokeWidth="3"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="#C97A3A" strokeWidth="1.5" strokeDasharray="2 4"/>
            <text x="100" y="92" textAnchor="middle" fontFamily="DM Sans" fontSize="11" letterSpacing="3" fill="#C97A3A" fontWeight="600">FREE · BETA</text>
            <text x="100" y="115" textAnchor="middle" fontFamily="Instrument Serif" fontStyle="italic" fontSize="22" fill="#C97A3A">2026</text>
          </svg>
        </div>
      </div>
      <p>Free during beta. All features, no card. Export your data any time.</p>
      <div className="actions">
        <a className="btn btn-primary" href="#">Add a property <window.Icon name="arrow-right" size={16}/></a>
        <a className="btn btn-ghost" href="#proof">I'm a tenant</a>
      </div>
    </div>
  </section>
);
