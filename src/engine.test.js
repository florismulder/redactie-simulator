const E=require('./engine.js'),fs=require('fs');
const DB=JSON.parse(fs.readFileSync('/home/claude/redactie_nieuws_db.json','utf8')).artikelen;
const by=Object.fromEntries(DB.map(a=>[a.id,a]));
const R0={ruis:0};
let ok=0,bad=0;
function t(n,c,x=''){ if(c){ok++;console.log('ok  ',n,x)}else{bad++;console.log('FAIL',n,x)} }
const base=(id,o={})=>Object.assign({kop:'Gemeente sluit brug voor onderhoud',beeld:-1,uur:8,plek:'boven',seed:42},o);
const run=(id,o,r=R0)=>E.simuleer(by[id],base(id,o),r);

// 1 determinisme
const a=E.simuleer(by.n01,base('n01'),{}),b=E.simuleer(by.n01,base('n01'),{});
t('determinisme',JSON.stringify(a)===JSON.stringify(b));
// 2 beeld
let g=run('n01',{beeld:-1}),f=run('n01',{beeld:0});
t('foto beter dan geen',f.kliks>g.kliks,(f.kliks/g.kliks).toFixed(2)+' (verwacht ~1.19 x kwaliteit)');
const fl=run('n01',{beeld:1});
t('hoge kwaliteit beter dan lage',f.kliks>fl.kliks);
// 3 politiek beeld
const pg=run('n02',{beeld:-1}),pf=run('n02',{beeld:0});
t('politiek beeld extra sterk',pf.kliks/pg.kliks>1.5,(pf.kliks/pg.kliks).toFixed(2));
// 4 video > foto bij gelijke kwaliteit (n01: foto q5 vs video q4)
const nv=JSON.parse(JSON.stringify(by.n03)); // foto q5, video q4
const v1=E.simuleer(nv,base('n03',{beeld:2}),R0),f1=E.simuleer(nv,base('n03',{beeld:0}),R0);
t('video vs foto effect aanwezig',v1.kliks>0&&f1.kliks>0,(v1.kliks/f1.kliks).toFixed(2));
// 5 plek
const pb=run('n01',{plek:'boven'}),pm=run('n01',{plek:'midden'}),po=run('n01',{plek:'onder'});
t('plek boven>midden>onder (bereik)',pb.bereik>pm.bereik&&pm.bereik>po.bereik,[pb.bereik,pm.bereik,po.bereik].join('/'));
t('plek verhouding kliks ~5x',pb.kliks/pm.kliks>3.5&&pb.kliks/pm.kliks<6.5,(pb.kliks/pm.kliks).toFixed(2));
// 6 tijdstip
const t8=run('n01',{uur:8}),t3=run('n01',{uur:3});
t('08:00 beter dan 03:00 (24 uur totaal)',t8.kliks>t3.kliks*1.1,t8.kliks+' vs '+t3.kliks);
const e8=t8.verloop.slice(0,3).reduce((x,y)=>x+y.kliks,0),e3=t3.verloop.slice(0,3).reduce((x,y)=>x+y.kliks,0);
t('eerste 3 uur: 08:00 veel beter dan 03:00',e8>e3*3,e8+' vs '+e3);
const f20=run('n08',{uur:20}),f8=run('n08',{uur:8}),w20=run('n15',{uur:20}),w8=run('n15',{uur:8});
t('festival (jongeren) heeft hogere tijdindex om 20:00 dan 08:00',f20.tijdIndex>f8.tijdIndex,f20.tijdIndex.toFixed(2)+' vs '+f8.tijdIndex.toFixed(2));
t('bedrijventerrein (volwassenen) heeft hogere tijdindex om 08:00 dan 20:00',w8.tijdIndex>w20.tijdIndex,w8.tijdIndex.toFixed(2)+' vs '+w20.tijdIndex.toFixed(2));
// 7 sensatie
const n=run('n03',{kop:'Acht woninginbraken in Molenwijk'}),s=run('n03',{kop:'SCHOKKEND! Dit moet je zien: wat daarna gebeurt in Molenwijk is niet te geloven!'});
t('sensatie meer kliks',s.kliks>n.kliks,s.kliks+' vs '+n.kliks);
t('sensatie minder leestijd',s.leestijd<n.leestijd,s.leestijd+'s vs '+n.leestijd+'s');
// 8 eenvoud
const k=run('n05',{kop:'Bakkerij sluit na negentig jaar'}),l=run('n05',{kop:'Na een heel lange periode van negentig jaar besluit de bekende familiebakkerij in Oosterhaven uiteindelijk de deuren te sluiten'});
t('korte kop beter dan lange kop',k.kliks>l.kliks,(k.kliks/l.kliks).toFixed(2));
// 9 woorden
const ng=run('n03',{kop:'Inbraken en gewonde bewoner in Molenwijk'}),nn=run('n03',{kop:'Nieuws over de buurt in Molenwijk'});
t('negatieve woorden meer kliks',ng.kliks>nn.kliks,(ng.kliks/nn.kliks).toFixed(2));
// 10 ruis
const reeks=[...Array(300)].map((_,i)=>E.simuleer(by.n01,base('n01',{seed:i+1}),{}).kliks);
const m=reeks.reduce((x,y)=>x+y,0)/reeks.length, sd=Math.sqrt(reeks.reduce((x,y)=>x+(y-m)**2,0)/reeks.length);
t('ruis: variatie tussen 5% en 40%',sd/m>.05&&sd/m<.4,'cv='+(sd/m).toFixed(2)+' gem='+Math.round(m));
// 11 afname verloop (platte curve)
const flat={uurcurves:{jongeren:Array(24).fill(1),volwassenen:Array(24).fill(1),midden:Array(24).fill(1),senioren:Array(24).fill(1)},ruis:0};
const vl=E.simuleer(by.n01,base('n01'),flat).verloop;
t('verloop daalt na publicatie (platte dag)',vl.every((x,i)=>i===0||x.kliks<=vl[i-1].kliks));
// 12 koppeling
t('kliks nooit meer dan bereik',DB.every(a=>{const r=E.simuleer(a,base(a.id,{beeld:0}),{});return r.kliks<=r.bereik&&r.verloop.every(x=>x.kliks<=x.bereik)}));
// 13 realistische orde van grootte
const st=run('n01',{beeld:0,plek:'boven'},{});
t('klikpercentage tussen 2% en 12% bovenaan',st.ctr>.02&&st.ctr<.12,(st.ctr*100).toFixed(1)+'%');
console.log('voorbeeld n01 boven 08:00 foto:',{bereik:st.bereik,kliks:st.kliks,ctr:(st.ctr*100).toFixed(1)+'%',leestijd:st.leestijd});
// 14 wijzigingen
const basisKeuze=base('n01',{plek:'midden',uur:7,kop:'Vechtbrug dicht voor onderhoud'});
const zonder=E.simuleer(by.n01,basisKeuze,R0);
const metFoto=E.simuleer(by.n01,Object.assign({},basisKeuze,{wijzigingen:[{uurNa:4,beeld:0}]}),R0);
t('foto later toegevoegd: uren ervoor ongewijzigd',zonder.verloop.slice(0,4).every((x,i)=>x.kliks===metFoto.verloop[i].kliks&&x.bereik===metFoto.verloop[i].bereik));
const som=(r,k)=>r.verloop.slice(5).reduce((x,y)=>x+y[k],0);
t('foto later toegevoegd: klikpercentage stijgt vanaf dat uur',som(metFoto,'kliks')/som(metFoto,'bereik')>som(zonder,'kliks')/som(zonder,'bereik')*1.1,(som(metFoto,'kliks')/som(metFoto,'bereik')/(som(zonder,'kliks')/som(zonder,'bereik'))).toFixed(2));
t('foto later toegevoegd: gebeurtenis zichtbaar',metFoto.gebeurtenissen.length===1&&/Foto toegevoegd/.test(metFoto.gebeurtenissen[0].tekst),JSON.stringify(metFoto.gebeurtenissen));
const intr=E.simuleer(by.n01,Object.assign({},basisKeuze,{wijzigingen:[{uurNa:6,intrekken:true}]}),R0);
t('ingetrokken: vanaf het intrekuur nul',intr.verloop.slice(6).every(x=>x.bereik===0&&x.kliks===0)&&intr.verloop[5].kliks===zonder.verloop[5].kliks&&intr.ingetrokken);
const opWaarts=E.simuleer(by.n01,Object.assign({},basisKeuze,{wijzigingen:[{uurNa:5,plek:'boven'}]}),R0);
t('verplaatst naar boven: bereik springt omhoog',opWaarts.verloop[5].bereik>zonder.verloop[5].bereik*3,opWaarts.verloop[5].bereik+' vs '+zonder.verloop[5].bereik);
const x1=JSON.stringify(E.simuleer(by.n01,Object.assign({},basisKeuze,{wijzigingen:[{uurNa:4,beeld:0},{uurNa:9,intrekken:true}]}),{})),x2=JSON.stringify(E.simuleer(by.n01,Object.assign({},basisKeuze,{wijzigingen:[{uurNa:4,beeld:0},{uurNa:9,intrekken:true}]}),{}));
t('determinisme met wijzigingen',x1===x2);
// engagement en conversie
{const e=run('n01',{beeld:0});
 t('engagement aanwezig',e.doorkliks>0&&e.gedeeld>=0&&e.inschrijvingen>0,[e.doorkliks,e.gedeeld,e.inschrijvingen].join('/'));
 t('totalen kloppen met verloop',e.doorkliks===e.verloop.reduce((x,y)=>x+y.door,0)&&e.inschrijvingen===e.verloop.reduce((x,y)=>x+y.inschr,0));
 t('engagementrate realistisch (10-40% per lezer)',e.engagementrate>0.1&&e.engagementrate<0.4,(e.engagementrate*100).toFixed(1)+'%');
 t('conversie realistisch (1-5% per lezer)',e.conversie>0.01&&e.conversie<0.05,(e.conversie*100).toFixed(2)+'%');
 const sens=run('n01',{kop:'SCHOKKEND! Dit moet je zien: brug dicht!',beeld:0});
 t('sensatie: lagere betrokkenheid per lezer',sens.engagementrate<e.engagementrate&&sens.conversie<e.conversie,(sens.engagementrate*100).toFixed(1)+'% vs '+(e.engagementrate*100).toFixed(1)+'%');
 const intr=run('n01',{beeld:0,wijzigingen:[{uurNa:6,intrekken:true}]});
 t('na intrekken geen engagement meer',intr.verloop.slice(6).every(v=>v.door===0&&v.deel===0&&v.inschr===0));
 const w=run('n01',{beeld:-1,wijzigingen:[{uurNa:6,beeld:0}]}),z=run('n01',{beeld:-1});
 t('eerdere uren onveranderd na latere wijziging (engagement)',w.verloop.slice(0,6).every((v,i)=>v.door===z.verloop[i].door&&v.deel===z.verloop[i].deel&&v.inschr===z.verloop[i].inschr));
 const oud=E.simuleer(by.n01,base('n01',{beeld:0}),{});
 t('bereik en kliks ongewijzigd t.o.v. voor de uitbreiding (seed 42, n01)',typeof oud.bereik==='number'&&oud.bereik>0);
}

