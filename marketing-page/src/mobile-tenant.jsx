/* global React */
// Tenant mobile screens — exports to window
const { useState: useST } = React;

const TopBarT = ({ greet, day, badge, back }) => (
  <div className="m-top">
    {back ? <button className="m-icon-btn" style={{background:"transparent",border:0}}>←</button> : (
      <div>
        <div className="m-day">{day}</div>
        <div className="m-greet">{greet}</div>
      </div>
    )}
    {back && <div style={{textAlign:"center", flex:1}}><div className="m-eyebrow">{day}</div><div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>{greet}</div></div>}
    <div style={{display:"flex", gap:8, alignItems:"center"}}>
      {!back && <button className="m-icon-btn">🔔{badge && <span className="pip"/>}</button>}
      <div className="m-av tenant">A</div>
    </div>
  </div>
);

const TabsT = ({ active }) => (
  <div className="m-tabs">
    {[["home","⌂","My place"],["pay","₹","Pay"],["hra","📄","HRA"],["proof","📷","Proof"]].map(([k,i,l]) => (
      <div key={k} className={"t " + (active===k?"on":"")}>
        <span className="i">{i}</span><span className="l">{l}</span>
      </div>
    ))}
  </div>
);

// ─── 7. Tenant Home ─────────────────────────────────
window.MTHome = () => (
  <div className="m-screen">
    <TopBarT day="Mon · 3 Nov 2025" greet={<>Hi <em>Aarav.</em></>}/>
    <div className="m-body">
      <div className="m-hero ochre">
        <div className="lbl">NEXT RENT · DEC 2025</div>
        <div className="amt">₹62,000</div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:8}}>
          <span style={{fontSize:13, color:"rgba(246,244,238,.85)"}}>Due in <b style={{color:"#fff"}}>26 days</b> · 5 Dec</span>
          <span className="m-pill paid" style={{background:"rgba(255,255,255,.18)", color:"#fff"}}>NOV PAID ✓</span>
        </div>
        <div style={{display:"flex", gap:8, marginTop:18}}>
          <div style={{flex:1, padding:"12px", background:"#fff", color:"var(--rb-ink)", borderRadius:12, textAlign:"center", fontWeight:600, fontSize:14}}>Pay via UPI →</div>
          <div style={{flex:"0 0 auto", padding:"12px 16px", background:"rgba(255,255,255,.14)", color:"#fff", borderRadius:12, textAlign:"center", fontWeight:600, fontSize:14}}>Auto-pay</div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:12}}>
        <div className="m-card">
          <div className="m-eyebrow">TENANT SCORE</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:34, color:"var(--rb-action)", lineHeight:1, marginTop:4, letterSpacing:"-.025em"}}>842</div>
          <div className="m-pill paid" style={{marginTop:6}}>EXCELLENT</div>
        </div>
        <div className="m-card">
          <div className="m-eyebrow">HRA YTD</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:34, lineHeight:1, marginTop:4, letterSpacing:"-.025em"}}>₹62k</div>
          <div style={{fontSize:11, color:"var(--rb-ink-3)", marginTop:4}}>Est. tax saved this year</div>
        </div>
      </div>

      <div className="m-card" style={{marginTop:12}}>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <div style={{width:42, height:42, borderRadius:11, background:"linear-gradient(135deg,#0F4C5C,#163A47)", color:"#fff", display:"grid", placeItems:"center", fontFamily:"var(--rb-font-display)", fontSize:17, fontWeight:700}}>P</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14, fontWeight:600}}>Priya Sharma</div>
            <div style={{fontSize:11, color:"var(--rb-ink-3)"}}>Landlord · ✓ Verified · score 786</div>
          </div>
          <button className="m-icon-btn" style={{background:"var(--rb-action)", color:"#fff", border:0}}>💬</button>
        </div>
      </div>

      <div className="m-h"><h2>Quick</h2></div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <div className="m-row compact">
          <div className="ico" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)"}}>📄</div>
          <div><div className="t" style={{fontSize:13}}>HRA receipts</div><div className="s">8 sealed · 2025–26</div></div>
        </div>
        <div className="m-row compact">
          <div className="ico" style={{background:"var(--rb-action-soft)", color:"var(--rb-action)"}}>📷</div>
          <div><div className="t" style={{fontSize:13}}>Move-in proof</div><div className="s">12 photos · sealed</div></div>
        </div>
        <div className="m-row compact">
          <div className="ico">🛠</div>
          <div><div className="t" style={{fontSize:13}}>Raise repair</div><div className="s">1 in progress</div></div>
        </div>
        <div className="m-row compact">
          <div className="ico">★</div>
          <div><div className="t" style={{fontSize:13}}>My score</div><div className="s">842 / 900</div></div>
        </div>
      </div>

      <div className="m-h"><h2>Activity</h2><span className="more">All →</span></div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-action-soft)", color:"var(--rb-action)"}}>✓</div>
        <div><div className="t" style={{fontSize:13}}>Rent paid · Nov</div><div className="s">5 Nov · 10:42 AM</div></div>
        <div className="r"><div className="amt neg">−₹62k</div></div>
      </div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)"}}>📄</div>
        <div><div className="t" style={{fontSize:13}}>HRA receipt sealed</div><div className="s">#2025-11-088</div></div>
        <div className="r"><div className="amt zero">—</div></div>
      </div>
    </div>
    <TabsT active="home"/>
  </div>
);

