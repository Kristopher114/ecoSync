const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabase');
const { analyzeIncidentDescription } = require('./gemini');
const { registerUser, loginUser, purgeUnassignedAdmins } = require('./userAuth');
const { getLiveWeather } = require('./weather');
const { getLiveDisasterNews } = require('./news');
const { dispatchVolunteerAlert, getDispatchLogs } = require('./comms');
const {
  getAllIncidents,
  getIncidentById,
  createIncidentRecord,
  updateIncidentRecord,
  deleteIncidentRecord,
  resetDailyIncidents
} = require('./incidentsStore');
const { EVACUATION_SHELTERS, getNearestEvacuationRoute } = require('./routing');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('EcoLanao Backend is running!');
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'API is working' });
});

// --- AUTHENTICATION ROUTES (Username-based) ---

// 1. Register a new user (Admin requires a specific Municipality / City jurisdiction)
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, role, municipality, municipality_name } = req.body;
  const userIdentifier = username || email;

  const result = await registerUser(userIdentifier, password, role, municipality, municipality_name);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json({
    message: 'User registered successfully!',
    user: result.user
  });
});

// Purge any legacy admin accounts that lack a specific municipality assignment
app.post('/api/auth/purge-unassigned-admins', async (req, res) => {
  try {
    const result = await purgeUnassignedAdmins(req.body?.username || null);
    res.status(200).json({ message: 'Unassigned admin accounts removed.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login an existing user
app.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body;
  const userIdentifier = username || email;

  const result = await loginUser(userIdentifier, password);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.status(200).json({
    message: 'Login successful!',
    user: result.user,
    session: { user: result.user }
  });
});

// --- INCIDENTS CRUD ROUTES (with resilient self-healing storage) ---

// 1. GET ALL INCIDENTS (Supports ?timeframe=today|24h|all and ?date=YYYY-MM-DD for daily map resets)
app.get('/api/incidents', async (req, res) => {
  try {
    const { timeframe, date } = req.query;
    const data = await getAllIncidents({ timeframe, date });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DAILY MAP RESET ENDPOINT (Archives older open incidents to avoid cluttering the live map)
app.post('/api/incidents/reset-daily', async (req, res) => {
  try {
    const result = await resetDailyIncidents();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET SINGLE INCIDENT
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getIncidentById(id);
    if (!data) return res.status(404).json({ error: 'Incident not found' });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. CREATE INCIDENT (with AI auto-categorization support)
app.post('/api/incidents', async (req, res) => {
  try {
    let {
      title,
      description,
      category,
      urgency,
      latitude,
      longitude,
      location_name,
      reporter_email,
      auto_categorize
    } = req.body;

    // If auto_categorize is requested or category/urgency is missing and description exists, let Gemini analyze it!
    if ((auto_categorize || !category || !urgency) && description) {
      try {
        const aiResult = await analyzeIncidentDescription(description);
        category = category || aiResult.category;
        urgency = urgency || aiResult.urgency;
        if (!title && aiResult.title) {
          title = aiResult.title;
        }
      } catch (aiErr) {
        console.warn('AI enrichment skipped:', aiErr.message);
      }
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const createdIncident = await createIncidentRecord({
      title,
      description,
      category: category || 'General',
      urgency: urgency || 'Medium',
      status: 'Open',
      latitude,
      longitude,
      location_name,
      reporter_email
    });

    // API #5: Automatically trigger Volunteer Emergency Dispatch & Email Notification
    let dispatchInfo = null;
    const shouldDispatch = createdIncident && (
      ['Critical', 'High'].includes(createdIncident.urgency) ||
      (createdIncident.reporter_email && createdIncident.reporter_email.includes('@') && !createdIncident.reporter_email.includes('anonymous@'))
    );
    if (shouldDispatch) {
      try {
        dispatchInfo = await dispatchVolunteerAlert(createdIncident);
      } catch (dispErr) {
        console.warn('Dispatch notification non-blocking warning:', dispErr.message);
      }
    }

    res.status(201).json({
      message: 'Incident created successfully',
      incident: createdIncident,
      dispatch: dispatchInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- AI INCIDENT ANALYSIS ROUTE (GEMINI API) ---
app.post('/api/ai/analyze-incident', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description is required for AI analysis' });
    }

    const analysis = await analyzeIncidentDescription(description);
    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LIVE WEATHER RADAR ROUTE (OPEN-METEO / OPENWEATHER API) ---
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 8.1033;
    const lng = parseFloat(req.query.lng) || 124.0673;

    const weatherData = await getLiveWeather(lat, lng);
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LIVE DISASTER NEWS WIRE ROUTE (GNEWS / REAL-TIME NEWS API) ---
app.get('/api/news', async (req, res) => {
  try {
    const newsData = await getLiveDisasterNews();
    res.status(200).json(newsData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EMERGENCY VOLUNTEER ALERT DISPATCH ROUTE (COMMS API) ---
app.get('/api/alerts/logs', (req, res) => {
  try {
    const logs = getDispatchLogs();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/alerts/dispatch', async (req, res) => {
  try {
    const alertResult = await dispatchVolunteerAlert(req.body);
    res.status(200).json(alertResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SAFE EVACUATION ROUTING API (API #5 - OSRM ENGINE) ---
app.get('/api/evacuation-shelters', (req, res) => {
  res.status(200).json(EVACUATION_SHELTERS);
});

app.get('/api/evacuation-route', async (req, res) => {
  try {
    const startLat = parseFloat(req.query.startLat);
    const startLng = parseFloat(req.query.startLng);
    const destLat = req.query.destLat ? parseFloat(req.query.destLat) : null;
    const destLng = req.query.destLng ? parseFloat(req.query.destLng) : null;
    const mode = req.query.mode || 'driving';

    if (isNaN(startLat) || isNaN(startLng)) {
      return res.status(400).json({ error: 'Valid startLat and startLng coordinates are required' });
    }

    const routeData = await getNearestEvacuationRoute(startLat, startLng, destLat, destLng, mode);
    res.status(200).json(routeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. UPDATE INCIDENT
app.put('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedIncident = await updateIncidentRecord(id, updates);
    res.status(200).json({ message: 'Incident updated successfully', incident: updatedIncident });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4.1 VOLUNTEER TO RESPOND TO INCIDENT (For Registered Volunteers / Citizens)
app.post('/api/incidents/:id/volunteer', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required to volunteer' });
    }

    const incident = await getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const currentVolunteers = Array.isArray(incident.volunteers)
      ? [...incident.volunteers]
      : [];

    if (!currentVolunteers.includes(username)) {
      currentVolunteers.push(username);
    }

    const updatedIncident = await updateIncidentRecord(id, {
      volunteers: currentVolunteers,
      volunteer_count: currentVolunteers.length
    });

    res.status(200).json({
      message: `Volunteer @${username} registered as on-site responder!`,
      incident: updatedIncident,
      volunteers: currentVolunteers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE INCIDENT
app.delete('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteIncidentRecord(id);
    res.status(200).json({ message: 'Incident deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
