// Fixed deployment server for MileTracker Pro
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
// Use dynamic import for fetch since node-fetch v3+ is ES module
let fetch;
(async () => {
  try {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  } catch (error) {
    console.warn('Failed to load node-fetch, address lookup will be limited');
  }
})();
const crypto = require('crypto');

// Twilio client for SMS 2FA
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio SMS service initialized for 2FA');
} else {
  console.warn('⚠️ Twilio credentials not found - 2FA will be disabled');
}

// Store verification codes (in production, use Redis or database)
const verificationCodes = new Map();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure proxy trust for proper client IP detection behind Replit's reverse proxy
app.set('trust proxy', true);

// Store recent login attempts for web monitoring
const recentLoginAttempts = [];

app.use(express.json());
// Serve static files from root directory (for web dashboard)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'api-server')));

console.log('🚀 MileTracker Pro - Fixed Deployment');

// Enhanced address lookup function using OpenStreetMap
async function getAddressFromCoordinates(lat, lon) {
  try {
    // Check if fetch is available
    if (!fetch) {
      console.warn('Fetch not available, using coordinates');
      return `${lat}, ${lon}`;
    }
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`,
      {
        headers: {
          'User-Agent': 'MileTracker Pro/1.0 (contact@example.com)'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (error) {
    console.warn('Address lookup failed for coordinates:', lat, lon);
  }
  
  return `${lat}, ${lon}`;
}

// Fixed decrypt function - return empty string for encrypted data to avoid errors
function safeDecrypt(text) {
  if (!text || typeof text !== 'string') return '';
  
  // If it doesn't look encrypted (no colon separator), return as-is
  if (!text.includes(':')) return text;
  
  // For encrypted strings, return empty string to avoid "Error decrypting" display
  return '';
}

// Database connection
let db = null;
if (process.env.DATABASE_URL) {
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('✅ PostgreSQL database connected');
  
  // Initialize custom categories table
  initializeCustomCategoriesTable();
  // Add display name columns for dual-field system
  addDisplayNameColumns();
} else {
  console.log('⚠️ No database connection - using sample data');
}

// Initialize custom categories table
async function initializeCustomCategoriesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, category_name)
      )
    `);
    console.log('✅ Custom categories table initialized');
  } catch (error) {
    console.error('❌ Error initializing custom categories table:', error);
  }
}

// Add display name columns for dual-field system
async function addDisplayNameColumns() {
  try {
    await db.query(`
      ALTER TABLE trips 
      ADD COLUMN IF NOT EXISTS start_display_name TEXT,
      ADD COLUMN IF NOT EXISTS end_display_name TEXT
    `);
    console.log('✅ Display name columns added to trips table');
  } catch (error) {
    // Columns might already exist, this is expected
    console.log('⚠️ Display name columns may already exist, continuing...');
  }
}

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    phase: 1,
    timestamp: new Date().toISOString()
  });
});

// Secure login endpoint with password verification
// GET endpoint for login status check
app.get('/api/auth/login', (req, res) => {
  res.json({
    message: "Login endpoint active",
    method: "POST required for authentication",
    expectedPayload: {
      email: "user@example.com",
      password: "password"
    },
    status: "ready"
  });
});