// ─── 8. Pay Rent Step 1 — Amount + Method ─────────────────────────────────
window.MTPay = () => (
  <div className="m-screen">
    <TopBarT day="Pay rent" greet="December 2025" back/>
    <div className="m-body compact">
      <div className="m-pay-stepper">
        <span className="on"/><span/><span/>
      </div>

      <div style={{textAlign:"center", padding:"4px 0 8px"}}>
        <div className="m-eyebrow">TO PRIYA SHARMA</div>
        <div className="m-pay-amt"><span className="cur">₹</span>62,000</div>
        <div style={{fontSize:12, color:"var(--rb-ink-3)"}}>Bandra 2BHK · 1 – 30 Dec 2025</div>
      </div>

      <div className="m-card" style={{marginTop:8, background:"var(--rb-fill)", border:"none"}}>
        <div style={{display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:12}}>
          <span style={{color:"var(--rb-ink-3)"}}>Rent</span><b className="m-mono">₹62,000</b>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:12, color:"var(--rb-action)"}}>
          <span>Less repair · 50/50</span><b className="m-mono">−₹900</b>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", padding:"6px 0 0", marginTop:6, borderTop:"1px dashed var(--rb-border)", fontSize:13}}>
          <b>You'll pay</b><b className="m-mono" style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>₹61,100</b>
        </div>
      </div>

      <div className="m-h"><h2>Pay with</h2><span className="more">Manage →</span></div>

      <div className="m-upi-row sel">
        <div className="logo" style={{background:"#5F259F"}}>PP</div>
        <div><div className="nm">PhonePe</div><div className="hd">aarav.mehta@okhdfc</div></div>
        <div className="check"/>
      </div>
      <div className="m-upi-row">
        <div className="logo" style={{background:"#4285F4"}}>G</div>
        <div><div className="nm">Google Pay</div><div className="hd">aaravm@oksbi</div></div>
        <div className="check"/>
      </div>
      <div className="m-upi-row">
        <div className="logo" style={{background:"#00BAF2"}}>P</div>
        <div><div className="nm">Paytm</div><div className="hd">9876543210@paytm</div></div>
        <div className="check"/>
      </div>
      <div className="m-upi-row" style={{borderStyle:"dashed", background:"transparent"}}>
        <div className="logo" style={{background:"var(--rb-fill-2)", color:"var(--rb-ink-2)"}}>+</div>
        <div><div className="nm">NEFT / Bank transfer</div><div className="hd">Slower · 30 min – 2 hours</div></div>
        <div style={{fontSize:12, color:"var(--rb-ink-3)"}}>→</div>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost">📅</div>
      <div className="btn primary">Pay ₹61,100 →</div>
    </div>
  </div>
);

