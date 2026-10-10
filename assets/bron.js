// WhiskyJacco – gegevens live uit de Google Sheet "WhiskyJacco-bron".
//
// Plak hieronder per tabblad de link uit Google Sheets:
//   Bestand › Delen › Publiceren op internet › kies het tabblad › "Door komma's gescheiden waarden (.csv)" › Publiceren
// Zolang een link leeg is, of Google niet bereikbaar is, toont de site de momentopname uit data.js.
window.WJ_BRON = {
  whiskys:     "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDElC_VXvOPq9Vn_ehFNUW25nifhuOU8rjClbu55OQMwTYdfP72J7u74FVa5p0j9f_Zm2AQ_B73TQ9/pub?gid=1575759990&single=true&output=csv",
  collectie:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDElC_VXvOPq9Vn_ehFNUW25nifhuOU8rjClbu55OQMwTYdfP72J7u74FVa5p0j9f_Zm2AQ_B73TQ9/pub?gid=877508006&single=true&output=csv",
  proeverijen: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDElC_VXvOPq9Vn_ehFNUW25nifhuOU8rjClbu55OQMwTYdfP72J7u74FVa5p0j9f_Zm2AQ_B73TQ9/pub?gid=296156202&single=true&output=csv"
};

(function () {
  // CSV-tekst omzetten naar rijen (houdt rekening met aanhalingstekens en komma's in namen)
  function leesCsv(tekst) {
    const rijen = []; let rij = [], veld = "", tussen = false;
    tekst = tekst.replace(/^﻿/, "");
    for (let i = 0; i < tekst.length; i++) {
      const c = tekst[i];
      if (tussen) {
        if (c === '"') { if (tekst[i + 1] === '"') { veld += '"'; i++; } else tussen = false; }
        else veld += c;
      } else if (c === '"') tussen = true;
      else if (c === ",") { rij.push(veld); veld = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && tekst[i + 1] === "\n") i++;
        rij.push(veld); rijen.push(rij); rij = []; veld = "";
      } else veld += c;
    }
    if (veld !== "" || rij.length) { rij.push(veld); rijen.push(rij); }
    return rijen;
  }

  const sleutel = s => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Rijen met een kopregel omzetten naar objecten; kolommen worden op naam gezocht, niet op positie
  function metKoppen(rijen, kolommen) {
    const kop = (rijen[0] || []).map(sleutel);
    const plek = {};
    for (const [naam, aliassen] of Object.entries(kolommen)) {
      plek[naam] = kop.findIndex(k => aliassen.includes(k));
    }
    return rijen.slice(1)
      .filter(r => r.some(v => String(v).trim() !== ""))
      .map(r => Object.fromEntries(Object.keys(kolommen).map(n => [n, plek[n] < 0 ? "" : String(r[plek[n]] ?? "").trim()])));
  }

  // "40,0", "40.0", "1.234,5" → getal; leeg → null
  function getal(s) {
    s = String(s ?? "").trim().replace(/%$/, "").trim();
    if (!s) return null;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    const n = Number(s);
    return isNaN(n) ? null : n;
  }
  // "1-3-2026", "01/03/2026" of "2026-03-01" → "2026-03-01"
  function datum(s) {
    s = String(s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return null;
  }
  // Oplage is altijd een heel aantal flessen: "1.488", "1,488", "1 488" en "1488" → 1488; leeg of geen getal → null
  function aantal(s) {
    const d = String(s ?? "").replace(/[.,\s]/g, "");
    return /^\d+$/.test(d) ? Number(d) : null;
  }
  // Vintage is een distillatiejaar van vier cijfers ("2016"); leeg of iets anders → null
  function jaartal(s) {
    const d = String(s ?? "").trim();
    return /^(1[89]|20)\d\d$/.test(d) ? Number(d) : null;
  }
  const ja = s => /^(ja|j|yes|y|x|true|waar|1)$/i.test(String(s || "").trim());
  // Whiskybase: nummer of volledige link → nummer als tekst
  function wbNummer(s) {
    s = String(s || "").trim();
    const m = s.match(/whisky\/(\d+)/);
    if (m) return m[1];
    const d = s.replace(/[.\s]/g, "");
    return /^\d+$/.test(d) ? d : "";
  }

  // Drie CSV-teksten → hetzelfde formaat als data.js
  function naarData(csv) {
    const whiskys = metKoppen(leesCsv(csv.whiskys), {
      nr: ["nr", "nummer"], naam: ["naam"], soort: ["soort"], land: ["land"], abv: ["abv"],
      leeftijd: ["leeftijd"], top: ["top", "top 15"], sr: ["diageo", "special release", "sr"], wb: ["whiskybase", "wb"],
      oplage: ["oplage"], vintage: ["vintage"]
    }).filter(r => r.naam && getal(r.nr) != null).map(r => {
      const l = getal(r.leeftijd), sr = getal(r.sr), op = aantal(r.oplage), vj = jaartal(r.vintage);
      return [getal(r.nr), r.naam, r.soort, r.land, getal(r.abv), l ? Math.round(l) : null, ja(r.top), sr ? Math.round(sr) : null, wbNummer(r.wb),
        op || null, vj];
    });

    const collectie = metKoppen(leesCsv(csv.collectie), {
      naam: ["naam"], status: ["status"], aantal: ["aantal"], land: ["land"], soort: ["soort"], abv: ["abv"],
      type: ["type", "fles sample", "fles of sample", "vorm"], aankoop: ["aankoop"], geopend: ["geopend"],
      vintage: ["vintage"], sr: ["diageo", "special release", "sr"]
    }).filter(r => r.naam).map(r => [r.naam, r.status, Math.round(getal(r.aantal) ?? 1), r.land, r.soort, getal(r.abv),
      /sample/i.test(r.type) ? "Sample" : "Fles", getal(r.aankoop) ?? null, getal(r.geopend) ?? null,
      jaartal(r.vintage), jaartal(r.sr)]);

    const proeverijen = metKoppen(leesCsv(csv.proeverijen), {
      datum: ["datum"], plaats: ["plaats"], presentator: ["presentator"], organisatie: ["organisatie"],
      volgorde: ["volgorde"], naam: ["whisky", "naam"], vintage: ["vintage"], sr: ["diageo", "special release", "sr"]
    }).filter(r => r.naam && datum(r.datum)).map(r => [datum(r.datum), r.plaats, r.presentator, r.organisatie, Math.round(getal(r.volgorde) ?? 0), r.naam,
      jaartal(r.vintage), jaartal(r.sr)]);

    if (!whiskys.length) throw new Error("Geen whisky's gevonden in de sheet");
    return { bijgewerkt: null, live: true, whiskys, collectie, proeverijen };
  }

  // Ophalen met een tijdslimiet; bij een probleem terugvallen op data.js
  function haal(url, ms) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms);
    return fetch(url, { signal: ctl ? ctl.signal : undefined })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .finally(() => clearTimeout(t));
  }

  // Tussenopslag in de browser van de bezoeker, zodat niet elke pagina opnieuw op Google hoeft te wachten.
  // Binnen VERS_MS worden de opgeslagen gegevens gewoon gebruikt. Daarna toont de pagina meteen de
  // opgeslagen versie en haalt op de achtergrond de nieuwe op, voor de volgende pagina.
  const OPSLAG = "wj-gegevens-v6"; // v6: Collectie en Proeverijen hebben Vintage en Diageo (v5: Vintage in Whisky's, v4: Oplage, v3: Aankoop en Geopend, v2: Type)
  const VERS_MS = 5 * 60 * 1000;
  function leesOpslag() {
    try { const o = JSON.parse(localStorage.getItem(OPSLAG)); return o && o.data && o.data.whiskys ? o : null; }
    catch (e) { return null; }
  }
  function schrijfOpslag(data) {
    try { localStorage.setItem(OPSLAG, JSON.stringify({ tijd: Date.now(), data })); } catch (e) { /* geen opslag: geen probleem */ }
  }

  function haalLive(B) {
    return Promise.all([haal(B.whiskys, 8000), haal(B.collectie, 8000), haal(B.proeverijen, 8000)])
      .then(([w, c, p]) => { const d = naarData({ whiskys: w, collectie: c, proeverijen: p }); schrijfOpslag(d); return d; });
  }

  function laad() {
    const B = window.WJ_BRON || {};
    const reserve = () => window.WJ_DATA;
    if (!B.whiskys || !B.collectie || !B.proeverijen || typeof fetch !== "function") return Promise.resolve(reserve());

    const opgeslagen = leesOpslag();
    if (opgeslagen) {
      if (Date.now() - opgeslagen.tijd > VERS_MS) {
        haalLive(B).catch(fout => console.warn("WhiskyJacco: verversen op de achtergrond mislukt.", fout));
      }
      return Promise.resolve(opgeslagen.data);
    }
    return haalLive(B)
      .catch(fout => { console.warn("WhiskyJacco: live gegevens niet geladen, momentopname getoond.", fout); return reserve(); });
  }

  window.WJ_BRON_HULP = { leesCsv, naarData, laad };
})();
