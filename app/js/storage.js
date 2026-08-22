// Stockage local permanent, IndexedDB (§3, §6.5 des spécifications)

// DB_NOM_OVERRIDE (non défini dans l'app normale) permet à test.html d'isoler
// sa propre base IndexedDB, sans jamais toucher aux données réelles.
const DB_NOM = (typeof DB_NOM_OVERRIDE !== 'undefined') ? DB_NOM_OVERRIDE : 'MobilierUrbainDB';
const DB_VERSION = 1;

function ouvrirBaseDeDonnees() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(DB_NOM, DB_VERSION);

    requete.onupgradeneeded = (evenement) => {
      const db = evenement.target.result;
      if (!db.objectStoreNames.contains('mobilier_urbain')) {
        db.createObjectStore('mobilier_urbain', { keyPath: 'uid' });
      }
      if (!db.objectStoreNames.contains('commerce')) {
        db.createObjectStore('commerce', { keyPath: 'uid' });
      }
    };

    requete.onsuccess = (evenement) => resolve(evenement.target.result);
    requete.onerror = (evenement) => reject(evenement.target.error);
  });
}

const basePromise = ouvrirBaseDeDonnees();

async function enregistrerDansStore(nomStore, objet) {
  const db = await basePromise;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(nomStore, 'readwrite');
    transaction.objectStore(nomStore).put(objet);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function listerStore(nomStore) {
  const db = await basePromise;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(nomStore, 'readonly');
    const requete = transaction.objectStore(nomStore).getAll();
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

async function supprimerDeStore(nomStore, uid) {
  const db = await basePromise;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(nomStore, 'readwrite');
    transaction.objectStore(nomStore).delete(uid);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function viderStore(nomStore) {
  const db = await basePromise;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(nomStore, 'readwrite');
    transaction.objectStore(nomStore).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function enregistrerMobilierUrbain(objet) {
  return enregistrerDansStore('mobilier_urbain', objet);
}

function listerMobilierUrbain() {
  return listerStore('mobilier_urbain');
}

function enregistrerCommerce(objet) {
  return enregistrerDansStore('commerce', objet);
}

function listerCommerces() {
  return listerStore('commerce');
}
