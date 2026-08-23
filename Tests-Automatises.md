# Tests automatisés — démarche de Claude

> Ce document décrit les vérifications que Claude effectue **de façon autonome**, avant chaque livraison d'une itération de l'étape 4 — en complément, et non en remplacement, des tests utilisateur manuels documentés dans `Procédures Test.md`.

## Deux couches de vérification

| | Qui | Où c'est documenté | Couvre |
|---|---|---|---|
| Tests manuels utilisateur | Vous | `Procédures Test.md` | PC / Android / iPhone, ergonomie réelle, GPS réel |
| Tests automatisés | Claude, en autonomie | Ce fichier | Logique pure + parcours fonctionnel de base |

Les tests automatisés ne remplacent jamais les tests manuels : ils ne peuvent pas couvrir le GPS réel, les comportements spécifiques iOS Safari / Android Chrome, ni l'ergonomie tactile.

## a) Logique pure et parcours fonctionnels — `app/tests/test.html`

Une page HTML autonome (sans framework de test, cohérent avec le choix "sans outillage" de l'étape 2) qui exécute une série d'assertions JavaScript et affiche un résumé PASS/FAIL. Elle couvre :

- **Logique pure**, sans DOM ni stockage : calcul de distance et détection de doublon (seuil 5 m), génération du `uid` (`{code_appareil}-{compteur_local}`) et son garde-fou si le code appareil est manquant.
- **Parcours fonctionnels avec échecs simulés** (depuis le 2026-08-22) : la page charge l'app réelle (`map.js`, `mobilier.js`, `commerce.js`, `storage.js`...) dans un DOM caché isolé, provoque chaque panne corrigée lors de l'audit (échec d'écriture IndexedDB, objet supprimé entre-temps, code appareil manquant, échec de chargement initial, réseau tuiles, GPS, filet global), et vérifie que la correction reste active — non-régression automatique.

**Isolation des données** : la suite utilise sa propre base IndexedDB (`MobilierUrbainDB_TEST`) et ses propres clés `localStorage`, jamais celles de l'app réelle — voir `DB_NOM_OVERRIDE`/`CLE_*_OVERRIDE` dans `test.html` et leur prise en compte dans `storage.js`/`device.js`. Nettoyage automatique (base de test supprimée, clés retirées) à la fin de chaque exécution, y compris en cas d'échec.

**Anti-cache** : les fichiers de l'app sont chargés dynamiquement avec un paramètre `?t=<horodatage>` pour forcer une lecture fraîche à chaque exécution — sans ça, un navigateur peut rejouer une version mise en cache d'une session précédente et valider silencieusement un code obsolète.

*(la couverture "logique pure" seule a été créée au moment où la première de ces fonctions a été implémentée ; la couverture "parcours fonctionnels" a été ajoutée avec les correctifs d'échecs silencieux du 2026-08-22)*

## b) Parcours fonctionnel — via l'outil de navigateur de Claude

Avant de rapporter qu'une itération est terminée, Claude pilote lui-même l'application (clics, remplissage de formulaire, vérification de l'affichage, absence d'erreur console) pour rejouer le parcours principal concerné par le changement.

## Cycle de vie de la checklist

1. **Créer** — à l'implémentation d'une nouvelle fonction pure, ses cas de test (normal, limite, erreur) sont ajoutés à `test.html`.
2. **Enrichir** — à chaque itération suivante, les nouveaux cas s'ajoutent aux précédents ; la suite ne repart jamais de zéro.
3. **Valider** — avant d'annoncer une itération terminée, Claude rejoue **toute** la suite existante (pas seulement le dernier ajout) et rapporte le résultat (ex. « 12/12 tests OK ») dans la conversation.

## État actuel de la suite

Suite exécutable : `app/tests/test.html`

| Fonction testée | Nombre de cas | Dernière validation |
|---|---|---|
| `calculDistanceMetres` (geo.js) | 3 | 2026-08-09 — 11/11 OK |
| `objetProcheExiste` (geo.js) | 3 | 2026-08-09 — 11/11 OK |
| `codeAppareilValide` (device.js) | 5 | 2026-08-22 — 13/13 OK |
| `genererUid` — garde-fou code appareil manquant (device.js) | 2 | 2026-08-22 — 13/13 OK |

Vérifications fonctionnelles complémentaires (via l'outil navigateur de Claude, hors `test.html`) sur le parcours de saisie d'un mobilier urbain : génération de `uid` séquentiel, enregistrement IndexedDB, affichage du marqueur, avertissement de doublon (accepté et refusé), persistance après rechargement de la page. Toutes concluantes le 2026-08-09.

Vérifications fonctionnelles complémentaires sur la saisie d'un commerce et sur la modification/suppression (mobilier urbain et commerce) : création, formulaire pré-rempli à l'édition, mise à jour en place (même `uid`), couleur du marqueur commerce mise à jour selon l'état, suppression effective (base + marqueur). Toutes concluantes le 2026-08-09.

## Corrections des échecs silencieux (2026-08-22)

Suite à un audit ciblé ("que se passe-t-il si X échoue silencieusement ?"), plusieurs échecs invisibles pour l'utilisateur ont été corrigés : écriture/suppression IndexedDB non protégée, échec de chargement au démarrage confondu avec "base vide", modification d'un objet supprimé entre-temps, absence de timeout GPS, code appareil disparu générant des `uid` corrompus, tuiles de carte en échec réseau sans indication. Voir le détail des mécanismes ajoutés (bannière d'erreur persistante `afficherBanniereErreur`, filet global `unhandledrejection`) directement dans le code (`app/js/util.js`).

Ces 11 correctifs sont couverts par des tests automatisés rejouables dans `app/tests/test.html` (section "Parcours fonctionnels automatisés"), en plus de la vérification manuelle initiale via l'outil navigateur de Claude.

## Revue de couverture et élargissement de la suite (2026-08-22)

Une analyse critique de la suite (composants couverts, complétude, couplage aux détails d'implémentation) a mis en évidence plusieurs trous et fragilités, corrigés dans la foulée :

**Trous de couverture comblés :**
- Chemin nominal (succès) de la création/édition/suppression de mobilier urbain et de commerce — auparavant vérifié une seule fois manuellement le 2026-08-09, jamais automatisé.
- Refus d'un doublon (`confirm()` renvoie `false`) — auparavant `confirm()` était neutralisée à toujours répondre "oui", donc ce chemin n'était jamais exercé.
- `echapperHtml` (protection anti-XSS) — aucun test direct auparavant.
- Rendu des popups (`construirePopupMobilier`/`Commerce`) avec du texte utilisateur contenant des balises HTML — vérifie que l'échappement est réellement appliqué de bout en bout, pas seulement en isolation.
- Sélection d'icône selon le type de mobilier / l'état du commerce (`iconeMobilier`/`iconeCommerce`).
- Flux réel du modal d'identification (saisie invalide → erreur affichée ; saisie valide → fermeture).

**Réduction du couplage aux détails d'implémentation :**
- Les parcours de création/édition/suppression déclenchent désormais les vrais boutons (`.click()`) et, pour l'édition/suppression, le vrai bouton du popup Leaflet (`onclick="ouvrirEditionMobilier(...)"` généré par le code de production) — au lieu d'appeler les fonctions internes directement ou de manipuler des variables privées (`uidEnEditionMobilier`). Une régression du câblage HTML↔JS (bouton mal relié) serait maintenant détectée.
- Suppression de la lecture d'un drapeau interne (`alerteGpsAffichee`) dans le test GPS : seul le comportement observable (bannière visible/masquée) est vérifié.
- `attendreCondition()` (attente d'un état observable, avec timeout) remplace l'attente directe d'une promesse interne — nécessaire pour piloter des actions déclenchées par de vrais clics dont le gestionnaire est asynchrone.

Le monkey-patching des fonctions `enregistrerMobilierUrbain`/`enregistrerCommerce`/`listerMobilierUrbain`/`listerCommerces` (pour simuler un échec IndexedDB) reste une forme de couplage à l'implémentation (ces fonctions doivent rester globales, sous ce nom) — accepté comme compromis : c'est la petite API publique déjà volontairement exposée par `storage.js`, comparable à mocker une couche d'accès aux données dans un test classique.

**Suite complète : 40/40 tests OK** (18 logique pure + 22 parcours fonctionnels), rejouée deux fois de suite pour confirmer la reproductibilité.

## Étape 4, point 8 — Sélection manuelle d'un point sur la carte (2026-08-22)

6 nouveaux tests fonctionnels couvrant le repli spécifié en §6.4bis, au même niveau d'exigence que le reste de la suite (chemin nominal, annulation, remplacement, non-régression — cf. critères de la revue de couverture ci-dessus) :

- Absence de GPS → clic sur "+ Mobilier urbain"/"+ Commerce" affiche la bannière de sélection (curseur en croix, formulaire non ouvert).
- Un clic sur la carte (`map.fire('click', ...)`, pas un appel direct à `demanderPositionSurCarte`) ouvre le formulaire avec les coordonnées choisies et les enregistre correctement à la sauvegarde.
- Un clic sur la bannière annule la sélection en cours.
- Démarrer une nouvelle sélection annule silencieusement une précédente restée en attente (mobilier → commerce).
- Annuler le formulaire après une sélection manuelle réinitialise l'état, permettant une nouvelle sélection propre ensuite (pas de coordonnées "collées" d'une tentative précédente).
- Avec GPS disponible, le comportement d'origine (formulaire immédiat, pas de bannière) reste inchangé.

**Écart assumé par rapport à la rigueur habituelle** : contrairement aux autres parcours, l'échec IndexedDB n'est pas re-testé spécifiquement pour la position sélectionnée manuellement — au-delà du calcul de la position, `enregistrerMobilierDepuisFormulaire`/`enregistrerCommerceDepuisFormulaire` empruntent exactement le même code que pour une position GPS (déjà couvert), donc un test dédié n'aurait rien vérifié de plus.

**Compromis de test** : `dernierePosition` (variable interne de `position.js`) est remise à `null` directement dans les tests pour simuler "pas encore de position GPS" — il n'existe pas de déclencheur UI pour ce cas. Comparable au monkey-patching déjà accepté plus haut pour simuler un échec IndexedDB.

**Suite complète : 46/46 tests OK** (18 logique pure + 28 parcours fonctionnels), rejouée deux fois de suite.

## Étape 4, points 9-10 — Export / Import GPKG (2026-08-22)

9 nouveaux tests couvrant `app/js/gpkg.js` (4 logique pure + 5 fonctionnels) :

- **Logique pure** : `encoderPointGeoPackageBinary` (en-tête GeoPackageBinary valide — magie `GP`, `srs_id`, type WKB Point — et coordonnées exactes en lon/lat, pas lat/lon) ; `nomFichierExport` (nom lisible avec code appareil et date, y compris code appareil manquant).
- **Fonctionnel** : export produisant les 6 couches attendues avec leur identifiant QGIS en français et des données fidèles ; sélection d'un fichier via l'input réel (`change` event, pas d'appel direct) ouvrant le choix remplacer/fusionner ; fusion ignorant les doublons par `uid` tout en ajoutant les objets réellement nouveaux ; remplacement vidant base et marqueurs avant de charger le nouveau contenu ; fichier invalide affichant une alerte sans planter.

**Deux bugs de librairie découverts et contournés** pendant l'implémentation (`geopackage-js` 4.2.8, adaptateur navigateur sql.js) — voir la note technique en §6.5bis de `Specifications.md` et l'en-tête de `app/js/gpkg.js` pour le détail :
1. Paramètres SQL nommés manquants dans les insertions générées par la librairie (`$id`, `$geometry`) → écriture en SQL brut avec géométrie encodée à la main.
2. Lecture indexée cassée (`projectBoundingBox is not a function`) → lecture via `dao.queryForAll()`/`dao.getRow()`.

Un troisième bug, cette fois de conception dans notre propre code, a été trouvé et corrigé pendant la mise en place des tests : le chemin vers `sql-wasm.wasm` était codé en dur relatif à la page appelante, cassant l'export/import dès que `gpkg.js` est chargé depuis `app/tests/test.html` (sous-dossier) plutôt que `app/index.html`. Corrigé en calculant le chemin relativement à `document.currentScript.src`.

**Suite complète : 55/55 tests OK** (22 logique pure + 33 parcours fonctionnels), rejouée deux fois de suite.

## Icônes QGIS dans l'export GPKG — tentative abandonnée (2026-08-22)

Un essai d'intégrer les icônes de l'app comme styles QGIS par défaut (table `layer_styles`, QML avec icônes SVG en base64) a été fait puis retiré le même jour : dans QGIS 3.16.1 réel, le symbole reste affiché comme "Symbole SVG" non résolu (icône absente). Sans installation QGIS disponible pour Claude, le diagnostic/itération n'était pas efficace — retiré à la demande de l'utilisateur plutôt que de continuer à deviner. Code et tests associés supprimés ; retour à la suite précédente (55/55).

## Filtre par catégorie et badge de quantité (2026-08-22)

Deux nouvelles fonctionnalités demandées suite au retour utilisateur sur l'export GPKG :

- **Filtre d'affichage** (§6.1quater) : `app/js/filtres.js`, panneau à cocher pour 6 catégories (5 types de mobilier urbain + commerce). 3 tests fonctionnels : décocher masque les marqueurs déjà affichés et recocher les réaffiche ; un objet créé pendant qu'une catégorie est masquée reste masqué jusqu'à réactivation (pas seulement les objets déjà présents à l'ouverture) ; le bouton "Filtres" bascule bien la visibilité du panneau.
- **Badge de quantité** (§6.1) : `iconeMobilier` accepte désormais un second paramètre `nombre` — icône simple inchangée si absent ou ≤ 1 (rétrocompatible avec les appels existants), bascule vers un `L.divIcon` avec un badge superposé si > 1. 2 tests logique pure.

**Suite complète : 60/60 tests OK** (24 logique pure + 36 parcours fonctionnels), rejouée deux fois de suite.

## Interface adaptative PC / mobile (2026-08-22)

Refonte de l'interface (§6.6) : barre d'outils + bulle contextuelle ancrée au point sur PC, barre d'onglets + écrans pleins sur mobile — bascule purement responsive (`app/js/interface.js`, seuil 768px), sans code dupliqué entre les deux modes.

6 nouveaux tests :
- **Logique pure** : `estAffichagePC` reflète bien le seuil de largeur (testé en redéfinissant temporairement `window.innerWidth` via `Object.defineProperty`, restauré après) ; `positionnerPanneauFormulaire` ne touche à rien sur mobile (écran plein géré en CSS) et calcule une position dans les limites de l'écran sur PC.
- **Fonctionnel** : l'onglet "Mobilier" ouvre le formulaire et s'active ; l'onglet "Carte" referme le formulaire ouvert et réactive l'onglet Carte ; l'onglet "Fichier" ouvre l'écran dédié dont les boutons appellent bien les vraies fonctions d'export/import (vérifié par substitution temporaire de `exporterDonnees`).

**Vérifications manuelles complémentaires** (l'automatisation ne peut pas redimensionner un vrai navigateur) : app réelle testée aux deux tailles d'écran (1280px et 375px) via l'outil navigateur de Claude — bascule barre d'outils ↔ barre d'onglets confirmée, bulle positionnée à des coordonnées différentes selon le point cliqué (pas figée), écran plein mobile confirmé au-dessus de la barre d'onglets, navigation entre onglets fonctionnelle. Non vérifiable : rendu visuel exact (pas de capture d'écran possible dans cet environnement) — à confirmer par l'utilisateur.

**Suite complète : 66/66 tests OK** (27 logique pure + 39 parcours fonctionnels), rejouée deux fois de suite.

## Corrections retour utilisateur — interface PC (2026-08-22)

Deux bugs signalés après test manuel, corrigés :

1. **Bulle de formulaire tronquée en bas d'écran.** `positionnerPanneauFormulaire` estimait la hauteur du panneau à 340px (valeur devinée) pour calculer où le positionner sans déborder — la hauteur réelle mesurée est en fait 414px. Corrigé en mesurant la vraie hauteur (`getBoundingClientRect()`) : le panneau est désormais rendu visible (`hidden = false`) **avant** d'être positionné, pour que sa taille réelle soit disponible au moment du calcul. Confirmé par mesure directe : plus aucun débordement, bouton "Enregistrer" toujours dans l'écran, y compris pour un point bas sur la carte.
2. **Barre d'outils PC recouvrant les boutons +/- de zoom de Leaflet** (les deux occupaient le même coin haut-gauche). Corrigé en décalant la barre d'outils sous le contrôle de zoom (`top: 90px` au lieu de `10px`) plutôt que de déplacer le contrôle de zoom lui-même (qui aurait pu avoir des effets de bord sur mobile). Confirmé par mesure des rectangles : aucun chevauchement.

Aucun nouveau test automatisé nécessaire (aucune nouvelle règle testable en isolation ; la régression était visuelle/géométrique) — vérifié directement sur l'app réelle via l'outil navigateur (mesure de `getBoundingClientRect()` avant/après aux deux tailles d'écran). Suite existante rejouée sans régression (66/66 OK).

## Corrections retour utilisateur — boutons débordants et position de la barre d'outils (2026-08-22)

Nouveau retour après re-test : boutons "Supprimer/Annuler/Enregistrer" bien trop grands / rognés dans le formulaire d'édition, et préférence pour la barre d'outils à droite du zoom plutôt qu'en dessous.

**Cause identifiée par mesure directe** (`getBoundingClientRect()` sur chaque bouton et son conteneur) : `.bouton-danger` utilisait `margin-right: auto` pour se placer à gauche dans une rangée `justify-content: flex-end` — avec 3 boutons dont un libellé long ("Enregistrer les modifications") qui ne tiennent pas sur une ligne, cette combinaison faisait déborder le bouton "Supprimer" **hors du conteneur** (`left: 114px` mesuré, alors que le formulaire commençait à `left: 149px`) au lieu de rétrécir proprement. Corrigé en empilant les boutons verticalement en pleine largeur (`flex-direction: column-reverse`, Enregistrer en haut, Supprimer tout en bas) — robuste quel que soit le nombre de boutons ou la largeur du conteneur, sur PC comme sur mobile.

**Audit systématique demandé par l'utilisateur** avant de corriger : vérification par mesure (`getBoundingClientRect`, comparaison bords bouton/conteneur) de tous les écrans à boutons, aux tailles d'écran extrêmes (1280px, 780px juste au-dessus du seuil PC, 320px le plus étroit courant) : formulaire mobilier/commerce en création (2 boutons) et édition (3 boutons), écran Fichier mobile, choix remplacer/fusionner à l'import, barre d'onglets mobile, panneau de filtres. Un seul problème trouvé (celui ci-dessus, propre à `.modal-boutons`) ; tout le reste déjà correct.

**Position de la barre d'outils PC** : déplacée à droite du contrôle de zoom (`top: 10px; left: 54px`) plutôt qu'en dessous, sur demande explicite de l'utilisateur (garder la logique "barre en haut"). Revérifié sans chevauchement avec le zoom, y compris à 780px de large (juste au-dessus du seuil desktop).

Suite existante rejouée sans régression (66/66 OK).

## Installabilité PWA (2026-08-22)

Étape 11 (§3ter) : manifest, icônes d'application (générées avec Pillow), service worker minimal sans mise en cache (l'app nécessite une connexion active par conception, §4).

1 nouveau test fonctionnel : `manifest.json` est valide et contient les champs requis (nom, `display: standalone`, icônes 192×192 et 512×512).

**Vérifications manuelles complémentaires** sur l'app réelle : fichier manifest récupérable et bien structuré, les 4 icônes (`32/180/192/512`) chargent avec les bonnes dimensions, balises `<link rel="manifest">` et `<link rel="apple-touch-icon">` présentes dans le HTML.

**⚠️ Non vérifiable dans cet environnement** : l'enregistrement effectif du service worker échoue systématiquement (« An unknown error occurred when fetching the script »), **y compris en tentant d'enregistrer `util.js`** (un fichier déjà validé, chargé sans problème comme script normal partout ailleurs dans l'app) à la place de `service-worker.js` — ce test croisé exclut un problème de code ou de contenu du fichier et pointe vers une restriction du bac à sable du navigateur automatisé de Claude, cohérente avec son incapacité déjà connue à produire des captures d'écran. L'enregistrement réel et l'apparition de l'invite d'installation restent à confirmer par l'utilisateur dans un vrai navigateur.

**Suite complète : 67/67 tests OK** (27 logique pure + 40 parcours fonctionnels), rejouée deux fois de suite.
