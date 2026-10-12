"""Serve the compiled RC review with existing public assets and no hot reload."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'artifacts/bw-radiant/build'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        relative = unquote(urlsplit(path).path).removeprefix('/Holo/').lstrip('/')
        if not relative or relative == 'index.html': return str(BUILD/'index.html')
        base = BUILD if relative.startswith('assets/') else ROOT/'public'
        candidate = (base/relative).resolve()
        return str(candidate) if candidate.is_relative_to(base.resolve()) else str(base/'not-found')
    def log_message(self, *args): pass

print('RC review: http://127.0.0.1:5185/Holo/', flush=True)
ThreadingHTTPServer(('127.0.0.1',5185),Handler).serve_forever()
