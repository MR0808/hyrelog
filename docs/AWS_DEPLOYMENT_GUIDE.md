# HyreLog AWS Deployment Guide

Complete step-by-step guide for deploying HyreLog to AWS with multi-region support, high availability, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Services Selection](#aws-services-selection)
4. [Step 1: Network Setup](#step-1-network-setup)
5. [Step 2: Database Setup (Multi-Region)](#step-2-database-setup-multi-region)
6. [Step 3: S3 and Glacier Setup](#step-3-s3-and-glacier-setup)
7. [Step 4: API Server Deployment](#step-4-api-server-deployment)
8. [Step 5: Dashboard Deployment](#step-5-dashboard-deployment)
9. [Step 6: Workers Deployment](#step-6-workers-deployment)
10. [Step 7: Monitoring and Observability](#step-7-monitoring-and-observability)
11. [Step 8: Security and Secrets](#step-8-security-and-secrets)
12. [Step 9: CI/CD Pipeline](#step-9-cicd-pipeline)
13. [Step 10: Backup and Disaster Recovery](#step-10-backup-and-disaster-recovery)
14. [Cost Optimization](#cost-optimization)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

HyreLog consists of three main components:

1. **API Server** (Fastify/Node.js) - Main backend API
2. **Dashboard** (Next.js) - Web application
3. **Workers** (Node.js) - Background job processors

### Multi-Region Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Load Balancer                      │
│                    (Route 53 + CloudFront)                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
│   US Region   │    │   EU Region   │    │   AU Region   │
│               │    │               │    │               │
│ ┌───────────┐ │    │ ┌───────────┐ │    │ ┌───────────┐ │
│ │ API (ECS) │ │    │ │ API (ECS) │ │    │ │ API (ECS) │ │
│ └───────────┘ │    │ └───────────┘ │    │ └───────────┘ │
│       │       │    │       │       │    │       │       │
│ ┌─────▼─────┐ │    │ ┌─────▼─────┐ │    │ ┌─────▼─────┐ │
│ │ RDS (US)  │ │    │ │ RDS (EU)  │ │    │ │ RDS (AU)  │ │
│ └───────────┘ │    │ └───────────┘ │    │ └───────────┘ │
│               │    │               │    │               │
│ ┌───────────┐ │    │ ┌───────────┐ │    │ ┌───────────┐ │
│ │ Workers   │ │    │ │ Workers   │ │    │ │ Workers   │ │
│ │ (ECS)     │ │    │ │ (ECS)     │ │    │ │ (ECS)     │ │
│ └───────────┘ │    │ └───────────┘ │    │ └───────────┘ │
└───────────────┘    └───────────────┘    └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │   Global Services     │
                │                       │
                │  ┌─────────────────┐ │
                │  │ S3 (Archival)   │ │
                │  └─────────────────┘ │
                │  ┌─────────────────┐ │
                │  │ Glacier (Cold)  │ │
                │  └─────────────────┘ │
                │  ┌─────────────────┐ │
                │  │ Secrets Manager│ │
                │  └─────────────────┘ │
                │  ┌─────────────────┐ │
                │  │ CloudWatch      │ │
                │  └─────────────────┘ │
                └───────────────────────┘
```

---

## Prerequisites

-   AWS Account with appropriate permissions
-   AWS CLI installed and configured
-   Terraform (optional, for infrastructure as code)
-   Docker installed locally
-   Node.js 22+ installed
-   Domain name (optional but recommended)

---

## AWS Services Selection

### Core Services

| Component          | AWS Service                     | Why                                                       |
| ------------------ | ------------------------------- | --------------------------------------------------------- |
| **API Server**     | ECS Fargate                     | Serverless containers, auto-scaling, no server management |
| **Dashboard**      | Vercel (recommended) or Amplify | Best Next.js deployment experience                        |
| **Database**       | RDS PostgreSQL (Multi-AZ)       | Managed PostgreSQL with automated backups                 |
| **Workers**        | ECS Fargate (Scheduled Tasks)   | Background job processing                                 |
| **Storage**        | S3 + Glacier                    | Hot and cold archival storage                             |
| **CDN**            | CloudFront                      | Global content delivery                                   |
| **DNS**            | Route 53                        | Domain management and health checks                       |
| **Secrets**        | Secrets Manager                 | Secure credential storage                                 |
| **Monitoring**     | CloudWatch + X-Ray              | Logging, metrics, and tracing                             |
| **Load Balancing** | Application Load Balancer       | Multi-region routing                                      |

### Alternative Options

-   **API Server**: Could use Lambda + API Gateway for serverless (higher cold start latency)
-   **Database**: Could use Aurora Serverless v2 for auto-scaling
-   **Workers**: Could use EventBridge + Lambda for event-driven processing

---

## Step 1: Network Setup

### 1.1 Create VPCs for Each Region

For each region (US, EU, AU, APAC), create a VPC:

```bash
# US Region (us-east-1)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region us-east-1 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=hyrelog-us-vpc}]'

# EU Region (eu-west-1)
aws ec2 create-vpc --cidr-block 10.1.0.0/16 --region eu-west-1  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=hyrelog-eu-vpc}]'

# AU Region (ap-southeast-2)
aws ec2 create-vpc --cidr-block 10.2.0.0/16  --region ap-southeast-2 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=hyrelog-au-vpc}]'
```

### 1.2 Create Subnets

For each VPC, create public and private subnets across multiple availability zones:

```bash
# US Region - Public Subnets
aws ec2 create-subnet --vpc-id vpc-0fc7141262b1f8093 --cidr-block 10.0.1.0/24 --availability-zone us-east-1a  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-public-1a}]'

aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-public-1b}]'

# US Region - Private Subnets (for RDS)
aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-private-1a}]'

aws ec2 create-subnet \
  --vpc-id <vpc-id> \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-private-1b}]'
