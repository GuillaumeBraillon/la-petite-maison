# Journal des modifications (Changelog)

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
et ce projet respecte le [Versionnage Sémantique](https://semver.org/spec/v2.0.0.html).

---

## [0.3.17] - 2026-02-27

### Améliorations

- **Calendrier** : refonte de la navigation (disposition des boutons précédent/suivant/aujourd'hui),
  mise en évidence du jour courant, masquage du bouton "Nouvelle location" sur mobile
- **Dashboard** : resserrement des tuiles de statut avec affichage du nombre et des jours,
  compactage des cartes propriétaire et KPI
- **MemberCard** : refonte complète de la mise en page (en-tête, badges, email, adresse,
  propriétaire, dernière connexion), actions déplacées en pied de carte,
  ajout du bouton de réinitialisation de mot de passe
- **RentalCard** : refactorisation de la mise en page (avatars, badge de statut, lignes
  date/durée/infos), réorganisation de l'affichage tarif/électricité/total
- **Pages** : réduction des espacements verticaux sur Dashboard, Calendar, Members et Rentals

### Technique

- `App.tsx` : ajustement du padding du conteneur principal
- Améliorations purement présentationnelles — aucun changement de comportement

## [0.3.16] - 2026-02-27

### Améliorations

- **Terminologie** : renommage de "Éditeur" en "Validateur" dans toute l'interface
  (MemberCard, MemberForm, UserInfoCard, MembersPage, README, CHANGELOG et instructions Copilot)
- **Membres** : mise à jour des labels du filtre (Tous / Validateur / Demandeur)
- **Calendrier** : ajout d'une boîte de confirmation à la suppression d'une location
  avec aperçu des dates formatées et gestion de l'état de chargement

## [0.3.15] - 2026-02-27

### Améliorations

- **RentalBadge** : calcul de la durée du séjour et amélioration du tooltip
  (suppression des labels redondants, ajout d'un indicateur hors période)

### Technique

- Ajout d'un fichier `.prettierrc` et application d'un formatage cohérent
  sur l'ensemble du code (expressions et JSX condensés, imports nettoyés)
- Nettoyage de `eslint.config.js` et des chaînes de promesses du service worker
- Simplifications mineures de l'interface dans Calendar, Auth, Dashboard,
  ErrorBoundary et App

## [0.3.14] - 2026-02-27

### Améliorations

- **Dashboard** : refactorisation majeure des statistiques — séparation en trois fonctions
  (`computeRentalStats`, `computeStats`, `computeOwnerStats`) pour éviter la duplication
  de code entre les stats globales et par propriétaire
- **Dashboard** : amélioration des calculs (revenus, électricité, taux d'occupation, prochain séjour)
- **Dashboard** : simplification de l'affichage des KPI cards et des styles de statut

### Technique

- **Notifications** : ajout de `VITE_DISABLE_PUSH_IN_DEV` pour désactiver les notifications
  push en développement local et éviter les envois intempestifs
- **Statuts** : ajout de `RENTAL_STATUS_BG_COLOR_MAP` et normalisation des couleurs,
  labels et ordre d'affichage des statuts
- Suppression des imports inutilisés et petits ajustements d'interface

## [0.3.13] — 2026-02-26

### Changed

- **PWA / Installation** : affichage du bouton d'installation plus permissif — le bouton est désormais visible tant que l'application n'est pas déjà installée (mode standalone). Amélioration de la détection iOS et gestion d'un guide d'installation pour iPhone/iPad.

### Key files touched

- `src/hooks/usePWAInstall.ts` — meilleure détection iOS / standalone et exposition de `canInstall` / `isIOS` / `hasNativePrompt`
- `src/App.tsx` — le bouton d'installation est affiché de manière plus fiable et affiche un guide iOS si nécessaire

## [0.3.12] — 2026-02-26

### Added

- **Filtres réutilisables** : nouveau composant `FilterBar` permettant de composer des filtres `select` et un bouton de réinitialisation.
- **Intégration** : filtres ajoutés sur la liste des membres (`MembersPage`) et la liste des locations (`RentalsPage`) (statut + propriétaire).

### Changed

- **Locations** : utilisation centralisée de `RENTAL_STATUS_LIST` pour générer les options de filtre et garantir l'unicité des libellés.

### Key files touched

- `src/components/ui/FilterBar.tsx`
- `src/pages/MembersPage.tsx`
- `src/pages/RentalsPage.tsx`

## [0.3.11] — 2026-02-26

### Fixed

- **Membres — autorisation utilisateur (toggle)** :
  - Correction d'une erreur HTTP `400` lors de l'activation de `Accès autorisé à l'application`.
  - Cause : la contrainte SQL `members_allow_requires_profile_chk` rejetait certains updates qui n'envoyaient que `is_allowed`.
  - Correctif : le flux d'autorisation envoie désormais aussi `label`, `first_name` et `last_name` (trimés) quand l'accès est accordé.
  - Renforcement des garde-fous côté formulaire/page pour bloquer l'autorisation si le profil requis est incomplet.

### Key files touched

- `src/pages/MembersPage.tsx`
- `src/components/members/MemberForm.tsx`

## [0.3.10] — 2026-02-26

### Changed

- **Synchronisation email Auth ↔ membres** :
  - Renforcement de `useAuthorization` pour lier un membre à `auth.users.id` via `auth_user_id`.
  - Recherche prioritaire par `auth_user_id`, fallback par email, puis synchronisation de l'email/avatar.
  - Objectif : éviter la création de doublons `members` lors d'un changement d'email Supabase Auth.

- **Schéma SQL consolidé** :
  - Le schéma `from scratch` intègre explicitement `members.auth_user_id` + index unique partiel.
  - Documentation SQL "base existante" mise à jour en bas de `schema.sql`.

### Removed

- Suppression du fichier de migration dédié à `auth_user_id` pour conserver une source unique de vérité dans `supabase/schema.sql`.

### Key files touched

- `src/hooks/useAuthorization.ts`
- `supabase/schema.sql`
- `CHANGELOG.md`

## [0.3.9] — 2026-02-26

### Added

- **User Card — gestion du compte** :
  - Affichage du rôle du membre dans `UserInfoCard` (`Admin`, `Propriétaire`, `Membre`) avec indicateur `Validateur` pour les owners éditeurs.
  - Actions compte pour les comptes email/password : changement d’email (modale) + envoi de lien de réinitialisation mot de passe.
  - Suppression d’une notification depuis la modale de détail (`Supprimer`) avec état `loading`.

- **Dashboard — KPIs propriétaires enrichies** :
  - Nouvelle KPI `Sous location` par propriétaire (nombre de locations avec `subMemberId`).
  - Nouveau mode `compact` dans `KpiCard`, appliqué aux cartes KPI propriétaires.

### Changed

- **User Card / Notifications** :
  - Pour les comptes Google OAuth, les liens de changement d’email/mot de passe sont masqués.
  - Ajout de toasts succès/erreur lors de la suppression d’une notification.
  - La suppression ne ferme plus la modale en faux-positif : fermeture uniquement si suppression DB réussie.

- **Demandes de location — création de membre** :
  - Les owners (y compris non éditeurs) peuvent créer un membre inline depuis `RentalForm` lors d’une demande de location.
  - Les `sub_member` conservent la restriction (pas de création inline).
  - Simplification du mini-formulaire : suppression du `Select` de rôle (rôle forcé à `sub_member`).
  - Ajout de toasts succès/erreur lors de la création inline de membre (pages location et calendrier).

- **Calendrier mobile** :
  - Le badge affiche désormais `Membre (Owner)` quand un membre est renseigné, au lieu d’afficher uniquement l’owner.

- **Dashboard — lisibilité et densité** :
  - Le bloc global des statuts est passé en mini-cartes compactes sur une ligne, alignées visuellement avec le détail par propriétaire.
  - Ajout d’un fond contrasté sur le bloc “Par statut”.

### Security

- **RLS notifications utilisateur** :
  - Ajout de la policy `Users delete own notifications` sur `public.user_notifications`.

### Key files touched

- `src/components/ui/UserInfoCard.tsx`
- `src/hooks/useUserNotifications.ts`
- `src/services/messageCatalog.ts`
- `src/components/rentals/RentalForm.tsx`
- `src/pages/RentalsPage.tsx`
- `src/pages/CalendarPage.tsx`
- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/RentalBadge.tsx`
- `src/components/dashboard/DashboardStats.tsx`
- `src/components/dashboard/KpiCard.tsx`
- `supabase/schema.sql`

## [0.3.8] — 2026-02-26

### Added

- **Catalogue central des messages** :
  - Nouveau fichier `src/services/messageCatalog.ts` pour centraliser les textes **toasts** et **notifications push**.
  - Réutilisation dans les hooks/pages/services pour éviter les divergences de wording.

- **Confirmation destructive réutilisable** :
  - Nouveau composant `ConfirmDialog` basé sur `Modal` + `Button`.
  - Utilisé pour la suppression de membres et de locations.

### Changed

- **Suppression sans `window.confirm`** :
  - `window.confirm` retiré des flux membres/locations.
  - Confirmation via modale dédiée + état `loading` pour bloquer les doubles clics.

- **Toasts harmonisés** :
  - Textes homogénéisés (style, ton, ponctuation).
  - Alignement avec les messages push.

- **Statuts centralisés** :
  - Labels/listes/couleurs/variants centralisés dans `services/rentalStatus.ts`.
  - Réutilisation dans dashboard, cards et toasts de statut.

- **Notifications push métier enrichies** :
  - `notifyNewRental` cible explicitement : membres `is_editor = true` + owner de la demande + membre (si applicable).
  - Messages personnalisés selon destinataire (owner vs membre), avec nom du membre pour l’owner.
  - Personnalisation étendue à `rental_created`, changements de statut, `rental_completed`, `rental_deleted`.
  - Récapitulatif de fin de séjour enrichi : durée, nombre de personnes, coût élec par jour (`X €/j`), total.

- **Synchronisation temps réel de l'app** :
  - À la réception d’un push, le Service Worker émet `user-notifications-updated` vers les onglets.
  - `useUserNotifications` rafraîchit le centre de notifications.
  - `App.tsx` rafraîchit aussi les données métiers (`members` / `rentals`) sans rechargement manuel.

- **Logs et bootstrap frontend** :
  - Nettoyage des logs console bruyants.
  - Enregistrement du Service Worker déplacé de `index.html` vers `main.tsx`.
  - `ErrorBoundary` passe par le logger central.

### Security

- **Edge Function `send-push` durcie** :
  - Vérification explicite du caller (Bearer token + membre `is_allowed = true`).
  - Méthodes HTTP strictes (`POST`/`OPTIONS`) avec codes d’erreur cohérents.
  - Logs structurés (`received`, `completed`, `delivery_failed`, `unhandled`).
  - Cache par requête de `auth.admin.listUsers()` pour réduire les scans répétés.
  - Diagnostic `unresolvedMemberEmails` renvoyé en réponse pour tracer les emails membres non mappés à `auth.users`.

### Key files touched

- `src/services/messageCatalog.ts`
- `src/services/rentalStatus.ts`
- `src/services/rentalNotifications.ts`
- `src/hooks/useRentalModals.ts`
- `src/hooks/useUserNotifications.ts`
- `src/pages/MembersPage.tsx`
- `src/pages/RentalsPage.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/UserMenu.tsx`
- `src/components/ui/UserInfoCard.tsx`
- `src/App.tsx`
- `src/main.tsx`
- `index.html`
- `src/components/ErrorBoundary.tsx`
- `supabase/functions/send-push/index.ts`
- `.github/copilot-instructions.md`

## [0.3.7] — 2026-02-26

### Changed

- **User Card / User Menu — ajustements UX** :
  - La version de l'application est déplacée depuis la sidebar vers la `UserInfoCard`, sur la ligne d'actions (toggle notifications + déconnexion).
  - Le texte de version est centré horizontalement dans la ligne du haut de la carte.
  - Le nom secondaire (nom/prénom) dans l'identité utilisateur n'est plus affiché en gras.

- **Détail de location — statut `Terminé`** :
  - Le statut `Terminé` n'est plus sélectionnable dans `RentalDetail`.
  - Si la location est déjà terminée, le statut reste affiché en badge non éditable.
  - Ajout d'un message d'aide sous le statut avec lien vers **"Modifier la location"** pour indiquer où effectuer le passage en `Terminé`.

- **Notifications — comportement des URLs** :
  - Suppression des `url` dans les notifications métier de location pour éviter les redirections non pertinentes vers la home.
  - Conséquence UI : le bouton **"Ouvrir"** n'apparaît plus pour ces notifications dans la modal de lecture.

### Key files touched

- `src/App.tsx`
- `src/components/ui/UserMenu.tsx`
- `src/components/ui/UserInfoCard.tsx`
- `src/components/rentals/RentalDetail.tsx`
- `src/services/rentalNotifications.ts`

## [0.3.6] — 2026-02-26

### Added

- **Notification Center dans la User Card** :
  - Affichage des dernières notifications reçues (liste récente), état lu/non lu, compteur de non lues.
  - Action **"Tout marquer lu"**.
  - Ouverture d'une notification en **modal de lecture détaillée** (titre, date, message complet).
  - Bouton **"Ouvrir"** dans la modal quand une URL cible est disponible.
- **Badge non lues sur le User Menu** :
  - Indicateur du nombre de notifications non lues sur l'avatar (desktop + mobile compact).
  - Limite d'affichage `99+`.
- **Nouveau hook `useUserNotifications`** :
  - Chargement des notifications utilisateur depuis Supabase.
  - Marquage unitaire en lu.
  - Marquage global en lu.

### Changed

- **`UserInfoCard` refondue en mode compact + notification center** :
  - Actions notifications/déconnexion compactes en haut à droite.
  - Affichage identité optimisé (libellé prioritaire, nom/prénom en secondaire).
  - Simplification de la carte : suppression des informations de compte non essentielles.
- **`UserMenu` amélioré** :
  - Affichage du nom basé sur le membre lié à l'email (libellé prioritaire, nom secondaire).
  - Intégration du badge de notifications non lues.
- **Edge Function `send-push`** :
  - Persistance de chaque notification envoyée par destinataire dans une table dédiée (`user_notifications`) avant envoi Web Push.

### Database / Schema

- **Nouvelle table `user_notifications`** dans `supabase/schema.sql` :
  - Colonnes : `user_id`, `type`, `title`, `body`, `url`, `is_read`, `created_at`.
  - Index : `user_id`, `(user_id, created_at desc)`, `(user_id, is_read)`.
  - RLS activée + policies :
    - `Users read own notifications`
    - `Users update own notifications`
- Conservation de la table `push_subscriptions` pour la gestion technique des endpoints push.

### Security

- Séparation claire des responsabilités de données :
  - `push_subscriptions` = abonnements techniques navigateur.
  - `user_notifications` = historique métier des notifications utilisateur.
- RLS sur `user_notifications` restreint la lecture et la mise à jour au propriétaire (`auth.uid() = user_id`).

### Key files touched

- `src/components/ui/UserInfoCard.tsx`
- `src/components/ui/UserMenu.tsx`
- `src/hooks/useUserNotifications.ts`
- `src/types.ts`
- `src/services/dbTypes.ts`
- `src/services/apiMappers.ts`
- `supabase/functions/send-push/index.ts`
- `supabase/schema.sql`

## [0.3.5] — 2026-02-26

### Added

- **Notifications Push PWA (Web Push + VAPID)** :
  - Ajout des types `NotificationType`, `NotificationPayload` et `PushSubscriptionRecord` dans `types.ts`.
  - Nouveau service `pushNotifications.ts` : demande de permission, souscription/désouscription navigateur, persistance Supabase, vérification d'abonnement.
  - Nouveau hook `usePushNotifications` pour exposer l'état (support, permission, loading, erreurs) et les actions `subscribe` / `unsubscribe`.
  - Nouveau composant UI `NotificationToggle` (Bell / BellOff) intégré à l'interface utilisateur.
- **Edge Function Supabase `send-push`** :
  - Réception d'un payload de notification + ciblage par `userId` / `userIds` / `topic`.
  - Envoi via Web Push API avec clés VAPID stockées en secrets Supabase.
  - Purge automatique des subscriptions expirées (erreurs HTTP `404` / `410`).
- **Service Worker enrichi** :
  - Gestion des événements `push` avec affichage natif (`showNotification`) et fallback de payload.
  - Gestion `notificationclick` pour focus/ouverture de l'application et navigation vers l'URL cible.

### Changed

- `App.tsx` : intégration du contrôle d'activation/désactivation des notifications dans les zones utilisateur (desktop + mobile).
- `.env.example` : ajout de `VITE_VAPID_PUBLIC_KEY`.
- `apiMappers.ts` et `dbTypes.ts` : ajout des mappings/types DB pour `push_subscriptions`.

### Database / Schema

- `supabase/schema.sql` mis à jour avec la table `push_subscriptions` :
  - colonnes `user_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at`
  - activation RLS
  - policy `Users manage own subscriptions` (gestion limitée à ses propres subscriptions)

### Security

- Clé VAPID privée **non exposée au frontend** ; usage uniquement côté Supabase Edge Function via secrets.
- Vérifications de support navigateur avant toute action push (`Notification`, `serviceWorker`, `PushManager`).
- Gestion explicite du cas iOS Safari hors PWA installée (message de fallback utilisateur).

### Key files touched

- `src/types.ts`
- `src/services/dbTypes.ts`
- `src/services/apiMappers.ts`
- `src/services/pushNotifications.ts`
- `src/hooks/usePushNotifications.ts`
- `src/components/ui/NotificationToggle.tsx`
- `public/sw.js`
- `supabase/functions/send-push/index.ts`
- `supabase/schema.sql`
- `.env.example`

## [0.3.4] — 2026-02-25

### Added

- **Métriques de locations enrichies et agrégations par statut** :
  - Nouveau helper `getDaysForRental(rental)` pour calculer le nombre de jours réels en utilisant `actualStartDate`/`actualEndDate` si présents, sinon les dates prévues.
  - Calcul des statistiques **par statut de location** : nombre de locations, jours totaux, coût électrique total, moyennes par nuit et par location.
  - Dashboard affiche maintenant **cartes détaillées par statut** avec labels clairs et chiffres comparables.

- **Statistiques propriétaires enrichies** :
  - Chaque propriétaire affiche : nom, nombre de jours accumulés, coût électrique total.
  - **Sous-cartes par statut** pour chaque propriétaire : répartition des locations par statut (`pending`, `confirmed`, `rejected`, `completed`).
  - Statistiques d'électricité **par nuit** et **par location** pour chaque propriétaire.
  - Moyenne électrique précise basée sur les jours réels.

- **KPI Cards — refonte visuelle** :
  - Helper/hook pour ajuster le padding, les gaps et les tailles d'icônes pour une meilleure densité.
  - Typographie affinée : labels `text-[10px] uppercase`, valeurs `text-xl font-semibold`, trends `text-[10px]`.
  - Icône KPI agrandie légèrement (`w-8 h-8`) avec meilleur contraste.

### Changed

- `DashboardStats.tsx` : restructuration complète pour exposer les agrégations par statut et par propriétaire via des réductions/calculs sophistiqués.
- `KpiCard.tsx` : padding restauré à `sm`, gap vertical à `2`, typographie et icône ajustées pour clarité et hiérarchie.
- `services/` : ajout du helper `getDaysForRental` pour une source unique de vérité sur le calcul des jours réels.

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

- **Demandes de réservation pour propriétaires non éditeurs et membres** :
  - Le bouton "Nouvelle location" et les clics sur les cellules du calendrier sont désormais disponibles pour ces rôles.
  - Lors de la création : les champs "Propriétaire" et "Membre" sont préremplis et verrouillés selon le compte connecté.
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

- Inline création de membre depuis le formulaire de location (mini-form / Combobox).
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
  - Badge "Validateur" dans `MemberCard` si `isEditor = true`
  - Case à cocher "Validateur" dans `MemberForm`, visible uniquement pour `role = owner`
  - Reset automatique de `isEditor` à `false` si le rôle passe de `owner` à autre chose (formulaire + mapper)

- **Création inline de membre depuis `RentalForm`**
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
  - Préférence du membre pour l'affichage de l'avatar dans les cartes de location

- **Locations**
  - Section post-location (notes + coût électrique) conditionnelle : visible uniquement si `statut = Terminé`
  - Option "— Aucun —" dans le select membre pour permettre la désélection
  - Handlers de clic optionnels dans les composants calendrier et location

- **DB / Services**
  - Colonne `electricity_start` / `electricity_end` remplacée par `electricity_cost numeric` dans `rentals`
  - Colonne `status` supprimée de `members`
  - Colonne `is_editor boolean not null default false` ajoutée à `members`
  - Email nullable avec index unique partiel (`WHERE email IS NOT NULL`)
  - `mapMemberToDb` : utilise `'email' in member` pour envoyer `null` explicitement vs omettre le champ
  - `schema.sql` mis à jour pour refléter l'état courant ; fichiers de migration ad hoc supprimés

### Corrigé

- Erreur 409 lors de la création inline d'un membre : `email: ""` provoquait un conflit sur la contrainte `UNIQUE(email)` → remplacé par `email: undefined` → `NULL` en DB
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
  - Avatars dans la vue détail des locations (propriétaire et membre)
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
