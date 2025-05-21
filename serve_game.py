import os
import sys
import webbrowser
import http.server
import socketserver
from pathlib import Path
import threading
import time

PORT = 8000
CURRENT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = CURRENT_DIR / "dist"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)
    
    def log_message(self, format, *args):
        print(f"[HTTP Server] {args[0]} {args[1]} {args[2]}")

def start_server():
    os.chdir(DIST_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        httpd.serve_forever()

def open_browser():
    time.sleep(1)
    url = f"http://localhost:{PORT}"
    print(f"Opening browser at {url}")
    webbrowser.open(url)

def serve_game():
    if not DIST_DIR.exists():
        print(f"Error: Dist directory not found at {DIST_DIR}")
        print("Please run 'npm run build' first")
        sys.exit(1)
    
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    open_browser()
    
    print("Press Ctrl+C to stop the server")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Server stopped")

if __name__ == "__main__":
    serve_game()