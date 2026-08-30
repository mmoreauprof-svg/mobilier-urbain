// Export / Import GeoPackage (§6.5, §6.5bis des spécifications — étapes 9-10)
//
// IMPORTANT — bug de librairie contourné : geopackage-js 4.2.8, sous son
// adaptateur navigateur (sql.js), omet certains paramètres nommés
// ($id, $geometry...) de la requête SQL générée par FeatureRow/dao.create(),
// que sql.js refuse ("Wrong API use : tried to bind a value of an unknown
// type (undefined)"). Contournement : les lignes sont insérées en SQL brut
// (gp.connection.insert) avec tous les paramètres explicitement fournis, et
// la géométrie (points uniquement, suffisant ici) est encodée à la main au
// format GeoPackageBinary plutôt que via la classe Geometry de la librairie.
// La lecture évite iterateGeoJSONFeatures()/queryForGeoJSONFeaturesInTable,
// qui ont un bug distinct ("t.projectBoundingBox is not a function") ; on
// lit via dao.queryForAll()/dao.getRow() à la place.

// Chemin calculé relativement à ce script (et non à la page appelante) : sinon
// ça casse quand gpkg.js est chargé depuis app/tests/test.html au lieu de
// app/index.html, les deux pages n'étant pas au même niveau de dossier.
const CHEMIN_BASE_APP = new URL('..', document.currentScript.src).href;
window.GeoPackage.setSqljsWasmLocateFile(() => CHEMIN_BASE_APP + 'lib/geopackage/sql-wasm.wasm');

const SRS_ID_GPKG = 4326;

const COUCHES_MOBILIER = [
  { type: 'Banc', table: 'banc', identifiant: 'Bancs' },
  { type: 'Corbeille', table: 'corbeille', identifiant: 'Corbeilles' },
  { type: 'Distributeur de sacs', table: 'distributeur_sacs', identifiant: 'Distributeurs de sacs' },
  { type: 'Arrêt de bus', table: 'arret_bus', identifiant: 'Arrêts de bus' },
  { type: 'Abri bus', table: 'abri_bus', identifiant: 'Abris bus' },
  // Nouvelle catégorie recyclage (24/08), ajoutée en fin de liste : les 3
  // nouveaux types ne remplacent ni ne renomment rien, donc aucun impact sur
  // les mobiliers déjà enregistrés (ni en local, ni dans un .gpkg existant).
  { type: 'Recyclage verre', table: 'recyclage_verre', identifiant: 'Recyclage verre' },
  { type: 'Recyclage électronique', table: 'recyclage_electronique', identifiant: 'Recyclage électronique' },
  { type: 'Recyclage autre', table: 'recyclage_autre', identifiant: 'Recyclage autre' }
];

const CHAMPS_MOBILIER = ['uid', 'type_objet', 'etat', 'nombre', 'commentaire', 'last_update'];
// commentaire est le seul champ facultatif — les autres, s'ils manquent (colonne
// renommée/supprimée dans un .gpkg réédité), signalent une ligne corrompue (audit 2026-08-23, point 2).
const CHAMPS_MOBILIER_OBLIGATOIRES = ['uid', 'type_objet', 'etat', 'nombre', 'last_update'];
const CHAMPS_MOBILIER_TYPES = [
  { name: 'uid', dataType: 'TEXT' },
  { name: 'type_objet', dataType: 'TEXT' },
  { name: 'etat', dataType: 'TEXT' },
  { name: 'nombre', dataType: 'INTEGER' },
  { name: 'commentaire', dataType: 'TEXT' },
  { name: 'last_update', dataType: 'DATETIME' }
];

const CHAMPS_COMMERCE = ['uid', 'nom_commerce', 'type_commerce', 'etat', 'date_fermeture', 'commentaire', 'last_update'];
// nom_commerce, date_fermeture et commentaire sont facultatifs (§6.3).
const CHAMPS_COMMERCE_OBLIGATOIRES = ['uid', 'type_commerce', 'etat', 'last_update'];
const CHAMPS_COMMERCE_TYPES = [
  { name: 'uid', dataType: 'TEXT' },
  { name: 'nom_commerce', dataType: 'TEXT' },
  { name: 'type_commerce', dataType: 'TEXT' },
  { name: 'etat', dataType: 'TEXT' },
  { name: 'date_fermeture', dataType: 'TEXT' },
  { name: 'commentaire', dataType: 'TEXT' },
  { name: 'last_update', dataType: 'DATETIME' }
];

