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

function iconeMobilier(typeObjet) {
  return construireIcone(FICHIERS_ICONE_MOBILIER[typeObjet]);
}

function iconeCommerce(etat) {
  const fichier = etat === 'Occupé' ? 'icons/commerce-occupe.svg' : 'icons/commerce-vacant.svg';
  return construireIcone(fichier);
}
