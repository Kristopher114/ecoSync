// Official Municipalities & Cities of Lanao del Norte Province (Region X)
export const LANAO_DEL_NORTE_MUNICIPALITIES = [
  {
    id: 'ALL',
    name: '🌐 All Lanao del Norte (Province-Wide)',
    shortName: 'All Lanao del Norte',
    lat: 8.0800,
    lng: 123.9500,
    zoom: 10,
    minZoom: 9,
    boundsPad: null,
    keywords: []
  },
  {
    id: 'ILIGAN',
    name: 'Iligan City (Independent Urban Center)',
    shortName: 'Iligan City',
    lat: 8.2280,
    lng: 124.2450,
    zoom: 13,
    minZoom: 12,
    boundsPad: 0.085,
    keywords: ['Iligan', 'Tibanga', 'Pala-o', 'Tambacan', 'Tipanoy', 'Abuno', 'Mahayahay', 'Hinaplanon', 'San Miguel']
  },
  {
    id: 'TUBOD',
    name: 'Tubod (Provincial Capital / MCC)',
    shortName: 'Tubod (Capital)',
    lat: 8.0387,
    lng: 123.7920,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Tubod, Lanao del Norte', 'Mindanao Civic Center', 'Sagadan', 'Tubod']
  },
  {
    id: 'KAPATAGAN',
    name: 'Kapatagan',
    shortName: 'Kapatagan',
    lat: 7.8986,
    lng: 123.7685,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Kapatagan']
  },
  {
    id: 'LALA',
    name: 'Lala (Maranding)',
    shortName: 'Lala',
    lat: 7.9639,
    lng: 123.7758,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Lala', 'Maranding']
  },
  {
    id: 'KAUSWAGAN',
    name: 'Kauswagan',
    shortName: 'Kauswagan',
    lat: 8.1909,
    lng: 124.0865,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Kauswagan']
  },
  {
    id: 'LINAMON',
    name: 'Linamon',
    shortName: 'Linamon',
    lat: 8.1833,
    lng: 124.1634,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.050,
    keywords: ['Linamon']
  },
  {
    id: 'BACOLOD',
    name: 'Bacolod',
    shortName: 'Bacolod',
    lat: 8.1896,
    lng: 124.0244,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.050,
    keywords: ['Bacolod']
  },
  {
    id: 'KOLAMBUGAN',
    name: 'Kolambugan',
    shortName: 'Kolambugan',
    lat: 8.1142,
    lng: 123.9024,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Kolambugan']
  },
  {
    id: 'BALOI',
    name: 'Balo-i',
    shortName: 'Balo-i',
    lat: 8.1146,
    lng: 124.2223,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Baloi', 'Balo-i']
  },
  {
    id: 'MAIGO',
    name: 'Maigo',
    shortName: 'Maigo',
    lat: 8.1619,
    lng: 123.9595,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.050,
    keywords: ['Maigo']
  },
  {
    id: 'BAROY',
    name: 'Baroy',
    shortName: 'Baroy',
    lat: 8.0262,
    lng: 123.7784,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.050,
    keywords: ['Baroy']
  },
  {
    id: 'SND',
    name: 'Sultan Naga Dimaporo (SND)',
    shortName: 'SND',
    lat: 7.7946,
    lng: 123.7190,
    zoom: 15,
    minZoom: 13,
    boundsPad: 0.055,
    keywords: ['Sultan Naga Dimaporo', 'SND']
  }
];

// Specific municipalities (excluding 'ALL') for Admin Jurisdiction assignment
export const SPECIFIC_MUNICIPALITIES = LANAO_DEL_NORTE_MUNICIPALITIES.filter(m => m.id !== 'ALL');

export function getMunicipalityById(muniId) {
  if (!muniId) return LANAO_DEL_NORTE_MUNICIPALITIES[0];
  const upper = String(muniId).trim().toUpperCase();
  const exact = LANAO_DEL_NORTE_MUNICIPALITIES.find(
    m =>
      m.id === upper ||
      m.shortName.toUpperCase() === upper ||
      m.name.toUpperCase() === upper
  );
  if (exact) return exact;

  const partial = SPECIFIC_MUNICIPALITIES.find(m =>
    m.keywords.some(k => upper.includes(k.toUpperCase()) || k.toUpperCase().includes(upper))
  );
  return partial || LANAO_DEL_NORTE_MUNICIPALITIES[0];
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Checks whether an incident belongs to a specific municipality jurisdiction
 * via explicit municipality field, location/title/description keywords, or geographic coordinates.
 */
export function doesIncidentBelongToMunicipality(inc, muniId) {
  if (!muniId || muniId === 'ALL') return true;
  const targetMuni = getMunicipalityById(muniId);
  if (!targetMuni || targetMuni.id === 'ALL') return true;

  if (inc.municipality && String(inc.municipality).toUpperCase() === targetMuni.id) {
    return true;
  }

  const combinedText = `${inc.location_name || ''} ${inc.title || ''} ${inc.description || ''}`.toLowerCase();

  // Check if text explicitly matches target municipality keywords
  if (targetMuni.keywords.some(kw => combinedText.includes(kw.toLowerCase()))) {
    return true;
  }

  // Check if text explicitly mentions a different municipality
  const mentionsOtherMuni = SPECIFIC_MUNICIPALITIES.some(
    other =>
      other.id !== targetMuni.id &&
      other.keywords.some(kw => combinedText.includes(kw.toLowerCase()))
  );
  if (mentionsOtherMuni) {
    return false;
  }

  // Fall back to coordinate proximity (nearest municipality in Lanao del Norte)
  const lat = parseFloat(inc.latitude);
  const lng = parseFloat(inc.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    let closestMuni = SPECIFIC_MUNICIPALITIES[0];
    let minDist = haversineKm(lat, lng, closestMuni.lat, closestMuni.lng);
    for (let i = 1; i < SPECIFIC_MUNICIPALITIES.length; i++) {
      const m = SPECIFIC_MUNICIPALITIES[i];
      const d = haversineKm(lat, lng, m.lat, m.lng);
      if (d < minDist) {
        minDist = d;
        closestMuni = m;
      }
    }
    return closestMuni.id === targetMuni.id && minDist <= 15;
  }

  return false;
}

/**
 * Checks whether an evacuation shelter belongs to a specific municipality jurisdiction.
 */
export function doesShelterBelongToMunicipality(shelter, muniId) {
  if (!muniId || muniId === 'ALL') return true;
  const targetMuni = getMunicipalityById(muniId);
  if (!targetMuni || targetMuni.id === 'ALL') return true;

  const sMuni = (shelter.municipality || '').toLowerCase();
  return (
    sMuni === targetMuni.id.toLowerCase() ||
    sMuni.includes(targetMuni.shortName.toLowerCase()) ||
    targetMuni.keywords.some(kw => sMuni.includes(kw.toLowerCase()))
  );
}
