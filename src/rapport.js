/* ================= Rapportage: doelen, begeleiding en advies =================
   Student: tabblad Rapport op de resultatenmonitor. Docent: tab Rapporten.
   Stappen volgen je lessen: welke data nodig, berekenen, doel behaald en waarom, acties, advies. */
const BEGELEIDING={veel:'Veel begeleiding',middel:'Middel',weinig:'Weinig',geen:'Geen (zoals de proeve)'};
const BEG_UITLEG={veel:'Het systeem wijst de juiste data aan en toont de totalen.',middel:'De student kiest uit een korte lijst. Het systeem controleert de keuze.',weinig:'De student kiest uit alle data en telt zelf op.',geen:'Alleen de doelen en alle data. De student schrijft het hele advies.'};
const DATAITEMS=[
  {id:'bereik',naam:'Bereik',uitleg:'Hoeveel mensen het bericht zagen op de homepage.'},
  {id:'kliks',naam:'Kliks',uitleg:'Hoeveel mensen het bericht openden.'},
  {id:'klikpercentage',naam:'Klikpercentage',uitleg:'Kliks gedeeld door bereik.'},
  {id:'leestijd',naam:'Gemiddelde leestijd',uitleg:'Hoe lang lezers gemiddeld bleven.'},
  {id:'doorkliks',naam:'Doorkliks naar een ander bericht',uitleg:'Lezers die na het lezen verder klikten.'},
  {id:'gedeeld',naam:'Keer gedeeld',uitleg:'Hoe vaak lezers het bericht deelden.'},
  {id:'engagementrate',naam:'Betrokkenheid',uitleg:'Doorkliks en delen samen, per 100 lezers.'},
  {id:'inschrijvingen',naam:'Nieuwsbriefinschrijvingen',uitleg:'Lezers die zich inschreven voor de nieuwsbrief.'},
  {id:'interacties',naam:'Interacties',uitleg:'Likes, reacties en opgeslagen op Instagram en TikTok.'},
  {id:'kanaal',naam:'Kanaal',uitleg:'Waar het bericht stond: website, Instagram of TikTok.',ruis:true},
  {id:'plek',naam:'Plek op de homepage',uitleg:'Waar het bericht stond.',ruis:true},
  {id:'tijdstip',naam:'Tijdstip van publicatie',uitleg:'Het uur waarop het online ging.',ruis:true},
  {id:'koplengte',naam:'Aantal woorden in de kop',uitleg:'Hoe lang de kop is.',ruis:true},
  {id:'verloop',naam:'Piekuur',uitleg:'Het uur met de meeste kliks.',ruis:true}];
const DI=Object.fromEntries(DATAITEMS.map(d=>[d.id,d]));
const DOELTYPES={
  bereik:{naam:'Bereik',eenheid:'bezoekers',data:['bereik'],tekst:t=>`Minimaal ${fmt(t)} bezoekers bereikt`,w:T=>T.b},
  kliks:{naam:'Kliks',eenheid:'kliks',data:['kliks'],tekst:t=>`Minimaal ${fmt(t)} kliks`,w:T=>T.k},
  klikpercentage:{naam:'Klikpercentage',eenheid:'%',data:['klikpercentage'],tekst:t=>`Een klikpercentage van minimaal ${dec(t,1)}%`,w:T=>T.ctr*100},
  leestijd:{naam:'Leestijd',eenheid:'seconden',data:['leestijd'],tekst:t=>`Een gemiddelde leestijd van minimaal ${t} seconden`,w:T=>T.lees},
  doorkliks:{naam:'Doorkliks',eenheid:'doorkliks',data:['doorkliks'],tekst:t=>`Minimaal ${fmt(t)} doorkliks naar een ander bericht`,w:T=>T.dk},
  interacties:{naam:'Interacties',eenheid:'interacties',data:['interacties'],tekst:t=>`Minimaal ${fmt(t)} interacties (likes, reacties en opgeslagen)`,w:T=>T.ia},
  gedeeld:{naam:'Gedeeld',eenheid:'keer',data:['gedeeld'],tekst:t=>`Minimaal ${fmt(t)} keer gedeeld`,w:T=>T.dl},
  engagement:{naam:'Betrokkenheid',eenheid:'%',data:['engagementrate'],tekst:t=>`Een betrokkenheid van minimaal ${dec(t,1)}%`,w:T=>T.eng*100},
  inschrijvingen:{naam:'Inschrijvingen',eenheid:'inschrijvingen',data:['inschrijvingen'],tekst:t=>`Minimaal ${fmt(t)} nieuwsbriefinschrijvingen`,w:T=>T.ins}};
