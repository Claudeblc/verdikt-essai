
const ETAPES = ["Qualifier la décision", "Vérifier les faits", "Analyser les options", "Décider", "Préparer la mise en œuvre", "Autoriser la livraison", "Rapport et suivi"];
const ETAPE_DE = { NEW: 0, QUALIFIED: 1, CONTEXT_GATE: 1, CONTEXT_APPROVED: 2, DECISION_GATE: 3, DECISION_APPROVED: 4, PRODUCTION_REVISE: 4, FINAL_GATE: 5, FINAL_APPROVED: 6 };
const GUIDE = {
  NEW: ["Dites quelle décision doit être prise, par qui, et ce qu'elle engage.", "Verdikt n'analyse que s'il y a une vraie décision, un décideur et un enjeu qui justifie le coût du rapport (600 €).", "Verdikt vérifiera ensuite les faits du dossier."],
  QUALIFIED: ["Lancez la vérification des faits.", "Avant toute solution, Verdikt confronte ce que dit le client à ses propres données et repère ce qui ne colle pas.", "Vous trancherez les contradictions trouvées."],
  CONTEXT_GATE: ["Tranchez chaque contradiction, puis signez les faits.", "Toute l'analyse repose sur ces chiffres. Une contradiction n'est jamais moyennée : vous choisissez la valeur, ou vous demandez de tester les deux.", "Verdikt comparera les options et chiffrera chacune."],
  CONTEXT_APPROVED: ["Lancez l'analyse : preuves, options, coûts et recommandation.", "Chaque option est chiffrée par un calculateur, pas par l'IA. Une option bloquée par un risque est écartée, quel que soit son coût.", "Vous recevrez une recommandation à signer, à remplacer ou à refuser."],
  DECISION_GATE: ["Lisez la recommandation et ce qui la ferait changer, puis décidez.", "Vous restez maître de la décision : vous pouvez choisir une autre option en expliquant pourquoi, sauf une option écartée par un veto.", "Verdikt préparera le plan de mise en œuvre et le rapport."],
  DECISION_APPROVED: ["Lancez la préparation : plan de mise en œuvre, revue critique, rapport.", "Un relecteur critique cherche ce qui cloche avant que quoi que ce soit parte chez le client.", "Vous autoriserez ou non la livraison."],
  PRODUCTION_REVISE: ["La revue critique demande une reprise : relancez la préparation.", "Un problème bloquant a été trouvé. Rien ne part tant qu'il n'est pas corrigé.", "La revue repassera."],
  FINAL_GATE: ["Vérifiez les contrôles, puis autorisez la livraison.", "Le rapport ne peut pas dire autre chose que la décision signée : option, chiffres et sources sont contrôlés automatiquement.", "Le rapport pourra être exporté et remis au client (envoi fait à la main)."],
  FINAL_APPROVED: ["Exportez le rapport. Après le pilote, saisissez les vrais chiffres.", "Comparer le prévu et le réel montre où l'analyse s'est trompée.", "Fin du parcours d'essai."],
};
const LIBELLE_STATUT = { CLIENT_CONFIRMED: "confirmé par le client", OBSERVED: "observé dans les données", ASSUMED: "supposé, non prouvé", SUPPORTED: "prouvé", PARTIAL: "en partie prouvé", UNSUPPORTED: "sans preuve" };
const LIBELLE_PARAM = { "baseline.volume_per_month": "Volume de factures par mois", "options.modelB.review_minutes_per_unit": "Minutes de relecture par facture (modèle B)", "review_minutes_per_unit": "Minutes de relecture par facture", "volume_per_month": "Factures par mois" };

let etat = null, occupe = false, message = null;
const $ = s => document.querySelector(s);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const eur = n => n === null || n === undefined ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 }) + " €";
const nom = () => { try { return localStorage.getItem("verdikt-nom") || ""; } catch { return ""; } };
const garderNom = v => { try { localStorage.setItem("verdikt-nom", v); } catch {} };
const param = p => LIBELLE_PARAM[p] || p;
const nomOption = id => etat?.decision?.options.find(o => o.id === id)?.nom || id;

async function charger() {
  try { etat = await (await fetch("/api/etat")).json(); }
  catch { message = { ok: false, texte: "L'essai n'a pas pu démarrer dans ce navigateur. Rechargez la page." }; }
  dessiner();
}

