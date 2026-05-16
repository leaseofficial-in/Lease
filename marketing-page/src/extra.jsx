/* global React */
const { useEffect: useEX, useRef: useRX, useState: useSX } = React;

// ── PG / Hostel · Floor plan with live bed occupancy ──────────────────
window.PGHostel = () => {
  const ref = useRX(null);
  const planRef = useRX(null);
  const [shown, setShown] = useSX(false);

  useEX(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true); }, { threshold: 0.25 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  // Subtle scroll-driven plan tilt
  useEX(() => {
    const onScroll = () => {
      if (!planRef.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, 1 - r.top / window.innerHeight));
      const yaw = 14 - t * 10;
      const pitch = 26 - t * 8;
      planRef.current.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(-1deg)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 12 beds across 4 rooms; status: filled, due, vacant
  const rooms = [
    { id: "R1", x: 0, y: 0, w: 220, h: 150, name: "Room 101", beds: [
      { x: 18, y: 22, st: "filled", who: "Aarav" },
      { x: 18, y: 78, st: "filled", who: "Rohan" },
      { x: 130, y: 22, st: "due", who: "Karan" },
    ]},
    { id: "R2", x: 230, y: 0, w: 220, h: 150, name: "Room 102", beds: [
      { x: 18, y: 22, st: "filled", who: "Sneha" },
      { x: 18, y: 78, st: "vacant" },
      { x: 130, y: 22, st: "filled", who: "Meera" },
      { x: 130, y: 78, st: "filled", who: "Anu" },
    ]},
    { id: "R3", x: 0, y: 160, w: 220, h: 150, name: "Room 201", beds: [
      { x: 18, y: 22, st: "filled", who: "Ravi" },
      { x: 130, y: 22, st: "due", who: "Vikram" },
      { x: 18, y: 78, st: "filled", who: "Arjun" },
    ]},
    { id: "R4", x: 230, y: 160, w: 220, h: 150, name: "Room 202", beds: [
      { x: 18, y: 22, st: "vacant" },
      { x: 130, y: 22, st: "filled", who: "Diya" },
    ]},
  ];

  const stCol = (st) => st === "filled" ? "#1F7A55" : st === "due" ? "#B8740F" : "#B5B1A4";
  const stFill = (st) => st === "filled" ? "rgba(31,122,85,.18)" : st === "due" ? "rgba(184,116,15,.20)" : "rgba(181,177,164,.14)";

  const totalBeds = rooms.reduce((a, r) => a + r.beds.length, 0);
  const filled = rooms.reduce((a, r) => a + r.beds.filter(b => b.st !== "vacant").length, 0);
  const dueCount = rooms.reduce((a, r) => a + r.beds.filter(b => b.st === "due").length, 0);
  const occ = window.useCount(Math.round((filled / totalBeds) * 100), shown);
  const collected = window.useCount(238000, shown, 1600);

  return (
    <section className="pg-section" ref={ref} data-screen-label="04 PG Hostels">
      <div className="container pg-grid">
        <div className="pg-copy">
          <div className="eyebrow" style={{marginBottom:18}}>PG &amp; Hostel · Anand Stays, HSR Bengaluru</div>
          <h2>Every bed, <em>every rupee,</em><br/>on one floor plan.</h2>
          <p>Map your property exactly as it stands. Each tile is a bed — tap to assign a tenant, mark a due, or list a vacancy. The plan is the dashboard.</p>

          <div className="pg-legend">
            <span className="dot filled"/>Filled · paid
            <span className="dot due"/>Filled · due
            <span className="dot vacant"/>Vacant
          </div>

          <div className="pg-stats">
            <div className="s">
              <div className="n">{filled}<span className="muted">/{totalBeds}</span></div>
              <div className="l">beds occupied</div>
            </div>
            <div className="s">
              <div className="n">{occ}<span className="ochre">%</span></div>
              <div className="l">occupancy</div>
            </div>
            <div className="s">
              <div className="n mono">₹{collected.toLocaleString("en-IN")}</div>
              <div className="l">collected · this month</div>
            </div>
          </div>

          {dueCount > 0 && (
            <div className="pg-callout">
              <window.Icon name="bolt" size={16}/>
              <span><b>{dueCount} bed{dueCount > 1 ? "s" : ""} pending</b> · auto-nudge sent at 5/3/0 days. No manual chasing.</span>
            </div>
          )}
        </div>

        <div className="pg-stage">
          <div className="pg-shadow"/>
          <div className="pg-plan" ref={planRef}>
            <svg viewBox="0 0 470 320" width="100%" height="100%">
              <defs>
                <pattern id="paper" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill="#fff"/>
                  <circle cx="1" cy="1" r="0.4" fill="rgba(20,18,12,.05)"/>
                </pattern>
              </defs>

              {/* outer building footprint */}
              <rect x="2" y="2" width="466" height="316" fill="url(#paper)" stroke="#0E1413" strokeWidth="1.2" rx="6"/>

              {/* corridor */}
              <rect x="0" y="155" width="470" height="10" fill="#F0EFE9" stroke="#E6E2D7"/>

              {rooms.map((r, ri) => {
                const paidN = r.beds.filter(b => b.st === "filled").length;
                const dueN = r.beds.filter(b => b.st === "due").length;
                const totalN = r.beds.length;
                const allPaid = paidN === totalN;
                const headerCol = dueN > 0 ? "#B8740F" : allPaid ? "#1F7A55" : "#5C645F";
                return (
                  <g key={r.id} transform={`translate(${r.x + 10},${r.y + 5})`}>
                    {/* room shell */}
                    <rect width={r.w} height={r.h - 10} fill="#FAF8F1" stroke="#0E1413" strokeWidth="1.1" rx="4"/>
                    {/* room header band */}
                    <rect x="0" y="0" width={r.w} height="18" fill="#0E1413" rx="4"/>
                    <rect x="0" y="10" width={r.w} height="8" fill="#0E1413"/>
                    <text x="10" y="12.5" fontFamily="DM Sans" fontSize="8.5" fontWeight="700" fill="#FAF8F1" letterSpacing="1.4">{r.name.toUpperCase()}</text>
                    {/* paid count badge */}
                    <g transform={`translate(${r.w - 50}, 4)`}>
                      <rect width="42" height="10" rx="5" fill={headerCol}/>
                      <text x="21" y="7.4" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6.5" fontWeight="700" fill="#FAF8F1" letterSpacing=".5">
                        {dueN > 0 ? `${paidN}/${totalN} · ${dueN} DUE` : allPaid ? `${totalN}/${totalN} PAID` : `${paidN}/${totalN} PAID`}
                      </text>
                    </g>
                    {/* door */}
                    <path d={`M ${r.w/2 - 14} ${r.h - 10} a 14 14 0 0 0 14 -14`} fill="none" stroke="#B5B1A4" strokeWidth="1"/>
                    <line x1={r.w/2 - 14} y1={r.h - 10} x2={r.w/2} y2={r.h - 10} stroke="#FAF8F1" strokeWidth="3"/>

                    {r.beds.map((b, bi) => {
                      const delay = (ri * 4 + bi) * 60;
                      const initial = b.who ? b.who[0] : "";
                      const isVacant = b.st === "vacant";
                      const statusLabel = b.st === "filled" ? "PAID" : b.st === "due" ? "DUE 5 NOV" : "VACANT";
                      const c = stCol(b.st);
                      return (
                        <g key={bi} transform={`translate(${b.x},${b.y + 6})`} style={{ opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(8px)", transition: `opacity .4s ${delay}ms, transform .4s ${delay}ms`, transformOrigin: "center" }}>
                          {/* bed card */}
                          <rect width="86" height="44" rx="5" fill="#fff" stroke={c} strokeWidth="1.2"/>
                          <rect width="86" height="44" rx="5" fill={stFill(b.st)}/>
                          {/* mattress mini-rep on top edge */}
                          <rect x="6" y="5" width="20" height="6" rx="1.5" fill={c} opacity=".4"/>
                          {/* avatar */}
                          <circle cx="14" cy="26" r="8" fill={isVacant ? "#fff" : c}/>
                          <circle cx="14" cy="26" r="8" fill="none" stroke={c} strokeWidth="1" strokeDasharray={isVacant ? "1.5 1.5" : "0"}/>
                          {!isVacant && (
                            <text x="14" y="28.7" textAnchor="middle" fontFamily="DM Sans" fontSize="8.5" fontWeight="700" fill="#fff">{initial}</text>
                          )}
                          {isVacant && (
                            <text x="14" y="29" textAnchor="middle" fontFamily="DM Sans" fontSize="9" fontWeight="700" fill={c}>+</text>
                          )}
                          {/* name */}
                          <text x="26" y="20" fontFamily="DM Sans" fontSize="8.5" fontWeight="600" fill="#0E1413">
                            {isVacant ? "Open bed" : b.who}
                          </text>
                          {/* bed id */}
                          <text x="26" y="28" fontFamily="JetBrains Mono" fontSize="6" fontWeight="600" fill="#5C645F" letterSpacing=".4">
                            BED {String.fromCharCode(65 + bi)} · ₹8,500
                          </text>
                          {/* status pill */}
                          <g transform="translate(26, 32)">
                            <rect width="54" height="9" rx="4.5" fill={c} opacity={isVacant ? 0.18 : 1}/>
                            <text x="27" y="6.5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fontWeight="700" fill={isVacant ? c : "#fff"} letterSpacing=".5">
                              {statusLabel}
                            </text>
                          </g>
                          {/* status indicator dot top-right */}
                          {!isVacant && (
                            <circle cx="78" cy="8" r="2.5" fill={c}>
                              {b.st === "due" && <animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>}
                            </circle>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* compass */}
              <g transform="translate(430,30)" opacity=".5">
                <circle r="14" fill="none" stroke="#0E1413" strokeWidth=".8"/>
                <path d="M0,-10 L3,0 L0,10 L-3,0 Z" fill="#C97A3A"/>
                <text y="-16" textAnchor="middle" fontFamily="DM Sans" fontSize="7" fontWeight="600" fill="#0E1413">N</text>
              </g>

              {/* scale */}
              <g transform="translate(20,300)" opacity=".5">
                <line x1="0" x2="40" y1="0" y2="0" stroke="#0E1413" strokeWidth="1"/>
                <line x1="0" x2="0" y1="-3" y2="3" stroke="#0E1413"/>
                <line x1="40" x2="40" y1="-3" y2="3" stroke="#0E1413"/>
                <text x="20" y="12" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill="#5C645F">5 m</text>
              </g>
            </svg>

            <div className="pg-tag" style={{top:"22%", left:"18%"}}>R102 · ₹8,500/mo</div>
            <div className="pg-tag accent" style={{bottom:"24%", right:"14%"}}>1 due · ₹8,500</div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Tenant + Landlord score ──────────────────────────────────────────
window.Scores = () => {
  const ref = useRX(null);
  const [shown, setShown] = useSX(false);
  useEX(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true); }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  const tScore = window.useCount(842, shown, 1600);
  const lScore = window.useCount(786, shown, 1600);

  const Dial = ({ value, max = 900, color }) => {
    const pct = value / max;
    const C = 2 * Math.PI * 78;
    return (
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <linearGradient id={`g-${color.slice(1)}`} x1="0" x2="1">
            <stop offset="0" stopColor={color} stopOpacity=".4"/>
            <stop offset="1" stopColor={color}/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="78" fill="none" stroke="#E6E2D7" strokeWidth="10"/>
        <circle cx="100" cy="100" r="78" fill="none" stroke={`url(#g-${color.slice(1)})`} strokeWidth="10"
          strokeDasharray={`${C * pct} ${C}`} strokeLinecap="round"
          transform="rotate(-90 100 100)" style={{transition:"stroke-dasharray 1.6s cubic-bezier(.22,1,.36,1)"}}/>
        {[0,1,2,3,4].map(i => {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={100 + Math.cos(a) * 92} cy={100 + Math.sin(a) * 92} r="2" fill="#B5B1A4"/>;
        })}
      </svg>
    );
  };

  const tenantBreak = [
    { k: "On-time rent", v: "23/24 months", w: 0.92 },
    { k: "Move-in proof", v: "Submitted", w: 1.0 },
    { k: "Repair reports", v: "All resolved", w: 0.85 },
    { k: "Deposit history", v: "2 returned in full", w: 0.95 },
  ];
  const landlordBreak = [
    { k: "Deposit returned", v: "100% on time", w: 1.0 },
    { k: "Repair response", v: "Avg 1.2 days", w: 0.88 },
    { k: "HRA receipts", v: "Issued every month", w: 0.95 },
    { k: "Lease compliance", v: "0 violations", w: 1.0 },
  ];

  return (
    <section className="scores" ref={ref} data-screen-label="06 Scores">
      <div className="container">
        <div className="features-head">
          <div className="eyebrow" style={{display:"inline-block", marginBottom:14}}>Trust, scored</div>
          <h2>A reputation <em>both sides earn.</em></h2>
          <p>The same record builds two scores — one for tenants, one for landlords. Carry your history to the next rental. No more starting from zero.</p>
        </div>

        <div className="score-grid">
          <div className="score-card">
            <div className="score-tag">For tenants</div>
            <div className="score-dial">
              <Dial value={tScore} color="#0F4C5C"/>
              <div className="score-num">
                <div className="n">{tScore}</div>
                <div className="l">/ 900</div>
                <div className="band action">EXCELLENT</div>
              </div>
            </div>
            <div className="score-id">
              <div className="who">
                <div style={{width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#c9b388,#7a6042)"}}/>
                <div>
                  <div style={{fontWeight:600, fontSize:14}}>Aarav Mehta</div>
                  <div style={{fontSize:11, color:"var(--rb-ink-3)"}}>Tenant since Aug 2023 · Mumbai</div>
                </div>
              </div>
              <span className="s-pill action" style={{padding:"4px 10px"}}>Verified</span>
            </div>
            <div className="score-break">
              {tenantBreak.map(b => (
                <div key={b.k} className="b">
                  <div className="row"><span>{b.k}</span><span className="v">{b.v}</span></div>
                  <div className="bar"><div className="fill action" style={{width: shown ? `${b.w*100}%` : "0%"}}/></div>
                </div>
              ))}
            </div>
            <div className="score-foot">Carry this to your next landlord →</div>
          </div>

          <div className="score-card accent">
            <div className="score-tag">For landlords</div>
            <div className="score-dial">
              <Dial value={lScore} color="#C97A3A"/>
              <div className="score-num">
                <div className="n">{lScore}</div>
                <div className="l">/ 900</div>
                <div className="band ochre">TRUSTED</div>
              </div>
            </div>
            <div className="score-id">
              <div className="who">
                <div style={{width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#0F4C5C,#163A47)"}}/>
                <div>
                  <div style={{fontWeight:600, fontSize:14}}>Priya Sharma</div>
                  <div style={{fontSize:11, color:"var(--rb-ink-3)"}}>3 properties · Bandra, Pune, HSR</div>
                </div>
              </div>
              <span className="s-pill" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)", padding:"4px 10px"}}>Verified</span>
            </div>
            <div className="score-break">
              {landlordBreak.map(b => (
                <div key={b.k} className="b">
                  <div className="row"><span>{b.k}</span><span className="v">{b.v}</span></div>
                  <div className="bar"><div className="fill ochre" style={{width: shown ? `${b.w*100}%` : "0%"}}/></div>
                </div>
              ))}
            </div>
            <div className="score-foot">Tenants see this before they even ask →</div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Marketplace · Coming next (rent + sale teaser) ──────────────────
window.Marketplace = () => {
  const ref = useRX(null);
  const stageRef = useRX(null);

  useEX(() => {
    const onScroll = () => {
      if (!stageRef.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, 1 - r.top / window.innerHeight));
      stageRef.current.querySelectorAll("[data-z]").forEach((el, i) => {
        const z = parseFloat(el.dataset.z);
        const ph = (i % 2 === 0 ? 1 : -1);
        el.style.transform = el.dataset.base + ` translateY(${(t - .5) * z * ph}px)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cards = [
    { tag: "FOR RENT", title: "Bandra 2BHK", meta: "Furnished · 1,100 sq ft", price: "₹62,000/mo", base: "rotate(-2deg)", z: 30 },
    { tag: "FOR SALE", title: "Koregaon 1BHK", meta: "Ready to move · 720 sq ft", price: "₹1.42 Cr", base: "rotate(3deg)", z: 50, accent: true },
    { tag: "PG · 3 BEDS", title: "HSR Sector 6", meta: "AC · WiFi · 2 vacant", price: "₹11,500/bed", base: "rotate(-1deg)", z: 40 },
    { tag: "FOR RENT", title: "Indiranagar 3BHK", meta: "Semi-furnished · pet-OK", price: "₹78,000/mo", base: "rotate(2deg)", z: 35 },
  ];

  return (
    <section className="market" ref={ref} data-screen-label="07 Marketplace">
      <div className="container market-grid">
        <div>
          <div className="eyebrow" style={{marginBottom:18}}>Coming next · 2026</div>
          <h2>From <em>your record,</em><br/>to the next rental.</h2>
          <p>Soon: post your place for rent or for sale, directly from the same dashboard. Verified scores, sealed photos, and a year of history travel with the listing — so the next tenant or buyer trusts what they see.</p>
          <div className="market-features">
            <div className="mf"><span className="kbd">FOR RENT</span> Listings carry HRA history &amp; deposit ledger</div>
            <div className="mf"><span className="kbd accent">FOR SALE</span> Society NOC &amp; chain-of-title attached</div>
            <div className="mf"><span className="kbd">PG · BEDS</span> Live floor-plan, vacancy auto-publishes</div>
          </div>
          <a className="btn btn-ghost" style={{marginTop:24}} href="#start">Join the early list <window.Icon name="arrow-right" size={16}/></a>
        </div>

        <div className="market-stage" ref={stageRef}>
          {cards.map((c, i) => (
            <div key={i} className={"market-card" + (c.accent ? " accent" : "")} data-z={c.z} data-base={c.base}
              style={{ transform: c.base, top: `${10 + i * 18}%`, left: `${(i % 2) * 38 + 6}%` }}>
              <div className="mc-photo">
                {c.tag.startsWith("PG") ? (
                  <svg viewBox="0 0 100 60" width="100%" height="100%" preserveAspectRatio="none">
                    <rect width="100" height="60" fill="#0F4C5C" opacity=".15"/>
                    <rect x="6" y="6" width="40" height="22" fill="#1F7A55" opacity=".6" rx="2"/>
                    <rect x="54" y="6" width="40" height="22" fill="#B8740F" opacity=".6" rx="2"/>
                    <rect x="6" y="32" width="40" height="22" fill="#B5B1A4" opacity=".6" rx="2"/>
                    <rect x="54" y="32" width="40" height="22" fill="#1F7A55" opacity=".6" rx="2"/>
                  </svg>
                ) : (
                  <div className="mc-photo-grad"/>
                )}
                <span className={"mc-tag" + (c.accent ? " accent" : "")}>{c.tag}</span>
              </div>
              <div className="mc-body">
                <div className="mc-title">{c.title}</div>
                <div className="mc-meta">{c.meta}</div>
                <div className="mc-price">{c.price}</div>
                <div className="mc-trust">
                  <window.Icon name="shield" size={12}/>
                  <span>Verified record · score 842</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
