# 🏡 La Petite Maison — Instructions GitHub Copilot

## Vue d'ensemble du projet

Application web de gestion des locations de la maison familiale "La Petite Maison".
WebApp responsive (desktop) et installable sur mobile (PWA).

---

## Stack technique

| Couche      | Technologie                            |
| ----------- | -------------------------------------- |
| Frontend    | React 18 + TypeScript (strict)         |
| Styling     | Tailwind CSS                           |
| Icônes      | lucide-react                           |
| Backend     | Supabase (PostgreSQL + Auth + Storage) |
| Auth        | Google OAuth via Supabase              |
| Hébergement | Vercel                                 |
| CI/CD       | GitHub Actions                         |
| Linter      | ESLint                                 |

---

## Configuration TypeScript

```json
// tsconfig.json — toujours en mode strict
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## Variables d'environnement requises

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-publique>
```

---

## Architecture des fichiers

```
src/
├── types.ts                        # ✅ Source de vérité — toutes les interfaces TypeScript
├── App.tsx                         # Point d'entrée, routing, gestion des vues principales
├── main.tsx
│
├── services/
│   ├── supabaseClient.ts           # Initialisation du client Supabase
│   ├── api.ts                      # READ — chargement initial des données
│   ├── apiCrud.ts                  # CREATE / UPDATE / DELETE
│   ├── apiMappers.ts               # Conversion DB (snake_case) ↔ App (camelCase)
│   └── dbTypes.ts                  # Types PostgreSQL (snake_case) — interfaces DB brutes
│
├── contexts/
│   └── ErrorContext.tsx            # State management global des erreurs
│
├── components/
│   ├── ErrorBoundary.tsx           # Capture des erreurs React
│   │
│   ├── ui/                         # Atoms & Molecules (Atomic Design)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── ErrorDisplay.tsx        # Composant réutilisable d'affichage d'erreur
│   │   └── ErrorModal.tsx          # Modal pour erreurs handlers
│   │
│   ├── members/                    # Gestion des membres
│   │   ├── MemberForm.tsx
│   │   ├── MemberCard.tsx
│   │   └── MemberList.tsx
│   │
│   ├── rentals/                    # Gestion des locations
│   │   ├── RentalForm.tsx
│   │   ├── RentalCard.tsx
│   │   ├── RentalDetail.tsx
│   │   └── RentalList.tsx
│   │
│   ├── calendar/                   # Vue calendrier
│   │   ├── CalendarView.tsx
│   │   ├── CalendarCell.tsx
│   │   └── RentalBadge.tsx
│   │
│   └── dashboard/                  # KPIs et cartes
│       ├── KpiCard.tsx
│       └── DashboardStats.tsx
│
└── pages/
    ├── DashboardPage.tsx
    ├── MembersPage.tsx
    ├── RentalsPage.tsx
    └── CalendarPage.tsx
```

---

## Règles de nommage — OBLIGATOIRES

### Convention snake_case ↔ camelCase

- **Base de données Supabase** → toujours `snake_case` (ex: `first_name`, `created_at`, `owner_id`)
- **TypeScript App** → toujours `camelCase` (ex: `firstName`, `createdAt`, `ownerId`)
- **Les conversions se font UNIQUEMENT dans `services/apiMappers.ts`**
- `services/api.ts` et `services/apiCrud.ts` utilisent les mappers, jamais de conversion inline

```typescript
// ✅ CORRECT — dans apiMappers.ts
export const mapMemberFromDb = (db: DbMember): Member => ({
  id: db.id,
  firstName: db.first_name,
  lastName: db.last_name,
  createdAt: db.created_at,
  ownerId: db.owner_id,
});

export const mapMemberToDb = (member: Partial<Member>): Partial<DbMember> => ({
  first_name: member.firstName,
  last_name: member.lastName,
  owner_id: member.ownerId,
});

// ❌ INTERDIT — dans api.ts ou apiCrud.ts
const member = { firstName: data.first_name }; // NON
```

---

## Règle Atomic Design — OBLIGATOIRE

> **Ne jamais définir de sous-composants dans le corps d'un composant parent.**
> Toujours les extraire dans un fichier séparé ou hors du rendu.

