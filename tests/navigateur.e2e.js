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
  const vu35 = await page.waitForFunction(() => (document.querySelector('.fiche-centre h2') || {}).textContent.includes('Ille-et-Vilaine'), null, { timeout: 5000 }).then(() => true, () => false);
  ok(vu35, 'clic sur la carte → AD 35');
  await shot('08-archives-ad35');

  // Fiche de consultation
  await page.goto(APP + '#/fiche?centre=' + caran);
  await page.waitForSelector('.papier');
  const nbFiche = await page.$$eval('.papier-liste tbody tr:not(.vide)', (l) => l.length);
  const attendu = await page.evaluate((c) => window.GA_DONNEES.etat.data.documents.filter((d) => d.centreId === c && (d.statut === 'chercher' || d.statut === 'demande')).length, caran);
  ok(nbFiche === attendu && attendu > 0, 'fiche de consultation CARAN : ' + nbFiche + ' lignes / ' + attendu + ' attendues');
  await shot('09-fiche-consultation');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(OUT, 'fiche-consultation.pdf'), format: 'A4', landscape: true, printBackground: true });
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

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP + '#/documents');
  await page.waitForSelector('.table-docs');
  await shot('14-mobile-documents');

  console.log(erreurs.length ? '\nERREURS :\n' + erreurs.join('\n') : '\nAucune erreur JavaScript.');
  await browser.close();
  process.exit(erreurs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
