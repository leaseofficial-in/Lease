/* global React */
// Landlord mobile screens — exports to window
const { useState: useSL } = React;

// Reusable header
const TopBar = ({ greet, day, av, badge }) => (
  <div className="m-top">
    <div>
      <div className="m-day">{day}</div>
      <div className="m-greet">{greet}</div>
    </div>
    <div style={{display:"flex", gap:8, alignItems:"center"}}>
      <button className="m-icon-btn">🔍</button>
      <button className="m-icon-btn">🔔{badge && <span className="pip"/>}</button>
      <div className={"m-av " + av.role}>{av.initial}</div>
    </div>
  </div>
);

const Tabs = ({ active, role }) => {
  const items = role === "landlord"
    ? [["home","⌂","Overview"],["props","▦","Props"],["led","≡","Ledger"],["rep","⚙","Repairs"]]
    : [["home","⌂","My place"],["pay","₹","Pay"],["hra","📄","HRA"],["proof","📷","Proof"]];
  return (
    <div className="m-tabs">
      {items.map(([k,i,l]) => (
        <div key={k} className={"t " + (active===k?"on":"")}>
          <span className="i">{i}</span><span className="l">{l}</span>
        </div>
      ))}
    </div>
  );
};

// ─── 1. Landlord Overview ─────────────────────────────────
window.MLOverview = () => (
  <div className="m-screen">
    <TopBar day="Mon · 3 Nov 2025" greet={<>Good morning,<br/><em>Priya.</em></>} av={{role:"landlord", initial:"P"}} badge/>
    <div className="m-body">
      <div className="m-hero">
        <div className="lbl">Collected · November</div>
        <div className="amt">₹1,40,000<small>/1,74,000</small></div>
        <div className="bar"><div style={{width:"80%"}}/></div>
        <div className="row">
          <div><div className="l">On time</div><div className="v">2/3</div></div>
          <div><div className="l">Pending</div><div className="v warn">₹34k</div></div>
          <div><div className="l">Score</div><div className="v">786</div></div>
        </div>
      </div>

      <div className="m-quick">
        <div className="q"><div className="i">₹</div><div className="l">Pay-in</div></div>
        <div className="q ochre"><div className="i">📄</div><div className="l">Issue HRA</div></div>
        <div className="q"><div className="i">🛠</div><div className="l">Repair</div></div>
        <div className="q ochre"><div className="i">📨</div><div className="l">Nudge</div></div>
      </div>

      <div className="m-h"><h2>Properties</h2><span className="more">All 3 →</span></div>
      <div className="m-row">
        <div className="ico" style={{background:"linear-gradient(135deg,#a87a4f,#3a2811)"}}/>
        <div><div className="t">Bandra 2BHK</div><div className="s">Aarav Mehta · paid 5 Nov</div></div>
        <div className="r"><div className="amt pos">₹62,000</div><div className="meta"><span className="m-pill paid">PAID</span></div></div>
      </div>
      <div className="m-row">
        <div className="ico" style={{background:"linear-gradient(135deg,#9aa6a3,#1f2724)"}}/>
        <div><div className="t">Koregaon 1BHK</div><div className="s">Sneha Rao · due in 3 days</div></div>
        <div className="r"><div className="amt zero">₹34,000</div><div className="meta"><span className="m-pill due">DUE</span></div></div>
      </div>
      <div className="m-row">
        <div className="ico" style={{background:"linear-gradient(135deg,#c9a878,#3a2811)"}}/>
        <div><div className="t">HSR 3BHK</div><div className="s">Vikram K. · paid 2 Nov</div></div>
        <div className="r"><div className="amt pos">₹78,000</div><div className="meta"><span className="m-pill paid">PAID</span></div></div>
      </div>

      <div className="m-h"><h2>Today</h2><span className="more">Ledger →</span></div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-accent-soft)", color:"var(--rb-accent)"}}>↓</div>
        <div><div className="t">Rent received · Bandra</div><div className="s">10:42 AM · UPI</div></div>
        <div className="r"><div className="amt pos">+₹62,000</div></div>
      </div>
      <div className="m-row compact">
        <div className="ico" style={{background:"var(--rb-action-soft)", color:"var(--rb-action)"}}>✓</div>
        <div><div className="t">HRA receipt issued</div><div className="s">#2025-11-088 · Aarav</div></div>
        <div className="r"><div className="amt zero">—</div></div>
      </div>
    </div>
    <Tabs active="home" role="landlord"/>
  </div>
);

