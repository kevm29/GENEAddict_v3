/* GENEAddict — carte des départements : métropole + outre-mer en encarts, zoom, étiquettes.
 *
 * La carte occupe une zone fixe (elle s'adapte à la hauteur de l'écran) ; on zoome à la
 * molette, au double-clic ou avec les boutons, et une fois zoomé on se déplace en glissant.
 * Le liseré des départements sélectionnés ou « à chercher » est découpé par la forme du
 * département (clipPath) : il reste à l'intérieur au lieu de déborder sur les voisins.
 * Numéros et noms sont placés au « pôle d'inaccessibilité » de chaque département
 * (précalculé dans carte-france.js) et ne s'affichent que s'ils tiennent à l'échelle courante. */
(function (root) {
  'use strict';

  var esc = function (s) { return root.GA_UI.esc(s); };
  var PX_NUM = 11, PX_NOM = 8.5;      // taille des étiquettes à l'écran, en pixels
  var ZOOM_MAX = 14;

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

  /* Place et affiche/masque les étiquettes selon l'échelle (pixels par unité de carte). */
  function placeEtiquettes(svg, echelle) {
    var fsNum = PX_NUM / echelle, fsNom = PX_NOM / echelle;
    Array.prototype.forEach.call(svg.querySelectorAll('.etiq'), function (g) {
      var r = +g.dataset.r, x = +g.dataset.x, y = +g.dataset.y;
      var textes = g.querySelectorAll('text');
      var num = textes[0];
      var noms = Array.prototype.slice.call(textes, 1);
      var largeurNom = Math.max.apply(null, noms.map(function (t) { return largeurTexte(t.textContent, fsNom); }));
      var hauteurNom = noms.length * fsNom * 1.05;
      var montrerNum = fsNum * 1.2 <= 2.2 * r;
      var montrerNom = montrerNum && largeurNom <= 2.7 * r && fsNum + hauteurNom <= 2.3 * r;
      g.style.display = montrerNum ? '' : 'none';
      if (!montrerNum) return;
      var hauteur = fsNum + (montrerNom ? hauteurNom : 0);
      var y0 = y - hauteur / 2 + fsNum * 0.82;
      num.setAttribute('x', x); num.setAttribute('y', y0.toFixed(2)); num.setAttribute('font-size', fsNum.toFixed(2));
      noms.forEach(function (t, i) {
        t.style.display = montrerNom ? '' : 'none';
        t.setAttribute('x', x); t.setAttribute('y', (y0 + fsNom * 1.1 + i * fsNom * 1.05).toFixed(2));
        t.setAttribute('font-size', fsNom.toFixed(2));
      });
    });
  }

  /* conteneur : élément HTML ; opts : { comptes, choisi (id centre), clic(idCentre), vue, memoriseVue } */
  function dessine(conteneur, opts) {
    var C = root.GA_CARTE, D = root.GA_DONNEES;
    var parDep = {};
    D.etat.data.centres.forEach(function (c) { if (c.categorie === 'AD') parDep[c.dep] = c; });
    var max = 1;
    Object.keys(opts.comptes).forEach(function (k) { if (opts.comptes[k].total > max) max = opts.comptes[k].total; });

    var defs = '', fonds = '', liseres = '', etiq = '', cadres = '';
    (C.encarts || []).forEach(function (e) {
      cadres += '<rect class="encart" x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="' + e.h + '" rx="3"/>';
    });
    C.departements.forEach(function (d) {
      var c = parDep[d.code], n = c && opts.comptes[c.id];
      var niveau = n ? Math.min(4, 1 + Math.floor(3 * n.total / max)) : 0;
      var choisi = !!(c && c.id === opts.choisi), aChercher = !!(n && n.chercher);
      var titre = d.code + ' — ' + d.nom + (n ? ' · ' + n.total + ' doc. (' + n.chercher + ' à chercher)' : '');
      defs += '<clipPath id="cp-' + d.code + '"><path d="' + d.path + '"/></clipPath>';
      fonds += '<path class="dep niv' + niveau + '" data-centre="' + esc(c ? c.id : '') + '" data-code="' + d.code + '" d="' + d.path + '"><title>' + esc(titre) + '</title></path>';
      if (choisi || aChercher) liseres += '<path class="lisere' + (choisi ? ' choisi' : ' a-chercher') + '" clip-path="url(#cp-' + d.code + ')" d="' + d.path + '"/>';
      var lignes = lignesNom(d.nom);
      etiq += '<g class="etiq" data-r="' + d.r + '" data-x="' + d.lx + '" data-y="' + d.ly + '">' +
        '<text class="etiq-num">' + d.code + '</text>' +
        lignes.map(function (l) { return '<text class="etiq-nom">' + esc(l) + '</text>'; }).join('') + '</g>';
    });

    var vb0 = C.viewBox.split(' ').map(Number);
    conteneur.innerHTML =
      '<div class="carte-boite">' +
      '<svg class="carte-france" viewBox="' + vb0.join(' ') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carte des départements">' +
      '<defs>' + defs + '</defs><g class="cadres">' + cadres + '</g><g class="fonds">' + fonds + '</g><g class="liseres">' + liseres + '</g>' +
      '<g class="etiquettes">' + etiq + '</g></svg>' +
      '<div class="zoom"><button type="button" class="btn-icone" data-z="1.6" title="Zoomer">+</button>' +
      '<button type="button" class="btn-icone" data-z="0.625" title="Dézoomer">−</button>' +
      '<button type="button" class="btn-icone" data-z="0" title="Vue d\'ensemble">⟲</button></div></div>';

    var svg = conteneur.querySelector('.carte-france');
    var vb = (opts.vue && opts.vue.slice()) || vb0.slice();

    function echelle() {
      var w = svg.clientWidth || 600, h = svg.clientHeight || 570;
      return Math.min(w / vb[2], h / vb[3]);
    }
    function zoome() { return vb0[2] / vb[2]; }
    function applique() {
      svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(2); }).join(' '));
      svg.classList.toggle('zoomee', zoome() > 1.01);
      placeEtiquettes(svg, echelle());
      if (opts.memoriseVue) opts.memoriseVue(zoome() > 1.01 ? vb.slice() : null);
    }
    function borne() {
      vb[0] = Math.min(Math.max(vb[0], vb0[0]), vb0[0] + vb0[2] - vb[2]);
      vb[1] = Math.min(Math.max(vb[1], vb0[1]), vb0[1] + vb0[3] - vb[3]);
    }
    function zoomeVers(f, cx, cy) {
      var nw = Math.min(vb0[2], Math.max(vb0[2] / ZOOM_MAX, vb[2] / f));
      var nh = nw * vb0[3] / vb0[2];
      if (cx == null) { cx = vb[0] + vb[2] / 2; cy = vb[1] + vb[3] / 2; }
      var rx = (cx - vb[0]) / vb[2], ry = (cy - vb[1]) / vb[3];
      vb = [cx - rx * nw, cy - ry * nh, nw, nh];
      borne();
      applique();
    }
    /* Point de la carte sous la souris (tient compte des marges dues au format de la zone). */
    function pointCarte(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    }

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = pointCarte(e);
      zoomeVers(e.deltaY < 0 ? 1.25 : 0.8, p[0], p[1]);
    }, { passive: false });
    svg.addEventListener('dblclick', function (e) { e.preventDefault(); var p = pointCarte(e); zoomeVers(2, p[0], p[1]); });

    // déplacement à la souris, seulement une fois zoomé
    var glisse = null;
    svg.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || zoome() <= 1.01) return;
      glisse = { x: e.clientX, y: e.clientY, vb: vb.slice(), bouge: false, id: e.pointerId };
    });
    svg.addEventListener('pointermove', function (e) {
      if (!glisse) return;
      var dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (!glisse.bouge && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!glisse.bouge) { try { svg.setPointerCapture(glisse.id); } catch (err) { /* ignoré */ } }
      glisse.bouge = true;
      svg.classList.add('glisse');
      var k = echelle();
      vb[0] = glisse.vb[0] - dx / k;
      vb[1] = glisse.vb[1] - dy / k;
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
      if (z) { if (+z.dataset.z === 0) { vb = vb0.slice(); applique(); } else zoomeVers(+z.dataset.z); return; }
      var p = e.target.closest('path.dep');
      if (p && p.dataset.centre) opts.clic(p.dataset.centre);
    });

    if (root.ResizeObserver) new ResizeObserver(applique).observe(svg);
    applique();
  }

  root.GA_CARTE_UI = { dessine: dessine };
})(window);