const CRITERIA=['Selecteert de relevante data met betrekking tot bereik en effect uit een bredere datacollectie','Analyseert het bereik en effect van de content op een juiste manier','Bepaalt of de vooraf gestelde doelen zijn behaald','Bedenkt acties die het effect en bereik kunnen vergroten of verbeteren','Deelt een duidelijk advies met de opdrachtgever'];
/* de vier rondes: veel, middel, weinig, geen */
const RONDES=[
  {naam:'Ronde 1: veel begeleiding',begeleiding:'veel',artikelen:['n01','n03','n05','n08','n13'],doelen:[['bereik',2500],['klikpercentage',5],['inschrijvingen',10]]},
  {naam:'Ronde 2: middel begeleiding',begeleiding:'middel',artikelen:['n02','n04','n06','n09','n11'],doelen:[['bereik',3500],['engagement',20],['kliks',200]]},
  {naam:'Ronde 3: weinig begeleiding',begeleiding:'weinig',artikelen:['n07','n10','n12','n14','n15'],doelen:[['bereik',3000],['leestijd',35],['doorkliks',40],['inschrijvingen',6]]},
  {naam:'Ronde 4: geen begeleiding (zoals de proeve)',begeleiding:'geen',artikelen:['n01','n02','n04','n08','n10','n12'],doelen:[['bereik',4000],['klikpercentage',5.5],['engagement',21],['inschrijvingen',8]]}];
const RONDE_SOCIAL={naam:'Bonusronde: website, Instagram en TikTok',begeleiding:'weinig',artikelen:['n02','n05','n09','n12'],kanalen:['website','instagram','tiktok'],doelen:[['bereik',18000],['kliks',350],['interacties',1500],['inschrijvingen',10]]};
const rondeObj=(r,i)=>({naam:r.naam,doel:'balans',modus:'',max:0,metrics:['bereik','kliks','leestijd','verloop'],artikelen:r.artikelen,begeleiding:r.begeleiding,doelen:r.doelen.map((d,k)=>({id:'d'+(k+1),type:d[0],drempel:d[1]})),activeer:false,kanalen:r.kanalen||['website']});

/* ---- cijfers uit de publicaties ---- */
function totalen(pubs){const T={b:0,k:0,l:0,kw:0,dk:0,dl:0,dlw:0,ins:0,ia:0};
  pubs.forEach(p=>{const v=viewOf(p);T.b+=v.b;T.k+=v.k;T.dk+=v.dk;T.dl+=v.dl;T.ins+=v.ins;T.ia+=v.ia;if(!v.soc){T.l+=v.lees*v.k;T.kw+=v.k;T.dlw+=v.dl}});
  return {b:T.b,k:T.k,ctr:T.b?T.k/T.b:0,lees:T.kw?Math.round(T.l/T.kw):0,dk:T.dk,dl:T.dl,eng:T.kw?(T.dk+T.dlw)/T.kw:0,ins:T.ins,ia:T.ia}}
function celWaarde(id,p){const v=viewOf(p),s=nu(p),a=byId[p.id];
  switch(id){case'bereik':return fmt(v.b);case'kliks':return fmt(v.k);case'klikpercentage':return dec(v.ctr*100,1)+'%';case'leestijd':return v.lees+' s';
    case'doorkliks':return fmt(v.dk);case'gedeeld':return fmt(v.dl);case'engagementrate':return v.soc?'–':dec(v.k?(v.dk+v.dl)/v.k*100:0,1)+'%';case'interacties':return v.soc?fmt(v.ia):'–';case'kanaal':return KANALEN[p.kanaal||'website'];case'inschrijvingen':return fmt(v.ins);
    case'plek':return (p.kanaal||'website')==='website'?PLEK[s.plek]:'–';case'tijdstip':return hh(p.uur);case'koplengte':return String(s.kop.trim().split(/\s+/).length);
    case'verloop':{const V=v.c.verloop.slice(0,v.e);let m=0,u=-1;V.forEach((x,i)=>{if(x.kliks>m){m=x.kliks;u=x.uur}});return u<0?'–':hh(u)}}return '–'}
function totaalCel(id,T){switch(id){case'bereik':return fmt(T.b);case'kliks':return fmt(T.k);case'klikpercentage':return dec(T.ctr*100,1)+'%';case'leestijd':return T.lees+' s';
  case'doorkliks':return fmt(T.dk);case'gedeeld':return fmt(T.dl);case'engagementrate':return dec(T.eng*100,1)+'%';case'inschrijvingen':return fmt(T.ins);case'interacties':return fmt(T.ia)}return '–'}
