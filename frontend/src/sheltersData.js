// Province-Wide Lanao del Norte & Iligan City Designated Evacuation Shelters
// & Browser-Side OSRM Direct Routing Fallback for 100% Cloud Uptime (Vercel / Render)

export const EVACUATION_SHELTERS = [
  // --- ILIGAN CITY (Independent Urban Center) ---
  {
    id: 'SHELTER-ILIGAN-1',
    name: 'MSU-IIT Grand Gymnasium Relief Hub',
    municipality: 'Iligan City',
    type: 'Primary Regional Evacuation Center',
    latitude: 8.24265,
    longitude: 124.24410,
    address: 'Papaya St, Purok 12, Tibanga, Iligan City',
    total_capacity: 850,
    current_occupancy: 272,
    status: 'Active (Available)',
    elevation: 'High Ground (Flood-Safe)',
    amenities: ['Satellite Comms', 'Backup Generator', 'Mobile Kitchen', 'First Aid Station'],
    contact: '+63 917 882 1401'
  },
  {
    id: 'SHELTER-ILIGAN-2',
    name: 'Iligan City National High School (ICNHS) Evacuation Center',
    municipality: 'Iligan City',
    type: 'Secondary Regional Evacuation Hub',
    latitude: 8.22551,
    longitude: 124.23936,
    address: 'General Wood St, Mahayahay, Iligan City',
    total_capacity: 650,
    current_occupancy: 312,
    status: 'Active (Available)',
    elevation: 'Central Safe Zone',
    amenities: ['Clean Water Filtration', 'Medical Clinic', 'Child Welfare Space', 'Food Rations'],
    contact: '+63 918 554 2209'
  },
  {
    id: 'SHELTER-ILIGAN-3',
    name: 'Iligan City Hall & CDRRMO Disaster Operations Center',
    municipality: 'Iligan City',
    type: 'Central Government Disaster Headquarters',
    latitude: 8.22604,
    longitude: 124.25180,
    address: 'City Hall Road, Buhanginan Hill, Pala-o, Iligan City',
    total_capacity: 750,
    current_occupancy: 210,
    status: 'Active (Available)',
    elevation: 'Buhanginan Hill High Ground (Zero Flood Risk)',
    amenities: ['Command & Control Center', 'Helipad Staging', 'Emergency Power Microgrid', 'Ambulance Depot'],
    contact: '+63 922 419 8092'
  },
  {
    id: 'SHELTER-ILIGAN-4',
    name: 'Gregorio T. Lluch Memorial Hospital (GTLMH Emergency Center)',
    municipality: 'Iligan City',
    type: 'Primary Government Medical Trauma Hub',
    latitude: 8.22625,
    longitude: 124.25462,
    address: 'Gregorio T. Lluch Sr. Ave, Pala-o, Iligan City',
    total_capacity: 400,
    current_occupancy: 285,
    status: 'Active (Emergency Only)',
    elevation: 'Elevated Hospital Complex',
    amenities: ['Trauma Surgery', 'Blood Bank', 'ICU Care', 'Medical Oxygen Reserves', 'Emergency Ambulance Fleet'],
    contact: '+63 917 110 3388'
  },
  {
    id: 'SHELTER-ILIGAN-5',
    name: 'Barangay Tipanoy Evacuation Center & BDRRMC Complex',
    municipality: 'Iligan City',
    type: 'Upland Community Flood Sanctuary',
    latitude: 8.19863,
    longitude: 124.24847,
    address: 'Purok 5, Malindawag, Barangay Tipanoy, Iligan City',
    total_capacity: 500,
    current_occupancy: 110,
    status: 'Active (Available)',
    elevation: 'Tipanoy Foothills (Zero Flood Vulnerability)',
    amenities: ['Emergency Water Reservoir', 'Relief Goods Warehouse', 'Solar Backup Power', 'Community Kitchen'],
    contact: '+63 908 721 9931'
  },
  {
    id: 'SHELTER-ILIGAN-6',
    name: 'Tubod Community Gymnasium & Evacuation Hub (Iligan)',
    municipality: 'Iligan City',
    type: 'Community Flood Evacuation Center',
    latitude: 8.21391,
    longitude: 124.24241,
    address: 'Don Pedro Celdran Ave, Tubod, Iligan City',
    total_capacity: 600,
    current_occupancy: 195,
    status: 'Active (Available)',
    elevation: 'Reinforced Gymnasium Ground',
    amenities: ['Covered Gym Cots', 'Sanitation Facilities', 'Mobile Power Stations', 'Relief Distribution Bay'],
    contact: '+63 928 334 1180'
  },
  {
    id: 'SHELTER-ILIGAN-7',
    name: "St. Michael's College (SMC) Disaster Relief Complex",
    municipality: 'Iligan City',
    type: 'Institutional Relief & Volunteer Staging Center',
    latitude: 8.23943,
    longitude: 124.24984,
    address: 'Miguel Sheker Ave, San Miguel, Iligan City',
    total_capacity: 550,
    current_occupancy: 140,
    status: 'Active (Available)',
    elevation: 'Elevated Campus Grounds',
    amenities: ['Youth & Family Shelter', 'Volunteer Mobilization Hub', 'Hot Meals Kitchen', 'Medical First Responders'],
    contact: '+63 919 442 8812'
  },

  // --- PROVINCE OF LANAO DEL NORTE (Municipal Disaster Hubs) ---
  {
    id: 'SHELTER-LDN-TUBOD',
    name: 'Mindanao Civic Center (MCC) Provincial Disaster Operations Hub',
    municipality: 'Tubod',
    type: 'Provincial Command & Grand Evacuation Complex',
    latitude: 8.03873,
    longitude: 123.79196,
    address: 'Mindanao Civic Center Complex, Sagadan, Tubod, Lanao del Norte',
    total_capacity: 1500,
    current_occupancy: 380,
    status: 'Active (Available)',
    elevation: 'Provincial Capitol Plateau (Flood-Safe)',
    amenities: ['PDRRMO Provincial Command', 'Helipad Rescue Staging', 'Grand Gymnasium Cots', 'Heavy Water Tankers', 'Emergency Microgrid'],
    contact: '+63 917 520 8900'
  },
  {
    id: 'SHELTER-LDN-KAPATAGAN',
    name: 'Kapatagan Municipal Gymnasium & Emergency Center',
    municipality: 'Kapatagan',
    type: 'Primary Municipal Evacuation Complex',
    latitude: 7.89856,
    longitude: 123.76848,
    address: 'Municipal Hall Compound, Poblacion, Kapatagan, Lanao del Norte',
    total_capacity: 800,
    current_occupancy: 215,
    status: 'Active (Available)',
    elevation: 'Reinforced Multi-Purpose High Ground',
    amenities: ['Covered Gym Beds', 'Municipal First Aid Clinic', 'Mobile Kitchen', 'Clean Water Filtration'],
    contact: '+63 920 631 4421'
  },
  {
    id: 'SHELTER-LDN-LALA',
    name: 'Lala Municipal Civic Center & Disaster Hub',
    municipality: 'Lala',
    type: 'Municipal Emergency Relief Center',
    latitude: 7.96389,
    longitude: 123.77581,
    address: 'Maranding, Lala, Lanao del Norte',
    total_capacity: 700,
    current_occupancy: 190,
    status: 'Active (Available)',
    elevation: 'Commercial High Ground',
    amenities: ['Central Relief Warehouse', 'Backup Generator', 'Sanitation Facilities', 'First Aid Station'],
    contact: '+63 918 772 3110'
  },
  {
    id: 'SHELTER-LDN-KAUSWAGAN',
    name: 'Kauswagan Municipal Convention & Evacuation Center',
    municipality: 'Kauswagan',
    type: 'Coastal Disaster Relief Hub',
    latitude: 8.19094,
    longitude: 124.08654,
    address: 'Poblacion, Kauswagan, Lanao del Norte',
    total_capacity: 750,
    current_occupancy: 125,
    status: 'Active (Available)',
    elevation: 'High-Elevation Convention Hall',
    amenities: ['MDRRMO Incident Command', 'Sea-Rescue Staging', 'Community Kitchen', 'Satellite Comms'],
    contact: '+63 922 841 9901'
  },
  {
    id: 'SHELTER-LDN-LINAMON',
    name: 'Linamon Municipal Multi-Purpose Evacuation Center',
    municipality: 'Linamon',
    type: 'Border Disaster Relief Hub',
    latitude: 8.18328,
    longitude: 124.16342,
    address: 'Poblacion, Linamon, Lanao del Norte',
    total_capacity: 450,
    current_occupancy: 88,
    status: 'Active (Available)',
    elevation: 'Safe Inland Zone',
    amenities: ['Emergency Cots', 'First Aid Bay', 'Clean Water Station', 'Emergency Power'],
    contact: '+63 917 339 2100'
  },
  {
    id: 'SHELTER-LDN-KOLAMBUGAN',
    name: 'Kolambugan Civic Center & Panguil Port Disaster Hub',
    municipality: 'Kolambugan',
    type: 'Port Coastal Evacuation Center',
    latitude: 8.11419,
    longitude: 123.90241,
    address: 'Poblacion, Kolambugan, Lanao del Norte',
    total_capacity: 500,
    current_occupancy: 105,
    status: 'Active (Available)',
    elevation: 'High Ground Civic Complex',
    amenities: ['Ferry & Port Rescue Staging', 'Food Rations Depot', 'Medical Bay', 'Backup Generator'],
    contact: '+63 919 655 4200'
  },
  {
    id: 'SHELTER-LDN-BACOLOD',
    name: 'Bacolod Municipal Evacuation Gymnasium',
    municipality: 'Bacolod',
    type: 'Municipal Evacuation Center',
    latitude: 8.18960,
    longitude: 124.02437,
    address: 'Poblacion, Bacolod, Lanao del Norte',
    total_capacity: 400,
    current_occupancy: 70,
    status: 'Active (Available)',
    elevation: 'Elevated Civic Grounds',
    amenities: ['Covered Gym Beds', 'Water Filtration', 'First Aid Station'],
    contact: '+63 921 448 9122'
  },
  {
    id: 'SHELTER-LDN-BALOI',
    name: 'Balo-i Municipal Disaster Management Center',
    municipality: 'Baloi',
    type: 'Hydropower Basin Evacuation Center',
    latitude: 8.11461,
    longitude: 124.22232,
    address: 'Poblacion, Balo-i, Lanao del Norte',
    total_capacity: 450,
    current_occupancy: 95,
    status: 'Active (Available)',
    elevation: 'High Ground River-Safe',
    amenities: ['River Early Warning Station', 'Emergency Generator', 'Relief Distribution Bay'],
    contact: '+63 918 312 7709'
  },
  {
    id: 'SHELTER-LDN-MAIGO',
    name: 'Maigo Municipal Evacuation Gym',
    municipality: 'Maigo',
    type: 'Community Disaster Hub',
    latitude: 8.16185,
    longitude: 123.95952,
    address: 'Poblacion, Maigo, Lanao del Norte',
    total_capacity: 350,
    current_occupancy: 62,
    status: 'Active (Available)',
    elevation: 'Safe Inshore Elevation',
    amenities: ['Clean Water Reserves', 'Medical First Aid', 'Community Kitchen'],
    contact: '+63 920 918 3341'
  },
  {
    id: 'SHELTER-LDN-BAROY',
    name: 'Baroy Municipal Civic & Evacuation Center',
    municipality: 'Baroy',
    type: 'Municipal Disaster Center',
    latitude: 8.02619,
    longitude: 123.77841,
    address: 'Poblacion, Baroy, Lanao del Norte',
    total_capacity: 400,
    current_occupancy: 80,
    status: 'Active (Available)',
    elevation: 'Central Safe Grounds',
    amenities: ['Emergency Shelter Beds', 'Water Filtration', 'Power Generator'],
    contact: '+63 917 882 5501'
  },
  {
    id: 'SHELTER-LDN-SND',
    name: 'Sultan Naga Dimaporo (SND) Multi-Purpose Disaster Center',
    municipality: 'Sultan Naga Dimaporo',
    type: 'Southern Provincial Relief Hub',
    latitude: 7.79459,
    longitude: 123.71896,
    address: 'Poblacion, Sultan Naga Dimaporo, Lanao del Norte',
    total_capacity: 500,
    current_occupancy: 115,
    status: 'Active (Available)',
    elevation: 'Elevated Coastal Ground',
    amenities: ['Emergency Shelter Cots', 'Solar Power Battery Bank', 'Water Storage Reservoirs'],
    contact: '+63 919 720 1888'
  }
];

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestShelterLocal(lat, lng, sheltersList = EVACUATION_SHELTERS) {
  const list = sheltersList && sheltersList.length > 0 ? sheltersList : EVACUATION_SHELTERS;
  let nearest = list[0];
  let minDistance = calculateHaversineKm(lat, lng, nearest.latitude, nearest.longitude);

  for (let i = 1; i < list.length; i++) {
    const shelter = list[i];
    const dist = calculateHaversineKm(lat, lng, shelter.latitude, shelter.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = shelter;
    }
  }
  return nearest;
}

