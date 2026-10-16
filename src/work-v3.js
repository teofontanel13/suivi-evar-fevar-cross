import {createClient} from '@supabase/supabase-js';
import './style.css';
const root=document.querySelector('#app');
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){root.textContent='Configuration Supabase manquante. Contactez l’administrateur.';}
else {
 const sb=createClient(url,key);
 const login=()=>{root.innerHTML='<div class="login"><h1>Suivi EVAR / FEVAR / CROSS · V3</h1><p>Connexion personnelle</p><form id="loginForm"><label>E-mail</label><input id="email" type="email" required autocomplete="username"><label>Mot de passe</label><input id="password" type="password" required autocomplete="current-password"><button class="primary">Se connecter</button></form><p id="loginError" role="alert"></p></div>';document.querySelector('#loginForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:document.querySelector('#email').value,password:document.querySelector('#password').value});if(error)document.querySelector('#loginError').textContent='Connexion impossible : '+error.message;else await load()};};
 async function load(){
  const {data:{user}}=await sb.auth.getUser();if(!user){login();return}
  root.textContent='Chargement des dossiers privés…';
  const {data,error}=await sb.from('v3_cases').select('id,reference,payload').order('updated_at',{ascending:false});
  if(error){root.innerHTML='<div class="login"><h2>Base V3 non disponible</h2><p id="dbError"></p><button id="retry">Réessayer</button><button id="logout">Déconnexion</button></div>';document.querySelector('#dbError').textContent=error.message;document.querySelector('#retry').onclick=load;document.querySelector('#logout').onclick=async()=>{await sb.auth.signOut();login()};return}
  const initial=(data||[]).map(x=>({...x.payload,id:x.id,reference:x.reference}));
  let saved=new Set(initial.map(x=>x.id)),queue=Promise.resolve();
  window.__V3_WORK__={records:initial,save(records){
    const snapshot=structuredClone(records);
    queue=queue.then(async()=>{
      const now=new Set(snapshot.map(d=>d.id));
      const removed=[...saved].filter(id=>!now.has(id));
      if(removed.length){const {error}=await sb.from('v3_cases').delete().in('id',removed);if(error)throw error}
      if(snapshot.length){const {error}=await sb.from('v3_cases').upsert(snapshot.map(d=>({id:d.id,owner_id:user.id,reference:d.reference,payload:d,updated_at:new Date().toISOString()})),{onConflict:'id'});if(error)throw error}
      saved=now;
    }).catch(error=>{root.dataset.syncError='true';alert('Échec de sauvegarde Supabase : '+error.message+' — ne fermez pas cette page avant résolution.');});
    return queue;
  }};
  await import('./preview-v3.js');
  const bar=document.createElement('div');bar.style.cssText='position:fixed;bottom:10px;right:12px;z-index:1000;background:white;padding:8px 12px;border:1px solid #ddd;border-radius:8px';bar.innerHTML='<button id="workLogout">Déconnexion</button>';document.body.append(bar);
  document.querySelector('#workLogout').onclick=async()=>{await queue;await sb.auth.signOut();location.reload()};
 }
 const {data:{session}}=await sb.auth.getSession();if(session)await load();else login();
}
