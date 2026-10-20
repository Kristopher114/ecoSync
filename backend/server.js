const express = require('express');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabase');
const { analyzeIncidentDescription } = require('./gemini');
const { registerUser, loginUser } = require('./userAuth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('EcoSync Backend is running!');
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'API is working' });
});

// --- AUTHENTICATION ROUTES (Username-based) ---

// 1. Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  const userIdentifier = username || email;

  const result = await registerUser(userIdentifier, password, role);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json({
    message: 'User registered successfully!',
    user: result.user
  });
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

// --- INCIDENTS CRUD ROUTES ---

// 1. GET ALL INCIDENTS
app.get('/api/incidents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET SINGLE INCIDENT
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
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

    const { data, error } = await supabase
      .from('incidents')
      .insert([
        {
          title,
          description,
          category: category || 'General',
          urgency: urgency || 'Medium',
          status: 'Open',
          latitude,
          longitude,
          location_name,
          reporter_email
        }
      ])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Incident created successfully', incident: data[0] });
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

// 4. UPDATE INCIDENT
app.put('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date();

    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Incident updated successfully', incident: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE INCIDENT
app.delete('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Incident deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
