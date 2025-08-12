// Simplified deployment server for MileTracker Pro
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'api-server')));

console.log('🚀 MileTracker Pro - Deployment Server');
console.log('📋 Phase 1: Basic deployment without external services');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    description: 'MileTracker Pro API - Deployment Mode'
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'index.html'));
});

// Basic API endpoints for testing
app.get('/api/subscription/tiers', (req, res) => {
  res.json({
    available_tiers: ['free', 'basic_premium'],
    deployment_phase: 1,
    message: 'Phase 1 deployment - Basic tiers only'
  });
});

// Basic trip endpoints for mobile app sync
app.get('/api/trips/:deviceId', (req, res) => {
  res.json({
    message: 'Trip sync endpoint ready',
    deviceId: req.params.deviceId,
    phase: 1
  });
});

app.post('/api/trips', (req, res) => {
  res.json({
    message: 'Trip saved successfully',
    status: 'success',
    phase: 1
  });
});

// User management for basic authentication
app.post('/api/auth/register', (req, res) => {
  res.json({
    message: 'Registration endpoint ready',
    phase: 1
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    message: 'Login endpoint ready', 
    phase: 1
  });
});

// Catch all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-server', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MileTracker Pro API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});