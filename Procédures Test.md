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

### Tests fonctionnels spécifiques sur PC Windows

Les tests communs (utilisation des fonctionnalités principales) sont décrits dans la section **Tests fonctionnels communs** en fin de document et s'appliquent tels quels sur PC. Aucun test fonctionnel spécifique au PC en plus des tests communs à ce jour.

### Tests techniques de l'application sur PC WIndows

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

**Bannière d'erreur rouge (en haut de l'écran)** — à surveiller pendant tous les tests ci-dessus : une bannière rouge fixe en haut de l'écran s'affiche pour tout problème qui pourrait autrement passer inaperçu (position GPS indisponible, chargement des données échoué, réseau instable pour le fond de carte, erreur inattendue). Elle se ferme avec le bouton `×` mais reste jusqu'à fermeture manuelle. Si elle apparaît de façon inattendue en usage normal, c'est le signal qu'il faut vérifier ce qui a échoué avant de continuer la saisie.

### Arrêter l'application sur PC WIndows

Fermer la fenêtre `cmd` du serveur local, ou `Ctrl+C` dans cette fenêtre puis confirmer. Fermer l'onglet du navigateur n'arrête pas le serveur.

## Sous Android

Plus besoin d'être sur le même Wi-Fi que le PC ni de passer par son adresse IP : l'app est hébergée en ligne (GitHub Pages), accessible depuis n'importe quelle connexion (Wi-Fi ou données mobiles).

```
https://mmoreauprof-svg.github.io/mobilier-urbain/app/
```

### Installer l'application sur Android

1. Sur le téléphone, ouvrir **Chrome** et aller à l'adresse ci-dessus.
2. Menu `⋮` (trois points, en haut à droite) → **Installer l'application** (ou **Ajouter à l'écran d'accueil**, le libellé exact dépend de la version de Chrome).
3. Confirmer. Une icône apparaît sur l'écran d'accueil.
4. Ouvrir l'app une première fois avec une connexion active, et éventuellement se déplacer/zoomer sur les rues à relever prochainement (met les tuiles de carte correspondantes en cache, cf. Specifications.md §4).

### Lancer l'application sur Android

1. Toucher l'icône sur l'écran d'accueil du téléphone.
2. L'app s'ouvre en plein écran, sans barre d'adresse Chrome.
3. **Fonctionne hors connexion** une fois installée (saisie, modification, suppression, export/import GPKG) — seules les zones de carte jamais consultées en ligne au préalable resteront vides sans connexion. Une connexion n'est nécessaire que pour la première installation et pour récupérer une mise à jour de l'app.

### Tests fonctionnels spécifiques Android

Les tests communs (utilisation des fonctionnalités principales) sont décrits dans la section **Tests fonctionnels communs** en fin de document et s'appliquent tels quels sur Android. Aucun test fonctionnel spécifique à Android en plus des tests communs à ce jour.

### Tests techniques de l'application sur Android

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application sur Android

[A décrire]

## Sous iOS

Même adresse que pour Android (aucun serveur local, aucune contrainte de Wi-Fi partagé). Sur iPhone, **seul Safari** permet d'installer l'app — pas Chrome.

```
https://mmoreauprof-svg.github.io/mobilier-urbain/app/
```

### Installer l'application sur iPhone

1. Sur l'iPhone, ouvrir **Safari** et aller à l'adresse ci-dessus.
2. Toucher l'icône **Partager** (carré avec une flèche vers le haut, en bas de l'écran).
3. Faire défiler la liste et toucher **Sur l'écran d'accueil**.
4. Vérifier/modifier le nom proposé, puis toucher **Ajouter** (en haut à droite).
5. Ouvrir l'app une première fois avec une connexion active, et éventuellement se déplacer/zoomer sur les rues à relever prochainement (met les tuiles de carte correspondantes en cache, cf. Specifications.md §4).

### Lancer l'application sur iPhone

