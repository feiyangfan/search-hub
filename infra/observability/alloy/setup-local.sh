#!/bin/bash
# Setup Grafana Alloy for local development

set -e

echo "🚀 Setting up Grafana Alloy for Search Hub observability..."

# Check if Alloy is installed
if ! command -v alloy &> /dev/null; then
    echo "❌ Alloy not found. Installing via Homebrew..."
    brew install grafana-alloy
else
    echo "✅ Alloy is already installed"
fi

# Check for environment variables file
if [ ! -f "infra/observability/alloy/.env.alloy" ]; then
    echo ""
    echo "⚠️  No .env.alloy file found."
    echo "📝 Please copy .env.example and fill in your Grafana Cloud credentials:"
    echo ""
    echo "   cp infra/observability/alloy/.env.example infra/observability/alloy/.env.alloy"
    echo "   # Edit .env.alloy with your actual values"
    echo ""
    echo "Get your credentials from: https://grafana.com/orgs/<your-org>/stacks"
    exit 1
fi

# Load environment variables
echo "📦 Loading environment variables..."
source infra/observability/alloy/.env.alloy

# Verify required variables
REQUIRED_VARS=(
    "GCLOUD_PROMETHEUS_URL"
    "GCLOUD_HOSTED_METRICS_ID"
    "GCLOUD_RW_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        echo "   Please update infra/observability/alloy/.env.alloy"
        exit 1
    fi
done

echo "✅ Environment variables loaded"

# Copy config to Alloy directory
echo "📋 Copying Alloy configuration..."
ALLOY_CONFIG_DIR="/opt/homebrew/etc/alloy"
mkdir -p "$ALLOY_CONFIG_DIR"

# Export vars so they're available to Alloy
export GCLOUD_PROMETHEUS_URL
export GCLOUD_HOSTED_METRICS_ID
export GCLOUD_RW_API_KEY
export GCLOUD_LOKI_URL
export GCLOUD_LOKI_USERNAME
export GCLOUD_FLEET_ID
export GCLOUD_FLEET_USERNAME
export ENVIRONMENT

cp infra/observability/alloy/config.development.alloy "$ALLOY_CONFIG_DIR/config.alloy"
echo "✅ Config copied to $ALLOY_CONFIG_DIR/config.alloy"

# Start Alloy
echo "🔄 Starting Alloy service..."
brew services restart alloy

# Wait a moment for startup
sleep 2

# Check if Alloy is running
if brew services list | grep -q "alloy.*started"; then
    echo "✅ Alloy is running!"
    echo ""
    echo "📊 Verify setup:"
    echo "   - Alloy metrics: http://localhost:12345/metrics"
    echo "   - API metrics:   http://localhost:3000/metrics"
    echo "   - Logs:          tail -f ~/Library/Logs/Homebrew/alloy.log"
    echo ""
    echo "🎉 Setup complete! Metrics are now flowing to Grafana Cloud."
    echo "   Login to Grafana and query: up{service=\"search-hub-api\"}"
else
    echo "❌ Failed to start Alloy. Check logs:"
    echo "   tail -f ~/Library/Logs/Homebrew/alloy.log"
    exit 1
fi