// ─── 2. Properties ─────────────────────────────────
window.MLProperties = () => (
  <div className="m-screen">
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0}}>←</button>
      <div style={{textAlign:"center", flex:1}}>
        <div className="m-eyebrow">3 properties</div>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>Properties</div>
      </div>
      <button className="m-icon-btn" style={{background:"var(--rb-action)", color:"#fff", border:0}}>+</button>
    </div>
    <div className="m-body">
      <div className="m-card" style={{background:"linear-gradient(135deg,#0F4C5C,#163A47)", color:"#fff", border:0}}>
        <div className="m-eyebrow" style={{color:"rgba(255,255,255,.55)"}}>PORTFOLIO · NOV 2025</div>
        <div style={{display:"flex", gap:16, marginTop:8}}>
          <div><div style={{fontFamily:"var(--rb-font-display)", fontSize:30, letterSpacing:"-.02em"}}>₹1.74L</div><div style={{fontSize:10, opacity:.6}}>per month</div></div>
          <div style={{borderLeft:"1px solid rgba(255,255,255,.18)", paddingLeft:16}}><div style={{fontFamily:"var(--rb-font-display)", fontSize:30, color:"var(--rb-accent)", letterSpacing:"-.02em"}}>₹14.2L</div><div style={{fontSize:10, opacity:.6}}>FY ytd</div></div>
        </div>
      </div>

      {[
        {n:"Bandra 2BHK", a:"12B Pali Naka · Mumbai", t:"Aarav Mehta", r:62000, st:"paid", img:"#a87a4f"},
        {n:"Koregaon 1BHK", a:"A-403 Lakeview · Pune", t:"Sneha Rao · due 5 Nov", r:34000, st:"due", img:"#9aa6a3"},
        {n:"HSR 3BHK", a:"17/2 Mahogany · Bengaluru", t:"Vikram Krishnan", r:78000, st:"paid", img:"#c9a878"},
      ].map((p,i) => (
        <div key={i} className="m-card" style={{marginTop:10, padding:0, overflow:"hidden"}}>
          <div style={{height:90, background:`linear-gradient(135deg,${p.img},#2c1c0e)`, position:"relative"}}>
            <span className={"m-pill " + p.st} style={{position:"absolute", top:10, left:10}}>{p.st.toUpperCase()}</span>
          </div>
          <div style={{padding:"12px 14px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <div style={{fontFamily:"var(--rb-font-display)", fontSize:18, letterSpacing:"-.01em"}}>{p.n}</div>
              <div style={{fontFamily:"var(--rb-font-mono)", fontSize:13, fontWeight:600}}>₹{p.r.toLocaleString("en-IN")}</div>
            </div>
            <div style={{fontSize:11, color:"var(--rb-ink-3)", marginTop:2}}>{p.a}</div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:"1px dashed var(--rb-border)"}}>
              <span style={{fontSize:11, color:"var(--rb-ink-2)"}}>{p.t}</span>
              <span style={{fontSize:11, color:"var(--rb-action)", fontWeight:600}}>View →</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <Tabs active="props" role="landlord"/>
  </div>
);

// ─── 3. Ledger ─────────────────────────────────
window.MLLedger = () => (
  <div className="m-screen">
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0}}>←</button>
      <div style={{textAlign:"center", flex:1}}>
        <div className="m-eyebrow">14 entries · sealed</div>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>Ledger</div>
      </div>
      <button className="m-icon-btn">⤓</button>
    </div>
    <div className="m-body">
      <div className="m-banner">
        <svg viewBox="0 0 32 32" className="si"><circle cx="16" cy="16" r="13" fill="none" stroke="#C97A3A" strokeWidth="1.4"/><circle cx="16" cy="16" r="10" fill="none" stroke="#C97A3A" strokeWidth=".7" strokeDasharray="1.2 1.6"/><path d="M11 16 l4 4 l6 -7" fill="none" stroke="#C97A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div><b>Append-only ledger</b><span>You and your tenant see the same record. Each entry is timestamped &amp; sealed.</span></div>
      </div>

      <div className="m-seg">
        <div className="s on">All<span className="ct">14</span></div>
        <div className="s">In<span className="ct">5</span></div>
        <div className="s">Out<span className="ct">2</span></div>
        <div className="s">Docs<span className="ct">5</span></div>
      </div>

      {[
        {d:"05 NOV", t:"Rent · Bandra 2BHK", w:"Aarav Mehta · UPI", amt:62000, st:"in"},
        {d:"05 NOV", t:"HRA receipt #2025-11-088", w:"Auto-issued", amt:0, st:"doc"},
        {d:"03 NOV", t:"Plumber · geyser leak", w:"SureFix · 50/50 split", amt:-1800, st:"out"},
        {d:"02 NOV", t:"Rent · HSR 3BHK", w:"Vikram Krishnan", amt:78000, st:"in"},
        {d:"31 OCT", t:"Move-in proof submitted", w:"Aarav · 12 photos", amt:0, st:"doc"},
        {d:"30 OCT", t:"5-day reminder · Sneha", w:"SMS + Email", amt:0, st:"sys"},
      ].map((r,i) => (
        <div key={i} className="m-row compact">
          <div style={{textAlign:"center", width:40}}>
            <div style={{fontFamily:"var(--rb-font-display)", fontSize:18, lineHeight:1}}>{r.d.split(" ")[0]}</div>
            <div style={{fontFamily:"var(--rb-font-mono)", fontSize:8, color:"var(--rb-ink-3)", marginTop:2, letterSpacing:".12em"}}>{r.d.split(" ")[1]}</div>
          </div>
          <div><div className="t" style={{fontSize:13}}>{r.t}</div><div className="s">{r.w}</div></div>
          <div className="r">
            {r.amt !== 0 ? <div className={"amt "+(r.amt>0?"pos":"neg")}>{r.amt>0?"+":""}₹{Math.abs(r.amt).toLocaleString("en-IN")}</div> : <div className="amt zero">—</div>}
            <div className="meta">{r.st === "in" ? "IN" : r.st === "out" ? "OUT" : r.st === "doc" ? "DOC" : "SYS"}</div>
          </div>
        </div>
      ))}
    </div>
    <Tabs active="led" role="landlord"/>
  </div>
);

