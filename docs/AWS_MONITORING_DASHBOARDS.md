# CloudWatch Monitoring Dashboards

Complete CloudWatch dashboard configurations for monitoring HyreLog on AWS.

## Dashboard 1: API Server Overview

### JSON Configuration

```json
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ECS",
                        "CPUUtilization",
                        "ServiceName",
                        "hyrelog-api-service",
                        "ClusterName",
                        "hyrelog-api-cluster",
                        { "stat": "Average", "label": "CPU %" }
                    ],
                    [
                        ".",
                        "MemoryUtilization",
                        ".",
                        ".",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Memory %" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "ECS Resource Utilization",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 100
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ApplicationELB",
                        "RequestCount",
                        "LoadBalancer",
                        "hyrelog-api-alb",
                        { "stat": "Sum", "label": "Requests" }
                    ],
                    [
                        ".",
                        "HTTPCode_Target_2XX_Count",
                        ".",
                        ".",
                        { "stat": "Sum", "label": "2XX" }
                    ],
                    [
                        ".",
                        "HTTPCode_Target_4XX_Count",
                        ".",
                        ".",
                        { "stat": "Sum", "label": "4XX" }
                    ],
                    [
                        ".",
                        "HTTPCode_Target_5XX_Count",
                        ".",
                        ".",
                        { "stat": "Sum", "label": "5XX" }
                    ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "us-east-1",
                "title": "Request Metrics",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ApplicationELB",
                        "TargetResponseTime",
                        "LoadBalancer",
                        "hyrelog-api-alb",
                        { "stat": "Average", "label": "Avg Response Time" }
                    ],
                    [
                        ".",
                        "TargetResponseTime",
                        ".",
                        ".",
                        { "stat": "p99", "label": "P99 Response Time" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Response Time",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "label": "ms"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ApplicationELB",
                        "ActiveConnectionCount",
                        "LoadBalancer",
                        "hyrelog-api-alb",
                        { "stat": "Average", "label": "Active Connections" }
                    ],
                    [
                        ".",
                        "NewConnectionCount",
                        ".",
                        ".",
                        { "stat": "Sum", "label": "New Connections" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Connection Metrics",
                "view": "timeSeries"
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/ecs/hyrelog-api' | fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100",
                "region": "us-east-1",
                "title": "Recent Errors",
                "view": "table"
            }
        }
    ]
}
```

### Create Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name HyreLog-API-Overview \
  --dashboard-body file://api-dashboard.json \
  --region us-east-1
