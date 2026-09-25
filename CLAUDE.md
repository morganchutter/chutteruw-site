# chutteruw.com marketing site — Project Guide

Auto-loaded when working in this folder. Keep it current.

## What this is

The public marketing site for **Chutter Underwriting Services**, a Canadian MGA.
Rebuilt from scratch in 2026 to replace the old Wix site. Plain static
HTML + CSS, no build step, no framework. Audience is licensed Canadian retail
brokers, not consumers.

Design follows the chutter.ai / Mako dark theme: navy `#0a1f3a` background,
green `#2EA47B` brand, white top bar with the colour logo, shark watermark at
10% opacity behind the body.

## Where it lives

- **Own git repo**, separate from the workbench it sits inside:
  `morganchutter/chutteruw-site`, branch `main`. The repo is **PUBLIC** on
  purpose (see Netlify gotcha below).
- **Netlify** auto-deploys every push to `main`. Site name `chutteruw.netlify.app`.
- Live at **https://www.chutteruw.com** (apex 301s to www).
- Deploy takes roughly 30 seconds. There is no build command; `publish = "."`.

### Local preview

`.claude/launch.json` in the parent folder has a `chutter-site` entry that runs
`node chutter-site/serve.cjs` on port 5174. Use `preview_start {name: "chutter-site"}`.
`serve.cjs` is a hand-rolled static server: it strips query strings and serves
`404.html` with a 404 status, matching Netlify.

## DNS and email — do not break this

DNS is still hosted **at Wix** (nameservers `ns14/ns15.wixdns.net`) even though
the site moved off Wix. Only two records point at Netlify:

- `A @` -> `75.2.60.5`
- `CNAME www` -> `chutteruw.netlify.app`

**Email is Microsoft 365 behind Proofpoint** (`MX mx1/mx2-us1.ppe-hosted.com`).
Never touch the MX records or the SPF / DKIM / DMARC TXT records. Changing them
takes company email down. Adding an unrelated new TXT record (for example a
Google Search Console verification token) is safe and does not disturb SPF.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home. Hero + online-quoting grid, About, Mako band, Products, Why Chutter, Team, Claims, Contact, Careers |
| `mako.html` | Mako landing page (AI submission-to-quote engine, quotemako.com) |
| `applications.html` | Broker application PDFs: casualty, property, E&O, plus renewals |
| `hot-roofing-insurance.html` | SEO landing page for hot roofing CGL |
| `water-damage-deductible.html` | Water damage deductible buydown |
| `excess-loss-brochure.html` | Excess loss deductible brochure |
| `rented-condo.html` | Rented residential condo program |
| `office-package.html` | Professional office package |
| `usli-web-quoting.html` | USLI online quoting portal |
| `404.html` | Branded not-found page, `noindex` |

Section anchors on the home page: `#about #mako #products #why #team #claims
#contact #careers #online-quoting`. Redirects and cross-page links depend on
these, so do not rename them casually.

## Contact form

`netlify/functions/submit-form.js` (nodemailer over `smtp.office365.com:587`).
Posts from the contact form go to `/.netlify/functions/submit-form`, which
routes by the Department field:

| Department | Inbox |
|---|---|
| Commercial Casualty / Excess & Umbrella | liability@chutteruw.com |
| Commercial Property | commercialproperty@chutteruw.com |
| Professional Indemnity | specialty@chutteruw.com |
| Claims | claims@chutteruw.com |
| Accounting | accounting@chutteruw.com |
| Mako | liability@chutteruw.com |
| General Inquiry | liability@chutteruw.com |

Credentials live **only** in Netlify environment variables, never in the repo:
`M365_USER` and `M365_PASSWORD` (an M365 **app password**, not the account
password). **Environment variable changes need a redeploy to take effect** —
an empty commit is enough. A missing redeploy shows up as
"Missing credentials for LOGIN" in the function log.

## Caching — read this before debugging "the change didn't happen"

