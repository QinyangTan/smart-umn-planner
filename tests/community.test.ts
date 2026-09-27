import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{makeReference,makeInstructorReference}from'../packages/community/index.ts';
import{instructorEntityKey}from'../packages/schemas/index.ts';
import{Store}from'../packages/providers/store.ts';
import{ContextService}from'../packages/providers/index.ts';
import{communityTopicSummary,currentInstructorGradeHistory,gradeTermTrend,gradesHTML,referenceEntityLabel}from'../packages/ui/index.ts';

const now='2026-09-27T00:00:00.000Z';
const prov=(source:string,period='1273')=>({source,retrievedAt:now,period});
const health=(source:string)=>({source,status:'healthy' as const,checkedAt:now});

test('current Reddit and RateMyProfessors policy is explicitly link-only',()=>{
 const policy=JSON.parse(readFileSync('config/community-policy.json','utf8'));assert.equal(policy['www.reddit.com'].mode,'link-only');assert.match(policy['www.reddit.com'].basisUrl,/reddithelp\.com/);assert.equal(policy['www.ratemyprofessors.com'].mode,'link-only');assert.match(policy['www.ratemyprofessors.com'].basisUrl,/ratemyprofessors\.com\/terms-of-use/);
 const worker=readFileSync('apps/worker/cli.ts','utf8');assert.match(worker,/policy\.mode!==\'allow\'/);assert.match(worker,/Automated collection disabled/);
});

test('instructor references are strict identity-linked original sources, not ratings',()=>{
 const r=makeInstructorReference('Daniel Boley','Daniel Boley at University of Minnesota - Twin Cities','https://www.ratemyprofessors.com/professor/309254');
 assert.equal(r.entityType,'instructor');
 assert.equal(r.entityId,'instructor:daniel boley');
 assert.equal(r.source,'ratemyprofessor');
 assert.equal(r.url,'https://www.ratemyprofessors.com/professor/309254');
 assert.equal(r.sourceDocumentId,'309254');
 assert.equal(r.excerpt,undefined);
 assert.deepEqual(r.topics,[]);
 assert.ok(!('rating' in r), 'normalized reference has no score field');
 assert.throws(()=>makeInstructorReference('Daniel Boley','Different professor','https://www.ratemyprofessors.com/professor/309254'),/association/);
 assert.throws(()=>makeInstructorReference('Daniel Boley','Daniel Boley','https://www.ratemyprofessors.com/search/professors/umn?q=Daniel'),/original RateMyProfessors professor URL/);
 assert.throws(()=>makeReference('CSCI 5302','CSCI 5302 Daniel Boley','https://www.ratemyprofessors.com/professor/309254'),/attached to an instructor/);
});

test('course and instructor references stay separately keyed',()=>{
 const course=makeReference('CSCI 5302','CSCI 5302 with Daniel Boley?','https://www.reddit.com/r/uofmn/comments/kal74z/');
 const instructor=makeInstructorReference('Daniel Boley','Daniel Boley at University of Minnesota - Twin Cities','https://www.ratemyprofessors.com/professor/309254');
 assert.equal(course.entityId,'CSCI 5302');
 assert.equal(instructor.entityId,instructorEntityKey('Daniel Boley'));
 assert.notEqual(course.entityId,instructor.entityId);
});

test('shared web/extension grade view model aggregates only current instructors',()=>{
 const c:any={course:{data:{code:'CSCI 5302'},stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')},sections:{data:[{instructors:[{id:'umn:boley',name:'Daniel Boley',aliases:['Daniel Boley']}]}],stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')},grades:{data:{courseCode:'CSCI 5302',totalStudents:383,grades:{A:147,B:26,F:8},distributions:[{instructorName:'Daniel Boley',term:'1263',students:40,grades:{A:20,B:15,F:5}},{instructorName:'Daniel Boley',term:'1253',students:35,grades:{A:17,B:14,F:4}},{instructorName:'Other Person',term:'1263',students:100,grades:{A:90,F:10}}]},stale:false,provenance:prov('gophergrades','1253–1263'),health:health('gophergrades')},feedback:{data:null,stale:false,provenance:prov('umn-srt'),health:health('umn-srt')},community:[]};
 const h=currentInstructorGradeHistory(c);assert.equal(h.length,1);assert.equal(h[0].name,'Daniel Boley');assert.equal(referenceEntityLabel(c,'instructor','instructor:daniel boley'),'Daniel Boley');assert.equal(referenceEntityLabel(c,'course','CSCI 5302'),'Course');assert.equal(h[0].students,75);assert.deepEqual(h[0].terms,['1253','1263']);assert.deepEqual(h[0].grades,{A:37,B:29,F:9});
 const html=gradesHTML(c);assert.match(html,/Current instructor historical records/);assert.match(html,/Daniel Boley/);assert.match(html,/75 historical students/);assert.doesNotMatch(html,/Other Person/);
});

