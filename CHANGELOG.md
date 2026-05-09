# Changelog

Toutes les évolutions notables du projet Paperasse Lux. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

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