/**
 * Direct OSRM routing calculation in the browser if cloud backend route endpoint is asleep or 404s
 */
export async function calculateDirectOsrmRoute(startLat, startLng, destLat = null, destLng = null, mode = 'driving', sheltersList = EVACUATION_SHELTERS) {
  const travelMode = mode === 'walking' ? 'walking' : 'driving';
  const list = sheltersList && sheltersList.length > 0 ? sheltersList : EVACUATION_SHELTERS;

  let destination = null;
  if (destLat && destLng) {
    const matched = list.find(
      s => Math.abs(s.latitude - parseFloat(destLat)) < 0.0005 && Math.abs(s.longitude - parseFloat(destLng)) < 0.0005
    );
    destination = matched || {
      name: 'Selected Evacuation Destination',
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng),
      type: 'Evacuation Center',
      elevation: 'Flood-Safe Zone',
      address: `Coordinates: ${Number(destLat).toFixed(4)}, ${Number(destLng).toFixed(4)}`
    };
  } else {
    destination = findNearestShelterLocal(parseFloat(startLat), parseFloat(startLng), list);
  }

  const startCoord = `${startLng},${startLat}`;
  const destCoord = `${destination.longitude},${destination.latitude}`;
  const osrmUrl = `https://router.project-osrm.org/route/v1/${travelMode}/${startCoord};${destCoord}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const bestRoute = data.routes[0];
        const distanceKm = parseFloat((bestRoute.distance / 1000).toFixed(2));
        const durationMins = Math.max(1, Math.round(bestRoute.duration / 60));

        const steps = [];
        if (bestRoute.legs && bestRoute.legs[0] && bestRoute.legs[0].steps) {
          bestRoute.legs[0].steps.forEach(st => {
            if (st.maneuver && st.name) {
              steps.push({
                instruction: `${st.maneuver.type} onto ${st.name || 'unnamed road'}`,
                distance_m: Math.round(st.distance)
              });
            }
          });
        }

        return {
          success: true,
          provider: 'OSRM (Open Source Routing Machine)',
          mode: travelMode,
          shelter: destination,
          distance_km: distanceKm,
          duration_mins: durationMins,
          geojson: bestRoute.geometry,
          steps: steps.slice(0, 5),
          is_fallback: false
        };
      }
    }
  } catch (err) {
    console.warn('Direct OSRM fallback warning:', err.message);
  }

  const haversineDist = calculateHaversineKm(
    parseFloat(startLat),
    parseFloat(startLng),
    destination.latitude,
    destination.longitude
  );
  const fallbackDuration = travelMode === 'walking'
    ? Math.round((haversineDist / 4) * 60)
    : Math.round((haversineDist / 30) * 60);

  return {
    success: true,
    provider: 'EcoSync Safety Navigation Fallback',
    mode: travelMode,
    shelter: destination,
    distance_km: parseFloat(haversineDist.toFixed(2)),
    duration_mins: Math.max(1, fallbackDuration),
    geojson: {
      type: 'LineString',
      coordinates: [
        [parseFloat(startLng), parseFloat(startLat)],
        [destination.longitude, destination.latitude]
      ]
    },
    steps: [
      { instruction: `Proceed safely towards ${destination.name}`, distance_m: Math.round(haversineDist * 1000) }
    ],
    is_fallback: true
  };
}



// --- DYNAMIC ADMIN-INPUTTED EVACUATION SHELTERS HELPERS ---

const LOCAL_STORAGE_CUSTOM_SHELTERS_KEY = 'ecosync_custom_shelters_v2';

export function getCustomShelters() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_SHELTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read custom shelters from localStorage:', err.message);
    return [];
  }
}

export function saveCustomShelter(shelter) {
  try {
    const current = getCustomShelters();
    const updated = [shelter, ...current.filter(s => s.id !== shelter.id)];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHELTERS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Could not save custom shelter to localStorage:', err.message);
    return [];
  }
}

export function removeCustomShelter(shelterId) {
  try {
    const current = getCustomShelters();
    const updated = current.filter(s => s.id !== shelterId);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHELTERS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Could not remove custom shelter from localStorage:', err.message);
    return [];
  }
}

export function getAllMergedShelters(serverShelters = []) {
  const localCustom = getCustomShelters();
  const seenIds = new Set();
  const result = [];

  // Helper to normalize coordinates and types
  const normalizeShelter = (s, isCustom) => ({
    ...s,
    latitude: parseFloat(s.latitude),
    longitude: parseFloat(s.longitude),
    total_capacity: parseInt(s.total_capacity, 10) || 500,
    current_occupancy: parseInt(s.current_occupancy, 10) || 0,
    status: s.status || 'Active (Available)',
    elevation: s.elevation || 'High Ground (Flood-Safe)',
    amenities: Array.isArray(s.amenities) ? s.amenities : ['Emergency Power', 'Clean Water Filtration'],
    contact: s.contact || '+63 900 000 0000',
    is_custom: isCustom
  });

  // 1. Add server/Supabase shelters first
  let hasServerCustom = false;
  if (Array.isArray(serverShelters)) {
    for (const s of serverShelters) {
      if (!seenIds.has(s.id) && s.latitude && s.longitude) {
        seenIds.add(s.id);
        const norm = normalizeShelter(s, true);
        result.push(norm);
        hasServerCustom = true;
      }
    }
  }

  // 2. Add local storage custom shelters
  for (const s of localCustom) {
    if (!seenIds.has(s.id) && s.latitude && s.longitude) {
      seenIds.add(s.id);
      result.push(normalizeShelter(s, true));
    }
  }

  // If server had custom shelters, ensure localStorage is immediately kept warm/restored
  if (hasServerCustom) {
    try {
      const customOnly = result.filter(r => r.is_custom);
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_SHELTERS_KEY, JSON.stringify(customOnly));
    } catch {}
  }

  // 3. Add built-in baseline shelters
  for (const s of EVACUATION_SHELTERS) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      result.push(normalizeShelter(s, false));
    }
  }

  return result;
}