```

Repeat for EU and AU regions.

### 1.3 Create Internet Gateway and NAT Gateway

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway --region us-east-1 --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-us-igw}]'

# Attach to VPC
# US
aws ec2 attach-internet-gateway  --internet-gateway-id igw-00d3c2d0f5cb0b775  --vpc-id vpc-0fc7141262b1f8093

# Create NAT Gateway (for private subnet access)
# Step 1: Allocate Elastic IP (note the AllocationId from the response)
aws ec2 allocate-address \
  --domain vpc \
  --region us-east-1 \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-us-nat-eip}]'

# Step 2: Get your public subnet ID (from subnet creation output or query subnets)
# aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Type,Values=Public" --region us-east-1 --query 'Subnets[0].SubnetId' --output text

# Step 3: Create NAT Gateway (replace <public-subnet-id> and <eip-allocation-id> with actual values)
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-id> \
  --allocation-id <eip-allocation-id> \
  --region us-east-1 \
  --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=hyrelog-us-nat}]'

# See AWS_NAT_GATEWAY_SETUP.md for detailed instructions on getting these IDs
```

### 1.4 Configure Route Tables

```bash
# Public route table
aws ec2 create-route-table --vpc-id <vpc-id>
aws ec2 create-route \
  --route-table-id <rt-id> \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id <igw-id>

# Private route table
aws ec2 create-route-table --vpc-id <vpc-id>
aws ec2 create-route \
  --route-table-id <rt-id> \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id <nat-id>
```

---

## Step 2: Database Setup (Multi-Region)

### 2.1 Create RDS Subnet Groups

```bash
# US Region
aws rds create-db-subnet-group   --db-subnet-group-name hyrelog-us-subnet-group   --db-subnet-group-description "HyreLog US Subnet Group"   --subnet-ids subnet-09312f31c201b0383 subnet-0332ebd18eaecdd8c   --region us-east-1

# EU Region
aws rds create-db-subnet-group   --db-subnet-group-name hyrelog-eu-subnet-group   --db-subnet-group-description "HyreLog EU Subnet Group"   --subnet-ids subnet-06d22722484ded3bf subnet-0dae120db0af29e3a   --region eu-west-1

# AU Region
aws rds create-db-subnet-group   --db-subnet-group-name hyrelog-au-subnet-group   --db-subnet-group-description "HyreLog AU Subnet Group"   --subnet-ids subnet-081f7ddb5dced06d8 subnet-03ac2eafa16be8e43  --region ap-southeast-2
```

### 2.2 Create RDS Parameter Groups

**Yes, you need a parameter group in each region.** RDS parameter groups are region-specific resources, so each RDS instance must use a parameter group in its own region.

**US Region:**

```bash
# Create parameter group
aws rds create-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --db-parameter-group-family postgres16   --description "HyreLog PostgreSQL 16 optimized parameters"   --region us-east-1

# Set parameters for performance
aws rds modify-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --parameters "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory*1/4},ApplyMethod=immediate"   --region us-east-1
```

**EU Region:**

```bash
# Create parameter group
aws rds create-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --db-parameter-group-family postgres16   --description "HyreLog PostgreSQL 16 optimized parameters"   --region eu-west-1

# Set parameters for performance
aws rds modify-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --parameters "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory*1/4},ApplyMethod=immediate"   --region eu-west-1
```

**AU Region:**

```bash
# Create parameter group
aws rds create-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --db-parameter-group-family postgres16   --description "HyreLog PostgreSQL 16 optimized parameters"   --region ap-southeast-2

# Set parameters for performance
aws rds modify-db-parameter-group   --db-parameter-group-name hyrelog-postgres-16   --parameters "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory*1/4},ApplyMethod=immediate"   --region ap-southeast-2
```

### 2.3 Create RDS Security Groups

**You need a security group in each region.** Security groups are region-specific and control network access to your RDS instances.

**Important:** Create these security groups BEFORE creating your RDS instances. Each security group should allow inbound PostgreSQL traffic (port 5432) only from your ECS tasks (or other trusted sources).

**US Region:**

```bash
# Create RDS security group
aws ec2 create-security-group   --group-name hyrelog-rds-sg   --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks"   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1

# Note the GroupId from the response (e.g., sg-0abc123def4567890)
# You'll need this for the RDS instance creation

# Allow PostgreSQL (port 5432) from ECS security group
# First, create/get your ECS security group ID, then:
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-sg-id> \
  --region us-east-1

# If you don't have ECS security group yet, you can temporarily allow from VPC CIDR
# (Replace with your VPC CIDR, e.g., 10.0.0.0/16)
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16 \
  --region us-east-1
```

**EU Region:**

```bash
# Create RDS security group
aws ec2 create-security-group \
  --group-name hyrelog-rds-sg \
  --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks" \
  --vpc-id vpc-06404ab993eb25b4e \
  --region eu-west-1

# Allow PostgreSQL from ECS security group or VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-sg-id> \
  --region eu-west-1

# OR temporarily from VPC CIDR (replace with your EU VPC CIDR)
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr 10.1.0.0/16 \
  --region eu-west-1
```

**AU Region:**

