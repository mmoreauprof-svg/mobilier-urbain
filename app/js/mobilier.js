// Saisie d'un mobilier urbain (§6.2 des spécifications)

const SEUIL_DOUBLON_METRES = 5;
const mobilierMarkers = {};

function ouvrirFormulaireMobilier() {
  if (!getDernierePosition()) {
    alert('Position GPS non disponible pour le moment. Réessayez dans quelques secondes.');
    return;
  }
  document.getElementById('modal-mobilier-urbain').hidden = false;
}

function fermerFormulaireMobilier() {
  document.getElementById('modal-mobilier-urbain').hidden = true;
  document.getElementById('form-mobilier-urbain').reset();
}

function afficherMarqueurMobilier(objet) {
  const marker = L.marker([objet.lat, objet.lon]).addTo(map);
  const commentaireHtml = objet.commentaire ? `<br>${objet.commentaire}` : '';
  marker.bindPopup(
    `<strong>${objet.type_objet}</strong><br>État : ${objet.etat}<br>Nombre : ${objet.nombre}${commentaireHtml}`
  );
  mobilierMarkers[objet.uid] = marker;
}

async function enregistrerMobilierDepuisFormulaire() {
  const position = getDernierePosition();
  if (!position) {
    alert('Position GPS perdue, réessayez.');
    return;
  }

  const typeObjet = document.getElementById('mobilier-type').value;
  const etat = document.getElementById('mobilier-etat').value;
  const nombre = parseInt(document.getElementById('mobilier-nombre').value, 10) || 1;
  const commentaire = document.getElementById('mobilier-commentaire').value.trim();

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

async function chargerMobilierExistant() {
  const objets = await listerMobilierUrbain();
  objets.forEach(afficherMarqueurMobilier);
}

document.getElementById('bouton-ajouter-mobilier').addEventListener('click', ouvrirFormulaireMobilier);
document.getElementById('bouton-annuler-mobilier').addEventListener('click', fermerFormulaireMobilier);
document.getElementById('bouton-enregistrer-mobilier').addEventListener('click', enregistrerMobilierDepuisFormulaire);

chargerMobilierExistant();