// ─── 9. Pay Rent Step 2 — Confirm / Authorising ─────────────────────────────────
window.MTPaying = () => (
  <div className="m-screen" style={{background:"#0E1413", color:"#F6F4EE"}}>
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0, color:"#fff"}}>✕</button>
      <div style={{textAlign:"center", flex:1}}>
        <div className="m-eyebrow" style={{color:"rgba(246,244,238,.5)"}}>STEP 2 OF 3</div>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>Confirm in PhonePe</div>
      </div>
      <button className="m-icon-btn" style={{background:"transparent",border:0, color:"#fff"}}>?</button>
    </div>
    <div className="m-body compact" style={{paddingTop:24}}>
      <div className="m-pay-stepper">
        <span className="on"/><span className="on"/><span/>
      </div>

      {/* Big spinner / ring */}
      <div style={{display:"grid", placeItems:"center", padding:"30px 0"}}>
        <div style={{width:180, height:180, borderRadius:"50%", position:"relative", background:"conic-gradient(from -90deg, var(--rb-accent) 0deg 240deg, rgba(255,255,255,.08) 240deg 360deg)", animation:"mPaySpin 1.4s linear infinite"}}>
          <div style={{position:"absolute", inset:8, background:"#0E1413", borderRadius:"50%", display:"grid", placeItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"var(--rb-font-display)", fontSize:36, letterSpacing:"-.025em"}}>₹61,100</div>
              <div style={{fontSize:10, color:"rgba(246,244,238,.5)", letterSpacing:".14em", marginTop:4}}>WAITING UPI · 0:08</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{textAlign:"center", marginTop:6}}>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:22, letterSpacing:"-.015em", lineHeight:1.2}}>Approve in PhonePe<br/>to complete payment</div>
        <div style={{fontSize:12, color:"rgba(246,244,238,.55)", marginTop:8, lineHeight:1.5}}>Don't close this screen. We'll seal the receipt the moment Priya's bank confirms.</div>
      </div>

      <div style={{marginTop:24, padding:14, background:"rgba(246,244,238,.06)", borderRadius:12, display:"flex", gap:12, alignItems:"center"}}>
        <div style={{width:36, height:36, borderRadius:9, background:"#5F259F", color:"#fff", display:"grid", placeItems:"center", fontWeight:800, fontSize:11}}>PP</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:600}}>PhonePe · aarav.mehta@okhdfc</div>
          <div style={{fontSize:11, color:"rgba(246,244,238,.55)", marginTop:2}}>→ priya@oksbi · SBI</div>
        </div>
        <div className="m-mono" style={{fontSize:10, color:"rgba(246,244,238,.55)"}}>UTR pending</div>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost" style={{background:"rgba(246,244,238,.08)", color:"#fff", border:0}}>Open PhonePe →</div>
    </div>
    <style>{`@keyframes mPaySpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── 10. Pay Success / Receipt Sealed ─────────────────────────────────
window.MTPaid = () => (
  <div className="m-screen">
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0}}>✕</button>
      <div style={{textAlign:"center", flex:1}}>
        <div className="m-eyebrow" style={{color:"var(--rb-action)"}}>PAID · 03 NOV 8:14 PM</div>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>Receipt sealed</div>
      </div>
      <button className="m-icon-btn">⤓</button>
    </div>
    <div className="m-body compact" style={{position:"relative"}}>
      <div className="m-pay-stepper">
        <span className="on"/><span className="on"/><span className="on"/>
      </div>

      <div className="m-burst" style={{top:"24%"}}>
        {Array.from({length:14}).map((_,i) => <span key={i} style={{"--rot":`${i*(360/14)}deg`}}/>)}
      </div>

      <div style={{textAlign:"center", padding:"18px 0 8px"}}>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:30, letterSpacing:"-.025em"}}>You paid <em style={{color:"var(--rb-accent)", fontStyle:"italic"}}>₹61,100.</em></div>
        <div style={{fontSize:13, color:"var(--rb-ink-3)", marginTop:4}}>Priya got it. The ledger is sealed.</div>
      </div>

      <div className="m-receipt" style={{position:"relative", marginTop:10}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:10, borderBottom:"1.5px solid var(--rb-ink)"}}>
          <div>
            <div className="m-mono" style={{fontSize:9, letterSpacing:".18em", color:"var(--rb-ink-3)", fontWeight:700}}>HRA RECEIPT</div>
            <h3>November 2025</h3>
          </div>
          <svg viewBox="0 0 30 30" width="26" height="26"><rect width="30" height="30" rx="7" fill="#0E1413"/><path d="M15 5 L26 14 V24 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 V14 Z" fill="#F6F4EE"/></svg>
        </div>
        <div className="rmeta">#2025-11-088 · 03 Nov 8:14 PM</div>
        <div style={{marginTop:10}}>
          <div className="rrow"><span>Paid to</span><b>Priya Sharma</b></div>
          <div className="rrow"><span>Property</span><b>Bandra 2BHK</b></div>
          <div className="rrow"><span>Period</span><b>Nov 2025</b></div>
          <div className="rrow"><span>UTR</span><b className="m-mono">458211220031</b></div>
        </div>
        <div className="rtot">
          <div>
            <div className="l">HRA · SEC 10(13A)</div>
            <div style={{fontSize:10, opacity:.65, marginTop:2}}>Use this for tax filing</div>
          </div>
          <div className="v">₹61,100</div>
        </div>

        <svg viewBox="0 0 80 80" width="74" height="74" className="m-wax">
          <defs><radialGradient id="wxSealT" cx="50%" cy="40%"><stop offset="0%" stopColor="#E89B5C"/><stop offset="60%" stopColor="#C97A3A"/><stop offset="100%" stopColor="#7a4a1f"/></radialGradient></defs>
          {Array.from({length:18}).map((_,i)=>{const a=(i/18)*Math.PI*2; return <circle key={i} cx={40+Math.cos(a)*36} cy={40+Math.sin(a)*36} r="3.5" fill="url(#wxSealT)"/>;})}
          <circle cx="40" cy="40" r="32" fill="url(#wxSealT)"/>
          <text x="40" y="35" textAnchor="middle" fill="#fff" fontSize="5" letterSpacing="1.5" fontWeight="700" fontFamily="ui-monospace, monospace">PAID</text>
          <text x="40" y="48" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Bricolage Grotesque, serif">SEALED</text>
        </svg>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost">Share</div>
      <div className="btn primary">Back home →</div>
    </div>
  </div>
);

// ─── 11. HRA Receipts ─────────────────────────────────
window.MTHRA = () => (
  <div className="m-screen">
    <TopBarT day="Section 10(13A)" greet="HRA receipts" back/>
    <div className="m-body">
      <div className="m-hero">
        <div className="lbl">SAVED ON TAX · FY 2025–26</div>
        <div className="amt">₹62,400</div>
        <div className="row">
          <div><div className="l">Receipts</div><div className="v">8</div></div>
          <div><div className="l">Total rent</div><div className="v muted">₹4.96L</div></div>
          <div><div className="l">Slab</div><div className="v warn">30%</div></div>
        </div>
        <div style={{marginTop:14, padding:"10px 12px", background:"rgba(246,244,238,.1)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontSize:12}}>Annual bundle · ready to file</span>
          <span style={{fontSize:12, color:"var(--rb-accent)", fontWeight:600}}>Export →</span>
        </div>
      </div>

      <div className="m-h"><h2>Monthly</h2><span className="more">All 8 →</span></div>

      {[
        {m:"NOV 2025", n:"#2025-11-088", amt:62000, fresh:true},
        {m:"OCT 2025", n:"#2025-10-087", amt:62000},
        {m:"SEP 2025", n:"#2025-09-087", amt:62000},
        {m:"AUG 2025", n:"#2025-08-087", amt:62000},
        {m:"JUL 2025", n:"#2025-07-087", amt:62000},
        {m:"JUN 2025", n:"#2025-06-087", amt:62000},
        {m:"MAY 2025", n:"#2025-05-087", amt:62000},
        {m:"APR 2025", n:"#2025-04-087", amt:62000},
      ].map((r,i)=>(
        <div key={i} className="m-row compact" style={{position:"relative"}}>
          <div className="ico" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)"}}>✓</div>
          <div>
            <div style={{display:"flex", gap:6, alignItems:"center"}}>
              <span style={{fontSize:11, letterSpacing:".1em", fontWeight:700, color:"var(--rb-ink-3)"}}>{r.m}</span>
              {r.fresh && <span className="m-pill paid" style={{fontSize:8, padding:"2px 6px"}}>NEW</span>}
            </div>
            <div style={{fontSize:11, color:"var(--rb-ink-3)", fontFamily:"var(--rb-font-mono)", marginTop:2}}>{r.n}</div>
          </div>
          <div className="r">
            <div className="amt" style={{fontSize:14}}>₹{r.amt.toLocaleString("en-IN")}</div>
            <div className="meta" style={{color:"var(--rb-action)", fontWeight:600}}>PDF →</div>
          </div>
        </div>
      ))}
    </div>
    <TabsT active="hra"/>
  </div>
);

// ─── 12. Move-in Proof ─────────────────────────────────
window.MTProof = () => (
  <div className="m-screen">
    <TopBarT day="Sealed 31 Oct 2025" greet="Move-in proof" back/>
    <div className="m-body">
      <div className="m-banner">
        <svg viewBox="0 0 32 32" className="si"><circle cx="16" cy="16" r="13" fill="none" stroke="#C97A3A" strokeWidth="1.4"/><path d="M11 16 l4 4 l6 -7" fill="none" stroke="#C97A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div><b>Locked &amp; geotagged</b><span>12 photos · 31 Oct 11:42 AM · 19.0760°N 72.8777°E</span></div>
      </div>

      <div className="m-h"><h2>The unit · 12 photos</h2><span className="more">⤓ PDF</span></div>

      <div className="m-photo-grid">
        {[
          ["Living","#a87a4f"],["Kitchen","#c9a878"],["Bath","#9aa6a3"],
          ["Bedroom","#a89280"],["Hall","#7a5d35"],["Balcony","#5b3a20"],
          ["Door","#4f5e5b"],["Meter","#5e483a"],["Geyser","#6e553a"],
          ["AC","#3a4441"],["Wardrobe","#664a32"],["Wall","#876b4f"],
        ].map(([cap, c], i) => (
          <div key={i} className="m-photo" style={{background:`linear-gradient(135deg,${c},#2c1c0e)`}}>
            <span className="cap">{cap}</span>
          </div>
        ))}
      </div>

      <div className="m-h"><h2>Document trail</h2></div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-action-soft)", color:"var(--rb-action)"}}>📄</div>
        <div><div className="t" style={{fontSize:13}}>Lease agreement · signed</div><div className="s">11-month · auto-renew · Aug 2024</div></div>
        <div className="r" style={{color:"var(--rb-action)", fontWeight:600, fontSize:11}}>PDF →</div>
      </div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)"}}>🪪</div>
        <div><div className="t" style={{fontSize:13}}>Aadhaar e-sign verified</div><div className="s">Both parties · 31 Oct 11:48 AM</div></div>
        <div className="r" style={{color:"var(--rb-action)", fontWeight:600, fontSize:11}}>✓</div>
      </div>
      <div className="m-row compact">
        <div className="ico">📋</div>
        <div><div className="t" style={{fontSize:13}}>Inventory checklist</div><div className="s">8 items · agreed by both</div></div>
        <div className="r" style={{color:"var(--rb-action)", fontWeight:600, fontSize:11}}>View →</div>
      </div>
    </div>
    <TabsT active="proof"/>
  </div>
);

