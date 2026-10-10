// Gedeelde gegevens en hulpfuncties voor alle pagina's van WhiskyJacco.
// Haalt de gegevens op (live uit de sheet via bron.js, anders de momentopname uit data.js)
// en maakt er whisky's, collectie en proeverijen van. Pagina's wachten op window.wjKlaar.
(function () {

  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("nl");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sortNaam = n => n.replace(/^the\s+/i, "");
  const vergelijk = (a, b) => sortNaam(a).localeCompare(sortNaam(b), "nl", { numeric: true, sensitivity: "base" });
  const abvText = v => v == null || isNaN(v) ? "" : Number(v).toFixed(1).replace(".", ",") + "%";
  const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  const datumLang = iso => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MAANDEN[m - 1]} ${y}`; };
  const WHISKYBASE = "https://www.whiskybase.com/nl/whiskies/whisky/";
  // Korte landnaam voor de gegevensregels (ruimte op een telefoon). De volledige naam blijft de hoofdregel: in de sheet,
  // in kopjes, op de etiketten en bij aanwijzen. Zoeken op de korte naam vindt ook de whisky ("vs" → Verenigde Staten).
  const KORT_LAND = { "Verenigde Staten": "VS" };
  const kortLand = l => KORT_LAND[l] || l;
  const landTekst = l => KORT_LAND[l] ? `<span title="${esc(l)}">${esc(KORT_LAND[l])}</span>` : `<span>${esc(l)}</span>`;
  // 1488 → "1.488", 17940 → "17.940"
  const duizend = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Koppelen op naam + jaartal. Het jaartal komt uit de kolom Vintage of Diageo, of (oude schrijfwijze) uit de naam zelf:
  // "Balmenach 9 Years (2016)" en "Talisker 8 Years · 2020". Zo werkt de site met en zonder jaartal in de naam, en blijven
  // twee whisky's met dezelfde naam (Ben Nevis 9 Years 2013 en 2015) uit elkaar.
  function koppel(naam, vintage, sr) {
    let basis = String(naam || "").trim(), jaar = vintage || sr || null;
    const m = basis.match(/^(.*?)\s*(?:\((\d{4})\)|·\s*(\d{4}))\s*$/);
    if (m) { const j = Number(m[2] || m[3]); if (!jaar || jaar === j) { basis = m[1]; jaar = j; } }
    return { basis: norm(basis), jaar, sleutel: norm(basis) + "#" + (jaar || "") };
  }

  // Getoonde naam: het jaartal van Vintage ("(2016)") en Diageo (" · 2024") valt weg als het label het al toont
  function kaal(naam, vintage, sr) {
    let n = String(naam || "");
    if (vintage) n = n.replace(new RegExp("\\s*\\(" + vintage + "\\)\\s*$"), "");
    if (sr) n = n.replace(new RegExp("\\s*·\\s*" + sr + "\\s*$"), "");
    return n;
  }
  // Labels voor een regel uit Collectie of Proeverijen die (nog) niet op Whisky's staat
  const losseTags = r => [r.vintage ? "Vintage" : "", r.sr ? "Diageo" : ""].filter(Boolean);

  function bouw(D) {
    // Whisky's. Oplage (kolom Oplage): ingevuld = label Limited met het aantal flessen erin.
    // Vintage (kolom Vintage): label Vintage met het jaartal erin ("Vintage 2016"); Diageo (kolom Diageo, vroeger Special
    // Release) idem ("Diageo 2024"). Staat dat jaartal ook nog in de naam ("(2016)" of " · 2024"), dan valt het weg in de
    // getoonde naam (w.toon). w.naam is de naam zoals in de sheet.
    const whiskys = D.whiskys.map(([nr, naam, soort, land, abv, leeftijd, top, sr, wb, oplage, vintage]) => {
      const w = {
        nr, naam, soort, land, abv: Number(abv), leeftijd: leeftijd || null, sr: sr || null, top: !!top,
        wb: /^\d+$/.test(String(wb || "").trim()) ? WHISKYBASE + String(wb).trim() : null,
        oplage: oplage > 0 ? oplage : null, vintage: vintage > 0 ? vintage : null
      };
      w.zoek = norm(`${naam} ${soort} ${land} ${KORT_LAND[land] || ""} ${w.vintage || ""} ${w.sr || ""}`);
      w.toon = kaal(naam, w.vintage, w.sr);
      w.koppel = koppel(naam, w.vintage, w.sr);
      return w;
    });
    const opNaam = new Map(whiskys.map(w => [w.naam, w]));
    const opSleutel = new Map(), perBasis = new Map();
    whiskys.forEach(w => {
      opSleutel.set(w.koppel.sleutel, w);
      if (!perBasis.has(w.koppel.basis)) perBasis.set(w.koppel.basis, []);
      perBasis.get(w.koppel.basis).push(w);
    });
    // Whisky zoeken bij een regel uit Collectie of Proeverijen: eerst naam + jaartal; anders op naam als die uniek is
    function vind(naam, vintage, sr) {
      const k = koppel(naam, vintage, sr);
      const w = opSleutel.get(k.sleutel);
      if (w) return w;
      const lijst = perBasis.get(k.basis) || [];
      return lijst.length === 1 && (!k.jaar || !lijst[0].koppel.jaar) ? lijst[0] : null;
    }

    // Proeverijen: één regel per whisky in de sheet, hier samengevoegd per datum
    const perDatum = new Map();
    D.proeverijen.forEach(([datum, plaats, presentator, organisatie, volgorde, naam, vintage, sr]) => {
      const id = "p-" + datum;
      if (!perDatum.has(id)) perDatum.set(id, { id, datum, plaats, presentator, organisatie, items: [] });
      perDatum.get(id).items.push({ volgorde, naam, vintage: vintage || null, sr: sr || null, whisky: vind(naam, vintage, sr) });
    });
    const proeverijen = [...perDatum.values()].sort((a, b) => b.datum.localeCompare(a.datum));
    proeverijen.forEach(p => p.items.sort((a, b) => a.volgorde - b.volgorde));
    const proeverijVan = new Map(); // whisky -> meest recente proeverij
    proeverijen.forEach(p => p.items.forEach(x => { if (x.whisky && !proeverijVan.has(x.whisky)) proeverijVan.set(x.whisky, p); }));

    // Type: "Fles" of "Sample" (kolom Type in de sheet; ontbreekt die, dan is het een fles)
    // Aankoop en Geopend: volgnummers (hoogste = nieuwste aanwinst / laatst geopend); leeg = null
    const collectie = D.collectie.map(([naam, status, aantal, land, soort, abv, type, aankoop, geopend, vintage, sr]) => {
      const w = vind(naam, vintage, sr);
      return {
        naam, status, aantal, type: type === "Sample" ? "Sample" : "Fles", whisky: w || null,
        land: land || (w && w.land) || "", soort: soort || (w && w.soort) || "",
        abv: abv != null ? abv : (w ? w.abv : null),
        aankoop: aankoop != null ? aankoop : null, geopend: geopend != null ? geopend : null,
        vintage: vintage || null, sr: sr || null
      };
    });
    const inCollectie = new Set(collectie.map(c => c.whisky).filter(Boolean));

    // Labels: knop op de Whisky's-pagina, label onder de whisky, en waar dat label naartoe linkt
    const LABELS = [
      { key: "top",       tag: "Top",       href: () => "top.html" },
      { key: "collectie", tag: "Collectie", href: () => "collectie.html" },
      { key: "proeverij", tag: "Proeverij", href: w => "proeverijen.html#" + (proeverijVan.get(w) || {}).id },
      { key: "limited",   tag: "Limited",   href: () => "whiskys.html#limited" },
      { key: "vintage",   tag: "Vintage",   href: () => "whiskys.html#vintage" },
      { key: "diageo",    tag: "Diageo",    href: () => "whiskys.html#diageo" }
    ];
    const LABEL_VAN_TAG = Object.fromEntries(LABELS.map(l => [l.tag, l]));

    whiskys.forEach(w => {
      w.tags = [];
      if (w.top) w.tags.push("Top");
      if (inCollectie.has(w)) w.tags.push("Collectie");
      if (proeverijVan.has(w)) w.tags.push("Proeverij");
      if (w.oplage) w.tags.push("Limited");
      if (w.vintage) w.tags.push("Vintage");
      if (w.sr) w.tags.push("Diageo");
    });

    // Label als link. Bij Limited staat de oplage in het label zelf, iets lichter ("Limited 1.488"); bij Vintage het jaartal ("Vintage 2016")
    function tagHtml(w, t) {
      const href = esc(LABEL_VAN_TAG[t].href(w));
      if (t === "Limited" && w.oplage) return `<a class="tag" href="${href}" aria-label="Limited, oplage ${duizend(w.oplage)} ${w.oplage === 1 ? "fles" : "flessen"}">Limited<span class="tag-n">${duizend(w.oplage)}</span></a>`;
      if (t === "Vintage" && w.vintage) return `<a class="tag" href="${href}" aria-label="Vintage, gedistilleerd in ${w.vintage}">Vintage<span class="tag-n">${w.vintage}</span></a>`;
      if (t === "Diageo" && w.sr) return `<a class="tag" href="${href}" aria-label="Diageo Special Release ${w.sr}">Diageo<span class="tag-n">${w.sr}</span></a>`;
      return `<a class="tag" href="${href}">${esc(t)}</a>`;
    }

    // Eén whisky als lijstregel. opties: naamHtml (bijv. met markering), zonder: labels die niet getoond worden
    function regel(w, opties = {}) {
      const zonder = opties.zonder || [];
      const tags = w.tags.filter(t => !zonder.includes(t));
      return `<li>
        <span class="name">${opties.naamHtml || esc(w.toon)}</span>
        ${meta(w)}
        ${opties.extra || ""}
        ${tags.length ? `<span class="tags">${tags.map(t => tagHtml(w, t)).join("")}</span>` : ""}
      </li>`;
    }
    function meta(w) {
      return `<span class="meta"><span>#${w.nr}</span><span>${esc(w.soort)}</span>${landTekst(w.land)}<span>${abvText(w.abv)}</span>${w.wb ? `<a class="wb" href="${w.wb}" target="_blank" rel="noopener" aria-label="Bekijk ${esc(w.naam)} op Whiskybase">WB</a>` : ""}</span>`;
    }

    return window.WJ = {
      whiskys, opNaam, vind, collectie, proeverijen, proeverijVan, LABELS, LABEL_VAN_TAG,
      bijgewerkt: D.bijgewerkt, live: !!D.live,
      norm, esc, slug, vergelijk, abvText, datumLang, regel, meta, tagHtml, duizend, kaal, losseTags, KORT_LAND, kortLand, landTekst
    };
  }

  window.wjKlaar = window.WJ_BRON_HULP.laad().then(bouw);

  // Voettekst met datum van bijwerken, vaste bovenbalk en knop naar boven
  document.addEventListener("DOMContentLoaded", () => {
    window.wjKlaar.then(WJ => {
      const el = document.getElementById("bijgewerkt");
      if (el && !WJ.live && WJ.bijgewerkt) el.textContent = "Bijgewerkt " + datumLang(WJ.bijgewerkt);
    });

    const topnav = document.getElementById("topnav");
    const knop = document.createElement("button");
    knop.type = "button";
    knop.className = "naarboven";
    knop.setAttribute("aria-label", "Naar boven");
    knop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    knop.addEventListener("click", () => {
      const rustig = matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: rustig ? "auto" : "smooth" });
    });
    document.body.appendChild(knop);

    const hoogte = () => { if (topnav) document.documentElement.style.setProperty("--top-h", topnav.offsetHeight + "px"); };
    const bijScroll = () => {
      const gescrold = window.scrollY > 40;
      knop.classList.toggle("toon", gescrold);
      if (topnav) topnav.classList.toggle("gescrold", window.scrollY > 4);
    };
    hoogte(); bijScroll();
    window.addEventListener("scroll", bijScroll, { passive: true });
    window.addEventListener("resize", hoogte);
  });
})();