```bash
# Create RDS security group
aws ec2 create-security-group \
  --group-name hyrelog-rds-sg \
  --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks" \
  --vpc-id vpc-0c7fbef001ab8097b \
  --region ap-southeast-2

# Allow PostgreSQL from ECS security group or VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-sg-id> \
  --region ap-southeast-2

# OR temporarily from VPC CIDR (replace with your AU VPC CIDR)
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --cidr 10.2.0.0/16 \
  --region ap-southeast-2
```

**To get your security group ID after creation:**

```bash
# US Region
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-0fc7141262b1f8093" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# EU Region
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# AU Region
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

### 2.4 Store Database Passwords in Secrets Manager

**Best Practice: Use different passwords for each region** and store them in AWS Secrets Manager for security.

```bash
# US Region - Generate a secure password and store it
aws secretsmanager create-secret   --name hyrelog/database/us/password   --description "HyreLog US RDS master password"   --secret-string "AKn58fAsiYyCd8Ersq36"   --region us-east-1

# EU Region
aws secretsmanager create-secret   --name hyrelog/database/eu/password   --description "HyreLog EU RDS master password"   --secret-string "MnAYm3FBtkSMT6Az9Xmo"   --region eu-west-1

# AU Region
aws secretsmanager create-secret   --name hyrelog/database/au/password   --description "HyreLog AU RDS master password"   --secret-string "kYEkcbpthmYa3kEM8p6H"   --region ap-southeast-2
```

**To retrieve passwords later:**

```bash
aws secretsmanager get-secret-value \
  --secret-id hyrelog/database/us/password \
  --region us-east-1 \
  --query 'SecretString' \
  --output text
```

**Note:** You can use the same password for all regions if you prefer, but using different passwords provides better security isolation. If one region is compromised, the others remain secure.

### 2.5 Create RDS Instances

**Note:** Before creating RDS instances, check available PostgreSQL versions in your region:

```bash
# Check available PostgreSQL 16 versions
aws rds describe-db-engine-versions \
  --engine postgres \
  --query 'DBEngineVersions[?starts_with(EngineVersion, `16`)].EngineVersion' \
  --output table \
  --region us-east-1
```

**Available PostgreSQL 16 versions (as of 2024):** 16.2, 16.3, 16.4, 16.6

**US Region (Primary):**

```bash
# Get the password from Secrets Manager (or use your secure password directly)
# PASSWORD=$(aws secretsmanager get-secret-value --secret-id hyrelog/database/us/password --region us-east-1 --query 'SecretString' --output text)

aws rds create-db-instance   --db-instance-identifier hyrelog-us-primary   --db-instance-class db.t4g.medium   --engine postgres   --engine-version 16.6   --master-username postgres   --master-user-password AKn58fAsiYyCd8Ersq36  --allocated-storage 100   --storage-type gp3   --storage-encrypted   --db-subnet-group-name hyrelog-us-subnet-group  --db-parameter-group-name hyrelog-postgres-16   --vpc-security-group-ids sg-0c0c2f73a69ad62da   --backup-retention-period 7   --multi-az   --no-publicly-accessible   --region us-east-1   --tags Key=Name,Value=hyrelog-us-db Key=Environment,Value=production
```

**EU Region:**

```bash
aws rds create-db-instance  --db-instance-identifier hyrelog-eu-primary   --db-instance-class db.t4g.medium   --engine postgres   --engine-version 16.6   --master-username postgres   --master-user-password MnAYm3FBtkSMT6Az9Xmo   --allocated-storage 100   --storage-type gp3   --storage-encrypted   --db-subnet-group-name hyrelog-eu-subnet-group   --db-parameter-group-name hyrelog-postgres-16   --vpc-security-group-ids sg-03f7019bb0e6997f8 --backup-retention-period 7   --multi-az   --no-publicly-accessible   --region eu-west-1   --tags Key=Name,Value=hyrelog-eu-db Key=Environment,Value=production
```

**AU Region:**

```bash
aws rds create-db-instance   --db-instance-identifier hyrelog-au-primary   --db-instance-class db.t4g.medium   --engine postgres   --engine-version 16.6   --master-username postgres   --master-user-password kYEkcbpthmYa3kEM8p6H   --allocated-storage 100   --storage-type gp3   --storage-encrypted   --db-subnet-group-name hyrelog-au-subnet-group   --db-parameter-group-name hyrelog-postgres-16   --vpc-security-group-ids sg-06321e272f2784e81  --backup-retention-period 7   --multi-az   --no-publicly-accessible   --region ap-southeast-2   --tags Key=Name,Value=hyrelog-au-db Key=Environment,Value=production
```

### 2.6 Check RDS Instance Status

After creating RDS instances, they take **10-20 minutes** to become available. Check the status:

```bash
# Check US RDS instance status
aws rds describe-db-instances  --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,Endpoint.Port]'   --region us-east-1   --output table

# Check EU RDS instance status
aws rds describe-db-instances   --db-instance-identifier hyrelog-eu-primary   --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,Endpoint.Port]'   --region eu-west-1   --output table

# Check AU RDS instance status
aws rds describe-db-instances   --db-instance-identifier hyrelog-au-primary   --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,Endpoint.Port]'   --region ap-southeast-2   --output table
```

**RDS Instance States:**

-   `creating` - Instance is being created (endpoint will be null)
-   `available` - Instance is ready (endpoint is available)
-   `backing-up` - Instance is backing up
-   `modifying` - Instance is being modified

**Get endpoint only when status is 'available':**

```bash
# US Region
aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].Endpoint.Address'   --region us-east-1   --output text

hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com

# EU Region
aws rds describe-db-instances   --db-instance-identifier hyrelog-eu-primary   --query 'DBInstances[0].Endpoint.Address'   --region eu-west-1   --output text

hyrelog-eu-primary.cdgc22yu8v5w.eu-west-1.rds.amazonaws.com

# AU Region
aws rds describe-db-instances   --db-instance-identifier hyrelog-au-primary   --query 'DBInstances[0].Endpoint.Address'   --region ap-southeast-2   --output text

hyrelog-au-primary.c9umosqssoce.ap-southeast-2.rds.amazonaws.com
```

**If endpoint is null:** The instance is still being created. Wait 10-20 minutes and check again.

### 2.7 Connect to RDS for Initial Setup

**Important:** Your RDS instances are in private subnets and not publicly accessible. You cannot connect directly from your local machine. Here are your options:

#### Option 1: Use AWS Systems Manager Session Manager (Recommended)

This allows you to port-forward through an EC2 instance or ECS task without a bastion host.

**Step 1: Get your EC2 instance ID (if you have one)**

```bash
# List all EC2 instances in US region
aws ec2 describe-instances   --region us-east-1   --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PrivateIpAddress,Tags[?Key==`Name`].Value|[0]]'   --output table

# List instances in a specific VPC
aws ec2 describe-instances   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093"   --region us-east-1   --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PrivateIpAddress,Tags[?Key==`Name`].Value|[0]]'   --output table

# Get just the instance IDs
aws ec2 describe-instances \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=instance-state-name,Values=running" \
  --region us-east-1 \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text
```

**If you don't have an EC2 instance, create a temporary one:**

```bash
# Create a temporary EC2 instance for port forwarding
# First, get a subnet ID (use a private subnet)
SUBNET_ID=$(aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-private-1a"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text)

# Get the default security group for the VPC (or use your ECS security group)
SG_ID=$(aws ec2 describe-security-groups   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=group-name,Values=hyrelog-ecs-sg"   --region us-east-1   --query 'SecurityGroups[0].GroupId'   --output text)

# Create a small EC2 instance (t3.micro is free tier eligible)
aws ec2 run-instances   --image-id ami-0c55b159cbfafe1f0   --instance-type t3.micro   --subnet-id subnet-09312f31c201b0383   --security-group-ids sg-0699928176594ff63   --iam-instance-profile Name=SSMInstanceProfile  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=hyrelog-temp-port-forward}]'   --region us-east-1

# Note the InstanceId from the response
```

**Important:** The EC2 instance needs an IAM role with SSM permissions. If you don't have one, use Option 2 instead.

**Step 2: Use port forwarding with Session Manager:**

```bash
# Port forward through an EC2 instance (replace with your instance ID)
aws ssm start-session \
  --target <ec2-instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --region us-east-1
```

Then connect to `localhost:5432` from your local machine.

#### Option 2: Temporarily Make RDS Publicly Accessible (For Initial Setup Only)

**⚠️ Security Warning:** Only use this for initial setup. Make it private again after migrations.

**Prerequisites:** Your VPC must have DNS resolution and DNS hostnames enabled.

**Step 1: Enable DNS resolution and DNS hostnames on your VPC:**

```bash
# Enable DNS resolution
aws ec2 modify-vpc-attribute   --vpc-id vpc-0fc7141262b1f8093   --enable-dns-support   --region us-east-1

# Enable DNS hostnames
aws ec2 modify-vpc-attribute   --vpc-id vpc-0fc7141262b1f8093   --enable-dns-hostnames   --region us-east-1

# Verify the settin
aws ec2 describe-vpcs   --vpc-ids vpc-0fc7141262b1f8093   --query 'Vpcs[0].[EnableDnsSupport,EnableDnsHostnames]'   --region us-east-1   --output table
```

**Step 2: Make RDS publicly accessible:**

```bash
# Make RDS publicly accessible
aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --publicly-accessible   --apply-immediately   --region us-east-1

# Wait for modification to complete (check status)
aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].PubliclyAccessible'   --region us-east-1   --output text

aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].[DBInstanceStatus,PubliclyAccessible,Endpoint.Address]'   --region us-east-1   --output table

aws ec2 describe-security-groups   --group-ids sg-0c0c2f73a69ad62da   --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]'   --region us-east-1   --output json

aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].VpcSecurityGroups[*].VpcSecurityGroupId'   --region us-east-1   --output text

# After migrations, make it private again
aws rds modify-db-instance \
  --db-instance-identifier hyrelog-us-primary \
  --no-publicly-accessible \
  --apply-immediately \
  --region us-east-1
```

**Important:** You'll also need to update the RDS security group to allow your IP address:

```bash
# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Add your IP to RDS security group (replace sg-xxx with your RDS security group ID)
aws ec2 authorize-security-group-ingress   --group-id sg-0c0c2f73a69ad62da   --protocol tcp   --port 5432   --cidr 122.150.191.208/32   --region us-east-1

# After migrations, remove your IP
aws ec2 revoke-security-group-ingress   --group-id sg-0c0c2f73a69ad62da   --protocol tcp   --port 5432   --cidr $150.191.208/32   --region us-east-1
```

aws rds describe-db-instances --db-instance-identifier hyrelog-us-primary --query 'DBInstances[0].[DBInstanceStatus,PubliclyAccessible,Endpoint.Address]' --region us-east-1 --output table

aws rds describe-db-instances --db-instance-identifier hyrelog-us-primary --query 'DBInstances[0].DBSubnetGroup.Subnets[*].[SubnetIdentifier,SubnetStatus]' --region us-east-1 --output table

**Troubleshooting Connection Issues:**

If `Test-NetConnection` fails, check the following:

**1. Check Windows Firewall:**

```powershell
# Check if Windows Firewall is blocking outbound connections
Get-NetFirewallRule -Direction Outbound -Action Block | Where-Object {$_.Enabled -eq $true}

