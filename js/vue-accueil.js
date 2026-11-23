/* GENEAddict — tableau de bord. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;

  function bandeauStockage() {
    var e = D.etat;
    if (e.mode === 'dossier' && !e.aReconnecter) return '';
    if (e.mode === 'dossier' && e.aReconnecter) {
      return '<div class="carte bandeau alerte"><div><h2>Reprendre avec le dossier « ' + esc(e.nomDossier) + ' »</h2>' +
        '<p>Par sécurité, le navigateur redemande l\'autorisation d\'écrire dans votre dossier à chaque nouvelle session.</p></div>' +
        '<button class="btn principal" data-dossier>Autoriser et ouvrir</button></div>';
    }
    if (!D.dossierPossible) {
      return '<div class="carte bandeau alerte"><div><h2>Vos données restent dans ce navigateur</h2>' +
        '<p>Ce navigateur ne sait pas écrire directement dans un fichier. Pour un enregistrement automatique dans un dossier, ouvrez GENEAddict avec <strong>Chrome</strong> ou <strong>Edge</strong>. Sinon, pensez à <a href="#/donnees">exporter votre base</a> régulièrement.</p></div></div>';
    }
    return '<div class="carte bandeau"><div><h2>Où ranger votre base ?</h2>' +
      '<p>Choisissez un dossier (par exemple <em>Documents/Généalogie</em>, ou un dossier OneDrive / Dropbox pour l\'avoir sur plusieurs ordinateurs). ' +
      'GENEAddict y enregistrera automatiquement <code>geneaddict.json</code> à chaque modification, une sauvegarde par jour dans <code>sauvegardes/</code>, ' +
      'et lira les fichiers texte que vous déposerez dans <code>a-importer/</code>.</p>' +
      '<p class="discret">Si le dossier contient déjà un geneaddict.json, c\'est lui qui sera ouvert.</p></div>' +
      '<button class="btn principal" data-dossier>Choisir le dossier de ma base</button></div>';
  }

  function rendu(racine) {
    var data = D.etat.data;
    var docs = data.documents;
    var nb = { chercher: 0, demande: 0, obtenu: 0, perdu: 0 };
    docs.forEach(function (d) { nb[d.statut]++; });
    var comptes = root.GA_VUES.archives.compteParCentre();
    var centres = data.centres.filter(function (c) { return comptes[c.id] && (comptes[c.id].chercher || comptes[c.id].demande); })
      .sort(function (a, b) { return comptes[b.id].chercher - comptes[a.id].chercher; }).slice(0, 8);
    var recents = docs.slice().sort(function (a, b) { return b.modifie.localeCompare(a.modifie); }).slice(0, 6);
    var deps = data.depouillements.filter(function (x) { return x.statut === 'encours'; }).slice(0, 6);

    racine.innerHTML = bandeauStockage() +
      '<div class="titre-vue"><h1>Bonjour</h1><div class="actions-titre"><a class="btn principal" href="#/saisie">✎ Saisie rapide</a></div></div>' +
      '<div class="stats">' + Object.keys(S.STATUTS).map(function (k) {
        return '<a class="stat statut-' + k + '" href="' + U.lien('documents', [], { statut: k }) + '"><b>' + nb[k] + '</b>' + esc(S.STATUTS[k].libelle) + '</a>';
      }).join('') + '</div>' +
      '<div class="accueil-grille">' +
      '<div class="carte"><h2>À chercher et en attente, par centre</h2>' +
      (centres.length ? '<ul class="liste-centres">' + centres.map(function (c) {
        var n = comptes[c.id];
        return '<li><a href="#/archives/' + encodeURIComponent(c.id) + '">' + esc(c.nom) + '</a>' +
          (n.chercher ? '<span class="txt-chercher">' + n.chercher + ' à chercher</span>' : '') + (n.demande ? '<span class="txt-demande">' + n.demande + ' demandé' + (n.demande > 1 ? 's' : '') + '</span>' : '') +
          '<a class="btn petit" href="' + U.lien('fiche', [], { centre: c.id }) + '" title="Fiche de consultation">🖨</a></li>';
      }).join('') + '</ul>' : '<p class="discret">Rien en attente. Ajoutez des actes depuis la <a href="#/saisie">saisie rapide</a>.</p>') + '</div>' +
      '<div class="carte"><h2>Dépouillements en cours</h2>' +
      (deps.length ? '<ul class="liste-deps">' + deps.map(function (x) {
        var c = D.centreParId(x.centreId), pct = x.pagesTotal ? Math.round(100 * x.pagesFaites / x.pagesTotal) : 0;
        return '<li><a href="#/depouillements">' + esc(x.titre) + '</a> <span class="discret">' + esc(U.libelleCentre(c, true)) + '</span>' +
          '<span class="progression"><span style="width:' + pct + '%"></span></span>' + (x.pagesTotal ? pct + ' %' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="discret">Aucun. Suivez la lecture d\'un registre ou d\'une étude notariale dans <a href="#/depouillements">Dépouillements</a>.</p>') + '</div>' +
      '<div class="carte large"><h2>Derniers documents modifiés</h2>' +
      (recents.length ? '<ul class="liste-recents">' + recents.map(function (d) {
        return '<li><a href="' + U.lien('documents', [], { ouvrir: d.id }) + '">' + esc(S.formatDate(d) || 's.d.') + ' · ' + esc(d.type || 'Acte') + ' · ' +
          U.personnesHTML(d.personnes) + '</a> ' + U.pastilleStatut(d.statut) + ' <span class="discret">' + esc(U.dateCourte(d.modifie)) + '</span></li>';
      }).join('') + '</ul>' : '<p class="discret">Votre base est vide pour l\'instant.</p>') + '</div>' +
      '</div>';

    var b = U.$('[data-dossier]', racine);
    if (b) b.addEventListener('click', root.GA_APP.actionDossier);
  }

  root.GA_VUES.accueil = { titre: 'Accueil', rendu: rendu };
})(window);
