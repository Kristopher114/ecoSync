/**
 * Lanao del Norte & Iligan City Municipalities Registry
 * Shared across Map Jurisdiction Filter, Live Weather Radar, Admin Command Hub,
 * and the Live OpenStreetMap/Photon Municipality-Scoped Search Engine.
 *
 * Bounds Configuration:
 * - Wide territorial coverage (coastal-to-hinterland barangays) so the entire
 *   municipality and surrounding roads/barangays are comfortably visible
 * - Retains strict municipal jurisdiction lock for Municipality Admins
 */
export const LANAO_MUNICIPALITIES = [
  {
    id: 'ALL',
    name: '🌐 All Lanao del Norte & Iligan',
    shortName: 'All Municipalities',
    lat: 8.0800,
    lng: 123.9500,
    zoom: 10,
    minZoom: 9,
    boundsPadLat: 0.45,
    boundsPadLng: 0.55
  },
  {
    id: 'ILIGAN',
    name: '🏙️ Iligan City',
    shortName: 'Iligan City',
    lat: 8.2280,
    lng: 124.2452,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.15,
    boundsPadLng: 0.18
  },
  {
    id: 'TUBOD',
    name: '🏛️ Tubod (Provincial Capital)',
    shortName: 'Tubod',
    lat: 8.0554,
    lng: 123.7904,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.12,
    boundsPadLng: 0.13
  },
  {
    id: 'KAPATAGAN',
    name: '⛰️ Kapatagan',
    shortName: 'Kapatagan',
    lat: 7.9001,
    lng: 123.7692,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.16,
    boundsPadLng: 0.15
  },
  {
    id: 'LALA',
    name: '🌾 Lala (Maranding)',
    shortName: 'Lala',
    lat: 7.9736,
    lng: 123.7475,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.14,
    boundsPadLng: 0.14
  },
  {
    id: 'KAUSWAGAN',
    name: '🌊 Kauswagan',
    shortName: 'Kauswagan',
    lat: 8.1895,
    lng: 124.0921,
    zoom: 13,
    minZoom: 11,
    boundsPadLat: 0.11,
    boundsPadLng: 0.11
  },
  {
    id: 'LINAMON',
    name: '🌴 Linamon',
    shortName: 'Linamon',
    lat: 8.1856,
    lng: 124.1618,
    zoom: 13,
    minZoom: 11,
    boundsPadLat: 0.10,
    boundsPadLng: 0.10
  },
  {
    id: 'BACOLOD',
    name: '🏡 Bacolod',
    shortName: 'Bacolod',
    lat: 8.1887,
    lng: 124.0259,
    zoom: 13,
    minZoom: 11,
    boundsPadLat: 0.11,
    boundsPadLng: 0.11
  },
  {
    id: 'KOLAMBUGAN',
    name: '⚓ Kolambugan',
    shortName: 'Kolambugan',
    lat: 8.1167,
    lng: 123.9048,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.12,
    boundsPadLng: 0.12
  },
  {
    id: 'BALOI',
    name: '🌿 Baloi',
    shortName: 'Baloi',
    lat: 8.1168,
    lng: 124.2165,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.12,
    boundsPadLng: 0.13
  },
  {
    id: 'MAIGO',
    name: '🏞️ Maigo',
    shortName: 'Maigo',
    lat: 8.1604,
    lng: 123.9587,
    zoom: 13,
    minZoom: 11,
    boundsPadLat: 0.11,
    boundsPadLng: 0.11
  },
  {
    id: 'BAROY',
    name: '🌾 Baroy',
    shortName: 'Baroy',
    lat: 8.0241,
    lng: 123.7788,
    zoom: 13,
    minZoom: 11,
    boundsPadLat: 0.11,
    boundsPadLng: 0.11
  },
  {
    id: 'SND',
    name: '🏖️ Sultan Naga Dimaporo (SND)',
    shortName: 'Sultan Naga Dimaporo',
    lat: 7.7897,
    lng: 123.7438,
    zoom: 12,
    minZoom: 11,
    boundsPadLat: 0.15,
    boundsPadLng: 0.16
  }
];

/**
 * Alias for compatibility across components
 */