1. Toucher l'icône sur l'écran d'accueil.
2. L'app s'ouvre en plein écran, sans barre Safari.
3. **Fonctionne hors connexion** une fois installée (saisie, modification, suppression, export/import GPKG) — seules les zones de carte jamais consultées en ligne au préalable resteront vides sans connexion. Une connexion n'est nécessaire que pour la première installation et pour récupérer une mise à jour de l'app.

### Tests fonctionnels spécifiques iPhone

Les tests communs (utilisation des fonctionnalités principales) sont décrits dans la section **Tests fonctionnels communs** en fin de document et s'appliquent tels quels sur iPhone. Aucun test fonctionnel spécifique à iPhone en plus des tests communs à ce jour.

### Tests techniques de l'application sur iPhone

[tests de non régression qu'il est plus facile à faire faire par l'utilisateur que de façon automatisée]

### Arrêter l'application sur iPhone
[A décrire]

## Tests fonctionnels communs

Ces parcours couvrent les fonctionnalités principales de l'application, communes aux trois plateformes. Chaque parcours est une succession d'actions concrètes avec un résultat attendu à chaque étape — à cocher au fur et à mesure du test.

**Avant de commencer** : suivre la procédure de lancement/installation de la plateforme testée (ci-dessus). Les parcours de la partie « Parcours nominaux » s'enchaînent dans l'ordre et réutilisent les objets créés aux étapes précédentes — les suivre dans l'ordre donne le test le plus efficace. La partie « Parcours avec erreurs / cas limites » peut être testée dans n'importe quel ordre, à la suite des parcours nominaux.

Si une **bannière rouge** apparaît de façon inattendue à un moment non prévu par un parcours, s'arrêter et noter le message avant de continuer (cf. « Bannière d'erreur rouge » ci-dessus).

### Parcours nominaux (utilisation normale)

#### Parcours A — Premier lancement et identification de l'appareil

Vérifie : §3bis des spécifications (code appareil, base du `uid`).

1. Lancer l'application pour la première fois sur cet appareil (données vides — cf. « Réinitialiser les données entre deux tests » ci-dessus si besoin de repartir de zéro).
   → **Attendu** : une fenêtre « Identification de l'appareil » s'affiche, demandant un code de 2 à 4 lettres.
2. Saisir un code de 2 lettres (ex. `MM`) et valider.
   → **Attendu** : la fenêtre se ferme, un petit encart « Appareil : MM » (ou le code saisi, en majuscules) apparaît en bas à gauche de la carte.