// --- Fonctions pures (géométrie, mapping) ---

function encoderPointGeoPackageBinary(lon, lat, srsId) {
  const buffer = new ArrayBuffer(29);
  const vue = new DataView(buffer);
  vue.setUint8(0, 0x47); // 'G'
  vue.setUint8(1, 0x50); // 'P'
  vue.setUint8(2, 0);    // version
  vue.setUint8(3, 1);    // flags : little endian, pas d'enveloppe, géométrie non vide
  vue.setInt32(4, srsId, true);
  vue.setUint8(8, 1);        // WKB byteOrder = little endian
  vue.setUint32(9, 1, true); // type WKB = 1 = Point
  vue.setFloat64(13, lon, true);
  vue.setFloat64(21, lat, true);
  return new Uint8Array(buffer);
}

function nomFichierExport(codeAppareil, maintenant) {
  const date = maintenant.toISOString().slice(0, 10);
  return `mobilier_urbain_${codeAppareil || 'XXX'}_${date}.gpkg`;
}

// --- Écriture (bas niveau, contournement du bug de la librairie) ---

function insererLigne(gp, table, valeurs, lon, lat) {
  const colonnes = Object.keys(valeurs);
  const sql = `insert into "${table}" ("id","geometry",${colonnes.map((c) => `"${c}"`).join(',')}) ` +
    `values ($id,$geometry,${colonnes.map((c) => `$${c}`).join(',')})`;
  const params = { $id: null, $geometry: encoderPointGeoPackageBinary(lon, lat, SRS_ID_GPKG) };
  for (const c of colonnes) params[`$${c}`] = valeurs[c];
  gp.connection.insert(sql, params);
}

function creerCouche(gp, table, champsTypes, identifiant) {
  gp.createFeatureTableFromProperties(table, champsTypes);
  gp.connection.run('UPDATE gpkg_contents SET identifier = $identifiant WHERE table_name = $table', {
    $identifiant: identifiant,
    $table: table
  });
}

// --- Lecture (bas niveau, contournement du bug de la librairie) ---

const TYPES_MOBILIER_CONNUS = COUCHES_MOBILIER.map((c) => c.type);

// Audit 2026-08-23 : un fichier .gpkg réédité dans QGIS peut contenir des lignes
// invalides (géométrie non ponctuelle, colonne renommée/supprimée, valeur de
// type_objet non reconnue) — les insérer telles quelles créerait des objets
// corrompus ou invisibles (icône cassée, absents des filtres). On les compte et
// on les écarte plutôt que de les accepter silencieusement (points 1, 2, 3).
function lireCouche(gp, table, champs, champsObligatoires, champTypeAVerifier, valeursConnues) {
  const dao = gp.getFeatureDao(table);
  const objets = [];
  const compteurs = { geometrieInvalide: 0, champsManquants: 0, typeNonReconnu: 0 };

  for (const ligneBrute of dao.queryForAll()) {
    const row = dao.getRow(ligneBrute);
    const geo = row.geometry ? row.geometry.toGeoJSON() : null;
    if (!geo || geo.type !== 'Point') {
      compteurs.geometrieInvalide++;
      continue;
    }

    // getValueWithColumnName lève une exception (pas juste undefined) si la colonne
    // n'existe carrément plus dans la table — sans ce try/catch, une seule ligne mal
    // formée ferait planter la lecture de toute la couche plutôt que d'être ignorée.
    const objet = { lon: geo.coordinates[0], lat: geo.coordinates[1] };
    let champsOk = true;
    for (const champ of champs) {
      let valeur;
      try {
        valeur = row.getValueWithColumnName(champ);
      } catch (e) {
        valeur = undefined;
      }
      objet[champ] = valeur;
      if (champsObligatoires.includes(champ) && valeur === undefined) champsOk = false;
    }

    if (!champsOk) {
      compteurs.champsManquants++;
      continue;
    }
    if (champTypeAVerifier && !valeursConnues.includes(objet[champTypeAVerifier])) {
      compteurs.typeNonReconnu++;
      continue;
    }

    objets.push(objet);
  }
  return { objets, compteurs };
}

