/* GENEAddict — centres d'archives : carte des départements, catalogue par catégorie, fiche d'un centre. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;
  var vueCarte = null;      // zoom / position de la carte, gardés d'un affichage à l'autre

  function nomCategorie(code) {
    var c = U.categories().find(function (x) { return x.code === code; });
    return c ? c.nom : code;
  }

  function compteParCentre() {
    var r = {};
    D.etat.data.documents.forEach(function (d) {
      var c = r[d.centreId] || (r[d.centreId] = { total: 0, chercher: 0, demande: 0, obtenu: 0, perdu: 0 });
      c.total++; c[d.statut]++;
    });
    return r;
  }

  function ficheCentre(c, comptes) {
    var n = comptes[c.id] || { total: 0, chercher: 0, demande: 0, obtenu: 0, perdu: 0 };
    var deps = D.etat.data.depouillements.filter(function (x) { return x.centreId === c.id; });
    var url = U.urlSure(c.url), entr = U.urlSure(c.entraide);
    var titre = c.categorie === 'AD' ? 'Archives départementales' : U.titreGroupe(c);
    var sousTitre = c.categorie === 'AD' ? c.dep + ' — ' + c.site : [c.site, c.detail].filter(Boolean).join(' — ');
    return '<div class="carte fiche-centre">' +
      '<div class="fiche-tete"><div><span class="sur-titre">' + esc(nomCategorie(c.categorie)) + ' · <span class="mono">' + esc(c.code) + '</span></span>' +
      '<h2>' + esc(titre) + '</h2>' + (sousTitre ? '<p class="sous-titre">' + esc(sousTitre) + '</p>' : '') + '</div>' +
      '<button class="btn" data-modifier>Modifier</button></div>' +
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

  function editeCentre(c, apres, preset) {
    var nouveau = !c;
    c = c || Object.assign({ code: '', categorie: 'AUTRE', sigle: '', groupe: '', site: '', detail: '', dep: '', url: '', entraide: '', adresse: '', horaires: '', lecteur: '', notes: '' }, preset || {});
    var groupes = {};
    D.etat.data.centres.forEach(function (x) { if (x.categorie !== 'AD' && x.groupe) groupes[x.groupe] = x; });
    var m = U.ouvreModale(nouveau ? 'Nouveau centre d\'archives' : 'Modifier le centre', '<form class="grille">' +
      '<label>Catégorie<select name="categorie">' + U.categories().map(function (k) {
        return '<option value="' + k.code + '"' + (k.code === c.categorie ? ' selected' : '') + '>' + esc(k.nom) + '</option>'; }).join('') + '</select></label>' +
      '<label>Sigle <small>diminutif affiché : AN, SHD, AM, BnF…</small><input name="sigle" value="' + esc(c.sigle) + '"></label>' +
      '<label class="large">Institution <small>regroupe les sites : Archives nationales, Service historique de la Défense…</small><input name="groupe" list="liste-groupes" required value="' + esc(c.groupe) + '"></label>' +
      '<datalist id="liste-groupes">' + Object.keys(groupes).sort().map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist>' +
      '<label>Site / ville <small>sous-ensemble : Paris, Pierrefitte, Caen…</small><input name="site" value="' + esc(c.site) + '"></label>' +
      '<label>Précision <small>nom officiel, ancien nom…</small><input name="detail" value="' + esc(c.detail) + '"></label>' +
      '<label>Code <small>pour la saisie : @centre CODE</small><input name="code" class="mono" value="' + esc(c.code) + '" placeholder="automatique"></label>' +
      '<label>Département<input name="dep" value="' + esc(c.dep) + '" placeholder="35"></label>' +
      '<label>N° de carte de lecteur<input name="lecteur" value="' + esc(c.lecteur) + '"></label>' +
      '<label>Site internet<input name="url" type="url" value="' + esc(c.url) + '" placeholder="https://"></label>' +
      '<label class="large">Lien d\'entraide<input name="entraide" type="url" value="' + esc(c.entraide) + '"></label>' +
      '<label class="large">Adresse<input name="adresse" value="' + esc(c.adresse) + '"></label>' +
      '<label class="large">Horaires<input name="horaires" value="' + esc(c.horaires) + '"></label>' +
      '<label class="large">Notes<textarea name="notes" rows="4" placeholder="Conditions de consultation, salle, appareil photo autorisé…">' + esc(c.notes) + '</textarea></label>' +
      '<div class="actions large">' + (nouveau ? '' : '<button type="button" class="btn danger gauche" data-suppr>Supprimer</button>') +
      '<button class="btn principal">Enregistrer</button></div></form>', { large: true });
    var f = U.$('form', m);
    // choisir une institution existante reprend son sigle et sa catégorie
    f.elements.groupe.addEventListener('change', function () {
      var g = groupes[f.elements.groupe.value];
      if (g) { if (!f.elements.sigle.value) f.elements.sigle.value = g.sigle; f.elements.categorie.value = g.categorie; }
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {};
      ['categorie', 'sigle', 'groupe', 'site', 'detail', 'code', 'dep', 'url', 'entraide', 'adresse', 'horaires', 'lecteur', 'notes'].forEach(function (k) { v[k] = f.elements[k].value.trim(); });
      if (!v.sigle) v.sigle = v.groupe;
      v.nom = root.GA_INIT.nomComplet(v);
      var autre = v.code && D.etat.data.centres.find(function (x) { return S.cle(x.code) === S.cle(v.code) && x.id !== c.id; });
      if (autre) { U.toast('Le code « ' + v.code + ' » est déjà utilisé par ' + autre.nom + '.', 'erreur'); return; }
      if (!v.code && !nouveau) v.code = c.code;
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
    var rangs = U.centresRanges();
    var onglets = rangs.filter(function (r) { return r.cat.code !== 'AD'; });
    var outreMer = (rangs.find(function (r) { return r.cat.code === 'AD'; }) || { groupes: [{ centres: [] }] }).groupes[0].centres.filter(function (c) { return c.dep.length === 3; });
    if (outreMer.length) onglets.push({ cat: { code: 'OM', nom: 'Outre-mer (AD)' }, groupes: [{ titre: 'Archives départementales d\'outre-mer', centres: outreMer }] });
    var onglet = route.params.onglet || (choisi ? (choisi.categorie === 'AD' ? (choisi.dep.length === 3 ? 'OM' : '') : choisi.categorie) : '') || (onglets[0] && onglets[0].cat.code);
    var avecDocs = D.etat.data.centres.filter(function (c) { return comptes[c.id]; })
      .sort(function (a, b) { return comptes[b.id].chercher - comptes[a.id].chercher || comptes[b.id].total - comptes[a.id].total; });

    function puce(c, libelle) {
      var n = comptes[c.id];
      return '<a class="puce-centre' + (choisi && choisi.id === c.id ? ' actif' : '') + '" href="' + U.lien('archives', [c.id], { onglet: route.params.onglet }) + '" title="' + esc(c.nom) + '">' +
        esc(libelle) + (n ? ' <span class="badge' + (n.chercher ? '' : ' gris') + '">' + (n.chercher || n.total) + '</span>' : '') + '</a>';
    }

    var ongletActif = onglets.find(function (o) { return o.cat.code === onglet; }) || onglets[0];
    racine.innerHTML =
      '<div class="titre-vue"><h1>Centres d\'archives</h1><div class="actions-titre"><button class="btn" data-nouveau>+ Ajouter un centre</button></div></div>' +
      '<div class="archives-grille">' +
      '<div class="carte carte-zone"><div class="zone-carte"></div>' +
      '<p class="legende"><span><span class="leg niv0"></span> aucun document</span><span><span class="leg niv2"></span> documents</span><span><span class="leg a-chercher"></span> actes à chercher</span>' +
      '<span class="discret">Molette ou double-clic : zoomer · glisser : déplacer</span></p></div>' +
      '<div class="cote-droit">' +
      (choisi ? ficheCentre(choisi, comptes) : '<div class="carte"><p>Cliquez sur un département de la carte ou choisissez un centre ci-dessous.</p></div>') +
      (avecDocs.length ? '<div class="carte"><h3>Mes centres en cours</h3><div class="puces">' + avecDocs.map(function (c) { return puce(c, U.libelleCentre(c, true)); }).join('') + '</div></div>' : '') +
      (ongletActif ? '<div class="carte catalogue"><div class="onglets" role="tablist">' + onglets.map(function (o) {
        var nb = o.groupes.reduce(function (s, g) { return s + g.centres.length; }, 0);
        return '<button type="button" role="tab" class="onglet' + (o === ongletActif ? ' actif' : '') + '" data-onglet="' + esc(o.cat.code) + '">' + esc(o.cat.nom) + ' <span class="nb">' + nb + '</span></button>';
      }).join('') + '</div>' +
      ongletActif.groupes.map(function (g) {
        var seul = g.centres.length === 1 && !g.centres[0].site;
        var modele = g.centres[0];
        return '<div class="groupe"><div class="groupe-titre">' +
          (seul ? puce(modele, g.titre) : '<strong>' + esc(g.titre) + '</strong>') +
          (ongletActif.cat.code !== 'OM' ? '<button class="btn-icone" title="Ajouter un site à ce groupe" data-ajout-site="' + esc(modele.id) + '">+</button>' : '') + '</div>' +
          (seul ? '' : '<div class="puces sous">' + g.centres.map(function (c) {
            return puce(c, c.categorie === 'AD' ? c.dep + ' ' + c.site : (c.site || c.groupe));
          }).join('') + '</div>') + '</div>';
      }).join('') + '</div>' : '') +
      '</div></div>';

    root.GA_CARTE_UI.dessine(U.$('.zone-carte', racine), {
      comptes: comptes, choisi: choisi && choisi.id, vue: vueCarte,
      memoriseVue: function (v) { vueCarte = v; },
      clic: function (id) { U.va('archives', [id]); }
    });

    U.on(racine, 'click', '[data-onglet]', function (e, el) {
      U.va('archives', route.args, { onglet: el.dataset.onglet });
    });
    U.on(racine, 'click', '[data-ajout-site]', function (e, el) {
      var m = D.centreParId(el.dataset.ajoutSite);
      editeCentre(null, function (c) { U.va('archives', [c.id]); }, { categorie: m.categorie, sigle: m.sigle, groupe: m.groupe, entraide: '', url: m.url });
    });
    U.$('[data-nouveau]', racine).addEventListener('click', function () {
      var cat = ongletActif && ongletActif.cat.code !== 'OM' ? ongletActif.cat.code : 'AUTRE';
      editeCentre(null, function (c) { U.va('archives', [c.id]); }, { categorie: cat });
    });
    var mod = U.$('[data-modifier]', racine);
    if (mod) mod.addEventListener('click', function () { editeCentre(choisi, function () { root.GA_APP.affiche(); }); });
  }

  root.GA_VUES.archives = { titre: 'Archives', rendu: rendu, compteParCentre: compteParCentre, editeCentre: editeCentre };
})(window);
