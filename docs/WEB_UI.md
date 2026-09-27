# Web UI contract

Smart UMN is an independent student tool, not an official University website. The web app borrows the University's public visual language without using official marks or implying endorsement.

## Information architecture

There are only two primary destinations:

- **Plan** — import/use APAS, tune a small set of semester preferences, and build one schedule at a time.
- **Explore** — browse the complete current Twin Cities Schedule Builder subject directory and see personalized APAS fit inline.

Connection/privacy, detailed APAS requirements, saved plans, course evidence, and candidate-course tuning are secondary panels or progressive disclosures. They are not competing top-level pages.

## Personalization without setup fatigue

After APAS import, personalization is automatic:

- the primary degree/major plus explicitly imported minors, certificates, or second programs share one normalized profile;
- Explore keeps the official course result set intact but moves strict APAS matches first, candidate/review routes second, and unrelated courses after them;
- Plan derives candidate subjects and official Liberal Education categories from the imported APAS rather than from a CSE/CS allowlist;
- time/credit/day preferences stay local and hidden under **Make it yours** until the student wants them.

A course is never hidden simply because the parser cannot prove a fit. Unknown requirements stay visible rather than being guessed.

## Visual system

Use the public Folwell/UMN web palette and accessibility guidance as a reference:

- Maroon `#7A0019`
- Dark maroon `#5B0013`
- Gold `#FFCC33`
- Dark gold `#FFB71E`
- Ink `#333333`
- Light gray `#D5D6D2`
- Off white `#F9F7F6`

The page should feel editorial and institutional, not like a generic generated dashboard:

- flat surfaces and rules instead of gradient cards;
- 4–6px corner radii for ordinary UI;
- maroon used as a priority/accent color rather than a large decorative background;
- gold used for focus/selection/keylines rather than large text blocks;
- one primary action per planning state;
- native-looking switch controls for immediate boolean preferences;
- compact motion only for state changes, with `prefers-reduced-motion` respected.

Open Sans is preferred when locally available, with Arial/Helvetica/system fallbacks. No remote font request is required.

## Accessibility

Maintain one H1 per page, explicit labels, visible focus rings, semantic `details` disclosure, descriptive external links, contrast-safe text, keyboard-operable controls, and a reduced-motion path.