# Temporarily disable Windows Firewall to test (re-enable after!)
netsh advfirewall set allprofiles state off

# Test connection again
Test-NetConnection -ComputerName hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com -Port 5432

# Re-enable firewall
netsh advfirewall set allprofiles state on
```

**2. If using a hotspot, add the hotspot IP to security group:**

```bash
# Get your current IP (from hotspot)
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "Your current IP: $MY_IP"

# Add it to the security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0c0c2f73a69ad62da \
  --protocol tcp \
  --port 5432 \
  --cidr ${MY_IP}/32 \
  --region us-east-1
```

**3. Check Network ACLs (less common but possible):**

```bash
# Get the subnet IDs
SUBNET_1=subnet-09312f31c201b0383
SUBNET_2=subnet-0332ebd18eaecdd8c

# Check Network ACLs for both subnets
aws ec2 describe-network-acls   --filters "Name=association.subnet-id,Values=subnet-0332ebd18eaecdd8c"   --region us-east-1   --query 'NetworkAcls[*].Entries[?PortRange.FromPort==`5432` || PortRange.ToPort==`5432` || (PortRange.FromPort==`null` && Egress==`false`)]'   --output json
```

**4. Verify RDS is actually reachable (test from AWS CloudShell):**

If you have AWS CloudShell access, test from there:

-   Go to AWS Console → CloudShell
-   Run: `nc -zv hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com 5432`

**5. Check if RDS endpoint resolves correctly:**

```powershell
# Test DNS resolution
Resolve-DnsName hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com

# Try pinging (ICMP might be blocked, but DNS should work)
Test-Connection hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com
```

**6. Common issue: RDS in private subnets with public accessibility**

Even though RDS shows `PubliclyAccessible: True`, if it's in private subnets, it might not actually be reachable. Check if the subnets have Internet Gateway routes:

```bash
# Check route tables for the subnets
aws ec2 describe-route-tables  --filters "Name=association.subnet-id,Values=subnet-09312f31c201b0383"   --region us-east-1   --query 'RouteTables[*].Routes[*].[DestinationCidrBlock,GatewayId]'   --output table

aws ec2 describe-route-tables  --filters "Name=association.subnet-id,Values=subnet-0332ebd18eaecdd8c"   --region us-east-1   --query 'RouteTables[*].Routes[*].[DestinationCidrBlock,GatewayId]'   --output table


aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1a"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
subnet-0fa17a1bc2c93bad6

aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1b"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
subnet-060fbe383eb77f162

aws rds create-db-subnet-group   --db-subnet-group-name hyrelog-us-subnet-group-public   --db-subnet-group-description "HyreLog US Public Subnet Group for migrations"   --subnet-ids subnet-0fa17a1bc2c93bad6 subnet-060fbe383eb77f162   --region us-east-1

aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --db-subnet-group-name hyrelog-us-subnet-group-public   --apply-immediately   --region us-east-1

aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --no-multi-az   --apply-immediately   --region us-east-1

aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].[DBInstanceStatus,MultiAZ]'   --region us-east-1   --output table

aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --db-subnet-group-name hyrelog-us-subnet-group-public   --apply-immediately   --region us-east-1


aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --db-subnet-group-name hyrelog-us-subnet-group   --apply-immediately   --region us-east-1

aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --multi-az   --apply-immediately   --region us-east-1

aws rds modify-db-instance   --db-instance-identifier hyrelog-us-primary   --no-publicly-accessible   --apply-immediately   --region us-east-1

aws ec2 revoke-security-group-ingress   --group-id sg-0c0c2f73a69ad62da   --protocol tcp   --port 5432   --cidr 122.150.191.208/32   --region us-east-1


aws rds delete-db-subnet-group   --db-subnet-group-name hyrelog-us-subnet-group-public   --region us-east-1

aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].[DBInstanceStatus,MultiAZ,PubliclyAccessible,DBSubnetGroup.DBSubnetGroupName]'   --region us-east-1   --output table
```

**Revert to Original State:**

If you need to revert everything back to the original state:

```bash
# Step 1: Change back to original private subnet group
aws rds modify-db-instance \
  --db-instance-identifier hyrelog-us-primary \
  --db-subnet-group-name hyrelog-us-subnet-group \
  --apply-immediately \
  --region us-east-1

# Step 2: Wait for modification to complete
aws rds describe-db-instances \
  --db-instance-identifier hyrelog-us-primary \
  --query 'DBInstances[0].[DBInstanceStatus,DBSubnetGroup.DBSubnetGroupName]' \
  --region us-east-1 \
  --output table

# Step 3: Re-enable Multi-AZ
aws rds modify-db-instance \
  --db-instance-identifier hyrelog-us-primary \
  --multi-az \
  --apply-immediately \
  --region us-east-1

# Step 4: Make RDS private again (if it's still public)
aws rds modify-db-instance \
  --db-instance-identifier hyrelog-us-primary \
  --no-publicly-accessible \
  --apply-immediately \
  --region us-east-1