const doelTekst=d=>DOELTYPES[d.type].tekst(d.drempel);
const doelWaarde=(d,T)=>DOELTYPES[d.type].w(T);
const doelGehaald=(d,T)=>doelWaarde(d,T)>=d.drempel-1e-9;
const num=s=>{const x=parseFloat(String(s).replace(',','.'));return isFinite(x)?x:null};

/* ---- toestand van het rapport van de student ---- */
const heeftRapport=()=>{const o=actieveOpdracht();return !!(o&&o.doelen&&o.doelen.length)};
function rapInh(){if(!st.rapport)st.rapport={inhoud:{},status:'concept',beoordeling:null};const r=st.rapport.inhoud;
  if(!r.doelen)r.doelen={};if(!r.advies)r.advies={data:'',werkwijze:'',resultaten:'',acties:''};if(r.acties===undefined)r.acties='';return r}
function rapDoel(id){const r=rapInh();if(!r.doelen[id])r.doelen[id]={gekozen:[],uitkomst:'',behaald:'',reden:'',gecontroleerd:false};return r.doelen[id]}
const rapSlot=()=>st.rapport&&st.rapport.status==='ingeleverd';
function rapKlaar(){if(!st.pubs.length)return {ok:false,tekst:'Publiceer eerst minstens één bericht. Daarna kun je je rapport maken.'};
  const rest=st.pubs.reduce((m,p)=>Math.max(m,24-elapsed(p)),0);
  if(rest>0)return {ok:false,tekst:`Je rapport gaat open als al je publicaties 24 uur hebben gelopen. Nog ${rest} uur in de simulatie.`};
  return {ok:true}}
function rapStappen(){const o=actieveOpdracht();
  if(o.begeleiding==='geen')return [{id:'doelen',t:'De doelen'},{id:'data',t:'Alle data'},{id:'advies',t:'Advies aan de opdrachtgever'}];
  return o.doelen.map((d,i)=>({id:'d:'+d.id,t:'Doel '+(i+1)+': '+DOELTYPES[d.type].naam})).concat([{id:'acties',t:'Acties'},{id:'advies',t:'Advies aan de opdrachtgever'}])}
function stapKlaar(s){const r=rapInh();
  if(s.id.startsWith('d:')){const d=rapDoel(s.id.slice(2));return d.gekozen.length>0&&d.uitkomst!==''&&d.behaald!==''&&d.reden.trim().length>2}
  if(s.id==='acties')return r.acties.trim().length>5;
  if(s.id==='advies')return Object.values(r.advies).every(x=>x.trim().length>5);
  return false}
function dataOpties(doel,beg){const nodig=DOELTYPES[doel.type].data;
  if(beg==='weinig'||beg==='geen')return DATAITEMS.map(d=>d.id);
  const rest=DATAITEMS.map(d=>d.id).filter(x=>!nodig.includes(x));let h=0;for(const c of doel.id+doel.type)h=(h*31+c.charCodeAt(0))>>>0;
  const keuze=[];for(let i=0;keuze.length<3;i++){const x=rest[(h+i*5)%rest.length];if(!keuze.includes(x))keuze.push(x)}
  return DATAITEMS.map(d=>d.id).filter(x=>nodig.includes(x)||keuze.includes(x))}

/* ---- tabknoppen en tabel ---- */
function rtabsHTML(){if(!heeftRapport())return '';
  return `<span class="rtabs"><button data-rtab="res" class="${st.rtab==='rap'?'':'on'}">Cijfers</button><button data-rtab="rap" class="${st.rtab==='rap'?'on':''}">Rapport</button></span>`}
function dataTabel(ids,pubs,metTotaal){
  if(!ids.length)return '<p class="n">Kies eerst welke data je nodig hebt. Daarna zie je hier de cijfers.</p>';
  const T=totalen(pubs);
  const kop='<tr><th>Bericht</th>'+ids.map(i=>`<th>${esc(DI[i].naam)}</th>`).join('')+'</tr>';
  const rijen=pubs.map(p=>`<tr><td class="k"><span class="kt">${esc(nu(p).kop)}</span>${(p.kanaal||'website')!=='website'?'<span class="tagx">'+KANALEN[p.kanaal]+'</span>':''}${nu(p).ingetrokken?'<span class="tagx red">ingetrokken</span>':''}</td>${ids.map(i=>`<td>${celWaarde(i,p)}</td>`).join('')}</tr>`).join('');
  const tot=metTotaal?`<tr class="tot"><td>Totaal</td>${ids.map(i=>`<td>${totaalCel(i,T)}</td>`).join('')}</tr>`:'';
  return `<div class="rtab"><table class="t">${kop}${rijen}${tot}</table></div>`}

