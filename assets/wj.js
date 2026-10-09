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
  // 1488 → "1.488", 17940 → "17.940"
  const duizend = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  function bouw(D) {
    // Proeverijen: één regel per whisky in de sheet, hier samengevoegd per datum
    const perDatum = new Map();
    D.proeverijen.forEach(([datum, plaats, presentator, organisatie, volgorde, naam]) => {
      const id = "p-" + datum;
      if (!perDatum.has(id)) perDatum.set(id, { id, datum, plaats, presentator, organisatie, items: [] });
      perDatum.get(id).items.push({ volgorde, naam });
    });
    const proeverijen = [...perDatum.values()].sort((a, b) => b.datum.localeCompare(a.datum));
    proeverijen.forEach(p => p.items.sort((a, b) => a.volgorde - b.volgorde));
    const proeverijVan = new Map(); // naam -> meest recente proeverij
    proeverijen.forEach(p => p.items.forEach(x => { if (!proeverijVan.has(x.naam)) proeverijVan.set(x.naam, p); }));

    const inCollectie = new Set(D.collectie.map(r => r[0]));

    // Labels: knop op de Whisky's-pagina, label onder de whisky, en waar dat label naartoe linkt
    const LABELS = [
      { key: "top",       tag: "Top",       href: () => "top.html" },
      { key: "collectie", tag: "Collectie", href: () => "collectie.html" },
      { key: "proeverij", tag: "Proeverij", href: w => "proeverijen.html#" + (proeverijVan.get(w.naam) || {}).id },
      { key: "limited",   tag: "Limited",   href: () => "whiskys.html#limited" }
    ];
    const LABEL_VAN_TAG = Object.fromEntries(LABELS.map(l => [l.tag, l]));

    // Oplage (kolom Oplage in het tabblad Whisky's): ingevuld = label Limited met het aantal flessen erin
    const whiskys = D.whiskys.map(([nr, naam, soort, land, abv, leeftijd, top, sr, wb, oplage]) => {
      const w = {
        nr, naam, soort, land, abv: Number(abv), leeftijd: leeftijd || null, sr: sr || null,
        wb: /^\d+$/.test(String(wb || "").trim()) ? WHISKYBASE + String(wb).trim() : null,
        zoek: norm(`${naam} ${soort} ${land}`), oplage: oplage > 0 ? oplage : null
      };
      w.tags = [];
      if (top) w.tags.push("Top");
      if (inCollectie.has(naam)) w.tags.push("Collectie");
      if (proeverijVan.has(naam)) w.tags.push("Proeverij");
      if (w.oplage) w.tags.push("Limited");
      return w;
    });
    const opNaam = new Map(whiskys.map(w => [w.naam, w]));

    // Type: "Fles" of "Sample" (kolom Type in de sheet; ontbreekt die, dan is het een fles)
    // Aankoop en Geopend: volgnummers (hoogste = nieuwste aanwinst / laatst geopend); leeg = null
    const collectie = D.collectie.map(([naam, status, aantal, land, soort, abv, type, aankoop, geopend]) => {
      const w = opNaam.get(naam);
      return {
        naam, status, aantal, type: type === "Sample" ? "Sample" : "Fles", whisky: w || null,
        land: land || (w && w.land) || "", soort: soort || (w && w.soort) || "",
        abv: abv != null ? abv : (w ? w.abv : null),
        aankoop: aankoop != null ? aankoop : null, geopend: geopend != null ? geopend : null
      };
    });

    // Label als link. Bij Limited staat de oplage in het label zelf, iets lichter ("Limited 1.488")
    function tagHtml(w, t) {
      const href = esc(LABEL_VAN_TAG[t].href(w));
      if (t === "Limited" && w.oplage) return `<a class="tag" href="${href}" aria-label="Limited, oplage ${duizend(w.oplage)} ${w.oplage === 1 ? "fles" : "flessen"}">Limited<span class="tag-n">${duizend(w.oplage)}</span></a>`;
      return `<a class="tag" href="${href}">${esc(t)}</a>`;
    }

    // Eén whisky als lijstregel. opties: naamHtml (bijv. met markering), zonder: labels die niet getoond worden
    function regel(w, opties = {}) {
      const zonder = opties.zonder || [];
      const tags = w.tags.filter(t => !zonder.includes(t));
      return `<li>
        <span class="name">${opties.naamHtml || esc(w.naam)}</span>
        ${meta(w)}
        ${opties.extra || ""}
        ${tags.length ? `<span class="tags">${tags.map(t => tagHtml(w, t)).join("")}</span>` : ""}
      </li>`;
    }
    function meta(w) {
      return `<span class="meta"><span>#${w.nr}</span><span>${esc(w.soort)}</span><span>${esc(w.land)}</span><span>${abvText(w.abv)}</span>${w.wb ? `<a class="wb" href="${w.wb}" target="_blank" rel="noopener" aria-label="Bekijk ${esc(w.naam)} op Whiskybase">WB</a>` : ""}</span>`;
    }

    return window.WJ = {
      whiskys, opNaam, collectie, proeverijen, proeverijVan, LABELS, LABEL_VAN_TAG,
      bijgewerkt: D.bijgewerkt, live: !!D.live,
      norm, esc, slug, vergelijk, abvText, datumLang, regel, meta, tagHtml, duizend
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
