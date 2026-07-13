# Changelog

Toutes les évolutions notables du projet Paperasse Lux. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

## [0.15.0] — 2026-07-13

### Ajouté — Module TVA complet (Milestone 4)

Quatrième jalon : suivi TVA de bout en bout — calendrier, détection des
déclarations manquantes, contrôle de cohérence et rapprochement des courriers
AED. Réutilise le calculateur existant (`scripts/calc-tva-declaration.js`) et les
seuils sourcés (`comptable/data/tva-taux.json`). **Aucune déclaration n'est
envoyée** : suivi et contrôle uniquement.

**Module `lib/tva/`** (purement additif)

- `determinerFrequence(caAnnuelHT)` — mensuelle / trimestrielle / annuelle selon les seuils AED (tracé : source + niveau de confiance).
- `periodesAttendues()` / `calendrierTVA()` — périodes écoulées depuis l'assujettissement, ventilées **en retard** vs **à préparer**, avec prochaine déclaration et prochaine échéance de paiement.
- `controleCoherence()` — recalcule la TVA collectée (calcul traçable) et signale : périodes manquantes, incohérence collectée déclarée/recalculée, numéro TVA absent/mal formé, factures non conformes, doublons, taux invalides, écart factures ↔ déclaration.
- `checklistDeclaration()` — données nécessaires à la préparation (CA, ventes nationales/intracom, achats, TVA collectée/déductible, acquisitions intracom, importations, régularisations, notes de crédit).
- `rapprocherCourrierAED()` — relie un courrier AED analysé (M3) à la période concernée du calendrier et crée un `Dossier` (provenance incertaine → validation humaine).

**CLI** — `paperasse tva-suivi calendrier | frequence | checklist | coherence | courrier`.

- 14 tests (`test:tva-suivi`). **Tests cumulés : 333.**

## [0.14.0] — 2026-07-13

### Ajouté — Analyse de courriers et documents officiels (Milestone 3)

Troisième jalon de l'assistant : importer un courrier administratif et comprendre
ce qu'il signifie, ce qui est demandé, pour quand, et avec quels risques. Cœur
zéro-dépendance opérant sur du **texte extrait** (OCR/PDF = couche optionnelle future).

**Module `lib/documents/`** (purement additif)

- `analyserDocument(texte)` — pipeline complet : administration émettrice → type → dates → montants → références (TVA, RCS, n° dossier) → période → action demandée → échéance → conséquences → résumé (« Ce document signifie ») → checklist → projet de réponse → entité `Document`.
- Extracteurs unitaires exportés : `detecterDates` (JJ/MM/AAAA, JJ.MM.AAAA, mois en lettres, dates impossibles rejetées), `detecterMontants` (format LU 1.234,56 €), `detecterReferences`, `detecterPeriode`, `detecterEcheance` (marqueurs « au plus tard le » + délais relatifs « endéans N jours »).
- `dossierDepuisDocument()` — crée un `Dossier` avec provenance **incertaine** (donnée issue d'un document, pas d'une source officielle).
- `lexique.js` — dictionnaires de reconnaissance (9 administrations, 10 types de documents). Le type générique « courrier » est un fallback.

**Règle stricte** — un document importé n'est jamais « officiel » ; dès qu'un élément clé manque ou est ambigu, l'analyse affiche : « Certaines informations n'ont pas pu être vérifiées. Une validation humaine est nécessaire. »

**CLI** — `paperasse diagnostic document --file courrier.txt`. Exemple : `examples/documents/courrier-aed-tva.txt`.

- 20 tests (`test:documents`). **Tests cumulés : 319.**

## [0.13.0] — 2026-07-13

### Ajouté — Diagnostic administratif universel (Milestone 2 : questionnaire dynamique + tableau de bord)

Deuxième jalon de l'assistant administratif : « Que dois-je faire administrativement ? ».
Un questionnaire qui ne pose **que les questions utiles** et un tableau de bord des
obligations à cinq colonnes. Purement additif (aucun module existant modifié).

**Module `lib/diagnostic/questionnaire.js`**

