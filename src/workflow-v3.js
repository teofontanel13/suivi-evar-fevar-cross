// V3 — règles métier indépendantes de l'interface et de Supabase.
// Dates locales au format YYYY-MM-DD pour éviter les décalages UTC.
export const WORKFLOWS = Object.freeze({
  EVAR: ['Scanner reçu','Sizing envoyé au chirurgien','Sizing validé par le chirurgien','UOR envoyé'],
  FEVAR: ['Scanner reçu','Scanner envoyé au Planning Center','Graft plan reçu','Graft plan signé','Devis envoyé','Devis signé','Ancillaires envoyés'],
  CROSS: ['Scanner reçu','Scanner envoyé au Planning Center','Graft plan reçu','Graft plan signé','Devis envoyé','Devis signé','Ancillaires envoyés']
});
export const DEADLINES = Object.freeze({EVAR:{action:'UOR envoyé',reminder:14,limit:7},FEVAR:{action:'Ancillaires envoyés',reminder:30,limit:30},CROSS:{action:'Ancillaires envoyés',reminder:30,limit:30}});
const parseDate = date => {const [y,m,d]=date.split('-').map(Number);return new Date(y,m-1,d,12)};
const formatDate = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const shift = (date,days) => {const d=parseDate(date);d.setDate(d.getDate()+days);return formatDate(d)};
const isWeekend = date => [0,6].includes(parseDate(date).getDay());
const frenchHolidays = year => {
  // Pâques selon Meeus/Jones/Butcher.
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
  const easter=formatDate(new Date(year,Math.floor(n/31)-1,n%31+1,12));
  return new Set([1,8,15].map(day=>`${year}-05-${String(day).padStart(2,'0')}`).concat([
    `${year}-01-01`,`${year}-07-14`,`${year}-08-15`,`${year}-11-01`,`${year}-11-11`,`${year}-12-25`,
    shift(easter,1),shift(easter,39),shift(easter,50)
  ]));
};
export const isWorkingDay = date => !!date && !isWeekend(date) && !frenchHolidays(Number(date.slice(0,4))).has(date);
export function addWorkingDays(date,days=3){if(!date)return null;let result=date,remaining=days;while(remaining>0){result=shift(result,1);if(isWorkingDay(result))remaining--}return result}
export function previousWorkingDay(date){if(!date)return null;let result=date;while(!isWorkingDay(result))result=shift(result,-1);return result}
export function logisticDeadlines(type,surgeryDate){const rule=DEADLINES[type];if(!rule||!surgeryDate)return null;return {action:rule.action,reminder:previousWorkingDay(shift(surgeryDate,-rule.reminder)),limit:previousWorkingDay(shift(surgeryDate,-rule.limit))}}
export const estimatedDelivery = signedQuoteDate => signedQuoteDate?shift(signedQuoteDate,42):null;
export function alertLevel(dueDate,referenceDate){if(!dueDate)return 'green';const current=referenceDate||formatDate(new Date());return dueDate<current?'red':dueDate===current?'orange':'green'}
export function mostUrgent(actions,referenceDate){const rank={red:0,orange:1,green:2};return [...actions].sort((a,b)=>rank[a.level||alertLevel(a.due,referenceDate)]-rank[b.level||alertLevel(b.due,referenceDate)]||(a.due||'9999').localeCompare(b.due||'9999'))[0]||null}
