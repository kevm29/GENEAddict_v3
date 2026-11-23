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
  /* Site de chaque service d'archives départementales. Pour 16 départements, lien direct vers
   * les archives en ligne repris de l'ancienne version ; sinon page d'accueil du service
   * (annuaire aupresdenosracines.com, vérifié le 23/11/2026). Mayotte : pas de site propre. */
  var SITES_AD = {
    '01': 'https://www.archives.ain.fr/',
    '02': 'https://archives.aisne.fr/',
    '03': 'https://archives.allier.fr/',
    '04': 'https://www.archives04.fr/',
    '05': 'https://archives.hautes-alpes.fr/',
    '06': 'https://archives06.fr/',
    '07': 'https://archives.ardeche.fr/',
    '08': 'https://archives.cd08.fr/',
    '09': 'https://archives.ariege.fr/',
    '10': 'https://www.archives-aube.fr/',
    '11': 'https://archivesdepartementales.aude.fr/',
    '12': 'https://archives.aveyron.fr/',
    '13': 'https://www.archives13.fr/',
    '14': 'https://archives.calvados.fr/page/les-ressources-accessibles-de-chez-vous',
    '15': 'https://archives.cantal.fr/',
    '16': 'https://lasource.archives.lacharente.fr/',
    '17': 'https://archives.charente-maritime.fr/',
    '18': 'https://www.archives18.fr/',
    '19': 'https://www.archives.correze.fr/',
    '2A': 'https://archives.isula.corsica/',
    '2B': 'https://archives.isula.corsica/',
    '21': 'https://archives.cotedor.fr/v2/site/AD21/Rechercher/Recherche_thematique/Genealogie',
    '22': 'https://archives.cotesdarmor.fr/',
    '23': 'https://archives.creuse.fr/',
    '24': 'https://archives.dordogne.fr/',
    '25': 'https://archives.doubs.fr/',
    '26': 'https://archives.ladrome.fr/',
    '27': 'https://archives.eure.fr/',
    '28': 'https://archives28.fr/',
    '29': 'https://archives.finistere.fr/',
    '30': 'https://archives.gard.fr/accueil.html',
    '31': 'https://archives.haute-garonne.fr/',
    '32': 'https://www.archives32.fr/',
    '33': 'https://archives.gironde.fr/',
    '34': 'https://archives-pierresvives.herault.fr/',
    '35': 'https://archives-en-ligne.ille-et-vilaine.fr/',
    '36': 'https://www.archives36.fr/',
    '37': 'https://archives.touraine.fr/',
    '38': 'https://archives.isere.fr/',
    '39': 'https://archives39.fr/',
    '40': 'https://archives.landes.fr/article.php?larub=5&titre=archives-numerisees',
    '41': 'https://www.archives41.fr/',
    '42': 'https://archives.loire.fr/',
    '43': 'https://www.archives43.fr/',
    '44': 'https://archives.loire-atlantique.fr/44/archives-numerisees/c_23000',
    '45': 'https://consultation.archives-loiret.fr/r/33/-archives-numerisees/',
    '46': 'https://archives.lot.fr/',
    '47': 'https://archivesdepartementales.lotetgaronne.fr/accueil',
    '48': 'https://archives.lozere.fr/',
    '49': 'https://archives.maine-et-loire.fr/',
    '50': 'https://www.archives-manche.fr/r/1/rechercher/',
    '51': 'https://archives.marne.fr/',
    '52': 'https://archives.haute-marne.fr/',
    '53': 'https://archives.lamayenne.fr/',
    '54': 'https://archives.meurthe-et-moselle.fr/',
    '55': 'https://archives.meuse.fr/',
    '56': 'https://archives.morbihan.fr/consulter-en-ligne/presentation/presentation',
    '57': 'https://www.archives57.com/',
    '58': 'https://archives.nievre.fr/',
    '59': 'https://archivesdepartementales.lenord.fr/',
    '60': 'https://archives.oise.fr/',
    '61': 'https://archives.orne.fr/',
    '62': 'https://www.archivespasdecalais.fr/Chercher/Archives-numerisees',
    '63': 'https://www.archivesdepartementales.puy-de-dome.fr/',
    '64': 'https://archives.le64.fr/accueil.html',
    '65': 'https://archivesenligne65.fr/',
    '66': 'https://www.ledepartement66.fr/dossier/lesarchivesdepartementales/',
    '67': 'https://archives67.alsace.eu/',
    '68': 'https://archives68.alsace.eu/',
    '69': 'https://archives.rhone.fr/',
    '70': 'https://archives.haute-saone.fr/',
    '71': 'https://www.archives71.fr/article.php?larub=30&titre=familles-et-individus',
    '72': 'https://archives.sarthe.fr/',
    '73': 'https://patrimoines.savoie.fr/web/dsp_6165/accueil',
    '74': 'https://archives.hautesavoie.fr/',
    '75': 'https://archives.paris.fr/',
    '76': 'https://www.archivesdepartementales76.net/',
    '77': 'https://archives.seine-et-marne.fr/fr',
    '78': 'https://archives.yvelines.fr/article.php?larub=19&titre=archives-en-ligne',
    '79': 'https://archives-deux-sevres-vienne.fr/',
    '80': 'https://archives.somme.fr/',
    '81': 'https://archives.tarn.fr/accueil',
    '82': 'http://www.archives82.fr/',
    '83': 'https://archives.var.fr/',
    '84': 'https://archives.vaucluse.fr/mes-recherches/documents-numerises-1162.html',
    '85': 'https://archives.vendee.fr/',
    '86': 'https://archives-deux-sevres-vienne.fr/',
    '87': 'https://archives.haute-vienne.fr/',
    '88': 'https://archives.vosges.fr/',
    '89': 'https://archives.yonne.fr/Archives-en-ligne/Fonds-numerises',
    '90': 'https://archives.territoiredebelfort.fr/',
    '91': 'https://archives.essonne.fr/',
    '92': 'https://archives.hauts-de-seine.fr/',
    '93': 'https://archives.seinesaintdenis.fr/',
    '94': 'https://archives.valdemarne.fr/',
    '95': 'https://archives.valdoise.fr/',
    '971': 'https://www.archivesguadeloupe.fr/',
    '972': 'https://www.patrimoines-martinique.org/',
    '973': 'https://archives.ctguyane.fr/',
    '974': 'https://www.departement974.fr/archives-departementales'
  };


  var OUTRE_MER = [
    ['971', 'Guadeloupe'], ['972', 'Martinique'], ['973', 'Guyane'],
    ['974', 'La Réunion'], ['976', 'Mayotte']
  ];

  // [code, catégorie, sigle, groupe, site, détail, url, entraide]
  var AUTRES_CENTRES = [
    ['CARAN', 'AN', 'AN', 'Archives nationales', 'Paris', 'Minutier central', AN, FGW + 'caran'],
    ['AN-PIERREFITTE', 'AN', 'AN', 'Archives nationales', 'Pierrefitte-sur-Seine', '', AN, ''],
    ['ANOM', 'AN', 'ANOM', 'Archives nationales d\'outre-mer', 'Aix-en-Provence', '', 'http://anom.archivesnationales.culture.gouv.fr/', FGW + 'ANOM'],
    ['ANMT', 'AN', 'ANMT', 'Archives nationales du monde du travail', 'Roubaix', '', '', ''],

    // Les neuf centres du SHD et leurs sigles officiels (servicehistorique.sga.defense.gouv.fr)
    ['SHD-V', 'SHD', 'SHD', 'Service historique de la Défense', 'Vincennes', 'CAV', 'https://www.servicehistorique.sga.defense.gouv.fr/le-shd-en-france/centre-des-archives-de-vincennes', 'http://www.francegenweb.org/entraide/egwformu_depferme.php?dep=shd'],
    ['SHD-CAEN', 'SHD', 'SHD', 'Service historique de la Défense', 'Caen', 'CACn', 'https://www.servicehistorique.sga.defense.gouv.fr/le-shd-en-france/centre-des-archives-de-caen', ''],
    ['SHD-PAU', 'SHD', 'SHD', 'Service historique de la Défense', 'Pau', 'CAP', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', ''],
    ['SHD-CHATELLERAULT', 'SHD', 'SHD', 'Service historique de la Défense', 'Châtellerault', 'CACLB', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', ''],
    ['SHD-LEBLANC', 'SHD', 'SHD', 'Service historique de la Défense', 'Le Blanc', 'CACLB', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', ''],
    ['SHD-B', 'SHD', 'SHD', 'Service historique de la Défense', 'Brest', 'CAB', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', FGW + 'shdBrest'],
    ['SHD-CHERBOURG', 'SHD', 'SHD', 'Service historique de la Défense', 'Cherbourg', 'CACg', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', ''],
    ['SHD-LORIENT', 'SHD', 'SHD', 'Service historique de la Défense', 'Lorient', 'CAL', 'https://www.servicehistorique.sga.defense.gouv.fr/le-shd-en-france/centre-des-archives-de-lorient', ''],
    ['SHD-ROCHEFORT', 'SHD', 'SHD', 'Service historique de la Défense', 'Rochefort', 'CAR', 'https://www.servicehistorique.sga.defense.gouv.fr/le-shd-en-france/centre-des-archives-de-rochefort', ''],
    ['SHD-TOULON', 'SHD', 'SHD', 'Service historique de la Défense', 'Toulon', 'CAT', 'https://www.servicehistorique.sga.defense.gouv.fr/les-centres-darchives-du-shd', ''],

    ['AM-BREST', 'AM', 'AM', 'Archives municipales', 'Brest', '', '', ''],
    ['AM-VERSAILLES', 'AM', 'AM', 'Archives municipales', 'Versailles', '', '', ''],
    ['AM-DIJON', 'AM', 'AM', 'Archives municipales', 'Dijon', '', '', ''],
    ['AM-PARIS', 'AM', 'AM', 'Archives municipales', 'Paris', 'Archives de Paris', 'https://archives.paris.fr/', ''],

    ['BNF-RICHELIEU', 'BIB', 'BnF', 'Bibliothèque nationale de France', 'Richelieu (Paris centre)', '', 'https://www.bnf.fr/', ''],
    ['BNF', 'BIB', 'BnF', 'Bibliothèque nationale de France', 'François-Mitterrand', '', 'https://gallica.bnf.fr/', ''],
    ['MEDIA-MORTAGNE', 'BIB', 'Médiathèque', 'Médiathèque', 'Mortagne-au-Perche', '', '', ''],

    ['MAE-COURNEUVE', 'MIN', 'AD-MAE', 'Archives diplomatiques', 'La Courneuve', '', 'https://www.diplomatie.gouv.fr/fr/archives-diplomatiques/', ''],
    ['MAE-NANTES', 'MIN', 'AD-MAE', 'Archives diplomatiques', 'Nantes', '', 'https://www.diplomatie.gouv.fr/fr/archives-diplomatiques/', ''],
    ['CAEF', 'MIN', 'CAEF', 'Archives économiques et financières', 'Savigny-le-Temple', '', '', ''],
    ['APP', 'MIN', 'APP', 'Archives de la Préfecture de police', 'Le Pré-Saint-Gervais', '', 'https://www.prefecturedepolice.interieur.gouv.fr/', ''],

    ['CNAEF', 'REL', 'CNAEF', 'Centre national des archives de l\'Église de France', 'Issy-les-Moulineaux', '', '', ''],
    ['JESUITES', 'REL', 'AJ', 'Archives jésuites', 'Vanves', '', '', ''],

    ['NARA', 'ETR', 'NARA', 'National Archives and Records Administration', 'États-Unis', '', 'https://www.archives.gov/', ''],
    ['DRESDE', 'ETR', 'SächsStA', 'Archives d\'État de Saxe', 'Dresde', 'Hauptstaatsarchiv Dresden', 'https://www.archiv.sachsen.de/', ''],
    ['AROLSEN', 'ETR', 'Arolsen', 'Arolsen Archives', 'Bad Arolsen', '', 'https://arolsen-archives.org/fr/rechercher-decouvrir/recherche-dans-les-archives-en-ligne/', ''],
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

  /* Nom simple, pour la fiche imprimée : institution — site, avec le sigle du site s'il est court. */
  function nomSimple(c) {
    if (c.categorie === 'AD') return 'Archives départementales — ' + c.site;
    var sigle = c.detail && c.detail.length <= 8 && c.detail.indexOf(' ') < 0 ? ' (' + c.detail + ')' : '';
    return (c.groupe || c.nom) + (c.site ? ' — ' + c.site : '') + sigle;
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

  root.GA_INIT = { categories: CATEGORIES, centresParDefaut: centresParDefaut, nomComplet: nomComplet, nomSimple: nomSimple, liens: LIENS };
})(typeof window !== 'undefined' ? window : globalThis);
