# Procédures de test Utilisateur

## PC

### Lancement via fenêtre de commande (cmd)

1. Ouvrir une fenêtre `cmd` (touche Windows → taper `cmd` → Entrée).
2. Se placer dans le dossier de l'application :
   ```
   cd /d "C:\Users\mmore\Documents\ClaudeCode\MobilierUrbain\app"
   ```
3. Démarrer le serveur de test local :
   ```
   python -m http.server 8000
   ```
   La fenêtre reste ouverte tant que le serveur tourne (fermer la fenêtre ou `Ctrl+C` pour l'arrêter).
4. Ouvrir un navigateur (Chrome, Edge, Firefox) à l'adresse :
   ```
   http://localhost:8000
   ```

Astuce : les 2 dernières étapes peuvent être combinées en une seule ligne, qui ouvre le navigateur puis démarre le serveur :
```
start http://localhost:8000 & python -m http.server 8000
```
(si la page affiche une erreur de connexion, attendre 1 seconde et rafraîchir — le serveur démarre juste après l'ouverture du navigateur.)

### Activer la géolocalisation dans Chrome (si la carte ne demande pas la position)

1. Vérifier le service de localisation Windows : `Paramètres Windows` → `Confidentialité et sécurité` → `Localisation` → activer le bouton principal, et vérifier que Chrome est autorisé dans la liste des applications.
2. Vérifier l'autorisation du site dans Chrome : cliquer sur l'icône à gauche de l'adresse (`localhost:8000`) dans la barre d'adresse → `Autorisations du site` → `Position` → remettre sur "Demander" ou "Autoriser" (si déjà sur "Bloquer", Chrome ne redemande jamais).
3. Recharger la page — la demande d'autorisation doit apparaître.

En cas de doute sur la cause d'un blocage : `F12` → onglet `Console` → recharger la page → lire le message commençant par « Géolocalisation indisponible : ... ».

### Réinitialiser les données entre deux tests

Le stockage local (position, mobilier urbain, commerces, code appareil) est **volontairement permanent** d'une session à l'autre — c'est une fonctionnalité, pas un bug. Pour repartir d'une base vide avant un nouveau test :

- **Via les outils développeur (méthode simple)** : `F12` → onglet `Application` → section `Storage` (panneau de gauche) → bouton `Clear site data`.
- **Via la console (plus rapide)** : `F12` → onglet `Console`, coller puis valider :
  ```
  localStorage.clear(); indexedDB.deleteDatabase('MobilierUrbainDB'); location.reload();
  ```

Note : Claude ne peut pas réinitialiser les données de votre navigateur depuis la conversation — ses propres vérifications automatisées tournent dans un navigateur séparé, isolé du vôtre.

### Simuler une position GPS précise (alternative fiable, PC sans GPS)

`F12` → menu `⋮` → `More tools` / `Plus d'outils` → `Sensors` → section `Location` → choisir des coordonnées personnalisées (ex. Viroflay : `48.8032, 2.1673`).

### Lancement direct, sans serveur (aperçu rapide uniquement)

Aujourd'hui, double-cliquer sur `app/index.html` ouvre la carte directement dans le navigateur, sans passer par la commande ci-dessus — pratique pour un coup d'œil rapide.

⚠️ **Cette méthode cessera de fonctionner correctement dès que l'application utilisera le stockage local (IndexedDB, prévu à l'étape 4)** : les navigateurs bloquent ce stockage pour les pages ouvertes en double-clic (protocole `file://`). À partir de ce moment, **toujours utiliser la méthode par serveur local** ci-dessus pour les tests.

### Bannière d'erreur rouge (en haut de l'écran)

Depuis le 2026-08-22, une bannière rouge fixe en haut de l'écran s'affiche pour tout problème qui pourrait autrement passer inaperçu (position GPS indisponible, chargement des données échoué, réseau instable pour le fond de carte, erreur inattendue). Elle se ferme avec le bouton `×` mais reste jusqu'à fermeture manuelle. Si elle apparaît de façon inattendue en usage normal, c'est le signal qu'il faut vérifier ce qui a échoué avant de continuer la saisie.

## Android

*(à compléter ensemble)*

## iPhone

*(à compléter ensemble)*

## Checklist de non-régression cumulative

*(cette section grandit à chaque itération de l'étape 4 — voir explication de la démarche dans le journal/les échanges avec Claude)*