/* ---- het rapportscherm ---- */
function renderRap(){
  const o=actieveOpdracht(),beg=o.begeleiding||'veel',K=rapKlaar(),inh=rapInh(),slot=rapSlot();
  const head=`<div class="head"><b>Resultatenmonitor</b>${rtabsHTML()}<span>Tijd: ${esc(tmLabel())}</span><span class="ex">${esc(o.naam)}</span></div>`;
  if(!K.ok){$('#s2').innerHTML=`<div class="res">${head}<div class="pan"><h4>Rapport</h4><p class="n" style="font-size:18px">${esc(K.tekst)}</p><p class="n">Bij de tab Cijfers volg je de publicaties.</p></div></div>`;return}
  const stappen=rapStappen();if(!stappen.find(s=>s.id===st.rstep))st.rstep=stappen[0].id;
  const idx=stappen.findIndex(s=>s.id===st.rstep),stap=stappen[idx],pubs=st.pubs;
  const lijst=stappen.map(s=>`<button class="rs ${s.id===st.rstep?'sel':''} ${stapKlaar(s)?'ok':''}" data-rstap="${s.id}"><i></i>${esc(s.t)}</button>`).join('');
  const kop=`<div class="rkop"><b>${esc(BEGELEIDING[beg])}</b><span>${slot?'Ingeleverd':'Concept'}</span></div>`;
  let body='';
  const dis=slot?'disabled':'';
  if(stap.id.startsWith('d:')){
    const doel=o.doelen.find(d=>d.id===stap.id.slice(2)),n=o.doelen.indexOf(doel)+1,dd=rapDoel(doel.id),dt=DOELTYPES[doel.type];
    const opties=dataOpties(doel,beg),nodig=dt.data;
    let keuzeHTML='';
    if(beg==='veel'){dd.gekozen=nodig.slice();keuzeHTML=`<div class="chips">${nodig.map(i=>`<span class="chip">${esc(DI[i].naam)}</span>`).join('')}</div><p class="n">Deze data heb je nodig. ${esc(DI[nodig[0]].uitleg)}</p>`}
    else keuzeHTML=`<div class="opts">${opties.map(i=>{const g=dd.gekozen.includes(i),c=dd.gecontroleerd&&beg==='middel';
      return `<label class="opt ${c?(nodig.includes(i)?(g?'goed':'mis'):(g?'fout':'')):''}"><input type="checkbox" data-rap-data="${i}" ${g?'checked':''} ${dis}><span><b>${esc(DI[i].naam)}</b>${beg==='middel'?`<small>${esc(DI[i].uitleg)}</small>`:''}</span>${c&&nodig.includes(i)&&g?'<em>goed</em>':''}${c&&!nodig.includes(i)&&g?'<em>niet nodig</em>':''}${c&&nodig.includes(i)&&!g?'<em>deze mis je</em>':''}</label>`}).join('')}</div>
      ${beg==='middel'?`<button class="rbtn" data-rcheck="1" ${dis}>Controleer mijn keuze</button>`:''}`;
    const tabel=dataTabel(beg==='veel'?nodig:DATAITEMS.map(d=>d.id).filter(i=>dd.gekozen.includes(i)),pubs,beg!=='weinig');
    body=`<div class="doelkop">Doel ${n}: ${esc(doelTekst(doel))}</div>
      <div class="rblok"><h5>1. Welke data heb je nodig?</h5>${keuzeHTML}</div>
      <div class="rblok"><h5>2. Dit zijn de cijfers</h5>${tabel}${beg==='weinig'?'<p class="n">Tel zelf op of bereken het gemiddelde.</p>':''}</div>
      <div class="rblok"><h5>3. Is het doel behaald?</h5>
        <div class="rrij"><label>Mijn uitkomst (${esc(dt.eenheid)})<input class="rin" type="text" inputmode="decimal" data-rap="d:${doel.id}:uitkomst" value="${esc(dd.uitkomst)}" ${dis}></label>
        <div class="ja"><label><input type="radio" name="b${doel.id}" data-rap-behaald="ja" ${dd.behaald==='ja'?'checked':''} ${dis}> Ja, behaald</label><label><input type="radio" name="b${doel.id}" data-rap-behaald="nee" ${dd.behaald==='nee'?'checked':''} ${dis}> Nee, niet behaald</label></div></div>
        <label>Waarom? Leg het uit met de cijfers.<textarea class="rin" rows="2" data-rap="d:${doel.id}:reden" ${dis}>${esc(dd.reden)}</textarea></label></div>`;
  }else if(stap.id==='acties'){
    const mis=o.doelen.filter(d=>{const T=totalen(pubs);return !doelGehaald(d,T)});
    const hint=beg==='veel'?`<p class="n">Kijk naar de doelen die je niet haalde${mis.length?': '+mis.map(d=>esc(DOELTYPES[d.type].naam)).join(', '):''}. Bedenk bij elk doel één actie. Denk aan de kop, het beeld, de plek op de homepage en het tijdstip.</p>`
      :beg==='middel'?'<p class="n">Welke acties verbeteren bereik en effect? Denk aan de kop, het beeld, de plek en het tijdstip.</p>':'';
    body=`<div class="doelkop">Welke acties bedenk je?</div>${hint}<label>Mijn acties<textarea class="rin big" rows="8" data-rap="acties" ${dis}>${esc(inh.acties)}</textarea></label>`;
  }else if(stap.id==='doelen'){
    body=`<div class="doelkop">De doelen van de opdrachtgever</div><ol class="dl">${o.doelen.map(d=>`<li>${esc(doelTekst(d))}</li>`).join('')}</ol><p class="n">Bepaal zelf welke data je nodig hebt. Je vindt alle data bij de volgende stap.</p>`;
  }else if(stap.id==='data'){
    body=`<div class="doelkop">Alle data</div>${dataTabel(DATAITEMS.map(d=>d.id),pubs,false)}<p class="n">Kies zelf welke data je gebruikt. Niet alle data past bij elk doel.</p>`;
  }else{
    const a=inh.advies,veld=(k,t,h)=>`<label>${t}<small>${h}</small><textarea class="rin" rows="${beg==='geen'?4:3}" data-rap="advies:${k}" ${dis}>${esc(a[k])}</textarea></label>`;
    body=`<div class="doelkop">Advies aan de opdrachtgever</div>${beg==='geen'?'<ol class="dl small">'+o.doelen.map(d=>`<li>${esc(doelTekst(d))}</li>`).join('')+'</ol>':''}
      ${veld('data','De data die ik gebruikte','Welke cijfers pakte je en waarom?')}${veld('werkwijze','Mijn werkwijze','Hoe kwam je van de data tot je conclusie?')}
      ${veld('resultaten','De resultaten van mijn analyse','Welke doelen zijn behaald en welke niet?')}${veld('acties','Mijn acties om bereik en effect te vergroten','Wat raad je de opdrachtgever aan?')}
      ${slot?(st.rapport.beoordeling?`<div class="rbeo"><b>Beoordeling van je docent</b>${(st.rapport.beoordeling.opmerking||'')?'<p>'+esc(st.rapport.beoordeling.opmerking)+'</p>':''}</div>`:'<p class="n">Je rapport is ingeleverd. Je docent kijkt het na.</p>'):
        `<div class="rnav"><button class="rbtn big" data-rindien="1">${st.rindien?'Zeker weten? Klik nogmaals om in te leveren':'Rapport inleveren'}</button></div>`}`;
  }
  const nav=`<div class="rnav"><button class="rbtn" data-rvolg="-1" ${idx===0?'disabled':''}>Vorige</button><span>${idx+1} van ${stappen.length}</span><button class="rbtn" data-rvolg="1" ${idx===stappen.length-1?'disabled':''}>Volgende</button></div>`;
  $('#s2').innerHTML=`<div class="res">${head}<div class="rgrid"><div class="pan rlijst"><h4>Stappen</h4>${lijst}<p class="n small">${esc(BEG_UITLEG[beg])}</p></div><div class="pan rmain">${kop}<div class="rscroll">${body}</div>${nav}</div></div></div>`;
}
/* ---- opslaan ---- */
let rapTimer=null;
async function rapOpslaan(indienen){
  if(rapSlot())return;
  try{
    if(typeof api==='function'&&st.token){const j=await api('rsim_report_save',{p_token:st.token,p_inhoud:rapInh(),p_indienen:!!indienen});st.rapport={inhoud:j.inhoud||{},status:j.status,beoordeling:j.beoordeling||null}}
    else if(indienen){st.rapport.status='ingeleverd';if(!st.demoRap)st.demoRap=true}
    if(indienen){st.rindien=false;toast('Rapport ingeleverd. Je docent kijkt het na.');renderRap()}
  }catch(e){toast(e.message)}
}
const rapSoon=()=>{clearTimeout(rapTimer);rapTimer=setTimeout(()=>rapOpslaan(false),1500)};
function resTick(){if(st.rtab==='rap'){const a=document.activeElement;if(a&&a.closest&&a.closest('#s2'))return}renderRes()}