// ─── 4. Repairs ─────────────────────────────────
window.MLRepairs = () => (
  <div className="m-screen">
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0}}>←</button>
      <div style={{textAlign:"center", flex:1}}>
        <div className="m-eyebrow">2 active · 3 resolved</div>
        <div style={{fontFamily:"var(--rb-font-display)", fontSize:18}}>Repairs</div>
      </div>
      <button className="m-icon-btn" style={{background:"var(--rb-ink)", color:"#fff", border:0}}>+</button>
    </div>
    <div className="m-body">
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <div className="m-card" style={{background:"linear-gradient(135deg,var(--rb-accent-soft),var(--rb-canvas))", borderColor:"rgba(201,122,58,.3)"}}>
          <div className="m-eyebrow" style={{color:"var(--rb-accent)"}}>IN PROGRESS</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:30, color:"var(--rb-accent)", lineHeight:1, marginTop:6}}>1</div>
          <div style={{fontSize:10, color:"var(--rb-ink-3)", marginTop:4}}>Plumber visit tomorrow</div>
        </div>
        <div className="m-card">
          <div className="m-eyebrow">RESPONSE</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:30, color:"var(--rb-action)", lineHeight:1, marginTop:6}}>1.2<span style={{fontSize:14, color:"var(--rb-ink-3)", marginLeft:2}}>d</span></div>
          <div style={{fontSize:10, color:"var(--rb-ink-3)", marginTop:4}}>Faster than 88%</div>
        </div>
      </div>

      <div className="m-seg" style={{marginTop:14}}>
        <div className="s on">All<span className="ct">5</span></div>
        <div className="s">New<span className="ct">1</span></div>
        <div className="s">Open<span className="ct">1</span></div>
        <div className="s">Done<span className="ct">3</span></div>
      </div>

      {/* Featured in-progress */}
      <div className="m-card" style={{borderLeft:"3px solid var(--rb-accent)"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span className="m-pill in"><span className="d"/>IN PROGRESS</span>
          <span className="m-mono" style={{fontSize:10, color:"var(--rb-ink-3)"}}>R-2025-441</span>
        </div>
        <div style={{display:"flex", gap:12, marginTop:10, alignItems:"flex-start"}}>
          <div style={{width:44, height:44, borderRadius:12, background:"var(--rb-accent-soft)", display:"grid", placeItems:"center", fontSize:22}}>🚿</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--rb-font-display)", fontSize:17, letterSpacing:"-.01em"}}>Geyser leak · master bath</div>
            <div style={{fontSize:11, color:"var(--rb-ink-3)", marginTop:3}}>Bandra 2BHK · Aarav · raised 2 Nov</div>
            <div style={{display:"flex", gap:8, marginTop:8, paddingTop:8, borderTop:"1px dashed var(--rb-border)", fontSize:11, color:"var(--rb-ink-2)"}}>
              <span>🛠 SureFix · ★4.7</span>
              <span style={{color:"var(--rb-accent)", fontWeight:600}}>11 AM tomorrow</span>
            </div>
          </div>
        </div>
      </div>

      {[
        {ico:"❄", t:"AC servicing · living room", p:"Koregaon · Sneha · 28 Oct", id:"R-440", st:"new", quote:null},
        {ico:"⚡", t:"Wi-Fi router replacement", p:"Bandra · Aarav · 8 Oct", id:"R-432", st:"done", quote:"₹2,400"},
        {ico:"🏢", t:"Society maintenance · Oct", p:"HSR · 15 Oct", id:"R-428", st:"done", quote:"₹4,200"},
      ].map((r,i) => (
        <div key={i} className="m-row" style={{marginTop:8}}>
          <div className="ico">{r.ico}</div>
          <div>
            <div style={{display:"flex", gap:6, alignItems:"center"}}>
              <span className={"m-pill "+r.st}>{r.st.toUpperCase()}</span>
              <span style={{fontSize:9, color:"var(--rb-ink-3)", fontFamily:"var(--rb-font-mono)"}}>{r.id}</span>
            </div>
            <div className="t" style={{marginTop:4}}>{r.t}</div>
            <div className="s">{r.p}</div>
          </div>
          <div className="r">
            {r.quote ? <div className="amt" style={{fontSize:12}}>{r.quote}</div> : <div className="amt zero" style={{fontSize:11, fontStyle:"italic"}}>pending</div>}
          </div>
        </div>
      ))}
    </div>
    <Tabs active="rep" role="landlord"/>
  </div>
);

