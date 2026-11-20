import re, sys
import os; base = os.path.dirname(os.path.abspath(__file__)) + '/'
app = open(base + 'app.js', encoding='utf8').read()

def sub(old, new, count=1):
    global app
    if app.count(old) < 1:
        sys.exit('NIET GEVONDEN: ' + old[:70])
    app = app.replace(old, new) if count == 0 else app.replace(old, new, count)

# --- 1. data en state ---------------------------------------------------
i0 = app.index("const Engine=window.Engine;")
i1 = app.index("const PLEK=")
head = """const Engine=window.Engine;
const API_URL='/*SUPA_URL*/',API_KEY='/*SUPA_KEY*/';
let RULES={};
const A=[],byId={};
const mkA=x=>({id:x.id,c:x.categorie.replace('_',' '),t:x.titel_origineel,i:x.intro_origineel,b:x.beelden.map(b=>[b.type,b.beschrijving]),d:x,door:x.door||'startset'});
function setA(list){A.length=0;Object.keys(byId).forEach(k=>delete byId[k]);list.forEach(x=>{const a=mkA(x);A.push(a);byId[a.id]=a})}
"""
app = app[:i0] + head + app[i1:]

j0 = app.index("const NOW0=Date.now();")
j1 = app.index("/* ---- tijd ---- */")
mid = """let SKEW=0;const nowMs=()=>Date.now()+SKEW;

/* ---- klas, opdrachten, studenten (uit de database) ---- */
const klas={naam:'',code:'',modus:'versneld',vers:60};
const st={sel:null,draft:null,res:0,docOk:false,dtab:'tijd',dsel:null,dpub:0,fv:{},actief:null,opdrachten:[],pubs:[],docStud:[],rol:null,busy:false,confirmReset:false,token:null,klascode:'',dcode:'',naam:'',sig:''};
const studenten=()=>st.docStud;

"""
app = app[:j0] + mid + app[j1:]

# --- 2. tijd -------------------------------------------------------------
sub("const tm=()=>({modus:actieveOpdracht().modus||klas.modus,vers:klas.vers});",
    "const tm=p=>{const o=(p&&st.opdrachten.find(x=>x.id===p.opdracht))||actieveOpdracht()||{};return {modus:o.modus||klas.modus,vers:klas.vers}};")
sub("function elapsed(p){const t=tm();if(t.modus==='direct')return 24;const min=(Date.now()-p.tPub)/60000;",
    "function elapsed(p){const t=tm(p);if(t.modus==='direct')return 24;const min=(nowMs()-p.tPub)/60000;")
sub("return tm().modus==='direct'?Math.min(Math.max(st.draft.uurNa||min,min),23)", "return tm(p).modus==='direct'?Math.min(Math.max(st.draft.uurNa||min,min),23)")

# verwijder de oude startregels (sel0 en newDraft zonder data)
sub("sel0();st.draft=newDraft(st.sel);\n", "")
sub("const curPub=id=>st.pubs.find(p=>p.id===id);", "const curPub=id=>st.pubs.find(p=>p.id===id);")

# datum op de website
sub('<span class="r">vr 20 november</span>', "<span class=\"r\">${new Date(nowMs()).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'long'})}</span>")

# --- 3. ververs ----------------------------------------------------------
sub("function ververs(){renderSys();renderWeb();renderRes();syncPrev()}",
    "function ververs(){if(st.rol!=='student')return;renderSys();renderWeb();renderRes();syncPrev()}")

