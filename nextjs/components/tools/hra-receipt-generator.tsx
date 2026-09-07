'use client'

import { useState, useMemo, useId } from 'react'
import { useSearchParams } from 'next/navigation'
import { amountInWords } from '@/lib/format/amount-in-words'

/**
 * Free, client-side HRA rent receipt generator.
 *
 * Deliberately requires no account and sends nothing to a server: the whole point of
 * the page is that a searcher looking for "rent receipt generator" gets a working
 * tool immediately. Everything below runs in the browser; "Download PDF" uses the
 * browser's own print-to-PDF, driven by the @media print rules in globals.css.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PAYMENT_METHODS = [
  'UPI Transfer',
  'Bank Transfer (NEFT/IMPS)',
  'Cash',
  'Cheque',
]

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/

const EMPTY = {
  tenantName: '',
  tenantPan: '',
  landlordName: '',
  landlordPan: '',
  address: '',
  month: MONTHS[new Date().getMonth()],
  year: String(new Date().getFullYear()),
  amount: '',
  method: PAYMENT_METHODS[0],
  utr: '',
}

/**
 * The signed-in half of the product knows most of this already -- who the landlord
 * is, what was paid, when, and how. The tenant's HRA screen listed confirmed
 * payments with a "PDF" affordance that did nothing at all; it now links here with
 * those details attached, so a receipt is one tap rather than ten fields typed from
 * memory. Anonymous visitors are unaffected: with no query string this is the same
 * empty form it has always been.
 *
 * Everything is treated as untrusted text -- it renders into a document the reader
 * may believe -- so each field is length-capped, the amount is digits only, and the
 * month and method must match a known value or fall back to the default.
 */
export function prefillFrom(params: URLSearchParams | null): typeof EMPTY {
  if (!params) return EMPTY
  const text = (key: string, max: number) => (params.get(key) || '').slice(0, max)
  const month = params.get('month') || ''
  const year = (params.get('year') || '').replace(/[^0-9]/g, '').slice(0, 4)
  const method = params.get('method') || ''
  return {
    ...EMPTY,
    tenantName: text('tenantName', 80),
    tenantPan: text('tenantPan', 10).toUpperCase(),
    landlordName: text('landlordName', 80),
    landlordPan: text('landlordPan', 10).toUpperCase(),
    address: text('address', 200),
    month: MONTHS.includes(month) ? month : EMPTY.month,
    year: year.length === 4 ? year : EMPTY.year,
    amount: (params.get('amount') || '').replace(/[^0-9]/g, '').slice(0, 9),
    method: PAYMENT_METHODS.includes(method) ? method : EMPTY.method,
    utr: text('utr', 40),
  }
}

