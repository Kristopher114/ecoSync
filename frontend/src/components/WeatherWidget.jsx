import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, AlertTriangle, Newspaper, BellRing } from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: '29°C',
    condition: 'Heavy Monsoon Rain',
    wind: '35 km/h NW',
    humidity: '88%',
    alert: 'Orange Rainfall Advisory: Flooding threatening low-lying communities'
  });

  const [news, setNews] = useState([
    { id: 1, title: 'Disaster Relief Teams Deployed to Northern Sector', time: '12m ago', source: 'Community Dispatch' },
    { id: 2, title: 'Evacuation Centers Reached 65% Capacity - Additional Gyms Activated', time: '45m ago', source: 'Relief Ops' },
    { id: 3, title: 'Dam Gate #3 Opened Gradually, Residents Advised to Evacuate Riverbanks', time: '1h ago', source: 'Hydrology Bureau' }
  ]);

  return (
    <div className="weather-news-sidebar glass-panel">
      {/* Weather Alert (API #1 Integration Preview) */}
      <div className="weather-section">
        <div className="section-title-wrap">
          <CloudRain className="text-cyan" size={18} />
          <h4>Disaster Weather Radar</h4>
        </div>

        <div className="weather-main-info">
          <div>
            <span className="weather-temp">{weather.temp}</span>
            <span className="weather-cond">{weather.condition}</span>
          </div>
          <div className="weather-metrics">
            <span><Wind size={13} /> {weather.wind}</span>
            <span>💧 Humidity: {weather.humidity}</span>
          </div>
        </div>

        <div className="weather-alert-box">
          <AlertTriangle size={16} className="text-amber alert-bounce" />
          <span>{weather.alert}</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Live Disaster News Wire (API #4 Integration Preview) */}
      <div className="news-section">
        <div className="section-title-wrap">
          <Newspaper className="text-cyan" size={18} />
          <h4>Live Disaster News Wire</h4>
        </div>

        <div className="news-list">
          {news.map(item => (
            <div key={item.id} className="news-item">
              <span className="news-bullet"></span>
              <div>
                <p className="news-title">{item.title}</p>
                <span className="news-meta">{item.source} • {item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
