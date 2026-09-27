export type APASMatrixFixture={name:string;kind:'degree'|'major'|'minor'|'certificate';html:string;expected:{strict:number;candidate:number;unknown:number;bucket:string;discovery:string}};
function shell(name:string,body:string){return `<body><div id="audit"><div class="card-header"><h2>${name}</h2></div>${body}</div></body>`;}
function exact(name:string,subject:string,number:string,kind:APASMatrixFixture['kind']='degree'):APASMatrixFixture{return{name,kind,html:shell(name,`<div class="requirement Status_NO" rname="R" rqdsubreq="1"><div class="reqTitle">Approved ${subject} course</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1${subject}" number="${number}"></span></td></tr></tbody></table></div>`),expected:{strict:1,candidate:0,unknown:0,bucket:'count',discovery:`${subject} ${number}`}};}
export const APAS_MATRIX_FIXTURES:APASMatrixFixture[]=[
 exact('Psychology BA','PSY','3001'),
 exact('Statistics Major','STAT','3021','major'),
 exact('Biology BS','BIOL','4003'),
 exact('Marketing Major','MKTG','3010','major'),
 exact('Graphic Design BFA','GDES','3351'),
 exact('Nursing BSN','NURS','3700'),
 exact('Food Science BS','FSCN','4112'),
 exact('Educational Psychology Minor','EPSY','3264','minor'),
 {name:'Computer Science BS',kind:'degree',html:shell('Computer Science BS','<div class="requirement Status_IP" rname="UPPER"><div class="reqTitle">4xxx/5xxx-level CSCI coursework</div><div class="reqBody"></div></div>'),expected:{strict:1,candidate:0,unknown:0,bucket:'nested',discovery:'CSCI'}},
 {name:'Journalism BA',kind:'degree',html:shell('Journalism BA','<div class="requirement Status_IP" rname="DES"><div class="reqTitle">11 credits must have a JOUR designator.</div><div class="reqBody"></div></div>'),expected:{strict:1,candidate:0,unknown:0,bucket:'credits',discovery:'JOUR'}},
 {name:'History Minor',kind:'minor',html:shell('History Minor','<div class="requirement Status_NO" rname="HIST" rqdhours="6"><div class="reqTitle">Upper-division History electives</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1HIST" number="3XXX"></span></td></tr></tbody></table></div>'),expected:{strict:1,candidate:0,unknown:0,bucket:'credits',discovery:'HIST'}},
 {name:'Data Science Certificate',kind:'certificate',html:shell('Data Science Certificate','<div class="requirement Status_NO" rname="DSCI" rqdsubreq="1"><div class="reqTitle">Certificate elective</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1DSCI" number="3001"></span></td></tr></tbody></table></div>'),expected:{strict:1,candidate:0,unknown:0,bucket:'count',discovery:'DSCI 3001'}},
 {name:'Environmental Sciences Minor',kind:'minor',html:shell('Environmental Sciences Minor','<div class="requirement Status_NO" rname="CAP" rqdhours="12" maxhours="9"><div class="reqTitle">Take up to 9 credits from the following list. Note: cap applies.</div><table class="selectcourses"><tbody><tr><td><span class="course" department="1ESCI" number="3001"></span><span class="course" department="1ESCI" number="3002"></span></td></tr></tbody></table></div>'),expected:{strict:0,candidate:1,unknown:0,bucket:'candidateOnly',discovery:'ESCI 3001'}}
];
