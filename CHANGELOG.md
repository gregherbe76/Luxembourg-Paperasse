# Changelog

Toutes les évolutions notables du projet Paperasse Lux. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versionnage [SemVer](https://semver.org/lang/fr/).

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
