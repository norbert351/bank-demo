#!/usr/bin/env python3
"""HTTP server with no-cache headers — serves bank-demo files."""
import http.server, os

PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), NoCacheHandler)
    print(f'Serving {DIR} on http://localhost:{PORT} (no-cache)')
    server.serve_forever()