# Step 5: (Optional) Delete the temporary public subnet group
aws rds delete-db-subnet-group \
  --db-subnet-group-name hyrelog-us-subnet-group-public \
  --region us-east-1

# Step 6: Remove your IP from security group
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 revoke-security-group-ingress \
  --group-id sg-0c0c2f73a69ad62da \
  --protocol tcp \
  --port 5432 \
  --cidr ${MY_IP}/32 \
  --region us-east-1
```

If there's no route to `0.0.0.0/0` with an Internet Gateway, the RDS won't be reachable from the internet even if marked as publicly accessible.

#### Option 3: Run Migrations from ECS Task (Production Approach)

Create a one-time ECS task to run migrations:

```bash
# Create a task definition for migrations
aws ecs register-task-definition \
  --family hyrelog-migrations \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 \
  --memory 512 \
  --execution-role-arn <ecs-execution-role-arn> \
  --task-role-arn <ecs-task-role-arn> \
  --container-definitions '[
    {
      "name": "migrations",
      "image": "<your-image>",
      "command": ["npx", "prisma", "migrate", "deploy"],
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql://postgres:PASSWORD@hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hyrelog-migrations",
          "awslogs-region": "us-east-1"
        }
      }
    }
  ]' \
  --region us-east-1

# Run the task
aws ecs run-task \
  --cluster <your-cluster> \
  --task-definition hyrelog-migrations \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-subnet-ids>],securityGroups=[<ecs-sg-id>],assignPublicIp=DISABLED}" \
  --region us-east-1
```

### 2.8 Initialize Databases

Once you have connectivity to RDS (using one of the options above), connect and initialize:

```bash
# Get connection endpoint
aws rds describe-db-instances   --db-instance-identifier hyrelog-us-primary   --query 'DBInstances[0].Endpoint.Address'   --region us-east-1

# Connect and run migrations
export DATABASE_URL="postgresql://postgres:PASSWORD@ENDPOINT:5432/hyrelog?sslmode=require"
cd hyrelog
npx prisma migrate deploy
npx prisma db seed
```

### 2.5 Configure Region Data Store

Insert region configuration into the primary database:

```sql
-- In the primary US database
INSERT INTO "RegionDataStore" (region, "dbUrl", "readOnlyUrl", "coldStorageProvider", "coldStorageBucket", "createdAt", "updatedAt")
VALUES
  ('US', 'postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require', NULL, 'aws', 'hyrelog-archival-us', NOW(), NOW()),
  ('EU', 'postgresql://postgres:PASSWORD@hyrelog-eu-primary.xxxxx.eu-west-1.rds.amazonaws.com:5432/hyrelog?sslmode=require', NULL, 'aws', 'hyrelog-archival-eu', NOW(), NOW()),
  ('AU', 'postgresql://postgres:PASSWORD@hyrelog-au-primary.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/hyrelog?sslmode=require', NULL, 'aws', 'hyrelog-archival-au', NOW(), NOW()),
  ('APAC', 'postgresql://postgres:PASSWORD@hyrelog-au-primary.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/hyrelog?sslmode=require', NULL, 'aws', 'hyrelog-archival-au', NOW(), NOW());
```

---

## Step 3: S3 and Glacier Setup

### 3.1 Create S3 Buckets for Archival

```bash
# US Region
aws s3api create-bucket \
  --bucket hyrelog-archival-us \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1

# EU Region
aws s3api create-bucket \
  --bucket hyrelog-archival-eu \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# AU Region
aws s3api create-bucket \
  --bucket hyrelog-archival-au \
  --region ap-southeast-2 \
  --create-bucket-configuration LocationConstraint=ap-southeast-2
