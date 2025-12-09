# AWS Security Groups Setup Guide

Complete guide for creating and configuring security groups for all three regions (US, EU, AU).

## Overview

Security groups act as virtual firewalls for your AWS resources. For HyreLog, you need **3 security groups per region**:

1. **ALB Security Group** - Allows HTTP/HTTPS traffic from the internet
2. **ECS Security Group** - Allows traffic from ALB to ECS tasks
3. **RDS Security Group** - Allows PostgreSQL traffic from ECS tasks

**Total: 9 security groups (3 per region × 3 regions)**

---

## Security Group Architecture

```
Internet
   │
   ▼
┌─────────────────┐
│  ALB Security   │  ← Allows: 80, 443 from 0.0.0.0/0
│     Group       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ECS Security   │  ← Allows: 4040 from ALB Security Group
│     Group       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  RDS Security   │  ← Allows: 5432 from ECS Security Group
│     Group       │
└─────────────────┘
```

---

## Prerequisites

Before creating security groups, you need:

-   VPC IDs for each region:
    -   US: `vpc-0fc7141262b1f8093`
    -   EU: `vpc-06404ab993eb25b4e`
    -   AU: `vpc-0c7fbef001ab8097b`

---

## Step 1: US Region (us-east-1)

### 1.1 Create ALB Security Group

```bash
# Create ALB security group
aws ec2 create-security-group   --group-name hyrelog-alb-sg   --description "Security group for HyreLog Application Load Balancer - allows HTTP/HTTPS from internet"   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1

# Note the GroupId from the response (e.g., sg-0abc123def4567890)
# Save this as ALB_SG_ID_US
```

**Allow HTTP (port 80) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-01c23d96560ec3ac5   --protocol tcp   --port 80   --cidr 0.0.0.0/0   --region us-east-1
```

**Allow HTTPS (port 443) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-01c23d96560ec3ac5   --protocol tcp   --port 443   --cidr 0.0.0.0/0   --region us-east-1
```

### 1.2 Create ECS Security Group

```bash
# Create ECS security group
aws ec2 create-security-group   --group-name hyrelog-ecs-sg   --description "Security group for HyreLog ECS tasks - allows traffic from ALB"   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1

# Note the GroupId from the response
# Save this as ECS_SG_ID_US
```

**Allow API port (4040) from ALB security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0699928176594ff63   --protocol tcp   --port 4040   --source-group sg-01c23d96560ec3ac5  --region us-east-1
```

### 1.3 Create RDS Security Group

```bash
# Create RDS security group
aws ec2 create-security-group   --group-name hyrelog-rds-sg   --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks"   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1

# Note the GroupId from the response
# Save this as RDS_SG_ID_US
```

**Allow PostgreSQL (port 5432) from ECS security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0c0c2f73a69ad62da   --protocol tcp   --port 5432   --source-group sg-0699928176594ff63   --region us-east-1
```

**Alternative: If ECS security group doesn't exist yet, allow from VPC CIDR temporarily:**

```bash
# Allow from entire VPC (replace 10.0.0.0/16 with your US VPC CIDR if different)
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SG_ID_US> \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16 \
  --region us-east-1

# Later, remove this rule and add the ECS security group rule instead
```

---

## Step 2: EU Region (eu-west-1)

### 2.1 Create ALB Security Group

```bash
# Create ALB security group
aws ec2 create-security-group   --group-name hyrelog-alb-sg   --description "Security group for HyreLog Application Load Balancer - allows HTTP/HTTPS from internet"   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1

# Note the GroupId from the response
# Save this as ALB_SG_ID_EU
```

**Allow HTTP (port 80) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0fa987bb2b13f8d9f   --protocol tcp   --port 80   --cidr 0.0.0.0/0   --region eu-west-1
```

**Allow HTTPS (port 443) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0fa987bb2b13f8d9f    --protocol tcp   --port 443   --cidr 0.0.0.0/0   --region eu-west-1
```

### 2.2 Create ECS Security Group

```bash
# Create ECS security group
aws ec2 create-security-group   --group-name hyrelog-ecs-sg   --description "Security group for HyreLog ECS tasks - allows traffic from ALB"   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1

# Note the GroupId from the response
# Save this as ECS_SG_ID_EU
```

**Allow API port (4040) from ALB security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0a1001fba09a1b9a5   --protocol tcp   --port 4040   --source-group sg-0fa987bb2b13f8d9f   --region eu-west-1
```

### 2.3 Create RDS Security Group

```bash
# Create RDS security group
aws ec2 create-security-group   --group-name hyrelog-rds-sg   --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks"   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1

# Note the GroupId from the response
# Save this as RDS_SG_ID_EU
```

**Allow PostgreSQL (port 5432) from ECS security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-03f7019bb0e6997f8   --protocol tcp   --port 5432   --source-group sg-0a1001fba09a1b9a5   --region eu-west-1
```

**Alternative: Allow from VPC CIDR temporarily:**

```bash
# Allow from entire VPC (replace 10.1.0.0/16 with your EU VPC CIDR if different)
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SG_ID_EU> \
  --protocol tcp \
  --port 5432 \
  --cidr 10.1.0.0/16 \
  --region eu-west-1
```

---

## Step 3: AU Region (ap-southeast-2)

### 3.1 Create ALB Security Group

```bash
# Create ALB security group
aws ec2 create-security-group   --group-name hyrelog-alb-sg   --description "Security group for HyreLog Application Load Balancer - allows HTTP/HTTPS from internet"   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2

# Note the GroupId from the response
# Save this as ALB_SG_ID_AU
```

**Allow HTTP (port 80) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0385042be9830cd71   --protocol tcp   --port 80   --cidr 0.0.0.0/0   --region ap-southeast-2
```

**Allow HTTPS (port 443) from internet:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-0385042be9830cd71   --protocol tcp   --port 443   --cidr 0.0.0.0/0   --region ap-southeast-2
```