// --- Construction / lecture d'un GeoPackage complet (9 couches — 8 mobilier + 1 commerce, §6.5bis) ---

async function construireGpkg() {
  const gp = await window.GeoPackage.GeoPackageAPI.create();

  const mobiliers = await listerMobilierUrbain();
  for (const couche of COUCHES_MOBILIER) {
    creerCouche(gp, couche.table, CHAMPS_MOBILIER_TYPES, couche.identifiant);
    for (const objet of mobiliers.filter((o) => o.type_objet === couche.type)) {
      insererLigne(gp, couche.table, {
        uid: objet.uid,
        type_objet: objet.type_objet,
        etat: objet.etat,
        nombre: objet.nombre,
        commentaire: objet.commentaire || '',
        last_update: objet.last_update
      }, objet.lon, objet.lat);
    }
  }

  creerCouche(gp, 'commerce', CHAMPS_COMMERCE_TYPES, 'Commerces');
  const commerces = await listerCommerces();
  for (const objet of commerces) {
    insererLigne(gp, 'commerce', {
      uid: objet.uid,
      nom_commerce: objet.nom_commerce || '',
      type_commerce: objet.type_commerce,
      etat: objet.etat,
      date_fermeture: objet.date_fermeture || '',
      commentaire: objet.commentaire || '',
      last_update: objet.last_update
    }, objet.lon, objet.lat);
  }

  const buffer = await gp.export();
  gp.close();
  return buffer;
}

function lireGpkg(gp) {
  const tables = gp.getFeatureTables();
  const mobiliers = [];
  const compteurs = { geometrieInvalide: 0, champsManquants: 0, typeNonReconnu: 0 };
  const cumuler = (c) => {
    compteurs.geometrieInvalide += c.geometrieInvalide;
    compteurs.champsManquants += c.champsManquants;
    compteurs.typeNonReconnu += c.typeNonReconnu;
  };

  for (const couche of COUCHES_MOBILIER) {
    if (!tables.includes(couche.table)) continue;
    const { objets, compteurs: c } = lireCouche(
      gp, couche.table, CHAMPS_MOBILIER, CHAMPS_MOBILIER_OBLIGATOIRES, 'type_objet', TYPES_MOBILIER_CONNUS
    );
    mobiliers.push(...objets);
    cumuler(c);
  }

  let commerces = [];
  if (tables.includes('commerce')) {
    const { objets, compteurs: c } = lireCouche(gp, 'commerce', CHAMPS_COMMERCE, CHAMPS_COMMERCE_OBLIGATOIRES);
    commerces = objets;
    cumuler(c);
  }

  return { mobiliers, commerces, compteurs };
}

// Message de confirmation d'import (audit 2026-08-23, point 1) : jusqu'ici
// l'import ne rendait aucun compte, un import "réussi" pouvait avoir perdu des
// objets sans que rien ne le signale.
function messageResumeImport(donnees, resultatFusion) {
  const total = donnees.mobiliers.length + donnees.commerces.length;
  const { geometrieInvalide, champsManquants, typeNonReconnu } = donnees.compteurs;
  let message = `Import terminé : ${total} objet(s) pris en compte.`;
  const anomalies = [];
  if (geometrieInvalide) anomalies.push(`${geometrieInvalide} ignoré(s) (géométrie invalide)`);
  if (champsManquants) anomalies.push(`${champsManquants} ignoré(s) (champs manquants ou corrompus)`);
  if (typeNonReconnu) anomalies.push(`${typeNonReconnu} ignoré(s) (type de mobilier non reconnu)`);
  if (anomalies.length) message += ' ' + anomalies.join(', ') + '.';
  // Détail de la fusion (§6.5, revu le 23/08) : absent pour "remplacer", qui
  // n'a pas cette notion d'ajout/mise à jour/ignoré (tout est remplacé).
  if (resultatFusion) {
    message += ` Détail fusion : ${resultatFusion.ajoutes} ajouté(s), ${resultatFusion.misAJour} mis à jour, ${resultatFusion.ignores} ignoré(s) (version locale déjà à jour ou plus récente).`;
  }
  return message;
}

