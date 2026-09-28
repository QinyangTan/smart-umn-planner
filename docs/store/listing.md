# Chrome Web Store submission — Smart UMN Planner

This document is the review authority for the Chrome Web Store listing. Keep the Developer Dashboard, packaged manifest and public privacy policy consistent with it.

## Submission status

- Product: Smart UMN Planner
- Manifest: V3
- Canonical homepage: https://smartumn.qinyangtan.com/
- Privacy policy: https://smartumn.qinyangtan.com/privacy.html
- Support URL: https://smartumn.qinyangtan.com/support.html
- Status (2026-09-28): **uploaded draft**. Chrome Web Store item ID `ocbpkaiefaaboeiliopklleejlfnegbd`. Not yet submitted, approved or published.
- Chrome Web Store rejects a manifest `key` ("key field is not allowed in manifest"). Upload only the key-free `release/smart-umn-planner-extension-v<version>-webstore.zip`. The direct-download `/smart-umn-extension.zip` keeps `key`, so Developer-mode installs keep ID `cleikpoiflloemienikmmmedkniblobc`.
- The public API allows exactly these two extension origins (`netlify/functions/api.mts`). Submit for review only after the API that allowlists the Store ID is live, otherwise reviewers would see "Planner data unavailable".
- The first draft upload was the v0.10.5 Web Store ZIP. v0.10.6 (Store-ID allowlist) is the package to submit.
- Publisher contact email must be entered and verified by the account owner in Dashboard Settings.
- Do not store or automate the Google password/2FA response.
- Do not mark the extension as published until Chrome Web Store review actually completes.

## Store listing

### Name

Smart UMN Planner

### Summary / manifest description

Personalized Twin Cities APAS program context and source-labeled insights rendered directly inside UMN Schedule Builder.

### Detailed description

Smart UMN Planner connects your University of Minnesota Twin Cities APAS audit to a local-first course-planning experience and adds source-labeled Course Intelligence directly inside Schedule Builder.

Core features:
- Import your existing APAS audit after signing in on official UMN pages.
- See deterministic APAS fit and prerequisite status without asking an AI model to decide whether a course counts.
- Compare current Schedule Builder offerings with historical grade context, current-instructor evidence and reviewed original references when available.
- Open the full Smart UMN planner from a Schedule Builder course with the course, term and campus already selected.
- Build schedule options while keeping uncertain or policy-only requirements visibly review-only.

Academic profile and saved-plan state stay in your browser. Smart UMN never asks for your UMN password or Duo code and does not upload raw authenticated APAS HTML.

Smart UMN is an independent student tool, not affiliated with or endorsed by the University of Minnesota. Official APAS, advising, registration and University policy remain authoritative. Generated plans do not guarantee registration, graduation or a particular grade.

### Suggested category

Education or Productivity, whichever is available in the current Chrome Web Store category picker and best matches the dashboard taxonomy. Do not choose a misleading category merely for discoverability.

### Language / mature content

- Primary language: English
- Mature content: No
- Ads: None
- In-app purchases: None

## Single purpose

Connect a student's existing UMN Twin Cities APAS audit to Smart UMN's local planning experience and add APAS-aware, source-labeled course intelligence inside UMN Schedule Builder.

Do not broaden this statement to unrelated browsing, analytics, advertising or general web automation.

## Permission justifications

### storage

Required to keep the normalized APAS profile, connection status and saved planning state locally in Chrome so the extension can personalize Schedule Builder and the Smart UMN Web without uploading the student's academic profile to a backend.

### alarms

Required for the bounded periodic APAS refresh task after a student has already connected a profile. The alarm does not collect browsing history and does not run unrelated background work.

### Host: https://umn.uachieve.com/selfservice/*

Required to read the rendered APAS audit after the student has authenticated on UMN's own uAchieve pages. The extension does not request access to UMN SSO/Duo pages, cookies or credentials.

### Host: https://schedulebuilder.umn.edu/*

Required to render Smart UMN Course Intelligence next to the course inside official UMN Schedule Builder and to read the public course page context needed to identify the selected course/campus.

### Host: https://smartumn.qinyangtan.com/*

Required to bridge locally stored academic state to the canonical Smart UMN Web in the same browser and to request public course/policy evidence from the Smart UMN API.

## Remote code

Select: **No, I am not using remote code.**

