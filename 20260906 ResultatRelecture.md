# Résultat de relecture — 2026-09-06

> Relecture complète du code conformément à `GuideCommunRelectureCode.md` (`ClaudeCode\RelectureCode`), déclenchée par l'ajout de la fonctionnalité de modification de position (§6.1quinquies Recentrage, §6.4ter Modification de l'emplacement dans `Specifications.md`). Relecture par lecture de code uniquement, sans exécution — à confirmer/reproduire par le développement avant correction.

## Problèmes détectés

### 1. [Sévère] État de sélection de carte non nettoyé sur plusieurs chemins de sortie

**Fichiers concernés** : `app/js/map.js` (`demanderPositionSurCarte`), `app/js/mobilier.js` / `app/js/commerce.js` (`modifierEmplacementMobilier` / `modifierEmplacementCommerce`).

**Constat** : `modifierEmplacementMobilier()`/`Commerce()` masquent le panneau directement (`panneau.hidden = true`) puis appellent `demanderPositionSurCarte(...)`, qui attache un écouteur `map.on('click', ...)`. Cet écouteur n'est annulé que par trois chemins : clic sur la bannière bleue, clic sur la carte (complétion normale), ou démarrage d'une autre sélection (préemption automatique interne à `demanderPositionSurCarte`). Vérifié par recherche exhaustive : `annulerSelectionCarteEnCours` n'est référencé nulle part ailleurs dans le code.

Or plusieurs actions permettent de sortir de cet état sans passer par l'un de ces trois chemins :
- cliquer l'onglet **« Carte »** (mobile) — `fermerFormulaireMobilier()`/`Commerce()` ne l'annulent pas ;
- utiliser les raccourcis clavier **M/C** (PC) — le garde-fou `panneauMobilierOuvert`/`panneauCommerceOuvert` (`interface.js`) teste l'attribut `hidden` du panneau, or celui-ci est justement masqué pendant la sélection, donc le raccourci passe et ouvre un **nouveau** panneau pendant que l'ancien écouteur de clic carte reste actif ;
- ouvrir **« Modifier »** sur un *autre* marqueur pendant qu'une sélection est en attente.

**Conséquence** : le prochain clic sur la carte déclenche l'ancien callback de sélection, qui applique le nouvel emplacement à la variable `uidEnEditionMobilier`/`Commerce` **en cours au moment du clic** — pas nécessairement l'objet pour lequel la sélection avait été initialement demandée. Le seul indice visible pour l'utilisateur est que la bannière bleue et le curseur en croix restent affichés par-dessus l'écran suivant, sans qu'aucun message n'explique pourquoi.

**Cause racine** : ce mécanisme de sélection (déjà existant pour la création sans GPS) se gérait jusqu'ici entièrement par préemption interne. La nouvelle fonction `modifierEmplacementX()` introduit une sortie/rentrée de panneau qui contourne les fonctions `fermerFormulaireX()`/`ouvrirEditionX()` habituelles, qui sont les seuls points où un nettoyage aurait pu être ajouté.

**Correction suggérée** : faire en sorte que tout chemin qui referme ou change le panneau pendant une sélection en cours appelle explicitement l'annulation (exposer une fonction du type `annulerSelectionCarteSiActive()` dans `map.js`, à appeler depuis `fermerFormulaireMobilier()`, `fermerFormulaireCommerce()`, `ouvrirEditionMobilier()`, `ouvrirEditionCommerce()`, et le gestionnaire de l'onglet « Carte »). Alternative plus robuste : désactiver visuellement (griser) les onglets/raccourcis tant qu'une sélection de carte est active, plutôt que de tenter de couvrir tous les points de sortie un par un.

**Test à ajouter** : démarrer « Modifier l'emplacement » sur un objet, sortir par un chemin alternatif (onglet Carte, raccourci M/C, édition d'un autre objet), cliquer la carte, vérifier qu'aucune position n'est appliquée à un objet non concerné.

### 2. [Sécurité] `uid` non échappé dans les attributs `onclick` des popups

**Fichiers concernés** : `construirePopupMobilier` (`mobilier.js`), `construirePopupCommerce` (`commerce.js`), `lireCouche` (`gpkg.js`).

**Constat** : `commentaire` et `nom_commerce` passent par `echapperHtml()` avant insertion dans le HTML du popup, mais `uid` est interpolé brut : `onclick="ouvrirEditionMobilier('${objet.uid}')"` / `supprimerMobilier('${objet.uid}')` (même schéma côté commerce). En usage normal, `uid` est généré en interne (`{code_appareil}-{compteur}`, code validé par une regex `[A-Za-z]{2,4}`), donc sans risque. Mais `lireCouche` (import GPKG) valide seulement que `uid` n'est pas `undefined` — aucune validation de format n'est appliquée à la valeur importée.

**Conséquence** : un fichier `.gpkg` réédité à la main (c'est un fichier SQLite standard, éditable avec n'importe quel outil) contenant un `uid` construit du type `x');alert(document.cookie)//` casserait l'attribut `onclick` et exécuterait du JavaScript arbitraire à la prochaine ouverture de ce popup. Vecteur étroit (nécessite qu'un fichier `.gpkg` malveillant soit importé) mais réel.

**Correction suggérée** : appliquer `echapperHtml()` à `objet.uid` dans `construirePopupMobilier`/`construirePopupCommerce`, comme déjà fait pour les autres champs texte. Envisager en complément une validation du format de `uid` à l'import (`lireCouche`), cohérente avec le format `{code_appareil}-{compteur}` attendu, pour rejeter/compter une ligne dont le `uid` est manifestement corrompu — même logique que les compteurs `geometrieInvalide`/`champsManquants`/`typeNonReconnu` déjà en place.

**Test à ajouter** : import d'un fichier GPKG dont un `uid` contient des caractères d'échappement HTML/JS ; vérifier que le popup généré ne contient aucun code exécutable.

## Point mineur, non confirmé

`#bouton-recentrer-mobile` (`top: 54px`) et `#panneau-filtres` (`top: 50px`) sont proches en CSS (`style.css`) — chevauchement visuel possible non confirmé sans exécution réelle, à vérifier visuellement plutôt qu'à corriger à l'aveugle.

## Points vérifiés sans anomalie

- **Cohérence structurelle** : tous les fichiers référencés (icônes recyclage, liste `FICHIERS_APP` du service worker, scripts chargés dans `index.html`) existent et sont cohérents entre eux.
- **Cohérence des contrats** : `genererUid()` est désormais asynchrone (`navigator.locks`) et tous les appelants (`mobilier.js`/`commerce.js`) utilisent bien `await` — cohérent de bout en bout.
- **Dépendances** : aucune nouvelle dépendance vendorisée introduite par cette fonctionnalité. `package.json`/`node_modules` à la racine du dépôt sont liés à l'outillage de génération des présentations PowerPoint, hors du périmètre de la PWA.
- **Logique métier** : exclusion correcte de l'objet en cours de modification dans la détection de doublon lors d'un déplacement (comparaison aux *autres* objets uniquement).
- **Gestion des erreurs** : `try/catch` présents et cohérents sur les nouveaux chemins de code (enregistrement avec déplacement inclus).
- **Cohérence documentation ↔ code** : `Specifications.md` est à jour et fidèle au comportement implémenté (§6.1quinquies, §6.4ter).
