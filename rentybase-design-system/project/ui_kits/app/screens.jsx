/* global React, RB */
const { useState: useStateD } = React;
const { Icon, LogoMark, Pill, Button, Card, Eyebrow } = RB;

// ─────────── Tab bar ───────────
const TabBar = ({ active, onChange }) => {
  const tabs = [
    { id: "home", label: "Home", icon: "home" },
    { id: "payments", label: "Payments", icon: "wallet" },
    { id: "proof", label: "Proof", icon: "shield" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #EBE7DB", paddingBottom: 28, paddingTop: 8, display: "flex" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", cursor: "pointer", color: active === t.id ? "#0F4C5C" : "#8E948D" }}>
          <Icon name={t.icon} size={22} strokeWidth={active === t.id ? 2 : 1.6}/>
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "DM Sans" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─────────── Landlord home screen ───────────
const LandlordHome = ({ onPay }) => (
  <div style={{ background: "#F6F4EE", padding: "16px 16px 90px", height: "100%", overflowY: "auto", fontFamily: "DM Sans, sans-serif", color: "#0E1413" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LogoMark size={34} radius={9}/>
        <div>
          <div style={{ fontSize: 11, color: "#5C645F" }}>Good morning</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Priya</div>
        </div>
      </div>
      <button style={{ width: 36, height: 36, borderRadius: 12, background: "#fff", border: "1px solid #EBE7DB", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Icon name="bell" size={18}/>
        <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 4, background: "#B33A2E", border: "1.5px solid #fff" }}/>
      </button>
    </div>

    {/* Hero rent-collected card */}
    <div style={{ background: "linear-gradient(135deg,#0F4C5C 0%,#163A47 60%,#0E1413 100%)", borderRadius: 22, padding: 18, color: "#fff", marginBottom: 14, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 8%, rgba(201,122,58,.22), transparent 55%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        <Eyebrow color="rgba(255,255,255,.55)">Collected this month</Eyebrow>
        <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 38, lineHeight: 1.05, marginTop: 6, letterSpacing: "-.02em" }}>₹1,24,000</div>
        <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <div><div style={{ fontSize: 10, opacity: .55 }}>Properties</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>3</div></div>
          <div><div style={{ fontSize: 10, opacity: .55 }}>On time</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, fontFamily: "JetBrains Mono" }}>2 / 3</div></div>
          <div><div style={{ fontSize: 10, opacity: .55 }}>Pending</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: "#F6E6CA" }}>₹18,500</div></div>
        </div>
      </div>
    </div>

    {/* Section: Properties */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 10 }}>
      <Eyebrow>Properties</Eyebrow>
      <span style={{ fontSize: 12, color: "#0F4C5C", fontWeight: 600 }}>See all →</span>
    </div>

    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Eyebrow>Mumbai</Eyebrow>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 3 }}>Bandra 2BHK</div>
          <div style={{ fontSize: 12, color: "#5C645F", marginTop: 1 }}>Aarav Mehta · paid 5 Nov</div>
        </div>
        <Pill tone="success">Paid</Pill>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #EBE7DB", fontFamily: "JetBrains Mono", fontSize: 13 }}>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Rent</div>₹62,000</div>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Deposit</div>₹1,80,000</div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Since</div>5 Nov '24</div>
      </div>
    </Card>

    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Eyebrow>Pune</Eyebrow>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 3 }}>Koregaon Park 1BHK</div>
          <div style={{ fontSize: 12, color: "#5C645F", marginTop: 1 }}>Sneha Joshi · due 5 Nov</div>
        </div>
        <Pill tone="warning">3 days left</Pill>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #EBE7DB", fontFamily: "JetBrains Mono", fontSize: 13 }}>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Rent</div>₹28,500</div>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Deposit</div>₹85,000</div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Since</div>1 Aug '25</div>
      </div>
    </Card>

    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Eyebrow>Bengaluru</Eyebrow>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 3 }}>HSR PG · 3 beds</div>
          <div style={{ fontSize: 12, color: "#5C645F", marginTop: 1 }}>1 of 3 overdue</div>
        </div>
        <Pill tone="danger">Overdue</Pill>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #EBE7DB", fontFamily: "JetBrains Mono", fontSize: 13 }}>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Total rent</div>₹33,500</div>
        <div><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Beds</div>3 / 3 filled</div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "#5C645F", fontFamily: "DM Sans" }}>Pending</div><span style={{ color: "#B33A2E" }}>₹11,500</span></div>
      </div>
    </Card>

    <Button variant="secondary" fullWidth leftIcon={<Icon name="plus" size={16}/>}>
      Add property
    </Button>
  </div>
);

