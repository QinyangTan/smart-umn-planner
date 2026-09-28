import type{DegreeRequirement,GeneralEducationCatalog,StudentAcademicProfile}from'../schemas/index.ts';

function norm(value:string){return value.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();}
function exactCatalogMatch(label:string,name:string):boolean{
 const l=norm(label),n=norm(name);if(l===n)return true;
 const rest=l.startsWith(n)?l.slice(n.length).trim():'';
 return /^(?:needs\s*:\s*1\s+(?:course|group)|1\s+(?:course|group)\s+(?:needed|required))\b/.test(rest);
}
function qualifiedCatalogCandidate(label:string,name:string):boolean{const l=norm(label),n=norm(name);if(!l.startsWith(n)||l===n)return false;const rest=l.slice(n.length).trim();return /^(?:with|including|plus|required|requirement\b)/.test(rest);}
function enrichRequirement(r:DegreeRequirement,catalog:GeneralEducationCatalog):DegreeRequirement{
 const children=r.children.map(c=>enrichRequirement(c,catalog));
 if(r.status!=='incomplete'&&r.status!=='in_progress')return{...r,children};
 if(r.rule.type==='policy'&&r.rule.family==='qualified-attribute'){
  const category=typeof r.rule.parameters.categoryLabel==='string'?r.rule.parameters.categoryLabel:'';const candidate=category?catalog.requirements.find(x=>exactCatalogMatch(category,x.name)):undefined;if(!candidate)return{...r,children};
  return{...r,children,candidateRule:r.candidateRule||{type:'attribute',attribute:candidate.attribute,value:candidate.value,name:candidate.name,campus:catalog.campus},rawMetadata:{...r.rawMetadata,catalogEnrichment:{source:'umn-schedule-builder',campus:catalog.campus,term:catalog.term,attribute:candidate.attribute,value:candidate.value,name:candidate.name,confidence:'qualified-policy-candidate'}}};
 }
 if(r.rule.type!=='unknown')return{...r,children};
 const label=typeof r.rawMetadata.originalLabel==='string'?r.rawMetadata.originalLabel:r.label;
 const match=catalog.requirements.find(x=>exactCatalogMatch(label,x.name));if(match)return{...r,children,rule:{type:'attribute',attribute:match.attribute,value:match.value,name:match.name,campus:catalog.campus},candidateRule:r.candidateRule||{type:'attribute',attribute:match.attribute,value:match.value,name:match.name,campus:catalog.campus},rawMetadata:{...r.rawMetadata,catalogEnrichment:{source:'umn-schedule-builder',campus:catalog.campus,term:catalog.term,attribute:match.attribute,value:match.value,name:match.name,confidence:'exact'}}};
 const candidate=catalog.requirements.find(x=>qualifiedCatalogCandidate(label,x.name));if(!candidate)return{...r,children};
 return{...r,children,candidateRule:r.candidateRule||{type:'attribute',attribute:candidate.attribute,value:candidate.value,name:candidate.name,campus:catalog.campus},rawMetadata:{...r.rawMetadata,catalogEnrichment:{source:'umn-schedule-builder',campus:catalog.campus,term:catalog.term,attribute:candidate.attribute,value:candidate.value,name:candidate.name,confidence:'qualified-candidate'}}};
}
/** Exact official category labels become strict rules. A label that starts with an
 * official category but adds a qualifier (for example a lab condition) becomes a
 * candidate route only; the qualifier is never silently discarded.
 */
export function enrichGeneralEducation(profile:StudentAcademicProfile,catalog?:GeneralEducationCatalog|null):StudentAcademicProfile{
 if(!catalog||profile.program.campus&&profile.program.campus!==catalog.campus)return profile;
 return{...profile,requirements:profile.requirements.map(r=>enrichRequirement(r,catalog)),additionalPrograms:profile.additionalPrograms?.map(p=>p.program.campus&&p.program.campus!==catalog.campus?p:({...p,requirements:p.requirements.map(r=>enrichRequirement(r,catalog))}))};
}