```typescript
// ❌ INTERDIT
const ParentComponent = () => {
  const SubComponent = () => <div>...</div>; // NON — défini dans le corps
  return <SubComponent />;
};

// ✅ CORRECT — SubComponent est dans son propre fichier
// components/ui/SubComponent.tsx
export const SubComponent = () => <div>...</div>;

// components/ParentComponent.tsx
import { SubComponent } from './ui/SubComponent';
const ParentComponent = () => <SubComponent />;
```

---

## Types TypeScript (`types.ts`)

```typescript
// types.ts — source de vérité unique

export type MemberRole = "admin" | "owner" | "sub_member";
export type MemberStatus = "family" | "friends" | "other";

export interface Member {
  id: string;
  label: string; // ex: "Copine de Nicole" — éditable
  firstName: string;
  lastName: string;
  role: MemberRole;
  status: MemberStatus;
  email: string;
  address?: string; // optionnel
  ownerId?: string; // lien vers le propriétaire parent (pour sub_member)
  createdAt: string;
  updatedAt: string;
}

export interface Rental {
  id: string;
  startDate: string; // ISO date — par défaut dimanche midi
  endDate: string; // ISO date — par défaut dimanche midi suivant
  ownerId: string; // propriétaire principal
  subMemberId?: string; // enfant / sous-membre
  guestCount: number; // nombre de personnes
  price: number; // tarif libre
  status: RentalStatus;
  notes?: string; // commentaires post-location
  electricityStart?: number;
  electricityEnd?: number;
  createdAt: string;
  updatedAt: string;
}

export type RentalStatus = "pending" | "confirmed" | "rejected" | "completed";

export interface AppError {
  message: string;
  code?: string;
  context?: string;
}
```

---

## Types DB (`services/dbTypes.ts`)

```typescript
// dbTypes.ts — reflet exact des tables Supabase (snake_case)

export interface DbMember {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  email: string;
  address: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRental {
  id: string;
  start_date: string;
  end_date: string;
  owner_id: string;
  sub_member_id: string | null;
  guest_count: number;
  price: number;
  status: string;
  notes: string | null;
  electricity_start: number | null;
  electricity_end: number | null;
  created_at: string;
  updated_at: string;
}
```

---

## Services

### `services/api.ts` — READ uniquement

```typescript
// api.ts — chargement initial, utilise toujours les mappers

import { supabase } from "./supabaseClient";
import { mapMemberFromDb, mapRentalFromDb } from "./apiMappers";
import type { Member, Rental } from "../types";

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase.from("members").select("*");
  if (error) throw error;
  return (data ?? []).map(mapMemberFromDb);
};

export const fetchRentals = async (): Promise<Rental[]> => {
  const { data, error } = await supabase.from("rentals").select("*");
  if (error) throw error;
  return (data ?? []).map(mapRentalFromDb);
};
```

### `services/apiCrud.ts` — CREATE / UPDATE / DELETE

```typescript
// apiCrud.ts — utilise toujours les mappers avant/après appels Supabase

import { supabase } from "./supabaseClient";
import {
  mapMemberFromDb,
  mapMemberToDb,
  mapRentalFromDb,
  mapRentalToDb,
} from "./apiMappers";
import type { Member, Rental } from "../types";

export const createMember = async (
  member: Omit<Member, "id" | "createdAt" | "updatedAt">,
): Promise<Member> => {
  const dbPayload = mapMemberToDb(member);
  const { data, error } = await supabase
    .from("members")
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return mapMemberFromDb(data);
};

export const updateMember = async (
  id: string,
  updates: Partial<Member>,
): Promise<Member> => {
  const dbPayload = mapMemberToDb(updates);
  const { data, error } = await supabase
    .from("members")
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapMemberFromDb(data);
};

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw error;
};

// Même pattern pour createRental, updateRental, deleteRental
```

---

## Gestion des erreurs

### `contexts/ErrorContext.tsx`

```typescript
import { createContext, useContext, useState, useCallback } from 'react';
import type { AppError } from '../types';

interface ErrorContextValue {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const [error, setErrorState] = useState<AppError | null>(null);
  const setError = useCallback((e: AppError | null) => setErrorState(e), []);
  const clearError = useCallback(() => setErrorState(null), []);
  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextValue => {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useError must be used within ErrorProvider');
  return ctx;
};
```

---

## Authentification & Rôles

