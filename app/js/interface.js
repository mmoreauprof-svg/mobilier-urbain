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
  reafficherBarresMobiles();
}

// Filet de sécurité contre un bug de rendu observé sur le terrain (24/08) :
// la barre d'onglets et le bouton filtre mobile (position: fixed/absolute)
// pouvaient se retrouver rendus hors de la zone visible sur iPhone après un
// zoom de page ou plusieurs cycles d'ouverture/fermeture de panneau — sans
// qu'aucun code ne les ait explicitement masqués (rien ne touche leur
// affichage ailleurs dans l'app). Rétablir explicitement display après
// fermeture d'un panneau force le navigateur à recalculer leur position,
// plutôt que de faire confiance au CSS seul pour s'auto-corriger.
function reafficherBarresMobiles() {
  [document.getElementById('barre-onglets-mobile'), document.getElementById('bouton-filtres-mobile')].forEach((element) => {
    if (!element) return;
    element.style.display = 'none';
    void element.offsetHeight; // force le recalcul de mise en page avant de réafficher
    element.style.display = '';
  });
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

// --- Panneau déplaçable sur PC (demande du 23/08, §A) ---
// Le titre sert de poignée (cf. .poignee-deplacement dans style.css) plutôt
// que tout le panneau, pour ne pas interférer avec les clics sur les listes
// déroulantes/champs du formulaire.
function rendreDeplacable(panneau, poignee) {
  poignee.addEventListener('mousedown', (evenement) => {
    if (!estAffichagePC()) return;
    evenement.preventDefault();
    const rect = panneau.getBoundingClientRect();
    const decalageX = evenement.clientX - rect.left;
    const decalageY = evenement.clientY - rect.top;

    function deplacer(e) {
      let left = e.clientX - decalageX;
      let top = e.clientY - decalageY;
      left = Math.max(0, Math.min(left, window.innerWidth - rect.width));
      top = Math.max(0, Math.min(top, window.innerHeight - rect.height));
      panneau.style.setProperty('--popover-left', left + 'px');
      panneau.style.setProperty('--popover-top', top + 'px');
    }
    function arreterDeplacement() {
      document.removeEventListener('mousemove', deplacer);
      document.removeEventListener('mouseup', arreterDeplacement);
    }
    document.addEventListener('mousemove', deplacer);
    document.addEventListener('mouseup', arreterDeplacement);
  });
}

rendreDeplacable(document.getElementById('modal-mobilier-urbain'), document.getElementById('titre-modal-mobilier'));
rendreDeplacable(document.getElementById('modal-commerce'), document.getElementById('titre-modal-commerce'));

// --- Ajustement au viewport visuel réel sur mobile (demande du 23/08, §A.4) ---
// Une bannière native du navigateur (ex. demande d'autorisation de
// géolocalisation) ou le clavier virtuel peuvent réduire l'espace réellement
// visible sans que la fenêtre elle-même ne change de taille — window.innerHeight
// ne bouge pas, mais visualViewport.height si. Sans ça, le panneau plein écran
// (calé sur window.innerHeight via CSS) peut se retrouver partiellement masqué.
// On ne touche au panneau que si l'écart est net (>40px), pour ignorer les
// petites variations et revenir proprement au CSS normal sinon.
function ajusterPanneauxMobilesViewport() {
  if (estAffichagePC() || !window.visualViewport) return;
  const vv = window.visualViewport;
  const reduit = (window.innerHeight - vv.height) > 40;
  document.querySelectorAll('.panneau-formulaire').forEach((panneau) => {
    if (reduit) {
      panneau.style.top = vv.offsetTop + 'px';
      panneau.style.bottom = 'auto';
      panneau.style.height = (vv.height - 56) + 'px';
    } else {
      panneau.style.top = '';
      panneau.style.bottom = '';
      panneau.style.height = '';
    }
  });
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', ajusterPanneauxMobilesViewport);
  window.visualViewport.addEventListener('scroll', ajusterPanneauxMobilesViewport);
}

// --- Raccourcis clavier, PC uniquement (demande du 23/08, §C) ---
// N'agissent jamais si le focus est dans un champ texte/liste/commentaire —
// essentiel même en restant limité au PC : ça évite d'interférer avec la
// saisie normale (ex. taper "m" dans un commentaire n'ouvre pas "+ Mobilier").
function focusDansChampEditable() {
  const actif = document.activeElement;
  return !!actif && ['INPUT', 'TEXTAREA', 'SELECT'].includes(actif.tagName);
}

const TOUCHES_TYPE_MOBILIER = ['1', '2', '3', '4', '5'];

document.addEventListener('keydown', (evenement) => {
  if (!estAffichagePC() || focusDansChampEditable()) return;
  if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;

  const autreModalOuvert = !document.getElementById('modal-code-appareil').hidden
    || !document.getElementById('modal-import-choix').hidden;
  if (autreModalOuvert) return;

  const panneauMobilierOuvert = !document.getElementById('modal-mobilier-urbain').hidden;
  const panneauCommerceOuvert = !document.getElementById('modal-commerce').hidden;

  if (panneauMobilierOuvert && TOUCHES_TYPE_MOBILIER.includes(evenement.key)) {
    document.getElementById('mobilier-type').selectedIndex = TOUCHES_TYPE_MOBILIER.indexOf(evenement.key);
    evenement.preventDefault();
    return;
  }

  if (panneauMobilierOuvert || panneauCommerceOuvert) return;

  if (evenement.key === 'm' || evenement.key === 'M') {
    ouvrirFormulaireMobilier();
    evenement.preventDefault();
  } else if (evenement.key === 'c' || evenement.key === 'C') {
    ouvrirFormulaireCommerce();
    evenement.preventDefault();
  }
});
