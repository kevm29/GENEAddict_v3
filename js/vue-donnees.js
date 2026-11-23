/* GENEAddict — « Ma base » : où sont les données, export, restauration. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, esc = U.esc;

  function rendu(racine) {
    var e = D.etat, d = e.data;
    var taille = new Blob([JSON.stringify(d)]).size;
    var perso = D.balisesPerso(), usages = {};
    d.documents.forEach(function (doc) { Object.keys(doc.champs || {}).forEach(function (k) { usages[k] = (usages[k] || 0) + 1; }); });
    var etatTxt;
    if (e.mode === 'dossier' && !e.aReconnecter) {
      etatTxt = '<p class="txt-obtenu"><strong>Enregistrement automatique actif</strong> dans le dossier « ' + esc(e.nomDossier) + ' ».</p>' +
        '<pre class="arbo">' + esc(e.nomDossier) + '/\n├── geneaddict.json        ← votre base (réécrite à chaque modification)\n├── sauvegardes/           ← une copie par jour, 30 jours gardés\n└── a-importer/            ← déposez ici vos fichiers .txt / .csv\n    └── importes/          ← les fichiers déjà importés y sont rangés</pre>';
    } else if (e.mode === 'dossier') {
      etatTxt = '<p class="txt-demande"><strong>Dossier « ' + esc(e.nomDossier) + ' » à reconnecter.</strong> Le navigateur redemande l\'autorisation à chaque session.</p>';
    } else {
      etatTxt = '<p class="txt-demande"><strong>Copie dans le navigateur uniquement.</strong> ' +
        (D.dossierPossible ? 'Choisissez un dossier pour enregistrer la base dans un fichier.' : 'Ce navigateur ne permet pas l\'écriture dans un dossier : exportez régulièrement, ou utilisez Chrome / Edge.') + '</p>';
    }

    racine.innerHTML = '<div class="titre-vue"><h1>Ma base</h1></div>' +
      '<div class="donnees-grille">' +
      '<div class="carte"><h2>Enregistrement</h2>' + etatTxt +
      '<div class="actions gauche">' +
      (D.dossierPossible ? (e.mode === 'dossier' && e.aReconnecter ? '<button class="btn principal" data-reco>Reconnecter</button>' : '') +
        '<button class="btn' + (e.mode === 'dossier' ? '' : ' principal') + '" data-choisir>' + (e.mode === 'dossier' ? 'Changer de dossier…' : 'Choisir un dossier…') + '</button>' +
        (e.mode === 'dossier' ? '<button class="btn" data-oublier>Ne plus utiliser ce dossier</button>' : '') : '') +
      '</div>' +
      '<p class="discret">En changeant de dossier : s\'il contient déjà un geneaddict.json, c\'est cette base qui s\'ouvre ; sinon la base actuelle y est copiée.</p></div>' +
      '<div class="carte"><h2>Contenu</h2><ul class="chiffres">' +
      '<li><b>' + d.documents.length + '</b> documents</li><li><b>' + d.centres.length + '</b> centres</li>' +
      '<li><b>' + d.depouillements.length + '</b> dépouillements</li><li><b>' + d.liens.length + '</b> liens</li>' +
      '<li><b>' + (taille / 1024).toFixed(0) + ' Ko</b> au total</li></ul>' +
      '<p class="discret">Base créée le ' + esc(U.dateCourte(d.cree)) + ', modifiée le ' + esc(U.dateCourte(d.modifie)) + '.</p></div>' +
      '<div class="carte"><h2>Exporter</h2><p>Une copie complète (à garder en lieu sûr ou pour l\'ouvrir sur un autre ordinateur), ou les documents en tableau pour Excel.</p>' +
      '<div class="actions gauche"><button class="btn" data-json>Exporter la base (.json)</button><button class="btn" data-csv>Exporter les documents (.csv)</button></div></div>' +
      '<div class="carte"><h2>Restaurer / repartir de zéro</h2><p>Remplace toute la base actuelle par un fichier geneaddict.json (une sauvegarde par exemple).</p>' +
      '<div class="actions gauche"><label class="btn">Restaurer depuis un fichier…<input type="file" accept=".json,application/json" hidden data-restaurer></label>' +
      '<button class="btn danger" data-vide>Nouvelle base vide</button></div></div>' +
      '<div class="carte large balises-perso"><h2>Balises personnalisées</h2>' +
      '<p>En plus des balises de base, vous pouvez écrire <strong>n\'importe quelle balise</strong> dans la saisie rapide (<code>@parrain</code>, <code>@source</code>, <code>@lieu-inhumation</code>…) : elle est gardée comme champ du document, sans rien déclarer. ' +
      'Déclarez-la ici pour lui donner une description et la voir proposée dans les suggestions avant même de l\'avoir utilisée.</p>' +
      '<table class="table-balises"><thead><tr><th>Balise</th><th>Description</th><th>Utilisée dans</th><th></th></tr></thead><tbody>' +
      (perso.length ? perso.map(function (b) {
        var declaree = d.balises.some(function (x) { return x.nom === b.nom; });
        return '<tr data-nom="' + esc(b.nom) + '"><td class="mono">@' + esc(b.nom) + '</td>' +
          '<td><input value="' + esc(b.description || '') + '" placeholder="description…" data-desc></td>' +
          '<td>' + (usages[b.nom] || 0) + ' document' + ((usages[b.nom] || 0) > 1 ? 's' : '') + '</td>' +
          '<td>' + (declaree && !usages[b.nom] ? '<button class="btn-icone" data-suppr-balise title="Retirer">✕</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="discret">Aucune pour l\'instant.</td></tr>') +
      '</tbody></table>' +
      '<form class="ajout-balise"><span class="mono">@</span><input name="nom" placeholder="nom-de-la-balise" required>' +
      '<input name="description" placeholder="Description (facultatif)"><button class="btn">Déclarer</button></form></div>' +
      '<div class="carte large"><h2>Reprendre les données de l\'ancien site (WampServer)</h2><ol>' +
      '<li>Démarrez une dernière fois WampServer et ouvrez phpMyAdmin, base <code>docach</code>.</li>' +
      '<li>Table <code>docs</code> → onglet <em>Exporter</em> → format <em>CSV</em>, en cochant « Afficher les noms de colonnes en première ligne ».</li>' +
      '<li>Ouvrez le fichier dans la <a href="#/saisie">Saisie rapide</a> (bouton « Ouvrir un fichier… » ou glisser-déposer) : les colonnes jour, mois, annee, p1, n1, p2, n2, dep, statut… sont reconnues, la colonne <code>dep</code> est rattachée au bon centre (35 → AD 35, CARAN…).</li>' +
      '<li>Pour les liens, exportez de même la table <code>liens</code> et ajoutez-les depuis l\'écran Liens.</li></ol></div>' +
      '</div>';

    function erreur(err) { if (err && err.name !== 'AbortError') U.toast(err.message || String(err), 'erreur'); }
    var b;
    if ((b = U.$('[data-choisir]', racine))) b.addEventListener('click', function () { D.choisirDossier().then(function () { U.toast('Base reliée à « ' + D.etat.nomDossier + ' ».', 'ok'); }, erreur); });
    if ((b = U.$('[data-reco]', racine))) b.addEventListener('click', function () { D.reconnecter().catch(erreur); });
    if ((b = U.$('[data-oublier]', racine))) b.addEventListener('click', function () {
      U.confirme('La base restera dans ce navigateur et le fichier ne sera plus mis à jour. Continuer ?', 'Continuer').then(function (ok) { if (ok) D.oublierDossier(); });
    });
    U.$('.ajout-balise', racine).addEventListener('submit', function (ev) {
      ev.preventDefault();
      try {
        var nom = D.declareBalise({ nom: ev.target.elements.nom.value, description: ev.target.elements.description.value.trim() });
        U.toast('Balise @' + nom + ' déclarée.', 'ok');
        root.GA_APP.affiche();
      } catch (err) { U.toast(err.message, 'erreur'); }
    });
    U.on(racine, 'change', '[data-desc]', function (ev, el) {
      D.declareBalise({ nom: el.closest('tr').dataset.nom, description: el.value.trim() });
      U.toast('Description enregistrée.', 'ok');
    });
    U.on(racine, 'click', '[data-suppr-balise]', function (ev, el) {
      D.supprimeBalise(el.closest('tr').dataset.nom);
      root.GA_APP.affiche();
    });
    U.$('[data-json]', racine).addEventListener('click', D.exporteJSON);
    U.$('[data-csv]', racine).addEventListener('click', D.exporteCSV);
    U.$('[data-restaurer]', racine).addEventListener('change', function (ev) {
      var f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      U.confirme('Remplacer toute la base actuelle par « ' + f.name + ' » ?', 'Remplacer', true).then(function (ok) {
        if (!ok) return;
        f.text().then(function (t) { D.remplaceBase(t); U.toast('Base restaurée.', 'ok'); }).catch(erreur);
      });
    });
    U.$('[data-vide]', racine).addEventListener('click', function () {
      U.confirme('Effacer tous les documents, dépouillements et réglages ? (Pensez à exporter avant.)', 'Tout effacer', true).then(function (ok) {
        if (ok) { D.nouvelleBase(); U.toast('Nouvelle base créée.'); }
      });
    });
  }

  root.GA_VUES.donnees = { titre: 'Ma base', rendu: rendu };
})(window);