async function agir(corps) {
  if (occupe) return;
  occupe = true; dessiner();
  try {
    const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await r.json();
    message = { ok: d.ok, texte: d.message };
    if (d.etat) etat = d.etat;
  } catch { message = { ok: false, texte: "L'essai n'a pas pu démarrer dans ce navigateur. Rechargez la page." }; }
  occupe = false; dessiner();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function champNom() {
  return `<label>Votre nom (il signe la porte)<input name="par" required minlength="2" value="${esc(nom())}" autocomplete="name"></label>`;
}

function blocGuide(st) {
  const [demande, pourquoi, ensuite] = GUIDE[st] || ["", "", ""];
  return `<section class="carte guide"><div><span>Ce que Verdikt vous demande</span>${esc(demande)}</div><div><span>Pourquoi</span>${esc(pourquoi)}</div><div><span>Ensuite</span>${esc(ensuite)}</div></section>`;
}

function vueAccueil() {
  return `<section class="carte"><h2>Le cas à trancher</h2>
    <p>Le cabinet comptable Duval (exemple fictif) saisit ses factures fournisseurs à la main. Il pense avoir besoin d'un agent d'IA sur mesure qui saisit et paie les factures. Un prestataire lui promet +15 % de chiffre d'affaires.</p>
    <p>Vous jouez le rôle du dirigeant : vous qualifiez la décision, tranchez les faits, signez ou refusez la recommandation, puis autorisez la livraison du rapport.</p>
    <div class="boutons"><button class="principal" data-action="recommencer">Commencer l'essai</button></div></section>`;
}

function vueQualifier() {
  return `<section class="carte"><h2>Qualifier la décision</h2>
    <form id="f-qualifier">
      <label>Décision à prendre<input name="decision" required value="Choisir comment traiter la saisie des factures fournisseurs"></label>
      <label>Qui décide<input name="responsable" required value="Associée du cabinet"></label>
      <label>Enjeu de la décision (en euros)<input name="enjeu" type="number" min="1" required value="20000"></label>
      <label>Si l'enjeu est inférieur au coût du rapport (600 €), pourquoi continuer ?<input name="raison" placeholder="Facultatif au-dessus de 600 €"></label>
      ${champNom()}
      <div class="boutons"><button class="principal" type="submit">Qualifier</button></div>
    </form></section>`;
}

function vueLancer(titre, bouton) {
  return `<section class="carte"><h2>${esc(titre)}</h2><div class="boutons"><button class="principal" data-action="lancer">${esc(bouton)}</button></div></section>`;
}

function vueFaits(c, actif) {
  if (!c) return "";
  const contradictions = c.contradictions.map(k => {
    const choix = actif ? `<div class="choix">${k.valeurs.map(v => `<label><input type="radio" name="c-${esc(k.id)}" value="v:${esc(v)}" required> Retenir ${esc(v)}</label>`).join("")}
      <label><input type="radio" name="c-${esc(k.id)}" value="scenario" required> Tester les deux (scénario)</label></div>` : "";
    return `<fieldset><legend><span class="pastille p-refus">${esc(k.gravite)}</span> ${esc(k.description)}</legend>${k.chiffrable ? "" : `<p class="p-doux">Non chiffrable : seul le scénario est possible.</p>`}${choix}</fieldset>`;
  }).join("");
  return `<section class="carte"><h2>Les faits du dossier</h2>
    <p>${esc(c.demande)}</p>
    <h3>Contradictions à trancher</h3>${contradictions || "<p>Aucune.</p>"}
    ${c.instructions.length ? `<div class="encart alerte"><b>Instruction cachée dans une pièce jointe, ignorée :</b>${c.instructions.map(u => `<div>« ${esc(u.extrait)} » <span class="p-doux">(${esc(u.source)})</span></div>`).join("")}<div class="p-doux">Les documents du client sont traités comme des données, jamais comme des ordres. Les e-mails sont masqués avant tout envoi à un modèle.</div></div>` : ""}
    <h3>Ce que le client permet</h3><ul class="simple">${c.permissions.map(p => `<li><span class="pastille ${p.statut === "AVAILABLE" ? "p-ok" : "p-refus"}">${p.statut === "AVAILABLE" ? "possible" : "impossible"}</span> ${esc(p.description)}</li>`).join("")}</ul>
    <h3>Affirmations et leur statut</h3><div class="defile"><table><tr><th>Affirmation</th><th>Statut</th><th>Source</th></tr>${c.affirmations.map(a => `<tr><td>${esc(a.texte)}</td><td><span class="pastille ${a.statut === "ASSUMED" ? "p-alerte" : "p-ok"}">${esc(LIBELLE_STATUT[a.statut] || a.statut)}</span></td><td class="p-doux">${esc(a.source)}</td></tr>`).join("")}</table></div>
  </section>`;
}

function formSignerFaits(c) {
  return `<section class="carte"><h2>Signer les faits</h2><form id="f-faits">${champNom()}<label>Note (facultatif)<input name="notes" placeholder="Ex. : le client confirme l'export de septembre"></label>
    <div class="boutons"><button class="principal" type="submit">Signer les faits</button></div></form>${formRefus()}</section>`;
}

function formRefus() {
  return `<details style="margin-top:14px"><summary>Refuser cette porte</summary><form id="f-refus">${champNom()}<label>Raison du refus<input name="raison" required minlength="3"></label><div class="boutons"><button class="danger" type="submit">Refuser</button></div></form></details>`;
}

function vueDecision(d, actif) {
  if (!d) return "";
  const lignes = d.options.map(o => `<tr class="${o.id === d.retenue ? "retenue" : ""} ${o.veto !== "PASS" ? "veto" : ""}">
      <td>${o.id === d.retenue ? "▶ " : ""}${esc(o.nom)}${o.veto !== "PASS" ? `<div><span class="pastille p-refus" style="text-decoration:none">écartée : ${esc(o.raisons.join(" ; "))}</span></div>` : ""}${o.dominePar ? `<div class="p-doux">moins bonne en tout que : ${esc(nomOption(o.dominePar))}</div>` : ""}</td>
      <td class="n">${eur(o.parUnite)}</td><td class="n">${eur(o.total)}</td><td class="n">${eur(o.tresorerie)}</td><td class="n">${o.heures === null ? "—" : o.heures.toFixed(1).replace(".", ",") + " h"}</td></tr>`).join("");
  const fragile = d.robustesse === "FRAGILE";
  return `<section class="carte"><h2>Recommandation : ${esc(nomOption(d.retenue))} ${fragile ? `<span class="pastille p-alerte">fragile</span>` : ""}</h2>
    <h3>Pourquoi</h3><ul class="simple">${d.pourquoi.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
    <div class="encart alerte"><b>Ce qui ferait changer d'avis</b><ul class="simple">${d.changerAvis.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>
    <p><b>Prochaine action :</b> ${esc(d.prochaine)}</p>
    ${d.conditions.length ? `<p><b>Conditions :</b> ${d.conditions.map(esc).join(" ; ")}</p>` : ""}
    <h3>Les options comparées (sur 12 mois)</h3>
    <div class="defile"><table><tr><th>Option</th><th class="n">Coût par facture acceptée</th><th class="n">Coût total, temps humain compris</th><th class="n">Dépenses réelles</th><th class="n">Temps humain / mois</th></tr>${lignes}</table></div>
    <h3>Points de bascule</h3><ul class="simple">${d.bascules.map(b => `<li>${esc(param(b.parametre))} : seuil à ${b.valeur.toFixed(2).replace(".", ",")}. De l'autre côté de ce seuil, le meilleur choix devient « ${esc(nomOption(b.vers))} »</li>`).join("")}</ul>
    ${d.scenarios.length ? `<h3>Scénarios testés</h3><ul class="simple">${d.scenarios.map(s => `<li>${esc(s.id)} : ${s.change ? "change la décision" : "sans effet"} (${s.resultats.map(r => `${esc(r.value)} → ${esc(nomOption(r.winner))}`).join(", ")})</li>`).join("")}</ul>` : ""}
    <h3>Ce que Verdikt refuse de compter comme gain</h3><ul class="simple">${d.exclus.map(x => `<li><b>${esc(x.description)}</b> : ${esc(x.raison)}</li>`).join("")}</ul>
  </section>
  ${actif ? `<section class="carte"><h2>Votre décision</h2><form id="f-decision">${champNom()}
      <fieldset><legend>Que décidez-vous ?</legend><div class="choix">
        <label><input type="radio" name="mode" value="signer" checked> Je signe la recommandation</label>
        <label><input type="radio" name="mode" value="autre"> Je choisis une autre option</label></div>
        <label style="margin-top:10px">Autre option<select name="option">${d.options.filter(o => o.id !== d.retenue).map(o => `<option value="${esc(o.id)}">${esc(o.nom)}${o.veto !== "PASS" ? " (écartée par un veto)" : ""}</option>`).join("")}</select></label>
        <label>Pourquoi cette autre option ?<input name="raisonChoix" placeholder="Obligatoire si vous choisissez une autre option"></label>
      </fieldset>
      <label>Note (facultatif)<input name="notes"></label>
      <div class="boutons"><button class="principal" type="submit">Valider ma décision</button></div></form>${formRefus()}</section>` : ""}`;
}

function vueProduction(p, actif) {
  if (!p) return "";
  return `<section class="carte"><h2>Revue critique : ${p.revue === "APPROVE" ? `<span class="pastille p-ok">approuvé</span>` : `<span class="pastille p-refus">${esc(p.revue)}</span>`}</h2>
    ${p.remarques.length ? `<ul class="simple">${p.remarques.map(r => `<li><span class="pastille ${r.bloquant ? "p-refus" : "p-doux"}">${esc(r.gravite)}</span> ${esc(r.description)}</li>`).join("")}</ul>` : "<p>Aucune remarque.</p>"}
    ${p.controles.length ? `<h3>Contrôles automatiques avant livraison</h3><ul class="simple" style="list-style:none;padding:0">${p.controles.map(c => `<li><span class="${c.ok ? "p-ok" : "p-refus"}">${c.ok ? "✓" : "✗"}</span> ${esc(c.label)}${c.detail ? ` · ${esc(c.detail)}` : ""}</li>`).join("")}</ul>` : ""}
  </section>
  ${actif ? `<section class="carte"><h2>Autoriser la livraison</h2><form id="f-final">${champNom()}<label>Note (facultatif)<input name="notes"></label><div class="boutons"><button class="principal" type="submit">Autoriser la livraison</button></div></form>${formRefus()}</section>` : ""}`;
}

function md(t) {
  const lignes = t.split("\n"); let html = "", table = false;
  for (const l of lignes) {
    if (l.startsWith("|")) {
      if (/^\|[-| ]+\|$/.test(l)) continue;
      const cells = l.split("|").slice(1, -1).map(c => esc(c.trim()));
      html += (table ? "" : "<table>") + `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`; table = true; continue;
    }
    if (table) { html += "</table>"; table = false; }
    if (l.startsWith("## ")) html += `<h2>${esc(l.slice(3))}</h2>`;
    else if (l.startsWith("# ")) html += `<h1>${esc(l.slice(2))}</h1>`;
    else if (l.startsWith("- ")) html += `<li>${esc(l.slice(2))}</li>`;
    else if (l.trim()) html += `<p>${esc(l)}</p>`;
  }
  return html + (table ? "</table>" : "");
}

function vueFin(e) {
  const reel = e.reel ? `<h3>Prévu contre réel</h3><table><tr><th>Mesure</th><th class="n">Prévu</th><th class="n">Réel</th><th class="n">Écart</th></tr>${e.reel.map(r => `<tr><td>${esc(param(r.metric))}</td><td class="n">${r.predicted.toLocaleString("fr-FR")}</td><td class="n">${r.actual.toLocaleString("fr-FR")}</td><td class="n">${r.error_pct === null ? "—" : (r.error_pct > 0 ? "+" : "") + r.error_pct.toFixed(0) + " %"}</td></tr>`).join("")}</table>` : "";
  return `<section class="carte"><h2>Le rapport client</h2>
      ${e.rapport ? `<div class="rapport">${md(e.rapport)}</div>${e.annexe ? `<details style="margin-top:12px"><summary>Annexe : les preuves et leurs sources</summary><div class="rapport" style="margin-top:8px">${md(e.annexe)}</div></details>` : ""}` : `<p>Le rapport n'est pas encore exporté.</p><div class="boutons"><button class="principal" data-action="exporter">Exporter le rapport</button></div>`}
    </section>
    <section class="carte"><h2>Après le pilote</h2><p>Saisissez ce que le pilote a vraiment mesuré : Verdikt compare avec ce qu'il avait prévu.</p>
      <form id="f-reel"><label>Minutes de relecture par facture, mesurées<input name="relecture" type="number" step="0.1" min="0.1" required value="1.8"></label>
      <label>Factures par mois, mesurées<input name="volume" type="number" min="1" required value="470"></label>
      <div class="boutons"><button class="principal" type="submit">Comparer au prévu</button></div></form>${reel}</section>`;
}

function dessiner() {
  const st = etat?.pret ? etat.etat : null;
  const idx = st ? ETAPE_DE[st] ?? 0 : -1;
  $("#etapes").innerHTML = ETAPES.map((t, i) => `<li class="${i < idx || st === "FINAL_APPROVED" && i === 6 && etat.rapport ? "fait" : ""} ${i === idx ? "actif" : ""}" ${i === idx ? 'aria-current="step"' : ""}>${i + 1}. ${esc(t)}</li>`).join("");
  let html = message ? `<div class="message ${message.ok ? "ok" : "erreur"}" role="status">${esc(message.texte)}</div>` : "";
  if (!etat) html += `<div class="carte">Chargement…</div>`;
  else if (!etat.pret) html += vueAccueil();
  else {
    html += blocGuide(st);
    if (st === "NEW") html += vueQualifier();
    if (st === "QUALIFIED") html += vueLancer("Vérifier les faits", "Lancer la vérification des faits");
    if (st === "CONTEXT_GATE") html += vueFaits(etat.contexte, true) + formSignerFaits(etat.contexte);
    if (st === "CONTEXT_APPROVED") html += vueLancer("Analyser les options", "Lancer l'analyse");
    if (st === "DECISION_GATE") html += vueDecision(etat.decision, true);
    if (st === "DECISION_APPROVED" || st === "PRODUCTION_REVISE") html += vueLancer("Préparer la mise en œuvre", "Lancer la préparation") + vueProduction(etat.production, false);
    if (st === "FINAL_GATE") html += vueProduction(etat.production, true);
    if (st === "FINAL_APPROVED") html += vueFin(etat) + vueDecision(etat.decision, false);
    if (["DECISION_APPROVED", "PRODUCTION_REVISE", "FINAL_GATE"].includes(st)) html += vueDecision(etat.decision, false);
    if (["CONTEXT_APPROVED", "DECISION_GATE", "DECISION_APPROVED", "FINAL_GATE", "FINAL_APPROVED"].includes(st)) html += `<details class="carte"><summary>Rappel : les faits signés</summary>${vueFaits(etat.contexte, false)}</details>`;
    html += `<details class="carte"><summary>Journal du dossier et vue brute du moteur</summary>
      <ul class="simple">${etat.journal.map(j => `<li><span class="p-doux">${esc(new Date(j.quand).toLocaleTimeString("fr-FR"))}</span> ${esc(j.type)} · ${esc(j.detail)}</li>`).join("")}</ul>
      <p class="p-doux">Signatures : ${etat.signatures.length ? etat.signatures.map(esc).join(", ") : "aucune"}</p><pre>${esc(etat.vueBrute)}</pre>
      <div class="boutons" style="margin-top:12px"><button class="danger" data-action="recommencer">Recommencer l'essai depuis le début</button></div></details>`;
  }
  $("#principal").innerHTML = html;
  document.querySelectorAll("button").forEach(b => (b.disabled = occupe));
  brancher();
}

