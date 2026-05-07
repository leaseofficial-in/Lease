/* global React, ReactDOM, RBScreens, IOSDevice */
const { useState } = React;

function AppDemo() {
  const [screen, setScreen] = useState("auth");
  const [tab, setTab] = useState("home");
  const { TabBar, LandlordHome, TenantPayRent, TenantPaid, ProofScreen, Auth } = RBScreens;

  let body;
  if (screen === "auth") body = <Auth onContinue={() => setScreen("home")}/>;
  else if (screen === "pay") body = <TenantPayRent onBack={() => setScreen("home")} onPaid={() => setScreen("paid")}/>;
  else if (screen === "paid") body = <TenantPaid onBack={() => setScreen("home")}/>;
  else if (screen === "proof") body = <ProofScreen onBack={() => setScreen("home")}/>;
  else body = <LandlordHome />;

  const showTabs = screen !== "auth" && screen !== "pay" && screen !== "paid" && screen !== "proof";

  return (
    <IOSDevice width={390} height={780}>
      <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#F6F4EE" }}>
        {body}
        {showTabs && <TabBar active={tab} onChange={(t) => {
          setTab(t);
          if (t === "payments") setScreen("pay");
          else if (t === "proof") setScreen("proof");
          else setScreen("home");
        }}/>}
      </div>
    </IOSDevice>
  );
}

function Stage() {
  return (
    <div style={{ background: "#EFEDE5", minHeight: "100vh", padding: "40px 24px", fontFamily: "DM Sans, sans-serif", color: "#0E1413" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0F4C5C", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 12%, rgba(201,122,58,.32), transparent 55%)" }}/>
            <svg width="22" height="22" viewBox="0 0 512 512" style={{ position: "relative", zIndex: 1 }}><g fill="#F6F4EE"><path d="M138 108 h120 c52 0 88 32 88 80 0 36 -20 62 -52 74 l68 142 h-66 l-60 -130 h-44 v130 h-54 z M192 156 v124 h60 c30 0 50 -22 50 -50 v-24 c0 -28 -20 -50 -50 -50 z"/><circle cx="384" cy="396" r="10" fill="#C97A3A"/></g></svg>
          </div>
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 32, letterSpacing: "-.02em" }}>RentyBase<span style={{ fontStyle: "italic", color: "#C97A3A" }}>.</span> <span style={{ fontSize: 14, color: "#5C645F", fontFamily: "DM Sans" }}>app UI kit</span></div>
        </div>
        <div style={{ fontSize: 13, color: "#5C645F", marginBottom: 24 }}>Tap <b>Payments</b> in the tab bar to flow through pay → paid. Tap <b>Proof</b> for the move-in proof screen.</div>
        <AppDemo/>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Stage/>);
