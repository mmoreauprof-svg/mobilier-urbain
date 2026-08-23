# Procédures de test Utilisateur

## Sur PC

Deux façons d'utiliser l'app, selon le contexte — l'usage normal (§ ci-dessous) et le test de développement avec Claude (§ suivante) :

### Usage normal (sans Claude)

L'app est hébergée en ligne (GitHub Pages, cf. Specifications.md §3quater) à cette adresse fixe :

```
https://mmoreauprof-svg.github.io/mobilier-urbain/app/
```

1. Ouvrir cette adresse dans Chrome ou Edge.
2. **Installer l'app (optionnel)** — pour une fenêtre dédiée avec icône, sans barre d'adresse, comme une application classique :
   - Chercher une petite icône d'installation dans la barre d'adresse, à droite de l'URL (un écran avec une flèche, ou un `+` dans un rond).
   - Si elle n'apparaît pas : menu `⋮` (trois points, en haut à droite) → **Installer Mobilier Urbain...** (Chrome) ou **Applications → Installer ce site en tant qu'application** (Edge).
   - Confirmer. Une icône apparaît sur le Bureau / dans le menu Démarrer.
3. Une fois l'app chargée une première fois (avec connexion), elle reste utilisable **hors connexion** ensuite (cf. Specifications.md §4) — installée ou simplement ouverte en onglet, peu importe. Une connexion n'est nécessaire que pour charger l'app la toute première fois et pour récupérer les mises à jour publiées ensuite.

### Test de développement (avec Claude)

Pendant une session de travail sur le code avec Claude, on continue à tester en local plutôt que de publier chaque changement :

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

Plus besoin d'être sur le même Wi-Fi que le PC ni de passer par son adresse IP : l'app est hébergée en ligne (GitHub Pages), accessible depuis n'importe quelle connexion (Wi-Fi ou données mobiles).

```
https://mmoreauprof-svg.github.io/mobilier-urbain/app/
```

### Installer l'application

1. Sur le téléphone, ouvrir **Chrome** et aller à l'adresse ci-dessus.
2. Menu `⋮` (trois points, en haut à droite) → **Installer l'application** (ou **Ajouter à l'écran d'accueil**, le libellé exact dépend de la version de Chrome).
3. Confirmer. Une icône apparaît sur l'écran d'accueil.
4. Ouvrir l'app une première fois avec une connexion active, et éventuellement se déplacer/zoomer sur les rues à relever prochainement (met les tuiles de carte correspondantes en cache, cf. Specifications.md §4).

### Lancer l'application

1. Toucher l'icône sur l'écran d'accueil du téléphone.
2. L'app s'ouvre en plein écran, sans barre d'adresse Chrome.
3. **Fonctionne hors connexion** une fois installée (saisie, modification, suppression, export/import GPKG) — seules les zones de carte jamais consultées en ligne au préalable resteront vides sans connexion. Une connexion n'est nécessaire que pour la première installation et pour récupérer une mise à jour de l'app.

### Tests fonctionnels de l'application

[série de tests à décrire sous forme de parcours utilisateurs]

### Tests techniques de l'application

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application

[A décrire]

## Sous iOS

Même adresse que pour Android (aucun serveur local, aucune contrainte de Wi-Fi partagé). Sur iPhone, **seul Safari** permet d'installer l'app — pas Chrome.

```
https://mmoreauprof-svg.github.io/mobilier-urbain/app/
```

### Installer l'application

1. Sur l'iPhone, ouvrir **Safari** et aller à l'adresse ci-dessus.
2. Toucher l'icône **Partager** (carré avec une flèche vers le haut, en bas de l'écran).
3. Faire défiler la liste et toucher **Sur l'écran d'accueil**.
4. Vérifier/modifier le nom proposé, puis toucher **Ajouter** (en haut à droite).
5. Ouvrir l'app une première fois avec une connexion active, et éventuellement se déplacer/zoomer sur les rues à relever prochainement (met les tuiles de carte correspondantes en cache, cf. Specifications.md §4).

### Lancer l'application

1. Toucher l'icône sur l'écran d'accueil.
2. L'app s'ouvre en plein écran, sans barre Safari.
3. **Fonctionne hors connexion** une fois installée (saisie, modification, suppression, export/import GPKG) — seules les zones de carte jamais consultées en ligne au préalable resteront vides sans connexion. Une connexion n'est nécessaire que pour la première installation et pour récupérer une mise à jour de l'app.

### Tests fonctionnels de l'application

[série de tests à décrire sous forme de parcours utilisateurs]

### Tests techniques de l'application

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application

[A décrire]
