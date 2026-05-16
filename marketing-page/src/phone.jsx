/* global React */
const { useEffect: usePE, useRef: useRP, useState: useSP } = React;

// Icons (Lucide-stroke style, hand-drawn 1.75px)
window.Icon = ({ name, size = 20, sw = 1.75, color = "currentColor" }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "shield": return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "camera": return <svg {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case "receipt": return <svg {...p}><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-2-2-2 2V2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>;
    case "vault": return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1"/></svg>;
    case "wrench": return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5z"/></svg>;
    case "bolt": return <svg {...p}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>;
    case "ledger": return <svg {...p}><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z"/><path d="M4 8h16M4 12h16M4 16h16"/></svg>;
    case "arrow-right": return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "check": return <svg {...p}><path d="M5 12l5 5L20 7"/></svg>;
    case "lock": return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20a4.5 4.5 0 0 1 7 0"/></svg>;
    default: return null;
  }
};

// Counter that animates 0 → target when scrolled into view
window.useCount = (target, active, duration = 1200) => {
  const [v, setV] = useSP(0);
  usePE(() => {
    if (!active) return;
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return v;
};

window.fmtINR = (n) => "₹" + n.toLocaleString("en-IN");

// Phone screens — 4 faces of the rent cycle
window.PhoneScreens = ({ idx }) => {
  // 0 = home (₹1,24,000), 1 = pay rent, 2 = receipt, 3 = proof
  return (
    <>
      <div className={"screen" + (idx === 0 ? " active" : "")}>
        <div className="s-eyebrow">Good morning, Priya</div>
        <div className="s-hero-amount">
          <div className="label">Collected this month</div>
          <div className="amt mono">₹1,24,000</div>
          <div className="row">
            <div><div className="k">PROPS</div><div className="v">3</div></div>
            <div><div className="k">ON TIME</div><div className="v mono">2 / 3</div></div>
            <div><div className="k">PENDING</div><div className="v" style={{color:"#F6E6CA"}}>₹18,500</div></div>
          </div>
        </div>
        <div className="s-card">
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div>
              <div className="s-eyebrow">Mumbai</div>
              <div style={{fontWeight:600, fontSize:13, marginTop:2}}>Bandra 2BHK</div>
              <div style={{fontSize:10, color:"#5C645F"}}>Aarav Mehta · paid 5 Nov</div>
            </div>
            <span className="s-pill success">Paid</span>
          </div>
        </div>
        <div className="s-card">
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div>
              <div className="s-eyebrow">Pune</div>
              <div style={{fontWeight:600, fontSize:13, marginTop:2}}>Koregaon 1BHK</div>
              <div style={{fontSize:10, color:"#5C645F"}}>due in 3 days</div>
            </div>
            <span className="s-pill warning">Due</span>
          </div>
        </div>
      </div>

      <div className={"screen" + (idx === 1 ? " active" : "")}>
        <div className="s-eyebrow">Pay rent</div>
        <div className="s-card">
          <div style={{fontSize:11, color:"#5C645F"}}>To · Priya Sharma</div>
          <div style={{fontFamily:"var(--rb-font-display)", fontSize:36, marginTop:6, letterSpacing:"-.02em"}}>₹28,500</div>
          <div style={{fontSize:10, color:"#5C645F", marginTop:2}}>Koregaon 1BHK · Nov 2025</div>
        </div>
        <div className="s-card" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:11, fontWeight:600}}>UPI</div>
            <div style={{fontSize:10, color:"#5C645F"}}>priya@oksbi</div>
          </div>
          <div className="mono" style={{fontSize:10, color:"#5C645F"}}>‹ select ›</div>
        </div>
        <div style={{flex:1}}/>
        <div style={{background:"var(--rb-action)", color:"#fff", borderRadius:12, padding:"12px", textAlign:"center", fontWeight:600, fontSize:13}}>
          Pay ₹28,500
        </div>
      </div>

      <div className={"screen" + (idx === 2 ? " active" : "")}>
        <div className="s-eyebrow">HRA receipt</div>
        <div className="s-receipt">
          <div className="top">
            <div>
              <div style={{fontSize:9, color:"#5C645F"}}>RECEIPT</div>
              <div className="title">November 2025</div>
            </div>
            <div className="seal">VERIFIED<br/>RECORD</div>
          </div>
          <div style={{marginTop:14}}>
            <div className="row"><span>Rent</span><span className="v">₹28,500</span></div>
            <div className="row"><span>Property</span><span className="v">Koregaon 1BHK</span></div>
            <div className="row"><span>Period</span><span className="v">1 – 30 Nov '25</span></div>
            <div className="row"><span>UTR</span><span className="v">4581 2210</span></div>
            <div className="row"><span>PAN</span><span className="v">AKWPS****K</span></div>
          </div>
          <div className="total">
            <div style={{fontSize:10, color:"#5C645F", letterSpacing:".1em", textTransform:"uppercase", fontWeight:600}}>HRA Eligible</div>
            <div className="v mono">₹28,500</div>
          </div>
        </div>
      </div>

      <div className={"screen" + (idx === 3 ? " active" : "")}>
        <div className="s-eyebrow">Move-in proof</div>
        <div className="s-proof">
          <div className="photo">
            <span className="ts">12 NOV 2025 · 11:42 IST<br/>Lat 19.0760, Lon 72.8777</span>
            <span className="seal">SEALED<br/>11:43</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6}}>
            {[1,2,3].map(i => (
              <div key={i} style={{aspectRatio:"1", borderRadius:8, background:"linear-gradient(135deg,#c9b388,#7a6042)"}}/>
            ))}
          </div>
          <div style={{textAlign:"center", fontSize:10, color:"#5C645F"}}>12 photos · locked permanently</div>
        </div>
      </div>
    </>
  );
};

Object.assign(window, { PhoneScreens: window.PhoneScreens });
