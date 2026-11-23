/* GENEAddict — démarrage, menu, indicateur d'enregistrement. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, V = root.GA_VUES, esc = U.esc;

  var MENU = [
    ['accueil', 'Accueil', '⌂'],
    ['archives', 'Archives', '◉'],
    ['documents', 'Documents', '☰'],
    ['saisie', 'Saisie rapide', '✎'],
    ['depouillements', 'Dépouillements', '▤'],
    ['liens', 'Liens', '↗'],
    ['donnees', 'Ma base', '⛁']
  ];

  function menu() {
    var r = U.routeActuelle();
    var docs = D.etat.data.documents;
    var aChercher = docs.filter(function (d) { return d.statut === 'chercher'; }).length;
    U.$('#menu').innerHTML = MENU.map(function (m) {
      var actif = r.vue === m[0] || (m[0] === 'archives' && r.vue === 'fiche');
      var badge = m[0] === 'documents' && aChercher ? '<span class="badge" title="À chercher">' + aChercher + '</span>' : '';
      return '<a href="#/' + m[0] + '" class="' + (actif ? 'actif' : '') + '"><span class="ico">' + m[2] + '</span>' + esc(m[1]) + badge + '</a>';
    }).join('');
  }

  function indicateur() {
    var e = D.etat, el = U.$('#enregistrement');
    var cls, txt, titre;
    if (e.enregistrement === 'erreur') {
      cls = 'erreur'; txt = 'Erreur d\'enregistrement'; titre = e.erreur;
    } else if (e.mode === 'dossier' && e.aReconnecter) {
      cls = 'alerte'; txt = 'Reconnecter « ' + e.nomDossier + ' »'; titre = 'Cliquez pour autoriser à nouveau l\'écriture dans le dossier.';
    } else if (e.mode === 'dossier') {
      cls = e.enregistrement === 'en-cours' ? 'encours' : 'ok';
      txt = (e.enregistrement === 'en-cours' ? 'Enregistrement… ' : 'Enregistré · ') + e.nomDossier + '/geneaddict.json';
      titre = 'Chaque modification est écrite automatiquement dans ce fichier.';
    } else {
      cls = 'alerte'; txt = 'Copie navigateur uniquement'; titre = 'Choisissez un dossier pour enregistrer la base dans un fichier.';
    }
    el.className = 'enregistrement ' + cls;
    el.title = titre;
    el.innerHTML = '<span class="point"></span>' + esc(txt);
  }

  function affiche() {
    var r = U.routeActuelle();
    var vue = V[r.vue] || V.accueil;
    U.fermeModale();
    menu();
    var racine = U.$('#vue');
    racine.innerHTML = '';
    racine.className = 'vue vue-' + r.vue;
    document.title = (vue.titre ? vue.titre + ' · ' : '') + 'GENEAddict';
    try {
      vue.rendu(racine, r);
    } catch (e) {
      console.error(e);
      racine.innerHTML = '<div class="carte erreur"><h2>Oups</h2><p>' + esc(e.message) + '</p></div>';
    }
  }

  function actionDossier() {
    var e = D.etat;
    var p = e.mode === 'dossier' && e.aReconnecter ? D.reconnecter() : (e.mode === 'dossier' ? null : D.choisirDossier());
    if (!p) { U.va('donnees'); return; }
    p.then(function () {
      U.toast('Base reliée au dossier « ' + D.etat.nomDossier + ' ».', 'ok');
      affiche();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      U.toast(err.message || String(err), 'erreur');
    });
  }

  function demarre() {
    D.ecoute(function (quoi) {
      indicateur();
      if (quoi === 'donnees') affiche();
      if (quoi === 'modif') menu();
    });
    U.$('#enregistrement').addEventListener('click', actionDossier);
    U.$('#recherche-globale').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') U.va('documents', [], { q: e.target.value.trim() });
    });
    root.addEventListener('hashchange', affiche);
    root.addEventListener('focus', function () {
      D.verifieFichierExterne().then(function (change) {
        if (change) U.toast('Le fichier a été modifié ailleurs : base rechargée.', 'info');
      });
    });
    root.addEventListener('beforeunload', function () { D.ecrireMaintenant(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault(); U.$('#recherche-globale').focus();
      }
    });
    D.demarre().then(function () {
      indicateur();
      affiche();
    });
  }

  root.GA_APP = { affiche: affiche, actionDossier: actionDossier, indicateur: indicateur };
  document.addEventListener('DOMContentLoaded', demarre);
})(window);
