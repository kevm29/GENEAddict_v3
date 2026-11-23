/* GENEAddict — fiches imprimables : fiche de consultation d'un centre et fiche d'un acte. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;

  function imprime(html) {
    var z = U.$('#impression');
    z.innerHTML = html;
    document.body.classList.add('imprime');
    var fin = function () { document.body.classList.remove('imprime'); z.innerHTML = ''; root.removeEventListener('afterprint', fin); };
    root.addEventListener('afterprint', fin);
    setTimeout(function () { root.print(); }, 50);
  }

  function compare(a, b) {
    return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
  }

  var TRIS = {
    cote: function (a, b) { return compare(a.cote || '~', b.cote || '~') || compare(D.cleTri(a), D.cleTri(b)); },
    date: function (a, b) { return compare(D.cleTri(a), D.cleTri(b)); },
    notaire: function (a, b) { return compare(a.notaire || '~', b.notaire || '~') || compare(a.cote, b.cote); },
    nom: function (a, b) { var x = a.personnes[0], y = b.personnes[0]; return compare(x ? x.nom : '~', y ? y.nom : '~'); }
  };

  /* Une ligne par document : la cote, puis les informations séparées par des tirets. */
  function ligneDocument(d, o) {
    var infos = [
      esc(S.formatDate(d)),
      esc(d.type),
      U.personnesHTML(d.personnes),
      d.notaire ? 'Me\u00a0' + esc(d.notaire) : '',
      esc(d.ville),
      esc(d.description)
    ].filter(Boolean);
    return '<li><span class="case-vide"></span><div class="ligne-doc">' +
      '<span class="cote">' + (d.cote ? esc(d.cote) : '<em>sans cote</em>') + '</span>' +
      (infos.length ? ' — ' + infos.join(' — ') : '') +
      (o.notes && d.notes ? '<div class="rappel">' + esc(d.notes) + '</div>' : '') + '</div></li>';
  }

  function pageCentre(c, docs, o) {
    var deps = c ? D.etat.data.depouillements.filter(function (x) { return x.centreId === c.id && x.statut !== 'termine'; }) : [];
    var lignesVides = o.vides ? Math.max(0, +o.vides) : 0;
    var infosCentre = c ? [c.adresse, c.horaires].filter(Boolean).join(' · ') : '';
    return '<section class="papier">' +
      '<header class="papier-tete"><div><div class="papier-marque">GENEAddict · fiche de consultation</div>' +
      '<h1>' + esc(c ? c.nom : 'Sans centre') + '</h1>' +
      (infosCentre ? '<p class="papier-infos">' + esc(infosCentre) + '</p>' : '') + '</div>' +
      '<table class="papier-champs"><tr><th>Date de visite</th><td>' + esc(o.dateVisite || '') + '</td></tr>' +
      '<tr><th>N° de lecteur</th><td>' + esc(c && c.lecteur || '') + '</td></tr></table></header>' +
      '<ol class="papier-docs">' + docs.map(function (d) { return ligneDocument(d, o); }).join('') +
      new Array(lignesVides + 1).join('<li class="vide"><span class="case-vide"></span><div class="ligne-doc"></div></li>') + '</ol>' +
      (deps.length ? '<h2>Dépouillements en cours</h2><ul class="papier-deps">' + deps.map(function (x) {
        return '<li>' + [esc(x.titre), x.cote ? '<span class="cote">' + esc(x.cote) + '</span>' : '', esc(x.periode),
          x.pagesTotal ? x.pagesFaites + ' / ' + x.pagesTotal + ' p., reprendre p. ' + (x.pagesFaites + 1) : ''].filter(Boolean).join(' — ') + '</li>';
      }).join('') + '</ul>' : '') +
      (o.cadre ? '<h2>Notes</h2><div class="papier-lignes"></div>' : '') +
      '<footer class="papier-pied">' + docs.length + ' document' + (docs.length > 1 ? 's' : '') + ' · imprimé le ' + esc(new Date().toLocaleDateString('fr-FR')) + '</footer>' +
      '</section>';
  }

  function rendu(racine, route) {
    var p = Object.assign({ statut: 'chercher,demande', tri: 'cote', notes: '0', vides: '0', cadre: '1', date: '' }, route.params);
    var parIds = !!p.ids;

    function documents() {
      var docs;
      if (parIds) {
        var set = {};
        p.ids.split(',').forEach(function (i) { set[i] = 1; });
        docs = D.etat.data.documents.filter(function (d) { return set[d.id]; });
      } else {
        var sts = p.statut.split(',').filter(Boolean);
        docs = D.etat.data.documents.filter(function (d) { return d.centreId === p.centre && sts.indexOf(d.statut) >= 0; });
      }
      var groupes = {};
      docs.forEach(function (d) { (groupes[d.centreId] = groupes[d.centreId] || []).push(d); });
      Object.keys(groupes).forEach(function (k) { groupes[k].sort(TRIS[p.tri] || TRIS.cote); });
      if (!parIds && !groupes[p.centre]) groupes[p.centre] = [];
      return groupes;
    }

    var c = p.centre ? D.centreParId(p.centre) : null;
    racine.innerHTML =
      '<div class="titre-vue ecran-seul"><h1>Fiche de consultation</h1><div class="actions-titre">' +
      (c ? '<a class="btn" href="#/archives/' + encodeURIComponent(c.id) + '">← ' + esc(U.libelleCentre(c, true)) + '</a>' : '<a class="btn" href="#/documents">← Documents</a>') +
      '<button class="btn principal" data-imprimer>🖨 Imprimer</button></div></div>' +
      '<form class="carte options-fiche ecran-seul">' +
      (parIds ? '<span>' + p.ids.split(',').length + ' document(s) sélectionné(s)</span>'
        : '<label>Centre <select name="centre">' + U.optionsCentres(p.centre, '— choisir —') + '</select></label>' +
        '<span class="choix-statuts">' + Object.keys(S.STATUTS).map(function (k) {
          return '<label class="case"><input type="checkbox" name="st" value="' + k + '"' + (p.statut.split(',').indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(S.STATUTS[k].libelle) + '</label>';
        }).join('') + '</span>') +
      '<label>Trier par <select name="tri">' + ['cote', 'date', 'notaire', 'nom'].map(function (k) { return '<option' + (k === p.tri ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label>' +
      '<label>Date de visite <input name="date" type="date" value="' + esc(p.date) + '"></label>' +
      '<label class="case"><input type="checkbox" name="notes"' + (p.notes === '1' ? ' checked' : '') + '> Rappeler mes annotations</label>' +
      '<label>Lignes vides <input name="vides" type="number" min="0" max="30" value="' + esc(p.vides) + '"></label>' +
      '<label class="case"><input type="checkbox" name="cadre"' + (p.cadre === '1' ? ' checked' : '') + '> Cadre de notes</label>' +
      '</form>' +
      '<div class="pages"></div>';

    var pages = U.$('.pages', racine);
    function dessine() {
      var g = documents();
      var dateVisite = p.date ? new Date(p.date + 'T12:00').toLocaleDateString('fr-FR') : '';
      var o = { notes: p.notes === '1', vides: p.vides, cadre: p.cadre === '1', dateVisite: dateVisite };
      if (!parIds && !p.centre) { pages.innerHTML = '<div class="carte">Choisissez un centre.</div>'; return; }
      pages.innerHTML = Object.keys(g).map(function (k) { return pageCentre(D.centreParId(k), g[k], o); }).join('');
    }

    var f = U.$('.options-fiche', racine);
    f.addEventListener('change', function () {
      if (!parIds) {
        p.centre = f.elements.centre.value;
        p.statut = U.$$('[name=st]:checked', f).map(function (x) { return x.value; }).join(',');
      }
      p.tri = f.elements.tri.value; p.date = f.elements.date.value;
      p.notes = f.elements.notes.checked ? '1' : '0'; p.cadre = f.elements.cadre.checked ? '1' : '0';
      p.vides = f.elements.vides.value;
      U.remplaceParams(p);
      dessine();
    });
    U.$('[data-imprimer]', racine).addEventListener('click', function () { imprime(pages.innerHTML); });
    dessine();
  }

  function imprimeDocument(idDoc) {
    var d = D.docParId(idDoc);
    if (!d) return;
    var c = D.centreParId(d.centreId);
    function ligne(t, v, cls) { return v ? '<tr><th>' + t + '</th><td class="' + (cls || '') + '">' + v + '</td></tr>' : ''; }
    imprime('<section class="papier fiche-acte"><header class="papier-tete"><div><div class="papier-marque">GENEAddict · fiche d\'acte</div>' +
      '<h1>' + esc(d.type || 'Acte') + (S.formatDate(d) ? ' — ' + esc(S.formatDate(d)) : '') + '</h1>' +
      '<p class="papier-infos">' + U.personnesHTML(d.personnes) + '</p></div></header>' +
      '<table class="papier-detail">' +
      ligne('Centre', esc(c ? c.nom : '')) + ligne('Cote', esc(d.cote), 'mono') +
      ligne('Notaire', esc(d.notaire ? 'Me ' + d.notaire : '')) + ligne('Lieu', esc(d.ville)) +
      ligne('Statut', esc(S.STATUTS[d.statut].libelle)) + ligne('Description', esc(d.description)) +
      ligne('Étiquettes', esc(d.tags.join(', '))) +
      Object.keys(d.champs || {}).map(function (k) { return ligne(esc(k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, ' ')), esc(d.champs[k])); }).join('') + '</table>' +
      (d.notes ? '<h2>Annotations</h2><div class="papier-texte">' + esc(d.notes) + '</div>' : '') +
      (d.transcription ? '<h2>Transcription</h2><div class="papier-texte">' + esc(d.transcription) + '</div>' : '') +
      '<h2>Notes</h2><div class="papier-lignes"></div>' +
      '<footer class="papier-pied">Imprimé le ' + esc(new Date().toLocaleDateString('fr-FR')) + '</footer></section>');
  }

  root.GA_VUES.fiche = { titre: 'Fiche de consultation', rendu: rendu, imprimeDocument: imprimeDocument, imprime: imprime };
})(window);
