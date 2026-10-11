import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, Navigation, AlertCircle, PlusCircle, Loader2 } from 'lucide-react';

const URGENCY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981'
};

export default function DisasterMap({
  incidents,
  selectedCategory,
  onMapClick,
  selectedIncident,
  onSelectIncident,
  onOpenReportWithLocation
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clickedPinRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activePinAddress, setActivePinAddress] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (e.g. Philippines / Southeast Asia region where Delabaya / Manila is)
    const defaultLat = 8.1033;
    const defaultLng = 124.0673;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      fadeAnimation: true,
      zoomAnimation: true
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Official 100% Free OpenStreetMap tile server
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Click handler: acts like Google Maps (drops a pin & shows landmark popup right where clicked)
    map.on('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Remove previous clicked pin if any
      if (clickedPinRef.current) {
        map.removeLayer(clickedPinRef.current);
      }

      // Create a Google-style dropped pin
      const droppedIcon = L.divIcon({
        className: 'google-style-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
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

      // Immediately show "Loading landmark..." popup
      pinMarker.bindPopup(`
        <div style="min-width: 180px; text-align: center; padding: 6px;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">📍 Pinned Location</div>
          <div style="font-weight: 600; color: #38bdf8; font-size: 13px;">Fetching landmark name...</div>
        </div>
      `).openPopup();

      // Reverse geocode via OpenStreetMap Nominatim API
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

      // Update popup with landmark address and Google Maps-style report action button
      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '220px';
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
      `;

      popupContent.querySelector('#btn-report-here').onclick = () => {
        if (onOpenReportWithLocation) {
          onOpenReportWithLocation(lat, lng, resolvedAddress);
        }
      };

      pinMarker.setPopupContent(popupContent);
      pinMarker.openPopup();

      if (onMapClick) {
        onMapClick(lat, lng, resolvedAddress);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers for existing reports
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

      const popupHtml = `
        <div style="padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="background: ${color}25; color: ${color}; border: 1px solid ${color}50; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${inc.urgency || 'Medium'} Urgency
            </span>
            <span style="font-size: 11px; color: #94a3b8;">${inc.status || 'Open'}</span>
          </div>
          <h4 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 15px; font-weight: 700;">${inc.title}</h4>
          <p style="margin: 0 0 8px 0; color: #cbd5e1; font-size: 12px; line-height: 1.4;">${inc.description || 'No description provided'}</p>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            📍 ${inc.location_name || `${Number(inc.latitude).toFixed(4)}, ${Number(inc.longitude).toFixed(4)}`}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
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

  // Google Maps Style Search: Type any city or landmark and fly there
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const results = await res.json();
      if (results && results.length > 0) {
        const first = results[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        mapInstanceRef.current.flyTo([lat, lon], 14, { duration: 1.5 });
      } else {
        alert('Location not found. Try another city or landmark.');
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Google Maps Style GPS "Locate Me" Button
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
      },
      () => {
        alert('Could not retrieve your current location.');
      }
    );
  };

  return (
    <div className="map-wrapper glass-panel">
      {/* Google Maps Style Floating Search Bar */}
      <form onSubmit={handleSearch} className="gmaps-search-bar glass-panel">
        <Search size={16} className="text-dim" />
        <input
          type="text"
          placeholder="Search city, barangay, or landmark (e.g. Delabaya, Manila)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" disabled={isSearching} className="gmaps-search-btn">
          {isSearching ? <Loader2 size={14} className="spin" /> : 'Search'}
        </button>
      </form>

      {/* Floating GPS Locate Button */}
      <button
        type="button"
        className="gmaps-gps-btn"
        onClick={handleLocateMe}
        title="Center on my location"
      >
        <Navigation size={18} />
      </button>

      {/* Map Container */}
      <div id="disaster-leaflet-map" ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map Helper Badge */}
      <div className="map-hint-badge">
        <span>💡 Click anywhere on map to drop a pin & view landmark name</span>
      </div>
    </div>
  );
}
