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
