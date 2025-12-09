# AWS Cost Estimation Calculator

Interactive cost calculator for HyreLog AWS deployment.

## Quick Cost Estimator

### Input Variables

```javascript
// Configuration
const regions = 3; // US, EU, AU
const apiTasksPerRegion = 2;
const apiCpuPerTask = 1024; // 1 vCPU
const apiMemoryPerTask = 2048; // 2 GB
const workerTasksPerRegion = 3; // webhook, jobs, gdpr
const workerCpuPerTask = 512; // 0.5 vCPU
const workerMemoryPerTask = 1024; // 1 GB
const rdsInstanceClass = 'db.t4g.medium';
const rdsMultiAz = true;
const rdsStorage = 100; // GB
const s3Storage = 100; // GB per region
const dataTransfer = 100; // GB per month
const requestsPerMonth = 10000000; // 10M requests
```

---

## Detailed Cost Breakdown

### 1. ECS Fargate Costs

#### API Server (per region)

```
CPU Cost: $0.04048 per vCPU-hour
Memory Cost: $0.004445 per GB-hour

Per Task:
- CPU: 1 vCPU × $0.04048 = $0.04048/hour
- Memory: 2 GB × $0.004445 = $0.00889/hour
- Total per task: $0.04937/hour

Per Region (2 tasks):
- 2 tasks × $0.04937/hour × 730 hours/month = $72.08/month

With Fargate Spot (70% savings):
- 2 tasks × $0.04937/hour × 0.3 × 730 hours = $21.62/month
```

#### Workers (per region)

```
Per Task:
- CPU: 0.5 vCPU × $0.04048 = $0.02024/hour
- Memory: 1 GB × $0.004445 = $0.004445/hour
- Total per task: $0.024685/hour

Per Region (3 workers):
- 3 tasks × $0.024685/hour × 730 hours/month = $54.06/month

With Fargate Spot:
- 3 tasks × $0.024685/hour × 0.3 × 730 hours = $16.22/month
```

**Total ECS per region:**

-   Standard: $72.08 + $54.06 = **$126.14/month**
-   With Spot: $21.62 + $16.22 = **$37.84/month**

**Total ECS (3 regions):**

-   Standard: $378.42/month
-   With Spot: $113.52/month
-   **Savings with Spot: $264.90/month (70%)**

---

### 2. RDS PostgreSQL Costs

#### Per Region

```
Instance: db.t4g.medium
- On-Demand: ~$0.068/hour
- Multi-AZ: 2x cost = ~$0.136/hour
- Monthly: $0.136 × 730 = $99.28/month

Storage: 100 GB gp3
- $0.115/GB-month × 100 GB = $11.50/month

Backup Storage: 7 days retention
- ~10 GB × $0.095/GB-month = $0.95/month

Total per region: $99.28 + $11.50 + $0.95 = $111.73/month
```

**Total RDS (3 regions): $335.19/month**

#### With Reserved Instances (1-year, No Upfront)

```
Standard RI: ~40% savings
- Per region: $99.28 × 0.6 = $59.57/month
- Storage and backup: same = $12.45/month
- Total per region: $72.02/month

Total RDS (3 regions): $216.06/month
Savings: $119.13/month (36%)
```

---

### 3. Application Load Balancer

#### Per Region

```
ALB: $0.0225/hour
- Monthly: $0.0225 × 730 = $16.43/month

LCU (Load Balancer Capacity Units):
- Assume 10 LCU-hours/day average
- 10 × $0.008/hour × 730 = $58.40/month

Total per region: $16.43 + $58.40 = $74.83/month
```

**Total ALB (3 regions): $224.49/month**

---

### 4. S3 Storage Costs

#### Per Region

```
Standard Storage: 100 GB
- First 50 TB: $0.023/GB-month
- 100 GB × $0.023 = $2.30/month

PUT Requests: ~10,000/month
- $0.005 per 1,000 requests
- 10 × $0.005 = $0.05/month

GET Requests: ~50,000/month
- $0.0004 per 1,000 requests
- 50 × $0.0004 = $0.02/month

Lifecycle Transitions to Glacier:
- 1,000 transitions/month × $0.05/1,000 = $0.05/month

Total per region: $2.42/month
```

**Total S3 (3 regions): $7.26/month**

#### Glacier Storage (after 90 days)

```
Glacier Storage: ~50 GB (after transition)
- $0.0036/GB-month × 50 GB = $0.18/month

Deep Archive (after 180 days): ~25 GB
- $0.00099/GB-month × 25 GB = $0.02/month

Total Glacier: $0.20/month per region
Total (3 regions): $0.60/month
```

---

### 5. CloudWatch Costs

#### Logs

```
Log Ingestion: ~10 GB/month per region
- First 5 GB free, then $0.50/GB
- 5 GB × $0.50 = $2.50/month per region

Log Storage: 30 days retention
- ~10 GB × $0.03/GB-month = $0.30/month per region

Total logs per region: $2.80/month
Total (3 regions): $8.40/month
```

#### Metrics

