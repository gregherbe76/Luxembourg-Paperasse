---
title: Assistant administratif (roadmap)
layout: default
nav_order: 6
---

# Paperasse Lux → Assistant administratif luxembourgeois

Ce document est l'**audit d'architecture** et la **feuille de route** de l'évolution
de Paperasse Lux, d'une collection de calculateurs isolés vers un véritable
**assistant administratif** (moteur de diagnostic, analyse documentaire, dossiers,
échéances, courriers). Il accompagne l'implémentation du **Milestone 1**
(`lib/diagnostic/`).

Principe cardinal, non négociable : **aucune obligation, aucun délai, aucun montant
n'est affiché sans source officielle + date de vérification + niveau de confiance**,
et toute information incertaine porte la mention « validation humaine nécessaire ».

---

## 1. État des lieux de l'architecture actuelle

Paperasse Lux est une **bibliothèque Node.js ESM zéro-dépendance de production**
(dépendances lourdes en `optionalDependencies`), distribuée à la fois comme paquet
npm/CLI et comme **skills Markdown** pour agents IA.

| Couche | Emplacement | Rôle |
|---|---|---|
| Logique métier pure | `lib/<module>/index.js` | Fonctions pures (bank-parsers, faia, rts, frontaliers, lbr, bellegen-akt, ecdf, indice-statec, templates-de) |
| Points d'entrée CLI | `scripts/*.js` | Un script par commande + un `test-*.js` par module |
| Routeur unifié | `bin/paperasse` | Table `ROUTES` cmd → script, `spawn` |
| Données datées | `data/*.json`, `<skill>/data/*.json` | Chiffres officiels avec champ `as_of` |
| Schémas | `schemas/*.schema.json` | JSON Schema draft-07, validés par un validateur maison (subset, sans `ajv`) |
| Skills agents | `comptable/`, `notaire/`, `fiscaliste/`, `syndic/`, `controleur-fiscal/`, `commissaire-aux-comptes/` | `SKILL.md` + `data` + `references` + `templates` |
| Tests | `scripts/test-*.js` | Harnais maison (`test()/eq()`), 257 tests avant M1, exécutés en CI (Node 20 & 22) |
| Veille | `.github/workflows/legilux-watch.yml` | Scan hebdomadaire du Mémorial A |

**Conventions structurantes à respecter** :

- **Zéro dépendance** au runtime ; ESM (`"type": "module"`) ; Node ≥ 20.
- Fonctions **pures et déterministes**, JSDoc en français, sources citées en tête de module.
- Toute donnée réglementaire porte un `as_of` et une source (`data/sources.json`, `SOURCES.md`).
- Tests = scripts Node autonomes ajoutés au script `test` de `package.json`.
- Validateur et test-runner **maison** (pas de jest/ajv) : rester dans ce style.

## 2. Fonctionnalités déjà présentes

Calculateurs et générateurs **fiables et testés**, réutilisables tels quels :

- **Fiscalité entreprise** : IRC, ICC (communes), IF ; **TVA** (déclaration CA3) ; **FAIA** (SAF-T LU 2.01) ; **eCDF** (comptes annuels abrégés) ; états financiers ; PDF de clôture.
- **Fiscalité des personnes** : **RTS** (barème IRPP 2025, classes 1/1a/2, splitting) ; **frontaliers** FR/BE/DE (conventions, net réel) ; **indice STATEC** + SSM (indexation).
- **Notariat** : **Bëllegen Akt** (crédit 40 000 €/personne, réforme 10/2024), droits d'enregistrement, successions.
- **Registres & banque** : validation **RCS**, checklists/calendrier **LBR** ; parsers relevés **BCEE/POST/BIL/CAMT.053** ; facture conforme TVA LU + validation.
- **Outillage** : veille Légilux, contrôle de fraîcheur (`freshness`), validation de schémas.

## 3. Lacunes (au regard de la cible « assistant »)