// ─── 5. Accept Payment · Live moment ─────────────────────────────────
window.MLAccept = () => (
  <div className="m-screen">
    <TopBar day="Now · 8:14 PM" greet={<>A tenant<br/>just <em>paid you.</em></>} av={{role:"landlord", initial:"P"}}/>
    <div className="m-body compact">
      <div className="m-hero" style={{textAlign:"center"}}>
        <div style={{display:"flex", justifyContent:"center", alignItems:"center", gap:8}}>
          <span style={{width:8, height:8, borderRadius:"50%", background:"#61D095", boxShadow:"0 0 0 0 rgba(97,208,149,.9)", animation:"mPulse 1.4s infinite"}}/>
          <span className="m-mono" style={{fontSize:10, color:"#61D095", letterSpacing:".14em", fontWeight:700}}>INCOMING · LIVE</span>
        </div>
        <div className="m-pay-amt dark"><span className="cur">₹</span>62,000</div>
        <div className="m-pay-from"><b>aarav.mehta@okhdfc</b> → priya@oksbi</div>
        <div style={{marginTop:10, fontSize:11, color:"rgba(246,244,238,.55)", fontFamily:"var(--rb-font-mono)"}}>UTR · 458211220031 · HDFC → SBI</div>
      </div>

      <div className="m-card" style={{marginTop:14}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div className="m-eyebrow">AUTO-MATCHED</div>
            <div style={{fontSize:14, fontWeight:600, marginTop:4}}>Bandra 2BHK · Nov 2025</div>
            <div style={{fontSize:11, color:"var(--rb-ink-3)", fontFamily:"var(--rb-font-mono)", marginTop:2}}>INV-2025-11-088</div>
          </div>
          <span className="m-pill" style={{background:"var(--rb-action-soft)", color:"var(--rb-action)"}}>✓ matched</span>
        </div>
      </div>

      <div className="m-card" style={{marginTop:8}}>
        <div className="m-eyebrow" style={{marginBottom:8}}>SETTLEMENT</div>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0"}}>
          <span>Rent received</span><b className="m-mono" style={{color:"var(--rb-action)"}}>+₹62,000</b>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderTop:"1px dashed var(--rb-border)"}}>
          <span>Less repair split <i style={{color:"var(--rb-ink-3)", fontSize:10, fontStyle:"normal"}}>(R-441)</i></span><b className="m-mono" style={{color:"#C24A2A"}}>−₹900</b>
        </div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:8, padding:"10px 12px", marginLeft:-14, marginRight:-14, marginBottom:-14, background:"var(--rb-fill)", borderTop:"1px solid var(--rb-border)"}}>
          <b style={{fontSize:13}}>Net to you</b>
          <b style={{fontFamily:"var(--rb-font-display)", fontSize:22, letterSpacing:"-.01em"}}>₹61,100</b>
        </div>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost">Hold</div>
      <div className="btn ochre">Confirm &amp; seal →</div>
    </div>
  </div>
);