// ─────────── Tenant pay rent screen ───────────
const TenantPayRent = ({ onPaid, onBack }) => {
  const [method, setMethod] = useStateD("upi");
  return (
    <div style={{ background: "#F6F4EE", padding: "16px 16px 90px", height: "100%", overflowY: "auto", fontFamily: "DM Sans, sans-serif", color: "#0E1413" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: "#fff", border: "1px solid #EBE7DB", display: "flex", alignItems: "center", justifyContent: "center", transform: "scaleX(-1)" }}>
          <Icon name="chevron" size={18}/>
        </button>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Pay rent</div>
      </div>

      <Card style={{ background: "#0E1413", color: "#fff", border: "none", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 85% 8%, rgba(201,122,58,.22), transparent 55%)", pointerEvents: "none" }}/>
        <div style={{ position: "relative" }}>
          <Eyebrow color="rgba(255,255,255,.55)">November 2025</Eyebrow>
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 44, lineHeight: 1.05, marginTop: 6, letterSpacing: "-.025em" }}>₹62,000</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 4 }}>To Priya Sharma · Bandra 2BHK</div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.65)" }}>
            <span>Due 5 Nov</span><span style={{ color: "#F6E6CA" }}>3 days left</span>
          </div>
        </div>
      </Card>

      <Eyebrow>Pay with</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 16 }}>
        {[
          { id: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm" },
          { id: "card", label: "Card", sub: "Debit / credit · Razorpay" },
          { id: "netbanking", label: "Net banking", sub: "All major banks" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setMethod(opt.id)} style={{ background: "#fff", border: `1px solid ${method === opt.id ? "#0F4C5C" : "#EBE7DB"}`, boxShadow: method === opt.id ? "0 0 0 3px rgba(15,76,92,.18)" : "none", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: "#5C645F", marginTop: 1 }}>{opt.sub}</div>
            </div>
            <div style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${method === opt.id ? "#0F4C5C" : "#D4CFBE"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {method === opt.id && <div style={{ width: 9, height: 9, borderRadius: 999, background: "#0F4C5C" }}/>}
            </div>
          </button>
        ))}
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={onPaid}>Pay ₹62,000</Button>
      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 12, color: "#5C645F", fontSize: 12 }}>
        <Icon name="lock" size={13}/> Razorpay · UTR saved automatically
      </div>
    </div>
  );
};

// ─────────── Tenant payment success ───────────
const TenantPaid = ({ onBack }) => (
  <div style={{ background: "#F6F4EE", padding: "16px 16px 90px", height: "100%", overflowY: "auto", fontFamily: "DM Sans, sans-serif", color: "#0E1413", display: "flex", flexDirection: "column" }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px 16px" }}>
      <div style={{ width: 88, height: 88, borderRadius: 999, background: "#DEEFE6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Icon name="check" size={42} color="#1F7A55" strokeWidth={2.5}/>
      </div>
      <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 32, lineHeight: 1.1, letterSpacing: "-.02em" }}>Paid.</div>
      <div style={{ fontSize: 14, color: "#5C645F", marginTop: 6, maxWidth: 240 }}>₹62,000 sent to Priya Sharma. UTR saved to your records.</div>

      <Card style={{ marginTop: 24, width: "100%", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: "#5C645F" }}>Amount</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "JetBrains Mono" }}>₹62,000</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: "#5C645F" }}>UTR</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "JetBrains Mono" }}>4581 2210 9914</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 12, color: "#5C645F" }}>For</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>November 2025</span>
        </div>
      </Card>
    </div>
    <Button variant="primary" fullWidth size="lg" onClick={onBack} leftIcon={<Icon name="receipt" size={16}/>}>
      Generate HRA receipt
    </Button>
    <Button variant="ghost" fullWidth onClick={onBack} >Done</Button>
  </div>
);