test('course-intelligence view models aggregate term trends and neutral discussion themes without sentiment',()=>{const c:any={course:{data:{code:'CSCI 5302'},stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')},sections:{data:[],stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')},grades:{data:{courseCode:'CSCI 5302',totalStudents:70,grades:{A:40,B:30},distributions:[{instructorName:'A',term:'1259',students:30,grades:{A:20,B:10}},{instructorName:'B',term:'1259',students:10,grades:{A:5,B:5}},{instructorName:'A',term:'1263',students:30,grades:{A:15,B:15}}]},stale:false,provenance:prov('gophergrades'),health:health('gophergrades')},feedback:{data:null,stale:false,provenance:prov('umn-srt'),health:health('umn-srt')},community:[makeReference('CSCI 5302','CSCI 5302 workload and projects','https://www.reddit.com/r/uofmn/comments/aaa111/','Weekly workload and projects come up often','2026-09-01'),makeReference('CSCI 5302','CSCI 5302 exam discussion','https://www.reddit.com/r/uofmn/comments/bbb222/','Exam workload discussion','2026-09-02')]};const trend=gradeTermTrend(c);assert.deepEqual(trend.map(x=>[x.term,x.students]),[['1259',40],['1263',30]]);assert.ok(trend.every(x=>typeof x.gpa==='number'));assert.deepEqual(communityTopicSummary(c).slice(0,3),[{topic:'workload',count:2},{topic:'exam',count:1},{topic:'projects',count:1}]);});

test('course context merges only exact current-section instructor references with course references',async()=>{
 const store=new Store(':memory:');
 try{
  store.reference(makeReference('CSCI 5302','CSCI 5302 with Daniel Boley?','https://www.reddit.com/r/uofmn/comments/kal74z/'));
  store.reference(makeInstructorReference('Daniel Boley','Daniel Boley at University of Minnesota - Twin Cities','https://www.ratemyprofessors.com/professor/309254'));
  store.reference(makeInstructorReference('Different Person','Different Person at University of Minnesota - Twin Cities','https://www.ratemyprofessors.com/professor/123456'));
  const service=new ContextService(store);
  const course={institution:'UMNTC' as const,term:'1273',subject:'CSCI',catalogNumber:'5302',code:'CSCI 5302',title:'Analysis of Numerical Algorithms',description:'Fixture',credits:3,prerequisites:'No prerequisites',prerequisiteRule:{type:'allOf' as const,rules:[]},attributes:[],sectionIds:['57085'],equivalents:[],sourceRefs:{},provenance:prov('umn-schedule-builder')};
  const section={classNumber:'57085',sectionNumber:'001',courseCode:'CSCI 5302',term:'1273',component:'LEC',credits:3,instructors:[{id:'umn:boley',name:'Daniel Boley',internetId:'boley',aliases:['Daniel Boley']}],meetings:[{days:['mon','wed'],startTime:'16:00',endTime:'17:15',location:'Keller Hall 3-115'}],capacity:100,enrolled:36,open:true,enrollable:true,instructionMode:'In Person',restrictions:[],prerequisiteRule:{type:'allOf' as const,rules:[]},linkedClassNumbers:[],unresolvedLinks:false,scheduleKnown:true,provenance:prov('umn-schedule-builder')};
  (service.sb as any).fetchCourse=async()=>({data:course,stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')});
  (service.sb as any).fetchSections=async()=>({data:[section],stale:false,provenance:prov('umn-schedule-builder'),health:health('umn-schedule-builder')});
  (service.gg as any).fetch=async()=>({data:null,stale:false,provenance:prov('gophergrades','historical'),health:health('gophergrades')});
  (service.srt as any).fetch=async()=>({data:null,stale:false,provenance:prov('umn-srt','unavailable'),health:health('umn-srt')});
  const result=await service.get('CSCI 5302','1273');
  assert.deepEqual(result.community.map(r=>[r.entityType,r.entityId,r.source]).sort(),[
   ['course','CSCI 5302','reddit'],
   ['instructor','instructor:daniel boley','ratemyprofessor']
  ]);
  assert.ok(!result.community.some(r=>r.entityId==='instructor:different person'));
 }finally{store.close();}
});