// ─── 6. Accept Payment · Sealed ─────────────────────────────────
window.MLSealed = () => (
  <div className="m-screen">
    <div className="m-top">
      <button className="m-icon-btn" style={{background:"transparent",border:0}}>✕</button>
      <div className="m-eyebrow">Receipt · sealed 8:14 PM</div>
      <button className="m-icon-btn">⤓</button>
    </div>
    <div className="m-body compact" style={{paddingTop:8, position:"relative"}}>
      <div className="m-burst">
        {Array.from({length:14}).map((_,i) => <span key={i} style={{"--rot":`${i*(360/14)}deg`}}/>)}
      </div>

      <div className="m-receipt" style={{marginTop:30, position:"relative"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingBottom:10, borderBottom:"1.5px solid var(--rb-ink)"}}>
          <div>
            <div className="m-mono" style={{fontSize:9, letterSpacing:".18em", color:"var(--rb-ink-3)", fontWeight:700}}>RENT RECEIPT</div>
            <h3>November 2025</h3>
          </div>
          <svg viewBox="0 0 30 30" width="26" height="26"><rect width="30" height="30" rx="7" fill="#0E1413"/><path d="M15 5 L26 14 V24 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 V14 Z" fill="#F6F4EE"/></svg>
        </div>
        <div className="rmeta">No. 2025-11-088 · 03 Nov 8:14 PM</div>
        <div style={{marginTop:12}}>
          <div className="rrow"><span>From</span><b>Aarav Mehta</b></div>
          <div className="rrow"><span>Property</span><b>Bandra 2BHK</b></div>
          <div className="rrow"><span>Period</span><b>Nov 2025</b></div>
          <div className="rrow"><span>UTR</span><b className="m-mono">458211220031</b></div>
          <div className="rrow"><span>PAN</span><b className="m-mono">AKWPS****K</b></div>
        </div>
        <div className="rtot">
          <div>
            <div className="l">HRA · SEC 10(13A)</div>
            <div style={{fontSize:10, opacity:.65, marginTop:2}}>less ₹900 repair share</div>
          </div>
          <div className="v">₹61,100</div>
        </div>
        <div style={{marginTop:14, paddingTop:12, borderTop:"1px dashed rgba(20,18,12,.2)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <div><div style={{borderBottom:"1.2px solid var(--rb-ink)", height:18}}/><div style={{fontSize:10, fontWeight:600, marginTop:3}}>Priya · Landlord</div><div className="m-mono" style={{fontSize:8, color:"var(--rb-ink-3)"}}>e-signed · 8:14:38 PM</div></div>
          <div><div style={{borderBottom:"1.2px solid var(--rb-ink)", height:18}}/><div style={{fontSize:10, fontWeight:600, marginTop:3}}>Aarav · Tenant</div><div className="m-mono" style={{fontSize:8, color:"var(--rb-ink-3)"}}>UPI auth · 8:14:22 PM</div></div>
        </div>
        <div className="m-mono" style={{fontSize:9, color:"var(--rb-ink-3)", marginTop:10, textAlign:"center", letterSpacing:".04em"}}>Sealed to chain · a7c1f0…892b · #1188</div>

        {/* Wax seal */}
        <svg viewBox="0 0 80 80" width="78" height="78" className="m-wax">
          <defs>
            <radialGradient id="wxSeal" cx="50%" cy="40%"><stop offset="0%" stopColor="#E89B5C"/><stop offset="60%" stopColor="#C97A3A"/><stop offset="100%" stopColor="#7a4a1f"/></radialGradient>
          </defs>
          {Array.from({length:18}).map((_,i)=>{const a=(i/18)*Math.PI*2; return <circle key={i} cx={40+Math.cos(a)*36} cy={40+Math.sin(a)*36} r="3.5" fill="url(#wxSeal)"/>;})}
          <circle cx="40" cy="40" r="32" fill="url(#wxSeal)"/>
          <text x="40" y="35" textAnchor="middle" fill="#fff" fontSize="5" letterSpacing="1.5" fontWeight="700" fontFamily="ui-monospace, monospace">RECEIVED</text>
          <text x="40" y="48" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Bricolage Grotesque, serif">SEALED</text>
          <text x="40" y="56" textAnchor="middle" fill="#fff" fontSize="5" letterSpacing="1" opacity=".75" fontFamily="ui-monospace, monospace">#1188</text>
        </svg>
      </div>

      <div style={{marginTop:18, padding:"12px 14px", background:"var(--rb-ink)", color:"#FBF6EB", borderRadius:14, display:"flex", gap:10, alignItems:"center"}}>
        <span style={{fontSize:18}}>📩</span>
        <div>
          <div style={{fontSize:13, fontWeight:600}}>Sent to Aarav</div>
          <div style={{fontSize:11, opacity:.7}}>Push + email · ledger updated</div>
        </div>
      </div>
    </div>
    <div className="m-cta">
      <div className="btn ghost">Share</div>
      <div className="btn primary">View in ledger →</div>
    </div>
  </div>
);

Object.assign(window, {
  MLOverview, MLProperties, MLLedger, MLRepairs, MLAccept, MLSealed,
});
