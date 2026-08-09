// Saisie, modification et suppression d'un mobilier urbain (§6.2, §6.4 des spécifications)

const mobilierMarkers = {};
let uidEnEditionMobilier = null;

function construirePopupMobilier(objet) {
  const commentaireHtml = objet.commentaire ? `<br>${echapperHtml(objet.commentaire)}` : '';
  return `<strong>${echapperHtml(objet.type_objet)}</strong><br>État : ${echapperHtml(objet.etat)}<br>Nombre : ${objet.nombre}${commentaireHtml}<br><button onclick="ouvrirEditionMobilier('${objet.uid}')">Modifier / Supprimer</button>`;
}

function afficherMarqueurMobilier(objet) {
  const marker = L.marker([objet.lat, objet.lon]).addTo(map);
  marker.bindPopup(construirePopupMobilier(objet));
  mobilierMarkers[objet.uid] = marker;
}

function mettreAJourMarqueurMobilier(objet) {
  const marker = mobilierMarkers[objet.uid];
  if (marker) {
    marker.setPopupContent(construirePopupMobilier(objet));
  }
}

function ouvrirFormulaireMobilier() {
  if (!getDernierePosition()) {
    alert('Position GPS non disponible pour le moment. Réessayez dans quelques secondes.');
    return;
  }
  uidEnEditionMobilier = null;
  document.getElementById('titre-modal-mobilier').textContent = 'Nouveau mobilier urbain';
  document.getElementById('bouton-enregistrer-mobilier').textContent = 'Enregistrer';
  document.getElementById('bouton-supprimer-mobilier').hidden = true;
  document.getElementById('modal-mobilier-urbain').hidden = false;
}

function fermerFormulaireMobilier() {
  document.getElementById('modal-mobilier-urbain').hidden = true;
  document.getElementById('form-mobilier-urbain').reset();
  uidEnEditionMobilier = null;
}

async function ouvrirEditionMobilier(uid) {
  const objets = await listerMobilierUrbain();
  const objet = objets.find((o) => o.uid === uid);
  if (!objet) return;

  uidEnEditionMobilier = uid;
  document.getElementById('mobilier-type').value = objet.type_objet;
  document.getElementById('mobilier-etat').value = objet.etat;
  document.getElementById('mobilier-nombre').value = objet.nombre;
  document.getElementById('mobilier-commentaire').value = objet.commentaire || '';

  document.getElementById('titre-modal-mobilier').textContent = 'Modifier le mobilier urbain';
  document.getElementById('bouton-enregistrer-mobilier').textContent = 'Enregistrer les modifications';
  document.getElementById('bouton-supprimer-mobilier').hidden = false;

  map.closePopup();
  document.getElementById('modal-mobilier-urbain').hidden = false;
}

async function enregistrerMobilierDepuisFormulaire() {
  const typeObjet = document.getElementById('mobilier-type').value;
  const etat = document.getElementById('mobilier-etat').value;
  const nombre = parseInt(document.getElementById('mobilier-nombre').value, 10) || 1;
  const commentaire = document.getElementById('mobilier-commentaire').value.trim();

  if (uidEnEditionMobilier) {
    const objets = await listerMobilierUrbain();
    const existant = objets.find((o) => o.uid === uidEnEditionMobilier);
    const objet = {
      ...existant,
      type_objet: typeObjet,
      etat,
      nombre,
      commentaire,
      last_update: new Date().toISOString()
    };
    await enregistrerMobilierUrbain(objet);
    mettreAJourMarqueurMobilier(objet);
    fermerFormulaireMobilier();
    return;
  }

  const position = getDernierePosition();
  if (!position) {
    alert('Position GPS perdue, réessayez.');
    return;
  }

  const existants = await listerMobilierUrbain();
  const proche = objetProcheExiste(existants, typeObjet, 'type_objet', position, SEUIL_DOUBLON_METRES);
  if (proche && !confirm(`Un ${typeObjet} existe déjà à moins de ${SEUIL_DOUBLON_METRES} m — enregistrer quand même ?`)) {
    return;
  }

  const objet = {
    uid: genererUid(),
    type_objet: typeObjet,
    etat,
    nombre,
    commentaire,
    last_update: new Date().toISOString(),
    lat: position[0],
    lon: position[1]
  };

  await enregistrerMobilierUrbain(objet);
  afficherMarqueurMobilier(objet);
  fermerFormulaireMobilier();
}

async function supprimerMobilierEnEdition() {
  if (!uidEnEditionMobilier) return;
  if (!confirm('Supprimer définitivement ce mobilier urbain ?')) return;

  await supprimerDeStore('mobilier_urbain', uidEnEditionMobilier);
  const marker = mobilierMarkers[uidEnEditionMobilier];
  if (marker) {
    map.removeLayer(marker);
    delete mobilierMarkers[uidEnEditionMobilier];
  }
  fermerFormulaireMobilier();
}

async function chargerMobilierExistant() {
  const objets = await listerMobilierUrbain();
  objets.forEach(afficherMarqueurMobilier);
}

document.getElementById('bouton-ajouter-mobilier').addEventListener('click', ouvrirFormulaireMobilier);
document.getElementById('bouton-annuler-mobilier').addEventListener('click', fermerFormulaireMobilier);
document.getElementById('bouton-enregistrer-mobilier').addEventListener('click', enregistrerMobilierDepuisFormulaire);
document.getElementById('bouton-supprimer-mobilier').addEventListener('click', supprimerMobilierEnEdition);

chargerMobilierExistant();