export function HraReceiptGenerator() {
  // Read once, as the initial value: after that the form belongs to whoever is
  // typing in it, and a re-render must not pull their edits back to the link.
  const params = useSearchParams()
  const [form, setForm] = useState(() => prefillFrom(params))
  const uid = useId()

  const set = <K extends keyof typeof EMPTY>(key: K, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const amount = Number.parseInt(form.amount, 10) || 0
  const annualRent = amount * 12
  const panRequired = annualRent > 100_000
  const landlordPan = form.landlordPan.toUpperCase()
  const tenantPan = form.tenantPan.toUpperCase()

  const panInvalid = landlordPan.length > 0 && !PAN_RE.test(landlordPan)

  const words = useMemo(() => amountInWords(amount), [amount])

  // Stable within a render pass — a receipt number is only a human reference, but it
  // must not change on every keystroke, and must not differ between server and client.
  const receiptNo = useMemo(
    () => `RB-${form.year}-${String(Math.abs(hash(form.tenantName + form.month + form.year)) % 900 + 100)}`,
    [form.tenantName, form.month, form.year],
  )

  const issuedOn = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [],
  )

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')
  const dash = (v: string) => v.trim() || '—'

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => String(current - 4 + i))
  }, [])

  return (
    <div className="rb-tool-layout">
      {/* ── Form ─────────────────────────────────────────────── */}
      <form className="rb-tool-form no-print" onSubmit={e => e.preventDefault()}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--rb-ink)' }}>
          Receipt details
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--rb-ink-3)', lineHeight: 1.6, marginBottom: 22 }}>
          Every field updates the preview instantly. Nothing is uploaded — this runs entirely
          in your browser.
        </p>

        <Fieldset legend="Tenant">
          <Field
            id={`${uid}-tenant`}
            label="Tenant full name"
            required
            value={form.tenantName}
            onChange={v => set('tenantName', v)}
            placeholder="Rahul Sharma"
            autoComplete="name"
          />
          <Field
            id={`${uid}-tenant-pan`}
            label="Tenant PAN"
            hint="Optional"
            value={form.tenantPan}
            onChange={v => set('tenantPan', v.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
            uppercase
          />
        </Fieldset>

        <Fieldset legend="Landlord">
          <Field
            id={`${uid}-landlord`}
            label="Landlord full name"
            required
            value={form.landlordName}
            onChange={v => set('landlordName', v)}
            placeholder="Suresh Kumar"
          />
          <Field
            id={`${uid}-landlord-pan`}
            label="Landlord PAN"
            hint={panRequired ? 'Required — annual rent is over ₹1 lakh' : 'Recommended'}
            value={form.landlordPan}
            onChange={v => set('landlordPan', v.toUpperCase())}
            placeholder="BCDFE5678G"
            maxLength={10}
            uppercase
            invalid={panInvalid}
            error={panInvalid ? 'A PAN looks like ABCDE1234F — five letters, four digits, one letter.' : undefined}
          />
        </Fieldset>

        <Fieldset legend="Property and payment">
          <Field
            id={`${uid}-address`}
            label="Rented property address"
            required
            value={form.address}
            onChange={v => set('address', v)}
            placeholder="Flat 4B, Prestige Tower, Koramangala, Bangalore 560034"
            full
          />

          <div className="rb-field">
            <label htmlFor={`${uid}-month`}>Month</label>
            <select
              id={`${uid}-month`}
              value={form.month}
              onChange={e => set('month', e.target.value)}
            >
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="rb-field">
            <label htmlFor={`${uid}-year`}>Year</label>
            <select
              id={`${uid}-year`}
              value={form.year}
              onChange={e => set('year', e.target.value)}
            >
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <div className="rb-field">
            <label htmlFor={`${uid}-amount`}>
              Monthly rent (₹) <span aria-hidden="true" style={{ color: 'var(--rb-danger)' }}>*</span>
            </label>
            <input
              id={`${uid}-amount`}
              type="number"
              inputMode="numeric"
              min={0}
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="18000"
              required
            />
            {amount > 0 && (
              <span className="rb-field-hint">
                {fmt(annualRent)} a year.{' '}
                {panRequired
                  ? "Landlord PAN is mandatory above ₹1 lakh."
                  : 'Below the ₹1 lakh PAN threshold.'}
              </span>
            )}
          </div>

          <div className="rb-field">
            <label htmlFor={`${uid}-method`}>Payment method</label>
            <select
              id={`${uid}-method`}
              value={form.method}
              onChange={e => set('method', e.target.value)}
            >
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <Field
            id={`${uid}-utr`}
            label="UTR / reference number"
            hint="Optional — strongly recommended for digital payments"
            value={form.utr}
            onChange={v => set('utr', v)}
            placeholder="UTR123456789012"
            full
          />
        </Fieldset>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            style={{ padding: '11px 22px', fontSize: 14.5 }}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setForm(EMPTY)}
            style={{
              padding: '11px 22px',
              fontSize: 14.5,
              background: 'transparent',
              border: '1px solid var(--rb-border)',
              color: 'var(--rb-ink-2)',
            }}
          >
            Reset
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--rb-muted)', marginTop: 12, lineHeight: 1.55 }}>
          In the print dialog, choose <strong>Save as PDF</strong> as the destination. Only the
          receipt is printed, not this page.
        </p>
      </form>

      {/* ── Live preview ─────────────────────────────────────── */}
      <div className="rb-tool-preview">
        <div className="rb-receipt" role="region" aria-label="Rent receipt preview">
          <div className="rb-receipt-head">
            <div>
              <div className="rb-receipt-title">Rent Receipt</div>
              <div className="rb-receipt-sub">House Rent Allowance — Section 10(13A)</div>
            </div>
            <div className="rb-receipt-brand">Renty<em>Base</em></div>
          </div>

          <div className="rb-receipt-amount">
            <div className="rb-receipt-amount-label">Amount received</div>
            <div className="rb-receipt-amount-value">{amount ? fmt(amount) : '₹ —'}</div>
            <div className="rb-receipt-amount-words">
              {words ? `Rupees ${words} Only` : 'Enter the rent amount'}
            </div>
          </div>

          <Row k="Receipt no." v={receiptNo} />
          <Row k="Period" v={`${form.month} ${form.year}`} />
          <Row k="Date of receipt" v={issuedOn} />
          <Row k="Payment method" v={form.method} />
          {form.utr.trim() && <Row k="UTR / reference" v={form.utr.trim()} />}

          <div className="rb-receipt-divider" />
          <Row k="Received from" v={dash(form.tenantName)} />
          {tenantPan && <Row k="Tenant PAN" v={tenantPan} />}
          <Row k="Property address" v={dash(form.address)} wrap />

          <div className="rb-receipt-divider" />
          <Row k="Landlord name" v={dash(form.landlordName)} />
          <Row k="Landlord PAN" v={landlordPan || (panRequired ? 'Required' : '—')} />

          <div className="rb-receipt-decl">
            I, <strong>{dash(form.landlordName)}</strong>, certify that I have received{' '}
            <strong>{amount ? fmt(amount) : '₹___'}</strong> from{' '}
            <strong>{dash(form.tenantName)}</strong> as rent for the property at{' '}
            <strong>{dash(form.address)}</strong> for the period{' '}
            <strong>{form.month} {form.year}</strong>.
          </div>

          <div className="rb-receipt-foot">
            <span>Generated free at rentybase.com</span>
            <div className="rb-receipt-sig">
              <div className="rb-receipt-sig-line" />
              <span>Landlord&apos;s signature</span>
            </div>
          </div>
        </div>

        <aside className="rb-tool-upsell no-print">
          <h3>Doing this twelve times a year?</h3>
          <p>
            On RentyBase, receipts generate themselves the moment rent is marked paid — with
            the landlord&apos;s PAN already filled in. Your tenant downloads any month without
            asking. Free for both sides.
          </p>
          <a href="/signup" className="btn">Create a free rental record</a>
        </aside>
      </div>
    </div>
  )
}

