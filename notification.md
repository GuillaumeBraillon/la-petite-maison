# Prompt GitHub Copilot — Notifications PWA

# La Petite Maison

En te basant sur le fichier `.github/copilot-instructions.md` du projet,
implémente le système de **Push Notifications PWA** complet.

---

## Contexte

- PWA React 18 + TypeScript strict + Tailwind CSS + Supabase
- URL de production : https://lapetitemaison.guillaumebraillon.fr
- Respecte toutes les conventions du projet (Atomic Design, mappers, snake_case ↔ camelCase, zéro `any`)

---

## Stack notifications

- **Web Push API** — standard navigateur, pas de Firebase
- **VAPID** — authentification des push (génère une paire de clés)
- **Supabase Edge Functions** — déclenchement serveur
- **Service Worker** — réception des notifications (déjà présent dans la PWA)

---

## Fichiers à créer dans l'ordre

### 1. Types (`src/types.ts` — ajouter)

```typescript
export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_rejected"
  | "rental_reminder"
  | "request_pending";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}
```

### 2. Table Supabase (`push_subscriptions`)

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Chaque utilisateur ne voit que ses propres subscriptions
create policy "Users manage own subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id);
```

### 3. Variables d'environnement (`.env`)

```env
VITE_VAPID_PUBLIC_KEY=<ta_cle_publique_VAPID>
```

Pour générer les clés VAPID :

```bash
npx web-push generate-vapid-keys
```

La clé privée va dans les secrets Supabase Edge Functions uniquement,
jamais dans le frontend.

### 4. `src/services/dbTypes.ts` — ajouter

```typescript
export interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
```

### 5. `src/services/apiMappers.ts` — ajouter

```typescript
export const mapPushSubscriptionFromDb = (
  db: DbPushSubscription,
): PushSubscriptionRecord => ({
  id: db.id,
  userId: db.user_id,
  endpoint: db.endpoint,
  p256dh: db.p256dh,
  auth: db.auth,
  createdAt: db.created_at,
});
```

### 6. `src/services/pushNotifications.ts`

Service complet gérant :

- `requestPermission()` — demande la permission à l'utilisateur
- `subscribeToPush()` — crée la subscription Web Push et la sauvegarde en DB
- `unsubscribeFromPush()` — supprime la subscription
- `isSubscribed()` — vérifie si l'utilisateur est déjà abonné

```typescript
// Pattern attendu
import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

export const requestPermission = async (): Promise<NotificationPermission> => {
  return await Notification.requestPermission();
};

export const subscribeToPush = async (userId: string): Promise<void> => {
  // 1. Récupérer le service worker
  // 2. S'abonner avec la clé VAPID publique
  // 3. Sauvegarder endpoint + p256dh + auth dans Supabase
};

export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  // 1. Récupérer la subscription existante
  // 2. Désabonner côté navigateur
  // 3. Supprimer de Supabase
};
```

### 7. `src/hooks/usePushNotifications.ts`

Hook custom exposant :

```typescript
interface UsePushNotificationsReturn {
  isSupported: boolean; // navigateur supporte les push ?
  isSubscribed: boolean; // utilisateur abonné ?
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
```

### 8. `src/components/ui/NotificationToggle.tsx`

Composant atomique — bouton on/off pour activer/désactiver les notifications.

- Utilise `usePushNotifications`
- Affiche l'état (activé / désactivé / non supporté)
- Icône `Bell` / `BellOff` de lucide-react
- Intégrable dans le header ou les paramètres utilisateur

### 9. `supabase/functions/send-push/index.ts`

Edge Function Supabase déclenchée manuellement ou via DB webhook.

```typescript
// Reçoit un NotificationPayload + userId ou topic
// Récupère les subscriptions de l'utilisateur
// Envoie via Web Push API avec la clé VAPID privée
// Gère les subscriptions expirées (suppression automatique)
```

### 10. `public/sw.js` — mettre à jour le Service Worker

Ajouter la gestion des événements push :

```javascript
self.addEventListener("push", (event) => {
  // Parser le payload
  // Afficher la notification avec self.registration.showNotification()
  // Inclure actions, icon, badge, url
});

self.addEventListener("notificationclick", (event) => {
  // Fermer la notification
  // Ouvrir ou focus l'onglet de l'app
  // Naviguer vers event.notification.data.url si présent
});
```

---

## Déclencheurs de notifications à implémenter

| Événement               | Destinataires        | Message                                            |
| ----------------------- | -------------------- | -------------------------------------------------- |
| Nouvelle location créée | Admin & Owner editor | "Nouvelle demande de [Prénom] du [date] au [date]" |
| Location confirmée      | Owner concerné       | "Votre séjour du [date] au [date] est confirmé !"  |
| Location rejetée        | Owner concerné       | "Votre demande de séjour a été refusée"            |
| Rappel J-1              | Owner concerné       | "Rappel : votre séjour commence demain"            |
| Rappel J-7              | Owner concerné       | "Dans 7 jours : votre sejour a La Petite Maison"   |

---

## Contraintes absolues

- TypeScript strict, zéro `any`
- La clé VAPID **privée** ne doit jamais apparaître dans le code frontend
- Elle va uniquement dans **Supabase Secrets** : `supabase secrets set VAPID_PRIVATE_KEY=xxx`
- Toujours vérifier `'Notification' in window` avant tout appel
- Toujours vérifier `'serviceWorker' in navigator` avant tout appel
- Gérer gracieusement les navigateurs non supportés (iOS Safari sans installation PWA)
- Les subscriptions expirées (erreur 410) doivent être supprimées automatiquement

---

## Compatibilité

| Plateforme                 | Support                                                   |
| -------------------------- | --------------------------------------------------------- |
| Chrome Desktop             | Oui                                                       |
| Chrome Android             | Oui                                                       |
| Firefox                    | Oui                                                       |
| Safari iOS (PWA installée) | Oui (iOS 16.4+)                                           |
| Safari iOS (navigateur)    | Non — afficher un message d'invitation a installer la PWA |

---

## Génère les fichiers dans cet ordre

1. Mise à jour `types.ts`
2. SQL `push_subscriptions`
3. Mise à jour `dbTypes.ts`
4. Mise à jour `apiMappers.ts`
5. `services/pushNotifications.ts`
6. `hooks/usePushNotifications.ts`
7. `components/ui/NotificationToggle.tsx`
8. `supabase/functions/send-push/index.ts`
9. Mise à jour `public/sw.js`

Génère les fichiers un par un en attendant ma confirmation avant de passer au suivant.
