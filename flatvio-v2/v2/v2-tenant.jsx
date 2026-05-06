/* global React, Phone2, TopBar2, TabBar2, Ring, Spark, HNote, Cap */

const TT = [
  { ic: "◐", label: "Home" },
  { ic: "₹", label: "Rent" },
  { ic: "◇", label: "Proof" },
  { ic: "✦", label: "Repairs" },
  { ic: "○", label: "You" },
];

// ═══════════════════ TENANT HOME (the hero) ═══════════════════
window.V2_TenantHome = function() {
  return (
    <Phone2>
      <TopBar2
        crumb="Sunshine Apt · 4B"
        title=""
        lead={<div style={{display:'flex', alignItems:'center', gap:10, marginLeft:0}}>
          <div className="av lg">PS</div>
          <div style={{display:'flex', flexDirection:'column'}}>
            <span className="cap">Good evening</span>
            <span className="h2-2">Priya</span>
          </div>
        </div>}
        trail={<><span className="gl outline">⌕</span><span className="gl outline">◔</span></>}
      />
      <div className="body2 padded">
        {/* Smart Hero — morphs based on state. Currently: Pay rent due in 2d */}
        <div className="ink-card" style={{padding:'24px 22px 22px'}}>
          <div className="grain"></div>
          <div className="row2 between" style={{position:'relative'}}>
            <span className="cap" style={{color:'rgba(255,255,255,0.55)'}}>April 2026 · Due in 2 days</span>
            <span className="chip" style={{background:'rgba(255,255,255,0.12)', color:'#fff'}}>
              <span className="dot" style={{background:'#FFC56B'}}></span>Pending
            </span>
          </div>
          <div style={{position:'relative', marginTop:16}}>
            <div style={{display:'flex', alignItems:'baseline', gap:6}}>
              <span className="display num" style={{color:'#fff', fontSize:64, lineHeight:0.95}}>32,000</span>
            </div>
            <div className="serif-i" style={{color:'rgba(255,255,255,0.6)', fontSize:18, marginTop:-4}}>rupees, to Akhil K.</div>
          </div>
          <div className="row2" style={{marginTop:22, gap:8, position:'relative'}}>
            <button className="btn2 invert" style={{flex:1, height:54}}>Pay now <span className="arrow">→</span></button>
            <button className="gl" style={{width:54, height:54, background:'rgba(255,255,255,0.12)', color:'#fff', border:'none'}}>◔</button>
          </div>
        </div>

        {/* Bento row — context tiles */}
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:10}}>
          <div className="card2" style={{padding:16}}>
            <Cap>On-time streak</Cap>
            <div style={{marginTop:8, display:'flex', alignItems:'baseline', gap:4}}>
              <span className="display num" style={{fontSize:42}}>11</span>
              <span className="body-2">months</span>
            </div>
            <Spark points={[20,30,28,42,35,50,48,62,55,70,68,80]} h={36} />
          </div>
          <div className="card2" style={{padding:16}}>
            <Cap>Deposit held</Cap>
            <div className="display num" style={{fontSize:28, marginTop:8}}>₹96k</div>
            <div className="chip good" style={{marginTop:8, height:22, fontSize:10, padding:'0 8px'}}>
              <span className="dot"></span>0 deductions
            </div>
          </div>
        </div>

        {/* Quick links — flat editorial list */}
        <div>
          <Cap>Your rental</Cap>
          <div style={{marginTop:10, display:'flex', flexDirection:'column'}}>
            {[
              ["Move-in proof", "14 photos · approved 12 Mar", "good"],
              ["Rental agreement", "11-month · signed", ""],
              ["Repairs", "1 in progress · Leaking tap", "warn"],
              ["Receipts & HRA", "12 receipts available", ""],
            ].map(([t,s,c],i) => (
              <div key={i} style={{display:'flex', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--line-soft)'}}>
                <div className="grow">
                  <div className="h3-2">{t}</div>
                  <div className="body-2" style={{marginTop:2, fontSize:12}}>{s}</div>
                </div>
                {c && <span className={`chip ${c}`} style={{marginRight:10}}>{c==='good'?'✓':'•'}</span>}
                <span style={{color:'var(--muted)', fontSize:18}}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Landlord card */}
        <div className="card2 fill" style={{padding:14}}>
          <div className="row2">
            <div className="av">AK</div>
            <div className="grow">
              <div className="h3-2">Akhil K. <span className="serif-i" style={{color:'var(--muted)', fontSize:13, marginLeft:4}}>your landlord</span></div>
              <div className="body-2" style={{fontSize:12, marginTop:1}}>+91 98XXX XXX XX</div>
            </div>
            <button className="gl" style={{background:'var(--bg)'}}>📞</button>
            <button className="gl" style={{background:'var(--bg)'}}>💬</button>
          </div>
        </div>
      </div>
      <TabBar2 tabs={TT} active={0} />
    </Phone2>
  );
};

// ═══════════════════ PAY RENT ═══════════════════
window.V2_PayRent = function() {
  return (
    <Phone2>
      <TopBar2 crumb="Pay rent" title="" back trail={<span className="gl outline">?</span>} />
      <div className="body2 padded">
        <div>
          <Cap>April 2026</Cap>
          <div className="display num" style={{fontSize:72, marginTop:6, lineHeight:0.95}}>₹32,000</div>
          <div className="serif-i" style={{fontSize:17, color:'var(--ink-3)', marginTop:2}}>to Akhil K. · Sunshine Apt 4B</div>
        </div>

        <div className="card2" style={{padding:0, overflow:'hidden'}}>
          {[
            ["UPI", "GPay · PhonePe · Paytm", "instant", true],
            ["Card", "Credit / Debit", "+1.8% fee", false],
            ["Net banking", "All major banks", "free", false],
          ].map(([t,s,m,sel],i) => (
            <div key={i} className="row2" style={{padding:'18px 18px', borderBottom: i<2?'1px solid var(--line-soft)':'none'}}>
              <div className={`gl ${sel?'ink':''}`}>{sel?'●':'○'}</div>
              <div className="grow">
                <div className="h3-2">{t}</div>
                <div className="body-2" style={{fontSize:12, marginTop:1}}>{s}</div>
              </div>
              <span className="chip outline" style={{fontSize:10}}>{m}</span>
            </div>
          ))}
        </div>

        <div className="card2 fill" style={{padding:18}}>
          {[["Rent","₹ 32,000"],["Late fee","—"],["Platform fee","Waived"]].map(([k,v],i)=>(
            <div key={i} className="row2 between" style={{padding:'4px 0'}}>
              <span className="body-2" style={{fontSize:13}}>{k}</span>
              <span className="num" style={{fontSize:14, fontWeight:500}}>{v}</span>
            </div>
          ))}
          <div className="divider" style={{margin:'10px 0'}}></div>
          <div className="row2 between">
            <span className="h3-2">Total</span>
            <span className="display num" style={{fontSize:26}}>₹32,000</span>
          </div>
        </div>

        <HNote><strong>RAZORPAY:</strong> Edge fn <code>create-payment-order</code> · open SDK · <code>verifyAndRecordPayment</code> · insert <code>rent_payments</code> row.</HNote>

        <div style={{flex:1}}></div>
        <button className="btn2 primary full lg">Pay ₹32,000 securely <span className="arrow">→</span></button>
        <div className="cap" style={{textAlign:'center'}}>SECURED BY RAZORPAY · 256-BIT</div>
      </div>
    </Phone2>
  );
};

// ═══════════════════ PAY SUCCESS ═══════════════════
window.V2_PaySuccess = function() {
  return (
    <Phone2>
      <div className="body2 padded" style={{paddingTop:60, justifyContent:'space-between'}}>
        <div></div>
        <div style={{textAlign:'center'}}>
          <div className="gl ink" style={{width:96, height:96, fontSize:36, margin:'0 auto', borderRadius:'999px'}}>✓</div>
          <div className="display" style={{fontSize:48, marginTop:28, letterSpacing:'-0.03em'}}>Paid <span className="serif-i" style={{color:'var(--ink-3)'}}>in full.</span></div>
          <div className="body-2" style={{marginTop:10, fontSize:14}}>₹32,000 to Akhil K. for April 2026.<br/>Receipt sent to your email.</div>
        </div>
        <div>
          <div className="card2 fill" style={{padding:16}}>
            {[["Transaction","RZP_q9X42K"],["Time","30 Apr · 11:42 AM"],["Method","UPI · ···@oksbi"]].map(([k,v],i)=>(
              <div key={i} className="row2 between" style={{padding:'6px 0'}}>
                <span className="body-2" style={{fontSize:12}}>{k}</span>
                <span className="mono" style={{color:'var(--ink)', fontSize:12}}>{v}</span>
              </div>
            ))}
          </div>
          <div className="row2" style={{gap:10, marginTop:14}}>
            <button className="btn2 ghost grow">📥 Receipt</button>
            <button className="btn2 primary grow">Done</button>
          </div>
        </div>
      </div>
    </Phone2>
  );
};

// ═══════════════════ TENANT RENT (history) ═══════════════════
window.V2_RentHistory = function() {
  return (
    <Phone2>
      <TopBar2 crumb="2026" title="Rent" trail={<span className="gl outline">⬇</span>} />
      <div className="body2 padded">
        <div className="row2" style={{gap:16, alignItems:'center'}}>
          <Ring value={75} size={86} stroke={8} label="9/12" sublabel="ON TIME" />
          <div className="grow">
            <Cap>Paid this year</Cap>
            <div className="display num" style={{fontSize:36, lineHeight:1, marginTop:4}}>₹2.88L</div>
            <div className="body-2" style={{fontSize:12, marginTop:2}}>9 of 12 months · 1 late</div>
          </div>
        </div>

        <Spark points={[32,32,32,32,32,32,32,32,32,32,32,32]} h={50} />

        <div>
          <div className="row2 between" style={{marginBottom:6}}>
            <Cap>Payments</Cap>
            <span className="cap" style={{color:'var(--ink)'}}>Newest ↓</span>
          </div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {[
              ["April", "₹32,000", "Pending · due 5 May", "warn", null],
              ["March", "₹32,000", "Paid 5 Mar · UPI", "good", "RZP_q9X42K"],
              ["February", "₹32,000", "Paid 3 Feb · UPI", "good", "RZP_8YK33L"],
              ["January", "₹32,000", "Paid 4 Jan · Bank", "good", "RZP_72M11J"],
              ["December", "₹32,100", "Paid 6 Dec · 1 day late", "warn", "RZP_61T05G"],
            ].map(([m,a,s,c,r],i)=>(
              <div key={i} style={{padding:'14px 0', borderBottom:'1px solid var(--line-soft)', display:'flex', alignItems:'center', gap:12}}>
                <div className="grow">
                  <div className="row2" style={{gap:8}}>
                    <span className="h3-2">{m}</span>
                    <span className={`chip ${c}`} style={{height:20, fontSize:10}}>{c==='good'?'✓ Paid':'Pending'}</span>
                  </div>
                  <div className="body-2" style={{fontSize:12, marginTop:2}}>{s}</div>
                  {r && <div className="mono" style={{marginTop:3, fontSize:9.5}}>{r}</div>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="num" style={{fontSize:15, fontWeight:600}}>{a}</div>
                  {r && <div className="cap" style={{marginTop:4, color:'var(--accent)'}}>↓ RECEIPT</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar2 tabs={TT} active={1} />
    </Phone2>
  );
};

// ═══════════════════ DEPOSIT ═══════════════════
window.V2_Deposit = function() {
  return (
    <Phone2>
      <TopBar2 crumb="Security deposit" title="" back />
      <div className="body2 padded">
        <div>
          <Cap>Held by landlord</Cap>
          <div className="display num" style={{fontSize:64, marginTop:6}}>₹96,000</div>
          <div className="serif-i" style={{fontSize:16, color:'var(--ink-3)', marginTop:-2}}>3 months · refundable on move-out</div>
        </div>
        <div className="row2" style={{gap:8}}>
          <span className="chip good"><span className="dot"></span>0 deductions</span>
          <span className="chip outline">Dispute window: 14 days</span>
        </div>

        <div>
          <Cap>Ledger</Cap>
          <div className="card2" style={{padding:0, marginTop:10, overflow:'hidden'}}>
            <div className="row2" style={{padding:'16px 18px', borderBottom:'1px solid var(--line-soft)'}}>
              <div className="gl" style={{background:'var(--good-soft)', color:'var(--good)'}}>+</div>
              <div className="grow">
                <div className="h3-2">Deposit received</div>
                <div className="body-2" style={{fontSize:12, marginTop:1}}>10 Mar 2026 · Bank transfer</div>
              </div>
              <div className="num" style={{fontWeight:600, color:'var(--good)'}}>+₹96,000</div>
            </div>
            <div className="row2" style={{padding:'16px 18px'}}>
              <div className="gl dashed">·</div>
              <div className="grow">
                <div className="h3-2" style={{color:'var(--muted)'}}>No deductions yet</div>
                <div className="body-2" style={{fontSize:12, marginTop:1}}>Will appear during move-out</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card2" style={{padding:18, background:'var(--canvas)', borderColor:'transparent'}}>
          <div className="serif-i" style={{fontSize:18, lineHeight:1.35}}>
            “Every deduction at move-out must be linked to a specific photo from your move-in proof. You can dispute any item before refund is finalized.”
          </div>
          <div className="cap" style={{marginTop:12}}>FLATVIO DEPOSIT POLICY</div>
        </div>
      </div>
    </Phone2>
  );
};