### Rôles

| Rôle         | Description                    | Permissions                                                   |
| ------------ | ------------------------------ | ------------------------------------------------------------- |
| `admin`      | Administrateur                 | Tous les droits                                               |
| `owner`      | Propriétaire de la maison      | Voir locations, faire des demandes (validation admin requise) |
| `sub_member` | Enfant/petit-enfant d'un owner | Voir dates + libellé + propriétaire uniquement                |

### Auth Google OAuth

```typescript
// Connexion via Google
const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });

// Déconnexion
await supabase.auth.signOut();

// Session courante
const {
  data: { session },
} = await supabase.auth.getSession();
```

---

## Fonctionnalités principales

### 📅 Calendrier des locations

- Vue calendrier et vue tableau (basculement)
- Sélection de période : par défaut **dimanche midi → dimanche midi suivant**
- Affichage sur la période : nom du locataire, libellé, tarif
- Clic sur une période → vue détail complète
- Création rapide de membre si inexistant
- Modification de la location depuis la vue détail

### 👤 Membres

- Libellé éditable (ex: "Copine de Nicole")
- Prénom, nom, statut (famille / amis / autre — éditable)
- Email, adresse postale (optionnelle)
- Rôle (admin / owner / sub_member)
- Lien optionnel vers un owner parent (pour sub_member)

### 📋 Location

- Sélection du membre propriétaire (autocomplete)
- Sélection du sous-membre (autocomplete)
- Création rapide de membre inline
- Nombre de personnes
- Tarif libre
- Infos post-location : commentaires, relevé électrique (début / fin)

### 📊 Dashboard

- KPI cards : nombre de locations, revenus, taux d'occupation, prochain séjour
- Vue synthétique du calendrier
- Alertes / demandes en attente (pour les admins)

---

## Schema SQL Supabase (référence)

```sql
-- Table members
create table members (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('admin', 'owner', 'sub_member')),
  status text not null default 'family' check (status in ('family', 'friends', 'other')),
  email text,
  address text,
  owner_id uuid references members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table rentals
create table rentals (
  id uuid primary key default gen_random_uuid(),
  start_date timestamptz not null,
  end_date timestamptz not null,
  owner_id uuid not null references members(id),
  sub_member_id uuid references members(id),
  guest_count integer not null default 1,
  price numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'completed')),
  notes text,
  electricity_start numeric,
  electricity_end numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table members enable row level security;
alter table rentals enable row level security;
```

---

## PWA — manifest & service worker

```json
// public/manifest.json
{
  "name": "La Petite Maison",
  "short_name": "Petite Maison",
  "description": "Gestion des locations de La Petite Maison",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Push Notifications

### Vue d'ensemble

Le système repose sur **Web Push + VAPID** (sans Firebase). L'architecture implique :

1. Le browser souscrit via l'API `PushManager` et stocke l'abonnement en base
2. L'app déclenche l'Edge Function Supabase `send-push` (fire-and-forget) sur les événements métier
3. L'Edge Function résout les destinataires, envoie les notifications via `web-push`, purge les souscriptions invalides
4. Le Service Worker reçoit l'événement `push` et affiche la notification

### Variables d'environnement requises

```env
# Côté frontend (Vite)
VITE_VAPID_PUBLIC_KEY=<clé-publique-VAPID>

# Côté Supabase Edge Function (secrets Supabase)
VAPID_PUBLIC_KEY=<clé-publique-VAPID>
VAPID_PRIVATE_KEY=<clé-privée-VAPID>
VAPID_SUBJECT=mailto:notifications@lapetitemaison.guillaumebraillon.fr
```

Génération des clés : `npx web-push generate-vapid-keys`

### Types (`types.ts`)

```typescript
export type NotificationType =
  | "rental_created" // nouvelle demande de location
  | "rental_confirmed" // location confirmée
  | "rental_rejected" // location refusée
  | "rental_reminder" // rappel J-7 / J-1
  | "rental_completed" // location clôturée
  | "request_pending"; // demande en attente de validation

export interface PushSubscriptionRecord {
  id: string;
  userId: string; // auth.users.id
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}
```

### Table Supabase (`push_subscriptions`)

```sql
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

create index on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "Users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Service `pushNotifications.ts`

Gère la souscription côté navigateur :

