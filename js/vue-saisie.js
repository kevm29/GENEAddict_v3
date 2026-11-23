/* GENEAddict — saisie rapide : coller du texte à balises ou un tableau, vérifier, ajouter. */
(function (root) {
  'use strict';

  var D = root.GA_DONNEES, U = root.GA_UI, S = root.GA_SAISIE, esc = U.esc;

  var EXEMPLE_BALISES =
    '# Une ligne qui commence par # est un commentaire.\n' +
    '# Ce bloc donne des valeurs communes à tous les actes qui suivent :\n' +
    '@par-defaut\n' +
    '@centre CARAN\n' +
    '@statut à chercher\n' +
    '\n' +
    '@date 02/06/1642\n' +
    '@type Procuration et acte de décès\n' +
    '@personne Gentien de MARIGNER\n' +
    '@notaire REGNAULT\n' +
    '@cote ET/LXXXV/366\n' +
    '@note Voir aussi la liasse suivante.\n' +
    '\n' +
    '@date 12/12/1682\n' +
    '@type Marché\n' +
    '@personne Hélène Angélique de MARIGNER & Jean CROSNIER\n' +
    '@notaire DECOURT\n' +
    '@cote ET/XXX/252\n' +
    '@statut obtenu\n';

  var EXEMPLE_TABLEAU =
    'date\ttype\tpersonnes\tnotaire\tcote\tstatut\tcentre\n' +
    '05/10/1654\tInventaire après décès\tHélène FLEURY\tPLISSON\tET/XXXIII/54\tà chercher\tCARAN\n' +
    '01/05/1657\tProcuration\tRoger de LA TOURNELLE\tJEHAN\tET/XXXVIII/656\tdemandé\tCARAN\n' +
    '25/01/1703\tActe de notoriété\tJean LEBRUN du BREUIL\tCLERET\tET/CIII/54\tobtenu\tCARAN\n';

  var AIDE =
    '<details class="aide carte"><summary>Aide-mémoire du format</summary><div class="aide-colonnes">' +
    '<div><h3>Texte à balises</h3><p>Un acte par paragraphe (séparés par une ligne vide ou <code>---</code>), une information par ligne :</p>' +
    '<table class="mini"><tr><td><code>@centre</code></td><td>CARAN, 35, AD35, Ille-et-Vilaine…</td></tr>' +
    '<tr><td><code>@date</code></td><td>02/06/1642 · ??/06/1642 · 06/1642 · 1642 · 2 juin 1642 · vers 1650</td></tr>' +
    '<tr><td><code>@type</code></td><td>Procuration, Contrat de mariage, IAD…</td></tr>' +
    '<tr><td><code>@personne</code></td><td>Prénom NOM (répétable, ou séparer par &amp;)</td></tr>' +
    '<tr><td><code>@notaire</code> <code>@ville</code> <code>@cote</code></td><td>texte libre</td></tr>' +
    '<tr><td><code>@statut</code></td><td>à chercher · demandé · obtenu · perdu (ou C, A, O, P)</td></tr>' +
    '<tr><td><code>@description</code></td><td>résumé court</td></tr>' +
    '<tr><td><code>@note</code></td><td>annotations ; les lignes suivantes sans balise s\'y ajoutent</td></tr>' +
    '<tr><td><code>@transcription</code> <code>@tags</code></td><td>texte, étiquettes séparées par des virgules</td></tr></table>' +
    '<p>On peut aussi écrire <code>Date : 1642</code> au lieu de <code>@date 1642</code>. Un bloc qui commence par <code>@par-defaut</code> s\'applique à tous les actes suivants.</p></div>' +
    '<div><h3>Tableau</h3><p>Copiez des cellules depuis Excel / LibreOffice et collez-les ici, ou collez un CSV (séparateur <code>;</code> <code>,</code> <code>|</code> ou tabulation).</p>' +
    '<p>La première ligne donne le nom des colonnes : <code>date</code>, <code>type</code>, <code>personnes</code>, <code>nom</code>, <code>prénom</code>, <code>notaire</code>, <code>ville</code>, <code>cote</code>, <code>statut</code>, <code>centre</code>, <code>description</code>, <code>notes</code>… Sans en-tête, l\'ordre attendu est : date, type, personnes, notaire, cote, description.</p>' +
    '<p><strong>Ancienne base :</strong> l\'export CSV de la table <code>docs</code> depuis phpMyAdmin (colonnes jour, mois, annee, p1, n1, p2, n2, dep, statut…) est reconnu tel quel.</p>' +
    '<p>Guide complet : <code>docs/FORMAT_SAISIE.md</code>.</p></div></div></details>';

  var brouillon = { texte: '', format: 'auto', centre: '', statut: '', fichier: '' };

  function rendu(racine, route) {
    if (route.params.centre) brouillon.centre = route.params.centre;
    var actes = [], resultat = null;

    racine.innerHTML =
      '<div class="titre-vue"><h1>Saisie rapide</h1><div class="actions-titre">' +
      '<button class="btn" data-ex="balises">Exemple à balises</button>' +
      '<button class="btn" data-ex="tableau">Exemple tableau</button>' +
      '<label class="btn">Ouvrir un fichier…<input type="file" accept=".txt,.csv,.tsv,.md,text/plain,text/csv" hidden></label></div></div>' +
      '<div class="a-importer"></div>' +
      '<div class="saisie-grille">' +
      '<div class="carte saisie-zone">' +
      '<div class="options-saisie">' +
      '<label>Format <select name="format"><option value="auto">Détection automatique</option><option value="balises">Texte à balises</option><option value="tableau">Tableau / CSV</option></select></label>' +
      '<label>Centre si non précisé <select name="centre">' + U.optionsCentres(brouillon.centre, '— aucun —') + '</select></label>' +
      '<label>Statut si non précisé ' + U.selectStatut(brouillon.statut || 'chercher', 'name="statut"') + '</label></div>' +
      '<textarea class="zone-texte" spellcheck="false" placeholder="Collez ou tapez ici vos actes…\n\n@date 02/06/1642\n@type Procuration\n@personne Gentien de MARIGNER\n@cote ET/LXXXV/366\n\n— ou collez directement des lignes copiées depuis Excel."></textarea>' +
      '<p class="discret">Astuce : glissez-déposez un fichier .txt ou .csv dans la zone. <kbd>Ctrl</kbd>+<kbd>Entrée</kbd> pour ajouter.</p></div>' +
      '<div class="carte apercu"><div class="apercu-tete"><h2>Aperçu</h2><span class="resume"></span></div>' +
      '<label class="case"><input type="checkbox" name="creerCentres" checked> Créer les centres inconnus</label>' +
      '<div class="apercu-liste"><p class="discret">L\'aperçu apparaît dès que vous tapez.</p></div>' +
      '<div class="actions"><button class="btn" data-vider>Vider</button><button class="btn principal" data-ajouter disabled>Ajouter</button></div></div>' +
      '</div>' + AIDE;

    var zone = U.$('.zone-texte', racine);
    var selFormat = U.$('[name=format]', racine);
    var selCentre = U.$('[name=centre]', racine);
    var selStatut = U.$('[name=statut]', racine);
    var liste = U.$('.apercu-liste', racine);
    var resume = U.$('.resume', racine);
    var btnAjouter = U.$('[data-ajouter]', racine);
    var creerCentres = U.$('[name=creerCentres]', racine);

    zone.value = brouillon.texte;
    selFormat.value = brouillon.format;

    function prepare() {
      brouillon.texte = zone.value; brouillon.format = selFormat.value;
      brouillon.centre = selCentre.value; brouillon.statut = selStatut.value;
      resultat = S.lire(zone.value, selFormat.value);
      var explicite = /^\s*@?statut\b/im.test(zone.value) || resultat.format === 'tableau' && resultat.colonnes && resultat.colonnes.indexOf('statut') >= 0;
      actes = resultat.actes.map(function (a) {
        var x = { acte: a, inclus: !a._erreurs.length, centre: null, centreInconnu: '' };
        if (a.centre) {
          x.centre = D.trouveCentre(a.centre);
          if (!x.centre) x.centreInconnu = a.centre;
        } else if (brouillon.centre) {
          x.centre = D.centreParId(brouillon.centre);
        }
        // le statut par défaut choisi ici remplace « à chercher » quand la saisie n'en donne pas
        if (brouillon.statut && brouillon.statut !== 'chercher' && a.statut === 'chercher' && !explicite) a.statut = brouillon.statut;
        x.doublon = D.estDoublon(a);
        if (x.doublon) x.inclus = false;
        return x;
      });
      dessine();
    }

    function dessine() {
      if (!resultat || resultat.format === 'vide') {
        liste.innerHTML = '<p class="discret">L\'aperçu apparaît dès que vous tapez.</p>';
        resume.textContent = ''; btnAjouter.disabled = true; btnAjouter.textContent = 'Ajouter';
        return;
      }
      var n = actes.filter(function (x) { return x.inclus; }).length;
      var nbErr = actes.filter(function (x) { return x.acte._erreurs.length; }).length;
      var nbDbl = actes.filter(function (x) { return x.doublon; }).length;
      var inconnus = {};
      actes.forEach(function (x) { if (x.centreInconnu) inconnus[x.centreInconnu] = 1; });
      resume.innerHTML = esc((resultat.format === 'balises' ? 'Texte à balises' : 'Tableau') + ' · ' + actes.length + ' acte' + (actes.length > 1 ? 's' : '')) +
        (nbDbl ? ' · <span class="txt-demande">' + nbDbl + ' doublon' + (nbDbl > 1 ? 's' : '') + ' probable' + (nbDbl > 1 ? 's' : '') + '</span>' : '') +
        (nbErr ? ' · <span class="txt-perdu">' + nbErr + ' en erreur</span>' : '');
      creerCentres.parentNode.hidden = !Object.keys(inconnus).length;
      btnAjouter.disabled = !n;
      btnAjouter.textContent = 'Ajouter ' + n + ' acte' + (n > 1 ? 's' : '');

      var globaux = (resultat.erreurs || []).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('');
      liste.innerHTML = (globaux ? '<ul class="messages">' + globaux + '</ul>' : '') +
        actes.map(function (x, i) {
          var a = x.acte;
          var msgs = a._erreurs.map(function (m) { return '<li class="err">' + esc(m) + '</li>'; })
            .concat(a._avertissements.map(function (m) { return '<li>' + esc(m) + '</li>'; }));
          if (x.doublon) msgs.unshift('<li class="dbl">Semble déjà présent dans la base (même cote, date et nom) — décoché.</li>');
          if (x.centreInconnu) msgs.push('<li>Centre « ' + esc(x.centreInconnu) + ' » inconnu' + (creerCentres.checked ? ' : il sera créé.' : ' : l\'acte sera rangé sans centre.') + '</li>');
          var centre = x.centre ? U.libelleCentre(x.centre, true) : (x.centreInconnu ? x.centreInconnu + ' (nouveau)' : '—');
          return '<div class="apercu-acte' + (x.inclus ? '' : ' exclu') + '" data-i="' + i + '">' +
            '<label class="case"><input type="checkbox"' + (x.inclus ? ' checked' : '') + (a._erreurs.length ? ' disabled' : '') + '></label>' +
            '<div class="apercu-corps"><div class="apercu-ligne1"><span class="num">l. ' + a._ligne + '</span>' +
            '<strong>' + esc(S.formatDate(a) || 'sans date') + '</strong> · ' + esc(a.type || 'type ?') + ' · ' +
            (U.personnesHTML(a.personnes) || '<em>personne ?</em>') + '</div>' +
            '<div class="apercu-ligne2">' + (a.notaire ? 'Me ' + esc(a.notaire) + ' · ' : '') + (a.ville ? esc(a.ville) + ' · ' : '') +
            '<span class="mono">' + esc(a.cote || 'sans cote') + '</span> · ' + esc(centre) + ' · ' + U.pastilleStatut(a.statut) +
            (a.notes ? ' · <span title="' + esc(a.notes) + '">✎ notes</span>' : '') + '</div>' +
            (msgs.length ? '<ul class="messages">' + msgs.join('') + '</ul>' : '') + '</div></div>';
        }).join('');
    }

    function ajoute() {
      var choisis = actes.filter(function (x) { return x.inclus; });
      if (!choisis.length) return;
      var crees = {};
      var docs = choisis.map(function (x) {
        var c = x.centre;
        if (!c && x.centreInconnu && creerCentres.checked) {
          var k = S.cle(x.centreInconnu);
          c = crees[k] || (crees[k] = D.ajouteCentre({ nom: x.centreInconnu, code: x.centreInconnu.toUpperCase().slice(0, 20) }));
        }
        return D.nouveauDocument(x.acte, c ? c.id : '');
      });
      D.ajouteDocuments(docs);
      var nbC = Object.keys(crees).length;
      U.toast(docs.length + ' acte' + (docs.length > 1 ? 's' : '') + ' ajouté' + (docs.length > 1 ? 's' : '') + (nbC ? ', ' + nbC + ' centre(s) créé(s)' : '') + '.', 'ok');
      var fichier = brouillon.fichier;
      brouillon.texte = ''; brouillon.fichier = '';
      zone.value = '';
      prepare();
      if (fichier) {
        D.archiveImporte(fichier).then(function () {
          U.toast('« ' + fichier + ' » rangé dans a-importer/importes/.', 'info');
          listeFichiers();
        }).catch(function (e) { console.error(e); });
      }
    }

    function charge(texte, nom) {
      zone.value = texte;
      brouillon.fichier = nom || '';
      prepare();
      zone.focus();
    }

    // Fichiers déposés dans le dossier a-importer/
    function listeFichiers() {
      var bloc = U.$('.a-importer', racine);
      if (D.etat.mode !== 'dossier' || D.etat.aReconnecter) {
        bloc.innerHTML = D.dossierPossible ? '<p class="discret">Reliez la base à un dossier (menu « Ma base ») pour pouvoir déposer vos fichiers texte dans <code>a-importer/</code> et les retrouver ici.</p>' : '';
        return;
      }
      D.listeAImporter().then(function (fichiers) {
        if (!fichiers.length) {
          bloc.innerHTML = '<p class="discret">Déposez vos fichiers .txt ou .csv dans <code>' + esc(D.etat.nomDossier) + '/a-importer/</code> : ils apparaîtront ici. <button class="btn-lien" data-relire>Actualiser</button></p>';
          return;
        }
        bloc.innerHTML = '<div class="carte fichiers"><strong>' + fichiers.length + ' fichier' + (fichiers.length > 1 ? 's' : '') + ' en attente dans a-importer/ :</strong> ' +
          fichiers.map(function (f, i) {
            return '<button class="btn' + (brouillon.fichier === f.nom ? ' principal' : '') + '" data-fichier="' + i + '">' + esc(f.nom) + '</button>';
          }).join(' ') + ' <button class="btn-lien" data-relire>Actualiser</button></div>';
        U.$$('[data-fichier]', bloc).forEach(function (b) {
          b.addEventListener('click', function () { var f = fichiers[+b.dataset.fichier]; charge(f.texte, f.nom); listeFichiers(); });
        });
      });
    }
    U.on(racine, 'click', '[data-relire]', listeFichiers);

    var prepareVite = U.debounce(prepare, 250);
    zone.addEventListener('input', function () { if (!zone.value) brouillon.fichier = ''; prepareVite(); });
    [selFormat, selCentre, selStatut].forEach(function (s) { s.addEventListener('change', prepare); });
    creerCentres.addEventListener('change', dessine);
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); prepare(); ajoute(); }
      if (e.key === 'Tab' && !e.shiftKey && (selFormat.value === 'tableau' || zone.value.indexOf('\t') >= 0)) {
        // tabulation réelle dans la zone (utile pour taper un petit tableau)
        e.preventDefault();
        var s = zone.selectionStart;
        zone.setRangeText('\t', s, zone.selectionEnd, 'end');
        prepareVite();
      }
    });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('survol'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('survol'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('survol');
      var f = e.dataTransfer.files[0];
      if (f) f.text().then(function (t) { charge(t, ''); U.toast('Fichier « ' + f.name + ' » chargé.', 'info'); });
    });
    U.$('input[type=file]', racine).addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) f.text().then(function (t) { charge(t, ''); });
      e.target.value = '';
    });
    U.on(racine, 'click', '[data-ex]', function (e, el) {
      charge(el.dataset.ex === 'balises' ? EXEMPLE_BALISES : EXEMPLE_TABLEAU, '');
    });
    U.on(liste, 'change', '.apercu-acte input[type=checkbox]', function (e, el) {
      var i = +el.closest('.apercu-acte').dataset.i;
      actes[i].inclus = el.checked;
      dessine();
    });
    U.$('[data-vider]', racine).addEventListener('click', function () { zone.value = ''; brouillon.fichier = ''; prepare(); zone.focus(); });
    btnAjouter.addEventListener('click', ajoute);

    listeFichiers();
    prepare();
    zone.focus();
  }

  root.GA_VUES.saisie = { titre: 'Saisie rapide', rendu: rendu };
})(window);
