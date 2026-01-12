#!/bin/bash

echo "========================================="
echo "🔍 Emirates Lease Flow Deployment Diagnostics"
echo "========================================="
echo ""

echo "1️⃣  Checking Backend Process..."
echo "-----------------------------------"
pm2 list | grep leasemanagement
echo ""

echo "2️⃣  Checking Backend Port 5002..."
echo "-----------------------------------"
sudo lsof -i :5002 || echo "❌ Nothing running on port 5002!"
echo ""

echo "3️⃣  Testing Backend Health (Direct)..."
echo "-----------------------------------"
curl -s http://localhost:5002/health || echo "❌ Backend not responding on port 5002!"
echo ""

echo "4️⃣  Testing Backend API (Direct)..."
echo "-----------------------------------"
curl -s http://localhost:5002/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' || echo "❌ Backend API not responding!"
echo ""

echo "5️⃣  Checking Frontend Files..."
echo "-----------------------------------"
ls -lh /home/ubuntu/leasmanagement/frontend/dist/ | head -10
echo ""
test -f /home/ubuntu/leasmanagement/frontend/dist/index.html && echo "✅ index.html exists" || echo "❌ index.html NOT FOUND!"
echo ""

echo "6️⃣  Checking Nginx Configuration..."
echo "-----------------------------------"
sudo nginx -t
echo ""

echo "7️⃣  Checking Nginx Status..."
echo "-----------------------------------"
sudo systemctl status nginx --no-pager | head -15
echo ""

echo "8️⃣  Testing via Nginx (localhost)..."
echo "-----------------------------------"
curl -s -I http://localhost/
echo ""
curl -s -I http://localhost/api/health
echo ""

echo "9️⃣  Checking PM2 Logs (last 20 lines)..."
echo "-----------------------------------"
pm2 logs leasemanagement-backend --lines 20 --nostream || echo "❌ No PM2 logs found!"
echo ""

echo "🔟  Checking Backend Environment..."
echo "-----------------------------------"
cd /home/ubuntu/leasmanagement/backend 2>/dev/null || cd /var/www/emirates-lease-flow-api 2>/dev/null || echo "❌ Backend directory not found!"
pwd
ls -la config*.env 2>/dev/null || echo "❌ No config files found!"
echo ""

echo "========================================="
echo "✅ Diagnostics Complete!"
echo "========================================="
