# 🚀 Server Deployment & Hosting Guide (30 Concurrent iPad Users)

This web application is built as a high-performance **Static Single Page Application (SPA)** using HTML5, CSS3, and ES Modules. It can be hosted on any web server without complex backend infrastructure.

---

## ⚡ Recommended Nginx Configuration

Nginx handles static MP4 video range requests (`HTTP 206`) with high efficiency and minimal CPU overhead.

### Sample `/etc/nginx/sites-available/acetaview.conf`:

```nginx
server {
    listen 80;
    server_name acetaview.local; # or server IP

    root /var/www/acetaview;
    index index.html;

    # Enable HTTP/2 for concurrent stream multiplexing
    listen 443 ssl http2;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Enable Range Requests for Video Seeking
    location /videos/ {
        mp4;
        mp4_buffer_size 1m;
        mp4_max_buffer_size 10m;

        add_header Accept-Ranges bytes;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Static Assets Caching
    location ~* \.(css|js|png|jpg|jpeg|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🏃 Quick Local Test Server (Using Python 3)

You can launch a test server directly on your local machine / LAN:

```bash
cd "/Users/waris/Project/Research Acetabulum"
python3 -m http.server 8080
```

Then open `http://<YOUR_COMPUTER_IP>:8080` on your iPad!
