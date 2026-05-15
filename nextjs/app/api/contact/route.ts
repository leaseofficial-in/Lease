import { NextResponse } from 'next/server'
import { sendEmail, notifyAdmin, contactAdminEmail, contactAutoReplyEmail } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
    }

    // Send both emails in parallel
    const [adminResult, autoReplyResult] = await Promise.allSettled([
      notifyAdmin(
        contactAdminEmail({ name, email, subject, message }).subject,
        contactAdminEmail({ name, email, subject, message }).html,
      ),
      sendEmail({
        to: email,
        subject: contactAutoReplyEmail({ name, subject, message }).subject,
        html: contactAutoReplyEmail({ name, subject, message }).html,
        replyTo: 'hello@rentybase.com',
      }),
    ])

    if (adminResult.status === 'rejected') {
      console.error('[contact] admin email failed:', adminResult.reason)
    }
    if (autoReplyResult.status === 'rejected') {
      console.error('[contact] auto-reply failed:', autoReplyResult.reason)
    }

    // As long as admin email succeeded, return success
    if (adminResult.status === 'fulfilled') {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Failed to send message. Please try hello@rentybase.com directly.' }, { status: 500 })
  } catch (err) {
    console.error('[contact]', err)
    return NextResponse.json({ error: 'Server error. Please try hello@rentybase.com directly.' }, { status: 500 })
  }
}
