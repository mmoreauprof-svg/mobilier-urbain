// Saisie, modification et suppression d'un mobilier urbain (§6.2, §6.4 des spécifications)

const mobilierMarkers = {};
let uidEnEditionMobilier = null;
let positionManuelleMobilier = null;
// Nouvel emplacement en attente de confirmation lors d'une modification
// (§6.4ter, demande du 31/08) — distinct de positionManuelleMobilier (création
// sans GPS) : reste null tant que "Modifier l'emplacement" n'a pas abouti.
let nouvellePositionMobilier = null;
// Dernier type créé (PC uniquement, §C/saisie en chaîne — demande du 23/08) :
// pré-rempli à la prochaine création plutôt que de repartir sur "Banc", utile
// pour enchaîner de nombreux objets du même type sans repasser par la liste.
let dernierTypeMobilier = null;

// uid inséré via data-uid (attribut, lu par le clic délégué ci-dessous) plutôt
// que dans un onclick="...('${uid}')" (relecture du 06/09) : un uid corrompu
// par un import GPKG trafiqué à la main pouvait auparavant casser hors de la
// chaîne JS entre apostrophes et exécuter du code arbitraire au clic — un
// attribut data-* n'est jamais interprété comme du code, quel que soit son
// contenu, une fois échappé pour rester dans les guillemets de l'attribut.
function construirePopupMobilier(objet) {
  const commentaireHtml = objet.commentaire ? `<br>${echapperHtml(objet.commentaire)}` : '';
  const uid = echapperAttribut(objet.uid);
  return `<strong>${echapperHtml(objet.type_objet)}</strong><br>État : ${echapperHtml(objet.etat)}<br>Nombre : ${objet.nombre}${commentaireHtml}<br>`
    + `<button data-uid="${uid}" data-action="modifier-mobilier">Modifier</button> `
    + `<button data-uid="${uid}" data-action="supprimer-mobilier">Supprimer</button>`;
}

document.getElementById('map').addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('[data-action="modifier-mobilier"], [data-action="supprimer-mobilier"]');
  if (!bouton) return;
  if (bouton.dataset.action === 'modifier-mobilier') ouvrirEditionMobilier(bouton.dataset.uid);
  else supprimerMobilier(bouton.dataset.uid);
});

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
    marker.setLatLng([objet.lat, objet.lon]);
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
  // Annule une sélection "Modifier l'emplacement" restée en attente sur un
  // AUTRE objet (relecture du 06/09) — sinon son écouteur de clic carte reste
  // actif et le prochain clic appliquerait un emplacement à l'objet en cours
  // d'édition au moment de ce clic, pas à celui visé initialement.
  annulerSelectionCarteSiActive();
  positionManuelleMobilier = positionManuelle;
  uidEnEditionMobilier = null;
  nouvellePositionMobilier = null;
  document.getElementById('titre-modal-mobilier').textContent = 'Nouveau mobilier urbain';
  document.getElementById('bouton-enregistrer-mobilier').textContent = 'Enregistrer';
  document.getElementById('bouton-modifier-emplacement-mobilier').hidden = true;
  document.getElementById('mobilier-position-statut').textContent = '';
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
  annulerSelectionCarteSiActive(); // cf. commentaire dans ouvrirFormulaireMobilierNouveau
  document.getElementById('modal-mobilier-urbain').hidden = true;
  document.getElementById('form-mobilier-urbain').reset();
  uidEnEditionMobilier = null;
  positionManuelleMobilier = null;
  nouvellePositionMobilier = null;
  document.getElementById('mobilier-position-statut').textContent = '';
  definirOngletActif('carte');
  reafficherBarresMobiles();
}

async function ouvrirEditionMobilier(uid) {
  annulerSelectionCarteSiActive(); // cf. commentaire dans ouvrirFormulaireMobilierNouveau
  const objets = await listerMobilierUrbain();
  const objet = objets.find((o) => o.uid === uid);
  if (!objet) return;

  uidEnEditionMobilier = uid;
  nouvellePositionMobilier = null;
  document.getElementById('mobilier-type').value = objet.type_objet;
  document.getElementById('mobilier-etat').value = objet.etat;
  document.getElementById('mobilier-nombre').value = objet.nombre;
  document.getElementById('mobilier-commentaire').value = objet.commentaire || '';

  document.getElementById('titre-modal-mobilier').textContent = 'Modifier le mobilier urbain';
  document.getElementById('bouton-enregistrer-mobilier').textContent = 'Enregistrer les modifications';
  document.getElementById('bouton-modifier-emplacement-mobilier').hidden = false;
  document.getElementById('mobilier-position-statut').textContent = '';

  map.closePopup();
  const panneau = document.getElementById('modal-mobilier-urbain');
  panneau.hidden = false;
  positionnerPanneauFormulaire(panneau, [objet.lat, objet.lon]);
  definirOngletActif('mobilier');

  if (estAffichagePC()) document.getElementById('bouton-enregistrer-mobilier').focus();
}

// Modification de l'emplacement d'un objet existant (§6.4ter, demande du
// 31/08) : réutilise le mécanisme de sélection manuelle du §6.4bis, avec un
// message explicite adapté (déplacement, pas création) et une confirmation
// visible dans le panneau une fois le nouveau point choisi. Rien n'est
// appliqué tant que "Enregistrer les modifications" n'a pas été validé.
function modifierEmplacementMobilier() {
  const panneau = document.getElementById('modal-mobilier-urbain');
  const type = document.getElementById('mobilier-type').value;
  panneau.hidden = true;
  demanderPositionSurCarte(
    (latlng) => {
      nouvellePositionMobilier = latlng;
      panneau.hidden = false;
      positionnerPanneauFormulaire(panneau, latlng);
      document.getElementById('mobilier-position-statut').textContent =
        'Nouvel emplacement sélectionné — sera appliqué à l\'enregistrement.';
    },
    {
      message: `Cliquez sur la carte pour choisir le nouvel emplacement de ce ${type} — ou ici pour annuler`,
      onAnnuler: () => { panneau.hidden = false; }
    }
  );
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
      if (nouvellePositionMobilier) {
        // Exclut l'objet en cours de modification lui-même : sinon son
        // ancienne position (ou un déplacement de quelques mètres) se
        // signalerait systématiquement comme un doublon de lui-même
        // (demande explicite du 31/08 — ne pas comparer à l'ancienne position).
        const autresObjets = objets.filter((o) => o.uid !== uidEnEditionMobilier);
        const proche = objetProcheExiste(autresObjets, typeObjet, 'type_objet', nouvellePositionMobilier, SEUIL_DOUBLON_METRES);
        if (proche && !confirm(`Un ${typeObjet} existe déjà à moins de ${SEUIL_DOUBLON_METRES} m de ce nouvel emplacement — enregistrer quand même ?`)) {
          return;
        }
      }

      const objet = {
        ...existant,
        type_objet: typeObjet,
        etat,
        nombre,
        commentaire,
        last_update: new Date().toISOString(),
        ...(nouvellePositionMobilier ? { lat: nouvellePositionMobilier[0], lon: nouvellePositionMobilier[1] } : {})
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
document.getElementById('bouton-modifier-emplacement-mobilier').addEventListener('click', modifierEmplacementMobilier);
document.getElementById('form-mobilier-urbain').addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  enregistrerMobilierDepuisFormulaire();
});

chargerMobilierExistant();
