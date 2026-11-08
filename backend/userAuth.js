const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('./supabase');

const LOCAL_USERS_FILE = path.join(__dirname, 'local_users.json');

const MUNICIPALITY_NAMES = {
  ILIGAN: 'Iligan City',
  TUBOD: 'Tubod (Capital)',
  KAPATAGAN: 'Kapatagan',
  LALA: 'Lala',
  KAUSWAGAN: 'Kauswagan',
  LINAMON: 'Linamon',
  BACOLOD: 'Bacolod',
  KOLAMBUGAN: 'Kolambugan',
  BALOI: 'Balo-i',
  MAIGO: 'Maigo',
  BAROY: 'Baroy',
  SND: 'Sultan Naga Dimaporo (SND)'
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getDefaultUsers() {
  return [
    {
      id: 2,
      username: 'volunteer',
      password_hash: hashPassword('volunteer123'),
      role: 'user',
      municipality: null,
      municipality_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      username: 'admin_iligan',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      municipality: 'ILIGAN',
      municipality_name: 'Iligan City',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      username: 'admin_kapatagan',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      municipality: 'KAPATAGAN',
      municipality_name: 'Kapatagan',
      created_at: new Date().toISOString()
    }
  ];
}

function saveLocalUsers(users) {
  fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Loads local users and automatically removes any admin account without an assigned municipality.
 */
function getLocalUsers() {
  if (!fs.existsSync(LOCAL_USERS_FILE)) {
    const defaults = getDefaultUsers();
    saveLocalUsers(defaults);
    return defaults;
  }
  try {
    const content = fs.readFileSync(LOCAL_USERS_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return getDefaultUsers();

    // Auto-migrateadmin_iligan if missing municipality, and purge any other admin account without a municipality
    let modified = false;
    const validUsers = [];

    for (const u of parsed) {
      if (u.username === 'admin_kapatagan') {
        if (u.role !== 'admin' || u.municipality !== 'KAPATAGAN') {
          u.role = 'admin';
          u.municipality = 'KAPATAGAN';
          u.municipality_name = 'Kapatagan';
          modified = true;
        }
      }
      if (u.username === 'admin_iligan') {
        if (u.role !== 'admin' || u.municipality !== 'ILIGAN') {
          u.role = 'admin';
          u.municipality = 'ILIGAN';
          u.municipality_name = 'Iligan City';
          modified = true;
        }
      }
      if (u.role === 'admin') {
        if (!u.municipality || u.municipality === 'ALL') {
          // Remove any admin account that has no specific municipality jurisdiction
          modified = true;
          continue;
        }
      }
      validUsers.push(u);
    }

    if (modified) {
      saveLocalUsers(validUsers);
    }
    return validUsers;
  } catch (err) {
    return getDefaultUsers();
  }
}

/**
 * Purges any admin accounts that lack a specific municipality assignment
 */
async function purgeUnassignedAdmins(targetUsername = null) {
  const users = getLocalUsers();
  const filtered = users.filter(u => {
    if (targetUsername && u.username.toLowerCase() === targetUsername.trim().toLowerCase() && u.role === 'admin' && !u.municipality) {
      return false;
    }
    if (u.role === 'admin' && (!u.municipality || u.municipality === 'ALL')) {
      return false;
    }
    return true;
  });
  saveLocalUsers(filtered);
  return { purged: users.length - filtered.length, remaining: filtered.length };
}

/**
 * Register a user by username, password, role, and (for admins) specific municipality.
 */
async function registerUser(username, password, role, municipality = null, municipality_name = null) {
  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser.length < 3) {
    return { error: 'Username must be at least 3 characters' };
  }

  const pwdHash = hashPassword(password);
  const userRole = role === 'admin' ? 'admin' : 'user';

  let assignedMuni = null;
  let assignedMuniName = null;

  if (userRole === 'admin') {
    const cleanMuni = municipality ? String(municipality).trim().toUpperCase() : '';
    if (!cleanMuni || cleanMuni === 'ALL') {
      return { error: 'Admin coordinators must select a specific Municipality / City jurisdiction.' };
    }
    assignedMuni = cleanMuni;
    assignedMuniName = municipality_name || MUNICIPALITY_NAMES[cleanMuni] || cleanMuni;
  }

  // 1. Try Supabase `app_users` table first
  try {
    const { data: existing, error: checkError } = await supabase
      .from('app_users')
      .select('id, role, municipality')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (existing) {
      // If existing account was an admin without a municipality, delete it so user can re-register
      if (existing.role === 'admin' && !existing.municipality) {
        await supabase.from('app_users').delete().eq('id', existing.id);
      } else {
        return { error: 'Username already taken. Please choose another.' };
      }
    }

    if (!checkError || checkError.code !== 'PGRST205') {
      const { data, error } = await supabase
        .from('app_users')
        .insert([
          {
            username: cleanUser,
            password: pwdHash,
            role: userRole,
            municipality: assignedMuni,
            municipality_name: assignedMuniName
          }
        ])
        .select('id, username, role, municipality, municipality_name, created_at')
        .single();

      if (!error && data) {
        return { success: true, user: data };
      }
    }
  } catch (supabaseErr) {
    // Fallback to persistent local storage below
  }

  // 2. Fallback to persistent local storage
  let users = getLocalUsers();
  const existingIdx = users.findIndex(u => u.username.toLowerCase() === cleanUser);
  if (existingIdx !== -1) {
    const existingLocal = users[existingIdx];
    if (existingLocal.role === 'admin' && !existingLocal.municipality) {
      // Remove legacy unassigned admin account
      users.splice(existingIdx, 1);
    } else {
      return { error: 'Username already taken. Please choose another.' };
    }
  }

  const newUser = {
    id: Date.now(),
    username: cleanUser,
    password_hash: pwdHash,
    role: userRole,
    municipality: assignedMuni,
    municipality_name: assignedMuniName,
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  saveLocalUsers(users);

  return {
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      municipality: newUser.municipality,
      municipality_name: newUser.municipality_name,
      created_at: newUser.created_at
    }
  };
}

/**
 * Login a user by username and password.
 */
async function loginUser(username, password) {
  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const cleanUser = username.trim().toLowerCase();
  const pwdHash = hashPassword(password);

  // 1. Try Supabase `app_users` table
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (data && !error) {
      if (data.role === 'admin' && (!data.municipality || data.municipality === 'ALL')) {
        await supabase.from('app_users').delete().eq('id', data.id);
        return { error: 'This admin account had no assigned municipality and was removed. Please register again with a specific municipality.' };
      }
      if (data.password === pwdHash || data.password === password) {
        return {
          success: true,
          user: {
            id: data.id,
            username: data.username,
            role: data.role,
            municipality: data.municipality || null,
            municipality_name: data.municipality_name || MUNICIPALITY_NAMES[data.municipality] || null,
            created_at: data.created_at
          }
        };
      } else {
        return { error: 'Incorrect password. Please try again.' };
      }
    }
  } catch (err) {
    // Ignore and proceed to local fallback
  }

  // 2. Fallback to persistent local storage
  const users = getLocalUsers();
  const matched = users.find(u => u.username.toLowerCase() === cleanUser);
  if (!matched) {
    return { error: 'Username not found. Please register an account first.' };
  }

  if (cleanUser === 'admin_kapatagan') {
    matched.role = 'admin';
    matched.municipality = 'KAPATAGAN';
    matched.municipality_name = 'Kapatagan';
  }
  if (cleanUser === 'admin_iligan') {
    matched.role = 'admin';
    matched.municipality = 'ILIGAN';
    matched.municipality_name = 'Iligan City';
  }

  if (matched.role === 'admin' && (!matched.municipality || matched.municipality === 'ALL')) {
    await purgeUnassignedAdmins(cleanUser);
    return { error: 'This admin account had no assigned municipality and was removed. Please register again with a specific municipality.' };
  }

  if (matched.password_hash === pwdHash || matched.password === password) {
    return {
      success: true,
      user: {
        id: matched.id,
        username: matched.username,
        role: matched.role,
        municipality: matched.municipality || null,
        municipality_name: matched.municipality_name || MUNICIPALITY_NAMES[matched.municipality] || null,
        created_at: matched.created_at
      }
    };
  }

  return { error: 'Incorrect password. Please try again.' };
}

module.exports = { registerUser, loginUser, purgeUnassignedAdmins };
