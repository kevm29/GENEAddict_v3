/* GENEAddict — suggestions dans la zone de saisie rapide.
 *
 * - « @ » en début de ligne : liste des balises (de base + personnalisées), filtrée à la frappe ;
 * - après « @centre », « @statut », « @type », « @notaire », « @ville » ou une balise
 *   personnalisée : valeurs déjà connues dans la base.
 * ↑ ↓ pour choisir, Entrée ou Tab pour valider, Échap pour fermer. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;
  var MAX = 9;

  function balises() {
    var liste = S.BALISES.map(function (b) { return { nom: b[0], description: b[1], perso: false }; });
    D.balisesPerso().forEach(function (b) {
      liste.push({ nom: b.nom, description: b.description || 'balise personnalisée', perso: true });
    });
    return liste;
  }

  function valeursDistinctes(f) {
    var vus = {}, liste = [];
    D.etat.data.documents.forEach(function (d) {
      [].concat(f(d) || []).forEach(function (v) {
        v = String(v || '').trim();
        var k = S.cle(v);
        if (k && !vus[k]) { vus[k] = 1; liste.push(v); }
      });
    });
    return liste.sort(function (a, b) { return a.localeCompare(b, 'fr'); }).map(function (v) { return { valeur: v }; });
  }

  /* Valeurs proposées après une balise donnée. */
  function valeursPour(balise) {
    var ch = S.champ(balise);
    if (ch === 'centre') {
      var r = [];
      U.centresRanges().forEach(function (rang) {
        rang.groupes.forEach(function (g) {
          g.centres.forEach(function (c) { r.push({ valeur: c.code, description: U.libelleCentre(c, true) + ' — ' + c.nom, recherche: c.code + ' ' + c.nom + ' ' + U.libelleCentre(c, true) }); });
        });
      });
      return r;
    }
    if (ch === 'statut') return Object.keys(S.STATUTS).map(function (k) { return { valeur: S.STATUTS[k].libelle.split(' /')[0].toLowerCase(), description: S.STATUTS[k].libelle }; });
    if (ch === 'type') return valeursDistinctes(function (d) { return d.type; });
    if (ch === 'notaire') return valeursDistinctes(function (d) { return d.notaire; });
    if (ch === 'ville') return valeursDistinctes(function (d) { return d.ville; });
    if (ch === 'tags') return valeursDistinctes(function (d) { return d.tags; });
    if (ch === 'personnes' || ch === 'nom') return valeursDistinctes(function (d) { return d.personnes.map(S.formatPersonne); });
    if (!ch) {
      var k = S.nomBalise(balise);
      return valeursDistinctes(function (d) { return d.champs && d.champs[k]; });
    }
    return [];
  }

  /* Position du curseur (en pixels, relative à la zone de texte), via une copie invisible. */
  function coordsCurseur(ta, pos) {
    var st = getComputedStyle(ta);
    var div = document.createElement('div');
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize', 'paddingTop', 'paddingLeft',
      'paddingRight', 'paddingBottom', 'borderTopWidth', 'borderLeftWidth', 'boxSizing', 'width'].forEach(function (p) { div.style[p] = st[p]; });
    div.style.position = 'absolute'; div.style.visibility = 'hidden'; div.style.top = '0'; div.style.left = '-9999px';
    div.style.whiteSpace = st.whiteSpace === 'pre' ? 'pre' : 'pre-wrap';
    div.style.borderStyle = 'solid';
    div.textContent = ta.value.slice(0, pos);
    var span = document.createElement('span');
    span.textContent = '​';
    div.appendChild(span);
    document.body.appendChild(div);
    var r = { top: span.offsetTop - ta.scrollTop, left: span.offsetLeft - ta.scrollLeft, h: parseFloat(st.lineHeight) || 20 };
    div.remove();
    return r;
  }

  function attache(ta, liste, apresInsertion) {
    var items = [], choix = 0, contexte = null;

    function ferme() { liste.hidden = true; items = []; contexte = null; }

    function analyse() {
      var pos = ta.selectionStart;
      if (pos !== ta.selectionEnd) return null;
      var debutLigne = ta.value.lastIndexOf('\n', pos - 1) + 1;
      var avant = ta.value.slice(debutLigne, pos);
      var m = /^(\s*)@([\p{L}\d_-]*)$/u.exec(avant);
      if (m) return { genre: 'balise', debut: debutLigne + m[1].length, saisi: m[2] };
      m = /^\s*@([\p{L}\d_-]+)[ \t]+(.*)$/u.exec(avant);
      if (m && !/^(par-?defaut|pour-?tous)$/i.test(m[1])) {
        var debutValeur = pos - m[2].length;
        // pour les listes séparées par & ou , on complète le dernier morceau
        var sep = Math.max(m[2].lastIndexOf('&'), S.champ(m[1]) === 'tags' ? m[2].lastIndexOf(',') : -1);
        var morceau = sep >= 0 ? m[2].slice(sep + 1).replace(/^\s+/, '') : m[2];
        return { genre: 'valeur', balise: m[1], debut: pos - morceau.length, saisi: morceau, debutValeur: debutValeur };
      }
      return null;
    }

    function filtre(ctx) {
      var k = S.cle(ctx.saisi);
      if (ctx.genre === 'balise') {
        return balises().filter(function (b) { return S.cle(b.nom).indexOf(k) === 0; })
          .map(function (b) { return { texte: '@' + b.nom, insertion: '@' + b.nom + ' ', description: b.description, perso: b.perso }; });
      }
      var vals = valeursPour(ctx.balise);
      var debut = [], dedans = [];
      vals.forEach(function (v) {
        var cible = S.cle(v.recherche || v.valeur);
        var c = S.cle(v.valeur);
        if (!k || c.indexOf(k) === 0) debut.push(v);
        else if (cible.indexOf(k) >= 0) dedans.push(v);
      });
      return debut.concat(dedans).filter(function (v) { return S.cle(v.valeur) !== k; })
        .map(function (v) { return { texte: v.valeur, insertion: v.valeur, description: v.description || '' }; });
    }

    function montre() {
      contexte = analyse();
      if (!contexte) { ferme(); return; }
      if (contexte.genre === 'valeur' && !contexte.saisi && !/^(centre|statut)$/.test(S.champ(contexte.balise) || '')) { ferme(); return; }
      items = filtre(contexte).slice(0, MAX);
      if (!items.length) { ferme(); return; }
      choix = Math.min(choix, items.length - 1);
      liste.innerHTML = items.map(function (it, i) {
        return '<li role="option" data-i="' + i + '" class="' + (i === choix ? 'actif' : '') + (it.perso ? ' perso' : '') + '">' +
          '<span class="sugg-texte">' + esc(it.texte) + '</span>' + (it.description ? '<span class="sugg-desc">' + esc(it.description) + '</span>' : '') + '</li>';
      }).join('');
      var c = coordsCurseur(ta, contexte.debut);
      liste.style.left = Math.max(0, Math.min(c.left + ta.offsetLeft, ta.clientWidth - 260)) + 'px';
      var top = c.top + ta.offsetTop + c.h + 2;
      liste.style.top = top + 'px';
      liste.hidden = false;
    }

    function valide(i) {
      var it = items[i];
      if (!it || !contexte) return;
      var fin = ta.selectionStart;
      ta.setRangeText(it.insertion, contexte.debut, fin, 'end');
      ferme();
      ta.focus();
      if (apresInsertion) apresInsertion();
      // après une balise, on propose tout de suite ses valeurs
      setTimeout(montre, 0);
    }

    ta.addEventListener('keydown', function (e) {
      if (liste.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopImmediatePropagation();
        choix = (choix + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        U.$$('li', liste).forEach(function (li, i) { li.classList.toggle('actif', i === choix); });
      } else if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === 'Tab') {
        e.preventDefault(); e.stopImmediatePropagation();
        valide(choix);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        ferme();
      }
    });
    ta.addEventListener('input', function () { choix = 0; montre(); });
    ta.addEventListener('click', function () { choix = 0; montre(); });
    ta.addEventListener('scroll', function () { if (!liste.hidden) montre(); });
    ta.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== ta) ferme(); }, 150); });
    liste.addEventListener('mousedown', function (e) {
      var li = e.target.closest('li');
      if (li) { e.preventDefault(); valide(+li.dataset.i); }
    });
  }

  root.GA_AUTOCOMPLETION = { attache: attache };
})(window);
