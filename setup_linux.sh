#!/bin/bash
# setup_linux.sh - Setup script for Oracle Cloud Ubuntu VPS

echo "======================================="
echo " Shorts Factory - Linux VPS Setup"
echo "======================================="

echo "[1/5] Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "[2/5] Installing FFmpeg, Python, and utilities..."
sudo apt install -y ffmpeg python3 python3-venv python3-pip curl git unzip build-essential

echo "[3/5] Installing Node.js (v20) and PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

echo "[4/5] Setting up Python Virtual Environment..."
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

echo "[5/5] Installing Node dependencies..."
cd server && npm install
cd ../client && npm install

echo "======================================="
echo " Building React Frontend..."
echo "======================================="
npm run build

echo "======================================="
echo " Setup Complete!"
echo " Next steps:"
echo " 1. Create your .env files (root and client/.env)"
echo " 2. Run: pm2 start ecosystem.config.js"
echo "======================================="
