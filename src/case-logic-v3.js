import {WORKFLOWS,logisticDeadlines,addWorkingDays,alertLevel,mostUrgent} from './workflow-v3.js';

export const normalizeReference=value=>String(value??'').trim().toLocaleLowerCase('fr');
export const hasDuplicateReference=(records,reference,exceptId=null)=>records.some(d=>d.id!==exceptId&&normalizeReference(d.reference)===normalizeReference(reference));
export const stepDone=(d,step)=>Boolean(d.steps?.[step]);
export const completed=d=>d.archiveReason==='performed';
export const nextStep=d=>(WORKFLOWS[d.type]||[]).find(step=>!stepDone(d,step))||'Terminé';

export function caseActions(d,referenceDate){
 if(d.archived)return [];
 const result=[];
 const workflow=WORKFLOWS[d.type]||[];
 for(let i=1;i<workflow.length;i++){
  const previous=workflow[i-1],step=workflow[i];
  if(!stepDone(d,previous)||stepDone(d,step))continue;
  const legacyKey=d.type==='EVAR'&&step==='Sizing validé par le chirurgien'?'sizing':step==='Devis signé'?'quote':null;
  const key='step:'+step;
  const last=d.lastRelance?.[key]||(legacyKey?d.lastRelance?.[legacyKey]:null);
  const label=legacyKey==='sizing'?'Relancer validation sizing':legacyKey==='quote'?'Relancer signature devis':'Relancer : '+step;
  result.push({label,due:addWorkingDays(last||d.steps[previous],3),key});
 }
 const deadlines=logisticDeadlines(d.type,d.surgery);
 if(deadlines&&!stepDone(d,deadlines.action)){
  const blocked=d.type==='EVAR'&&!stepDone(d,'Sizing validé par le chirurgien');
  result.push({label:(blocked?'Validation sizing manquante · ':'')+deadlines.action,due:deadlines.reminder,limit:deadlines.limit,key:'logistics'});
 }
 return result.map(a=>({...a,level:alertLevel(a.due,referenceDate),hardLimitReached:Boolean(a.limit&&referenceDate>=a.limit)}));
}
export const caseSeverity=(d,date)=>{const actions=caseActions(d,date);return actions.some(a=>a.key==='logistics'&&a.hardLimitReached)?'red':actions.some(a=>a.key!=='logistics'&&a.level!=='green')?'orange':actions.some(a=>a.key==='logistics'&&a.level!=='green')?'orange':'green'};
export const caseWaiting=(d,date)=>d.archived?(d.archiveReason==='cancelled'?'Intervention annulée':'Intervention réalisée'):nextStep(d);
export const sortedCases=(records,date)=>[...records].sort((a,b)=>(a.surgery||'9999-12-31').localeCompare(b.surgery||'9999-12-31')||({red:0,orange:1,green:2}[caseSeverity(a,date)]-{red:0,orange:1,green:2}[caseSeverity(b,date)]));
export function setStep(d,step,checked,date){
 d.steps??={};d.lastRelance??={};
 if(checked)d.steps[step]=date;else delete d.steps[step];
 const workflow=WORKFLOWS[d.type]||[];
 const index=workflow.indexOf(step);
 if(index>=0){
  delete d.lastRelance['step:'+step];
  if(index+1<workflow.length)delete d.lastRelance['step:'+workflow[index+1]];
 }
 if(['Sizing envoyé au chirurgien','Sizing validé par le chirurgien'].includes(step))delete d.lastRelance.sizing;
 if(['Devis envoyé','Devis signé'].includes(step))delete d.lastRelance.quote;

 return d;
}
export function toggleCancelledArchive(d){
 if(d.archived){d.archived=false;delete d.archiveReason;}
 else{d.archived=true;d.archiveReason='cancelled';}
 return d;
}
