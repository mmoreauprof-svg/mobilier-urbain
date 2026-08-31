// Saisie, modification et suppression d'un mobilier urbain (§6.2, §6.4 des spécifications)

const mobilierMarkers = {};
let uidEnEditionMobilier = null;
let positionManuelleMobilier = null;
// Dernier type créé (PC uniquement, §C/saisie en chaîne — demande du 23/08) :
// pré-rempli à la prochaine création plutôt que de repartir sur "Banc", utile
// pour enchaîner de nombreux objets du même type sans repasser par la liste.
let dernierTypeMobilier = null;

function construirePopupMobilier(objet) {
  const commentaireHtml = objet.commentaire ? `<br>${echapperHtml(objet.commentaire)}` : '';
  return `<strong>${echapperHtml(objet.type_objet)}</strong><br>État : ${echapperHtml(objet.etat)}<br>Nombre : ${objet.nombre}${commentaireHtml}<br>`
    + `<button onclick="ouvrirEditionMobilier('${objet.uid}')">Modifier</button> `
    + `<button onclick="supprimerMobilier('${objet.uid}')">Supprimer</button>`;
}

function afficherMarqueurMobilier(objet) {
  const marker = L.marker([objet.lat, objet.lon], { icon: iconeMobilier(objet.type_objet, objet.nombre) }).addTo(map);
  marker.bindPopup(construirePopupMobilier(objet));
  marker.categorieFiltre = objet.type_objet;
  if (!categoriesVisibles.has(marker.categorieFiltre)) map.removeLayer(marker);
  mobilierMarkers[objet.uid] = marker;
}

function mettreAJourMarqueurMobilier(objet) {
  const marker = mobilierMarkers[objet.uid];
  if (marker) {
    marker.setIcon(iconeMobilier(objet.type_objet, objet.nombre));
    marker.setPopupContent(construirePopupMobilier(objet));
    marker.categorieFiltre = objet.type_objet;
    appliquerFiltres();
  }
}

function ouvrirFormulaireMobilier() {
  if (getDernierePosition()) {
    ouvrirFormulaireMobilierNouveau(null);
    return;
  }
  // Pas de position GPS récente (PC sans GPS, signal perdu) : repli sur la
  // sélection manuelle d'un point sur la carte (§6.4bis des spécifications).
  demanderPositionSurCarte((latlng) => ouvrirFormulaireMobilierNouveau(latlng));
}

function ouvrirFormulaireMobilierNouveau(positionManuelle) {
  positionManuelleMobilier = positionManuelle;
  uidEnEditionMobilier = null;
  document.getElementById('titre-modal-mobilier').textContent = 'Nouveau mobilier urbain';
  document.getElementById('bouton-enregistrer-mobilier').textContent = 'Enregistrer';
  const panneau = document.getElementById('modal-mobilier-urbain');
  panneau.hidden = false;
  positionnerPanneauFormulaire(panneau, positionManuelle || getDernierePosition());
  definirOngletActif('mobilier');

  // PC uniquement (saisie en chaîne, §6.6bis) : type pré-rempli avec le
  // dernier utilisé. Focus sur le bouton Enregistrer (pas sur la liste
  // Type) pour qu'Entrée valide immédiatement sans clic souris — sur
  // certains navigateurs, Entrée avec le focus sur un <select> rouvre sa
  // liste au lieu de soumettre le formulaire (retour utilisateur du 23/08).
  // Sans effet sur mobile (pas de clavier virtuel imposé).
  if (estAffichagePC()) {
    if (dernierTypeMobilier) document.getElementById('mobilier-type').value = dernierTypeMobilier;
    document.getElementById('bouton-enregistrer-mobilier').focus();
  }
}

