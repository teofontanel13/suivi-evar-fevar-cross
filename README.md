# Suivi EVAR / FEVAR / CROSS — V2

Application web responsive : Supabase Auth + PostgreSQL + Vercel. Données EVAR/FEVAR/CROSS, étapes, relances, import JSON V1 et export calendrier .ics (4 h).

## Mise en ligne sans programmation

1. Créer un dépôt **privé** GitHub et y importer les fichiers du dossier `EVAR_V2` (pas le ZIP lui-même).
2. Sur Vercel : **Add New → Project → Import Git Repository**, sélectionner le dépôt ; framework **Vite**.
3. Dans **Environment Variables**, ajouter :
   - `VITE_SUPABASE_URL` = URL du projet Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = clé publique `sb_publishable_...` (ne jamais utiliser `service_role` ni une clé secrète).
4. Cliquer **Deploy**. Dans Supabase → Authentication → URL Configuration, renseigner l'URL Vercel dans **Site URL** (et Redirect URLs si nécessaire).
5. Ouvrir l'adresse Vercel, se connecter avec **le compte utilisateur de Supabase Authentication → Users**, pas les identifiants du tableau de bord Supabase. Importer une sauvegarde JSON V1 via « Importer V1 ».

## Avant utilisation

- Vérifier que les tables `dossiers`, `etapes`, `relances` et leurs politiques RLS existent, et que l'utilisateur est créé dans Supabase Authentication.
- Les paramètres `VITE_` sont publics dans le navigateur : seules les clés *publishable* peuvent y figurer. Ne jamais publier de secrets dans GitHub.
- Les données sont accessibles seulement aux comptes autorisés par les règles RLS ; effectuer un test de lecture/écriture après déploiement.
- Le dépôt privé n'est **pas** une protection des données stockées dans Supabase ; garder RLS activé, sécuriser les comptes et sauvegardes.
- Vérifier l'autorisation de l'entreprise et les conditions tarifaires/commerciales de l'hébergement avant utilisation professionnelle.
- Ne pas mettre de données patients identifiantes dans l'application de test.
- L'export `.ics` ajoute manuellement un événement Outlook de 4 heures ; il ne synchronise pas Outlook automatiquement.
- Les imports V1 sont additifs : les références déjà existantes sont ignorées. En cas d'échec partiel, les dossiers déjà importés restent enregistrés.
- Les mises à jour Vercel sont automatiques après publication de modifications sur la branche déployée. Les données Supabase restent indépendantes.

## Développement local

```bash
npm install
cp .env.example .env
npm run dev
```

## Notes

La modification d'un type de procédure supprime ses anciennes étapes pour les recréer ; confirmer uniquement si cette remise à zéro est souhaitée. La V2 ne propose pas encore de notifications push, de journal d'audit détaillé, de synchronisation Outlook bidirectionnelle ni de sauvegardes/restaurations administrées.