1. **Pas de modèle d'entités** : ni profil utilisateur, ni société persistée, ni dossier, ni document, ni obligation — chaque calcul est sans état.
2. **Pas de moteur de diagnostic** reliant une *situation* à ses *obligations*.
3. **Pas d'analyse documentaire** (import courrier → extraction période/échéance/action).
4. **Pas de calendrier/rappels** ni de suivi de statut de démarche.
5. **Pas de génération de courriers** de réponse à l'administration.
6. **Base réglementaire dispersée** : les règles sont codées dans les modules, non cataloguées comme *obligations requêtables et sourcées*.
7. **Pas de persistance ni d'isolation par utilisateur** (prérequis RGPD).
8. **Interface** : CLI + skills uniquement (pas d'objectif web dans ce dépôt — la cible reste bibliothèque + agents).

## 4. Schéma de données proposé

Cinq entités, matérialisées comme **objets normalisés** (fabriques `lib/diagnostic/entities.js`)
et **schémas JSON** (`schemas/*.schema.json`) :

- **`ProfilUtilisateur`** (`user-profile.schema.json`) — identité, résidence, situation familiale, statut professionnel, frontalier, logement, sociétés liées, arrivée au LU, consentement RGPD.
- **`ProfilSociete`** (`company-profile.schema.json`) — forme, RCS, TVA, régime & fréquence TVA, salariés, exercice, statut (actif/cessation/liquidation).
- **`Dossier`** (`administrative-case.schema.json`) — catégorie, administration, statut (8 valeurs), priorité (colonnes du tableau de bord), échéance, pièces requises/reçues, informations manquantes, risques, prochaines actions, **provenance obligatoire dès qu'une échéance ou un risque est présent**.
- **`Document`** (`uploaded-document.schema.json`) — type, administration émettrice, période, texte extrait, données structurées, échéance détectée, action demandée, **incertain + validation humaine par défaut**.
- **`Obligation`** (`obligations.schema.json`, catalogue `data/obligations.json`) — population concernée, **conditions d'applicabilité déclaratives** `{champ, operateur, valeur}`, fréquence, dateLimite, autorité, pièces, pénalités, **provenance obligatoire**, statut actif/obsolète.

**Provenance** (transversale, `lib/diagnostic/provenance.js`) : `{ source, dateVerification, niveauConfiance ∈ {officiel, derive, estimation, incertain}, validationHumaineRequise }` + helper `evaluerFraicheur()` qui déclenche « à revérifier avant utilisation » au-delà de 365 jours ou si `incertain`.

## 5. Plan de migration (évolution progressive, sans réécriture)

1. **Ajouter** `lib/diagnostic/` **à côté** de l'existant — aucune modification des modules actuels (compatibilité totale, tests existants intacts).
2. **Cataloguer** progressivement les règles dans `data/obligations.json` (sourcées) au lieu de les recoder.
3. **Brancher** les calculateurs existants comme *exécuteurs* d'obligations (ex. l'obligation « déclaration TVA » réutilise `scripts/calc-tva-declaration.js` ; « RTS » réutilise `lib/rts`). Le moteur **oriente**, les modules **calculent**.
4. **Persister** via un store JSON local isolé par propriétaire (`lib/diagnostic/store.js`), extensible ensuite au chiffrement (M12).
5. **Enrichir** domaine par domaine en suivant l'ordre des milestones, chaque ajout étant testé et sourcé avant d'être considéré « terminé ».

## 6. Milestones techniques

