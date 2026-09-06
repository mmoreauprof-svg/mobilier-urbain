// Saisie, modification et suppression d'un commerce (§6.3, §6.4 des spécifications)

const commerceMarkers = {};
let uidEnEditionCommerce = null;
let positionManuelleCommerce = null;
// Nouvel emplacement en attente de confirmation lors d'une modification
// (§6.4ter, demande du 31/08) — distinct de positionManuelleCommerce (création
// sans GPS) : reste null tant que "Modifier l'emplacement" n'a pas abouti.
let nouvellePositionCommerce = null;
// Dernier type créé (PC uniquement, §C/saisie en chaîne — demande du 23/08) :
// pré-rempli à la prochaine création plutôt que de repartir sur "Supérette",
// utile pour enchaîner de nombreux commerces du même type sans repasser par
// la liste.
let dernierTypeCommerce = null;

// uid inséré via data-uid, cf. le commentaire équivalent dans mobilier.js
// (relecture du 06/09) — même raisonnement, même correctif.
function construirePopupCommerce(objet) {
  const nom = objet.nom_commerce ? echapperHtml(objet.nom_commerce) : '(local sans enseigne)';
  const dateFermetureHtml = objet.date_fermeture ? `<br>Fermé depuis : ${echapperHtml(objet.date_fermeture)}` : '';
  const commentaireHtml = objet.commentaire ? `<br>${echapperHtml(objet.commentaire)}` : '';
  const uid = echapperAttribut(objet.uid);
  return `<strong>${nom}</strong><br>${echapperHtml(objet.type_commerce)}<br>État : ${echapperHtml(objet.etat)}${dateFermetureHtml}${commentaireHtml}<br>`
    + `<button data-uid="${uid}" data-action="modifier-commerce">Modifier</button> `
    + `<button data-uid="${uid}" data-action="supprimer-commerce">Supprimer</button>`;
}

document.getElementById('map').addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('[data-action="modifier-commerce"], [data-action="supprimer-commerce"]');
  if (!bouton) return;
  if (bouton.dataset.action === 'modifier-commerce') ouvrirEditionCommerce(bouton.dataset.uid);
  else supprimerCommerce(bouton.dataset.uid);
});

function afficherMarqueurCommerce(objet) {
  const marker = L.marker([objet.lat, objet.lon], { icon: iconeCommerce(objet.etat) }).addTo(map);
  marker.bindPopup(construirePopupCommerce(objet));
  marker.categorieFiltre = 'Commerce';
  if (!categoriesVisibles.has(marker.categorieFiltre)) map.removeLayer(marker);
  commerceMarkers[objet.uid] = marker;
}

function mettreAJourMarqueurCommerce(objet) {
  const marker = commerceMarkers[objet.uid];
  if (marker) {
    marker.setLatLng([objet.lat, objet.lon]);
    marker.setIcon(iconeCommerce(objet.etat));
    marker.setPopupContent(construirePopupCommerce(objet));
  }
}

function ouvrirFormulaireCommerce() {
  if (getDernierePosition()) {
    ouvrirFormulaireCommerceNouveau(null);
    return;
  }
  // Pas de position GPS récente (PC sans GPS, signal perdu) : repli sur la
  // sélection manuelle d'un point sur la carte (§6.4bis des spécifications).
  demanderPositionSurCarte((latlng) => ouvrirFormulaireCommerceNouveau(latlng));
}

