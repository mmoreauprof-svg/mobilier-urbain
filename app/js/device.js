// Identification de l'appareil : base du 'uid' inter-appareils (§3bis des spécifications)

const CLE_CODE_APPAREIL = 'mobilierUrbain_codeAppareil';

function getCodeAppareil() {
  return localStorage.getItem(CLE_CODE_APPAREIL);
}

function setCodeAppareil(code) {
  localStorage.setItem(CLE_CODE_APPAREIL, code);
}

function codeAppareilValide(code) {
  return /^[A-Za-z]{2,4}$/.test(code);
}

const CLE_COMPTEUR_LOCAL = 'mobilierUrbain_compteurLocal';

function genererUid() {
  const code = getCodeAppareil();
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
  const codeExistant = getCodeAppareil();
  if (codeExistant) {
    afficherCodeAppareil(codeExistant);
    return;
  }

  const modal = document.getElementById('modal-code-appareil');
  const input = document.getElementById('input-code-appareil');
  const bouton = document.getElementById('bouton-valider-code-appareil');
  const erreur = document.getElementById('erreur-code-appareil');

  modal.hidden = false;

  bouton.addEventListener('click', () => {
    const code = input.value.trim().toUpperCase();
    if (!codeAppareilValide(code)) {
      erreur.textContent = 'Entrez 2 à 4 lettres (ex. AND, IOS, MM).';
      erreur.hidden = false;
      return;
    }
    setCodeAppareil(code);
    modal.hidden = true;
    afficherCodeAppareil(code);
  });
}

if (document.getElementById('modal-code-appareil')) {
  initIdentificationAppareil();
}
