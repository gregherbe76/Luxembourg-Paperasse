/**
 * lib/connaissances — Base de connaissances officielle (Milestone 11).
 *
 * Consolide, en une base requêtable, toutes les règles administratives du
 * projet (catalogue d'obligations + parcours d'installation), chacune reliée à
 * sa source officielle et à sa fraîcheur. Vérifie aussi que chaque source
 * appartient au registre officiel (data/sources.json).
 *
 * RÈGLE STRICTE : aucune réponse réglementaire n'est renvoyée sans source.
 * Lorsqu'une règle n'a pas été vérifiée récemment, la base signale :
 * « Cette information doit être revérifiée avant utilisation. »
 *
 * Aucune dépendance externe.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chargerCatalogue } from '../diagnostic/index.js';
import { evaluerFraicheur, ceJourISO } from '../diagnostic/provenance.js';
import { chargerInstallation } from '../residence/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_PATH = join(__dirname, '..', '..', 'data', 'sources.json');
const GLOSSAIRE_PATH = join(__dirname, '..', '..', 'knowledge', 'glossary.json');

const hote = (url) => String(url || '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase();

/** Registre des sources officielles (data/sources.json). */
export function chargerSources(fichier = SOURCES_PATH) {
  return JSON.parse(readFileSync(fichier, 'utf8'));
}

// ---------------------------------------------------------------------------
// Versioning réglementaire : « valable pour les règles en vigueur au <date> »
// ---------------------------------------------------------------------------

/**
 * Une obligation est-elle en vigueur à une date donnée (et pour une juridiction) ?
 * Une obligation sans bloc `validite` est considérée en vigueur (rétrocompatible).
 *
 * @param {object} obligation
 * @param {string} [dateReference] YYYY-MM-DD (défaut : aujourd'hui).
 * @param {object} [opts] { juridiction }
 */
export function enVigueurLe(obligation, dateReference = ceJourISO(), { juridiction } = {}) {
  if (obligation.statut === 'obsolete') return false;
  const v = obligation.validite;
  if (!v) return true;
  if (juridiction && v.juridiction && v.juridiction !== juridiction) return false;
  if (v.validFrom && dateReference < v.validFrom) return false;
  if (v.validUntil && dateReference > v.validUntil) return false;
  return true;
}

/** Filtre un catalogue aux seules obligations en vigueur à `dateReference`. */
export function catalogueEnVigueur(obligations, dateReference = ceJourISO(), opts = {}) {
  return obligations.filter((o) => enVigueurLe(o, dateReference, opts));
}

/** Glossaire des acronymes (knowledge/glossary.json). */
export function chargerGlossaire(fichier = GLOSSAIRE_PATH) {
  if (!existsSync(fichier)) return { as_of: null, termes: [] };
  return JSON.parse(readFileSync(fichier, 'utf8'));
}

/** Explique un acronyme / terme (recherche insensible à la casse). */
export function expliquer(terme) {
  const t = String(terme || '').trim().toLowerCase();
  return chargerGlossaire().termes.find((x) => x.sigle.toLowerCase() === t || x.terme.toLowerCase() === t) || null;
}

/** Ensemble des hôtes de sources officielles connus. */
export function hotesConnus() {
  const s = chargerSources();
  return new Set((s.sources || []).map((x) => hote(x.url)));
}

/**
 * Construit la base de connaissances unifiée.
 *
 * @param {object} [opts] { aujourdhui, seuilJours }
 * @returns {object[]} entrées { id, titre, categorie, population, frequence,
 *   source, dateVerification, niveauConfiance, statut, fraicheur }
 */
export function baseConnaissances({ aujourdhui = ceJourISO(), seuilJours } = {}) {
  const entrees = [];

  const { obligations } = chargerCatalogue();
  for (const ob of obligations) {
    const p = ob.provenance;
    entrees.push({
      id: ob.id,
      origine: 'obligation',
      titre: ob.nom,
      categorie: ob.categorie,
      population: ob.populationConcernee,
      frequence: ob.frequence,
      autorite: ob.autoriteCompetente || null,
      source: p.source,
      dateVerification: p.dateVerification,
      niveauConfiance: p.niveauConfiance,
      statut: ob.statut,
      validite: ob.validite || null,
      fraicheur: evaluerFraicheur(p, { aujourdhui, seuilJours }),
    });
  }

  const install = chargerInstallation();
  for (const e of install.etapes || []) {
    const p = { source: e.source, dateVerification: install.as_of, niveauConfiance: 'derive' };
    entrees.push({
      id: `install_${e.id}`,
      origine: 'installation',
      titre: e.titre,
      categorie: 'residence',
      population: e.public,
      frequence: null,
      autorite: e.administration || null,
      source: e.source,
      dateVerification: install.as_of,
      niveauConfiance: 'derive',
      statut: 'actif',
      fraicheur: evaluerFraicheur(p, { aujourdhui, seuilJours }),
    });
  }

  return entrees;
}

/** Recherche plein-texte simple (titre, catégorie, id, autorité). */
export function rechercher(terme, opts = {}) {
  const t = String(terme || '').toLowerCase();
  return baseConnaissances(opts).filter((e) =>
    [e.titre, e.categorie, e.id, e.autorite].some((c) => String(c || '').toLowerCase().includes(t)),
  );
}

/** Règles à revérifier (fraîcheur dépassée ou niveau incertain). */
export function reglesARevalider(opts = {}) {
  return baseConnaissances(opts).filter((e) => e.fraicheur.aRevalider);
}

/**
 * Cite une règle : renvoie l'entrée avec sa source. Lève une erreur si la
 * règle est introuvable ou dépourvue de source (garde-fou anti-« sans source »).
 */
export function citer(id, opts = {}) {
  const e = baseConnaissances(opts).find((x) => x.id === id);
  if (!e) throw new Error(`Règle introuvable : ${id}`);
  if (!e.source) throw new Error(`Règle ${id} sans source : diffusion interdite.`);
  return {
    ...e,
    citation: `${e.titre} — ${e.autorite || 'autorité non précisée'}. Source : ${e.source} (${e.niveauConfiance}, vérifié le ${e.dateVerification}).`
      + (e.fraicheur.aRevalider ? ' ⚠ Cette information doit être revérifiée avant utilisation.' : ''),
  };
}

/**
 * Vérifie que chaque source d'obligation appartient au registre officiel.
 * @returns {object[]} entrées dont l'hôte n'est pas dans data/sources.json
 */
export function verifierSourcesConnues(opts = {}) {
  const connus = hotesConnus();
  return baseConnaissances(opts)
    .filter((e) => e.origine === 'obligation')
    .filter((e) => !connus.has(hote(e.source)))
    .map((e) => ({ id: e.id, source: e.source, hote: hote(e.source) }));
}

/** Rapport de synthèse de la base (compteurs par niveau + à revérifier). */
export function rapport(opts = {}) {
  const base = baseConnaissances(opts);
  const parNiveau = {};
  for (const e of base) parNiveau[e.niveauConfiance] = (parNiveau[e.niveauConfiance] || 0) + 1;
  return {
    total: base.length,
    parNiveau,
    aRevalider: base.filter((e) => e.fraicheur.aRevalider).length,
    sansSource: base.filter((e) => !e.source).length,
  };
}
