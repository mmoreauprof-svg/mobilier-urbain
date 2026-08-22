// Filtre d'affichage par catégorie sur la carte (§6.1quater des spécifications)
// N'agit que sur l'affichage des marqueurs — aucune donnée n'est modifiée.

const CATEGORIES_FILTRE = ['Banc', 'Corbeille', 'Distributeur de sacs', 'Arrêt de bus', 'Abri bus', 'Commerce'];
const categoriesVisibles = new Set(CATEGORIES_FILTRE);

function appliquerFiltres() {
  Object.values(mobilierMarkers).forEach((marker) => {
    const visible = categoriesVisibles.has(marker.categorieFiltre);
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
  });
  Object.values(commerceMarkers).forEach((marker) => {
    const visible = categoriesVisibles.has(marker.categorieFiltre);
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible && map.hasLayer(marker)) map.removeLayer(marker);
  });
}

document.querySelectorAll('.case-filtre').forEach((caseACocher) => {
  caseACocher.addEventListener('change', () => {
    const categorie = caseACocher.dataset.categorie;
    if (caseACocher.checked) categoriesVisibles.add(categorie);
    else categoriesVisibles.delete(categorie);
    appliquerFiltres();
  });
});

// Le basculement d'affichage du panneau (clic sur l'icône filtre, PC ou
// mobile) est géré dans interface.js — un seul endroit pour les deux
// déclencheurs possibles.
