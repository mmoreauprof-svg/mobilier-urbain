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
