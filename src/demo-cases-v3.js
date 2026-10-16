import {WORKFLOWS} from './workflow-v3.js';

const rows=[
 ['EVAR',-3,2,-12,'Dr Martin','Hôpital Démo Marseille'],
 ['FEVAR',5,5,-32,'Dr Laurent','Centre Démo Nice'],
 ['CROSS',12,3,-20,'Dr Bernard','Clinique Démo Aix'],
 ['EVAR',2,4,-24,'Dr Martin','Hôpital Démo Marseille'],
 ['FEVAR',24,6,-55,'Dr Petit','Centre Démo Nice'],
 ['EVAR',21,1,-2,'Dr Moreau','Hôpital Démo Toulon'],
 ['CROSS',45,7,-62,'Dr Bernard','Clinique Démo Aix'],
 ['FEVAR',-1,4,-36,'Dr Laurent','Hôpital Démo Monaco'],
 ['EVAR',8,3,-17,'Dr Moreau','Hôpital Démo Toulon'],
 ['CROSS',null,2,-7,'Dr Petit','Clinique Démo Aix'],
 ['FEVAR',62,1,-1,'Dr Martin','Hôpital Démo Marseille'],
 ['EVAR',-9,5,-35,'Dr Laurent','Centre Démo Nice'],
 ['CROSS',31,5,-42,'Dr Bernard','Hôpital Démo Monaco'],
 ['FEVAR',14,7,-70,'Dr Moreau','Hôpital Démo Toulon'],
 ['EVAR',null,0,0,'Dr Petit','Centre Démo Nice']
];
const dateOffset=(origin,days)=>{const d=new Date(origin+'T12:00:00');d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
export function demoCases(origin){
 return rows.map(([type,untilSurgery,done,stepStart,surgeon,hospital],index)=>{
  const steps={};
  WORKFLOWS[type].slice(0,done).forEach((step,i)=>steps[step]=dateOffset(origin,stepStart+i*2));
  const archived=done===WORKFLOWS[type].length;
  return {id:crypto.randomUUID(),reference:'DEMO-'+type+'-'+String(index+1).padStart(3,'0'),type,
   surgery:untilSurgery===null?'':dateOffset(origin,untilSurgery),time:'',
   steps,lastRelance:{},notes:'Données entièrement fictives — scénario de démonstration',
   surgeon,hospital,enumber:type==='EVAR'?'':'E-DEMO-'+String(1000+index),
   archived,archiveReason:archived?'performed':undefined,stents:[]};
 });
}