// --- Sauvegarde du fichier, adaptée à la plateforme (§6.5) ---

// Retourne un statut ('fichier'|'partage'|'telechargement'|'annule') plutôt que
// rien : les 3 mécanismes n'offrent pas le même niveau de confirmation, en
// particulier le repli <a download> qui ne renvoie jamais d'échec/succès en
// JavaScript (audit 2026-08-23, point 4) — exporterDonnees() adapte son message
// en conséquence plutôt que d'affirmer un succès non garanti.
async function sauvegarderFichier(nomFichier, donnees) {
  const blob = new Blob([donnees], { type: 'application/geopackage+sqlite3' });

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: nomFichier,
        types: [{ description: 'GeoPackage', accept: { 'application/geopackage+sqlite3': ['.gpkg'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'fichier';
    } catch (e) {
      if (e.name === 'AbortError') return 'annule';
      // Sinon on retente via le repli ci-dessous.
    }
  }

  const fichierPartage = new File([blob], nomFichier, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [fichierPartage] })) {
    try {
      await navigator.share({ files: [fichierPartage], title: nomFichier });
      return 'partage';
    } catch (e) {
      if (e.name === 'AbortError') return 'annule';
    }
  }

  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
  return 'telechargement';
}

let exportEnCours = false; // garde anti double-clic (audit 2026-08-23, point 8)

async function exporterDonnees() {
  if (exportEnCours) return;
  exportEnCours = true;
  const bouton = document.getElementById('bouton-exporter');
  if (bouton) bouton.disabled = true;

  try {
    const buffer = await construireGpkg();
    const resultat = await sauvegarderFichier(nomFichierExport(getCodeAppareil(), new Date()), buffer);
    if (resultat === 'fichier') {
      alert('Export réussi — fichier enregistré.');
    } else if (resultat === 'partage') {
      alert('Fichier envoyé au partage — vérifiez qu\'il a bien été enregistré à l\'endroit choisi.');
    } else if (resultat === 'telechargement') {
      alert('Téléchargement lancé — vérifiez dans vos fichiers/téléchargements qu\'il a bien abouti (cette méthode ne permet pas de confirmer automatiquement le succès).');
    }
    // 'annule' : l'utilisateur a annulé volontairement, rien à afficher.
  } catch (erreur) {
    console.error('Échec de l\'export GPKG :', erreur);
    alert('Échec de l\'export — cette tentative n\'a pas produit de fichier. Réessayez.');
  } finally {
    exportEnCours = false;
    if (bouton) bouton.disabled = false;
  }
}

// --- Import : lecture du fichier puis choix remplacer/fusionner (§6.5) ---

function viderMarqueurs() {
  Object.values(mobilierMarkers).forEach((m) => map.removeLayer(m));
  Object.keys(mobilierMarkers).forEach((k) => delete mobilierMarkers[k]);
  Object.values(commerceMarkers).forEach((m) => map.removeLayer(m));
  Object.keys(commerceMarkers).forEach((k) => delete commerceMarkers[k]);
}

