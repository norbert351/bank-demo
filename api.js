const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'tickets.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Auth via Supabase (persists across devices) ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || 'Jordan A. Whitfield' }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        return res.status(409).json({ error: 'email already registered' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    res.json({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at,
      access_token: data.session.access_token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Tickets via local JSON (simple, works on Render free tier) ──
function loadTickets() {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveTickets(tickets) {
  fs.writeFileSync(DB_PATH, JSON.stringify(tickets, null, 2));
}

app.get('/api/tickets', (req, res) => {
  let tickets = loadTickets();
  if (req.query.user_id) {
    tickets = tickets.filter(t => t.user_id === req.query.user_id);
  }
  tickets.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
  const tickets = loadTickets();
  const ticket = {
    id: crypto.randomUUID(),
    user_id: req.body.user_id || '',
    email: req.body.email || '',
    subject: req.body.subject || '',
    message: req.body.message || '',
    response: null,
    status: 'open',
    created_at: new Date().toISOString()
  };
  tickets.push(ticket);
  saveTickets(tickets);
  res.status(201).json(ticket);
});

app.put('/api/tickets/:id', (req, res) => {
  const tickets = loadTickets();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  if (req.body.response !== undefined) ticket.response = req.body.response;
  if (req.body.status !== undefined) ticket.status = req.body.status;
  saveTickets(tickets);
  res.json(ticket);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
