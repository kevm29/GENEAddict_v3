/* GENEAddict — centres d'archives proposés à la création d'une nouvelle base.
 * Les adresses reprennent celles de l'ancienne version (Archives.php) ;
 * elles restent modifiables depuis la fiche de chaque centre. */
(function (root) {
  'use strict';

  var FGW = 'http://www.francegenweb.org/entraide/egwformu.php?dep=';

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
    '78': 'https://archives.yvelines.fr/article.php?larub=19&titre=archives-en-ligne',
    '84': 'https://archives.vaucluse.fr/mes-recherches/documents-numerises-1162.html',
    '89': 'https://archives.yonne.fr/Archives-en-ligne/Fonds-numerises'
  };

  var OUTRE_MER = [
    ['971', 'Guadeloupe'], ['972', 'Martinique'], ['973', 'Guyane'],
    ['974', 'La Réunion'], ['976', 'Mayotte']
  ];

  var NATIONAUX = [
    { code: 'CARAN', nom: 'Archives nationales (CARAN, Paris)', type: 'national',
      url: 'https://www.siv.archives-nationales.culture.gouv.fr/', entraide: FGW + 'caran' },
    { code: 'ANOM', nom: "Archives nationales d'outre-mer (Aix-en-Provence)", type: 'national',
      url: 'http://anom.archivesnationales.culture.gouv.fr/', entraide: FGW + 'ANOM' },
    { code: 'BNF', nom: 'Bibliothèque nationale de France (Gallica)', type: 'national',
      url: 'https://gallica.bnf.fr/services/engine/search/advancedSearch/', entraide: '' },
    { code: 'SHD-V', nom: 'Service historique de la Défense — Vincennes', type: 'national',
      url: 'https://www.servicehistorique.sga.defense.gouv.fr/', entraide: 'http://www.francegenweb.org/entraide/egwformu_depferme.php?dep=shd' },
    { code: 'SHD-B', nom: 'Service historique de la Défense — Brest', type: 'national',
      url: 'https://www.servicehistorique.sga.defense.gouv.fr/', entraide: FGW + 'shdBrest' },
    { code: 'AROLSEN', nom: 'Arolsen Archives (ITS Bad Arolsen)', type: 'autre',
      url: 'https://arolsen-archives.org/fr/rechercher-decouvrir/recherche-dans-les-archives-en-ligne/', entraide: '' },
    { code: 'CICR', nom: 'Comité international de la Croix-Rouge', type: 'autre',
      url: 'https://www.icrc.org/fr/archives', entraide: '' },
    { code: 'SNCF', nom: 'Archives historiques SNCF', type: 'autre',
      url: 'http://www.archives-historiques.sncf.fr/', entraide: '' }
  ];

  var LIENS = [
    { nom: 'Geneanet', url: 'https://www.geneanet.org/', categorie: 'Bases de données' },
    { nom: 'FranceGenWeb — entraide', url: 'http://www.francegenweb.org/entraide/', categorie: 'Entraide' },
    { nom: 'Fil d\'Ariane (FDA) — entraide généalogique', url: 'http://www.entraide-genealogique.net/', categorie: 'Entraide' },
    { nom: 'Mémoire des hommes', url: 'https://www.memoiredeshommes.sga.defense.gouv.fr/', categorie: 'Militaires' },
    { nom: 'FranceArchives', url: 'https://francearchives.gouv.fr/', categorie: 'Portails' }
  ];

  function centresParDefaut(departements) {
    var liste = [];
    departements.forEach(function (d) {
      liste.push({
        code: 'AD' + d.code, nom: 'Archives départementales — ' + d.nom, type: 'AD', dep: d.code,
        url: SITES_AD[d.code] || '', entraide: FGW + d.code
      });
    });
    OUTRE_MER.forEach(function (d) {
      liste.push({
        code: 'AD' + d[0], nom: 'Archives départementales — ' + d[1], type: 'AD', dep: d[0],
        url: '', entraide: FGW + d[0]
      });
    });
    return liste.concat(NATIONAUX.map(function (c) { return Object.assign({ dep: '' }, c); }));
  }

  root.GA_INIT = { centresParDefaut: centresParDefaut, liens: LIENS };
})(typeof window !== 'undefined' ? window : globalThis);
