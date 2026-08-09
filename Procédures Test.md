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

### Lancement direct, sans serveur (aperçu rapide uniquement)

Aujourd'hui, double-cliquer sur `app/index.html` ouvre la carte directement dans le navigateur, sans passer par la commande ci-dessus — pratique pour un coup d'œil rapide.

⚠️ **Cette méthode cessera de fonctionner correctement dès que l'application utilisera le stockage local (IndexedDB, prévu à l'étape 4)** : les navigateurs bloquent ce stockage pour les pages ouvertes en double-clic (protocole `file://`). À partir de ce moment, **toujours utiliser la méthode par serveur local** ci-dessus pour les tests.

## Android

*(à compléter ensemble)*

## iPhone

*(à compléter ensemble)*

## Checklist de non-régression cumulative

*(cette section grandit à chaque itération de l'étape 4 — voir explication de la démarche dans le journal/les échanges avec Claude)*


