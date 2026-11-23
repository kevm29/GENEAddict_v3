/* GENEAddict — centres d'archives : carte des départements, liste, fiche d'un centre. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;

  var TYPES = { AD: 'Archives départementales', national: 'Archives nationales', AM: 'Archives municipales', autre: 'Autre centre' };

  function compteParCentre() {
    var r = {};
    D.etat.data.documents.forEach(function (d) {
      var c = r[d.centreId] || (r[d.centreId] = { total: 0, chercher: 0, demande: 0, obtenu: 0, perdu: 0 });
      c.total++; c[d.statut]++;
    });
    return r;
  }

  function carte(choisi, comptes) {
    var C = root.GA_CARTE;
    var parDep = {};
    D.etat.data.centres.forEach(function (c) { if (c.type === 'AD') parDep[c.dep] = c; });
    var max = 1;
    Object.keys(comptes).forEach(function (k) { if (comptes[k].total > max) max = comptes[k].total; });
    return '<svg class="carte-france" viewBox="' + C.viewBox + '" role="img" aria-label="Carte des départements">' +
      C.departements.map(function (d) {
        var c = parDep[d.code];
        var n = c && comptes[c.id] ? comptes[c.id] : null;
        var niveau = n ? Math.min(4, 1 + Math.floor(3 * n.total / max)) : 0;
        var cls = 'dep niv' + niveau + (n && n.chercher ? ' a-chercher' : '') + (c && c.id === choisi ? ' choisi' : '');
        var titre = d.code + ' — ' + d.nom + (n ? ' · ' + n.total + ' doc. (' + n.chercher + ' à chercher)' : '');
        return '<path class="' + cls + '" data-centre="' + esc(c ? c.id : '') + '" d="' + d.path + '"><title>' + esc(titre) + '</title></path>';
      }).join('') + '</svg>';
  }

  function ficheCentre(c, comptes) {
    var n = comptes[c.id] || { total: 0, chercher: 0, demande: 0, obtenu: 0, perdu: 0 };
    var deps = D.etat.data.depouillements.filter(function (x) { return x.centreId === c.id; });
    var url = U.urlSure(c.url), entr = U.urlSure(c.entraide);
    return '<div class="carte fiche-centre">' +
      '<div class="fiche-tete"><div><span class="sur-titre">' + esc(TYPES[c.type] || '') + (c.dep ? ' · ' + esc(c.dep) : '') + ' · <span class="mono">' + esc(c.code) + '</span></span>' +
      '<h2>' + esc(c.nom) + '</h2></div><button class="btn" data-modifier>Modifier</button></div>' +
      '<div class="liens-centre">' +
      (url ? '<a class="btn principal" target="_blank" rel="noopener" href="' + esc(url) + '">Aller sur le site des archives ↗</a>' : '<span class="discret">Pas encore d\'adresse de site : cliquez sur « Modifier ».</span>') +
      (entr ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(entr) + '">Entraide FranceGenWeb ↗</a>' : '') +
      '<a class="btn" target="_blank" rel="noopener" href="http://www.entraide-genealogique.net/">Entraide FDA ↗</a></div>' +
      (c.adresse || c.horaires || c.lecteur ? '<dl class="infos">' +
        (c.adresse ? '<dt>Adresse</dt><dd>' + esc(c.adresse) + '</dd>' : '') +
        (c.horaires ? '<dt>Horaires</dt><dd>' + esc(c.horaires) + '</dd>' : '') +
        (c.lecteur ? '<dt>N° de lecteur</dt><dd>' + esc(c.lecteur) + '</dd>' : '') + '</dl>' : '') +
      (c.notes ? '<div class="notes-centre">' + esc(c.notes) + '</div>' : '') +
      '<div class="stats-centre">' + Object.keys(S.STATUTS).map(function (k) {
        return '<a class="stat statut-' + k + '" href="' + U.lien('documents', [], { centre: c.id, statut: k }) + '"><b>' + n[k] + '</b>' + esc(S.STATUTS[k].libelle) + '</a>';
      }).join('') + '</div>' +
      '<div class="actions gauche">' +
      '<a class="btn" href="' + U.lien('documents', [], { centre: c.id }) + '">Voir les ' + n.total + ' document' + (n.total > 1 ? 's' : '') + '</a>' +
      '<a class="btn" href="' + U.lien('saisie', [], { centre: c.id }) + '">✎ Ajouter des actes</a>' +
      '<a class="btn principal" href="' + U.lien('fiche', [], { centre: c.id }) + '">🖨 Fiche de consultation</a></div>' +
      (deps.length ? '<h3>Dépouillements</h3><ul class="liste-deps">' + deps.map(function (x) {
        var pct = x.pagesTotal ? Math.round(100 * x.pagesFaites / x.pagesTotal) : 0;
        return '<li><a href="#/depouillements">' + esc(x.titre) + '</a> <span class="mono">' + esc(x.cote) + '</span> ' + esc(x.periode) +
          ' <span class="progression"><span style="width:' + pct + '%"></span></span> ' + (x.pagesTotal ? x.pagesFaites + '/' + x.pagesTotal + ' p.' : '') + '</li>';
      }).join('') + '</ul>' : '') +
      '</div>';
  }

  function editeCentre(c, apres) {
    var nouveau = !c;
    c = c || { nom: '', code: '', type: 'AM', dep: '', url: '', entraide: '', adresse: '', horaires: '', lecteur: '', notes: '' };
    var m = U.ouvreModale(nouveau ? 'Nouveau centre d\'archives' : 'Modifier le centre', '<form class="grille">' +
      '<label class="large">Nom<input name="nom" required value="' + esc(c.nom) + '"></label>' +
      '<label>Code court <small>utilisé dans la saisie (@centre)</small><input name="code" class="mono" value="' + esc(c.code) + '"></label>' +
      '<label>Type<select name="type">' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (k === c.type ? ' selected' : '') + '>' + TYPES[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Département<input name="dep" value="' + esc(c.dep) + '" placeholder="35"></label>' +
      '<label>N° de carte de lecteur<input name="lecteur" value="' + esc(c.lecteur) + '"></label>' +
      '<label class="large">Site internet<input name="url" type="url" value="' + esc(c.url) + '" placeholder="https://"></label>' +
      '<label class="large">Lien d\'entraide<input name="entraide" type="url" value="' + esc(c.entraide) + '"></label>' +
      '<label class="large">Adresse<input name="adresse" value="' + esc(c.adresse) + '"></label>' +
      '<label class="large">Horaires<input name="horaires" value="' + esc(c.horaires) + '"></label>' +
      '<label class="large">Notes<textarea name="notes" rows="4" placeholder="Conditions de consultation, salle, appareil photo autorisé…">' + esc(c.notes) + '</textarea></label>' +
      '<div class="actions large">' + (nouveau ? '' : '<button type="button" class="btn danger gauche" data-suppr>Supprimer</button>') +
      '<button class="btn principal">Enregistrer</button></div></form>', { large: true });
    var f = U.$('form', m);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {};
      ['nom', 'code', 'type', 'dep', 'url', 'entraide', 'adresse', 'horaires', 'lecteur', 'notes'].forEach(function (k) { v[k] = f.elements[k].value.trim(); });
      var autre = D.etat.data.centres.find(function (x) { return S.cle(x.code) === S.cle(v.code) && x.id !== c.id; });
      if (v.code && autre) { U.toast('Le code « ' + v.code + ' » est déjà utilisé par ' + autre.nom + '.', 'erreur'); return; }
      var res = nouveau ? D.ajouteCentre(v) : (D.majCentre(c.id, v), c);
      U.fermeModale();
      U.toast('Centre enregistré.', 'ok');
      apres(res);
    });
    var sup = U.$('[data-suppr]', m);
    if (sup) sup.addEventListener('click', function () {
      U.confirme('Supprimer le centre « ' + c.nom + ' » ?', 'Supprimer', true).then(function (ok) {
        if (!ok) return;
        try { D.supprimeCentre(c.id); U.toast('Centre supprimé.'); U.va('archives'); }
        catch (err) { U.toast(err.message, 'erreur'); }
      });
    });
  }

  function rendu(racine, route) {
    var comptes = compteParCentre();
    var choisi = route.args[0] ? D.centreParId(route.args[0]) : null;
    var autres = D.etat.data.centres.filter(function (c) { return c.type !== 'AD'; })
      .sort(function (a, b) { return (a.type === 'national' ? 0 : 1) - (b.type === 'national' ? 0 : 1) || a.nom.localeCompare(b.nom, 'fr'); });
    var outreMer = D.etat.data.centres.filter(function (c) { return c.type === 'AD' && c.dep.length === 3; });
    var avecDocs = D.etat.data.centres.filter(function (c) { return comptes[c.id]; })
      .sort(function (a, b) { return comptes[b.id].chercher - comptes[a.id].chercher || comptes[b.id].total - comptes[a.id].total; });

    function puce(c) {
      var n = comptes[c.id];
      return '<a class="puce-centre' + (choisi && choisi.id === c.id ? ' actif' : '') + '" href="#/archives/' + encodeURIComponent(c.id) + '">' +
        esc(c.type === 'AD' ? c.dep + ' ' + c.nom.replace(/^Archives départementales — /, '') : c.nom) +
        (n ? ' <span class="badge' + (n.chercher ? '' : ' gris') + '">' + (n.chercher || n.total) + '</span>' : '') + '</a>';
    }

    racine.innerHTML =
      '<div class="titre-vue"><h1>Centres d\'archives</h1><div class="actions-titre"><button class="btn" data-nouveau>+ Ajouter un centre</button></div></div>' +
      '<div class="archives-grille">' +
      '<div class="carte carte-zone">' + carte(choisi && choisi.id, comptes) +
      '<p class="legende"><span class="leg niv0"></span>aucun document <span class="leg niv2"></span>documents <span class="leg a-chercher"></span>contour : actes à chercher</p></div>' +
      '<div class="cote-droit">' +
      (choisi ? ficheCentre(choisi, comptes) : '<div class="carte"><p>Cliquez sur un département de la carte ou sur un centre ci-dessous.</p></div>') +
      (avecDocs.length ? '<div class="carte"><h3>Mes centres en cours</h3><div class="puces">' + avecDocs.map(puce).join('') + '</div></div>' : '') +
      '<div class="carte"><h3>Centres nationaux et autres</h3><div class="puces">' + autres.map(puce).join('') + '</div>' +
      '<h3>Outre-mer</h3><div class="puces">' + outreMer.map(puce).join('') + '</div></div>' +
      '</div></div>';

    U.on(racine, 'click', 'path.dep', function (e, el) {
      if (el.dataset.centre) U.va('archives', [el.dataset.centre]);
    });
    U.$('[data-nouveau]', racine).addEventListener('click', function () {
      editeCentre(null, function (c) { U.va('archives', [c.id]); });
    });
    var mod = U.$('[data-modifier]', racine);
    if (mod) mod.addEventListener('click', function () { editeCentre(choisi, function () { rendu(racine, route); }); });
  }

  root.GA_VUES.archives = { titre: 'Archives', rendu: rendu, compteParCentre: compteParCentre, editeCentre: editeCentre };
})(window);
