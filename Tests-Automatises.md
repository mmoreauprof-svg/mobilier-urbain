# Tests automatisés — démarche de Claude

> Ce document décrit les vérifications que Claude effectue **de façon autonome**, avant chaque livraison d'une itération de l'étape 4 — en complément, et non en remplacement, des tests utilisateur manuels documentés dans `Procédures Test.md`.

## Deux couches de vérification

| | Qui | Où c'est documenté | Couvre |
|---|---|---|---|
| Tests manuels utilisateur | Vous | `Procédures Test.md` | PC / Android / iPhone, ergonomie réelle, GPS réel |
| Tests automatisés | Claude, en autonomie | Ce fichier | Logique pure + parcours fonctionnel de base |

Les tests automatisés ne remplacent jamais les tests manuels : ils ne peuvent pas couvrir le GPS réel, les comportements spécifiques iOS Safari / Android Chrome, ni l'ergonomie tactile.

## a) Logique pure — `app/tests/test.html`

Une page HTML autonome (sans framework de test, cohérent avec le choix "sans outillage" de l'étape 2) qui exécute une série d'assertions JavaScript et affiche un résumé PASS/FAIL. Elle couvre les fonctions qui ne dépendent ni du GPS ni du navigateur :

- Calcul de distance et détection de doublon (seuil 5 m)
- Génération du `uid` (`{code_appareil}-{compteur_local}`)
- Logique de fusion à l'import (`remplacer` / `fusionner`, dédoublonnage par `uid`)

*(fichier créé au moment où la première de ces fonctions sera implémentée)*

## b) Parcours fonctionnel — via l'outil de navigateur de Claude

Avant de rapporter qu'une itération est terminée, Claude pilote lui-même l'application (clics, remplissage de formulaire, vérification de l'affichage, absence d'erreur console) pour rejouer le parcours principal concerné par le changement.

## Cycle de vie de la checklist

1. **Créer** — à l'implémentation d'une nouvelle fonction pure, ses cas de test (normal, limite, erreur) sont ajoutés à `test.html`.
2. **Enrichir** — à chaque itération suivante, les nouveaux cas s'ajoutent aux précédents ; la suite ne repart jamais de zéro.
3. **Valider** — avant d'annoncer une itération terminée, Claude rejoue **toute** la suite existante (pas seulement le dernier ajout) et rapporte le résultat (ex. « 12/12 tests OK ») dans la conversation.

## État actuel de la suite

*(vide — sera renseigné dès la première fonction de logique pure de l'étape 4)*

| Fonction testée | Nombre de cas | Dernière validation |
|---|---|---|
| — | — | — |