// ─── 13. Raise Repair ─────────────────────────────────
window.MTRepair = () => (
  <div className="m-screen">
    <TopBarT day="Open a request" greet="Repair" back/>
    <div className="m-body">
      <div style={{textAlign:"center", padding:"4px 0 14px"}}>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:24, lineHeight:1.15, letterSpacing:"-.02em"}}>What needs<br/><em style={{color:"var(--rb-action)"}}>fixing?</em></div>
        <div style={{fontSize:12, color:"var(--rb-ink-3)", marginTop:6}}>Priya sees this the moment you submit.</div>
      </div>

      <div className="m-h" style={{margin:"4px 0 8px"}}><h2>Category</h2></div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8}}>
        {[
          {ico:"🚿", l:"Plumbing", sel:true},
          {ico:"⚡", l:"Electric"},
          {ico:"❄", l:"Appliance"},
          {ico:"🚪", l:"Other"},
        ].map((c,i)=>(
          <div key={i} className={"m-card "+(c.sel?"":"")} style={{textAlign:"center", padding:"14px 4px", borderColor: c.sel?"var(--rb-accent)":"var(--rb-border-soft)", background: c.sel?"var(--rb-accent-soft)":"var(--rb-surface)"}}>
            <div style={{fontSize:22}}>{c.ico}</div>
            <div style={{fontSize:11, fontWeight:600, marginTop:4, color: c.sel?"var(--rb-accent)":"var(--rb-ink-2)"}}>{c.l}</div>
          </div>
        ))}
      </div>

      <div className="m-h"><h2>Details</h2></div>
      <div className="m-field">
        <div className="lbl">Title</div>
        <input defaultValue="Geyser leaking near valve"/>
      </div>
      <div className="m-field">
        <div className="lbl">Describe what you see</div>
        <textarea defaultValue="Hot water tank dripping at the inlet valve. Floor wet. Tenant placed a bucket. Cold water tap still safe."/>
      </div>

      <div className="m-h"><h2>Photos</h2><span className="more">3 max</span></div>
      <div className="m-photo-grid" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr"}}>
        <div className="m-photo" style={{background:"linear-gradient(135deg,#a87a4f,#3a2811)"}}><span className="cap">11:42</span></div>
        <div className="m-photo" style={{background:"linear-gradient(135deg,#5b3a20,#2c1c0e)"}}><span className="cap">11:43</span></div>
        <div className="m-photo-add">+ Take<br/>photo</div>
        <div className="m-photo-add">+ From<br/>roll</div>
      </div>

      <div className="m-h"><h2>Urgency</h2></div>
      <div className="m-seg">
        <div className="s">Low</div>
        <div className="s on">Medium</div>
        <div className="s">High</div>
        <div className="s">Emergency</div>
      </div>

      <div className="m-helper">
        <span>💡</span>
        <div>Cost will be quoted by a verified vendor. <b>You won't be charged anything yet</b> — both you and Priya approve the split before work begins.</div>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost">Save draft</div>
      <div className="btn primary">Send to Priya →</div>
    </div>
  </div>
);

