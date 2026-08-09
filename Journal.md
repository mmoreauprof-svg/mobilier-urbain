# Journal de session — Projet Application Mobilier Urbain

## Format d'entrée
`[Date AAAA-MM-JJ] : [Type d'action] — [Description]`

**Types d'action :**
- Spécification (pour rédaction ou mise à jour des spécifications)
- Développement (pour le développement de nouvelles fonctionnalités, corrections d'anomalies etc.)
- Test (pour le test d'une nouvelle version)
- Release (pour le freeze et la mise à disposition d'une nouvelle version.
- Autre

**Description :**
- 300 caractères max (actions effectués, fichier produit ou modifié...)

---

## Entrées

<!-- Les nouvelles entrées doivent être ajoutées en fin de fichier par ordre chronologique après chaque session significative. -->
2026-08-08 - Autre - Démarrage du projet
2026-08-08 - Spécification - Discussion avec l'utilisateur pour établir une première version des spécifications dans 'Specifications.md'
2026-08-09 - Spécification - Relecture complète des specs : usage à deux téléphones (Android+iPhone), uid inter-appareils, import/export (3 flux, remplacer/fusionner), stratégie de test sans GPS, état commerce Occupé/Vacant, zoom/déplacement carte, emplacement fichiers export/import selon plateforme.
2026-08-09 - Autre - Étape 2 (choix technique) finalisée : PWA sans bundler ni framework, librairies vendorisées, serveur de test 'python -m http.server'.
2026-08-09 - Autre - Étape 3 (1/2) : création de la structure de dossiers (app/css, app/js, app/lib), ajout de '.gitignore', initialisation du dépôt Git local et premier commit (1cb75bb).
2026-08-09 - Autre - Étape 3 (2/2, actions 1-3) : structure de dossiers, dépôt Git local et éditeur de code confirmés. Éditeur retenu : Notepad++ (déjà installé sur le PC), en alternative à VS Code.
2026-08-09 - Développement - Étape 3, action 4 : librairies vendorisées dans 'app/lib/' — Leaflet 1.9.4 (leaflet.js, leaflet.css, icônes marqueur) et geopackage-js 4.2.8 (geopackage.min.js, sql-wasm.wasm), téléchargées depuis unpkg.com.
2026-08-09 - Développement - Étape 3, action 5 : squelette PWA minimal créé ('app/index.html', 'css/style.css', 'js/app.js') — carte OSM centrée sur Viroflay via Leaflet, zoom/déplacement fonctionnels. Testé avec succès dans le navigateur via 'python -m http.server'.
2026-08-09 - Test - Rédaction de la procédure de lancement PC dans 'Procédures Test.md' (commande cmd + serveur local, limite du lancement direct par double-clic). Sections Android/iPhone et checklist de non-régression laissées à compléter ensemble.
2026-08-09 - Test - Création de 'Tests-Automatises.md' : démarche des vérifications autonomes de Claude (logique pure via 'app/tests/test.html' à venir, parcours fonctionnel via l'outil navigateur), distincte des tests utilisateur manuels.
2026-08-09 - Autre - Étape 3 finalisée : structure de dossiers, dépôt Git local, éditeur (Notepad++), librairies vendorisées, squelette PWA (carte OSM fonctionnelle), procédures de test PC et démarche de tests automatisés en place. Squelette commité (2b8531c).
2026-08-09 - Développement - Étape 4, points 1-2 : position GPS temps réel sur la carte ('app/js/position.js', point bleu, recentrage au premier fix) et identification de l'appareil ('app/js/device.js', modal de saisie du code appareil 2-4 lettres au premier lancement, stocké en localStorage). Code réorganisé en 'map.js' / 'position.js' / 'device.js'. Vérifications autonomes passées (validation du code, persistance après rechargement, absence d'erreur console). Non commité, en attente du test utilisateur PC.
2026-08-09 - Test - Points 1-2 validés par l'utilisateur sur PC (cause du blocage géolocalisation : autorisation Chrome désactivée). Procédure d'activation de la géolocalisation (service Windows + autorisation site Chrome + simulation DevTools) ajoutée à 'Procédures Test.md'.
2026-08-09 - Développement - Étape 4, point 3 : stockage local IndexedDB ('app/js/storage.js', bases 'mobilier_urbain'/'commerce', clé = uid) et calcul géométrique pur ('app/js/geo.js', distance et détection de proximité).
2026-08-09 - Développement - Étape 4, point 4 : saisie d'un mobilier urbain ('app/js/mobilier.js') — bouton, formulaire, génération de uid, détection de doublon à 5 m avec confirmation, affichage du marqueur, restauration automatique au démarrage. Création de 'app/tests/test.html' (11 assertions, 11/11 OK) conformément à 'Tests-Automatises.md'. Vérifications fonctionnelles autonomes concluantes (enregistrement, doublon accepté/refusé, persistance après rechargement). Non commité, en attente du test utilisateur PC.
2026-08-09 - Test - Points 3-4 validés par l'utilisateur sur PC. Commit du code (b9cbf8b) et de la documentation associée (f6ca302).