# --- 4. acties van de student (naar de database) -------------------------
a0 = app.index("document.addEventListener('click',e=>{")
a1 = app.index("document.addEventListener('input',e=>{")
acties = r"""const bId=(aid,idx)=>idx<0?'':byId[aid].d.beelden[idx].id;
function zonderOverlap(fn){if(st.busy)return;st.busy=true;Promise.resolve().then(fn).catch(e=>toast(e.message)).finally(()=>{st.busy=false})}
document.addEventListener('click',e=>{
  const t=e.target.closest('#s0 [data-pick],#s0 [data-beeld],#s0 [data-plek],#s0 [data-publish],#s2 [data-res],#s0 [data-edit],#s0 [data-intrek]');if(!t||zoomed<0)return;
  const p=curPub(st.sel);
  if(t.dataset.pick){st.sel=t.dataset.pick;st.draft=newDraft(st.sel);renderSys()}
  else if(t.dataset.beeld!==undefined){st.draft.beeld=+t.dataset.beeld;renderSys()}
  else if(t.dataset.plek){st.draft.plek=t.dataset.plek;renderSys()}
  else if(t.dataset.res!==undefined){st.res=+t.dataset.res;renderRes()}
  else if(t.dataset.publish){
    const d=st.draft;if(!d.kop.trim()){toast('Vul eerst een kop in');return}
    const id=st.sel;
    zonderOverlap(async()=>{const j=await api('rsim_publish',{p_token:st.token,p_article:id,p_kop:d.kop.trim(),p_beeld_id:bId(id,d.beeld),p_uur:d.uur,p_plek:d.plek});
      st.pubs.unshift(toPub(j));st.res=0;st.draft=newDraft(st.sel);ververs();toast('Gepubliceerd. Kijk op de website en bij de resultaten.')});
  }
  else if(t.dataset.edit&&p){
    const d=st.draft,s=nu(p),uurNa=editUur(p);let kop=null,beeld=null,plek=null,n=0;
    if(d.kop.trim()&&d.kop.trim()!==s.kop){kop=d.kop.trim();n++}
    if(d.beeld!==s.beeld){beeld=bId(p.id,d.beeld);n++}
    if(d.plek!==s.plek){plek=d.plek;n++}
    if(!n){toast('Je hebt nog niets veranderd');return}
    zonderOverlap(async()=>{const j=await api('rsim_edit',{p_token:st.token,p_pub:p.pid,p_kop:kop,p_beeld_id:beeld,p_plek:plek,p_intrekken:false,p_uurna:uurNa});
      const k=st.pubs.indexOf(p);st.pubs[k]=toPub(j);st.res=k;st.draft=newDraft(st.sel);ververs();toast('Doorgevoerd. Het adres is gelijk gebleven.')});
  }
  else if(t.dataset.intrek&&p){
    if(laatsteUur(p)+1>23){toast('Intrekken kan alleen binnen de eerste 24 uur');return}
    const uurNa=editUur(p);
    zonderOverlap(async()=>{const j=await api('rsim_edit',{p_token:st.token,p_pub:p.pid,p_kop:null,p_beeld_id:null,p_plek:null,p_intrekken:true,p_uurna:uurNa});
      const k=st.pubs.indexOf(p);st.pubs[k]=toPub(j);st.res=k;st.draft=newDraft(st.sel);ververs();toast('Ingetrokken. Vanaf nu verdwijnt het van de homepage.')});
  }
});
"""
app = app[:a0] + acties + app[a1:]

# --- 5. docent ------------------------------------------------------------
sub("$('#docbtn').onclick=openDocent;\n", "")
sub("function sluitDocent(){dc.hidden=true;sel0();st.draft=newDraft(st.sel);ververs()}", "function sluitDocent(){uitloggen()}")
sub("if(!$('#docent').hidden)sluitDocent();else close()", "if(!$('#docent').hidden)return;close()")
sub("Terug naar bureau</button></div><div class=\"dcb", "Uitloggen</button></div><div class=\"dcb")
sub("function dRes(){\n", "function dRes(){\n  if(!studenten().length)return `<div class=\"card2\"><b>Nog geen studenten</b><p>Studenten loggen in met klascode <code>${esc(klas.code)}</code> en hun voornaam. Hun resultaten verschijnen hier.</p></div>`;\n")
sub("hun voornaam.</p></div>`;\n}\nfunction aggStud",
    "hun voornaam.</p></div>\n    <div class=\"card2\" style=\"margin-top:12px\"><b>Publicaties wissen</b><p>Wist alle publicaties van alle studenten in klas ${esc(klas.naam)}. Studenten blijven ingelogd. Gebruik dit voor een nieuwe les.</p><button class=\"dbtn\" data-dreset=\"1\" style=\"margin-left:0;justify-self:start\">${st.confirmReset?'Zeker weten? Klik nogmaals':'Alle publicaties wissen'}</button></div></div>`;\n}\nfunction aggStud")

