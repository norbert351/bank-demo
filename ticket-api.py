#!/usr/bin/env python3
"""Support ticket API server — JSON file storage. No Supabase needed."""
import json, os, time, uuid, http.server, urllib.parse
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tickets.json")
PORT = 8001

def load():
    if not os.path.exists(DB_PATH):
        return []
    with open(DB_PATH) as f:
        return json.load(f)

def save(tickets):
    with open(DB_PATH, "w") as f:
        json.dump(tickets, f, indent=2)

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body):
        self.send_response(code)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/api/tickets":
            user_id = params.get("user_id", [None])[0]
            tickets = load()
            if user_id:
                tickets = [t for t in tickets if t.get("user_id") == user_id]
            tickets.sort(key=lambda t: t.get("created_at", ""), reverse=True)
            self._send(200, tickets)
        elif path == "/api/health":
            self._send(200, {"ok": True})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path.rstrip("/") == "/api/tickets":
            tickets = load()
            ticket = {
                "id": str(uuid.uuid4()),
                "user_id": body.get("user_id", ""),
                "email": body.get("email", ""),
                "subject": body.get("subject", ""),
                "message": body.get("message", ""),
                "response": None,
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            tickets.append(ticket)
            save(tickets)
            self._send(201, ticket)
        else:
            self._send(404, {"error": "not found"})

    def do_PUT(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        path = self.path.rstrip("/")
        # /api/tickets/<id>
        parts = path.split("/")
        if len(parts) >= 4 and parts[1] == "api" and parts[2] == "tickets":
            ticket_id = parts[3]
            tickets = load()
            for t in tickets:
                if t["id"] == ticket_id:
                    if "response" in body:
                        t["response"] = body["response"]
                    if "status" in body:
                        t["status"] = body["status"]
                    save(tickets)
                    self._send(200, t)
                    return
            self._send(404, {"error": "ticket not found"})
        else:
            self._send(404, {"error": "not found"})

    def log_message(self, format, *args):
        print(f"[api] {args[0]}")

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Ticket API running on http://localhost:{PORT}")
    server.serve_forever()