3. Recharger la page (F5 ou rouvrir l'app).
   → **Attendu** : la fenêtre d'identification **ne réapparaît pas** ; le code appareil reste affiché.

#### Parcours B — Carte et position

Vérifie : §6.1 (fond de carte, position temps réel, zoom/déplacement).

1. Observer la carte au chargement.
   → **Attendu** : fond de carte OpenStreetMap visible, centré par défaut sur Viroflay si aucune position n'est encore connue.
2. Autoriser la géolocalisation si le navigateur la demande.
   → **Attendu** : un point bleu apparaît à la position réelle (ou simulée sur PC, cf. ci-dessus) ; la carte se recentre dessus **une seule fois**.
3. Déplacer la carte (glisser), puis zoomer/dézoomer (molette, boutons +/-, ou pincer sur mobile).
   → **Attendu** : la carte répond normalement ; elle ne se recentre pas toute seule sur la position après ce premier recentrage.

#### Parcours C — Saisie d'un mobilier urbain (cas simple)

Vérifie : §6.2 (formulaire), §6.1 (icône, marqueur).

1. Ouvrir le formulaire d'ajout de mobilier urbain (bouton « + Mobilier » sur PC, onglet « Mobilier » sur mobile) alors qu'une position GPS récente est disponible.
   → **Attendu** : le formulaire s'ouvre directement (pas de demande de clic sur la carte).
2. Choisir Type = **Banc**, État = **Bon**, laisser Nombre = 1, laisser le commentaire vide.
3. Valider (« Enregistrer »).
   → **Attendu** : le formulaire se ferme, un nouveau marqueur en forme de banc apparaît sur la carte à la position actuelle, **sans badge numérique** (nombre = 1).
4. Toucher/cliquer ce marqueur.
   → **Attendu** : une bulle s'ouvre avec le type, l'état, le nombre, et deux boutons distincts « Modifier » et « Supprimer ».

#### Parcours D — Mobilier urbain avec quantité (badge)

Vérifie : §6.1 (badge de quantité).

1. Ajouter un nouveau mobilier urbain : Type = **Corbeille**, Nombre = **3**.
2. Valider.
   → **Attendu** : le marqueur corbeille affiche un petit badge numérique « 3 » superposé sur l'icône.
3. Ouvrir ce marqueur puis « Modifier » ; repasser Nombre à **1** ; valider.
   → **Attendu** : le badge disparaît, l'icône redevient simple.

#### Parcours E — Saisie d'un commerce vacant avec date de fermeture

Vérifie : §6.3 (formulaire commerce, état par défaut).

1. Ouvrir le formulaire d'ajout de commerce (« + Commerce » / onglet « Commerce »).
   → **Attendu** : l'État est pré-rempli sur **Vacant** par défaut.
2. Laisser le nom vide (local sans enseigne connue), Type = **Boulangerie**, renseigner une date de fermeture (mois/année), ajouter un commentaire libre.
3. Valider.
   → **Attendu** : marqueur commerce créé (icône couleur "vacant"), la bulle affiche « (local sans enseigne) », le type, l'état, la date de fermeture et le commentaire.
4. Ajouter un second commerce, cette fois avec un nom et État = **Occupé**.
   → **Attendu** : icône de couleur différente de celle du commerce vacant.

#### Parcours F — Modification d'un objet existant

Vérifie : §6.4 (édition, `last_update`).

1. Rouvrir le mobilier urbain créé au Parcours C (clic sur son marqueur → bouton « Modifier »).
   → **Attendu** : le formulaire s'ouvre pré-rempli avec les valeurs existantes (Type = Banc, État = Bon).
2. Changer l'État en **Mauvais**, ajouter un commentaire « Assise cassée ».
3. Valider.
   → **Attendu** : le formulaire se ferme, le marqueur reste au même endroit, sa bulle reflète le nouvel état et le commentaire.
4. Rouvrir ce même objet.
   → **Attendu** : les nouvelles valeurs sont bien celles pré-remplies (la modification a persisté).

#### Parcours G — Suppression d'un objet

Vérifie : §6.4 (suppression).

1. Cliquer sur le marqueur du second commerce créé au Parcours E, puis directement sur le bouton « Supprimer » du popup (sans passer par « Modifier »).
   → **Attendu** : une confirmation de suppression apparaît immédiatement, sans ouvrir de formulaire.
2. Confirmer la suppression demandée.
   → **Attendu** : le marqueur disparaît immédiatement de la carte.
3. Recharger la page.
   → **Attendu** : l'objet supprimé ne réapparaît pas (suppression bien persistée, pas seulement visuelle).

#### Parcours H — Filtre d'affichage par catégorie

Vérifie : §6.1quater.

1. Ouvrir le panneau de filtres (bouton « Filtres » PC, icône flottante mobile).
   → **Attendu** : les 6 catégories (5 types de mobilier + Commerces) sont cochées par défaut.
2. Décocher « Bancs ».
   → **Attendu** : le marqueur banc créé au Parcours C disparaît de la carte immédiatement (la corbeille et les commerces restent visibles).
3. Recocher « Bancs ».
   → **Attendu** : le marqueur banc réapparaît.
4. Décocher « Commerces », puis créer un nouveau commerce (Parcours E) pendant que la catégorie est masquée.
   → **Attendu** : le nouveau commerce est enregistré (vérifiable en rouvrant les filtres) mais **reste invisible** sur la carte tant que « Commerces » n'est pas recoché.
5. Recocher « Commerces ».
   → **Attendu** : tous les commerces, y compris celui créé à l'étape 4, apparaissent.

#### Parcours I — Export GPKG

Vérifie : §6.5, §6.5bis (6 couches, nom de fichier).

1. Avec plusieurs objets enregistrés (Parcours C à H), cliquer « Exporter » (PC) ou onglet « Fichier » → « Exporter les données » (mobile).
   → **Attendu** : selon la plateforme, une boîte de dialogue « Enregistrer sous » s'ouvre (Android/PC), ou une feuille de partage (iPhone), ou un téléchargement démarre.
2. Choisir un emplacement facile à retrouver (ex. dossier Téléchargements) et confirmer.
   → **Attendu** : un fichier `mobilier_urbain_<CODE>_<AAAA-MM-JJ>.gpkg` est produit, sans message d'erreur.
3. *(Optionnel si QGIS est disponible)* Ouvrir le fichier dans QGIS.
   → **Attendu** : 6 couches visibles (`banc`, `corbeille`, `distributeur_sacs`, `arret_bus`, `abri_bus`, `commerce`), chacune avec un nom lisible en français, contenant les objets créés dans ce parcours avec leurs bons attributs.

#### Parcours J — Import GPKG (remplacer)

Vérifie : §6.5 (import, mode Remplacer).

1. Noter/mémoriser le nombre d'objets actuellement affichés sur la carte.
2. Cliquer « Importer » (PC) ou onglet « Fichier » → « Importer un fichier » (mobile), puis sélectionner le fichier exporté au Parcours I.
   → **Attendu** : après lecture du fichier, une fenêtre propose « Fusionner » / « Remplacer tout » / « Annuler ».
3. Choisir **Remplacer tout**.
   → **Attendu** : la carte se vide puis se repeuple avec exactement les objets du fichier importé (même nombre qu'au moment de l'export).

#### Parcours K — Import GPKG (fusionner)

Vérifie : §6.5 (import, mode Fusionner, dédoublonnage par `uid`, mise à jour si plus récent).

1. Sur le même appareil (ou, idéalement, sur le **second téléphone** si deux appareils sont disponibles), créer 1 ou 2 nouveaux objets qui n'existaient pas dans le fichier du Parcours I.
2. Importer à nouveau le fichier du Parcours I, choisir **Fusionner**.
   → **Attendu** : les objets du fichier s'ajoutent à la base locale ; les objets créés à l'étape 1 (absents du fichier) restent présents ; aucun objet n'est dupliqué (les `uid` déjà connus localement sont ignorés) ; le message de confirmation détaille le nombre d'objets ajoutés / mis à jour / ignorés.
3. Importer le fichier une seconde fois, à nouveau en Fusionner, **sans avoir rien modifié entre-temps**.
   → **Attendu** : le nombre total d'objets sur la carte **ne change pas** — tous les `uid` du fichier existent déjà localement avec la même date de modification, donc tout est ignoré (pas mis à jour) ; le message le confirme.
4. Modifier localement un objet présent dans ce fichier (ex. changer son état), puis réimporter **ce même fichier (plus ancien)** en Fusionner.
   → **Attendu** : la modification locale **n'est pas écrasée** par la version plus ancienne du fichier — le message de confirmation indique cet objet comme ignoré, pas mis à jour.
5. *(Si un second appareil est disponible)* Importer un fichier exporté par l'autre appareil **après** votre dernière synchronisation, contenant une version plus récente (`last_update` plus tardif) d'un objet que vous avez aussi en local.
   → **Attendu** : cette fois l'objet local **est mis à jour** avec les valeurs importées (visible sur la carte et dans le message de confirmation, qui l'indique comme mis à jour).

