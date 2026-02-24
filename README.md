# 🏡 La Petite Maison

Application web de gestion des locations de la maison familiale "La Petite Maison".

WebApp responsive (desktop) et installable sur mobile (PWA).

## 📋 Table des matières

- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Scripts disponibles](#-scripts-disponibles)
- [Architecture](#-architecture)
- [Fonctionnalités principales](#-fonctionnalités-principales)
- [Authentification & Autorisation](#-authentification--autorisation)
- [Déploiement](#-déploiement)
- [Licence](#-licence)

## 🛠 Stack technique

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

## 📦 Prérequis

- **Node.js** : v20 ou supérieur
- **npm** : v9 ou supérieur
- **Compte Supabase** : pour la base de données et l'authentification
- **Compte Google Cloud** : pour OAuth (configuré via Supabase)

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/la-petite-maison.git
cd la-petite-maison

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-publique>
```

### Base de données Supabase

1. Créer un nouveau projet sur [Supabase](https://supabase.com)
2. Exécuter le script SQL dans `supabase/schema.sql`
3. Configurer Google OAuth dans les paramètres d'authentification
4. Récupérer l'URL et la clé anonyme du projet

## 📜 Scripts disponibles

```bash
# Développement
npm run dev              # Démarre le serveur de développement

# Build
npm run build            # Compile TypeScript et build pour production
npm run preview          # Prévisualise le build de production

# Qualité du code
npm run lint             # Lance ESLint
npm run lint:fix         # Corrige automatiquement les erreurs ESLint
npm run format           # Formate le code avec Prettier
npm run format:check     # Vérifie le formatage sans modifier
npm run tsc              # Vérifie les types TypeScript
npm run fix              # Exécute format + lint:fix + tsc
```

## 🏗 Architecture

```
src/
├── types.ts                    # Types TypeScript globaux (source de vérité)
├── App.tsx                     # Point d'entrée, routing, gestion des vues
├── main.tsx
│
├── services/
│   ├── supabaseClient.ts       # Client Supabase
│   ├── api.ts                  # Opérations READ
│   ├── apiCrud.ts              # Opérations CREATE/UPDATE/DELETE
│   ├── apiMappers.ts           # Conversions snake_case ↔ camelCase
│   └── dbTypes.ts              # Types PostgreSQL (snake_case)
│
├── contexts/
│   └── ErrorContext.tsx        # State management global des erreurs
│
├── hooks/
│   ├── useAuthorization.ts     # Hook d'autorisation
│   └── useRentalModals.ts      # Hook partagé pour gestion des modals
│
├── components/
│   ├── ui/                     # Composants réutilisables (Atomic Design)
│   ├── members/                # Gestion des membres
│   ├── rentals/                # Gestion des locations
│   ├── calendar/               # Vue calendrier
│   └── dashboard/              # KPIs et statistiques
│
└── pages/                      # Pages principales
    ├── DashboardPage.tsx
    ├── MembersPage.tsx
    ├── RentalsPage.tsx
    └── CalendarPage.tsx
```

### Conventions de code

- **Database (Supabase)** → `snake_case` (ex: `first_name`, `created_at`)
- **TypeScript (App)** → `camelCase` (ex: `firstName`, `createdAt`)
- **Conversions** → Uniquement dans `services/apiMappers.ts`
- **Atomic Design** → Pas de sous-composants dans le corps d'un composant parent
- **TypeScript strict** → Typage explicite, pas de `any`

## ✨ Fonctionnalités principales

### 📅 Calendrier des locations

- Vue calendrier mensuelle avec navigation
- Sélection de période : par défaut **dimanche midi → dimanche midi suivant**
- Création rapide de location en cliquant sur un jour
- Affichage : nom du locataire, avatar, libellé, tarif
- Vue détail complète au clic

### 👤 Gestion des membres

- Libellé personnalisable (ex: "Copine de Nicole")
- Prénom, nom, email, adresse (optionnelle)
- Rôles : `admin`, `owner`, `sub_member`, `external`
- Statut : `family`, `friends`, `other`
- Avatars depuis Google OAuth
- Lien vers un propriétaire parent (pour sub_member/external)

### 📋 Gestion des locations

- Sélection du propriétaire et sous-membre (autocomplete)
- Nombre de personnes et prix libre
- Statut modifiable : `pending`, `confirmed`, `rejected`, `completed`
- Notes et relevés électriques (début/fin)
- Calcul automatique de la consommation

### 📊 Tableau de bord

- KPI cards : nombre de locations, revenus, taux d'occupation
- Vue synthétique du calendrier
- Prochain séjour à venir

## 🔐 Authentification & Autorisation

### Système d'autorisation

L'application utilise un système d'autorisation en deux étapes :

1. **Connexion Google OAuth** : authentification via Supabase
2. **Autorisation admin** : l'administrateur doit approuver l'accès

### Flux d'autorisation

1. Première connexion Google → Création automatique d'un membre "en attente" (`is_allowed=false`)
2. L'admin voit le nouveau membre dans la liste
3. L'admin complète le profil (label, prénom, nom) si nécessaire
4. L'admin clique sur "Autoriser"
5. L'utilisateur peut maintenant accéder à l'application

### Rôles et permissions

| Rôle         | Description                      | Permissions                                           |
| ------------ | -------------------------------- | ----------------------------------------------------- |
| `admin`      | Administrateur                   | Tous les droits + gestion des autorisations           |
| `owner`      | Propriétaire de la maison        | Voir locations, faire des demandes (validation admin) |
| `sub_member` | Enfant/petit-enfant d'un owner   | Voir dates + libellé + propriétaire uniquement        |
| `external`   | Locataire externe lié à un owner | Voir dates + libellé + propriétaire uniquement        |

## 🚀 Déploiement

### Vercel (recommandé)

1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Le déploiement est automatique à chaque push sur `main`

### Variables d'environnement Vercel

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-publique>
```

### CI/CD

GitHub Actions exécute automatiquement :

- ✅ Vérification du formatage (Prettier)
- ✅ Compilation TypeScript
- ✅ Vérification ESLint
- ✅ Tests unitaires (si présents)

## 📄 Licence

Ce projet est privé et destiné à un usage familial uniquement.

---

**Version actuelle** : 0.2.0  
**Dernière mise à jour** : 24 février 2026
