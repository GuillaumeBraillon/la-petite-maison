# Journal des modifications (Changelog)

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet respecte le [Versionnage Sémantique](https://semver.org/spec/v2.0.0.html).

---

## [0.2.4] — 2026-02-25

### Added

- Inline création de sous-membre depuis le formulaire de location (mini-form / Combobox).
- Nouveau composant UI: `src/components/ui/Combobox.tsx`.
- KPI tableau de bord: coût électrique et cartes par propriétaire triées.

### Changed

- `Prix (€)` renommé en **Tarif location (€)** dans le formulaire et affichages.
- Affichage du `Coût électrique` sur les cartes de location; n'est affiché que si le statut est `Terminé` (`completed`).
- Types & DB mapping:
  - `email` rendu optionnel côté app (TypeScript) et nullable côté DB.
  - Ajout de `isEditor` (booléen non-optionnel) et suppression du champ `status` des membres.
  - Conversion du suivi électrique vers `electricityCost` (numeric).
- `apiMappers.ts` mis à jour pour envoyer explicitement `null` quand un champ est intentionnellement vidé (ex: `email`, `ownerId`, `sub_member_id`, `electricityCost`).

### Fixed

- Résolution du conflit 409 lors de la création de membre (éviter `email: ""` en envoyant `undefined` / `null`).
- Correction des erreurs 400 liées à l'omission/présence de clés — mappers ajustés pour envoyer `null` explicite quand nécessaire.
- Corrections de lint / hooks (ex: `App.tsx`, `UnauthorizedView.tsx`).

### Removed

- Suppression de migrations ad-hoc et fichiers de migration obsolètes.
- Suppression de `members.status` (champ DB) et du type `MemberStatus` côté app.

### Database / Schema

- Fichier mis à jour: `supabase/schema.sql`
  - `members.email` → `NULL` autorisé, index unique partiel `WHERE email IS NOT NULL`.
  - Ajout de `members.is_editor boolean NOT NULL DEFAULT false`.
  - Suppression de `members.status`.
  - Remplacement de `rentals.electricity_start` / `electricity_end` par `rentals.electricity_cost numeric`.

### Key files touched

- `src/components/rentals/RentalForm.tsx`
- `src/components/rentals/RentalCard.tsx`
- `src/components/rentals/RentalDetail.tsx` (consistency changes pending)
- `src/components/ui/Combobox.tsx`
- `src/components/members/MemberForm.tsx`
- `src/components/members/MemberCard.tsx`
- `src/components/members/MemberList.tsx`
- `src/services/apiMappers.ts`
- `src/services/apiCrud.ts`
- `src/services/dbTypes.ts`
- `src/types.ts`
- `src/components/dashboard/DashboardStats.tsx`
- `src/App.tsx`
- `supabase/schema.sql`

---

Notes:

- Les mappers garantissent désormais l'envoi explicite de `null` pour les champs vidés afin d'éviter les erreurs PostgREST.
- Certains endroits (export CSV, `RentalDetail.tsx`) peuvent nécessiter l'harmonisation des libellés; me dire si vous voulez que j'applique ces changements aussi.

## [0.2.3] - 2026-02-24

### Ajouté

- **Authentification**
  - Connexion via Google OAuth et email/mot de passe
  - Vue d'inscription (`SignUpView`) et réinitialisation de mot de passe (`ResetPasswordView`)
  - Gestion du flow `PASSWORD_RECOVERY` dans `App.tsx` avec redirection vers la vue de récupération

- **Autorisation & Rôles**
  - Service `permissions.ts` avec matrice de droits à 11 flags selon le rôle
  - Hook `usePermissions` pour accès aux permissions dans les composants
  - Navigation et actions conditionnées au rôle de `currentMember`
  - `currentMember` transmis aux pages `RentalsPage`, `CalendarPage`, `DashboardPage`

- **Membres — flag `isEditor`**
  - Champ `isEditor: boolean` (non optionnel, `false` par défaut) sur les owners
  - Badge "Éditeur" dans `MemberCard` si `isEditor = true`
  - Case à cocher "Éditeur" dans `MemberForm`, visible uniquement pour `role = owner`
  - Reset automatique de `isEditor` à `false` si le rôle passe de `owner` à autre chose (formulaire + mapper)

- **Création inline de sous-membre depuis `RentalForm`**
  - Nouveau composant `Combobox.tsx` : champ recherche avec filtre + option "Créer «…»"
  - Mini-formulaire inline : prénom, nom, libellé, rôle (`external` / `sub_member`)
  - Rôle sélectionnable directement à la création (défaut : `external`)
  - Handlers `handleCreateSubMember` dans `RentalsPage` et `CalendarPage`

### Modifié

- **Membres**
  - `MemberStatus` (`family` / `friends` / `other`) entièrement supprimé (type, DB, mapper, formulaire, carte)
  - Email rendu optionnel dans `MemberForm` et dans la DB (`NOT NULL` levé)
  - Liste triée alphabétiquement par libellé dans `MemberList`
  - Bouton "Autoriser" retiré de `MemberCard` (accessible uniquement via la modal d'édition)
  - Préférence du sous-membre pour l'affichage de l'avatar dans les cartes de location

- **Locations**
  - Section post-location (notes + coût électrique) conditionnelle : visible uniquement si `statut = Terminé`
  - Option "— Aucun —" dans le select sous-membre pour permettre la désélection
  - Handlers de clic optionnels dans les composants calendrier et location

- **DB / Services**
  - Colonne `electricity_start` / `electricity_end` remplacée par `electricity_cost numeric` dans `rentals`
  - Colonne `status` supprimée de `members`
  - Colonne `is_editor boolean not null default false` ajoutée à `members`
  - Email nullable avec index unique partiel (`WHERE email IS NOT NULL`)
  - `mapMemberToDb` : utilise `'email' in member` pour envoyer `null` explicitement vs omettre le champ
  - `schema.sql` mis à jour pour refléter l'état courant ; fichiers de migration ad hoc supprimés

### Corrigé

- Erreur 409 lors de la création inline d'un sous-membre : `email: ""` provoquait un conflit sur la contrainte `UNIQUE(email)` → remplacé par `email: undefined` → `NULL` en DB
- Erreur 400 sur l'INSERT membre : champ `email` absent du payload quand `undefined` → le mapper envoie désormais `null` explicitement
- `isEditor` non réinitialisé lors d'un changement de rôle via le formulaire ou le mapper → reset garanti à `false` si `role !== "owner"`

---

## [0.2.2] - 2026-02-24

### Ajouté

- **Responsive**
  - Navigation mobile avec header et barre d'onglets
  - Vue calendrier mobile en liste (jours cliquables)

### Modifie

- **Responsive**
  - KPI cards empilees sur mobile
  - En-tetes + boutons adaptes (full-width) sur mobile
  - Cartes locations et details adaptes aux petits ecrans
  - Formulaires membres/locations en grille 1 colonne sur mobile
  - Modals avec padding et actions adaptes aux petits ecrans

---

## [0.2.1] - 2026-02-24

### Ajouté

- **PWA**
  - Bouton d'installation conditionnel via `usePWAInstall` dans la sidebar
  - Captures d'ecran `wide` et mobile dans le manifest pour l'install UI enrichie
  - Ajout du champ `id` dans le manifest pour stabiliser l'identite de l'app

### Modifie

- **PWA**
  - Icônes PNG generees depuis `maison-de-plage.png` (192x192, 512x512)
  - Manifest aligne sur les assets PNG et screenshots
  - Favicon et apple-touch-icon mis a jour vers les PNG

---

## [0.2.0] - 2026-02-24

### Ajouté

- **Authentification & Autorisation**
  - Fusion de la table `authorized_users` dans `members` avec champ `is_allowed`
  - Auto-création de membres en attente lors de la première connexion Google
  - Interface admin pour autoriser/révoquer l'accès aux membres
  - Validation du profil complet (label, prénom, nom) avant autorisation
  - Extraction et stockage des métadonnées Google OAuth (avatar, email, nom)
  - Synchronisation automatique de l'avatar à chaque connexion

- **Affichage des avatars**
  - Avatars utilisateurs dans les cartes membres
  - Avatars propriétaires dans les cartes de location
  - Avatars dans la vue détail des locations (propriétaire et sous-membre)
  - Mini avatars dans les badges du calendrier
  - Avatar utilisateur dans la sidebar de navigation
  - Fallback avec initiale si pas d'avatar

- **Fonctionnalités calendrier**
  - Bouton "Nouvelle location" directement dans la vue calendrier
  - Création de location en cliquant sur un jour du calendrier
  - Dates pré-remplies : jour cliqué comme début, dimanche suivant comme fin
  - Labels de dates avec jour de la semaine (ex: "Lundi 24 février 2026")
  - Jours cliquables avec effet hover visuel

- **Gestion des locations**
  - Statut modifiable directement dans la vue détail (Select interactif)
  - Hook personnalisé `useRentalModals` pour la gestion centralisée des modals

### Modifié

- **UX/UI**
  - Cursor pointer uniquement sur les cartes cliquables
  - Champ prix : possibilité d'effacer complètement le "0"
  - Section relevés électriques visuellement différenciée (fond gris, bordure)
  - Boutons Modifier/Supprimer alignés à droite dans la vue détail
  - Conversion correcte des dates UTC vers heure locale (12h au lieu de 11h)

- **Architecture**
  - Refactorisation : élimination de la duplication de code entre RentalsPage, CalendarPage, DashboardPage
  - Hook `useRentalModals` partagé pour la gestion des états et handlers
  - Gestion cohérente des modals de création/édition/détail/suppression

### Corrigé

- Apostrophes échappées dans JSX pour respecter `react/no-unescaped-entities`
- Warning ESLint `react-refresh/only-export-components` sur ErrorContext
- Type checking strict pour distinction création vs modification (vérification de `editing.id`)
- Gestion correcte des dates avec jour de la semaine dans les formulaires

---

## [0.1.0] - 2026-02-24

- Version initiale de l'application (première release publique)
