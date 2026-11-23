# Recevoir les réponses des études de cas (Supabase)

Sans mot de passe « …Solution », chaque défi d'une étude de cas a une zone de réponse.
Les participants indiquent leur nom (ou celui de leur équipe) et cliquent sur
**« Envoyer mes réponses »** : une ligne par réponse arrive dans une table Supabase,
que vous consultez depuis votre tableau de bord.

Tant que l'envoi n'est pas configuré, les réponses tapées sont simplement gardées dans le
navigateur de chacun : elles ne sont pas perdues en changeant de TP ou en rechargeant la page.

---

## 1. Créer le projet (une seule fois, ~5 minutes)

1. Créez un compte gratuit sur **https://supabase.com** puis **New project**.
   - *Name* : `geneaddict` (au choix) ;
   - *Database Password* : générez-en un et gardez-le (il ne sert pas à l'application) ;
   - *Region* : choisissez l'Europe (Paris ou Francfort).
2. Attendez une à deux minutes que le projet soit prêt.

## 2. Créer la table

1. Menu de gauche : **SQL Editor** → **New query**.
2. Copiez-collez tout le contenu du fichier [`docs/supabase.sql`](supabase.sql), puis **Run**.
3. Vérifiez dans **Table Editor** qu'une table `reponses_etudes` est apparue (vide).

Le script :

- crée la table `reponses_etudes` (année, TP, numéro du défi, question, nom, réponse, date de réception) ;
- active la sécurité au niveau des lignes (*Row Level Security*) avec **une seule règle** :
  les visiteurs anonymes peuvent **ajouter** des réponses, rien d'autre — ils ne peuvent ni lire
  les réponses des autres, ni les modifier, ni les effacer ;
- crée une vue `reponses_etudes_dernieres` qui ne garde que la dernière version de chaque
  réponse (un participant peut corriger et renvoyer).

## 3. Récupérer l'adresse et la clé publique

Dans **Project Settings** (roue dentée) → **API Keys** (et **Data API** pour l'adresse) :

| Ce qu'il faut copier | À quoi ça ressemble |
|---|---|
| **Project URL** | `https://abcdefghijklmnop.supabase.co` |
| **Publishable key** | `sb_publishable_…` (sur un ancien projet : la clé **anon**, qui commence par `eyJ…`) |

⚠️ Ne copiez **jamais** la clé secrète (`sb_secret_…` ou `service_role`) : elle donne tous les droits.
La clé publique, elle, peut être visible dans la page sans risque : la règle ci-dessus limite
ce qu'elle permet à l'ajout de réponses.

## 4. Brancher GENEAddict

Ouvrez le fichier **`etudes/supabase.js`** et remplissez les deux valeurs :

```js
window.GA_SUPABASE = {
  url: 'https://abcdefghijklmnop.supabase.co',
  cle: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxx_xxxxxxxx',
  table: 'reponses_etudes'
};
```

(ou envoyez-moi simplement l'adresse et la clé publique, je m'en occupe).

Pour vérifier : ouvrez une étude avec le mot de passe des énoncés, tapez une réponse, votre nom,
puis **Envoyer** — la ligne doit apparaître dans **Table Editor → reponses_etudes**.

## 5. Lire les réponses

- **Table Editor → reponses_etudes** : toutes les réponses, triables et filtrables
  (par `annee`, `tp`, `participant`…), exportables en CSV (bouton *Export*).
- **Table Editor → reponses_etudes_dernieres** : seulement la dernière version de chaque réponse.
- Ou dans **SQL Editor**, par exemple pour un TP :

```sql
select participant, defi, reponse, recu_le
from reponses_etudes_dernieres
where annee = '2025' and tp = 'tp3'
order by participant, defi;
```

`defi` est le numéro du défi tel qu'il apparaît dans l'énoncé (0 pour une question bonus) ;
la colonne `question` rappelle son texte.

Pour repartir de zéro avant une nouvelle séance :

```sql
delete from reponses_etudes where annee = '2025';
```

## Bon à savoir

- Sur l'offre gratuite, Supabase **met en pause un projet inactif** (au bout d'environ une semaine
  sans requête). Avant une séance, ouvrez le tableau de bord : s'il est en pause, cliquez sur
  *Restore project* (une à deux minutes).
- Un projet en pause se **réactive d'un clic pendant 1 an** (90 jours selon les anciennes règles,
  certaines pages de Supabase le disent encore). Passé ce délai, il ne se relance plus : il faut
  télécharger la sauvegarde proposée sur la page du projet et la restaurer dans un nouveau projet
  (puis changer l'URL et la clé dans `etudes/supabase.js`). L'offre gratuite n'a pas de sauvegardes
  automatiques : **exportez la table en CSV après chaque séance**.
- Chaque envoi ajoute des lignes : si un participant renvoie après correction, l'ancienne
  version reste visible dans la table ; la vue `reponses_etudes_dernieres` ne montre que la plus récente.
- Rien n'empêche un participant de taper le nom de quelqu'un d'autre : c'est un outil de séance,
  pas un examen surveillé.
- Les longueurs sont limitées par la table (100 caractères pour le nom, 5 000 par réponse).