#### Parcours L — Sélection manuelle d'un point (repli sans GPS)

Vérifie : §6.4bis.

1. Sans position GPS disponible (sur PC sans simulation DevTools, ou en refusant l'autorisation de géolocalisation), cliquer « + Mobilier » ou « + Commerce ».
   → **Attendu** : au lieu du formulaire, un message bleu apparaît en bas de l'écran (« Cliquez sur la carte pour choisir l'emplacement — ou ici pour annuler ») et le curseur change de forme au-dessus de la carte.
2. Cliquer un point quelconque sur la carte.
   → **Attendu** : le message disparaît, le formulaire s'ouvre normalement.
3. Remplir et valider le formulaire.
   → **Attendu** : le nouveau marqueur apparaît exactement à l'endroit cliqué à l'étape 2.

#### Parcours M — Bascule d'interface PC / mobile (PC uniquement, redimensionnement de fenêtre)

Vérifie : §6.6 (bascule responsive à 768px).

1. Sur PC, avec la fenêtre du navigateur large (> 768px), observer l'interface.
   → **Attendu** : barre d'outils fine en haut à gauche, pas de barre d'onglets en bas.
2. Réduire progressivement la largeur de la fenêtre en dessous de 768px.
   → **Attendu** : la barre d'outils disparaît, une barre d'onglets (Carte / Mobilier / Commerce / Fichier) apparaît en bas de l'écran, l'icône filtre flottante remplace le bouton « Filtres » de la barre d'outils.
