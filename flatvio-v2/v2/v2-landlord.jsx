/* global React, Phone2, TopBar2, TabBar2, Ring, Spark, HNote, Cap */

const LT = [
  { ic: "◐", label: "Home" },
  { ic: "₹", label: "Money" },
  { ic: "✦", label: "Repairs" },
  { ic: "○", label: "You" },
];

// ═══════════════════ LANDLORD HOME (the showpiece) ═══════════════════
window.V2_LandlordHome = function() {
  return (
    <Phone2>
      <TopBar2
        lead={<div style={{display:'flex', alignItems:'center', gap:10}}>
          <div className="av lg">AK</div>
          <div style={{display:'flex', flexDirection:'column'}}>
            <span className="cap">Portfolio</span>
            <span className="h2-2">Akhil</span>
          </div>
        </div>}
        trail={<><span className="gl outline">⌕</span><span className="gl outline">◔</span></>}
      />
      <div className="body2 padded">
        {/* HERO ink card with ring + breakdown */}
        <div className="ink-card" style={{padding:'24px 22px'}}>
          <div className="grain"></div>
          <div className="row2 between" style={{position:'relative'}}>
            <span className="cap" style={{color:'rgba(255,255,255,0.55)'}}>April 2026 · Collection</span>
            <span className="cap" style={{color:'rgba(255,255,255,0.55)'}}>Day 30/30</span>
          </div>
          <div className="row2" style={{marginTop:14, position:'relative', alignItems:'center', gap:18}}>
            <div className="ring" style={{width:108, height:108, flexShrink:0}}>
              <svg viewBox="0 0 108 108" style={{width:'100%', height:'100%', transform:'rotate(-90deg)'}}>
                <circle cx="54" cy="54" r="48" stroke="rgba(255,255,255,0.15)" strokeWidth="9" fill="none"/>
                <circle cx="54" cy="54" r="48" stroke="#fff" strokeWidth="9" fill="none"
                  strokeDasharray={2*Math.PI*48} strokeDashoffset={2*Math.PI*48*0.34} strokeLinecap="round"/>
              </svg>
              <div className="label">
                <div className="num" style={{fontSize:24, fontWeight:600, color:'#fff'}}>66<span style={{fontSize:14}}>%</span></div>
                <div className="cap" style={{color:'rgba(255,255,255,0.55)', marginTop:2}}>COLLECTED</div>
              </div>
            </div>
            <div className="grow" style={{display:'flex', flexDirection:'column', gap:10}}>
              <div>
                <div className="cap" style={{color:'rgba(255,255,255,0.5)'}}>Of</div>
                <div className="display num" style={{color:'#fff', fontSize:34, lineHeight:1}}>₹84,000</div>
              </div>
              <div className="row2" style={{gap:14}}>
                <div>
                  <div style={{fontSize:18, fontWeight:600, color:'#fff'}} className="num">₹56k</div>
                  <div className="cap" style={{color:'rgba(255,255,255,0.5)'}}>PAID</div>
                </div>
                <div>
                  <div style={{fontSize:18, fontWeight:600, color:'#fff'}} className="num">₹10k</div>
                  <div className="cap" style={{color:'#FFC56B'}}>OVERDUE</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar — what needs attention */}
        <div className="card2" style={{padding:0, overflow:'hidden', borderColor:'var(--warn)', borderWidth:1.5}}>
          <div style={{padding:'14px 18px', background:'var(--warn-soft)'}}>
            <div className="row2 between">
              <div className="row2" style={{gap:8}}>
                <span className="gl sm" style={{background:'var(--warn)', color:'#fff'}}>!</span>
                <div>
                  <div className="h3-2" style={{color:'var(--warn)'}}>3 actions for you</div>
                  <div className="body-2" style={{fontSize:11, marginTop:1, color:'var(--warn)'}}>tap to clear queue</div>
                </div>
              </div>
              <span style={{color:'var(--warn)', fontSize:18}}>›</span>
            </div>
          </div>
          <div style={{padding:'4px 18px'}}>
            {[
              ["◇","Review move-in proof","Lakeview · 14 photos"],
              ["!","Greenwood rent overdue","5 days · ₹34,000"],
              ["✦","Repair: Leaking tap","Sunshine · raised 2h ago"],
            ].map(([i,t,s],k)=>(
              <div key={k} className="row2" style={{padding:'12px 0', borderBottom: k<2?'1px solid var(--line-soft)':'none'}}>
                <div className="gl sm">{i}</div>
                <div className="grow">
                  <div className="h3-2">{t}</div>
                  <div className="body-2" style={{fontSize:11.5, marginTop:1}}>{s}</div>
                </div>
                <span style={{color:'var(--muted)'}}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bento — at a glance */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <div className="card2" style={{padding:16}}>
            <Cap>Properties</Cap>
            <div className="display num" style={{fontSize:36, marginTop:6}}>3</div>
            <div className="row2" style={{gap:6, marginTop:6}}>
              <span className="chip good" style={{height:20, fontSize:10}}>2 active</span>
              <span className="chip warn" style={{height:20, fontSize:10}}>1 review</span>
            </div>
          </div>
          <div className="card2" style={{padding:16}}>
            <Cap>YTD income</Cap>
            <div className="display num" style={{fontSize:30, marginTop:6}}>₹3.4L</div>
            <Spark points={[28,30,32,30,32,32,32,32]} h={28} />
          </div>
        </div>

        {/* Properties list */}
        <div>
          <div className="row2 between">
            <Cap>Your rentals</Cap>
            <span className="cap" style={{color:'var(--ink)'}}>+ ADD</span>
          </div>
          <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:10}}>
            {[
              ["Sunshine Apt · 4B","Indiranagar · 2BHK","Priya Sharma","32,000","good","Paid 04 Apr"],
              ["Lakeview Studio","HSR · 1BHK","Rohit Mehta","18,000","warn","Review proof"],
              ["Greenwood House","Whitefield · 3BHK","Anil Kumar","34,000","bad","5d overdue"],
            ].map(([n,a,t,r,c,s],i)=>(
              <div key={i} className="card2" style={{padding:16}}>
                <div className="row2 between">
                  <div className="grow">
                    <div className="h3-2">{n}</div>
                    <div className="body-2" style={{fontSize:12, marginTop:1}}>{a}</div>
                  </div>
                  <span className={`chip ${c}`} style={{height:22, fontSize:10}}>
                    <span className="dot"></span>{s}
                  </span>
                </div>
                <div className="row2" style={{marginTop:14, paddingTop:12, borderTop:'1px solid var(--line-soft)'}}>
                  <div className="grow">
                    <div className="cap">TENANT</div>
                    <div style={{fontSize:13, fontWeight:500, marginTop:2}}>{t}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="cap">MONTHLY</div>
                    <div className="num" style={{fontSize:15, fontWeight:600, marginTop:2}}>₹{r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar2 tabs={LT} active={0} fab />
    </Phone2>
  );
};

// ═══════════════════ LANDLORD MONEY (collection view) ═══════════════════
window.V2_LandlordMoney = function() {
  return (
    <Phone2>
      <TopBar2 lead={<div><span className="cap">Money</span><div className="h2-2">Collection</div></div>}
        trail={<span className="gl outline">⤴</span>} />
      <div className="body2 padded">
        <div className="seg2">
          <span className="opt active">Month</span>
          <span className="opt">YTD</span>
          <span className="opt">All time</span>
        </div>

        <div>
          <Cap>April 2026</Cap>
          <div className="display num" style={{fontSize:60, lineHeight:1, marginTop:4}}>₹56,000</div>
          <div className="serif-i" style={{color:'var(--ink-3)', fontSize:16}}>of ₹84,000 expected</div>
        </div>

        <div className="card2" style={{padding:18}}>
          <Cap>By property</Cap>
          <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:12}}>
            {[
              ["Sunshine 4B", "₹32,000", "₹32,000", 100, "good"],
              ["Lakeview", "₹0", "₹18,000", 0, "warn"],
              ["Greenwood", "₹24,000", "₹34,000", 71, "bad"],
            ].map(([n,paid,exp,pct,c],i)=>(
              <div key={i}>
                <div className="row2 between" style={{marginBottom:6}}>
                  <span style={{fontSize:13, fontWeight:500}}>{n}</span>
                  <span className="num" style={{fontSize:13, fontWeight:600}}>{paid} <span style={{color:'var(--muted)', fontWeight:400}}>/ {exp}</span></span>
                </div>
                <div style={{height:6, background:'var(--fill)', borderRadius:99, overflow:'hidden'}}>
                  <div style={{height:'100%', width:`${pct}%`, background:c==='good'?'var(--ink)':c==='warn'?'var(--warn)':'var(--bad)', borderRadius:99}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Cap>Last 6 months</Cap>
          <div className="card2" style={{padding:18, marginTop:10}}>
            <Spark points={[68,72,80,78,84,84]} h={70} />
            <div className="row2 between" style={{marginTop:8}}>
              {["Nov","Dec","Jan","Feb","Mar","Apr"].map(m=>(
                <span key={m} className="cap">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TabBar2 tabs={LT} active={1} fab />
    </Phone2>
  );
};

// ═══════════════════ PROOF REVIEW (delight moment) ═══════════════════
window.V2_ProofReview = function() {
  return (
    <Phone2>
      <TopBar2 crumb="Lakeview · move-in" title="" back trail={<span className="gl outline">⋯</span>} />
      <div className="body2 padded">
        <div>
          <Cap>14 photos · Submitted 12 Mar</Cap>
          <div className="display" style={{fontSize:30, marginTop:4, lineHeight:1.05}}>
            Did Priya capture <span className="serif-i">everything</span>?
          </div>
        </div>

        <div className="row2" style={{gap:6, overflowX:'auto', flexWrap:'nowrap'}}>
          <span className="chip solid">All · 14</span>
          <span className="chip">Living · 4</span>
          <span className="chip">Kitchen · 3</span>
          <span className="chip">Bed · 4</span>
          <span className="chip">Bath · 2</span>
          <span className="chip">Bal · 1</span>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          {[1,2,3,4,5,6].map((i)=>(
            <div key={i} className="ph2-img" style={{height:120, position:'relative'}}>
              R{i}
              {i===2 && <span className="chip bad" style={{position:'absolute', top:8, left:8, height:22, fontSize:10}}>📌 Note</span>}
            </div>
          ))}
        </div>

        <div className="card2 fill" style={{padding:14}}>
          <div className="row2">
            <div className="av">PS</div>
            <div className="grow">
              <div className="h3-2">Priya added a note on Wall B</div>
              <div className="body-2" style={{fontSize:12, marginTop:1}}>"Existing crack — already there at handover."</div>
            </div>
          </div>
        </div>

        <HNote><strong>FLOW:</strong> Approve → rental status flips to <code>active</code>, first <code>rent_payment</code> auto-created. Reject → opens dispute thread + WhatsApp to tenant.</HNote>

        <div className="row2" style={{gap:10, marginTop:'auto'}}>
          <button className="btn2 ghost grow">Dispute</button>
          <button className="btn2 primary grow">Approve all <span className="arrow">→</span></button>
        </div>
      </div>
    </Phone2>
  );
};

// ═══════════════════ AUTH ═══════════════════

// Reusable Google "G" mark
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

window.V2_Welcome = function() {
  return (
    <Phone2>
      <div className="body2" style={{padding:'40px 28px 28px', justifyContent:'space-between'}}>
        <div className="row2 between">
          <span className="cap">FLATVIO</span>
          <span className="cap">EST 2026</span>
        </div>
        <div>
          <div className="display" style={{fontSize:60, lineHeight:0.95}}>
            Renting,<br/>finally <span className="serif-i">trustworthy.</span>
          </div>
          <div className="body-2" style={{marginTop:18, fontSize:14, maxWidth:280}}>
            Rent collection, deposits, move-in proof and repairs — for landlords and tenants in India.
          </div>
        </div>
        <div className="ph2-img" style={{height:180}}>HERO ILLO · 3-FRAME ANIMATION</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          <button className="btn2 ghost full lg" style={{background:'#fff', borderColor:'var(--line)', color:'var(--ink)', fontWeight:500}}>
            <GoogleG />
            Continue with Google
          </button>
          <button className="btn2 ghost full" style={{borderColor:'var(--line)'}}>
            I have an invite link
          </button>
          <div className="cap" style={{textAlign:'center', marginTop:6}}>BY CONTINUING · TERMS · PRIVACY</div>
        </div>
      </div>
    </Phone2>
  );
};

// New: Sign-in screen — Google primary, phone parked
window.V2_SignIn = function() {
  return (
    <Phone2>
      <TopBar2 back />
      <div className="body2 padded">
        <Cap>Step 1 of 2</Cap>
        <div className="display" style={{fontSize:46, lineHeight:1.04, marginTop:4}}>
          Sign in <span className="serif-i">to Flatvio.</span>
        </div>
        <div className="body-2" style={{fontSize:13, maxWidth:300}}>
          We use your Google account to keep things simple — no passwords, no OTP shuffle.
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:12}}>
          <button className="btn2 ghost full lg" style={{background:'#fff', borderColor:'var(--line)', color:'var(--ink)', fontWeight:500, justifyContent:'center'}}>
            <GoogleG />
            Continue with Google
          </button>

          <div className="row2" style={{gap:10, alignItems:'center', margin:'4px 0'}}>
            <div style={{flex:1, height:1, background:'var(--line-soft)'}}></div>
            <div className="cap">OR</div>
            <div style={{flex:1, height:1, background:'var(--line-soft)'}}></div>
          </div>

          {/* Phone — visually parked */}
          <button
            className="btn2 ghost full"
            style={{
              borderStyle:'dashed',
              borderColor:'var(--line)',
              color:'var(--muted)',
              background:'transparent',
              cursor:'not-allowed',
              justifyContent:'space-between',
            }}
            disabled
          >
            <span style={{display:'flex', alignItems:'center', gap:8}}>
              <span className="gl sm dashed">📱</span>
              Continue with mobile
            </span>
            <span className="chip outline" style={{fontSize:9, height:18, padding:'0 7px', borderColor:'var(--line)'}}>SOON</span>
          </button>
        </div>

        <HNote><strong>SUPABASE AUTH:</strong> <code>signInWithOAuth({"{ provider: 'google' }"})</code> · redirect to <code>app/auth/callback</code> · then route to <code>/role</code> if first-time, else home.<br/>Phone OTP path stubbed in <code>auth.ts</code> behind <code>FF_PHONE_AUTH</code> flag.</HNote>

        <div style={{flex:1}}></div>
        <div className="cap" style={{textAlign:'center'}}>BY CONTINUING · TERMS · PRIVACY · GDPR</div>
      </div>
    </Phone2>
  );
};

// Optional: post-Google "complete profile" — collects name + role hint
window.V2_GoogleProfile = function() {
  return (
    <Phone2>
      <TopBar2 back />
      <div className="body2 padded">
        <div className="row2" style={{gap:14, marginTop:8}}>
          <div className="av lg" style={{background:'#fff', border:'1px solid var(--line)'}}>
            <GoogleG />
          </div>
          <div className="grow">
            <div className="cap">SIGNED IN AS</div>
            <div className="h2-2" style={{marginTop:2}}>akhil@gmail.com</div>
          </div>
          <span className="chip good"><span className="dot"></span>Verified</span>
        </div>

        <div style={{marginTop:12}}>
          <div className="display" style={{fontSize:38, lineHeight:1.05}}>
            Almost there <span className="serif-i">— one detail.</span>
          </div>
        </div>

        <div className="in2">
          <span className="lab">FULL NAME</span>
          <div className="box focused">
            <span style={{color:'var(--ink)'}}>Akhil Kumar</span>
          </div>
        </div>
        <div className="in2">
          <span className="lab">MOBILE (OPTIONAL)</span>
          <div className="box">
            <span className="ph">+91 — for WhatsApp updates</span>
          </div>
          <span className="cap" style={{textTransform:'none', letterSpacing:0, fontSize:10, color:'var(--muted)'}}>You can add this later in profile.</span>
        </div>

        <HNote><strong>BACKEND:</strong> upsert <code>profiles</code> row keyed by <code>auth.uid()</code> · email auto-filled from Google · then route to <code>/role</code>.</HNote>

        <div style={{flex:1}}></div>
        <button className="btn2 primary full lg">Continue <span className="arrow">→</span></button>
      </div>
    </Phone2>
  );
};

window.V2_OTP = function() {
  return (
    <Phone2>
      <TopBar2 back />
      <div className="body2 padded">
        <Cap>Step 2 of 2</Cap>
        <div className="display" style={{fontSize:42, lineHeight:1.05, marginTop:4}}>
          Six digits<br/><span className="serif-i">and you're in.</span>
        </div>
        <div className="body-2" style={{fontSize:13}}>Sent to <strong>+91 98XXX XXX XX</strong> · <span style={{color:'var(--accent)', fontWeight:500}}>change</span></div>
        <div className="otp2" style={{marginTop:20}}>
          <div className="c">4</div><div className="c">2</div><div className="c">8</div>
          <div className="c f">|</div><div className="c"></div><div className="c"></div>
        </div>
        <div className="cap" style={{textAlign:'center', marginTop:12}}>RESEND IN 0:24</div>
        <div style={{flex:1}}></div>
        <HNote><strong>DEV:</strong> auto-fills test OTP from <code>devAuth.ts</code> in dev mode.</HNote>
        <button className="btn2 primary full lg">Verify <span className="arrow">→</span></button>
      </div>
    </Phone2>
  );
};

window.V2_Role = function() {
  return (
    <Phone2>
      <TopBar2 />
      <div className="body2 padded">
        <Cap>Welcome to Flatvio</Cap>
        <div className="display" style={{fontSize:42, marginTop:4, lineHeight:1.05}}>
          How will you<br/><span className="serif-i">use the app?</span>
        </div>
        <div className="body-2" style={{fontSize:13}}>This <strong>can't be changed</strong> later.</div>

        <div className="ink-card" style={{padding:24, marginTop:8}}>
          <div className="grain"></div>
          <div className="row2 between" style={{position:'relative'}}>
            <div className="gl" style={{background:'rgba(255,255,255,0.15)', color:'#fff'}}>🏠</div>
            <span className="chip" style={{background:'#fff', color:'var(--ink)'}}>Selected</span>
          </div>
          <div className="h1-2" style={{color:'#fff', marginTop:18}}>I'm a Landlord</div>
          <div className="body-2" style={{color:'rgba(255,255,255,0.7)', fontSize:13, marginTop:4}}>
            Create rentals, invite tenants, collect rent, manage deposits & repairs.
          </div>
        </div>

        <div className="card2" style={{padding:24}}>
          <div className="gl">👤</div>
          <div className="h1-2" style={{marginTop:18}}>I'm a Tenant</div>
          <div className="body-2" style={{fontSize:13, marginTop:4}}>
            Join via invite, pay rent, upload move-in photos, raise repairs.
          </div>
        </div>

        <div style={{flex:1}}></div>
        <button className="btn2 primary full lg">Continue as Landlord <span className="arrow">→</span></button>
      </div>
    </Phone2>
  );
};

// ═══════════════════ PROOF UPLOAD (tenant) ═══════════════════
window.V2_ProofUpload = function() {
  return (
    <Phone2>
      <TopBar2 crumb="Move-in proof · 9/14" title="" back />
      <div className="body2 padded">
        <div style={{height:6, background:'var(--fill)', borderRadius:99, overflow:'hidden'}}>
          <div style={{width:'64%', height:'100%', background:'var(--ink)', borderRadius:99}}></div>
        </div>

        <div className="row2" style={{gap:6, overflowX:'auto', flexWrap:'nowrap'}}>
          <span className="chip good">Living ✓</span>
          <span className="chip good">Kitchen ✓</span>
          <span className="chip solid">Bed 1 · 2/4</span>
          <span className="chip">Bath</span>
          <span className="chip">Balcony</span>
        </div>

        <div>
          <div className="display" style={{fontSize:32, lineHeight:1.05}}>
            Bedroom 1
          </div>
          <div className="serif-i" style={{fontSize:16, color:'var(--ink-3)'}}>
            Capture all walls + any pre-existing damage.
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <div className="ph2-img" style={{height:140, position:'relative'}}>
            WALL A
            <span className="gl sm" style={{position:'absolute', top:8, right:8, background:'#fff'}}>✎</span>
          </div>
          <div className="ph2-img" style={{height:140, position:'relative'}}>
            WALL B
            <span className="chip bad" style={{position:'absolute', top:8, left:8, height:22, fontSize:10}}>📌 Crack</span>
          </div>
          <div className="card2 dashed" style={{height:140, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:0}}>
            <div className="gl lg dashed">+</div>
            <div className="cap" style={{marginTop:8}}>ADD PHOTO</div>
          </div>
          <div className="card2 dashed" style={{height:140, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:0}}>
            <div className="gl lg dashed">+</div>
            <div className="cap" style={{marginTop:8}}>ADD PHOTO</div>
          </div>
        </div>

        <HNote><strong>UPLOAD:</strong> compress 1200px / 80% JPEG · <code>proof-photos</code> bucket · auto-tag <code>room_label</code>.</HNote>

        <div style={{flex:1}}></div>
        <div className="row2" style={{gap:10}}>
          <button className="btn2 ghost grow">← Living</button>
          <button className="btn2 primary grow">Bath <span className="arrow">→</span></button>
        </div>
      </div>
    </Phone2>
  );
};

// ═══════════════════ REPAIRS (chat-like) ═══════════════════
window.V2_Repairs = function() {
  return (
    <Phone2>
      <TopBar2 lead={<div><span className="cap">Repairs</span><div className="h2-2">2 active</div></div>}
        trail={<button className="btn2 sm primary">+ Raise</button>} />
      <div className="body2 padded">
        <div className="seg2">
          <span className="opt active">Active · 2</span>
          <span className="opt">Resolved</span>
        </div>

        <div className="card2" style={{padding:18, borderColor:'var(--bad)', borderWidth:1.5}}>
          <div className="row2 between">
            <span className="chip bad"><span className="dot"></span>Urgent</span>
            <span className="cap">2H AGO</span>
          </div>
          <div className="display" style={{fontSize:24, marginTop:10, lineHeight:1.15}}>Leaking kitchen tap</div>
          <div className="body-2" style={{fontSize:13, marginTop:4}}>Water dripping continuously since morning. Already placed a bucket.</div>
          <div className="row2" style={{gap:6, marginTop:12}}>
            <div className="ph2-img" style={{width:64, height:64, fontSize:9}}>IMG</div>
            <div className="ph2-img" style={{width:64, height:64, fontSize:9}}>IMG</div>
          </div>
          <div className="divider" style={{margin:'14px 0'}}></div>
          <div className="row2 between">
            <span className="cap">AWAITING LANDLORD</span>
            <span className="cap" style={{color:'var(--ink)'}}>OPEN THREAD →</span>
          </div>
        </div>

        <div className="card2" style={{padding:18}}>
          <div className="row2 between">
            <span className="chip warn"><span className="dot"></span>In progress</span>
            <span className="cap">3 DAYS AGO</span>
          </div>
          <div className="h1-2" style={{marginTop:10}}>AC not cooling</div>
          <div className="body-2" style={{fontSize:13, marginTop:4}}>Technician scheduled · tomorrow 10am</div>
        </div>
      </div>
      <TabBar2 tabs={[
        { ic: "◐", label: "Home" }, { ic: "₹", label: "Rent" },
        { ic: "◇", label: "Proof" }, { ic: "✦", label: "Repairs" }, { ic: "○", label: "You" },
      ]} active={3} />
    </Phone2>
  );
};

// ═══════════════════ EMPTY STATES ═══════════════════
window.V2_EmptyLandlord = function() {
  return (
    <Phone2>
      <TopBar2 lead={<div><span className="cap">Welcome</span><div className="h2-2">Akhil</div></div>} trail={<span className="gl outline">◔</span>} />
      <div className="body2 padded" style={{justifyContent:'center'}}>
        <div className="display" style={{fontSize:42, lineHeight:1.05}}>
          One property,<br/><span className="serif-i">a thousand details.</span>
        </div>
        <div className="body-2" style={{fontSize:14, maxWidth:280}}>
          Set up your first rental in under 2 minutes. Define terms, send an invite, done.
        </div>
        <div className="ph2-img" style={{height:160}}>WELCOME ILLO</div>
        <button className="btn2 primary full lg">Add your first rental <span className="arrow">→</span></button>
        <div className="row2" style={{gap:10}}>
          <button className="btn2 ghost grow sm">📺 Demo</button>
          <button className="btn2 ghost grow sm">📖 Guide</button>
        </div>
      </div>
      <TabBar2 tabs={LT} active={0} fab />
    </Phone2>
  );
};

window.V2_EmptyTenant = function() {
  return (
    <Phone2>
      <TopBar2 lead={<div><span className="cap">Welcome</span><div className="h2-2">Priya</div></div>} />
      <div className="body2 padded" style={{justifyContent:'center', paddingTop:60}}>
        <div className="display" style={{fontSize:38, lineHeight:1.05}}>
          Waiting for<br/><span className="serif-i">your invite.</span>
        </div>
        <div className="body-2" style={{fontSize:14, maxWidth:280}}>
          Ask your landlord to share an invite link or QR code via WhatsApp. It expires in 72 hours.
        </div>

        <div className="card2 dashed" style={{padding:32, textAlign:'center', marginTop:8}}>
          <div className="gl xl dashed" style={{margin:'0 auto'}}>◇</div>
          <div className="h2-2" style={{marginTop:12}}>Scan QR or paste link</div>
          <div className="body-2" style={{fontSize:12, marginTop:4}}>Either works.</div>
        </div>

        <button className="btn2 primary full lg">I have an invite <span className="arrow">→</span></button>
      </div>
    </Phone2>
  );
};

// ═══════════════════ OVERDUE (smart hero variant) ═══════════════════
window.V2_TenantOverdue = function() {
  return (
    <Phone2>
      <TopBar2
        lead={<div style={{display:'flex', alignItems:'center', gap:10}}>
          <div className="av lg">PS</div>
          <div><span className="cap">Sunshine Apt 4B</span><div className="h2-2">Priya</div></div>
        </div>}
        trail={<span className="gl outline">◔</span>}
      />
      <div className="body2 padded">
        <div className="ink-card" style={{padding:'24px 22px', background:'#3a1715', border:'1px solid var(--bad)'}}>
          <div className="grain"></div>
          <div className="row2 between" style={{position:'relative'}}>
            <span className="cap" style={{color:'#FFB4B0'}}>April rent · 5 days overdue</span>
            <span className="chip" style={{background:'rgba(255,255,255,0.12)', color:'#FFB4B0'}}>
              <span className="dot"></span>Late
            </span>
          </div>
          <div className="display num" style={{color:'#fff', fontSize:60, marginTop:14, lineHeight:0.95}}>32,250</div>
          <div className="serif-i" style={{color:'rgba(255,255,255,0.65)', fontSize:16, marginTop:-2}}>incl. ₹250 late fee</div>
          <button className="btn2 invert full" style={{marginTop:18, height:54}}>Pay now to clear <span className="arrow">→</span></button>
          <div className="cap" style={{color:'rgba(255,255,255,0.5)', textAlign:'center', marginTop:10}}>+₹50/DAY UNTIL CLEARED</div>
        </div>
        <HNote><strong>STATE:</strong> cron flips <code>rent_payments.status</code> to <code>overdue</code> at due_day+1 · WhatsApp ping via Twilio edge fn.</HNote>
      </div>
      <TabBar2 tabs={[
        { ic: "◐", label: "Home" }, { ic: "₹", label: "Rent" },
        { ic: "◇", label: "Proof" }, { ic: "✦", label: "Repairs" }, { ic: "○", label: "You" },
      ]} active={0} />
    </Phone2>
  );
};