// ─────────── Move-in proof screen ───────────
const ProofScreen = ({ onBack }) => (
  <div style={{ background: "#F6F4EE", padding: "16px 16px 90px", height: "100%", overflowY: "auto", fontFamily: "DM Sans, sans-serif", color: "#0E1413" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: "#fff", border: "1px solid #EBE7DB", display: "flex", alignItems: "center", justifyContent: "center", transform: "scaleX(-1)" }}>
        <Icon name="chevron" size={18}/>
      </button>
      <div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Move-in proof</div>
        <div style={{ fontSize: 12, color: "#5C645F" }}>Bandra 2BHK</div>
      </div>
    </div>

    <Card style={{ marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F4E5D4", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="shield" size={22} color="#C97A3A"/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Photos lock when you submit</div>
        <div style={{ fontSize: 12, color: "#5C645F", marginTop: 1 }}>Timestamps verified. Neither side can edit them later.</div>
      </div>
    </Card>

    {/* Room tabs */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
      {[
        { lbl: "Living room", n: 6, active: true },
        { lbl: "Kitchen", n: 4 },
        { lbl: "Bedroom", n: 5 },
        { lbl: "Bathroom", n: 3 },
      ].map(t => (
        <button key={t.lbl} style={{ padding: "8px 14px", borderRadius: 999, border: t.active ? "1px solid #0F4C5C" : "1px solid #E6E2D7", background: t.active ? "#0F4C5C" : "#fff", color: t.active ? "#fff" : "#0E1413", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit" }}>
          {t.lbl} <span style={{ opacity: .65, marginLeft: 4 }}>{t.n}</span>
        </button>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ aspectRatio: "1", borderRadius: 14, background: `linear-gradient(${135 + i*20}deg, #2A332F, #5C645F)`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 9, fontFamily: "JetBrains Mono", color: "rgba(255,255,255,.85)", background: "rgba(0,0,0,.45)", padding: "2px 6px", borderRadius: 4 }}>05·11·25 14:2{i}</div>
          {i === 1 && <div style={{ position: "absolute", top: 6, right: 6 }}><Pill tone="success">Locked</Pill></div>}
        </div>
      ))}
      <button style={{ aspectRatio: "1", borderRadius: 14, border: "1.5px dashed #D4CFBE", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#5C645F", cursor: "pointer", gap: 4 }}>
        <Icon name="camera" size={22}/>
        <span style={{ fontSize: 11, fontWeight: 500 }}>Add photo</span>
      </button>
    </div>

    <div style={{ marginTop: 18 }}>
      <Button variant="primary" size="lg" fullWidth leftIcon={<Icon name="lock" size={16}/>}>Submit & lock</Button>
    </div>
  </div>
);

// ─────────── Auth/welcome ───────────
const Auth = ({ onContinue }) => (
  <div style={{ background: "#0E1413", padding: 24, height: "100%", color: "#fff", fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -100, right: -100, width: 360, height: 360, borderRadius: 999, background: "radial-gradient(circle, rgba(201,122,58,.22), transparent 65%)" }}/>
    <div style={{ position: "absolute", bottom: -60, left: -80, width: 260, height: 260, borderRadius: 999, background: "radial-gradient(circle, rgba(15,76,92,.4), transparent 65%)" }}/>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <LogoMark size={56} radius={14}/>
      <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 44, lineHeight: 1.04, letterSpacing: "-.03em", marginTop: 24 }}>Rent that <em style={{ color: "#C97A3A" }}>trusts itself.</em></div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)", marginTop: 14, lineHeight: 1.6, maxWidth: 280 }}>HRA receipts, move-in photo proof, deposit ledger, and digital agreements — for Indian landlords and tenants.</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 }}>
      <Button variant="accent" size="lg" fullWidth onClick={onContinue}>Continue with Google</Button>
      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 4 }}>By continuing you accept our terms & privacy policy.</div>
    </div>
  </div>
);

window.RBScreens = { TabBar, LandlordHome, TenantPayRent, TenantPaid, ProofScreen, Auth };
