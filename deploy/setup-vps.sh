# deploy/setup-vps.sh
# Run this script on your VPS (Ubuntu/Debian) to set up Docker and run the SendPilot Worker
# Usage: bash deploy/setup-vps.sh

set -e

echo "=== 1. Updating packages and installing Docker ==="
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm -f get-docker.sh
else
    echo "Docker is already installed."
fi

echo "=== 2. Setting up project directory ==="
APP_DIR="/opt/sendpilot-worker"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

echo "Project folder ready at $APP_DIR"
