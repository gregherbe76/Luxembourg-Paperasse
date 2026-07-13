# knowledge/ — la connaissance, actif principal de Paperasse Lux

Le code du moteur (`lib/`) évolue lentement. **La connaissance réglementaire
évolue toutes les semaines** — c'est elle qu'il faut industrialiser, versionner
et vérifier. Ce dossier rassemble la connaissance métier, séparée du moteur.

```
Code  →  Connaissance  →  Règles  →  LLM
```

## Structure

| Dossier / fichier | Contenu | Emplacement actuel |
|---|---|---|
| `life-events` | Événements de vie (graphe) | `data/evenements-vie.json` |
| `administrations` | Registre des autorités & sources | `data/sources.json` |
| `regulations` | Obligations sourcées **et versionnées** | `data/obligations.json` |
| `documents` | Pièces & paquets documentaires | via `lib/outputs` |
| `workflows` | Missions & dépendances | via `lib/workflows` |
| `glossary` | Acronymes & termes expliqués | `knowledge/glossary.json` |
| `qa` | **Knowledge QA** : cas métier de référence | `knowledge/qa/cas-reference.json` |
| `faq`, `examples`, `decision-trees` | À enrichir | — |

> Les données restent physiquement dans `data/` (validées par les schémas et la
> CI) ; ce dossier documente la **vue « connaissance »** et héberge les
> artefacts qui n'ont pas leur place dans `data/` (glossaire, QA métier).

## Versioning réglementaire

Chaque obligation porte un bloc `validite` :

```json
"validite": {
  "validFrom": "2025-01-01",
  "validUntil": null,
  "juridiction": "LU",
  "langue": "fr",
  "version": "2026.1",
  "lastVerified": "2026-06-15"
}
```

Le moteur peut alors répondre : **« Cette réponse est valable pour les règles en
vigueur au 1er janvier 2027. »** Voir `enVigueurLe()` / `catalogueEnVigueur()`
dans `lib/connaissances`, et `paperasse connaissances envigueur --date …`.

## Knowledge QA (tests métier)

`knowledge/qa/cas-reference.json` décrit des **cas métier** attendus (profil ou
événements → nombre d'obligations / de démarches). Le harnais
`scripts/test-knowledge.js` les rejoue comme une **suite de non-régression de la
connaissance** — plus précieuse que de gagner des tests purement techniques.

## Principe

Le moteur ne contient **aucune règle en dur**. Ajouter/mettre à jour une règle,
un événement, un acronyme = éditer la connaissance ici (avec source + date +
version), sans toucher au moteur.
