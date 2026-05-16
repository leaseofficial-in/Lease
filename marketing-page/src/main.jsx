/* global React, ReactDOM */
const { useEffect: useEM } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "audience": "balanced",
  "accent": "#C97A3A",
  "motion": "cinema",
  "headline": "Rent that trusts itself."
}/*EDITMODE-END*/;

const App = () => {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  useEM(() => {
    document.documentElement.style.setProperty("--rb-accent", t.accent);
    document.body.dataset.audience = t.audience;
    document.body.dataset.motion = t.motion;
  }, [t.accent, t.audience, t.motion]);

  useEM(() => {
    const nav = document.querySelector(".nav");
    const onS = () => nav?.classList.toggle("scrolled", window.scrollY > 4);
    onS();
    window.addEventListener("scroll", onS, { passive: true });
    return () => window.removeEventListener("scroll", onS);
  }, []);

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo" aria-label="RentyBase">
            <span className="nav-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="32" height="32">
                <rect width="40" height="40" rx="9" fill="#0E1413"/>
                <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
                <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
                <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
                <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
              </svg>
            </span>
            <span className="nav-word">Renty<span className="ochre">Base</span></span>
          </a>
          <div className="nav-links">
            <a href="#proof">Proof</a>
            <a href="#features">Features</a>
            <a href="#start">Pricing</a>
          </div>
          <a className="btn btn-primary" href="signup.html" style={{padding:"8px 16px"}}>Start free</a>
        </div>
      </nav>

      <window.Hero accent={t.accent} audience={t.audience} headline={t.headline}/>
      <window.Cinema/>
      <window.ProofFilm/>
      <div id="features"><window.Features/></div>
      <window.PGHostel/>
      <window.Trust/>
      <window.Scores/>
      <window.Marketplace/>
      <window.FinalCTA/>

      <footer className="rb-foot">
        <div className="container foot-grid">
          <div className="foot-brand">
            <div className="foot-mark">
              <svg viewBox="0 0 40 40" width="40" height="40">
                <rect width="40" height="40" rx="9" fill="#0E1413"/>
                <path d="M20 7 L34 19 V31 a3 3 0 0 1 -3 3 H9 a3 3 0 0 1 -3 -3 V19 Z" fill="#F6F4EE"/>
                <path d="M13 34 V25 a7 7 0 0 1 14 0 V34 Z" fill="#0E1413"/>
                <rect x="13" y="33" width="14" height="1.4" fill="#C97A3A"/>
                <circle cx="20" cy="11" r="0.9" fill="#C97A3A"/>
              </svg>
              <span className="foot-word">Renty<span className="ochre">Base</span></span>
            </div>
            <p className="foot-tag">A shared, calm record between landlord and tenant. Built in Bengaluru, for India.</p>
            <div className="foot-mini">
              <span className="dot-pulse"/> Free during beta · v0.4
            </div>
          </div>

          <div className="foot-col">
            <div className="foot-h">Product</div>
            <a href="#proof">Move-in proof</a>
            <a href="#features">HRA receipts</a>
            <a href="#features">Repair ledger</a>
            <a href="#features">Leave &amp; License</a>
            <a href="#">PG floor plan</a>
            <a href="#">Tenant &amp; Landlord scores</a>
          </div>

          <div className="foot-col">
            <div className="foot-h">Coming soon</div>
            <a href="#">Rent listings</a>
            <a href="#">Sale listings</a>
            <a href="#">Society NOC</a>
            <a href="#">UPI auto-collect</a>
            <a href="#">Tax export · 26AS</a>
          </div>

          <div className="foot-col">
            <div className="foot-h">Company</div>
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="mailto:hello@rentybase.in">hello@rentybase.in</a>
          </div>
        </div>

        <div className="foot-rule"/>

        <div className="container foot-bot">
          <div className="foot-meta">© 2026 RentyBase Technologies Pvt Ltd · Section 10(13A) compliant · No data sold, ever.</div>
          <div className="foot-stamp">
            <svg viewBox="0 0 80 80" width="40" height="40">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#C97A3A" strokeWidth="1.5"/>
              <circle cx="40" cy="40" r="30" fill="none" stroke="#C97A3A" strokeWidth=".7" strokeDasharray="1.5 2"/>
              <text x="40" y="44" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="13" fill="#C97A3A">RB</text>
            </svg>
            <span>Sealed for India · Made by 4 humans in Bengaluru</span>
          </div>
        </div>
      </footer>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Motion" />
        <window.TweakRadio label="Intensity" value={t.motion}
          options={["calm", "cinema", "max"]}
          onChange={(v) => setTweak("motion", v)} />

        <window.TweakSection label="Audience" />
        <window.TweakRadio label="Hero focus" value={t.audience}
          options={["landlord", "balanced", "tenant"]}
          onChange={(v) => setTweak("audience", v)} />

        <window.TweakSection label="Accent" />
        <window.TweakColor label="Seal colour" value={t.accent}
          options={["#C97A3A", "#0F4C5C", "#1F7A55", "#B33A2E"]}
          onChange={(v) => setTweak("accent", v)} />

        <window.TweakSection label="Copy" />
        <window.TweakText label="Headline" value={t.headline}
          onChange={(v) => setTweak("headline", v)} />
      </window.TweaksPanel>
    </>
  );
};

// Audience dim CSS
const audStyle = document.createElement("style");
audStyle.textContent = `
  body[data-audience="landlord"] .hero-side.right { opacity: .35; transition: opacity .4s; }
  body[data-audience="tenant"] .hero-side:not(.right) { opacity: .35; transition: opacity .4s; }
  body[data-motion="calm"] .phone, body[data-motion="calm"] [class*="float"] { transform: none !important; transition: none !important; }
  body[data-motion="max"] .phone-stage { animation: hover-phone 5s ease-in-out infinite; }
  @keyframes hover-phone { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
`;
document.head.appendChild(audStyle);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