```

### 3.2 Configure S3 Lifecycle Policies

Create lifecycle policies to move old data to Glacier:

```json
{
    "Rules": [
        {
            "Id": "MoveToGlacierAfter90Days",
            "Status": "Enabled",
            "Transitions": [
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 180,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ]
        }
    ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket hyrelog-archival-us \
  --lifecycle-configuration file://lifecycle-policy.json
```

### 3.3 Enable Versioning and Encryption

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hyrelog-archival-us \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket hyrelog-archival-us \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

---

## Step 4: API Server Deployment

### 4.1 Create ECR Repositories

```bash
# Create ECR repository for API
aws ecr create-repository \
  --repository-name hyrelog-api \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### 4.2 Build and Push Docker Image

Create `Dockerfile` in `hyrelog/`:

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 4040

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4040/internal/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
```

Build and push:

```bash
cd hyrelog
docker build -t hyrelog-api:latest .
docker tag hyrelog-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/hyrelog-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/hyrelog-api:latest
```

### 4.3 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name hyrelog-api-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 capacityProvider=FARGATE_SPOT,weight=1 \
  --region us-east-1
```

### 4.4 Create Task Definition

Create `task-definition.json`:

```json
{
    "family": "hyrelog-api",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "1024",
    "memory": "2048",
    "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskRole",
    "containerDefinitions": [
        {
            "name": "hyrelog-api",
            "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/hyrelog-api:latest",
            "portMappings": [
                {
                    "containerPort": 4040,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "production"
                },
                {
                    "name": "PORT",
                    "value": "4040"
                }
            ],
            "secrets": [
                {
                    "name": "DATABASE_URL",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/database/us:url::"
                },
                {
                    "name": "API_KEY_SECRET",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/api-key-secret::"
                },
                {
                    "name": "AWS_ACCESS_KEY_ID",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/aws/access-key-id::"
                },
                {
                    "name": "AWS_SECRET_ACCESS_KEY",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/aws/secret-access-key::"
                },
                {
                    "name": "AWS_S3_BUCKET",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/aws/s3-bucket::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/hyrelog-api",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": [
                    "CMD-SHELL",
                    "wget --no-verbose --tries=1 --spider http://localhost:4040/internal/health || exit 1"
                ],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
```

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

### 4.5 Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name hyrelog-api-alb \
  --subnets <public-subnet-1a> <public-subnet-1b> \
  --security-groups <alb-security-group-id> \
  --scheme internet-facing \
  --type application \
  --region us-east-1

# Create target group
aws elbv2 create-target-group \
  --name hyrelog-api-tg \
  --protocol HTTP \
  --port 4040 \
  --vpc-id <vpc-id> \
  --target-type ip \
  --health-check-path /internal/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn> \
  --region us-east-1
```

### 4.6 Create ECS Service

```bash
aws ecs create-service \
  --cluster hyrelog-api-cluster \
  --service-name hyrelog-api-service \
  --task-definition hyrelog-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-subnet-1a>,<private-subnet-1b>],securityGroups=[<ecs-security-group-id>],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=<target-group-arn>,containerName=hyrelog-api,containerPort=4040 \
  --enable-execute-command \
  --region us-east-1
```

### 4.7 Configure Auto-Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/hyrelog-api-cluster/hyrelog-api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/hyrelog-api-cluster/hyrelog-api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name hyrelog-api-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region us-east-1
```

Repeat Steps 4.1-4.7 for EU and AU regions.

---

## Step 5: Dashboard Deployment

### Option A: Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

**Environment Variables:**

```
DATABASE_URL=<primary-database-url>
NEXT_PUBLIC_APP_URL=https://dashboard.hyrelog.com
BETTER_AUTH_SECRET=<secret>
RESEND_API_KEY=<resend-key>
STRIPE_SECRET_KEY=<stripe-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
```

### Option B: AWS Amplify

```bash
# Create Amplify app
aws amplify create-app \
  --name hyrelog-dashboard \
  --repository <github-repo-url> \
  --platform WEB \
  --environment-variables DATABASE_URL=<url>,NEXT_PUBLIC_APP_URL=https://dashboard.hyrelog.com

# Create branch
aws amplify create-branch \
  --app-id <app-id> \
  --branch-name main \
  --enable-auto-build
```

---

## Step 6: Workers Deployment

### 6.1 Create Worker Task Definitions

Create separate task definitions for each worker type:

**Webhook Worker:**

```json
{
    "family": "hyrelog-webhook-worker",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "containerDefinitions": [
        {
            "name": "webhook-worker",
            "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/hyrelog-api:latest",
            "command": ["node", "dist/workers/webhookWorker.js"],
            "secrets": [
                {
                    "name": "DATABASE_URL",
                    "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:hyrelog/database/us:url::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/hyrelog-workers",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "webhook-worker"
                }
            }
        }
    ]
}
```

### 6.2 Create Scheduled Tasks (EventBridge)

```bash
# Create EventBridge rule for webhook worker
aws events put-rule \
  --name hyrelog-webhook-worker-schedule \
  --schedule-expression "rate(1 minute)" \
  --state ENABLED \
  --region us-east-1

# Add ECS task as target
aws events put-targets \
  --rule hyrelog-webhook-worker-schedule \
  --targets "Id"="1","Arn"="arn:aws:ecs:us-east-1:<account-id>:cluster/hyrelog-workers-cluster","RoleArn"="arn:aws:iam::<account-id>:role/ecsEventsRole","EcsParameters"="{\"TaskDefinitionArn\":\"arn:aws:ecs:us-east-1:<account-id>:task-definition/hyrelog-webhook-worker:1\",\"LaunchType\":\"FARGATE\",\"NetworkConfiguration\":{\"awsvpcConfiguration\":{\"Subnets\":[\"<subnet-id>\"],\"SecurityGroups\":[\"<sg-id>\"],\"AssignPublicIp\":\"DISABLED\"}}}"
```

---

## Step 7: Monitoring and Observability

### 7.1 CloudWatch Log Groups

```bash
# Create log groups
aws logs create-log-group \
  --log-group-name /ecs/hyrelog-api \
  --region us-east-1

aws logs create-log-group \
  --log-group-name /ecs/hyrelog-workers \
  --region us-east-1
```

### 7.2 CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name hyrelog-api-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=hyrelog-api-service Name=ClusterName,Value=hyrelog-api-cluster \
  --region us-east-1

# High error rate alarm
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
  --region us-east-1
```

### 7.3 AWS X-Ray Integration

Enable X-Ray in your ECS task definition:

```json
{
    "containerDefinitions": [
        {
            "name": "xray-daemon",
            "image": "amazon/aws-xray-daemon:latest",
            "essential": true,
            "cpu": 32,
            "memoryReservation": 256,
            "portMappings": [
                {
                    "containerPort": 2000,
                    "protocol": "udp"
                }
            ]
        }
    ]
}
```

---

## Step 8: Security and Secrets

### 8.1 Create IAM Roles

**ECS Task Execution Role:**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "*"
        }
    ]
}
```

**ECS Task Role (for S3 access):**

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "glacier:InitiateJob",
                "glacier:DescribeJob"
            ],
            "Resource": [
                "arn:aws:s3:::hyrelog-archival-*/*",
                "arn:aws:glacier:*:*:vaults/hyrelog-*"
            ]
        }
    ]
}
```

### 8.2 Store Secrets in Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name hyrelog/database/us/url \
  --secret-string "postgresql://postgres:PASSWORD@ENDPOINT:5432/hyrelog?sslmode=require" \
  --region us-east-1

# API Key Secret
aws secretsmanager create-secret \
  --name hyrelog/api-key-secret \
  --secret-string "<generate-64-char-secret>" \
  --region us-east-1

# AWS Credentials
aws secretsmanager create-secret \
  --name hyrelog/aws/access-key-id \
  --secret-string "<access-key>" \
  --region us-east-1

aws secretsmanager create-secret \
  --name hyrelog/aws/secret-access-key \
  --secret-string "<secret-key>" \
  --region us-east-1
```

