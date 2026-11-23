/* GENEAddict — dépouillements : suivi de la lecture des registres, études notariales, fonds. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, esc = U.esc;
  var STATUTS = { afaire: 'À faire', encours: 'En cours', termine: 'Terminé' };

  function edite(x, apres) {
    var nouveau = !x;
    x = x || { centreId: '', titre: '', cote: '', periode: '', pagesFaites: 0, pagesTotal: 0, statut: 'encours', notes: '' };
    var m = U.ouvreModale(nouveau ? 'Nouveau dépouillement' : 'Dépouillement', '<form class="grille">' +
      '<label class="large">Fonds, registre ou étude <small>ex. : Me GALLOIS, Edmond · BMS Saint-Germain 1650-1670</small><input name="titre" required value="' + esc(x.titre) + '"></label>' +
      '<label>Centre<select name="centreId">' + U.optionsCentres(x.centreId, '— aucun —') + '</select></label>' +
      '<label>Statut<select name="statut">' + Object.keys(STATUTS).map(function (k) { return '<option value="' + k + '"' + (k === x.statut ? ' selected' : '') + '>' + STATUTS[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Cote<input name="cote" class="mono" value="' + esc(x.cote) + '"></label>' +
      '<label>Période<input name="periode" value="' + esc(x.periode) + '" placeholder="1656-1683"></label>' +
      '<label>Pages / vues lues<input name="pagesFaites" type="number" min="0" value="' + (+x.pagesFaites || 0) + '"></label>' +
      '<label>Pages / vues au total<input name="pagesTotal" type="number" min="0" value="' + (+x.pagesTotal || 0) + '"></label>' +
      '<label class="large">Notes de lecture<textarea name="notes" rows="8" placeholder="1656 – p1-8/16&#10;05/01 : Procuration – Gentien de Marigner&#10;…">' + esc(x.notes) + '</textarea></label>' +
      '<div class="actions large">' + (nouveau ? '' : '<button type="button" class="btn danger gauche" data-suppr>Supprimer</button>') +
      '<button class="btn principal">Enregistrer</button></div></form>', { large: true });
    var f = U.$('form', m);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {
        titre: f.elements.titre.value.trim(), centreId: f.elements.centreId.value, statut: f.elements.statut.value,
        cote: f.elements.cote.value.trim(), periode: f.elements.periode.value.trim(),
        pagesFaites: Math.max(0, parseInt(f.elements.pagesFaites.value, 10) || 0), pagesTotal: Math.max(0, parseInt(f.elements.pagesTotal.value, 10) || 0),
        notes: f.elements.notes.value
      };
      if (nouveau) D.ajouteDepouillement(v); else D.majDepouillement(x.id, v);
      U.fermeModale(); U.toast('Dépouillement enregistré.', 'ok'); apres();
    });
    var s = U.$('[data-suppr]', m);
    if (s) s.addEventListener('click', function () {
      U.confirme('Supprimer « ' + x.titre + ' » ?', 'Supprimer', true).then(function (ok) {
        if (ok) { D.supprimeDepouillement(x.id); apres(); }
      });
    });
  }

  function rendu(racine) {
    var filtre = 'actifs';
    racine.innerHTML = '<div class="titre-vue"><h1>Dépouillements</h1><div class="actions-titre">' +
      '<select class="filtre-deps"><option value="actifs">En cours et à faire</option><option value="tous">Tous</option><option value="termine">Terminés</option></select>' +
      '<button class="btn principal" data-nouveau>+ Nouveau dépouillement</button></div></div>' +
      '<p class="discret">Suivez ici la lecture page à page d\'un registre, d\'une étude notariale ou d\'un fonds. Les dépouillements en cours sont rappelés sur la fiche de consultation du centre.</p>' +
      '<div class="liste"></div>';
    var zone = U.$('.liste', racine);

    function dessine() {
      var tous = D.etat.data.depouillements.filter(function (x) {
        return filtre === 'tous' || (filtre === 'termine' ? x.statut === 'termine' : x.statut !== 'termine');
      });
      if (!tous.length) { zone.innerHTML = '<div class="carte vide">Aucun dépouillement' + (filtre === 'actifs' ? ' en cours' : '') + '.</div>'; return; }
      var groupes = {};
      tous.forEach(function (x) { (groupes[x.centreId] = groupes[x.centreId] || []).push(x); });
      zone.innerHTML = Object.keys(groupes).map(function (k) {
        var c = D.centreParId(k);
        return '<div class="carte"><h2>' + (c ? '<a href="#/archives/' + encodeURIComponent(c.id) + '">' + esc(c.nom) + '</a>' : 'Sans centre') + '</h2>' +
          '<ul class="deps">' + groupes[k].sort(function (a, b) { return a.titre.localeCompare(b.titre, 'fr'); }).map(function (x) {
            var pct = x.pagesTotal ? Math.min(100, Math.round(100 * x.pagesFaites / x.pagesTotal)) : 0;
            return '<li data-id="' + esc(x.id) + '" class="dep-' + x.statut + '">' +
              '<div class="dep-titre"><button class="btn-lien" data-edite>' + esc(x.titre) + '</button> <span class="mono">' + esc(x.cote) + '</span> <span class="discret">' + esc(x.periode) + '</span>' +
              ' <span class="statut-dep">' + STATUTS[x.statut] + '</span></div>' +
              '<div class="dep-avance"><button class="btn petit" data-pas="-1" title="Une page de moins">−</button>' +
              '<span class="progression grande"><span style="width:' + pct + '%"></span></span>' +
              '<button class="btn petit" data-pas="1" title="Une page de plus">+</button>' +
              '<span class="pages">' + (x.pagesTotal ? x.pagesFaites + ' / ' + x.pagesTotal + ' (' + pct + ' %)' : x.pagesFaites + ' p.') + '</span></div>' +
              (x.notes ? '<details><summary>Notes de lecture</summary><pre class="notes-dep">' + esc(x.notes) + '</pre></details>' : '') + '</li>';
          }).join('') + '</ul></div>';
      }).join('');
    }

    U.$('.filtre-deps', racine).addEventListener('change', function (e) { filtre = e.target.value; dessine(); });
    U.$('[data-nouveau]', racine).addEventListener('click', function () { edite(null, dessine); });
    U.on(zone, 'click', '[data-edite]', function (e, el) {
      var x = D.etat.data.depouillements.find(function (y) { return y.id === el.closest('li').dataset.id; });
      edite(x, dessine);
    });
    U.on(zone, 'click', '[data-pas]', function (e, el) {
      var x = D.etat.data.depouillements.find(function (y) { return y.id === el.closest('li').dataset.id; });
      var n = Math.max(0, (+x.pagesFaites || 0) + (+el.dataset.pas));
      if (x.pagesTotal) n = Math.min(n, x.pagesTotal);
      var patch = { pagesFaites: n };
      if (x.pagesTotal && n === x.pagesTotal) { patch.statut = 'termine'; U.toast('« ' + x.titre + ' » terminé !', 'ok'); }
      else if (x.statut === 'afaire') patch.statut = 'encours';
      D.majDepouillement(x.id, patch);
      dessine();
    });
    dessine();
  }

  root.GA_VUES.depouillements = { titre: 'Dépouillements', rendu: rendu };
})(window);
