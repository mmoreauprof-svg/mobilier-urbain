// Enregistrement du service worker (installabilité PWA, §11 des spécifications)

// Audit 2026-08-23 (points 6-7) : un échec réel (pas seulement la limite déjà
// connue du navigateur automatisé de Claude) ne doit pas rester cantonné à la
// console — sur le terrain, sans connexion, l'utilisateur n'a aucun autre moyen
// de le découvrir avant qu'il ne soit trop tard.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (evenement) => {
    if (evenement.data && evenement.data.type === 'cache-incomplet') {
      afficherBanniereErreur(
        `Installation hors-ligne incomplète : ${evenement.data.manquants.length} fichier(s) n'ont pas pu être mis en cache — l'app pourrait ne pas fonctionner correctement sans connexion. Rechargez avec une meilleure connexion pour réessayer.`
      );
    }
  });

  navigator.serviceWorker.register('service-worker.js').catch((erreur) => {
    console.warn('Échec de l\'enregistrement du service worker — l\'app reste utilisable, mais ne sera pas installable :', erreur);
    afficherBanniereErreur('Échec de l\'installation hors-ligne de l\'app — le fonctionnement sans connexion n\'est pas garanti sur cet appareil. Rechargez avec une connexion active pour réessayer.');
  });
}
