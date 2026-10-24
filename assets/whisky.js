// WhiskyJacco · detailpagina van één whisky (whisky.html#237). Sinds 24 oktober 2026.
// Gekozen in WJ testvoorbeeld (opzet G "Kort"): het label met pijlen naar vorige/volgende, Over deze whisky, In het kort
// (openingszin + hoogtepunten die nergens anders op de pagina staan), Sterkte en Leeftijd (kolommen zoals op Home en
// balken tegen de gemiddelden) en het merk. Alles live berekend uit de gegevens (wj.js); het merk uit de kolom Merk.
// Welke whisky: het nummer achter # in het adres; zonder (geldig) nummer de laatst geproefde.
(function () {
  const MEERWOORD = ["Johnnie Walker", "Jack Daniel's", "Glen Scotia", "Glen Deveron", "Glen Garioch", "Glen Keith", "Glen Talloch", "Glen Turner",
    "Big Peat", "Isle Of Skye", "Rock Island", "Four Roses", "Buffalo Trace", "Maker's Mark", "Woodford Reserve", "Jim Beam", "Chivas Regal",
    "Monkey Shoulder", "Old Pulteney", "Ben Nevis", "Ben Bracken", "Canadian Club", "Famous Grouse", "Lone Hawthorn", "Bad Na H-Achlaise",
    "Cù Bòcan", "Milk & Honey", "Great Glen", "Mac Spey", "Black Ram", "Three Ships", "Highland Park", "Port Askaig", "Elements Of Islay",
    "Loch Lomond", "Pig's Nose", "Timorous Beastie", "Canny Beat", "Old St. Andrews", "Three Scottish Brothers", "Meikle Tòir", "Frysk Hynder",
    "Gouden Carolus", "Blair Athol", "Kingston Reserve", "Amrita Mumbay", "Glasgow 1770", "Maison Lacroix", "Singleton Of Dufftown", "Temple Bar",
    "Eagle Rare", "Heart Cut"];
  const zonderThe = n => n.replace(/^the\s+/i, "");
  function merkDelen(naam) {
    const the = /^the\s+/i.test(naam), z = zonderThe(naam);
    const m = MEERWOORD.find(x => z.toLowerCase() === x.toLowerCase() || z.toLowerCase().startsWith(x.toLowerCase() + " ")) || z.split(" ")[0];
    return { merk: (the ? naam.slice(0, naam.length - z.length) : "") + z.slice(0, m.length), rest: z.slice(m.length).trim() };
  }
  const SCHAAL = ["#F7E7A6", "#EFCB6B", "#E2A83D", "#C9821F", "#A85E1A", "#7E3E14", "#4E2410"];
  function kleurOp(t) {
    t = Math.max(0, Math.min(1, t)) * (SCHAAL.length - 1);
    const i = Math.min(Math.floor(t), SCHAAL.length - 2), f = t - i;
    const a = SCHAAL[i].match(/\w\w/g).map(h => parseInt(h, 16)), b = SCHAAL[i + 1].match(/\w\w/g).map(h => parseInt(h, 16));
    return "rgb(" + a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",") + ")";
  }
  const KLEUR_RANG = ["#7E3E14", "#C9821F", "#EFCB6B", "#A85E1A", "#E2A83D", "#4E2410", "#F7E7A6"];   // zoals Schotland op Home
  const KLEUR_LAND = ["#7E3E14", "#C9821F", "#EFCB6B", "#A85E1A", "#4E2410", "#E2A83D", "#F7E7A6"];   // zoals Land op Home

  const getal = v => (Math.round(v * 10) / 10).toLocaleString("nl-NL");
  const pctTekst = (n, tot) => (n > 0 && n / tot < .005 ? "<1" : Math.round(n / tot * 100)) + "%";
  const e = n => n + "e";
  const wk = n => n + (n === 1 ? " whisky" : " whisky's");

  // ---------- Gegevens en berekeningen ----------
  function maak(WJ) {
    const { whiskys } = WJ;
    const N = whiskys.length;
    // Merk uit de kolom Merk van de sheet (sinds 24 oktober 2026); alleen als die leeg is uit de naam (MEERWOORD of eerste woord)
    whiskys.forEach(w => { w.merkUitSheet = !!w.merk; if (!w.merk) w.merk = merkDelen(w.toon).merk; w.merkSleutel = zonderThe(w.merk).toLowerCase(); });
    const perNr = new Map(whiskys.map(w => [w.nr, w]));
    const opNr = [...whiskys].sort((a, b) => a.nr - b.nr);
    const schots = whiskys.filter(w => w.land === "Schotland");
    const tel = (lijst, f) => { const m = new Map(); lijst.forEach(x => { const k = f(x); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl")); };
    const regios = tel(schots, w => w.regio).map(([naam, n], i) => ({ naam, n, kleur: KLEUR_RANG[i % KLEUR_RANG.length] }));
    const landen = tel(whiskys, w => w.land).map(([naam, n], i) => ({ naam, n, kleur: KLEUR_LAND[i % KLEUR_LAND.length] }));
    const soorten = tel(whiskys, w => w.soort);
    const merken = tel(whiskys, w => w.merkSleutel);
    const merkNaam = new Map(whiskys.map(w => [w.merkSleutel, w.merk]));
    const gemAbv = l => l.length ? l.reduce((s, x) => s + x.abv, 0) / l.length : null;
    const metL = l => l.filter(x => x.leeftijd);
    const gemL = l => { const m = metL(l); return m.length ? m.reduce((s, x) => s + x.leeftijd, 0) / m.length : null; };
    const proeverijenVan = w => WJ.proeverijen.filter(p => p.items.some(i => i.whisky === w));
    const collectieVan = w => WJ.collectie.filter(c => c.whisky === w);
    const statusGroep = c => { const s = String(c.status || "").trim().toLowerCase();
      return /nog niet geproefd|ongeproefd|^nieuw$/.test(s) ? "nieuw" : s === "ongeopend" || s === "dicht" ? "dicht" : s === "geopend" || s === "open" ? "open" : ""; };

    function info(w) {
      const abvs = whiskys.filter(x => x.abv > 0);
      const zwakker = abvs.filter(x => x.abv < w.abv).length;
      const sterker = abvs.filter(x => x.abv > w.abv).length;
      const evenSterk = abvs.filter(x => x !== w && x.abv === w.abv);
      const ml = metL(whiskys);
      const L = w.leeftijd ? {
        jonger: ml.filter(x => x.leeftijd < w.leeftijd).length, ouder: ml.filter(x => x.leeftijd > w.leeftijd).length,
        even: ml.filter(x => x !== w && x.leeftijd === w.leeftijd), n: ml.length } : null;
      const merk = whiskys.filter(x => x.merkSleutel === w.merkSleutel).sort((a, b) => a.nr - b.nr);
      const land = whiskys.filter(x => x.land === w.land);
      const regio = w.regio && w.land === "Schotland" ? schots.filter(x => x.regio === w.regio) : null;
      const soort = whiskys.filter(x => x.soort === w.soort);
      const i = opNr.indexOf(w);
      // Lijkt op: zelfde soort, land, regio, merk tellen zwaar; daarna sterkte en leeftijd
      const afstand = x => (x.soort !== w.soort) * 3 + (x.land !== w.land) * 4 + (w.regio && x.regio !== w.regio) * 2
        + Math.abs(x.abv - w.abv) / 2 + (w.leeftijd && x.leeftijd ? Math.abs(x.leeftijd - w.leeftijd) / 3 : (!!w.leeftijd !== !!x.leeftijd) * 1.5)
        - (x.merkSleutel === w.merkSleutel) * 1;
      const lijktOp = whiskys.filter(x => x !== w).map(x => ({ x, d: afstand(x) })).sort((a, b) => a.d - b.d || b.x.nr - a.x.nr).slice(0, 5).map(a => a.x);
      return {
        w, N, sterkerDan: Math.round(zwakker / (abvs.length - 1) * 100), plaatsAbv: sterker + 1, evenSterk, L,
        merk, land, regio, soort, proeverijen: proeverijenVan(w), collectie: collectieVan(w),
        vorige: opNr[i - 1] || null, volgende: opNr[i + 1] || null, naDeze: N - 1 - i, lijktOp,
        gem: { alles: gemAbv(whiskys), merk: gemAbv(merk), land: gemAbv(land), regio: regio && gemAbv(regio), soort: gemAbv(soort) },
        gemL: { alles: gemL(whiskys), merk: gemL(merk), land: gemL(land), regio: regio && gemL(regio), soort: gemL(soort) }
      };
    }
    return { WJ, N, perNr, opNr, schots, regios, landen, soorten, merken, merkNaam, info, statusGroep, gemAbv };
  }

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const link = w => `whisky.html#${w.nr}`;


  // Pijlen links en rechts van het hert in het label, naar de vorige en volgende whisky op nummer.
  // Bij #1 en de laatste blijft die plek leeg.
  function pijl(x, kant) {
    const svg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${kant === "vorige" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg>`;
    return x ? `<a class="pijl ${kant}" href="${link(x)}" aria-label="${kant === "vorige" ? "Vorige" : "Volgende"}: #${x.nr} ${esc(x.toon)}" title="#${x.nr} ${esc(x.toon)}">${svg}</a>`
      : `<span class="pijl ${kant} leeg" aria-hidden="true"></span>`;
  }
  // Het label zoals op Top (zelfde rand, verloop, hert en regels Merk / Merk 2 / Merk 3), maar met pijlen naast het hert
  // en zonder de regels onder het kleurlijntje.
  function etiket(w, D) {
    let regels;
    if (w.merkUitSheet) regels = [["merk", w.merk], ["lft", w.merk2], ["rest", w.merk3]].filter(([, r]) => r);
    else {   // geen Merk in de sheet (nieuwe whisky): merk uit de naam, leeftijd, rest
      const d = merkDelen(w.toon);
      let rest = d.rest; regels = [["merk", d.merk]];
      const lft = rest.match(/^(\d+\s+Years?)\b\s*/i);
      if (lft) { regels.push(["lft", lft[1]]); rest = rest.slice(lft[0].length).trim(); }
      if (rest) regels.push(["rest", rest]);
    }
    const I = D.info(w);
    return `<div class="etiket"><svg class="vorm" aria-hidden="true"></svg><div class="rand">
      <span class="boven">${pijl(I.vorige, "vorige")}<span class="hert" aria-hidden="true"></span>${pijl(I.volgende, "volgende")}</span>
      <span class="nm">${regels.map(([k, r]) => `<span class="${k}">${esc(r)}</span>`).join("")}</span>
      <span class="lijn" aria-hidden="true"></span></div></div>`;
  }
  const HOEK = 14;
  function vorm(W, H, d) {
    const R = HOEK + d, k = Math.sqrt(R * R - d * d), A = (x, y) => ` A${R} ${R} 0 0 0 ${x} ${y}`;
    return `M${k} ${d} L${W - k} ${d}${A(W - d, k)} L${W - d} ${H - k}${A(W - k, H - d)} L${k} ${H - d}${A(d, H - k)} L${d} ${k}${A(k, d)} Z`;
  }
  function tekenEtiketten() {
    document.querySelectorAll(".etiket").forEach(el => {
      const W = el.offsetWidth, H = el.offsetHeight; if (!W || !H) return;
      const id = "v" + Math.random().toString(36).slice(2, 8);
      el.querySelector("svg.vorm").innerHTML = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
        <stop offset="0" stop-color="#FFF3DC"/><stop offset=".55" stop-color="#FBE2B4"/><stop offset="1" stop-color="#F4CC8A"/></linearGradient></defs>
        <path d="${vorm(W, H, 0)}" fill="url(#${id})"/><path d="${vorm(W, H, 3)}" fill="none" stroke="#A85E1A" stroke-width="1.6"/>
        <path d="${vorm(W, H, 9)}" fill="none" stroke="#A85E1A" stroke-width="1"/>`;
      el.classList.add("getekend");
    });
  }

  // Kaart van Schotland; alleen = deze regio in kleur, de rest licht

  // F: thuis kort, zonder status: "1 fles" of "1 fles, 2 mini's"
  function thuisKort(c) {
    const tel = { Fles: 0, Sample: 0, Mini: 0 };
    c.forEach(x => { tel[x.type] = (tel[x.type] || 0) + (x.aantal || 1); });
    const woord = { Fles: ["fles", "flessen"], Sample: ["sample", "samples"], Mini: ["mini", "mini's"] };
    return Object.keys(tel).filter(t => tel[t]).map(t => `${tel[t]} ${(woord[t] || [t.toLowerCase(), t.toLowerCase()])[tel[t] > 1 ? 1 : 0]}`).join(", ");
  }
  // Over deze whisky: naam en waarde
  function dossier(D, w) {
    const I = D.info(w), WJ = D.WJ;
    const p = I.proeverijen[0], c = I.collectie;
    const feiten = [
      ["Merk", esc(w.merk)],
      ["Soort", esc(w.soort)],
      ["Land", esc(w.land)],
      // Schotse whisky zonder regio: een blend of blended malt komt uit meerdere regio's, anders onbekend
      w.land === "Schotland" ? ["Regio", w.regio ? esc(w.regio) : `<span class="klein">${/^blend/i.test(w.soort) ? "meerdere regio's" : "onbekend"}</span>`] : null,
      ["Sterkte", abv1(w.abv)],
      ["Leeftijd", w.leeftijd ? `${w.leeftijd} jaar` : `<span class="klein">zonder leeftijd</span>`],
      w.vintage ? ["Gedistilleerd", w.vintage] : null,
      w.oplage ? ["Oplage", `${WJ.duizend(w.oplage)} flessen`] : null,
      w.sr ? ["Diageo", `Special Release ${w.sr}`] : null,
      ["Geproefd", `#${w.nr}`],
      p ? ["Proeverij", `<a href="proeverijen.html#${p.id}">${WJ.datumLang(p.datum)}</a>`] : null,
      c.length ? ["Thuis", thuisKort(c)] : null,
      w.wb ? ["Whiskybase", `<a href="${w.wb}" target="_blank" rel="noopener" aria-label="Bekijk ${esc(w.naam)} op Whiskybase">WB</a>`] : null,
      w.tags.length ? ["Labels", `<span class="labels">${w.tags.map(t => WJ.tagHtml(w, t)).join("")}</span>`] : null
    ].filter(Boolean);
    return { feiten, p };
  }


  // Balken tegen de gemiddelden van merk, regio, land, soort en alles (uit D; ook gebruikt door F)
  // Balken tegen het gemiddelde van merk, regio, land, soort en alle whisky's; het aantal klein en grijs achter de naam
  function vergelijkBalken(D, w, wat) {
    const I = D.info(w);
    const rij = (label, v, deze, max, min, eenheid) => v == null ? "" : `<li${deze ? ' class="deze"' : ""}><span class="v-naam">${label}</span><span class="v-baan"><span style="width:${((v - min) / (max - min) * 100).toFixed(1)}%"></span></span><b>${eenheid === "%" ? abv1(v) : getal(v) + eenheid}</b></li>`;
    const naam = (t, n) => `${t}<span class="klein">${n}</span>`;
    const rg = esc(w.regio || "");
    if (wat === "abv") {
      const r = [["Deze whisky", w.abv, true], [naam(esc(w.merk), I.merk.length), I.merk.length > 1 ? I.gem.merk : null],
        I.regio ? [naam(rg, I.regio.length), I.gem.regio] : null, [naam(esc(w.land), I.land.length), I.gem.land],
        [naam(esc(w.soort), I.soort.length), I.gem.soort], [naam("Alle whisky's", D.N), I.gem.alles]].filter(Boolean);
      return `<ul class="vergelijk gelijk">${r.map(([l, v, d]) => rij(l, v, d, Math.max(62, ...r.map(x => x[1] || 0)), 35, "%")).join("")}</ul>`;
    }
    const mL = a => a.filter(x => x.leeftijd).length;
    const r = [["Deze whisky", w.leeftijd, true], [naam(esc(w.merk), mL(I.merk)), mL(I.merk) > 1 ? I.gemL.merk : null],
      I.regio ? [naam(rg, mL(I.regio)), I.gemL.regio] : null, [naam(esc(w.land), mL(I.land)), I.gemL.land], [naam(esc(w.soort), mL(I.soort)), I.gemL.soort],
      [naam("Alle whisky's", mL(D.WJ.whiskys)), I.gemL.alles]].filter(Boolean);
    return `<ul class="vergelijk gelijk">${r.map(([l, v, d]) => rij(l, v, d, Math.max(20, ...r.map(x => x[1] || 0)), 0, " j")).join("")}</ul>`;
  }


  // Kolommen zoals op Home (per heel getal, kleur uit de schaal, as met een label om de 5); deze whisky als enige kolom
  // donker, zonder woorden of pijltje. Elke kolom linkt naar Whisky's, zoals op Home.
  function homeKolommen(tel, deze, o) {
    const van = Math.min(...tel.keys()), tot = Math.max(...tel.keys()), max = Math.max(...tel.values());
    let kol = "", as = "";
    for (let x = van; x <= tot; x++) {
      const n = tel.get(x) || 0, h = n ? Math.max(2, n / max * 100) : 0;
      const balk = `<span style="height:${h}%;background:${x === deze ? "var(--ink)" : o.kleur(x, van, tot)}"></span>`;
      kol += n ? `<a class="k" href="${o.href(x)}" data-tip="${esc(o.tip(x, n))}${x === deze ? " · deze whisky" : ""}" aria-label="${esc(o.tip(x, n))}">${balk}</a>` : `<div class="k">${balk}</div>`;
      as += `<span>${o.label(x)}</span>`;
    }
    // Gestippelde lijn met "vatsterkte" bij 50%, zoals op Home (links van de kolom van 50%; 2 px tussen de kolommen)
    const n = tot - van + 1, i = o.zone ? o.zone - van : -1;
    const zone = i > 0 && i < n ? `<div class="zone" style="left:calc(${i} * (100% - ${(n - 1) * 2}px) / ${n} + ${i * 2 - 1}px)"><em>vatsterkte</em></div>` : "";
    return `<div class="grafiek"><div class="kolommen" role="img" aria-label="${esc(o.aria)}">${kol}${zone}</div><div class="as" aria-hidden="true">${as}</div></div>`;
  }


  // F · In het kort (24 oktober 2026, naar de zinnen van Jacco): verhalend, per onderwerp een alinea, getallen vet
  const SOORT_WOORD = { "Single Malt": ["single malt", "single malts"], "Blended Malt": ["blended malt", "blended malts"], "Blend": ["blend", "blends"],
    "Bourbon": ["bourbon", "bourbons"], "Single Grain": ["single grain", "single grains"], "Tennessee": ["Tennessee whiskey", "Tennessee whiskeys"],
    "Rye": ["rye whisky", "rye whisky's"], "Single Pot Still": ["single pot still", "single pot stills"] };
  const soortWoord = (s, n) => (SOORT_WOORD[s] || [s.toLowerCase(), s.toLowerCase() + "s"])[n === 1 ? 0 : 1];
  const B = x => `<b>${x}</b>`;
  // Plek in sterkte binnen een groep (1 = sterkste); bij gelijke sterkte een gedeelde plek
  const plekIn = (groep, w) => { const p = groep.filter(x => x.abv > w.abv).length + 1, ged = groep.some(x => x !== w && x.abv === w.abv);
    return ged ? `een gedeelde ${B(e(p))} plek` : `plek ${B(p)}`; };
  const opsom = l => l.length < 2 ? l.join("") : l.slice(0, -1).join(", ") + " en " + l[l.length - 1];
  // Lidwoord bij namen die het nodig hebben: "uit de Highlands", "de Verenigde Staten staan op plek 3"
  const MET_DE = new Set(["Verenigde Staten", "Highlands", "Lowlands", "Islands"]);
  const deNaam = x => (MET_DE.has(x) ? "de " : "") + esc(x);
  // Sterkte altijd met één cijfer achter de komma (40,0%), zoals op de rest van de site
  const abv1 = v => Number(v).toFixed(1).replace(".", ",") + "%";
  const herkomst = w => w.land === "Schotland" && w.regio ? `${deNaam(w.regio)} in Schotland` : deNaam(w.land);
  // Openingszin (24 oktober 2026): twee korte zinnen, weinig komma's
  const eersteZin = w => `<b>${esc(w.toon)}</b> is een ${esc(soortWoord(w.soort, 1))} uit ${herkomst(w)}. Hij is ${opsom([
    w.vintage ? `in ${w.vintage} gedistilleerd` : "", w.leeftijd ? `${w.leeftijd} jaar gerijpt` : "", `gebotteld op ${abv1(w.abv)}`].filter(Boolean))}.`;
  const aantalTop = ws => ws.filter(x => x.tags.includes("Top")).length;

  // De alinea's bovenaan Sterkte, Leeftijd en het merkblok
  function verhaalF(D, w) {
    const I = D.info(w), WJ = D.WJ, ws = WJ.whiskys, N = D.N;
    let sterkte = "", leeftijd = "", merk = "";
    const groep = ws.filter(x => x.soort === w.soort && x.land === w.land);
    const soortAlle = ws.filter(x => x.soort === w.soort);
    // Sterkte
    const k = I.evenSterk.length, zwakker = ws.filter(x => x.abv > 0 && x.abv < w.abv).length;
    if (zwakker === 0) {
      const gelijk = groep.filter(x => x.abv === w.abv).length;
      const pers = groep.length > 1 ? (gelijk === groep.length
        ? ` Alle ${B(groep.length)} ${esc(soortWoord(w.soort, 2))} uit ${deNaam(w.land)} die je proefde hebben die sterkte.`
        : ` Van de ${B(groep.length)} ${esc(soortWoord(w.soort, 2))} uit ${deNaam(w.land)} ${gelijk === 1 ? "heeft" : "hebben"} er ${B(gelijk)} die sterkte.`) : "";
      sterkte = `Met ${B(abv1(w.abv))} hoort hij bij de lichtste van alle ${B(N)} whisky's die je proefde. Dat geldt voor ${B(k + 1)} whisky's (${B(pctTekst(k + 1, N))}).${pers}`;
    } else {
      sterkte = `Met ${B(abv1(w.abv))} is hij sterker dan ${B(I.sterkerDan + "%")} van alle ${B(N)} whisky's die je proefde. Hij staat op plek ${B(I.plaatsAbv)}${k ? ` en die plek deelt hij met ${B(k)} ${k === 1 ? "andere whisky" : "andere"}` : ""}.`;
    }
    // Leeftijd
    const ml = ws.filter(x => x.leeftijd);
    const nM = I.merk.length, m = esc(w.merk);
    if (w.leeftijd) {
      const L = I.L, even = L.even.length + 1, j = B(w.leeftijd + " jaar");
      const vgl = L.jonger === 0 ? `is hij met ${j} de jongste daarvan`
        : L.ouder === 0 ? `is hij met ${j} de oudste daarvan`
        : L.ouder === 1 ? `is hij met ${j} ouder dan ${B(L.jonger)} daarvan. Er was maar één whisky ouder`
        : L.jonger === 1 ? `is hij met ${j} jonger dan ${B(L.ouder)} daarvan. Er was maar één whisky jonger`
        : `is hij met ${j} ouder dan ${B(L.jonger)} daarvan en jonger dan ${B(L.ouder)}`;
      leeftijd = `${B(ml.length)} van de ${B(N)} whisky's (${B(pctTekst(ml.length, N))}) hebben een leeftijd op het etiket. Binnen die groep ${vgl}. ${even > 1 ? `In totaal proefde je ${B(even)} whisky's van ${w.leeftijd} jaar.` : `Het is de enige whisky van ${w.leeftijd} jaar die je proefde.`}`;
    } else {
      const zinnen = [`Het is een whisky zonder leeftijd, net als ${B(N - ml.length - 1)} andere van de ${B(N)} whisky's die je proefde.`];
      if (nM > 1) {
        const mL = I.merk.filter(x => x.leeftijd).length;
        zinnen.push(mL === 0 ? (nM === 2 ? `Ook de andere whisky van ${m} is zonder leeftijd.` : `Ook de andere ${B(nM - 1)} whisky's van ${m} zijn zonder leeftijd.`)
          : `Van de ${B(nM)} whisky's van ${m} ${mL === 1 ? "heeft" : "hebben"} er ${B(mL)} wel een leeftijd.`);
      }
      const g = I.regio || I.land, gNaam = I.regio ? w.regio : w.land;
      if (g.length > 1) { const gL = g.filter(x => x.leeftijd).length;
        zinnen.push(`Uit ${deNaam(gNaam)} ${gL === 1 ? "heeft" : "hebben"} ${B(gL)} van de ${B(g.length)} whisky's een leeftijd.`); }
      leeftijd = zinnen.join(" ");
    }
    // Merk
    const i = I.merk.indexOf(w), M = D.merken.length;
    const meer = D.merken.filter(x => x[1] > nM).length + 1, andere = D.merken.filter(x => x[1] === nM).length - 1;
    if (nM > 1) {
      const nr = x => B("#" + x.nr);
      const volg = i === 0 ? `Dit is de eerste whisky van ${m} die je proefde. Daarna ${nM - 1 === 1 ? "volgde" : "volgden"} er nog ${B(nM - 1)} en de meest recente was ${nr(I.merk[nM - 1])}.`
        : i === nM - 1 ? `Dit is de ${B(e(nM))} en meest recente whisky van ${m} die je proefde. De eerste was ${nr(I.merk[0])}.`
        : `Dit is de ${B(e(i + 1))} whisky van ${m} die je proefde. De eerste was ${nr(I.merk[0])} en de meest recente ${nr(I.merk[nM - 1])}.`;
      const gelijk = I.merk.every(x => x.abv === w.abv);
      const st = gelijk ? (nM === 2 ? `Beide whisky's van ${m} zijn even sterk.` : `Alle ${B(nM)} whisky's van ${m} zijn even sterk.`)
        : `Binnen het merk staat hij op ${plekIn(I.merk, w)} van ${B(nM)} in sterkte.`;
      const rg = andere > 0
        ? `Net als ${B(andere)} ${andere === 1 ? "ander merk" : "andere merken"} proefde je van ${m} ${B(nM)} whisky's. ${meer === 1 ? "Samen zijn ze de meest geproefde merken." : `Samen staan ze gedeeld op plek ${B(meer)} van de ${B(M)} merken.`}`
        : `Met ${B(nM)} whisky's is ${m} ${meer === 1 ? "het meest geproefde merk" : `het ${B(e(meer))} meest geproefde merk`} van de ${B(M)}.`;
      merk = `${volg} ${st} ${rg}`;
    } else {
      const een = D.merken.filter(x => x[1] === 1).length;
      merk = `Dit is de enige whisky van ${m} die je proefde. Zo zijn er ${B(een)} van de ${B(M)} merken waarvan je maar één whisky proefde.`;
    }
    return { sterkte, leeftijd, merk };
  }

  // G · Kort (24 oktober 2026, tweede opzet): In het kort = openingszin plus de hoogtepunten van deze whisky, als losse
  // regels met een streepje. Alleen feiten die nergens anders op de pagina staan (geen herhaling van Sterkte, Leeftijd,
  // merkblok of Over deze whisky). Elk feit een score; hoogstens twee hoogtepunten (score ≥ 50). Is er geen enkel
  // hoogtepunt, dan één rustige zin over de soort of de regio die ook nergens anders staat.
  function kortFeiten(D, w, p) {
    const I = D.info(w), WJ = D.WJ, ws = WJ.whiskys, N = D.N, f = [];
    const opNr = D.opNr, eerste = (lijst) => w.nr !== 1 && lijst.length > 1 && [...lijst].sort((a, b) => a.nr - b.nr)[0] === w;   // bij #1 is alles 'eerste': dan alleen 'allereerste'
    // Sterkste en oudste
    if (I.plaatsAbv === 1) f.push([100, `Het is de sterkste whisky die je ooit proefde${I.evenSterk.length ? `, samen met ${B(I.evenSterk.length)} andere` : ""}.`]);
    else if (I.plaatsAbv <= 10 && !I.evenSterk.length) f.push([90 - I.plaatsAbv, `Met ${B(abv1(w.abv))} is het de ${B(e(I.plaatsAbv))} sterkste whisky die je proefde.`]);
    if (w.leeftijd && I.L) { const oud = I.L.ouder + 1;
      if (oud === 1) f.push([98, `Met ${B(w.leeftijd + " jaar")} is het de oudste whisky die je proefde.`]);
      else if (oud <= 10) f.push([88 - oud, `Met ${B(w.leeftijd + " jaar")} is het de ${B(e(oud))} oudste whisky die je proefde.`]);
      else if (I.L.jonger === 0) f.push([80, `Met ${B(w.leeftijd + " jaar")} is het de jongste whisky met een leeftijd die je proefde.`]); }
    // Mijlpalen
    if (w.nr === 1) f.push([97, `Dit was de allereerste whisky die je proefde.`]);
    else if (w.nr % 100 === 0) f.push([96, `Dit was je ${B(e(w.nr))} whisky.`]);
    if (opNr[N - 1] === w) f.push([93, `Dit is de whisky die je het laatst proefde.`]);
    if (w.tags.includes("Top")) f.push([95, `Het is een van je ${B(aantalTop(ws))} toppers.`]);
    // Herkomst: enige, eerste, zeldzaam
    if (I.land.length === 1) f.push([97, `Het is de enige whisky uit ${deNaam(w.land)} die je proefde.`]);
    else if (eerste(I.land)) f.push([w.land === "Schotland" ? 70 : 87, `Het was je eerste whisky uit ${deNaam(w.land)}.`]);
    if (I.regio && eerste(I.regio)) f.push([82, `Het was je eerste whisky uit ${deNaam(w.regio)}.`]);
    const soortAlle = ws.filter(x => x.soort === w.soort);
    if (soortAlle.length === 1) f.push([90, `Het is de enige ${esc(soortWoord(w.soort, 1))} die je proefde.`]);
    else if (eerste(soortAlle)) f.push([soortAlle.length > 30 ? 66 : 85, `Het was je eerste ${esc(soortWoord(w.soort, 1))}.`]);
    if (I.regio && I.regio.length <= 10) f.push([74, `Het is een van maar ${B(I.regio.length)} whisky's uit ${deNaam(w.regio)}.`]);
    if (I.regio) { const r = I.regio.filter(x => x.abv > w.abv).length + 1;
      if (r === 1 && !I.regio.some(x => x !== w && x.abv === w.abv)) f.push([86, `Het is de sterkste whisky uit ${deNaam(w.regio)} die je proefde.`]); }
    { const g = ws.filter(x => x.soort === w.soort && x.land === w.land), r = g.filter(x => x.abv > w.abv).length + 1;
      if (g.length >= 5 && r <= 3 && g.filter(x => x.abv === w.abv).length === 1) f.push([82 - r, `Van de ${B(g.length)} ${esc(soortWoord(w.soort, 2))} uit ${deNaam(w.land)} is hij de ${r === 1 ? "sterkste" : B(e(r)) + " sterkste"}.`]); }
    // Bijzondere uitgaven
    if (w.oplage) f.push([85, `Hij komt uit een beperkte oplage van ${B(WJ.duizend(w.oplage))} flessen.`]);
    if (w.sr) f.push([84, `Het is een Diageo Special Release uit ${B(w.sr)}.`]);
    // De avond
    if (p) { const it = p.items.filter(x => x.whisky), i = it.findIndex(x => x.whisky === w), avond = `de proeverij van ${WJ.datumLang(p.datum)} in ${esc(p.plaats)}`;
      const sterk = it.filter(x => x.whisky.abv > w.abv).length === 0 && it.filter(x => x.whisky.abv === w.abv).length === 1;
      const oud = w.leeftijd && it.every(x => x.whisky === w || (x.whisky.leeftijd || 0) < w.leeftijd);
      if (it.length > 2 && sterk) f.push([81, `Het was de sterkste van de ${B(p.items.length)} whisky's op ${avond}.`]);
      else if (it.length > 2 && oud) f.push([79, `Het was de oudste van de ${B(p.items.length)} whisky's op ${avond}.`]);
      else if (p.items.length > 2 && p.items[0].whisky === w) f.push([77, `Hij opende ${avond}.`]);
      else if (p.items.length > 2 && p.items[p.items.length - 1].whisky === w) f.push([77, `Hij sloot ${avond} af.`]);
      else f.push([55, `Je proefde hem tijdens ${avond}.`]); }
    // Even sterk als de whisky die je net daarvoor of daarna proefde (niet bij een heel gewone sterkte)
    if (I.evenSterk.length <= 20) { const i = opNr.indexOf(w), buur = [opNr[i - 1], opNr[i + 1]].find(x => x && x.abv === w.abv);
      if (buur) f.push([62, `Hij is precies even sterk als ${esc(buur.toon)}, die je ${buur.nr < w.nr ? "vlak daarvoor" : "vlak daarna"} proefde.`]); }
    // Thuis: wat de fles bijzonder maakt in je collectie
    if (I.collectie.length) { const C = WJ.collectie, sterkte = c => c.whisky ? c.whisky.abv : c.abv;
      const flessen = C.filter(c => c.type === "Fles"), mijn = I.collectie.filter(c => c.type === "Fles");
      const plekC = c => c.regio || c.land;
      if (mijn.length && flessen.every(c => mijn.includes(c) || sterkte(c) < w.abv)) f.push([78, `Het is de sterkste fles in je collectie.`]);
      else { const naam = w.regio || w.land, zelfde = C.filter(c => plekC(c) === naam);
        if (zelfde.every(c => I.collectie.includes(c))) f.push([76, `Het is de enige whisky uit ${deNaam(naam)} in je collectie.`]); } }
    const hoog = f.filter(x => x[0] >= 50).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1]);
    if (hoog.length) return hoog;
    // Geen hoogtepunt: één zin die nergens anders staat. Eerst de regio, dan de plek in sterkte binnen de soort uit dit
    // land (niet bij de lichtste whisky's: dat staat al bij Sterkte), anders de plek van het land.
    if (I.regio) { const r = D.regios.findIndex(x => x.naam === w.regio) + 1;
      return [`${MET_DE.has(w.regio) ? "De " + esc(w.regio) + " zijn" : esc(w.regio) + " is"} met ${B(pctTekst(I.regio.length, D.schots.length))} van je Schotse whisky's ${r === 1 ? "de grootste regio" : `de ${B(e(r))} regio van Schotland`}.`]; }
    const g = ws.filter(x => x.soort === w.soort && x.land === w.land), lichtst = !ws.some(x => x.abv > 0 && x.abv < w.abv);
    if (g.length > 1 && !lichtst) return [`Van de ${B(g.length)} ${esc(soortWoord(w.soort, 2))} uit ${deNaam(w.land)} staat hij op ${plekIn(g, w)} in sterkte.`];
    if (w.land !== "Schotland" && I.land.length > 1) { const r = D.landen.filter(x => x.n > I.land.length).length + 1;
      return [`${MET_DE.has(w.land) ? "De " + esc(w.land) + " staan" : esc(w.land) + " staat"} met ${B(I.land.length)} whisky's op plek ${B(r)} van de ${B(D.landen.length)} landen die je proefde.`]; }
    return [];
  }

  // Alle whisky's van het merk, zoals Recent op Home (nieuwste boven); de whisky van deze pagina zonder link
  function recentLijst(D, ws, deze) {
    const WJ = D.WJ;
    return `<ul class="nieuw">${ws.map(x => `<li>
      <span class="nm">${x === deze ? `<span aria-current="page">${esc(x.toon)}</span>` : `<a class="naam" href="${link(x)}">${esc(x.toon)}</a>`}<small><span>#${x.nr}</span><span>${esc(x.soort)}</span>${WJ.plekHtml(x)}<span>${esc(WJ.abvText(x.abv))}</span>${x.wb ? `<i class="stip" aria-hidden="true"> · </i><a class="wb" href="${x.wb}" target="_blank" rel="noopener" aria-label="Bekijk ${esc(x.naam)} op Whiskybase"><span>WB</span></a>` : ""}</small>${x.tags.map(t => WJ.tagHtml(x, t)).join("")}</span>
    </li>`).join("")}</ul>`;
  }
  function pagina(D, w) {
    const I = D.info(w), WJ = D.WJ, ws = WJ.whiskys;
    const { feiten, p } = dossier(D, w);
    const V = verhaalF(D, w);
    const telAbv = new Map(); ws.filter(x => x.abv > 0).forEach(x => { const g = Math.floor(x.abv + 1e-9); telAbv.set(g, (telAbv.get(g) || 0) + 1); });
    const telL = new Map(); ws.filter(x => x.leeftijd).forEach(x => telL.set(x.leeftijd, (telL.get(x.leeftijd) || 0) + 1));
    const abvKol = homeKolommen(telAbv, Math.floor(w.abv + 1e-9), { aria: `Aantal whisky's per procent; ${getal(w.abv)}% donker`,
      kleur: (x, van, tot) => kleurOp(tot > van ? (x - van) / (tot - van) : .5), tip: (x, n) => `${x}% tot ${x + 1}%: ${wk(n)}`,
      label: x => x % 5 === 0 ? x + "%" : "", href: x => `whiskys.html#abv-${x}`, zone: 50 });
    const lKol = homeKolommen(telL, w.leeftijd || null, { aria: `Aantal whisky's per leeftijd${w.leeftijd ? "; " + w.leeftijd + " jaar donker" : ""}`,
      kleur: (x, van, tot) => kleurOp(tot > van ? (x - van) / (tot - van) * .85 + .12 : .5), tip: (x, n) => `${x} jaar: ${wk(n)}`,
      label: x => x % 5 === 0 ? x + " j" : "", href: x => `whiskys.html#leeftijd-${x}` });
    const hoog = kortFeiten(D, w, p);
    return `<div class="blok bovenaan">${etiket(w, D)}</div>
      <section class="blok"><h2><span class="k">Over deze whisky</span></h2><dl class="feiten">${feiten.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></section>
      <section class="blok"><h2><span class="k">In het kort</span></h2><p class="tekst">${eersteZin(w)}</p>${hoog.length ? `<ul class="hoogte">${hoog.map(z => `<li>${z}</li>`).join("")}</ul>` : ""}</section>
      <section class="blok"><h2><span class="k">Sterkte</span></h2><p class="tekst">${V.sterkte}</p>${abvKol}
        <p class="tussen klein">Gemiddeld per groep</p>${vergelijkBalken(D, w, "abv")}</section>
      <section class="blok"><h2><span class="k">Leeftijd</span></h2><p class="tekst">${V.leeftijd}</p>${lKol}
        <p class="tussen klein">Gemiddeld per groep</p>${vergelijkBalken(D, w, "leeftijd")}</section>
      <section class="blok"><h2><span class="k">${esc(w.merk)}</span></h2><p class="tekst">${V.merk}</p>${I.merk.length > 1 ? recentLijst(D, [...I.merk].sort((a, b) => b.nr - a.nr), w) : ""}</section>`;
  }

  // Schuifbare regels zoals bij Recent op Home: zachte rand aan de kant waar nog tekst staat
  const nmRand = el => { el.classList.toggle("meer-l", el.scrollLeft > 2); el.classList.toggle("meer-r", el.scrollLeft + el.clientWidth < el.scrollWidth - 2); };
  const nmRanden = () => { document.querySelectorAll(".nieuw .nm").forEach(nmRand); balkMaat(); };
  // De naamkolom zo breed als de langste naam en de waardekolom zo breed als de langste waarde, bij Sterkte en Leeftijd
  // gelijk; de balken worden zo zo lang mogelijk. De naam mag hoogstens 42% van de regel zijn (daarna afgekapt met …).
  function balkMaat() {
    const lijsten = [...document.querySelectorAll(".vergelijk.gelijk")];
    if (!lijsten.length) return;
    lijsten.forEach(l => { l.style.removeProperty("--naam"); l.style.removeProperty("--waarde"); l.classList.add("meten"); });
    const namen = lijsten.flatMap(l => [...l.querySelectorAll(".v-naam")]).map(e => e.scrollWidth);
    const waarden = lijsten.flatMap(l => [...l.querySelectorAll("b")]).map(e => e.scrollWidth);
    lijsten.forEach(l => l.classList.remove("meten"));
    const breed = lijsten[0].clientWidth;
    const naam = Math.min(Math.ceil(Math.max(...namen)) + 1, Math.floor(breed * .42)), waarde = Math.ceil(Math.max(...waarden)) + 1;
    lijsten.forEach(l => { l.style.setProperty("--naam", naam + "px"); l.style.setProperty("--waarde", waarde + "px"); });
  }
  function start() {
    window.wjKlaar.then(WJ => {
      const D = maak(WJ);
      const main = document.getElementById("detail");
      const kies = () => D.perNr.get(parseInt(location.hash.slice(1), 10)) || D.opNr[D.N - 1];
      let eerste = true;
      const teken = () => {
        const w = kies();
        document.title = `${w.toon} · WhiskyJacco`;
        main.innerHTML = pagina(D, w);
        requestAnimationFrame(tekenEtiketten);
        requestAnimationFrame(nmRanden);
        if (!eerste) window.scrollTo({ top: 0 });
        eerste = false;
      };
      teken();
      addEventListener("hashchange", teken);
      addEventListener("resize", () => { tekenEtiketten(); nmRanden(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { tekenEtiketten(); nmRanden(); });
      document.addEventListener("scroll", ev => { if (ev.target.matches && ev.target.matches(".nieuw .nm")) nmRand(ev.target); }, true);
      const tip = document.getElementById("tip");
      document.addEventListener("pointermove", ev => {
        const el = ev.target.closest && ev.target.closest("[data-tip]");
        if (!el || ev.pointerType === "touch") { tip.classList.remove("toon"); return; }
        tip.textContent = el.dataset.tip; tip.classList.add("toon");
        const b = tip.offsetWidth;
        tip.style.left = Math.min(innerWidth - b - 8, Math.max(8, ev.clientX - b / 2)) + "px";
        tip.style.top = (ev.clientY - 42) + "px";
      });
    });
  }
  window.WJD = { start };
  window.WJW = { start };
})();
