// Enregistrement du service worker (installabilité PWA, §11 des spécifications)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch((erreur) => {
    console.warn('Échec de l\'enregistrement du service worker — l\'app reste utilisable, mais ne sera pas installable :', erreur);
  });
}
