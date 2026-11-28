const Engine=window.Engine;
/* Rekenregels: zelfde waarden als tabel rsim_settings, sleutel 'rekenregels'. Leeg = standaardwaarden van de motor. */
const RULES={};
const DB=/*DATA*/;
const A=DB.map(x=>({id:x.id,c:x.categorie.replace('_',' '),t:x.titel_origineel,i:x.intro_origineel,b:x.beelden.map(b=>[b.type,b.beschrijving,b.bron||'',!!b.mensen]),d:x,door:x.toegevoegd_door||x.door||'startset'}));
const byId=Object.fromEntries(A.map(a=>[a.id,a]));
const PLEK={boven:'Bovenaan',midden:'Midden',onder:'Onderaan'};
/*BIB*/
const CATS=['verkeer','politiek','misdaad','human_interest','economie','zorg','onderwijs','cultuur','weer','milieu','veiligheid','sport','shownieuws','tech','mode'];
const DOELEN={bereik:'Zoveel mogelijk bereik',lezers_houden:'Lezers vasthouden (hoge leestijd)',balans:'Balans tussen bereik en leestijd'};
const METRICS=[['bereik','Bereik'],['kliks','Kliks en klikpercentage'],['leestijd','Leestijd'],['verloop','Verloop per uur']];
const slug=t=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hh=n=>String(n%24).padStart(2,'0')+':00';
const fmt=n=>n.toLocaleString('nl-NL');
const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const dec=(n,d=2)=>n.toFixed(d).replace('.',',');
const NOW0=Date.now();

/* ---- klas, opdrachten, studenten (demo) ---- */
const klas={naam:'MR2A',code:'VW-MR2A',modus:'versneld',vers:60};
const st={sel:'n02',draft:null,res:0,docOk:false,dtab:'tijd',dsel:'jij',dpub:0,fv:{},
  actief:'o1',
  opdrachten:[
    {id:'o1',naam:'Vrije oefening',doel:'balans',artikelen:A.map(a=>a.id),modus:'',max:0,metrics:['bereik','kliks','leestijd','verloop'],kanalen:['website','instagram','tiktok'],eigen:true},
    {id:'o2',naam:'Kop en beeld: wat doet het?',doel:'bereik',artikelen:['n01','n03','n05','n08','n13'],modus:'versneld',max:2,metrics:['bereik','kliks','verloop']}],
  pubs:[
    {id:'n01',slug:'vechtbrug-twee-weken-dicht-zo-rijd-je-om',kop:'Vechtbrug twee weken dicht: zo rijd je om',beeld:-1,uur:7,plek:'boven',seed:1111,ex:true,tPub:0,wijzigingen:[{uurNa:3,beeld:0}]},
    {id:'n04',slug:'gerrit-87-fietst-elke-dag-naar-de-markt',kop:'Gerrit (87) fietst elke dag naar de markt',beeld:2,uur:20,plek:'midden',seed:2222,ex:true,tPub:0,wijzigingen:[]},
    {id:'n09',slug:'code-geel-voor-storm',kop:'Code geel voor storm komende nacht',beeld:-1,uur:6,plek:'boven',seed:3333,ex:true,tPub:0,wijzigingen:[{uurNa:5,intrekken:true}]}]};
