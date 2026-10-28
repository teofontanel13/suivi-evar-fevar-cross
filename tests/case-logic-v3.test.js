import test from 'node:test';
import assert from 'node:assert/strict';
import {hasDuplicateReference,caseActions,caseSeverity,caseWaiting,sortedCases,setStep,toggleCancelledArchive,completed,nextStep} from '../src/case-logic-v3.js';

const base=(type='EVAR')=>({id:'1',reference:'TEST-1',type,surgery:'2026-11-16',steps:{},lastRelance:{},archived:false});

test('references unique regardless of whitespace, case, archives and editing same record',()=>{
 const records=[base(),{...base('FEVAR'),id:'2',reference:'Archive-1',archived:true}];
 assert.equal(hasDuplicateReference(records,' test-1 '),true);
 assert.equal(hasDuplicateReference(records,'ARCHIVE-1'),true);
 assert.equal(hasDuplicateReference(records,'test-1','1'),false);
 assert.equal(hasDuplicateReference(records,'new'),false);
});

test('EVAR sizing reminders repeat every three working days and stop at validation',()=>{
 const d=base();d.steps['Sizing envoyé au chirurgien']='2026-10-16';
 assert.equal(caseActions(d,'2026-10-21').find(a=>a.key==='step:Sizing validé par le chirurgien').level,'orange');
 d.lastRelance.sizing='2026-10-21';
 assert.equal(caseActions(d,'2026-10-22').find(a=>a.key==='step:Sizing validé par le chirurgien').due,'2026-10-26');
 setStep(d,'Sizing validé par le chirurgien',true,'2026-10-22');
 assert.equal(caseActions(d,'2026-10-22').some(a=>a.key==='step:Sizing validé par le chirurgien'),false);
 assert.equal(d.lastRelance.sizing,undefined);
});

test('FEVAR and CROSS quote reminder repeats and stops at signature',()=>{
 for(const type of ['FEVAR','CROSS']){
  const d=base(type);d.steps['Devis envoyé']='2026-10-16';
  assert.equal(caseActions(d,'2026-10-22').find(a=>a.key==='step:Devis signé').level,'red');
  d.lastRelance.quote='2026-10-22';
  assert.equal(caseActions(d,'2026-10-22').find(a=>a.key==='step:Devis signé').due,'2026-10-27');
  setStep(d,'Devis signé',true,'2026-10-23');
  assert.equal(caseActions(d,'2026-10-23').some(a=>a.key==='step:Devis signé'),false);
 }
});

test('EVAR logistics due and hard deadline, blocked until sizing validation',()=>{
 const d=base();
 const a=caseActions(d,'2026-11-09').find(a=>a.key==='logistics');
 assert.equal(a.due,'2026-11-02');
 assert.equal(a.level,'red');
 assert.equal(a.hardLimitReached,true);
 assert.match(a.label,/Validation sizing manquante/);
 setStep(d,'Sizing validé par le chirurgien',true,'2026-11-09');
 assert.doesNotMatch(caseActions(d,'2026-11-09').find(a=>a.key==='logistics').label,/manquante/);
 setStep(d,'UOR envoyé',true,'2026-11-09');
 assert.equal(caseActions(d,'2026-11-09').some(a=>a.key==='logistics'),false);
});

test('no surgery date means no logistic alert; changing surgery date recalculates',()=>{
 const d=base('FEVAR');d.surgery='';
 assert.equal(caseActions(d,'2026-10-16').length,0);
 d.surgery='2026-12-01';
 assert.equal(caseActions(d,'2026-10-16').find(a=>a.key==='logistics').due,'2026-10-30');
 d.surgery='2026-12-08';
 assert.equal(caseActions(d,'2026-10-16').find(a=>a.key==='logistics').due,'2026-11-06');
});

test('completed status is derived from the archive state, not a checkbox',()=>{
 const d=base('FEVAR');d.surgery='2026-10-01';
 assert.equal(completed(d),false);
 d.archived=true;d.archiveReason='performed';
 assert.equal(completed(d),true);
 assert.deepEqual(caseActions(d,'2026-10-16'),[]);
 assert.equal(caseWaiting(d,'2026-10-16'),'Intervention réalisée');
});

test('cancelled archive can be reopened without losing steps',()=>{
 const d=base('FEVAR');d.steps['Devis envoyé']='2026-10-01';
 toggleCancelledArchive(d);
 assert.equal(d.archiveReason,'cancelled');
 assert.deepEqual(caseActions(d,'2026-11-20'),[]);
 toggleCancelledArchive(d);
 assert.equal(d.archived,false);
 assert.equal(d.archiveReason,undefined);
 assert.equal(d.steps['Devis envoyé'],'2026-10-01');
 assert.equal(nextStep(d),'Scanner reçu');
});

test('priorities sort late actions first; dated cases before undated',()=>{
 const red=base();red.surgery='2026-11-16';
 const green=base();green.id='2';green.surgery='2026-11-16';green.steps['UOR envoyé']='2026-10-01';
 const undated=base();undated.id='3';undated.surgery='';
 assert.deepEqual(sortedCases([undated,green,red],'2026-11-10').map(d=>d.id),['1','2','3']);
 assert.equal(caseSeverity(red,'2026-11-10'),'red');
 assert.equal(caseSeverity(green,'2026-11-10'),'green');
});

test('next action follows workflow even when ancillary reminder is more urgent',()=>{
 const d=base('FEVAR');d.surgery='2026-12-25';
 d.steps['Scanner reçu']='2026-10-16';
 d.steps['Scanner envoyé au Planning Center']='2026-10-16';
 assert.equal(caseWaiting(d,'2026-11-25'),'Graft plan reçu');
 assert.equal(caseActions(d,'2026-11-25').some(a=>a.key==='logistics'),true);
});

test('each workflow transition starts a three-working-day reminder, then resets after a relance',()=>{
 for(const type of ['EVAR','FEVAR','CROSS']){
  const d=base(type);d.surgery='';
  const steps=type==='EVAR'?['Scanner reçu','Sizing envoyé au chirurgien','Sizing validé par le chirurgien','UOR envoyé']:['Scanner reçu','Scanner envoyé au Planning Center','Graft plan reçu','Graft plan signé','Devis envoyé','Devis signé','Ancillaires envoyés'];
  for(let i=1;i<steps.length;i++){
   setStep(d,steps[i-1],true,'2026-10-16');
   const key='step:'+steps[i];
   assert.equal(caseActions(d,'2026-10-21').find(a=>a.key===key)?.due,'2026-10-21');
   d.lastRelance[key]='2026-10-21';
   assert.equal(caseActions(d,'2026-10-22').find(a=>a.key===key)?.due,'2026-10-26');
   setStep(d,steps[i],true,'2026-10-22');
   assert.equal(caseActions(d,'2026-10-22').some(a=>a.key===key),false);
  }
 }
});

test('routine relance is orange, but missed logistic deadline is red',()=>{
 const d=base('EVAR');d.surgery='2026-12-20';d.steps['Scanner reçu']='2026-10-16';
 assert.equal(caseSeverity(d,'2026-10-22'),'orange');
 assert.equal(caseSeverity(d,'2026-12-11'),'orange');
 assert.equal(caseSeverity(d,'2026-12-14'),'red');
 const f=base('FEVAR');f.surgery='2026-12-25';
 assert.equal(caseSeverity(f,'2026-11-25'),'orange');
 assert.equal(caseSeverity(f,'2026-11-26'),'red');
 setStep(f,'Ancillaires envoyés',true,'2026-11-26');
 assert.notEqual(caseSeverity(f,'2026-11-26'),'red');
});