function valeurs(form) { return Object.fromEntries(new FormData(form).entries()); }

function brancher() {
  document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.action === "recommencer" && etat?.pret && !confirm("Effacer ce dossier d'essai et recommencer ?")) return;
    agir({ action: b.dataset.action });
  }));
  const sur = (id, f) => { const el = document.getElementById(id); if (el) el.addEventListener("submit", ev => { ev.preventDefault(); const v = valeurs(el); if (v.par) garderNom(v.par); f(v); }); };
  sur("f-qualifier", v => agir({ action: "qualifier", decision: v.decision, responsable: v.responsable, enjeu: Number(v.enjeu), par: v.par, raison: v.raison }));
  sur("f-faits", v => {
    const tranchees = [], scenarios = [];
    const coches = [...document.querySelectorAll('input[type="radio"][name^="c-"]:checked')];
    const attendues = etat.contexte.contradictions.length;
    if (coches.length < attendues) { message = { ok: false, texte: `Tranchez chaque contradiction avant de signer (${coches.length} sur ${attendues}).` }; dessiner(); return; }
    for (const c of coches) {
      const id = c.name.slice(2);
      if (c.value === "scenario") scenarios.push(id); else tranchees.push({ id, valeur: Number(c.value.slice(2)) });
    }
    agir({ action: "signer", par: v.par, notes: v.notes, tranchees, scenarios });
  });
  sur("f-decision", v => agir({ action: "signer", par: v.par, notes: v.notes, choixHumain: v.mode === "autre" ? { option: v.option, raison: v.raisonChoix || "" } : undefined }));
  sur("f-final", v => agir({ action: "signer", par: v.par, notes: v.notes }));
  sur("f-refus", v => agir({ action: "refuser", par: v.par, raison: v.raison }));
  sur("f-reel", v => agir({ action: "reel", relecture: Number(v.relecture), volume: Number(v.volume) }));
}

if (window.__verdiktPret) charger(); else window.addEventListener("verdikt-pret", charger, { once: true });
