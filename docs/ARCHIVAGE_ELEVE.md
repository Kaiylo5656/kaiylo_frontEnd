# Archivage élève — Spécification produit & technique

Document de référence pour l’implémentation de la fonctionnalité **Archivage élève** (frontend + backend + vidéos).  
Dernière mise à jour : avril 2026.

---

## 1. Vision produit

### 1.1 Objectif

Permettre au coach de **libérer des places actives** dans la limite de son abonnement **sans supprimer définitivement** un élève ni perdre tout son historique.

### 1.2 En une phrase

**Archiver un élève = le retirer du quota « clients actifs » tout en conservant son profil et son historique en lecture seule ; le réactiver quand une place est disponible.**

### 1.3 Bénéfices

- Gestion du roster alignée sur le plan (ex. 3 / 10 / 20 élèves actifs).
- Retour d’un ancien client sans repartir de zéro (données historiques conservées).
- Base de travail plus claire : onglet « actifs » pour le quotidien, « archivés » pour l’historique.

---

## 2. Comportement fonctionnel

### 2.1 Deux espaces côté coach

| Zone | Rôle |
|------|------|
| **Clients actifs** | Élèves qui **consomment** les slots du plan. Toutes les actions métier (séances, blocs, suivi, etc.). |
| **Clients archivés** | Élèves **hors quota**. **Consultation uniquement** : profil, historique, anciennes séances (lecture). **Aucune** création de séances, blocs, ni autres mutations de planification. |

### 2.2 Règle de quota

- Le compteur affiché pour la limite d’abonnement doit refléter **uniquement les élèves actifs** (pas les archivés).
- Inviter un nouvel élève doit être cohérent avec la même règle (slots = actifs).

### 2.3 Archiver / réactiver

- **Archiver** : passage `actif → archivé`, libère un slot actif.
- **Réactiver** : passage `archivé → actif`, **consomme un slot**.
- **Réactivation si quota plein** : **bloquée** tant qu’aucune place active n’est libérée (pas de dépassement toléré). Message clair + éventuellement lien vers upgrade / gestion des actifs.

### 2.4 Côté élève (à trancher explicitement)

À décider en équipe et documenter ici une fois tranché :

- L’élève archivé a-t-il encore accès à l’app en lecture seule ?
- Ou l’accès est-il coupé avec un message du type « votre coach a mis votre compte en pause » ?

**Recommandation** : aligner avec la politique actuelle de « lecture seule » (déjà présente dans le produit pour d’autres cas) pour éviter la surprise côté élève.

---

## 3. UX / UI (coach)

### 3.1 Liste clients

- Onglets (ou équivalent) : **Actifs** | **Archivés**.
- Compteur du type : `Actifs : X / limite_plan`.
- Actions par ligne ou menu contextuel : **Archiver** (depuis actifs), **Réactiver** (depuis archivés).
- Badge visuel sur les archivés : ex. « Archivé » / « Lecture seule ».

### 3.2 Fiche / détail élève archivé

- Bandeau explicite : mode archivé, ce qui est autorisé / interdit.
- Désactiver ou masquer les CTA de création (séances, blocs, publication, etc.).
- Conserver la navigation vers l’historique et les vues de consultation.

### 3.3 Cohérence avec l’existant (frontend)

Le repo contient déjà :

- Gestion de limite clients / invitation (`InviteStudentModal`, `ClientLimitModal`).
- Dashboard coach avec compteur actifs / limite (`CoachDashboard.jsx`).
- Un concept `is_active` côté élève pour des états « lecture seule » (downgrade) — **ne pas confondre** avec « élève archivé » : prévoir un modèle clair (`readOnlyReason` ou champs distincts) pour éviter les bugs de logique et les mauvais libellés.

Fichiers typiquement impactés (liste indicative) :

- `src/pages/CoachDashboard.jsx`
- `src/components/StudentDetailView.jsx`
- `src/components/StudentSidebar.jsx`
- `src/components/InviteStudentModal.jsx`
- Modales création séance / bloc (`CreateWorkoutSessionModal.jsx`, `CreateBlockModal.jsx`)

---

## 4. Spécification technique (backend)

### 4.1 Modèle de données (relation coach ↔ élève)

Champs minimum recommandés :

| Champ | Description |
|-------|-------------|
| `archive_status` | `active` \| `archived` |
| `archived_at` | Date/heure d’archivage |
| `reactivated_at` | Optionnel, dernière réactivation |

