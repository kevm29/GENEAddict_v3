// Test de bout en bout de GENEAddict dans Chrome (fichier ouvert en file://).
// Lancement : npm install playwright-core && node tests/navigateur.e2e.js . captures/
// Le sélecteur de dossier est simulé par le stockage privé du navigateur (OPFS),
// qui expose la même API de fichiers.
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const APP = 'file://' + path.resolve(process.argv[2], 'index.html');
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  await ctx.addInitScript(() => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie', { create: true });
  });
  let page = await ctx.newPage();
  const erreurs = [];
  page.on('crash', () => console.log('PAGE CRASH')); page.on('close', () => console.log('PAGE CLOSE')); page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_PROXY|favicons/.test(m.text())) erreurs.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: false });
  const ok = (c, msg) => { if (!c) { erreurs.push('ÉCHEC : ' + msg); console.log('✗', msg); } else console.log('✓', msg); };

  await page.goto(APP);
  await page.waitForSelector('.stats');
  await shot('01-accueil-vide');

  // Choix du dossier
  await page.click('[data-dossier]');
  await page.waitForFunction(() => window.GA_DONNEES.etat.mode === 'dossier');
  await page.waitForTimeout(800);
  const fichierExiste = await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie');
    const f = await (await d.getFileHandle('geneaddict.json')).getFile();
    return JSON.parse(await f.text()).centres.length;
  });
  ok(fichierExiste > 100, 'geneaddict.json créé dans le dossier (' + fichierExiste + ' centres)');

  // Fichier déposé dans a-importer/
  await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie');
    const ai = await d.getDirectoryHandle('a-importer', { create: true });
    const w = await (await ai.getFileHandle('ad35-mars.txt', { create: true })).createWritable();
    await w.write('@centre 35\n@date 1712\n@type Contrat de mariage\n@personne Jean MURET & Anne LE GALL\n@cote 4E 1234\n');
    await w.close();
  });

  // Saisie rapide : exemple à balises
  await page.goto(APP + '#/saisie');
  await page.waitForSelector('.zone-texte');
  await page.waitForSelector('[data-fichier]');
  ok(true, 'fichier de a-importer/ listé');
  await page.click('[data-ex="balises"]');
  await page.waitForTimeout(400);
  const nbApercu = await page.$$eval('.apercu-acte', (l) => l.length);
  ok(nbApercu === 2, 'aperçu balises : 2 actes (' + nbApercu + ')');
  await shot('02-saisie-balises');
  await page.click('[data-ajouter]');
  await page.waitForTimeout(300);

  // Exemple tableau
  await page.click('[data-ex="tableau"]');
  await page.waitForTimeout(400);
  ok((await page.$$eval('.apercu-acte', (l) => l.length)) === 3, 'aperçu tableau : 3 actes');
  await page.click('[data-ajouter]');
  await page.waitForTimeout(300);

  // Doublon : recoller l'exemple à balises
  await page.click('[data-ex="balises"]');
  await page.waitForTimeout(400);
  const dbl = await page.$$eval('.apercu-acte.exclu', (l) => l.length);
  ok(dbl === 2, 'doublons détectés et décochés (' + dbl + ')');
  await page.click('[data-vider]');

  // Charger le fichier déposé
  await page.click('[data-fichier]');
  await page.waitForTimeout(400);
  await shot('03-saisie-fichier');
  await page.click('[data-ajouter]');
  await page.waitForTimeout(1200);
  const reste = await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie');
    const ai = await d.getDirectoryHandle('a-importer');
    const noms = [];
    for await (const e of ai.values()) noms.push(e.name);
    const imp = await ai.getDirectoryHandle('importes');
    const noms2 = [];
    for await (const e of imp.values()) noms2.push(e.name);
    return { noms, noms2 };
  });
  ok(!reste.noms.includes('ad35-mars.txt') && reste.noms2.length === 1, 'fichier rangé dans importes/ : ' + JSON.stringify(reste));

  // Collage façon Excel avec ancienne table docs
  await page.fill('.zone-texte', '"id";"jour";"mois";"annee";"type";"p1";"n1";"p2";"n2";"ville";"notaire";"cote";"dep";"description";"statut";"trad"\n"1";"00";"04";"1687";"cm";"Pierre";"MESMYN";"Marie Louise Gillonne";"DESBORDES";"Paris";"Guillaume TARDIVEAU";"ET/CXIX";"CARAN";"à Paris";"P";""\n"2";"14";"02";"1701";"Testament";"Yves";"KERBRAT";"";"";"Brest";"LE ROUX";"4E 99";"29";"";"A";""');
  await page.waitForTimeout(500);
  await shot('04-saisie-ancienne-base');
  await page.click('[data-ajouter]');
  await page.waitForTimeout(300);

  // Documents
  await page.goto(APP + '#/documents');
  await page.waitForSelector('.table-docs');
  const nbDocs = await page.$$eval('.table-docs tbody tr', (l) => l.length);
  ok(nbDocs === 8, '8 documents listés (' + nbDocs + ')');
  await shot('05-documents');
  await page.fill('.filtres input[name=q]', 'marigner');
  await page.waitForTimeout(400);
  ok((await page.$$eval('.table-docs tbody tr', (l) => l.length)) === 2, 'recherche « marigner » : 2 résultats');
  await page.fill('.filtres input[name=q]', '-marigner');
  await page.waitForTimeout(400);
  ok((await page.$$eval('.table-docs tbody tr', (l) => l.length)) === 6, 'recherche « -marigner » : 6 résultats (tout sauf Marigner)');
  await page.fill('.filtres input[name=q]', 'caran -"de la tournelle"');
  await page.waitForTimeout(400);
  const nbExcl = await page.$$eval('.table-docs tbody tr', (l) => l.length);
  ok(nbExcl === 5, 'recherche « caran -\"de la tournelle\" » : ' + nbExcl + ' résultats');
  await page.fill('.filtres input[name=q]', '');
  await page.waitForTimeout(300);

  // Fiche d'un document
  await page.click('.table-docs tbody tr:first-child td.col-pers');
  await page.waitForSelector('.modale');
  await page.fill('.modale textarea[name=notes]', 'Acte vu sur microfilm, à photographier.');
  await page.selectOption('.modale select[name=statut]', 'demande');
  await shot('06-fiche-document');
  await page.click('.modale button[type=submit]');
  await page.waitForTimeout(300);

  // Changement de statut en ligne
  await page.selectOption('.table-docs tbody tr:nth-child(2) [data-statut]', 'obtenu');
  await page.waitForTimeout(200);

  // Archives
  const caran = await page.evaluate(() => window.GA_DONNEES.trouveCentre('CARAN').id);
  await page.goto(APP + '#/archives/' + caran);
  await page.waitForSelector('.fiche-centre');
  await shot('07-archives-caran');
  const ad35 = await page.evaluate(() => window.GA_DONNEES.trouveCentre('35').id);
  await page.click('path.dep[data-centre="' + ad35 + '"]');
  const vu35 = await page.waitForFunction(() => (document.querySelector('.fiche-centre') || { textContent: '' }).textContent.includes('Ille-et-Vilaine'), null, { timeout: 5000 }).then(() => true, () => false);
  ok(vu35, 'clic sur la carte → AD 35');
  await shot('08-archives-ad35');

  // Fiche de consultation
  await page.goto(APP + '#/fiche?centre=' + caran);
  await page.waitForSelector('.papier');
  const nbFiche = await page.$$eval('.papier-docs li:not(.vide)', (l) => l.length);
  const attendu = await page.evaluate((c) => window.GA_DONNEES.etat.data.documents.filter((d) => d.centreId === c && (d.statut === 'chercher' || d.statut === 'demande')).length, caran);
  ok(nbFiche === attendu && attendu > 0, 'fiche de consultation CARAN : ' + nbFiche + ' lignes / ' + attendu + ' attendues');
  await shot('09-fiche-consultation');
  await page.emulateMedia({ media: 'print' });
  const ligne1 = await page.textContent('.papier-docs li:first-child');
  ok(/^\s*ET\/\S+ — /.test(ligne1) && !/chercher|Obtenu|Demandé/.test(await page.textContent('.pages')), 'fiche : cote puis infos séparées par des tirets, sans statut : ' + ligne1.trim().slice(0, 70));
  await page.pdf({ path: path.join(OUT, 'fiche-consultation.pdf'), preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });

  // Dépouillements
  await page.goto(APP + '#/depouillements');
  await page.click('[data-nouveau]');
  await page.fill('.modale input[name=titre]', 'Me GALLOIS, Edmond');
  await page.selectOption('.modale select[name=centreId]', caran);
  await page.fill('.modale input[name=cote]', 'ET/CIII');
  await page.fill('.modale input[name=periode]', '1656-1683');
  await page.fill('.modale input[name=pagesFaites]', '8');
  await page.fill('.modale input[name=pagesTotal]', '16');
  await page.click('.modale button.principal');
  await page.waitForSelector('.deps li');
  await page.click('[data-pas="1"]');
  ok((await page.textContent('.deps .pages')).startsWith('9 / 16'), 'dépouillement +1 page');
  await shot('10-depouillements');

  // Accueil rempli, liens, ma base
  await page.goto(APP + '#/accueil');
  await page.waitForSelector('.stats');
  await shot('11-accueil');
  await page.goto(APP + '#/liens');
  await page.waitForSelector('.liens');
  await shot('12-liens');
  await page.goto(APP + '#/donnees');
  await page.waitForSelector('.arbo');
  await shot('13-ma-base');

  // Persistance : relecture du fichier et rechargement
  await page.waitForTimeout(800);
  const surDisque = await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie');
    const j = JSON.parse(await (await (await d.getFileHandle('geneaddict.json')).getFile()).text());
    const n = [];
    try { const s = await d.getDirectoryHandle('sauvegardes'); for await (const e of s.values()) n.push(e.name); } catch (e) { /* 1er jour */ }
    return { docs: j.documents.length, deps: j.depouillements.length, notes: j.documents.filter((x) => x.notes).length, sauvegardes: n };
  });
  ok(surDisque.docs === 8 && surDisque.deps === 1 && surDisque.notes >= 1, 'fichier à jour sur disque : ' + JSON.stringify(surDisque));
  // Relecture depuis le fichier (comme à la réouverture) : on vide la mémoire puis on recharge le dossier
  await page.evaluate(() => { GA_DONNEES.etat.data.documents = []; return GA_DONNEES.reconnecter(); });
  await page.waitForTimeout(300);
  const apresRecharge = await page.evaluate(() => window.GA_DONNEES.etat.data.documents.length);
  ok(apresRecharge === 8, 'données retrouvées après rechargement');

  // Modification extérieure du fichier (comme un autre PC via OneDrive)
  await page.evaluate(async () => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('Genealogie');
    const fh = await d.getFileHandle('geneaddict.json');
    const j = JSON.parse(await (await fh.getFile()).text());
    j.liens.push({ id: 'x1', nom: 'Ajout externe', url: 'https://example.org', categorie: 'Test' });
    await new Promise((r) => setTimeout(r, 1500));
    const w = await fh.createWritable(); await w.write(JSON.stringify(j)); await w.close();
  });
  await page.evaluate(() => window.GA_DONNEES.verifieFichierExterne());
  ok(await page.evaluate(() => window.GA_DONNEES.etat.data.liens.some((l) => l.nom === 'Ajout externe')), 'modification extérieure du fichier rechargée');

  // ---- Carte : tient dans l'écran, DOM présents
  await page.goto(APP + '#/archives');
  await page.waitForSelector('.carte-france');
  const tient = await page.evaluate(() => ({ h: document.scrollingElement.scrollHeight, v: innerHeight, dom: ['971', '972', '973', '974', '976'].every((c) => document.querySelector('.carte-france path.dep[data-code="' + c + '"]')) }));
  ok(tient.h <= tient.v + 2 && tient.dom, 'Archives sans défilement (' + tient.h + ' / ' + tient.v + ' px) et DOM sur la carte');
  await page.click('.carte-france path.dep[data-code="974"]');
  ok(await page.waitForFunction(() => (document.querySelector('.fiche-centre') || { textContent: '' }).textContent.includes('La Réunion'), null, { timeout: 5000 }).then(() => true, () => false), 'clic sur La Réunion → AD 974');
  await shot('14b-archives-une-page');

  // ---- Carte : étiquettes, liseré découpé, zoom, onglets
  await page.goto(APP + '#/archives/' + ad35);
  await page.waitForSelector('.lisere.choisi');
  const etiq = await page.evaluate(() => ({
    nums: [...document.querySelectorAll('.carte-france .etiq')].filter((g) => g.style.display !== 'none').length,
    noms: [...document.querySelectorAll('.carte-france .etiq-nom')].filter((t) => t.style.display !== 'none' && t.parentNode.style.display !== 'none').length,
    clip: document.querySelector('.lisere.choisi').getAttribute('clip-path'),
  }));
  ok(etiq.nums > 85 && etiq.noms > 20 && /url\(#cp-35\)/.test(etiq.clip), 'carte : ' + etiq.nums + ' numéros, ' + etiq.noms + ' noms, liseré ' + etiq.clip);
  await shot('15-carte-etiquettes');
  await page.click('[data-z="1.6"]'); await page.click('[data-z="1.6"]');
  const nomsZoom = await page.evaluate(() => [...document.querySelectorAll('.carte-france .etiq-nom')].filter((t) => t.style.display !== 'none' && t.parentNode.style.display !== 'none').length);
  ok(nomsZoom > 0, 'zoom : ' + nomsZoom + ' noms visibles dans la vue zoomée');
  await shot('16-carte-zoom');
  await page.click('[data-z="0"]');
  await page.click('[data-onglet="SHD"]');
  await page.waitForSelector('.onglet.actif[data-onglet="SHD"]');
  const sitesShd = await page.$$eval('.catalogue .puces.sous .puce-centre', (l) => l.map((x) => x.textContent.trim()));
  ok(sitesShd.some((t) => t.startsWith('Caen')) && sitesShd.some((t) => t.startsWith('Le Blanc')) && sitesShd.length === 10, 'onglet SHD : ' + sitesShd.join(', '));
  await page.click('[data-onglet="AN"]');
  await page.waitForSelector('.onglet.actif[data-onglet="AN"]');
  ok((await page.textContent('.catalogue')).includes('AN (Archives nationales)'), 'onglet AN : groupe « AN (Archives nationales) »');
  await shot('17-onglet-an');
  await page.click('.catalogue .puce-centre:has-text("Pierrefitte")');
  ok(await page.waitForFunction(() => (document.querySelector('.fiche-centre .sous-titre') || { textContent: '' }).textContent.includes('Pierrefitte'), null, { timeout: 5000 }).then(() => true, () => false), 'fiche AN Pierrefitte');

  // ---- Saisie : autocomplétion et balise personnalisée
  await page.goto(APP + '#/saisie');
  await page.waitForSelector('.zone-texte');
  await page.click('[data-vider]');
  await page.click('.zone-texte');
  await page.keyboard.type('@');
  await page.waitForSelector('.suggestions:not([hidden]) li');
  await shot('18-autocompletion-balises');
  await page.keyboard.type('cen');
  ok((await page.textContent('.suggestions li.actif .sugg-texte')) === '@centre', 'suggestion @centre');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.suggestions:not([hidden]) li');
  await page.keyboard.type('SHD-CA');
  await page.waitForTimeout(100);
  await shot('19-autocompletion-centres');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.keyboard.type('@date 1944\n@type Dossier de déporté\n@personne Jean MURET\n@cote AC 21 P 12345\n@parrain Yves KERBRAT\n');
  await page.keyboard.press('Escape');
  const texteSaisi = await page.inputValue('.zone-texte');
  ok(texteSaisi.startsWith('@centre SHD-CAEN\n@date 1944'), 'autocomplétion insérée : ' + JSON.stringify(texteSaisi.slice(0, 30)));
  await page.waitForTimeout(400);
  ok((await page.textContent('.apercu-liste')).includes('Nouvelle balise @parrain'), 'aperçu : nouvelle balise signalée');
  await shot('20-saisie-balise-perso');
  await page.click('[data-ajouter]');
  await page.waitForTimeout(300);
  await page.goto(APP + '#/documents?q=kerbrat%20yves');
  await page.waitForSelector('.table-docs tbody tr');
  await page.click('.table-docs tbody tr:has-text("Dossier de déporté") td.col-pers');
  await page.waitForSelector('.modale [data-champ="parrain"]');
  ok((await page.inputValue('.modale [data-champ="parrain"]')) === 'Yves KERBRAT', 'champ personnalisé dans la fiche du document');
  await shot('21-fiche-champ-perso');
  await page.keyboard.press('Escape');
  await page.goto(APP + '#/donnees');
  await page.waitForSelector('.table-balises');
  ok((await page.textContent('.table-balises')).includes('@parrain'), 'Ma base : @parrain listée');
  await page.fill('.ajout-balise [name=nom]', 'Lieu inhumation');
  await page.fill('.ajout-balise [name=description]', 'Cimetière, paroisse');
  await page.click('.ajout-balise button');
  await page.waitForSelector('tr[data-nom="lieu-inhumation"]');
  ok(true, 'balise @lieu-inhumation déclarée');
  await shot('22-ma-base-balises');

  // ---- Migration d'une base de la première version
  await page.evaluate(() => GA_DONNEES.remplaceBase(JSON.stringify({ app: 'GENEAddict', version: 1, documents: [{ id: 'd1', centreId: 'c1', type: 'IAD', statut: 'chercher' }],
    centres: [{ id: 'c1', code: 'CARAN', nom: 'Archives nationales (CARAN, Paris)', type: 'national', dep: '', url: 'https://perso.example/' },
      { id: 'c2', code: 'AM-RENNES', nom: 'Archives municipales de Rennes', type: 'AM', dep: '' }], liens: [] })));
  const mig = await page.evaluate(() => { const c = GA_DONNEES.trouveCentre('CARAN'), r = GA_DONNEES.trouveCentre('AM-RENNES');
    return { c: [c.categorie, c.sigle, c.site, c.url, c.id], r: [r.categorie, r.sigle], caen: !!GA_DONNEES.trouveCentre('SHD Caen'), n: GA_DONNEES.etat.data.centres.length }; });
  ok(mig.c.join('|') === 'AN|AN|Paris|https://perso.example/|c1' && mig.r.join('|') === 'AM|AM-RENNES' && mig.caen, 'migration v1 → v2 : ' + JSON.stringify(mig));

  // ---- Migration v2 → v3 : sigles SHD, sites des AD, précisions personnelles conservées
  await page.evaluate(() => GA_DONNEES.remplaceBase(JSON.stringify({ app: 'GENEAddict', version: 2, documents: [], liens: [], balises: [], depouillements: [], centres: [
    { id: 'k1', code: 'SHD-CAEN', categorie: 'SHD', sigle: 'SHD', groupe: 'Service historique de la Défense', site: 'Caen', detail: 'Centre des archives de Caen (ex-DAVCC, victimes des conflits contemporains)', dep: '', url: 'https://www.servicehistorique.sga.defense.gouv.fr/', nom: 'x' },
    { id: 'k2', code: 'SHD-PAU', categorie: 'SHD', sigle: 'SHD', groupe: 'Service historique de la Défense', site: 'Pau', detail: 'ma précision', dep: '', url: 'https://perso.example/', nom: 'x' },
    { id: 'k3', code: 'AD01', categorie: 'AD', sigle: 'AD', groupe: 'Archives départementales', site: 'Ain', detail: '', dep: '01', url: '', nom: 'x' }] })));
  const v3 = await page.evaluate(() => ['k1', 'k2', 'k3'].map((i) => { const c = GA_DONNEES.centreParId(i); return [c.detail, c.url, GA_INIT.nomSimple(c)].join(' | '); }));
  ok(v3[0].startsWith('CACn | https://www.servicehistorique.sga.defense.gouv.fr/le-shd-en-france/centre-des-archives-de-caen | Service historique de la Défense — Caen (CACn)') &&
    v3[1].startsWith('ma précision | https://perso.example/') && v3[2].startsWith(' | https://www.archives.ain.fr/'), 'migration v2 → v3 : ' + JSON.stringify(v3));

  // ---- Études de cas protégées
  await page.goto(APP + '#/etudes/2023');
  await page.waitForSelector('.mdp-etudes');
  await page.fill('[name=mdp]', 'mauvais'); await page.click('.mdp-etudes button');
  await page.waitForSelector('.erreur-mdp:not([hidden])');
  await page.fill('[name=mdp]', '2023'); await page.click('.mdp-etudes button');
  await page.waitForSelector('.couverture');
  ok((await page.$$eval('.couverture', (l) => l.length)) === 8, 'études 2023 : mauvais mot de passe refusé, « 2023 » ouvre les 8 études');
  await page.click('.couverture:nth-child(5)');
  await page.waitForSelector('.page-etude');
  ok((await page.$$eval('.reponse', (l) => l.length)) === 0 && (await page.$$eval('.page-etude a[target=_blank]', (l) => l.length)) >= 5, 'TP 5 : liens cliquables, pas de réponses');
  await page.click('[data-fermer-annee]');
  await page.waitForSelector('.mdp-etudes');
  await page.fill('[name=mdp]', '2023Solution'); await page.click('.mdp-etudes button');
  await page.waitForSelector('.badge-solutions');
  await page.goto(APP + '#/etudes/2023/tp3');
  await page.waitForSelector('.reponse');
  ok((await page.$$eval('.reponse.cachee', (l) => l.length)) === 5, '« 2023Solution » : 5 réponses, cachées au départ');
  await page.click('.reponse.cachee >> nth=0');
  ok((await page.$$eval('.reponse.cachee', (l) => l.length)) === 4, 'un clic révèle une seule réponse');
  await page.goto(APP + '#/etudes/2024');
  await page.waitForSelector('[name=mdp]');
  await page.fill('[name=mdp]', '2024Solution'); await page.click('.mdp-etudes button');
  await page.waitForSelector('.couverture');
  await page.goto(APP + '#/etudes/2024/tp2');
  await page.waitForSelector('.annexe');
  await page.click('[data-tout="1"]');
  const rev = await page.evaluate(() => ({ cachees: document.querySelectorAll('.reponse.cachee').length, texte: document.querySelector('.page-etude').textContent }));
  ok(rev.cachees === 0 && rev.texte.includes('1 E 206') && rev.texte.includes('Nicolas SIMON'), '2024 : question et annexe propres à la correction, « Tout révéler »');
  await shot('23-etude-correction');

  // Réponses des participants envoyées à Supabase (serveur simulé)
  const envois = [];
  await page.route('https://test.supabase.co/**', async (route) => {
    const r = route.request();
    envois.push({ url: r.url(), headers: r.headers(), body: r.postDataJSON() });
    await route.fulfill({ status: 201, body: '', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.click('[data-fermer-annee]'); await page.waitForSelector('[name=mdp]');
  await page.fill('[name=mdp]', '2024'); await page.click('.mdp-etudes button');
  await page.waitForSelector('.couverture');
  await page.evaluate(() => { GA_SUPABASE.url = ''; });
  await page.goto(APP + '#/etudes/2024/tp2'); await page.waitForSelector('.saisie-reponse');
  ok((await page.$$eval('.reponse', (l) => l.length)) === 0 && await page.$eval('[data-envoyer]', (b) => b.disabled),
    'énoncés : zones de réponse vides, envoi désactivé tant que Supabase n\'est pas configuré');
  await page.click('.saisie-reponse[data-k="0"]'); await page.keyboard.type('Réponse de test'); await page.keyboard.press('Enter');
  ok(await page.isHidden('.saisie-reponse[data-k="0"]') && !(await page.textContent('.champ-reponse')).includes('Réponse de test'),
    'réponse validée par Entrée : masquée sous des points');
  await page.click('.oeil-reponse >> nth=0');
  ok(await page.isVisible('.saisie-reponse[data-k="0"]'), 'le petit œil la réaffiche');
  await page.evaluate(() => { GA_SUPABASE.url = 'https://test.supabase.co'; GA_SUPABASE.cle = 'sb_publishable_TEST'; });
  await page.goto(APP + '#/etudes/2024/tp1'); await page.goto(APP + '#/etudes/2024/tp2');
  await page.waitForSelector('[data-envoyer]:not([disabled])');
  ok((await page.inputValue('.saisie-reponse[data-k="0"]')) === 'Réponse de test' && await page.isHidden('.saisie-reponse[data-k="0"]'),
    'brouillon de réponse conservé, masqué au retour');
  await page.fill('[data-participant]', 'Test');
  await page.click('[data-envoyer]');
  await page.waitForFunction(() => /Envoyé le/.test(document.querySelector('.etat-envoi').textContent));
  const env = envois[0];
  ok(env && env.url.endsWith('/rest/v1/reponses_etudes') && env.headers.apikey === 'sb_publishable_TEST' && !env.headers.authorization
    && env.body.length === 1 && env.body[0].defi === 1 && env.body[0].tp === 'tp2' && env.body[0].participant === 'Test',
    'envoi Supabase : une ligne par réponse remplie, clé publique dans « apikey »');
  ok((await page.inputValue('.saisie-reponse[data-k="0"]')) === '' && await page.isHidden('.voile-reponse >> nth=0'), 'après l\'envoi : cases vidées');
  await page.goto(APP + '#/etudes/2024/tp1'); await page.goto(APP + '#/etudes/2024/tp2'); await page.waitForSelector('.saisie-reponse');
  ok((await page.$$eval('.saisie-reponse', (l) => l.every((z) => z.value === ''))), 'au retour sur le TP : toujours vides (brouillons effacés)');
  await shot('24-etude-reponses');

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP + '#/accueil');
  await page.waitForSelector('.stats');
  await shot('14-mobile-accueil');

  console.log(erreurs.length ? '\nERREURS :\n' + erreurs.join('\n') : '\nAucune erreur JavaScript.');
  await browser.close();
  process.exit(erreurs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
