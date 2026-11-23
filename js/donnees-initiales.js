/* GENEAddict — catégories et centres d'archives proposés dans une base neuve.
 *
 * Chaque centre a :
 *   code      identifiant unique, utilisé dans la saisie (@centre CARAN, @centre SHD-CAEN…)
 *   categorie onglet où il est rangé (voir CATEGORIES)
 *   sigle     diminutif affiché (AN, SHD, AM, BnF…)
 *   groupe    nom complet de l'institution (Archives nationales…)
 *   site      sous-ensemble : un site, une ville (Paris, Pierrefitte-sur-Seine, Caen…)
 *   detail    précision facultative (nom officiel du site, ancien nom…)
 * Les centres d'un même sigle + groupe sont affichés ensemble :
 *   AN (Archives nationales) → Paris · Pierrefitte-sur-Seine
 * Tout reste modifiable depuis la fiche de chaque centre. */
(function (root) {
  'use strict';

  var FGW = 'http://www.francegenweb.org/entraide/egwformu.php?dep=';
  var SHD = 'https://www.servicehistorique.sga.defense.gouv.fr/';
  var AN = 'https://www.archives-nationales.culture.gouv.fr/';

  var CATEGORIES = [
    { code: 'AD', nom: 'Archives départementales' },
    { code: 'AN', nom: 'Archives nationales' },
    { code: 'SHD', nom: 'Défense (SHD)' },
    { code: 'AM', nom: 'Archives municipales' },
    { code: 'BIB', nom: 'Bibliothèques' },
    { code: 'MIN', nom: 'Ministères et administrations' },
    { code: 'REL', nom: 'Archives religieuses' },
    { code: 'ETR', nom: 'Étranger et international' },
    { code: 'PRIV', nom: 'Archives privées et d\'entreprises' },
    { code: 'AUTRE', nom: 'Autres' }
  ];

  // Sites connus des archives départementales (repris de l'ancienne version)
  var SITES_AD = {
    '14': 'https://archives.calvados.fr/page/les-ressources-accessibles-de-chez-vous',
    '21': 'https://archives.cotedor.fr/v2/site/AD21/Rechercher/Recherche_thematique/Genealogie',
    '29': 'https://archives.finistere.fr/',
    '35': 'https://archives-en-ligne.ille-et-vilaine.fr/',
    '40': 'https://archives.landes.fr/article.php?larub=5&titre=archives-numerisees',
    '44': 'https://archives.loire-atlantique.fr/44/archives-numerisees/c_23000',
    '45': 'https://consultation.archives-loiret.fr/r/33/-archives-numerisees/',
    '50': 'https://www.archives-manche.fr/r/1/rechercher/',
    '56': 'https://archives.morbihan.fr/consulter-en-ligne/presentation/presentation',
    '59': 'https://archivesdepartementales.lenord.fr/',
    '62': 'https://www.archivespasdecalais.fr/Chercher/Archives-numerisees',
    '71': 'https://www.archives71.fr/article.php?larub=30&titre=familles-et-individus',
    '75': 'https://archives.paris.fr/',
    '78': 'https://archives.yvelines.fr/article.php?larub=19&titre=archives-en-ligne',
    '84': 'https://archives.vaucluse.fr/mes-recherches/documents-numerises-1162.html',
    '89': 'https://archives.yonne.fr/Archives-en-ligne/Fonds-numerises'
  };

  var OUTRE_MER = [
    ['971', 'Guadeloupe'], ['972', 'Martinique'], ['973', 'Guyane'],
    ['974', 'La Réunion'], ['976', 'Mayotte']
  ];

  // [code, catégorie, sigle, groupe, site, détail, url, entraide]
  var AUTRES_CENTRES = [
    ['CARAN', 'AN', 'AN', 'Archives nationales', 'Paris', 'CARAN — Minutier central des notaires', AN, FGW + 'caran'],
    ['AN-PIERREFITTE', 'AN', 'AN', 'Archives nationales', 'Pierrefitte-sur-Seine', '', AN, ''],
    ['ANOM', 'AN', 'ANOM', 'Archives nationales d\'outre-mer', 'Aix-en-Provence', '', 'http://anom.archivesnationales.culture.gouv.fr/', FGW + 'ANOM'],
    ['ANMT', 'AN', 'ANMT', 'Archives nationales du monde du travail', 'Roubaix', '', '', ''],

    ['SHD-V', 'SHD', 'SHD', 'Service historique de la Défense', 'Vincennes', 'Centre historique des archives', SHD, 'http://www.francegenweb.org/entraide/egwformu_depferme.php?dep=shd'],
    ['SHD-CAEN', 'SHD', 'SHD', 'Service historique de la Défense', 'Caen', 'Centre des archives de Caen (ex-DAVCC, victimes des conflits contemporains)', SHD, ''],
    ['SHD-PAU', 'SHD', 'SHD', 'Service historique de la Défense', 'Pau', 'Centre des archives du personnel militaire (CAPM)', SHD, ''],
    ['SHD-CHATELLERAULT', 'SHD', 'SHD', 'Service historique de la Défense', 'Châtellerault', 'Centre des archives de l\'armement et du personnel civil (CAAPC)', SHD, ''],
    ['SHD-LEBLANC', 'SHD', 'SHD', 'Service historique de la Défense', 'Le Blanc', 'Archives intermédiaires de la gendarmerie nationale', SHD, ''],
    ['SHD-B', 'SHD', 'SHD', 'Service historique de la Défense', 'Brest', 'Archives de la Marine', SHD, FGW + 'shdBrest'],
    ['SHD-CHERBOURG', 'SHD', 'SHD', 'Service historique de la Défense', 'Cherbourg', 'Archives de la Marine', SHD, ''],
    ['SHD-LORIENT', 'SHD', 'SHD', 'Service historique de la Défense', 'Lorient', 'Archives de la Marine', SHD, ''],
    ['SHD-ROCHEFORT', 'SHD', 'SHD', 'Service historique de la Défense', 'Rochefort', 'Archives de la Marine', SHD, ''],
    ['SHD-TOULON', 'SHD', 'SHD', 'Service historique de la Défense', 'Toulon', 'Archives de la Marine', SHD, ''],

    ['AM-BREST', 'AM', 'AM', 'Archives municipales', 'Brest', '', '', ''],
    ['AM-VERSAILLES', 'AM', 'AM', 'Archives municipales', 'Versailles', '', '', ''],
    ['AM-DIJON', 'AM', 'AM', 'Archives municipales', 'Dijon', '', '', ''],
    ['AM-PARIS', 'AM', 'AM', 'Archives municipales', 'Paris', 'Archives de Paris (Ville de Paris)', 'https://archives.paris.fr/', ''],

    ['BNF-RICHELIEU', 'BIB', 'BnF', 'Bibliothèque nationale de France', 'Richelieu (Paris centre)', '', 'https://www.bnf.fr/', ''],
    ['BNF', 'BIB', 'BnF', 'Bibliothèque nationale de France', 'François-Mitterrand', '', 'https://gallica.bnf.fr/', ''],
    ['MEDIA-MORTAGNE', 'BIB', 'Médiathèque', 'Médiathèque', 'Mortagne-au-Perche', '', '', ''],

    ['MAE-COURNEUVE', 'MIN', 'AD-MAE', 'Archives diplomatiques', 'La Courneuve', '', 'https://www.diplomatie.gouv.fr/fr/archives-diplomatiques/', ''],
    ['MAE-NANTES', 'MIN', 'AD-MAE', 'Archives diplomatiques', 'Nantes', '', 'https://www.diplomatie.gouv.fr/fr/archives-diplomatiques/', ''],
    ['CAEF', 'MIN', 'CAEF', 'Archives économiques et financières', 'Savigny-le-Temple', 'Centre des archives économiques et financières', '', ''],
    ['APP', 'MIN', 'APP', 'Archives de la Préfecture de police', 'Le Pré-Saint-Gervais', '', 'https://www.prefecturedepolice.interieur.gouv.fr/', ''],

    ['CNAEF', 'REL', 'CNAEF', 'Centre national des archives de l\'Église de France', 'Issy-les-Moulineaux', '', '', ''],
    ['JESUITES', 'REL', 'AJ', 'Archives jésuites', 'Vanves', 'Archives de la Compagnie de Jésus en France', '', ''],

    ['NARA', 'ETR', 'NARA', 'National Archives and Records Administration', 'États-Unis', '', 'https://www.archives.gov/', ''],
    ['DRESDE', 'ETR', 'SächsStA', 'Archives d\'État de Saxe', 'Dresde', 'Hauptstaatsarchiv Dresden', 'https://www.archiv.sachsen.de/', ''],
    ['AROLSEN', 'ETR', 'Arolsen', 'Arolsen Archives', 'Bad Arolsen', 'ex-ITS, Service international de recherches', 'https://arolsen-archives.org/fr/rechercher-decouvrir/recherche-dans-les-archives-en-ligne/', ''],
    ['CICR', 'ETR', 'CICR', 'Comité international de la Croix-Rouge', 'Genève', '', 'https://www.icrc.org/fr/archives', ''],

    ['SNCF', 'PRIV', 'SNCF', 'Archives historiques SNCF', '', '', 'http://www.archives-historiques.sncf.fr/', '']
  ];

  var LIENS = [
    { nom: 'Geneanet', url: 'https://www.geneanet.org/', categorie: 'Bases de données' },
    { nom: 'FranceGenWeb — entraide', url: 'http://www.francegenweb.org/entraide/', categorie: 'Entraide' },
    { nom: 'Fil d\'Ariane (FDA) — entraide généalogique', url: 'http://www.entraide-genealogique.net/', categorie: 'Entraide' },
    { nom: 'Mémoire des hommes', url: 'https://www.memoiredeshommes.sga.defense.gouv.fr/', categorie: 'Militaires' },
    { nom: 'FranceArchives', url: 'https://francearchives.gouv.fr/', categorie: 'Portails' }
  ];

  function nomComplet(c) {
    if (c.categorie === 'AD') return 'Archives départementales — ' + c.site;
    return c.groupe + (c.site ? ' — ' + c.site : '') + (c.detail ? ' (' + c.detail + ')' : '');
  }

  function centresParDefaut(departements) {
    var liste = [];
    departements.map(function (d) { return [d.code, d.nom]; }).concat(OUTRE_MER).forEach(function (d) {
      liste.push({
        code: 'AD' + d[0], categorie: 'AD', sigle: 'AD', groupe: 'Archives départementales', site: d[1], detail: '',
        dep: d[0], url: SITES_AD[d[0]] || '', entraide: FGW + d[0]
      });
    });
    AUTRES_CENTRES.forEach(function (a) {
      liste.push({ code: a[0], categorie: a[1], sigle: a[2], groupe: a[3], site: a[4], detail: a[5], dep: '', url: a[6], entraide: a[7] });
    });
    liste.forEach(function (c) { c.nom = nomComplet(c); });
    return liste;
  }

  root.GA_INIT = { categories: CATEGORIES, centresParDefaut: centresParDefaut, nomComplet: nomComplet, liens: LIENS };
})(typeof window !== 'undefined' ? window : globalThis);