All executable extension JavaScript is packaged in the Manifest V3 ZIP. The extension calls HTTPS JSON/public-evidence endpoints but does not download or execute JavaScript, WebAssembly or other executable code from a remote server.

## Privacy-practices data disclosure

Disclose **Website content**.

Why: the extension reads the student's rendered APAS academic audit from the first-party UMN uAchieve page in order to normalize requirements and academic records for planning.

Do not claim that Smart UMN handles authentication information: it does not read/store passwords, Duo codes, authentication cookies, SAML assertions or authorization headers.

Do not claim browsing-history collection: the extension is restricted to the exact UMN APAS, Schedule Builder and Smart UMN origins and does not build a browsing-history profile.

The product also sends public course code/term/campus to the Smart UMN public-evidence API. Review-only policy lookup may send a bounded requirement phrase plus public program/catalog metadata. The public API does not accept or persist the student's complete academic profile, raw APAS HTML or saved plans, and application logging excludes query text, request bodies, IP addresses and student profiles.

If the Developer Dashboard taxonomy has changed, choose the narrowest available data category that truthfully includes APAS page content. Never under-disclose because the data is processed locally.

## Limited Use certification

Certify only if the dashboard wording remains consistent with the current Chrome Web Store User Data policy:

- Data accessed through extension permissions is used only to provide or improve the user-facing APAS planning and Schedule Builder Course Intelligence purpose.
- User data is not sold.
- User data is not used or transferred for personalized advertising.
- User data is not used for creditworthiness or lending.
- User data is not transferred for unrelated profiling.
- Humans do not read individual academic profiles through a Smart UMN backend because those profiles are not stored there.

## Reviewer notes

1. Install the submitted ZIP.
2. Open https://schedulebuilder.umn.edu/explore/2027Spring/MATH/1271/ .
3. Smart UMN should render an inline Course Intelligence row on the real public Schedule Builder page. Public course/instructor evidence works without an APAS login.
4. The **Full planner** link should open:
   https://smartumn.qinyangtan.com/?course=MATH%201271&term=1273&campus=UMNTC
5. APAS personalization requires the reviewer's own authorized UMN uAchieve session. Smart UMN cannot provide or share a University credential. Clicking **Connect APAS** opens the official UMN APAS flow; passwords and Duo remain outside Smart UMN.
6. Without an imported APAS profile, personalized degree-fit fields degrade visibly rather than inventing an academic result.
7. The privacy page and support page are public at the URLs above.

## Required graphical assets

Current Chrome Web Store guidance requires at least:
- packaged 128×128 extension icon;
- at least one listing screenshot, preferably up to five;
- small promotional tile if the dashboard requires it for the listing.

Preferred store screenshots are full-bleed 1280×800 and must show the actual current product rather than mockups. Do not include real student academic data.

The production build generates 16, 32, 48 and 128 pixel extension icons plus the required 440×280 small promo tile deterministically. The mark is a generic route/planning symbol in Smart UMN's product palette; it does not use an official UMN mark or imply endorsement.

Upload assets:
- Store icon: `dist/extension/icons/icon128.png`
- Small promo tile: `dist/store/promo-small-440x280.png`
- Screenshot 1: `docs/store/screenshot-web-onboarding-1280x800.png`
- Screenshot 2: `docs/store/screenshot-course-intelligence-1280x800.png`

Screenshot 1 is a clean-profile canonical Web onboarding view with no imported APAS profile. Screenshot 2 is the real public Schedule Builder `CSCI 5302` page with the v0.10.5 production extension loaded and no student APAS profile (recaptured 2026-09-28). Neither screenshot should contain private student academic information.

## Pre-upload gate

Before any Dashboard upload:

1. Increment manifest/package version if the package changed since the previous upload.
2. Build with:
   NODE_ENV=production PUBLIC_ORIGIN=https://smartumn.qinyangtan.com npm run package:extension
3. Run:
   npm audit --omit=dev --audit-level=high
   npm test
   npm run typecheck
   npm run verify:apas-corpus
   npm run verify:course-coverage
   npm run verify:release -- --production
4. Load the exact packaged build in a fresh Chrome profile and repeat Schedule Builder + canonical planner-link acceptance.
5. Verify the public privacy/support pages match this disclosure.
6. Verify the ZIP root contains manifest.json and all declared icon files.
7. Upload only after Google account reauthentication/2-step verification is complete.

Official reference pages used for this checklist:
- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/best-listing
- https://developer.chrome.com/docs/webstore/user_data
