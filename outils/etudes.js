#!/usr/bin/env node
/* GENEAddict — chiffrement des études de cas.
 *
 * Les études de cas sont publiées chiffrées dans etudes/etudes.js : sans le mot de passe,
 * leur contenu est illisible, même en lisant le code source ou le dépôt GitHub.
 * Chaque année a deux mots de passe :
 *   - celui des énoncés (ex. « 2023 »)            → contenu sans les réponses ;
 *   - celui des solutions (ex. « 2023Solution »)  → même contenu avec les réponses.
 *
 * Utilisation (Node 18 ou plus) :
 *   node outils/etudes.js chiffrer etudes/sources/2023.json
 *       → met à jour l'année 2023 dans etudes/etudes.js (les autres années sont conservées)
 *   node outils/etudes.js extraire 2023 <mot de passe des solutions>
 *       → recrée etudes/sources/2023.json à partir de etudes/etudes.js
 *
 * Le dossier etudes/sources/ contient le texte en clair (réponses comprises) : il est exclu
 * de git (.gitignore). Le fichier chiffré suffit pour le retrouver avec « extraire ».
 *
 * Format du fichier source : voir etudes/sources/2023.json. Les textes sont en HTML
 * (liens <a href='…'>, <span class='indice'>…</span>, <span class='bonus'>Bonus</span>).
 * Les images vont dans etudes/<année>/img/ (non chiffrées). */
'use strict';
const fs = require('fs');
const path = require('path');
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

const RACINE = path.resolve(__dirname, '..');
const SORTIE = path.join(RACINE, 'etudes', 'etudes.js');
const ITERATIONS = 250000;

const b64 = (buf) => Buffer.from(buf).toString('base64');
const deb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function cle(motDePasse, sel) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(motDePasse), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function chiffre(objet, motDePasse) {
  const sel = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const k = await cle(motDePasse, sel);
  const donnees = await subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(objet)));
  return { sel: b64(sel), iv: b64(iv), iterations: ITERATIONS, donnees: b64(donnees) };
}

async function dechiffre(bloc, motDePasse) {
  const k = await cle(motDePasse, deb64(bloc.sel));
  const clair = await subtle.decrypt({ name: 'AES-GCM', iv: deb64(bloc.iv) }, k, deb64(bloc.donnees));
  return JSON.parse(new TextDecoder().decode(clair));
}

function litSortie() {
  if (!fs.existsSync(SORTIE)) return {};
  const t = fs.readFileSync(SORTIE, 'utf8');
  const m = /window\.GA_ETUDES = (\{[\s\S]*\});\s*$/.exec(t);
  return m ? JSON.parse(m[1]) : {};
}

function ecritSortie(annees) {
  const entete = '/* GENEAddict — études de cas, chiffrées (AES-GCM, clé PBKDF2-SHA256).\n' +
    ' * Fichier produit par outils/etudes.js : ne pas modifier à la main. */\n';
  fs.writeFileSync(SORTIE, entete + 'window.GA_ETUDES = ' + JSON.stringify(annees, null, 1) + ';\n');
}

async function chiffrer(fichier) {
  const src = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const { annee, titre, motsDePasse } = src;
  if (!annee || !motsDePasse || !motsDePasse.enonces || !motsDePasse.solutions) throw new Error('annee et motsDePasse.enonces / .solutions sont obligatoires');
  const contenu = Object.assign({}, src);
  delete contenu.motsDePasse;
  // énoncés : ni réponses, ni questions ou annexes réservées à la correction
  const enonces = JSON.parse(JSON.stringify(contenu));
  enonces.etudes.forEach((e) => {
    e.defis.forEach((d) => { delete d.solution; });
    delete e.defisSolution; delete e.annexeSolution;
  });
  enonces.solutions = false;
  // correction : la liste « defisSolution » remplace celle des énoncés quand elle existe ;
  // la source complète est jointe pour pouvoir la ré-extraire à l'identique
  const complet = JSON.parse(JSON.stringify(contenu));
  complet.etudes.forEach((e) => { if (e.defisSolution) { e.defis = e.defisSolution; delete e.defisSolution; } });
  Object.assign(complet, { solutions: true, source: src });
  const annees = litSortie();
  annees[annee] = {
    annee, titre: titre || 'Études de cas ' + annee, nombre: contenu.etudes.length,
    niveaux: [await chiffre(enonces, motsDePasse.enonces), await chiffre(complet, motsDePasse.solutions)]
  };
  ecritSortie(annees);
  const nbSol = complet.etudes.reduce((n, e) => n + e.defis.filter((d) => d.solution).length, 0);
  console.log(`${annee} : ${contenu.etudes.length} études chiffrées, ${nbSol} réponse(s) → ${path.relative(RACINE, SORTIE)}`);
}

async function extraire(annee, motDePasse) {
  const a = litSortie()[annee];
  if (!a) throw new Error('Année ' + annee + ' absente de ' + SORTIE);
  const c = await dechiffre(a.niveaux[1], motDePasse).catch(() => { throw new Error('Mot de passe des solutions incorrect.'); });
  const dest = path.join(RACINE, 'etudes', 'sources', annee + '.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const ordre = c.source || { annee: c.annee, titre: c.titre, motsDePasse: c.motsDePasse, etudes: c.etudes };
  fs.writeFileSync(dest, JSON.stringify(ordre, null, 2) + '\n');
  console.log('Source recréée : ' + path.relative(RACINE, dest));
}

const [action, ...args] = process.argv.slice(2);
(action === 'chiffrer' && args[0] ? chiffrer(args[0])
  : action === 'extraire' && args[1] ? extraire(args[0], args[1])
  : Promise.reject(new Error('Usage : node outils/etudes.js chiffrer <source.json> | extraire <année> <mot de passe des solutions>')))
  .catch((e) => { console.error(e.message); process.exit(1); });
