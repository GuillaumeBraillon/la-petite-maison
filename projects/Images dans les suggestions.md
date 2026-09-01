## Analyse d'impact — Images dans les suggestions

### Objectif

Permettre aux membres autorisés d'ajouter une ou plusieurs images à leurs messages et réponses du forum de suggestions.

Les images sont affichées sous le texte, peuvent être agrandies dans la lightbox existante et sont supprimables par leur auteur ou un administrateur, selon les mêmes permissions que le message associé.

### Périmètre retenu

- Images autorisées sur les messages racines **et** les réponses.
- Plusieurs images par message, avec ordre d'affichage.
- Formats : JPEG, PNG, WebP et GIF.
- Taille maximale : 5 Mo par image, cohérente avec la page Présentation.
- Les images restent facultatives ; un message texte demeure obligatoire.
- Les liens URL dans le texte restent indépendants de cette fonctionnalité.

---

### 1. Base de données et Storage

**Migration à créer** (`supabase/migrations/<timestamp>_add_feedback_message_images.sql`) :

```sql
create table public.feedback_message_images (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.feedback_messages(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index feedback_message_images_message_id_idx
  on public.feedback_message_images(message_id);

create index feedback_message_images_message_position_idx
  on public.feedback_message_images(message_id, position);
```

Créer un bucket Storage dédié, par exemple `feedback-images`, plutôt que de mélanger les images de suggestions avec `public-page-images`.

**Politiques RLS Storage et table** :

- Lecture : tout membre autorisé (`current_member_is_allowed()`).
- Ajout : admin ou owner autorisé, uniquement pour un message dont `author_id = current_member_id()`.
- Suppression : auteur du message ou administrateur.
- Les policies doivent vérifier le lien entre le chemin Storage, l'enregistrement `feedback_message_images` et le message parent. Ne pas se fier au contrôle UI.
- À définir : le bucket est public, comme les images de Présentation, ou privé avec URLs signées. Pour les suggestions internes, privilégier un bucket privé et des URLs signées si les règles Storage actuelles le permettent simplement.

Mettre à jour `supabase/feedback.sql` avec le schéma et les politiques finales pour qu'il reste le script incrémental de référence.

---

### 2. Types TypeScript et mappings

**`src/types.ts`** :

```ts
export interface SuggestionMessageImage {
  id: string;
  messageId: string;
  storagePath: string;
  publicUrl: string;
  caption?: string;
  position: number;
  createdAt: string;
}

export interface SuggestionMessage {
  // ...
  images: SuggestionMessageImage[];
}
```

**`src/services/dbTypes.ts`** : ajouter `DbFeedbackMessageImage`, miroir snake_case de la nouvelle table.

**`src/services/apiMappers.ts`** : ajouter `mapSuggestionMessageImageFromDb`. `mapSuggestionMessageFromDb` initialise `images` à `[]` et ne fait aucune conversion snake_case/camelCase ailleurs.

---

### 3. Chargement et CRUD

**`src/services/api.ts`** :

- Charger les messages avec leurs images, triées par `position`.
- Construire l'URL d'affichage depuis le bucket `feedback-images` via `getPublicUrl`, ou générer une URL signée si le bucket est privé.
- Retourner des objets `SuggestionMessage` dont `images` est toujours défini.

**`src/services/apiCrud.ts`** :

- `uploadSuggestionMessageImage(messageId, file, caption?)` : upload Storage, création de la ligne DB, suppression du fichier Storage si l'insertion DB échoue.
- `deleteSuggestionMessageImage(image)` : suppression DB puis Storage, en conservant un `console.error` dans le `catch` uniquement pour un échec de nettoyage Storage.
- Générer des chemins non prévisibles et séparés par message, par exemple `${messageId}/${crypto.randomUUID()}.${extension}`.

Conserver la même validation client que `PublicPageImageGrid` : JPEG/PNG/WebP/GIF et maximum 5 Mo. Les règles Storage et RLS restent la protection réelle.

---

### 4. Composants UI

Créer un composant générique réutilisable, plutôt que de dupliquer celui de la page Présentation :

- `src/components/ui/ImageGrid.tsx` : affiche une grille d'images, gère la lightbox et l'état vide.
- `src/components/ui/ImageUpload.tsx` : bouton de sélection de fichier, validation de format/taille et état d'envoi.

Adapter ensuite `PublicPageImageGrid` pour utiliser cette base commune, si cela réduit réellement la duplication sans modifier son comportement existant.

**Suggestions** :

- `SuggestionMessageForm` : permet de sélectionner une ou plusieurs images avant publication. La création du message doit réussir avant l'upload, puis les images sont envoyées. En cas d'échec partiel, garder le message, afficher un toast d'erreur et permettre de réessayer l'envoi.
- `SuggestionMessageCard` : affiche `ImageGrid` sous le texte du message. Lors de l'édition, l'auteur/admin peut ajouter ou supprimer les images du message.
- Les contrôles d'ajout/suppression suivent `canEdit`; aucune sous-composante ne doit être définie à l'intérieur du composant parent.

Utiliser les icônes `ImagePlus` et `Trash2` de `lucide-react`, avec des libellés accessibles.

---

### 5. Gestion d'erreurs et feedback

- Upload réussi : toast de succès court, par exemple « Image ajoutée ».
- Upload échoué : toast d'erreur et conservation de l'état permettant un nouvel essai.
- Suppression réussie : toast de succès.
- Suppression échouée : garder l'image affichée, afficher un toast d'erreur et, si nécessaire, un état d'erreur persistant via `ErrorContext`.
- Centraliser ces textes dans `src/services/messageCatalog.ts`.

---

### 6. Ordre d'implémentation recommandé

1. Migration SQL, bucket et policies RLS ; test réel des droits admin, owner et sub_member.
2. `dbTypes.ts`, `types.ts` et `apiMappers.ts`.
3. Chargement des images dans `api.ts`.
4. CRUD upload/suppression dans `apiCrud.ts`.
5. Composants UI de grille/upload et réutilisation prudente du comportement de la page Présentation.
6. Intégration dans le formulaire et la carte des suggestions.
7. Textes de toast dans `messageCatalog.ts`.
8. `npm run tsc`, `npm run lint`, puis tests manuels : message racine, réponse, suppression, lightbox, fichier invalide, fichier > 5 Mo et permissions des rôles.

---

### Risques et décisions à respecter

| Risque                                                      | Mitigation                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Un membre envoie une image sur le message d'un autre        | La policy RLS doit vérifier `author_id = current_member_id()` ou le rôle admin.                                     |
| Fichier Storage orphelin après un échec DB                  | Supprimer le fichier juste après l'échec d'insertion.                                                               |
| Ligne DB orpheline après une suppression Storage impossible | Supprimer la ligne DB, journaliser l'échec Storage dans un `catch`, puis prévoir un nettoyage administratif.        |
| Images privées accessibles publiquement                     | Préférer un bucket privé et des URLs signées ; valider cette décision avec les besoins de partage de l'application. |
| Upload partiellement réussi à la création                   | Créer d'abord le message puis envoyer chaque image ; signaler clairement les échecs sans supprimer le message.      |
| Régression de la page Présentation                          | Extraire le code commun seulement après validation que la grille générique couvre les usages existants.             |
