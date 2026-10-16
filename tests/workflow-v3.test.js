import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKFLOWS,addWorkingDays,previousWorkingDay,logisticDeadlines,estimatedDelivery,alertLevel,mostUrgent,isWorkingDay} from '../src/workflow-v3.js';

test('workflow: each procedure has its correct steps',()=>{
 assert.equal(WORKFLOWS.EVAR.length,4);
 assert.equal(WORKFLOWS.FEVAR.length,7);
 assert.deepEqual(WORKFLOWS.FEVAR,WORKFLOWS.CROSS);
});
test('working days skip weekends and French national holidays',()=>{
 assert.equal(addWorkingDays('2026-10-16',3),'2026-10-21');
 assert.equal(addWorkingDays('2026-07-10',3),'2026-07-16'); // Tuesday July 14 holiday
 assert.equal(addWorkingDays('2026-12-24',3),'2026-12-30'); // Christmas
 assert.equal(isWorkingDay('2026-05-14'),false); // Ascension
 assert.equal(isWorkingDay('2026-05-25'),false); // Pentecost Monday
 assert.equal(isWorkingDay('2026-04-06'),false); // Easter Monday
 assert.equal(previousWorkingDay('2026-11-01'),'2026-10-30');
});
test('EVAR UOR reminder and hard deadline shift backwards',()=>{
 assert.deepEqual(logisticDeadlines('EVAR','2026-11-16'),{action:'UOR envoyé',reminder:'2026-11-02',limit:'2026-11-09'});
});
test('FEVAR/CROSS ancillary deadlines use J-30 and J-21',()=>{
 for(const type of ['FEVAR','CROSS']){
  assert.deepEqual(logisticDeadlines(type,'2026-12-01'),{action:'Ancillaires envoyés',reminder:'2026-10-30',limit:'2026-11-10'});
 }
});
test('missing surgery date has no logistics alert',()=>{
 assert.equal(logisticDeadlines('EVAR',''),null);
 assert.equal(logisticDeadlines('FEVAR',null),null);
});
test('red orange green alert levels',()=>{
 assert.equal(alertLevel('2026-10-15','2026-10-16'),'red');
 assert.equal(alertLevel('2026-10-16','2026-10-16'),'orange');
 assert.equal(alertLevel('2026-10-17','2026-10-16'),'green');
 assert.equal(alertLevel(null,'2026-10-16'),'green');
});
test('prioritize red over orange over upcoming, even with explicit action levels',()=>{
 const actions=[{label:'tomorrow',due:'2026-10-17',level:'green'},{label:'today',due:'2026-10-16',level:'orange'},{label:'late',due:'2026-10-15',level:'red'}];
 assert.equal(mostUrgent(actions,'2026-10-16').label,'late');
});
test('production estimate is informational and exactly 42 calendar days',()=>{
 assert.equal(estimatedDelivery('2026-10-16'),'2026-11-27');
 assert.equal(estimatedDelivery(null),null);
});
