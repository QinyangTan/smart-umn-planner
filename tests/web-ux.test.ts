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
