# Audit — La Petite Maison

Application de gestion des locations d'une maison de vacances familiale.
Stack : React 18 + TypeScript strict + Tailwind CSS + Supabase + Vercel.

---

## Résumé exécutif

L'application est bien structurée, fonctionnelle et déployée en production. Le code est globalement propre avec des conventions cohérentes. Les principaux axes d'amélioration concernent un bug de notifications en doublon, quelques incohérences dans les permissions, et des optimisations mineures de performance et de maintenabilité.

---

## 1. Architecture & conventions

### Points positifs

- Séparation claire `api.ts` (READ) / `apiCrud.ts` (CREATE/UPDATE/DELETE)
- Mappers centralisés dans `apiMappers.ts` — la convention snake_case ↔ camelCase est respectée
- Atomic Design globalement respecté (pas de sous-composants dans les corps de composants)
- `types.ts` comme source de vérité unique
- `messageCatalog.ts` pour centraliser les textes — bonne pratique
- Hook `useRentalModals` bien pensé pour partager la logique entre pages

### Points à améliorer

**`isLocalEnv()` dupliquée** : la fonction est définie dans `apiCrud.ts` mais probablement aussi dans d'autres fichiers. À extraire dans `utils/env.ts` pour éviter la duplication.

**`getDaysForRental` dupliquée** : présente à la fois dans `DashboardStats.tsx` (comme `getRentalDays`) et dans `rentalUtils.ts` (comme `getDaysForRental`). Une seule version dans `rentalUtils.ts` suffit.

**`computeRentalStats` recalcule `now` et `currentYear`** à chaque appel depuis le composant — le composant et la fonction calculent `now` indépendamment, ce qui pourrait créer une légère incohérence à minuit. Passer `now` en paramètre depuis le composant.

---

## 2. Bug confirmé — Notifications en doublon

### Symptôme

3 notifications push et 3 emails reçus pour un même passage en statut `completed`.

### Cause probable

Le bouton "Enregistrer" du `RentalForm` n'est pas désactivé de façon fiable pendant le `await onSubmit(...)`. Si le réseau est lent (cold start d'une Edge Function Supabase), l'utilisateur peut cliquer 2 à 3 fois, déclenchant autant d'appels à `updateRental` et donc autant de `notifyCompleted`.

### Correction recommandée

Dans `useRentalModals.ts`, `handleSubmit` doit gérer un état `isSubmitting` qui empêche les appels concurrents :

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = useCallback(async (values) => {
  if (isSubmitting) return; // guard
  setIsSubmitting(true);
  try {
    // ... logique existante
  } finally {
    setIsSubmitting(false);
  }
}, [isSubmitting, ...]);
```

Et s'assurer que le bouton submit du `RentalForm` reçoit bien `disabled={isSubmitting}`.

### Cause secondaire possible

`notifyCompleted` et `notifyEmailCompleted` envoient chacun des notifications à plusieurs destinataires (owner + subMember + observers + validators). Si un utilisateur est à la fois owner et validator, il peut recevoir plusieurs messages distincts pour le même événement. À vérifier avec un filtre de déduplication sur les emails en aval.

---

## 3. Permissions & sécurité

### Points positifs

- RLS activé sur toutes les tables Supabase
- `getPermissions` et `getRentalActionPermissions` bien séparés
- La clé VAPID privée n'est jamais exposée côté frontend

### Points à améliorer

**`handleStatusChange` dans `useRentalModals`** ne passe pas `previousStatus` à `updateRental` :

```typescript
// Actuel — notifie même si le statut n'a pas changé
await updateRental(rentalId, { status: newStatus });

