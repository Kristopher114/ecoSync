import React, { useState, useEffect } from 'react';
import {
  CloudRain, Wind, AlertTriangle, Newspaper, RefreshCw,
  MapPin, Sun, Cloud, Zap, Droplets, ShieldCheck, CheckCircle2
} from 'lucide-react';

export default function WeatherWidget({ pinnedLocation }) {
  const [weather, setWeather] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Poblacion, Iligan Region');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default coordinate (Iligan / Northern Mindanao region)
  const activeLat = pinnedLocation?.lat || 8.1033;
  const activeLng = pinnedLocation?.lng || 124.0673;

  // Fetch real-time live weather from backend endpoint (Open-Meteo API)
  const fetchWeather = async (lat, lng, label, showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/weather?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
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

  // Re-fetch whenever user clicks or drops a pin on the map
  useEffect(() => {
    const label = pinnedLocation?.name || (pinnedLocation?.lat ? `Pinned: ${Number(pinnedLocation.lat).toFixed(3)}, ${Number(pinnedLocation.lng).toFixed(3)}` : 'Poblacion, Iligan Region');
    fetchWeather(activeLat, activeLng, label);
  }, [pinnedLocation?.lat, pinnedLocation?.lng]);

  const handleManualRefresh = () => {
    fetchWeather(activeLat, activeLng, locationLabel, true);
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
            title="Refresh Live Weather"
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          </button>
        </div>

        {/* Dynamic Location Pin Badge */}
        <div className="weather-location-chip" title={locationLabel}>
          <MapPin size={12} className="text-cyan" />
          <span className="location-name-truncate">{locationLabel}</span>
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

        {/* API Attribution Tag */}
        <div className="weather-api-credit">
          <span className="live-dot-pulse"></span>
          <span>API 1 Active: Open-Meteo Live Radar (100% Free)</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Live Disaster News Wire (API #4 Preview) */}
      <div className="news-section">
        <div className="section-title-wrap">
          <div className="weather-title-left">
            <Newspaper className="text-cyan" size={18} />
            <h4>Live Disaster News Wire</h4>
          </div>
        </div>

        <div className="news-list">
          <div className="news-item">
            <span className="news-bullet"></span>
            <div>
              <p className="news-title">Disaster Relief Operations Deployed to Northern Flood Sector</p>
              <span className="news-meta">Community Dispatch • 12m ago</span>
            </div>
          </div>
          <div className="news-item">
            <span className="news-bullet"></span>
            <div>
              <p className="news-title">Central Evacuation Centers Reach 70% Capacity - Gyms Activated</p>
              <span className="news-meta">Relief Ops • 38m ago</span>
            </div>
          </div>
          <div className="news-item">
            <span className="news-bullet"></span>
            <div>
              <p className="news-title">Dam Water Spillway Caution: Riverbank Settlements Advised</p>
              <span className="news-meta">Hydrology Bureau • 1h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
