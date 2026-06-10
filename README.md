# Atelier Stock Manager

## V1.0 - Bascule officielle Grist sécurisée

Cette version utilise Grist comme base principale.

- URL normale : Grist par défaut
- `?source=sheet` : mode secours Google Sheet

Les paramètres sensibles sont stockés côté Apps Script dans les propriétés du script :

- `WRITE_PIN`
- `ADMIN_PIN`
- `GRIST_BASE_URL`
- `GRIST_DOC_ID`
- `GRIST_API_KEY`

## Pages principales

- `index.html` : gestion atelier
- `fiche.html?id=EQ-001` : fiche équipement
- `qrcodes.html` : génération QR codes
- `diagnostic.html` : diagnostic application
- `grist-test.html` : test Grist
- `migration-test.html` : outils de migration

## Mode secours

Pour forcer l'ancienne base Google Sheet :

```text
?source=sheet
```

Exemple :

```text
https://louistaffini-debug.github.io/atelier-stock-manager/?source=sheet
```

## V1.1 - Refonte visuelle hybride

Cette version conserve le socle V1.0 avec Grist comme base officielle et ajoute une refonte visuelle inspirée d'un tableau métier :

- thème sombre moderne ;
- navigation latérale ;
- tableau de bord d'indicateurs ;
- vue cartes des équipements ;
- vue tableau dense ;
- filtres par recherche, statut et famille ;
- préparation visuelle du futur module Magasin / composants ;
- conservation du mode secours Google Sheet avec `?source=sheet`.

Cette version ne modifie pas le backend Apps Script.


## V1.2.2 - Lecture du module Magasin / composants

Ajout d'un premier module Magasin connecté à Grist en lecture seule.

### Tables Grist utilisées

- `Composants`
- `MouvementsStock`
- `CategoriesComposants`
- `EmplacementsMagasin`
- `Fournisseurs`

### Pages ajoutées

- `magasin.html`
- `magasin.js`

### Actions Apps Script ajoutées

- `listComposantsGrist`
- `listCategoriesComposantsGrist`
- `listEmplacementsMagasinGrist`
- `listFournisseursGrist`
- `magasinHealthGrist`

Cette version ne modifie pas encore le stock. Elle permet de vérifier que les tables magasin sont correctement créées et lisibles depuis l'application.
