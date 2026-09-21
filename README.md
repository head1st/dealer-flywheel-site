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

1. **Calendly link.** `src/contact.njk` has a placeholder Calendly URL
   (`https://calendly.com/dealerflywheel/20-minute-call`). Create a real
   Calendly (or Cal.com) account and swap in the real `data-url`.
2. **Inbox.** Confirm `hello@dealerflywheel.com` is a real, monitored
   address (used in the contact-page fallback link).
3. **OG image.** `src/assets/og-image.png` is a placeholder social-share
   card generated from the brand mark — swap it for a designed one if you
   want something more polished than programmatically-generated text.
4. **Canonical URL / sitemap.** Both assume the domain `dealerflywheel.com`
   (see `src/_includes/layout.njk` and `src/sitemap.njk`). Update if the
   domain differs.

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
