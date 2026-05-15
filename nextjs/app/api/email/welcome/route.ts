import { NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const { name, role, email } = await req.json()
    if (!email || !name || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { subject, html } = welcomeEmail({ name, role, email })
    await sendEmail({ to: email, subject, html })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/welcome]', err)
    // Don't block signup — always return 200 so the client continues
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
