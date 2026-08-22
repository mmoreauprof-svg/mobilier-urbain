// Icônes stylisées des marqueurs (§6.1 des spécifications, étape 7 de la feuille de route)
// Fichiers sources : app/icons/*.svg

const FICHIERS_ICONE_MOBILIER = {
  'Banc': 'icons/banc.svg',
  'Corbeille': 'icons/corbeille.svg',
  'Distributeur de sacs': 'icons/distributeur-sacs.svg',
  'Arrêt de bus': 'icons/arret-bus.svg',
  'Abri bus': 'icons/abri-bus.svg'
};

function construireIcone(url) {
  return L.icon({
    iconUrl: url,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36]
  });
}

function iconeMobilier(typeObjet, nombre) {
  const url = FICHIERS_ICONE_MOBILIER[typeObjet];
  if (!nombre || nombre <= 1) {
    return construireIcone(url);
  }
  // Badge de quantité (§6.1 des spécifications) : nécessite un divIcon (HTML)
  // pour superposer un nombre dynamique, une image seule (L.icon) ne le permet pas.
  return L.divIcon({
    html: `<img src="${url}" width="32" height="40"><span class="badge-nombre">${nombre}</span>`,
    className: 'icone-mobilier-avec-badge',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36]
  });
}

function iconeCommerce(etat) {
  const fichier = etat === 'Occupé' ? 'icons/commerce-occupe.svg' : 'icons/commerce-vacant.svg';
  return construireIcone(fichier);
}