### 3.2 Create ECS Security Group

```bash
# Create ECS security group
aws ec2 create-security-group   --group-name hyrelog-ecs-sg   --description "Security group for HyreLog ECS tasks - allows traffic from ALB"   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2

# Note the GroupId from the response
# Save this as ECS_SG_ID_AU
```

**Allow API port (4040) from ALB security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-09aae9105c40d0a53   --protocol tcp   --port 4040   --source-group sg-0385042be9830cd71   --region ap-southeast-2
```

### 3.3 Create RDS Security Group

```bash
# Create RDS security grou
aws ec2 create-security-group   --group-name hyrelog-rds-sg   --description "Security group for HyreLog RDS - allows PostgreSQL from ECS tasks"   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2

# Note the GroupId from the response
# Save this as RDS_SG_ID_AU
```

**Allow PostgreSQL (port 5432) from ECS security group:**

```bash
aws ec2 authorize-security-group-ingress   --group-id sg-06321e272f2784e81   --protocol tcp   --port 5432   --source-group sg-09aae9105c40d0a53   --region ap-southeast-2
```

**Alternative: Allow from VPC CIDR temporarily:**

```bash
# Allow from entire VPC (replace 10.2.0.0/16 with your AU VPC CIDR if different)
aws ec2 authorize-security-group-ingress \
  --group-id sg-06321e272f2784e81 \
  --protocol tcp \
  --port 5432 \
  --cidr 10.2.0.0/16 \
  --region ap-southeast-2
```

---

## Step 4: Retrieve Security Group IDs

If you need to retrieve security group IDs later, use these commands:

### US Region

```bash
# Get ALB security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-alb-sg" "Name=vpc-id,Values=vpc-0fc7141262b1f8093" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get ECS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-ecs-sg" "Name=vpc-id,Values=vpc-0fc7141262b1f8093" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get RDS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-0fc7141262b1f8093" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

### EU Region

```bash
# Get ALB security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-alb-sg" "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get ECS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-ecs-sg" "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get RDS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

### AU Region

```bash
# Get ALB security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-alb-sg" "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get ECS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-ecs-sg" "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text

# Get RDS security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=hyrelog-rds-sg" "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[0].GroupId' \
  --output text
```

---

## Step 5: Verify Security Groups

### List All Security Groups for a VPC

```bash
# US Region
aws ec2 describe-security-groups   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093"   --region us-east-1   --query 'SecurityGroups[*].[GroupId,GroupName,Description]'   --output table

# EU Region
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'SecurityGroups[*].[GroupId,GroupName,Description]' \
  --output table

# AU Region
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'SecurityGroups[*].[GroupId,GroupName,Description]' \
  --output table
```

### View Inbound Rules for a Security Group

```bash
# Replace <security-group-id> with your actual security group ID
aws ec2 describe-security-groups \
  --group-ids <security-group-id> \
  --region <region> \
  --query 'SecurityGroups[0].IpPermissions' \
  --output json
```

---

## Step 6: Update Security Group Rules (If Needed)

### Remove a Rule

```bash
# Remove an ingress rule
aws ec2 revoke-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp \
  --port <port> \
  --cidr <cidr-block> \
  --region <region>
```

### Add Additional Rules

You can add more rules using the same `authorize-security-group-ingress` command. For example, to allow SSH access (port 22) from a specific IP:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id <security-group-id> \
  --protocol tcp \
  --port 22 \
  --cidr <your-ip>/32 \
  --region <region>
```

---

## Security Best Practices

1. **Principle of Least Privilege**: Only allow the minimum necessary ports and sources
2. **Use Security Group References**: Reference other security groups instead of CIDR blocks when possible
3. **Separate by Region**: Each region has its own security groups (they don't share across regions)
4. **Document Your Rules**: Keep track of why each rule exists
5. **Regular Audits**: Periodically review security group rules to remove unused access
6. **Tag Your Security Groups**: Add tags for easier management:

```bash
aws ec2 create-tags \
  --resources <security-group-id> \
  --tags Key=Name,Value=hyrelog-alb-sg Key=Environment,Value=production Key=Region,Value=us-east-1 \
  --region us-east-1
```

---

## Troubleshooting

### Error: "The security group 'sg-xxx' does not exist"

-   **Cause**: Security group ID is incorrect or from a different region
-   **Solution**: Verify the security group ID and region using the describe commands above

### Error: "InvalidGroup.Duplicate"

-   **Cause**: A security group with the same name already exists in the VPC
-   **Solution**: Use a different name or delete the existing security group first

### Cannot Connect to RDS from ECS

-   **Check**: Ensure RDS security group allows port 5432 from ECS security group
-   **Check**: Verify both security groups are in the same VPC
-   **Check**: Ensure ECS tasks are using the correct security group

### Cannot Access API from Internet

-   **Check**: ALB security group allows ports 80 and 443 from 0.0.0.0/0
-   **Check**: ECS security group allows port 4040 from ALB security group
-   **Check**: ALB is associated with the correct security group

---

## Summary

**Per Region, you need:**

-   ✅ 1 ALB Security Group (ports 80, 443 from internet)
-   ✅ 1 ECS Security Group (port 4040 from ALB)
-   ✅ 1 RDS Security Group (port 5432 from ECS)

**Total across 3 regions:**

-   3 ALB Security Groups
-   3 ECS Security Groups
-   3 RDS Security Groups
-   **Total: 9 Security Groups**

**Next Steps:**

1. Use ALB security group IDs when creating Application Load Balancers
2. Use ECS security group IDs when creating ECS task definitions
3. Use RDS security group IDs when creating RDS instances