### 8.3 Security Groups

```bash
# ALB Security Group (allow HTTP/HTTPS from internet)
aws ec2 create-security-group \
  --group-name hyrelog-alb-sg \
  --description "Security group for HyreLog ALB" \
  --vpc-id <vpc-id>

aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id <alb-sg-id> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# ECS Security Group (allow from ALB only)
aws ec2 create-security-group \
  --group-name hyrelog-ecs-sg \
  --description "Security group for HyreLog ECS tasks" \
  --vpc-id <vpc-id>

aws ec2 authorize-security-group-ingress \
  --group-id <ecs-sg-id> \
  --protocol tcp \
  --port 4040 \
  --source-group <alb-sg-id>

# RDS Security Group
# NOTE: RDS security groups should already be created in Step 2.3 (Database Setup)
# If you need to create additional RDS security groups or modify existing ones:

aws ec2 create-security-group \
  --group-name hyrelog-rds-sg \
  --description "Security group for HyreLog RDS" \
  --vpc-id <vpc-id> \
  --region <region>

aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source-group <ecs-sg-id> \
  --region <region>
```

---

## Step 9: CI/CD Pipeline

### 9.1 GitHub Actions Workflow

Create `.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API to AWS

on:
    push:
        branches: [main]
        paths:
            - 'hyrelog/**'

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Configure AWS credentials
              uses: aws-actions/configure-aws-credentials@v2
              with:
                  aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
                  aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
                  aws-region: us-east-1

            - name: Login to Amazon ECR
              id: login-ecr
              uses: aws-actions/amazon-ecr-login@v1

            - name: Build and push Docker image
              env:
                  ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
                  ECR_REPOSITORY: hyrelog-api
                  IMAGE_TAG: ${{ github.sha }}
              run: |
                  cd hyrelog
                  docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
                  docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
                  docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
                  docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

            - name: Update ECS service
              run: |
                  aws ecs update-service \
                    --cluster hyrelog-api-cluster \
                    --service hyrelog-api-service \
                    --force-new-deployment \
                    --region us-east-1
```

---

## Step 10: Backup and Disaster Recovery

### 10.1 Automated RDS Backups

RDS automatically creates daily backups. Configure snapshot retention:

```bash
aws rds modify-db-instance \
  --db-instance-identifier hyrelog-us-primary \
  --backup-retention-period 30 \
  --copy-tags-to-snapshot \
  --region us-east-1
```

### 10.2 Cross-Region Replication

```bash
# Create read replica in another region
aws rds create-db-instance-read-replica \
  --db-instance-identifier hyrelog-us-replica-eu \
  --source-db-instance-identifier hyrelog-us-primary \
  --db-instance-class db.t4g.medium \
  --region eu-west-1
```

### 10.3 S3 Cross-Region Replication

```bash
# Enable replication
aws s3api put-bucket-replication \
  --bucket hyrelog-archival-us \
  --replication-configuration file://replication-config.json
```

---

## Cost Optimization

### Estimated Monthly Costs (per region)

| Service              | Configuration            | Cost (USD)      |
| -------------------- | ------------------------ | --------------- |
| RDS PostgreSQL       | db.t4g.medium, Multi-AZ  | ~$150           |
| ECS Fargate          | 2 tasks, 1 vCPU, 2GB RAM | ~$60            |
| ALB                  | Standard                 | ~$20            |
| S3 Storage           | 100GB                    | ~$2.30          |
| CloudWatch           | Logs + Metrics           | ~$10            |
| Data Transfer        | 100GB                    | ~$9             |
| **Total per region** |                          | **~$251**       |
| **3 regions**        |                          | **~$753/month** |

### Cost Optimization Tips

1. **Use Fargate Spot** for non-critical workloads (70% savings)
2. **Reserved Instances** for RDS (up to 40% savings)
3. **S3 Intelligent Tiering** for archival data
4. **CloudWatch Logs retention** - set to 30 days
5. **Auto-scaling** - scale down during low traffic

---

## Troubleshooting

### Common Issues

1. **ECS tasks failing to start**

    - Check CloudWatch logs
    - Verify secrets are accessible
    - Check security group rules

2. **Database connection issues**

    - Verify RDS security group allows ECS security group
    - Check DATABASE_URL format
    - Verify RDS is in private subnet

3. **High latency**

    - Enable CloudFront for static assets
    - Use read replicas for queries
    - Check ALB health checks

4. **Cost overruns**
    - Review CloudWatch metrics
    - Check for orphaned resources
    - Enable cost alerts

---

## Next Steps

1. Set up Route 53 for domain management
2. Configure SSL certificates (ACM)
3. Set up CloudFront for CDN
4. Implement WAF rules
5. Set up backup automation
6. Configure monitoring dashboards
7. Set up alerting (SNS + SES)

---

## Additional Resources

-   [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
-   [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
-   [RDS Multi-Region Setup](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
