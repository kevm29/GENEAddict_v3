/* GENEAddict — où envoyer les réponses des études de cas.
 *
 * Renseigner l'adresse du projet Supabase et sa clé PUBLIQUE (« Publishable key »,
 * sb_publishable_…, ou l'ancienne clé « anon »). Voir docs/SUPABASE.md.
 * Ne jamais mettre ici la clé secrète (sb_secret_… / service_role).
 * Tant que ces deux valeurs sont vides, les réponses restent seulement dans le navigateur. */
window.GA_SUPABASE = {
  url: '',          // ex. 'https://abcdefghijklmnop.supabase.co'
  cle: '',          // ex. 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxx_xxxxxxxx'
  table: 'reponses_etudes'
};