`netlify.toml` originally cached CSS and images for a year with `immutable`.
Filenames here are **not** content-hashed and files get replaced in place, so
`immutable` pinned stale copies in browsers and made pushed changes invisible.
This wasted a lot of time across one session before being spotted.

Two fixes are in place, keep both:

1. CSS, HTML and PDFs are served `public, max-age=0, must-revalidate`. Netlify's
   ETags make an unchanged file a cheap 304. PNGs get one day, without `immutable`.
2. Every page links the stylesheet as **`styles.css?v=2`**. `immutable` cannot be
   revoked from browsers that already cached it, so the query string is the only
   way to reach visitors who loaded the site earlier. **If CSS ever appears stale
   again, bump that number across all pages in one pass.**

When a styling change looks wrong in the browser, check what the live CSS
actually contains (`curl -s https://www.chutteruw.com/styles.css | grep ...`)
before editing anything. The file on the server has usually been correct.

## Conventions

- Grid children need `min-width: 0` or `minmax(0, 1fr)`, otherwise long content
  forces columns wider than the viewport and the page scrolls sideways on mobile.
  There is a shared rule covering the known grids near the responsive section.
- Theme tokens live in `:root` in `styles.css`. Use them, do not hardcode colours.
- Check mobile at 375px after layout changes. The site must not scroll horizontally.
- Netlify's Pretty URLs post-processing rewrites internal links in the served
  HTML (`href="foo.html#x"` becomes `href='/foo#x'`, single quotes). When
  verifying a deploy with curl, grep for the link text or the path stem, not
  the exact markup in the repo.
- The old Wix-hosted `/_files/ugd/*.pdf` links were all removed 2026-09-22 (the
  redirect sent them to the applications page). The condo pages now carry the
  information inline; do not link PDFs that are not in this repo.
- Screenshots of the preview pane fail often. Verifying through JS or DOM checks
  (`getBoundingClientRect`, `getComputedStyle`, `fetch` status) is faster and
  more reliable than fighting the screenshot tool.

## SEO state

Done and live:

- **301 redirects** in `netlify.toml` for every old Wix URL Google still has
  indexed (`/property`, `/cgl`, `/careers`, `/prods`, `/claims`, `/web-quote`,
  `/about-us`, `/contact-us`, `/e-o`, `/excess-loss-eligibility` and the rest),
  the pre-Wix `.aspx` pages, the old Wix-hosted `/_files/*` PDFs, and
  extensionless duplicates pointing at their `.html` page. Old URLs were
  recovered from the Wayback Machine CDX API.
- Structured data: `InsuranceAgency` + `OfferCatalog` on the home page,
  `SoftwareApplication` + `FAQPage` on Mako, `Service` + `FAQPage` on hot
  roofing, `Service` on the product pages, `BreadcrumbList` on every subpage.
  `areaServed` lists every province except Quebec, matching the site copy.
- Canonical, Open Graph, Twitter and geo meta on every page. Meta descriptions
  are all under 160 characters. `sitemap.xml`, `robots.txt`, `lang="en-CA"`,
  logo `width`/`height` to prevent layout shift, internal links to `/` rather
  than a duplicate `/index.html`.

Done 2026-09-22 (driven through Morgan's Chrome, Google account
morgan.chutter@gmail.com):

- **Google Search Console**: domain property `sc-domain:chutteruw.com`,
  verified via a TXT record at Wix
  (`google-site-verification=o5qSpRCfq5t1sy_hsKSlksgY8M5Tk93-zFywOlcAKOI`, root,
  TTL 1h). **Do not delete that TXT record** or the property loses
  verification. `https://www.chutteruw.com/sitemap.xml` submitted (9 pages
  discovered). The property also still lists the 2016 Wix-era
  `http://www.chutteruw.com/sitemap.xml` submission; harmless, left in place.
  Check Indexing > Pages there for URLs still 404ing.
