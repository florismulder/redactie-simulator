/* ================= Verbinding met de database ================= */
const store={
  get(k,s){try{return(s?sessionStorage:localStorage).getItem(k)}catch(e){return null}},
  set(k,v,s){try{(s?sessionStorage:localStorage).setItem(k,v)}catch(e){}},
  del(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}}
};
async function api(fn,body){
  let r;
  try{r=await fetch(API_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:API_KEY,Authorization:'Bearer '+API_KEY},body:JSON.stringify(body)})}
  catch(e){throw new Error('Geen verbinding. Controleer je internet en probeer opnieuw.')}
  const j=await r.json().catch(()=>null);
  if(!r.ok)throw new Error((j&&j.message)||('Er ging iets mis ('+r.status+')'));
  return j;
}
const bIdx=(aid,bid)=>{const a=byId[aid];return bid&&a?a.d.beelden.findIndex(b=>b.id===bid):-1};
const toPub=j=>({pid:j.pid,id:j.id,slug:j.slug,kop:j.kop,beeld:bIdx(j.id,j.beeld_id),uur:j.uur,plek:j.plek,seed:j.seed,tPub:j.tPub,opdracht:j.opdracht,kanaal:j.kanaal||'website',
  wijzigingen:(j.wijzigingen||[]).map(w=>{const o={uurNa:w.uurNa};if(w.kop!==undefined)o.kop=w.kop;if(w.beeld_id!==undefined)o.beeld=bIdx(j.id,w.beeld_id);if(w.plek!==undefined)o.plek=w.plek;if(w.intrekken)o.intrekken=true;return o})});
const pubSig=()=>st.pubs.map(p=>p.pid+':'+p.wijzigingen.length).join(',');

/* ---- foto's ---- */
async function persistFoto(id,data){await api('rsim_docent_set_beeld',{p_code:st.klascode,p_dcode:st.dcode,p_bron:id,p_data:data})}
async function loadFotos(){try{const j=await api('rsim_beelden_get',{});Object.keys(FOTO).forEach(k=>delete FOTO[k]);Object.assign(FOTO,j||{});renderAll();if(st.rol==='docent'&&!dc.hidden)renderDocent()}catch(e){}}
/* ---- student ---- */
async function loadStudent(stil){
  const s=await api('rsim_state',{p_token:st.token});
  SKEW=s.now-Date.now();Object.assign(klas,s.klas);RULES=s.rules||{};
  if(!s.opdracht||!s.opdracht.id){st.wacht=true;return false}
  st.wacht=false;
  setA(s.artikelen);
  const nieuw=s.opdracht.id!==st.actief;
  st.opdrachten=[s.opdracht];st.actief=s.opdracht.id;
  st.pubs=s.pubs.map(toPub);
  if(nieuw){st.sel=null;st.rapport=null;st.rstep=null}
  const focusIn=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#s2');
  if(s.rapport&&!focusIn&&!rapTimer)st.rapport={inhoud:s.rapport.inhoud||{},status:s.rapport.status,beoordeling:s.rapport.beoordeling||null};
  sel0();
  const sig=pubSig(),veranderd=nieuw||sig!==st.sig||!st.draft;st.sig=sig;
  if(veranderd){st.res=0;st.draft=newDraft(st.sel)}
  if(!stil||veranderd)renderAll();else{renderWeb();resTick();syncPrev()}
  return true;
}
/* ---- docent ---- */
async function loadDocent(){
  const d=await api('rsim_docent_state',{p_code:st.klascode,p_dcode:st.dcode});
  SKEW=d.now-Date.now();Object.assign(klas,d.klas);RULES=d.rules||{};
  setA(d.artikelen);
  st.docRap=d.rapporten||[];
  st.opdrachten=d.opdrachten;st.actief=(d.opdrachten.find(o=>o.actief)||d.opdrachten[0]||{}).id;
  st.docStud=d.studenten.map(s=>({id:s.id,naam:s.naam,pubs:s.pubs.map(toPub)}));
  if(!st.docStud.find(s=>s.id===st.dsel))st.dsel=st.docStud[0]?st.docStud[0].id:null;
  if(!st.opdrachten.length)throw new Error('Deze klas heeft nog geen opdracht');
}

/* ---- inlog ---- */
const lg=$('#login');
function toonLogin(fout){lg.hidden=false;$('#lerr').textContent=fout||''}
function toonApp(){lg.hidden=true}
function uitloggen(){store.del('rsim_tok');store.del('rsim_naam');store.del('rsim_doc');location.reload()}
async function startStudent(token,naam){
  st.token=token;st.rol='student';st.naam=naam;
  const ok=await loadStudent();
  if(!ok){st.wacht=true;toonLogin('Er staat nog geen opdracht klaar. Je docent zet die zo klaar. Deze pagina probeert het zelf opnieuw.');return}
  $('#who').textContent=naam+' · klas '+klas.naam;$('#outbtn').hidden=false;$('#who').hidden=false;
  toonApp();fit();loadFotos();
}
async function startDocent(code,dcode){
  st.klascode=code;st.dcode=dcode;st.rol='docent';st.docOk=true;
  await loadDocent();
  document.body.classList.add('is-docent');
  toonApp();dc.hidden=false;renderDocent();loadFotos();
}
document.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-lt]').forEach(x=>x.classList.toggle('on',x===b));
  $('#lf-s').hidden=b.dataset.lt!=='s';$('#lf-d').hidden=b.dataset.lt!=='d';$('#lerr').textContent='';
});
function bezig(f,aan){f.querySelector('button[type=submit]').disabled=aan}
$('#lf-s').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;bezig(f,true);$('#lerr').textContent='';
  try{const j=await api('rsim_join',{p_code:f.code.value,p_voornaam:f.naam.value});
    store.set('rsim_tok',j.token);store.set('rsim_naam',j.voornaam);await startStudent(j.token,j.voornaam)}
  catch(x){$('#lerr').textContent=x.message}
  bezig(f,false);
});
$('#lf-d').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target;bezig(f,true);$('#lerr').textContent='';
  try{await startDocent(f.code.value,f.dcode.value);store.set('rsim_doc',JSON.stringify({c:f.code.value,d:f.dcode.value}),true)}
  catch(x){$('#lerr').textContent=x.message;st.rol=null}
  bezig(f,false);
});
$('#outbtn').onclick=uitloggen;

/* ---- klok en verversen ---- */
setInterval(()=>{
  if(st.rol==='student'&&!st.wacht){renderWeb();resTick();syncPrev()}
},5000);
setInterval(async()=>{
  try{
    if(st.rol==='student')await loadStudent(true).then(ok=>{if(ok&&!lg.hidden)startStudent(st.token,st.naam)});
    else if(st.rol==='docent'&&!dc.hidden&&st.dtab==='res'&&!st.busy){await loadDocent();renderDocent()}
  }catch(e){if(/sessie/i.test(e.message))uitloggen()}
},15000);
['renderSys','renderWeb','renderRes'].forEach(n=>{const f=window[n];window[n]=function(){f();syncPrev()}});

/* ---- opstart ---- */
fit();
(async function boot(){
  const tok=store.get('rsim_tok'),naam=store.get('rsim_naam'),doc=store.get('rsim_doc',true);
  try{
    if(doc){const x=JSON.parse(doc);await startDocent(x.c,x.d);return}
    if(tok){await startStudent(tok,naam||'');return}
  }catch(e){store.del('rsim_tok');store.del('rsim_doc');st.rol=null;toonLogin(/sessie/i.test(e.message)?e.message:'');return}
  toonLogin();
})();