/* ---- klikken en typen op de monitor ---- */
document.addEventListener('click',e=>{
  const t=e.target.closest('#s2 [data-rtab],#s2 [data-rstap],#s2 [data-rvolg],#s2 [data-rcheck],#s2 [data-rindien]');if(!t||zoomed<0)return;
  const D=t.dataset;
  if(D.rtab){st.rtab=D.rtab;st.rindien=false;renderRes()}
  else if(D.rstap){rapOpslaan(false);st.rstep=D.rstap;st.rindien=false;renderRap()}
  else if(D.rvolg){const s=rapStappen(),i=s.findIndex(x=>x.id===st.rstep)+(+D.rvolg);if(s[i]){rapOpslaan(false);st.rstep=s[i].id;st.rindien=false;renderRap()}}
  else if(D.rcheck){const o=actieveOpdracht(),doel=o.doelen.find(d=>'d:'+d.id===st.rstep);if(doel){rapDoel(doel.id).gecontroleerd=true;renderRap()}}
  else if(D.rindien){if(!st.rindien){st.rindien=true;renderRap()}else{clearTimeout(rapTimer);rapOpslaan(true)}}
});
document.addEventListener('input',e=>{
  const t=e.target;if(!t.closest||!t.closest('#s2')||!t.dataset.rap||rapSlot())return;
  const p=t.dataset.rap.split(':'),r=rapInh();
  if(p[0]==='d')rapDoel(p[1])[p[2]]=t.value;else if(p[0]==='acties')r.acties=t.value;else if(p[0]==='advies')r.advies[p[1]]=t.value;
  rapSoon();
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t.closest||!t.closest('#s2')||rapSlot())return;
  if(t.dataset.rapData!==undefined){const o=actieveOpdracht(),doel=o.doelen.find(d=>'d:'+d.id===st.rstep);if(!doel)return;const dd=rapDoel(doel.id),i=t.dataset.rapData;
    dd.gekozen=t.checked?dd.gekozen.concat(i):dd.gekozen.filter(x=>x!==i);dd.gecontroleerd=false;rapSoon();renderRap()}
  else if(t.dataset.rapBehaald){const doel=actieveOpdracht().doelen.find(d=>'d:'+d.id===st.rstep);if(doel){rapDoel(doel.id).behaald=t.dataset.rapBehaald;rapSoon();renderRap()}}
});