// Recommandé
await updateRental(rentalId, { status: newStatus }, targetRental.status);
```

**`notify-deploy` n'authentifie pas l'appelant GitHub Actions** — n'importe qui connaissant l'URL de la fonction peut déclencher une notification à tous les utilisateurs. Ajouter une vérification du secret dans le header :

```typescript
const secret = req.headers.get("x-deploy-secret");
if (secret !== Deno.env.get("DEPLOY_SECRET")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

Et dans `ci.yml` :

```yaml
-H "x-deploy-secret: ${{ secrets.DEPLOY_SECRET }}"
```

**`topic: "all"` dans `send-push`** récupère tous les `user_id` de `push_subscriptions` sans vérifier `is_allowed`. Un utilisateur dont l'accès a été révoqué mais dont la souscription push n'a pas été supprimée recevra quand même les notifications.

---

## 4. Notifications — Architecture

### Points positifs

- Pattern fire-and-forget (`void notifyX(...)`) qui ne bloque jamais le flux CRUD
- `pushService.ts` et `emailService.ts` bien séparés
- Logs structurés dans `send-push`
- Purge automatique des souscriptions expirées (404/410)

### Points à améliorer

**Double système push + email** : chaque événement déclenche à la fois une notification push ET un email. C'est intentionnel mais peut être perçu comme du spam. Envisager une préférence utilisateur (`email_notifications_enabled` existe déjà — vérifier si un équivalent existe pour les push).

**`notifyEmailCompleted` envoie aux observers et validators** en plus du owner et subMember pour la clôture. Pour une maison familiale, c'est probablement trop — les autres propriétaires n'ont pas forcément besoin du récapitulatif financier d'un séjour qui ne les concerne pas.

**Cold start des Edge Functions** : les Edge Functions Supabase peuvent avoir un cold start de 1-3 secondes. Avec des notifications fire-and-forget côté client, ce délai est invisible pour l'utilisateur — c'est un bon choix.

---

## 5. Performance

### Points positifs

- `computeRentalStats` calcule tout en une passe, sans appels DB supplémentaires
- `createAuthUsersByEmailResolver` avec cache par requête dans `send-push` — évite les scans répétés

### Points à améliorer

**`ownerStats` recalcule `now` depuis le composant ET depuis `computeOwnerStats`** — `now` est passé en paramètre, c'est bien, mais le composant appelle `new Date()` deux fois (une pour `stats`, une pour `ownerStats`). Utiliser une seule instance :

```typescript
const now = useMemo(() => new Date(), []);
```

**`getRentalActors` fait une requête DB par notification** — pour `notifyEmailCompleted`, qui récupère déjà les actors, puis `notifyCompleted` (push) fait une autre requête pour les mêmes acteurs. Si les deux sont appelés sur le même `rental`, c'est 2 requêtes identiques. Envisager de passer les acteurs en paramètre ou de les mettre en cache.

**`getNotificationAudiences` est appelée séparément** dans chaque fonction de notification email. Pour un seul événement (ex: `createRental`), elle est appelée 2 fois (once dans `notifyEmailNewRental`, une fois dans `notifyNewRental` via push). À mutualiser si les deux notifications sont toujours déclenchées ensemble.

---

## 6. UX & interface

### Points positifs

- Design cohérent avec Tailwind, palette primary blue bien appliquée
- Responsive desktop/mobile bien géré
- PWA installable, notifications push sur Android
- Modal "Nouveautés" au lancement — bonne pratique d'onboarding
- Calendrier avec mise en évidence du jour courant

### Points à améliorer

**Bouton "Nouvelle location" masqué sur mobile** — les sous-membres ne peuvent créer que des demandes depuis le calendrier. Sur mobile, sans bouton visible, le seul moyen est de cliquer sur une cellule de calendrier. Ce chemin n'est pas évident. Envisager un FAB (floating action button) sur mobile.

**Les statuts dans `RentalDetail`** ne permettent pas de passer en `completed` depuis le select — c'est volontaire (avec un message explicatif), mais le lien "Modifier la location" dans ce message est un `<button type="button">` stylisé comme un lien. Vérifier que c'est accessible (role, aria-label).

**`WhatsNewModal`** — si un utilisateur se connecte sur un appareil sans avoir vu la modal sur un autre, il la verra à nouveau (localStorage par appareil). C'est acceptable pour une petite app familiale.

**Libellés des filtres** : "Tous profils", "Tous rôles", "Toutes connexions" sont cohérents mais légèrement verbeux pour des selects compacts. Sur mobile les options peuvent être tronquées.

---

## 7. TypeScript & qualité du code

### Points positifs

- TypeScript strict activé (`noImplicitAny`, `strictNullChecks`, `noUnusedLocals`)
- Zéro `any` dans les fichiers audités
- `toErrorMessage` dans `send-push` pour typer les erreurs — bonne pratique

### Points à améliorer

**`buildPayload` dans `send-push`** ne gère pas `app_updated` dans le switch — il tombe sur le `default` qui lève une erreur. Ajouter le case :

```typescript
case "app_updated":
  return {
    type,
    title: "Mise à jour disponible",
    body: "Une nouvelle version est disponible. Rechargez l'application.",
    url: request.url,
  };
```

**`NotificationType` dans `send-push`** ne contient pas `app_updated` — à ajouter dans le type pour cohérence avec la contrainte CHECK de la DB.

**`RentalActors` dans `rentalActorsService.ts`** retourne `ownerName: "membre"` par défaut en cas d'erreur — ce texte générique apparaîtra dans les notifications. Retourner `null` plutôt et gérer l'absence côté appelant.

---

## 8. Métier & règles de gestion

### Cohérence des rôles

Le modèle est clair et bien implémenté :

- Admin : tous droits
- Owner + isEditor : valide/refuse les demandes, gère les membres
- Owner sans isEditor : crée des demandes, voit ses locations
- Sub_member : crée des demandes associées à son owner

### Points de friction

**Un sub_member sans `ownerId`** peut exister techniquement (la contrainte n'est pas vérifiée en DB). `isMemberRental` retourne `false` pour ce cas, ce qui bloque toutes ses actions. À documenter ou contraindre en DB.

**Le taux d'occupation** inclut les locations `confirmed` + `completed` — c'est correct. Mais si une location confirmée est annulée après sa date de début, elle restera dans le calcul tant qu'elle n'est pas passée en `rejected`. À documenter comme comportement voulu.

**`electricityCost`** est un champ stocké calculé hors app (par l'admin). Si la formule change, les données historiques ne sont pas recalculables. Envisager de stocker aussi `electricityStart` et `electricityEnd` (kWh) en plus du coût calculé.

---

## 9. Infrastructure & déploiement

### Points positifs

- CI avec format, TypeScript build, lint avant déploiement
- Hook pre-commit qui synchronise la version `package.json` ↔ `CHANGELOG.md`
- Notification push au déploiement via GitHub Actions + Edge Function
- Secrets Supabase bien séparés du code frontend

### Points à améliorer

**`notify-deploy` n'est pas sécurisé** (voir section Permissions).

**Le `ci.yml` n'a plus de step `Run tests`** — aucun test unitaire ou d'intégration n'est présent. Pour une app familiale c'est acceptable, mais les fonctions utilitaires (`getDaysForRental`, `computeRentalStats`, `buildCompletedBody`) sont de bons candidats à des tests unitaires simples avec Vitest.

**Vercel déploie sur chaque push `main`** — sans environnement de staging, un bug en production est immédiat. Envisager une branche `develop` pour les tests avant merge sur `main`.

---

## 10. Priorités recommandées

| Priorité     | Sujet                                                                   | Impact                                             |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------- |
| 🔴 Critique  | Bug notifications en doublon — guard `isSubmitting` dans `handleSubmit` | Notifications parasites pour tous les utilisateurs |
| 🔴 Critique  | Sécuriser `notify-deploy` avec `x-deploy-secret`                        | N'importe qui peut spammer les utilisateurs        |
| 🟠 Important | Ajouter `app_updated` dans `buildPayload` de `send-push`                | Erreur silencieuse sur le case non géré            |
| 🟠 Important | Passer `previousStatus` dans `handleStatusChange`                       | Fausses notifications si statut inchangé           |
| 🟡 Mineur    | Extraire `isLocalEnv()` dans `utils/env.ts`                             | Maintenabilité                                     |
| 🟡 Mineur    | Supprimer `getRentalDays` dupliquée dans `DashboardStats`               | Maintenabilité                                     |
| 🟡 Mineur    | Vérifier `is_allowed` dans `topic: "all"` de `send-push`                | Utilisateurs révoqués toujours notifiés            |
| 🟢 Optionnel | Ajouter tests unitaires Vitest sur les utils                            | Qualité long terme                                 |
| 🟢 Optionnel | FAB mobile pour créer une demande                                       | UX sub_member mobile                               |
