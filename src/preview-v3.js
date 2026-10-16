import './style.css';
import './preview-v3.css';
import {WORKFLOWS,estimatedDelivery,mostUrgent} from './workflow-v3.js';
import {demoCases} from './demo-cases-v3.js';
import {hasDuplicateReference,stepDone as caseStepDone,completed as caseCompleted,nextStep,caseActions,caseSeverity,caseWaiting,sortedCases,setStep,toggleCancelledArchive} from './case-logic-v3.js';
const KEY='suivi-v3-preview-only';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const frDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):(s||'');
const plus=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')};
const demo=()=>demoCases(today());
let records;try{records=JSON.parse(localStorage.getItem(KEY));if(!Array.isArray(records))throw Error()}catch{records=demo()}
let selected=records[0]?.id||null,kind='all',status='all',counter='',search='',expanded=false,showArchives=false;
const persist=()=>localStorage.setItem(KEY,JSON.stringify(records));
const normalizeChoice=s=>String(s||'').trim().replace(/\s+/g,' ');
const choicesFor=field=>[...new Set(records.map(d=>normalizeChoice(d[field])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
const suggestions=field=>'<datalist id="choices-'+field+'">'+choicesFor(field).map(value=>'<option value="'+esc(value)+'"></option>').join('')+'</datalist>';

const completed=caseCompleted;
const stepDone=caseStepDone;
const actions=d=>caseActions(d,today());
const severity=d=>caseSeverity(d,today());
const next=nextStep;
const waiting=d=>caseWaiting(d,today());
const sorted=ds=>sortedCases(ds,today());
const active=()=>records.filter(d=>!d.archived);
function update(id,patch){const d=records.find(x=>x.id===id);if(!d)return;Object.assign(d,patch);persist();render()}
function download(name,text,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function ics(d){
 if(!d.surgery)return alert('Indique une date.');
 const dt=d.surgery.replaceAll('-',''),clean=s=>String(s||'').replace(/[\\,;\n]/g,c=>({'\\':'\\\\',',':'\\,',';':'\\;','\n':'\\n'}[c]));
 let dates;
 if(!d.time){dates=['DTSTART;VALUE=DATE:'+dt,'DTEND;VALUE=DATE:'+plus(d.surgery,1).replaceAll('-','')]}
 else{const [h,m]=d.time.split(':').map(Number),end=h*60+m+240;dates=['DTSTART:'+dt+'T'+d.time.replace(':','')+'00','DTEND:'+plus(d.surgery,Math.floor(end/1440)).replaceAll('-','')+'T'+String(Math.floor(end/60)%24).padStart(2,'0')+String(end%60).padStart(2,'0')+'00']}
 download('intervention-'+d.reference.replace(/[^a-z0-9_-]/gi,'-')+'.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Suivi V3 Test//FR','BEGIN:VEVENT','UID:'+d.id+'@suivi-v3','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),...dates,'SUMMARY:'+clean('Intervention '+d.type+' - '+d.reference),'DESCRIPTION:'+clean(d.hospital),'END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n','text/calendar');
}
function render(){
 const activeCases=active(),late=activeCases.filter(d=>severity(d)==='red').length,due=activeCases.filter(d=>severity(d)==='orange').length;
 const shown=sorted(records.filter(d=>d.archived===showArchives&&(kind==='all'||d.type===kind)&&(status==='all'||(status==='done'?completed(d):status==='cancelled'?d.archiveReason==='cancelled':!completed(d)&&d.archiveReason!=='cancelled'))&&[d.reference,d.enumber].join(' ').toLowerCase().includes(search)&&(showArchives||!counter||counter==='active'||severity(d)===counter)));
 $('#app').innerHTML='<div class="shell v3"><header><div class="cook-brand" aria-label="Cook Medical"><div class="cook-wordmark">COOK<span class="cook-registered">®</span></div><div class="cook-medical">MEDICAL</div></div><div class="app-subtitle"><h1>Suivi EVAR / FEVAR / CROSS</h1><p>V3 · Environnement de démonstration indépendant</p></div><span class="preview-banner">MODE TEST · Données fictives, stockées dans ce navigateur</span></header><div class="stats">'+[['red',late,'Dossiers en retard'],['orange',due,"À faire aujourd’hui"],['active',activeCases.length,'Dossiers actifs']].map(([k,n,label])=>'<button class="stat '+(counter===k?'active':'')+'" data-counter="'+k+'"><strong>'+n+'</strong><small>'+label+'</small></button>').join('')+'</div><div class="toolbar"><div class="buttons"><button id="activeTab" class="'+(!showArchives?'active':'')+'">Actifs</button><button id="archiveTab" class="'+(showArchives?'active':'')+'">Archives</button><button id="new" class="primary">+ Nouveau dossier</button></div><div class="buttons"><button id="reset">Charger 15 dossiers fictifs</button></div></div><div class="toolbar"><input id="search" placeholder="Recherche référence ou numéro E" value="'+esc(search)+'"><select id="kind"><option value="all">Tous types</option>'+['EVAR','FEVAR','CROSS'].map(t=>'<option '+(kind===t?'selected':'')+'>'+t+'</option>').join('')+'</select><select id="status"><option value="all">Tous statuts</option><option value="pending" '+(status==='pending'?'selected':'')+'>En cours</option><option value="done" '+(status==='done'?'selected':'')+'>Réalisés</option><option value="cancelled" '+(status==='cancelled'?'selected':'')+'>Annulés</option></select></div><div class="layout"><section id="cases">'+shown.map(d=>'<article class="case '+d.type.toLowerCase()+' '+(selected===d.id?'selected':'')+'" data-id="'+d.id+'"><div class="between"><b>'+esc(d.reference)+'</b><span class="pill '+d.type.toLowerCase()+'">'+d.type+'</span></div><div class="between"><small>Intervention : '+esc(d.surgery?frDate(d.surgery):'Sans date')+'</small><span class="signal '+severity(d)+'">'+(severity(d)==='red'?'En retard':severity(d)==='orange'?"Aujourd’hui":'À jour')+'</span></div><small>En attente de : '+esc(waiting(d))+'</small></article>').join('')+(shown.length?'':'<p class="empty">Aucun dossier</p>')+'</section><aside class="panel" id="detail"></aside></div><p class="footer">Aucune connexion Supabase · Aucun dossier réel consulté ou modifié. Version de test locale au navigateur.</p></div>';
 document.querySelectorAll('[data-counter]').forEach(e=>e.onclick=()=>{counter=counter===e.dataset.counter?'':e.dataset.counter;showArchives=false;render()});
 $('#activeTab').onclick=()=>{showArchives=false;counter='';selected=null;render()};
 $('#archiveTab').onclick=()=>{showArchives=true;counter='';selected=null;render()};
 $('#new').onclick=()=>{const overlay=document.createElement('div');overlay.className='v3-modal-overlay';overlay.innerHTML='<form class="v3-modal"><h2>Nouveau dossier</h2><label for="new-reference">Référence interne (sans données patient)</label><input id="new-reference" required maxlength="120" autocomplete="off"><label for="new-type">Type d’intervention</label><select id="new-type"><option value="EVAR">EVAR</option><option value="FEVAR">FEVAR</option><option value="CROSS">CROSS</option></select><label for="new-surgery">Date d’intervention (facultative)</label><input id="new-surgery" type="date" lang="fr-FR"><div class="buttons" style="justify-content:flex-end;margin-top:18px"><button type="button" id="cancel-new">Annuler</button><button type="submit" class="primary">Créer le dossier</button></div></form>';document.body.appendChild(overlay);overlay.querySelector('#new-reference').focus();overlay.querySelector('#cancel-new').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};overlay.querySelector('form').onsubmit=e=>{e.preventDefault();const reference=overlay.querySelector('#new-reference').value.trim(),type=overlay.querySelector('#new-type').value,surgery=overlay.querySelector('#new-surgery').value;if(!reference||!WORKFLOWS[type])return;if(hasDuplicateReference(records,reference)){alert('Cette référence existe déjà. Choisis une autre référence pour créer le dossier.');return;}const d={id:crypto.randomUUID(),reference,type,surgery,time:'',steps:{},lastRelance:{},notes:'',surgeon:'',hospital:'',enumber:'',archived:false,stents:[]};records.unshift(d);selected=d.id;showArchives=false;status='all';kind='all';counter='';search='';persist();overlay.remove();render()}};
 $('#reset').onclick=()=>{if(confirm('Remplacer les dossiers de test de ce navigateur par 15 exemples fictifs ?')){records=demo();selected=null;showArchives=false;kind='all';status='all';counter='';search='';persist();render()}};
 $('#search').oninput=e=>{search=e.target.value.toLowerCase();const caret=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(caret,caret)};
 $('#kind').onchange=e=>{kind=e.target.value;render()};$('#status').onchange=e=>{status=e.target.value;render()};
 document.querySelectorAll('.case').forEach(e=>e.onclick=()=>{selected=e.dataset.id;expanded=false;render()});
 if(!shown.some(d=>d.id===selected))selected=null;
 detail();
}
function detail(){
 const d=records.find(x=>x.id===selected),el=$('#detail');if(!d){el.innerHTML='<p class="empty">Sélectionne un dossier.</p>';return}
 const allActions=actions(d),main=mostUrgent(allActions,today()),estimate=d.steps['Devis signé']?estimatedDelivery(d.steps['Devis signé']):null;
 el.innerHTML='<div class="between"><h2>'+esc(d.reference)+'</h2><span class="pill '+d.type.toLowerCase()+'">'+d.type+'</span></div><div class="notice">'+(main?.key==='logistics'&&d.type==='EVAR'&&!stepDone(d,'Sizing validé par le chirurgien')?'Prochaine action : <b>Obtenir la validation du sizing</b><div style="margin-top:6px">Rappel : UOR à envoyer avant le <b>'+frDate(main.due)+'</b></div>':'Prochaine action : <b>'+esc(main?.label||next(d))+'</b>'+(main?.due?' · '+frDate(main.due):''))+'</div><div class="fields">'+field('Référence','reference',d.reference)+field('Date intervention','surgery',d.surgery,'date')+field('Heure (facultative)','time',d.time,'time')+(d.type==='EVAR'?'':field('Numéro E','enumber',d.enumber))+field('Chirurgien','surgeon',d.surgeon)+field('Établissement','hospital',d.hospital)+'</div>'+suggestions('surgeon')+suggestions('hospital')+'<label>Note générale</label><textarea data-field="notes">'+esc(d.notes)+'</textarea>'+(estimate?'<p>Livraison estimée (non confirmée) : <b>'+frDate(estimate)+'</b>'+(d.surgery&&d.surgery<estimate?' · Intervention avant livraison estimée':'')+'</p>':'')+'<div class="section"><h2>Workflow</h2><p><b>Étape en cours :</b> '+esc(next(d))+'</p><p><b>Étape suivante :</b> '+esc(WORKFLOWS[d.type][WORKFLOWS[d.type].indexOf(next(d))+1]||'—')+'</p><button id="expand">'+(expanded?'Masquer':'Afficher')+' toutes les étapes</button><div id="steps">'+(expanded?WORKFLOWS[d.type].map(s=>'<div class="step"><input type="checkbox" data-step="'+esc(s)+'" '+(stepDone(d,s)?'checked':'')+'><div style="flex:1"><span>'+esc(s)+'</span>'+(stepDone(d,s)?'<input type="date" data-date="'+esc(s)+'" value="'+d.steps[s]+'" lang="fr-FR" title="Modifier la date de validation"><small> '+frDate(d.steps[s])+'</small>':'')+'</div></div>').join(''):'')+'</div></div><div class="section"><h2>Relances</h2>'+actions(d).filter(a=>a.key!=='logistics').map(a=>'<div class="action">'+esc(a.label)+' · '+frDate(a.due)+'<div class="buttons"><button data-relance="'+a.key+'">Relance effectuée</button>'+(d.lastRelance[a.key]?'<input type="date" data-relancedate="'+a.key+'" value="'+d.lastRelance[a.key]+'" lang="fr-FR"><small> '+frDate(d.lastRelance[a.key])+'</small>':'')+'</div></div>').join('')+'</div>'+(d.type!=='EVAR'?'<div class="section"><h2>Stents implantés (postop)</h2><div id="stents">'+(d.stents||[]).map((s,i)=>'<p>'+esc(s.artery)+' · '+esc(s.model)+' · '+esc(s.size)+' <button data-remove-stent="'+i+'">×</button></p>').join('')+'</div><button id="addStent">+ Ajouter un stent</button></div>':'')+'<div class="section buttons"><button id="calendar">Exporter Outlook</button><button id="archive">'+(d.archived?'Réactiver': 'Archiver comme annulée')+'</button><button id="delete" class="danger">Supprimer définitivement</button></div>';
 el.querySelectorAll('[data-field]').forEach(e=>e.onchange=()=>{if(e.dataset.field==='reference'){const reference=e.value.trim();if(!reference){alert('La référence ne peut pas être vide.');render();return}if(hasDuplicateReference(records,reference,d.id)){alert('Cette référence existe déjà. Choisis une autre référence.');render();return}update(d.id,{reference});return}const name=e.dataset.field;const value=['surgeon','hospital'].includes(name)?normalizeChoice(e.value):e.value;update(d.id,{[name]:value})});
 $('#expand').onclick=()=>{expanded=!expanded;detail()};
 el.querySelectorAll('[data-step]').forEach(e=>e.onchange=()=>{setStep(d,e.dataset.step,e.checked,today());if(e.dataset.step==='Intervention réalisée'){if(e.checked){d.archiveReason='performed';showArchives=true;status='all';kind='all';search='';counter='';selected=d.id;expanded=false}else{showArchives=false;status='all';selected=d.id}}persist();render()});
 el.querySelectorAll('[data-date]').forEach(e=>e.onchange=()=>{if(e.value){d.steps[e.dataset.date]=e.value;if(e.dataset.date==='Sizing envoyé au chirurgien')delete d.lastRelance.sizing;if(e.dataset.date==='Devis envoyé')delete d.lastRelance.quote}persist();render()});
 el.querySelectorAll('[data-relance]').forEach(e=>e.onclick=()=>{d.lastRelance[e.dataset.relance]=today();persist();render()});
 el.querySelectorAll('[data-relancedate]').forEach(e=>e.onchange=()=>{if(e.value)d.lastRelance[e.dataset.relancedate]=e.value;else delete d.lastRelance[e.dataset.relancedate];persist();render()});
 $('#calendar').onclick=()=>ics(d);
 $('#archive').onclick=()=>{toggleCancelledArchive(d);showArchives=d.archived;status='all';kind='all';search='';counter='';persist();selected=d.id;expanded=false;render()};
 $('#delete').onclick=()=>{if(confirm('Supprimer définitivement ce dossier de test ?')){records=records.filter(x=>x.id!==d.id);selected=null;persist();render()}};
 if($('#addStent'))$('#addStent').onclick=()=>{
  const overlay=document.createElement('div');overlay.className='v3-modal-overlay';
  const arteries=d.type==='CROSS'?['TABC','CCG','SCG']:['TC','AMS','ARD','ARG'];
  overlay.innerHTML='<form class="v3-modal"><h2>Ajouter un stent implanté</h2><label for="stent-artery">Artère</label><select id="stent-artery" required>'+arteries.map(a=>'<option value="'+a+'">'+a+'</option>').join('')+'</select><label for="stent-model">Marque et modèle</label><input id="stent-model" required maxlength="120" autocomplete="off"><label for="stent-diameter">Diamètre (mm)</label><input id="stent-diameter" type="number" min="1" max="100" step="0.1" required><label for="stent-length">Longueur (mm)</label><input id="stent-length" type="number" min="1" max="300" step="0.1" required><div class="buttons" style="justify-content:flex-end;margin-top:18px"><button type="button" id="cancel-stent">Annuler</button><button type="submit" class="primary">Enregistrer</button></div></form>';
  document.body.appendChild(overlay);
  overlay.querySelector('#stent-model').focus();
  overlay.querySelector('#cancel-stent').onclick=()=>overlay.remove();
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  overlay.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const artery=overlay.querySelector('#stent-artery').value;
    const model=overlay.querySelector('#stent-model').value.trim();
    const diameter=Number(overlay.querySelector('#stent-diameter').value);
    const length=Number(overlay.querySelector('#stent-length').value);
    if(!arteries.includes(artery)||!model||!Number.isFinite(diameter)||!Number.isFinite(length)||diameter<=0||length<=0)return;
    d.stents??=[];
    d.stents.push({artery,model,size:diameter+' × '+length+' mm'});
    persist();overlay.remove();render();
  };
 };
 el.querySelectorAll('[data-remove-stent]').forEach(e=>e.onclick=()=>{if(confirm('Supprimer ce stent implanté ?')){d.stents.splice(Number(e.dataset.removeStent),1);persist();render()}});
}
function field(label,name,value,type='text'){return '<div><label>'+label+'</label><input data-field="'+name+'" type="'+type+'" value="'+esc(value||'')+'"'+(['surgeon','hospital'].includes(name)?' list="choices-'+name+'" autocomplete="off"':'')+'></div>'}
persist();render();