Migration : valeur par défaut `active` pour les lignes existantes.

### 4.2 API

- **Liste** : filtrer ou segmenter actifs / archivés (query `?status=active|archived` ou deux endpoints si préféré).
- **Action** : `PATCH` (ou dédié) pour basculer `archive_status` avec contrôle serveur du quota à la réactivation.
- **Autorisation** : toutes les routes de mutation (séances, blocs, assignations, uploads vidéo, etc.) doivent **refuser** si l’élève est archivé pour le coach concerné.

### 4.3 Erreurs métier

Utiliser des codes HTTP + payload stable, par ex. :

- `409` + `{ "error": "active_slot_limit_reached" }` à la réactivation si quota plein.
- `403` + `{ "error": "student_archived" }` sur toute mutation interdite.

---

## 5. Vidéos (règles cibles discutées)

> À valider avec le produit / juridique si la page tarification mentionne encore une autre politique de rétention.

### 5.1 Vidéos « non archivées »

- Durée de vie : **suppression automatique 14 jours après l’upload** (ou après une date de purge calculée équivalente).
- Job de purge : exécution **fréquente** (quotidien ou mieux), pas uniquement un batch bi-hebdomadaire, pour respecter le délai de 14 jours de façon prévisible.

### 5.2 Vidéos « archivées » (par le coach)

- Conservées côté hébergement.
- Soumises à un **quota d’archivage** défini par le plan (préférer une unité **Go** ou **minutes** plutôt qu’un simple nombre de fichiers si les tailles varient).

### 5.3 Élève archivé

- Les vidéos **non archivées** suivent la règle normale (purge à J+14).
- Les vidéos **déjà archivées** par le coach restent conservées dans la limite du quota plan.

### 5.4 Champs vidéo recommandés

| Champ | Rôle |
|-------|------|
| `is_archived` | Vidéo conservée volontairement |
| `archived_at` | Horodatage |
| `purge_after_at` | Date limite avant purge si non archivée |
| `purged_at` | Si besoin d’audit |
| `purge_reason` | `retention_expired`, etc. |

### 5.5 UX vidéo

- Badge : « Suppression dans X jours » vs « Archivée ».
- Compteur : archivées / quota plan.
- Notifications optionnelles avant purge (ex. J-3, J-1) pour laisser le temps d’archiver ce qui compte.

### 5.6 Réactivation élève

- Ne **restaure pas** les vidéos déjà purgées.

---

## 6. Tests & non-régression

### 6.1 Cas métier élève

- Archivage libère un slot ; réactivation le consomme.
- Réactivation bloquée si quota plein.
- Détail élève archivé : aucune mutation planning possible (vérifier UI + API).

### 6.2 Cas vidéo

- Upload → purge à J+14 si non archivée.
- Archivage vidéo avant J+14 → pas de purge (tant que quota OK).
- Désarchivage vidéo → reprise du cycle purge (ex. `purge_after_at = now + 14j`).
- Quota archivage atteint → refus + message.

### 6.3 Cas limites

- Upload en cours au moment de l’archivage élève / purge.
- Downgrade plan + élève archivé + état `is_active` existant : pas de conflit d’états ambigu.

---

## 7. Légal & communication

- Aligner les textes marketing (page facturation / rétention vidéo) avec la nouvelle politique.
- Mettre à jour CGU / politique de confidentialité si durée de conservation ou traitement des données change.
- Prévoir textes utilisateur courts pour coach et éventuellement élève.

---

## 8. Livrables attendus

- [ ] Schéma de données + migrations
- [ ] Endpoints liste + archivage / réactivation + erreurs métier
- [ ] Garde-fous serveur sur toutes les mutations concernées
- [ ] Job de purge vidéo + monitoring / logs
- [ ] UI onglets actifs / archivés + états lecture seule
- [ ] Tests automatisés (API + UI critique)
- [ ] Mise à jour documentation interne / changelog produit

---

## 9. Questions ouvertes (à cocher quand tranché)

- [ ] Comportement exact de l’app côté **élève** quand le coach archive le compte
- [ ] Unité et montants exacts du **quota d’archivage vidéo** par plan
- [ ] Notifications avant purge vidéo : oui/non + canaux
- [ ] Alignement avec la **rétention vidéo** actuellement affichée sur la page tarifs

---

*Fin du document — à compléter au fil des décisions produit.*