/* ================= Docent: rapporten, doelen en de vier rondes ================= */
const rapDocent=()=>st.docRap||(st.docRap=[]);
function rapVan(studentId,opdrId){if(studentId==='jij')return st.rapport?{rid:'jij',student:'jij',status:st.rapport.status,inhoud:st.rapport.inhoud,beoordeling:st.rapport.beoordeling}:null;
  return rapDocent().find(r=>r.student===studentId&&(!r.opdracht||r.opdracht===opdrId))||null}
function dRap(){
  const o=actieveOpdracht();
  if(!o.doelen||!o.doelen.length)return `<div class="dcol"><h3>Rapporten</h3><div class="card2"><b>Deze opdracht heeft geen doelen</b><p>Activeer een opdracht met doelen, bijvoorbeeld een van de vier rondes. Maak de rondes bij het tabblad Opdrachten.</p></div></div>`;
  const stud=studenten();
  if(!stud.length)return `<div class="dcol"><h3>Rapporten</h3><div class="card2"><b>Nog geen studenten</b><p>Studenten loggen in met klascode <code>${esc(klas.code)}</code>.</p></div></div>`;
  const status=s=>{const r=rapVan(s.id,o.id);return r?(r.status==='ingeleverd'?'ingeleverd':'concept'):'niet gestart'};
  const rows=stud.map(s=>{const r=rapVan(s.id,o.id),b=r&&r.beoordeling&&r.beoordeling.criteria?r.beoordeling.criteria.filter(x=>x!==null&&x!==undefined).reduce((x,y)=>x+y,0)+' / 10':'';
    return `<tr class="row ${s.id===st.dsel?'sel':''}" data-rsel="${s.id}"><td><b>${esc(s.naam)}</b></td><td>${status(s)}</td><td>${b}</td></tr>`}).join('');
  const S=stud.find(x=>x.id===st.dsel)||stud[0],r=rapVan(S.id,o.id);
  let detail='<p class="note">Deze student is nog niet begonnen met het rapport.</p>';
  if(r){
    const pubs=S.pubs.filter(p=>!p.opdracht||p.opdracht===o.id),T=totalen(pubs),inh=r.inhoud||{},dl=inh.doelen||{},bg=o.begeleiding||'veel';
    const doelen=o.doelen.map((d,i)=>{const a=dl[d.id]||{gekozen:[],uitkomst:'',behaald:'',reden:''},w=doelWaarde(d,T),gh=doelGehaald(d,T),nodig=DOELTYPES[d.type].data,u=num(a.uitkomst);
      const klopt=u!==null&&Math.abs(u-w)<=Math.max(1,Math.abs(w)*0.03);
      const dataOk=nodig.every(x=>(a.gekozen||[]).includes(x));
      return `<div class="rdoel"><b>Doel ${i+1}: ${esc(doelTekst(d))}</b>
        <div class="rcmp"><span>Gekozen data</span><div>${(a.gekozen&&a.gekozen.length?a.gekozen.map(x=>esc(DI[x]?DI[x].naam:x)).join(', '):'–')} ${bg!=='veel'?`<em class="${dataOk?'g':'x'}">${dataOk?'bevat de juiste data':'mist: '+nodig.filter(x=>!(a.gekozen||[]).includes(x)).map(x=>esc(DI[x].naam)).join(', ')}</em>`:''}</div></div>
        <div class="rcmp"><span>Uitkomst student</span><div>${a.uitkomst!==''?esc(a.uitkomst):'–'} <em class="${klopt?'g':'x'}">rekenmotor: ${dec(w,d.type==='bereik'||d.type==='kliks'||d.type==='doorkliks'||d.type==='gedeeld'||d.type==='inschrijvingen'?0:1)}</em></div></div>
        <div class="rcmp"><span>Behaald volgens student</span><div>${a.behaald==='ja'?'Ja':a.behaald==='nee'?'Nee':'–'} <em class="${(a.behaald==='ja')===gh&&a.behaald!==''?'g':'x'}">rekenmotor: ${gh?'behaald':'niet behaald'}</em></div></div>
        <div class="rcmp"><span>Reden</span><div>${esc(a.reden||'–')}</div></div></div>`}).join('');
    const adv=inh.advies||{},B=(r.beoordeling&&r.beoordeling.criteria)||[];
    const crit=CRITERIA.map((c,i)=>`<label class="rcr"><span>${i+1}. ${esc(c)}</span><select id="f-rv-${i}">${optS([['','–'],[0,'0 onvoldoende'],[1,'1 voldoende'],[2,'2 goed']],B[i]===null||B[i]===undefined?'':B[i])}</select></label>`).join('');
    detail=`<div class="rstat"><b>${r.status==='ingeleverd'?'Ingeleverd':'Concept'}</b>${r.status==='ingeleverd'?`<button class="dbtn" data-reopen="${r.rid}" style="margin-left:auto">Heropenen voor de student</button>`:''}</div>
      ${bg==='geen'?'':doelen}
      ${inh.acties?`<div class="rdoel"><b>Acties</b><p>${esc(inh.acties)}</p></div>`:''}
      <div class="rdoel"><b>Advies aan de opdrachtgever</b>${[['data','Data'],['werkwijze','Werkwijze'],['resultaten','Resultaten'],['acties','Acties']].map(k=>`<div class="rcmp"><span>${k[1]}</span><div>${esc(adv[k[0]]||'–')}</div></div>`).join('')}</div>
      ${bg==='geen'?`<div class="rdoel"><b>Controle met de rekenmotor</b>${o.doelen.map(d=>`<div class="rcmp"><span>${esc(doelTekst(d))}</span><div>uitkomst ${dec(doelWaarde(d,T),1)}: ${doelGehaald(d,T)?'behaald':'niet behaald'}</div></div>`).join('')}</div>`:''}
      <div class="rdoel"><b>Beoordeling (criteria van de proeve)</b><div class="rcrs">${crit}</div>
        <label>Opmerking<textarea id="f-rv-op" rows="3">${esc(r.beoordeling&&r.beoordeling.opmerking||'')}</textarea></label>
        <button class="btn" data-rev="${r.rid}">Beoordeling opslaan</button></div>`;
  }
  return `<div class="dcol"><h3>Rapporten bij: ${esc(o.naam)}</h3><div class="box2"><table class="t2"><tr><th>Student</th><th>Status</th><th>Punten</th></tr>${rows}</table></div>
    <p class="note">De rekenmotor controleert alleen. Jij beoordeelt. De cijfers van de rekenmotor staan er als hulp bij.</p></div>
    <div class="dcol"><h3>${esc(S.naam)}</h3>${detail}</div>`}
