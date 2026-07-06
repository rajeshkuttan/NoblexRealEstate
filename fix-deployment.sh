#!/bin/bash

echo "========================================="
echo "🔧 Emirates Lease Flow Deployment Fix"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables - EDIT THESE IF NEEDED
BACKEND_DIR="/home/ubuntu/leasmanagement/backend"
FRONTEND_DIR="/home/ubuntu/leasmanagement/frontend/dist"
NGINX_CONFIG="/etc/nginx/sites-available/emirates-lease-flow"

echo "Step 1: Checking Backend Directory..."
echo "-----------------------------------"
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}✅ Backend directory exists${NC}"
    cd "$BACKEND_DIR"
else
    echo -e "${RED}❌ Backend directory not found at $BACKEND_DIR${NC}"
    echo "Please update BACKEND_DIR in this script"
    exit 1
fi
echo ""

echo "Step 2: Checking Backend Dependencies..."
echo "-----------------------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
    npm install --production
fi
echo ""

echo "Step 3: Checking Environment Configuration..."
echo "-----------------------------------"
if [ -f "config.production.env" ]; then
    echo -e "${GREEN}✅ Production config exists${NC}"
    # Check if NODE_ENV is set
    grep -q "NODE_ENV=production" config.production.env || echo -e "${YELLOW}⚠️  NODE_ENV might not be set to production${NC}"
else
    echo -e "${RED}❌ config.production.env not found!${NC}"
    echo "Creating basic config.production.env..."
    cat > config.production.env << 'EOF'
# Production Environment
NODE_ENV=production
PORT=5002

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=HoldingDB
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://realestate.globaldes.cloud

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    echo -e "${YELLOW}⚠️  Please edit config.production.env with your actual database credentials!${NC}"
fi
echo ""

echo "Step 4: Stopping PM2 Process..."
echo "-----------------------------------"
pm2 stop leasemanagement-backend 2>/dev/null || echo "No existing process"
pm2 delete leasemanagement-backend 2>/dev/null || echo "No process to delete"
echo ""

echo "Step 5: Starting Backend with PM2..."
echo "-----------------------------------"
NODE_ENV=production pm2 start src/server.js --name leasemanagement-backend -i 1 --max-memory-restart 500M
pm2 save
echo ""

echo "Step 6: Waiting for backend to start..."
sleep 5
echo ""

echo "Step 7: Testing Backend..."
echo "-----------------------------------"
BACKEND_TEST=$(curl -s http://localhost:5002/health)
if [[ $BACKEND_TEST == *"success"* ]]; then
    echo -e "${GREEN}✅ Backend is running and responding!${NC}"
    echo "$BACKEND_TEST"
else
    echo -e "${RED}❌ Backend not responding properly${NC}"
    echo "Checking logs..."
    pm2 logs leasemanagement-backend --lines 20 --nostream
    exit 1
fi
echo ""

echo "Step 8: Checking Frontend Files..."
echo "-----------------------------------"
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${GREEN}✅ Frontend directory exists${NC}"
    if [ -f "$FRONTEND_DIR/index.html" ]; then
        echo -e "${GREEN}✅ index.html exists${NC}"
    else
        echo -e "${RED}❌ index.html not found in $FRONTEND_DIR${NC}"
        echo "You need to deploy the frontend build files!"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend directory not found at $FRONTEND_DIR${NC}"
    echo "Please update FRONTEND_DIR in this script or deploy frontend"
    exit 1
fi
echo ""

echo "Step 9: Updating Nginx Configuration..."
echo "-----------------------------------"
if [ -f "$NGINX_CONFIG" ]; then
    echo "Current nginx config:"
    cat "$NGINX_CONFIG"
    echo ""
    echo -e "${YELLOW}Creating optimized nginx config...${NC}"
    
    sudo tee "$NGINX_CONFIG" > /dev/null << 'NGINXCONF'
server {
    server_name realestate.globaldes.cloud;

    client_max_body_size 200M;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # API Proxy - Must come BEFORE the / location
    location /api/ {
        proxy_pass http://localhost:5002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5002/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Frontend - Serve static files
    location / {
        root /home/ubuntu/leasmanagement/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/realestate.globaldes.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/realestate.globaldes.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = realestate.globaldes.cloud) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name realestate.globaldes.cloud;
    return 404;
}
NGINXCONF
    
    echo -e "${GREEN}✅ Nginx config updated${NC}"
else
    echo -e "${RED}❌ Nginx config not found at $NGINX_CONFIG${NC}"
    exit 1
fi
echo ""

echo "Step 10: Testing Nginx Configuration..."
echo "-----------------------------------"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi
echo ""

echo "Step 11: Reloading Nginx..."
echo "-----------------------------------"
sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"
echo ""

echo "Step 12: Final Tests..."
echo "-----------------------------------"
echo "Testing localhost..."
curl -I http://localhost/ | head -5
echo ""
curl -I http://localhost/api/health | head -5
echo ""

echo "========================================="
echo -e "${GREEN}✅ Deployment Fix Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test your site: https://realestate.globaldes.cloud"
echo "2. Test API: https://realestate.globaldes.cloud/api/health"
echo "3. Check PM2 logs: pm2 logs leasemanagement-backend"
echo "4. Monitor: pm2 monit"
echo ""
