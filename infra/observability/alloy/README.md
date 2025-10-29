# Grafana Alloy Configuration

This directory contains Grafana Alloy configuration templates for collecting metrics and logs from Search Hub services.

## Setup

### Local Development

1. **Install Alloy**:
   ```bash
   brew install grafana-alloy
   ```

2. **Set Environment Variables**:
   ```bash
   export GCLOUD_HOSTED_METRICS_ID="<your-prometheus-user-id>"
   export GCLOUD_RW_API_KEY="<your-grafana-cloud-api-key>"
   ```

3. **Copy and customize config**:
   ```bash
   cp infra/observability/alloy/config.development.alloy /opt/homebrew/etc/alloy/config.alloy
   ```

4. **Start Alloy**:
   ```bash
   brew services start alloy
   ```

5. **Verify**:
   ```bash
   # Check Alloy is running
   brew services list | grep alloy
   
   # Check Alloy metrics
   curl http://localhost:12345/metrics
   ```

### Production Deployment

For production (Render, AWS, etc.):

1. Use `config.production.alloy` as base
2. Set environment variables in your deployment platform
3. Deploy Alloy as a sidecar or separate service
4. Update scrape targets to match your service discovery

## Configuration Files

- `config.development.alloy` - Local development setup (scrapes localhost:3000)
- `config.production.alloy` - Production template (uses service discovery)
- `config.staging.alloy` - Staging environment template

## Key Configurations

### Metrics Collection
- **API**: `localhost:3000/metrics` (development) or service discovery (production)
- **Worker**: Add worker metrics endpoint when implemented
- **Scrape Interval**: 60s (configurable per environment)

### Labels Applied
- `service` - Service name (search-hub-api, search-hub-worker)
- `environment` - Environment (development, staging, production)
- `tenant_id` - Multi-tenant identifier (from application metrics)

### Remote Write Endpoints
- **Metrics**: Grafana Cloud Prometheus
- **Logs**: Grafana Cloud Loki (future)
- **Traces**: Grafana Cloud Tempo (future)

## Troubleshooting

**Alloy not scraping:**
```bash
# Check Alloy logs
tail -f ~/Library/Logs/Homebrew/alloy.log

# Check Alloy internal metrics
curl http://localhost:12345/metrics | grep scrape
```

**Metrics not in Grafana Cloud:**
```bash
# Verify remote write is working
curl http://localhost:12345/metrics | grep prometheus_remote_storage_samples_total
```

**Environment variables not loaded:**
```bash
# Restart Alloy after setting env vars
brew services restart alloy
```

## Security Notes

- **Never commit API keys** - Use environment variables
- **Restrict /metrics endpoint** - Consider basic auth for production
- **Network policies** - Ensure Alloy can reach your services
- **Secret management** - Use your platform's secret store (AWS Secrets Manager, etc.)
