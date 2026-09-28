import type {CourseContext,Schedule} from '../schemas/index.ts';

export type HistoricalGradeSignal={aRangeShare:number;minimumSample:number;courseCount:number};

// Compare only complete, current course-wide evidence. A missing course is not
// assigned a guessed grade outcome, and larger classes do not dominate a plan.
export function historicalGradeSignal(schedule:Schedule,contexts:CourseContext[]):HistoricalGradeSignal|undefined{
 if(!schedule.courses.length)return;
 const shares:number[]=[],samples:number[]=[];
 for(const course of schedule.courses){
  const evidence=contexts.find(c=>c.course.data?.code===course.code&&c.course.data?.campus===course.campus&&c.course.data?.term===course.term)?.grades;
  if(!evidence?.data||evidence.stale)return;
  const grades=evidence.data.grades;
  const entries=Object.entries(grades).filter(([grade,count])=>/^(?:[ABCDF][+-]?)$/.test(grade)&&Number.isFinite(count)&&count>=0);
  const count=entries.reduce((sum,[,value])=>sum+value,0);
  if(count<30)return;
  const a=entries.filter(([grade])=>/^A[+-]?$/.test(grade)).reduce((sum,[,value])=>sum+value,0);
  shares.push(a/count);samples.push(count);
 }
 return{aRangeShare:shares.reduce((sum,value)=>sum+value,0)/shares.length,minimumSample:Math.min(...samples),courseCount:shares.length};
}
