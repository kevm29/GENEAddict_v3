# GENEAddict v3

Suivi de mes recherches généalogiques en archives : centres d'archives, actes à chercher,
demandés, obtenus ou perdus, annotations, dépouillements de registres, fiches de consultation
à imprimer.

**Aucun serveur, aucune installation** : on double-clique sur `index.html` et c'est parti.
Toute la base tient dans **un seul fichier `geneaddict.json`** que l'application met à jour
toute seule à chaque modification.

---

## Démarrer

1. Téléchargez le projet (bouton vert **Code → Download ZIP** sur GitHub) et décompressez-le
   où vous voulez.
2. Ouvrez `index.html` avec **Chrome** ou **Edge** (double-clic, ou glisser le fichier dans le navigateur).
3. Sur l'accueil, cliquez sur **« Choisir le dossier de ma base »** et choisissez un dossier
   (par exemple `Documents/Généalogie`, ou un dossier OneDrive / Dropbox pour retrouver la base
   sur plusieurs ordinateurs).

C'est tout. Ce dossier contiendra :

```text
Généalogie/
├── geneaddict.json      ← la base, réécrite automatiquement à chaque modification
├── sauvegardes/         ← une copie par jour (30 derniers jours gardés)
└── a-importer/          ← déposez-y des fichiers .txt / .csv d'actes à ajouter
    └── importes/        ← les fichiers déjà importés y sont rangés
```

> À chaque nouvelle session, le navigateur redemande par sécurité l'autorisation d'écrire dans
> le dossier : un clic sur **« Autoriser et ouvrir »** suffit.
>
> Avec Firefox ou Safari (qui ne savent pas écrire dans un dossier), la base est gardée dans le
> navigateur ; pensez alors à l'**exporter** régulièrement depuis *Ma base*.

Astuce : ajoutez `index.html` à vos favoris ou créez un raccourci sur le bureau.

---

## Ce qu'on peut faire

| Écran | Rôle |
|---|---|
| **Accueil** | Compteurs par statut, centres où il reste des actes à chercher, dépouillements en cours, derniers documents modifiés. |
| **Archives** | Carte des départements avec numéros et noms (zoom à la molette, déplacement à la souris, encart Paris & petite couronne), couleur selon le nombre de documents, liseré pour les actes à chercher. Les autres centres sont rangés par onglets — Archives nationales, Défense (SHD), municipales, bibliothèques, ministères, religieuses, étranger, privées — et regroupés par institution avec leurs sites (ex. *AN (Archives nationales)* → Paris, Pierrefitte-sur-Seine). Fiche de chaque centre : site, entraide FranceGenWeb / FDA, adresse, horaires, n° de lecteur, notes. |
| **Documents** | Liste filtrable (texte libre, centre, type, période, statut), tri, changement de statut en un clic, sélection multiple, fiche détaillée avec annotations, transcription, étiquettes et historique des statuts. |
| **Saisie rapide** | Ajout d'actes **sans formulaire** : texte à balises ou tableau copié depuis Excel, avec suggestions à la frappe après `@`, aperçu, contrôle des erreurs et détection des doublons. Les balises que vous inventez (`@parrain`, `@source`…) sont gardées comme champs personnalisés. Voir [`docs/FORMAT_SAISIE.md`](docs/FORMAT_SAISIE.md). |
| **Fiche de consultation** | Feuille A4 à emporter aux archives : cotes à demander triées, cases à cocher, colonne de notes, rappel des dépouillements en cours, lignes vides. Au retour, on met à jour les statuts directement sur la fiche. |
| **Dépouillements** | Suivi page à page de la lecture d'un registre, d'une étude notariale ou d'un fonds. |
| **Liens** | Sites utiles, rangés par catégorie. |
| **Ma base** | Dossier d'enregistrement, export JSON / CSV, restauration, reprise de l'ancienne base MySQL. |

### Saisie rapide en 10 secondes

```text
@centre CARAN
@date 02/06/1642
@type Procuration
@personne Gentien de MARIGNER
@notaire REGNAULT
@cote ET/LXXXV/366

@centre 35
@date 1712
@type Contrat de mariage
@personne Jean MURET & Anne LE GALL
@cote 4 E 1234
```

…ou collez directement des lignes copiées depuis un tableur. Des exemples sont dans [`exemples/`](exemples).

### Reprendre les données de l'ancien site

Dans phpMyAdmin (base `docach`), exportez la table `docs` en CSV avec les noms de colonnes,
puis ouvrez le fichier dans la *Saisie rapide* : les colonnes de l'ancienne table sont reconnues
telles quelles (détails dans *Ma base* et dans le guide du format).

---

## Pour les curieux : organisation du code

HTML, CSS et JavaScript simples, **sans compilation ni dépendance** (les scripts sont chargés
directement par `index.html`, ce qui permet l'ouverture en `file://`).

```text
index.html
css/app.css               styles écran
css/impression.css        fiches imprimables (A4 paysage)
js/saisie.js              lecture du texte à balises et des tableaux (testé sous Node)
js/donnees.js             la base : fichier JSON, sauvegardes, dossier a-importer/, IndexedDB
js/donnees-initiales.js   centres et liens proposés dans une base neuve
js/carte-france.js        tracé des départements et position des étiquettes
js/carte.js               carte interactive (zoom, étiquettes, liseré, encart Paris)
js/autocompletion.js      suggestions de la saisie rapide
js/ui.js                  outils d'interface (fenêtres, notifications, routeur)
js/vue-*.js               un fichier par écran
js/app.js                 démarrage et menu
tests/                    tests du parseur (node --test) et test de bout en bout (Playwright)
```

Le fichier `geneaddict.json` est lisible et modifiable à la main ; s'il change pendant que
l'application est ouverte (autre ordinateur via OneDrive, édition manuelle…), il est rechargé
quand la fenêtre reprend le focus.

Tests : `npm test` (parseur), `npm run test:navigateur` (parcours complet dans Chrome,
nécessite `npm install`).

## Pistes pour la suite

- Arbres : import GEDCOM et lien entre actes et individus.
- Import des dépouillements de l'ancienne table `recherches`.
- Saisie par balises des centres et des dépouillements.
- Catégories de centres modifiables depuis l'interface.
- Pièces jointes (photos d'actes) rangées dans le dossier de la base.

## Crédits

Carte des départements : [@svg-maps/france.departments](https://github.com/VictorCazanave/svg-maps)
par Victor Cazanave, licence CC BY 4.0.