3. Ouvrir un formulaire (onglet « Mobilier ») dans cette configuration étroite.
   → **Attendu** : le formulaire occupe l'écran plein (au-dessus de la barre d'onglets), au lieu d'une petite bulle ancrée à un point de la carte.
4. Élargir à nouveau la fenêtre au-dessus de 768px.
   → **Attendu** : retour à la barre d'outils PC.

#### Parcours N — Ergonomie de saisie PC (raccourcis clavier, panneau déplaçable, validation par Entrée, mémorisation du type)

Vérifie : §6.6 (ergonomie des panneaux), §6.6bis (raccourcis clavier) — **PC uniquement**, fenêtre ≥ 768px.

1. Sur la carte, sans aucun panneau ouvert ni champ de saisie sous le focus, appuyer sur la touche **M**.
   → **Attendu** : le panneau « Nouveau mobilier urbain » s'ouvre, comme un clic sur « + Mobilier ».
2. Observer où se trouve le focus clavier à l'ouverture.
   → **Attendu** : le bouton « Enregistrer » a le focus (contour/halo visible), pas la liste Type.
3. Appuyer successivement sur les touches **1** à **5**, sans rien cliquer.
   → **Attendu** : la liste « Type » change à chaque touche, dans l'ordre Banc (1), Corbeille (2), Distributeur de sacs (3), Arrêt de bus (4), Abri bus (5).
4. Appuyer sur **Entrée**.
   → **Attendu** : le panneau se ferme, l'objet est enregistré avec le type sélectionné à l'étape 3.
5. Appuyer de nouveau sur **M**.
   → **Attendu** : le panneau se rouvre avec le Type **pré-rempli sur le dernier type utilisé** (pas « Banc » par défaut), et le focus déjà sur « Enregistrer ».
6. Sans toucher à rien d'autre, appuyer directement sur **Entrée**.
   → **Attendu** : un nouvel objet du même type s'enregistre immédiatement — aucune interaction souris n'est nécessaire pour enchaîner plusieurs saisies du même type.
7. Rouvrir un panneau, cliquer dans le champ « Commentaire » et taper la lettre « c ».
   → **Attendu** : la lettre « c » s'écrit normalement dans le champ — le raccourci « C » (ouverture du panneau Commerce) **ne se déclenche pas** pendant la saisie de texte.
8. Fermer le panneau, en rouvrir un, puis le faire glisser par son titre (cliquer-glisser à la souris).
   → **Attendu** : le panneau suit la souris et se déplace ; les listes déroulantes et champs à l'intérieur restent utilisables normalement après le déplacement.
9. Réduire la fenêtre sous 768px (bascule vers l'affichage mobile) et répéter les étapes 1 et 3.
   → **Attendu** : les touches M/C et les chiffres n'ont plus aucun effet (pas de panneau qui s'ouvre, pas de changement de type) — ces raccourcis sont réservés au PC.

### Parcours avec erreurs / cas limites

#### Erreur 1 — Code appareil invalide au premier lancement

