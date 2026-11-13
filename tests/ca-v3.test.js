import test from 'node:test';import assert from 'node:assert/strict';import {components,forecastLines,forecastTotals} from '../src/ca-v3.js';
const d=(type,caItems,extra={})=>({id:'1',reference:'TEST',type,caItems,surgery:'2027-01-12',deliveryDate:'2026-12-18',...extra});
test('EVAR with 2 legs and ZBIS uses validated package prices',()=>{assert.equal(components(d('EVAR',{evar:1,leg:2})).reduce((s,x)=>s+x.amount,0),4713);assert.equal(components(d('EVAR',{evar:1,leg:2,zbis:1})).reduce((s,x)=>s+x.amount,0),7746);assert.equal(components(d('EVAR',{evar:1,leg:2,zbis:2})).reduce((s,x)=>s+x.amount,0),10779)});
test('TBRANCH includes main body unibody and two legs',()=>assert.equal(components(d('TBRANCH',null)).reduce((s,x)=>s+x.amount,0),14593));
test('FEVAR custom is attributed to delivery month, standard leg to surgery month',()=>{const total=forecastTotals([d('FEVAR',{fevar:1,leg:2})]);assert.equal(total.byMonth['2026-12'],13308);assert.equal(total.byMonth['2027-01'],1826)});
test('delivered custom stays after cancellation but standard implants do not',()=>{const total=forecastTotals([d('FEVAR',{fevar:1,leg:2},{archiveReason:'cancelled',archived:true,deliveryActualDate:'2026-12-19'})]);assert.equal(total.total,13308);assert.equal(total.byMonth['2026-12'],13308)});
test('undelivered cancelled custom is not projected',()=>assert.equal(forecastTotals([d('FEVAR',{fevar:1},{archiveReason:'cancelled'})]).total,0));
test('standby amounts are separated',()=>assert.equal(forecastTotals([d('EVAR',{evar:1,leg:2},{standbySince:'2026-11-01'})]).standby,4713));