- `champsPertinents(situation, catalogue)` — champs encore décisifs : un champ n'est retenu que si au moins une obligation reste *possible* (toutes ses conditions déjà répondues sont vraies) et en dépend.
- `prochaineQuestion()` / `questionsRestantes()` — proposent la question la plus discriminante (nombre d'obligations conditionnées), jamais une question inutile.
- `appliquerReponse()` — coercition de type + validation d'énumération, immuable (permet la correction).
- `QUESTIONS` — registre de formulations en français simple (acronymes explicités).

**Module `lib/diagnostic/dashboard.js`**

- `construireTableauDeBord()` — 5 colonnes : `obligatoire_maintenant`, `a_faire_prochainement`, `a_surveiller`, `non_applicable`, `informations_manquantes`.
- Chaque carte porte : nom, raison d'application, administration, échéance, documents requis, risque, **source** (avec statut de fraîcheur), et actions « Commencer » / « Créer un rappel ».

**CLI** — `paperasse diagnostic questionnaire [--json '{...}']` et `paperasse diagnostic dashboard [--json '{...}']`.

- 13 tests (`test:diagnostic`). **Tests cumulés : 299.**

## [0.12.0] — 2026-07-12

### Ajouté — Administrative Diagnostic Engine (Milestone 1 : socle & modèle de données)

Premier jalon de l'évolution de Paperasse Lux vers un **assistant administratif**
luxembourgeois : socle technique reliant une *situation* à ses *obligations*, sans
jamais afficher une règle sans source.

**Module `lib/diagnostic/`** — zéro-dépendance, ESM, purement additif (aucun module existant modifié).

- `entities.js` — 5 fabriques normalisées et validées : `creerProfilUtilisateur`, `creerProfilSociete`, `creerDossier`, `creerDocument`, `creerObligation` (ids et horodatages injectables → tests déterministes).
- `provenance.js` — traçabilité **obligatoire** : `creerProvenance({ source, dateVerification, niveauConfiance, validationHumaineRequise })`, niveaux `officiel/derive/estimation/incertain`, `evaluerFraicheur()` (« à revérifier au-delà de 365 jours »).
- `engine.js` — moteur `diagnostiquer(profil, catalogue)` (applicables / informations manquantes / non applicables), conditions déclaratives `{champ, operateur, valeur}`, `calculerEcheance()` déterministe (mensuelle/trimestrielle/annuelle), `dossierDepuisObligation()`.
- `store.js` — persistance JSON locale isolée par propriétaire (ids déterministes, export/suppression → prépare le RGPD).

**Données & schémas** — `data/obligations.json` : 7 obligations **sourcées** (TVA mensuelle/trimestrielle/annuelle, dépôt comptes RCS, RBE, déclaration d'arrivée commune, IRPP modèle 100). Schémas ajoutés : `obligations`, `user-profile`, `company-profile`, `administrative-case`, `uploaded-document`.

**CLI** — `paperasse diagnostic obligations | profil | societe [--json '{...}'] [--date YYYY-MM-DD]`. Lecture seule, aucune action externe.

**Documentation** — `docs/assistant-administratif.md` : audit d'architecture + feuille de route des 15 milestones.

- 29 tests (`test:diagnostic`). **Tests cumulés : 286.**

## [0.11.0] — 2026-05-11

### Ajouté — Indice STATEC + SSM, prép npm publish, veille Légilux

**Module `lib/indice-statec/`** — suivi de l'échelle mobile des salaires LU et du Salaire Social Minimum.

- `getSSMCourant({ qualifie, date })` — SSM mensuel et horaire (base 173 h) en vigueur à toute date.
- `getSSMJeune({ tranche })` — SSM jeune travailleur (15-17 ans : 75 % ; 17-18 ans : 80 %).
- `derniereTranche(date)` + `nbTranchesDepuis(since)` — historique des indexations déclenchées.
- `indexerSalaire({ brutReference, dateReference, dateCible })` — recalcule le brut courant d'un salaire signé à une date passée (+2,5 % par tranche).
- Données : 6 tranches d'indexation (oct 2021 → mai 2025), 4 entrées historiques SSM avec sources Mémorial A.
- CLI : `paperasse statec ssm`, `statec tranches`, `statec indexer --brut 5000 --depuis 2022-01-01`.
- 20 tests.

**Distribution** — package préparé pour publication npm publique.

- `private: true` retiré, `license`, `author`, `repository`, `bugs`, `homepage`, `keywords`, `files` ajoutés.
- `prepublishOnly: npm test` (impossible de publier sans 173 tests verts).
- Dépendances lourdes (`puppeteer`, `pdf-lib`, `stripe`) déplacées en `optionalDependencies` (réduit la taille d'install par 10).
- Reste à faire par Grégory : `npm publish` (nécessite un compte npm et `npm login`).

**Veille Légilux** — workflow GitHub Actions hebdomadaire.

- `.github/workflows/legilux-watch.yml` : tous les lundis à 8h UTC, scan du flux Atom officiel du Mémorial A.
- Filtrage par mots-clés fiscaux/sociaux (TVA, RTS, SSM, indexation, succession, FAIA, eCDF, etc.).
- Ouverture automatique d'une issue GitHub si nouveautés détectées.
- À pousser manuellement par Grégory (token Replit sans scope `workflow`).

**Tests cumulés : 257** (19+18+24+25+18+27+19+23+64+20).

## [0.10.1] — 2026-05-11

### Corrigé — Durcissement des validateurs (revue d'architecte)

- **FAIA** : `validerFAIAInput` ne crashait pas mais ne signalait pas non plus si `accounts`, `entries`, `salesInvoices` ou `purchaseInvoices` étaient passés avec un type incorrect (chaîne, objet, nombre…). Désormais : erreur explicite, pas d'exception non gérée.
- **Bëllegen Akt** : `dateActe` n'était validée que par regex (acceptait `2024-99-99`, `2024-02-30`). Désormais validation de date réelle UTC.
- **RTS** : `deductionsAnnuelles`, `salaireBrutMensuel` non-finis (`NaN`, `Infinity`, chaîne) produisaient des résultats `NaN` silencieux. Désormais : `Number.isFinite` + bornes, erreur explicite.
- 12 tests de non-régression ajoutés (3 FAIA + 2 Bëllegen Akt + 3 RTS, +4 cas autour).

**Tests cumulés : 173** (19 calc + 18 bank + 24 eCDF + 25 LBR + 18 templates DE + 27 FAIA + 19 Bëllegen Akt + 23 RTS).

## [0.10.0] — 2026-05-11

### Ajouté — Site documentation GitHub Pages

- Dossier `docs/` Jekyll prêt à déployer sur GitHub Pages (Settings → Pages → Source : `main` / `/docs`).
- Thème **just-the-docs** (recherche intégrée, navigation latérale, mode mobile).
- 14 pages : accueil, démarrage rapide, fiche par module (FAIA, RTS, Bëllegen Akt, eCDF, LBR, Templates DE, Banques, Calc), sources officielles, FAQ.
- Lien `https://gregherbe76.github.io/Luxembourg-Paperasse/` ajouté en tête de README.

## [0.9.0] — 2026-05-11

### Ajouté — Bëllegen Akt (Lot #6) + RTS (Lot #5)

**Module `lib/bellegen-akt/`** — calculateur des droits d'enregistrement immobiliers et du crédit d'impôt « Bëllegen Akt » pour résidence principale.

- `calculerBellegenAkt({ prix, nbAcquereurs, luxVille, bellegenAkt, dateActe })` → décomposition complète (droits, abattement, honoraires, TVA, total).
- Constantes : `TAUX_DROITS_LU` (6 % enregistrement, 1 % transcription, 3 % surtaxe Luxembourg-Ville), `ABATTEMENT_BELLEGEN_AKT_PAR_PERSONNE = 40 000 €`.
- Gère le changement de plafond du 1er octobre 2024 (loi du 22 mai 2024) : 30 000 €/personne avant, 40 000 €/personne depuis.
- L'abattement est plafonné aux droits dus (pas de remboursement).
- CLI : `paperasse bellegen-akt --prix 600000 --acquereurs 2 --lux-ville`.
- 17 tests (constantes, droits nominaux, abattement, honoraires, validation).

**Module `lib/rts/`** — calcul de la retenue à la source sur traitements et salaires (LU 2025).

- `calculerRTS({ salaireBrutMensuel, classe, cisActif, cimActif })` → CSSS, IRPP, contribution dépendance, net mensuel, taux effectif.
- Barème IRPP 2025 complet (23 tranches, taux marginal 0 % à 42 %, mis à jour par la loi du 19 décembre 2024 — adaptation à l'inflation, +2,5 indice).
- Classes 1, 1a (abattement extra-professionnel), 2 (splitting).
- Crédits d'impôt CIS (70 €/mois) et CIM monoparental (188 €/mois), bornés à 0 €.
- Cotisations CSSS salarié 10,80 % (2,80 % maladie + 8,00 % pension) + contribution dépendance 1,40 % avec abattement.
- CLI : `paperasse rts --brut 5000 --classe 1`.
- 20 tests (barème, classes, cas concrets SMIC/cadre/haut salaire, crédits, cohérence net = brut − retenues).

**Tests cumulés : 165** (19 calc + 18 bank + 24 eCDF + 25 LBR + 18 templates DE + 24 FAIA + 17 Bëllegen Akt + 20 RTS).

## [0.8.0] — 2026-05-09

### Ajouté — Module FAIA (Lot #3)

- `lib/faia/index.js` — API `genererFAIA(input, options)` produisant un XML SAF-T LU 2.01 conforme au profil de l'Administration de l'Enregistrement, des Domaines et de la TVA (AED), exigible lors de tout contrôle TVA depuis 2011.
- `lib/faia/validation.js` — `validerFAIAInput()` + `TAX_CODES_LU` (6 codes : STD 17 %, INT 14 %, RED 8 %, SUP 3 %, EXM, ZRO).
- `lib/faia/xml.js` — constructeurs XML par section (Header, MasterFiles, GeneralLedgerEntries, SourceDocuments) avec échappement des 5 entités XML.
- Validations strictes avant génération :
  - format RCS LU (B/F/G/E/K/X + 1 à 7 chiffres) et matricule TVA LUxxxxxxxx
  - dates ISO YYYY-MM-DD réelles (rejette 2025-02-30)
  - équilibre comptable D = C par écriture (tolérance 0,005 €)
  - rejet des lignes ayant à la fois débit et crédit (ou aucun des deux)
  - rejet des écritures à moins de 2 lignes
  - avertissement sur AccountID orphelin (référencé mais absent du plan comptable)
- `scripts/generate-faia.js` réécrit en CLI moderne (mode `--validate-only` + mode legacy 2 fichiers conservé).
- `scripts/test-faia.js` — 24 tests (12 validation + 12 génération XML).
- `examples/faia-input.json` — exemple complet documentant le format d'entrée.
- Section **SourceDocuments** ajoutée (SalesInvoices, PurchaseInvoices, Payments) — absente de l'ancienne version.
- Route CLI `paperasse test:faia` + script `npm run test:faia`.

**Tests cumulés : 128** (19 calc + 18 bank + 24 eCDF + 25 LBR + 18 templates DE + 24 FAIA).

## [0.7.5] — 2026-05-09

### Corrigé

- README : toutes les URLs GitHub pointaient vers `gregherbe76/paperasse-lux` (qui n'existe pas) au lieu de `gregherbe76/Luxembourg-Paperasse` (le vrai nom du dépôt). Badges (étoiles, licence, CI), instructions d'installation et star-history sont maintenant corrects.

## [0.7.4] — 2026-05-09

### Ajouté — Bonus open-source

- `.github/FUNDING.yml` — active le bouton « Sponsor » sur la page du dépôt (GitHub Sponsors → @gregherbe76).
- `CITATION.cff` — permet « Cite this repository » sur GitHub (utile vu le caractère réglementaire du projet).
- `.github/workflows/codeql.yml` — analyse de sécurité statique automatique (CodeQL, queries `security-and-quality`) à chaque push, chaque PR, et tous les lundis à 4h32 UTC.
- Branch protection activée sur `main` (réglage côté GitHub) : pas de force-push, pas de suppression, requiert que la CI `validate` passe avant merge.

## [0.7.3] — 2026-05-09

### Ajouté — Standards open-source (community health 100%)

- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 en français.
- `SECURITY.md` — politique de signalement de faille (Security Advisories privé + email).
- `.github/ISSUE_TEMPLATE/config.yml` — désactive les issues blanches, redirige les questions vers GitHub Discussions et les failles vers les Security Advisories.
- `.github/ISSUE_TEMPLATE/feature_request.md` — template de demande de fonctionnalité.
- `.github/dependabot.yml` — mises à jour hebdomadaires automatiques des dépendances npm et des actions GitHub.
- `.github/release.yml` — génération automatique des notes de release par catégorie (Nouveautés, Corrections, Données réglementaires, etc.).

### Corrigé

- `LICENSE` — la mention « Inspired by Paperasse » a été déplacée après le texte MIT pour que GitHub détecte correctement la licence comme MIT (et non « NOASSERTION »).

## [0.7.2] — 2026-05-09

### Documentation

- README : ajout du badge et d'une section dédiée pointant vers le profil **AgentSkill.sh** de l'auteur — https://agentskill.sh/@gregherbe76 — pour permettre l'installation des skills en un clic depuis l'index public.

## [0.7.1] — 2026-05-09

### Documentation

- `lib/templates-de/render.js` : ajout d'un bloc « LIMITATIONS CONNUES » dans l'en-tête du fichier — pas de support des blocs imbriqués (for/if dans for), pas de `{% else %}`. Les 6 templates DE livrés ont été conçus pour rester dans ce périmètre. Pour des templates plus complexes, basculer sur nunjucks.

## [0.7.0] — 2026-05-09

### Ajouté

- **`templates/de/`** — 6 templates en allemand pour résidents et entreprises germanophones du Luxembourg :
  - `einberufung-gesellschafterversammlung.md` — convocation AG SARL (loi du 10.08.1915 art. 710-15/16)
  - `einberufung-hauptversammlung.md` — convocation AG SA (art. 450-1 ss.)
  - `einberufung-eigentuemerversammlung.md` — convocation AG copropriété (loi du 16.05.1975)
  - `mahnung.md` — lettre de mise en demeure avec verzugszinsen + 40 € (loi du 18.04.2004)
  - `rechnung-luxemburg.md` — facture conforme TVA LU (mentions obligatoires, reverse charge, exonération)
  - `kuendigung-mietvertrag.md` — résiliation de bail avec demande de restitution caution (loi du 21.09.2006)
- **`lib/templates-de/render.js`** — Moteur de rendu minimal sans dépendance : substitutions `{{ var }}`, chemins pointés `{{ obj.sub }}`, filtre `| default('x')`, boucles `{% for x in liste %}` (avec `loop.index`), conditions `{% if cond %}`.
- **`scripts/de.js`** — CLI `paperasse de <template> <input.json> [--out=fichier.md]` ou `paperasse de --list`.
- **`scripts/test-templates-de.js`** — 18 tests : moteur de rendu (substitutions, défauts, boucles, conditions), rendu intégral des 3 templates principaux, vérification absence de variable non substituée, présence des mentions légales.
- **`examples/de/`** — 3 exemples de contexte JSON (Mahnung, Rechnung, Einberufung SARL).

### Modifié

- `package.json` — version 0.7.0, `npm test` enchaîne maintenant 104 tests (19 + 18 + 24 + 25 + 18)
- `bin/paperasse` — sous-commandes `de` et `test:de`

## [0.6.0] — 2026-05-09

### Ajouté

- **`lib/lbr/`** — Module d'aide au Registre de Commerce et des Sociétés luxembourgeois :
  - `index.js` — `validerRCS()` (catégories B/F/G/E/K/X), `urlRechercheLBR()` (deep-link portail public), `calendrierDepots()` (échéances annuelles AG + dépôt comptes + eCDF), `TARIFS_LBR_2026` (barème officiel TVA incluse).
  - `checklists.js` — 8 opérations LBR documentées avec pièces à déposer, capital minimum, délais, coût indicatif, bases légales : creation_sarl, creation_sa, creation_asbl, modification_statuts, changement_dirigeant, transfert_siege, depot_comptes_annuels, dissolution_liquidation.
- **`scripts/lbr.js`** — CLI `paperasse lbr <commande>` : `valider`, `url`, `operations`, `checklist`, `calendrier`, `tarifs`.
- **`scripts/test-lbr.js`** — 25 tests déterministes (validation RCS multi-catégories, URL portail, checklists complètes, calendrier dépôts avec gestion du débordement de mois, tarifs 2026).

### Pourquoi ce choix d'approche

Le portail lbr.lu utilise des sessions JSP côté serveur, ce qui rend tout scraping fragile. Le dataset RCS complet n'est pas en open data sur data.public.lu. Plutôt que de promettre un client API qui casserait à la première mise à jour du portail, on fournit ce dont l'utilisateur a réellement besoin au quotidien : les checklists exactes des pièces à déposer, le calendrier des obligations annuelles, et l'URL du portail officiel pour finaliser la consultation manuelle.

### Modifié

- `package.json` — version 0.6.0, `npm test` enchaîne maintenant 86 tests (19 calculs + 18 parseurs bancaires + 24 eCDF + 25 LBR)
- `bin/paperasse` — sous-commandes `lbr` et `test:lbr`

## [0.5.0] — 2026-05-09

### Ajouté

- **`lib/ecdf/`** — Générateur de fichier eCDF "Comptes annuels schéma abrégé" (CA-A) :
  - `mappings.js` — Correspondance Plan Comptable Normalisé luxembourgeois → 41 rubriques eCDF (bilan actif/passif + compte de résultat). Basé sur la loi du 19 décembre 2002 (LSC) et le règlement grand-ducal du 10 juin 2009 sur le PCN.
  - `generator.js` — Agrège les soldes PCN par préfixe de compte, calcule le résultat de l'exercice (produits classe 7 - charges classe 6), vérifie l'équilibre actif/passif, et émet un document XML structuré conforme au formulaire CA-A.
- **`scripts/generate-ecdf.js`** — CLI `paperasse ecdf <input.json> [--out=fichier.xml] [--json]`. Sortie XML par défaut, résumé de cohérence sur stderr (équilibre du bilan, total actif/passif, résultat).
- **`scripts/test-ecdf.js`** — 24 tests déterministes : structure des données, calculs (CA net, frais de personnel, coût matières, résultat, capital, dettes fiscales, avoirs banque), équilibre du bilan, rendu XML, cas d'erreur (RCS ou exercice manquant).
- **`examples/ecdf-input.json`** — Exemple SARL ACME 2025 avec balance PCN équilibrée (résultat +8 500 €).

### Avertissement

Les codes de rubriques eCDF (101, 1101, 3001, ...) suivent la nomenclature publique du formulaire CA-A. **Avant tout dépôt légal au RCS via eCDF, le fichier généré doit être validé sur le tester officiel** https://ecdf.b2g.etat.lu/. Le mapping PCN → rubriques peut nécessiter des ajustements selon les particularités sectorielles (secteur financier, fondations, ASBL).

### Modifié

- `package.json` — version 0.5.0, `npm test` enchaîne maintenant 61 tests (19 calculs + 18 parseurs bancaires + 24 eCDF)
- `bin/paperasse` — sous-commandes `ecdf` et `test:ecdf`

## [0.4.0] — 2026-05-09

### Ajouté

- **`lib/bank-parsers/`** — Parseurs de relevés bancaires luxembourgeois sans dépendance externe :
  - `csv.js` — parseur CSV générique (auto-détection séparateur `;`/`,`/`\t`, formats de montants FR/LU/EN, dates multi-formats)
  - `bcee.js` — profil BCEE / Spuerkeess (export S-Net : Date;Date valeur;Libellé;Débit;Crédit;Solde;Devise;Référence)
  - `post.js` — profil POST Finance (CCPL : Date;Description;Montant signé;Devise;Solde)
  - `bil.js` — profil BIL (export BILnet)
  - `generic.js` — fallback CSV avec détection par mots-clés FR/EN/DE
  - `camt053.js` — parseur CAMT.053 ISO 20022 (XML standard accepté par toutes les banques LU)
  - `index.js` — auto-détection du format + agrégation des totaux
- **`scripts/parse-bank-statement.js`** — CLI `paperasse bank <fichier> [--format=json|table|csv]`
  - Sortie normalisée : `{ date, date_valeur, libelle, montant signé, sens, devise, solde, reference, banque }`
  - Format `table` pour aperçu lisible, `csv` pour réimport comptable, `json` pour pipeline
- **`scripts/test-bank-parsers.js`** — 18 tests déterministes (parseAmount FR/LU/EN, parseDate multi-formats, BCEE/POST/CAMT.053 sur fixtures)
- **`examples/bank-statements/`** — 3 fixtures synthétiques : `bcee-sample.csv`, `post-sample.csv`, `camt053-sample.xml`
- Avantage vs PSD2 Tink : pas d'OAuth interactif requis (ne marche pas en headless), tous les exports bancaires LU supportés en local.

### Modifié

- `package.json` — version 0.4.0, `npm test` enchaîne calculs + parseurs bancaires (37 tests au total)
- `bin/paperasse` — sous-commandes `bank` et `test:bank`

## [0.3.0] — 2026-05-09

### Ajouté

- **`SOURCES.md`** — Documentation officielle des 4 grandes familles de sources luxembourgeoises (PCN/CNC, fiscalité Legilux/ACD/AED, audit IRE/CSSF, open data data.public.lu/STATEC/LBR/eCDF) avec URLs canoniques et fichiers du dépôt liés.
- **`schemas/`** — 17 schémas JSON Schema (draft-07) couvrant tous les `*/data/*.json` du dépôt. Garde-fou contre les erreurs de saisie (typo de taux, format de date) lors des mises à jour annuelles.
- **`scripts/validate-schemas.js`** — Validateur sans dépendance externe (subset draft-07 : type/required/min/max/pattern/const/properties/patternProperties/items). Exit 1 si une donnée viole son schéma.
- **`scripts/calc-tva-declaration.js`** — Module + CLI calculant la déclaration TVA luxembourgeoise (équivalent CA3) : ventilation HT/TVA par taux 17/14/8/3, acquisitions intracommunautaires en auto-liquidation, livraisons exonérées, lignes prêtes pour le formulaire eCDF.
- **`scripts/check-data-freshness.js`** — Détecte les fichiers `data/*.json` obsolètes en comparant `as_of` à l'année courante. Sortie 1 si un fichier date d'avant l'année en cours, utilisable en CI annuelle pour rappeler la revue post-loi-budgétaire.
- **`scripts/fetch-open-data.js`** — Interroge l'API udata de data.public.lu (`/api/1/`) : recherche, inspection, téléchargement vers `data-sources/` (staging, gitignored).
- **`bin/paperasse`** — CLI unifiée routant vers tous les scripts : `paperasse calc`, `paperasse tva`, `paperasse validate:data`, `paperasse freshness`, `paperasse open-data`, `paperasse closing`, etc. Installable via `npm install -g .` puis `paperasse help`.
- **`examples/tva-trimestre.json`** — Exemple de déclaration TVA T3 prêt à exécuter via `paperasse tva examples/tva-trimestre.json`.
- **Scripts npm** : `validate:data`, `freshness`, `tva`, `open-data` ; entrée `bin` pour la CLI globale.

### Modifié

- `package.json` — version 0.3.0, ajout du champ `bin` pour exposer `paperasse` après `npm install -g`.

## [0.2.0] — 2026-05-09

### Ajouté

- **`evals/`** — Suite d'évaluation Python (uv) avec runner LLM-as-judge :
  - `run_evals.py` : exécute chaque cas avec et sans le SKILL.md, fait noter par un juge LLM
  - `aggregate_benchmark.py` : agrège les résultats sous forme de tableau
  - `generate_review.py` : génère une review HTML côte-à-côte
  - 14 cas de test luxembourgeois couvrant les 6 skills (TVA, IRC+ICC+IF, RCS, prescription, prix de transfert, audit, classes d'impôt, frontalier 34 jours, Bëllegen Akt 2024, succession ligne directe, PACS, AG copropriété, fonds de prévoyance 2019)
  - Tests unitaires `test_run_evals.py`
- **`integrations/`** — Connecteurs PSD2 (Tink) pour banques LU + Stripe + documentation Peppol B2G
- **`package.json`** + scripts npm : `closing`, `statements`, `pdfs`, `facture`, `validate:facture`, `fetch`, `fetch:tink`, `fetch:stripe`, `test:calc`
- **Scripts JS supplémentaires** :
  - `generate-statements.js` : Bilan + Compte de Résultat + Balance au format PCN
  - `generate-pdfs.js` : conversion .md → PDF avec en-tête société
  - `generate-facture-lux.js` : facture HTML/PDF conforme LU avec champ Peppol
  - `validate-facture.js` : vérification mentions obligatoires (matricule TVA LU, RCS B+chiffres, taux 17/14/8/3, IBAN, B2G)
  - `test-deterministic-calculations.js` : tests TVA / IRC+ICC+IF / Bëllegen Akt
- **README** — sections Scripts/Intégrations/Evaluations restructurées comme l'original
- **`assets/banner.png`** + `.env.example` + `marketplace.json`

## [0.1.0] — 2026-05-09

Première version publique. Adaptation luxembourgeoise du projet [Paperasse](https://github.com/romainsimon/paperasse) (Romain Simon).

### Ajouté — 6 skills

- `comptable` — PCN, TVA Lux (17/14/8/3 %), IRC/ICC, FAIA, eCDF, Peppol B2G, dépôt RCS.
- `controleur-fiscal` — simulation contrôle ACD/AED sur 8 axes.
- `commissaire-aux-comptes` — audit légal en 7 phases selon ISA-LUX.
- `fiscaliste` — RTS, classes 1/1a/2, barème progressif, frontaliers, retraite, stock-options.
- `notaire` — Bëllegen Akt (40 000 €/personne depuis 1ᵉʳ oct. 2024), successions ligne directe exonérées, donations, contrats de mariage et PACS.
- `syndic` — loi du 16 mai 1975 modifiée par la loi du 16 décembre 2019, AG, fonds de prévoyance, état daté.

### Ajouté — Données (`*/data/*.json` + `data/`)

17 jeux de données : taux TVA, barème IRPP 2025, classes d'impôt, abattements & déductions, multiplicateurs ICC des 102 communes, droits d'enregistrement, abattements succession, tarif des émoluments notariaux, diagnostics obligatoires, majorités loi 1975, plan comptable copropriété, PCN détaillé.

### Ajouté — Références (`*/references/*.md`)

~17 fiches + `references/legilux-flux-rss.md` documentant les 4 flux RSS du Journal Officiel et leur exploitation par skill.

### Ajouté — Templates et scripts initiaux

- Templates : convocation AG copropriété, déclaration TVA 100 (checklist), facture conforme Lux, PV approbation des comptes.
- Scripts : `calc.js` (calculs IRPP / IRC), `generate-faia.js` (export FAIA depuis JSON).

### Documentation

- `README.md` complet avec installation, usage, exemples, comparatif France/Luxembourg, garde-fous, sources.
- `CONTRIBUTING.md` — règles éditoriales et workflow de contribution.
- `LICENSE` — MIT + disclaimer (pas de conseil juridique).
- `.gitignore` — exclusion `company.json`, données privées, caches.
- `.github/` — issue templates, PR template, workflow CI de validation JSON.
