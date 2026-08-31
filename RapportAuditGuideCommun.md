# Rapport d'audit — application par le Guide commun de relecture de code

> Application du `GuideCommunRelectureCode.md` (`ClaudeCode\RelectureCode`) au projet MobilierUrbain, 2026-08-23. Audit par lecture de code uniquement (pas d'exécution) — vient en complément des tests automatisés (`app/tests/test.html`) et des tests utilisateur (`Procédures Test.md`), pas en remplacement.

## Points nécessitant une correction ou une décision

### 1. [Nouveau] Risque de collision d'`uid` si l'app est ouverte dans deux onglets du même appareil (guide §7 — Concurrence et état partagé)

**Où** : `app/js/device.js`, fonction `genererUid()`.

**Constat** : la génération d'`uid` lit `compteurLocal` dans `localStorage`, l'incrémente, puis le réécrit — trois opérations non atomiques. `localStorage` est partagé entre tous les onglets d'une même origine ; si l'application est ouverte dans deux onglets du même navigateur (par exemple laissée ouverte par erreur, ou testée en parallèle) et qu'un objet est enregistré depuis chacun à quelques millisecondes d'intervalle, les deux onglets peuvent lire la même valeur de compteur avant que l'un des deux ne l'ait réécrite, produisant **deux objets différents avec le même `uid`**.

**Impact** : silencieux — aucune erreur, aucun message. La collision ne se révélerait qu'au moment d'une fusion GPKG, où l'un des deux objets écraserait l'autre (ou serait ignoré) sans avertissement spécifique, puisque le mécanisme de dédoublonnage repose entièrement sur l'unicité de l'`uid`.

**Suggestion** : documenter la contrainte "un seul onglet actif à la fois par appareil" dans `Procédures Test.md`/les specs si elle est jugée acceptable telle quelle (probabilité faible en usage réel terrain, un seul onglet ouvert à la fois) ; ou blinder `genererUid()` avec un identifiant additionnel peu coûteux (composante temporelle, verrou via `BroadcastChannel`/`navigator.locks` si le navigateur cible le permet) si la marge de risque est jugée insuffisante.

### 2. [Nouveau, informationnel] Les requêtes de tuiles OpenStreetMap révèlent la zone géographique consultée (guide §12/§15)

**Où** : `app/js/map.js`, `app/service-worker.js`.

**Constat** : chaque tuile de carte affichée est demandée directement au serveur de tuiles OpenStreetMap, avec les coordonnées de la zone visible dans l'URL. C'est un comportement standard et inhérent à l'usage direct d'OSM (pas un défaut d'implémentation), mais cela signifie que le serveur de tuiles (et tout observateur du trafic réseau) peut déduire la position approximative de l'utilisateur à chaque affichage de carte — y compris hors du moment précis d'une saisie.

**Suggestion** : ce n'est pas un bug à corriger, mais une limite absente de la section vie privée des spécifications (`Specifications.md` ne mentionne que le fait que les données de relevé restent locales — pas ce point). À documenter explicitement comme limite connue et acceptée, pour que ce soit une décision assumée plutôt qu'un angle mort.

### 3. [Rappel] Trois trous de couverture de tests déjà identifiés, toujours ouverts (guide §14)

Consolidés ici pour mémoire, déjà signalés lors des sessions précédentes :
- Le service worker n'est jamais exécuté par un test automatisé (seule la liste des fichiers qu'il doit mettre en cache est vérifiée).
- Aucun test d'échec IndexedDB sur la suppression directe (`supprimerMobilier`/`supprimerCommerce`) — le code protège bien ce cas (`try/catch` présent, vérifié à cette relecture), mais rien ne garantit qu'il le restera après une future modification.
- Aucun test dédié au bouton "Annuler" d'un formulaire (vérifier explicitement qu'aucune écriture n'a lieu après annulation).

### 4. [Contrôle à planifier, pas une anomalie] Absence d'outil d'audit de vulnérabilités sur les dépendances vendorisées (guide §11)

Le projet n'utilisant ni gestionnaire de paquets ni bundler (choix assumé, cf. `Specifications.md` §3), aucun outil du type `npm audit` n'est disponible pour vérifier automatiquement les bibliothèques vendorisées (Leaflet 1.9.4, geopackage-js/sql.js 4.2.8). Une vérification manuelle périodique (avis de sécurité publiés pour ces versions précises) est recommandée mais n'a pas pu être automatisée dans le cadre de cet audit.

---

## Contrôles effectués sans anomalie trouvée

- **Sécurité (§5)** : aucune insertion de HTML non échappé en dehors du mécanisme volontaire d'échappement (`echapperHtml`) ; aucun `eval`, aucune construction de requête par concaténation (le contournement SQL de `gpkg.js` utilise des paramètres liés, pas de concaténation de valeurs).
- **Secrets (§10)** : aucune clé, mot de passe ou jeton codé en dur trouvé dans le code source.
- **Appels réseau (§12)** : liste exhaustive confirmée — tuiles OpenStreetMap et fichiers de l'app via le service worker uniquement ; aucun appel non documenté, aucun script de suivi/analytics.
- **Cohérence structurelle (§2)** : tous les fichiers référencés (scripts, icônes, liste de précache du service worker) existent réellement et correspondent à l'inventaire réel.
- **Déclencheurs non câblés (§1)** : tous les boutons identifiés ont un gestionnaire d'événement associé ; aucun résidu de l'ancien bouton unique "Modifier / Supprimer" (proprement retiré lors de la scission en deux boutons).
- **Code mort (§9)** : sondage ciblé sur plusieurs fonctions candidates (`viderMarqueurs`, `rendreDeplacable`, `focusDansChampEditable`...) — toutes utilisées. Non exhaustif faute d'outil de lint automatisé pour ce projet sans bundler.
- **Cohérence des données de bout en bout (§3)** : déjà vérifiée en profondeur lors d'une session précédente (test de round-trip export→import GPKG couvrant tous les champs).

## Non applicable à ce projet

- Rien à signaler sur les contrats externes (§4) au-delà de ce qui est déjà documenté (deux bugs connus de `geopackage-js` 4.2.8, contournés et commentés dans `gpkg.js`).
