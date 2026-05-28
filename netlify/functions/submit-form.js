// Contact form router — receives a submission, routes the email to the right desk.
//
// Required Netlify environment variables:
//   M365_USER     — mailbox to authenticate + send from (e.g. morgan@chutteruw.com)
//   M365_PASSWORD — Microsoft 365 *app password* for that mailbox (not the login password)

const nodemailer = require('nodemailer');

const ROUTING = {
  'Commercial Casualty':    'liability@chutteruw.com',
  'Commercial Property':    'commercialproperty@chutteruw.com',
  'Excess & Umbrella':      'liability@chutteruw.com',
  'Professional Indemnity': 'specialty@chutteruw.com',
  'Claims':                 'claims@chutteruw.com',
  'Accounting':             'accounting@chutteruw.com',
  'General Inquiry':        'info@chutteruw.com',
};

const DEFAULT_INBOX = 'info@chutteruw.com';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  // Parse form-encoded body
  let data;
  try {
    const params = new URLSearchParams(event.body || '');
    data = Object.fromEntries(params);
  } catch (err) {
    return json(400, { error: 'Invalid form data' });
  }

  // Honeypot — silently accept and discard bot submissions
  if (data['bot-field']) {
    return json(200, { ok: true });
  }

  // Required field check
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  if (!name || !email) {
    return json(400, { error: 'Name and email are required.' });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: 'Please enter a valid email address.' });
  }

  const dept    = (data.department || 'General Inquiry').trim();
  const subject = (data.subject || '').trim();
  const message = (data.message || '').trim();
  const to      = ROUTING[dept] || DEFAULT_INBOX;

  // Build the email
  const emailSubject = subject
    ? `[${dept}] ${subject}`
    : `[${dept}] New contact form submission from ${name}`;

  const textBody = [
    'New contact form submission from chutteruw.com',
    '',
    `Department: ${dept}`,
    `Name:       ${name}`,
    `Email:      ${email}`,
    subject ? `Subject:    ${subject}` : null,
    '',
    'Message:',
    message || '(no message)',
    '',
    '---',
    `Reply to this email to respond directly to ${name}.`,
  ].filter(Boolean).join('\n');

  const htmlBody = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;max-width:620px;color:#0b1220;">
      <div style="border-left:4px solid #2EA47B;padding:4px 14px;margin-bottom:18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#475569;">${escapeHtml(dept)}</div>
        <div style="font-size:18px;font-weight:600;color:#12395A;margin-top:2px;">New contact form submission</div>
      </div>
      <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px;">
        <tr><td style="padding:4px 14px 4px 0;color:#64748b;">From</td><td style="padding:4px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#64748b;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1C7A5A;">${escapeHtml(email)}</a></td></tr>
        ${subject ? `<tr><td style="padding:4px 14px 4px 0;color:#64748b;">Subject</td><td style="padding:4px 0;">${escapeHtml(subject)}</td></tr>` : ''}
      </table>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;white-space:pre-wrap;font-size:14px;line-height:1.55;">${escapeHtml(message || '(no message)')}</div>
      <div style="margin-top:18px;color:#94a3b8;font-size:12px;">Reply to this email to respond directly to ${escapeHtml(name)}.</div>
    </div>
  `;

  // Send via Microsoft 365 SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.M365_USER,
      pass: process.env.M365_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Chutter Contact Form" <${process.env.M365_USER}>`,
      to,
      replyTo: `"${name}" <${email}>`,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });
    return json(200, { ok: true });
  } catch (err) {
    console.error('SMTP send failed:', err && (err.response || err.message || err));
    return json(500, { error: 'Could not send your message. Please email us directly.' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
