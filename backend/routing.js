// Safe Evacuation Routing & Shelter Navigation Service (API #5 - OSRM Engine)
const https = require('https');

// Designated Emergency Evacuation Centers & Medical Relief Hubs (Geographically Verified Landmarks in Iligan City)
const EVACUATION_SHELTERS = [
  {
    id: 'SHELTER-1',
    name: 'MSU-IIT Grand Gymnasium Relief Hub',
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
    id: 'SHELTER-2',
    name: 'Iligan City National High School (ICNHS) Evacuation Center',
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
    id: 'SHELTER-3',
    name: 'Iligan City Hall & CDRRMO Disaster Operations Center',
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
    id: 'SHELTER-4',
    name: 'Gregorio T. Lluch Memorial Hospital (GTLMH Emergency Center)',
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
    id: 'SHELTER-5',
    name: 'Barangay Tipanoy Evacuation Center & BDRRMC Complex',
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
    id: 'SHELTER-6',
    name: 'Tubod Community Gymnasium & Evacuation Hub',
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
    id: 'SHELTER-7',
    name: 'St. Michael\'s College (SMC) Disaster Relief Complex',
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
  }
];

/**
 * Calculates Haversine distance in kilometers between two coordinates
 */
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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

/**
 * Finds the nearest designated shelter from a given coordinate
 */
function findNearestShelter(lat, lng) {
  let nearest = EVACUATION_SHELTERS[0];
  let minDistance = calculateHaversineKm(lat, lng, nearest.latitude, nearest.longitude);

  for (let i = 1; i < EVACUATION_SHELTERS.length; i++) {
    const shelter = EVACUATION_SHELTERS[i];
    const dist = calculateHaversineKm(lat, lng, shelter.latitude, shelter.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = shelter;
    }
  }

  return {
    shelter: nearest,
    crowFliesDistanceKm: parseFloat(minDistance.toFixed(2))
  };
}

/**
 * Calls OSRM (Open Source Routing Machine) API to fetch actual street navigation path
 */
async function getNearestEvacuationRoute(startLat, startLng, destLat, destLng, mode = 'driving') {
  const travelMode = mode === 'walking' ? 'walking' : 'driving';

  let destination = null;
  if (destLat && destLng) {
    destination = {
      name: 'Selected Evacuation Destination',
      latitude: parseFloat(destLat),
      longitude: parseFloat(destLng),
      address: `Coordinates: ${Number(destLat).toFixed(4)}, ${Number(destLng).toFixed(4)}`
    };
  } else {
    const nearestResult = findNearestShelter(startLat, startLng);
    destination = nearestResult.shelter;
  }

  const startCoord = `${startLng},${startLat}`;
  const destCoord = `${destination.longitude},${destination.latitude}`;
  const osrmUrl = `https://router.project-osrm.org/route/v1/${travelMode}/${startCoord};${destCoord}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`OSRM responded with status ${res.status}`);
    }

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
        geojson: bestRoute.geometry, // GeoJSON LineString for Leaflet
        steps: steps.slice(0, 5),
        is_fallback: false
      };
    }
  } catch (err) {
    console.warn('OSRM routing request failed or timed out, generating safe linear fallback:', err.message);
  }

  // Graceful Fallback: Ensure 100% uptime during university presentations
  const haversineDist = calculateHaversineKm(startLat, startLng, destination.latitude, destination.longitude);
  const fallbackDuration = travelMode === 'walking' 
    ? Math.round((haversineDist / 4) * 60) // walking ~4 km/h
    : Math.round((haversineDist / 30) * 60); // driving ~30 km/h

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

module.exports = {
  EVACUATION_SHELTERS,
  findNearestShelter,
  getNearestEvacuationRoute
};

