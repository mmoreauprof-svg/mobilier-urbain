// Centre par défaut : Viroflay (78220)
const VIROFLAY = [48.8032, 2.1673];
const ZOOM_DEFAUT = 16;

const map = L.map('map').setView(VIROFLAY, ZOOM_DEFAUT);

const coucheTuiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Échec de chargement des tuiles = réseau instable/coupé ; sans ce message,
// le fond de carte reste silencieusement gris sans que rien ne l'explique.
let alerteTuilesAffichee = false;
coucheTuiles.on('tileerror', () => {
  if (alerteTuilesAffichee) return;
  alerteTuilesAffichee = true;
  afficherBanniereErreur('Connexion réseau instable — le fond de carte peut être incomplet.');
});

// Sélection manuelle d'un point sur la carte (§6.4bis) : repli utilisé quand
// aucune position GPS récente n'est disponible (PC sans GPS, ou signal perdu).
// Réutilisé tel quel pour la modification d'emplacement d'un objet existant
// (§6.4ter, demande du 31/08) via les options `message`/`onAnnuler`.
let annulerSelectionCarteEnCours = null;
const TEXTE_SELECTION_PAR_DEFAUT = 'Cliquez sur la carte pour choisir l\'emplacement — ou ici pour annuler';

function demanderPositionSurCarte(callback, { message, onAnnuler } = {}) {
  if (annulerSelectionCarteEnCours) {
    annulerSelectionCarteEnCours();
  }

  const conteneurCarte = document.getElementById('map');
  const banniere = document.getElementById('banniere-selection');
  conteneurCarte.classList.add('curseur-selection');
  banniere.textContent = message || TEXTE_SELECTION_PAR_DEFAUT;
  banniere.hidden = false;

  function nettoyer() {
    map.off('click', surClicCarte);
    conteneurCarte.classList.remove('curseur-selection');
    banniere.hidden = true;
    banniere.onclick = null;
    annulerSelectionCarteEnCours = null;
  }

  function surClicCarte(evenement) {
    nettoyer();
    callback([evenement.latlng.lat, evenement.latlng.lng]);
  }

  // Distingue l'annulation explicite (clic sur la bannière, avec son propre
  // callback `onAnnuler` pour rouvrir un panneau resté masqué le cas échéant)
  // de la préemption silencieuse ci-dessus (nouvelle sélection démarrée
  // pendant qu'une autre était en attente — comportement déjà existant,
  // volontairement inchangé).
  function surAnnulation() {
    nettoyer();
    if (onAnnuler) onAnnuler();
  }

  banniere.onclick = surAnnulation;
  annulerSelectionCarteEnCours = nettoyer;
  map.on('click', surClicCarte);
}

// Annule silencieusement une sélection en cours, s'il y en a une (relecture
// du 06/09) — à appeler depuis tout point d'entrée/sortie des panneaux
// mobilier/commerce (ouverture, fermeture, changement d'onglet) pendant
// "Modifier l'emplacement" (§6.4ter). Sans ça, l'écouteur de clic carte de
// la sélection interrompue restait actif et le prochain clic sur la carte
// appliquait le nouvel emplacement à l'objet en cours d'édition **au moment
// du clic** — pas nécessairement celui pour lequel la sélection avait été
// demandée (ex. : ouvrir "Modifier l'emplacement" sur A, puis "Modifier"
// sur B sans finir la sélection de A, déplaçait B au clic suivant).
function annulerSelectionCarteSiActive() {
  if (annulerSelectionCarteEnCours) {
    annulerSelectionCarteEnCours();
  }
}