function fermerFormulaireMobilier() {
  document.getElementById('modal-mobilier-urbain').hidden = true;
  document.getElementById('form-mobilier-urbain').reset();
  uidEnEditionMobilier = null;
  positionManuelleMobilier = null;
  definirOngletActif('carte');
  reafficherBarresMobiles();
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

  map.closePopup();
  const panneau = document.getElementById('modal-mobilier-urbain');
  panneau.hidden = false;
  positionnerPanneauFormulaire(panneau, [objet.lat, objet.lon]);
  definirOngletActif('mobilier');

  if (estAffichagePC()) document.getElementById('bouton-enregistrer-mobilier').focus();
}

async function enregistrerMobilierDepuisFormulaire() {
  const typeObjet = document.getElementById('mobilier-type').value;
  const etat = document.getElementById('mobilier-etat').value;
  const nombre = parseInt(document.getElementById('mobilier-nombre').value, 10) || 1;
  const commentaire = document.getElementById('mobilier-commentaire').value.trim();

  try {
    if (uidEnEditionMobilier) {
      const objets = await listerMobilierUrbain();
      const existant = objets.find((o) => o.uid === uidEnEditionMobilier);
      if (!existant) {
        alert('Ce mobilier urbain a été supprimé entre-temps, impossible de le modifier.');
        fermerFormulaireMobilier();
        return;
      }
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

    const position = positionManuelleMobilier || getDernierePosition();
    if (!position) {
      alert('Position indisponible, réessayez.');
      return;
    }

    const existants = await listerMobilierUrbain();
    const proche = objetProcheExiste(existants, typeObjet, 'type_objet', position, SEUIL_DOUBLON_METRES);
    if (proche && !confirm(`Un ${typeObjet} existe déjà à moins de ${SEUIL_DOUBLON_METRES} m — enregistrer quand même ?`)) {
      return;
    }

    const objet = {
      uid: await genererUid(),
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
    dernierTypeMobilier = typeObjet;
    fermerFormulaireMobilier();
  } catch (erreur) {
    console.error('Échec de l\'enregistrement du mobilier urbain :', erreur);
    if (erreur && erreur.message === 'Code appareil manquant') {
      alert('Code appareil manquant — merci de le ressaisir avant de continuer.');
      demanderReidentificationAppareil();
      return;
    }
    alert('Échec de l\'enregistrement — cette saisie n\'a PAS été sauvegardée. Réessayez.');
  }
}

// Suppression directe depuis le popup (demande du 23/08, §B) — plus besoin
// d'ouvrir le panneau d'édition pour supprimer. Le bouton OK de confirm() est
// déjà celui activé par défaut par la touche Entrée dans tous les navigateurs.
async function supprimerMobilier(uid) {
  if (!confirm('Supprimer définitivement ce mobilier urbain ?')) return;

  try {
    await supprimerDeStore('mobilier_urbain', uid);
    const marker = mobilierMarkers[uid];
    if (marker) {
      map.closePopup();
      map.removeLayer(marker);
      delete mobilierMarkers[uid];
    }
    if (uidEnEditionMobilier === uid) fermerFormulaireMobilier();
  } catch (erreur) {
    console.error('Échec de la suppression du mobilier urbain :', erreur);
    alert('Échec de la suppression. Réessayez.');
  }
}

async function chargerMobilierExistant() {
  try {
    const objets = await listerMobilierUrbain();
    objets.forEach(afficherMarqueurMobilier);
  } catch (erreur) {
    console.error('Échec du chargement du mobilier urbain existant :', erreur);
    afficherBanniereErreur('Impossible de charger les mobiliers urbains déjà enregistrés sur cet appareil — ne continuez pas la saisie sans vérifier ce problème.');
  }
}

document.getElementById('bouton-ajouter-mobilier').addEventListener('click', ouvrirFormulaireMobilier);
document.getElementById('bouton-annuler-mobilier').addEventListener('click', fermerFormulaireMobilier);
document.getElementById('form-mobilier-urbain').addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  enregistrerMobilierDepuisFormulaire();
});

chargerMobilierExistant();
