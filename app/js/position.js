// Affichage de la position GPS en temps réel (§6.1 des spécifications)

let positionMarker = null;
let positionCentree = false;
let dernierePosition = null;
let alerteGpsAffichee = false;

function getDernierePosition() {
  return dernierePosition;
}

function onPositionRecue(position) {
  const latlng = [position.coords.latitude, position.coords.longitude];
  dernierePosition = latlng;
  alerteGpsAffichee = false;

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
  // On ne montre la bannière qu'une fois (jusqu'au prochain fix réussi) pour
  // ne pas spammer l'utilisateur : watchPosition réessaie en continu et
  // rappellerait cette fonction à chaque échec sinon.
  if (!alerteGpsAffichee) {
    alerteGpsAffichee = true;
    afficherBanniereErreur('Position GPS indisponible — vérifiez que la géolocalisation est autorisée pour ce site.');
  }
}

if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(onPositionRecue, onPositionErreur, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000
  });
} else {
  console.warn('Géolocalisation non supportée par ce navigateur.');
  afficherBanniereErreur('Géolocalisation non supportée par ce navigateur.');
}