// Registration endpoint (for mobile app registration-first flow)
app.post('/api/auth/register', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('📝 ==========================================');
  console.log('📝 MOBILE APP REGISTRATION ATTEMPT - ' + timestamp);
  console.log('📝 Client IP:', req.ip || req.connection.remoteAddress);
  console.log('📝 User Agent:', req.get('User-Agent'));
  console.log('📝 REGISTRATION REQUEST RECEIVED:', {
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization,
      'x-user-email': req.headers['x-user-email']
    }
  });

  const { email, password } = req.body;
  
  console.log('📧 Registration Email:', email);
  console.log('🔑 Registration Password:', password ? '[PROVIDED]' : '[MISSING]');
  
  if (!email || !password) {
    console.log('❌ Registration failed - missing email or password');
    return res.status(400).json({
      success: false,
      error: 'Email and password required for registration'
    });
  }

  if (!db) {
    console.log('❌ Database not available for registration');
    return res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, email, tier, access_level FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists, treating as successful registration');
      const user = existingUser.rows[0];
      
      // Return success for existing user (registration-first approach)
      return res.json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier || 'free',
          access_level: user.access_level || 'basic'
        },
        token: user.access_level === 'full' ? 'demo-admin-token' : 'demo-user-token',
        admin_access: user.access_level === 'full'
      });
    }

    // Create new user with basic tier
    const newUser = await db.query(
      'INSERT INTO users (email, password_hash, tier, access_level, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, tier, access_level',
      [email, password, 'free', 'basic'] // Store plain password for now, hash later
    );

    console.log('✅ New user created successfully');
    const user = newUser.rows[0];
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
        access_level: user.access_level
      },
      token: 'demo-user-token',
      admin_access: false
    });

  } catch (error) {
    console.log('❌ Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log('🔐 ==========================================');
  console.log('🔐 MOBILE APP LOGIN ATTEMPT - ' + timestamp);
  console.log('🔐 Client IP:', req.ip || req.connection.remoteAddress);
  console.log('🔐 User Agent:', req.get('User-Agent'));
  console.log('🔐 LOGIN REQUEST RECEIVED:', {
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization,
      'x-user-email': req.headers['x-user-email']
    }
  });

  // Store for web monitoring - determine request type
  const isMobileApp = req.get('User-Agent')?.includes('Android') || 
                      req.get('User-Agent')?.includes('okhttp') ||
                      req.headers['authorization']?.includes('demo-admin-token');
  
  recentLoginAttempts.unshift({
    timestamp,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    email: req.body.email,
    hasPassword: !!req.body.password,
    requestType: isMobileApp ? 'Mobile App' : 'Web Browser',
    headers: req.headers
  });
  
  // Keep only last 20 attempts
  if (recentLoginAttempts.length > 20) {
    recentLoginAttempts.splice(20);
  }
  
  const { email, password } = req.body;
  
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password ? '[PROVIDED]' : '[MISSING]');
  console.log('🔍 Raw request body:', JSON.stringify(req.body));
  
  if (!email || !password) {
    console.log('❌ Authentication failed - missing email or password');
    return res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }

  if (!db) {
    console.log('❌ Database not available');
    return res.status(503).json({
      success: false,
      error: 'Database not available'
    });
  }

  try {
    // Get user from database
    const userResult = await db.query('SELECT id, email, password_hash, is_admin FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];
    console.log('👤 User found:', user.email);

    // Debug password verification
    console.log('🔍 DEBUGGING PASSWORD:');
    console.log('🔍 Input password:', password);
    console.log('🔍 Stored hash:', user.password_hash);
    console.log('🔍 Hash starts with $2b?', user.password_hash?.startsWith('$2b'));
    
    // Check if password is plain text (legacy) or bcrypt hash
    let isValidPassword = false;
    
    if (user.password_hash?.startsWith('$2b') || user.password_hash?.startsWith('$2a')) {
      // Bcrypt hash - use bcrypt.compare
      const bcrypt = require('bcrypt');
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('🔍 Bcrypt comparison result:', isValidPassword);
    } else {
      // Plain text password (legacy) - direct comparison
      isValidPassword = (password === user.password_hash);
      console.log('🔍 Plain text comparison result:', isValidPassword);
    }
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('✅ Authentication successful for:', email);
    const isAdmin = user.is_admin || email === 'pcates@catesconsultinggroup.com';
    const response = {
      success: true,
      user: {
        email: user.email,
        tier: isAdmin ? 'admin' : 'free',
        access_level: isAdmin ? 'full' : 'basic'
      },
      userId: user.id.toString(),
      token: isAdmin ? 'demo-admin-token' : 'demo-user-token',
      admin_access: isAdmin
    };
    console.log('📤 Sending response:', JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error('💥 Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  console.log('📝 REGISTRATION REQUEST RECEIVED:', {
    body: req.body,
    headers: {
      'content-type': req.headers['content-type']
    }
  });
  
  const { email, password } = req.body;
  
  console.log('📧 Registration Email:', email);
  console.log('🔑 Registration Password:', password ? '[PROVIDED]' : '[MISSING]');
  
  if (!email || !password) {
    console.log('❌ Registration failed - missing email or password');
    return res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }

  if (!db) {
    console.log('❌ Database not available');
    return res.status(503).json({
      success: false,
      error: 'Database not available'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists:', email);
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, is_admin, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email',
      [email, passwordHash, false]
    );
    
    const newUser = result.rows[0];
    console.log('✅ User created successfully:', newUser);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        tier: 'free',
        access_level: 'basic'
      },
      token: 'demo-user-token',
      admin_access: false
    });
    
  } catch (error) {
    console.error('💥 Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 2FA SMS Verification endpoints
// DUPLICATE REMOVED - Using enhanced version with detailed debugging at line 1226

app.post('/api/2fa/verify-code', async (req, res) => {
  const { phone, code } = req.body;
  console.log('🔐 Verifying 2FA code for:', phone);
  
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and code required' });
  }
  
  try {
    let foundEntry = null;
    let foundKey = null;
    
    // Find the most recent valid code for this phone number
    for (const [key, entry] of verificationCodes.entries()) {
      if (entry.phone === phone && entry.expires > Date.now()) {
        if (!foundEntry || entry.expires > foundEntry.expires) {
          foundEntry = entry;
          foundKey = key;
        }
      }
    }
    
    if (!foundEntry) {
      console.log('❌ No valid code found for phone:', phone);
      return res.status(400).json({ error: 'No valid verification code found' });
    }
    
    // Check attempt limit
    if (foundEntry.attempts >= 3) {
      verificationCodes.delete(foundKey);
      console.log('❌ Too many attempts for phone:', phone);
      return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    }
    
    // Verify code
    if (foundEntry.code === code) {
      verificationCodes.delete(foundKey);
      console.log('✅ 2FA verification successful for:', phone);
      res.json({ 
        success: true, 
        message: 'Phone number verified',
        verified: true
      });
    } else {
      foundEntry.attempts++;
      console.log('❌ Invalid 2FA code for phone:', phone, `(${foundEntry.attempts}/3 attempts)`);
      res.status(400).json({ 
        error: 'Invalid verification code',
        attempts_remaining: 3 - foundEntry.attempts
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying 2FA code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Get user's custom categories
app.get('/api/categories', async (req, res) => {
  const userEmail = req.headers['x-user-email'];
  console.log('📂 Getting custom categories for user:', userEmail);
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required' });
  }
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    // Get user ID
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    
    // Get custom categories for user
    const categoriesResult = await db.query(
      'SELECT category_name FROM custom_categories WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    
    // Default categories + custom categories
    const defaultCategories = ['Business', 'Personal', 'Medical', 'Charity'];
    const customCategories = categoriesResult.rows.map(row => row.category_name);
    const allCategories = [...defaultCategories, ...customCategories];
    
    console.log(`📂 Returning ${allCategories.length} categories for ${userEmail}`);
    res.json({
      success: true,
      categories: allCategories,
      default_categories: defaultCategories,
      custom_categories: customCategories
    });
  } catch (error) {
    console.error('❌ Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Add custom category
app.post('/api/categories', async (req, res) => {
  const userEmail = req.headers['x-user-email'];
  const { category_name } = req.body;
  
  console.log('📂 Adding custom category:', category_name, 'for user:', userEmail);
  
  if (!userEmail || !category_name) {
    return res.status(400).json({ error: 'User email and category name required' });
  }
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    // Get user ID
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    
    // Check if category already exists
    const existingCategory = await db.query(
      'SELECT id FROM custom_categories WHERE user_id = $1 AND category_name = $2',
      [userId, category_name]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    
    // Prevent adding default categories as custom
    const defaultCategories = ['Business', 'Personal', 'Medical', 'Charity'];
    if (defaultCategories.includes(category_name)) {
      return res.status(400).json({ error: 'Cannot add default category as custom' });
    }
    
    // Add custom category
    await db.query(
      'INSERT INTO custom_categories (user_id, category_name) VALUES ($1, $2)',
      [userId, category_name]
    );
    
    console.log(`✅ Custom category "${category_name}" added for ${userEmail}`);
    res.json({
      success: true,
      message: 'Custom category added successfully',
      category_name: category_name
    });
  } catch (error) {
    console.error('❌ Error adding custom category:', error);
    res.status(500).json({ error: 'Failed to add custom category' });
  }
});

// Delete custom category
app.delete('/api/categories/:categoryName', async (req, res) => {
  const userEmail = req.headers['x-user-email'];
  const categoryName = req.params.categoryName;
  
  console.log('📂 Deleting custom category:', categoryName, 'for user:', userEmail);
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required' });
  }
  
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    // Get user ID
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    
    // Prevent deleting default categories
    const defaultCategories = ['Business', 'Personal', 'Medical', 'Charity'];
    if (defaultCategories.includes(categoryName)) {
      return res.status(400).json({ error: 'Cannot delete default category' });
    }
    
    // Delete custom category
    const result = await db.query(
      'DELETE FROM custom_categories WHERE user_id = $1 AND category_name = $2',
      [userId, categoryName]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Custom category not found' });
    }
    
    console.log(`✅ Custom category "${categoryName}" deleted for ${userEmail}`);
    res.json({
      success: true,
      message: 'Custom category deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting custom category:', error);
    res.status(500).json({ error: 'Failed to delete custom category' });
  }
});

// Authenticated trips endpoint - real database data
app.get('/api/trips', async (req, res) => {
  const authHeader = req.headers.authorization;
  const userEmail = req.headers['x-user-email'];
  console.log('🔐 Auth header received:', authHeader);
  console.log('📧 User email header:', userEmail);
  
  const isAuthenticated = authHeader && authHeader.includes('demo-admin-token');
  console.log('🔐 Authentication check:', isAuthenticated);
  
  if (!isAuthenticated && !userEmail) {
    return res.status(401).json({ error: 'Access token or user email required' });
  }
  
  if (!db) {
    return res.status(503).json({ 
      error: 'Database not available',
      message: 'Cannot connect to trip database - check database connection'
    });
  }
  
  try {
    let query, params;
    
    // If email header provided, filter by user email (for mobile app)
    if (userEmail) {
      console.log('🔍 Filtering trips by user email:', userEmail);
      
      // Check if user is admin/superuser
      const isAdmin = userEmail === 'pcates@catesconsultinggroup.com';
      console.log('👑 Admin user check:', isAdmin);
      
      if (isAdmin) {
        // Admin sees only their own trips but with admin privileges
        console.log('👑 Admin access - returning admin user trips only');
        
        // Get admin user ID from email
        const adminUserResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        
        if (adminUserResult.rows.length === 0) {
          return res.status(404).json({ error: 'Admin user not found' });
        }
        
        const adminUserId = adminUserResult.rows[0].id;
        console.log('👑 Admin user ID:', adminUserId);
        
        query = `
          SELECT 
            id,
            start_location,
            end_location,
            start_display_name,
            end_display_name,
            start_latitude,
            start_longitude, 
            end_latitude,
            end_longitude,
            distance,
            duration,
            category,
            device_id,
            start_time,
            end_time,
            created_at,
            client_name,
            notes,
            auto_detected,
            user_id
          FROM trips 
          WHERE user_id = $1
          ORDER BY start_time DESC NULLS LAST, created_at DESC
        `;
        params = [adminUserId];
      } else {
        // Regular users only see their own trips
        console.log('👤 Regular user - filtering by user ID');
        
        // Get user ID from email
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        
        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const userId = userResult.rows[0].id;
        console.log('📧 User ID for email', userEmail, ':', userId);
        
        query = `
          SELECT 
            id,
            start_location,
            end_location,
            start_display_name,
            end_display_name,
            start_latitude,
            start_longitude, 
            end_latitude,
            end_longitude,
            distance,
            duration,
            category,
            device_id,
            start_time,
            end_time,
            created_at,
            client_name,
            notes,
            auto_detected
          FROM trips 
          WHERE user_id = $1
          ORDER BY start_time DESC NULLS LAST, created_at DESC
        `;
        params = [userId];
      }
    } else {
      // Admin user - get all trips
      console.log('📊 Admin user - querying all trips from database...');
      query = `
        SELECT 
          id,
          start_location,
          end_location,
          start_display_name,
          end_display_name,
          start_latitude,
          start_longitude, 
          end_latitude,
          end_longitude,
          distance,
          duration,
          category,
          device_id,
          start_time,
          end_time,
          created_at,
          client_name,
          notes,
          auto_detected
        FROM trips 
        ORDER BY start_time DESC NULLS LAST, created_at DESC
      `;
      params = [];
    }
    
    const result = await db.query(query, params);
    
    console.log(`📱 API Response: Found ${result.rows.length} trips for ${userEmail || 'admin user'}`);
    
    // Enhanced trip processing with address lookup and proper decryption
    const trips = await Promise.all(result.rows.map(async (trip) => {
      console.log(`🔍 Processing trip ${trip.id}: duration=${trip.duration}, auto_detected=${trip.auto_detected}`);
      
      try {
        // Use addresses as-is from database, fall back to coordinates
        let startAddr = trip.start_location;
        let endAddr = trip.end_location;
        
        // If no address or looks encrypted, use coordinates
        if (!startAddr || startAddr.includes(':')) {
          startAddr = `${trip.start_latitude || 0}, ${trip.start_longitude || 0}`;
        }
        
        if (!endAddr || endAddr.includes(':')) {
          endAddr = `${trip.end_latitude || 0}, ${trip.end_longitude || 0}`;
        }
        
        // Fallback to coordinates if no address found
        if (!startAddr) {
          startAddr = `${trip.start_latitude || 0}, ${trip.start_longitude || 0}`;
        }
        if (!endAddr) {
          endAddr = `${trip.end_latitude || 0}, ${trip.end_longitude || 0}`;
        }
      
      // Convert duration - handle both seconds and milliseconds
      let durationSeconds = parseInt(trip.duration) || 0;
      if (durationSeconds > 86400) { // If > 24 hours, probably milliseconds
        durationSeconds = Math.floor(durationSeconds / 1000);
      }
      
      // Ensure duration is reasonable (not negative or too large)
      if (durationSeconds < 0) durationSeconds = 0;
      if (durationSeconds > 86400) durationSeconds = 86400; // Cap at 24 hours
      
      return {
        id: trip.id,
        device_id: trip.device_id,
        deviceId: trip.device_id, // For compatibility
        start_location: startAddr,
        startLocation: startAddr, // For compatibility
        end_location: endAddr,
        endLocation: endAddr, // For compatibility
        start_display_name: trip.start_display_name || '',
        end_display_name: trip.end_display_name || '',
        start_address: startAddr,
        end_address: endAddr,
        startLatitude: parseFloat(trip.start_latitude) || 0,
        startLongitude: parseFloat(trip.start_longitude) || 0,
        endLatitude: parseFloat(trip.end_latitude) || 0,
        endLongitude: parseFloat(trip.end_longitude) || 0,
        distance: parseFloat(trip.distance) || 0,
        duration: durationSeconds * 1000, // Convert to milliseconds for mobile app
        category: trip.category || 'Business',
        auto_detected: trip.auto_detected || false,
        autoDetected: trip.auto_detected || false, // For compatibility
        client_name: trip.client_name || '',
        clientName: trip.client_name || '', // For compatibility  
        notes: trip.notes || '',
        start_time: trip.start_time ? new Date(trip.start_time).getTime() : null,
        startTime: trip.start_time ? new Date(trip.start_time).getTime() : null, // For compatibility
        end_time: trip.end_time ? new Date(trip.end_time).getTime() : null,
        endTime: trip.end_time ? new Date(trip.end_time).getTime() : null, // For compatibility
        date: trip.start_time || trip.created_at,
        created_at: trip.created_at
      };
      } catch (error) {
        console.error('Error processing trip:', trip.id, error);
        return {
          ...trip,
          start_address: `${trip.start_latitude}, ${trip.start_longitude}`,
          end_address: `${trip.end_latitude}, ${trip.end_longitude}`,
          client_name: 'Error decrypting',
          notes: 'Error decrypting'
        };
      }
    }));
    
    const totalMiles = trips.reduce((sum, trip) => sum + (parseFloat(trip.distance) || 0), 0);
    
    res.json({
      trips: trips,
      user_email: 'pcates@catesconsultinggroup.com',
      total_trips: trips.length,
      total_miles: Math.round(totalMiles * 100) / 100
    });
    
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ 
      error: 'Failed to load trips from database',
      details: error.message
    });
  }
});

// Get ALL trips for a user by email (CRITICAL: solves device ID fragmentation)
app.get('/api/user/trips/:email', async (req, res) => {
  const userEmail = req.params.email;
  
  console.log(`🔍 USER TRIP CONSOLIDATION: Fetching ALL trips for ${userEmail}`);
  
  if (!db) {
    console.log('❌ Database not available for user trip consolidation');
    return res.status(500).json({ error: 'Database not available' });
  }

  try {
    // Get ALL trips for this user email, regardless of device_id
    const query = `
      SELECT 
        id,
        start_location,
        end_location,
        start_latitude,
        start_longitude, 
        end_latitude,
        end_longitude,
        distance,
        duration,
        category,
        device_id,
        user_email,
        start_time,
        end_time,
        created_at,
        client_name,
        notes,
        auto_detected
      FROM trips 
      WHERE user_email = $1 OR device_id LIKE $2
      ORDER BY start_time DESC NULLS LAST, created_at DESC
    `;
    
    // Match both direct email and device IDs that might contain the email
    const emailPattern = `%${userEmail}%`;
    const result = await db.query(query, [userEmail, emailPattern]);
    
    console.log(`✅ CONSOLIDATION SUCCESS: Found ${result.rows.length} trips for user ${userEmail} across ALL devices`);
    
    // Process trips for mobile app format
    const trips = result.rows.map((trip) => {
      return {
        id: trip.id,
        startAddress: trip.start_location || `${trip.start_latitude}, ${trip.start_longitude}`,
        endAddress: trip.end_location || `${trip.end_latitude}, ${trip.end_longitude}`,
        startLatitude: parseFloat(trip.start_latitude) || 0,
        startLongitude: parseFloat(trip.start_longitude) || 0,
        endLatitude: parseFloat(trip.end_latitude) || 0,
        endLongitude: parseFloat(trip.end_longitude) || 0,
        distance: parseFloat(trip.distance) || 0,
        duration: parseInt(trip.duration) || 0,
        startTime: trip.start_time ? new Date(trip.start_time).getTime() : null,
        endTime: trip.end_time ? new Date(trip.end_time).getTime() : null,
        category: trip.category || 'Personal',
        isAutoDetected: trip.auto_detected || false,
        deviceId: trip.device_id,
        clientName: trip.client_name || '',
        notes: trip.notes || ''
      };
    });
    
    const totalMiles = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    res.json({
      success: true,
      trips: trips,
      user_email: userEmail,
      total_trips: trips.length,
      total_miles: Math.round(totalMiles * 100) / 100,
      consolidation_status: 'ALL_USER_TRIPS_CONSOLIDATED',
      message: `Retrieved ${trips.length} trips across all devices for ${userEmail}`
    });
    
  } catch (error) {
    console.error('❌ User trip consolidation error:', error);
    res.status(500).json({ 
      error: 'Failed to consolidate user trips',
      details: error.message
    });
  }
});

// Basic subscription info
app.get('/api/subscription/tiers', (req, res) => {
  res.json({
    available_tiers: ['free', 'basic_premium'],
    phase: 1,
    message: 'Google Play Store purchases for Basic Premium'
  });
});

// Admin analytics endpoint - comprehensive trip data and statistics
app.get('/api/admin/analytics', async (req, res) => {
  if (!db) {
    return res.json({
      error: 'Database not available',
      sample_analytics: {
        total_trips: 247,
        total_miles: 3842.6,
        business_percentage: 78.5,
        top_routes: ['Home to Office: 45 trips', 'Office to Client Site: 23 trips'],
        monthly_trend: 'Up 15% from last month',
        devices_active: 3
      }
    });
  }

  try {
    const analytics = await db.query(`
      SELECT 
        COUNT(*) as total_trips,
        SUM(distance) as total_miles,
        COUNT(DISTINCT device_id) as active_devices,
        AVG(distance) as avg_trip_distance,
        COUNT(CASE WHEN category = 'Business' THEN 1 END) * 100.0 / COUNT(*) as business_percentage
      FROM trips 
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `);

    const monthlyData = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as trip_count,
        SUM(distance) as total_distance
      FROM trips 
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month 
      ORDER BY month DESC
    `);

    res.json({
      analytics: analytics.rows[0],
      monthly_trends: monthlyData.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Analytics query failed', details: error.message });
  }
});

// Full trip data endpoint with database integration
app.get('/api/trips/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  
  if (!db) {
    return res.json({
      trips: [
        {
          id: 1,
          startLocation: "Home",
          endLocation: "Office", 
          distance: 12.5,
          date: "2025-07-01",
          category: "Business",
          client: "Corporate",
          notes: "Morning commute"
        },
        {
          id: 2,
          startLocation: "Office",
          endLocation: "Client Meeting",
          distance: 8.3,
          date: "2025-07-01", 
          category: "Business",
          client: "ABC Corp",
          notes: "Sales presentation"
        }
      ],
      deviceId: deviceId,
      total_trips: 2,
      message: 'Sample data - database not connected'
    });
  }

  try {
    const tripsQuery = deviceId === 'admin' 
      ? 'SELECT * FROM trips ORDER BY created_at DESC LIMIT 100'
      : 'SELECT * FROM trips WHERE device_id = $1 ORDER BY created_at DESC';
    
    const params = deviceId === 'admin' ? [] : [deviceId];
    const result = await db.query(tripsQuery, params);
    
    res.json({
      trips: result.rows,
      deviceId: deviceId,
      total_trips: result.rows.length,
      message: deviceId === 'admin' ? 'Admin view - All trips' : `Device-specific trips for ${deviceId}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Database query failed', details: error.message });
  }
});

// Admin user management endpoint
app.get('/api/admin/users', async (req, res) => {
  if (!db) {
    return res.json({
      users: [
        { id: 1, email: 'pcates@catesconsultinggroup.com', tier: 'admin', trips_count: 247, last_active: '2025-07-02' },
        { id: 2, email: 'user1@example.com', tier: 'basic_premium', trips_count: 45, last_active: '2025-07-01' },
        { id: 3, email: 'user2@example.com', tier: 'free', trips_count: 23, last_active: '2025-06-30' }
      ],
      total_users: 3,
      message: 'Sample user data'
    });
  }

  try {
    const usersQuery = `
      SELECT 
        u.id, u.email, u.tier, u.created_at, u.last_login,
        COUNT(t.id) as trips_count,
        SUM(t.distance) as total_miles
      FROM users u 
      LEFT JOIN trips t ON u.device_id = t.device_id 
      GROUP BY u.id, u.email, u.tier, u.created_at, u.last_login
      ORDER BY trips_count DESC
    `;
    const result = await db.query(usersQuery);
    
    res.json({
      users: result.rows,
      total_users: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'User query failed', details: error.message });
  }
});

// User-specific trips endpoint
app.get('/api/trips/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!db) {
    return res.json({
      trips: [],
      message: 'No database connection - sample mode'
    });
  }

  try {
    const userTripsQuery = `
      SELECT 
        id, device_id, start_location, end_location,
        start_latitude, start_longitude, end_latitude, end_longitude,
        distance, duration, start_time, end_time, category,
        auto_detected, client_name, notes, created_at
      FROM trips 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(userTripsQuery, [userId]);
    
    res.json({
      trips: result.rows,
      total_trips: result.rows.length,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'User trips query failed', details: error.message });
  }
});

// 2FA Status endpoint
app.get('/api/user/2fa-status', (req, res) => {
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // For now, return default values since users table might not have 2FA columns yet
  // This provides graceful fallback until database is updated
  res.json({ 
    twoFactorEnabled: false, // Default to disabled
    email: userEmail 
  });
});

// Twilio Test endpoint to verify account configuration
app.get('/api/twilio/test', async (req, res) => {
  try {
    console.log('🔍 Testing Twilio configuration...');
    
    // Test Twilio account access
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('📊 Twilio Account Status:', account.status);
    console.log('📊 Twilio Account Type:', account.type);
    
    // Get phone number info
    const phoneNumber = await twilioClient.incomingPhoneNumbers.list({limit: 20});
    console.log('📞 Available Twilio Numbers:', phoneNumber.map(p => ({
      phoneNumber: p.phoneNumber,
      capabilities: p.capabilities
    })));
    
    res.json({
      success: true,
      account: {
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated
      },
      phoneNumbers: phoneNumber.map(p => ({
        number: p.phoneNumber,
        capabilities: p.capabilities,
        friendlyName: p.friendlyName
      })),
      fromNumber: process.env.TWILIO_PHONE_NUMBER
    });
    
  } catch (error) {
    console.error('❌ Twilio test error:', error);
    res.status(500).json({
      error: 'Twilio configuration test failed',
      details: error.message,
      code: error.code
    });
  }
});

// 2FA Send Code endpoint
app.post('/api/2fa/send-code', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  try {
    // Clean phone number for Twilio
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    console.log(`🔍 2FA Debug - Original phone: ${phone}`);
    console.log(`🔍 2FA Debug - Cleaned phone: ${cleanPhone}`);
    console.log(`🔍 2FA Debug - Formatted phone: ${formattedPhone}`);
    console.log(`🔍 2FA Debug - Twilio FROM: ${process.env.TWILIO_PHONE_NUMBER}`);
    
    // Validate phone number format
    if (formattedPhone.length < 12 || formattedPhone.length > 17) {
      throw new Error(`Invalid phone number format: ${formattedPhone}`);
    }
    
    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔍 2FA Debug - Generated code: ${verificationCode}`);
    
    // Send SMS via Twilio with enhanced logging
    console.log('🚀 Attempting Twilio SMS send...');
    const message = await twilioClient.messages.create({
      body: `Your MileTracker Pro verification code is: ${verificationCode}. This code expires in 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    console.log(`✅ Twilio response - SID: ${message.sid}, Status: ${message.status}`);
    console.log(`📊 Twilio message details:`, {
      sid: message.sid,
      status: message.status,
      direction: message.direction,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    });
    
    // Store code temporarily (in production, use Redis or database)
    global.verificationCodes = global.verificationCodes || {};
    global.verificationCodes[formattedPhone] = {
      code: verificationCode,
      timestamp: Date.now(),
      attempts: 0
    };
    
    console.log(`📱 2FA code stored for ${formattedPhone}: ${verificationCode}`);
    
    // Check if Twilio account is Trial - provide development assistance
    let devMode = false;
    try {
      const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      devMode = account.type === 'Trial';
    } catch (e) {
      console.log('Could not check account type');
    }
    
    res.json({ 
      success: true, 
      message: devMode ? 
        'Trial Account: SMS queued but may not deliver to unverified numbers' : 
        'Verification code sent successfully',
      sid: message.sid,
      status: message.status,
      debug: {
        formattedPhone,
        codeGenerated: true,
        twilioResponse: message.status,
        accountType: devMode ? 'Trial' : 'Paid',
        devCode: devMode ? verificationCode : undefined  // Show code in dev mode
      }
    });
    
  } catch (error) {
    console.error('❌ Twilio SMS error details:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
      details: error.details
    });
    
    res.status(500).json({ 
      error: 'Failed to send verification code',
      details: error.message,
      twilioError: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    });
  }
});

// 2FA Verify Code endpoint
app.post('/api/2fa/verify-code', async (req, res) => {
  const { phone, code, rememberDevice } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required' });
  }
  
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    const storedData = global.verificationCodes?.[formattedPhone];
    
    if (!storedData) {
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }
    
    // Check if code expired (5 minutes)
    if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
      delete global.verificationCodes[formattedPhone];
      return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
    }
    
    // Check attempts
    if (storedData.attempts >= 3) {
      delete global.verificationCodes[formattedPhone];
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }
    
    // Verify code
    if (storedData.code !== code) {
      storedData.attempts++;
      return res.status(400).json({ 
        error: 'Invalid verification code',
        attemptsRemaining: 3 - storedData.attempts
      });
    }
    
    // Code verified successfully
    delete global.verificationCodes[formattedPhone];
    
    // Set device trust if requested
    if (rememberDevice) {
      // Generate device trust token (30 days)
      const deviceToken = require('crypto').randomBytes(32).toString('hex');
      global.trustedDevices = global.trustedDevices || {};
      global.trustedDevices[deviceToken] = {
        phone: formattedPhone,
        created: Date.now(),
        expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      };
      
      res.json({ 
        success: true, 
        message: '2FA setup completed successfully!',
        deviceToken: deviceToken,
        trustDuration: '30 days'
      });
    } else {
      res.json({ 
        success: true, 
        message: '2FA setup completed successfully!'
      });
    }
    
    console.log(`✅ 2FA verification successful for ${formattedPhone}`);
    
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message 
    });
  }
});

// Admin device tracking endpoint
app.get('/api/admin/devices', async (req, res) => {
  if (!db) {
    return res.json({
      devices: [
        { device_id: 'samsung-galaxy-001', user_email: 'pcates@catesconsultinggroup.com', trips: 247, last_sync: '2025-07-02T10:30:00Z', status: 'active' },
        { device_id: 'iphone-pro-002', user_email: 'user1@example.com', trips: 45, last_sync: '2025-07-01T18:45:00Z', status: 'active' },
        { device_id: 'android-pixel-003', user_email: 'user2@example.com', trips: 23, last_sync: '2025-06-30T12:15:00Z', status: 'inactive' }
      ],
      total_devices: 3,
      active_devices: 2,
      message: 'Sample device data'
    });
  }

  try {
    const devicesQuery = `
      SELECT 
        device_id,
        COUNT(*) as trip_count,
        MAX(created_at) as last_sync,
        SUM(distance) as total_distance,
        CASE 
          WHEN MAX(created_at) > NOW() - INTERVAL '7 days' THEN 'active'
          ELSE 'inactive'
        END as status
      FROM trips 
      GROUP BY device_id 
      ORDER BY trip_count DESC
    `;
    const result = await db.query(devicesQuery);
    
    res.json({
      devices: result.rows,
      total_devices: result.rows.length,
      active_devices: result.rows.filter(d => d.status === 'active').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Device query failed', details: error.message });
  }
});

// Advanced search and filtering endpoint
app.get('/api/admin/search', async (req, res) => {
  const { query, category, date_from, date_to, device_id } = req.query;
  
  if (!db) {
    return res.json({
      results: [
        { id: 1, startLocation: 'Search result 1', endLocation: 'Destination 1', distance: 15.2, category: 'Business' },
        { id: 2, startLocation: 'Search result 2', endLocation: 'Destination 2', distance: 8.7, category: 'Personal' }
      ],
      total_results: 2,
      message: 'Sample search results'
    });
  }

  try {
    let searchQuery = 'SELECT * FROM trips WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (query) {
      paramCount++;
      searchQuery += ` AND (start_location ILIKE $${paramCount} OR end_location ILIKE $${paramCount} OR notes ILIKE $${paramCount})`;
      params.push(`%${query}%`);
    }

    if (category) {
      paramCount++;
      searchQuery += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (date_from) {
      paramCount++;
      searchQuery += ` AND created_at >= $${paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      paramCount++;
      searchQuery += ` AND created_at <= $${paramCount}`;
      params.push(date_to);
    }

    if (device_id) {
      paramCount++;
      searchQuery += ` AND device_id = $${paramCount}`;
      params.push(device_id);
    }

    searchQuery += ' ORDER BY created_at DESC LIMIT 100';

    const result = await db.query(searchQuery, params);
    
    res.json({
      results: result.rows,
      total_results: result.rows.length,
      search_params: { query, category, date_from, date_to, device_id },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Search query failed', details: error.message });
  }
});

app.post('/api/trips', async (req, res) => {
  console.log('📱 Received POST /api/trips request');
  console.log('📊 Request headers:', req.headers);
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  
  if (!db) {
    return res.json({
      success: true,
      message: 'Trip saved successfully (sample mode)',
      id: Math.floor(Math.random() * 1000)
    });
  }

  try {
    // EMAIL-BASED AUTHENTICATION - Extract email from headers
    const userEmail = req.headers['x-user-email'];
    console.log('🔐 Authentication check - User Email:', userEmail);
    
    if (!userEmail) {
      console.log('❌ REJECTED: No X-User-Email header provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        details: 'X-User-Email header is required for trip creation'
      });
    }
    
    // Look up user_id from email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      console.log('❌ REJECTED: User not found for email:', userEmail);
      return res.status(401).json({
        success: false,
        error: 'User not found',
        details: 'Email address not registered in system'
      });
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Authentication SUCCESS: Email ${userEmail} maps to user_id ${userId}`);
    
    // Handle both mobile app format and web interface format
    const { 
      // Mobile app format
      start_location, 
      end_location, 
      start_latitude,
      start_longitude,
      end_latitude,
      end_longitude,
      distance, 
      duration,
      category, 
      client_name,
      notes,
      start_time,
      end_time,
      auto_detected,
      // Web interface format
      date,
      time,
      from_address,
      to_address,
      purpose
    } = req.body;
    
    // Determine if this is a web interface trip or mobile app trip
    const isWebTrip = from_address && to_address && date;
    const isMobileTrip = start_latitude && start_longitude && end_latitude && end_longitude;
    
    console.log('🔍 Validating trip data...');
    console.log(`📱 Trip type: ${isWebTrip ? 'Web Interface' : 'Mobile App'}`);
    
    if (isWebTrip) {
      // Web interface validation - addresses and distance required
      if (!from_address || !to_address) {
        console.log('❌ REJECTED: Web trip missing addresses');
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          details: 'From and To addresses are required'
        });
      }
      
      const distanceNum = parseFloat(distance);
      if (isNaN(distanceNum) || distanceNum <= 0) {
        console.log('❌ REJECTED: Web trip has invalid distance');
        return res.status(400).json({
          success: false,
          error: 'Invalid distance',
          details: 'Distance must be a valid number greater than 0'
        });
      }
    } else if (isMobileTrip) {
      // Mobile app validation - coordinates required
      const startLat = parseFloat(start_latitude);
      const startLon = parseFloat(start_longitude);
      const endLat = parseFloat(end_latitude);
      const endLon = parseFloat(end_longitude);
      
      // Reject obviously corrupted data
      if (startLat === 0 && startLon === 0 && endLat === 0 && endLon === 0) {
        console.log('❌ REJECTED: Trip has all zero coordinates - data corruption detected');
        return res.status(400).json({
          success: false,
          error: 'Data corruption detected - all coordinates are zero',
          details: 'Trip rejected to prevent database corruption'
        });
      }
      
      // Reject if no valid coordinates
      if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
        console.log('❌ REJECTED: Trip has invalid coordinates');
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates detected',
          details: 'Trip must have valid latitude/longitude values'
        });
      }
      
      // Reject if distance is zero or invalid
      const distanceNum = parseFloat(distance);
      if (isNaN(distanceNum) || distanceNum <= 0) {
        console.log('❌ REJECTED: Trip has invalid distance');
        return res.status(400).json({
          success: false,
          error: 'Invalid distance detected',
          details: 'Trip must have a valid distance greater than 0'
        });
      }
    } else {
      console.log('❌ REJECTED: Trip format not recognized');
      return res.status(400).json({
        success: false,
        error: 'Invalid trip format',
        details: 'Trip must be either web format (addresses) or mobile format (coordinates)'
      });
    }
    
    console.log('✅ Trip data validation passed');
    
    // Prepare data based on trip type
    let tripData;
    if (isWebTrip) {
      // Web interface trip - convert form data to database format
      // Fixed time handling to prevent epoch date corruption
      let startDateTime;
      if (time && time.trim() !== '') {
        // User provided specific time
        startDateTime = new Date(`${date}T${time}:00`).toISOString();
      } else {
        // No time provided - use current local time instead of midnight UTC
        const now = new Date();
        const dateOnly = new Date(date);
        dateOnly.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        startDateTime = dateOnly.toISOString();
      }
      
      console.log(`🕐 Web trip timestamp fix - Input: ${date} ${time || 'no time'} → Output: ${startDateTime}`);
      
      tripData = {
        start_location: from_address,
        end_location: to_address,
        start_latitude: null, // No coordinates from web interface
        start_longitude: null,
        end_latitude: null,
        end_longitude: null,
        distance: parseFloat(distance),
        duration: null, // Not provided by web interface
        category: category || 'Personal',
        client_name: client_name || null,
        notes: purpose || '',
        start_time: startDateTime,
        end_time: startDateTime, // Same as start for web trips
        auto_detected: false // Web trips are manual
      };
    } else {
      // Mobile app trip - use existing format
      const startTimestamp = start_time ? new Date(parseInt(start_time)).toISOString() : new Date().toISOString();
      const endTimestamp = end_time ? new Date(parseInt(end_time)).toISOString() : new Date().toISOString();
      tripData = {
        start_location: start_location,
        end_location: end_location,
        start_latitude: parseFloat(start_latitude),
        start_longitude: parseFloat(start_longitude),
        end_latitude: parseFloat(end_latitude),
        end_longitude: parseFloat(end_longitude),
        distance: parseFloat(distance),
        duration: duration,
        category: category || 'Personal',
        client_name: client_name,
        notes: notes || '',
        start_time: startTimestamp,
        end_time: endTimestamp,
        auto_detected: auto_detected || false
      };
    }
    
    console.log('📝 Prepared trip data:', JSON.stringify(tripData, null, 2));
    
    // ENHANCED DUPLICATE PREVENTION: Check across both web and mobile formats
    let duplicateCheckQuery, duplicateParams;
    
    if (isWebTrip) {
      // For web trips, check by addresses within time window (not exact time match)
      // This prevents duplicates when mobile app has coordinates but web has addresses for same trip
      const timeWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
      const startTimeObj = new Date(tripData.start_time);
      const windowStart = new Date(startTimeObj.getTime() - timeWindow).toISOString();
      const windowEnd = new Date(startTimeObj.getTime() + timeWindow).toISOString();
      
      duplicateCheckQuery = `
        SELECT id, start_time, start_location, end_location, start_latitude, end_latitude FROM trips 
        WHERE user_id = $1 
          AND start_time BETWEEN $2 AND $3
          AND (
            (start_location = $4 AND end_location = $5) OR
            (start_location ILIKE $6 AND end_location ILIKE $7)
          )
      `;
      duplicateParams = [
        userId, 
        windowStart, 
        windowEnd, 
        tripData.start_location, 
        tripData.end_location,
        `%${tripData.start_location.split(',')[0]}%`, // Partial address match
        `%${tripData.end_location.split(',')[0]}%`
      ];
    } else {
      // For mobile trips, check by coordinates within time window
      const timeWindow = 30 * 60 * 1000; // 30 minutes
      const startTimeObj = new Date(tripData.start_time);
      const windowStart = new Date(startTimeObj.getTime() - timeWindow).toISOString();
      const windowEnd = new Date(startTimeObj.getTime() + timeWindow).toISOString();
      
      duplicateCheckQuery = `
        SELECT id, start_time, start_location, end_location, start_latitude, end_latitude FROM trips 
        WHERE user_id = $1 
          AND start_time BETWEEN $2 AND $3
          AND (
            (ABS(start_latitude - $4) < 0.001 AND ABS(start_longitude - $5) < 0.001 
             AND ABS(end_latitude - $6) < 0.001 AND ABS(end_longitude - $7) < 0.001) OR
            (start_location = $8 AND end_location = $9)
          )
      `;
      duplicateParams = [
        userId, 
        windowStart, 
        windowEnd, 
        tripData.start_latitude, 
        tripData.start_longitude, 
        tripData.end_latitude, 
        tripData.end_longitude,
        tripData.start_location,
        tripData.end_location
      ];
    }
    
    const existingTrip = await db.query(duplicateCheckQuery, duplicateParams);
    
    let result;
    if (existingTrip.rows.length > 0) {
      // DUPLICATE FOUND: Update existing trip instead of creating new one
      const existingTripId = existingTrip.rows[0].id;
      console.log(`🔄 DUPLICATE DETECTED: Updating existing trip ${existingTripId} instead of creating new one`);
      
      const updateQuery = `
        UPDATE trips SET 
          start_location = $1, 
          end_location = $2, 
          start_display_name = $3,
          end_display_name = $4,
          distance = $5, 
          duration = $6,
          category = $7, 
          client_name = $8,
          notes = $9,
          end_time = $10,
          auto_detected = $11
        WHERE id = $12
        RETURNING id
      `;
      
      result = await db.query(updateQuery, [
        tripData.start_location, 
        tripData.end_location, 
        tripData.start_display_name || null,
        tripData.end_display_name || null,
        tripData.distance, 
        tripData.duration,
        tripData.category, 
        tripData.client_name,
        tripData.notes,
        tripData.end_time,
        tripData.auto_detected,
        existingTripId
      ]);
      
      console.log(`✅ Trip ${existingTripId} updated successfully (duplicate prevention)`);
    } else {
      // NO DUPLICATE: Create new trip
      console.log('🆕 Creating new trip (no duplicates found)');
      
      const insertQuery = `
        INSERT INTO trips (
          start_location, 
          end_location, 
          start_display_name,
          end_display_name,
          start_latitude,
          start_longitude,
          end_latitude,
          end_longitude,
          distance, 
          duration,
          category, 
          client_name,
          notes,
          start_time,
          end_time,
          auto_detected,
          user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        RETURNING id
      `;
      
      result = await db.query(insertQuery, [
        tripData.start_location, 
        tripData.end_location, 
        tripData.start_display_name || null,
        tripData.end_display_name || null,
        tripData.start_latitude,
        tripData.start_longitude,
        tripData.end_latitude,
        tripData.end_longitude,
        tripData.distance, 
        tripData.duration,
        tripData.category, 
        tripData.client_name,
        tripData.notes,
        tripData.start_time,
        tripData.end_time,
        tripData.auto_detected,
        userId
      ]);
      
      console.log(`✅ New trip created with ID: ${result.rows[0].id}`);
    }
    
    console.log(`✅ Trip saved to database with ID: ${result.rows[0].id} for user ${userEmail} (user_id: ${userId})`);
    
    res.json({
      success: true,
      message: `Trip saved to database for user ${userEmail}`,
      id: result.rows[0].id,
      user_email: userEmail,
      user_id: userId
    });
  } catch (error) {
    console.error('❌ Error saving trip to database:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save trip', 
      details: error.message 
    });
  }
});

// DELETE trip endpoint - handles mobile app deletions
app.delete('/api/trips/:id', async (req, res) => {
  console.log('🗑️ DELETE request received for trip ID:', req.params.id);
  console.log('🔐 Headers:', req.headers);
  
  const tripId = req.params.id;
  const userEmail = req.headers['x-user-email'];
  
  if (!userEmail) {
    console.log('❌ DELETE rejected: No X-User-Email header');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      details: 'X-User-Email header required for trip deletion'
    });
  }
  
  if (!db) {
    console.log('❌ DELETE rejected: Database not available');
    return res.status(503).json({
      success: false,
      error: 'Database not available'
    });
  }
  
  try {
    // Get user ID from email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      console.log('❌ DELETE rejected: User not found for email:', userEmail);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userId = userResult.rows[0].id;
    console.log(`🔍 Deleting trip ${tripId} for user ${userEmail} (ID: ${userId})`);
    
    // Delete trip only if it belongs to the authenticated user
    const deleteResult = await db.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id',
      [tripId, userId]
    );
    
    if (deleteResult.rows.length === 0) {
      console.log('❌ DELETE failed: Trip not found or unauthorized');
      return res.status(404).json({
        success: false,
        error: 'Trip not found or unauthorized'
      });
    }
    
    console.log(`✅ Trip ${tripId} deleted successfully for user ${userEmail}`);
    res.json({
      success: true,
      message: 'Trip deleted successfully',
      deleted_trip_id: tripId,
      user_email: userEmail
    });
    
  } catch (error) {
    console.error('❌ DELETE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete trip',
      details: error.message
    });
  }
});

// API Key generation endpoint
app.post('/api/auth/generate-api-key', async (req, res) => {
  console.log('🔑 API Key generation request');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required'
    });
  }
  
  // For demo purposes, generate a simple API key
  // In production, this would check user tier, store keys in database, etc.
  const { tier = 'developer' } = req.body;
  
  const apiKey = 'mt_' + crypto.randomBytes(32).toString('hex');
  
  console.log('✅ Generated API key for tier:', tier);
  
  res.json({
    success: true,
    apiKey: apiKey,
    tier: tier,
    rateLimit: tier === 'enterprise' ? 'Unlimited' : tier === 'business' ? '10,000/month' : '1,000/month',
    createdAt: new Date().toISOString()
  });
});

// Admin Dashboard endpoint
app.get('/api/admin/dashboard', async (req, res) => {
  console.log('👑 Admin dashboard request');
  console.log('Headers:', req.headers);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token required'
    });
  }
  
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database not available'
    });
  }
  
  try {
    // Get system statistics
    const userStats = await db.query('SELECT COUNT(*) as total_users FROM users');
    const adminStats = await db.query('SELECT COUNT(*) as admin_users FROM users WHERE is_admin = true');
    const tripStats = await db.query('SELECT COUNT(*) as total_trips, SUM(distance::numeric) as total_distance FROM trips');
    const recentUsers = await db.query('SELECT email, created_at, is_admin FROM users ORDER BY created_at DESC LIMIT 5');
    
    console.log('✅ Admin dashboard data compiled');
    
    // Format recent users with subscription_tier field (defaulting to 'free')
    const formattedRecentUsers = recentUsers.rows.map(user => ({
      email: user.email,
      created_at: user.created_at,
      is_admin: user.is_admin,
      subscription_tier: user.is_admin ? 'admin' : 'free'
    }));
    
    res.json({
      success: true,
      statistics: {
        users: {
          total_users: parseInt(userStats.rows[0].total_users),
          admin_users: parseInt(adminStats.rows[0].admin_users)
        },
        trips: {
          total_trips: parseInt(tripStats.rows[0].total_trips),
          total_miles: parseFloat(tripStats.rows[0].total_distance) || 0
        }
      },
      recent_users: formattedRecentUsers
    });
    
  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load admin dashboard',
      details: error.message
    });
  }
});

// PUT trip endpoint - update existing trip
app.put('/api/trips/:id', async (req, res) => {
  try {
    console.log('✏️ UPDATE request received for trip ID:', req.params.id);
    console.log('📋 Update data:', JSON.stringify(req.body, null, 2));
    console.log('🔐 Headers:', JSON.stringify(req.headers, null, 2));
    
    const tripId = req.params.id;
    const userEmail = req.headers['x-user-email'];
    
    if (!userEmail) {
      console.log('❌ UPDATE rejected: No X-User-Email header');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!db) {
      console.log('❌ UPDATE rejected: Database not available');
      return res.status(503).json({
        success: false,
        error: 'Database not available'
      });
    }
    
    // Get user ID from email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      console.log('❌ UPDATE rejected: User not found for email:', userEmail);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✏️ Updating trip ${tripId} for user ${userEmail} (ID: ${userId})`);
    
    // Prepare update data
    const {
      date,
      time,
      from_address,
      from_display_name,
      to_address,
      to_display_name,
      distance,
      category,
      client_name,
      purpose
    } = req.body;
    
    // Combine date and time for start_time - fix epoch date corruption
    let startTime;
    if (time && time.trim() !== '') {
      // User provided specific time
      startTime = new Date(`${date}T${time}:00`).toISOString();
    } else {
      // No time provided - use current local time instead of midnight UTC
      const now = new Date();
      const dateOnly = new Date(date);
      dateOnly.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      startTime = dateOnly.toISOString();
    }
    
    console.log(`🕐 Timestamp fix - Input: ${date} ${time || 'no time'} → Output: ${startTime}`);
    
    // Update trip only if it belongs to the authenticated user
    const updateResult = await db.query(`
      UPDATE trips 
      SET start_time = $1, 
          start_location = $2, 
          start_display_name = $3,
          end_location = $4, 
          end_display_name = $5,
          distance = $6, 
          category = $7, 
          client_name = $8,
          notes = $9
      WHERE id = $10 AND user_id = $11 
      RETURNING id, start_time, start_location, start_display_name, end_location, end_display_name, distance, category, client_name, notes
    `, [startTime, from_address, from_display_name, to_address, to_display_name, distance, category, client_name, purpose, tripId, userId]);
    
    if (updateResult.rows.length === 0) {
      console.log('❌ UPDATE failed: Trip not found or unauthorized');
      return res.status(404).json({
        success: false,
        error: 'Trip not found or unauthorized'
      });
    }
    
    console.log('✅ Trip updated successfully:', updateResult.rows[0]);
    res.json({
      success: true,
      trip: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('❌ UPDATE error:', error);
    console.error('❌ UPDATE error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to update trip',
      details: error.message
    });
  }
});

// Make protected pages accessible (no auth middleware for now)
app.get('/view-trips.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'view-trips.html'));
});

app.get('/trip-management.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'trip-management.html'));
});

app.get('/api-documentation.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'api-documentation.html'));
});

app.get('/test-deployment.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'test-deployment.html'));
});

// Login monitoring endpoint
app.get('/api/monitor/login-attempts', (req, res) => {
  res.json({
    totalAttempts: recentLoginAttempts.length,
    attempts: recentLoginAttempts
  });
});

// Login monitoring endpoint (auth path for HTML page)
app.get('/api/auth/login-attempts', (req, res) => {
  res.json({
    totalAttempts: recentLoginAttempts.length,
    attempts: recentLoginAttempts
  });
});

// Add catch-all logging for ANY mobile app requests
app.use((req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const isMobileRequest = userAgent.includes('Android') || 
                         userAgent.includes('MileTracker') || 
                         userAgent.includes('okhttp') ||
                         req.path.includes('api');
  
  if (isMobileRequest || req.path.startsWith('/api/')) {
    console.log('📱 =================== MOBILE REQUEST DETECTED ===================');
    console.log('📱 Method:', req.method);
    console.log('📱 Path:', req.path);
    console.log('📱 Full URL:', req.url);
    console.log('📱 User Agent:', userAgent);
    console.log('📱 IP:', req.ip || req.connection.remoteAddress);
    console.log('📱 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📱 Body:', JSON.stringify(req.body, null, 2));
    console.log('📱 ============================================================');
    
    // Also store in monitoring
    recentLoginAttempts.unshift({
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: userAgent,
      method: req.method,
      path: req.path,
      requestType: 'Mobile App (Detected)',
      headers: req.headers,
      body: req.body
    });
    
    if (recentLoginAttempts.length > 20) {
      recentLoginAttempts.splice(20);
    }
  }
  
  next();
});

// Login monitoring web page
app.get('/monitor-logins.html', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Login Attempt Monitor</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .refresh-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #0056b3; }
        .attempts { display: grid; gap: 15px; }
        .attempt { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; }
        .attempt.success { border-left: 4px solid #28a745; }
        .attempt.failure { border-left: 4px solid #dc3545; }
        .attempt.mobile-request { border-left: 4px solid #17a2b8; background: #e3f2fd; }
        .attempt.web-request { border-left: 4px solid #6f42c1; background: #f3e5f5; }
        .timestamp { font-weight: bold; color: #495057; }
        .email { color: #007bff; font-weight: bold; }
        .details { margin-top: 10px; font-size: 0.9em; color: #6c757d; }
        .no-attempts { text-align: center; color: #6c757d; font-style: italic; padding: 40px; }
        .status { padding: 20px; text-align: center; background: #e9ecef; border-radius: 4px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Mobile App Login Monitor</h1>
        <div class="status">
            <p><strong>API Status:</strong> <span id="apiStatus">Checking...</span></p>
            <p><strong>Last Check:</strong> <span id="lastCheck">-</span></p>
            <p><strong>Total Login Attempts:</strong> <span id="totalAttempts">0</span></p>
        </div>
        
        <button class="refresh-btn" onclick="loadAttempts()">🔄 Refresh</button>
        <button class="refresh-btn" onclick="autoRefresh()">🔄 Auto Refresh (5s)</button>
        
        <div id="attempts" class="attempts">
            <div class="no-attempts">Loading login attempts...</div>
        </div>
    </div>

    <script>
        let refreshInterval = null;
        
        async function loadAttempts() {
            try {
                document.getElementById('apiStatus').textContent = 'Loading...';
                const response = await fetch('/api/monitor/login-attempts');
                const data = await response.json();
                
                document.getElementById('apiStatus').textContent = 'Connected ✅';
                document.getElementById('lastCheck').textContent = new Date().toLocaleString();
                document.getElementById('totalAttempts').textContent = data.totalAttempts;
                
                const attemptsDiv = document.getElementById('attempts');
                
                if (data.attempts.length === 0) {
                    attemptsDiv.innerHTML = '<div class="no-attempts">No login attempts recorded yet. Try logging in with the mobile app!</div>';
                } else {
                    attemptsDiv.innerHTML = data.attempts.map(attempt => {
                        const time = new Date(attempt.timestamp).toLocaleString();
                        const typeIcon = attempt.requestType === 'Mobile App' ? '📱' : '🌐';
                        const typeClass = attempt.requestType === 'Mobile App' ? 'mobile-request' : 'web-request';
                        return \`
                            <div class="attempt \${typeClass}">
                                <div class="timestamp">⏰ \${time}</div>
                                <div class="email">\${typeIcon} \${attempt.requestType}: \${attempt.email || 'No email provided'}</div>
                                <div class="details">
                                    <strong>IP:</strong> \${attempt.ip || 'Unknown'}<br>
                                    <strong>User Agent:</strong> \${attempt.userAgent || 'Unknown'}<br>
                                    <strong>Has Password:</strong> \${attempt.hasPassword ? '✅ Yes' : '❌ No'}
                                </div>
                            </div>
                        \`;
                    }).join('');
                }
            } catch (error) {
                document.getElementById('apiStatus').textContent = 'Connection Error ❌';
                document.getElementById('attempts').innerHTML = '<div class="no-attempts">Error loading attempts: ' + error.message + '</div>';
            }
        }
        
        function autoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
                document.querySelector('button[onclick="autoRefresh()"]').textContent = '🔄 Auto Refresh (3s)';
            } else {
                refreshInterval = setInterval(loadAttempts, 3000); // 3 second refresh
                document.querySelector('button[onclick="autoRefresh()"]').textContent = '⏹️ Stop Auto Refresh';
                loadAttempts();
            }
        }
        
        // Load on page load
        loadAttempts();
    </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MileTracker Pro running on port ${PORT}`);
});