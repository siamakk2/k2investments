// K2 Investment contact form — forwards enquiries to bk@k2investments.com
// Sends via Resend if RESEND_API_KEY is set; otherwise returns a graceful
// fallback so the front end can open the visitor's mail client instead.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Destination. Override with K2_TO_EMAIL in Vercel while Resend is unverified
  // (an unverified Resend account can only deliver to its own signup address).
  const TO = process.env.K2_TO_EMAIL || 'bk@k2investments.com';

  try {
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    if (!b || typeof b !== 'object') b = {};

    const clean = (v, max) => String(v == null ? '' : v).slice(0, max || 400).trim();
    const name = clean(b.name, 120);
    const email = clean(b.email, 160);
    const phone = clean(b.phone, 60);
    const interest = clean(b.interest, 120);
    const message = clean(b.message, 4000);

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Please include your name, email and a message.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'That email address does not look valid.' });
    }
    // simple honeypot — bots fill hidden fields
    if (clean(b.company, 100)) return res.status(200).json({ ok: true });

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const subject = 'K2 website enquiry — ' + (interest || 'General') + ' — ' + name;
    const text =
      'New enquiry from k2investments.com\n\n' +
      'Name:      ' + name + '\n' +
      'Email:     ' + email + '\n' +
      'Phone:     ' + (phone || '-') + '\n' +
      'Interest:  ' + (interest || '-') + '\n\n' +
      'Message:\n' + message + '\n';
    const html =
      '<h2 style="font-family:Georgia,serif">New enquiry from k2investments.com</h2>' +
      '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
      '<tr><td style="padding:4px 14px 4px 0;color:#666">Name</td><td><b>' + esc(name) + '</b></td></tr>' +
      '<tr><td style="padding:4px 14px 4px 0;color:#666">Email</td><td><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></td></tr>' +
      '<tr><td style="padding:4px 14px 4px 0;color:#666">Phone</td><td>' + esc(phone || '-') + '</td></tr>' +
      '<tr><td style="padding:4px 14px 4px 0;color:#666">Interest</td><td>' + esc(interest || '-') + '</td></tr>' +
      '</table><hr style="border:none;border-top:1px solid #ddd;margin:18px 0">' +
      '<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap">' + esc(message) + '</p>';

    const key = process.env.RESEND_API_KEY;
    if (!key) {
      // Not configured yet — tell the front end to fall back to the mail client.
      return res.status(200).json({
        ok: false, fallback: true,
        error: 'Email delivery is not configured yet.',
        mailto: 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(text)
      });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        from: process.env.K2_FROM_EMAIL || 'K2 Website <onboarding@resend.dev>',
        to: [TO], reply_to: email, subject, text, html
      })
    });
    clearTimeout(timer);

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Resend error', r.status, detail.slice(0, 300));
      return res.status(200).json({
        ok: false, fallback: true,
        error: 'We could not send that automatically.',
        mailto: 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(text)
      });
    }
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('k2-contact failure:', err && err.message);
    return res.status(200).json({
      ok: false, fallback: true,
      error: 'Something went wrong on our end.',
      mailto: 'mailto:' + TO
    });
  }
};