k0 = app.index("dc.addEventListener('click',e=>{")
k1 = app.index("/* klok:")
docent = r"""dc.addEventListener('click',e=>{
  const t=e.target.closest('[data-dtab],[data-dclose],[data-modus],[data-dstud],[data-dpub],[data-actief],[data-dsave-opd],[data-dsave-art],[data-dreset]');if(!t)return;
  const D=t.dataset;
  if(D.dclose)uitloggen();
  else if(D.dtab){saveForm();st.dtab=D.dtab;renderDocent()}
  else if(D.modus)dAct('rsim_docent_set_time',{p_modus:D.modus,p_vers:klas.vers},'Tijdmodus aangepast voor de hele klas');
  else if(D.dstud){st.dsel=D.dstud;st.dpub=0;renderDocent()}
  else if(D.dpub!==undefined){st.dpub=+D.dpub;renderDocent()}
  else if(D.actief)dAct('rsim_docent_activate',{p_assignment:D.actief},'Opdracht staat klaar op de bureaus van de studenten');
  else if(D['dsaveOpd'])saveOpdracht();
  else if(D['dsaveArt'])saveArtikel();
  else if(D.dreset){
    if(!st.confirmReset){st.confirmReset=true;renderDocent();setTimeout(()=>{st.confirmReset=false;if(!dc.hidden)renderDocent()},5000)}
    else{st.confirmReset=false;dAct('rsim_docent_reset',{},'Alle publicaties zijn gewist')}
  }
});
async function dAct(fn,extra,msg){
  if(st.busy)return false;st.busy=true;
  try{await api(fn,Object.assign({p_code:st.klascode,p_dcode:st.dcode},extra));await loadDocent();renderDocent();toast(msg);return true}
  catch(e){toast(e.message);return false}
  finally{st.busy=false}
}
dc.addEventListener('input',saveForm);
dc.addEventListener('change',e=>{saveForm();if(e.target.id==='dc-vers')dAct('rsim_docent_set_time',{p_modus:klas.modus,p_vers:+e.target.value},'Snelheid aangepast')});
const val=id=>{const el=dc.querySelector('#'+id);return el?(el.type==='checkbox'?el.checked:el.value):''};
async function saveOpdracht(){
  const naam=String(val('f-naam')).trim(),arts=A.filter(a=>val('f-a-'+a.id)).map(a=>a.id),metrics=METRICS.filter(m=>val('f-m-'+m[0])).map(m=>m[0]);
  if(!naam){toast('Geef de opdracht een naam');return}
  if(!arts.length){toast('Kies minstens één bericht');return}
  if(!metrics.length){toast('Kies minstens één cijfer dat studenten zien');return}
  const act=!!val('f-direct');
  const ok=await dAct('rsim_docent_save_assignment',{p:{naam,doel:val('f-doel'),modus:val('f-modus'),max:+val('f-max'),metrics,artikelen:arts,activeer:act}},act?'Opdracht staat klaar en is actief':'Opdracht opgeslagen');
  if(ok){delete st.fv['f-naam'];renderDocent()}
}
async function saveArtikel(){
  const t=String(val('f-t')).trim(),i=String(val('f-i')).trim();
  const beelden=[1,2,3].map(n=>({type:val('f-bt'+n),beschrijving:String(val('f-bd'+n)).trim(),kwaliteit:+val('f-bk'+n)})).filter(b=>b.beschrijving);
  if(!t||!i){toast('Vul een titel en een eerste alinea in');return}
  if(!beelden.length){toast('Voeg minstens één beeld toe met een omschrijving');return}
  const g=x=>+val(x);
  const p={titel:t,intro:i,categorie:val('f-c'),nieuwswaarde:{impact:g('f-nw-impact'),nabijheid:g('f-nw-nabijheid'),conflict:g('f-nw-conflict'),human_interest:g('f-nw-human'),actualiteit:g('f-nw-actualiteit')},tijdgevoeligheid_uren:g('f-tg'),interesse:{jongeren:g('f-ij-jongeren'),volwassenen:g('f-ij-volwassenen'),midden:g('f-ij-midden'),senioren:g('f-ij-senioren')},sensatie_potentieel:g('f-sp'),beelden};
  const ok=await dAct('rsim_docent_add_article',{p},'Bericht toegevoegd aan de database en aan de actieve opdracht');
  if(ok){['f-t','f-i','f-bd1','f-bd2','f-bd3'].forEach(k=>delete st.fv[k]);renderDocent()}
}

"""
app = app[:k0] + docent + app[k1:]

# --- 6. klok, login en opstart --------------------------------------------
l0 = app.index("/* klok:")
tail = open(base + 'real_tail.js', encoding='utf8').read()
app = app[:l0] + tail

open(base + 'app.real.js', 'w', encoding='utf8').write(app)
print('app.real.js', len(app))
