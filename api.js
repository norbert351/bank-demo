const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

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

// ── Auth: Register ──
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

// ── Auth: Login ──
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

// ── Tickets ──
app.get('/api/tickets', async (req, res) => {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.user_id) {
      query = query.eq('user_id', req.query.user_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Tickets fetch error:', err);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = {
      user_id: req.body.user_id || '',
      email: req.body.email || '',
      subject: req.body.subject || '',
      message: req.body.message || '',
      status: 'open'
    };

    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticket)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Ticket create error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.response !== undefined) updates.response = req.body.response;
    if (req.body.status !== undefined) updates.status = req.body.status;

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'ticket not found' });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Ticket update error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
