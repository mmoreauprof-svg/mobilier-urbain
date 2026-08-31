// Identification de l'appareil : base du 'uid' inter-appareils (§3bis des spécifications)

// *_OVERRIDE (non définis dans l'app normale) permettent à test.html d'isoler
// ses propres clés localStorage, sans jamais toucher au code appareil réel.
const CLE_CODE_APPAREIL = (typeof CLE_CODE_APPAREIL_OVERRIDE !== 'undefined') ? CLE_CODE_APPAREIL_OVERRIDE : 'mobilierUrbain_codeAppareil';

function getCodeAppareil() {
  return localStorage.getItem(CLE_CODE_APPAREIL);
}

function setCodeAppareil(code) {
  localStorage.setItem(CLE_CODE_APPAREIL, code);
}

function codeAppareilValide(code) {
  return /^[A-Za-z]{2,4}$/.test(code);
}

const CLE_COMPTEUR_LOCAL = (typeof CLE_COMPTEUR_LOCAL_OVERRIDE !== 'undefined') ? CLE_COMPTEUR_LOCAL_OVERRIDE : 'mobilierUrbain_compteurLocal';

// Async depuis le 24/08 (rapport d'audit, point 1) : lire compteurLocal,
// l'incrémenter puis le réécrire dans localStorage est trois opérations non
// atomiques. localStorage est partagé entre tous les onglets d'une même
// origine — si l'app était ouverte dans deux onglets du même appareil et
// qu'un objet était enregistré depuis chacun à quelques millisecondes
// d'intervalle, les deux pouvaient lire la même valeur avant que l'un des
// deux ne l'ait réécrite, produisant deux objets différents avec le même
// uid (silencieux : la collision ne se serait révélée qu'à la fusion GPKG).
// navigator.locks (Web Locks API) sérialise ce bloc entre onglets quand le
// navigateur le supporte ; repli sans verrou sinon — comportement identique
// à avant cette correction, aucune régression pour un navigateur qui ne le
// supporterait pas.
function genererUid() {
  const code = getCodeAppareil();
  if (!code) {
    // Sans ce garde-fou, un code manquant (ex. localStorage vidé par le
    // navigateur) produirait silencieusement des uid du type "null-014",
    // indiscernables des uid valides lors de la fusion QGIS.
    throw new Error('Code appareil manquant');
  }

  const genererDepuisCompteur = () => {
    const compteur = parseInt(localStorage.getItem(CLE_COMPTEUR_LOCAL) || '0', 10) + 1;
    localStorage.setItem(CLE_COMPTEUR_LOCAL, String(compteur));
    return `${code}-${String(compteur).padStart(3, '0')}`;
  };

  if (navigator.locks && navigator.locks.request) {
    return navigator.locks.request(CLE_COMPTEUR_LOCAL, () => genererDepuisCompteur());
  }
  return Promise.resolve(genererDepuisCompteur());
}

function afficherCodeAppareil(code) {
  const label = document.getElementById('code-appareil-label');
  label.textContent = 'Appareil : ' + code;
  label.hidden = false;
}

function initIdentificationAppareil() {
  const modal = document.getElementById('modal-code-appareil');
  const input = document.getElementById('input-code-appareil');
  const bouton = document.getElementById('bouton-valider-code-appareil');
  const erreur = document.getElementById('erreur-code-appareil');

  // L'écouteur est toujours attaché, même si le code existe déjà au
  // démarrage, pour que 'demanderReidentificationAppareil' puisse rouvrir
  // ce même modal plus tard si le code venait à disparaître.
  bouton.addEventListener('click', () => {
    const code = input.value.trim().toUpperCase();
    if (!codeAppareilValide(code)) {
      erreur.textContent = 'Entrez 2 à 4 lettres (ex. AND, IOS, MM).';
      erreur.hidden = false;
      return;
    }
    setCodeAppareil(code);
    modal.hidden = true;
    erreur.hidden = true;
    afficherCodeAppareil(code);
  });

  const codeExistant = getCodeAppareil();
  if (codeExistant) {
    afficherCodeAppareil(codeExistant);
    return;
  }

  modal.hidden = false;
}

// Rouvre le modal d'identification quand un code manquant est détecté en
// cours d'usage (ex. à l'échec de genererUid), sans effacer le compteur local.
function demanderReidentificationAppareil() {
  const label = document.getElementById('code-appareil-label');
  const modal = document.getElementById('modal-code-appareil');
  if (label) label.hidden = true;
  if (modal) modal.hidden = false;
}

if (document.getElementById('modal-code-appareil')) {
  initIdentificationAppareil();
}
