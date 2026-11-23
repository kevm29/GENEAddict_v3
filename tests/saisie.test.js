/* Tests de la saisie rapide — lancer avec : node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/saisie.js');

test('dates', () => {
  const d = (s) => { const r = S.lireDate(s); return [r.jour, r.mois, r.annee, r.texte, r.ok]; };
  assert.deepEqual(d('02/06/1642'), ['02', '06', '1642', '', true]);
  assert.deepEqual(d('2.6.1642'), ['02', '06', '1642', '', true]);
  assert.deepEqual(d('??/06/1642'), ['', '06', '1642', '', true]);
  assert.deepEqual(d('00/04/1687'), ['', '04', '1687', '', true]);
  assert.deepEqual(d('06/1642'), ['', '06', '1642', '', true]);
  assert.deepEqual(d('1642'), ['', '', '1642', '', true]);
  assert.deepEqual(d('1642-06-02'), ['02', '06', '1642', '', true]);
  assert.deepEqual(d('1er juin 1642'), ['01', '06', '1642', '', true]);
  assert.deepEqual(d('12 décembre 1682'), ['12', '12', '1682', '', true]);
  assert.deepEqual(d('vers 1650'), ['', '', '1650', 'vers 1650', true]);
  assert.deepEqual(d('1656-1683'), ['', '', '1656', '1656-1683', true]);
  assert.equal(S.lireDate('n\'importe quoi').ok, false);
  assert.equal(S.lireDate('45/13/1642').ok, false);
});

test('personnes', () => {
  assert.deepEqual(S.lirePersonne('Gentien de MARIGNER'), { prenom: 'Gentien', nom: 'de MARIGNER' });
  assert.deepEqual(S.lirePersonne('Hélène Angélique de MARIGNER'), { prenom: 'Hélène Angélique', nom: 'de MARIGNER' });
  assert.deepEqual(S.lirePersonne('Roger de LA TOURNELLE'), { prenom: 'Roger', nom: 'de LA TOURNELLE' });
  assert.deepEqual(S.lirePersonne('MARIGNER, Gentien'), { prenom: 'Gentien', nom: 'MARIGNER' });
  assert.deepEqual(S.lirePersonne('MARIGNER Gentien'), { prenom: 'Gentien', nom: 'MARIGNER' });
  assert.deepEqual(S.lirePersonne('Pierre Mesmyn'), { prenom: 'Pierre', nom: 'Mesmyn' });
  assert.deepEqual(S.lirePersonne('FLEURY'), { prenom: '', nom: 'FLEURY' });
  assert.equal(S.lirePersonnes('Hélène Angélique de MARIGNER & Jean CROSNIER').length, 2);
});

test('statuts', () => {
  assert.equal(S.lireStatut('O'), 'obtenu');
  assert.equal(S.lireStatut('en attente'), 'demande');
  assert.equal(S.lireStatut('À chercher'), 'chercher');
  assert.equal(S.lireStatut('détruit'), 'perdu');
  assert.equal(S.lireStatut('bof'), null);
});

test('texte à balises', () => {
  const r = S.lire(`
# Mes trouvailles au CARAN
@par-defaut
@centre CARAN
@statut à chercher

@date 02/06/1642
@type Procuration et acte de décès
@personne Gentien de MARIGNER
@notaire Me REGNAULT
@cote ET/LXXXV/366
@note Voir aussi la liasse suivante,
peut-être un inventaire.

Date : 05/10/1654
Type : Inventaire après décès
Personne : Hélène FLEURY
Cote : ET/XXXIII/54
Statut : obtenu
---
@date 12/12/1682
@type Marché
@personne Hélène Angélique de MARIGNER & Jean CROSNIER
@centre AD35
@bidule truc
`);
  assert.equal(r.format, 'balises');
  assert.equal(r.actes.length, 3);
  const [a, b, c] = r.actes;
  assert.equal(a.centre, 'CARAN');
  assert.equal(a.statut, 'chercher');
  assert.equal(a.notaire, 'REGNAULT');
  assert.equal(a.notes, 'Voir aussi la liasse suivante,\npeut-être un inventaire.');
  assert.deepEqual(a.personnes, [{ prenom: 'Gentien', nom: 'de MARIGNER' }]);
  assert.equal(b.statut, 'obtenu');
  assert.equal(b.centre, 'CARAN');
  assert.equal(b.cote, 'ET/XXXIII/54');
  assert.equal(c.centre, 'AD35');
  assert.equal(c.personnes.length, 2);
  assert.equal(c._avertissements.length, 1);
  assert.equal(c._erreurs.length, 0);
});

test('tableau copié depuis un tableur (tabulations)', () => {
  const r = S.lire('Date\tType\tPersonnes\tNotaire\tCote\tStatut\n' +
    '02/06/1642\tProcuration\tGentien de MARIGNER\tREGNAULT\tET/LXXXV/366\tO\n' +
    '1657\tProcuration\tRoger de LA TOURNELLE\tJEHAN\tET/XXXVIII/656\t\n');
  assert.equal(r.format, 'tableau');
  assert.equal(r.actes.length, 2);
  assert.equal(r.actes[0].statut, 'obtenu');
  assert.equal(r.actes[1].statut, 'chercher');
  assert.equal(r.actes[1].annee, '1657');
});

test("export CSV de l'ancienne table docs (phpMyAdmin)", () => {
  const csv = '"id";"jour";"mois";"annee";"type";"p1";"n1";"p2";"n2";"ville";"notaire";"cote";"dep";"description";"statut";"trad"\n' +
    '"1";"00";"04";"1687";"cm";"Pierre";"MESMYN";"Marie Louise Gillonne";"DESBORDES";"Paris";"Guillaume TARDIVEAU";"ET/CXIX";"CARAN";"à Paris; chez lui";"C";""\n';
  const r = S.lire(csv);
  assert.equal(r.actes.length, 1);
  const a = r.actes[0];
  assert.equal(a.centre, 'CARAN');
  assert.equal(a.jour, '');
  assert.equal(a.mois, '04');
  assert.deepEqual(a.personnes, [{ prenom: 'Pierre', nom: 'MESMYN' }, { prenom: 'Marie Louise Gillonne', nom: 'DESBORDES' }]);
  assert.equal(a.description, 'à Paris; chez lui');
  assert.equal(a.statut, 'chercher');
});

test('tableau sans en-tête', () => {
  const r = S.lire('1642;Procuration;Gentien de MARIGNER;REGNAULT;ET/LXXXV/366;avec Estienne');
  assert.equal(r.actes.length, 1);
  assert.equal(r.actes[0].cote, 'ET/LXXXV/366');
  assert.equal(r.actes[0].description, 'avec Estienne');
  assert.ok(r.erreurs.length);
});

test('tableau avec barres verticales', () => {
  const r = S.lire('| date | type | cote |\n| 1642 | Procuration | ET/1 |\n');
  assert.equal(r.actes.length, 1);
  assert.equal(r.actes[0].type, 'Procuration');
  assert.equal(r.actes[0].cote, 'ET/1');
});

test('acte vide signalé', () => {
  const r = S.lire('@note juste une note');
  assert.equal(r.actes[0]._erreurs.length, 1);
});

test('affichage des dates partielles', () => {
  assert.equal(S.formatDate({ jour: '02', mois: '06', annee: '1642' }), '02/06/1642');
  assert.equal(S.formatDate({ jour: '', mois: '06', annee: '1642' }), '??/06/1642');
  assert.equal(S.formatDate({ jour: '', mois: '', annee: '1712' }), '1712');
  assert.equal(S.formatDate({ dateTexte: 'vers 1650', annee: '1650' }), 'vers 1650');
});
