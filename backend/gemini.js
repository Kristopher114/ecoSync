const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Analyzes an unstructured disaster incident report using Gemini AI.
 * Extracts category, urgency level, concise title, and recommended resources.
 *
 * @param {string} text - Raw disaster/incident description submitted by user.
 * @returns {Promise<Object>} Structured classification object
 */
async function analyzeIncidentDescription(text) {
  if (!text || text.trim() === '') {
    return {
      title: 'Unspecified Incident',
      category: 'General',
      urgency: 'Medium',
      summary: 'No description provided.',
      actionable_needs: []
    };
  }

  // Fallback heuristic if API key is not yet provided or client is unavailable
  if (!aiClient || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    return fallbackAnalysis(text);
  }

  try {
    const prompt = `You are an emergency disaster relief dispatch AI coordinator.
Analyze the following citizen disaster report text and return ONLY a valid JSON object (no markdown code fences, no extra text):

Input Report: "${text}"

Required JSON schema:
{
  "title": "Short descriptive title (4-7 words)",
  "category": "One of: Medical, Flood, Fire, Earthquake, Food & Water, Rescue, Power Outage, Infrastructure, General",
  "urgency": "One of: Low, Medium, High, Critical",
  "summary": "Clear, concise 1-sentence summary",
  "actionable_needs": ["List of specific resources needed like 'First Aid', 'Rubber Boat', 'Evacuation', 'Drinking Water'"]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawResponse = response.text ? response.text.trim() : '';
    // Clean any accidental markdown backticks just in case
    const cleanJson = rawResponse.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    return parsed;
  } catch (error) {
    console.error('Gemini API call failed, falling back to heuristic parser:', error.message);
    return fallbackAnalysis(text);
  }
}

/**
 * Robust fallback parser ensuring 100% uptime even if API quotas/keys are offline.
 */
function fallbackAnalysis(text) {
  const lower = text.toLowerCase();
  let category = 'General';
  let urgency = 'Medium';
  const actionable_needs = [];

  if (lower.includes('blood') || lower.includes('hurt') || lower.includes('injur') || lower.includes('medic') || lower.includes('heart') || lower.includes('doctor')) {
    category = 'Medical';
    urgency = 'Critical';
    actionable_needs.push('Medical Assistance', 'Ambulance');
  } else if (lower.includes('flood') || lower.includes('water') || lower.includes('drown') || lower.includes('river')) {
    category = 'Flood';
    urgency = 'High';
    actionable_needs.push('Rubber Boats', 'Life Vests');
  } else if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn')) {
    category = 'Fire';
    urgency = 'Critical';
    actionable_needs.push('Fire Truck', 'Evacuation');
  } else if (lower.includes('food') || lower.includes('hungry') || lower.includes('starv') || lower.includes('water') || lower.includes('ration')) {
    category = 'Food & Water';
    urgency = 'Medium';
    actionable_needs.push('Food Packs', 'Clean Drinking Water');
  } else if (lower.includes('trap') || lower.includes('stuck') || lower.includes('roof') || lower.includes('rescue')) {
    category = 'Rescue';
    urgency = 'Critical';
    actionable_needs.push('Search & Rescue Team');
  }

  return {
    title: text.length > 40 ? text.substring(0, 37) + '...' : text,
    category,
    urgency,
    summary: text,
    actionable_needs: actionable_needs.length > 0 ? actionable_needs : ['General Community Assistance']
  };
}

module.exports = { analyzeIncidentDescription };
