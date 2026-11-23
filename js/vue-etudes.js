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
      (c.solutions ? '<span class="badge-solutions">Mode correction</span>' : '') +
      '<button class="btn" data-fermer-annee title="Redemander le mot de passe">🔒 Verrouiller</button></div>';
  }

  function styleAnnee(annee, c) {
    var accent = (c.theme && c.theme.accent) || '#1f77a8';
    return '--accent:' + accent + ';--motif:' + esc(imgCss(annee, 'motif.jpg')) + ';--bandeau:' + esc(imgCss(annee, 'bandeau.jpg'));
  }

  function epoque(e) {
    return e.epoque ? '<span class="couv-epoque">' + esc(e.epoque).replace(/(X|V|I)e\b/, '$1<sup>e</sup>') + '</span>' : '';
  }

  function grille(racine, annee, c) {
    racine.innerHTML = '<div class="titre-vue"><h1>' + esc(c.titre) + '</h1>' + barreAnnee(annee, c) + '</div>' +
      '<div class="couvertures" style="' + styleAnnee(annee, c) + '">' + c.etudes.map(function (e, i) {
        return '<a class="couverture" href="#/etudes/' + encodeURIComponent(annee) + '/' + encodeURIComponent(e.id) + '">' +
          '<span class="couv-photo"><img src="' + img(annee, e.couverture) + '" alt="" loading="lazy"></span>' +
          '<span class="couv-num">TP ' + (i + 1) + '</span>' + epoque(e) +
          '<span class="couv-texte"><span class="couv-titre">' + esc(e.titre) + '</span><span class="couv-sous">' + esc(e.sousTitre) + '</span></span></a>';
      }).join('') + '</div>';
  }

  /* En mode correction, chaque réponse reste cachée jusqu'à ce qu'on clique dessus. */
  function blocReponse(d, k) {
    return '<div class="reponse cachee" data-reponse="' + k + '">' +
      '<button type="button" class="voir-reponse">Voir la réponse</button>' +
      '<div class="reponse-texte">' + (d.solution ? d.solution : '<em>Réponse à venir.</em>') + '</div></div>';
  }

  function listeDefis(c, defis) {
    var k = 0;
    return '<ol class="defis">' + defis.map(function (d) {
      if (d.intertitre) return '<li class="intertitre">' + esc(d.intertitre) + '</li>';
      if (d.note) return '<li class="note-defi">' + d.note + '</li>';
      var rep = c.solutions ? blocReponse(d, k++)
        : '<textarea class="saisie-reponse" data-k="' + (k++) + '" rows="2" placeholder="Votre réponse…"></textarea>';
      return '<li class="' + (d.bonus ? 'defi bonus-defi' : 'defi') + '"><div>' + (d.bonus ? '<span class="bonus">Bonus</span> ' : '') + d.texte + '</div>' + rep + '</li>';
    }).join('') + '</ol>';
  }

  function figures(annee, liste) {
    return (liste || []).map(function (il) {
      return '<figure class="' + (il.large ? 'large' : '') + '"><img src="' + img(annee, il.img) + '" alt="">' +
        (il.legende ? '<figcaption>' + il.legende + '</figcaption>' : '') + '</figure>';
    }).join('');
  }

  // ---------------------------------------------------------------- réponses des participants

  var CLE_PARTICIPANT = 'ga-etudes-participant';

  function stockage(cle, valeur) {
    try {
      if (valeur === undefined) return localStorage.getItem(cle) || '';
      if (valeur) localStorage.setItem(cle, valeur); else localStorage.removeItem(cle);
    } catch (e) { /* stockage indisponible : tant pis pour le brouillon */ }
    return '';
  }
  function cleBrouillon(annee, e, k) { return 'ga-etudes-rep-' + annee + '-' + e.id + '-' + k; }

  function envoiConfigure() {
    var cfg = root.GA_SUPABASE || {};
    return !!(U.urlSure(cfg.url) && cfg.cle);
  }

  function barreEnvoi(annee, e) {
    var dernier = stockage('ga-etudes-envoi-' + annee + '-' + e.id);
    return '<div class="barre-envoi">' +
      '<label>Nom ou équipe <input type="text" data-participant maxlength="100" autocomplete="name" value="' + esc(stockage(CLE_PARTICIPANT)) + '"></label>' +
      '<button type="button" class="btn principal" data-envoyer' + (envoiConfigure() ? '' : ' disabled title="Envoi non configuré (etudes/supabase.js)"') + '>Envoyer mes réponses</button>' +
      '<span class="etat-envoi">' + (envoiConfigure() ? (dernier ? 'Envoyé le ' + esc(dernier) + ' — vous pouvez corriger et renvoyer.' : 'Vos réponses sont gardées dans ce navigateur jusqu\'à l\'envoi.')
        : 'Envoi pas encore configuré : vos réponses restent dans ce navigateur.') + '</span></div>';
  }

  function texteSimple(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent.replace(/\s+/g, ' ').trim();
  }

  /* Envoie une ligne par réponse non vide (API REST de Supabase, insertion seule). */
  function envoie(annee, e, participant, reponses) {
    var cfg = root.GA_SUPABASE;
    var cle = String(cfg.cle).trim();
    var entetes = { 'Content-Type': 'application/json', apikey: cle, Prefer: 'return=minimal' };
    // ancienne clé « anon » (un JWT) : on la répète dans Authorization ; une clé sb_publishable_ n'y a pas sa place
    if (/^eyJ/.test(cle)) entetes.Authorization = 'Bearer ' + cle;
    var lignes = reponses.map(function (r) {
      return { annee: annee, tp: e.id, tp_titre: e.titre, defi: r.numero, question: r.question.slice(0, 2000), participant: participant, reponse: r.reponse.slice(0, 5000) };
    });
    return fetch(String(cfg.url).replace(/\/+$/, '') + '/rest/v1/' + encodeURIComponent(cfg.table || 'reponses_etudes'), {
      method: 'POST', headers: entetes, body: JSON.stringify(lignes)
    }).then(function (rep) {
      if (rep.ok) return lignes.length;
      return rep.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (err) { /* texte brut */ }
        throw new Error('Supabase a refusé l\'envoi (' + rep.status + ') : ' + msg);
      });
    });
  }

  function brancheReponses(racine, annee, e) {
    var zones = U.$$('.saisie-reponse', racine);
    var defis = e.defis.filter(function (d) { return !d.intertitre && !d.note; });
    zones.forEach(function (z) {
      z.value = stockage(cleBrouillon(annee, e, z.dataset.k));
      ajuste(z);
      z.addEventListener('input', function () { stockage(cleBrouillon(annee, e, z.dataset.k), z.value); ajuste(z); });
    });
    function ajuste(z) { z.style.height = 'auto'; z.style.height = Math.min(z.scrollHeight + 2, 240) + 'px'; }
    var champNom = U.$('[data-participant]', racine);
    champNom.addEventListener('input', function () { stockage(CLE_PARTICIPANT, champNom.value.trim()); });
    var bouton = U.$('[data-envoyer]', racine), etat = U.$('.etat-envoi', racine);
    bouton.addEventListener('click', function () {
      var participant = champNom.value.trim();
      if (!participant) { champNom.focus(); U.toast('Indiquez votre nom ou celui de votre équipe.', 'erreur'); return; }
      var numero = 0;
      var reponses = [];
      zones.forEach(function (z, i) {
        var d = defis[i];
        if (!d.bonus) numero++;
        if (!z.value.trim()) return;
        reponses.push({ numero: d.bonus ? 0 : numero, question: (d.bonus ? 'Bonus : ' : '') + texteSimple(d.texte), reponse: z.value.trim() });
      });
      if (!reponses.length) { U.toast('Aucune réponse à envoyer.', 'erreur'); return; }
      bouton.disabled = true; bouton.textContent = 'Envoi…';
      envoie(annee, e, participant, reponses).then(function (n) {
        var quand = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        stockage('ga-etudes-envoi-' + annee + '-' + e.id, quand);
        etat.textContent = 'Envoyé le ' + quand + ' — vous pouvez corriger et renvoyer.';
        U.toast(n + ' réponse' + (n > 1 ? 's envoyées' : ' envoyée') + '. Merci !', 'ok');
      }).catch(function (err) {
        etat.textContent = err.message.indexOf('Supabase') === 0 ? err.message : 'Envoi impossible (connexion ?) : vos réponses restent gardées ici.';
        U.toast('Envoi impossible.', 'erreur');
      }).then(function () { bouton.disabled = false; bouton.textContent = 'Envoyer mes réponses'; });
    });
  }

  function detail(racine, annee, c, idEtude) {
    var i = c.etudes.findIndex(function (e) { return e.id === idEtude; });
    if (i < 0) { U.va('etudes', [annee]); return; }
    var e = c.etudes[i], prec = c.etudes[i - 1], suiv = c.etudes[i + 1];
    var lien = function (x) { return '#/etudes/' + encodeURIComponent(annee) + '/' + encodeURIComponent(x.id); };
    var illus = e.illustrations || [];
    var larges = figures(annee, illus.filter(function (il) { return il.large; }));
    var cote = figures(annee, illus.filter(function (il) { return !il.large; }));
    var annexe = c.solutions && e.annexeSolution ?
      '<section class="annexe reponse cachee" data-reponse="annexe"><button type="button" class="voir-reponse">Voir : ' + esc(e.annexeSolution.titre) + '</button>' +
      '<div class="reponse-texte"><h4>' + esc(e.annexeSolution.titre) + '</h4><div class="galerie' + ((e.annexeSolution.galerie || []).length === 1 ? ' seule' : '') + '">' +
      figures(annee, e.annexeSolution.galerie) + '</div></div></section>' : '';
    racine.innerHTML =
      '<div class="titre-vue"><h1><a href="#/etudes/' + encodeURIComponent(annee) + '" class="fil">' + esc(c.titre) + '</a> · TP ' + (i + 1) + '</h1>' +
      barreAnnee(annee, c,
        (c.solutions ? '<button class="btn" data-tout="1">Tout révéler</button><button class="btn" data-tout="0">Tout masquer</button>' : '') +
        (prec ? '<a class="btn" href="' + lien(prec) + '" title="' + esc(prec.titre) + '">← TP ' + i + '</a>' : '') +
        (suiv ? '<a class="btn" href="' + lien(suiv) + '" title="' + esc(suiv.titre) + '">TP ' + (i + 2) + ' →</a>' : '')) + '</div>' +
      '<article class="page-etude" style="' + styleAnnee(annee, c) + '">' +
      '<div class="etude-bandeau"></div>' +
      '<div class="etude-corps"><h2 class="etude-titre"><span class="t">' + esc(e.titre) + '</span> <span class="etude-sous">— ' + esc(e.sousTitre) + '</span>' +
      (e.epoque ? ' <span class="etude-epoque">' + esc(e.epoque).replace(/(X|V|I)e\b/, '$1<sup>e</sup>') + ' siècle</span>' : '') + '</h2>' +
      '<div class="etude-colonnes' + (cote ? '' : ' sans-illus') + '"><div class="etude-texte">' +
      (larges ? '<div class="illus-larges">' + larges + '</div>' : '') +
      (e.introduction ? '<div class="introduction">' + e.introduction + '</div>' : '') +
      (e.accroche ? '<p class="accroche">→ ' + esc(e.accroche) + '</p>' : '') +
      '<h3 class="defis-titre">Défis</h3>' + listeDefis(c, e.defis) +
      (e.remarque ? '<p class="remarque">' + e.remarque + '</p>' : '') + annexe +
      (c.solutions ? '' : barreEnvoi(annee, e)) + '</div>' +
      (cote ? '<aside class="illus-cote">' + cote + '</aside>' : '') + '</div></div></article>';
    liensExternes(racine);
    U.on(racine, 'click', '.reponse.cachee', function (ev, el) {
      if (ev.target.closest('a')) return;
      el.classList.remove('cachee');
    });
    U.on(racine, 'click', '[data-tout]', function (ev, el) {
      U.$$('.reponse', racine).forEach(function (r) { r.classList.toggle('cachee', el.dataset.tout !== '1'); });
    });
    if (!c.solutions) brancheReponses(racine, annee, e);
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
    }
    if (ouvertes[annee]) suite();
    else {
      racine.innerHTML = '<p class="chargement">Ouverture…</p>';
      reouvreSession(annee).then(suite);
    }
  }

  root.GA_VUES.etudes = { titre: 'Études de cas', rendu: rendu };
})(window);
