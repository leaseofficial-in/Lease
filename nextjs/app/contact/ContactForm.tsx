'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10,
  border: '1.5px solid var(--rb-border)', background: 'var(--rb-surface)',
  color: 'var(--rb-ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--rb-font-sans)',
  transition: 'border-color 150ms',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', color: 'var(--rb-ink-3)', marginBottom: 8,
}

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try hello@rentybase.com directly.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setErrorMsg('Could not reach the server. Please email hello@rentybase.com directly.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ background: 'var(--rb-surface)', border: '1px solid var(--rb-border)', borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DEEFE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--rb-font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--rb-ink)' }}>Message sent.</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--rb-ink-2)', marginBottom: 24 }}>
          We&apos;ve received your message and sent you a confirmation email. We&apos;ll get back to you within 1–2 business days.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', subject: '', message: '' }) }}
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--rb-action)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Send another message →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label htmlFor="name" style={labelStyle}>Your name</label>
            <input
              id="name" type="text" required value={form.name}
              onChange={set('name')} placeholder="Aarav Mehta"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#0F4C5C')}
              onBlur={e => (e.target.style.borderColor = 'var(--rb-border)')}
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email" type="email" required value={form.email}
              onChange={set('email')} placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#0F4C5C')}
              onBlur={e => (e.target.style.borderColor = 'var(--rb-border)')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" style={labelStyle}>Subject</label>
          <select
            id="subject" required value={form.subject}
            onChange={set('subject')}
            style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235C645F' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 40 }}
            onFocus={e => (e.target.style.borderColor = '#0F4C5C')}
            onBlur={e => (e.target.style.borderColor = 'var(--rb-border)')}
          >
            <option value="">Select a topic…</option>
            <option value="Product question">Product question</option>
            <option value="Billing / account issue">Billing / account issue</option>
            <option value="HRA receipt help">HRA receipt help</option>
            <option value="Partnership enquiry">Partnership enquiry</option>
            <option value="Press / media">Press / media</option>
            <option value="Bug report">Bug report</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" style={labelStyle}>Message</label>
          <textarea
            id="message" required rows={6} value={form.message}
            onChange={set('message')}
            placeholder="Tell us what's on your mind…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
            onFocus={e => (e.target.style.borderColor = '#0F4C5C')}
            onBlur={e => (e.target.style.borderColor = 'var(--rb-border)')}
          />
        </div>

        {status === 'error' && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#991B1B' }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn btn-primary"
          style={{ padding: '13px 28px', fontSize: 15, opacity: status === 'sending' ? 0.7 : 1, cursor: status === 'sending' ? 'not-allowed' : 'pointer' }}
        >
          {status === 'sending' ? 'Sending…' : 'Send message →'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--rb-muted)', marginTop: -8 }}>
          By submitting, you agree to our <a href="/privacy" style={{ color: 'var(--rb-action)' }}>Privacy Policy</a>.
          We never share your details.
        </p>
      </div>
    </form>
  )
}
