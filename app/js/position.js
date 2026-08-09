// Affichage de la position GPS en temps réel (§6.1 des spécifications)

let positionMarker = null;
let positionCentree = false;
let dernierePosition = null;

function getDernierePosition() {
  return dernierePosition;
}

function onPositionRecue(position) {
  const latlng = [position.coords.latitude, position.coords.longitude];
  dernierePosition = latlng;

  if (!positionMarker) {
    positionMarker = L.circleMarker(latlng, {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#1a73e8',
      fillOpacity: 1
    }).addTo(map);
  } else {
    positionMarker.setLatLng(latlng);
  }

  // On ne recentre la carte que sur la toute première position reçue,
  // pour ne pas gêner l'utilisateur qui aurait déplacé/zoomé la carte ensuite.
  if (!positionCentree) {
    map.setView(latlng, ZOOM_DEFAUT);
    positionCentree = true;
  }
}

function onPositionErreur(erreur) {
  console.warn('Géolocalisation indisponible :', erreur.message);
}

if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(onPositionRecue, onPositionErreur, {
    enableHighAccuracy: true,
    maximumAge: 5000
  });
} else {
  console.warn('Géolocalisation non supportée par ce navigateur.');
}