/* formulier voor doelen en begeleiding bij een nieuwe opdracht */
function doelFormHTML(){
  const rij=i=>{const d=RONDES[3].doelen[i]||['bereik',3000];return `<div class="br2"><label class="ck"><input type="checkbox" id="f-dl-on${i}" ${i<3?'checked':''}> Doel ${i+1}</label><select id="f-dl-t${i}">${optS(Object.entries(DOELTYPES).map(([k,v])=>[k,v.naam]),d[0])}</select><input id="f-dl-v${i}" value="${d[1]}" inputmode="decimal"></div>`};
  return `<fieldset><legend>Kanalen waarop studenten publiceren</legend>${Object.entries(KANALEN).map(([k,n])=>`<label class="ck"><input type="checkbox" id="f-kn-${k}" ${k==='website'?'checked':''}> ${n}</label>`).join('')}</fieldset>
  <label>Begeleiding<select id="f-bg">${optS(Object.entries(BEGELEIDING),'veel')}</select></label>
    <fieldset><legend>Doelen van de opdrachtgever (leeg laten voor een gewone oefenopdracht)</legend><label class="ck"><input type="checkbox" id="f-dl-aan"> Deze opdracht heeft doelen en een rapport</label>${[0,1,2,3].map(rij).join('')}
    <p class="note">Voor vijf berichten ligt een gewone dag rond 3.000 bereik, 5,5% klikpercentage, 22% betrokkenheid en 5 inschrijvingen.</p></fieldset>`}
