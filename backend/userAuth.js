const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('./supabase');

const LOCAL_USERS_FILE = path.join(__dirname, 'local_users.json');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getLocalUsers() {
  if (!fs.existsSync(LOCAL_USERS_FILE)) {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password_hash: hashPassword('admin123'),
        role: 'admin',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        username: 'volunteer',
        password_hash: hashPassword('volunteer123'),
        role: 'user',
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  try {
    const content = fs.readFileSync(LOCAL_USERS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

function saveLocalUsers(users) {
  fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Register a user by username, password, and role.
 */
async function registerUser(username, password, role) {
  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser.length < 3) {
    return { error: 'Username must be at least 3 characters' };
  }

  const pwdHash = hashPassword(password);
  const userRole = role === 'admin' ? 'admin' : 'user';

  // 1. Try Supabase `app_users` table first
  try {
    const { data: existing, error: checkError } = await supabase
      .from('app_users')
      .select('id')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (existing) {
      return { error: 'Username already taken. Please choose another.' };
    }

    if (!checkError || checkError.code !== 'PGRST205') {
      const { data, error } = await supabase
        .from('app_users')
        .insert([
          {
            username: cleanUser,
            password: pwdHash,
            role: userRole
          }
        ])
        .select('id, username, role, created_at')
        .single();

      if (!error && data) {
        return { success: true, user: data };
      }
    }
  } catch (supabaseErr) {
    console.warn('Supabase app_users table unavailable, using local store:', supabaseErr.message);
  }

  // 2. Fallback to persistent local storage
  const users = getLocalUsers();
  if (users.find(u => u.username.toLowerCase() === cleanUser)) {
    return { error: 'Username already taken. Please choose another.' };
  }

  const newUser = {
    id: Date.now(),
    username: cleanUser,
    password_hash: pwdHash,
    role: userRole,
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
      if (data.password === pwdHash || data.password === password) {
        return {
          success: true,
          user: {
            id: data.id,
            username: data.username,
            role: data.role,
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

  if (matched.password_hash === pwdHash || matched.password === password) {
    return {
      success: true,
      user: {
        id: matched.id,
        username: matched.username,
        role: matched.role,
        created_at: matched.created_at
      }
    };
  }

  return { error: 'Incorrect password. Please try again.' };
}

module.exports = { registerUser, loginUser };
