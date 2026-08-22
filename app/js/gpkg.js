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
  { type: 'Abri bus', table: 'abri_bus', identifiant: 'Abris bus' }
];

const CHAMPS_MOBILIER = ['uid', 'type_objet', 'etat', 'nombre', 'commentaire', 'last_update'];
const CHAMPS_MOBILIER_TYPES = [
  { name: 'uid', dataType: 'TEXT' },
  { name: 'type_objet', dataType: 'TEXT' },
  { name: 'etat', dataType: 'TEXT' },
  { name: 'nombre', dataType: 'INTEGER' },
  { name: 'commentaire', dataType: 'TEXT' },
  { name: 'last_update', dataType: 'DATETIME' }
];

const CHAMPS_COMMERCE = ['uid', 'nom_commerce', 'type_commerce', 'etat', 'date_fermeture', 'commentaire', 'last_update'];
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

function lireCouche(gp, table, champs) {
  const dao = gp.getFeatureDao(table);
  const resultats = [];
  for (const ligneBrute of dao.queryForAll()) {
    const row = dao.getRow(ligneBrute);
    const geo = row.geometry ? row.geometry.toGeoJSON() : null;
    if (!geo || geo.type !== 'Point') continue;
    const objet = { lon: geo.coordinates[0], lat: geo.coordinates[1] };
    for (const champ of champs) objet[champ] = row.getValueWithColumnName(champ);
    resultats.push(objet);
  }
  return resultats;
}

// --- Construction / lecture d'un GeoPackage complet (6 couches, §6.5bis) ---

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
  for (const couche of COUCHES_MOBILIER) {
    if (!tables.includes(couche.table)) continue;
    mobiliers.push(...lireCouche(gp, couche.table, CHAMPS_MOBILIER));
  }
  const commerces = tables.includes('commerce') ? lireCouche(gp, 'commerce', CHAMPS_COMMERCE) : [];
  return { mobiliers, commerces };
}

// --- Sauvegarde du fichier, adaptée à la plateforme (§6.5) ---

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
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      // Sinon on retente via le repli ci-dessous.
    }
  }

  const fichierPartage = new File([blob], nomFichier, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [fichierPartage] })) {
    try {
      await navigator.share({ files: [fichierPartage], title: nomFichier });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
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
}

async function exporterDonnees() {
  try {
    const buffer = await construireGpkg();
    await sauvegarderFichier(nomFichierExport(getCodeAppareil(), new Date()), buffer);
  } catch (erreur) {
    console.error('Échec de l\'export GPKG :', erreur);
    alert('Échec de l\'export — cette tentative n\'a pas produit de fichier. Réessayez.');
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

  // Fusionner : tout objet dont le uid existe déjà localement est ignoré (§6.5).
  const uidsMobilierExistants = new Set((await listerMobilierUrbain()).map((o) => o.uid));
  const uidsCommerceExistants = new Set((await listerCommerces()).map((o) => o.uid));

  for (const objet of mobiliers) {
    if (uidsMobilierExistants.has(objet.uid)) continue;
    await enregistrerMobilierUrbain(objet);
    afficherMarqueurMobilier(objet);
  }
  for (const objet of commerces) {
    if (uidsCommerceExistants.has(objet.uid)) continue;
    await enregistrerCommerce(objet);
    afficherMarqueurCommerce(objet);
  }
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
    await appliquerImport(donnees.mobiliers, donnees.commerces, 'fusionner');
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
  } catch (erreur) {
    console.error('Échec du remplacement à l\'import :', erreur);
    afficherBanniereErreur('Échec du remplacement des données — l\'état local peut être incomplet. Vérifiez avant de continuer.');
  }
});

document.getElementById('bouton-import-annuler').addEventListener('click', fermerChoixImport);
