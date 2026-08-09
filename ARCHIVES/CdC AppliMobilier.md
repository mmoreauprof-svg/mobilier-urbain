# Exigences

## Fonctionnement

L'application doit présenter un fond cartographique type open Street Map, indiquer ma position en temps réel.

L’interface propose deux boutons pour créer 

- Soit un mobilier urbain : lorsque je clique sur le bouton il doit enregistrer ma position et me proposer un menu déroulant où je peux sélectionner le type de mobilier urbain puis préciser le nombre, l’état et ajouter un commentaire éventuel. La liste complète des champs est précisée après dans Format de données.  
- Soit les commerces : lorsque je clique sur le bouton sur le même principe il me permet de saisir le type de commerce et les différentes informations (hors date, heure et position qui sont renseignés automatiquement).

Les objets urbains et commerces sont enregistrés avec leur informations et leurs coordonnées. Les données sont sauvegardées de façon permanente en local afin que je puisse reprendre le recensement un autre jour et compléter la cartographie. 

À la demande, je peux faire un import ou un export dans un format standard de tous les mobiliers urbains et commerces enregistrés au format GPKG. 

Je dois pouvoir sélectionner un objet enregistré pour modifier ses informations ou le supprimer.

## Format de données

**Format de données** \- **mobilier\_urbain**

* Type : POINT

* Système de coordonnées recommandé : **EPSG:2154 (Lambert-93)** → Standard français, utilisé par les collectivités et les opérateurs de transport.

| Champ | Type | Description | Valeur par défaut |
| :---- | :---- | :---- | :---- |
| **id** | INTEGER (PK) | Identifiant unique du mobilier |  |
| **type\_objet** | TEXT | Banc, corbeille, distributeur de sac, arrêt de bus, abri bus |  |
| **etat** | TEXT | état : bon, moyen, mauvais, HS |  |
| **nombre** | INTEGER | Entier | 1 |
| **commentaire** | TEXT | Notes diverses |  |
| **last\_update** | DATETIME | Date de mise à jour | Date de saisie |
| **Coordonnées**  | POINT | Données géolocalisées  | Données géolocalisées au moment de la saisie |

**Format de données** \- **commerce**

* Type : POINT

* Système de coordonnées recommandé : **EPSG:2154 (Lambert-93)** → Standard français, utilisé par les collectivités et les opérateurs de transport.

| Champ | Type | Description | Valeur par défaut |
| :---- | :---- | :---- | :---- |
| **Id** | INTEGER (PK) | Identifiant unique  |  |
| **type\_objet** | TEXT | Commerce |  |
| **Etat** | ENUM | Liste : Ouvert, Fermé | Fermé |
| **Nom commerce** | TEXT | Nom du commerce |  |
| **Type de commerce** | ENUM | Type commerce : superette, coiffeur, banque, vêtements, boulangerie, restaurant, onglerie, opticien, autre commerce, autre service |  |
| **Date fermeture** | DATETIME | Date fermeture |  |
| **commentaire** | TEXT | Notes diverses |  |
| **last\_update** | DATETIME | Date de mise à jour | Date de saisie |
| **Coordonnées**  | POINT | Données géolocalisées  | Données géolocalisées au moment de la saisie |

## Contraintes techniques

L’application doit exister en deux versions :

- Android  V16  
- IOS 26.5

**Fond de carte**

- OpenStreetMap – centrée sur Viroflay  \-fond de carte standard

L’application fonctionne hors-ligne.

# Propositions à discuter

## Choix d'architecture pour l'application

Une **PWA** (Progressive Web App) plutôt qu'une application native React Native/Flutter :

* **Fond de carte** : Leaflet.js \+ tuiles OpenStreetMap — gratuit, pas de clé API, très documenté, Claude Code le génère de façon fiable.

* **Position temps réel** : API Geolocation du navigateur (navigator.geolocation.watchPosition).

* **Stockage persistant** : IndexedDB — les relevés restent sur le téléphone d'une session à l'autre, sans backend.

* **Import / Export** : GPKG pour QGIS

* **Installation simple sur le téléphone** : l'app s'ajoute à l'écran d'accueil comme une app native.

## Développement

Développement incrémental avec validation des fonctionnalités à chaque étape.

Test humain possible en local sur un PC.

