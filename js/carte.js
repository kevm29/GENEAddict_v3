/* GENEAddict — carte des départements : zoom, déplacement, étiquettes, encart Paris.
 *
 * Le liseré des départements sélectionnés ou « à chercher » est découpé par la forme du
 * département lui-même (clipPath) : il reste à l'intérieur au lieu de déborder sur les voisins.
 * Numéros et noms sont placés au « pôle d'inaccessibilité » de chaque département
 * (point le plus éloigné des bords, précalculé dans carte-france.js) et ne s'affichent que
 * s'ils tiennent à l'échelle courante : zoomer fait apparaître les noms. */
(function (root) {
  'use strict';

  var esc = function (s) { return root.GA_UI.esc(s); };
  var NS = 'http://www.w3.org/2000/svg';
  var PX_NUM = 11, PX_NOM = 8.5;      // taille des étiquettes à l'écran, en pixels
  var PETITE_COURONNE = { '75': 1, '92': 1, '93': 1, '94': 1 };
  var VB_IDF = [301, 131, 26, 26];

  function largeurTexte(txt, fs) { return txt.length * fs * 0.56; }

  /* Coupe un nom long en deux lignes autour d'un tiret ou d'une espace. */
  function lignesNom(nom) {
    if (nom.length <= 11) return [nom];
    var milieu = nom.length / 2, meilleur = -1;
    for (var i = 0; i < nom.length; i++) {
      if ((nom[i] === '-' || nom[i] === ' ') && (meilleur < 0 || Math.abs(i - milieu) < Math.abs(meilleur - milieu))) meilleur = i;
    }
    if (meilleur < 0) return [nom];
    return [nom.slice(0, nom[meilleur] === '-' ? meilleur + 1 : meilleur), nom.slice(meilleur + 1)];
  }

  function formes(deps, info, idPrefixe) {
    var defs = '', fonds = '', liseres = '', etiq = '';
    deps.forEach(function (d) {
      var i = info(d);
      var id = idPrefixe + d.code;
      defs += '<clipPath id="' + id + '"><path d="' + d.path + '"/></clipPath>';
      fonds += '<path class="dep niv' + i.niveau + '" data-centre="' + esc(i.centreId) + '" data-code="' + d.code + '" d="' + d.path + '"><title>' + esc(i.titre) + '</title></path>';
      if (i.choisi || i.aChercher) {
        liseres += '<path class="lisere' + (i.choisi ? ' choisi' : ' a-chercher') + '" clip-path="url(#' + id + ')" d="' + d.path + '"/>';
      }
      var lignes = lignesNom(d.nom);
      etiq += '<g class="etiq" data-r="' + d.r + '" data-x="' + d.lx + '" data-y="' + d.ly + '" data-nom="' + esc(d.nom) + '" data-lignes="' + lignes.length + '">' +
        '<text class="etiq-num">' + d.code + '</text>' +
        lignes.map(function (l) { return '<text class="etiq-nom">' + esc(l) + '</text>'; }).join('') + '</g>';
    });
    return { defs: defs, fonds: fonds, liseres: liseres, etiq: etiq };
  }

  /* Place et affiche/masque les étiquettes selon l'échelle (pixels par unité de carte). */
  function placeEtiquettes(svg, echelle) {
    var fsNum = PX_NUM / echelle, fsNom = PX_NOM / echelle;
    Array.prototype.forEach.call(svg.querySelectorAll('.etiq'), function (g) {
      var r = +g.dataset.r, x = +g.dataset.x, y = +g.dataset.y;
      var nb = +g.dataset.lignes;
      var textes = g.querySelectorAll('text');
      var num = textes[0];
      var noms = Array.prototype.slice.call(textes, 1);
      var largeurNom = Math.max.apply(null, noms.map(function (t) { return largeurTexte(t.textContent, fsNom); }));
      var hauteurNom = nb * fsNom * 1.05;
      var montrerNum = fsNum * 1.2 <= 2.2 * r;
      var montrerNom = montrerNum && largeurNom <= 2.7 * r && fsNum + hauteurNom <= 2.3 * r;
      g.style.display = montrerNum ? '' : 'none';
      if (!montrerNum) return;
      var hauteur = fsNum + (montrerNom ? hauteurNom : 0);
      var y0 = y - hauteur / 2 + fsNum * 0.82;
      num.setAttribute('x', x); num.setAttribute('y', y0); num.setAttribute('font-size', fsNum.toFixed(2));
      noms.forEach(function (t, i) {
        t.style.display = montrerNom ? '' : 'none';
        t.setAttribute('x', x); t.setAttribute('y', (y0 + fsNom * 1.1 + i * fsNom * 1.05).toFixed(2));
        t.setAttribute('font-size', fsNom.toFixed(2));
      });
    });
  }

  /* conteneur : élément HTML ; opts : { comptes, choisi (id centre), clic(idCentre) } */
  function dessine(conteneur, opts) {
    var C = root.GA_CARTE, D = root.GA_DONNEES;
    var parDep = {};
    D.etat.data.centres.forEach(function (c) { if (c.categorie === 'AD') parDep[c.dep] = c; });
    var max = 1;
    Object.keys(opts.comptes).forEach(function (k) { if (opts.comptes[k].total > max) max = opts.comptes[k].total; });
    function info(d) {
      var c = parDep[d.code], n = c && opts.comptes[c.id];
      return {
        centreId: c ? c.id : '',
        niveau: n ? Math.min(4, 1 + Math.floor(3 * n.total / max)) : 0,
        aChercher: !!(n && n.chercher),
        choisi: !!(c && c.id === opts.choisi),
        titre: d.code + ' — ' + d.nom + (n ? ' · ' + n.total + ' doc. (' + n.chercher + ' à chercher)' : '')
      };
    }
    var vb0 = C.viewBox.split(' ').map(Number);
    var principal = formes(C.departements, info, 'cp-');
    var idf = formes(C.departements.filter(function (d) {
      return PETITE_COURONNE[d.code] || ['77', '78', '91', '95'].indexOf(d.code) >= 0;
    }), info, 'cpi-');

    conteneur.innerHTML =
      '<div class="carte-boite">' +
      '<svg class="carte-france" viewBox="' + vb0.join(' ') + '" role="img" aria-label="Carte des départements">' +
      '<defs>' + principal.defs + '</defs><g class="fonds">' + principal.fonds + '</g><g class="liseres">' + principal.liseres + '</g>' +
      '<g class="etiquettes">' + principal.etiq + '</g></svg>' +
      '<div class="encart-idf" title="Paris et petite couronne"><svg viewBox="' + VB_IDF.join(' ') + '">' +
      '<defs>' + idf.defs + '</defs><g class="fonds">' + idf.fonds + '</g><g class="liseres">' + idf.liseres + '</g>' +
      '<g class="etiquettes">' + idf.etiq + '</g></svg><span>Paris &amp; petite couronne</span></div>' +
      '<div class="zoom"><button type="button" class="btn-icone" data-z="1.5" title="Zoomer">+</button>' +
      '<button type="button" class="btn-icone" data-z="0.667" title="Dézoomer">−</button>' +
      '<button type="button" class="btn-icone" data-z="0" title="Vue d\'ensemble">⟲</button></div></div>';

    var svg = conteneur.querySelector('.carte-france');
    var svgIdf = conteneur.querySelector('.encart-idf svg');
    var vb = (opts.vue && opts.vue.slice()) || vb0.slice();

    function applique() {
      svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(2); }).join(' '));
      var largeur = svg.clientWidth || 600;
      placeEtiquettes(svg, largeur / vb[2]);
      if (opts.memoriseVue) opts.memoriseVue(vb.slice());
    }
    function etiquettesIdf() {
      placeEtiquettes(svgIdf, (svgIdf.clientWidth || 150) / VB_IDF[2]);
    }

    function zoome(f, cx, cy) {
      var nw = Math.min(vb0[2], Math.max(vb0[2] / 12, vb[2] / f));
      var nh = nw * vb0[3] / vb0[2];
      if (cx == null) { cx = vb[0] + vb[2] / 2; cy = vb[1] + vb[3] / 2; }
      var rx = (cx - vb[0]) / vb[2], ry = (cy - vb[1]) / vb[3];
      vb = [cx - rx * nw, cy - ry * nh, nw, nh];
      borne();
      applique();
    }
    function borne() {
      vb[0] = Math.min(Math.max(vb[0], vb0[0] - vb[2] * 0.2), vb0[0] + vb0[2] - vb[2] * 0.8);
      vb[1] = Math.min(Math.max(vb[1], vb0[1] - vb[3] * 0.2), vb0[1] + vb0[3] - vb[3] * 0.8);
    }
    function pointCarte(e) {
      var r = svg.getBoundingClientRect();
      return [vb[0] + (e.clientX - r.left) / r.width * vb[2], vb[1] + (e.clientY - r.top) / r.height * vb[3]];
    }

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = pointCarte(e);
      zoome(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]);
    }, { passive: false });

    var glisse = null;
    svg.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      glisse = { x: e.clientX, y: e.clientY, vb: vb.slice(), bouge: false, id: e.pointerId };
    });
    svg.addEventListener('pointermove', function (e) {
      if (!glisse) return;
      var dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (!glisse.bouge && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!glisse.bouge) { try { svg.setPointerCapture(glisse.id); } catch (err) { /* ignoré */ } }
      glisse.bouge = true;
      svg.classList.add('glisse');
      var r = svg.getBoundingClientRect();
      vb[0] = glisse.vb[0] - dx / r.width * vb[2];
      vb[1] = glisse.vb[1] - dy / r.height * vb[3];
      borne();
      applique();
    });
    svg.addEventListener('pointerup', function () {
      if (glisse && glisse.bouge) {
        svg.classList.remove('glisse');
        // empêche le clic qui suit un déplacement
        var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
        svg.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(function () { svg.removeEventListener('click', stop, { capture: true }); }, 0);
      }
      glisse = null;
    });

    conteneur.addEventListener('click', function (e) {
      var z = e.target.closest('[data-z]');
      if (z) { if (+z.dataset.z === 0) { vb = vb0.slice(); applique(); } else zoome(+z.dataset.z); return; }
      var p = e.target.closest('path.dep');
      if (p && p.dataset.centre) opts.clic(p.dataset.centre);
    });
    svg.addEventListener('dblclick', function (e) { e.preventDefault(); var p = pointCarte(e); zoome(2, p[0], p[1]); });

    if (root.ResizeObserver) new ResizeObserver(function () { applique(); etiquettesIdf(); }).observe(svg);
    applique();
    etiquettesIdf();
  }

  root.GA_CARTE_UI = { dessine: dessine };
})(window);
