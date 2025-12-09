# HyreLog AWS Deployment Checklist

Quick reference checklist for deploying HyreLog to AWS.

## Pre-Deployment

-   [ ] AWS account created and configured
-   [ ] AWS CLI installed and configured (`aws configure`)
-   [ ] Domain name registered (optional)
-   [ ] Docker installed locally
-   [ ] Terraform installed (optional, for IaC)

## Phase 1: Network Infrastructure

### US Region (us-east-1)

-   [ ] VPC created (10.0.0.0/16)
-   [ ] Public subnets created (2 AZs)
-   [ ] Private subnets created (2 AZs)
-   [ ] Internet Gateway created and attached
-   [ ] NAT Gateway created
-   [ ] Route tables configured
-   [ ] Security groups created (ALB, ECS, RDS)

### EU Region (eu-west-1)

-   [ ] VPC created (10.1.0.0/16)
-   [ ] Subnets configured
-   [ ] Networking components set up

### AU Region (ap-southeast-2)

-   [ ] VPC created (10.2.0.0/16)
-   [ ] Subnets configured
-   [ ] Networking components set up

## Phase 2: Database Setup

### US Region

-   [ ] RDS subnet group created
-   [ ] RDS parameter group created
-   [ ] RDS instance created (Multi-AZ)
-   [ ] Database initialized (migrations run)
-   [ ] Region data store configured

### EU Region

-   [ ] RDS instance created
-   [ ] Database initialized

### AU Region

-   [ ] RDS instance created
-   [ ] Database initialized

## Phase 3: Storage

-   [ ] S3 buckets created (one per region)
-   [ ] S3 versioning enabled
-   [ ] S3 encryption enabled
-   [ ] S3 lifecycle policies configured (Glacier transition)
-   [ ] Glacier vaults created (if needed)

## Phase 4: Container Registry

-   [ ] ECR repositories created (api, workers)
-   [ ] Docker images built and pushed
-   [ ] Image scanning enabled

## Phase 5: Secrets Management

-   [ ] Secrets Manager secrets created:
    -   [ ] Database URLs (per region)
    -   [ ] API key secret
    -   [ ] AWS credentials
    -   [ ] S3 bucket names
    -   [ ] Other application secrets

## Phase 6: IAM Roles

-   [ ] ECS task execution role created
-   [ ] ECS task role created (S3 access)
-   [ ] EventBridge role created (for scheduled tasks)
-   [ ] Policies attached

## Phase 7: ECS Setup

### US Region

-   [ ] ECS cluster created
-   [ ] Task definitions created:
    -   [ ] API server
    -   [ ] Webhook worker
    -   [ ] Job processor worker
    -   [ ] GDPR worker
-   [ ] Application Load Balancer created
-   [ ] Target groups created
-   [ ] ECS service created
-   [ ] Auto-scaling configured

### EU & AU Regions

-   [ ] Repeat ECS setup for each region

## Phase 8: Workers

-   [ ] Worker cluster created
-   [ ] EventBridge rules created
-   [ ] Scheduled tasks configured
-   [ ] Worker services deployed

## Phase 9: Dashboard

-   [ ] Environment variables configured
-   [ ] Deployed to Vercel/Amplify
-   [ ] Custom domain configured
-   [ ] SSL certificate installed

## Phase 10: Monitoring

-   [ ] CloudWatch log groups created
-   [ ] CloudWatch alarms configured:
    -   [ ] High CPU
    -   [ ] High memory
    -   [ ] High error rate
    -   [ ] Database connection issues
-   [ ] X-Ray enabled (optional)
-   [ ] CloudWatch dashboards created

## Phase 11: DNS & CDN

-   [ ] Route 53 hosted zone created
-   [ ] DNS records configured:
    -   [ ] API endpoint (A/ALIAS)
    -   [ ] Dashboard (CNAME)
-   [ ] CloudFront distribution created (optional)
-   [ ] SSL certificates (ACM) created

## Phase 12: Security

-   [ ] Security groups reviewed
-   [ ] WAF rules configured (optional)
-   [ ] Secrets rotation enabled (optional)
-   [ ] Backup encryption verified
-   [ ] Access logging enabled

## Phase 13: Backup & DR

-   [ ] RDS automated backups enabled
-   [ ] Backup retention configured (30 days)
-   [ ] Cross-region replication configured
-   [ ] S3 cross-region replication enabled
-   [ ] Disaster recovery plan documented

## Phase 14: CI/CD

-   [ ] GitHub Actions workflow created
-   [ ] AWS credentials configured in GitHub
-   [ ] Automated deployment tested
-   [ ] Rollback procedure tested

## Phase 15: Testing

-   [ ] API health checks passing
-   [ ] Database connectivity verified
-   [ ] S3 upload/download tested
-   [ ] Workers processing jobs
-   [ ] Multi-region routing tested
-   [ ] Load testing completed
-   [ ] Failover testing completed

## Phase 16: Documentation

-   [ ] Runbook created
-   [ ] On-call procedures documented
-   [ ] Cost monitoring set up
-   [ ] Access credentials documented (securely)
-   [ ] Architecture diagram updated

## Post-Deployment

-   [ ] Monitoring dashboards reviewed
-   [ ] Alerts tested
-   [ ] Cost alerts configured
-   [ ] Team access configured
-   [ ] Documentation shared with team

## Quick Commands Reference

```bash
# Check ECS service status
aws ecs describe-services --cluster hyrelog-api-cluster --services hyrelog-api-service

# View logs
aws logs tail /ecs/hyrelog-api --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier hyrelog-us-primary

# Scale ECS service
aws ecs update-service --cluster hyrelog-api-cluster --service hyrelog-api-service --desired-count 4

# Force new deployment
aws ecs update-service --cluster hyrelog-api-cluster --service hyrelog-api-service --force-new-deployment
```
