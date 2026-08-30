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

## Hébergement GitHub Pages et cache hors-ligne réel (2026-08-23)

Le service worker minimal (aucune mise en cache) est remplacé par une version qui met réellement l'app en cache (§4 des spécifications, revu) — nécessaire pour un usage hors-ligne réel sur le terrain, l'app étant maintenant hébergée sur GitHub Pages plutôt que sur un serveur local.

**Vérifié via l'outil navigateur de Claude, sous la vraie adresse HTTPS** (`https://mmoreauprof-svg.github.io/mobilier-urbain/app/`) : le service worker s'enregistre et s'active avec succès (échec systématique observé précédemment sous serveur local — confirme que la cause de l'échec de l'étape 11 était l'absence de HTTPS, pas un problème de code) ; les 35 fichiers de l'app sont bien présents dans le cache après installation.

**Non vérifiable dans l'outil de Claude** : rechargement complet de la page hors réseau (pas de bascule "hors-ligne" disponible dans l'outil) — logique du service worker vérifiée par lecture de code et par l'état du cache peuplé, confirmation finale en conditions réelles (mode avion) laissée à l'utilisateur.

## Corrections de l'audit du 23/08 : pertes de données et échecs silencieux (2026-08-23)

Audit du code élargi (import/export GPKG, filtres, PWA/service worker) ayant identifié 8 points, tous corrigés sauf le point 5 (cas rare, laissé de côté à la demande explicite de l'audit) :

1. **Import — lignes ignorées sans compte-rendu** (`gpkg.js`, `lireCouche`) : géométrie non-point, champs obligatoires manquants/corrompus, `type_objet` non reconnu sont désormais comptés séparément et écartés plutôt qu'insérés tels quels. `messageResumeImport()` affiche le décompte après chaque import ("X objet(s) pris en compte, Y ignoré(s) [raison]").
2. **Import — schéma non vérifié** : couvert par le même mécanisme (champs obligatoires par couche : `CHAMPS_MOBILIER_OBLIGATOIRES`/`CHAMPS_COMMERCE_OBLIGATOIRES`, `commentaire`/`nom_commerce`/`date_fermeture` restent optionnels).
3. **Import — `type_objet` non reconnu → icône cassée et objet invisible des filtres** : validé contre `TYPES_MOBILIER_CONNUS` (dérivé de `COUCHES_MOBILIER`) à la lecture, rejeté sinon.
4. **Export — succès non garanti sur le repli `<a download>`** : `sauvegarderFichier()` renvoie désormais lequel des 3 mécanismes a été utilisé (`fichier`/`partage`/`telechargement`) ; le message affiché est honnête selon le niveau de confiance réel (confirmation ferme pour File System Access API, incertaine et signalée comme telle pour le repli téléchargement, qui ne peut techniquement pas être vérifié en JavaScript). Vérifié manuellement dans l'environnement de Claude (dépourvu de `showSaveFilePicker`/partage utilisable sans geste utilisateur) : message "Téléchargement lancé — vérifiez..." bien affiché.
5. *(non traité — cas rare selon l'audit, à surveiller seulement si un fichier `.gpkg` corrompu est un jour rapporté)*
6. **Service worker — `cache.addAll()` tout ou rien et silencieux** : remplacé par une mise en cache fichier par fichier (`Promise.allSettled`), qui poursuit même si un fichier échoue et prévient les pages ouvertes (`postMessage`) plutôt que d'échouer intégralement sans le dire.
7. **Échec d'enregistrement du service worker signalé seulement en console** : remonté aussi via `afficherBanniereErreur` (`app/js/pwa.js`), cohérent avec le filet déjà en place ailleurs dans l'app.
8. **Pas de garde contre un double clic sur "Exporter"** : drapeau `exportEnCours` + désactivation du bouton pendant l'export.

**Découverte pendant l'écriture des tests** (pas anticipée par l'audit) : `row.getValueWithColumnName()` de `geopackage-js` **lève une exception** pour une colonne réellement absente de la table, plutôt que de renvoyer `undefined` comme supposé — sans protection, cela aurait fait échouer la lecture de **toute** la couche (voire tout l'import) au lieu d'ignorer la seule ligne concernée. Corrigé par un `try/catch` autour de chaque accès de champ dans `lireCouche`, traité comme un champ manquant.

**Points 6 et 7 vérifiés sans passer par une vraie installation de service worker** (limitation connue du bac à sable de Claude, cf. section précédente) : la logique de mise en cache résiliente et le déclenchement de la bannière ont été exercés directement (même algorithme, message `postMessage` simulé) — confirmés corrects. Vérification end-to end (vraie installation défaillante sur un vrai appareil) non faite, jugée superflue vu que le mécanisme lui-même est validé et que l'enregistrement réel du service worker est déjà confirmé fonctionnel par ailleurs (section précédente).

7 nouveaux tests dans `test.html` (2 logique pure — `messageResumeImport` — + 5 fonctionnels). **Suite complète : 73/73 tests OK**, rejouée deux fois de suite.

## Analyse critique de la couverture — trous comblés (2026-08-23)

Nouvelle analyse (indépendante de l'audit précédent) sur la complétude de la suite. 4 des 5 trous identifiés ont donné lieu à un nouveau test ; le 5e a été écarté avec justification plutôt qu'appliqué tel quel :

1. **Service worker non testé** : `test.html` charge désormais aussi `service-worker.js` comme script normal (uniquement pour accéder à sa constante `FICHIERS_APP` — `self.addEventListener(...)` s'accroche sans risque à `window`, jamais déclenché ici). Nouveau test : chaque fichier de `FICHIERS_APP` répond bien 200 par `fetch()` — détecte un renommage/suppression avant même une tentative d'installation réelle. La logique `install`/`activate`/`fetch` elle-même (contexte Service Worker global) reste non rejouable dans ce harnais ; déjà vérifiée séparément par simulation directe de l'algorithme (cf. section précédente) et par une vraie installation sur GitHub Pages.
2. **Pas de round-trip export→import complet** : nouveau test dédié — les 5 types de mobilier urbain + 2 commerces (avec et sans champs optionnels renseignés) sont enregistrés, exportés, réimportés, puis chaque champ est comparé un à un à l'original (coordonnées avec tolérance flottante), en plus de vérifier qu'aucune anomalie n'est comptée (§ précédente).
3. **`storage.js` sans test de succès direct** : nouveau test appelant directement `enregistrerDansStore`/`listerStore`/`supprimerDeStore`/`viderStore` (pas via les wrappers `enregistrerMobilierUrbain` etc.) et vérifiant le contenu retourné à chaque étape.
4. **Fichiers icônes SVG jamais vérifiés comme existant réellement** : même principe que le point 1, `fetch()` sur chaque chemin de `FICHIERS_ICONE_MOBILIER` + les 2 icônes commerce.
5. **Double-clic sur Importer, écarté** : contrairement à Exporter avant sa correction, `fermerChoixImport()` vide `gpkgEnAttenteImport` et cache le modal **avant** tout `await` dans les gestionnaires "Fusionner"/"Remplacer" — un second clic (réel ou scripté) tombe donc déjà sur `if (!donnees) return`. Pas de bug réel identifié, donc pas de garde ajoutée ; un test de non-régression vérifie que cette protection existante reste en place plutôt que d'ajouter du code redondant.

5 nouveaux tests (1 fonctionnel storage.js, 1 round-trip, 1 régression import, 1 existence icônes, 1 existence fichiers service worker). **Suite complète : 78/78 tests OK**, rejouée deux fois de suite.

## Panneaux de saisie, édition/suppression, raccourcis PC, couleurs (2026-08-23)

Demande utilisateur en 4 volets (A : ergonomie des panneaux, B : édition/suppression, C : saisie en chaîne PC, D : couleurs) suite à un usage intensif sur le terrain — cf. Specifications.md §6.1, §6.4, §6.6, §6.6bis pour le détail fonctionnel. 12 nouveaux tests :

- **Harnais de test mis à jour** en conséquence : classe `panneau-formulaire` ajoutée aux divs (nécessaire aux nouveaux sélecteurs CSS de `ajusterPanneauxMobilesViewport`), boutons Enregistrer passés en `type="submit"`, boutons Supprimer retirés (cf. §B), nouveau helper `boutonPopupSupprimer()` symétrique à `boutonPopup()` existant.
- **§A.2 (Entrée = Enregistrer)** : 2 tests via `form.requestSubmit()` — emprunte le même chemin que la touche Entrée (événement `submit` du formulaire), contrairement à `.click()` qui ne teste que la souris.
- **§A.3 (panneau déplaçable PC)** : 2 tests — le titre-poignée déplace bien le panneau via mousedown/mousemove/mouseup sur PC, sans aucun effet sur mobile (pas de poignée active hors PC).
- **§A.4 (viewport visuel mobile)** : 1 test avec `window.visualViewport` temporairement redéfini (repli neutre si le navigateur refuse la redéfinition — non testable plutôt que faux échec).
- **§B.1 (popup à 2 boutons)** : 2 tests vérifiant la présence de boutons "Modifier"/"Supprimer" distincts, plus les 2 tests de suppression directe déjà existants réécrits (suppression sans jamais ouvrir le panneau d'édition).
- **§C (raccourcis clavier PC)** : 3 tests — `M`/`C` ouvrent les panneaux et un chiffre sélectionne le type mobilier ouvert ; aucun effet si le focus est dans un champ de saisie (protection anti-interférence, y compris clavier virtuel mobile) ; aucun effet en dessous de 768px de large.
- **§D (couleurs)** : 2 tests — couleurs de fond réelles des 7 fichiers SVG vérifiées par leur contenu (`fetch`), fond de la pastille de quantité vérifié par `getComputedStyle` (gris neutre `#333333`, plus le rouge d'origine).

**Bugs de test trouvés et corrigés en cours de route** (pas des bugs de l'app) : le sélecteur `.panneau-formulaire` du test viewport ne trouvait rien tant que la classe manquait dans le harnais ; le test de protection clavier échouait car `focus()` sur un champ dans un panneau caché (`display:none`) ne fonctionne jamais côté navigateur — corrigé en rendant le panneau visible avant le focus, comme en usage réel.

**Vérifications manuelles complémentaires** via l'outil navigateur de Claude sur l'app réelle : couleurs d'icônes confirmées par lecture directe du SVG servi (et par échantillonnage de pixels sur canvas, hors zones de glyphe blanc) ; popup à 2 boutons et suppression directe confirmés ; déplacement du panneau confirmé (delta de position exact) ; raccourcis `M`/`C`/chiffre confirmés en conditions réelles ; largeur iPhone 15 (393px) vérifiée sans débordement horizontal (`scrollWidth === innerWidth`) et sans contenu masqué (`clientHeight === scrollHeight`, tout tient sans besoin de défilement) ; taille de police des listes déroulantes confirmée à 14px (alignée sur les labels).

**Suite complète : 90/90 tests OK** (39 logique pure + 51 parcours fonctionnels), rejouée deux fois de suite.

**Ajustement de couleurs (23/08, suite)** : retour utilisateur sur la palette D — banc en vert foncé (`#1b5e20`, plus rose), distributeur de sacs en marron (`#5d4037`, séparé de la corbeille qui reste orange), arrêt de bus en bleu clair (`#29b6f6`, séparé de l'abri bus qui reste bleu), commerce occupé en vert clair (`#4caf50`, plus foncé). Test des couleurs de fond (`attendus`) mis à jour en conséquence. Suite rejouée : toujours 90/90 OK.

**Focus automatique + mémorisation du dernier type, PC uniquement (23/08, suite)** : retour utilisateur — le bouton Enregistrer n'était activable qu'à la souris, aucun champ n'ayant le focus à l'ouverture du panneau (Entrée sans effet tant qu'on n'avait pas cliqué explicitement dans un champ). Corrigé pour la saisie en chaîne sur PC (plusieurs centaines d'objets à créer) sans toucher à l'usage mobile (plus unitaire, geolocalisation courante) :
- La liste **Type** reçoit le focus à l'ouverture du panneau (création et édition), PC uniquement — un `<select>` focus fait partie des déclencheurs standards de soumission du formulaire à la touche Entrée, au même titre qu'un champ texte.
- Le **dernier type créé** est mémorisé (`dernierTypeMobilier`/`dernierTypeCommerce`) et pré-rempli à la prochaine création, PC uniquement — permet d'enchaîner Entrée seule pour plusieurs objets du même type d'affilée, sans revenir sur la liste.

3 nouveaux tests : mémorisation + focus + Entrée seule suffisant pour un second objet (mobilier, PC) ; comportement mobile inchangé (type par défaut, aucun focus automatique) ; mémorisation + focus côté commerce (PC). **Suite complète : 93/93 tests OK**, rejouée deux fois de suite. Vérification manuelle complémentaire concluante sur l'app réelle (type mémorisé et focus confirmés après un premier enregistrement).

**Correction du focus (23/08, suite immédiate)** : retour utilisateur — le focus initial sur la liste Type rouvrait sa liste déroulante à la touche Entrée au lieu de soumettre le formulaire (comportement natif variable selon navigateur, différent de ce qu'indique la spécification HTML). Corrigé en focusant directement le bouton **Enregistrer** (PC uniquement, création et édition) plutôt que la liste — un bouton active toujours sans ambiguïté à Entrée. Les 3 tests ci-dessus adaptés en conséquence (vérifient le focus sur `bouton-enregistrer-mobilier`/`commerce` au lieu de la liste Type). **Suite complète : toujours 93/93 tests OK**, rejouée deux fois de suite. Non vérifiable automatiquement dans ce harnais que le comportement natif exact du navigateur (Entrée sur un bouton vs un select) — confirmé par connaissance générale de la plateforme web (activation d'un bouton focus par Entrée : comportement standard et non ambigu, contrairement au cas du `<select>`) ; confirmation finale par l'utilisateur sur son clavier réel.

## Fusion : prise en compte des modifications (2026-08-23, usage terrain)

Suite à un usage réel sur deux appareils l'après-midi du 23/08, l'utilisateur a identifié que "Fusionner" ignorait silencieusement toute modification faite sur l'autre appareil pour un objet déjà connu localement (uid existant → toujours ignoré, jamais mis à jour). Demande volontairement limitée à la modification (pas la suppression, traitée par convention "A SUPPRIMER" + résolution manuelle dans QGIS, hors périmètre de l'app).

**Correctif** : `appliquerImport` (mode fusionner) compare désormais `last_update` — l'objet importé remplace le local si strictement plus récent, sinon ignoré comme avant. `messageResumeImport` affiche le détail (ajoutés/mis à jour/ignorés) uniquement pour ce mode (absent pour "remplacer", qui n'a pas cette notion).

2 nouveaux tests : mise à jour effective quand l'importé est plus récent (avec vérification du message affiché) ; non-écrasement quand l'importé est plus ancien ou identique. Le test existant "fusionner ignore les doublons" reste valide sans modification (les objets comparés ont un `last_update` identique de part et d'autre, donc toujours ignorés sous la nouvelle logique aussi). **Suite complète : 95/95 tests OK**, rejouée deux fois de suite consécutives (un échec isolé et non reproductible du test viewport — déjà signalé comme dépendant de l'environnement — observé une fois avant ces deux relances propres).

## Relecture du 24/08 : 4 trous comblés

Nouvelle demande de tests, indépendante de l'audit précédent :

1. **Logique réelle du service worker (install/fetch), jamais exercée** : `service-worker.js` ne peut pas tourner dans un vrai contexte Service Worker au sein de ce harnais (contexte global distinct, non reproductible fidèlement). Plutôt qu'accepter cette limite telle quelle, la logique de décision a été **extraite en fonctions pures**, sans changer le comportement :
   - `strategieCache(methode, url)` — remplace le `if/else` imbriqué du gestionnaire `fetch` (tuile OSM / fichier de l'app / rien), retourne une chaîne testable directement.
   - `fichiersEnEchec(resultatsAllSettled, fichiers)` — remplace le `.map().filter()` du gestionnaire `install` qui identifie les fichiers n'ayant pas pu être mis en cache.
   - 4 nouveaux tests directs sur ces fonctions + `estTuileOsm` (déjà pure), sans mock de `caches`/`fetch`/`self.clients`. `VERSION` incrémentée à `v3` (changement de code publié, cf. règle du fichier).
2. **Suppression directe (popup) jamais testée en échec IndexedDB**, contrairement à l'enregistrement : 2 nouveaux tests (mobilier + commerce) — `supprimerDeStore` substitué pour échouer, vérifie l'alerte affichée et l'absence de toute suppression réelle (donnée + marqueur).
3. **Bouton Annuler jamais testé explicitement** : 4 nouveaux tests (création et édition, mobilier et commerce) — modification de champs puis Annuler, vérifie qu'aucune écriture n'a eu lieu et que l'objet existant (cas édition) reste strictement inchangé.
4. **`visualViewport` non testable rendu visible** : nouvelle fonction `ignorer(nom, raison)`, distincte de `verifier()` — enregistre une ligne `SKIP - ...` et incrémente un compteur séparé (`ignores`), sans jamais compter comme un succès. Le résumé final affiche `(+ N ignoré(s), cf. SKIP ci-dessus)` quand c'est le cas. Le test `ajusterPanneauxMobilesViewport` utilise désormais ce mécanisme au lieu d'un `return true` silencieux.

**10 nouveaux tests. Suite complète : 105/105 tests OK**, rejouée deux fois de suite consécutives sans échec (un échec isolé du test viewport observé une fois avant ces deux relances, non reproductible — comportement déjà connu, pas lié aux changements de cette session).

## Bug de terrain (24/08) : barre d'outils mobile disparaissant sur iPhone 15

Cf. Specifications.md §6.6ter pour le contexte et les 3 corrections (zoom de page désactivé, `reafficherBarresMobiles()`, bouton filtre en `position: fixed`, zone sûre iPhone). 6 nouveaux tests :

- Logique pure : `reafficherBarresMobiles()` réaffirme un affichage normal même si la barre/le bouton avaient été masqués (simulé directement).
- Fonctionnel : chaque point de fermeture (mobilier, commerce, écran Fichier) déclenche bien cette réaffirmation — vérifié en masquant artificiellement la barre juste avant de fermer, puis en confirmant qu'elle est réaffichée.
- `index.html` contient bien `user-scalable=no`, `maximum-scale=1.0` et `viewport-fit=cover`.
- `#bouton-filtres-mobile` est bien en `position: fixed` (plus `absolute`).

**Diagnostic précis d'une instabilité déjà notée** (§ précédente, "un échec isolé... non reproductible") : en creusant la réapparition de cet échec pendant cette session, la cause réelle a été identifiée — `window.innerHeight`/`innerWidth` valent **0** dans l'outil navigateur de Claude quand le panneau n'est pas activement affiché/composité au moment de l'exécution (même famille que l'incapacité déjà connue à produire des captures d'écran ; confirmé qu'un onglet fraîchement créé en arrière-plan, ou même remis au premier plan sans y exécuter de JS entre-temps, peut renvoyer 0). Le test s'appuyait sur `window.innerHeight` sans s'en prémunir. Corrigé : une vérification explicite déclenche désormais `ignorer()` (SKIP) quand `window.innerHeight` vaut 0, plutôt que de calculer un résultat faux à partir d'une valeur invalide. Note pratique retenue pour la suite : préférer `preview_start` à `tabs_create` pour obtenir un onglet correctement dimensionné dès le départ.

**Suite complète : 110/110 tests OK** (+ 1 ignoré, SKIP désormais correctement déclenché plutôt qu'un faux échec), rejouée deux fois de suite. Vérifications manuelles complémentaires sur l'app réelle à 393px de large (iPhone 15) : barre d'onglets confirmée `position: fixed`/`display: flex`, bouton filtre confirmé `position: fixed`, balise viewport confirmée, et le scénario exact du bug simulé directement (masquer la barre puis fermer un panneau) confirme la réaffirmation automatique.