async function appliquerImport(mobiliers, commerces, mode) {
  if (mode === 'remplacer') {
    await viderStore('mobilier_urbain');
    await viderStore('commerce');
    viderMarqueurs();
    for (const objet of mobiliers) {
      await enregistrerMobilierUrbain(objet);
      afficherMarqueurMobilier(objet);
    }
    for (const objet of commerces) {
      await enregistrerCommerce(objet);
      afficherMarqueurCommerce(objet);
    }
    return;
  }

  // Fusionner (revu le 23/08) : un uid nouveau est ajouté ; un uid déjà connu
  // localement n'est remplacé que si l'objet importé a un last_update
  // strictement plus récent (modification faite sur l'autre appareil après la
  // dernière synchro) — sinon ignoré comme avant. La suppression reste hors
  // périmètre (convention "à traiter manuellement", cf. commentaire) : un
  // objet supprimé ailleurs n'est jamais retiré par une fusion.
  const mobiliersExistants = new Map((await listerMobilierUrbain()).map((o) => [o.uid, o]));
  const commercesExistants = new Map((await listerCommerces()).map((o) => [o.uid, o]));
  const resultat = { ajoutes: 0, misAJour: 0, ignores: 0 };

  for (const objet of mobiliers) {
    const existant = mobiliersExistants.get(objet.uid);
    if (!existant) {
      await enregistrerMobilierUrbain(objet);
      afficherMarqueurMobilier(objet);
      resultat.ajoutes++;
    } else if (new Date(objet.last_update) > new Date(existant.last_update)) {
      await enregistrerMobilierUrbain(objet);
      mettreAJourMarqueurMobilier(objet);
      resultat.misAJour++;
    } else {
      resultat.ignores++;
    }
  }
  for (const objet of commerces) {
    const existant = commercesExistants.get(objet.uid);
    if (!existant) {
      await enregistrerCommerce(objet);
      afficherMarqueurCommerce(objet);
      resultat.ajoutes++;
    } else if (new Date(objet.last_update) > new Date(existant.last_update)) {
      await enregistrerCommerce(objet);
      mettreAJourMarqueurCommerce(objet);
      resultat.misAJour++;
    } else {
      resultat.ignores++;
    }
  }
  return resultat;
}

let gpkgEnAttenteImport = null;

function ouvrirChoixImport() {
  document.getElementById('modal-import-choix').hidden = false;
}

function fermerChoixImport() {
  document.getElementById('modal-import-choix').hidden = true;
  gpkgEnAttenteImport = null;
}

async function declencherImport(fichier) {
  try {
    const arrayBuffer = await fichier.arrayBuffer();
    const gp = await window.GeoPackage.GeoPackageAPI.open(new Uint8Array(arrayBuffer));
    gpkgEnAttenteImport = lireGpkg(gp);
    gp.close();
    ouvrirChoixImport();
  } catch (erreur) {
    console.error('Échec de la lecture du fichier importé :', erreur);
    alert('Fichier illisible ou invalide — vérifiez qu\'il s\'agit bien d\'un export de cette application.');
  }
}

document.getElementById('bouton-exporter').addEventListener('click', exporterDonnees);

document.getElementById('bouton-importer').addEventListener('click', () => {
  document.getElementById('input-fichier-import').click();
});

document.getElementById('input-fichier-import').addEventListener('change', (evenement) => {
  const fichier = evenement.target.files[0];
  evenement.target.value = ''; // permet de réimporter le même fichier ensuite
  if (fichier) declencherImport(fichier);
});

document.getElementById('bouton-import-fusionner').addEventListener('click', async () => {
  const donnees = gpkgEnAttenteImport;
  fermerChoixImport();
  if (!donnees) return;
  try {
    const resultatFusion = await appliquerImport(donnees.mobiliers, donnees.commerces, 'fusionner');
    alert(messageResumeImport(donnees, resultatFusion));
  } catch (erreur) {
    console.error('Échec de la fusion à l\'import :', erreur);
    afficherBanniereErreur('Échec de la fusion des données importées — certains objets peuvent manquer. Vérifiez avant de continuer.');
  }
});

document.getElementById('bouton-import-remplacer').addEventListener('click', async () => {
  const donnees = gpkgEnAttenteImport;
  fermerChoixImport();
  if (!donnees) return;
  try {
    await appliquerImport(donnees.mobiliers, donnees.commerces, 'remplacer');
    alert(messageResumeImport(donnees));
  } catch (erreur) {
    console.error('Échec du remplacement à l\'import :', erreur);
    afficherBanniereErreur('Échec du remplacement des données — l\'état local peut être incomplet. Vérifiez avant de continuer.');
  }
});

document.getElementById('bouton-import-annuler').addEventListener('click', fermerChoixImport);
