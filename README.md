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
| **Archives** | Carte des départements, outre-mer compris (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte en encarts), avec numéros et noms ; tout l'écran tient sans défiler, la carte reste fixe et se zoome (molette, double-clic, boutons), couleur selon le nombre de documents, liseré pour les actes à chercher. Les autres centres sont rangés par onglets — Archives nationales, Défense (SHD), municipales, bibliothèques, ministères, religieuses, étranger, privées — et regroupés par institution avec leurs sites (ex. *AN (Archives nationales)* → Paris, Pierrefitte-sur-Seine). Fiche de chaque centre : site, entraide FranceGenWeb / FDA, adresse, horaires, n° de lecteur, notes. |
| **Documents** | Liste filtrable (texte libre — `-PG` exclut les documents contenant « PG », `-"prisonnier de guerre"` une expression —, centre, type, période, statut), tri, changement de statut en un clic, sélection multiple, fiche détaillée avec annotations, transcription, étiquettes et historique des statuts. |
| **Saisie rapide** | Ajout d'actes **sans formulaire** : texte à balises ou tableau copié depuis Excel, avec suggestions à la frappe après `@`, aperçu, contrôle des erreurs et détection des doublons. Les balises que vous inventez (`@parrain`, `@source`…) sont gardées comme champs personnalisés. Voir [`docs/FORMAT_SAISIE.md`](docs/FORMAT_SAISIE.md). |
| **Fiche de consultation** | Feuille A4 portrait à emporter aux archives : nom simple du centre, une ligne par document, la cote puis les informations séparées par des tirets (date — acte — personnes — notaire…), case à cocher, rappel des dépouillements en cours ; la dernière page est complétée de lignes de notes jusqu'en bas (aucune s'il ne reste pas de place) ; annotations et lignes vides en option. |
| **Dépouillements** | Suivi page à page de la lecture d'un registre, d'une étude notariale ou d'un fonds. |
| **Études de cas** | Les TP par année (2023 : 8 études ; 2024 et 2025 : 4 études chacune), protégés par mot de passe : couvertures ; un clic sur un TP montre sa couverture en grand, puis « Suivant » les défis ; « Retour » revient aux années et reverrouille tout. Pages de défis avec leurs liens cliquables, aux couleurs de chaque année. Le mot de passe des énoncés montre les questions ; celui des solutions donne aussi les réponses, cachées au départ et révélées une à une d'un clic (ou toutes avec « Tout révéler »), ainsi que les questions et documents propres à la correction. |
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
js/carte.js               carte interactive (zoom, étiquettes, liseré, encarts outre-mer)
js/autocompletion.js      suggestions de la saisie rapide
js/ui.js                  outils d'interface (fenêtres, notifications, routeur)
js/vue-*.js               un fichier par écran
js/app.js                 démarrage et menu
tests/                    tests du parseur (node --test) et test de bout en bout (Playwright)
outils/                   préparation de la carte (Python) et chiffrement des études de cas (outils/etudes.js)
etudes/                   études de cas chiffrées (etudes.js) et leurs images
```

Le fichier `geneaddict.json` est lisible et modifiable à la main ; s'il change pendant que
l'application est ouverte (autre ordinateur via OneDrive, édition manuelle…), il est rechargé
quand la fenêtre reprend le focus.

Tests : `npm test` (parseur), `npm run test:navigateur` (parcours complet dans Chrome,
nécessite `npm install`).

## Études de cas

Le contenu est **chiffré** dans `etudes/etudes.js` : le mot de passe sert de clé, il n'est écrit
nulle part, et sans lui le texte est illisible, même en lisant le code ou le dépôt GitHub.
Les images sont dans `etudes/<année>/img/` (non chiffrées).

Pour modifier une année ou y ajouter les réponses (Node 18 ou plus) :

```sh
node outils/etudes.js extraire 2023 <mot de passe des solutions>   # recrée etudes/sources/2023.json
# … modifier etudes/sources/2023.json : champ "solution" de chaque défi, en HTML …
node outils/etudes.js chiffrer etudes/sources/2023.json              # met à jour etudes/etudes.js
```

Dans le fichier source, chaque élément de `defis` est un défi (`texte`, `solution`, `bonus: true`
pour une question bonus non numérotée), un `intertitre` ou une `note` intercalée. `defisSolution`
remplace la liste en mode correction quand les questions y diffèrent, et `annexeSolution`
(titre + galerie d'images légendées) n'apparaît qu'en correction. `theme.accent` donne la couleur
de l'année ; les images `motif.jpg` et `bandeau.jpg` du dossier de l'année font le décor.

### Réponses des participants (Supabase)

Avec le mot de passe des énoncés, chaque défi a une zone de réponse (brouillon gardé dans le
navigateur ; une fois validée par Entrée ou en cliquant ailleurs, la réponse est masquée sous des
points et ne se réaffiche qu’avec le petit œil, contre la copie des voisins). Le bouton « Envoyer mes réponses » les enregistre dans une table Supabase, une ligne
par réponse remplie ; une fois l'envoi réussi, les cases, les brouillons et le nom sont vidés (en cas
d'échec, tout reste en place). Mise en place : voir [docs/SUPABASE.md](docs/SUPABASE.md) (script SQL
`docs/supabase.sql`, puis URL du projet et clé publique dans `etudes/supabase.js`). Tant que ce
fichier n'est pas rempli, le bouton reste grisé.

`etudes/sources/` contient le texte en clair (réponses comprises) : il est exclu de git.
Pour une nouvelle année, copier un fichier source, changer `annee` et `motsDePasse`,
déposer les images dans `etudes/<année>/img/`, puis `chiffrer`.

Le chiffrement empêche de lire les réponses dans le code, mais un mot de passe court comme
« 2023 » se devine : c'est une porte fermée pour une séance, pas un coffre-fort.

## Mettre le site en ligne (GitHub Pages)

L'application peut aussi être servie par GitHub Pages, sans rien changer au code. Les données,
elles, ne vont jamais sur GitHub : elles restent dans le dossier choisi sur l'ordinateur
(ou dans le navigateur).

GitHub Pages n'est gratuit que pour un **dépôt public** (ou avec un abonnement GitHub Pro) :
le code de l'application devient alors visible de tous, pas vos données.

1. *Settings → General → Danger Zone → Change visibility → Public* (si besoin).
2. *Settings → Pages → Build and deployment* : *Source* = **Deploy from a branch**,
   branche **main**, dossier **/ (root)**, *Save*.
3. Après une minute, le site est en ligne à l'adresse `https://<compte>.github.io/GENEAddict_v3/`.

Ouvert depuis cette adresse ou depuis `index.html`, le navigateur considère qu'il s'agit de deux
sites différents : la copie gardée dans le navigateur n'est pas partagée, mais il suffit de
choisir le **même dossier** dans les deux cas pour retrouver la même base.

## Pistes pour la suite

- Arbres : import GEDCOM et lien entre actes et individus.
- Import des dépouillements de l'ancienne table `recherches`.
- Saisie par balises des centres et des dépouillements.
- Catégories de centres modifiables depuis l'interface.
- Pièces jointes (photos d'actes) rangées dans le dossier de la base.

## Crédits

Carte des départements : [@svg-maps/france.departments](https://github.com/VictorCazanave/svg-maps)
par Victor Cazanave, licence CC BY 4.0. Départements d'outre-mer : IGN Admin Express (Licence
ouverte Etalab), via [france-geojson](https://github.com/gregoiredavid/france-geojson).
