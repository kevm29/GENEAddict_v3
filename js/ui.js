/* GENEAddict — petits outils d'interface partagés par tous les écrans. */
(function (root) {
  'use strict';

  var S = root.GA_SAISIE;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function on(ctx, type, sel, fn) {
    ctx.addEventListener(type, function (e) {
      var el = e.target.closest(sel);
      if (el && ctx.contains(el)) fn(e, el);
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }

  function urlSure(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }

  // ---------------------------------------------------------------- présentation des données

  function pastilleStatut(st) {
    var s = S.STATUTS[st] || S.STATUTS.chercher;
    return '<span class="statut statut-' + esc(st) + '">' + esc(s.libelle) + '</span>';
  }

  function selectStatut(st, attrs) {
    return '<select class="select-statut statut-' + esc(st) + '" ' + (attrs || '') + '>' +
      Object.keys(S.STATUTS).map(function (k) {
        return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + esc(S.STATUTS[k].libelle) + '</option>';
      }).join('') + '</select>';
  }

  function personnesHTML(ps) {
    return (ps || []).map(function (p) {
      return esc(p.prenom) + (p.prenom ? ' ' : '') + '<span class="nom">' + esc(p.nom) + '</span>';
    }).join(' <span class="et">&amp;</span> ');
  }

  function libelleCentre(c, court) {
    if (!c) return '—';
    if (court) return c.type === 'AD' ? 'AD ' + c.dep : c.code;
    return c.nom;
  }

  function optionsCentres(choisi, vide) {
    var D = root.GA_DONNEES;
    var cs = D.etat.data.centres.slice();
    var groupes = { AD: [], national: [], AM: [], autre: [] };
    cs.forEach(function (c) { (groupes[c.type] || groupes.autre).push(c); });
    groupes.AD.sort(function (a, b) { return a.dep.localeCompare(b.dep, 'fr', { numeric: true }); });
    ['national', 'AM', 'autre'].forEach(function (k) { groupes[k].sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); }); });
    var titres = { national: 'Archives nationales', AM: 'Archives municipales', autre: 'Autres centres', AD: 'Archives départementales' };
    var h = vide != null ? '<option value="">' + esc(vide) + '</option>' : '';
    ['national', 'AM', 'autre', 'AD'].forEach(function (k) {
      if (!groupes[k].length) return;
      h += '<optgroup label="' + titres[k] + '">' + groupes[k].map(function (c) {
        var lib = c.type === 'AD' ? c.dep + ' — ' + c.nom.replace(/^Archives départementales — /, '') : c.nom;
        return '<option value="' + esc(c.id) + '"' + (c.id === choisi ? ' selected' : '') + '>' + esc(lib) + '</option>';
      }).join('') + '</optgroup>';
    });
    return h;
  }

  function dateCourte(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ---------------------------------------------------------------- notifications

  function toast(msg, genre) {
    var z = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (genre || '');
    el.textContent = msg;
    z.appendChild(el);
    setTimeout(function () { el.classList.add('part'); }, 3200);
    setTimeout(function () { el.remove(); }, 3800);
  }

  // ---------------------------------------------------------------- fenêtre modale

  var modaleOuverte = null;

  function ouvreModale(titre, corpsHTML, opts) {
    opts = opts || {};
    fermeModale();
    var fond = document.createElement('div');
    fond.className = 'modale-fond';
    fond.innerHTML = '<div class="modale ' + (opts.large ? 'large' : '') + '" role="dialog" aria-modal="true">' +
      '<header><h2>' + esc(titre) + '</h2><button class="btn-icone" data-fermer title="Fermer (Échap)">✕</button></header>' +
      '<div class="modale-corps">' + corpsHTML + '</div></div>';
    document.body.appendChild(fond);
    modaleOuverte = fond;
    fond.addEventListener('mousedown', function (e) { if (e.target === fond) fermeModale(); });
    fond.querySelector('[data-fermer]').addEventListener('click', fermeModale);
    var premier = fond.querySelector('input:not([type=hidden]), select, textarea');
    if (premier && !opts.sansFocus) premier.focus();
    return fond.querySelector('.modale');
  }

  function fermeModale() {
    if (modaleOuverte) { modaleOuverte.remove(); modaleOuverte = null; }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modaleOuverte) fermeModale();
  });

  function confirme(message, libelleOK, danger) {
    return new Promise(function (ok) {
      var m = ouvreModale('Confirmation', '<p>' + esc(message) + '</p><div class="actions">' +
        '<button class="btn" data-non>Annuler</button><button class="btn ' + (danger ? 'danger' : 'principal') + '" data-oui>' + esc(libelleOK || 'Confirmer') + '</button></div>', { sansFocus: true });
      m.querySelector('[data-oui]').addEventListener('click', function () { fermeModale(); ok(true); });
      m.querySelector('[data-non]').addEventListener('click', function () { fermeModale(); ok(false); });
      setTimeout(function () { m.querySelector('[data-oui]').focus(); }, 30);
    });
  }

  // ---------------------------------------------------------------- routeur

  function routeActuelle() {
    var h = location.hash.replace(/^#\/?/, '');
    var p = h.split('?');
    var morceaux = p[0].split('/').filter(Boolean).map(decodeURIComponent);
    var params = {};
    new URLSearchParams(p[1] || '').forEach(function (v, k) { params[k] = v; });
    return { vue: morceaux[0] || 'accueil', args: morceaux.slice(1), params: params };
  }

  function lien(vue, args, params) {
    var h = '#/' + vue + (args && args.length ? '/' + args.map(encodeURIComponent).join('/') : '');
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k] !== '' && params[k] != null) q.set(k, params[k]); });
    var qs = q.toString();
    return h + (qs ? '?' + qs : '');
  }

  function va(vue, args, params) {
    var l = lien(vue, args, params);
    if (location.hash === l) root.GA_APP.affiche();
    else location.hash = l;
  }

  /* Change les paramètres de l'adresse sans recharger l'écran (filtres). */
  function remplaceParams(params) {
    var r = routeActuelle();
    history.replaceState(null, '', lien(r.vue, r.args, params));
  }

  root.GA_UI = {
    esc: esc, $: $, $$: $$, on: on, debounce: debounce, urlSure: urlSure,
    pastilleStatut: pastilleStatut, selectStatut: selectStatut, personnesHTML: personnesHTML,
    libelleCentre: libelleCentre, optionsCentres: optionsCentres, dateCourte: dateCourte,
    toast: toast, ouvreModale: ouvreModale, fermeModale: fermeModale, confirme: confirme,
    routeActuelle: routeActuelle, lien: lien, va: va, remplaceParams: remplaceParams
  };
  root.GA_VUES = {};
})(window);