| # | Milestone | Traduction technique dans ce dépôt |
|---|---|---|
| 1 | Socle & modèle de données | `lib/diagnostic/` (entités, provenance, moteur, store) + schémas + catalogue amorce ✅ |
| 2 | Diagnostic universel | `questionnaire.js` (questions utiles uniquement) + `dashboard.js` (5 colonnes) ✅ |
| 3 | Analyse documentaire | `lib/documents/` : classification, dates/montants/références/échéance/action/conséquences → résumé + checklist + projet de réponse + Dossier ✅ |
| 4 | Module TVA complet | `lib/tva/` : calendrier, périodes/déclarations manquantes, contrôle de cohérence (réutilise `calc-tva-declaration`), rapprochement courrier AED ✅ |
| 5 | Indépendants & sociétés | `lib/entreprise/` : parcours par phase (création→vie→fiscalité→employeur→cessation), pièces manquantes, échéances par société ; réutilise `lib/lbr` ✅ |
| 6 | Particuliers & frontaliers | `lib/particulier/` : parcours par domaine, classe d'impôt, analyse frontalière + fiche de paie ; réutilise `lib/rts`, `lib/frontaliers` ✅ |
| 7 | Résidence & immigration | `lib/residence/` : parcours « Je m'installe au Luxembourg » (5 phases, UE / hors UE, échéances depuis l'arrivée) ✅ |
| 8 | Logement | `lib/logement/` : parcours locataire/acheteur/propriétaire/vendeur, intègre Bëllegen Akt + garantie locative ✅ |
| 9 | Génération de courriers | `lib/courriers/` : 9 types de courriers-projets + pré-remplissage depuis analyse (M3) + dossier récap ✅ |
| 10 | Calendrier & rappels | `lib/rappels/` : alertes couleur (rouge/orange/jaune/vert), rappels avant échéance, documents manquants, calendrier trié ✅ |
| 11 | Base de connaissances | `data/obligations.json` enrichi + historique de modifications |
| 12 | Sécurité & RGPD | Chiffrement du store, export/suppression (helpers déjà amorcés) |
| 13 | Interface & i18n | Skills FR/EN/DE/LB |
| 14 | Conversationnel | Skill agent orchestrant profil → diagnostic → dossier |
| 15 | Tests & qualité | 15 scénarios de bout en bout |

## 7. Fichiers créés / modifiés (Milestone 1)

**Créés** : `lib/diagnostic/{provenance,entities,engine,store,index}.js` · `data/obligations.json` ·
`schemas/{obligations,user-profile,company-profile,administrative-case,uploaded-document}.schema.json` ·
`scripts/diagnostic.js` · `scripts/test-diagnostic.js` · `docs/assistant-administratif.md`.

**Modifiés (additifs, non cassants)** : `bin/paperasse` (routes `diagnostic` / `test:diagnostic` + aide) ·
`package.json` (scripts `diagnostic`, `test:diagnostic`, ajout au `test`) · `CHANGELOG.md`.

## 8. Risques

- **Exactitude réglementaire** : une obligation mal datée induit l'utilisateur en erreur → mitigé par `provenance` obligatoire + `evaluerFraicheur` + niveaux de confiance + mention validation humaine.
- **Périmètre** : la cible est vaste ; risque de code superficiel → mitigé par la livraison milestone par milestone, chacun testé.
- **Attente produit ≠ dépôt** : le brief d'origine visait une web-app (Replit) ; ce dépôt est une bibliothèque/CLI/skills. La feuille de route respecte cette nature (pas de front-end imposé).
- **RGPD** : données sensibles (revenus, immigration) → store isolé par propriétaire dès M1, chiffrement en M12.
- **Faux négatifs de diagnostic** : un champ de profil non renseigné pourrait masquer une obligation → traité explicitement (colonne « informations manquantes »).

## 9. Dépendances

**Aucune dépendance runtime ajoutée** (contrainte du projet respectée). Node ≥ 20, ESM.
Le moteur s'appuie uniquement sur `node:fs`, `node:path`, `node:url`. L'analyse
documentaire (M3) introduira des dépendances **optionnelles** (OCR/PDF) sur le
modèle des `optionalDependencies` existantes.

## 10. Milestone 1 — livré

`lib/diagnostic/` fournit : le modèle d'entités sourcé, la traçabilité obligatoire,
le moteur profil → obligations → échéances → dossiers, un store local isolé, et un
catalogue d'obligations amorce (7 obligations sourcées : TVA mensuelle/trimestrielle/
annuelle, dépôt comptes RCS, RBE, déclaration d'arrivée commune, IRPP modèle 100).

CLI : `paperasse diagnostic obligations | profil | societe`. **29 tests** (`test:diagnostic`),
intégrés à la CI. Aucune action externe déclenchée, aucune règle codée en dur dans le moteur.
