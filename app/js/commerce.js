// Saisie, modification et suppression d'un commerce (§6.3, §6.4 des spécifications)

const commerceMarkers = {};
let uidEnEditionCommerce = null;
let positionManuelleCommerce = null;

function construirePopupCommerce(objet) {
  const nom = objet.nom_commerce ? echapperHtml(objet.nom_commerce) : '(local sans enseigne)';
  const dateFermetureHtml = objet.date_fermeture ? `<br>Fermé depuis : ${echapperHtml(objet.date_fermeture)}` : '';
  const commentaireHtml = objet.commentaire ? `<br>${echapperHtml(objet.commentaire)}` : '';
  return `<strong>${nom}</strong><br>${echapperHtml(objet.type_commerce)}<br>État : ${echapperHtml(objet.etat)}${dateFermetureHtml}${commentaireHtml}<br><button onclick="ouvrirEditionCommerce('${objet.uid}')">Modifier / Supprimer</button>`;
}

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
  positionManuelleCommerce = positionManuelle;
  uidEnEditionCommerce = null;
  document.getElementById('titre-modal-commerce').textContent = 'Nouveau commerce';
  document.getElementById('bouton-enregistrer-commerce').textContent = 'Enregistrer';
  document.getElementById('bouton-supprimer-commerce').hidden = true;
  document.getElementById('modal-commerce').hidden = false;
}

function fermerFormulaireCommerce() {
  document.getElementById('modal-commerce').hidden = true;
  document.getElementById('form-commerce').reset();
  uidEnEditionCommerce = null;
  positionManuelleCommerce = null;
}

async function ouvrirEditionCommerce(uid) {
  const objets = await listerCommerces();
  const objet = objets.find((o) => o.uid === uid);
  if (!objet) return;

  uidEnEditionCommerce = uid;
  document.getElementById('commerce-nom').value = objet.nom_commerce || '';
  document.getElementById('commerce-type').value = objet.type_commerce;
  document.getElementById('commerce-etat').value = objet.etat;
  document.getElementById('commerce-date-fermeture').value = objet.date_fermeture || '';
  document.getElementById('commerce-commentaire').value = objet.commentaire || '';

  document.getElementById('titre-modal-commerce').textContent = 'Modifier le commerce';
  document.getElementById('bouton-enregistrer-commerce').textContent = 'Enregistrer les modifications';
  document.getElementById('bouton-supprimer-commerce').hidden = false;

  map.closePopup();
  document.getElementById('modal-commerce').hidden = false;
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
      const objet = {
        ...existant,
        nom_commerce: nomCommerce,
        type_commerce: typeCommerce,
        etat,
        date_fermeture: dateFermeture,
        commentaire,
        last_update: new Date().toISOString()
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
      uid: genererUid(),
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

async function supprimerCommerceEnEdition() {
  if (!uidEnEditionCommerce) return;
  if (!confirm('Supprimer définitivement ce commerce ?')) return;

  try {
    await supprimerDeStore('commerce', uidEnEditionCommerce);
    const marker = commerceMarkers[uidEnEditionCommerce];
    if (marker) {
      map.removeLayer(marker);
      delete commerceMarkers[uidEnEditionCommerce];
    }
    fermerFormulaireCommerce();
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
document.getElementById('bouton-enregistrer-commerce').addEventListener('click', enregistrerCommerceDepuisFormulaire);
document.getElementById('bouton-supprimer-commerce').addEventListener('click', supprimerCommerceEnEdition);

chargerCommercesExistants();
