# Nouveautés — La Petite Maison

Ce fichier contient les notes de mise à jour **destinées aux utilisateurs**.
Rédigé en langage simple, sans jargon technique.

---

## [0.3.39] - 7 avril 2026

### Ce qui change pour vous

- **Paiement corrigé** : les propriétaires validateurs peuvent à nouveau confirmer correctement le paiement des locations.
- **Messages d'erreur plus utiles** : quand une action échoue, l'application affiche maintenant plus d'informations pour aider à comprendre et signaler le problème.

## [0.3.38] - 7 avril 2026

### Ce qui change pour vous

- **Correction validateurs** : les propriétaires validateurs peuvent maintenant modifier toutes les locations de l'application, comme prévu.

## [0.3.37] - 7 avril 2026

### Ce qui change pour vous

- **Support plus simple** : un outil de test réservé à l'administration a été ajouté en développement pour faciliter les vérifications et le debug des différents profils de l'application.

## [0.3.36] - 6 avril 2026

### Ce qui change pour vous

- **Vue du moment** : le tableau de bord peut maintenant indiquer qui est actuellement à La Petite Maison, ou jusqu'à quand elle est libre avant le prochain séjour.

## [0.3.35] - 6 avril 2026

### Ce qui change pour vous

- **Connexion plus simple** : l'accès avec Google est maintenant mis en avant sur l'écran de connexion pour rendre l'entrée dans l'application plus claire.
- **Page de présentation plus visible** : si vous n'êtes pas membre de la famille, un accès direct vers la page de présentation est affiché dès l'écran de connexion.

## [0.3.34] - 6 avril 2026

### Ce qui change pour vous

- **Petites améliorations en coulisses** : plusieurs optimisations ont été faites dans l'application pour la rendre plus fluide et plus cohérente au quotidien.
- **Un souci à signaler ?** : si vous remarquez un bug ou quelque chose d'inhabituel, pensez à prévenir l'administrateur du site pour qu'il puisse regarder ça rapidement.

## [0.3.33] - 6 avril 2026

### Ce qui change pour vous

- **Mise en forme du texte** : dans l'éditeur de la page de présentation, une barre d'outils permet de mettre du texte en **gras**, en _italique_, d'ajouter des titres et des listes.
- **Aperçu fidèle** : le formatage s'affiche proprement pour les visiteurs une fois la page enregistrée.

---

## [0.3.32] - 5 avril 2026

### Ce qui change pour vous

- **Page publique** : La Petite Maison a maintenant une page de présentation partageable ! Envoyez simplement le lien `/presentation` à vos amis pour leur présenter la maison.
- **Photos et description** : la page affiche des photos, une description et les infos pratiques.
- **Modification facile** : si vous êtes propriétaire, un bouton "Modifier" s'affiche sur la page — vous pouvez mettre à jour le texte et les photos.
- **Photos en grand** : un clic sur une photo permet de l'ouvrir en grand pour mieux la regarder.
- **Partage plus simple** : un bouton "Partager" pour envoyer le lien.
- **Accès plus pratique** : un lien vers la page à partager est visible directement depuis l'application.

---

## [0.3.31] - 5 avril 2026

### Ce qui change pour vous

- **Paiement** : les locations terminées indiquent maintenant si elles ont été payées ou non
- **Paiement** : si vous êtes validateur, vous pouvez marquer une location comme payée (ou annuler) en un clic, depuis la liste ou la vue détail
- **Paiement** : quand une location est marquée comme payée, une note avec la date est automatiquement ajoutée
- **Paiement** : les propriétaires et le membre concerné reçoivent une notification lors du changement de statut de paiement
- **Tableau de bord** : un encart orange s'affiche quand des locations terminées ne sont pas encore payées — cliquez dessus pour les voir directement
- **Locations** : nouveau filtre "Payé / Non payé" dans la liste des locations

## [0.3.30] - 2 avril 2026

### Ce qui change pour vous

- **Carte location** : l'application indique plus clairement de combien l'arrivée ou le départ diffèrent des dates prévues
- **Carte location** : un résumé court de l'écart réel est visible directement dans la carte quand les dates ont changé

## [0.3.29] - 2 avril 2026

### Ce qui change pour vous

- **Avatars** : l'affichage est maintenant cohérent dans toute l'application
- **Avatars** : si une photo est absente, vous voyez des initiales à la place d'une icône générique
- **Sous-locations** : un membre sans photo affiche maintenant ses propres initiales, sans reprendre l'avatar du propriétaire

## [0.3.28] - 2 avril 2026

### Ce qui change pour vous

- **Tableau de bord** : vous pouvez maintenant cliquer sur un statut global pour ouvrir directement la liste des locations filtrée sur ce statut
- **Tableau de bord** : dans les cartes par propriétaire, un clic sur un statut ouvre la liste avec le bon propriétaire et le bon statut déjà sélectionnés
- **Notifications** : la carte profil indique maintenant combien de notifications sont affichées par rapport au total
- **Notifications** : vous pouvez supprimer d'un coup uniquement les notifications déjà lues qui sont visibles dans la carte, avec une confirmation avant action

## [0.3.27] - 11 mars 2026

### Ce qui change pour vous

- **Calendrier** : les numéros de semaine sont maintenant affichés
- **Lecture simplifiée** : repérage plus rapide des périodes sur mobile et desktop
- **Notifications** : le bouton d'activation apparaît dans la sidebar tant qu'il n'est pas activé
- **Compte utilisateur** : une fois activé, le bouton notifications est déplacé à côté de Déconnexion dans la carte profil
- **Interface** : l'en-tête de la carte profil est mieux aligné horizontalement
- **Version de l'app** : en cliquant sur `vX.X.X` dans la carte profil, vous ouvrez l'historique complet des mises à jour

## [0.3.26] - 10 mars 2026

### Ce qui change pour vous

- **Tableau de bord** : toutes les cartes propriétaires sont désormais visibles par tout le monde
- **Montants** : tarif, coût électrique, total et infos post-location visibles par tous
- **Carte location** : les notes s'affichent maintenant directement dans la liste

### Corrections

- **Notifications** : correction d'un envoi de notification parasite lors d'une modification sans changement de statut

## [0.3.25] - 10 mars 2026

### Ce qui change pour vous

- **Tarif location** : le prix se met maintenant bien à jour quand vous changez les dates dans le formulaire
- **Notifications** : tous les propriétaires reçoivent désormais les notifications de location
- **Notifications plus claires** : le texte est adapté selon le destinataire (propriétaire, membre, validateur)

### Corrections

- **Fiabilité des notifications** : nettoyage des anciens types de notification non utilisés

## [0.3.24] - 1 mars 2026

### Ce qui change pour vous

- **Tableau de bord** : les propriétaires et membres voient leur propre carte
- **Mes locations** : vous pouvez maintenant modifier vos propres locations
- **Locations** : le filtre propriétaire est automatiquement réglé sur votre compte à l'ouverture de la page
- **Durées en nuits** : la durée des séjours s'affiche maintenant en nuits plutôt qu'en jours
- **Menu** : le bouton de notifications est maintenant visible à côté du menu utilisateur