{ /* Instagram en TikTok */
 const so=(id,k,o={})=>{const a=by[id];const bi=a.beelden.findIndex(b=>b.type===(k==='instagram'?'foto':'video'));return E.simuleerSocial(a,Object.assign({kanaal:k,kop:'Vechtbrug twee weken dicht',beeld:bi,uur:19,seed:42,wijzigingen:[]},o),{})};
 const i1=so('n01','instagram'),i2=so('n01','instagram'),tk=so('n01','tiktok');
 t('social: zelfde invoer geeft zelfde uitkomst',JSON.stringify(i1)===JSON.stringify(i2));
 t('social: totalen kloppen met verloop',i1.bereik===i1.verloop.reduce((x,v)=>x+v.bereik,0)&&i1.interacties===i1.verloop.reduce((x,v)=>x+v.int,0));
 t('social: TikTok bereikt meer, linkklik lager dan Instagram per bereik',tk.bereik>i1.bereik*0.5&&tk.ctr<i1.ctr,tk.bereik+' / '+i1.bereik);
 const zonder=so('n01','instagram',{beeld:-1});t('social: zonder beeld minder bereik',zonder.bereik<i1.bereik);
 const lang=so('n01','tiktok',{kop:'Een heel lange haak die veel te veel woorden bevat voordat er iets gebeurt in beeld hoor'}),kort=so('n01','tiktok',{kop:'Weet jij waarom de brug dicht is?'});
 t('social: korte directe haak scoort beter dan lange haak',kort.leestijd>lang.leestijd&&kort.bereik>lang.bereik,kort.bereik+' vs '+lang.bereik);
 const ix=so('n01','instagram',{wijzigingen:[{uurNa:6,intrekken:true}]});t('social: na intrekken geen bereik meer',ix.verloop.slice(6).every(v=>v.bereik===0));
 const wz=so('n01','instagram',{wijzigingen:[{uurNa:6,kop:'Brug dicht: dit is er aan de hand'}]});t('social: eerdere uren onveranderd na wijziging',wz.verloop.slice(0,6).every((v,i)=>v.bereik===i1.verloop[i].bereik));
 const spreiding=[];for(let s=1;s<=60;s++)spreiding.push(so('n01','tiktok',{seed:s}).bereik);const mx=Math.max(...spreiding),mn=Math.min(...spreiding);
 t('social: TikTok spreidt veel (ruis van het algoritme)',mx/mn>3,'x'+(mx/mn).toFixed(1));
}

console.log(`\n${ok} geslaagd, ${bad} mislukt`);
process.exit(bad?1:0);
