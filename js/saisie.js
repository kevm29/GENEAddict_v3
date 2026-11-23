/* GENEAddict — lecture de la saisie rapide.
 *
 * Deux formats sont acceptés (voir docs/FORMAT_SAISIE.md) :
 *   1. le texte à balises : un acte par paragraphe, une information par ligne
 *        @date 02/06/1642
 *        @type Procuration
 *        @personne Gentien de MARIGNER
 *   2. le tableau : copier-coller depuis un tableur (tabulations) ou un CSV (; , |),
 *      avec ou sans ligne d'en-tête.
 *
 * Ce fichier ne dépend ni du navigateur ni de la base : il transforme du texte en
 * une liste d'actes « bruts » que l'application rapproche ensuite des centres.
 * Il fonctionne aussi sous Node pour les tests (tests/saisie.test.js). */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- outils

  function sansAccents(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function cle(s) {
    return sansAccents(s).toLowerCase().replace(/[\s_.'’-]+/g, '').trim();
  }
  function nettoie(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }
  function pad2(n) {
    n = String(n);
    return n.length === 1 ? '0' + n : n;
  }

  // ---------------------------------------------------------------- statuts

  var STATUTS = {
    chercher: { libelle: 'À chercher', court: 'C' },
    demande: { libelle: 'Demandé / en attente', court: 'A' },
    obtenu: { libelle: 'Obtenu', court: 'O' },
    perdu: { libelle: 'Perdu / détruit', court: 'P' }
  };
  var ALIAS_STATUT = {
    c: 'chercher', chercher: 'chercher', achercher: 'chercher', afaire: 'chercher', todo: 'chercher', nouveau: 'chercher',
    a: 'demande', attente: 'demande', enattente: 'demande', demande: 'demande', demander: 'demande', commande: 'demande', reserve: 'demande',
    o: 'obtenu', obtenu: 'obtenu', ok: 'obtenu', trouve: 'obtenu', fait: 'obtenu', photographie: 'obtenu', photo: 'obtenu',
    p: 'perdu', perdu: 'perdu', detruit: 'perdu', perdudetruit: 'perdu', lacune: 'perdu', introuvable: 'perdu', manquant: 'perdu'
  };
  function lireStatut(s) {
    var k = cle(s);
    return k ? (ALIAS_STATUT[k] || null) : null;
  }

  // ---------------------------------------------------------------- dates

  var MOIS = {
    janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, mar: 3, avril: 4, avr: 4,
    mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9,
    octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12
  };
  var INCONNU = /^(\?+|x+|0+|-+|_+)$/i;

  /* Renvoie { jour, mois, annee, texte, ok } — jour/mois/annee en texte ('' si inconnu).
   * « texte » garde la forme saisie quand elle n'est pas une date exacte (vers 1650, 1650-1660…). */
  function lireDate(brut) {
    var s = nettoie(brut);
    var r = { jour: '', mois: '', annee: '', texte: '', ok: true };
    if (!s) return r;
    var t = sansAccents(s).toLowerCase().replace(/^le\s+/, '');
    var approx = /^(vers|env\.?|environ|ca\.?|circa|avant|apres|av\.?|ap\.?)\s+/.exec(t);
    if (approx) t = t.slice(approx[0].length);
    var m;

    function annee(a) { return /^\d{3,4}$/.test(a) ? a : null; }
    function partie(p, max) {
      if (p == null || INCONNU.test(p)) return '';
      if (!/^\d{1,2}$/.test(p) || +p < 1 || +p > max) return null;
      return pad2(+p);
    }

    if ((m = /^([0-9?x_-]{1,2})[\/.\s]([0-9?x_-]{1,2})[\/.\s](\d{3,4})$/i.exec(t))) {
      // 02/06/1642 — ??/06/1642 — 2.6.1642
      r.jour = partie(m[1], 31); r.mois = partie(m[2], 12); r.annee = m[3];
    } else if ((m = /^(\d{3,4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(t))) {
      // 1642-06-02 (ISO)
      r.annee = m[1]; r.mois = partie(m[2], 12); r.jour = m[3] ? partie(m[3], 31) : '';
    } else if ((m = /^([0-9?x_-]{1,2})[\/.\s](\d{3,4})$/i.exec(t))) {
      // 06/1642
      r.mois = partie(m[1], 12); r.annee = m[2];
    } else if ((m = /^(?:(\d{1,2})(?:er)?\s+)?([a-z]+)\.?\s+(\d{3,4})$/.exec(t)) && MOIS[m[2]]) {
      // 2 juin 1642 — 1er juin 1642 — juin 1642
      r.jour = m[1] ? partie(m[1], 31) : ''; r.mois = pad2(MOIS[m[2]]); r.annee = m[3];
    } else if ((m = /^(\d{3,4})$/.exec(t))) {
      r.annee = m[1];
    } else if ((m = /^(\d{3,4})\s*(?:-|à|a|\/)\s*(\d{3,4})$/.exec(t))) {
      // période 1650-1660 : on garde la première année pour le tri
      r.annee = m[1]; r.texte = s;
      return r;
    } else {
      r.ok = false; r.texte = s;
      var y = /(\d{4})/.exec(t);
      if (y) r.annee = y[1];
      return r;
    }
    if (r.jour === null || r.mois === null || !annee(r.annee)) {
      r = { jour: '', mois: '', annee: '', texte: s, ok: false };
      var y2 = /(\d{4})/.exec(t);
      if (y2) r.annee = y2[1];
      return r;
    }
    if (approx) r.texte = s;
    return r;
  }

  function formatDate(a) {
    if (!a) return '';
    if (a.dateTexte) return a.dateTexte;
    if (!a.annee) return '';
    if (!a.mois) return a.jour ? a.jour + '/??/' + a.annee : a.annee;
    return (a.jour || '??') + '/' + a.mois + '/' + a.annee;
  }

  // ---------------------------------------------------------------- personnes

  var PARTICULES = { de: 1, du: 1, des: 1, "d'": 1, 'd’': 1, le: 1, la: 1, les: 1, del: 1, della: 1, van: 1, von: 1, der: 1, di: 1, da: 1, dos: 1 };

  function estMajuscules(mot) {
    var lettres = mot.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
    return lettres.length >= 2 && lettres === lettres.toUpperCase() && lettres !== lettres.toLowerCase();
  }
  function estParticule(mot) {
    return !!PARTICULES[mot.toLowerCase()] || /^d['’]$/i.test(mot);
  }

  /* « Gentien de MARIGNER » → { prenom: 'Gentien', nom: 'de MARIGNER' }
   * « MARIGNER, Gentien »   → { prenom: 'Gentien', nom: 'MARIGNER' }
   * « MARIGNER Gentien »    → { prenom: 'Gentien', nom: 'MARIGNER' }
   * « Pierre Mesmyn »       → { prenom: 'Pierre', nom: 'Mesmyn' } */
  function lirePersonne(brut) {
    var s = nettoie(brut);
    if (!s) return null;
    var v = s.split(',');
    if (v.length === 2 && v[1].trim()) return { prenom: nettoie(v[1]), nom: nettoie(v[0]) };
    var mots = s.split(' ');
    if (mots.length === 1) return { prenom: '', nom: s };
    var i = mots.findIndex(estMajuscules);
    if (i > 0) {
      var debut = i;
      while (debut > 1 && estParticule(mots[debut - 1])) debut--;
      return { prenom: mots.slice(0, debut).join(' '), nom: mots.slice(debut).join(' ') };
    }
    if (i === 0) {
      var fin = 0;
      while (fin < mots.length && (estMajuscules(mots[fin]) || (fin > 0 && estParticule(mots[fin]) && mots[fin + 1] && estMajuscules(mots[fin + 1])))) fin++;
      if (fin === mots.length) return { prenom: '', nom: s };
      return { prenom: mots.slice(fin).join(' '), nom: mots.slice(0, fin).join(' ') };
    }
    var j = mots.length - 1;
    while (j > 1 && estParticule(mots[j - 1])) j--;
    return { prenom: mots.slice(0, j).join(' '), nom: mots.slice(j).join(' ') };
  }

  function lirePersonnes(brut) {
    return String(brut || '').split(/\s*(?:&|\+|;|\n)\s*/).map(lirePersonne).filter(Boolean);
  }

  function formatPersonne(p) {
    return nettoie((p.prenom || '') + ' ' + (p.nom || ''));
  }

  // ---------------------------------------------------------------- champs

  /* Noms de balises / de colonnes reconnus (comparés sans accents, ni casse, ni espaces). */
  var CHAMPS = {
    centre: ['centre', 'archives', 'archive', 'depot', 'service', 'dep', 'departement', 'ad', 'lieuconservation'],
    date: ['date', 'datedelacte', 'dateacte'],
    jour: ['jour', 'j'],
    mois: ['mois', 'm'],
    annee: ['annee', 'an', 'a', 'year'],
    type: ['type', 'acte', 'typedacte', 'typeacte', 'nature', 'typededocument'],
    personnes: ['personne', 'personnes', 'individu', 'individus', 'parties', 'partie', 'temoins', 'concerne'],
    nom: ['nom', 'n1', 'nom1'],
    prenom: ['prenom', 'p1', 'prenom1'],
    nom2: ['n2', 'nom2'],
    prenom2: ['p2', 'prenom2'],
    notaire: ['notaire', 'me', 'maitre', 'etude'],
    ville: ['ville', 'lieu', 'commune', 'paroisse'],
    cote: ['cote', 'cotes', 'reference', 'ref'],
    statut: ['statut', 'etat', 'status'],
    description: ['description', 'desc', 'details', 'detail', 'objet', 'resume', 'analyse'],
    notes: ['note', 'notes', 'annotation', 'annotations', 'remarque', 'remarques', 'commentaire'],
    transcription: ['transcription', 'trad', 'texte'],
    tags: ['tag', 'tags', 'etiquette', 'etiquettes', 'motcle', 'motscles'],
    ignorer: ['id', 'idx', 'numero']
  };
  var INDEX_CHAMPS = {};
  Object.keys(CHAMPS).forEach(function (k) {
    CHAMPS[k].forEach(function (a) { INDEX_CHAMPS[a] = k; });
  });
  function champ(nom) {
    return INDEX_CHAMPS[cle(nom)] || null;
  }

  /* Nom normalisé d'une balise personnalisée : « Lieu d'inhumation » → « lieu-d-inhumation ». */
  function nomBalise(s) {
    return sansAccents(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  /* Liste des balises de base, pour l'aide et l'autocomplétion. */
  var BALISES = [
    ['centre', 'Centre d\'archives : CARAN, 35, AD35, SHD Caen…'],
    ['date', '02/06/1642 · ??/06/1642 · 1642 · vers 1650'],
    ['type', 'Type d\'acte : Procuration, CM, IAD…'],
    ['personne', 'Prénom NOM (plusieurs : séparer par &)'],
    ['notaire', 'Nom du notaire'],
    ['ville', 'Ville, lieu, paroisse'],
    ['cote', 'Cote du document'],
    ['statut', 'à chercher · demandé · obtenu · perdu'],
    ['description', 'Résumé court'],
    ['note', 'Annotations (les lignes suivantes s\'y ajoutent)'],
    ['transcription', 'Texte de l\'acte'],
    ['tags', 'Étiquettes, séparées par des virgules'],
    ['nom', 'Nom seul (avec @prenom)'],
    ['prenom', 'Prénom seul (avec @nom)'],
    ['jour', 'Jour seul'], ['mois', 'Mois seul'], ['annee', 'Année seule'],
    ['par-defaut', 'Début d\'un bloc de valeurs communes aux actes suivants']
  ];

  var MULTILIGNES = { notes: 1, transcription: 1, description: 1 };

  function acteVide() {
    return {
      centre: '', jour: '', mois: '', annee: '', dateTexte: '', type: '', personnes: [],
      notaire: '', ville: '', cote: '', statut: '', description: '', notes: '', transcription: '', tags: [], champs: {},
      _ligne: 0, _erreurs: [], _avertissements: []
    };
  }

  /* Range une valeur brute dans l'acte selon le champ reconnu. */
  function affecte(acte, ch, valeur, tmp) {
    var v = String(valeur == null ? '' : valeur).trim();
    if (!v && ch !== 'notes') return;
    if (ch.indexOf('perso:') === 0) {
      var k = ch.slice(6);
      acte.champs[k] = acte.champs[k] ? acte.champs[k] + '\n' + v : v;
      return;
    }
    switch (ch) {
      case 'date': {
        var d = lireDate(v);
        acte.jour = d.jour; acte.mois = d.mois; acte.annee = d.annee; acte.dateTexte = d.texte;
        if (!d.ok) acte._avertissements.push('Date « ' + v + ' » non reconnue : gardée telle quelle.');
        break;
      }
      case 'jour': case 'mois': {
        var max = ch === 'jour' ? 31 : 12;
        if (INCONNU.test(v)) acte[ch] = '';
        else if (/^\d{1,2}$/.test(v) && +v >= 1 && +v <= max) acte[ch] = pad2(+v);
        else if (ch === 'mois' && MOIS[cle(v)]) acte.mois = pad2(MOIS[cle(v)]);
        else acte._avertissements.push(ch + ' « ' + v + ' » ignoré.');
        break;
      }
      case 'annee':
        if (/^\d{3,4}$/.test(v)) acte.annee = v;
        else if (!INCONNU.test(v)) acte._avertissements.push('Année « ' + v + ' » ignorée.');
        break;
      case 'personnes':
        acte.personnes = acte.personnes.concat(lirePersonnes(v));
        break;
      case 'nom': case 'prenom': case 'nom2': case 'prenom2':
        tmp[ch] = v;
        break;
      case 'statut': {
        var st = lireStatut(v);
        if (st) acte.statut = st;
        else acte._avertissements.push('Statut « ' + v + ' » inconnu : « à chercher » par défaut.');
        break;
      }
      case 'tags':
        acte.tags = acte.tags.concat(v.split(/\s*[,;#]\s*/).filter(Boolean));
        break;
      case 'notaire':
        acte.notaire = v.replace(/^(me|maitre|maître)\.?\s+/i, '');
        break;
      case 'notes': case 'transcription': case 'description':
        acte[ch] = acte[ch] ? acte[ch] + '\n' + v : v;
        break;
      case 'ignorer':
        break;
      default:
        acte[ch] = v;
    }
  }

  /* Termine un acte : personnes issues de nom/prénom, statut par défaut, contrôles. */
  function finalise(acte, tmp) {
    if (tmp.nom || tmp.prenom) acte.personnes.unshift({ prenom: tmp.prenom || '', nom: tmp.nom || '' });
    if (tmp.nom2 || tmp.prenom2) acte.personnes.push({ prenom: tmp.prenom2 || '', nom: tmp.nom2 || '' });
    acte.description = acte.description.replace(/^\[(.*)\]$/s, '$1');
    acte._statutDonne = !!acte.statut; // écrit dans l'acte ou dans le bloc @par-defaut
    if (!acte.statut) acte.statut = 'chercher';
    if (!acte.annee && !acte.dateTexte && !acte.cote && !acte.personnes.length && !acte.type) {
      acte._erreurs.push('Acte vide : il faut au moins une date, une cote, un type ou une personne.');
    }
    return acte;
  }

  // ---------------------------------------------------------------- format à balises

  var RE_BALISE = /^@([\p{L}\d_-]+)\s*[:=]?\s*(.*)$/u;
  var RE_ETIQUETTE = /^([\p{L}][\p{L}\d' _-]{0,30}?)\s*:\s*(.*)$/u;
  var RE_DEFAUT = /^@(par-?defaut|pour-?tous|tous|defaut|par-?défaut|défaut)\b\s*:?\s*$/iu;

  function lireBalises(texte) {
    var lignes = String(texte || '').replace(/\r\n?/g, '\n').split('\n');
    var actes = [], erreurs = [];
    var defauts = {};
    var bloc = null; // { lignes: [[n, texte]], defaut: bool }

    function fermer() {
      if (!bloc) return;
      var b = bloc; bloc = null;
      if (!b.lignes.length) return;
      var acte = acteVide(), tmp = {}, dernier = null;
      acte._ligne = b.lignes[0][0];
      var source = b.defaut ? {} : null;
      b.lignes.forEach(function (l) {
        var n = l[0], txt = l[1];
        var m = RE_BALISE.exec(txt), ch = null, val;
        if (m) {
          ch = champ(m[1]) || (nomBalise(m[1]) ? 'perso:' + nomBalise(m[1]) : null); val = m[2];
          if (!ch) { dernier = null; return; }
        } else if ((m = RE_ETIQUETTE.exec(txt)) && champ(m[1])) {
          ch = champ(m[1]); val = m[2];
        }
        if (ch) {
          if (source) source[ch] = (source[ch] ? source[ch] + '\n' : '') + val;
          else affecte(acte, ch, val, tmp);
          dernier = ch;
        } else if (dernier && dernier.indexOf('perso:') === 0 && !source) {
          affecte(acte, dernier, txt, tmp); // ligne de suite d'une balise personnalisée
        } else if (dernier && MULTILIGNES[dernier] && !source) {
          acte[dernier] = acte[dernier] ? acte[dernier] + '\n' + txt : txt; // ligne de suite
        } else if (dernier === 'personnes' && !source) {
          affecte(acte, 'personnes', txt, tmp);
        } else {
          acte._avertissements.push('Ligne ' + n + ' sans balise, ignorée : « ' + txt.slice(0, 40) + ' »');
        }
      });
      if (source) { defauts = source; return; }
      // valeurs par défaut pour les champs absents
      Object.keys(defauts).forEach(function (ch) {
        var vide = ch.indexOf('perso:') === 0 ? !acte.champs[ch.slice(6)]
          : ch === 'personnes' || ch === 'tags' ? !acte[ch].length
          : (ch === 'date' ? !acte.annee && !acte.dateTexte : ch in acte ? !acte[ch] : !tmp[ch]);
        if (vide) affecte(acte, ch, defauts[ch], tmp);
      });
      actes.push(finalise(acte, tmp));
    }

    lignes.forEach(function (brut, i) {
      var n = i + 1, txt = brut.trim();
      if (/^(#|\/\/)/.test(txt)) return; // commentaire
      if (!txt || /^-{3,}$|^={3,}$/.test(txt)) { fermer(); return; }
      if (RE_DEFAUT.test(txt)) { fermer(); bloc = { lignes: [], defaut: true }; return; }
      if (!bloc) bloc = { lignes: [], defaut: false };
      bloc.lignes.push([n, txt]);
    });
    fermer();
    return { format: 'balises', actes: actes, erreurs: erreurs };
  }

  // ---------------------------------------------------------------- format tableau

  function separateur(ligne) {
    if (ligne.indexOf('\t') >= 0) return '\t';
    var compte = { ';': 0, '|': 0, ',': 0 };
    var dansGuillemets = false;
    for (var i = 0; i < ligne.length; i++) {
      var c = ligne[i];
      if (c === '"') dansGuillemets = !dansGuillemets;
      else if (!dansGuillemets && c in compte) compte[c]++;
    }
    if (compte[';']) return ';';
    if (compte['|']) return '|';
    return ',';
  }

  /* Découpe un CSV en tenant compte des guillemets (y compris retours à la ligne entre guillemets). */
  function decoupeCSV(texte, sep) {
    var lignes = [], cell = '', ligne = [], q = false, numero = 1, debut = 1;
    for (var i = 0; i < texte.length; i++) {
      var c = texte[i];
      if (q) {
        if (c === '"' && texte[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else { if (c === '\n') numero++; cell += c; }
      } else if (c === '"' && cell.trim() === '') { q = true; cell = ''; }
      else if (c === sep) { ligne.push(cell); cell = ''; }
      else if (c === '\n') {
        ligne.push(cell); lignes.push({ n: debut, cells: ligne });
        ligne = []; cell = ''; numero++; debut = numero;
      } else cell += c;
    }
    ligne.push(cell); lignes.push({ n: debut, cells: ligne });
    return lignes.filter(function (l) { return l.cells.some(function (c) { return c.trim(); }); });
  }

  var ORDRE_PAR_DEFAUT = ['date', 'type', 'personnes', 'notaire', 'cote', 'description'];

  function lireTableau(texte) {
    var t = String(texte || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    var premiere = t.split('\n').find(function (l) { return l.trim(); }) || '';
    var sep = separateur(premiere);
    var lignes = decoupeCSV(t, sep).map(function (l) {
      return { n: l.n, cells: sep === '|' ? l.cells.map(function (c) { return c.trim(); }).filter(function (c, i, a) { return !((i === 0 || i === a.length - 1) && c === ''); }) : l.cells };
    });
    var erreurs = [], actes = [];
    if (!lignes.length) return { format: 'tableau', separateur: sep, colonnes: [], actes: [], erreurs: erreurs };

    var titres = lignes[0].cells;
    var entete = titres.map(champ);
    var reconnues = entete.filter(Boolean).length;
    var colonnes;
    if (reconnues >= 2 || (reconnues >= 1 && titres.length === 1)) {
      colonnes = entete;
      lignes = lignes.slice(1);
      var perso = [];
      titres.forEach(function (t, i) {
        if (!entete[i] && nomBalise(t)) { entete[i] = 'perso:' + nomBalise(t); perso.push('@' + nomBalise(t)); }
      });
      if (perso.length) erreurs.push('Colonnes gardées comme champs personnalisés : ' + perso.join(', ') + '.');
    } else {
      colonnes = ORDRE_PAR_DEFAUT.slice();
      erreurs.push("Pas de ligne d'en-tête reconnue : colonnes lues dans l'ordre date, type, personnes, notaire, cote, description.");
    }

    lignes.forEach(function (l) {
      var acte = acteVide(), tmp = {};
      acte._ligne = l.n;
      l.cells.forEach(function (val, i) {
        var ch = colonnes[i];
        if (ch) affecte(acte, ch, val, tmp);
      });
      actes.push(finalise(acte, tmp));
    });
    return { format: 'tableau', separateur: sep, colonnes: colonnes, actes: actes, erreurs: erreurs };
  }

  // ---------------------------------------------------------------- détection

  function detecteFormat(texte) {
    var lignes = String(texte || '').split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l && !/^(#|\/\/)/.test(l); });
    if (!lignes.length) return 'vide';
    var balises = lignes.filter(function (l) { return /^@/.test(l) || (RE_ETIQUETTE.test(l) && champ(RE_ETIQUETTE.exec(l)[1])); }).length;
    if (balises / lignes.length >= 0.5) return 'balises';
    return 'tableau';
  }

  function lire(texte, format) {
    format = format && format !== 'auto' ? format : detecteFormat(texte);
    if (format === 'vide') return { format: 'vide', actes: [], erreurs: [] };
    return format === 'balises' ? lireBalises(texte) : lireTableau(texte);
  }

  var api = {
    lire: lire, lireBalises: lireBalises, lireTableau: lireTableau, detecteFormat: detecteFormat,
    lireDate: lireDate, formatDate: formatDate, lirePersonne: lirePersonne, lirePersonnes: lirePersonnes,
    formatPersonne: formatPersonne, lireStatut: lireStatut, STATUTS: STATUTS, sansAccents: sansAccents, cle: cle,
    champ: champ, nomBalise: nomBalise, BALISES: BALISES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GA_SAISIE = api;
})(typeof window !== 'undefined' ? window : globalThis);
