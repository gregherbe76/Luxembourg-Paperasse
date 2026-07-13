#!/usr/bin/env node
/**
 * connaissances.js — CLI de la base de connaissances officielle (Milestone 11).
 *
 * Sous-commandes :
 *   paperasse connaissances rapport
 *   paperasse connaissances chercher --terme TVA
 *   paperasse connaissances citer    --id obl_tva_declaration_mensuelle
 *   paperasse connaissances revalider [--seuil 365]
 *   paperasse connaissances sources
 *
 * Aucune règle n'est affichée sans source.
 */

import {
  chargerSources, baseConnaissances, rechercher, reglesARevalider, citer, verifierSourcesConnues, rapport,
} from '../lib/connaissances/index.js';

function arg(nom) { const i = process.argv.indexOf(nom); return i !== -1 ? process.argv[i + 1] : undefined; }
const sous = process.argv[2];
const opts = arg('--seuil') ? { seuilJours: Number(arg('--seuil')) } : {};

switch (sous) {
  case 'rapport': {
    const r = rapport(opts);
    console.log(`Base de connaissances : ${r.total} règle(s)`);
    console.log(`Par niveau de confiance : ${JSON.stringify(r.parNiveau)}`);
    console.log(`À revérifier : ${r.aRevalider} | sans source : ${r.sansSource}`);
    const inconnues = verifierSourcesConnues();
    console.log(`Sources hors registre : ${inconnues.length}`);
    break;
  }
  case 'chercher': {
    const r = rechercher(arg('--terme') || '', opts);
    console.log(`${r.length} résultat(s) pour « ${arg('--terme')} » :\n`);
    for (const e of r) console.log(`  • [${e.categorie}] ${e.titre}\n    Source : ${e.source} (${e.niveauConfiance}, ${e.dateVerification})${e.fraicheur.aRevalider ? ' ⚠ à revérifier' : ''}`);
    break;
  }
  case 'citer': {
    const c = citer(arg('--id'), opts);
    console.log(c.citation);
    break;
  }
  case 'revalider': {
    const r = reglesARevalider(opts);
    console.log(`${r.length} règle(s) à revérifier${arg('--seuil') ? ` (seuil ${arg('--seuil')} j)` : ''} :\n`);
    for (const e of r) console.log(`  ⚠ ${e.titre} — vérifiée le ${e.dateVerification} (${e.fraicheur.joursDepuisVerification} j)`);
    break;
  }
  case 'sources': {
    const s = chargerSources();
    console.log(`Registre des sources officielles (mis à jour ${s.lastUpdated}) :\n`);
    for (const x of s.sources) console.log(`  • ${x.id} — ${x.name}\n    ${x.url}`);
    break;
  }
  default:
    console.log(`Usage :
  paperasse connaissances rapport
  paperasse connaissances chercher --terme TVA
  paperasse connaissances citer    --id <obligationId>
  paperasse connaissances revalider [--seuil 365]
  paperasse connaissances sources`);
    process.exit(sous ? 1 : 0);
}
