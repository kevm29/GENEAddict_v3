/* GENEAddict — liens utiles. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, esc = U.esc;

  function edite(l, apres) {
    var nouveau = !l;
    l = l || { nom: '', url: '', categorie: '' };
    var cats = {};
    D.etat.data.liens.forEach(function (x) { if (x.categorie) cats[x.categorie] = 1; });
    var m = U.ouvreModale(nouveau ? 'Nouveau lien' : 'Modifier le lien', '<form class="grille">' +
      '<label class="large">Nom du site<input name="nom" required value="' + esc(l.nom) + '"></label>' +
      '<label class="large">Adresse<input name="url" type="url" required value="' + esc(l.url) + '" placeholder="https://"></label>' +
      '<label class="large">Catégorie<input name="categorie" list="cats-liens" value="' + esc(l.categorie) + '"></label>' +
      '<datalist id="cats-liens">' + Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
      '<div class="actions large">' + (nouveau ? '' : '<button type="button" class="btn danger gauche" data-suppr>Supprimer</button>') +
      '<button class="btn principal">Enregistrer</button></div></form>');
    var f = U.$('form', m);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { nom: f.elements.nom.value.trim(), url: f.elements.url.value.trim(), categorie: f.elements.categorie.value.trim() };
      if (nouveau) D.ajouteLien(v); else D.majLien(l.id, v);
      U.fermeModale(); apres();
    });
    var s = U.$('[data-suppr]', m);
    if (s) s.addEventListener('click', function () { D.supprimeLien(l.id); U.fermeModale(); apres(); });
  }

  function rendu(racine) {
    racine.innerHTML = '<div class="titre-vue"><h1>Liens</h1><div class="actions-titre"><button class="btn principal" data-nouveau>+ Nouveau lien</button></div></div><div class="liens-grille"></div>';
    var zone = U.$('.liens-grille', racine);
    function dessine() {
      var g = {};
      D.etat.data.liens.forEach(function (l) { (g[l.categorie || 'Divers'] = g[l.categorie || 'Divers'] || []).push(l); });
      zone.innerHTML = Object.keys(g).sort(function (a, b) { return a.localeCompare(b, 'fr'); }).map(function (k) {
        return '<div class="carte"><h2>' + esc(k) + '</h2><ul class="liens">' + g[k].sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); }).map(function (l) {
          var u = U.urlSure(l.url), hote = '';
          try { hote = new URL(u).hostname; } catch (e) { /* adresse invalide */ }
          return '<li data-id="' + esc(l.id) + '">' + (hote ? '<img alt="" loading="lazy" src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hote) + '">' : '') +
            '<a target="_blank" rel="noopener" href="' + esc(u) + '">' + esc(l.nom) + '</a><span class="discret">' + esc(hote) + '</span>' +
            '<button class="btn-icone" data-edite title="Modifier">✎</button></li>';
        }).join('') + '</ul></div>';
      }).join('') || '<div class="carte vide">Aucun lien.</div>';
    }
    U.$('[data-nouveau]', racine).addEventListener('click', function () { edite(null, dessine); });
    U.on(zone, 'click', '[data-edite]', function (e, el) {
      edite(D.etat.data.liens.find(function (l) { return l.id === el.closest('li').dataset.id; }), dessine);
    });
    dessine();
  }

  root.GA_VUES.liens = { titre: 'Liens', rendu: rendu };
})(window);
