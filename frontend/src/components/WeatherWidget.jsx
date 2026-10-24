import React, { useState, useEffect } from 'react';
import {
  CloudRain, Wind, AlertTriangle, Newspaper, RefreshCw,
  MapPin, Sun, Cloud, Zap, Droplets, ExternalLink, ShieldAlert
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function WeatherWidget({ pinnedLocation }) {
  const [weather, setWeather] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Poblacion, Iligan Region');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Disaster News Wire state (API #4)
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsSource, setNewsSource] = useState('Live Disaster News Wire Feed');
  const [isNewsLoading, setIsNewsLoading] = useState(true);

  // Default coordinate (Iligan / Northern Mindanao region)
  const activeLat = pinnedLocation?.lat || 8.1033;
  const activeLng = pinnedLocation?.lng || 124.0673;

  // Fetch real-time live weather from backend endpoint (Open-Meteo API)
  const fetchWeather = async (lat, lng, label, showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/weather?lat=${lat}&lng=${lng}`);
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

  // Fetch real-time disaster news wire (API #4: GNews / Google News Disaster RSS Feed)
  const fetchNews = async () => {
    setIsNewsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/news`);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          setNewsArticles(data.articles);
          if (data.source) setNewsSource(data.source);
        }
      }
    } catch (err) {
      console.warn('News wire fetch warning:', err.message);
    } finally {
      setIsNewsLoading(false);
    }
  };

  // Re-fetch weather whenever user clicks or drops a pin on the map
  useEffect(() => {
    const label = pinnedLocation?.name || (pinnedLocation?.lat ? `Pinned: ${Number(pinnedLocation.lat).toFixed(3)}, ${Number(pinnedLocation.lng).toFixed(3)}` : 'Poblacion, Iligan Region');
    fetchWeather(activeLat, activeLng, label);
  }, [pinnedLocation?.lat, pinnedLocation?.lng]);

  // Fetch live disaster news on initial load
  useEffect(() => {
    fetchNews();
  }, []);

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

        {/* API 1 Attribution Tag */}
        <div className="weather-api-credit">
          <span className="live-dot-pulse"></span>
          <span>API 1 Active: Open-Meteo Live Radar (100% Free)</span>
        </div>
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
        <div className="weather-api-credit" style={{ marginTop: '12px' }}>
          <span className="live-dot-pulse" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
          <span>API 4 Active: {newsSource}</span>
        </div>
      </div>
    </div>
  );
}
