const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

const LOCAL_INCIDENTS_FILE = path.join(__dirname, 'local_incidents.json');

const INITIAL_INCIDENTS = [
  {
    id: 1,
    title: 'Flash Flood Rescue Needed',
    description: 'Rising water trapped 6 elderly residents on 2nd floor balcony. Need rubber boat and life vests.',
    category: 'Flood',
    urgency: 'Critical',
    status: 'Open',
    latitude: 8.1050,
    longitude: 124.0690,
    location_name: 'Poblacion Riverside Sector',
    reporter_email: 'volunteer.mark@ecosync.org',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    title: 'Emergency Medical Evacuation',
    description: 'Diabetic patient collapsed due to insulin shortage in evacuation shelter.',
    category: 'Medical',
    urgency: 'High',
    status: 'Open',
    latitude: 8.0980,
    longitude: 124.0620,
    location_name: 'District Community Gymnasium',
    reporter_email: 'nurse.sarah@relief.org',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 3,
    title: 'Electrical Spark / Fire Hazard',
    description: 'Downed power pole sparking near saturated floodwater and residential houses.',
    category: 'Fire',
    urgency: 'Critical',
    status: 'In Progress',
    latitude: 8.1120,
    longitude: 124.0750,
    location_name: 'Corner Provincial Highway',
    reporter_email: 'citizen99@gmail.com',
    created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 4,
    title: 'Clean Drinking Water Shortage',
    description: 'Community deep-well contaminated by flood runoff. 120 families requiring bottled water rations.',
    category: 'Food & Water',
    urgency: 'Medium',
    status: 'Open',
    latitude: 8.0890,
    longitude: 124.0580,
    location_name: 'Barangay Hall Evacuation Center',
    reporter_email: 'coordinator@ecosync.org',
    created_at: new Date(Date.now() - 14400000).toISOString()
  }
];

function getLocalIncidents() {
  if (!fs.existsSync(LOCAL_INCIDENTS_FILE)) {
    try {
      fs.writeFileSync(LOCAL_INCIDENTS_FILE, JSON.stringify(INITIAL_INCIDENTS, null, 2));
      return INITIAL_INCIDENTS;
    } catch (e) {
      return INITIAL_INCIDENTS;
    }
  }
  try {
    const raw = fs.readFileSync(LOCAL_INCIDENTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_INCIDENTS;
  }
}

function saveLocalIncidents(incidents) {
  try {
    fs.writeFileSync(LOCAL_INCIDENTS_FILE, JSON.stringify(incidents, null, 2));
  } catch (err) {
    console.warn('Failed to save local incidents:', err.message);
  }
}

async function getAllIncidents(filter = {}) {
  let all = [];
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      // Sync local cache with Supabase data
      if (data.length > 0) {
        saveLocalIncidents(data);
      }
      all = data;
    } else {
      all = getLocalIncidents();
    }
  } catch (supabaseErr) {
    console.warn('Supabase unavailable (project may be paused), using local storage:', supabaseErr.message);
    all = getLocalIncidents();
  }

  if (filter.timeframe === 'today') {
    const today = new Date();
    return all.filter(inc => {
      if (!inc.created_at) return false;
      const d = new Date(inc.created_at);
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate();
    });
  }

  if (filter.timeframe === '24h') {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return all.filter(inc => {
      if (!inc.created_at) return false;
      return new Date(inc.created_at).getTime() >= cutoff;
    });
  }

  if (filter.date) {
    return all.filter(inc => {
      if (!inc.created_at) return false;
      const d = new Date(inc.created_at);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return ymd === filter.date;
    });
  }

  return all;
}

async function resetDailyIncidents() {
  const local = getLocalIncidents();
  const todayStr = new Date().toISOString().slice(0, 10);
  
  let resetCount = 0;
  const updated = local.map(inc => {
    const incDateStr = inc.created_at ? inc.created_at.slice(0, 10) : '';
    if (incDateStr && incDateStr < todayStr && inc.status === 'Open') {
      resetCount++;
      return { ...inc, status: 'Resolved', updated_at: new Date().toISOString() };
    }
    return inc;
  });

  saveLocalIncidents(updated);
  return {
    success: true,
    resetCount,
    message: `Daily map maintenance complete: ${resetCount} older incident(s) archived.`
  };
}

async function getIncidentById(id) {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (supabaseErr) {
    console.warn('Supabase unavailable, checking local storage:', supabaseErr.message);
  }

  const incidents = getLocalIncidents();
  return incidents.find(i => String(i.id) === String(id)) || null;
}

async function createIncidentRecord(incidentData) {
  const newRecord = {
    title: incidentData.title,
    description: incidentData.description || '',
    category: incidentData.category || 'General',
    urgency: incidentData.urgency || 'Medium',
    status: incidentData.status || 'Open',
    latitude: incidentData.latitude,
    longitude: incidentData.longitude,
    location_name: incidentData.location_name || 'Pinned on Map',
    reporter_name: incidentData.reporter_name || 'Verified Volunteer',
    reporter_email: incidentData.reporter_email || incidentData.reporter_name || 'Verified Volunteer',
    created_at: new Date().toISOString()
  };

  // 1. Try Supabase first
  try {
    const { data, error } = await supabase
      .from('incidents')
      .insert([newRecord])
      .select();

    if (!error && data && data[0]) {
      // Also update local cache
      const local = getLocalIncidents();
      local.unshift(data[0]);
      saveLocalIncidents(local);
      return data[0];
    }
  } catch (supabaseErr) {
    console.warn('Supabase insert failed, saving to local persistent store:', supabaseErr.message);
  }

  // 2. Fallback to local storage (guarantees 100% uptime even if Supabase is paused)
  const local = getLocalIncidents();
  newRecord.id = Date.now();
  local.unshift(newRecord);
  saveLocalIncidents(local);
  return newRecord;
}

async function updateIncidentRecord(id, updates) {
  updates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select();

    if (!error && data && data[0]) {
      const local = getLocalIncidents();
      const idx = local.findIndex(i => String(i.id) === String(id));
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates };
        saveLocalIncidents(local);
      }
      return data[0];
    }
  } catch (supabaseErr) {
    console.warn('Supabase update failed, updating local store:', supabaseErr.message);
  }

  const local = getLocalIncidents();
  const idx = local.findIndex(i => String(i.id) === String(id));
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalIncidents(local);
    return local[idx];
  }
  return { id, ...updates };
}

async function deleteIncidentRecord(id) {
  try {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (!error) {
      const local = getLocalIncidents();
      saveLocalIncidents(local.filter(i => String(i.id) !== String(id)));
      return true;
    }
  } catch (supabaseErr) {
    console.warn('Supabase delete failed, removing from local store:', supabaseErr.message);
  }

  const local = getLocalIncidents();
  saveLocalIncidents(local.filter(i => String(i.id) !== String(id)));
  return true;
}

module.exports = {
  getAllIncidents,
  getIncidentById,
  createIncidentRecord,
  updateIncidentRecord,
  deleteIncidentRecord,
  resetDailyIncidents
};

