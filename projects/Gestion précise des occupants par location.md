## Analyse d'impact — Gestion précise des occupants par location

### ⚠️ Constat critique (à valider avant tout code)

Le calcul du tarif automatique n'existe **pas seulement côté TypeScript**. Il est **dupliqué en SQL** dans schema.sql :

- `public.auto_rental_price(start, end, guest_count)` → `nights × guest_count × 5`
- `public.restricted_rental_insert_is_safe(...)` et `restricted_rental_update_is_safe(...)` comparent le `price` envoyé par le client à ce calcul serveur, pour les policies RLS `rentals_owner_insert_own_scope`, `rentals_owner_update_own_scope`, `rentals_sub_member_insert_own_scope`, `rentals_sub_member_update_own_scope`.

**Conséquence** : si on change la formule côté formulaire sans adapter ces fonctions SQL, toute création/modification de location par un `owner` non-éditeur ou un `sub_member` échouera silencieusement en RLS (erreur 42501), alors que l'UI semblera correcte. C'est le principal risque de régression de cette évolution — noté en mémoire dépôt.

Deux autres points à trancher avant implémentation (je ne les ai pas tranchés moi-même, cf. section « Questions ouvertes ») :

1. **Backfill des anciennes locations** : la spec demande un seul objet `occupants=[{name:"", nights:durée}]`, ce qui ferait chuter `guest_count` (donc l'historique "nombre de personnes") à `1` pour toutes les locations existantes, potentiellement multi-personnes. C'est une perte d'information silencieuse sur les stats passées (dashboard, KPI).
2. **Recalcul sur dates réelles** (`RentalPostStaySection`) : aujourd'hui `recalculatedPrice = nights_réelles × guestCount × 5`. Avec des occupants à durée fixe par personne, il faut décider si ce recalcul doit rester indépendant (ajustement basé sur les dates réelles) ou intégrer les occupants.

---

### 1. Base de données

**Migration** (`supabase/migrations/20260806_add_rental_occupants.sql`) :

```sql
alter table public.rentals
  add column occupants jsonb not null default '[]'::jsonb;

-- Garde-fou structurel (défense en profondeur, ne pas se fier au seul client)
alter table public.rentals
  add constraint rentals_occupants_is_array_chk
  check (jsonb_typeof(occupants) = 'array' and jsonb_array_length(occupants) >= 1);

-- guest_count devient une valeur DÉRIVÉE, garantie côté serveur
create or replace function public.sync_rental_guest_count()
returns trigger
language plpgsql
as $$
begin
  new.guest_count := jsonb_array_length(new.occupants);
  return new;
end;
$$;

create trigger trg_rentals_sync_guest_count
before insert or update on public.rentals
for each row
execute function public.sync_rental_guest_count();

-- Backfill des locations existantes (à trancher, cf. question ouverte 1)
update public.rentals
set occupants = jsonb_build_array(jsonb_build_object('name', '', 'nights', greatest(1, round(extract(epoch from (end_date - start_date)) / 86400.0))))
where occupants = '[]'::jsonb;
```

**Fonctions RLS à réécrire** (impact majeur) :

- `auto_rental_price(...)` → remplacée/complétée par une fonction basée sur `occupants` :
  ```sql
  create or replace function public.auto_rental_price_from_occupants(occupants jsonb)
  returns numeric language sql stable as $$
    select coalesce(sum((elem->>'nights')::numeric), 0) * 5::numeric
    from jsonb_array_elements(occupants) elem;
  $$;
  ```
- `restricted_rental_insert_is_safe(...)` et `restricted_rental_update_is_safe(...)` : ajouter le paramètre `new_occupants jsonb`, comparer `new_price` à `auto_rental_price_from_occupants(new_occupants)` au lieu de `auto_rental_price(...)`.
- Les 4 policies qui appellent ces fonctions (`rentals_owner_insert_own_scope`, `rentals_owner_update_own_scope`, `rentals_sub_member_insert_own_scope`, `rentals_sub_member_update_own_scope`) doivent passer `occupants` en argument.
- Mettre à jour schema.sql en miroir (convention du projet : le fichier "from scratch" doit refléter l'état final).

---

### 2. Types TypeScript

**types.ts**

```ts
export interface RentalOccupant {
  name: string;
  nights: number;
}

export interface Rental {
  // ...
  occupants: RentalOccupant[]; // remplace la source unique de guestCount
  guestCount: number; // conservé, dérivé = occupants.length
}
```

- `RentalFormValues` hérite automatiquement via `Omit<Rental, ...>`.
- Ajouter un type d'erreurs dédié pour le formulaire (le state `errors` actuel est `Partial<Record<keyof RentalFormValues, string>>`, incompatible avec un tableau d'erreurs par occupant) :

```ts
export interface RentalOccupantFieldErrors {
  name?: string;
  nights?: string;
}
```

**dbTypes.ts** : ajouter `occupants: DbRentalOccupant[]` sur `DbRental` (petit type miroir local, cohérent avec le reste du fichier qui ne référence jamais types.ts).

---

### 3. Utils (rentalUtils.ts)

Nouvelle fonction centrale, sans dupliquer la logique :

```ts
export const calculateRentalPriceFromOccupants = (occupants: RentalOccupant[]): number =>
  occupants.reduce((sum, o) => sum + o.nights * AUTO_RENTAL_PRICE_PER_NIGHT_PER_PERSON, 0);
```

- `getAutoRentalPrice` (legacy) est **réécrite pour déléguer** à `calculateRentalPriceFromOccupants` en construisant un tableau synthétique (`guestCount` occupants à `nights = durée`), afin de garder un seul point de vérité et ne rien casser côté appelants qui n'ont pas encore migré.
- Nouveaux helpers : `buildOccupantsForGuestCount(count, nights)` (génère/redimensionne le tableau en préservant les entrées existantes) et `validateOccupants(occupants, durationDays): RentalOccupantFieldErrors[]` (nom vide, nights vide/`<1`/`> durationDays`).

---

### 4. Services (mapping + CRUD)

- **apiMappers.ts** : `mapRentalFromDb` ajoute `occupants: db.occupants ?? []` ; `mapRentalToDb` ajoute `occupants` et dérive `guest_count: rental.occupants.length` en garde-fou client (l'invariant réel est garanti par le trigger SQL).
- **apiCrud.ts** : aucun changement structurel nécessaire (passe déjà par les mappers) — à vérifier uniquement après la MAJ RLS.

---

### 5. Formulaire

- **Nouveau composant** `src/components/rentals/RentalOccupantsFields.tsx` (règle Atomic Design : pas de sous-composant inline) : rend N lignes {nom, nuits} avec erreurs sous chaque champ.
- **RentalForm.tsx** :
  - Le champ « Nombre de personnes » redimensionne `values.occupants` via `buildOccupantsForGuestCount` (ajout d'occupants vides / suppression des derniers).
  - Recalcul auto du prix : remplacer `getAutoRentalPrice(..., guestCount)` par `calculateRentalPriceFromOccupants(occupants)` dans `set()`.
  - `validate()` intègre `validateOccupants(...)`, stocke les erreurs dans un state dédié (`occupantErrors`).
  - `handleSubmit` envoie `occupants` (et `guestCount` recalculé) dans `submittedValues`.
- **rentalFormUtils.ts** : `buildDefaultRentalFormValues` initialise `occupants: [{name:"", nights:1}]` ; `buildInitialRentalFormValues` reprend `initialValues.occupants` tel quel en édition.
- **RentalPricingSection.tsx** : le calcul affiché passe de `durationDays × guestCount × 5` à la somme des nuits occupants.
- **RentalPostStaySection.tsx** : à trancher (question ouverte 2) avant de toucher `recalculatedPrice`.

---

### 6. Affichage

- **RentalDetail.tsx** : nouvelle section « Occupants » listant `name — nights nuit(s)`.
- **RentalCard.tsx** : pas de changement obligatoire (reste sur `guestCount`, désormais fiable et dérivé).
- Pas de changement fonctionnel nécessaire dans calendarEvent.ts, emailNotifications.ts, rentalMessageBuilder.ts, rentalNotifications.ts, DashboardStats.tsx (tous utilisent `guestCount`, qui reste correct).

---

### 7. Autres fichiers impactés (compilation stricte)

| Fichier                      | Raison                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| useRentalModals.ts           | `getAutoRentalPrice(..., values.guestCount)` → `calculateRentalPriceFromOccupants(values.occupants)`    |
| DebugImpersonationBanner.tsx | Objet mock avec `guestCount: 4` sans `occupants` → cassera le typage strict (`occupants` non optionnel) |

---

### 8. Tableau des risques de régression

| Risque                                                                                                 | Sévérité    | Mitigation                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| RLS cassée pour owner non-éditeur / sub_member (price ≠ calcul serveur)                                | 🔴 Critique | Réécrire `auto_rental_price`/`*_is_safe` en parallèle du TS, tester avec un vrai compte non-admin |
| Backfill à 1 occupant écrase le `guest_count` historique                                               | 🟠 Élevé    | Confirmer la stratégie (1 occupant vs N occupants « anonymes ») avant migration                   |
| `guest_count` désynchronisé si le trigger SQL n'est pas posé avant mise en prod du nouveau code client | 🟠 Élevé    | Ordonner : migration DB d'abord, déploiement front ensuite                                        |
| Formulaire strict TS : `errors` actuel incompatible avec tableau d'erreurs par occupant                | 🟡 Moyen    | Étendre le state d'erreurs sans casser le typage existant                                         |
| Verrouillage manuel du prix / recalcul dates réelles                                                   | 🟡 Moyen    | Clarifier le comportement attendu (question ouverte 2)                                            |
| Mocks/fixtures (`DebugImpersonationBanner`) non mis à jour → build cassé                               | 🟢 Faible   | Détecté par `tsc --noEmit` / `get_errors` après implémentation                                    |

---

### 9. Ordre d'implémentation recommandé

1. Migration SQL (colonne + trigger + contrainte + backfill) + réécriture des fonctions RLS, testée avec les 4 rôles (admin, owner éditeur, owner non-éditeur, sub_member).
2. types.ts + dbTypes.ts + apiMappers.ts.
3. rentalUtils.ts (`calculateRentalPriceFromOccupants`, `buildOccupantsForGuestCount`, `validateOccupants`, refactor `getAutoRentalPrice`).
4. Formulaire (`RentalOccupantsFields`, `RentalForm`, `rentalFormUtils`, `RentalPricingSection`).
5. Affichage (`RentalDetail`).
6. Nettoyage des consommateurs restants (`useRentalModals`, `DebugImpersonationBanner`).
7. `get_errors` global + test manuel des 4 rôles en création/édition/clôture.

### Questions ouvertes avant de coder

1. **Backfill** : garder un seul occupant `{name:"", nights:durée}` (perte du `guest_count` historique) ou générer `guest_count` occupants anonymes à `nights=durée` (préserve l'historique) ?
2. **Dates réelles / clôture** : le recalcul `RentalPostStaySection` doit-il rester indépendant des occupants (formule historique) ou aussi passer par `calculateRentalPriceFromOccupants` ?

Dis-moi comment trancher ces deux points et je démarre l'implémentation dans l'ordre ci-dessus.
