# Dealer Flywheel — website

A static, multi-page marketing site built with [Eleventy](https://www.11ty.dev/), styled from the original one-page mockup. Pages: Home, Method, What We Build, Pricing, Security, Contact.

## Local development

```
npm install
npm run serve      # live-reload dev server, http://localhost:8080
```

## Production build

```
npm run build       # writes static HTML/CSS to _site/
npm start            # serves _site/ with a tiny Express server on $PORT
```

## Before this goes live

1. **Booking setup.** The Contact page books directly onto your own Google
   Calendar — no Calendly, no Cal.com, no third-party branding. See
   **"Booking setup"** below; without it, the booking widget shows a plain
   "email us" message instead of erroring.
2. **Inbox.** Confirm `hello@dealerflywheel.com` is a real, monitored
   address (used in the contact-page fallback link).
3. **OG image.** `src/assets/og-image.png` is a placeholder social-share
   card generated from the brand mark — swap it for a designed one if you
   want something more polished than programmatically-generated text.
4. **Canonical URL / sitemap.** Both assume the domain `dealerflywheel.com`
   (see `src/_includes/layout.njk` and `src/sitemap.njk`). Update if the
   domain differs.

## Booking setup (Google Calendar, no third party, free)

The Contact page's booking widget (`src/js/booking.js`, API in
`server.js` / `lib/`) reads real free/busy times from a Google Calendar
you own and creates the event directly — nobody else's branding, no
subscription. It needs a **service account**: a robot Google account your
server authenticates as, with access to just your calendar.

1. **Create a Google Cloud project.** Go to
   [console.cloud.google.com](https://console.cloud.google.com), create a
   new project (any name, e.g. "Dealer Flywheel"). It's free — no billing
   account is required for this.
2. **Enable the Calendar API.** In that project, go to "APIs & Services" →
   "Library", search "Google Calendar API", click it, click **Enable**.
3. **Create a service account.** "APIs & Services" → "Credentials" →
   **Create Credentials** → **Service account**. Give it any name (e.g.
   "dealer-flywheel-booking"). You don't need to grant it any project-level
   role — skip that step.
4. **Create a key for it.** Open the service account you just made → **Keys**
   tab → **Add Key** → **Create new key** → **JSON**. This downloads a
   `.json` file — keep it private, it's a credential.
5. **Share your calendar with it.** Open the JSON file and copy the
   `client_email` value (looks like
   `dealer-flywheel-booking@your-project.iam.gserviceaccount.com`). Go to
   [calendar.google.com](https://calendar.google.com) → the calendar you
   want bookings to land on → Settings → **Share with specific people** →
   add that email address → permission: **Make changes to events**.
6. **Get that calendar's ID.** Same Settings page → **Integrate calendar**
   → copy the **Calendar ID** (usually just your Gmail address for your
   primary calendar, or a long `...@group.calendar.google.com` string for
   a secondary one).
7. **Set these on Railway** (Project → your service → Variables):

   | Variable | Value |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | the `private_key` from the JSON, **as one line** — keep the `\n` sequences exactly as they appear in the JSON file, don't convert them to real line breaks |
   | `GOOGLE_CALENDAR_ID` | the calendar ID from step 6 |
   | `RESEND_API_KEY` | API key from resend.com — see below |
   | `EMAIL_FROM` | the address confirmations are sent from, e.g. `Dealer Flywheel <hello@dealerflywheel.com>` |
   | `NOTIFY_EMAIL` | *(optional)* where the new-booking notice goes; defaults to `EMAIL_FROM`'s address |

   A plain service account can create the calendar event, but it can't
   invite an outside guest (that needs paid Google Workspace + admin-level
   "domain-wide delegation"), so the confirmation email is sent
   separately. It's sent via **Resend** rather than Gmail's SMTP servers,
   because Railway (like most PaaS hosts) blocks outbound SMTP ports by
   default — Resend's API runs over plain HTTPS instead, so it isn't
   affected by that:

   1. Sign up free at **resend.com** (3,000 emails/month free, no card
      required).
   2. **Verify your domain**: Resend dashboard → Domains → Add Domain →
      `dealerflywheel.com`. It gives you 2–3 DNS records (SPF, DKIM, and
      sometimes a tracking CNAME) to add wherever `dealerflywheel.com`'s
      DNS is managed. Verification usually completes within a few
      minutes of adding them.
   3. Once verified, create an **API key** (dashboard → API Keys → Create)
      and set it as `RESEND_API_KEY`.
   4. Set `EMAIL_FROM` to an address at your verified domain, e.g.
      `Dealer Flywheel <hello@dealerflywheel.com>` — it doesn't need to be
      a real inbox for sending to work, though it's worth making it a real
      one eventually since customers can reply to it.

   Without these set, bookings still work — they land on the calendar —
   there's just no confirmation email sent.

   Optional, all have sensible defaults:

   | Variable | Default | Meaning |
   |---|---|---|
   | `BUSINESS_TIMEZONE` | `America/New_York` | |
   | `BUSINESS_START_HOUR` | `9` | 24h, first bookable slot |
   | `BUSINESS_END_HOUR` | `17` | 24h, last slot ends by this time |
   | `SLOT_MINUTES` | `20` | length of each bookable slot |
   | `BOOKING_LEAD_MINUTES` | `60` | minimum notice for a same-day booking |
   | `BOOKING_WINDOW_DAYS` | `14` | how far ahead people can book |

8. Railway redeploys automatically when you save variables. Once it's up,
   `/contact/` will show real open slots, confirmed bookings will show up
   on your calendar, and (once the Gmail step above is also done) both you
   and the customer get a confirmation email.

No credentials set → the widget still renders, but shows a plain message
pointing people to email `hello@dealerflywheel.com` instead. Nothing
breaks either way.

## Deploying to Railway

This repo is set up to deploy as-is:

1. Push this folder to a GitHub repo (or `railway up` directly from here
   with the Railway CLI).
2. In Railway, create a new project from that repo. `railway.json` tells
   it to run `npm install && npm run build` at build time and `npm start`
   to serve.
3. Railway sets `$PORT` automatically — `server.js` already binds to it.
4. Point `dealerflywheel.com` at the Railway service (Railway → your
   service → Settings → Domains → **Custom Domain**), then add the CNAME
   Railway gives you at your DNS host.

No database, no environment variables, and no server-side secrets are
required — it's a static site behind a one-file Express server.

## Editing content

Every page's copy lives directly in its `.njk` file under `src/`
(`index.njk`, `method.njk`, `work.njk`, `pricing.njk`, `security.njk`,
`contact.njk`). Shared nav/footer/head tags live in
`src/_includes/layout.njk`. All styling is in `src/css/style.css` — one
file, using CSS custom properties (`--ink`, `--gold`, etc.) for the brand
palette.