```
Custom Metrics: ~50 metrics per region
- First 10 free, 40 × $0.30 = $12.00/month per region

Dashboard: 5 dashboards
- Free tier covers this

Alarms: 20 alarms per region
- First 10 free, 10 × $0.10 = $1.00/month per region

Total metrics per region: $13.00/month
Total (3 regions): $39.00/month
```

**Total CloudWatch (3 regions): $47.40/month**

---

### 6. Data Transfer Costs

#### Per Region

```
Outbound to Internet: 100 GB/month
- First 100 GB: $0.09/GB
- 100 GB × $0.09 = $9.00/month

Inter-AZ Transfer: ~50 GB/month
- $0.01/GB × 50 GB = $0.50/month

Total per region: $9.50/month
```

**Total Data Transfer (3 regions): $28.50/month**

---

### 7. ECR (Container Registry)

```
Storage: ~5 GB per image, 10 images
- 50 GB × $0.10/GB-month = $5.00/month

Data Transfer: Minimal (within same region)
- ~$0.50/month

Total ECR: $5.50/month
```

---

### 8. Secrets Manager

```
Secrets: ~20 secrets
- $0.40/secret-month × 20 = $8.00/month

API Calls: ~100,000/month
- First 10,000 free, 90,000 × $0.05/10,000 = $0.45/month

Total Secrets Manager: $8.45/month
```

---

### 9. Route 53 (DNS)

```
Hosted Zone: $0.50/month
Queries: ~1,000,000/month
- First 1M free, then $0.40 per 1M
- Free tier covers this

Total Route 53: $0.50/month
```

---

### 10. CloudFront (Optional CDN)

```
Data Transfer Out: ~50 GB/month
- First 10 TB: $0.085/GB
- 50 GB × $0.085 = $4.25/month

Requests: ~10,000,000/month
- $0.0075 per 10,000 requests
- 1,000 × $0.0075 = $7.50/month

Total CloudFront: $11.75/month
```

---

## Total Monthly Cost Summary

### Standard Configuration (No Optimizations)

| Service                               | Cost (USD/month)    |
| ------------------------------------- | ------------------- |
| ECS Fargate (3 regions)               | $378.42             |
| RDS PostgreSQL (3 regions)            | $335.19             |
| Application Load Balancer (3 regions) | $224.49             |
| S3 Storage (3 regions)                | $7.26               |
| Glacier Storage                       | $0.60               |
| CloudWatch                            | $47.40              |
| Data Transfer                         | $28.50              |
| ECR                                   | $5.50               |
| Secrets Manager                       | $8.45               |
| Route 53                              | $0.50               |
| **Total**                             | **$1,036.31/month** |

### Optimized Configuration (Spot + Reserved Instances)

| Service                               | Cost (USD/month)        |
| ------------------------------------- | ----------------------- |
| ECS Fargate Spot (3 regions)          | $113.52                 |
| RDS Reserved Instances (3 regions)    | $216.06                 |
| Application Load Balancer (3 regions) | $224.49                 |
| S3 Storage (3 regions)                | $7.26                   |
| Glacier Storage                       | $0.60                   |
| CloudWatch                            | $47.40                  |
| Data Transfer                         | $28.50                  |
| ECR                                   | $5.50                   |
| Secrets Manager                       | $8.45                   |
| Route 53                              | $0.50                   |
| **Total**                             | **$653.18/month**       |
| **Savings**                           | **$383.13/month (37%)** |

---

## Cost Calculator Script

### JavaScript Calculator