function ouvrirFormulaireCommerceNouveau(positionManuelle) {
  // Annule une sélection "Modifier l'emplacement" restée en attente sur un
  // AUTRE objet (relecture du 06/09) — cf. commentaire équivalent dans mobilier.js.
  annulerSelectionCarteSiActive();
  positionManuelleCommerce = positionManuelle;
  uidEnEditionCommerce = null;
  nouvellePositionCommerce = null;
  document.getElementById('titre-modal-commerce').textContent = 'Nouveau commerce';
  document.getElementById('bouton-enregistrer-commerce').textContent = 'Enregistrer';
  document.getElementById('bouton-modifier-emplacement-commerce').hidden = true;
  document.getElementById('commerce-position-statut').textContent = '';
  const panneau = document.getElementById('modal-commerce');
  panneau.hidden = false;
  positionnerPanneauFormulaire(panneau, positionManuelle || getDernierePosition());
  definirOngletActif('commerce');

  // PC uniquement (saisie en chaîne, §6.6bis) : type pré-rempli avec le
  // dernier utilisé. Focus sur le bouton Enregistrer (pas sur la liste
  // Type) pour qu'Entrée valide immédiatement sans clic souris — sur
  // certains navigateurs, Entrée avec le focus sur un <select> rouvre sa
  // liste au lieu de soumettre le formulaire (retour utilisateur du 23/08).
  // Sans effet sur mobile (pas de clavier virtuel imposé).
  if (estAffichagePC()) {
    if (dernierTypeCommerce) document.getElementById('commerce-type').value = dernierTypeCommerce;
    document.getElementById('bouton-enregistrer-commerce').focus();
  }
}

function fermerFormulaireCommerce() {
  annulerSelectionCarteSiActive(); // cf. commentaire dans ouvrirFormulaireCommerceNouveau
  document.getElementById('modal-commerce').hidden = true;
  document.getElementById('form-commerce').reset();
  uidEnEditionCommerce = null;
  positionManuelleCommerce = null;
  nouvellePositionCommerce = null;
  document.getElementById('commerce-position-statut').textContent = '';
  definirOngletActif('carte');
  reafficherBarresMobiles();
}

async function ouvrirEditionCommerce(uid) {
  annulerSelectionCarteSiActive(); // cf. commentaire dans ouvrirFormulaireCommerceNouveau
  const objets = await listerCommerces();
  const objet = objets.find((o) => o.uid === uid);
  if (!objet) return;

  uidEnEditionCommerce = uid;
  nouvellePositionCommerce = null;
  document.getElementById('commerce-nom').value = objet.nom_commerce || '';
  document.getElementById('commerce-type').value = objet.type_commerce;
  document.getElementById('commerce-etat').value = objet.etat;
  document.getElementById('commerce-date-fermeture').value = objet.date_fermeture || '';
  document.getElementById('commerce-commentaire').value = objet.commentaire || '';

  document.getElementById('titre-modal-commerce').textContent = 'Modifier le commerce';
  document.getElementById('bouton-enregistrer-commerce').textContent = 'Enregistrer les modifications';
  document.getElementById('bouton-modifier-emplacement-commerce').hidden = false;
  document.getElementById('commerce-position-statut').textContent = '';

  map.closePopup();
  const panneau = document.getElementById('modal-commerce');
  panneau.hidden = false;
  positionnerPanneauFormulaire(panneau, [objet.lat, objet.lon]);
  definirOngletActif('commerce');

  if (estAffichagePC()) document.getElementById('bouton-enregistrer-commerce').focus();
}

// Modification de l'emplacement d'un commerce existant (§6.4ter, demande du
// 31/08) — voir modifierEmplacementMobilier pour le détail du mécanisme
// réutilisé (§6.4bis).
function modifierEmplacementCommerce() {
  const panneau = document.getElementById('modal-commerce');
  const type = document.getElementById('commerce-type').value;
  panneau.hidden = true;
  demanderPositionSurCarte(
    (latlng) => {
      nouvellePositionCommerce = latlng;
      panneau.hidden = false;
      positionnerPanneauFormulaire(panneau, latlng);
      document.getElementById('commerce-position-statut').textContent =
        'Nouvel emplacement sélectionné — sera appliqué à l\'enregistrement.';
    },
    {
      message: `Cliquez sur la carte pour choisir le nouvel emplacement de ce commerce (${type}) — ou ici pour annuler`,
      onAnnuler: () => { panneau.hidden = false; }
    }
  );
}