export const LANAO_DEL_NORTE_MUNICIPALITIES = LANAO_MUNICIPALITIES;

/**
 * Only specific municipalities (excludes "ALL") — used for Admin Registration
 */
export const SPECIFIC_MUNICIPALITIES = LANAO_MUNICIPALITIES.filter(m => m.id !== 'ALL');

/**
 * Look up a municipality object by its ID (e.g., 'ILIGAN', 'KAPATAGAN', 'TUBOD') or shortName
 */
export function getMunicipalityById(idOrName) {
  if (!idOrName) return LANAO_MUNICIPALITIES[0];
  const upper = String(idOrName).trim().toUpperCase();
  return (
    LANAO_MUNICIPALITIES.find(
      m => m.id === upper || m.shortName.toUpperCase() === upper
    ) || LANAO_MUNICIPALITIES[0]
  );
}

/**
 * Helper to check if an incident belongs to a specific municipality
 */
export function doesIncidentBelongToMunicipality(incident, muniId) {
  if (!muniId || muniId === 'ALL') return true;
  const muni = getMunicipalityById(muniId);
  if (!muni || muni.id === 'ALL') return true;

  const locName = (incident.location_name || '').toLowerCase();
  const title = (incident.title || '').toLowerCase();
  const shortLower = muni.shortName.toLowerCase();

  if (locName.includes(shortLower) || title.includes(shortLower)) {
    return true;
  }

  const lat = Number(incident.latitude);
  const lng = Number(incident.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    const padLat = muni.boundsPadLat || 0.12;
    const padLng = muni.boundsPadLng || 0.12;
    const dLat = Math.abs(lat - muni.lat);
    const dLng = Math.abs(lng - muni.lng);
    return dLat <= padLat && dLng <= padLng;
  }

  return false;
}

/**
 * Helper to check if a shelter belongs to a specific municipality
 */
export function doesShelterBelongToMunicipality(shelter, muniId) {
  if (!muniId || muniId === 'ALL') return true;
  const muni = getMunicipalityById(muniId);
  if (!muni || muni.id === 'ALL') return true;

  const shelterMuni = (shelter.municipality || '').toLowerCase();
  const shortLower = muni.shortName.toLowerCase();
  return shelterMuni.includes(shortLower) || shortLower.includes(shelterMuni);
}

/**
 * Live Municipality-Scoped Search Engine (Powered by Photon OpenStreetMap Search API + Nominatim Fallback)
 * Dynamically searches real barangays, schools, streets, and landmarks strictly inside the active municipality
 * without hardcoding barangay lists.
 */
