const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'tickets.json');

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function load() {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(tickets) {
  fs.writeFileSync(DB_PATH, JSON.stringify(tickets, null, 2));
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/tickets', (req, res) => {
  let tickets = load();
  if (req.query.user_id) {
    tickets = tickets.filter(t => t.user_id === req.query.user_id);
  }
  tickets.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
  const tickets = load();
  const ticket = {
    id: crypto.randomUUID(),
    user_id: req.body.user_id || '',
    email: req.body.email || '',
    subject: req.body.subject || '',
    message: req.body.message || '',
    response: null,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  tickets.push(ticket);
  save(tickets);
  res.status(201).json(ticket);
});

app.put('/api/tickets/:id', (req, res) => {
  const tickets = load();
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  if (req.body.response !== undefined) ticket.response = req.body.response;
  if (req.body.status !== undefined) ticket.status = req.body.status;
  save(tickets);
  res.json(ticket);
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
