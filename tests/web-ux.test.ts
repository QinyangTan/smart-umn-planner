import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const app=readFileSync(new URL('../apps/web/app.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../apps/web/style.css',import.meta.url),'utf8');
const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');

test('web information architecture exposes only Plan and Explore as primary navigation',()=>{
 const nav=app.match(/\['Plan','Explore'\]\.map/);
 assert.ok(nav,'primary navigation must remain Plan + Explore');
 assert.doesNotMatch(app,/\['Plan','Explore','(?:Degree|Saved|Settings|Courses)'/);
 assert.match(app,/data-panel="degree"/,'requirements remain progressive disclosure');
 assert.match(app,/data-panel="saved"/,'saved plans remain secondary');
});

test('Plan keeps one primary planning action and hides tuning behind disclosure',()=>{
 assert.equal((app.match(/id="autobuild"/g)||[]).length,1);
 assert.equal((app.match(/id="discover"/g)||[]).length,0,'discovery is an implementation step, not a competing visible CTA');
 assert.match(app,/<details id="preferences"/);
 assert.match(app,/whatIfOpen/,'what-if disclosure state survives preference rerenders');
 assert.match(app,/whatIfDetails\.ontoggle/,'what-if disclosure records its open state');
 assert.match(app,/Adjust candidate courses/);
 assert.match(app,/Build my plan/);
});

test('Explore personalizes ordering without filtering the official catalog',()=>{
 assert.match(app,/sortCoursesForProfile\(catalogCourses\.filter/);
 assert.match(app,/Explore through your APAS/);
 assert.match(app,/Choose a subject/);
});

test('Folwell-aligned visual contract avoids generic gradient-card styling',()=>{
 assert.match(css,/--maroon:#7a0019/i);
 assert.match(css,/--gold:#ffcc33/i);
 assert.match(css,/--ink:#333333/i);
 assert.match(css,/--line:#d5d6d2/i);
 assert.match(css,/--off:#f9f7f6/i);
 assert.doesNotMatch(css,/linear-gradient/i);
 assert.match(css,/\.preference-grid \.toggle input\{[\s\S]*appearance:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.topbar nav button\.active::after\{background:var\(--gold\)/);
});

test('APAS detail uses semantic retrieval only as review evidence',()=>{
 assert.match(app,/\/api\/policy\/search/);
 assert.match(app,/Semantic match/);
 assert.match(app,/retrieval never authorizes degree credit/);
 assert.match(app,/Official UMN policy evidence/);
 assert.match(css,/\.semantic-policy/);
});

test('APAS detail refreshes official Liberal Education evidence and renders the enriched profile',()=>{assert.match(app,/if\(value==='degree'\)\{void refreshEffectiveProfile/);assert.match(app,/detailProfile\.requirements\.map\(requirementHTML\)/);assert.match(app,/Official base category matched; the lab\/field qualifier remains review-only/);});

test('APAS compatibility copy action emits the schema-versioned anonymous report',()=>{assert.match(app,/JSON\.stringify\(compatibilityReport\(profile\),null,2\)/);});

test('onboarding has one connection action and no decorative fake dashboard',()=>{
 assert.match(app,/Your APAS becomes the filter/);
 assert.match(app,/Connect APAS/);
 assert.match(app,/Verify what fits/);
 assert.match(app,/Build \+ hand off/);
 assert.match(app,/does not ask an AI model whether a course counts/);
 assert.doesNotMatch(app,/mock-week|onboarding-visual/);
 assert.match(readme,/docs\/demos\/smart-umn-readme-demo\.gif/,'README opens with an inline autoplaying demo rather than requiring a video click');
 assert.doesNotMatch(readme,/Three synthetic-profile screen-recorded demos are checked into GitHub/,'README should not lead with a file-list style demo section');
});

test('focus indicators, sticky-header scroll padding, schedule region and favicons meet the accessibility contract',()=>{
 const css=readFileSync('apps/web/style.css','utf8'),app=readFileSync('apps/web/app.ts','utf8');
 assert.match(css,/:focus-visible,\[tabindex\]:focus-visible\{outline:3px solid var\(--maroon\);outline-offset:2px;box-shadow:0 0 0 2px var\(--gold\)\}/,'gold alone is ~1.5:1 on white; the ring must be maroon-led');
 assert.match(css,/html\{[^}]*scroll-padding-top:88px/,'focused controls must not scroll under the sticky topbar');
 assert.match(css,/prefers-reduced-motion:reduce/);assert.match(app,/prefers-reduced-motion: reduce/);
 assert.match(app,/class="week"[^>]*tabindex="0" role="region" aria-label="Weekly meeting grid"/,'horizontally scrollable week grid must be keyboard reachable');
 for(const page of['index.html','privacy.html','support.html']){const html=readFileSync('apps/web/'+page,'utf8');assert.match(html,/<link rel="icon" type="image\/png" href="\/favicon.png">/,page+' must not trigger a /favicon.ico 404');assert.match(html,/<html lang="en">/);assert.match(html,/<meta name="color-scheme" content="light">/);}
 assert.match(readFileSync('scripts/build.mjs','utf8'),/copyFile\('dist\/extension\/icons\/icon32.png','dist\/web\/favicon.png'\)/);
});
