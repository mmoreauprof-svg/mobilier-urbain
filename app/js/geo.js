// Fonctions géométriques pures (§6.1bis des spécifications) — testées dans app/tests/test.html

function calculDistanceMetres(latlng1, latlng2) {
  const R = 6371000; // rayon terrestre moyen, en mètres
  const rad = Math.PI / 180;
  const dLat = (latlng2[0] - latlng1[0]) * rad;
  const dLon = (latlng2[1] - latlng1[1]) * rad;
  const lat1 = latlng1[0] * rad;
  const lat2 = latlng2[0] * rad;

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function objetProcheExiste(objetsExistants, typeValeur, champType, position, seuilMetres) {
  return objetsExistants.some((o) =>
    o[champType] === typeValeur &&
    calculDistanceMetres(position, [o.lat, o.lon]) <= seuilMetres
  );
}
