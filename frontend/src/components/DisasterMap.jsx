import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Search, Navigation, AlertCircle, PlusCircle, Loader2,
  Shield, Compass, X, Car, Footprints, CheckCircle2, MapPin, Lock
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { EVACUATION_SHELTERS, calculateDirectOsrmRoute } from '../sheltersData';
import {
  getMunicipalityById,
  doesShelterBelongToMunicipality,
  searchLiveMunicipalityPlaces
} from '../municipalities';

const URGENCY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981'
};

export default function DisasterMap({
  incidents,
  selectedCategory,
  dateFilter = 'today',
  selectedMunicipality = 'ALL',
  lockedMunicipality = null,
  targetLocation,
  onMapClick,
  selectedIncident,
  onSelectIncident,
  onOpenReportWithLocation
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const sheltersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const clickedPinRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activePinAddress, setActivePinAddress] = useState(null);
  const [activePinCoords, setActivePinCoords] = useState(null);

  const effectiveMunicipality = lockedMunicipality || selectedMunicipality || 'ALL';
  const lockedMuniObj = lockedMunicipality ? getMunicipalityById(lockedMunicipality) : null;
  const activeMuniObj = getMunicipalityById(effectiveMunicipality);

  // Reset search input & errors when active municipality changes
  useEffect(() => {
    setSearchQuery('');
    setLiveSuggestions([]);
    setSearchError('');
    setShowSuggestions(false);
  }, [effectiveMunicipality]);

  // Live Debounced Search Engine (Photon OpenStreetMap API + Nominatim Bounded Viewbox)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setLiveSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLiveMunicipalityPlaces(q, effectiveMunicipality, shelters);
        if (!cancelled) {
          setLiveSuggestions(results);
        }
      } catch (err) {
        console.warn('Live search engine error:', err);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, effectiveMunicipality, shelters]);

  // Clear manually dropped landmark pin
  const handleClearPin = () => {
    if (clickedPinRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(clickedPinRef.current);
      clickedPinRef.current = null;
    }
    setActivePinCoords(null);
    setActivePinAddress(null);
  };

  // Evacuation Shelters & OSRM Routing States (API #5)
  const [showShelters, setShowShelters] = useState(true);
  const [shelters, setShelters] = useState(EVACUATION_SHELTERS);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState(null);

  // Fetch Evacuation Shelters Directory from Backend (with instant built-in fallback)
  useEffect(() => {
    async function loadShelters() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/evacuation-shelters`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setShelters(data);
          }
        }
      } catch (err) {
        console.warn('Using built-in verified Lanao del Norte evacuation shelters:', err.message);
      }
    }
    loadShelters();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialMuni = lockedMuniObj || targetLocation;
    const defaultLat = initialMuni?.lat || 8.0800;
    const defaultLng = initialMuni?.lng || 123.9500;
    const defaultZoom = initialMuni?.zoom || 10;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      fadeAnimation: true,
      zoomAnimation: true,
      maxBoundsViscosity: 0.85
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Official 100% Free OpenStreetMap tile server
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Groups for layers
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Map Click Handler: drops a pin & binds report and route actions
    map.on('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setActivePinCoords({ lat, lng });

      if (clickedPinRef.current) {
        map.removeLayer(clickedPinRef.current);
      }

      const droppedIcon = L.divIcon({
        className: 'google-style-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="
              width: 32px;
              height: 32px;
              background: #ef4444;
              border: 3px solid #ffffff;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
            "></div>
            <div style="
              position: absolute;
              top: 5px;
              width: 10px;
              height: 10px;
              background: #ffffff;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 38],
        popupAnchor: [0, -36]
      });

      const pinMarker = L.marker([lat, lng], { icon: droppedIcon }).addTo(map);
      clickedPinRef.current = pinMarker;

      pinMarker.bindPopup(`
        <div style="min-width: 180px; text-align: center; padding: 6px;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">📍 Pinned Location</div>
          <div style="font-weight: 600; color: #38bdf8; font-size: 13px;">Fetching landmark name...</div>
        </div>
      `).openPopup();

      let resolvedAddress = `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          resolvedAddress = parts.slice(0, 3).join(', ');
        }
      } catch (err) {
        console.warn('Geocoding error:', err);
      }

      setActivePinAddress(resolvedAddress);

      // Create Popup with Report & Evacuation Routing Buttons
      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '230px';
      popupContent.style.padding = '4px';
      popupContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: bold;">
            SELECTED LANDMARK
          </span>
        </div>
        <div style="font-weight: 700; color: #ffffff; font-size: 14px; margin-bottom: 2px;">
          ${resolvedAddress}
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
          Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="btn-evacuate-pin" style="
            width: 100%;
            background: linear-gradient(135deg, #06b6d4, #0284c7);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            🧭 Evacuate to Nearest Shelter (OSRM)
          </button>
          <button id="btn-report-here" style="
            width: 100%;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            🚨 Report Emergency Here
          </button>
          <button id="btn-clear-dropped-pin" style="
            width: 100%;
            background: rgba(255, 255, 255, 0.08);
            color: #cbd5e1;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11px;
            cursor: pointer;
          ">
            ❌ Clear Landmark Pin
          </button>
        </div>
      `;

      popupContent.querySelector('#btn-report-here').onclick = () => {
        if (onOpenReportWithLocation) {
          onOpenReportWithLocation(lat, lng, resolvedAddress);
        }
      };

      popupContent.querySelector('#btn-clear-dropped-pin').onclick = () => {
        handleClearPin();
      };

      popupContent.querySelector('#btn-evacuate-pin').onclick = () => {
        handleEvacuationRoute(lat, lng, null, null, 'driving');
      };

      pinMarker.setPopupContent(popupContent);
      pinMarker.openPopup();

      if (onMapClick) {
        onMapClick(lat, lng, resolvedAddress);
      }
    });

    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Lock Map Bounds & Camera when an Admin with a Specific Municipality is logged in
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.clearLayers();
    }

    if (lockedMuniObj && lockedMuniObj.id !== 'ALL') {
      const padLat = lockedMuniObj.boundsPadLat || lockedMuniObj.boundsPad || 0.13;
      const padLng = lockedMuniObj.boundsPadLng || lockedMuniObj.boundsPad || 0.16;
      const territoryBounds = L.latLngBounds(
        [lockedMuniObj.lat - padLat, lockedMuniObj.lng - padLng],
        [lockedMuniObj.lat + padLat, lockedMuniObj.lng + padLng]
      );
      // Add generous viewport pan cushion around the wide municipal territory while retaining the jurisdiction lock
      const panLockBounds = territoryBounds.pad(0.35);

      // First unlock temporarily so flyTo can smoothly move into the municipality
      map.setMaxBounds(null);
      map.setMinZoom(lockedMuniObj.minZoom || 11);
      map.flyTo([lockedMuniObj.lat, lockedMuniObj.lng], lockedMuniObj.zoom || 13, {
        duration: 1.0
      });

      // Apply wide municipal boundary lock so the Admin's map stays locked to their municipality with ample room
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setMaxBounds(panLockBounds);
        }
      }, 1050);

      // Draw wide municipal jurisdiction boundary frame
      if (boundaryLayerRef.current) {
        L.rectangle(territoryBounds, {
          color: '#06b6d4',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#06b6d4',
          fillOpacity: 0.015,
          interactive: false
        }).addTo(boundaryLayerRef.current);
      }
    } else {
      // Unlock bounds for regular Citizens / Volunteers
      map.setMaxBounds(null);
      map.setMinZoom(9);
    }
  }, [lockedMunicipality]);

  // Fly map smoothly when user changes Municipality / Jurisdiction dropdown
  useEffect(() => {
    if (!mapInstanceRef.current || !targetLocation) return;
    if (lockedMuniObj && lockedMuniObj.id !== 'ALL') return; // Admin is already locked to their municipality
    if (targetLocation.lat && targetLocation.lng) {
      mapInstanceRef.current.flyTo(
        [targetLocation.lat, targetLocation.lng],
        targetLocation.zoom || 13,
        { duration: 1.3 }
      );
    }
  }, [targetLocation, lockedMunicipality]);

  // Filter shelters according to effective municipality (Admin's locked municipality or user's selected filter)
  const displayedShelters = effectiveMunicipality === 'ALL'
    ? shelters
    : shelters.filter(s => doesShelterBelongToMunicipality(s, effectiveMunicipality));

  // Calculate & Draw Real-Time Road Route via OSRM API (API #5, with direct browser OSRM fallback)
  const handleEvacuationRoute = async (startLat, startLng, destLat = null, destLng = null, mode = 'driving') => {
    if (!mapInstanceRef.current) return;
    setIsRouting(true);
    setRoutingError(null);

    const candidateShelters = displayedShelters.length > 0 ? displayedShelters : shelters;

    // If Admin is locked to a municipality and no explicit destLat/destLng was given, route to their municipality's nearest shelter
    let targetDestLat = destLat;
    let targetDestLng = destLng;
    if (!targetDestLat && !targetDestLng && lockedMuniObj && displayedShelters.length > 0) {
      targetDestLat = displayedShelters[0].latitude;
      targetDestLng = displayedShelters[0].longitude;
    }

    try {
      let queryUrl = `${API_BASE_URL}/api/evacuation-route?startLat=${startLat}&startLng=${startLng}&mode=${mode}`;
      if (targetDestLat && targetDestLng) {
        queryUrl += `&destLat=${targetDestLat}&destLng=${targetDestLng}`;
      }

      let routeData = null;
      try {
        const res = await fetch(queryUrl);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          routeData = await res.json();
        }
      } catch {
        // Fallback to direct browser OSRM below
      }

      if (!routeData || !routeData.success || !routeData.geojson) {
        routeData = await calculateDirectOsrmRoute(
          startLat,
          startLng,
          targetDestLat,
          targetDestLng,
          mode,
          candidateShelters
        );
      }

      // Clear existing route line if any
      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
      }

      // Draw stylized road line
      const routeGeoJson = L.geoJSON(routeData.geojson, {
        style: {
          color: '#38bdf8',
          weight: 6,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
          dashArray: mode === 'walking' ? '8, 8' : null
        }
      }).addTo(routeLayerRef.current);

      // Add animated start and destination pulses
      const startPulseIcon = L.divIcon({
        className: 'route-start-pulse',
        html: `<div style="width:14px;height:14px;background:#38bdf8;border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px #38bdf8;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([startLat, startLng], { icon: startPulseIcon }).addTo(routeLayerRef.current);

      // Zoom map to fit the route
      mapInstanceRef.current.fitBounds(routeGeoJson.getBounds(), { padding: [50, 50], maxZoom: 16 });

      setActiveRoute({
        ...routeData,
        startLat,
        startLng,
        destLat: targetDestLat,
        destLng: targetDestLng,
        mode
      });
    } catch (err) {
      console.warn('Evacuation routing error:', err.message);
      setRoutingError('Could not calculate safe route at this time.');
    } finally {
      setIsRouting(false);
    }
  };

  // Toggle Travel Mode between Driving and Walking
  const handleToggleMode = (newMode) => {
    if (!activeRoute) return;
    handleEvacuationRoute(
      activeRoute.startLat,
      activeRoute.startLng,
      activeRoute.destLat,
      activeRoute.destLng,
      newMode
    );
  };

  // Clear Evacuation Route
  const handleClearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setActiveRoute(null);
  };

  // Render Evacuation Shelter Markers on Map (Green Shield Icons)
  useEffect(() => {
    if (!mapInstanceRef.current || !sheltersLayerRef.current) return;

    sheltersLayerRef.current.clearLayers();
    if (!showShelters || displayedShelters.length === 0) return;

    displayedShelters.forEach(shelter => {
      const isHospital = shelter.type.includes('Medical') || shelter.type.includes('Hospital');
      const shelterIcon = L.divIcon({
        className: 'shelter-marker-icon',
        html: `
          <div style="
            background: ${isHospital ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)'};
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px rgba(16, 185, 129, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
          ">
            ${isHospital ? '🏥' : '🛡️'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([shelter.latitude, shelter.longitude], { icon: shelterIcon });

      const pctOccupancy = Math.round((shelter.current_occupancy / shelter.total_capacity) * 100);
      const amenitiesHtml = (shelter.amenities || [])
        .map(a => `<span style="background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 10px;">⚡ ${a}</span>`)
        .join('');

      const popupDiv = document.createElement('div');
      popupDiv.style.minWidth = '260px';
      popupDiv.style.padding = '4px';
      popupDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
            ${shelter.type}
          </span>
          <span style="background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.3); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 600;">
            📍 ${shelter.municipality || 'Lanao del Norte'}
          </span>
        </div>
        <h4 style="margin: 0 0 4px 0; color: #f8fafc; font-size: 14px; font-weight: 700;">${shelter.name}</h4>
        <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 11px;">📍 ${shelter.address}</p>
        
        <div style="background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span style="color: #cbd5e1;">Live Cots Capacity</span>
            <span style="color: #38bdf8; font-weight: bold;">${shelter.current_occupancy} / ${shelter.total_capacity} (${pctOccupancy}%)</span>
          </div>
          <div style="height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: ${pctOccupancy}%; height: 100%; background: ${pctOccupancy > 80 ? '#ef4444' : '#10b981'};"></div>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Available Resources:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${amenitiesHtml}
          </div>
        </div>

        <button id="btn-route-here-${shelter.id}" style="
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          🧭 Navigate to this Evacuation Center
        </button>
      `;

      popupDiv.querySelector(`#btn-route-here-${shelter.id}`).onclick = () => {
        const defaultOriginLat = lockedMuniObj?.lat || targetLocation?.lat || 8.2250;
        const defaultOriginLng = lockedMuniObj?.lng || targetLocation?.lng || 124.2400;
        const startLat = activePinCoords?.lat || (selectedIncident ? selectedIncident.latitude : defaultOriginLat);
        const startLng = activePinCoords?.lng || (selectedIncident ? selectedIncident.longitude : defaultOriginLng);
        handleEvacuationRoute(startLat, startLng, shelter.latitude, shelter.longitude, 'driving');
      };

      marker.bindPopup(popupDiv);
      sheltersLayerRef.current.addLayer(marker);
    });
  }, [shelters, displayedShelters, showShelters, activePinCoords, selectedIncident, lockedMunicipality]);

  // Update Incident Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = selectedCategory === 'All'
      ? incidents
      : incidents.filter(inc => inc.category === selectedCategory);

    filtered.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return;

      const color = URGENCY_COLORS[inc.urgency] || '#06b6d4';
      const isCritical = inc.urgency === 'Critical';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: ${color};
            width: ${isCritical ? '28px' : '22px'};
            height: ${isCritical ? '28px' : '22px'};
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 0 ${isCritical ? '18px' : '8px'} ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <span style="font-size: 11px; font-weight: bold; color: white;">!</span>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      const incDate = inc.created_at ? new Date(inc.created_at) : null;
      const formattedDate = incDate && !isNaN(incDate.getTime())
        ? incDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Recent';

      const isToday = incDate && !isNaN(incDate.getTime()) && (
        incDate.getFullYear() === new Date().getFullYear() &&
        incDate.getMonth() === new Date().getMonth() &&
        incDate.getDate() === new Date().getDate()
      );

      const popupDiv = document.createElement('div');
      popupDiv.style.minWidth = '250px';
      popupDiv.style.padding = '4px';
      popupDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <span style="background: ${color}25; color: ${color}; border: 1px solid ${color}50; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
            ${inc.urgency || 'Medium'} Urgency
          </span>
          <span style="font-size: 11px; color: #94a3b8;">${inc.status || 'Open'}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">
          <span>📅 ${formattedDate}</span>
          ${isToday ? '<span style="background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid rgba(16,185,129,0.5); padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: bold;">TODAY</span>' : '<span style="background: rgba(148,163,184,0.15); color: #94a3b8; padding: 1px 6px; border-radius: 8px; font-size: 9px;">ARCHIVED</span>'}
        </div>
        <h4 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 15px; font-weight: 700;">${inc.title}</h4>
        <p style="margin: 0 0 8px 0; color: #cbd5e1; font-size: 12px; line-height: 1.4;">${inc.description || 'No description provided'}</p>
        <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; margin-bottom: 8px;">
          📍 ${inc.location_name || `${Number(inc.latitude).toFixed(4)}, ${Number(inc.longitude).toFixed(4)}`}
        </div>
        <button id="btn-evacuate-incident-${inc.id}" style="
          width: 100%;
          background: linear-gradient(135deg, #06b6d4, #0284c7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          🧭 Evacuate to Nearest Shelter (OSRM)
        </button>
      `;

      popupDiv.querySelector(`#btn-evacuate-incident-${inc.id}`).onclick = () => {
        handleEvacuationRoute(inc.latitude, inc.longitude, null, null, 'driving');
      };

      marker.bindPopup(popupDiv);
      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(inc);
      });

      markersLayerRef.current.addLayer(marker);
    });

    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      mapInstanceRef.current.flyTo(
        [selectedIncident.latitude, selectedIncident.longitude],
        15,
        { duration: 1.2 }
      );
    }
  }, [incidents, selectedCategory, selectedIncident]);

  // Drop a landmark pin & open action popup for a selected registered barangay/landmark
  const handleSelectPlace = (place) => {
    const map = mapInstanceRef.current;
    if (!map || !place) return;

    const lat = Number(place.lat);
    const lng = Number(place.lng);
    const resolvedAddress = `${place.name}, ${place.municipalityName}, Lanao del Norte`;

    setSearchQuery(place.name);
    setShowSuggestions(false);
    setSearchError('');
    setActivePinCoords({ lat, lng });
    setActivePinAddress(resolvedAddress);

    if (clickedPinRef.current) {
      map.removeLayer(clickedPinRef.current);
    }

    const droppedIcon = L.divIcon({
      className: 'google-style-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: 32px;
            height: 32px;
            background: #ef4444;
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
          "></div>
          <div style="
            position: absolute;
            top: 5px;
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 38],
      popupAnchor: [0, -36]
    });

    const pinMarker = L.marker([lat, lng], { icon: droppedIcon }).addTo(map);
    clickedPinRef.current = pinMarker;

    const popupContent = document.createElement('div');
    popupContent.style.minWidth = '230px';
    popupContent.style.padding = '4px';
    popupContent.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
        <span style="background: rgba(6, 182, 212, 0.2); color: #38bdf8; border: 1px solid rgba(6,182,212,0.4); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: bold;">
          ${place.type?.toUpperCase() || 'REGISTERED BARANGAY'}
        </span>
        <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">📍 ${place.municipalityName}</span>
      </div>
      <div style="font-weight: 700; color: #ffffff; font-size: 14px; margin-bottom: 2px;">
        ${place.name}
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
        ${resolvedAddress} (${lat.toFixed(4)}, ${lng.toFixed(4)})
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="btn-evacuate-search-pin" style="
          width: 100%;
          background: linear-gradient(135deg, #06b6d4, #0284c7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          🧭 Evacuate to Nearest Shelter (OSRM)
        </button>
        <button id="btn-report-search-pin" style="
          width: 100%;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          🚨 Report Emergency Here
        </button>
        <button id="btn-clear-search-pin" style="
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          cursor: pointer;
        ">
          ❌ Clear Landmark Pin
        </button>
      </div>
    `;

    popupContent.querySelector('#btn-report-search-pin').onclick = () => {
      if (onOpenReportWithLocation) {
        onOpenReportWithLocation(lat, lng, resolvedAddress);
      }
    };

    popupContent.querySelector('#btn-clear-search-pin').onclick = () => {
      handleClearPin();
    };

    popupContent.querySelector('#btn-evacuate-search-pin').onclick = () => {
      handleEvacuationRoute(lat, lng, null, null, 'driving');
    };

    pinMarker.bindPopup(popupContent);

    map.flyTo([lat, lng], 16, { duration: 1.25 });
    setTimeout(() => {
      if (clickedPinRef.current === pinMarker) {
        pinMarker.openPopup();
      }
    }, 650);

    if (onMapClick) {
      onMapClick(lat, lng, resolvedAddress);
    }
  };

  // Live Municipality-Scoped Search Engine (Photon + Nominatim OpenStreetMap API)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const results =
        liveSuggestions.length > 0
          ? liveSuggestions
          : await searchLiveMunicipalityPlaces(searchQuery, effectiveMunicipality, shelters);

      if (results && results.length > 0) {
        handleSelectPlace(results[0]);
      } else {
        const scopeName =
          effectiveMunicipality === 'ALL'
            ? 'Lanao del Norte & Iligan City'
            : activeMuniObj.shortName;

        setSearchError(
          `No barangay or landmark matching "${searchQuery}" was found inside ${scopeName}.`
        );
      }
    } catch (err) {
      console.warn('Search error:', err);
      setSearchError('Could not reach live search engine. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // GPS "Locate Me" Button
  const handleLocateMe = () => {
    if (lockedMuniObj) {
      mapInstanceRef.current?.flyTo([lockedMuniObj.lat, lockedMuniObj.lng], lockedMuniObj.zoom || 13, { duration: 1.2 });
      return;
    }
    if (!navigator.geolocation || !mapInstanceRef.current) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setActivePinCoords({ lat: latitude, lng: longitude });
        mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
      },
      () => {
        alert('Could not retrieve your current location.');
      }
    );
  };

  return (
    <div className="map-wrapper glass-panel">
      {/* Live OpenStreetMap / Photon Search Engine Scoped to Selected Municipality */}
      <div className="gmaps-search-container">
        <form onSubmit={handleSearch} className="gmaps-search-bar glass-panel">
          <Search size={16} className="text-cyan" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder={
              effectiveMunicipality !== 'ALL'
                ? `Search in ${activeMuniObj.shortName} (e.g. Poblacion, Butadon)...`
                : 'Search barangay or landmark in Lanao del Norte...'
            }
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError('');
              setShowSuggestions(true);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setLiveSuggestions([]);
                setSearchError('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button type="submit" disabled={isSearching} className="gmaps-search-btn">
            {isSearching ? <Loader2 size={14} className="spin" /> : 'Search'}
          </button>
        </form>

        {/* Live Search Engine Autocomplete Results Dropdown */}
        {showSuggestions && liveSuggestions.length > 0 && (
          <div className="search-suggestions-dropdown glass-panel">
            <div className="search-suggestions-header">
              <span>
                🌐 Live Search in {effectiveMunicipality === 'ALL' ? 'Lanao del Norte & Iligan' : activeMuniObj.shortName}
              </span>
              <span className="search-suggestions-count">{liveSuggestions.length} matches</span>
            </div>
            <div className="search-suggestions-list">
              {liveSuggestions.slice(0, 8).map((place, idx) => (
                <button
                  key={`${place.name}-${place.lat}-${place.lng}-${idx}`}
                  type="button"
                  className="search-suggestion-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectPlace(place);
                  }}
                >
                  <div className="suggestion-main">
                    <MapPin size={13} className="text-cyan" style={{ flexShrink: 0 }} />
                    <span className="suggestion-name">{place.name}</span>
                  </div>
                  <div className="suggestion-meta">
                    <span className="suggestion-muni">{place.municipalityName}</span>
                    <span className="suggestion-type">{place.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scoped Search Validation Message */}
        {searchError && (
          <div className="search-error-toast glass-panel">
            <AlertCircle size={14} className="text-red" style={{ flexShrink: 0 }} />
            <span>{searchError}</span>
            <button
              type="button"
              onClick={() => setSearchError('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: 'auto' }}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Controls on Top-Right */}
      <div className="map-top-actions">
        {/* Clear Dropped Landmark Pin Button */}
        {activePinCoords && (
          <button
            type="button"
            className="gmaps-clear-pin-btn"
            onClick={handleClearPin}
            title="Clear dropped landmark pin from the map"
          >
            <X size={14} />
            <span>Clear Landmark Pin</span>
          </button>
        )}

        {/* Toggle All Evacuation Areas Button */}
        <button
          type="button"
          className={`gmaps-shelters-btn ${showShelters ? 'active' : ''}`}
          onClick={() => setShowShelters(prev => !prev)}
          title="Toggle view of all designated evacuation centers"
        >
          <Shield size={15} />
          <span>
            {showShelters
              ? `🏥 ${lockedMuniObj ? lockedMuniObj.shortName : ''} Shelters (${displayedShelters.length})`
              : '🏥 View Evacuation Centers'}
          </span>
        </button>
      </div>

      {/* Floating GPS / Center on Jurisdiction Button */}
      <button
        type="button"
        className="gmaps-gps-btn"
        onClick={handleLocateMe}
        title={lockedMuniObj ? `Re-center on ${lockedMuniObj.shortName}` : 'Center on my location'}
      >
        <Navigation size={18} />
      </button>

      {/* Interactive Floating Evacuation Navigation HUD Card (API #5 - OSRM) */}
      {activeRoute && (
        <div className="evacuation-nav-hud glass-panel">
          <div className="hud-header">
            <div className="hud-title-left">
              <div className="hud-pulse-dot"></div>
              <div>
                <span className="hud-tag">OSRM SAFE EVACUATION ROUTE</span>
                <h4 className="hud-destination">{activeRoute.shelter?.name}</h4>
              </div>
            </div>
            <button className="hud-close-btn" onClick={handleClearRoute} title="Exit Evacuation Navigation">
              <X size={16} />
            </button>
          </div>

          <div className="hud-metrics-row">
            <div className="hud-metric-box">
              <span className="hud-metric-label">Road Distance</span>
              <span className="hud-metric-val text-cyan">{activeRoute.distance_km} km</span>
            </div>
            <div className="hud-metric-box">
              <span className="hud-metric-label">Estimated Time</span>
              <span className="hud-metric-val text-emerald">{activeRoute.duration_mins} mins</span>
            </div>
            <div className="hud-mode-group">
              <button
                className={`hud-mode-pill ${activeRoute.mode === 'driving' ? 'active' : ''}`}
                onClick={() => handleToggleMode('driving')}
                disabled={isRouting}
              >
                <Car size={13} />
                <span>Drive</span>
              </button>
              <button
                className={`hud-mode-pill ${activeRoute.mode === 'walking' ? 'active' : ''}`}
                onClick={() => handleToggleMode('walking')}
                disabled={isRouting}
              >
                <Footprints size={13} />
                <span>Walk</span>
              </button>
            </div>
          </div>

          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div className="hud-step-bar">
              <span className="text-dim text-xs">Initial Turn:</span>
              <span className="text-xs text-light font-medium">➡️ {activeRoute.steps[0].instruction} ({activeRoute.steps[0].distance_m}m)</span>
            </div>
          )}

          <div className="hud-footer">
            <span className="hud-shelter-info">
              🛡️ {activeRoute.shelter?.type || 'Evacuation Center'} • {activeRoute.shelter?.elevation || 'Flood-Safe'} • Live Cots: {activeRoute.shelter?.current_occupancy ? `${activeRoute.shelter.current_occupancy}/${activeRoute.shelter.total_capacity}` : 'Open'}
            </span>
          </div>
        </div>
      )}

      {/* Loading Spinner for Route Calculation */}
      {isRouting && (
        <div className="routing-spinner-overlay glass-panel">
          <Loader2 size={18} className="spin text-cyan" />
          <span>Calculating safest road path via OSRM Engine...</span>
        </div>
      )}

      {/* Map Container */}
      <div id="disaster-leaflet-map" ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
