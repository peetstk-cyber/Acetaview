# 🚀 Server Deployment & Hosting Guide (30 Concurrent iPad Users)

This web application is built as a high-performance **Static Single Page Application (SPA)** with zero backend database dependencies.

---

## 🏃 Option 1: Quick Local LAN Server (Recommended for Classroom/Room Testing)

We have provided a custom multi-threaded Python server script `server.py` that includes:
- Multi-threading support (`ThreadingHTTPServer`) to serve 30+ iPads simultaneously without blocking.
- Static image caching headers (`Cache-Control: public, max-age=31536000, immutable`).
- High socket backlog (`request_queue_size = 256`).

### How to Run:
```bash
cd "/Users/waris/Project/Research Acetabulum copy 2"
python3 server.py
```

The script will automatically detect and print your Mac's LAN IP:
```
📱 iPad / LAN URL : http://192.168.1.XX:8080
```
Simply type that address into Safari on each iPad.

---

## ⚡ Option 2: Production Nginx Server (Maximum Throughput)

Nginx handles concurrent static image requests with event-driven `epoll` architecture and HTTP/2 multiplexing.

### Sample `/etc/nginx/sites-available/acetaview.conf`:

```nginx
server {
    listen 80;
    server_name acetaview.local;

    root /var/www/acetaview;
    index index.html;

    # Static Assets & Images Caching
    location ~* \.(jpg|jpeg|png|webp|mp4|css|js|svg)$ {
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ☁️ Option 3: Cloud Hosting (Vercel / Cloudflare Pages)

If participants are using cellular data (4G/5G) or separate Wi-Fi networks:
- **Vercel**: Run `npx vercel --prod`
- The included `vercel.json` already contains long-term immutable caching headers for all slice images.
