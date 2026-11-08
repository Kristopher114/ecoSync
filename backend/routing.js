// Safe Evacuation Routing & Shelter Navigation Service (API #5 - OSRM Engine)
const https = require('https');

// Designated Emergency Evacuation Centers & Medical Relief Hubs
const EVACUATION_SHELTERS = [
  {
    id: 'SHELTER-1',
    name: 'MSU-IIT Grand Gymnasium Relief Hub',
    type: 'Primary Evacuation Center',
    latitude: 8.2415,
    longitude: 124.2440,
    address: 'Andres Bonifacio Ave, Tibanga, Iligan City',
    total_capacity: 850,
    current_occupancy: 272,
    status: 'Active (Available)',
    elevation: 'High Ground (Flood-Safe)',
    amenities: ['Satellite Comms', 'Backup Generator', 'Mobile Kitchen', 'First Aid Station'],
    contact: '+63 917 882 1401'
  },
  {
    id: 'SHELTER-2',
    name: 'Iligan City National High School Evacuation Center',
    type: 'Secondary Evacuation Center',
    latitude: 8.2280,
    longitude: 124.2450,
    address: 'Gen. Wood St, Poblacion, Iligan City',
    total_capacity: 650,
    current_occupancy: 312,
    status: 'Active (Available)',
    elevation: 'Moderate Ground',
    amenities: ['Clean Water Filtration', 'Medical Clinic', 'Child Welfare Space', 'Food Rations'],
    contact: '+63 918 554 2209'
  },
  {
    id: 'SHELTER-3',
    name: 'Poblacion Central Civic Auditorium',
    type: 'Community Disaster Hub',
    latitude: 8.2285,
    longitude: 124.2385,
    address: 'Quezon Ave, Central Poblacion, Iligan City',
    total_capacity: 500,
    current_occupancy: 360,
    status: 'Active (Near Capacity)',
    elevation: 'Standard Elevation',
    amenities: ['Rapid Rescue Staging', 'Emergency Power', 'Clothing & Bedding Depot'],
    contact: '+63 922 419 8092'
  },
  {
    id: 'SHELTER-4',
    name: 'District Health & Emergency Trauma Center',
    type: 'Emergency Medical Center',
    latitude: 8.2150,
    longitude: 124.2480,
    address: 'Palao Hospital Boulevard, Iligan City',
    total_capacity: 300,
    current_occupancy: 255,
    status: 'Active (Emergency Only)',
    elevation: 'Safe Zone',
    amenities: ['Level 2 Trauma Care', 'Blood Bank', 'ICU Support', 'Ambulance Bay'],
    contact: '+63 917 110 3388'
  },
  {
    id: 'SHELTER-5',
    name: 'Tipanoy Uplands Evacuation Staging Camp',
    type: 'High-Elevation Flood Sanctuary',
    latitude: 8.1980,
    longitude: 124.2580,
    address: 'Uplands Road, Barangay Tipanoy, Iligan City',
    total_capacity: 400,
    current_occupancy: 95,
    status: 'Active (Available)',
    elevation: 'Mountain High Ground (Zero Flood Risk)',
    amenities: ['Water Tanker Reserves', 'Helipad Staging', 'Relief Goods Warehouse'],
    contact: '+63 908 721 9931'
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
