#!/bin/bash
set -e

# ==============================================================================
# FactoryOS Azure Admin Render Worker - Provisioning & Start Script
# ==============================================================================

echo "=== [FactoryOS Azure Admin Render Worker Installer] ==="

# 1. Install System Prerequisites
echo "[1/5] Installing FFmpeg, Python3, and build utilities..."
sudo apt-get update -y
sudo apt-get install -y ffmpeg python3 python3-pip python3-venv

# 2. Setup Dedicated Application Directory
echo "[2/5] Setting up /opt/factoryos/vps-rendering-engine directory..."
sudo mkdir -p /opt/factoryos/vps-rendering-engine
sudo cp -r . /opt/factoryos/vps-rendering-engine/

# 3. Create non-root user if needed
if ! id -u azureuser >/dev/null 2>&1; then
    sudo useradd -m -s /bin/bash azureuser || true
fi
sudo chown -R azureuser:azureuser /opt/factoryos/vps-rendering-engine

# 4. Install Python Dependencies
echo "[3/5] Installing Python dependencies..."
sudo -u azureuser pip3 install --no-cache-dir -r /opt/factoryos/vps-rendering-engine/requirements.txt || pip3 install --no-cache-dir -r /opt/factoryos/vps-rendering-engine/requirements.txt

# 5. Install and Start Systemd Service
echo "[4/5] Configuring systemd service..."
sudo cp /opt/factoryos/vps-rendering-engine/factoryos-admin-render-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable factoryos-admin-render-worker
sudo systemctl restart factoryos-admin-render-worker

echo "[5/5] Checking service status..."
sudo systemctl status factoryos-admin-render-worker --no-pager

echo "=== [Installation Completed] ==="
