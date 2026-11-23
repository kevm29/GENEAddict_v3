# Format de la saisie rapide

GENEAddict accepte deux façons d'écrire des actes sans passer par un formulaire.
On peut les **coller** dans l'écran *Saisie rapide*, **ouvrir** un fichier, le **glisser-déposer**,
ou le **déposer dans le dossier `a-importer/`** de la base : il apparaît alors en haut de l'écran.

Avant tout ajout, un **aperçu** montre comment chaque acte a été compris, signale les erreurs,
et décoche les **doublons probables** (même cote, même date, même premier nom, même type).

---

## 1. Texte à balises

Un acte par paragraphe. Les paragraphes sont séparés par une **ligne vide** (ou une ligne `---`).
Chaque ligne commence par une balise `@nom` suivie de la valeur.

```text
@centre CARAN
@date 02/06/1642
@type Procuration et acte de décès
@personne Gentien de MARIGNER
@notaire REGNAULT
@cote ET/LXXXV/366
@statut obtenu
@note Voir aussi la liasse suivante,
peut-être un inventaire après décès.

@centre 35
@date vers 1712
@type Contrat de mariage
@personne Jean MURET & Anne LE GALL
@cote 4 E 1234
```

On peut aussi écrire `Date : 02/06/1642` au lieu de `@date 02/06/1642` (pratique quand on
recopie des notes). Les lignes qui commencent par `#` sont des commentaires.

### Balises reconnues

| Balise | Autres noms acceptés | Contenu |
|---|---|---|
| `@centre` | `@archives`, `@dep`, `@service` | le code du centre (`CARAN`, `AN-PIERREFITTE`, `SHD-CAEN`, `AM-BREST`, `BNF-RICHELIEU`…), un numéro de département (`35`), ou sigle + site (`SHD Caen`, `AN Pierrefitte`, `AM Brest`). Un centre inconnu peut être créé automatiquement. |
| `@date` | | `02/06/1642` · `2.6.1642` · `??/06/1642` · `06/1642` · `1642` · `1642-06-02` · `2 juin 1642` · `1er juin 1642` · `vers 1650` · `1650-1660` |
| `@jour` `@mois` `@annee` | | si l'on préfère séparer la date |
| `@type` | `@acte`, `@nature` | Procuration, CM, IAD, Testament… |
| `@personne` | `@personnes`, `@parties`, `@temoins` | `Prénom NOM`. Répétable, ou plusieurs séparées par `&`. |
| `@nom` / `@prenom` | `@n1` `@p1` `@n2` `@p2` | variante en champs séparés |
| `@notaire` | `@me`, `@etude` | « Me » devant le nom est retiré automatiquement |
| `@ville` | `@lieu`, `@paroisse` | |
| `@cote` | `@ref` | |
| `@statut` | `@etat` | `à chercher` (C) · `demandé` / `en attente` (A) · `obtenu` (O) · `perdu` / `détruit` (P) |
| `@description` | `@objet`, `@resume` | résumé court affiché dans les listes |
| `@note` | `@notes`, `@annotation`, `@remarque` | annotations ; **les lignes suivantes sans balise s'y ajoutent** |
| `@transcription` | `@texte` | idem, sur plusieurs lignes |
| `@tags` | `@etiquettes` | séparées par des virgules |

### Vos propres balises

Toute balise qui n'est pas dans le tableau ci-dessus est **gardée telle quelle** comme
*champ personnalisé* du document : pas besoin de la déclarer, ni de me la demander.

```text
@date 1700
@type Baptême
@personne Jean MURET
@parrain Yves KERBRAT
@marraine Anne LE GALL
@source Registre BMS de Saint-Germain, vue 12
@lieu-inhumation cimetière de l'Est
```

- le nom d'une balise s'écrit **d'un seul mot** : lettres, chiffres et tirets
  (`@lieu-inhumation`, pas `@lieu inhumation`) ; accents et majuscules sont simplifiés
  (`@Témoin-Mariage` devient `@temoin-mariage`) ;
- comme `@note`, les lignes suivantes sans balise s'ajoutent à la valeur ;
- l'aperçu signale chaque **nouvelle** balise, pour repérer une faute de frappe
  (`@parain` au lieu de `@parrain`) avant d'ajouter ;
- les champs personnalisés apparaissent dans la fiche du document (modifiables, et on peut en
  ajouter à la main), dans la recherche, dans l'export CSV et sur la fiche imprimée ;
