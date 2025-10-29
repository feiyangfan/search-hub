# Observability Setup Summary

This document summarizes the observability infrastructure for Search Hub.

## 📁 Repository Structure

```
infra/observability/
├── alloy/
│   ├── README.md                    # Setup instructions
│   ├── .env.example                 # Environment variables template
│   ├── config.development.alloy     # Local dev configuration
│   ├── config.production.alloy      # Production configuration
│   └── setup-local.sh               # Automated setup script
└── dashboards/                      # (Future: Grafana dashboard JSONs)
```

## ✅ What's Committed to Git

**YES - Commit these:**
- ✅ Configuration templates (`*.alloy` files)
- ✅ README and documentation
- ✅ Setup scripts
- ✅ `.env.example` (template without secrets)

**NO - Never commit:**
- ❌ `.env.alloy` (contains secrets - already in .gitignore)
- ❌ Actual API keys or credentials
- ❌ Fleet management IDs
- ❌ User-specific paths or hostnames

## 🚀 Quick Start for Team Members

### Local Development

1. **Clone repo and install dependencies**:
   ```bash
   git clone <repo>
   cd search-hub
   pnpm install
   ```

2. **Set up Alloy**:
   ```bash
   # Option A: Automated setup
   ./infra/observability/alloy/setup-local.sh
   
   # Option B: Manual setup
   brew install grafana-alloy
   cp infra/observability/alloy/.env.example infra/observability/alloy/.env.alloy
   # Edit .env.alloy with your Grafana Cloud credentials
   cp infra/observability/alloy/config.development.alloy /opt/homebrew/etc/alloy/config.alloy
   brew services start alloy
   ```

3. **Get Grafana Cloud credentials**:
   - Go to https://grafana.com/orgs/YOUR_ORG/stacks
   - Click on your stack
   - Generate API key with "Metrics Push" permissions
   - Copy Prometheus URL and username

4. **Verify setup**:
   ```bash
   # Check Alloy is running
   brew services list | grep alloy
   
   # Check metrics are exposed
   curl http://localhost:3000/metrics
   
   # Check Alloy is scraping
   curl http://localhost:12345/metrics | grep scrape
   ```

### Production Deployment

See `infra/observability/alloy/README.md` for deployment-specific instructions.

## 📊 Metrics Collected

### Application Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `auth_attempts_total` | Counter | method, status | Authentication attempts |
| `api_requests_total` | Counter | tenant_id, endpoint, method, status_code | API requests |
| `api_request_duration_seconds` | Histogram | tenant_id, endpoint, method, status_code | Request latency |
| `search_requests_total` | Counter | tenant_id, search_type | Search operations |
| `search_duration_seconds` | Histogram | tenant_id, search_type, status | Search latency |
| `documents_created_total` | Counter | tenant_id, source_type | Documents created |
| `queue_depth` | Gauge | queue, tenant_id | Background job queue depth |
| `active_jobs` | Gauge | - | Currently processing jobs |
| `jobs_processed_total` | Counter | job_type, tenant_id, result | Jobs processed |
| `job_duration_seconds` | Histogram | job_type, tenant_id, result | Job processing time |

### System Metrics (Auto-collected)

- Node.js process metrics (CPU, memory, GC)
- Event loop lag
- Active handles and requests

## 🔐 Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Restrict metrics endpoint**: Consider basic auth in production
3. **Network isolation**: Ensure Alloy can only access required services
4. **Secret rotation**: Rotate Grafana Cloud API keys periodically
5. **Access control**: Use Grafana Cloud RBAC for team access

## 🛠️ Troubleshooting

### Alloy not scraping
```bash
# Check if Alloy is running
brew services list | grep alloy

# Check Alloy logs
tail -f ~/Library/Logs/Homebrew/alloy.log

# Restart Alloy
brew services restart alloy
```

### Metrics not in Grafana Cloud
```bash
# Check if data is being sent
curl http://localhost:12345/metrics | grep prometheus_remote_storage_samples_total

# Verify environment variables
echo $GCLOUD_RW_API_KEY  # Should not be empty
```

### Rate queries returning empty
- Use `[5m]` windows minimum with 60s scrape interval
- Ensure time range in Grafana is "Last 15m" or longer
- Try `sum(rate(metric[5m]))` instead of `[1m]`

## 📚 Additional Resources

- [Grafana Alloy Docs](https://grafana.com/docs/alloy/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Search Hub ADRs](../../docs/adr/)
- [Grafana Cloud Limits](https://grafana.com/docs/grafana-cloud/account-management/billing-and-usage/rate-limits/)

## 🎯 Next Steps

1. Create Grafana dashboards (JSON in `dashboards/`)
2. Set up Loki for log aggregation
3. Configure Tempo for distributed tracing
4. Define SLOs and alert rules
5. Add uptime monitoring (synthetic checks)