- `requestPermission()` → demande la permission browser
- `subscribeToPush(userId)` → souscrit via `PushManager` et persiste dans Supabase
- `unsubscribeFromPush(userId)` → désabonne et supprime de Supabase
- `isSubscribed()` → vérifie l'état courant

La clé publique VAPID est lue depuis `import.meta.env.VITE_VAPID_PUBLIC_KEY`.

### Hook `usePushNotifications`

```typescript
const {
  isSupported,
  isSubscribed,
  permission,
  subscribe,
  unsubscribe,
  loading,
  error,
} = usePushNotifications();
```

Expose l'état complet de la souscription. Utilisé par `NotificationToggle`.

### Composant `NotificationToggle`

Bouton Bell/BellOff dans `UserInfoCard`. Affiche l'état d'abonnement et permet de basculer la souscription. N'est rendu que si `isSupported === true`.

### Service Worker (`public/sw.js`)

Gère deux événements :

```javascript
// Réception d'un push
self.addEventListener("push", (event) => {
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, { body, data: { url } }),
  );
});

// Clic sur la notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? "/"));
});
```

### Edge Function `send-push` (`supabase/functions/send-push/index.ts`)

Déployée sur Supabase (Deno runtime). Utilise `npm:web-push@3.6.7`.

**Résolution des destinataires** — trois mécanismes d'adressage :

| Champ de la requête                 | Description                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `userId` / `userIds`                | Auth user IDs directs                                                      |
| `memberEmails`                      | Emails des membres → résolus en auth user IDs via `auth.admin.listUsers()` |
| `topic: "admins_and_owner_editors"` | Tous les admins + tous les owners ayant `is_editor = true`                 |

**Purge automatique** : les endpoints qui retournent HTTP 404 ou 410 sont supprimés de `push_subscriptions`.

**Déploiement** :

```bash
supabase functions deploy send-push
```

### Déclencheurs métier (`rentalNotifications.ts`)

Trois fonctions **fire-and-forget** (ne bloquent jamais le flux CRUD) :

```typescript
// 1. Nouvelle demande → notifie tous les admins + owners editors
void notifyNewRental(rental);

// 2. Changement de statut (pending/confirmed/rejected) → notifie owner + subMember
//    Le 3ème param évite une notification si le statut n'a pas changé
void notifyStatusChange(rental, previousStatus?);

// 3. Clôture (status → completed) → notifie owner + subMember avec récapitulatif
//    (dates prévues/réelles, prix, coût électricité, total)
void notifyCompleted(rental);
```

### Intégration dans `apiCrud.ts`

```typescript
// createRental → après insert
const created = mapRentalFromDb(data);
void notifyNewRental(created);
return created;

// updateRental → après update, si status modifié
if (updates.status !== undefined) {
  if (updates.status === "completed") void notifyCompleted(updated);
  else void notifyStatusChange(updated, previousStatus); // previousStatus = 3ème param optionnel
}
```

### Appel de `updateRental` — bonne pratique

Passer le statut courant comme 3ème argument pour éviter les fausses notifications :

```typescript
// ✅ RECOMMANDÉ — pas de notification si le statut n'a pas changé
await updateRental(rental.id, updates, rental.status);

// ⚠️ ACCEPTABLE — notifie toujours quand updates.status est défini
await updateRental(rental.id, updates);
```

---

## Conventions de code — rappels rapides

- **Toujours** typer explicitement les props des composants React
- **Toujours** utiliser `const` pour les fonctions fléchées
- **Jamais** de `any` — utiliser `unknown` si nécessaire
- **Jamais** de sous-composant dans le corps d'un composant parent
- **Toujours** extraire la logique métier dans des hooks custom (`hooks/useRentals.ts`, etc.)
- **Toujours** passer par les mappers pour les conversions snake_case ↔ camelCase
- Les `console.error` sont tolérés uniquement dans les `catch` blocks — passer par `ErrorContext` pour l'affichage
- Tailwind : pas de style inline sauf cas exceptionnel justifié

---

## Commandes de démarrage

```bash
npm create vite@latest la-petite-maison -- --template react-ts
cd la-petite-maison
npm install
npm install @supabase/supabase-js lucide-react
npm install -D tailwindcss postcss autoprefixer eslint
npx tailwindcss init -p
```
