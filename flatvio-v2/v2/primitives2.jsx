/* global React */

window.Phone2 = function Phone2({ children, time = "9:41" }) {
  return (
    <div className="ph2">
      <div className="island"></div>
      <div className="stat">
        <span>{time}</span>
        <span className="right">
          <span>●●●●</span><span>●</span><span>●●</span>
        </span>
      </div>
      <div className="body2">{children}</div>
    </div>
  );
};

window.TopBar2 = function TopBar2({ crumb, title, lead, trail, back }) {
  return (
    <div className="topbar2">
      <div className="lead">
        {back && <span className="back-chip">←</span>}
        <div style={{display:'flex', flexDirection:'column', gap:2}}>
          {crumb && <span className="crumb">{crumb}</span>}
          {title && <span className="h2-2">{title}</span>}
        </div>
        {lead}
      </div>
      <div className="trail">{trail}</div>
    </div>
  );
};

window.TabBar2 = function TabBar2({ tabs, active, fab }) {
  return (
    <div className="tabbar2">
      {tabs.map((t,i) => (
        <React.Fragment key={i}>
          {fab && i === Math.floor(tabs.length/2) && (
            <div className="tab fab">+</div>
          )}
          <div className={`tab ${i===active?'active':''}`}>
            <span className="icn">{t.ic}</span>
            <span>{t.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

window.Ring = function Ring({ value=66, size=110, stroke=10, label, sublabel }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value/100);
  return (
    <div className="ring" style={{width:size, height:size}}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#EFF1F4" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="#08090A" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="label">
        <div className="num" style={{fontSize:22, fontWeight:600}}>{label || value+"%"}</div>
        {sublabel && <div className="cap" style={{marginTop:2}}>{sublabel}</div>}
      </div>
    </div>
  );
};

window.Spark = function Spark({ points = [20,28,18,40,32,52,46,60], h=56, color="#08090A", fill=true }) {
  const max = Math.max(...points);
  const w = 200;
  const step = w / (points.length - 1);
  const path = points.map((p,i) => {
    const x = i*step;
    const y = h - (p/max)*(h-6) - 3;
    return `${i===0?'M':'L'} ${x} ${y}`;
  }).join(' ');
  const fillPath = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      {fill && <path d={fillPath} fill="rgba(8,9,10,0.06)" />}
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

window.HNote = function HNote({ children }) {
  return <div className="h-note">{children}</div>;
};

window.Cap = function Cap({ children }) { return <div className="cap">{children}</div>; };
