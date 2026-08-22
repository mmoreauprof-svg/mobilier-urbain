# Procédures de test Utilisateur

## Sur PC

### Lancer l'application

**Lancement via fenêtre de commande (cmd)**

1. Ouvrir une fenêtre `cmd` (touche Windows → taper `cmd` → Entrée).
2. Se placer dans le dossier de l'application :
   ```
   cd /d "C:\Users\mmore\Documents\ClaudeCode\MobilierUrbain\app"
   ```
3. Démarrer le serveur de test local :
   ```
   python -m http.server 8000
   ```
   La fenêtre reste ouverte tant que le serveur tourne.
4. Ouvrir un navigateur (Chrome, Edge, Firefox) à l'adresse :
   ```
   http://localhost:8000
   ```

Astuce : les 2 dernières étapes peuvent être combinées en une seule ligne, qui ouvre le navigateur puis démarre le serveur :
```
start http://localhost:8000 & python -m http.server 8000
```
(si la page affiche une erreur de connexion, attendre 1 seconde et rafraîchir — le serveur démarre juste après l'ouverture du navigateur.)

⚠️ Double-cliquer directement sur `app/index.html` ne fonctionne plus correctement depuis que l'application utilise le stockage local (IndexedDB) : les navigateurs bloquent ce stockage pour les pages ouvertes en double-clic (protocole `file://`). Toujours utiliser la méthode par serveur local ci-dessus pour les tests.

**Activer la géolocalisation dans Chrome (si la carte ne demande pas la position)**

1. Vérifier le service de localisation Windows : `Paramètres Windows` → `Confidentialité et sécurité` → `Localisation` → activer le bouton principal, et vérifier que Chrome est autorisé dans la liste des applications.
2. Vérifier l'autorisation du site dans Chrome : cliquer sur l'icône à gauche de l'adresse (`localhost:8000`) dans la barre d'adresse → `Autorisations du site` → `Position` → remettre sur "Demander" ou "Autoriser" (si déjà sur "Bloquer", Chrome ne redemande jamais).
3. Recharger la page — la demande d'autorisation doit apparaître.

En cas de doute sur la cause d'un blocage : `F12` → onglet `Console` → recharger la page → lire le message commençant par « Géolocalisation indisponible : ... ».

**Simuler une position GPS précise (alternative fiable, PC sans GPS)**

`F12` → menu `⋮` → `More tools` / `Plus d'outils` → `Sensors` → section `Location` → choisir des coordonnées personnalisées (ex. Viroflay : `48.8032, 2.1673`).

**Réinitialiser les données entre deux tests**

Le stockage local (position, mobilier urbain, commerces, code appareil) est **volontairement permanent** d'une session à l'autre — c'est une fonctionnalité, pas un bug. Pour repartir d'une base vide avant un nouveau test :

- **Via les outils développeur (méthode simple)** : `F12` → onglet `Application` → section `Storage` (panneau de gauche) → bouton `Clear site data`.
- **Via la console (plus rapide)** : `F12` → onglet `Console`, coller puis valider :
  ```
  localStorage.clear(); indexedDB.deleteDatabase('MobilierUrbainDB'); location.reload();
  ```

Note : Claude ne peut pas réinitialiser les données de votre navigateur depuis la conversation — ses propres vérifications automatisées tournent dans un navigateur séparé, isolé du vôtre.

**Si une modification récente ne semble pas s'appliquer (cache du navigateur)**

Le navigateur garde en mémoire une copie des fichiers de l'application (JS, CSS) d'une visite à l'autre pour aller plus vite — après une mise à jour du code, il arrive qu'il continue d'utiliser l'ancienne copie au lieu de recharger la nouvelle. Symptôme typique : une fonctionnalité annoncée comme prête ne se comporte pas comme décrit, sans message d'erreur.

- **Rechargement forcé** : `Ctrl+F5` (ou `Ctrl+Maj+R`) au lieu d'un simple `F5`/rafraîchissement.
- Si ça ne suffit pas : `F12` → onglet `Application` → `Storage` → `Clear site data` (efface aussi les données, cf. ci-dessus) puis recharger.

### Tests fonctionnels de l'application

[série de tests à décrire sous forme de parcours utilisateurs]

### Tests techniques de l'application

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

**Bannière d'erreur rouge (en haut de l'écran)** — à surveiller pendant tous les tests ci-dessus : une bannière rouge fixe en haut de l'écran s'affiche pour tout problème qui pourrait autrement passer inaperçu (position GPS indisponible, chargement des données échoué, réseau instable pour le fond de carte, erreur inattendue). Elle se ferme avec le bouton `×` mais reste jusqu'à fermeture manuelle. Si elle apparaît de façon inattendue en usage normal, c'est le signal qu'il faut vérifier ce qui a échoué avant de continuer la saisie.

### Arrêter l'application

Fermer la fenêtre `cmd` du serveur local, ou `Ctrl+C` dans cette fenêtre puis confirmer. Fermer l'onglet du navigateur n'arrête pas le serveur.

## Sous Android

### Installer l'application

[A décrire]

### Lancer l'application

[A décrire]

### Tests fonctionnels de l'application

[série de tests à décrire sous forme de parcours utilisateurs]

### Tests techniques de l'application

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application

[A décrire]

## Sous iOS

### Installer l'application

[A décrire]

### Lancer l'application

[A décrire]

### Tests fonctionnels de l'application

[série de tests à décrire sous forme de parcours utilisateurs]

### Tests techniques de l'application

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application

[A décrire]