function Row({ k, v, wrap }: { k: string; v: string; wrap?: boolean }) {
  return (
    <div className="rb-receipt-row">
      <span className="rb-receipt-key">{k}</span>
      <span className="rb-receipt-val" style={wrap ? { maxWidth: 250, lineHeight: 1.5 } : undefined}>
        {v}
      </span>
    </div>
  )
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="rb-fieldset">
      <legend>{legend}</legend>
      <div className="rb-field-grid">{children}</div>
    </fieldset>
  )
}

function Field({
  id, label, value, onChange, placeholder, hint, error,
  required, full, maxLength, uppercase, invalid, autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  full?: boolean
  maxLength?: number
  uppercase?: boolean
  invalid?: boolean
  autoComplete?: string
}) {
  const hintId = hint || error ? `${id}-hint` : undefined
  return (
    <div className={'rb-field' + (full ? ' rb-field-full' : '')}>
      <label htmlFor={id}>
        {label}{' '}
        {required && <span aria-hidden="true" style={{ color: 'var(--rb-danger)' }}>*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={hintId}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={uppercase ? { textTransform: 'uppercase' } : undefined}
      />
      {(hint || error) && (
        <span
          id={hintId}
          className="rb-field-hint"
          style={error ? { color: 'var(--rb-danger)' } : undefined}
        >
          {error || hint}
        </span>
      )}
    </div>
  )
}

/** Tiny deterministic string hash — keeps the receipt number stable across renders. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