1. Au premier lancement, dans la fenêtre d'identification, saisir un code invalide : d'abord un chiffre (`M1`), puis valider.
   → **Attendu** : message d'erreur clair (« Entrez 2 à 4 lettres... »), la fenêtre reste ouverte, aucun code n'est enregistré.
2. Laisser le champ vide et valider.
   → **Attendu** : même message d'erreur.
3. Saisir un code trop long (`TROPLONG`) et valider.
   → **Attendu** : même message d'erreur.
4. Saisir enfin un code valide (`MM`) et valider.
   → **Attendu** : cette fois la fenêtre se ferme normalement (cf. Parcours A).

#### Erreur 2 — Géolocalisation refusée

1. Au lancement, refuser explicitement l'autorisation de géolocalisation demandée par le navigateur.
   → **Attendu** : une bannière rouge « Position GPS indisponible — vérifiez que la géolocalisation est autorisée pour ce site » apparaît (une seule fois, pas en boucle).
2. Cliquer « + Mobilier ».
   → **Attendu** : comportement du Parcours L (repli sur sélection manuelle), pas de blocage ni d'erreur JavaScript.
3. Fermer la bannière rouge (bouton `×`), puis réautoriser la géolocalisation dans les paramètres du navigateur et recharger la page.
   → **Attendu** : le point bleu apparaît normalement, plus de bannière.

#### Erreur 3 — Annulation d'une sélection manuelle de point en cours

Vérifie la robustesse du repli §6.4bis.

1. Sans position GPS, cliquer « + Mobilier » (message de sélection affiché, cf. Parcours L étape 1).
2. Cliquer sur le message bleu lui-même (« ...ou ici pour annuler ») plutôt que sur la carte.
   → **Attendu** : le message disparaît, le curseur redevient normal, **aucun formulaire ne s'ouvre**.
3. Recliquer « + Mobilier », puis, avant de cliquer sur la carte, cliquer « + Commerce ».
   → **Attendu** : la première sélection (mobilier) s'annule proprement ; une nouvelle sélection démarre pour le commerce, sans les mélanger.
4. Cliquer sur la carte pour terminer cette seconde sélection, puis cliquer « Annuler » dans le formulaire qui s'ouvre.
   → **Attendu** : le formulaire se ferme sans rien enregistrer. Recliquer ensuite « + Mobilier » ou « + Commerce » doit permettre de refaire une sélection propre, sans blocage résiduel.

#### Erreur 4 — Doublon détecté : refus puis acceptation

Vérifie : §6.1bis (seuil de 5 mètres).

1. Sans bouger, ajouter un second **Banc** au même endroit que celui du Parcours C (moins de 5 mètres).
   → **Attendu** : une confirmation apparaît (« Un Banc existe déjà à moins de 5 m — enregistrer quand même ? »).
2. Répondre **Non/Annuler**.
   → **Attendu** : rien n'est enregistré, aucun second marqueur n'apparaît.
3. Refaire la même saisie (Banc, même endroit) et répondre **Oui**.
   → **Attendu** : le second banc est bien enregistré cette fois (deux marqueurs très proches l'un de l'autre).
4. Ajouter un objet d'un **type différent** (ex. Corbeille) au même endroit exact.
   → **Attendu** : **aucune** confirmation de doublon (le seuil ne s'applique qu'entre objets du même type).

#### Erreur 5 — Annulation d'un formulaire en cours de saisie

1. Ouvrir le formulaire d'ajout d'un commerce, remplir plusieurs champs, puis cliquer « Annuler » (pas « Enregistrer »).
   → **Attendu** : le formulaire se ferme, **aucun** nouvel objet n'apparaît sur la carte.
2. Rouvrir un objet existant en modification, changer une valeur, puis cliquer « Annuler ».
   → **Attendu** : l'objet garde ses valeurs d'origine (vérifiable en le rouvrant).

#### Erreur 6 — Import d'un fichier invalide

