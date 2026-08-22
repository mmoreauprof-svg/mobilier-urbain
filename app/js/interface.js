// Bascule d'interface PC (barre d'outils + bulle contextuelle ancrée au point)
// / mobile (barre d'onglets + écrans pleins) — purement responsive, sans
// détection de plateforme, cohérent avec §6.4bis des spécifications.

const SEUIL_LARGEUR_PC = 768;

function estAffichagePC() {
  return window.innerWidth >= SEUIL_LARGEUR_PC;
}

// Positionne un panneau de formulaire près d'un point de la carte (PC
// uniquement — sur mobile le panneau est plein écran, cf. style.css).
// Repli simple : le panneau est ramené dans les limites de l'écran s'il
// déborderait, sans inversion "intelligente" du côté d'ancrage.
//
// Important : le panneau doit déjà être visible (hidden = false) AVANT cet
// appel, pour que sa hauteur réelle soit mesurable — une hauteur estimée à
// l'avance sous-évaluait le formulaire réel et laissait les boutons
// Annuler/Enregistrer hors écran quand le point était bas sur la carte.
function positionnerPanneauFormulaire(panneau, latlng) {
  if (!latlng || !estAffichagePC()) return;

  const point = map.latLngToContainerPoint(L.latLng(latlng[0], latlng[1]));
  const rectCarte = document.getElementById('map').getBoundingClientRect();
  const largeur = 300;
  const marge = 10;
  const hauteur = panneau.getBoundingClientRect().height || 340;

  let left = rectCarte.left + point.x - largeur / 2;
  let top = rectCarte.top + point.y + 16;
  left = Math.max(marge, Math.min(left, window.innerWidth - largeur - marge));
  top = Math.max(marge, Math.min(top, window.innerHeight - hauteur - marge));

  panneau.style.setProperty('--popover-top', top + 'px');
  panneau.style.setProperty('--popover-left', left + 'px');
}

// Mobile : met en évidence l'onglet correspondant à l'écran affiché.
// Sans effet visible sur PC (pas de barre d'onglets), volontairement
// appelée par les mêmes fonctions des deux plateformes pour rester simple.
function definirOngletActif(nom) {
  document.querySelectorAll('.onglet').forEach((bouton) => {
    bouton.classList.toggle('actif', bouton.dataset.onglet === nom);
  });
}

function ouvrirEcranFichier() {
  document.getElementById('ecran-fichier').hidden = false;
  definirOngletActif('fichier');
}

function fermerEcranFichier() {
  document.getElementById('ecran-fichier').hidden = true;
}

document.getElementById('onglet-carte').addEventListener('click', () => {
  fermerFormulaireMobilier();
  fermerFormulaireCommerce();
  fermerEcranFichier();
  definirOngletActif('carte');
});

document.getElementById('onglet-mobilier').addEventListener('click', () => ouvrirFormulaireMobilier());
document.getElementById('onglet-commerce').addEventListener('click', () => ouvrirFormulaireCommerce());
document.getElementById('onglet-fichier').addEventListener('click', ouvrirEcranFichier);

document.getElementById('bouton-exporter-mobile').addEventListener('click', () => exporterDonnees());
document.getElementById('bouton-importer-mobile').addEventListener('click', () => {
  document.getElementById('input-fichier-import').click();
});

document.querySelectorAll('.bouton-filtres-icone').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    const panneau = document.getElementById('panneau-filtres');
    panneau.hidden = !panneau.hidden;
  });
});