function formKanalen(){const k=Object.keys(KANALEN).filter(x=>val('f-kn-'+x));return k.length?k:['website']}
function formDoelen(){if(!val('f-dl-aan'))return [];
  return [0,1,2,3].filter(i=>val('f-dl-on'+i)).map((i,k)=>({id:'d'+(k+1),type:val('f-dl-t'+i),drempel:num(val('f-dl-v'+i))||0}))}
function rondesHTML(){return `<div class="card2" style="margin-top:6px"><b>De vier rondes</b><p>Maakt vier opdrachten met doelen: veel, middel, weinig en geen begeleiding. Ronde 4 is zoals de proeve.</p><button class="dbtn" data-drondes="1" style="margin-left:0;justify-self:start">Maak de vier rondes</button></div>
  <div class="card2" style="margin-top:6px"><b>Bonusronde met alle kanalen</b><p>Vier berichten op de website, Instagram en TikTok. Weinig begeleiding. Studenten leren dat elk kanaal anders werkt.</p><button class="dbtn" data-dbonus="1" style="margin-left:0;justify-self:start">Maak de bonusronde</button></div>`}
async function maakRondes(lijst,eerste){
  lijst=lijst||RONDES;eerste=eerste||'Ronde 1:';
  if(st.opdrachten.some(o=>o.naam.startsWith(eerste))){toast('Deze ronde bestaat al');return}
  if(typeof dAct==='function'&&st.rol==='docent'){
    if(st.busy)return;st.busy=true;
    try{for(const r of lijst.map(rondeObj))await api('rsim_docent_save_assignment',{p_code:st.klascode,p_dcode:st.dcode,p:r});await loadDocent();renderDocent();toast('Klaar. Activeer er één bij Opdrachten.')}
    catch(e){toast(e.message)}finally{st.busy=false}
  }else{lijst.map(rondeObj).forEach((r,i)=>st.opdrachten.push(Object.assign({id:'r'+Math.floor(Math.random()*1e6)},r)));renderDocent();toast('Klaar. Activeer er één.')}
}
dc.addEventListener('click',e=>{
  const t=e.target.closest('[data-rsel],[data-rev],[data-reopen],[data-drondes],[data-dbonus]');if(!t)return;const D=t.dataset;
  if(D.rsel){st.dsel=D.rsel;renderDocent()}
  else if(D.drondes)maakRondes();
  else if(D.dbonus)maakRondes([RONDE_SOCIAL],'Bonusronde:');
  else if(D.rev){
    const crit=CRITERIA.map((c,i)=>{const v=val('f-rv-'+i);return v===''?null:+v}),b={criteria:crit,opmerking:String(val('f-rv-op')||'')};
    if(typeof dAct==='function'&&st.rol==='docent')dAct('rsim_docent_review',{p_report:D.rev,p_beoordeling:b},'Beoordeling opgeslagen');
    else{const r=rapVan(st.dsel,actieveOpdracht().id);if(r){r.beoordeling=b;if(r.rid==='jij')st.rapport.beoordeling=b}renderDocent();toast('Beoordeling opgeslagen')}
  }
  else if(D.reopen){
    if(typeof dAct==='function'&&st.rol==='docent')dAct('rsim_docent_reopen',{p_report:D.reopen},'Rapport staat weer open voor de student');
    else{const r=rapVan(st.dsel,actieveOpdracht().id);if(r){r.status='concept';if(r.rid==='jij')st.rapport.status='concept'}renderDocent();toast('Rapport staat weer open voor de student')}
  }
});
/* demo: de vier rondes staan meteen klaar, met directe tijd zodat het rapport meteen opengaat */
if(typeof api==='undefined'&&!st.opdrachten.some(o=>/^Ronde 1:/.test(o.naam))){RONDES.concat([RONDE_SOCIAL]).map(rondeObj).forEach((r,i)=>st.opdrachten.push(Object.assign({id:'r'+(i+1)},r,{modus:'direct'})))}
