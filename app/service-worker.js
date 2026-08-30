// Service worker — mise en cache pour un usage hors-ligne sur le terrain (§4).
//
// Deux caches distincts :
// - CACHE_APP : tous les fichiers de l'application (HTML/CSS/JS/librairies/icônes),
//   préchargés à l'installation, servis "cache d'abord" pour un chargement instantané
//   même sans réseau.
// - CACHE_TUILES : images de la carte OpenStreetMap, mises en cache au fur et à
//   mesure qu'elles sont affichées ("réseau d'abord, secours sur le cache") — une
//   zone déjà consultée une fois en ligne reste ensuite disponible hors-ligne ; une
//   zone jamais visitée reste vide sans connexion.
//
// Pour publier une mise à jour du code : incrémenter VERSION ci-dessous. Sans ça,
// les appareils déjà installés continueraient à utiliser les anciens fichiers mis
// en cache (même symptôme que le cache HTTP du navigateur, déjà rencontré plusieurs
// fois en développement).

const VERSION = 'v4';
const CACHE_APP = `mobilier-urbain-app-${VERSION}`;
const CACHE_TUILES = 'mobilier-urbain-tuiles';

const FICHIERS_APP = [
  '.',
  'index.html',
  'manifest.json',
  'css/style.css',
  'lib/leaflet/leaflet.css',
  'lib/leaflet/leaflet.js',
  'lib/leaflet/images/marker-icon.png',
  'lib/leaflet/images/marker-icon-2x.png',
  'lib/leaflet/images/marker-shadow.png',
  'lib/geopackage/geopackage.min.js',
  'lib/geopackage/sql-wasm.wasm',
  'js/util.js',
  'js/map.js',
  'js/position.js',
  'js/device.js',
  'js/geo.js',
  'js/icones.js',
  'js/storage.js',
  'js/filtres.js',
  'js/interface.js',
  'js/mobilier.js',
  'js/commerce.js',
  'js/gpkg.js',
  'js/pwa.js',
  'icons/app-icon-32.png',
  'icons/app-icon-180.png',
  'icons/app-icon-192.png',
  'icons/app-icon-512.png',
  'icons/banc.svg',
  'icons/corbeille.svg',
  'icons/distributeur-sacs.svg',
  'icons/arret-bus.svg',
  'icons/abri-bus.svg',
  'icons/commerce-occupe.svg',
  'icons/commerce-vacant.svg',
];

// Fonction pure (audit 2026-08-23, relecture du 24/08, point 1) : extraite du
// gestionnaire 'install' pour être testable directement, sans dépendre du
// contexte Service Worker (caches.open, cache.add...) qui ne peut pas être
// reproduit fidèlement dans le harnais de test.
function fichiersEnEchec(resultatsAllSettled, fichiers) {
  return resultatsAllSettled
    .map((r, i) => (r.status === 'rejected' ? fichiers[i] : null))
    .filter(Boolean);
}

// cache.addAll() est tout ou rien : un seul fichier en échec (404, coupure
// réseau pendant l'installation) faisait échouer toute la mise en cache sans
// que rien ne le signale (audit 2026-08-23, point 6) — l'app se croyait
// installée avec un cache vide ou incomplet. On met en cache fichier par
// fichier et on prévient les pages ouvertes en cas d'échec partiel.
self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    const resultats = await Promise.allSettled(FICHIERS_APP.map((url) => cache.add(url)));
    const manquants = fichiersEnEchec(resultats, FICHIERS_APP);
    if (manquants.length) {
      console.warn('Mise en cache incomplète à l\'installation :', manquants);
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      clients.forEach((client) => client.postMessage({ type: 'cache-incomplet', manquants }));
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms
          .filter((nom) => nom !== CACHE_APP && nom !== CACHE_TUILES)
          .map((nom) => caches.delete(nom))
      ))
      .then(() => self.clients.claim())
  );
});

function estTuileOsm(url) {
  return /^https:\/\/[abc]\.tile\.openstreetmap\.org\//.test(url);
}

// Fonction pure (relecture du 24/08, point 1) : décide de la stratégie à
// appliquer à une requête, extraite du gestionnaire 'fetch' pour être
// testable directement (méthode + URL en entrée, une chaîne en sortie —
// aucune dépendance à evenement.respondWith()/caches/fetch réels).
function strategieCache(methode, url) {
  if (methode !== 'GET') return 'aucune';
  if (estTuileOsm(url)) return 'tuile';
  if (url.startsWith(self.location.origin)) return 'app';
  return 'aucune';
}

self.addEventListener('fetch', (evenement) => {
  const strategie = strategieCache(evenement.request.method, evenement.request.url);

  if (strategie === 'tuile') {
    evenement.respondWith(
      fetch(evenement.request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE_TUILES).then((cache) => cache.put(evenement.request, copie));
          return reponse;
        })
        .catch(() => caches.match(evenement.request))
    );
  } else if (strategie === 'app') {
    evenement.respondWith(
      caches.match(evenement.request).then((reponse) => reponse || fetch(evenement.request))
    );
  }
});
