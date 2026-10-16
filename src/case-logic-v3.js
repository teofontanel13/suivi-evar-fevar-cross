import {WORKFLOWS,logisticDeadlines,addWorkingDays,alertLevel,mostUrgent} from './workflow-v3.js';

export const normalizeReference=value=>String(value??'').trim().toLocaleLowerCase('fr');
export const hasDuplicateReference=(records,reference,exceptId=null)=>records.some(d=>d.id!==exceptId&&normalizeReference(d.reference)===normalizeReference(reference));
export const stepDone=(d,step)=>Boolean(d.steps?.[step]);
export const completed=d=>Boolean(d.steps?.['Intervention réalisée'])||d.archiveReason==='performed';
export const nextStep=d=>(WORKFLOWS[d.type]||[]).find(step=>!stepDone(d,step))||'Terminé';

export function caseActions(d,referenceDate){
 if(d.archived)return [];
 const result=[];
 if(d.type==='EVAR'&&stepDone(d,'Sizing envoyé au chirurgien')&&!stepDone(d,'Sizing validé par le chirurgien')){
  result.push({label:'Relancer validation sizing',due:addWorkingDays(d.lastRelance?.sizing||d.steps['Sizing envoyé au chirurgien'],3),key:'sizing'});
 }
 if(['FEVAR','CROSS'].includes(d.type)&&stepDone(d,'Devis envoyé')&&!stepDone(d,'Devis signé')){
  result.push({label:'Relancer signature devis',due:addWorkingDays(d.lastRelance?.quote||d.steps['Devis envoyé'],3),key:'quote'});
 }
 const deadlines=logisticDeadlines(d.type,d.surgery);
 if(deadlines&&!stepDone(d,deadlines.action)){
  const blocked=d.type==='EVAR'&&!stepDone(d,'Sizing validé par le chirurgien');
  result.push({label:(blocked?'Validation sizing manquante · ':'')+deadlines.action,due:deadlines.reminder,limit:deadlines.limit,key:'logistics'});
 }
 return result.map(a=>({...a,level:alertLevel(a.due,referenceDate),hardLimitReached:Boolean(a.limit&&referenceDate>=a.limit)}));
}
export const caseSeverity=(d,date)=>{const actions=caseActions(d,date);return actions.some(a=>a.level==='red')?'red':actions.some(a=>a.level==='orange')?'orange':'green'};
export const caseWaiting=(d,date)=>d.archived?(d.archiveReason==='cancelled'?'Intervention annulée':'Intervention réalisée'):(mostUrgent(caseActions(d,date),date)?.label||nextStep(d));
export const sortedCases=(records,date)=>[...records].sort((a,b)=>(a.surgery||'9999-12-31').localeCompare(b.surgery||'9999-12-31')||({red:0,orange:1,green:2}[caseSeverity(a,date)]-{red:0,orange:1,green:2}[caseSeverity(b,date)]));
export function setStep(d,step,checked,date){
 d.steps??={};d.lastRelance??={};
 if(checked)d.steps[step]=date;else delete d.steps[step];
 if(['Sizing envoyé au chirurgien','Sizing validé par le chirurgien'].includes(step))delete d.lastRelance.sizing;
 if(['Devis envoyé','Devis signé'].includes(step))delete d.lastRelance.quote;
 if(step==='Intervention réalisée'){
  d.archived=checked;
  if(checked)d.archiveReason='performed';else delete d.archiveReason;
 }
 return d;
}
export function toggleCancelledArchive(d){
 if(d.archived){d.archived=false;delete d.archiveReason;delete d.steps?.['Intervention réalisée'];}
 else{d.archived=true;d.archiveReason='cancelled';}
 return d;
}