```javascript
// AWS Cost Calculator for HyreLog
function calculateHyreLogCosts(config) {
    const {
        regions = 3,
        apiTasksPerRegion = 2,
        apiCpuPerTask = 1024,
        apiMemoryPerTask = 2048,
        workerTasksPerRegion = 3,
        workerCpuPerTask = 512,
        workerMemoryPerTask = 1024,
        useSpot = false,
        rdsInstanceClass = 'db.t4g.medium',
        rdsMultiAz = true,
        rdsStorage = 100,
        rdsReserved = false,
        s3Storage = 100,
        dataTransfer = 100,
        useCloudFront = false
    } = config;

    // Pricing (as of 2024, update as needed)
    const pricing = {
        fargate: {
            cpu: 0.04048, // per vCPU-hour
            memory: 0.004445, // per GB-hour
            spotDiscount: 0.7 // 70% savings
        },
        rds: {
            'db.t4g.medium': {
                hourly: 0.068,
                reservedDiscount: 0.4 // 40% savings
            }
        },
        rdsStorage: {
            gp3: 0.115 // per GB-month
        },
        alb: {
            hourly: 0.0225,
            lcu: 0.008 // per LCU-hour
        },
        s3: {
            standard: 0.023, // per GB-month
            glacier: 0.0036,
            deepArchive: 0.00099
        },
        cloudwatch: {
            logsIngestion: 0.5, // per GB (after 5GB free)
            logsStorage: 0.03, // per GB-month
            customMetrics: 0.3, // per metric (after 10 free)
            alarms: 0.1 // per alarm (after 10 free)
        },
        dataTransfer: {
            outbound: 0.09 // per GB (first 100GB)
        }
    };

    const hoursPerMonth = 730;

    // ECS Costs
    const apiTaskCostPerHour =
        (apiCpuPerTask / 1024) * pricing.fargate.cpu +
        (apiMemoryPerTask / 1024) * pricing.fargate.memory;

    const workerTaskCostPerHour =
        (workerCpuPerTask / 1024) * pricing.fargate.cpu +
        (workerMemoryPerTask / 1024) * pricing.fargate.memory;

    const spotMultiplier = useSpot ? 1 - pricing.fargate.spotDiscount : 1;

    const ecsCost =
        regions *
        (apiTasksPerRegion *
            apiTaskCostPerHour *
            hoursPerMonth *
            spotMultiplier +
            workerTasksPerRegion *
                workerTaskCostPerHour *
                hoursPerMonth *
                spotMultiplier);

    // RDS Costs
    const rdsInstanceCost =
        pricing.rds[rdsInstanceClass].hourly * hoursPerMonth;
    const rdsMultiAzMultiplier = rdsMultiAz ? 2 : 1;
    const rdsReservedMultiplier = rdsReserved
        ? 1 - pricing.rds[rdsInstanceClass].reservedDiscount
        : 1;

    const rdsCost =
        regions *
        (rdsInstanceCost * rdsMultiAzMultiplier * rdsReservedMultiplier +
            rdsStorage * pricing.rdsStorage.gp3);

    // ALB Costs
    const albCost =
        regions *
        (pricing.alb.hourly * hoursPerMonth +
            pricing.alb.lcu * 10 * hoursPerMonth); // Estimate 10 LCU-hours/day

    // S3 Costs
    const s3Cost =
        regions *
        (s3Storage * pricing.s3.standard +
            s3Storage * 0.5 * pricing.s3.glacier); // 50% in Glacier after 90 days

    // CloudWatch Costs
    const cloudwatchCost =
        regions *
        (5 * pricing.cloudwatch.logsIngestion + // 10GB - 5GB free
            10 * pricing.cloudwatch.logsStorage +
            40 * pricing.cloudwatch.customMetrics + // 50 - 10 free
            10 * pricing.cloudwatch.alarms); // 20 - 10 free

    // Data Transfer
    const dataTransferCost =
        regions * dataTransfer * pricing.dataTransfer.outbound;

    // Other fixed costs
    const otherCosts = 5.5 + 8.45 + 0.5; // ECR + Secrets + Route53

    const total =
        ecsCost +
        rdsCost +
        albCost +
        s3Cost +
        cloudwatchCost +
        dataTransferCost +
        otherCosts;

    return {
        breakdown: {
            ecs: ecsCost,
            rds: rdsCost,
            alb: albCost,
            s3: s3Cost,
            cloudwatch: cloudwatchCost,
            dataTransfer: dataTransferCost,
            other: otherCosts
        },
        total: total,
        monthly: total,
        yearly: total * 12
    };
}

// Example usage
const standardConfig = {
    regions: 3,
    useSpot: false,
    rdsReserved: false
};

const optimizedConfig = {
    regions: 3,
    useSpot: true,
    rdsReserved: true
};

const standardCosts = calculateHyreLogCosts(standardConfig);
const optimizedCosts = calculateHyreLogCosts(optimizedConfig);

console.log('Standard Configuration:');
console.log(standardCosts);
console.log('\nOptimized Configuration:');
console.log(optimizedCosts);
console.log(
    `\nSavings: $${(standardCosts.total - optimizedCosts.total).toFixed(
        2
    )}/month`
);
```

---

## Cost Optimization Recommendations

1. **Use Fargate Spot** for non-critical workloads (70% savings)
2. **Reserved Instances** for RDS (40% savings with 1-year commitment)
3. **S3 Intelligent Tiering** for archival data
4. **CloudWatch Logs retention** - reduce to 14 days if 30 days not needed
5. **Auto-scaling** - scale down during low traffic periods
6. **S3 Lifecycle policies** - move to Glacier/Deep Archive sooner
7. **Consolidate regions** - start with 1-2 regions, expand as needed
8. **Use CloudFront** only if serving significant static content
9. **Monitor unused resources** - regularly audit and remove unused resources
10. **Set up cost alerts** - get notified when spending exceeds thresholds

---

## Cost Monitoring

### AWS Budgets Setup

```bash
# Create a monthly budget
aws budgets create-budget \
  --account-id <account-id> \
  --budget '{
    "BudgetName": "HyreLog-Monthly",
    "BudgetLimit": {
      "Amount": "1000",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "your-email@example.com"
        }
      ]
    }
  ]'
```

---

## Monthly Cost Tracking Template

| Month | ECS | RDS | ALB | S3  | CloudWatch | Data Transfer | Other | Total |
| ----- | --- | --- | --- | --- | ---------- | ------------- | ----- | ----- |
| Jan   |     |     |     |     |            |               |       |       |
| Feb   |     |     |     |     |            |               |       |       |
| Mar   |     |     |     |     |            |               |       |       |

Update this monthly to track cost trends and identify optimization opportunities.
