const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');
const { EVACUATION_SHELTERS } = require('./routing');

const LOCAL_SHELTERS_FILE = path.join(__dirname, 'local_shelters.json');

/**
 * Loads custom shelters stored on local disk
 */
function getLocalCustomShelters() {
  if (!fs.existsSync(LOCAL_SHELTERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(LOCAL_SHELTERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading local_shelters.json:', err.message);
    return [];
  }
}

/**
 * Saves custom shelters to local disk
 */
function saveLocalCustomShelters(shelters) {
  try {
    fs.writeFileSync(LOCAL_SHELTERS_FILE, JSON.stringify(shelters, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error writing local_shelters.json:', err.message);
  }
}

/**
 * Merges built-in shelters with custom shelters (from Supabase or local file)
 */
async function getAllShelters() {
  let customShelters = [];

  // 1. Try querying Supabase public.evacuation_shelters
  try {
    const { data, error } = await supabase
      .from('evacuation_shelters')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      customShelters = data.map(s => ({
        ...s,
        amenities: Array.isArray(s.amenities) ? s.amenities : [],
        is_custom: true
      }));
    } else {
      customShelters = getLocalCustomShelters();
    }
  } catch (err) {
    customShelters = getLocalCustomShelters();
  }

  // Combine built-in shelters with custom shelters (custom shelters at top)
  const existingIds = new Set(customShelters.map(s => s.id));
  const combined = [...customShelters];

  for (const b of EVACUATION_SHELTERS) {
    if (!existingIds.has(b.id)) {
      combined.push({ ...b, is_custom: false });
    }
  }

  return combined;
}

/**
 * Creates a new evacuation shelter record
 */
async function createShelterRecord(shelterData) {
  const {
    name,
    municipality,
    type,
    latitude,
    longitude,
    address,
    total_capacity,
    current_occupancy,
    status,
    elevation,
    amenities,
    contact,
    created_by
  } = shelterData;

  if (!name || !municipality || isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Shelter Name, Municipality, and valid Latitude & Longitude are required.');
  }

  const newId = `SHELTER-CUSTOM-${Date.now().toString(36).toUpperCase()}`;
  const newShelter = {
    id: newId,
    name: name.trim(),
    municipality: municipality.trim(),
    type: type || 'Designated Evacuation Center',
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    address: address ? address.trim() : `${municipality}, Lanao del Norte`,
    total_capacity: parseInt(total_capacity, 10) || 500,
    current_occupancy: parseInt(current_occupancy, 10) || 0,
    status: status || 'Active (Available)',
    elevation: elevation || 'Elevated Safe Ground',
    amenities: Array.isArray(amenities) ? amenities : (amenities ? String(amenities).split(',').map(s => s.trim()) : ['First Aid Station', 'Backup Generator']),
    contact: contact ? contact.trim() : '+63 917 000 0000',
    created_by: created_by || 'Municipal Admin',
    is_custom: true,
    created_at: new Date().toISOString()
  };

  // 1. Try saving to Supabase
  try {
    const { data, error } = await supabase
      .from('evacuation_shelters')
      .insert([newShelter])
      .select()
      .single();

    if (!error && data) {
      // Also update local cache
      const locals = getLocalCustomShelters();
      locals.unshift(newShelter);
      saveLocalCustomShelters(locals);
      return { ...data, is_custom: true };
    }
  } catch (err) {
    console.warn('Supabase insert shelter warning, using local file:', err.message);
  }

  // 2. Local fallback
  const locals = getLocalCustomShelters();
  locals.unshift(newShelter);
  saveLocalCustomShelters(locals);

  return newShelter;
}

/**
 * Deletes a custom evacuation shelter by ID
 */
async function deleteShelterRecord(id) {
  // 1. Try deleting from Supabase
  try {
    await supabase
      .from('evacuation_shelters')
      .delete()
      .eq('id', id);
  } catch (err) {
    // ignore
  }

  // 2. Remove from local file
  const locals = getLocalCustomShelters();
  const filtered = locals.filter(s => s.id !== id);
  saveLocalCustomShelters(filtered);

  return { success: true, deletedId: id };
}

module.exports = {
  getAllShelters,
  createShelterRecord,
  deleteShelterRecord
};