- dans **Ma base → Balises personnalisées**, on peut donner une description à une balise, ou en
  déclarer une à l'avance pour qu'elle soit proposée dans les suggestions.

Attention : quelques mots sont déjà des **synonymes** de balises de base et ne créent donc pas de
champ personnalisé : `@lieu` (= `@ville`), `@temoins` (= `@personne`), `@objet` (= `@description`)…
La liste complète est dans la colonne « Autres noms acceptés ».

### Suggestions à la frappe

En tapant `@` en début de ligne, la liste des balises s'affiche (balises de base, puis les
vôtres en vert) et se filtre à mesure que l'on tape. Après une balise, des valeurs sont
proposées : les centres pour `@centre` (par code ou par nom : taper `caen` propose `SHD-CAEN`),
les statuts, et les valeurs déjà présentes dans la base pour `@type`, `@notaire`, `@ville`,
`@personne`, `@tags` et les balises personnalisées.

<kbd>↑</kbd> <kbd>↓</kbd> pour choisir · <kbd>Entrée</kbd> ou <kbd>Tab</kbd> pour valider ·
<kbd>Échap</kbd> pour fermer.

### Valeurs communes à plusieurs actes

Un paragraphe qui commence par `@par-defaut` (ou `@pour-tous`) donne des valeurs appliquées
à tous les actes **qui suivent** et qui ne précisent pas ce champ :

```text
@par-defaut
@centre CARAN
@notaire GALLOIS
@statut à chercher

@date 05/01/1656
@type Procuration
@personne Gentien de MARIGNER
@cote ET/CIII/12

@date 06/01/1656
@type IAD
@personne Anne PATU
@cote ET/CIII/12
```

### Noms et prénoms

Le **nom de famille s'écrit en MAJUSCULES** ; les particules qui le précèdent (de, du, d', le, la…)
y sont rattachées :

| Saisie | Prénom | Nom |
|---|---|---|
| `Gentien de MARIGNER` | Gentien | de MARIGNER |
| `Hélène Angélique de MARIGNER` | Hélène Angélique | de MARIGNER |
| `MARIGNER Gentien` | Gentien | MARIGNER |
| `MARIGNER, Gentien` | Gentien | MARIGNER |
| `Pierre Mesmyn` (sans majuscules) | Pierre | Mesmyn (dernier mot) |

---

## 2. Tableau

Sélectionnez des cellules dans **Excel / LibreOffice / Google Sheets**, copiez, collez : c'est tout.
Un fichier **CSV** fonctionne aussi (séparateur `;`, `,`, `|` ou tabulation, détecté automatiquement).

La **première ligne** donne le nom des colonnes ; on peut utiliser les mêmes noms que les balises
(sans `@`), dans n'importe quel ordre, en majuscules ou minuscules, avec ou sans accents :

```text
date        type                     personnes               notaire   cote            statut     centre
05/10/1654  Inventaire après décès   Hélène FLEURY           PLISSON   ET/XXXIII/54    à chercher CARAN
01/05/1657  Procuration              Roger de LA TOURNELLE   JEHAN     ET/XXXVIII/656  demandé    CARAN
```

Les colonnes inconnues deviennent des **champs personnalisés** (et sont signalées). **Sans ligne d'en-tête**, les colonnes sont
lues dans cet ordre : `date`, `type`, `personnes`, `notaire`, `cote`, `description`.

### Reprendre l'ancienne base (WampServer / MySQL)

L'export CSV de la table `docs` de l'ancien site, fait depuis phpMyAdmin avec les noms de colonnes
en première ligne, est reconnu tel quel :

```text
"id";"jour";"mois";"annee";"type";"p1";"n1";"p2";"n2";"ville";"notaire";"cote";"dep";"description";"statut";"trad"
"1";"00";"04";"1687";"cm";"Pierre";"MESMYN";"Marie Louise Gillonne";"DESBORDES";"Paris";"Guillaume TARDIVEAU";"ET/CXIX";"CARAN";"à Paris";"C";""
```

`00` signifie « inconnu » pour le jour ou le mois, `dep` est rattaché au bon centre
(`35` → AD 35, `CARAN`, `ANOM`, `SHD_Vincennes`, `ITS`…), et les statuts `C`, `A`, `O`, `P`
sont convertis.

---

## Fichiers d'exemple

Le dossier [`exemples/`](../exemples) contient un fichier de chaque sorte, prêts à être ouverts
dans la saisie rapide ou déposés dans `a-importer/`.
