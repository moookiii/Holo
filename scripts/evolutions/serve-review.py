"""Serve the compiled review with original public assets, without hot reload."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlsplit

ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        relative=unquote(urlsplit(path).path).removeprefix('/Holo/').lstrip('/')
        if not relative or relative=='index.html': return str(ROOT/'artifacts/evolutions/compiled/index.html')
        base=ROOT/'artifacts/evolutions/compiled' if relative.startswith('assets/') else ROOT/'public'
        candidate=(base/relative).resolve()
        return str(candidate) if candidate.is_relative_to(base.resolve()) else str(base/'not-found')
    def log_message(self,*args): pass

print('Review: http://127.0.0.1:5182/Holo/',flush=True)
ThreadingHTTPServer(('127.0.0.1',5182),Handler).serve_forever()