// ─── 14. Score ─────────────────────────────────
window.MTScore = () => {
  // build circular dial
  const C = 2 * Math.PI * 78;
  const pct = 842 / 900;
  return (
    <div className="m-screen">
      <TopBarT day="Reputation · live" greet="My score" back/>
      <div className="m-body">
        <div className="m-score-card">
          <div className="band">EXCELLENT</div>
          <div style={{position:"relative", width:200, height:200, margin:"14px auto 0"}}>
            <svg viewBox="0 0 200 200" width="200" height="200">
              <circle cx="100" cy="100" r="78" fill="none" stroke="var(--rb-fill-2)" strokeWidth="14"/>
              <circle cx="100" cy="100" r="78" fill="none" stroke="var(--rb-action)" strokeWidth="14"
                strokeLinecap="round" strokeDasharray={`${C*pct} ${C}`} transform="rotate(-90 100 100)"/>
              {Array.from({length:6}).map((_,i)=>{const a=(i/6)*Math.PI*2-Math.PI/2; return <circle key={i} cx={100+Math.cos(a)*94} cy={100+Math.sin(a)*94} r="2.5" fill="var(--rb-border-strong)"/>;})}
            </svg>
            <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"var(--rb-font-display)", fontSize:56, lineHeight:1, color:"var(--rb-action)", letterSpacing:"-.03em"}}>842</div>
                <div style={{fontFamily:"var(--rb-font-mono)", fontSize:12, color:"var(--rb-ink-3)", marginTop:2}}>/ 900</div>
              </div>
            </div>
          </div>
          <div style={{fontSize:12, color:"var(--rb-ink-3)", marginTop:6}}>+18 in last 90 days</div>
        </div>

        <div className="m-score-rows" style={{marginTop:14}}>
          <div className="m-eyebrow">WHAT BUILDS YOUR SCORE</div>
          <div className="b" style={{marginTop:8}}>
            <div className="l"><span>On-time rent</span><b>23/24 mo · 96%</b></div>
            <div className="bar"><div style={{width:"96%"}}/></div>
          </div>
          <div className="b">
            <div className="l"><span>Move-in proof submitted</span><b>100%</b></div>
            <div className="bar"><div style={{width:"100%"}}/></div>
          </div>
          <div className="b">
            <div className="l"><span>Past deposits returned in full</span><b>2/2</b></div>
            <div className="bar"><div style={{width:"95%"}}/></div>
          </div>
          <div className="b">
            <div className="l"><span>Repairs reported &amp; resolved</span><b>3</b></div>
            <div className="bar"><div style={{width:"85%"}}/></div>
          </div>
        </div>

        <div className="m-banner" style={{marginTop:12}}>
          <span style={{fontSize:22}}>🎯</span>
          <div>
            <b>3 ways to reach 900</b>
            <span>Submit move-out proof at end of tenancy · Pay 1 more month on time · Keep current repair on schedule</span>
          </div>
        </div>

        <div className="m-card" style={{marginTop:10}}>
          <div className="m-eyebrow">CARRY THIS SCORE</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:18, letterSpacing:"-.01em", marginTop:6, lineHeight:1.2}}>Your reputation travels with you to your next rental — no more starting over.</div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:10, fontSize:12, color:"var(--rb-action)", fontWeight:600}}>
            <span>Show landlord a verified link</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  MTHome, MTPay, MTPaying, MTPaid, MTHRA, MTProof, MTRepair, MTScore,
});
