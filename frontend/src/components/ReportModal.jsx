import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Send, Loader2, CheckCircle2, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function ReportModal({ isOpen, onClose, onSubmitSuccess, clickedCoords }) {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [urgency, setUrgency] = useState('Medium');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(8.1033);
  const [longitude, setLongitude] = useState(124.0673);
  const [actionableNeeds, setActionableNeeds] = useState([]);
  const [reporterEmail, setReporterEmail] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Sync coords & landmark passed from map click
  useEffect(() => {
    if (clickedCoords?.lat && clickedCoords?.lng) {
      setLatitude(clickedCoords.lat);
      setLongitude(clickedCoords.lng);
      if (clickedCoords.address) {
        setLocationName(clickedCoords.address);
      }
    }
  }, [clickedCoords]);

  if (!isOpen) return null;

  // Real-time Gemini AI classification
  const handleAiClassify = async () => {
    if (!description.trim()) {
      alert('Please enter a description of the emergency first.');
      return;
    }

    setIsAiLoading(true);
    setAiSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/analyze-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.category) setCategory(data.category);
      if (data.urgency) setUrgency(data.urgency);
      if (data.actionable_needs) setActionableNeeds(data.actionable_needs);

      setAiSuccessMessage('AI Classified!');
    } catch (err) {
      console.error('AI classification error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() && !description.trim()) {
      alert('Please provide a title or description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Citizen Emergency Report',
          description,
          category,
          urgency,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          location_name: locationName || 'Pinned on Map',
          reporter_email: reporterEmail || 'anonymous@community.org'
        })
      });

      if (!res.ok) throw new Error('Failed to create report');

      const result = await res.json();
      onSubmitSuccess(result.incident, result.dispatch);
      onClose();
    } catch (err) {
      alert('Error creating incident: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card-compact glass-panel">
        {/* Header */}
        <div className="modal-header-compact">
          <div className="modal-title-wrapper">
            <AlertCircle className="text-red" size={18} />
            <h3>Report Community Emergency</h3>
          </div>
          <button id="modal-close-btn" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-compact">
          {/* Row 1: Emergency Description + Inline AI Classify Button */}
          <div className="form-group-compact">
            <div className="form-label-row">
              <label>Emergency Details / What happened? *</label>
              <button
                type="button"
                id="btn-ai-classify"
                className="btn-ai-compact"
                onClick={handleAiClassify}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <>
                    <Loader2 size={12} className="spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>✨ AI Auto-Classify (Gemini)</span>
                  </>
                )}
              </button>
              {aiSuccessMessage && (
                <span className="ai-success-inline">
                  <CheckCircle2 size={12} /> {aiSuccessMessage}
                </span>
              )}
            </div>
            <textarea
              id="report-description-input"
              rows={2}
              placeholder="e.g. Flash flood in Poblacion, 6 families stranded on roof, elderly needs insulin..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Row 2: Title, Category, Urgency */}
          <div className="form-grid-3">
            <div className="form-group-compact flex-2">
              <label>Incident Title</label>
              <input
                id="report-title-input"
                type="text"
                placeholder="Brief title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group-compact">
              <label>Category</label>
              <select
                id="report-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Flood">Flood</option>
                <option value="Medical">Medical</option>
                <option value="Fire">Fire</option>
                <option value="Rescue">Rescue</option>
                <option value="Food & Water">Food & Water</option>
                <option value="Power Outage">Power Outage</option>
                <option value="Earthquake">Earthquake</option>
              </select>
            </div>

            <div className="form-group-compact">
              <label>Urgency</label>
              <select
                id="report-urgency-select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className={`urgency-select-${urgency.toLowerCase()}`}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* AI-Identified Needs Strip (compact tags) */}
          {actionableNeeds.length > 0 && (
            <div className="needs-strip-compact">
              <span className="needs-label">AI Needs:</span>
              {actionableNeeds.map((need, idx) => (
                <span key={idx} className="need-tag-compact">⚡ {need}</span>
              ))}
            </div>
          )}

          {/* Row 3: Location Name, Latitude, Longitude */}
          <div className="form-grid-3">
            <div className="form-group-compact flex-2">
              <label>Location / Landmark (Auto-filled by Map)</label>
              <input
                id="report-location-input"
                type="text"
                placeholder="e.g. Purok 5, Poblacion, Delabaya"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="form-group-compact">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>

            <div className="form-group-compact">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 4: Reporter Email + Action Buttons on same line */}
          <div className="form-bottom-row">
            <div className="form-group-compact flex-1">
              <label>Reporter Email / Contact (Optional)</label>
              <input
                type="email"
                placeholder="volunteer@community.org"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
              />
            </div>

            <div className="modal-actions-compact">
              <button type="button" className="btn-secondary-compact" onClick={onClose}>
                Cancel
              </button>
              <button
                id="submit-incident-btn"
                type="submit"
                className="btn-danger-compact"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Broadcast Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
