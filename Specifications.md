# Spécifications — Application de recensement mobilier urbain & commerces

> Ce document remplace et détaille `CdC AppliMobilier.md` (conservé comme archive). Il est mis à jour au fil de nos échanges. Chaque décision validée est marquée ✅, chaque point encore ouvert est marqué ❓.

## 1. Objectif

Application mobile personnelle permettant de recenser sur le terrain, à Viroflay, le mobilier urbain (bancs, corbeilles, arrêts de bus…) et les commerces, en pointant leur position sur une carte, puis de conserver ces données et de les exporter vers un SIG (QGIS).

Le recensement des commerces vise en particulier à **identifier les locaux commerciaux vacants**, en vue d'y installer de nouveaux commerces — d'où l'attention portée à l'état (occupé/vacant) et à la date de fermeture.

## 2. Contexte d'usage ✅ (revu)

- Usage **à deux**, chacun sur son téléphone (un **Android** et un **iPhone**), en parallèle sur le terrain — pas de compte, pas de backend, pas de synchronisation automatique entre les deux téléphones.
- La fusion des relevés des deux téléphones se fait **manuellement dans QGIS**, à partir des fichiers `.gpkg` exportés par chacun.
- Pas de publication sur un store (Play Store / App Store).
- Utilisation **hors-ligne pendant la saisie sur le terrain** ✅ (revu le 2026-08-23, cf. §4) : une connexion est nécessaire pour installer l'app et pour récupérer les mises à jour, mais pas pour l'utiliser une fois installée.
- ⚠️ **Limite de vie privée connue et acceptée** (rapport d'audit du 23/08, point 2) : chaque tuile de carte affichée est demandée directement au serveur de tuiles OpenStreetMap, avec les coordonnées de la zone visible dans l'URL — comportement standard de l'usage direct d'OSM, pas un défaut d'implémentation. Cela signifie que le serveur de tuiles (et tout observateur du trafic réseau) peut déduire la position approximative de l'utilisateur à chaque affichage de carte, y compris hors d'une saisie. Décision assumée : aucune donnée de relevé n'est concernée (elle reste locale, cf. ci-dessus), seul l'usage normal de la carte l'est.

## 3. Architecture technique ✅

**PWA (Progressive Web App)** — installable sur l'écran d'accueil Android et iPhone depuis un seul code HTML/CSS/JS.

| Besoin | Choix technique | Raison |
|---|---|---|
| Fond de carte | Leaflet.js + tuiles OpenStreetMap | Gratuit, sans clé API, bien documenté |
| Position temps réel | API `navigator.geolocation.watchPosition` | Standard navigateur, suffisant en usage premier-plan |
| Stockage persistant | IndexedDB | Les relevés restent sur le téléphone d'une session à l'autre |
| Import / Export SIG | Format **GPKG**, via la librairie [`geopackage-js`](https://github.com/ngageoint/geopackage-js) (NGA) | Fonctionne en navigateur (WebAssembly / sql.js), lit et écrit de vrais fichiers `.gpkg` compatibles QGIS. Confirmé faisable ✅ |
| Installation | Ajout à l'écran d'accueil (manifest + service worker) | Se comporte comme une app native, sans store |

**Outillage de développement** ✅ : pas de bundler ni de framework — HTML/CSS/JS natifs (modules JS du navigateur), dans la continuité de votre pratique HTML historique. Les librairies (Leaflet, geopackage-js) sont téléchargées une fois et rangées dans le projet, sans dépendance à un CDN à l'usage. Serveur local de test : `python -m http.server` (Python déjà installé) — pas besoin de Node.js.

⚠️ **Conséquence assumée** (rapport d'audit du 23/08, point 4) : sans gestionnaire de paquets ni bundler, aucun outil type `npm audit` n'est disponible pour vérifier automatiquement les vulnérabilités des librairies vendorisées (Leaflet 1.9.4, geopackage-js/sql.js 4.2.8). Une vérification manuelle périodique (avis de sécurité publiés pour ces versions précises) est recommandée, à faire à l'occasion plutôt que selon un calendrier fixe.

### 3bis. Identifiants uniques entre les deux téléphones ✅

Deux téléphones saisissant en parallèle vont chacun générer des identifiants — il faut garantir qu'ils ne se chevauchent jamais lors de la fusion dans QGIS.

- **GeoPackage impose un `fid` de type INTEGER** pour chaque table (contrainte du format). Ce `fid` reste un simple numéro de ligne **local au fichier exporté**, sans signification entre appareils.
- On ajoute donc un champ métier séparé, **`uid` (TEXT)**, seul identifiant réellement unique et stable, construit ainsi : `{code_appareil}-{compteur_local}` (ex. `AND-014`, `IOS-007`).
- **`code_appareil`** : un court libellé (2-4 lettres) saisi une seule fois, au premier lancement de l'app sur chaque téléphone (ex. initiales de la personne). Stocké localement, jamais redemandé ensuite.
- **`compteur_local`** : entier auto-incrémenté séparément sur chaque téléphone — pas de coordination nécessaire entre les deux appareils.
- Le `uid` est utilisé pour tout le dédoublonnage (import fusionné, avertissement de proximité). Le `fid` GPKG n'est là que pour satisfaire le format du fichier.
- **Protection contre les collisions entre onglets d'un même appareil** ✅ (24/08, rapport d'audit point 1) : `genererUid()` (`app/js/device.js`) sérialise la lecture-incrémentation-écriture du compteur via `navigator.locks` (Web Locks API) quand le navigateur le supporte, pour empêcher que deux onglets ouverts en parallèle sur le même appareil ne lisent la même valeur avant que l'un des deux ne l'ait réécrite (collision silencieuse, révélée seulement à la fusion GPKG). Repli sans verrou sur un navigateur qui ne le supporterait pas — comportement identique à avant cette correction.

### 3ter. Installabilité PWA ✅ (étape 11)

- **Manifest** (`app/manifest.json`) : nom, icônes, `display: "standalone"` (l'app s'ouvre sans barre d'adresse ni chrome navigateur, comme une app native), couleur de thème reprenant le bleu de l'app (`#1a73e8`).
- **Icônes d'application** (générées, pas dessinées à la main comme les icônes de marqueurs) : punaise de localisation blanche sur fond bleu arrondi, cohérente avec le style des icônes de marqueurs. Générées en 4 tailles avec `Pillow` (`app/icons/app-icon-{32,180,192,512}.png`) : 192/512 pour le manifest (Android/Chrome), 180 pour `apple-touch-icon` (iOS, sans transparence — recommandation Apple), 32 pour l'onglet du navigateur.
- **Service worker** (`app/service-worker.js`) — revu le 2026-08-23, met désormais réellement l'app en cache (cf. §4) : deux caches distincts, un pour les fichiers de l'app (préchargés à l'installation, servis "cache d'abord") et un pour les tuiles de carte (mises en cache au fur et à mesure, "réseau d'abord, secours sur le cache"). Une constante `VERSION` en tête de fichier doit être incrémentée à chaque mise à jour publiée, pour que les appareils déjà installés basculent sur les nouveaux fichiers au lieu de resservir une ancienne version en cache (même mécanisme que le problème de cache HTTP déjà rencontré plusieurs fois côté développement, cf. `Procédures Test.md`).
- Balises meta iOS (`apple-mobile-web-app-capable`, etc.) pour un rendu correct en plein écran une fois ajouté à l'écran d'accueil.

**Vérification** : hébergement GitHub Pages confirmé fonctionnel côté Claude (chargement de tous les fichiers en HTTPS, sans erreur). Sous cette vraie adresse HTTPS, l'enregistrement du service worker **réussit** (contrairement à un test antérieur sous serveur local, qui échouait systématiquement — la cause était donc bien l'absence de HTTPS, pas un problème de code) : worker activé, cache applicatif peuplé avec les 35 fichiers attendus. Le comportement hors-ligne complet (recharger la page sans réseau) n'a pas pu être simulé dans l'outil de Claude (pas de bascule hors-ligne disponible) — logique du service worker vérifiée par lecture de code et par l'état du cache, confirmation finale en conditions réelles à faire par l'utilisateur (ex. mode avion sur téléphone).

### 3quater. Hébergement et mise à jour ✅ (2026-08-23)

**Problème identifié** : l'architecture initiale servait l'app depuis un serveur local tournant sur le PC (`python -m http.server`), accessible aux téléphones uniquement via le Wi-Fi domestique. Incompatible avec l'usage réel (parcourir les rues de Viroflay, loin du PC). De plus, l'enregistrement d'un service worker (nécessaire pour l'installation et le cache hors-ligne) exige une connexion **HTTPS**, qu'un serveur local ne fournit pas.

**Décision** : hébergement du code sur **GitHub Pages**, gratuit, sans nouveau compte à créer (compte GitHub `mmoreauprof-svg` créé pour l'occasion). Dépôt public — sans conséquence puisque seul le *code* de l'app y est publié, jamais les données de relevé (qui restent uniquement dans le stockage local de chaque téléphone et les fichiers `.gpkg` exportés).

- **Adresse de l'app** : `https://mmoreauprof-svg.github.io/mobilier-urbain/app/`
- **Dépôt Git local inchangé** : GitHub n'est qu'une deuxième copie (un "remote") du dépôt local existant. Le développement continue de se faire localement (avec Claude), test via le serveur local `python -m http.server` comme avant.
- **Mise à jour** : une fois une nouvelle version testée et commitée localement, `git push` la publie sur GitHub Pages. Les appareils déjà installés reçoivent la mise à jour à leur prochaine connexion (le service worker vérifie automatiquement si une nouvelle version est disponible, cf. §3ter).
- Cette adresse remplace l'ancienne procédure d'installation par IP locale dans `Procédures Test.md`.

## 4. Fonctionnement hors-ligne ✅ (revu le 2026-08-23)

Le CdC initial demandait un fonctionnement hors-ligne complet. Une première décision (2026-08-09) l'avait écarté par simplicité — **revue depuis**, car incompatible avec l'usage réel de l'app (relever le mobilier urbain en marchant dans les rues, sans connexion garantie).

**Décision actuelle** : hors-ligne réel une fois l'app installée, via le service worker (§3ter) :
- **Fichiers de l'app** (HTML/CSS/JS, librairies, icônes) : préchargés en cache dès l'installation — l'app se lance et fonctionne entièrement hors-ligne (saisie, modification, suppression, export/import GPKG), une connexion n'étant nécessaire que pour l'installation initiale et les mises à jour.
- **Tuiles de la carte OpenStreetMap** : mises en cache progressivement, à chaque zone consultée en ligne. Une zone jamais affichée en ligne au préalable reste vide hors-ligne (aucune tentative de précharger toute la ville par avance, jugé disproportionné). **Recommandation pratique** : avant une session de terrain, ouvrir l'app une fois chez soi (Wi-Fi) et parcourir/zoomer sur les rues à visiter, pour que leurs tuiles soient en cache.
- La position GPS (`watchPosition`) fonctionne nativement hors-ligne (ne dépend pas du réseau).

## 5. Système de coordonnées ✅ (revu)

Le CdC initial recommandait Lambert-93 (EPSG:2154). **Décision : WGS84 (EPSG:4326)**, le référentiel natif du GPS des téléphones — pas de conversion nécessaire en saisie. Le référentiel (CRS) et le géoïde seront explicitement documentés dans les métadonnées du fichier GPKG exporté, pour une réimportation correcte dans QGIS.

## 6. Fonctionnalités

### 6.1 Carte
- Fond de carte OSM standard, centré par défaut sur Viroflay.
- Affichage de la position en temps réel (point bleu classique).
- Affichage des objets déjà enregistrés sous forme de marqueurs, avec icônes stylisées ✅ :
  - **Mobilier urbain** : une icône distincte par type, avec une couleur de fond propre par type pour une distinction rapide sur la carte (revu le 23/08, affiné le même jour) — **vert foncé** (`#1b5e20`) banc, **orange** (`#e65100`) corbeille, **marron** (`#5d4037`) distributeur de sacs, **bleu clair** (`#29b6f6`) arrêt de bus, **bleu** (`#1a73e8`, inchangé) abri bus, **violet** (`#7b1fa2`, nouvelle catégorie recyclage du 24/08 — d'abord turquoise `#00695c`, jugé trop proche du vert du banc et du commerce occupé, ajusté le même jour) pour les 3 types de recyclage — même symbole de recyclage classique (3 flèches) pour les 3, distingués par un petit pictogramme superposé (bouteille pour Recyclage verre, puce pour Recyclage électronique, astérisque générique pour Recyclage autre).
  - **Commerce** : une même icône, en **deux couleurs** selon l'état — **vert clair** (`#4caf50`, affiné le 23/08 — plus clair que le vert foncé du banc pour éviter toute confusion) pour Occupé, **rouge** (`#c62828`, revu le 23/08 — auparavant orange) pour Vacant.
- Fonction de zoom, dezoom, déplacement.
- **Badge de quantité** ✅ : quand `nombre` > 1 pour un mobilier urbain, un badge numérique se superpose à son icône (coin supérieur droit) indiquant le nombre d'éléments à cet endroit. Pas de badge quand `nombre` = 1 (cas par défaut, le plus courant). Fond **gris neutre** (`#333333`, revu le 23/08 — auparavant rouge) choisi pour rester lisible avec des chiffres blancs sans entrer en conflit visuel avec aucune des couleurs d'icônes ci-dessus.

### 6.1quater Filtre d'affichage par catégorie ✅

Un contrôle sur la carte (bouton "Filtres" en haut à gauche, sous le zoom) permet d'afficher/masquer indépendamment chaque catégorie d'objet, par une case à cocher :

- Les 8 types de mobilier urbain (Banc, Corbeille, Distributeur de sacs, Arrêt de bus, Abri bus, Recyclage verre, Recyclage électronique, Recyclage autre).
- Les commerces, en une seule catégorie (cohérent avec le regroupement retenu pour l'export GPKG, cf. §6.5bis — pas de filtre par `type_commerce` ou par état).

Toutes les catégories sont cochées (visibles) par défaut à l'ouverture. Le filtre agit uniquement sur l'affichage des marqueurs sur la carte ; il ne modifie jamais les données enregistrées.

### 6.1quinquies Recentrage manuel sur la position GPS ✅ (30/08)

Un bouton dédié ("Recentrer", à côté de "Filtres" sur PC, empilé juste en dessous du bouton flottant "Filtres" sur mobile) recentre la carte sur la dernière position GPS connue, à tout moment sur demande de l'utilisateur — distinct du recentrage automatique du §6.1 qui ne joue qu'au tout premier relevé GPS de la session, pour ne pas gêner une carte déjà déplacée/zoomée volontairement. Le niveau de zoom courant est conservé (seul le centre change). Si aucune position GPS n'a encore été reçue, un clic affiche la bannière d'erreur habituelle ("Position GPS indisponible — impossible de recentrer la carte.") au lieu de recentrer sur une position inexistante.

### 6.1bis Détection de doublon ✅
Lors d'une nouvelle saisie, si un objet du **même type** existe déjà à **moins de 5 mètres**, un avertissement s'affiche avant l'enregistrement ("Un [type] existe déjà à proximité — enregistrer quand même ?"). Le seuil (5 m) est un paramètre modifiable dans le code, pas une saisie utilisateur.

⚠️ **Portée** : cette détection ne compare qu'aux données **déjà présentes sur le même téléphone** (via IndexedDB). Elle ne peut pas détecter qu'une personne sur l'autre téléphone a saisi le même objet en parallèle — ce cas de doublon inter-appareils sera visible et à traiter **visuellement dans QGIS** lors de la fusion des deux exports.

### 6.2 Saisie d'un mobilier urbain
Bouton dédié → enregistre la position actuelle → formulaire :

| Champ | Type | Détail |
|---|---|---|
| uid | TEXT | Identifiant unique inter-appareils, automatique (voir §3bis) |
| type_objet | Liste déroulante | Banc, Corbeille, Distributeur de sacs, Arrêt de bus, Abri bus, Recyclage verre, Recyclage électronique, Recyclage autre (3 derniers ajoutés le 24/08) |
| etat | Liste déroulante | Bon, Moyen, Mauvais, HS |
| nombre | Entier | Défaut : 1 |
| commentaire | Texte libre | Optionnel |
| last_update | Date/heure | Automatique, non modifiable |
| coordonnées | Point GPS | Automatique au moment de la saisie |

### 6.3 Saisie d'un commerce
Bouton dédié → enregistre la position actuelle → formulaire :

| Champ | Type | Détail |
|---|---|---|
| uid | TEXT | Identifiant unique inter-appareils, automatique (voir §3bis) |
| nom_commerce | Texte libre | Optionnel si local vacant sans enseigne connue |
| type_commerce | Liste déroulante | Supérette, Coiffeur, Banque, Vêtements, Boulangerie, Restaurant, Onglerie, Opticien, Autre commerce, Autre service |
| etat | Liste déroulante | Occupé (commerce en activité), Vacant (local vacant, potentiellement disponible) — **défaut : Vacant** ✅, car l'objectif premier est de repérer les locaux vacants |
| date_fermeture | Mois/Année | Optionnel, si connu — mois et année de fermeture du commerce |
| commentaire | Texte libre | Optionnel |
| last_update | Date/heure | Automatique |
| coordonnées | Point GPS | Automatique |

### 6.4 Modification / suppression
- Sélection d'un objet existant (tap sur son marqueur) → popup avec deux boutons distincts **Modifier** et **Supprimer** (séparés depuis le 23/08 — auparavant un seul bouton "Modifier / Supprimer" ouvrant systématiquement le formulaire, la suppression n'étant possible que depuis son bouton interne).
- **Modifier** ouvre le formulaire pré-rempli, avec les mêmes boutons Enregistrer/Annuler qu'à la création (le bouton Supprimer, désormais redondant avec celui du popup, a été retiré du formulaire).
- **Supprimer** déclenche directement une confirmation (`confirm()` natif du navigateur — bouton OK déjà activé par défaut avec la touche Entrée) sans ouvrir le formulaire.
- `last_update` remis à jour à chaque modification.

### 6.4bis Sélection manuelle d'un point sur la carte ✅

Sans GPS fiable (PC de développement, ou signal faible en intérieur), la création d'un objet ne peut pas toujours se baser sur une position automatique. Comportement retenu, **sans détection de plateforme** :

- Clic sur « + Mobilier urbain » / « + Commerce » :
  - **Si une position GPS récente est disponible** : comportement inchangé, la position est capturée immédiatement (cf. §6.2, §6.3).
  - **Sinon** : un message invite à cliquer sur la carte (« Cliquez sur la carte pour choisir l'emplacement »), le curseur change, et le **prochain clic sur la carte** définit les coordonnées ; le formulaire s'ouvre alors normalement avec cette position.
- Ce mécanisme est universel : il n'est pas réservé au PC. Il reste disponible aussi sur téléphone si le GPS est indisponible ou imprécis (bâtiment, signal faible), pour positionner manuellement le point sur la carte.

### 6.5 Persistance, Import et Export ✅ (revu — 3 flux distincts, couches multiples)

1. **Restauration automatique au démarrage** — ce n'est *pas* un import : à chaque ouverture de l'app, les données déjà saisies sont relues depuis IndexedDB (stockage local du téléphone) et réaffichées sur la carte. Aucune action utilisateur, aucun fichier impliqué.

2. **Export** — bouton dédié → génère un fichier `.gpkg` contenant **9 couches** (voir §6.5bis), téléchargeable/partageable (mail, AirDrop, etc.) depuis le téléphone.

3. **Import d'un fichier externe** — bouton dédié → sélection d'un fichier `.gpkg` (reçu de l'autre téléphone, ou réédité depuis QGIS) → l'app propose un choix explicite :
   - **Remplacer** : le contenu importé remplace entièrement les données locales.
   - **Fusionner** ✅ (revu le 23/08 suite à un usage réel sur le terrain) : un objet dont le `uid` n'existe pas encore localement est ajouté. Un objet dont le `uid` existe déjà localement est **remplacé par la version importée si celle-ci a un `last_update` strictement plus récent** (modification faite sur l'autre appareil après la dernière synchronisation) ; sinon il est ignoré, comme avant. Un message de confirmation détaille le nombre d'objets ajoutés / mis à jour / ignorés.
   - ⚠️ **Suppression non gérée par la fusion** : un objet supprimé sur un appareil n'est jamais retiré des autres lors d'une fusion (l'import n'ajoute/ne met à jour que ce qui est présent dans le fichier — il ne peut pas savoir qu'une absence signifie une suppression). Convention adoptée en attendant mieux : marquer l'objet à retirer par un commentaire "A SUPPRIMER" plutôt que le supprimer directement, puis traiter manuellement dans QGIS lors de la fusion finale des exports des deux appareils.
   - Ces deux opérations parcourent **les 9 couches du fichier importé**, mais reconsolident toujours vers les **2 bases locales** (`mobilier_urbain`, `commerce`, cf. §6.5bis) — la séparation en couches n'existe que dans le fichier `.gpkg`, jamais dans le stockage local du téléphone.

### 6.5bis Structure des couches GPKG ✅

Objectif : pouvoir afficher/masquer chaque catégorie indépendamment dans QGIS, en parallèle de l'usage de l'app.

- **Mobilier urbain → 8 couches, une par `type_objet`** : `banc`, `corbeille`, `distributeur_sacs`, `arret_bus`, `abri_bus`, `recyclage_verre`, `recyclage_electronique`, `recyclage_autre` (3 dernières ajoutées le 24/08). Chaque couche contient les mêmes champs qu'en §6.2 (`uid`, `etat`, `nombre`, `commentaire`, `last_update`, coordonnées) — `type_objet` y est redondant (une seule valeur possible par couche) mais conservé pour simplifier la réimportation.
- **Commerce → 1 couche unique**, `commerce`, tous types confondus. `type_commerce` et `etat` (Occupé/Vacant) restent de simples attributs de cette couche, filtrables et stylables dans QGIS sans séparation physique en plusieurs fichiers/tables.
- **Noms techniques** : en ASCII, minuscules, underscores — plus sûrs pour la compatibilité SIG que des accents ou espaces. L'affichage dans QGIS peut néanmoins rester en français lisible via le champ `identifier` du GeoPackage (métadonnée de la couche, distincte du nom technique de table) : ex. table `banc` → identifiant affiché « Bancs ».
- **Identifiants** : `uid` (texte, dédoublonnage) et `fid` (entier, imposé par GeoPackage) suivent les mêmes règles que définies en §3bis, appliquées indépendamment dans chacune des 9 tables.
- Cette séparation en couches est **propre au fichier `.gpkg`** : le stockage local (IndexedDB) reste organisé en 2 bases seulement (`mobilier_urbain`, `commerce`), comme décrit en §3 — l'export répartit vers les 9 couches, l'import consolide depuis les 9 couches vers les 2 bases.
- **Ajout du 24/08 (catégorie recyclage)** : les 3 nouvelles couches s'ajoutent en fin de liste, sans modifier ni renommer les 6 couches existantes — un fichier `.gpkg` exporté avant cet ajout reste importable sans perte, et les mobiliers déjà enregistrés localement (types antérieurs) ne sont en rien affectés.

**Note technique — bugs de `geopackage-js` 4.2.8 contournés** ✅ : la librairie vendorisée a deux bugs sous son adaptateur navigateur (sql.js), découverts et contournés à l'implémentation :
1. `dao.create()`/`addGeoJSONFeatureToGeoPackage()` omettent certains paramètres nommés de la requête SQL générée (`$id`, `$geometry`...), que sql.js refuse. Contournement : écriture en SQL brut (`gp.connection.insert`) avec tous les paramètres explicitement fournis, géométrie (points uniquement) encodée à la main au format GeoPackageBinary plutôt que via la classe `Geometry` de la librairie.
2. `iterateGeoJSONFeatures()`/`queryForGeoJSONFeaturesInTable()` échouent (`projectBoundingBox is not a function`). Contournement : lecture via `dao.queryForAll()` + `dao.getRow()` + `row.geometry.toGeoJSON()`.

Détail et code dans `app/js/gpkg.js` (commentaire d'en-tête). Sans objet pour la suite du projet sauf mise à jour de cette librairie.

**Icônes dans QGIS — tentative abandonnée** : un essai d'intégrer les icônes de l'app comme styles QGIS par défaut (table `layer_styles`, symboles SVG encodés en base64) a été testé le 2026-08-22 puis retiré : QGIS 3.16.1 affiche "Symbole SVG" mais pas l'image elle-même (Claude n'a pas d'installation QGIS pour diagnostiquer/itérer efficacement). Les couches exportées gardent la symbologie par défaut de QGIS ; la mise en forme visuelle reste à la main de l'utilisateur dans QGIS s'il le souhaite.

**Emplacement des fichiers** ✅ — diffère selon la plateforme :
- **Import** : identique partout, via le sélecteur de fichiers natif (`<input type="file">`) — ouvre l'app Fichiers (iPhone) ou l'équivalent Android, navigation manuelle jusqu'au `.gpkg`.
- **Export sur Android (Chrome)** : boîte de dialogue "Enregistrer sous" native (File System Access API) — choix du dossier et du nom à chaque export.
- **Export sur iPhone (Safari)** : cette API n'existe pas ; l'app ouvre la feuille de partage native ("Partager…") pour enregistrer dans Fichiers, AirDrop, mail, etc. Sans cela, le fichier irait dans un dossier Téléchargements par défaut, peu pratique.

### 6.6 Interface adaptative PC / mobile ✅

Deux concepts d'interface différents selon la taille d'écran, choisis après revue de maquettes (2026-08-22) — bascule **purement responsive** (`window.innerWidth ≥ 768px`), sans détection de plateforme, cohérent avec §6.4bis :

- **PC — barre d'outils + bulle contextuelle.** Une fine barre d'icônes (« + Mobilier », « + Commerce », Filtres, Exporter, Importer) en haut à gauche, la carte reste visible à 100 % sinon. Les formulaires (création, édition) s'ouvrent en petite bulle **ancrée au point concerné sur la carte** (position GPS, point sélectionné manuellement, ou point du marqueur édité) plutôt qu'en grand panneau centré. Repli simple si la bulle déborderait de l'écran : elle est ramenée dans les limites visibles (pas d'inversion « intelligente » du côté d'ancrage — simplification assumée). Exporter/Importer restent des actions directes de la barre d'outils, sans écran intermédiaire.
- **Mobile — barre d'onglets du bas.** 4 onglets fixes (Carte, Mobilier, Commerce, Fichier), toujours visibles y compris pendant la saisie. Toucher "Mobilier"/"Commerce" ouvre le même formulaire que le bouton correspondant sur PC, mais en écran plein (au-dessus de la barre d'onglets, qui reste accessible). "Fichier" regroupe Exporter/Importer sur un écran dédié (pas d'action directe en barre, contrairement au PC). Le filtre reste accessible via une icône flottante sur la carte plutôt que dans la barre d'onglets.
- Le choix **Remplacer/Fusionner** à l'import et l'**identification de l'appareil** restent de vraies boîtes de dialogue centrées sur les deux plateformes : ils ne sont rattachés à aucun point de la carte.
- Un même jeu de fonctions gère les deux modes (`app/js/interface.js` : `positionnerPanneauFormulaire`, `definirOngletActif`) — pas de code dupliqué entre PC et mobile, seul l'habillage CSS diffère selon la largeur d'écran.
- **Ergonomie des panneaux de saisie** ✅ (revu le 23/08) :
  - Listes déroulantes alignées sur la taille des labels (14px, au lieu de 16px) pour un panneau moins haut. Les champs texte restent à 16px (contrainte iOS : en dessous, Safari zoome automatiquement à la mise au point d'un champ texte — pas les listes déroulantes, sans risque à réduire).
  - Le bouton **Enregistrer** est de type `submit` : la touche Entrée dans un champ (sauf le commentaire, où elle insère une nouvelle ligne — comportement standard des `<textarea>`) valide et ferme le panneau, comme un clic sur Enregistrer.
  - **PC uniquement** (retour utilisateur du 23/08 : le bouton n'était activable qu'à la souris car aucun champ n'avait le focus à l'ouverture, rendant Entrée sans effet) : à l'ouverture du panneau (création et édition), le bouton **Enregistrer** reçoit directement le focus — Entrée l'active donc immédiatement, sans aucun clic. Focus volontairement mis sur le bouton plutôt que sur la liste Type : sur certains navigateurs, Entrée avec le focus sur un `<select>` rouvre sa liste au lieu de soumettre le formulaire (constaté par l'utilisateur), alors qu'un bouton reçoit toujours Entrée sans ambiguïté. La liste Type est en plus **pré-remplie avec le dernier type créé** (au lieu de toujours repartir sur le premier de la liste), pour enchaîner rapidement de nombreux objets du même type (saisie en centaines d'unités) : après le tout premier objet d'une série, plus aucune interaction souris n'est nécessaire avec le formulaire lui-même. Sans effet sur mobile (pas de clavier virtuel imposé à l'ouverture, usage plus unitaire).
  - **PC uniquement** : le titre du panneau sert de poignée de déplacement (glisser-déposer à la souris), pour repositionner le panneau sans jamais interférer avec les listes déroulantes/champs sous-jacents.
  - **Mobile uniquement** : le panneau s'ajuste dynamiquement au viewport visuel réel (`window.visualViewport`), pas seulement à la taille de la fenêtre — une bannière native du navigateur (ex. demande d'autorisation de géolocalisation) ou le clavier virtuel réduisent l'espace réellement visible sans redimensionner la fenêtre elle-même ; sans cet ajustement, le bas du panneau (boutons Annuler/Enregistrer) pourrait se retrouver masqué.

### 6.6ter Robustesse de la barre d'outils mobile ✅ (24/08, retour de terrain)

**Bug rapporté** : sur iPhone 15, après un certain nombre d'objets créés, la barre d'onglets (et le bouton filtre) disparaissait — app inutilisable, export inaccessible. Un rechargement de la page résolvait temporairement le problème, confirmant un bug de **rendu** (pas de perte de données : tout reste en IndexedDB, indépendant de l'affichage) — probablement lié à `position: fixed`/`absolute` mal repositionnés par Safari iOS après un zoom de page ou plusieurs cycles d'ouverture/fermeture de panneau.

Trois corrections, aucune ne dépend d'un diagnostic à 100% certain (impossible à reproduire à l'identique côté Claude, pas d'iPhone disponible) :
- **Zoom de page désactivé** (`user-scalable=no, maximum-scale=1.0` dans la balise viewport) : tout le zoom passe désormais exclusivement par les contrôles de la carte Leaflet, éliminant la cause la plus probable à la racine.
- **Réaffirmation active de la visibilité** (`reafficherBarresMobiles()` dans `app/js/interface.js`) : à chaque fermeture de panneau (création, édition, écran Fichier), la barre d'onglets et le bouton filtre sont explicitement masqués puis réaffichés (avec un recalcul de mise en page forcé entre les deux), plutôt que de faire confiance au CSS seul pour s'auto-corriger — un filet de sécurité qui fonctionne indépendamment de la cause exacte du bug de rendu.
- **`#bouton-filtres-mobile` en `position: fixed`** plutôt que `absolute` (plus robuste face aux changements de viewport, cohérent avec le reste de l'interface mobile).
- **Zone sûre iPhone** (`env(safe-area-inset-bottom)`, nécessite `viewport-fit=cover`) ajoutée à la barre d'onglets et aux éléments qui s'ancrent au-dessus (panneau plein écran, bannière de sélection, étiquette du code appareil) — point connexe traité au passage, probablement pas la cause principale mais une vraie amélioration pour les iPhone à barre d'accueil (X et ultérieurs, dont le 15).

### 6.6bis Raccourcis clavier — saisie en chaîne sur PC ✅ (23/08)

Pour accélérer la saisie répétée de plusieurs objets à la suite (usage PC, sans GPS, généralement par sélection manuelle de points cf. §6.4bis) :

- `M` / `C` ouvrent directement « + Mobilier urbain » / « + Commerce », sans viser la barre d'outils à la souris.
- `1` à `8` sélectionnent le type de mobilier urbain (dans l'ordre de la liste déroulante, étendu de 1-5 à 1-8 le 24/08 avec l'ajout de la catégorie recyclage) pendant que le panneau mobilier est ouvert, sans passer par la liste.
- **PC uniquement** (`estAffichagePC()`) et **jamais actifs si le focus est dans un champ texte/liste/commentaire** — condition essentielle : sans elle, taper ces caractères au clavier (y compris virtuel, sur mobile) déclencherait les raccourcis au lieu de saisir le texte. Combinaisons avec Ctrl/Cmd/Alt ignorées (pour ne pas interférer avec les raccourcis du navigateur/système).
- Volontairement limité aux raccourcis : la ré-ouverture automatique du panneau et le pré-remplissage du dernier type saisi, envisagés puis écartés, auraient risqué d'altérer l'expérience sur Android/iPhone (l'utilisateur souhaitait une solution strictement PC).

## 7. Contraintes techniques ✅

- Fonctionne dans un navigateur mobile moderne (Chrome Android récent, Safari iOS récent) — pas de version d'OS minimale stricte à fixer puisqu'il n'y a pas d'app native à publier.
- Pas de photos (non demandées dans le CdC).

## 8. Points encore ouverts ❓

Aucun point bloquant restant pour démarrer la mise en place du projet. D'autres questions pourront apparaître au fil du développement (ex. style précis des icônes, wording exact des messages).

## 9. Mise en place du projet (à venir)

Une fois les points ouverts tranchés : structure de dossiers, dépôt Git local, environnement de développement, plan de développement incrémental (une fonctionnalité testable à la fois).

## 10. Stratégie de test ✅

- **Sur PC, sans puce GPS** : entièrement possible pour la quasi-totalité de l'app.
  - Le navigateur fournit quand même une position (Wi-Fi/IP), moins précise mais fonctionnelle pour tester l'UX.
  - Pour des tests précis et reproductibles, **Chrome DevTools → Sensors → Geolocation** permet de simuler une position GPS exacte (coordonnées choisies à la main), y compris un déplacement simulé.
  - Toute la logique indépendante du GPS (formulaires, listes déroulantes, détection de doublon, import/export GPKG, fusion) est testable sur PC sans aucune simulation particulière.
- **Sur téléphone (Android + iPhone)** : validation finale en conditions réelles — précision GPS réelle, ergonomie tactile, comportement PWA installée (icône écran d'accueil, mode hors-connexion de l'app elle-même si le réseau coupe momentanément).

## 11. Feuille de route — Étape 4 (développement incrémental)

1. ✅ Position GPS temps réelle
2. ✅ Identification de l'appareil (code appareil, base du `uid`)
3. ✅ Stockage local (IndexedDB)
4. ✅ Saisie d'un mobilier urbain
5. ✅ Saisie d'un commerce
6. ✅ Modification / suppression
7. ✅ Icônes stylisées définitives (mobilier urbain + couleurs commerce)
8. ✅ Sélection manuelle d'un point sur la carte (repli sans GPS, cf. §6.4bis)
9. ✅ Export GPKG (6 couches : 5 pour le mobilier urbain par type, 1 pour les commerces — cf. §6.5bis)
10. ✅ Import GPKG (remplacer / fusionner, consolidation des 6 couches vers les 2 bases locales — cf. §6.5bis)
11. ✅ Installabilité PWA (manifest, icône d'app, écran d'accueil)
