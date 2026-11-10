import React, { useState, useEffect } from 'react';
import {
  CloudRain, Wind, AlertTriangle, Newspaper, RefreshCw,
  MapPin, Sun, Cloud, Zap, Droplets, ExternalLink, Lock
} from 'lucide-react';
import { LANAO_DEL_NORTE_MUNICIPALITIES, getMunicipalityById } from '../municipalities';
import { API_BASE_URL } from '../config';

export default function WeatherWidget({
  pinnedLocation,
  selectedMunicipality = 'ILIGAN',
  lockedMunicipality = null,
  onSelectMunicipality
}) {
  const effectiveMuni = lockedMunicipality || (selectedMunicipality && selectedMunicipality !== 'ALL' ? selectedMunicipality : 'ILIGAN');

  const [weather, setWeather] = useState(null);
  const [activeMuniId, setActiveMuniId] = useState(effectiveMuni);
  const [usePinnedOverride, setUsePinnedOverride] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Iligan City');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Disaster News Wire state (API #4)
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsSource, setNewsSource] = useState('Live Disaster News Wire Feed');
  const [isNewsLoading, setIsNewsLoading] = useState(true);

  const selectedMuniObj =
    getMunicipalityById(lockedMunicipality || activeMuniId) ||
    LANAO_DEL_NORTE_MUNICIPALITIES.find((m) => m.id === 'ILIGAN') ||
    LANAO_DEL_NORTE_MUNICIPALITIES[0];

  const activeLat =
    usePinnedOverride && pinnedLocation?.lat ? pinnedLocation.lat : selectedMuniObj.lat;
  const activeLng =
    usePinnedOverride && pinnedLocation?.lng ? pinnedLocation.lng : selectedMuniObj.lng;

  // Helper to interpret official WMO Weather Codes in real time
  const interpretWmoCode = (wmoCode) => {
    switch (wmoCode) {
      case 0:
        return { condition: 'Clear Sky', icon: 'sun' };
      case 1:
        return { condition: 'Mainly Clear', icon: 'sun-cloud' };
      case 2:
        return { condition: 'Partly Cloudy', icon: 'cloud' };
      case 3:
        return { condition: 'Overcast Skies', icon: 'cloud' };
      case 45:
      case 48:
        return { condition: 'Dense Fog / Low Visibility', icon: 'fog' };
      case 51:
      case 53:
      case 55:
        return { condition: 'Light to Moderate Drizzle', icon: 'drizzle' };
      case 61:
        return { condition: 'Slight Rain', icon: 'rain' };
      case 63:
        return { condition: 'Moderate Rainfall', icon: 'rain' };
      case 65:
        return { condition: 'Heavy Torrential Rain', icon: 'heavy-rain' };
      case 80:
      case 81:
        return { condition: 'Localized Rain Showers', icon: 'rain' };
      case 82:
        return { condition: 'Violent Cloudburst Showers', icon: 'heavy-rain' };
      case 95:
        return { condition: 'Severe Thunderstorm', icon: 'thunder' };
      case 96:
      case 99:
        return { condition: 'Severe Thunderstorm with Hail', icon: 'thunder' };
      default:
        return { condition: 'Variable Atmospheric Conditions', icon: 'cloud' };
    }
  };

  // Convert compass degrees to cardinal direction (e.g., 180° -> 180° S)
  const formatWindDirection = (degrees) => {
    if (degrees === undefined || degrees === null) return '0°';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const deg = Math.round(degrees);
    const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return `${deg}° (${directions[index]})`;
  };

  // Dynamic PAGASA-aligned meteorological hazard alert evaluation
  const evaluateHazardAlert = (wmoCode, rainMm, windKmh) => {
    if ([95, 96, 99].includes(wmoCode)) {
      return {
        level: 'critical',
        tag: 'RED ALERT',
        message: 'Severe Thunderstorm & Lightning Hazard: Stay indoors, avoid floodwaters and open electrical poles.'
      };
    }
    if (rainMm >= 7.5 || wmoCode === 65 || wmoCode === 82) {
      return {
        level: 'high',
        tag: 'ORANGE WARNING',
        message: 'Torrential Rainfall Advisory: Severe flooding and flash floods threatening low-lying communities.'
      };
    }
    if (rainMm >= 2.5 || wmoCode === 63 || wmoCode === 81) {
      return {
        level: 'medium',
        tag: 'YELLOW ADVISORY',
        message: 'Moderate Rainfall Warning: Flooding possible in flood-prone areas. Monitor water levels.'
      };
    }
    if (windKmh >= 45) {
      return {
        level: 'high',
        tag: 'HIGH WIND WARNING',
        message: `Gale-force winds (${Math.round(windKmh)} km/h) detected. Threat of falling debris and downed trees.`
      };
    }
    return {
      level: 'low',
      tag: 'NORMAL STATUS',
      message: 'Atmospheric conditions stable. Low immediate meteorological disaster risk.'
    };
  };

  // Primary Live Engine: Real-time direct Open-Meteo High-Resolution Satellite & Radar Query
  const fetchOpenMeteoRealTime = async (lat, lng) => {
    const roundLat = Number(lat).toFixed(3);
    const roundLng = Number(lng).toFixed(3);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundLat}&longitude=${roundLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia%2FManila`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo status ${res.status}`);

    const data = await res.json();
    const cur = data.current || {};
    const wCode = cur.weather_code ?? 0;
    const wInfo = interpretWmoCode(wCode);
    const rain = cur.rain !== undefined ? cur.rain : (cur.precipitation ?? 0);
    const wind = cur.wind_speed_10m ?? 0;
    const hazard = evaluateHazardAlert(wCode, rain, wind);

    return {
      source: 'Open-Meteo Real-Time Meteorological API',
      latitude: parseFloat(roundLat),
      longitude: parseFloat(roundLng),
      temperature: `${Math.round(cur.temperature_2m ?? 25)}°C`,
      feels_like: `${Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 25)}°C`,
      condition: wInfo.condition,
      condition_icon: wInfo.icon,
      wind_speed: `${Math.round(wind)} km/h`,
      wind_direction: formatWindDirection(cur.wind_direction_10m),
      humidity: `${Math.round(cur.relative_humidity_2m ?? 80)}%`,
      precipitation: `${rain} mm/h`,
      alert: hazard,
      observed_at: cur.time || new Date().toISOString()
    };
  };

  // Fetch real-time live weather (Open-Meteo Direct Primary, Backend Proxy Secondary)
  const fetchWeather = async (lat, lng, label, showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let weatherData = null;

      // 1. Direct Open-Meteo Satellite Query (Fastest, 100% Real-Time, Works Everywhere)
      try {
        weatherData = await fetchOpenMeteoRealTime(lat, lng);
      } catch (directErr) {
        console.warn('Direct Open-Meteo query failed, checking backend proxy:', directErr.message);
      }

      // 2. Secondary Backend Proxy Fallback (if browser network blocked third-party APIs)
      if (!weatherData) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/weather?lat=${lat}&lng=${lng}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const beData = await res.json();
            if (beData && beData.temperature) {
              weatherData = beData;
            }
          }
        } catch {}
      }

      if (weatherData) {
        setWeather(weatherData);
        if (label) {
          setLocationLabel(label);
        }
      }
    } catch (err) {
      console.warn('Weather fetch warning:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch real-time disaster news wire (API #4: GNews / Google News Disaster RSS Feed)
  const fetchNews = async () => {
    setIsNewsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          setNewsArticles(data.articles);
          if (data.source) setNewsSource(data.source);
          return;
        }
      }
    } catch (err) {
      console.warn('News wire fetch warning:', err.message);
    } finally {
      setIsNewsLoading(false);
    }
  };

  // Sync when top Jurisdiction filter or Admin locked municipality changes in App.jsx
  useEffect(() => {
    if (lockedMunicipality) {
      setUsePinnedOverride(false);
      setActiveMuniId(lockedMunicipality);
    } else if (selectedMunicipality) {
      setUsePinnedOverride(false);
      setActiveMuniId(selectedMunicipality);
    }
  }, [selectedMunicipality, lockedMunicipality]);

  // Re-fetch weather whenever user clicks or drops a pin on the map
  useEffect(() => {
    if (pinnedLocation?.lat && pinnedLocation?.lng) {
      setUsePinnedOverride(true);
      const label =
        pinnedLocation.name ||
        `Pinned: ${Number(pinnedLocation.lat).toFixed(3)}, ${Number(pinnedLocation.lng).toFixed(3)}`;
      fetchWeather(pinnedLocation.lat, pinnedLocation.lng, label, true);
    }
  }, [pinnedLocation?.lat, pinnedLocation?.lng]);

  // Re-fetch weather when activeMuniId changes (and not overridden by a freshly clicked pin)
  useEffect(() => {
    if (!usePinnedOverride && selectedMuniObj) {
      fetchWeather(
        selectedMuniObj.lat,
        selectedMuniObj.lng,
        selectedMuniObj.shortName || selectedMuniObj.name,
        Boolean(weather)
      );
    }
  }, [activeMuniId, lockedMunicipality, usePinnedOverride]);

  // Fetch live disaster news on initial load
  useEffect(() => {
    fetchNews();
  }, []);

  const handleMunicipalityChange = (e) => {
    if (lockedMunicipality) return;
    const newId = e.target.value;
    if (newId === 'PINNED') {
      setUsePinnedOverride(true);
      return;
    }
    setUsePinnedOverride(false);
    setActiveMuniId(newId);
    if (onSelectMunicipality) {
      onSelectMunicipality(newId);
    }
  };

  const handleManualRefresh = () => {
    fetchWeather(activeLat, activeLng, locationLabel, true);
    fetchNews();
  };

  // Helper to pick condition icon
  const renderConditionIcon = (iconType) => {
    switch (iconType) {
      case 'thunder':
        return <Zap size={22} className="text-amber" />;
      case 'rain':
      case 'heavy-rain':
        return <CloudRain size={22} className="text-cyan" />;
      case 'sun':
        return <Sun size={22} className="text-amber" />;
      default:
        return <Cloud size={22} className="text-cyan" />;
    }
  };

  // Helper for alert colors
  const getAlertClasses = (level) => {
    switch (level) {
      case 'critical':
        return 'weather-alert-critical';
      case 'high':
        return 'weather-alert-high';
      case 'medium':
        return 'weather-alert-medium';
      default:
        return 'weather-alert-low';
    }
  };

  return (
    <div className="weather-news-sidebar glass-panel">
      {/* Weather Header */}
      <div className="weather-section">
        <div className="section-title-wrap">
          <div className="weather-title-left">
            <CloudRain className="text-cyan" size={18} />
            <h4>Live Disaster Weather Radar</h4>
          </div>
          <button
            className="weather-refresh-btn"
            onClick={handleManualRefresh}
            title="Refresh Live Weather & News"
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          </button>
        </div>

        {/* Municipality / City Dropdown Selector inside Live Weather Radar */}
        <div className="weather-location-chip weather-dropdown-chip" title={locationLabel}>
          {lockedMunicipality ? <Lock size={13} className="text-cyan" /> : <MapPin size={13} className="text-cyan" />}
          <select
            id="weather-radar-municipality-dropdown"
            className="weather-muni-select"
            value={usePinnedOverride && pinnedLocation?.lat ? 'PINNED' : (lockedMunicipality || activeMuniId)}
            onChange={handleMunicipalityChange}
            disabled={Boolean(lockedMunicipality)}
          >
            {usePinnedOverride && pinnedLocation?.lat && (
              <option value="PINNED">
                📌 Pinned: {locationLabel}
              </option>
            )}
            {lockedMunicipality ? (
              <option value={selectedMuniObj.id}>
                🔒 {selectedMuniObj.name}
              </option>
            ) : (
              LANAO_DEL_NORTE_MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === 'ALL' ? '🌐 All Lanao del Norte (Provincial Radar)' : `📍 ${m.name}`}
                </option>
              ))
            )}
          </select>
          {weather?.cached && <span className="cache-pill">Cached</span>}
        </div>

        {/* Live Weather Metrics */}
        {isLoading && !weather ? (
          <div className="weather-loading-skeleton">
            <div className="skeleton-bar"></div>
            <span className="text-xs text-dim">Contacting Open-Meteo Satellite Feed...</span>
          </div>
        ) : weather ? (
          <>
            <div className="weather-main-info">
              <div className="weather-temp-block">
                <div className="temp-icon-row">
                  {renderConditionIcon(weather.condition_icon)}
                  <span className="weather-temp">{weather.temperature}</span>
                </div>
                <span className="weather-cond">{weather.condition}</span>
                <span className="weather-feels">Feels like {weather.feels_like}</span>
              </div>

              <div className="weather-metrics">
                <span title="Wind Speed and Direction">
                  <Wind size={13} className="text-cyan" /> {weather.wind_speed} ({weather.wind_direction})
                </span>
                <span title="Relative Humidity">
                  <Droplets size={13} className="text-cyan" /> Humidity: {weather.humidity}
                </span>
                <span title="Rainfall Rate">
                  <CloudRain size={13} className="text-cyan" /> Rain: {weather.precipitation}
                </span>
              </div>
            </div>

            {/* Real-time Disaster Hazard Advisory */}
            <div className={`weather-alert-box ${getAlertClasses(weather.alert?.level)}`}>
              <div className="alert-header-row">
                <AlertTriangle size={15} className="alert-icon" />
                <strong>{weather.alert?.tag || 'WEATHER ADVISORY'}</strong>
              </div>
              <p className="alert-message-text">{weather.alert?.message}</p>
            </div>
          </>
        ) : null}

        {/* API 1 Attribution Tag */}
        {/* <div className="weather-api-credit">
          <span className="live-dot-pulse"></span>
          <span>API 1 Active: Open-Meteo Live Radar (100% Free)</span>
        </div> */}
      </div>

      <div className="sidebar-divider" />

      {/* Live Disaster News Wire (API #4) */}
      <div className="news-section">
        <div className="section-title-wrap">
          <div className="weather-title-left">
            <Newspaper className="text-cyan" size={18} />
            <h4>Live Disaster News Wire</h4>
          </div>
          <button
            className="weather-refresh-btn"
            onClick={fetchNews}
            title="Refresh Live News Wire"
            disabled={isNewsLoading}
          >
            <RefreshCw size={13} className={isNewsLoading ? 'spin' : ''} />
          </button>
        </div>

        {isNewsLoading && newsArticles.length === 0 ? (
          <div className="weather-loading-skeleton">
            <div className="skeleton-bar"></div>
            <span className="text-xs text-dim">Syncing live disaster bulletins...</span>
          </div>
        ) : (
          <div className="news-list">
            {newsArticles.map((article) => (
              <div key={article.id} className="news-item">
                <span className="news-bullet"></span>
                <div className="news-content-wrap">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-link-title"
                    title={article.title}
                  >
                    <span>{article.title}</span>
                    <ExternalLink size={11} className="news-ext-icon" />
                  </a>
                  <div className="news-meta-row">
                    <span className="news-source-badge">{article.source}</span>
                    <span className="news-meta-time">• {article.time || 'Recently'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API 4 Attribution Tag */}
        {/* <div className="weather-api-credit" style={{ marginTop: '12px' }}>
          <span className="live-dot-pulse" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
          <span>API 4 Active: {newsSource}</span>
        </div> */}
      </div>
    </div>
  );
}