export async function searchLiveMunicipalityPlaces(query, muniId = 'ALL', shelters = []) {
  const qClean = (query || '').trim();
  if (!qClean) return [];

  const qLower = qClean.toLowerCase();
  const tokens = qLower.split(/\s+/).filter(Boolean);
  const muni = getMunicipalityById(muniId);
  const isSpecificMuni = muni && muni.id !== 'ALL';

  const padLat = muni.boundsPadLat || 0.14;
  const padLng = muni.boundsPadLng || 0.16;

  // Bounding box [minLon, minLat, maxLon, maxLat] for the active municipality (or Lanao del Norte & Iligan)
  const minLng = isSpecificMuni ? muni.lng - padLng : 123.50;
  const minLat = isSpecificMuni ? muni.lat - padLat : 7.60;
  const maxLng = isSpecificMuni ? muni.lng + padLng : 124.50;
  const maxLat = isSpecificMuni ? muni.lat + padLat : 8.45;
  const bbox = `${minLng.toFixed(4)},${minLat.toFixed(4)},${maxLng.toFixed(4)},${maxLat.toFixed(4)}`;

  const results = [];
  const seenKeys = new Set();

  // 1. Include matching designated Evacuation Shelters inside the active municipality
  const scopedShelters = isSpecificMuni
    ? shelters.filter(s => doesShelterBelongToMunicipality(s, muni.id))
    : shelters;

  scopedShelters.forEach(s => {
    const searchable = `${s.name} ${s.address} ${s.municipality}`.toLowerCase();
    if (tokens.every(t => searchable.includes(t))) {
      const key = `${s.name.toLowerCase()}-${Number(s.latitude).toFixed(3)}`;
      seenKeys.add(key);
      results.push({
        name: s.name,
        subtitle: s.address,
        municipalityName: s.municipality || muni.shortName,
        type: 'Evacuation Center',
        lat: Number(s.latitude),
        lng: Number(s.longitude)
      });
    }
  });

  // 2. Query Photon OpenStreetMap Live Search Engine API scoped to the municipality's bounding box
  try {
    const scopedQuery = isSpecificMuni
      ? `${qClean} ${muni.shortName}`
      : `${qClean} Lanao del Norte`;

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(scopedQuery)}&bbox=${bbox}&lat=${muni.lat}&lon=${muni.lng}&limit=15`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      const features = data.features || [];

      for (const f of features) {
        const p = f.properties || {};
        const coords = (f.geometry && f.geometry.coordinates) || [];
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (isNaN(lat) || isNaN(lng)) continue;

        // Verify coordinates are inside the active municipality's bounding box
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) continue;

        const placeTown = (p.city || p.town || p.municipality || p.county || '').trim();
        if (isSpecificMuni && placeTown) {
          const townLower = placeTown.toLowerCase();
          const muniLower = muni.shortName.toLowerCase();
          if (!townLower.includes(muniLower) && !muniLower.includes(townLower)) {
            continue;
          }
        }

        // Verify the feature's name/barangay/district/street actually matches the user's search tokens
        const placeFields = [
          p.name,
          p.district,
          p.locality,
          p.suburb,
          p.village,
          p.quarter,
          p.street
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!tokens.every(t => placeFields.includes(t))) continue;

        const displayName = p.name || p.district || p.locality || p.street || qClean;
        const resolvedMuni = placeTown || (isSpecificMuni ? muni.shortName : 'Lanao del Norte');
        const key = `${displayName.toLowerCase()}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const rawType = p.osm_value || p.type || 'Place';
        const formattedType =
          rawType === 'quarter' || rawType === 'village' || rawType === 'suburb' || rawType === 'locality'
            ? 'Barangay'
            : rawType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const subtitleParts = [p.street, p.district, resolvedMuni, 'Lanao del Norte'].filter(Boolean);

        results.push({
          name: displayName,
          subtitle: subtitleParts.join(', '),
          municipalityName: resolvedMuni,
          type: formattedType,
          lat,
          lng
        });
      }
    }
  } catch (err) {
    console.warn('Photon live search fallback to Nominatim:', err.message);
  }

  // 3. Fallback / Supplement with OpenStreetMap Nominatim Bounded Viewbox Search if Photon returned 0 matches
  if (results.length === 0) {
    try {
      const scopedNominatimQuery = isSpecificMuni
        ? `${qClean}, ${muni.shortName}, Lanao del Norte, Philippines`
        : `${qClean}, Lanao del Norte, Philippines`;

      // Nominatim viewbox is <left>,<top>,<right>,<bottom> (minLng, maxLat, maxLng, minLat)
      const viewbox = `${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)},${minLat.toFixed(4)}`;
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ph&viewbox=${viewbox}&bounded=1&limit=8&q=${encodeURIComponent(scopedNominatimQuery)}`;
      const nomRes = await fetch(nomUrl, { headers: { 'Accept-Language': 'en' } });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        for (const item of nomData || []) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lng)) continue;

          const addr = item.address || {};
          const dispLower = (item.display_name || '').toLowerCase();
          if (isSpecificMuni) {
            const muniLower = muni.shortName.toLowerCase();
            if (!dispLower.includes(muniLower)) continue;
          }

          const name = item.name || (item.display_name || '').split(',')[0] || qClean;
          const key = `${name.toLowerCase()}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          results.push({
            name,
            subtitle: (item.display_name || '').split(',').slice(0, 3).join(', '),
            municipalityName: addr.town || addr.city || addr.municipality || muni.shortName,
            type: item.addresstype === 'quarter' || item.addresstype === 'village' ? 'Barangay' : (item.type || 'Landmark'),
            lat,
            lng
          });
        }
      }
    } catch (err) {
      console.warn('Nominatim search error:', err.message);
    }
  }

  return results;
}