async function enregistrerCommerceDepuisFormulaire() {
  const nomCommerce = document.getElementById('commerce-nom').value.trim();
  const typeCommerce = document.getElementById('commerce-type').value;
  const etat = document.getElementById('commerce-etat').value;
  const dateFermeture = document.getElementById('commerce-date-fermeture').value;
  const commentaire = document.getElementById('commerce-commentaire').value.trim();

  try {
    if (uidEnEditionCommerce) {
      const objets = await listerCommerces();
      const existant = objets.find((o) => o.uid === uidEnEditionCommerce);
      if (!existant) {
        alert('Ce commerce a été supprimé entre-temps, impossible de le modifier.');
        fermerFormulaireCommerce();
        return;
      }
      if (nouvellePositionCommerce) {
        // Exclut le commerce en cours de modification lui-même : sinon son
        // ancienne position (ou un déplacement de quelques mètres) se
        // signalerait systématiquement comme un doublon de lui-même
        // (demande explicite du 31/08 — ne pas comparer à l'ancienne position).
        const autresObjets = objets.filter((o) => o.uid !== uidEnEditionCommerce);
        const proche = objetProcheExiste(autresObjets, typeCommerce, 'type_commerce', nouvellePositionCommerce, SEUIL_DOUBLON_METRES);
        if (proche && !confirm(`Un commerce de type "${typeCommerce}" existe déjà à moins de ${SEUIL_DOUBLON_METRES} m de ce nouvel emplacement — enregistrer quand même ?`)) {
          return;
        }
      }

      const objet = {
        ...existant,
        nom_commerce: nomCommerce,
        type_commerce: typeCommerce,
        etat,
        date_fermeture: dateFermeture,
        commentaire,
        last_update: new Date().toISOString(),
        ...(nouvellePositionCommerce ? { lat: nouvellePositionCommerce[0], lon: nouvellePositionCommerce[1] } : {})
      };
      await enregistrerCommerce(objet);
      mettreAJourMarqueurCommerce(objet);
      fermerFormulaireCommerce();
      return;
    }

    const position = positionManuelleCommerce || getDernierePosition();
    if (!position) {
      alert('Position indisponible, réessayez.');
      return;
    }

    const existants = await listerCommerces();
    const proche = objetProcheExiste(existants, typeCommerce, 'type_commerce', position, SEUIL_DOUBLON_METRES);
    if (proche && !confirm(`Un commerce de type "${typeCommerce}" existe déjà à moins de ${SEUIL_DOUBLON_METRES} m — enregistrer quand même ?`)) {
      return;
    }

    const objet = {
      uid: await genererUid(),
      nom_commerce: nomCommerce,
      type_commerce: typeCommerce,
      etat,
      date_fermeture: dateFermeture,
      commentaire,
      last_update: new Date().toISOString(),
      lat: position[0],
      lon: position[1]
    };

    await enregistrerCommerce(objet);
    afficherMarqueurCommerce(objet);
    dernierTypeCommerce = typeCommerce;
    fermerFormulaireCommerce();
  } catch (erreur) {
    console.error('Échec de l\'enregistrement du commerce :', erreur);
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
async function supprimerCommerce(uid) {
  if (!confirm('Supprimer définitivement ce commerce ?')) return;

  try {
    await supprimerDeStore('commerce', uid);
    const marker = commerceMarkers[uid];
    if (marker) {
      map.closePopup();
      map.removeLayer(marker);
      delete commerceMarkers[uid];
    }
    if (uidEnEditionCommerce === uid) fermerFormulaireCommerce();
  } catch (erreur) {
    console.error('Échec de la suppression du commerce :', erreur);
    alert('Échec de la suppression. Réessayez.');
  }
}

async function chargerCommercesExistants() {
  try {
    const objets = await listerCommerces();
    objets.forEach(afficherMarqueurCommerce);
  } catch (erreur) {
    console.error('Échec du chargement des commerces existants :', erreur);
    afficherBanniereErreur('Impossible de charger les commerces déjà enregistrés sur cet appareil — ne continuez pas la saisie sans vérifier ce problème.');
  }
}

document.getElementById('bouton-ajouter-commerce').addEventListener('click', ouvrirFormulaireCommerce);
document.getElementById('bouton-annuler-commerce').addEventListener('click', fermerFormulaireCommerce);
document.getElementById('bouton-modifier-emplacement-commerce').addEventListener('click', modifierEmplacementCommerce);
document.getElementById('form-commerce').addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  enregistrerCommerceDepuisFormulaire();
});

chargerCommercesExistants();