function lcg(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
const NAMEN=['Amira','Daan','Fatima','Joris','Lotte','Mehmet','Noor','Sem','Yara','Tim'];
const demo=NAMEN.map((naam,i)=>{const r=lcg(100+i*7),ids=A.map(a=>a.id);
  for(let j=ids.length-1;j>0;j--){const k=Math.floor(r()*(j+1));[ids[j],ids[k]]=[ids[k],ids[j]]}
  const pubs=[];for(let j=0;j<1+(i%3);j++){const id=ids[j],a=byId[id],beeld=[-1,0,1,2][Math.floor(r()*4)],pl=r()<.4?'boven':(r()<.6?'midden':'onder');
    const kop=r()<.2?'SCHOKKEND! '+a.t+': dit moet je zien':a.t;const w=(beeld<0&&r()<.35)?[{uurNa:2+Math.floor(r()*6),beeld:0}]:[];
    pubs.push({id,slug:slug(kop),kop,beeld,uur:6+Math.floor(r()*16),plek:pl,seed:1000+i*50+j,tPub:NOW0-(3+Math.floor(r()*40))*60000,wijzigingen:w})}
  return {id:'s'+i,naam,pubs}});
const studenten=()=>[{id:'jij',naam:'Jij (demo)',pubs:st.pubs}].concat(demo);

/* ---- tijd ---- */
const actieveOpdracht=()=>st.opdrachten.find(o=>o.id===st.actief)||st.opdrachten[0];
const tm=()=>({modus:actieveOpdracht().modus||klas.modus,vers:klas.vers});
function tmLabel(){const t=tm();return t.modus==='direct'?'direct (24 uur meteen zichtbaar)':t.modus==='echt'?'echte tijd (1 uur is 1 uur)':'versneld ('+(t.vers>=60?'1 minuut = '+dec(t.vers/60,t.vers%60?1:0)+' uur':'1 minuut = '+t.vers+' minuten')+')'}
function elapsed(p){const t=tm();if(t.modus==='direct')return 24;const min=(Date.now()-p.tPub)/60000;
  return Math.max(0,Math.min(24,Math.floor(t.modus==='echt'?min/60:min*t.vers/60)))}

/* ---- publicaties ---- */
function nu(p){const s={kop:p.kop,beeld:p.beeld,plek:p.plek,ingetrokken:false,intrekUurNa:null};
  [...p.wijzigingen].sort((x,y)=>x.uurNa-y.uurNa).forEach(w=>{if(w.intrekken){s.ingetrokken=true;s.intrekUurNa=w.uurNa}else{if(w.kop!==undefined)s.kop=w.kop;if(w.beeld!==undefined)s.beeld=w.beeld;if(w.plek!==undefined)s.plek=w.plek}});return s}
const KANALEN={website:'Website',instagram:'Instagram',tiktok:'TikTok'};
const kan=()=>st.kanaal||'website',kanaalVan=p=>p.kanaal||'website';
const curPub=(id,k)=>st.pubs.find(p=>p.id===id&&kanaalVan(p)===(k||kan()));
const opKanalen=()=>{const o=actieveOpdracht();return (o&&o.kanalen&&o.kanalen.length)?o.kanalen:['website']};
const SOC={instagram:{wil:'foto',max:125,naam:'Bijschrift',ph:'Schrijf een kort bijschrift'},tiktok:{wil:'video',max:90,naam:'Haak',ph:'Eerste zin die kijkers vastpakt'}};
const laatsteUur=p=>p.wijzigingen.reduce((m,w)=>Math.max(m,w.uurNa),0);
function editUur(p){const min=laatsteUur(p)+1;return tm().modus==='direct'?Math.min(Math.max(st.draft.uurNa||min,min),23):Math.min(23,Math.max(elapsed(p),min))}
function newDraft(id){const a=byId[id],p=curPub(id);
  if(p){const s=nu(p);const d={kop:s.kop,beeld:s.beeld,plek:s.plek,uur:12};if(!s.ingetrokken)d.uurNa=Math.min(23,laatsteUur(p)+1);return d}
  if(kan()!=='website')return {kop:'',beeld:-1,uur:19,plek:'midden'};
  return {kop:a.t,beeld:-1,uur:12,plek:'midden'}}
const sim=p=>kanaalVan(p)==='website'?Engine.simuleer(byId[p.id].d,{kop:p.kop,beeld:p.beeld,uur:p.uur,plek:p.plek,seed:p.seed,wijzigingen:p.wijzigingen},RULES):Engine.simuleerSocial(byId[p.id].d,{kanaal:kanaalVan(p),kop:p.kop,beeld:p.beeld,uur:p.uur,seed:p.seed,wijzigingen:p.wijzigingen},RULES);
function viewOf(p){const c=sim(p),e=elapsed(p);let b=0,k=0,l=0,dk=0,dl=0,ins=0,ia=0;const soc=kanaalVan(p)!=='website';c.verloop.slice(0,e).forEach(x=>{b+=x.bereik;k+=x.kliks;l+=soc?x.bereik*x.lees:x.kliks*x.lees;dk+=x.door||0;dl+=x.deel||0;ins+=x.inschr||0;ia+=x.int||0});
  return {c,e,b,k,ctr:b?k/b:0,lees:soc?(b?Math.round(l/b):0):(k?Math.round(l/k):0),dk,dl,ins,ia,soc}}
const alleIds=op=>op.artikelen.concat(A.filter(a=>a.door==='student'&&!op.artikelen.includes(a.id)).map(a=>a.id));
function sel0(){const op=actieveOpdracht(),ids=alleIds(op);if(!ids.includes(st.sel))st.sel=ids[0]}
sel0();st.draft=newDraft(st.sel);

/* ---- grafiek en uitleg (student en docent) ---- */
function chartHTML(v){const c=v.c,V=c.verloop,mx=Math.max(1,...V.slice(0,v.e).map(x=>x.kliks));
  const bars=V.map((x,i)=>{const fut=i>=v.e;return `<div class="b ${fut?'fut':''} ${!fut&&x.gebeurtenis?'ev':''} ${!fut&&!x.actief?'off':''}" style="height:${fut?100:(x.actief?Math.max(3,x.kliks/mx*88):3)}%" title="${hh(x.uur)}: ${fut?'nog niet verstreken':x.kliks+' kliks'}${!fut&&x.gebeurtenis?' ('+esc(x.gebeurtenis)+')':''}">${!fut&&x.actief&&(x.kliks===mx&&mx>1||x.gebeurtenis)?`<em>${x.kliks}</em>`:''}</div>`}).join('');
  const labels=V.map((x,i)=>`<span>${i%3===0?String(x.uur).padStart(2,'0')+'u':''}</span>`).join('');
  const ev=c.gebeurtenissen.filter(g=>g.uurNa<v.e).map(g=>`<span><b>${hh(g.uur)}</b> ${esc(g.tekst)} (${g.uurNa} uur na publicatie)</span>`).join('');
  return `<div class="chart">${bars}</div><div class="xl">${labels}</div><div class="evlist"><span>${v.e} van 24 uur verstreken</span>${ev||(v.e?'<span>Geen wijzigingen sinds publicatie.</span>':'')}</div>`}
const whyHTML=c=>`<div class="why">${c.uitleg.map(u=>`<div><b>${esc(u.label)}</b><span>${esc(u.tekst)}</span><span class="f">×${dec(u.factor)}</span></div>`).join('')}</div>`;

/* ---- scherm 1: redactiesysteem ---- */
function phImg(b,cls){const src=b&&b[2]?bibSrc(b[2]):'';
  return `<div class="${cls||'ph'}${src?' pic':''}"${src?` style="background-image:url('${src}')"`:''}>${!b?'Geen beeld':(b[0]==='video'?'<div class="play">▶</div>':(src?'':'Foto'))}</div>`}
const phBox=b=>phImg(b);
function renderSys(){
  sel0();
  if(!opKanalen().includes(kan())){st.kanaal=opKanalen()[0];st.draft=newDraft(st.sel)}
  const KN=kan(),soc=KN!=='website',SC=SOC[KN]||{};
  const op=actieveOpdracht(),a=byId[st.sel],d=st.draft,p=curPub(st.sel),s=p?nu(p):null;
  const mode=!p?'nieuw':(s.ingetrokken?'ingetrokken':'edit');
  const pog=st.pubs.filter(q=>q.id===st.sel&&kanaalVan(q)===kan()).length,geblokkeerd=op.max>0&&pog>=op.max&&mode!=='edit';
  const list=alleIds(op).map(id=>byId[id]).map(x=>{const q=curPub(x.id),qs=q&&nu(q);
    const tag=!q?'<span>klaar om te publiceren</span>':(qs.ingetrokken?'<span class="pill">ingetrokken</span>':'<span class="pill ok">gepubliceerd</span>');
    return `<div class="it ${x.id===st.sel?'sel':''}" data-pick="${x.id}"><div class="t">${esc(x.t)}</div><div class="m"><span class="pill">${esc(x.c)}</span>${tag}</div></div>`}).join('');
  const imgs=(soc?[]:['<button class="img '+(d.beeld<0?'sel':'')+'" data-beeld="-1"><div class="ph">Geen beeld</div><div class="d">Zonder beeld</div><div class="k">–</div></button>'])
    .concat(a.b.map((b,i)=>soc&&b[0]!==SC.wil?'':`<button class="img ${d.beeld===i?'sel':''}" data-beeld="${i}">${phImg(b)}<div class="d">${esc(b[1])}</div><div class="k">${b[0]==='video'?'Video':'Foto'}</div></button>`)).join('');
  const geenBeeld=soc&&!a.b.some(b=>b[0]===SC.wil);
  const seg=['boven','midden','onder'].map(k=>`<button class="${d.plek===k?'sel':''}" data-plek="${k}"><span class="mini"><i class="${k==='boven'?'hot':''}"></i><i class="${k==='midden'?'hot':''}"></i><i class="${k==='onder'?'hot':''}"></i></span>${PLEK[k]}</button>`).join('');
  const beeldTxt=d.beeld<0?'geen beeld':(a.b[d.beeld][0]==='video'?'video':'foto');
  let tijd,go,url='';
  if(mode==='edit'){
    const min=laatsteUur(p)+1,uurNa=editUur(p),klok=p.uur+uurNa;
    url=soc?'':`<div class="url"><span>Adres:</span><b>vechtwaard.nl/nieuws/${esc(p.slug)}</b><span>Dit adres blijft gelijk na een wijziging.</span></div>`;
    if(min>23)tijd='<div><label class="l">Aanpassen om</label><p style="margin:0;color:#6b7885">Binnen de eerste 24 uur is geen aanpassing meer mogelijk.</p></div>';
    else if(tm().modus==='direct')tijd=`<div><label class="l">Aanpassen om<span id="tm2sub">${uurNa} uur na publicatie</span></label><div class="time" id="tm2">${hh(klok)}</div><input type="range" id="uurna" min="${min}" max="23" value="${uurNa}"></div>`;
    else tijd=`<div><label class="l">Aanpassen om<span>de klok loopt mee</span></label><div class="time">${hh(klok)}</div><p style="margin:4px 0 0;color:#6b7885">Een wijziging gaat nu in, ${uurNa} uur na publicatie.</p></div>`;
    go=`<p>${soc?KANALEN[KN]+', gepubliceerd':'Gepubliceerd'} om ${hh(p.uur)} met ${s.beeld<0?'geen beeld':(a.b[s.beeld][0]==='video'?'video':'foto')}. De resultaten laten zien vanaf wanneer je iets veranderde.</p><div class="btns"><button class="btn ghost" data-intrek="1" ${min>23?'disabled':''}>Intrekken</button><button class="btn" data-edit="1" ${min>23?'disabled':''}>Wijziging doorvoeren</button></div>`;
  }else{
    tijd=`<div><label class="l">Tijdstip<span>Wanneer gaat het online</span></label><div class="time" id="tm">${hh(d.uur)}</div><input type="range" id="uur" min="0" max="23" value="${d.uur}"></div>`;
    if(mode==='ingetrokken'&&!soc)url=`<div class="url"><span>Adres:</span><b>vechtwaard.nl/nieuws/${esc(p.slug)}</b><span>Ingetrokken om ${hh(p.uur+s.intrekUurNa)}, ${s.intrekUurNa} uur na publicatie.</span></div>`;
    go=`<p>${geblokkeerd?'Je hebt alle '+op.max+' pogingen voor dit bericht gebruikt.':geenBeeld?'Dit bericht heeft geen '+SC.wil+' voor '+KANALEN[KN]+'.':(soc?KANALEN[KN]:esc(PLEK[d.plek]))+' om '+hh(d.uur)+' met '+beeldTxt+'.'}</p><button class="btn" data-publish="1" ${geblokkeerd||geenBeeld?'disabled':''}>${mode==='ingetrokken'?'Opnieuw publiceren':'Publiceer'}</button>`;
  }
  $('#s0').innerHTML=`<div class="cms"><div class="hd"><b>Vechtwaard CMS</b><span>Nieuws · ${esc(op.naam)}</span><span class="r">Doel: ${esc(DOELEN[op.doel])}</span></div>
  ${opKanalen().length>1?`<div class="ktabs"><span>Kanaal</span>${opKanalen().map(k=>`<button data-kanaal="${k}" class="${k===KN?'on':''}">${KANALEN[k]}</button>`).join('')}</div>`:''}
  <div class="body"><div class="list"><h3>Berichten voor deze opdracht</h3>${op.eigen?`<button class="nieuw ${st.eigenOpen?'on':''}" data-eigen="open">+ Eigen onderwerp</button>`:''}${list}</div>
  <div class="ed">${url}<div class="orig"><small>Bericht van de verslaggever</small><p><b>${esc(a.t)}</b><br>${esc(a.i)}</p></div>
  <div><label class="l">${soc?SC.naam+(KN==='tiktok'?' in de eerste seconden':' bij de foto'):'Kop op de site'}<span id="cnt">${d.kop.length}${soc?' van '+SC.max:''} tekens</span></label><input class="kop ${soc?'s':''}" id="kop" maxlength="${soc?SC.max:200}" ${soc?`placeholder="${SC.ph}"`:''} value="${esc(d.kop)}"></div>
  <div><label class="l">${soc?(KN==='instagram'?'Foto':'Video'):'Beeld'}<span>${soc?'Kies wat past bij '+KANALEN[KN]:'Kies wat bij de kop past'}</span></label><div class="imgs">${imgs}</div></div>
  <div class="row2">${tijd}${soc?`<div><label class="l">Waar komt het te staan</label><p style="margin:4px 0 0;color:#6b7885">${KN==='instagram'?'In de tijdlijn van volgers. Kies een foto en schrijf een kort bijschrift.':'In de For You-feed. De haak bepaalt of mensen blijven kijken.'}</p></div>`:`<div><label class="l">Plek op de homepage</label><div class="seg">${seg}</div></div>`}</div>
  <div class="go">${go}</div></div></div></div>`;
  if(st.eigenOpen&&op.eigen)$('#s0 .ed').innerHTML=eigenFormHTML();
}
/* ---- beeldbibliotheek-kiezer (student en docent) ---- */
const optH=(o,cur)=>o.map(x=>`<option value="${x[0]}" ${String(x[0])===String(cur)?'selected':''}>${x[1]}</option>`).join('');
function bibPicker(sel,sc){
  const ids=Object.keys(BIB);
  return `<div class="bib">${ids.map(id=>{const n=sel.findIndex(x=>x.bron===id);return `<button type="button" class="bi ${n>=0?'on':''}" data-bib="${sc}:${id}" title="${esc(BIB[id].l)}"><span class="bimg" style="background-image:url('${bibSrc(id)}')"></span><span class="bl">${esc(BIB[id].l)}</span>${n>=0?`<i>${n+1}</i>`:''}</button>`}).join('')}</div>
  <div class="bsel">${sel.length?sel.map((x,k)=>`<div class="bs"><span class="bimg" style="background-image:url('${bibSrc(x.bron)}')"></span><b>${k+1}. ${esc(BIB[x.bron].l)}</b><select data-bibtype="${sc}:${k}">${optH([['foto','Foto'],['video','Video (foto met play-knop)']],x.type)}</select><button type="button" data-bibdel="${sc}:${k}" title="Verwijderen">×</button></div>`).join(''):'<p class="muted">Klik op een beeld om het toe te voegen. Kies er 1 tot 3.</p>'}</div>`}
const PICK={E:[],D:[]};
function bibToggle(sc,id){const L=PICK[sc],k=L.findIndex(x=>x.bron===id);if(k>=0)L.splice(k,1);else if(L.length<3)L.push({bron:id,type:L.length===1||L.length===2?'video':'foto'});else toast('Kies maximaal drie beelden')}
/* ---- eigen onderwerp (student) ---- */
const EF0={titel:'',intro:'',cat:'verkeer',nabij:'5',impact:'3',conflict:'1',mens:'1',nieuw:'5',duur:'24',voor:'iedereen'};
st.ef=Object.assign({},EF0);
function eigenFormHTML(){const f=st.ef,op=actieveOpdracht(),k=opKanalen();
  const q=(id,l,o)=>`<label>${l}<select data-ef="${id}">${optH(o,f[id])}</select></label>`;
  return `<div class="eig"><h2>Eigen onderwerp</h2><p class="muted">Bedenk een bericht voor Vechtwaard. Je antwoorden bepalen hoe interessant het nieuws is voor het publiek.</p>
  <div class="two"><label>Titel van je bericht<input data-ef="titel" maxlength="120" value="${esc(f.titel)}" placeholder="Wat is er gebeurd?"></label>${q('cat','Categorie',CATS.map(c=>[c,c.replace('_',' ')]))}</div>
  <label>Eerste alinea<textarea data-ef="intro" rows="3" maxlength="400" placeholder="Wie, wat, waar en wanneer in een paar zinnen">${esc(f.intro)}</textarea></label>
  <div class="q3">${q('nabij','Waar speelt het?',[['5','In onze regio'],['3','Ergens in Nederland'],['1','Ver weg']])}
  ${q('impact','Hoeveel mensen raakt het?',[['2','Weinig mensen'],['3','Een groep mensen'],['5','Heel veel mensen']])}
  ${q('conflict','Is er ruzie of tegenstelling?',[['1','Nee'],['3','Een beetje'],['5','Ja, duidelijk']])}
  ${q('mens','Gaat het over een persoon en zijn verhaal?',[['1','Nee'],['3','Een beetje'],['5','Ja, vooral']])}
  ${q('nieuw','Hoe nieuw is het?',[['5','Gebeurt vandaag'],['3','Deze week'],['1','Al een tijd bekend']])}
  ${q('duur','Hoe lang blijft het interessant?',[['12','Een halve dag'],['24','Een dag'],['48','Twee dagen'],['168','Een week']])}
  ${q('voor','Voor wie vooral?',[['iedereen','Iedereen'],['jongeren','Jongeren'],['volwassenen','Volwassenen'],['senioren','Senioren']])}</div>
  <label>Beelden${k.includes('instagram')||k.includes('tiktok')?'. Instagram heeft een foto nodig en TikTok een video':''}</label>${bibPicker(PICK.E,'E')}
  <div class="btns"><button class="btn ghost" data-eigen="cancel">Annuleren</button><button class="btn" data-eigen="save">Bericht toevoegen</button></div></div>`}
function eigenData(f,pick,id){const n=x=>+x,ij={jongeren:3,volwassenen:3,midden:3,senioren:3};
  if(f.voor!=='iedereen'){Object.keys(ij).forEach(g=>ij[g]=2);ij[f.voor]=5}
  return {id,categorie:f.cat,titel_origineel:f.titel.trim(),intro_origineel:f.intro.trim(),tekst:f.intro.trim(),
    nieuwswaarde:{impact:n(f.impact),nabijheid:n(f.nabij),conflict:n(f.conflict),human_interest:n(f.mens),actualiteit:n(f.nieuw)},emotie:'neutraal',tijdgevoeligheid_uren:n(f.duur),interesse:ij,
    sensatie_potentieel:Math.min(4,Math.max(1,Math.round((n(f.conflict)+n(f.impact))/3))),
    beelden:pick.map((p,k)=>Object.assign({id:id+'-'+(p.type==='video'?'v':'f')+(k+1),type:p.type,beschrijving:BIB[p.bron].l,kwaliteit:BIB[p.bron].q,bron:p.bron,mensen:!!BIB[p.bron].m},p.type==='video'?{duur_sec:30}:{})),
    toegevoegd_door:'student'}}
async function persistEigen(d){const id='e'+(A.filter(a=>a.door==='student').length+1);const x=eigenData(st.ef,PICK.E,id);
  const a={id,c:x.categorie.replace('_',' '),t:x.titel_origineel,i:x.intro_origineel,b:x.beelden.map(b=>[b.type,b.beschrijving,b.bron,!!b.mensen]),d:x,door:'student'};A.push(a);byId[id]=a;return id}
async function saveEigen(){const f=st.ef;
  if(f.titel.trim().length<3){toast('Geef je bericht een titel');return}
  if(f.intro.trim().length<10){toast('Schrijf een eerste alinea van minstens een paar zinnen');return}
  if(!PICK.E.length){toast('Kies minstens een beeld');return}
  try{const id=await persistEigen();st.eigenOpen=false;st.sel=id;st.ef=Object.assign({},EF0);PICK.E=[];st.draft=newDraft(id);ververs();toast('Je bericht staat in de lijst. Je kunt het nu publiceren.')}
  catch(e){toast(e.message)}}
document.addEventListener('click',function(e){const t=e.target.closest('#s0 [data-eigen],#s0 [data-bib],#s0 [data-bibdel]');if(!t||zoomed<0)return;
  if(t.dataset.eigen==='open'){st.eigenOpen=!st.eigenOpen;renderSys()}
  else if(t.dataset.eigen==='cancel'){st.eigenOpen=false;renderSys()}
  else if(t.dataset.eigen==='save')saveEigen();
  else if(t.dataset.bib){bibToggle('E',t.dataset.bib.split(':')[1]);renderSys()}
  else if(t.dataset.bibdel){PICK.E.splice(+t.dataset.bibdel.split(':')[1],1);renderSys()}});
document.addEventListener('input',function(e){const t=e.target.closest('#s0 [data-ef]');if(t)st.ef[t.dataset.ef]=t.value});
document.addEventListener('change',function(e){const t=e.target.closest('#s0 [data-bibtype]');if(t)PICK.E[+t.dataset.bibtype.split(':')[1]].type=t.value;const u=e.target.closest('#s0 [data-ef]');if(u)st.ef[u.dataset.ef]=u.value});
/* ---- scherm 2: website ---- */
function webCard(p,big){
  if(!p)return `<div class="empty" style="${big?'height:300px':'height:130px'}">Ruimte voor nieuws</div>`;
  const a=byId[p.id],s=nu(p),b=s.beeld>=0?a.b[s.beeld]:null;
  return `<div class="${big?'hero':'card'}">${b?phBox(b):''}<div class="cat" style="margin-top:8px">${esc(a.c)}</div>${big?`<h1>${esc(s.kop)}</h1><p>${esc(a.i)}</p>`:`<h3>${esc(s.kop)}</h3>`}</div>`;
}
function renderSite(bar){
  const live=st.pubs.filter(p=>kanaalVan(p)==='website'&&!nu(p).ingetrokken);
  const by=k=>live.filter(p=>nu(p).plek===k);
  const bo=by('boven'),mi=by('midden'),on=by('onder');
  const low=[0,1,2,3,4,5].map(i=>on[i]?`<div>${esc(nu(on[i]).kop)}</div>`:`<div class="empty">Ruimte voor nieuws</div>`).join('');
  return `<div class="web"><div class="mast"><b>Vechtwaard</b><span>Nieuws uit de regio</span>${bar}<span class="r">vr 20 november</span></div>
  <div class="nav"><a class="on">Nieuws</a><a>Sport</a><a>Shownieuws</a><a>Tech</a><a>Mode</a></div>
  <div class="main"><div class="top2">${webCard(bo[0],true)}<div class="side"><h4>Meest gelezen</h4><ul><li>Gemeente deelt nieuwe plannen voor de Oosterhaven</li><li>Voetbalclub wint derby in extremis</li><li>Weekmarkt krijgt een extra dag</li><li>Fietspad langs de Vecht wordt verbreed</li></ul></div></div>
  <div><h4 class="sec">Meer uit de regio</h4><div class="mid3">${[0,1,2].map(i=>webCard(mi[i],false)).join('')}</div></div>
  <div><h4 class="sec">Verder in het nieuws</h4><div class="low">${low}</div></div></div></div>`;
}
function socTile(p,k){const a=byId[p.id],s=nu(p),v=viewOf(p),b=s.beeld>=0?a.b[s.beeld]:null;
  const stat=v.e?`<span>♥ ${fmt(v.ia)}</span><span>${k==='tiktok'?'▶ '+fmt(v.b):'bereik '+fmt(v.b)}</span>`:'<span>net geplaatst</span>';
  return k==='instagram'?`<div class="igt">${b?phImg(b,'igp'):'<div class="igp"></div>'}<p>${esc(s.kop)}</p><div class="st">${stat}</div></div>`
   :`<div class="ttt"><div class="ttp${b&&b[2]?' pic':''}"${b&&b[2]?` style="background-image:url('${bibSrc(b[2])}')"`:''}><div class="play">▶</div><div class="hk">${esc(s.kop)}</div></div><div class="st">${stat}</div></div>`}
function renderWeb(){
  const ks=opKanalen();if(!ks.includes(st.wkan))st.wkan='website';
  const bar=ks.length>1?`<span class="wbar">${ks.map(k=>`<button data-wkan="${k}" class="${k===st.wkan?'on':''}">${KANALEN[k]}</button>`).join('')}</span>`:'';
  if(st.wkan==='website'){$('#s1').innerHTML=renderSite(bar);return}
  const k=st.wkan,live=st.pubs.filter(p=>kanaalVan(p)===k&&!nu(p).ingetrokken),n=k==='instagram'?6:4;
  const tiles=[...Array(n)].map((_,i)=>live[i]?socTile(live[i],k):`<div class="${k==='instagram'?'igt':'ttt'} empty"><div class="${k==='instagram'?'igp':'ttp'}"></div><p>Ruimte voor een post</p></div>`).join('');
  $('#s1').innerHTML=`<div class="web"><div class="mast"><b>Vechtwaard</b><span>${k==='instagram'?'@vechtwaard op Instagram':'@vechtwaard op TikTok'}</span>${bar}<span class="r">${new Date(typeof nowMs==='function'?nowMs():Date.now()).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'long'})}</span></div><div class="socmain ${k}"><div class="prof"><div class="av">V</div><div><b>vechtwaard</b><span>Nieuws uit de regio · ${live.length} ${k==='instagram'?'berichten':'video\'s'}</span></div></div><div class="sgrid">${tiles}</div></div></div>`}
/* ---- scherm 3: resultaten ---- */
function renderRes(){
  if(st.rtab==='rap'&&heeftRapport())return renderRap();
  const M=new Set(actieveOpdracht().metrics);
  const rows=st.pubs.map(p=>({p,s:nu(p),v:viewOf(p)}));
  const T=rows.reduce((o,r)=>({b:o.b+r.v.b,k:o.k+r.v.k,kw:o.kw+(r.v.soc?0:r.v.k),l:o.l+(r.v.soc?0:r.v.lees*r.v.k)}),{b:0,k:0,kw:0,l:0});
  const sel=rows[Math.min(st.res,rows.length-1)];
  const th=`<th>Kop of tekst</th><th>Waar</th><th>Tijd</th><th>Uur</th>${M.has('bereik')?'<th>Bereik</th>':''}${M.has('kliks')?'<th>Kliks</th><th>Klik%</th>':''}${M.has('leestijd')?'<th>Leestijd</th>':''}`;
  const body=rows.map((r,i)=>`<tr class="row ${i===st.res?'sel':''}" data-res="${i}"><td class="k"><span class="kt">${esc(r.s.kop)}</span>${r.p.ex?'<span class="tagx">voorbeeld</span>':''}${r.s.ingetrokken?'<span class="tagx red">ingetrokken</span>':(r.p.wijzigingen.length?'<span class="tagx">aangepast</span>':'')}</td><td>${kanaalVan(r.p)==='website'?'Web, '+PLEK[r.s.plek].toLowerCase():KANALEN[kanaalVan(r.p)]}</td><td>${hh(r.p.uur)}</td><td>${r.v.e}/24</td>${M.has('bereik')?`<td>${fmt(r.v.b)}</td>`:''}${M.has('kliks')?`<td>${fmt(r.v.k)}</td><td>${dec(r.v.ctr*100,1)}%</td>`:''}${M.has('leestijd')?`<td>${mmss(r.v.lees)}</td>`:''}</tr>`).join('');
  let right='<p class="n">Publiceer een bericht om het verloop te zien.</p>';
  if(sel){right=(M.has('verloop')?chartHTML(sel.v):`<p class="n">Het verloop per uur is voor deze opdracht verborgen.</p>`)+whyHTML(sel.v.c)}
  const kp=[];
  if(M.has('bereik'))kp.push(['Bereik',fmt(T.b)]);
  if(M.has('kliks')){kp.push(['Kliks',fmt(T.k)]);kp.push(['Klikpercentage',T.b?dec(T.k/T.b*100,1)+'%':'0%'])}
  if(M.has('leestijd'))kp.push(['Gem. leestijd website',T.kw?mmss(Math.round(T.l/T.kw)):'0:00']);
  $('#s2').innerHTML=`<div class="res"><div class="head"><b>Resultatenmonitor</b>${rtabsHTML()}<span>Tijd: ${esc(tmLabel())}</span><span class="ex">${esc(actieveOpdracht().naam)}</span></div>
  <div class="kpis" style="grid-template-columns:repeat(${Math.max(kp.length,1)},1fr)">${kp.map(k=>`<div class="kpi"><small>${k[0]}</small><div>${k[1]}</div></div>`).join('')}</div>
  <div class="grid"><div class="pan"><h4>Berichten</h4><table class="t"><tr>${th}</tr>${body}</table></div>
  <div class="pan"><h4>${sel?esc(sel.s.kop.slice(0,40))+(sel.s.kop.length>40?'…':''):'Verloop'}</h4>${right}</div></div></div>`;
}
function syncPrev(){[0,1,2].forEach(i=>{$('#p'+i).innerHTML=$('#s'+i).innerHTML.replace(/ id="[^"]*"/g,'')})}
function renderAll(){renderSys();renderWeb();renderRes();syncPrev()}

/* ---- zoomen op het bureau ---- */
const BZ=10, mons=[...document.querySelectorAll('.mon')], inners=[0,1,2].map(i=>$('#s'+i));
const hs=[...document.querySelectorAll('.hs')];
let zoomed=-1;
const scaleFor=w=>(w-2*BZ)/1600;
const ASP=2576/1438;
const QUADS=[[[102,580],[926,517],[943,898],[172,1041]],[[949,518],[1658,517],[1644,897],[963,894]],[[1679,539],[2494,605],[2431,1049],[1664,899]]];
function homog(src,dst){const A=[],b=[];for(let k=0;k<4;k++){const [x,y]=src[k],[u,v]=dst[k];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}
  const n=8;for(let i=0;i<n;i++){let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
    for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}
  const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let t=b[i];for(let c=i+1;c<n;c++)t-=A[i][c]*x[c];x[i]=t/A[i][i]}return x}
function place(k){const src=[[0,0],[1600,0],[1600,1000],[0,1000]];QUADS.forEach((q,i)=>{const h=homog(src,q.map(p=>[p[0]*k,p[1]*k]));
  $('#p'+i).style.transform=`matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`})}
function fit(){const sg=$('#stage'),p=$('#photo');const W=sg.clientWidth,H=sg.clientHeight;let w=Math.min(W,H*ASP),h=w/ASP;p.style.width=w+'px';p.style.height=h+'px';place(w/2576)}
function target(){const W=innerWidth,H=innerHeight-48-16;let w=Math.min(W,H*1.6),h=w/1.6;return {w,h,l:(W-w)/2,t:48+(H-h)/2+8}}
function setRect(m,r){m.style.left=r.left+'px';m.style.top=r.top+'px';m.style.width=r.width+'px';m.style.height=r.height+'px'}
function open(i){
  if(zoomed===i)return; if(zoomed>=0)closeNow();
  const m=mons[i],r=hs[i].getBoundingClientRect(),T=target();
  m.style.transition='none';setRect(m,r);inners[i].style.transition='none';inners[i].style.transform=`scale(${scaleFor(r.width)})`;
  m.offsetWidth; m.style.transition='';inners[i].style.transition='';
  m.classList.add('zoomed');zoomed=i;$('#dim').classList.add('on');$('#bar').classList.add('on');
  setRect(m,{left:T.l,top:T.t,width:T.w,height:T.h});inners[i].style.transform=`scale(${scaleFor(T.w)})`;
  document.querySelectorAll('#bar [data-go]').forEach(b=>b.classList.toggle('cur',+b.dataset.go===i));
}
function reset(m){m.classList.remove('zoomed');m.style.opacity=''}
function closeNow(){const i=zoomed;if(i<0)return;reset(mons[i]);zoomed=-1;$('#dim').classList.remove('on');$('#bar').classList.remove('on')}
function close(){
  const i=zoomed;if(i<0)return;syncPrev();const m=mons[i],r=hs[i].getBoundingClientRect();
  setRect(m,r);inners[i].style.transform=`scale(${scaleFor(r.width)})`;m.style.opacity='0';$('#dim').classList.remove('on');
  zoomed=-1;setTimeout(()=>{if(zoomed!==i){reset(m);$('#bar').classList.remove('on')}},430);
}
hs.forEach(h=>h.addEventListener('click',()=>open(+h.dataset.i)));
$('#back').onclick=close;$('#dim').onclick=close;
document.querySelectorAll('#bar [data-go]').forEach(b=>b.onclick=()=>open(+b.dataset.go));
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#docent').hidden)sluitDocent();else close()}});
addEventListener('resize',()=>{fit();if(zoomed>=0){const T=target(),m=mons[zoomed];m.style.transition='none';setRect(m,{left:T.l,top:T.t,width:T.w,height:T.h});inners[zoomed].style.transform=`scale(${scaleFor(T.w)})`;m.offsetWidth;m.style.transition=''}});

/* ---- acties van de student ---- */
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2400)}
function ververs(){renderSys();renderWeb();renderRes();syncPrev()}
document.addEventListener('click',e=>{
  const t=e.target.closest('#s1 [data-wkan],#s0 [data-kanaal],#s0 [data-pick],#s0 [data-beeld],#s0 [data-plek],#s0 [data-publish],#s2 [data-res],#s0 [data-edit],#s0 [data-intrek]');if(!t||zoomed<0)return;
  const p=curPub(st.sel);
  if(t.dataset.wkan){st.wkan=t.dataset.wkan;renderWeb()}
  else if(t.dataset.kanaal){st.kanaal=t.dataset.kanaal;st.draft=newDraft(st.sel);renderSys()}
  else if(t.dataset.pick){st.sel=t.dataset.pick;st.draft=newDraft(st.sel);renderSys()}
  else if(t.dataset.beeld!==undefined){st.draft.beeld=+t.dataset.beeld;renderSys()}
  else if(t.dataset.plek){st.draft.plek=t.dataset.plek;renderSys()}
  else if(t.dataset.res!==undefined){st.res=+t.dataset.res;renderRes()}
  else if(t.dataset.publish){
    const d=st.draft;if(!d.kop.trim()){toast(kan()==='website'?'Vul eerst een kop in':'Schrijf eerst een '+SOC[kan()].naam.toLowerCase());return}
    if(kan()!=='website'&&d.beeld<0){toast('Kies eerst een '+SOC[kan()].wil);return}
    st.pubs.unshift({kanaal:kan(),id:st.sel,slug:kan()==='website'?(p?p.slug:slug(d.kop)):null,kop:d.kop.trim(),beeld:d.beeld,uur:d.uur,plek:d.plek,seed:Math.floor(Math.random()*1e9),tPub:Date.now(),wijzigingen:[]});st.res=0;
    st.draft=newDraft(st.sel);ververs();toast('Gepubliceerd. Kijk op de website en bij de resultaten.');
  }
  else if(t.dataset.edit&&p){
    const d=st.draft,s=nu(p),uurNa=editUur(p),w={uurNa};
    if(d.kop.trim()&&d.kop.trim()!==s.kop)w.kop=d.kop.trim();
    if(d.beeld!==s.beeld)w.beeld=d.beeld;
    if(d.plek!==s.plek&&kan()==='website')w.plek=d.plek;
    if(Object.keys(w).length===1){toast('Je hebt nog niets veranderd');return}
    p.wijzigingen.push(w);st.res=st.pubs.indexOf(p);st.draft=newDraft(st.sel);ververs();toast('Doorgevoerd.'+(kan()==='website'?' Het adres is gelijk gebleven.':''));
  }
  else if(t.dataset.intrek&&p){
    if(laatsteUur(p)+1>23){toast('Intrekken kan alleen binnen de eerste 24 uur');return}
    p.wijzigingen.push({uurNa:editUur(p),intrekken:true});st.res=st.pubs.indexOf(p);st.draft=newDraft(st.sel);ververs();toast('Ingetrokken. Vanaf nu verdwijnt het van de homepage.');
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='kop'){st.draft.kop=e.target.value;$('#cnt').textContent=e.target.value.length+(kan()!=='website'?' van '+SOC[kan()].max:'')+' tekens'}
  if(e.target.id==='uur'){st.draft.uur=+e.target.value;$('#tm').textContent=hh(st.draft.uur)}
  if(e.target.id==='uurna'){const p=curPub(st.sel);st.draft.uurNa=+e.target.value;$('#tm2').textContent=hh(p.uur+st.draft.uurNa);$('#tm2sub').textContent=st.draft.uurNa+' uur na publicatie'}
});
document.addEventListener('change',e=>{if(e.target.id==='uur')renderSys()});

/* ================= Docentenmodus ================= */
const dc=$('#docent');
function openDocent(){dc.hidden=false;renderDocent()}
function sluitDocent(){dc.hidden=true;sel0();st.draft=newDraft(st.sel);ververs()}
$('#docbtn').onclick=openDocent;
function saveForm(){dc.querySelectorAll('[id^="f-"]').forEach(el=>{st.fv[el.id]=el.type==='checkbox'?el.checked:el.value})}
function restoreForm(){dc.querySelectorAll('[id^="f-"]').forEach(el=>{if(el.id in st.fv){if(el.type==='checkbox')el.checked=st.fv[el.id];else el.value=st.fv[el.id]}})}
const optS=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(l)}</option>`).join('');

function dTijd(){
  const kaart=(m,t,u)=>`<button class="mk ${klas.modus===m?'sel':''}" data-modus="${m}"><b>${t}</b><span>${u}</span></button>`;
  const dur=klas.modus==='versneld'?`24 uur nieuws is klaar in ${dec(24*60/klas.vers,klas.vers>=60?0:1)} minuten.`:klas.modus==='echt'?'24 uur nieuws duurt een echte dag. Geschikt voor een opdracht over meerdere lessen.':'Alle uitkomsten van 24 uur zijn meteen zichtbaar. Geschikt voor een korte les of een toets.';
  return `<div class="dcol"><h3>Tijdmodus voor klas ${klas.naam}</h3><div class="mks">
    ${kaart('versneld','Versneld','De klok loopt sneller dan echt. Studenten zien de cijfers tijdens de les groeien.')}
    ${kaart('echt','Echte tijd','Een uur is een uur. De cijfers groeien de hele dag door.')}
    ${kaart('direct','Direct','Na publiceren staan alle 24 uur meteen op het scherm.')}</div>
    <div class="frm" style="margin-top:14px;max-width:520px">${klas.modus==='versneld'?`<label>Snelheid van de klok<select id="dc-vers">${optS([[30,'1 minuut = 30 minuten'],[60,'1 minuut = 1 uur'],[120,'1 minuut = 2 uur'],[240,'1 minuut = 4 uur']],klas.vers)}</select></label>`:''}
    <p class="note">${dur}</p><p class="note">Een opdracht kan een eigen tijdmodus kiezen. Die gaat dan voor op deze klasinstelling.</p></div></div>
    <div class="dcol"><h3>Nu actief voor studenten</h3><div class="card2"><b>${esc(actieveOpdracht().naam)}</b><p>Doel: ${esc(DOELEN[actieveOpdracht().doel])}</p><p>Tijd: ${esc(tmLabel())}</p><p>${actieveOpdracht().artikelen.length} berichten${actieveOpdracht().max?', maximaal '+actieveOpdracht().max+' pogingen per bericht':', onbeperkt pogingen'}</p><p>Zichtbaar: ${actieveOpdracht().metrics.map(m=>METRICS.find(x=>x[0]===m)[1]).join(', ')}</p></div>
    <p class="note" style="margin-top:12px">Klascode voor de studenten: <code>${klas.code}</code>. Studenten loggen in met deze code en hun voornaam.</p></div>`;
}
function aggStud(s){let b=0,k=0,l=0,n=0;s.pubs.forEach(p=>{const v=viewOf(p);b+=v.b;k+=v.k;l+=v.lees*v.k;n++});return {n,b,k,ctr:b?k/b:0,lees:k?Math.round(l/k):0}}
function dRes(){
  const lijst=studenten().map(s=>({s,a:aggStud(s)})).sort((x,y)=>y.a.b-x.a.b);
  const T=lijst.reduce((o,r)=>({n:o.n+r.a.n,b:o.b+r.a.b,k:o.k+r.a.k,l:o.l+r.a.lees*r.a.k}),{n:0,b:0,k:0,l:0});
  const rows=lijst.map(r=>`<tr class="row ${r.s.id===st.dsel?'sel':''}" data-dstud="${r.s.id}"><td><b>${esc(r.s.naam)}</b></td><td>${r.a.n}</td><td>${fmt(r.a.b)}</td><td>${fmt(r.a.k)}</td><td>${dec(r.a.ctr*100,1)}%</td><td>${mmss(r.a.lees)}</td></tr>`).join('');
  const S=studenten().find(x=>x.id===st.dsel)||studenten()[0];
  const pi=Math.min(st.dpub,S.pubs.length-1),P=S.pubs[pi],V=P&&viewOf(P),PS=P&&nu(P);
  const prow=S.pubs.map((p,i)=>{const v=viewOf(p),s=nu(p),bt=s.beeld<0?'geen':byId[p.id].b[s.beeld][0];return `<tr class="row ${i===pi?'sel':''}" data-dpub="${i}"><td class="k">${esc(s.kop)}</td><td>${kanaalVan(p)==='website'?PLEK[s.plek]:KANALEN[kanaalVan(p)]}</td><td>${hh(p.uur)}</td><td>${bt}</td><td>${v.e}/24</td><td>${fmt(v.b)}</td><td>${fmt(v.k)}</td><td>${dec(v.ctr*100,1)}%</td><td>${s.ingetrokken?'ingetrokken':(p.wijzigingen.length?'aangepast':'')}</td></tr>`}).join('');
  return `<div class="dres"><div class="dkp">${[['Studenten',lijst.length],['Publicaties',T.n],['Bereik',fmt(T.b)],['Kliks',fmt(T.k)],['Klikpercentage',T.b?dec(T.k/T.b*100,1)+'%':'0%'],['Gem. leestijd',T.k?mmss(Math.round(T.l/T.k)):'0:00']].map(k=>`<div class="kp2"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div>
  <div class="dgrid"><div class="box2"><h3>Alle studenten</h3><table class="t2"><tr><th>Student</th><th>Pub.</th><th>Bereik</th><th>Kliks</th><th>Klik%</th><th>Leestijd</th></tr>${rows}</table></div>
  <div class="box2"><h3>${esc(S.naam)}</h3><table class="t2"><tr><th>Kop of tekst</th><th>Waar</th><th>Tijd</th><th>Beeld</th><th>Uur</th><th>Bereik</th><th>Kliks</th><th>Klik%</th><th>Status</th></tr>${prow}</table>
  ${P?`<div class="pan darkp"><h4>${esc(PS.kop.slice(0,60))}</h4>${chartHTML(V)}${whyHTML(V.c)}</div>`:''}</div></div></div>`;
}
function dOpd(){
  const lijst=st.opdrachten.map(o=>`<div class="op ${o.id===st.actief?'act':''}"><div><b>${esc(o.naam)}</b><span>${esc(DOELEN[o.doel])} · ${o.artikelen.length} berichten · ${o.modus?o.modus:'tijd van de klas'} · ${o.max?o.max+' pogingen':'onbeperkt'}</span></div><button data-actief="${o.id}" ${o.id===st.actief?'disabled':''}>${o.id===st.actief?'Actief':'Activeer'}</button></div>`).join('');
  const arts=A.filter(a=>a.door!=='student').map(a=>`<label class="ck"><input type="checkbox" id="f-a-${a.id}" checked> ${esc(a.t)} <i>${esc(a.c)}</i></label>`).join('');
  return `<div class="dcol"><h3>Opdrachten van deze klas</h3>${lijst}${rondesHTML()}<p class="note">Studenten zien alleen de actieve opdracht. Activeren zet de berichten, het doel, de tijd en de zichtbare cijfers meteen klaar op het bureau.</p></div>
  <div class="dcol"><h3>Nieuwe opdracht klaarzetten</h3><div class="frm">
   <label>Naam van de opdracht<input id="f-naam" placeholder="Bijvoorbeeld: Kop en beeld"></label>
   <label>Doel<select id="f-doel">${optS(Object.entries(DOELEN),'balans')}</select></label>
   <label>Tijdmodus<select id="f-modus">${optS([['','Zoals de klas ('+klas.modus+')'],['versneld','Versneld'],['echt','Echte tijd'],['direct','Direct']],'')}</select></label>
   <label>Pogingen per bericht<select id="f-max">${optS([[0,'Onbeperkt'],[1,'1'],[2,'2'],[3,'3']],0)}</select></label>
   ${doelFormHTML()}
   <fieldset><legend>Wat zien studenten?</legend>${METRICS.map(m=>`<label class="ck"><input type="checkbox" id="f-m-${m[0]}" checked> ${m[1]}</label>`).join('')}</fieldset>
   <fieldset><legend>Berichten in deze opdracht</legend><div class="scr">${arts}</div></fieldset>
   <label class="ck"><input type="checkbox" id="f-eigen"> Studenten mogen eigen onderwerpen toevoegen</label>
   <label class="ck"><input type="checkbox" id="f-direct" checked> Meteen actief maken</label>
   <button class="btn" data-dsave-opd="1">Opdracht klaarzetten</button></div></div>`;
}
function dBer(){
  const lijst=A.filter(a=>a.door!=='student').map(a=>`<tr><td class="k">${esc(a.t)}</td><td>${esc(a.c)}</td><td>${a.b.length}</td><td>${esc(a.door)}</td></tr>`).join('');
  const sl=(id,l,v=3)=>`<label class="sl">${l}<input type="range" id="${id}" min="1" max="5" value="${v}"></label>`;
  const rij=n=>`<div class="br"><select id="f-bt${n}">${optS([['foto','Foto'],['video','Video']],n===2?'video':'foto')}</select><input id="f-bd${n}" placeholder="Wat zie je op dit beeld?"><select id="f-bk${n}" title="Kwaliteit">${optS([[1,'Kwaliteit 1'],[2,'2'],[3,'3'],[4,'4'],[5,'5']],4)}</select></div>`;
  return `<div class="dcol"><h3>Berichten in de database (${A.length})</h3><div class="scr2"><table class="t2"><tr><th>Titel</th><th>Categorie</th><th>Beelden</th><th>Door</th></tr>${lijst}</table></div></div>
  <div class="dcol"><h3>Bericht toevoegen</h3><div class="frm">
   <label>Titel van de verslaggever<input id="f-t" placeholder="Titel van het bericht"></label>
   <label>Eerste alinea<textarea id="f-i" rows="3" placeholder="Intro van het bericht"></textarea></label>
   <div class="two"><label>Categorie<select id="f-c">${optS(CATS.map(c=>[c,c.replace('_',' ')]),'economie')}</select></label>
   <label>Hoe snel veroudert het?<select id="f-tg">${optS([[12,'Binnen een halve dag'],[24,'Binnen een dag'],[48,'Binnen twee dagen'],[96,'Binnen vier dagen'],[168,'Pas na een week']],48)}</select></label></div>
   <fieldset><legend>Nieuwswaarde (1 laag, 5 hoog)</legend><div class="sls">${sl('f-nw-impact','Impact')}${sl('f-nw-nabijheid','Nabijheid')}${sl('f-nw-conflict','Conflict',2)}${sl('f-nw-human','Menselijk verhaal',2)}${sl('f-nw-actualiteit','Actualiteit')}</div></fieldset>
   <fieldset><legend>Interesse per doelgroep</legend><div class="sls">${sl('f-ij-jongeren','Jongeren')}${sl('f-ij-volwassenen','Volwassenen')}${sl('f-ij-midden','Middengroep')}${sl('f-ij-senioren','Senioren')}${sl('f-sp','Sensatiepotentieel',2)}</div></fieldset>
   <fieldset><legend>Beelden uit de bibliotheek (kies 1 tot 3)</legend>${bibPicker(PICK.D,'D')}</fieldset>
   <button class="btn" data-dsave-art="1">Bericht toevoegen</button></div></div>`;
}
dc.addEventListener('click',function(e){const t=e.target.closest('[data-bib],[data-bibdel]');if(!t)return;saveForm();
  if(t.dataset.bib)bibToggle('D',t.dataset.bib.split(':')[1]);else PICK.D.splice(+t.dataset.bibdel.split(':')[1],1);renderDocent()});
dc.addEventListener('change',function(e){const t=e.target.closest('[data-bibtype]');if(t)PICK.D[+t.dataset.bibtype.split(':')[1]].type=t.value});
function renderDocent(){
  if(!st.docOk){dc.innerHTML=`<div class="gate"><div class="gbox"><h2>Docentenmodus</h2><p>Vul de docentcode in om de klas te besturen.</p><input id="dg-code" type="password" placeholder="Docentcode" autofocus><button class="btn" data-dgate="1">Open</button><p class="note">In dit prototype is de code <code>docent</code>. In de echte versie hoort elke klas een eigen code te hebben.</p></div><button class="x" data-dclose="1">Sluiten</button></div>`;return}
  const tabs=[['tijd','Tijd en klas'],['res','Resultaten'],['rap','Rapporten'],['opd','Opdrachten'],['ber','Berichten']];
  const body=({tijd:dTijd,res:dRes,rap:dRap,opd:dOpd,ber:dBer})[st.dtab]();
  dc.innerHTML=`<div class="dc"><div class="dch"><b>Docentenbesturing</b><span>Klas ${klas.naam} · ${esc(tmLabel())}</span><nav>${tabs.map(t=>`<button class="${st.dtab===t[0]?'on':''}" data-dtab="${t[0]}">${t[1]}</button>`).join('')}</nav><button class="x" data-dclose="1">Terug naar bureau</button></div><div class="dcb t-${st.dtab}">${body}</div></div>`;
  restoreForm();
}
dc.addEventListener('click',e=>{
  const t=e.target.closest('[data-dtab],[data-dclose],[data-modus],[data-dstud],[data-dpub],[data-actief],[data-dsave-opd],[data-dsave-art],[data-dgate]');if(!t)return;
  const D=t.dataset;
  if(D.dclose)sluitDocent();
  else if(D.dgate){if($('#dg-code').value.trim().toLowerCase()==='docent'){st.docOk=true;renderDocent()}else toast('Deze code klopt niet')}
  else if(D.dtab){saveForm();st.dtab=D.dtab;renderDocent()}
  else if(D.modus){klas.modus=D.modus;renderDocent();ververs();toast('Tijdmodus aangepast voor de hele klas')}
  else if(D.dstud){st.dsel=D.dstud;st.dpub=0;renderDocent()}
  else if(D.dpub!==undefined){st.dpub=+D.dpub;renderDocent()}
  else if(D.actief){st.actief=D.actief;sel0();renderDocent();toast('Opdracht staat klaar op de bureaus van de studenten')}
  else if(D['dsaveOpd'])saveOpdracht();
  else if(D['dsaveArt'])saveArtikel();
});
dc.addEventListener('input',saveForm);
dc.addEventListener('change',e=>{saveForm();if(e.target.id==='dc-vers'){klas.vers=+e.target.value;renderDocent();ververs()}});
dc.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='dg-code')dc.querySelector('[data-dgate]').click()});
const val=id=>{const el=dc.querySelector('#'+id);return el?(el.type==='checkbox'?el.checked:el.value):''};
function saveOpdracht(){
  const naam=String(val('f-naam')).trim(),arts=A.filter(a=>val('f-a-'+a.id)).map(a=>a.id),metrics=METRICS.filter(m=>val('f-m-'+m[0])).map(m=>m[0]);
  if(!naam){toast('Geef de opdracht een naam');return}
  if(!arts.length){toast('Kies minstens één bericht');return}
  if(!metrics.length){toast('Kies minstens één cijfer dat studenten zien');return}
  const o={id:'o'+(st.opdrachten.length+1+Math.floor(Math.random()*1000)),naam,doel:val('f-doel'),artikelen:arts,modus:val('f-modus'),max:+val('f-max'),metrics,begeleiding:val('f-bg')||'veel',eigen:!!val('f-eigen'),doelen:formDoelen(),kanalen:formKanalen()};
  st.opdrachten.push(o);if(val('f-direct')){st.actief=o.id;sel0();st.draft=newDraft(st.sel)}
  ['f-naam'].forEach(k=>delete st.fv[k]);renderDocent();ververs();toast(val('f-direct')?'Opdracht staat klaar en is actief':'Opdracht opgeslagen')
}
function saveArtikel(){
  const t=String(val('f-t')).trim(),i=String(val('f-i')).trim();
  if(!t||!i){toast('Vul een titel en een eerste alinea in');return}
  if(!PICK.D.length){toast('Kies minstens één beeld uit de bibliotheek');return}
  const n=A.filter(a=>a.door==='docent').length+1,id='d'+String(n).padStart(2,'0');
  const beelden=PICK.D.map((p,k)=>Object.assign({id:id+'-'+(p.type==='video'?'v':'f')+(k+1),type:p.type,beschrijving:BIB[p.bron].l,kwaliteit:BIB[p.bron].q,bron:p.bron,mensen:!!BIB[p.bron].m},p.type==='video'?{duur_sec:30}:{}));
  const g=x=>+val(x),d={id,categorie:val('f-c'),titel_origineel:t,intro_origineel:i,tekst:i,nieuwswaarde:{impact:g('f-nw-impact'),nabijheid:g('f-nw-nabijheid'),conflict:g('f-nw-conflict'),human_interest:g('f-nw-human'),actualiteit:g('f-nw-actualiteit')},emotie:'neutraal',tijdgevoeligheid_uren:g('f-tg'),interesse:{jongeren:g('f-ij-jongeren'),volwassenen:g('f-ij-volwassenen'),midden:g('f-ij-midden'),senioren:g('f-ij-senioren')},sensatie_potentieel:g('f-sp'),beelden,toegevoegd_door:'docent'};
  const a={id,c:d.categorie.replace('_',' '),t,i,b:beelden.map(b=>[b.type,b.beschrijving,b.bron,!!b.mensen]),d,door:'docent'};
  A.push(a);byId[id]=a;
  ['f-t','f-i'].forEach(k=>delete st.fv[k]);PICK.D=[];
  st.opdrachten[0].artikelen.push(id);
  renderDocent();ververs();toast('Bericht toegevoegd aan de database en aan de vrije oefening')
}

/*RAPPORT_HERE*/
/* klok: resultaten verversen terwijl de tijd loopt */
setInterval(()=>{if(tm().modus==='direct'&&klas.modus==='direct')return;renderWeb();resTick();syncPrev();if(!dc.hidden&&st.docOk&&st.dtab==='res')renderDocent()},5000);
['renderSys','renderWeb','renderRes'].forEach(n=>{const f=window[n];window[n]=function(){f();syncPrev()}});
renderAll();fit();
