#!/usr/bin/env node
/**
 * diagnostic.js — CLI du moteur de diagnostic administratif (Milestone 1).
 *
 * Sous-commandes :
 *   paperasse diagnostic obligations                 Liste le catalogue sourcé.
 *   paperasse diagnostic profil --json '<...>'        Diagnostique un profil utilisateur.
 *   paperasse diagnostic societe --json '<...>'       Diagnostique un profil société.
 *
 * Le JSON passé décrit le profil (mêmes clés que creerProfilUtilisateur /
 * creerProfilSociete). En l'absence de --json, un exemple société est utilisé.
 *
 * Ne déclenche aucune action externe : lecture seule + affichage.
 */

import {
  chargerCatalogue,
  creerProfilUtilisateur,
  creerProfilSociete,
  diagnostiquer,
  dossierDepuisObligation,
  evaluerFraicheur,
  ceJourISO,
} from '../lib/diagnostic/index.js';

function arg(nom) {
  const i = process.argv.indexOf(nom);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const sousCommande = process.argv[2];
const aujourdhui = arg('--date') || ceJourISO();

function afficherObligation(entree, indent = '  ') {
  const { obligation: ob, raisons, echeance } = entree;
  const fr = evaluerFraicheur(ob.provenance, { aujourdhui });
  console.log(`${indent}• ${ob.nom}  [${ob.categorie}]`);
  if (echeance) console.log(`${indent}  Échéance : ${echeance}`);
  if (raisons.length) console.log(`${indent}  Pourquoi : ${raisons.join(' ; ')}`);
  console.log(`${indent}  Autorité : ${ob.autoriteCompetente || '—'}`);
  console.log(`${indent}  Source   : ${ob.provenance.source} (vérifié le ${ob.provenance.dateVerification}, ${ob.provenance.niveauConfiance})`);
  if (fr.aRevalider) console.log(`${indent}  ⚠ ${fr.message}`);
}

function diagnostic(cible, type) {
  const { obligations, as_of } = chargerCatalogue();
  console.log(`\nCatalogue d'obligations : ${obligations.length} entrée(s), as_of ${as_of}\n`);
  const { applicables, aClarifier, nonApplicables } = diagnostiquer(cible, obligations, { aujourdhui });

  console.log(`=== Obligatoire / à faire (${applicables.length}) ===`);
  for (const e of applicables) afficherObligation(e);

  if (aClarifier.length) {
    console.log(`\n=== Informations manquantes (${aClarifier.length}) ===`);
    for (const e of aClarifier) {
      console.log(`  • ${e.obligation.nom} — manque : ${e.manquantes.join(', ')}`);
    }
  }

  console.log(`\n=== Non applicable (${nonApplicables.length}) ===`);
  for (const e of nonApplicables) console.log(`  • ${e.obligation.nom}`);

  // Dossiers générés (aperçu) — aucun n'est envoyé, tout reste local.
  console.log(`\n=== Dossiers générés (${applicables.length}) ===`);
  for (const e of applicables) {
    const d = dossierDepuisObligation(e, { [type === 'societe' ? 'societeId' : 'profilId']: cible.id || 'local', aujourdhui });
    console.log(`  • [${d.priorite}] ${d.typeDemarche} → statut ${d.statut}`);
  }
}

switch (sousCommande) {
  case 'obligations': {
    const { obligations, as_of } = chargerCatalogue();
    console.log(`Catalogue d'obligations (as_of ${as_of}) — ${obligations.length} entrée(s) :\n`);
    for (const ob of obligations) afficherObligation({ obligation: ob, raisons: [], echeance: null });
    break;
  }
  case 'profil': {
    const p = arg('--json') ? creerProfilUtilisateur(JSON.parse(arg('--json'))) : creerProfilUtilisateur({ statutProfessionnel: 'independant', paysResidence: 'LU', dateArriveeLux: '2026-01-15' });
    diagnostic(p, 'profil');
    break;
  }
  case 'societe': {
    const c = arg('--json') ? creerProfilSociete(JSON.parse(arg('--json'))) : creerProfilSociete({ nom: 'Exemple SARL-S', regimeTVA: 'normal', frequenceTVA: 'mensuelle', statut: 'actif' });
    diagnostic(c, 'societe');
    break;
  }
  default:
    console.log(`Usage :
  paperasse diagnostic obligations            Liste le catalogue sourcé
  paperasse diagnostic profil  [--json '{...}']  Diagnostique un particulier
  paperasse diagnostic societe [--json '{...}']  Diagnostique une société
  Option commune : --date YYYY-MM-DD (échéances déterministes)`);
    process.exit(sousCommande ? 1 : 0);
}