- **Google Business Profile**: already correct and verified at
  321 Water Street, 420, Vancouver, BC V6B 1B8. Nothing was changed. Any
  "North Vancouver" listing seen elsewhere is a third-party directory, not
  Google's.

Other TXT records at the root that must stay (2026-09-25):
`anthropic-domain-verification-6xkwgs=E1Me7ZoLOZl4irtvFJEeUpf29` verifies
chutteruw.com for the Chutter Claude Team organization (claude.ai admin
settings > Organization and access > Domains; the verification page itself is
hosted at setup.workos.com and reached via the "Verify a domain" button).
Note the lowercase L in `OZl4`; reading it off a screenshot gets it wrong.

Wix DNS panel gotcha: the domains page renders in a same-origin iframe and
"Manage DNS records" is a button that navigates the iframe to
`/my-domains/dns`; the direct `manage.wix.com/account/domains/<domain>/dns`
style URLs 404. Save via the row's Save button; the record is live at
`ns14/ns15.wixdns.net` within seconds.

## Privacy policy — link removed 2026-09-22, handle carefully

Page footers used to link a Privacy Policy PDF that lived on Wix. The URL 404s
(the `/_files/*` redirect sends it to the applications page), so the link was
removed from every footer on 2026-09-22 per Morgan. The site currently has no
privacy page.

**Do not restore the original PDF.** It is not a privacy policy. It is an
internal data-security procedure that names the alarm company and after-hours
contact tree, the IT vendor and SOC provider, backup data-centre locations and
a 7-character password rule. It was publicly exposed on the Wix site; the 404 is
the safer state. A copy can be pulled from the Wayback Machine if ever needed
for internal reference.

If a public privacy page is wanted later, the PIPEDA policy written for Mako is
a reasonable starting point; it is legal text so it needs Morgan's review.

## Application PDFs

Broker forms live under `applications/` and are also kept on the S: drive at
`S:\KKMB\Subject Faxes\Applications\Apps\{CGL XS UMB,D&O,E&O,EIL,OM Renewals,Property,USLI,Zeus}`.

Several are generated by ReportLab builders in `C:\Users\morgan\Downloads\`
(`chutter_form_lib.py`, `build_*.py`, `renewal_templates.py`), backed up to
`S:\...\Apps\_Form Builder Scripts\`. **When a form needs changing, change the
builder and regenerate**, then deploy the new PDF to both the site and the S:
drive. Editing only the deployed PDF means the next regeneration silently
reverts it.

## Netlify gotchas

- Netlify's free plan blocks deploys from **unrecognized git contributors** on
  private repos. That blocked deploys until the repo was made public
  (`gh repo edit --visibility public`) followed by an empty commit. Keep it public
  unless Morgan upgrades the plan.
- Drag-and-drop deploy snapshot URLs (hash-prefixed) are frozen forever. An old
  snapshot showing old copy is not the live site; check www.chutteruw.com.

## Copy rules

- Chutter is an MGA for brokers. Do not describe it as an insurer or write
  consumer-facing copy.
- No promises about response times or business-day turnaround.
- Appetite claims must be accurate. Hot roofing is a genuine specialty. Welders
  and millwrights are fine to name. Do not list referral classes as if they
  auto-quote, and do not mention referral classes at all.
- Never invent a staff name, title or figure. The staff directory is at
  `S:\Public\Chutter Land\STAFF DIRECTORY.xlsx`.
- Mako facts come from the chutter-ai codebase, not assumption. Email-to-quote is
  `submit@quotemako.com`, must be sent from the broker's registered address,
  accepts PDF / Word / `.msg` / images, reads the email body, and replies with a
  quote link or a referral confirmation in about a minute. No login needed.

## Source control

Commit and push after substantive changes; Morgan has granted git permission.
Git identity `Morgan Chutter <morgan@chutteruw.com>`, commit trailer
`Co-Authored-By: Claude ...`.
