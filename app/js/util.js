// Utilitaires partagés

function echapperHtml(texte) {
  const div = document.createElement('div');
  div.textContent = texte;
  return div.innerHTML;
}

// Bannière d'erreur persistante, pour les échecs qui doivent rester visibles
// même s'ils ne bloquent pas une action ponctuelle (ex. échec de chargement,
// réseau instable) — contrairement à alert(), utilisée pour les échecs
// directement liés à l'action que l'utilisateur vient de faire.
function afficherBanniereErreur(message) {
  const banniere = document.getElementById('banniere-erreur');
  const texte = document.getElementById('banniere-erreur-texte');
  if (!banniere || !texte) {
    alert(message);
    return;
  }
  texte.textContent = message;
  banniere.hidden = false;
}

const boutonFermerBanniereErreur = document.getElementById('banniere-erreur-fermer');
if (boutonFermerBanniereErreur) {
  boutonFermerBanniereErreur.addEventListener('click', () => {
    document.getElementById('banniere-erreur').hidden = true;
  });
}

// Filet de sécurité global : toute erreur asynchrone non interceptée ailleurs
// dans le code ne doit jamais rester invisible dans la seule console.
window.addEventListener('unhandledrejection', (evenement) => {
  console.error('Erreur non interceptée :', evenement.reason);
  afficherBanniereErreur("Une erreur inattendue s'est produite — la dernière action n'a probablement pas été enregistrée.");
});
