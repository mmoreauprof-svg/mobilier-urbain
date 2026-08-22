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

function genererUid() {
  const code = getCodeAppareil();
  if (!code) {
    // Sans ce garde-fou, un code manquant (ex. localStorage vidé par le
    // navigateur) produirait silencieusement des uid du type "null-014",
    // indiscernables des uid valides lors de la fusion QGIS.
    throw new Error('Code appareil manquant');
  }
  const compteur = parseInt(localStorage.getItem(CLE_COMPTEUR_LOCAL) || '0', 10) + 1;
  localStorage.setItem(CLE_COMPTEUR_LOCAL, String(compteur));
  return `${code}-${String(compteur).padStart(3, '0')}`;
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
