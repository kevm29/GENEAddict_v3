/* GENEAddict — études de cas (TP), protégées par mot de passe.
 *
 * Le contenu est chiffré dans etudes/etudes.js (voir outils/etudes.js) : le mot de passe
 * sert de clé de déchiffrement, il n'est écrit nulle part dans le code. Selon le mot de passe
 * saisi, on obtient les énoncés seuls ou les énoncés avec les réponses.
 * Une fois une année ouverte, elle le reste jusqu'à la fermeture de l'onglet. */
(function (root) {
  'use strict';

  var U = root.GA_UI, esc = U.esc;
  var ouvertes = {};   // annee → contenu déchiffré
  var masquerReponses = false;

  // ---------------------------------------------------------------- déchiffrement

  function deb64(s) {
    var bin = atob(s), t = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
    return t;
  }

  function dechiffre(bloc, motDePasse) {
    var subtle = root.crypto && root.crypto.subtle;
    if (!subtle) return Promise.reject(new Error('Ce navigateur ne sait pas déchiffrer (utilisez Chrome, Edge ou Firefox récents).'));
    return subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return subtle.deriveKey({ name: 'PBKDF2', salt: deb64(bloc.sel), iterations: bloc.iterations, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (k) {
      return subtle.decrypt({ name: 'AES-GCM', iv: deb64(bloc.iv) }, k, deb64(bloc.donnees));
    }).then(function (clair) {
      return JSON.parse(new TextDecoder().decode(clair));
    });
  }

  /* Essaie le mot de passe sur chaque niveau (énoncés, puis solutions). */
  function ouvre(annee, motDePasse) {
    var a = (root.GA_ETUDES || {})[annee];
    if (!a) return Promise.reject(new Error('Année inconnue.'));
    var essais = a.niveaux.slice();
    function suivant() {
      if (!essais.length) return Promise.reject(new Error('Mot de passe incorrect.'));
      return dechiffre(essais.shift(), motDePasse).catch(function (e) {
        if (e && e.name === 'OperationError') return suivant();
        throw e;
      });
    }
    return suivant().then(function (c) {
      ouvertes[annee] = c;
      try { sessionStorage.setItem('ga-etudes-' + annee, motDePasse); } catch (e) { /* stockage indisponible */ }
      return c;
    });
  }

  function reouvreSession(annee) {
    var mdp = null;
    try { mdp = sessionStorage.getItem('ga-etudes-' + annee); } catch (e) { /* ignoré */ }
    return mdp ? ouvre(annee, mdp).catch(function () { return null; }) : Promise.resolve(null);
  }

  function ferme(annee) {
    delete ouvertes[annee];
    try { sessionStorage.removeItem('ga-etudes-' + annee); } catch (e) { /* ignoré */ }
  }

  // ---------------------------------------------------------------- affichage

  function img(annee, nom) {
    return 'etudes/' + encodeURIComponent(annee) + '/img/' + encodeURIComponent(nom);
  }

  /* Adresse complète, pour les images passées au CSS par une variable (sinon résolues depuis css/). */
  function imgCss(annee, nom) {
    return "url('" + new URL(img(annee, nom), location.href).href + "')";
  }

  /* Les liens du contenu s'ouvrent dans un nouvel onglet. */
  function liensExternes(el) {
    U.$$('a[href^="http"]', el).forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
  }

  function listeAnnees(racine) {
    var annees = Object.keys(root.GA_ETUDES || {}).sort().reverse();
    racine.innerHTML = '<div class="titre-vue"><h1>Études de cas</h1></div>' +
      (annees.length ? '<div class="annees">' + annees.map(function (k) {
        var a = root.GA_ETUDES[k], o = ouvertes[k];
        return '<a class="carte annee" href="#/etudes/' + encodeURIComponent(k) + '">' +
          '<span class="cadenas">' + (o ? '🔓' : '🔒') + '</span><h2>' + esc(a.titre) + '</h2>' +
          '<p class="discret">' + a.nombre + ' études' + (o ? ' · ouvert' + (o.solutions ? ' avec les réponses' : '') : ' · mot de passe demandé') + '</p></a>';
      }).join('') + '</div>' : '<div class="carte vide">Aucune étude de cas pour l\'instant.</div>');
  }

  function formulaire(racine, annee) {
    var a = root.GA_ETUDES[annee];
    racine.innerHTML = '<div class="titre-vue"><h1>' + esc(a.titre) + '</h1><div class="actions-titre"><a class="btn" href="#/etudes">← Toutes les années</a></div></div>' +
      '<form class="carte mdp-etudes"><span class="cadenas grand">🔒</span><p>Ces études de cas sont protégées. Saisissez le mot de passe donné en séance.</p>' +
      '<input type="password" name="mdp" autocomplete="off" placeholder="Mot de passe" required>' +
      '<button class="btn principal">Ouvrir</button><p class="erreur-mdp" hidden></p></form>';
    var f = U.$('form', racine), err = U.$('.erreur-mdp', racine);
    f.elements.mdp.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = U.$('button', f);
      b.disabled = true; b.textContent = 'Vérification…'; err.hidden = true;
      ouvre(annee, f.elements.mdp.value).then(function (c) {
        U.toast(c.solutions ? 'Études ouvertes avec les réponses.' : 'Études ouvertes.', 'ok');
        root.GA_APP.affiche();
      }).catch(function (ex) {
        b.disabled = false; b.textContent = 'Ouvrir';
        err.hidden = false; err.textContent = ex.message;
        f.elements.mdp.select();
      });
    });
  }

  function barreAnnee(annee, c, navigation) {
    return '<div class="actions-titre">' + (navigation || '') +
      (c.solutions ? '<span class="badge-solutions">Mode correction</span>' +
        '<button class="btn" data-bascule>' + (masquerReponses ? 'Afficher les réponses' : 'Masquer les réponses') + '</button>' : '') +
      '<button class="btn" data-fermer-annee title="Redemander le mot de passe">🔒 Verrouiller</button></div>';
  }

  function grille(racine, annee, c) {
    racine.innerHTML = '<div class="titre-vue"><h1>' + esc(c.titre) + '</h1>' + barreAnnee(annee, c) + '</div>' +
      '<div class="couvertures">' + c.etudes.map(function (e, i) {
        return '<a class="couverture" href="#/etudes/' + encodeURIComponent(annee) + '/' + encodeURIComponent(e.id) + '" style="--motif:' + esc(imgCss(annee, 'motif.jpg')) + '">' +
          '<span class="couv-photo"><img src="' + img(annee, e.couverture) + '" alt="" loading="lazy"></span>' +
          '<span class="couv-num">TP ' + (i + 1) + '</span>' +
          '<span class="couv-texte"><span class="couv-titre">' + esc(e.titre) + '</span><span class="couv-sous">' + esc(e.sousTitre) + '</span></span></a>';
      }).join('') + '</div>';
  }

  function detail(racine, annee, c, idEtude) {
    var i = c.etudes.findIndex(function (e) { return e.id === idEtude; });
    if (i < 0) { U.va('etudes', [annee]); return; }
    var e = c.etudes[i], prec = c.etudes[i - 1], suiv = c.etudes[i + 1];
    var lien = function (x) { return '#/etudes/' + encodeURIComponent(annee) + '/' + encodeURIComponent(x.id); };
    var illus = (e.illustrations || []).map(function (il) {
      return '<figure class="' + (il.large ? 'large' : '') + '"><img src="' + img(annee, il.img) + '" alt="">' +
        (il.legende ? '<figcaption>' + il.legende + '</figcaption>' : '') + '</figure>';
    });
    var larges = (e.illustrations || []).map(function (il, k) { return il.large ? illus[k] : ''; }).join('');
    var cote = (e.illustrations || []).map(function (il, k) { return il.large ? '' : illus[k]; }).join('');
    racine.innerHTML =
      '<div class="titre-vue"><h1><a href="#/etudes/' + encodeURIComponent(annee) + '" class="fil">' + esc(c.titre) + '</a> · TP ' + (i + 1) + '</h1>' +
      barreAnnee(annee, c, (prec ? '<a class="btn" href="' + lien(prec) + '" title="' + esc(prec.titre) + '">← TP ' + i + '</a>' : '') +
        (suiv ? '<a class="btn" href="' + lien(suiv) + '" title="' + esc(suiv.titre) + '">TP ' + (i + 2) + ' →</a>' : '')) + '</div>' +
      '<article class="page-etude" style="--bandeau:' + esc(imgCss(annee, 'bandeau.jpg')) + '">' +
      '<div class="etude-bandeau"></div>' +
      '<div class="etude-corps"><h2 class="etude-titre">' + esc(e.titre) + ' <span class="etude-sous">— ' + esc(e.sousTitre) + '</span></h2>' +
      '<div class="etude-colonnes"><div class="etude-texte">' +
      (larges ? '<div class="illus-larges">' + larges + '</div>' : '') +
      '<p class="accroche">→ ' + esc(e.accroche) + '</p>' +
      '<h3 class="defis-titre">Défis</h3><ol class="defis">' + e.defis.map(function (d) {
        var rep = c.solutions && !masquerReponses ? '<div class="reponse">' + (d.solution ? '<strong>Réponse : </strong>' + d.solution : '<em>Réponse à venir.</em>') + '</div>' : '';
        return '<li><div>' + d.texte + '</div>' + rep + '</li>';
      }).join('') + '</ol>' +
      (e.remarque ? '<p class="remarque">' + e.remarque + '</p>' : '') + '</div>' +
      (cote ? '<aside class="illus-cote">' + cote + '</aside>' : '') + '</div></div></article>';
    liensExternes(racine);
    racine.scrollTop = 0; root.scrollTo(0, 0);
  }

  function rendu(racine, route) {
    var annee = route.args[0], idEtude = route.args[1];
    if (!annee || !(root.GA_ETUDES || {})[annee]) { listeAnnees(racine); return; }
    function suite() {
      var c = ouvertes[annee];
      if (!c) { formulaire(racine, annee); return; }
      if (idEtude) detail(racine, annee, c, idEtude); else grille(racine, annee, c);
      U.on(racine, 'click', '[data-fermer-annee]', function () { ferme(annee); U.va('etudes', [annee]); });
      U.on(racine, 'click', '[data-bascule]', function () { masquerReponses = !masquerReponses; root.GA_APP.affiche(); });
    }
    if (ouvertes[annee]) suite();
    else {
      racine.innerHTML = '<p class="chargement">Ouverture…</p>';
      reouvreSession(annee).then(suite);
    }
  }

  root.GA_VUES.etudes = { titre: 'Études de cas', rendu: rendu };
})(window);