1. Créer ou récupérer un fichier qui n'est **pas** un export valide de l'application (ex. renommer un fichier `.txt` quelconque en `.gpkg`, ou utiliser une photo).
2. Lancer l'import et sélectionner ce fichier.
   → **Attendu** : un message d'erreur clair apparaît (« Fichier illisible ou invalide... »), **aucune donnée locale n'est modifiée** (vérifier que les objets existants sont toujours là).
3. Relancer un import valide juste après (fichier du Parcours I).
   → **Attendu** : fonctionne normalement — l'échec précédent n'a rien cassé.

#### Erreur 7 — Import du même fichier deux fois de suite en fusionnant

*(Doublon du Parcours K étape 3, reformulé comme test d'erreur utilisateur — un geste qu'un utilisateur pressé pourrait faire par mégarde.)*

1. Importer un fichier en mode **Fusionner**.
2. Sans rien faire d'autre, relancer immédiatement le même import, à nouveau en **Fusionner**.
   → **Attendu** : aucun objet en double sur la carte ni dans un export ultérieur — le second import n'a aucun effet visible.

#### Erreur 8 — Masquer toutes les catégories du filtre

1. Ouvrir le panneau de filtres et décocher les 6 catégories une par une.
   → **Attendu** : la carte se vide complètement de tout marqueur (mobilier + commerce), sans erreur ni blocage de l'interface.
2. Essayer d'ajouter un nouveau mobilier urbain dans cet état (toutes catégories masquées).
   → **Attendu** : la saisie fonctionne normalement (formulaire, enregistrement) ; l'objet est bien créé en base mais reste invisible tant que sa catégorie n'est pas recochée.
3. Recocher toutes les catégories.
   → **Attendu** : tous les objets (y compris celui créé à l'étape 2) réapparaissent d'un coup.

#### Erreur 9 — Perte du signal GPS en cours d'usage

*(Sur téléphone : passer en mode avion quelques secondes puis le désactiver. Sur PC : dans DevTools → Sensors → Location, choisir "Unavailable" puis revenir à une position simulée.)*

1. Utiliser l'app normalement avec une position GPS active (point bleu visible).
2. Couper la géolocalisation (mode avion, ou "Unavailable" dans DevTools).
   → **Attendu** : après quelques secondes, la bannière « Position GPS indisponible » apparaît une seule fois (pas de répétition en boucle).
3. Essayer d'ajouter un mobilier urbain pendant cette coupure.
   → **Attendu** : comportement du Parcours L (repli sur sélection manuelle sur la carte).
4. Réactiver la géolocalisation.
   → **Attendu** : le point bleu réapparaît, un nouvel ajout redevient direct (sans repli manuel).

#### Erreur 10 — Usage hors connexion avant / après installation

*(Spécifique Android/iPhone — sur PC, l'usage nécessite toujours le serveur local donc ce parcours n'a de sens qu'en usage normal via GitHub Pages.)*

1. **Avant** toute installation ni ouverture préalable de l'app sur cet appareil, couper la connexion réseau (mode avion) puis essayer d'ouvrir l'adresse de l'app.
   → **Attendu** : l'app ne peut pas se charger (comportement normal du navigateur pour une page jamais visitée) — ce n'est **pas** un bug.
2. Réactiver la connexion, ouvrir l'app normalement une première fois, l'installer (cf. procédure d'installation ci-dessus), l'utiliser un peu (créer un objet, se déplacer/zoomer sur la carte).
3. Couper à nouveau la connexion (mode avion), puis relancer l'app depuis son icône.
   → **Attendu** : l'app s'ouvre normalement, la carte et les objets déjà créés s'affichent, la saisie (mobilier, commerce, modification, suppression) fonctionne. Seules les zones de carte **jamais affichées en ligne auparavant** doivent apparaître vides (gris) au lieu des tuiles OpenStreetMap.
4. Toujours hors connexion, essayer un export GPKG.
   → **Attendu** : l'export fonctionne (il ne nécessite pas de réseau, tout se passe en local).
5. Réactiver la connexion.
   → **Attendu** : retour à la normale, aucune donnée perdue pendant la coupure.


