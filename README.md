# k2investments.com

Static site for **K2 Investment, Inc.** — Downtown Los Angeles commercial real estate since 1994.

## Structure

```
/                 Home
/firm/            The Firm — history, people, timeline
/commercial/      DTLA commercial for lease & sale + submarket guide
/napa/            Napa Valley estate & land
/contact/         Contact + enquiry form
/api/k2-contact   Form handler → bk@k2investments.com
/img/             Images (WebP)
```

## Environment variables (Vercel)

| Key | Purpose |
|---|---|
| `RESEND_API_KEY` | Sends the contact form. Without it the form falls back to the visitor's mail client. |
| `K2_TO_EMAIL` | Optional. Overrides the destination while a Resend domain is unverified. Defaults to `bk@k2investments.com`. |
| `K2_FROM_EMAIL` | Optional. Sender address once `k2investments.com` is verified in Resend. |

## Before going live

1. Point `k2investments.com` at this Vercel project.
2. Replace `robots.txt` with an allow rule and remove `noindex` from each page's `<meta name="robots">`.
   Both are currently set to block indexing so this build does not compete with the live Wix site.
3. Submit `sitemap.xml` in Google Search Console.

Contact: Bobak Kalhor, Broker of Record, CA DRE #01201662 · (213) 624-0490
