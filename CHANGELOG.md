# Journal des modifications (Changelog)

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet respecte le [Versionnage Sémantique](https://semver.org/spec/v2.0.0.html).

---

## [0.3.3] — 2026-02-25

### Added

- **Visibilité du tarif par location (`isMemberRental`)** :
  - Le tarif d'une location est visible par un `sub_member` ou un `owner` non éditeur uniquement si la location le concerne directement (il est `ownerId` ou `subMemberId`, ou son propriétaire parent est `ownerId`).
  - Nouvelle fonction exportée `isMemberRental(member, rental)` dans `permissions.ts`.
  - Prop `canViewPrice` ajouté à `RentalDetail`, transmis depuis `RentalsPage`, `CalendarPage` et `DashboardPage`.

- **Validation des dates réelles à la clôture** :
  - Nouveaux champs `actualStartDate` et `actualEndDate` sur le type `Rental` (optionnels).
  - Visible et éditable dans `RentalForm` lorsque le statut est `"completed"`.
  - Valeurs par défaut : dates prévues (`startDate` / `endDate`).
  - Affichage de la durée réelle calculée dans le formulaire.
  - Avertissement ⚠️ si les dates réelles diffèrent des dates prévues.
  - `RentalDetail` : affiche "Début réel" et "Fin réelle" avec alerte si différentes.
  - `RentalCard` : dates prévues en barré + dates réelles en amber quand elles diffèrent.
  - Colonnes `actual_start_date`, `actual_end_date` ajoutées dans `supabase/schema.sql`.

- **Visuel calendrier — jours hors dates réelles** :
  - `RentalBadge` : nouveau prop `cellDate` pour comparer la date de la cellule aux dates réelles.
  - Pour les locations terminées, les cellules hors dates réelles affichent le badge en opacité 40 %, bordure pointillée et nom barré.
  - Raison calculée : `"arrived-late"` (cellule avant `actualStartDate`) ou `"left-early"` (cellule après `actualEndDate`).
  - `CalendarCell` et `CalendarView` (liste mobile) transmettent `cellDate` à `RentalBadge`.

- **Calcul dynamique du tarif** :
  - Constante `PRICE_PER_NIGHT_PER_PERSON = 5 €` dans `RentalForm`.
  - À la création : tarif auto-calculé `nuits × personnes × 5 €`.
  - Si les dates réelles diffèrent, le recalcul utilise `actualStartDate`/`actualEndDate`.
  - Bloc "💶 Recalcul sur dates réelles" avec bouton **"Appliquer ce tarif"** (masqué si tarif déjà à jour).
  - Hint sous le champ tarif : formule du calcul + bouton **"Réinitialiser"** pour déverrouiller l'auto-calcul.
  - État `isPriceLocked` : la saisie manuelle verrouille le recalcul automatique.

- **Champ `totalPrice` (total final)** :
  - Nouveau champ `totalPrice` sur le type `Rental` (optionnel) : total final = tarif + coût électrique.
  - Auto-calculé et modifiable dans le bloc "💰 Total final" en statut `"completed"`.
  - État `isTotalLocked` : saisie manuelle verrouille l'auto-calcul ; bouton **"Réinitialiser"** pour revenir au calcul auto.
  - `RentalDetail` : ligne "Total final" affichée dans le bloc post-location.
  - Colonne `total_price numeric(10,2)` ajoutée dans `supabase/schema.sql`.

### Changed

- `types.ts` : ajout de `actualStartDate?: string`, `actualEndDate?: string`, `totalPrice?: number` sur `Rental`.
- `dbTypes.ts` : ajout de `actual_start_date`, `actual_end_date`, `total_price` sur `DbRental`.
- `apiMappers.ts` : mapping complet des 3 nouveaux champs (`mapRentalFromDb` / `mapRentalToDb`).
- `supabase/schema.sql` : table `rentals` mise à jour avec les 3 nouvelles colonnes.

### Security

- Champ **tarif** (`price`) et **total** (`totalPrice`) : `disabled` pour les utilisateurs `isRestricted` (`sub_member` ou `owner` non éditeur).
- Boutons "Réinitialiser tarif", "Appliquer ce tarif" et "Réinitialiser total" masqués pour les utilisateurs restreints.

---

## [0.3.2] — 2026-02-25

### Added

- **Demandes de réservation pour propriétaires non éditeurs et sous-membres** :
  - Le bouton "Nouvelle location" et les clics sur les cellules du calendrier sont désormais disponibles pour ces rôles.
  - Lors de la création : les champs "Propriétaire" et "Sous-membre" sont préremplis et verrouillés selon le compte connecté.
  - Le statut est automatiquement défini à **"En attente"** et non modifiable — un message explicatif est affiché dans le formulaire.
- **Sécurisation Supabase (RLS)** : politiques fines sur la table `rentals` (intégrées dans `supabase/schema.sql`) :
  - `INSERT` : autorisé pour tous les rôles, avec forçage de `status='pending'`, `owner_id` et `sub_member_id` vérifié côté base de données pour les non-éditeurs.
  - `UPDATE` / `DELETE` : réservés aux admins et propriétaires éditeurs.
  - 4 fonctions `security definer` créées pour interroger le rôle du membre courant sans contourner le RLS.

### Changed

- `permissions.ts` :
  - `sub_member` : `createLocations`, `viewLocations`, `viewCalendarDetails` passent à `true`.
  - `owner` non éditeur : `createLocations` passe à `true`.
  - Nouveau champ `createWithAnyStatus: boolean` (true uniquement pour admin et owner éditeur).
- `RentalForm` : nouveau prop `currentMember` pour dériver le mode restreint.
- Label du bouton submit passe à **"Envoyer la demande"** lors d'une création depuis une page calendrier ou locations.
- `onCreateSubMember` désactivé pour les utilisateurs restreints.

---

## [0.3.1] — 2026-02-25

### Breaking Changes

- **Suppression complète du rôle `external`** : Le type de compte "Externe" n'existe plus dans l'application.
  - Migration automatique : tous les comptes `external` existants sont convertis en `sub_member`.
  - Fichier de migration : `supabase/migrations/20260225_remove_external_role.sql`

### Changed

- `MemberRole` ne contient plus que 3 valeurs : `"admin"`, `"owner"`, `"sub_member"`.
- Schema SQL : contrainte CHECK mise à jour pour retirer `external`.
- Tous les formulaires et composants mis à jour pour retirer les options "Externe".

### Removed

- Type de rôle `external` supprimé de tous les fichiers TypeScript et composants UI.

---

## [0.3.0] — 2026-02-25

### Added

- **Redirection conditionnelle vers site sécurisé** : Si l'application est hébergée sur un domaine gratuit (`.free.fr`), le bouton Google redirige vers le site Vercel sécurisé avec badge "Site securise →".

### Changed

- Correction de la dépendance ESLint dans `AppRoot` useEffect : ajout de `setError` dans le tableau de dépendances.

### Fixed

### Removed

---

## [0.2.9] — 2026-02-25

### Changed

- Affichage de la durée des séjours (`X jour(s)`) sur les vues locations : `RentalCard`, `RentalDetail` et `RentalForm`.
- Badge calendrier (`RentalBadge`) : durée visible directement sur le badge (en plus du tooltip détaillé au survol).

### Key files touched

- `src/components/rentals/RentalCard.tsx`
- `src/components/rentals/RentalDetail.tsx`
- `src/components/rentals/RentalForm.tsx`
- `src/components/calendar/RentalBadge.tsx`
- `CHANGELOG.md`

## [0.2.8] — 2026-02-25

### Added

- Colonne `members.last_login` (timestamptz) et migration associée (`supabase/migrations/20260225_add_last_login.sql`).
- Affichage de la "Dernière connexion" dans `MemberCard` et formatage local de la date.

### Changed

- Ajout de `Member.lastLogin`/`DbMember.last_login` dans les mappers (`mapMemberFromDb` / `mapMemberToDb`) pour propager la donnée.
- `AppRoot` écrit maintenant `members.last_login` après récupération de session et à chaque événement `SIGNED_IN`.
- Mise à jour `supabase/schema.sql` et `dbTypes.ts` pour exposer la colonne et documenter la migration.

### Key files touched

- `supabase/migrations/20260225_add_last_login.sql`
- `supabase/schema.sql`
- `src/types.ts`
- `src/services/dbTypes.ts`
- `src/services/apiMappers.ts`
- `src/components/members/MemberCard.tsx`
- `src/App.tsx`

## [0.2.7] — 2026-02-25

### Added

- **Numéro de version dynamique** affiché dans la Sidebar (bas de page), importé depuis `package.json` via `packageJson.version`.

### Changed

- **Layout Sidebar fixe** : le conteneur principal utilise `h-screen` avec `overflow-hidden`, la Sidebar utilise `overflow-y-auto` pour éviter qu'elle ne bouge lorsque le contenu principal (`main`) est long.
- Nettoyage JSX et formatage mineur dans `App.tsx` (rendu conditionnel compact, chaînes sur une seule ligne).

### Fixed

- Apostrophe échappée dans `MemberForm.tsx` pour respecter la règle ESLint `react/no-unescaped-entities` (`l'application` → `l&apos;application`).

### Key files touched

- `src/App.tsx`
- `package.json`
- `CHANGELOG.md`

## [0.2.6] — 2026-02-25

### Added

- **Gestion de l'autorisation des membres** : checkbox toggle pour activer/désactiver l'accès d'un membre à l'application directement depuis le formulaire d'édition.
- Visibilité conditionnelle du bouton "Créer et autoriser" (uniquement en mode création).

### Changed

- **UX autorisation** : transformation du bouton d'autorisation en checkbox toggle avec styling conditionnel (vert si autorisé, orange si non autorisé).
- Fonctionnalité d'autorisation déplacée de `MemberCard` vers `MemberForm` pour une meilleure cohérence UX.

### Key files touched

- `src/components/members/MemberForm.tsx`
- `src/components/members/MemberCard.tsx`
- `src/components/members/MemberList.tsx`
- `src/pages/MembersPage.tsx`

## [0.2.5] — 2026-02-25

### Added

- **Toggle de visibilité des mots de passe** : icônes œil (`Eye` / `EyeOff`) dans `LoginView` et `ResetPasswordView` pour afficher/masquer les mots de passe saisis.

### Changed

- Affichage du `Coût électrique` sur les cartes de location (`RentalCard`) et vue détail (`RentalDetail`) : **n'est affiché que si le statut est `Terminé` (`completed`)**.
- **Sécurité** : Les membres avec `role = "admin"` ne sont visibles que par d'autres administrateurs dans la liste des membres (`MembersPage`).

### Fixed

- **Lien de réinitialisation de mot de passe expiré** : `App.tsx` détecte maintenant les erreurs dans le hash URL (`#error=access_denied&error_code=otp_expired`) et affiche un message clair à l'utilisateur ("Le lien de réinitialisation a expiré. Demande un nouveau lien.").

### Key files touched

- `src/pages/MembersPage.tsx`
- `src/components/Auth/LoginView.tsx`
- `src/components/Auth/ResetPasswordView.tsx`
- `src/components/rentals/RentalCard.tsx`
- `src/components/rentals/RentalDetail.tsx`
- `src/App.tsx`

---

Notes:

- Toggle de visibilité des mots de passe améliore l'UX lors de la saisie.
- Les liens de réinitialisation Supabase expirent par défaut après 1h (configurable côté Dashboard Supabase).

## [0.2.4] — 2026-02-25

### Added

- Inline création de sous-membre depuis le formulaire de location (mini-form / Combobox).
- Nouveau composant UI: `src/components/ui/Combobox.tsx`.
- KPI tableau de bord: coût électrique et cartes par propriétaire triées.

### Changed

- `Prix (€)` renommé en **Tarif location (€)** dans le formulaire et affichages.
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
- `src/components/rentals/RentalDetail.tsx`
- `src/components/ui/Combobox.tsx`
- `src/components/members/MemberForm.tsx`
- `src/components/members/MemberCard.tsx`
- `src/components/members/MemberList.tsx`
- `src/services/apiMappers.ts`
- `src/services/apiCrud.ts`
- `src/services/dbTypes.ts`
- `src/types.ts`
- `src/components/dashboard/DashboardStats.tsx`
- `supabase/schema.sql`

---

Notes:

- Les mappers garantissent désormais l'envoi explicite de `null` pour les champs vidés afin d'éviter les erreurs PostgREST.

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
