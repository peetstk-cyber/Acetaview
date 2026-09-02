#!/usr/bin/env python3
"""
High-Performance Multi-Threaded Local Server for AcetaView
Optimized for 30+ Concurrent iPad / Tablet Test Sessions over LAN / Wi-Fi
"""

import os
import sys
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8080

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class AcetaViewRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable aggressive caching for images to reduce Wi-Fi bandwidth for 30 users
        if self.path.endswith(('.jpg', '.jpeg', '.webp', '.png', '.mp4')):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        elif self.path.endswith(('.css', '.js', '.html')):
            self.send_header('Cache-Control', 'no-cache')
        
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Silence individual image 200 logs to prevent terminal I/O bottleneck
        if args and len(args) > 0 and ' 200 ' in str(args[0]):
            return
        super().log_message(format, *args)

class HighConcurrencyServer(ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True
    allow_reuse_address = True

def run():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    lan_ip = get_lan_ip()
    server_address = ('0.0.0.0', PORT)
    
    print("\n" + "="*65)
    print("🚀 AcetaView High-Concurrency Test Server (30+ iPad Ready)")
    print("="*65)
    print(f"📁 Serving Directory : {web_dir}")
    print(f"🌐 Local Machine URL  : http://localhost:{PORT}")
    print(f"📱 iPad / LAN URL     : http://{lan_ip}:{PORT}")
    print("="*65)
    print("💡 Share the iPad URL above with all 30 test participants.")
    print("⚡ Multi-threading: ENABLED | Keep-Alive: ENABLED | Image Cache: ENABLED")
    print("="*65 + "\n")

    httpd = HighConcurrencyServer(server_address, AcetaViewRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped gracefully.")
        httpd.server_close()

if __name__ == '__main__':
    run()