```

---

## Dashboard 2: Database Monitoring

### JSON Configuration

```json
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "CPUUtilization",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "CPU %" }
                    ],
                    [
                        ".",
                        "DatabaseConnections",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Connections" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "RDS CPU and Connections",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "min": 0
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "FreeableMemory",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "Free Memory (MB)" }
                    ],
                    [
                        ".",
                        "FreeStorageSpace",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Free Storage (GB)" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "RDS Resources",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "ReadLatency",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "Read Latency" }
                    ],
                    [
                        ".",
                        "WriteLatency",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Write Latency" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Database Latency",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "label": "ms"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "ReadIOPS",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "Read IOPS" }
                    ],
                    [
                        ".",
                        "WriteIOPS",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Write IOPS" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Database IOPS",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "ReplicaLag",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "Replica Lag (seconds)" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Replication Status",
                "view": "timeSeries"
            }
        }
    ]
}
```

---

## Dashboard 3: Workers Monitoring

### JSON Configuration

```json
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ECS",
                        "CPUUtilization",
                        "ServiceName",
                        "hyrelog-webhook-worker",
                        "ClusterName",
                        "hyrelog-workers-cluster",
                        { "stat": "Average", "label": "Webhook Worker CPU" }
                    ],
                    [
                        ".",
                        "CPUUtilization",
                        "ServiceName",
                        "hyrelog-job-processor",
                        ".",
                        ".",
                        { "stat": "Average", "label": "Job Processor CPU" }
                    ],
                    [
                        ".",
                        "CPUUtilization",
                        "ServiceName",
                        "hyrelog-gdpr-worker",
                        ".",
                        ".",
                        { "stat": "Average", "label": "GDPR Worker CPU" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Worker CPU Utilization",
                "view": "timeSeries"
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/ecs/hyrelog-workers' | fields @timestamp, @message\n| filter @message like /ERROR/ or @message like /FAILED/\n| sort @timestamp desc\n| limit 50",
                "region": "us-east-1",
                "title": "Worker Errors",
                "view": "table"
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/ecs/hyrelog-workers' | fields @timestamp, @message\n| filter @message like /processed/ or @message like /completed/\n| stats count() by bin(5m)\n| sort @timestamp desc",
                "region": "us-east-1",
                "title": "Worker Processing Rate",
                "view": "timeSeries"
            }
        }
    ]
}
```

---

## Dashboard 4: Multi-Region Overview

### JSON Configuration

```json
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/ApplicationELB",
                        "RequestCount",
                        "LoadBalancer",
                        "hyrelog-api-alb-us",
                        { "stat": "Sum", "label": "US Requests" }
                    ],
                    [
                        ".",
                        "RequestCount",
                        "LoadBalancer",
                        "hyrelog-api-alb-eu",
                        { "stat": "Sum", "label": "EU Requests" }
                    ],
                    [
                        ".",
                        "RequestCount",
                        "LoadBalancer",
                        "hyrelog-api-alb-au",
                        { "stat": "Sum", "label": "AU Requests" }
                    ]
                ],
                "period": 300,
                "stat": "Sum",
                "regions": ["us-east-1", "eu-west-1", "ap-southeast-2"],
                "title": "Request Distribution by Region",
                "view": "timeSeries"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/RDS",
                        "CPUUtilization",
                        "DBInstanceIdentifier",
                        "hyrelog-us-primary",
                        { "stat": "Average", "label": "US DB CPU" }
                    ],
                    [
                        ".",
                        "CPUUtilization",
                        "DBInstanceIdentifier",
                        "hyrelog-eu-primary",
                        { "stat": "Average", "label": "EU DB CPU" }
                    ],
                    [
                        ".",
                        "CPUUtilization",
                        "DBInstanceIdentifier",
                        "hyrelog-au-primary",
                        { "stat": "Average", "label": "AU DB CPU" }
                    ]
                ],
                "period": 300,
                "stat": "Average",
                "regions": ["us-east-1", "eu-west-1", "ap-southeast-2"],
                "title": "Database CPU by Region",
                "view": "timeSeries"
            }
        }
    ]
}
```

---

## Dashboard 5: Cost Monitoring

### JSON Configuration

```json
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/Billing",
                        "EstimatedCharges",
                        "ServiceName",
                        "AmazonEC2",
                        "Currency",
                        "USD",
                        { "stat": "Maximum", "label": "EC2/ECS" }
                    ],
                    [
                        ".",
                        "EstimatedCharges",
                        "ServiceName",
                        "AmazonRDS",
                        ".",
                        ".",
                        { "stat": "Maximum", "label": "RDS" }
                    ],
                    [
                        ".",
                        "EstimatedCharges",
                        "ServiceName",
                        "AmazonS3",
                        ".",
                        ".",
                        { "stat": "Maximum", "label": "S3" }
                    ],
                    [
                        ".",
                        "EstimatedCharges",
                        "ServiceName",
                        "AmazonCloudWatch",
                        ".",
                        ".",
                        { "stat": "Maximum", "label": "CloudWatch" }
                    ],
                    [
                        ".",
                        "EstimatedCharges",
                        "ServiceName",
                        "AWSDataTransfer",
                        ".",
                        ".",
                        { "stat": "Maximum", "label": "Data Transfer" }
                    ]
                ],
                "period": 86400,
                "stat": "Maximum",
                "region": "us-east-1",
                "title": "Daily Estimated Costs by Service",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "label": "USD"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [
                        "AWS/Billing",
                        "EstimatedCharges",
                        "Currency",
                        "USD",
                        {
                            "stat": "Maximum",
                            "label": "Total Estimated Charges"
                        }
                    ]
                ],
                "period": 86400,
                "stat": "Maximum",
                "region": "us-east-1",
                "title": "Total Daily Estimated Cost",
                "view": "timeSeries",
                "yAxis": {
                    "left": {
                        "label": "USD"
                    }
                }
            }
        }
    ]
}
```

**Note:** Billing metrics require enabling "Receive Billing Alerts" in AWS Billing preferences.

---

## Dashboard 6: Application-Specific Metrics

### Custom Metrics from Application

If you're publishing custom metrics from your application (via CloudWatch SDK), add widgets like:

```json
{
    "type": "metric",
    "properties": {
        "metrics": [
            [
                "HyreLog",
                "EventsIngested",
                "Region",
                "US",
                { "stat": "Sum", "label": "Events Ingested" }
            ],
            [
                ".",
                "EventsIngested",
                "Region",
                "EU",
                { "stat": "Sum", "label": "EU Events" }
            ],
            [
                ".",
                "EventsIngested",
                "Region",
                "AU",
                { "stat": "Sum", "label": "AU Events" }
            ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Events Ingested by Region",
        "view": "timeSeries"
    }
}
```

### Publishing Custom Metrics

In your application code:

```typescript
import {
    CloudWatchClient,
    PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

async function publishMetric(
    metricName: string,
    value: number,
    region: string
) {
    await cloudwatch.send(
        new PutMetricDataCommand({
            Namespace: 'HyreLog',
            MetricData: [
                {
                    MetricName: metricName,
                    Value: value,
                    Dimensions: [{ Name: 'Region', Value: region }],
                    Timestamp: new Date()
                }
            ]
        })
    );
}
```

---

## CloudWatch Alarms

### High CPU Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name hyrelog-api-high-cpu \
  --alarm-description "Alert when API CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=hyrelog-api-service Name=ClusterName,Value=hyrelog-api-cluster \
  --alarm-actions arn:aws:sns:us-east-1:<account-id>:hyrelog-alerts \
  --region us-east-1
```

### High Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name hyrelog-api-high-errors \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=hyrelog-api-alb \
  --alarm-actions arn:aws:sns:us-east-1:<account-id>:hyrelog-alerts \
  --region us-east-1
```

### Database Connection Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name hyrelog-db-high-connections \
  --alarm-description "Alert when DB connections exceed 80% of max" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=hyrelog-us-primary \
  --alarm-actions arn:aws:sns:us-east-1:<account-id>:hyrelog-alerts \
  --region us-east-1
```

### Cost Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name hyrelog-daily-cost-exceeded \
  --alarm-description "Alert when daily cost exceeds $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=Currency,Value=USD \
  --alarm-actions arn:aws:sns:us-east-1:<account-id>:hyrelog-alerts \
  --region us-east-1
```

---

## SNS Topic for Alerts

Create an SNS topic for alarms:

```bash
aws sns create-topic \
  --name hyrelog-alerts \
  --region us-east-1

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:<account-id>:hyrelog-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1
```

---

## Log Insights Queries

### Error Rate Query

```sql
fields @timestamp, @message
| filter @message like /ERROR/ or @message like /Exception/
| stats count() by bin(5m)
| sort @timestamp desc
```

### Slow Requests Query

```sql
fields @timestamp, @message, @requestId
| filter @message like /duration/ and @message like /ms/
| parse @message /duration=(?<duration>\d+)ms/
| filter duration > 1000
| sort duration desc
| limit 100
```

### API Key Usage Query

```sql
fields @timestamp, @message
| parse @message /apiKey=(?<apiKey>[a-zA-Z0-9]+)/
| stats count() by apiKey
| sort count desc
| limit 20
```

---

## Creating Dashboards via CLI

Save each dashboard JSON to a file and create:

```bash
# API Overview
aws cloudwatch put-dashboard \
  --dashboard-name HyreLog-API-Overview \
  --dashboard-body file://api-dashboard.json \
  --region us-east-1

# Database Monitoring
aws cloudwatch put-dashboard \
  --dashboard-name HyreLog-Database \
  --dashboard-body file://database-dashboard.json \
  --region us-east-1

# Workers
aws cloudwatch put-dashboard \
  --dashboard-name HyreLog-Workers \
  --dashboard-body file://workers-dashboard.json \
  --region us-east-1

# Multi-Region
aws cloudwatch put-dashboard \
  --dashboard-name HyreLog-MultiRegion \
  --dashboard-body file://multiregion-dashboard.json \
  --region us-east-1
```

---

## Best Practices

1. **Set up dashboards per environment** (dev, staging, production)
2. **Use CloudWatch Logs Insights** for ad-hoc queries
3. **Create composite alarms** for complex conditions
4. **Set up cost budgets** in AWS Budgets (separate from CloudWatch)
5. **Enable Container Insights** for ECS (more detailed metrics)
6. **Use X-Ray** for distributed tracing
7. **Set log retention** to 30 days (balance cost vs. retention needs)
8. **Create custom metrics** for business KPIs (events ingested, API calls, etc.)
