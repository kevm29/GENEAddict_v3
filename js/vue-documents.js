/* GENEAddict — liste des documents (actes) et fiche d'édition. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;
  var LIMITE = 300;

  var TRIS = {
    date: { lib: 'Date', f: function (d) { return D.cleTri(d); } },
    nom: { lib: 'Nom', f: function (d) { var p = d.personnes[0]; return p ? S.cle(p.nom) + ' ' + S.cle(p.prenom) : 'zzzz'; } },
    notaire: { lib: 'Notaire', f: function (d) { return S.cle(d.notaire) || 'zzzz'; } },
    cote: { lib: 'Cote', f: function (d) { return S.cle(d.cote) || 'zzzz'; } },
    type: { lib: 'Type', f: function (d) { return S.cle(d.type) || 'zzzz'; } },
    centre: { lib: 'Centre', f: function (d) { var c = D.centreParId(d.centreId); return c ? (c.categorie === 'AD' ? '1' + c.dep : '0' + U.libelleCentre(c, true)) : 'zzzz'; } },
    modifie: { lib: 'Modifié récemment', f: function (d) { return d.modifie; }, inverse: true }
  };

  function texteRecherche(d) {
    var c = D.centreParId(d.centreId);
    return S.cle([d.type, d.notaire, d.ville, d.cote, d.description, d.notes, d.transcription, d.tags.join(' '), d.dateTexte,
      S.formatDate(d), c ? c.code + ' ' + c.nom + ' ' + U.libelleCentre(c, true) : ''].concat(d.personnes.map(S.formatPersonne))
      .concat(Object.keys(d.champs || {}).map(function (k) { return k + ' ' + d.champs[k]; })).join(' '));
  }

  /* Découpe la recherche en mots à trouver et mots à exclure (précédés d'un tiret : -PG).
   * Les guillemets regroupent plusieurs mots : "Me GALLOIS" ou -"prisonnier de guerre". */
  function lireRecherche(q) {
    var inclus = [], exclus = [];
    var re = /(-?)(?:"([^"]*)"|(\S+))/g, m;
    while ((m = re.exec(String(q || '')))) {
      var k = S.cle(m[2] != null ? m[2] : m[3]);
      if (!k) continue;
      (m[1] ? exclus : inclus).push(k);
    }
    return { inclus: inclus, exclus: exclus };
  }

  /* Filtre commun (liste, fiche de consultation, accueil). */
  function filtre(p) {
    var rech = lireRecherche(p.q);
    var statuts = p.statut ? p.statut.split(',') : null;
    var liste = D.etat.data.documents.filter(function (d) {
      if (p.centre && d.centreId !== p.centre) return false;
      if (statuts && statuts.indexOf(d.statut) < 0) return false;
      if (p.type && S.cle(d.type) !== S.cle(p.type)) return false;
      if (p.de && (!d.annee || +d.annee < +p.de)) return false;
      if (p.a && (!d.annee || +d.annee > +p.a)) return false;
      if (rech.inclus.length || rech.exclus.length) {
        var t = texteRecherche(d);
        return rech.inclus.every(function (m) { return t.indexOf(m) >= 0; }) &&
          !rech.exclus.some(function (m) { return t.indexOf(m) >= 0; });
      }
      return true;
    });
    var tri = TRIS[p.tri] || TRIS.date;
    liste.sort(function (a, b) {
      var x = tri.f(a), y = tri.f(b);
      var r = x < y ? -1 : x > y ? 1 : D.cleTri(a).localeCompare(D.cleTri(b));
      return tri.inverse ? -r : r;
    });
    return liste;
  }

  function typesConnus() {
    var vus = {};
    D.etat.data.documents.forEach(function (d) { if (d.type) vus[d.type] = 1; });
    return Object.keys(vus).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
  }

  function ligne(d, coche) {
    var c = D.centreParId(d.centreId);
    var marques = (d.notes ? '<span title="Annotations">✎</span>' : '') + (d.transcription ? '<span title="Transcription">¶</span>' : '');
    return '<tr data-id="' + esc(d.id) + '" class="st-' + esc(d.statut) + '">' +
      '<td class="col-coche"><input type="checkbox" class="coche"' + (coche ? ' checked' : '') + '></td>' +
      '<td class="col-date">' + esc(S.formatDate(d)) + '</td>' +
      '<td>' + esc(d.type) + '</td>' +
      '<td class="col-pers">' + U.personnesHTML(d.personnes) + (d.description ? '<div class="sous">' + esc(d.description.split('\n')[0]) + '</div>' : '') + '</td>' +
      '<td>' + esc(d.notaire) + (d.ville ? '<div class="sous">' + esc(d.ville) + '</div>' : '') + '</td>' +
      '<td class="col-cote">' + esc(d.cote) + '</td>' +
      '<td class="col-centre" title="' + esc(c ? c.nom : '') + '">' + esc(U.libelleCentre(c, true)) + '</td>' +
      '<td class="col-statut">' + U.selectStatut(d.statut, 'data-statut') + '</td>' +
      '<td class="col-marques">' + marques + '</td></tr>';
  }

  function rendu(racine, route) {
    var p = Object.assign({ tri: 'date' }, route.params);
    var selection = {};
    var max = LIMITE;

    racine.innerHTML =
      '<div class="titre-vue"><h1>Documents</h1><div class="actions-titre">' +
      '<a class="btn" href="#/saisie">✎ Saisie rapide</a>' +
      '<button class="btn principal" data-nouveau>+ Nouveau document</button></div></div>' +
      '<div class="filtres carte">' +
      '<input type="search" name="q" placeholder="Nom, cote, notaire… · -mot pour exclure (ex. -PG)" title="Tous les mots doivent être présents. Un mot précédé d\'un tiret exclut les documents qui le contiennent : -PG. Les guillemets regroupent : &quot;Me GALLOIS&quot;, -&quot;prisonnier de guerre&quot;." value="' + esc(p.q || '') + '">' +
      '<select name="centre">' + U.optionsCentres(p.centre, 'Tous les centres') + '</select>' +
      '<select name="type"><option value="">Tous les types</option>' + typesConnus().map(function (t) {
        return '<option' + (S.cle(t) === S.cle(p.type || '') ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' +
      '<span class="periode"><input name="de" inputmode="numeric" placeholder="de" value="' + esc(p.de || '') + '">–<input name="a" inputmode="numeric" placeholder="à" value="' + esc(p.a || '') + '"></span>' +
      '<select name="tri">' + Object.keys(TRIS).map(function (k) { return '<option value="' + k + '"' + (k === p.tri ? ' selected' : '') + '>Tri : ' + TRIS[k].lib + '</option>'; }).join('') + '</select>' +
      '<div class="puces-statut">' + Object.keys(S.STATUTS).map(function (k) {
        var actif = p.statut && p.statut.split(',').indexOf(k) >= 0;
        return '<button type="button" class="puce statut-' + k + (actif ? ' actif' : '') + '" data-st="' + k + '">' + esc(S.STATUTS[k].libelle) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="barre-selection" hidden><span class="nb-sel"></span>' +
      '<label>Passer en ' + U.selectStatut('obtenu', 'data-statut-lot') + '</label>' +
      '<button class="btn" data-appliquer>Appliquer</button>' +
      '<button class="btn" data-fiche-sel>🖨 Fiche de consultation</button>' +
      '<button class="btn danger" data-supprimer>Supprimer</button>' +
      '<button class="btn-lien" data-deselect>Tout désélectionner</button></div>' +
      '<div class="resultats"></div>';

    var zone = U.$('.resultats', racine);
    var barre = U.$('.barre-selection', racine);

    function majBarre() {
      var n = Object.keys(selection).length;
      barre.hidden = !n;
      U.$('.nb-sel', barre).textContent = n + ' sélectionné' + (n > 1 ? 's' : '');
    }

    function dessine() {
      var liste = filtre(p);
      var stats = {};
      liste.forEach(function (d) { stats[d.statut] = (stats[d.statut] || 0) + 1; });
      var total = D.etat.data.documents.length;
      if (!total) {
        zone.innerHTML = '<div class="vide carte"><p>Aucun document pour l\'instant.</p>' +
          '<p>Le plus rapide : <a href="#/saisie">coller une liste d\'actes dans la saisie rapide</a> (texte à balises ou tableau Excel).</p></div>';
        return;
      }
      zone.innerHTML = '<p class="compte">' + liste.length + ' document' + (liste.length > 1 ? 's' : '') +
        (liste.length !== total ? ' sur ' + total : '') + ' · ' +
        Object.keys(S.STATUTS).filter(function (k) { return stats[k]; }).map(function (k) {
          return '<span class="txt-' + k + '">' + stats[k] + ' ' + esc(S.STATUTS[k].libelle.toLowerCase()) + '</span>';
        }).join(' · ') + '</p>' +
        (liste.length ? '<div class="defile"><table class="table-docs"><thead><tr><th class="col-coche"><input type="checkbox" class="tout"></th>' +
        '<th>Date</th><th>Acte</th><th>Personnes</th><th>Notaire</th><th>Cote</th><th>Centre</th><th>Statut</th><th></th></tr></thead><tbody>' +
        liste.slice(0, max).map(function (d) { return ligne(d, selection[d.id]); }).join('') + '</tbody></table></div>' +
        (liste.length > max ? '<p class="centre"><button class="btn" data-plus>Afficher ' + Math.min(LIMITE, liste.length - max) + ' de plus</button></p>' : '')
          : '<p class="vide">Aucun document ne correspond à ces filtres.</p>');
      U.$$('.tout', zone).forEach(function (t) {
        t.addEventListener('change', function () {
          liste.slice(0, max).forEach(function (d) { if (t.checked) selection[d.id] = 1; else delete selection[d.id]; });
          U.$$('.coche', zone).forEach(function (c) { c.checked = t.checked; });
          majBarre();
        });
      });
      majBarre();
    }

    var dessineVite = U.debounce(function () { U.remplaceParams(p); dessine(); }, 150);

    U.on(racine, 'input', '.filtres input', function (e, el) { p[el.name] = el.value; dessineVite(); });
    U.on(racine, 'change', '.filtres select', function (e, el) { p[el.name] = el.value; U.remplaceParams(p); dessine(); });
    U.on(racine, 'click', '.puce[data-st]', function (e, el) {
      var l = p.statut ? p.statut.split(',') : [];
      var i = l.indexOf(el.dataset.st);
      if (i >= 0) l.splice(i, 1); else l.push(el.dataset.st);
      p.statut = l.join(',');
      el.classList.toggle('actif', i < 0);
      U.remplaceParams(p); dessine();
    });
    U.on(zone, 'change', '.coche', function (e, el) {
      var i = el.closest('tr').dataset.id;
      if (el.checked) selection[i] = 1; else delete selection[i];
      majBarre();
    });
    U.on(zone, 'change', '[data-statut]', function (e, el) {
      var tr = el.closest('tr');
      D.majDocument(tr.dataset.id, { statut: el.value });
      el.className = 'select-statut statut-' + el.value;
      tr.className = 'st-' + el.value;
      U.toast('Statut : ' + S.STATUTS[el.value].libelle, 'ok');
    });
    U.on(zone, 'click', 'tbody tr', function (e, tr) {
      if (e.target.closest('input, select, a, button')) return;
      edite(tr.dataset.id, null, dessine);
    });
    U.on(zone, 'click', '[data-plus]', function () { max += LIMITE; dessine(); });
    U.$('[data-nouveau]', racine).addEventListener('click', function () { edite(null, { centreId: p.centre || '' }, dessine); });
    U.$('[data-appliquer]', racine).addEventListener('click', function () {
      var st = U.$('[data-statut-lot]', racine).value, ids = Object.keys(selection);
      D.majDocuments(ids, { statut: st });
      U.toast(ids.length + ' document(s) : ' + S.STATUTS[st].libelle, 'ok');
      dessine();
    });
    U.$('[data-fiche-sel]', racine).addEventListener('click', function () {
      U.va('fiche', [], { ids: Object.keys(selection).join(',') });
    });
    U.$('[data-supprimer]', racine).addEventListener('click', function () {
      var ids = Object.keys(selection);
      U.confirme('Supprimer définitivement ' + ids.length + ' document(s) ?', 'Supprimer', true).then(function (ok) {
        if (!ok) return;
        D.supprimeDocuments(ids);
        selection = {};
        U.toast(ids.length + ' document(s) supprimé(s).');
        dessine();
      });
    });
    U.$('[data-deselect]', racine).addEventListener('click', function () { selection = {}; dessine(); });

    dessine();
    if (p.ouvrir) edite(p.ouvrir, null, dessine);
  }

  // ---------------------------------------------------------------- fiche d'édition d'un document

  function lienEntraide(d) {
    var c = D.centreParId(d.centreId);
    if (!c || !U.urlSure(c.entraide) || c.entraide.indexOf('francegenweb') < 0) return '';
    var p1 = d.personnes[0] || {}, p2 = d.personnes[1] || {};
    var q = new URLSearchParams({ n1: p1.nom || '', p1: p1.prenom || '', n2: p2.nom || '', p2: p2.prenom || '', date: [d.jour, d.mois, d.annee].join('-') });
    return c.entraide + '&' + q.toString();
  }

  function edite(idDoc, preset, apres) {
    var d = idDoc ? D.docParId(idDoc) : Object.assign(D.nouveauDocument({}), preset || {});
    if (!d) return;
    var nouveau = !idDoc;
    var dateTxt = d.dateTexte || (d.annee ? S.formatDate(d) : '');
    var types = typesConnus();
    var historique = (d.historique || []).map(function (h) {
      return '<li>' + esc(U.dateCourte(h.le)) + ' — ' + U.pastilleStatut(h.statut) + '</li>';
    }).join('');
    var entraide = nouveau ? '' : lienEntraide(d);
    var connues = D.balisesPerso();
    var libelles = {};
    connues.forEach(function (b) { libelles[b.nom] = b; });
    var aMontrer = Object.keys(d.champs || {});
    D.etat.data.balises.forEach(function (b) { if (aMontrer.indexOf(b.nom) < 0) aMontrer.push(b.nom); });
    function ligneChamp(k, v) {
      var b = libelles[k] || {};
      return '<label class="champ-perso">@' + esc(k) + (b.description ? ' <small>' + esc(b.description) + '</small>' : '') +
        '<textarea rows="1" data-champ="' + esc(k) + '">' + esc(v || '') + '</textarea></label>';
    }

    var m = U.ouvreModale(nouveau ? 'Nouveau document' : 'Document', '<form class="form-doc">' +
      '<div class="grille">' +
      '<label>Centre d\'archives<select name="centreId">' + U.optionsCentres(d.centreId, '— aucun —') + '</select></label>' +
      '<label>Statut' + U.selectStatut(d.statut, 'name="statut"') + '</label>' +
      '<label>Date <small>02/06/1642, 06/1642, vers 1650…</small><input name="date" value="' + esc(dateTxt) + '"></label>' +
      '<label>Type d\'acte<input name="type" list="liste-types" value="' + esc(d.type) + '"></label>' +
      '<label class="large">Personnes <small>une par ligne : Prénom NOM</small><textarea name="personnes" rows="2">' +
        esc(d.personnes.map(S.formatPersonne).join('\n')) + '</textarea></label>' +
      '<label>Notaire<input name="notaire" value="' + esc(d.notaire) + '"></label>' +
      '<label>Ville / lieu<input name="ville" value="' + esc(d.ville) + '"></label>' +
      '<label>Cote<input name="cote" value="' + esc(d.cote) + '" class="mono"></label>' +
      '<label>Étiquettes <small>séparées par des virgules</small><input name="tags" value="' + esc(d.tags.join(', ')) + '"></label>' +
      '<label class="large">Description<input name="description" value="' + esc(d.description) + '"></label>' +
      '<label class="large">Annotations<textarea name="notes" rows="5" placeholder="Vos notes de lecture, pistes, renvois…">' + esc(d.notes) + '</textarea></label>' +
      '<details class="large"' + (d.transcription ? ' open' : '') + '><summary>Transcription</summary><textarea name="transcription" rows="8">' + esc(d.transcription) + '</textarea></details>' +
      '<fieldset class="large champs-perso"><legend>Champs personnalisés</legend><div class="liste-champs">' +
        aMontrer.map(function (k) { return ligneChamp(k, d.champs[k]); }).join('') + '</div>' +
        '<div class="ajout-champ"><input list="liste-balises-perso" placeholder="Nouveau champ : parrain, source, vue…" data-nouveau-champ>' +
        '<button type="button" class="btn petit" data-ajout-champ>+ Ajouter</button></div>' +
        '<datalist id="liste-balises-perso">' + connues.map(function (b) { return '<option value="' + esc(b.nom) + '">' + esc(b.description || '') + '</option>'; }).join('') + '</datalist>' +
      '</fieldset>' +
      '</div>' +
      '<datalist id="liste-types">' + types.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist>' +
      (historique && !nouveau ? '<details class="historique"><summary>Historique du statut</summary><ul>' + historique + '</ul></details>' : '') +
      '<div class="actions">' +
      (nouveau ? '' : '<button type="button" class="btn danger gauche" data-suppr>Supprimer</button>' +
        '<button type="button" class="btn" data-dupliquer>Dupliquer</button>' +
        '<button type="button" class="btn" data-imprimer>🖨 Imprimer</button>' +
        (entraide ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(entraide) + '">Demander à l\'entraide FGW</a>' : '')) +
      '<button type="submit" class="btn principal">Enregistrer</button></div></form>', { large: true });

    var form = U.$('form', m);
    var champDate = form.elements.date;
    champDate.addEventListener('blur', function () {
      var r = S.lireDate(champDate.value);
      champDate.classList.toggle('invalide', !!champDate.value && !r.ok);
    });

    function lit() {
      var f = form.elements;
      var r = S.lireDate(f.date.value);
      return {
        centreId: f.centreId.value, statut: f.statut.value,
        jour: r.jour, mois: r.mois, annee: r.annee, dateTexte: r.texte,
        type: f.type.value.trim(), personnes: S.lirePersonnes(f.personnes.value),
        notaire: f.notaire.value.trim().replace(/^(me|maître|maitre)\.?\s+/i, ''), ville: f.ville.value.trim(), cote: f.cote.value.trim(),
        tags: f.tags.value.split(/\s*[,;]\s*/).filter(Boolean),
        description: f.description.value.trim(), notes: f.notes.value, transcription: f.transcription.value,
        champs: champsSaisis()
      };
    }

    function champsSaisis() {
      var r = {};
      U.$$('[data-champ]', form).forEach(function (t) { if (t.value.trim()) r[t.dataset.champ] = t.value.trim(); });
      return r;
    }
    function ajouteChamp() {
      var inp = U.$('[data-nouveau-champ]', form);
      var k = S.nomBalise(inp.value);
      if (!k) return;
      if (S.champ(k)) { U.toast('@' + k + ' est une balise de base : utilisez le champ correspondant.', 'erreur'); return; }
      var exist = U.$('[data-champ="' + k + '"]', form);
      if (!exist) {
        U.$('.liste-champs', form).insertAdjacentHTML('beforeend', ligneChamp(k, ''));
        exist = U.$('[data-champ="' + k + '"]', form);
      }
      inp.value = '';
      exist.focus();
    }
    U.$('[data-ajout-champ]', form).addEventListener('click', ajouteChamp);
    U.$('[data-nouveau-champ]', form).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); ajouteChamp(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = lit();
      if (nouveau) {
        var n = D.nouveauDocument(v, v.centreId);
        D.ajouteDocuments([n]);
        U.toast('Document ajouté.', 'ok');
      } else {
        D.majDocument(d.id, v);
        U.toast('Document enregistré.', 'ok');
      }
      U.fermeModale();
      if (apres) apres();
    });
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit();
    });
    if (!nouveau) {
      U.$('[data-suppr]', m).addEventListener('click', function () {
        U.confirme('Supprimer ce document ?', 'Supprimer', true).then(function (ok) {
          if (!ok) return;
          D.supprimeDocuments([d.id]);
          U.toast('Document supprimé.');
          if (apres) apres();
        });
      });
      U.$('[data-dupliquer]', m).addEventListener('click', function () {
        var v = lit();
        U.fermeModale();
        edite(null, Object.assign(v, { statut: 'chercher' }), apres);
      });
      U.$('[data-imprimer]', m).addEventListener('click', function () {
        D.majDocument(d.id, lit());
        root.GA_VUES.fiche.imprimeDocument(d.id);
      });
    }
  }

  root.GA_VUES.documents = { titre: 'Documents', rendu: rendu, filtre: filtre, lireRecherche: lireRecherche, edite: edite, typesConnus: typesConnus };
})(window);
