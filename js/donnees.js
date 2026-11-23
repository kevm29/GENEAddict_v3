/* GENEAddict — la base de données.
 *
 * Toute la base tient dans un seul fichier JSON lisible : geneaddict.json.
 *
 * Enregistrement :
 *  - Chrome / Edge / Opera : on choisit une fois un dossier sur le disque (ou dans
 *    OneDrive, Dropbox…). L'application y réécrit geneaddict.json à chaque
 *    modification, garde une sauvegarde par jour dans sauvegardes/ et lit les
 *    fichiers déposés dans a-importer/.
 *  - Partout : une copie est aussi gardée dans le navigateur (IndexedDB), ce qui
 *    permet de travailler même sans dossier (Firefox, Safari) ; il faut alors
 *    penser à « Exporter » de temps en temps. */
(function (root) {
  'use strict';

  var S = root.GA_SAISIE;
  var NOM_FICHIER = 'geneaddict.json';
  var DOSSIER_SAUVEGARDES = 'sauvegardes';
  var DOSSIER_IMPORT = 'a-importer';
  var DOSSIER_IMPORTES = 'importes';
  var NB_SAUVEGARDES = 30;
  var VERSION = 2;

  // ------------------------------------------------------------ IndexedDB (copie locale + dossier mémorisé)

  var idb = (function () {
    var p = null;
    function ouvre() {
      if (p) return p;
      p = new Promise(function (ok, ko) {
        if (!root.indexedDB) return ko(new Error('IndexedDB indisponible'));
        var r = indexedDB.open('geneaddict', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { ko(r.error); };
      });
      return p;
    }
    function tx(mode, fn) {
      return ouvre().then(function (db) {
        return new Promise(function (ok, ko) {
          var t = db.transaction('kv', mode), st = t.objectStore('kv'), res = fn(st);
          t.oncomplete = function () { ok(res && 'result' in res ? res.result : undefined); };
          t.onerror = function () { ko(t.error); };
        });
      });
    }
    return {
      lire: function (k) { return tx('readonly', function (st) { return st.get(k); }).catch(function () { return undefined; }); },
      ecrire: function (k, v) { return tx('readwrite', function (st) { st.put(v, k); }).catch(function () {}); },
      effacer: function (k) { return tx('readwrite', function (st) { st.delete(k); }).catch(function () {}); }
    };
  })();

  // ------------------------------------------------------------ outils

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function maintenant() {
    return new Date().toISOString();
  }
  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function baseVide() {
    var t = maintenant();
    var deps = (root.GA_CARTE ? root.GA_CARTE.departements : []);
    return {
      app: 'GENEAddict', version: VERSION, cree: t, modifie: t,
      centres: root.GA_INIT.centresParDefaut(deps).map(function (c) {
        return Object.assign({ id: id(), adresse: '', horaires: '', lecteur: '', notes: '' }, c);
      }),
      documents: [],
      depouillements: [],
      liens: root.GA_INIT.liens.map(function (l) { return Object.assign({ id: id() }, l); }),
      balises: []
    };
  }

  /* Version 1 → 2 : catégories, sigle / groupe / site pour les centres, nouveaux centres proposés. */
  function migreCentres(d) {
    var deps = root.GA_CARTE ? root.GA_CARTE.departements : [];
    var defauts = root.GA_INIT.centresParDefaut(deps);
    var parCode = {}, presents = {};
    defauts.forEach(function (c) { parCode[S.cle(c.code)] = c; });
    d.centres.forEach(function (c) {
      presents[S.cle(c.code)] = 1;
      if (c.categorie) return;
      var def = parCode[S.cle(c.code)];
      if (def) {
        ['categorie', 'sigle', 'groupe', 'site', 'detail', 'nom'].forEach(function (k) { c[k] = def[k]; });
        if (!c.url) c.url = def.url;
        if (!c.entraide) c.entraide = def.entraide;
      } else {
        c.categorie = c.type === 'AD' ? 'AD' : c.type === 'AM' ? 'AM' : c.type === 'national' ? 'AN' : 'AUTRE';
        c.sigle = c.code; c.groupe = c.nom; c.site = ''; c.detail = '';
      }
      delete c.type;
    });
    defauts.forEach(function (def) {
      if (!presents[S.cle(def.code)]) d.centres.push(Object.assign({ id: id(), adresse: '', horaires: '', lecteur: '', notes: '' }, def));
    });
  }

  /* Complète une base lue sur disque (champs manquants, anciennes versions). */
  function normalise(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.documents)) throw new Error("Ce fichier n'est pas une base GENEAddict.");
    d.centres = d.centres || [];
    d.depouillements = d.depouillements || [];
    d.liens = d.liens || [];
    d.balises = d.balises || [];
    if (!d.version || d.version < 2) migreCentres(d);
    d.centres.forEach(function (c) {
      ['sigle', 'groupe', 'site', 'detail', 'dep', 'url', 'entraide', 'adresse', 'horaires', 'lecteur', 'notes'].forEach(function (k) { if (c[k] == null) c[k] = ''; });
      if (!c.categorie) c.categorie = 'AUTRE';
    });
    d.documents.forEach(function (doc) {
      doc.champs = doc.champs || {};
      doc.personnes = doc.personnes || [];
      doc.tags = doc.tags || [];
      doc.historique = doc.historique || [];
      ['jour', 'mois', 'annee', 'dateTexte', 'type', 'notaire', 'ville', 'cote', 'description', 'notes', 'transcription']
        .forEach(function (k) { if (doc[k] == null) doc[k] = ''; });
      if (!S.STATUTS[doc.statut]) doc.statut = 'chercher';
    });
    d.version = VERSION;
    return d;
  }

  // ------------------------------------------------------------ état

  var etat = {
    data: null,
    mode: 'navigateur',        // 'navigateur' | 'dossier'
    dossier: null,             // FileSystemDirectoryHandle
    nomDossier: '',
    aReconnecter: false,       // un dossier est mémorisé mais le navigateur redemande l'autorisation
    enregistrement: 'ok',      // 'ok' | 'en-cours' | 'erreur'
    erreur: '',
    derniereEcriture: 0,       // lastModified du fichier après notre dernière écriture
    derniereSauvegardeDuJour: ''
  };
  var ecouteurs = [];
  var minuterie = null;

  function notifie(quoi) {
    ecouteurs.forEach(function (f) { try { f(quoi); } catch (e) { console.error(e); } });
  }

  var dossierPossible = typeof root.showDirectoryPicker === 'function';

  // ------------------------------------------------------------ fichiers

  function permission(h, demander) {
    var o = { mode: 'readwrite' };
    return h.queryPermission(o).then(function (p) {
      if (p === 'granted' || !demander) return p;
      return h.requestPermission(o);
    });
  }

  function lireFichier(dossier) {
    return dossier.getFileHandle(NOM_FICHIER).then(function (fh) {
      return fh.getFile();
    }).then(function (f) {
      return f.text().then(function (txt) { return { texte: txt, date: f.lastModified }; });
    }).catch(function (e) {
      if (e && e.name === 'NotFoundError') return null;
      throw e;
    });
  }

  function ecrireFichier(dossier, nom, contenu) {
    return dossier.getFileHandle(nom, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) {
        return w.write(contenu).then(function () { return w.close(); });
      }).then(function () { return fh.getFile(); });
    });
  }

  /* Avant la première écriture du jour, copie le fichier actuel dans sauvegardes/. */
  function sauvegardeDuJour(dossier) {
    var jour = aujourdhui();
    if (etat.derniereSauvegardeDuJour === jour) return Promise.resolve();
    return lireFichier(dossier).then(function (actuel) {
      etat.derniereSauvegardeDuJour = jour;
      if (!actuel) return;
      return dossier.getDirectoryHandle(DOSSIER_SAUVEGARDES, { create: true }).then(function (sd) {
        var nom = 'geneaddict-' + jour + '.json';
        return sd.getFileHandle(nom).then(function () { /* déjà faite */ }, function () {
          return ecrireFichier(sd, nom, actuel.texte).then(function () { return nettoieSauvegardes(sd); });
        });
      });
    });
  }

  function nettoieSauvegardes(sd) {
    var noms = [];
    var it = sd.values();
    function suivant() {
      return it.next().then(function (r) {
        if (r.done) return;
        if (r.value.kind === 'file' && /^geneaddict-\d{4}-\d{2}-\d{2}\.json$/.test(r.value.name)) noms.push(r.value.name);
        return suivant();
      });
    }
    return suivant().then(function () {
      noms.sort();
      var trop = noms.slice(0, Math.max(0, noms.length - NB_SAUVEGARDES));
      return Promise.all(trop.map(function (n) { return sd.removeEntry(n); }));
    });
  }

  function serialise() {
    return JSON.stringify(etat.data, null, 1);
  }

  function ecrireMaintenant() {
    clearTimeout(minuterie); minuterie = null;
    var texte = serialise();
    idb.ecrire('base', texte);
    if (etat.mode !== 'dossier' || !etat.dossier || etat.aReconnecter) {
      etat.enregistrement = 'ok';
      notifie('enregistrement');
      return Promise.resolve();
    }
    etat.enregistrement = 'en-cours';
    notifie('enregistrement');
    var d = etat.dossier;
    return sauvegardeDuJour(d).then(function () {
      return ecrireFichier(d, NOM_FICHIER, texte);
    }).then(function (f) {
      etat.derniereEcriture = f.lastModified;
      etat.enregistrement = 'ok'; etat.erreur = '';
      notifie('enregistrement');
    }).catch(function (e) {
      console.error(e);
      etat.enregistrement = 'erreur';
      etat.erreur = "Impossible d'écrire dans le dossier : " + (e && e.message || e);
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) etat.aReconnecter = true;
      notifie('enregistrement');
    });
  }

  function modifie() {
    etat.data.modifie = maintenant();
    etat.enregistrement = 'en-cours';
    notifie('modif');
    clearTimeout(minuterie);
    minuterie = setTimeout(ecrireMaintenant, 400);
  }

  // ------------------------------------------------------------ démarrage et dossier

  function demarre() {
    return Promise.all([idb.lire('base'), idb.lire('dossier')]).then(function (r) {
      var copie = r[0], dossier = r[1];
      try { etat.data = copie ? normalise(JSON.parse(copie)) : baseVide(); }
      catch (e) { console.error(e); etat.data = baseVide(); }
      if (!copie) idb.ecrire('base', serialise());
      if (dossier && dossierPossible) {
        etat.dossier = dossier; etat.nomDossier = dossier.name; etat.mode = 'dossier';
        return permission(dossier, false).then(function (p) {
          if (p === 'granted') return chargeDepuisDossier();
          etat.aReconnecter = true;
        }).catch(function () { etat.aReconnecter = true; });
      }
    }).then(function () { notifie('donnees'); });
  }

  /* Le fichier du dossier fait foi : s'il existe on le charge, sinon on y écrit la base actuelle. */
  function chargeDepuisDossier() {
    return lireFichier(etat.dossier).then(function (f) {
      etat.aReconnecter = false;
      if (f) {
        etat.data = normalise(JSON.parse(f.texte));
        etat.derniereEcriture = f.date;
        idb.ecrire('base', serialise());
        notifie('donnees');
      } else {
        return ecrireMaintenant();
      }
    });
  }

  function choisirDossier() {
    if (!dossierPossible) return Promise.reject(new Error("Ce navigateur ne permet pas d'enregistrer dans un dossier (utilisez Chrome, Edge ou Opera)."));
    return root.showDirectoryPicker({ id: 'geneaddict', mode: 'readwrite' }).then(function (d) {
      etat.dossier = d; etat.nomDossier = d.name; etat.mode = 'dossier';
      etat.derniereSauvegardeDuJour = '';
      return idb.ecrire('dossier', d).then(chargeDepuisDossier);
    }).then(function () { notifie('donnees'); });
  }

  function reconnecter() {
    if (!etat.dossier) return choisirDossier();
    return permission(etat.dossier, true).then(function (p) {
      if (p !== 'granted') throw new Error('Autorisation refusée.');
      return chargeDepuisDossier();
    }).then(function () { notifie('donnees'); });
  }

  function oublierDossier() {
    etat.dossier = null; etat.nomDossier = ''; etat.mode = 'navigateur'; etat.aReconnecter = false;
    return idb.effacer('dossier').then(function () { notifie('donnees'); });
  }

  /* Si le fichier a été modifié ailleurs (autre ordinateur via OneDrive, édition à la main…), on le recharge. */
  function verifieFichierExterne() {
    if (etat.mode !== 'dossier' || !etat.dossier || etat.aReconnecter || minuterie) return Promise.resolve(false);
    return lireFichier(etat.dossier).then(function (f) {
      if (f && f.date > etat.derniereEcriture + 1000) {
        etat.data = normalise(JSON.parse(f.texte));
        etat.derniereEcriture = f.date;
        idb.ecrire('base', serialise());
        notifie('donnees');
        return true;
      }
      return false;
    }).catch(function () { return false; });
  }

  // ------------------------------------------------------------ dossier a-importer/

  function listeAImporter() {
    if (etat.mode !== 'dossier' || !etat.dossier || etat.aReconnecter) return Promise.resolve([]);
    return etat.dossier.getDirectoryHandle(DOSSIER_IMPORT, { create: true }).then(function (dir) {
      var liste = [], it = dir.values();
      function suivant() {
        return it.next().then(function (r) {
          if (r.done) return;
          if (r.value.kind === 'file' && /\.(txt|csv|tsv|md)$/i.test(r.value.name)) liste.push(r.value);
          return suivant();
        });
      }
      return suivant().then(function () {
        return Promise.all(liste.map(function (fh) {
          return fh.getFile().then(function (f) {
            return f.text().then(function (t) { return { nom: fh.name, texte: t, date: f.lastModified }; });
          });
        }));
      });
    }).then(function (l) { return l.sort(function (a, b) { return a.nom.localeCompare(b.nom); }); })
      .catch(function (e) { console.error(e); return []; });
  }

  /* Range un fichier importé dans a-importer/importes/ (préfixé de la date). */
  function archiveImporte(nom) {
    if (!etat.dossier) return Promise.resolve();
    return etat.dossier.getDirectoryHandle(DOSSIER_IMPORT).then(function (dir) {
      return dir.getFileHandle(nom).then(function (fh) { return fh.getFile(); }).then(function (f) {
        return f.text();
      }).then(function (t) {
        return dir.getDirectoryHandle(DOSSIER_IMPORTES, { create: true }).then(function (sd) {
          return ecrireFichier(sd, aujourdhui() + '_' + nom, t);
        });
      }).then(function () { return dir.removeEntry(nom); });
    });
  }

  // ------------------------------------------------------------ centres

  var ALIAS_CENTRES = {
    an: 'CARAN', archivesnationales: 'CARAN', caran: 'CARAN', minutiercentral: 'CARAN', anparis: 'CARAN',
    pierrefitte: 'AN-PIERREFITTE', anpierrefitte: 'AN-PIERREFITTE',
    shd: 'SHD-V', shdvincennes: 'SHD-V', vincennes: 'SHD-V', shdbrest: 'SHD-B',
    davcc: 'SHD-CAEN', bavcc: 'SHD-CAEN', capm: 'SHD-PAU', caapc: 'SHD-CHATELLERAULT',
    its: 'AROLSEN', itsbadarolsen: 'AROLSEN', arolsen: 'AROLSEN', badarolsen: 'AROLSEN',
    gallica: 'BNF', bnf: 'BNF', bnfmitterrand: 'BNF', bnffrancoismitterrand: 'BNF', richelieu: 'BNF-RICHELIEU',
    croixrouge: 'CICR', courneuve: 'MAE-COURNEUVE', lacourneuve: 'MAE-COURNEUVE', archivesdiplomatiques: 'MAE-COURNEUVE',
    prefecturedepolice: 'APP', archivesdeparis: 'AD75', dresden: 'DRESDE'
  };

  function centreParId(i) {
    return etat.data.centres.find(function (c) { return c.id === i; }) || null;
  }

  /* Retrouve un centre à partir de ce que l'utilisateur a tapé : « 35 », « AD35 », « CARAN »,
   * « Archives nationales », « Ille-et-Vilaine »… Renvoie null si rien ne correspond. */
  function trouveCentre(brut) {
    var k = S.cle(brut);
    if (!k) return null;
    var cs = etat.data.centres;
    var code = k.toUpperCase();
    if (/^(\d{2,3}|2[AB])$/.test(code)) code = 'AD' + (code.length === 1 ? '0' + code : code);
    if (/^AD\d$/.test(code)) code = 'AD0' + code.slice(2);
    if (ALIAS_CENTRES[k]) code = ALIAS_CENTRES[k];
    var c = cs.find(function (x) { return S.cle(x.code).toUpperCase() === code; });
    if (c) return c;
    c = cs.find(function (x) {
      return S.cle(x.nom) === k || (x.site && (S.cle(x.sigle + x.site) === k || S.cle(x.groupe + x.site) === k));
    });
    if (c) return c;
    // « Archives départementales d'Ille-et-Vilaine », « AD Ille-et-Vilaine », « Ille-et-Vilaine »
    var sansPrefixe = k.replace(/^(archivesdepartementales|archivesdep|ad)(de|du|des|d)?/, '');
    if (sansPrefixe.length >= 3) {
      c = cs.find(function (x) { return x.categorie === 'AD' && S.cle(x.site) === sansPrefixe; });
      if (c) return c;
    }
    if (k.length >= 4) {
      var candidats = cs.filter(function (x) { return S.cle(x.nom).indexOf(k) >= 0 || S.cle(x.sigle + x.site).indexOf(k) >= 0; });
      if (candidats.length === 1) return candidats[0];
    }
    return null;
  }

  function ajouteCentre(c) {
    var n = Object.assign({ id: id(), code: '', nom: '', categorie: 'AUTRE', sigle: '', groupe: '', site: '', detail: '', dep: '', url: '', entraide: '', adresse: '', horaires: '', lecteur: '', notes: '' }, c);
    if (!n.groupe) n.groupe = n.nom;
    if (!n.sigle) n.sigle = n.code || n.groupe;
    if (!n.nom) n.nom = root.GA_INIT.nomComplet(n);
    if (!n.code) n.code = S.sansAccents(n.sigle + (n.site ? '-' + n.site : '')).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'CENTRE';
    etat.data.centres.push(n);
    modifie();
    return n;
  }

  function majCentre(i, patch) {
    var c = centreParId(i);
    if (!c) return;
    Object.assign(c, patch);
    modifie();
  }

  function supprimeCentre(i) {
    var utilise = etat.data.documents.some(function (d) { return d.centreId === i; }) ||
      etat.data.depouillements.some(function (d) { return d.centreId === i; });
    if (utilise) throw new Error('Ce centre a encore des documents ou des dépouillements.');
    etat.data.centres = etat.data.centres.filter(function (c) { return c.id !== i; });
    modifie();
  }

  // ------------------------------------------------------------ documents

  function cleTri(d) {
    return (d.annee || '9999') + (d.mois || '00') + (d.jour || '00');
  }

  function docParId(i) {
    return etat.data.documents.find(function (d) { return d.id === i; }) || null;
  }

  /* Signature servant à repérer les doublons : cote + date + premier nom. */
  function signature(d) {
    var p = d.personnes && d.personnes[0];
    return [S.cle(d.cote), d.annee, d.mois, d.jour, S.cle(p ? p.nom : ''), S.cle(d.type)].join('|');
  }

  function estDoublon(acte) {
    var s = signature(acte);
    return etat.data.documents.some(function (d) { return signature(d) === s; });
  }

  function nouveauDocument(acte, centreId) {
    var t = maintenant();
    return {
      id: id(), centreId: centreId || '',
      jour: acte.jour || '', mois: acte.mois || '', annee: acte.annee || '', dateTexte: acte.dateTexte || '',
      type: acte.type || '', personnes: (acte.personnes || []).map(function (p) { return { prenom: p.prenom || '', nom: p.nom || '' }; }),
      notaire: acte.notaire || '', ville: acte.ville || '', cote: acte.cote || '',
      statut: S.STATUTS[acte.statut] ? acte.statut : 'chercher',
      description: acte.description || '', notes: acte.notes || '', transcription: acte.transcription || '',
      tags: acte.tags || [], champs: Object.assign({}, acte.champs || {}), historique: [{ le: t, statut: S.STATUTS[acte.statut] ? acte.statut : 'chercher' }],
      cree: t, modifie: t
    };
  }

  function ajouteDocuments(liste) {
    liste.forEach(function (d) { etat.data.documents.push(d); });
    modifie();
    return liste;
  }

  function majDocument(i, patch) {
    var d = docParId(i);
    if (!d) return null;
    if (patch.statut && patch.statut !== d.statut) d.historique.push({ le: maintenant(), statut: patch.statut });
    Object.assign(d, patch, { modifie: maintenant() });
    modifie();
    return d;
  }

  function majDocuments(ids, patch) {
    ids.forEach(function (i) {
      var d = docParId(i);
      if (!d) return;
      if (patch.statut && patch.statut !== d.statut) d.historique.push({ le: maintenant(), statut: patch.statut });
      Object.assign(d, patch, { modifie: maintenant() });
    });
    modifie();
  }

  function supprimeDocuments(ids) {
    var set = {};
    ids.forEach(function (i) { set[i] = 1; });
    etat.data.documents = etat.data.documents.filter(function (d) { return !set[d.id]; });
    modifie();
  }

  // ------------------------------------------------------------ dépouillements & liens

  function ajouteDepouillement(p) {
    var t = maintenant();
    var n = Object.assign({ id: id(), centreId: '', titre: '', cote: '', periode: '', pagesFaites: 0, pagesTotal: 0, statut: 'encours', notes: '', cree: t, modifie: t }, p);
    etat.data.depouillements.push(n);
    modifie();
    return n;
  }
  function majDepouillement(i, patch) {
    var d = etat.data.depouillements.find(function (x) { return x.id === i; });
    if (!d) return;
    Object.assign(d, patch, { modifie: maintenant() });
    modifie();
  }
  function supprimeDepouillement(i) {
    etat.data.depouillements = etat.data.depouillements.filter(function (x) { return x.id !== i; });
    modifie();
  }

  function ajouteLien(l) {
    var n = Object.assign({ id: id(), nom: '', url: '', categorie: '' }, l);
    etat.data.liens.push(n);
    modifie();
    return n;
  }
  function majLien(i, patch) {
    var l = etat.data.liens.find(function (x) { return x.id === i; });
    if (l) { Object.assign(l, patch); modifie(); }
  }
  function supprimeLien(i) {
    etat.data.liens = etat.data.liens.filter(function (x) { return x.id !== i; });
    modifie();
  }

  // ------------------------------------------------------------ balises personnalisées

  /* Balises personnalisées : celles déclarées dans « Ma base » + celles déjà utilisées dans des documents. */
  function balisesPerso() {
    var vues = {}, liste = [];
    etat.data.balises.forEach(function (b) { vues[b.nom] = 1; liste.push(b); });
    etat.data.documents.forEach(function (d) {
      Object.keys(d.champs || {}).forEach(function (k) {
        if (!vues[k]) { vues[k] = 1; liste.push({ nom: k, libelle: k, description: '' }); }
      });
    });
    return liste.sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr'); });
  }

  function declareBalise(b) {
    var nom = S.nomBalise(b.nom);
    if (!nom) throw new Error('Nom de balise vide.');
    if (S.champ(nom)) throw new Error('@' + nom + ' existe déjà parmi les balises de base.');
    var ex = etat.data.balises.find(function (x) { return x.nom === nom; });
    if (ex) { ex.libelle = b.libelle || ex.libelle; ex.description = b.description != null ? b.description : ex.description; }
    else etat.data.balises.push({ nom: nom, libelle: b.libelle || nom, description: b.description || '' });
    modifie();
    return nom;
  }

  function supprimeBalise(nom) {
    etat.data.balises = etat.data.balises.filter(function (b) { return b.nom !== nom; });
    modifie();
  }

  // ------------------------------------------------------------ export / import complet

  function telecharge(nom, contenu, type) {
    var blob = new Blob([contenu], { type: type || 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function exporteJSON() {
    telecharge('geneaddict-' + aujourdhui() + '.json', serialise());
  }

  function exporteCSV() {
    var perso = balisesPerso().map(function (b) { return b.nom; });
    var cols = ['centre', 'date', 'type', 'personnes', 'notaire', 'ville', 'cote', 'statut', 'description', 'notes', 'tags'].concat(perso);
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lignes = [cols.join(';')];
    etat.data.documents.slice().sort(function (a, b) { return cleTri(a).localeCompare(cleTri(b)); }).forEach(function (d) {
      var c = centreParId(d.centreId);
      lignes.push([c ? c.code : '', S.formatDate(d), d.type, d.personnes.map(S.formatPersonne).join(' & '), d.notaire, d.ville,
        d.cote, S.STATUTS[d.statut].libelle, d.description, d.notes, d.tags.join(', ')].concat(perso.map(function (k) { return d.champs[k] || ''; })).map(q).join(';'));
    });
    telecharge('geneaddict-documents-' + aujourdhui() + '.csv', '﻿' + lignes.join('\r\n'), 'text/csv');
  }

  function remplaceBase(texte) {
    var d = normalise(JSON.parse(texte));
    etat.data = d;
    modifie();
    notifie('donnees');
  }

  function nouvelleBase() {
    etat.data = baseVide();
    modifie();
    notifie('donnees');
  }

  root.GA_DONNEES = {
    etat: etat, dossierPossible: dossierPossible, ecoute: function (f) { ecouteurs.push(f); },
    demarre: demarre, choisirDossier: choisirDossier, reconnecter: reconnecter, oublierDossier: oublierDossier,
    verifieFichierExterne: verifieFichierExterne, ecrireMaintenant: ecrireMaintenant,
    listeAImporter: listeAImporter, archiveImporte: archiveImporte,
    centreParId: centreParId, trouveCentre: trouveCentre, ajouteCentre: ajouteCentre, majCentre: majCentre, supprimeCentre: supprimeCentre,
    docParId: docParId, nouveauDocument: nouveauDocument, ajouteDocuments: ajouteDocuments, majDocument: majDocument,
    majDocuments: majDocuments, supprimeDocuments: supprimeDocuments, estDoublon: estDoublon, cleTri: cleTri,
    ajouteDepouillement: ajouteDepouillement, majDepouillement: majDepouillement, supprimeDepouillement: supprimeDepouillement,
    ajouteLien: ajouteLien, majLien: majLien, supprimeLien: supprimeLien,
    balisesPerso: balisesPerso, declareBalise: declareBalise, supprimeBalise: supprimeBalise,
    exporteJSON: exporteJSON, exporteCSV: exporteCSV, remplaceBase: remplaceBase, nouvelleBase: nouvelleBase,
    telecharge: telecharge, aujourdhui: aujourdhui
  };
})(window);
