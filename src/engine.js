/* Rekenmotor redactiesimulator v1
   Bepaalt bereik, kliks, klikpercentage, leestijd en verloop per uur voor één publicatie.
   Zuivere functie: zelfde bericht + keuzes + seed + regels geeft altijd hetzelfde resultaat.
   Alle getallen komen uit de regels (tabel rsim_settings, sleutel 'rekenregels'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const DEFAULTS = {
    versie: 1,
    eenvoud: { kort_duidelijk: 1.10, lang_vaag: 0.90, kort_max_woorden: 10, lang_min_woorden: 18 },
    woorden: {
      negatief_per_woord: 0.023, positief_per_woord: -0.010, max_woorden: 5,
      negatief: ['dood', 'overleden', 'gewond', 'ramp', 'crisis', 'schandaal', 'brand', 'ongeluk', 'aanrijding', 'inbra', 'dreigt', 'bedreig', 'angst', 'paniek', 'woede', 'boos', 'verbod', 'sluit', 'dicht', 'tekort', 'vertraging', 'gevaar', 'storm', 'alg', 'explosie', 'faillissement', 'ontslag', 'zorgen', 'verdwenen', 'mislukt'],
      positief: ['blij', 'feest', 'succes', 'geslaagd', 'winnaar', 'wint', 'gered', 'mooi', 'fantastisch', 'gelukkig', 'opening', 'groei', 'record', 'beste', 'liefde', 'terug', 'nieuw']
    },
    sensatie: {
      kliks_max: 1.25, leestijd_min: 0.6,
      clickbait: ['schokkend', 'je gelooft', 'niet te geloven', 'wat daarna', 'dit moet je', 'verbijsterend', 'ongelooflijk', 'drama', 'bizar', 'dít', 'alles over', 'onthuld']
    },
    beeld: { met_beeld: 1.19, per_categorie: { politiek: 1.75 }, video_boven_foto_website: 1.10, kwaliteit_effect: 0.05 },
    plek: { boven: 1.0, midden: 0.2, onder: 0.1, zicht_basis: 0.35, halfwaarde_uur: { boven: 8, midden: 6, onder: 5 } },
    ctr_basis: 0.03,
    ruis: 0.30,
    leestijd: { deel_onder_15_sec: 0.55, onder_15_gem_sec: 8, betrokken_basis_sec: 70 },
    publiek: { dagbezoekers: 12000, aandeel: { jongeren: 0.20, volwassenen: 0.30, midden: 0.28, senioren: 0.22 } },
    uurcurves: {
      jongeren: [0.25, 0.1, 0.05, 0.03, 0.02, 0.03, 0.12, 0.3, 0.35, 0.3, 0.3, 0.4, 0.55, 0.55, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 0.8, 0.5],
      volwassenen: [0.1, 0.04, 0.02, 0.02, 0.03, 0.12, 0.4, 0.85, 1.0, 0.8, 0.65, 0.7, 0.85, 0.8, 0.6, 0.6, 0.7, 0.8, 0.8, 0.75, 0.8, 0.7, 0.4, 0.2],
      midden: [0.06, 0.03, 0.02, 0.02, 0.04, 0.2, 0.65, 1.0, 0.95, 0.7, 0.6, 0.65, 0.85, 0.8, 0.55, 0.5, 0.6, 0.7, 0.65, 0.6, 0.6, 0.5, 0.25, 0.1],
      senioren: [0.04, 0.02, 0.02, 0.02, 0.05, 0.25, 0.7, 1.0, 0.95, 0.8, 0.7, 0.7, 0.85, 0.75, 0.55, 0.45, 0.45, 0.5, 0.45, 0.4, 0.35, 0.25, 0.12, 0.06]
    },
    horizon_uren: 24
  };
  const GROEPEN = ['jongeren', 'volwassenen', 'midden', 'senioren'];

  function merge(a, b) {
    if (b === undefined || b === null) return a;
    if (Array.isArray(a) || typeof a !== 'object' || a === null) return b;
    const o = Object.assign({}, a);
    for (const k of Object.keys(b)) o[k] = k in a ? merge(a[k], b[k]) : b[k];
    return o;
  }

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const woordenVan = s => (String(s).toLowerCase().match(/[a-zà-ÿ0-9']+/g) || []);
  const pct = f => (f >= 1 ? '+' : '−') + Math.abs(Math.round((f - 1) * 100)) + '%';

  /* ---- analyse van de kop ---- */
  function kopAnalyse(kop, R) {
    const w = woordenVan(kop), n = w.length;
    const E = R.eenvoud;
    let eenvoud;
    if (n <= E.kort_max_woorden) eenvoud = E.kort_duidelijk;
    else if (n >= E.lang_min_woorden) eenvoud = E.lang_vaag;
    else {
      const t = (n - E.kort_max_woorden) / (E.lang_min_woorden - E.kort_max_woorden);
      eenvoud = E.kort_duidelijk + t * (E.lang_vaag - E.kort_duidelijk);
    }
    const tel = lijst => w.filter(x => lijst.some(stam => x.startsWith(stam))).length;
    const neg = Math.min(tel(R.woorden.negatief), R.woorden.max_woorden);
    const pos = Math.min(tel(R.woorden.positief), R.woorden.max_woorden);
    const woorden = 1 + neg * R.woorden.negatief_per_woord + pos * R.woorden.positief_per_woord;
    const k = String(kop), kl = k.toLowerCase();
    const uitroep = Math.min((k.match(/!/g) || []).length, 2) / 2;
    const bait = Math.min(R.sensatie.clickbait.filter(c => kl.includes(c)).length, 2) / 2;
    const letters = k.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const hoofd = letters.length > 4 ? (k.replace(/[^A-ZÀ-Ý]/g, '').length / letters.length) : 0;
    const caps = clamp((hoofd - 0.25) / 0.5, 0, 1);
    const sensatie = clamp(0.4 * uitroep + 0.45 * bait + 0.15 * caps, 0, 1);
    return { aantalWoorden: n, eenvoud, negatief: neg, positief: pos, woorden, sensatie };
  }

  /* ---- beeldfactor ---- */
  function beeldAnalyse(artikel, beeldIdx, R) {
    const b = (beeldIdx !== undefined && beeldIdx !== null && beeldIdx >= 0) ? artikel.beelden[beeldIdx] : null;
    if (!b) return { factor: 1, type: 'geen', kwaliteit: null };
    const basis = (R.beeld.per_categorie && R.beeld.per_categorie[artikel.categorie]) || R.beeld.met_beeld;
    const video = b.type === 'video' ? R.beeld.video_boven_foto_website : 1;
    const kw = 1 + R.beeld.kwaliteit_effect * (clamp(b.kwaliteit || 3, 1, 5) - 3);
    return { factor: basis * video * kw, type: b.type, kwaliteit: b.kwaliteit, basis, video, kw, categorieEffect: basis !== R.beeld.met_beeld };
  }

  /* ---- de toestand van een publicatie op één moment ---- */
  function staatVan(artikel, st, R) {
    const kop = kopAnalyse(st.kop, R);
    const bld = beeldAnalyse(artikel, st.beeld, R);
    const nw = artikel.nieuwswaarde;
    const nwGem = (nw.impact + nw.nabijheid + nw.conflict + nw.human_interest + nw.actualiteit) / 5;
    const potentieel = artikel.sensatie_potentieel / 5;
    const L = R.leestijd;
    const afhaak = clamp(L.deel_onder_15_sec + 0.3 * kop.sensatie * (1 - potentieel) + 0.1 * kop.sensatie, 0.3, 0.92);
    const betrokken = L.betrokken_basis_sec * (0.85 + 0.06 * nw.human_interest) * (bld.type === 'video' ? 1.15 : 1);
    const ref = L.deel_onder_15_sec * L.onder_15_gem_sec + (1 - L.deel_onder_15_sec) * betrokken;
    const leestijd = Math.max(afhaak * L.onder_15_gem_sec + (1 - afhaak) * betrokken, ref * R.sensatie.leestijd_min);
    return {
      kop, bld, afhaak, leestijd, nwF: 0.7 + 0.15 * nwGem,
      sensKliks: 1 + (R.sensatie.kliks_max - 1) * kop.sensatie * potentieel,
      plekNaam: st.plek, plekF: R.plek[st.plek], halfPos: R.plek.halfwaarde_uur[st.plek]
    };
  }

  /* wijzigingen: [{uurNa, kop?, beeld?, plek?, intrekken?}] met uurNa = uren sinds publicatie */
  function beschrijfWijziging(w, artikel, vorig) {
    const d = [];
    if (w.intrekken) return 'Publicatie ingetrokken';
    if (w.beeld !== undefined && w.beeld !== vorig.beeld) {
      const b = w.beeld >= 0 ? artikel.beelden[w.beeld] : null;
      d.push(!b ? 'Beeld verwijderd' : (vorig.beeld >= 0 ? 'Beeld gewisseld' : (b.type === 'video' ? 'Video toegevoegd' : 'Foto toegevoegd')));
    }
    if (w.kop !== undefined && w.kop !== vorig.kop) d.push('Kop aangepast');
    if (w.plek !== undefined && w.plek !== vorig.plek) d.push('Verplaatst naar ' + ({ boven: 'bovenaan', midden: 'het midden', onder: 'onderaan' })[w.plek]);
    return d.join(', ');
  }

  /* ---- de simulatie ---- */
  function simuleer(artikel, keuze, regels, opts) {
    const R = merge(DEFAULTS, regels || {});
    const H = (opts && opts.uren !== undefined) ? opts.uren : R.horizon_uren;
    const uur = keuze.uur;
    const wijz = (keuze.wijzigingen || []).slice().sort((x, y) => x.uurNa - y.uurNa);
    const halfNieuws = Math.max(artikel.tijdgevoeligheid_uren, 1);

    const rnd = mulberry32(keuze.seed || 1);
    const globaal = clamp(Math.exp(R.ruis * 0.5 * gauss(rnd)), 0.6, 1.6);

    const somCurve = {};
    GROEPEN.forEach(g => { somCurve[g] = R.uurcurves[g].reduce((x, y) => x + y, 0); });
    const perGroep = {};
    GROEPEN.forEach(g => { perGroep[g] = { bereik: 0, kliks: 0 }; });

    let st = { kop: keuze.kop, beeld: keuze.beeld === undefined ? -1 : keuze.beeld, plek: keuze.plek };
    let S = staatVan(artikel, st, R), resetT = 0, ingetrokkenOp = null;
    const gebeurtenissen = [], verloop = [];
    let totBereik = 0, totKliks = 0, leesSom = 0, afhaakSom = 0;

    for (let t = 0; t < H; t++) {
      const klok = (uur + t) % 24;
      let gebeurtenis = null;
      while (wijz.length && wijz[0].uurNa <= t) {
        const w = wijz.shift();
        const tekst = beschrijfWijziging(w, artikel, st);
        if (w.intrekken) { ingetrokkenOp = t; }
        else {
          const nieuw = { kop: w.kop !== undefined ? w.kop : st.kop, beeld: w.beeld !== undefined ? w.beeld : st.beeld, plek: w.plek !== undefined ? w.plek : st.plek };
          if (nieuw.plek !== st.plek) resetT = t;
          st = nieuw; S = staatVan(artikel, st, R);
        }
        if (tekst) { gebeurtenis = gebeurtenis ? gebeurtenis + ' en ' + tekst.toLowerCase() : tekst; gebeurtenissen.push({ uurNa: t, uur: klok, tekst }); }
      }
      const uurRuis = clamp(Math.exp(R.ruis * 0.3 * gauss(rnd)), 0.7, 1.4);   // altijd trekken, zodat eerdere uren niet veranderen
      let b = 0, k = 0;
      if (ingetrokkenOp === null) {
        const dec = Math.pow(0.5, (t - resetT) / S.halfPos) * Math.pow(0.5, t / halfNieuws);
        GROEPEN.forEach(g => {
          const bezoekers = R.publiek.dagbezoekers * R.publiek.aandeel[g] * R.uurcurves[g][klok] / somCurve[g];
          const gezien = bezoekers * R.plek.zicht_basis * S.plekF * dec;
          const interesseF = artikel.interesse[g] / 3;
          const ctr = R.ctr_basis * interesseF * S.nwF * S.bld.factor * S.kop.eenvoud * S.kop.woorden * S.sensKliks;
          const bg = gezien * globaal * uurRuis;
          perGroep[g].bereik += bg; perGroep[g].kliks += bg * ctr;
          b += bg; k += bg * ctr;
        });
      }
      const br = Math.round(b), kr = Math.min(Math.round(k), br);
      verloop.push({ uur: klok, uurNa: t, bereik: br, kliks: kr, lees: Math.round(S.leestijd), gebeurtenis, actief: ingetrokkenOp === null });
      totBereik += br; totKliks += kr; leesSom += kr * S.leestijd; afhaakSom += kr * S.afhaak;
    }
    GROEPEN.forEach(g => {
      const p = perGroep[g];
      p.bereik = Math.round(p.bereik); p.kliks = Math.round(p.kliks);
      p.ctr = p.bereik ? p.kliks / p.bereik : 0;
    });
    const leestijd = Math.round(totKliks ? leesSom / totKliks : S.leestijd);
    const afhaak = totKliks ? afhaakSom / totKliks : S.afhaak;

    /* tijdstip: hoe actief is het publiek op het moment van plaatsen, gemiddeld over de dag = 1 */
    let actief = 0, gemiddeld = 0;
    GROEPEN.forEach(g => {
      const a = R.publiek.aandeel[g] * artikel.interesse[g];
      actief += a * (R.uurcurves[g][uur] / somCurve[g]) * 24;
      gemiddeld += a;
    });
    const tijdIndex = actief / gemiddeld;

    const uitleg = [], P = S.plekNaam, K = S.kop, B = S.bld;
    uitleg.push({ sleutel: 'plek', label: 'Plek op de homepage', factor: S.plekF, tekst: ({ boven: 'Bovenaan', midden: 'Midden', onder: 'Onderaan' })[P] + ': ' + (S.plekF >= 1 ? 'iedereen ziet dit bericht het eerst' : 'veel bezoekers scrollen er niet naartoe (' + Math.round(S.plekF * 100) + '% van de zichtbaarheid bovenaan)') });
    uitleg.push({ sleutel: 'tijd', label: 'Tijdstip van plaatsen', factor: tijdIndex, tekst: String(uur).padStart(2, '0') + ':00: jouw publiek is nu ' + (tijdIndex >= 1.3 ? 'zeer actief' : tijdIndex >= 0.8 ? 'redelijk actief' : 'weinig actief') + ' (index ' + tijdIndex.toFixed(2).replace('.', ',') + ')' });
    uitleg.push({ sleutel: 'beeld', label: 'Beeld', factor: B.factor, tekst: B.type === 'geen' ? 'Geen beeld: de vergelijking is 1,0' : (B.type === 'video' ? 'Video' : 'Foto') + (B.categorieEffect ? ' (bij deze categorie telt beeld extra mee)' : '') + ': ' + pct(B.factor) + ' kliks' });
    uitleg.push({ sleutel: 'eenvoud', label: 'Eenvoud van de kop', factor: K.eenvoud, tekst: K.aantalWoorden + ' woorden: ' + (K.eenvoud > 1.02 ? 'kort en duidelijk' : K.eenvoud < 0.98 ? 'lang en vaag' : 'gemiddeld') + ' (' + pct(K.eenvoud) + ')' });
    uitleg.push({ sleutel: 'woorden', label: 'Woorden in de kop', factor: K.woorden, tekst: K.negatief + ' negatief, ' + K.positief + ' positief: ' + pct(K.woorden) + ' kliks' });
    uitleg.push({ sleutel: 'sensatie', label: 'Sensatie in de kop', factor: S.sensKliks, tekst: K.sensatie < 0.05 ? 'Nuchtere kop' : 'Sensationele kop: kliks ' + pct(S.sensKliks) + ', maar meer lezers haken binnen 15 seconden af' });
    uitleg.push({ sleutel: 'nieuwswaarde', label: 'Nieuwswaarde van het bericht', factor: S.nwF, tekst: 'Dichtbij en belangrijk nieuws scoort beter (' + pct(S.nwF) + ')' });

    return {
      bereik: totBereik, kliks: totKliks, ctr: totBereik ? totKliks / totBereik : 0,
      leestijd, afhaakdeel: afhaak, verloop, perGroep, uitleg, tijdIndex, gebeurtenissen,
      ingetrokken: ingetrokkenOp !== null, ingetrokkenUurNa: ingetrokkenOp
    };
  }

  return { simuleer, kopAnalyse, DEFAULTS, GROEPEN };
});
