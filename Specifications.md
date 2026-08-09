# Spécifications — Application de recensement mobilier urbain & commerces

> Ce document remplace et détaille `CdC AppliMobilier.md` (conservé comme archive). Il est mis à jour au fil de nos échanges. Chaque décision validée est marquée ✅, chaque point encore ouvert est marqué ❓.

## 1. Objectif

Application mobile personnelle permettant de recenser sur le terrain, à Viroflay, le mobilier urbain (bancs, corbeilles, arrêts de bus…) et les commerces, en pointant leur position sur une carte, puis de conserver ces données et de les exporter vers un SIG (QGIS).

Le recensement des commerces vise en particulier à **identifier les locaux commerciaux vacants**, en vue d'y installer de nouveaux commerces — d'où l'attention portée à l'état (occupé/vacant) et à la date de fermeture.

## 2. Contexte d'usage ✅ (revu)

- Usage **à deux**, chacun sur son téléphone (un **Android** et un **iPhone**), en parallèle sur le terrain — pas de compte, pas de backend, pas de synchronisation automatique entre les deux téléphones.
- La fusion des relevés des deux téléphones se fait **manuellement dans QGIS**, à partir des fichiers `.gpkg` exportés par chacun.
- Pas de publication sur un store (Play Store / App Store).
- Utilisation **en ligne** (connexion data/wifi active pendant la saisie sur le terrain).

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

### 3bis. Identifiants uniques entre les deux téléphones ✅

Deux téléphones saisissant en parallèle vont chacun générer des identifiants — il faut garantir qu'ils ne se chevauchent jamais lors de la fusion dans QGIS.

- **GeoPackage impose un `fid` de type INTEGER** pour chaque table (contrainte du format). Ce `fid` reste un simple numéro de ligne **local au fichier exporté**, sans signification entre appareils.
- On ajoute donc un champ métier séparé, **`uid` (TEXT)**, seul identifiant réellement unique et stable, construit ainsi : `{code_appareil}-{compteur_local}` (ex. `AND-014`, `IOS-007`).
- **`code_appareil`** : un court libellé (2-4 lettres) saisi une seule fois, au premier lancement de l'app sur chaque téléphone (ex. initiales de la personne). Stocké localement, jamais redemandé ensuite.
- **`compteur_local`** : entier auto-incrémenté séparément sur chaque téléphone — pas de coordination nécessaire entre les deux appareils.
- Le `uid` est utilisé pour tout le dédoublonnage (import fusionné, avertissement de proximité). Le `fid` GPKG n'est là que pour satisfaire le format du fichier.

## 4. Fonctionnement hors-ligne ✅ (revu)

Le CdC initial demandait un fonctionnement hors-ligne complet. **Décision : abandonné.** Les tuiles OpenStreetMap nécessitent une connexion réseau pour s'afficher ; précharger la zone de Viroflay ajouterait une complexité non justifiée pour un usage solo. **L'application nécessite une connexion active pendant la saisie.**

## 5. Système de coordonnées ✅ (revu)

Le CdC initial recommandait Lambert-93 (EPSG:2154). **Décision : WGS84 (EPSG:4326)**, le référentiel natif du GPS des téléphones — pas de conversion nécessaire en saisie. Le référentiel (CRS) et le géoïde seront explicitement documentés dans les métadonnées du fichier GPKG exporté, pour une réimportation correcte dans QGIS.

## 6. Fonctionnalités

### 6.1 Carte
- Fond de carte OSM standard, centré par défaut sur Viroflay.
- Affichage de la position en temps réel (point bleu classique).
- Affichage des objets déjà enregistrés sous forme de marqueurs, avec icônes stylisées ✅ :
  - **Mobilier urbain** : une icône distincte par type — banc, corbeille, distributeur de sacs, arrêt de bus, abri bus (5 icônes à concevoir).
  - **Commerce** : une même icône, en **deux couleurs** selon l'état — une couleur pour Ouvert, une autre pour Fermé/vacant.
- Fonction de zoom, dezoom, déplacement.

### 6.1bis Détection de doublon ✅
Lors d'une nouvelle saisie, si un objet du **même type** existe déjà à **moins de 5 mètres**, un avertissement s'affiche avant l'enregistrement ("Un [type] existe déjà à proximité — enregistrer quand même ?"). Le seuil (5 m) est un paramètre modifiable dans le code, pas une saisie utilisateur.

⚠️ **Portée** : cette détection ne compare qu'aux données **déjà présentes sur le même téléphone** (via IndexedDB). Elle ne peut pas détecter qu'une personne sur l'autre téléphone a saisi le même objet en parallèle — ce cas de doublon inter-appareils sera visible et à traiter **visuellement dans QGIS** lors de la fusion des deux exports.

### 6.2 Saisie d'un mobilier urbain
Bouton dédié → enregistre la position actuelle → formulaire :

| Champ | Type | Détail |
|---|---|---|
| uid | TEXT | Identifiant unique inter-appareils, automatique (voir §3bis) |
| type_objet | Liste déroulante | Banc, Corbeille, Distributeur de sacs, Arrêt de bus, Abri bus |
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
- Sélection d'un objet existant (tap sur son marqueur) → ouverture du formulaire pré-rempli → modification ou suppression.
- `last_update` remis à jour à chaque modification.

### 6.5 Persistance, Import et Export ✅ (revu — 3 flux distincts)

1. **Restauration automatique au démarrage** — ce n'est *pas* un import : à chaque ouverture de l'app, les données déjà saisies sont relues depuis IndexedDB (stockage local du téléphone) et réaffichées sur la carte. Aucune action utilisateur, aucun fichier impliqué.

2. **Export** — bouton dédié → génère un fichier `.gpkg` contenant les deux couches (`mobilier_urbain`, `commerce`, avec leur `uid`), téléchargeable/partageable (mail, AirDrop, etc.) depuis le téléphone.

3. **Import d'un fichier externe** — bouton dédié → sélection d'un fichier `.gpkg` (reçu de l'autre téléphone, ou réédité depuis QGIS) → l'app propose un choix explicite :
   - **Remplacer** : le contenu importé remplace entièrement les données locales.
   - **Fusionner** : les objets du fichier importé sont ajoutés à la base locale ; tout objet dont le `uid` existe déjà localement est ignoré (pas de mise à jour automatique, pas de résolution de conflit — géré manuellement dans QGIS si besoin, cf. §6.1bis).

**Emplacement des fichiers** ✅ — diffère selon la plateforme :
- **Import** : identique partout, via le sélecteur de fichiers natif (`<input type="file">`) — ouvre l'app Fichiers (iPhone) ou l'équivalent Android, navigation manuelle jusqu'au `.gpkg`.
- **Export sur Android (Chrome)** : boîte de dialogue "Enregistrer sous" native (File System Access API) — choix du dossier et du nom à chaque export.
- **Export sur iPhone (Safari)** : cette API n'existe pas ; l'app ouvre la feuille de partage native ("Partager…") pour enregistrer dans Fichiers, AirDrop, mail, etc. Sans cela, le fichier irait dans un dossier Téléchargements par défaut, peu pratique.

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
