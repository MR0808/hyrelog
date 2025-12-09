# AWS SSM Port Forwarding Setup Guide

Complete guide for setting up AWS Systems Manager (SSM) port forwarding to connect to RDS from your local machine for database migrations.

## Overview

This guide allows you to:

-   Connect to your private RDS instance from your local machine
-   Run Prisma migrations without making RDS publicly accessible
-   Keep your database secure in private subnets

## Architecture

```
Your Local Machine
       │
       │ (SSM Session)
       ▼
┌─────────────────┐
│  EC2 Instance   │  ← In private subnet, has SSM access
│  (Jump Host)    │
└────────┬────────┘
         │
         │ (Port 5432)
         ▼
┌─────────────────┐
│  RDS Instance   │  ← In private subnet, not publicly accessible
└─────────────────┘
```

---

## Prerequisites

-   AWS CLI configured
-   RDS instance created and available
-   VPC with private subnets set up
-   Security groups configured

---

## Step 1: Create IAM Role for EC2 Instance

The EC2 instance needs an IAM role with SSM permissions.

**Create IAM role:**

```bash
# Create trust policy for EC2
cat > ec2-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name hyrelog-ec2-ssm-role \
  --assume-role-policy-document file://ec2-trust-policy.json \
  --region us-east-1

# Attach AWS managed policy for SSM
aws iam attach-role-policy \
  --role-name hyrelog-ec2-ssm-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore \
  --region us-east-1

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name hyrelog-ec2-ssm-profile \
  --region us-east-1

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name hyrelog-ec2-ssm-profile \
  --role-name hyrelog-ec2-ssm-role \
  --region us-east-1
```

**Note:** Wait 10-15 seconds after creating the instance profile before launching the EC2 instance.

---

## Step 2: Get Required IDs

**Get subnet ID (use a private subnet):**

```bash
# US Region - Private subnet 1a
PRIVATE_SUBNET_1=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-private-1a" \
  --region us-east-1 \
  --query 'Subnets[0].SubnetId' \
  --output text)

echo "Private Subnet: $PRIVATE_SUBNET_1"
```

**Get security group ID (use ECS security group or create a new one):**

```bash
# Use existing ECS security group
ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=group-name,Values=hyrelog-ecs-sg" \
  --region us-east-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "ECS Security Group: $ECS_SG_ID"
```

**Or create a new security group for the jump host:**

```bash
# Create security group for jump host
JUMP_SG_ID=$(aws ec2 create-security-group \
  --group-name hyrelog-jump-host-sg \
  --description "Security group for SSM jump host" \
  --vpc-id vpc-0fc7141262b1f8093 \
  --region us-east-1 \
  --query 'GroupId' \
  --output text)

echo "Jump Host Security Group: $JUMP_SG_ID"
```

---

## Step 3: Update RDS Security Group

Allow the EC2 instance (via its security group) to connect to RDS:

```bash
# Allow RDS security group to accept connections from EC2 security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0c0c2f73a69ad62da \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID \
  --region us-east-1
```

**Or if using the jump host security group:**

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0c0c2f73a69ad62da \
  --protocol tcp \
  --port 5432 \
  --source-group $JUMP_SG_ID \
  --region us-east-1
```

---

## Step 4: Get Latest Amazon Linux 2023 AMI

```bash
# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*-x86_64" "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text \
  --region us-east-1)

echo "AMI ID: $AMI_ID"
```

---

## Step 5: Launch EC2 Instance

```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --subnet-id $PRIVATE_SUBNET_1 \
  --security-group-ids $ECS_SG_ID \
  --iam-instance-profile Name=hyrelog-ec2-ssm-profile \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=hyrelog-ssm-jump-host}]' \
  --region us-east-1 \
  --query 'Instances[0].[InstanceId,State.Name,PrivateIpAddress]' \
  --output table
```

**Note the InstanceId from the output (e.g., `i-0abc123def4567890`)**

**Wait for instance to be running:**

```bash
# Check instance status
INSTANCE_ID="i-0abc123def4567890"  # Replace with your instance ID

aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].[InstanceId,State.Name]' \
  --region us-east-1 \
  --output table
```

Wait until status is `running` (usually 1-2 minutes).

---

## Step 6: Wait for SSM Agent to Register

The SSM agent needs to register with AWS Systems Manager. This usually takes 2-3 minutes after the instance starts.

**Check if instance is registered with SSM:**

```bash
# Wait for SSM registration (this may take 2-3 minutes)
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --region us-east-1 \
  --query 'InstanceInformationList[0].[InstanceId,PingStatus]' \
  --output table
```

Wait until `PingStatus` is `Online`. If it shows `Inactive`, wait a bit longer and check again.

---

## Step 7: Set Up Port Forwarding

**Start SSM session with port forwarding:**

```bash
# Start port forwarding session
# This forwards RDS port 5432 to your local port 5432
aws ssm start-session \
  --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --region us-east-1
```

**In a separate terminal, test the connection:**

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier hyrelog-us-primary \
  --query 'DBInstances[0].Endpoint.Address' \
  --region us-east-1 \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"

# Test connection through port forward (from the EC2 instance)
# You'll need to SSH into the instance or use SSM to run this
aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=['nc -zv $RDS_ENDPOINT 5432']" \
  --region us-east-1 \
  --query 'Command.CommandId' \
  --output text
```

---

## Step 8: Connect from Your Local Machine

**Update your local environment:**

```bash
# Set DATABASE_URL to use localhost (port forwarding makes RDS available on localhost:5432)
export DATABASE_URL="postgresql://postgres:AKn58fAsiYyCd8Ersq36@localhost:5432/hyrelog?sslmode=require"
```

**Important:** The SSM session must be running in one terminal. Keep that terminal open!

**In another terminal, run migrations:**

```bash
cd hyrelog
npx prisma migrate deploy
npx prisma db seed
```

---

## Step 9: Alternative - Use SSM Plugin for Easier Port Forwarding

**Install AWS Session Manager Plugin:**

**Windows (PowerShell):**

```powershell
# Download and install SSM plugin
# Download from: https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe
# Or use Chocolatey:
choco install session-manager-plugin
```

**macOS:**

```bash
brew install --cask session-manager-plugin
```

**Linux:**

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/linux_64bit/session-manager-plugin.rpm" -o "session-manager-plugin.rpm"
sudo yum install -y session-manager-plugin.rpm
```

**Then use port forwarding:**

```bash
# This will automatically set up port forwarding
aws ssm start-session \
  --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --region us-east-1
```

This directly forwards to the RDS endpoint, so you don't need to SSH into the EC2 instance.

---

## Step 10: Run Migrations

**With the SSM session running in one terminal:**

```bash
# In another terminal
cd hyrelog

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:AKn58fAsiYyCd8Ersq36@localhost:5432/hyrelog?sslmode=require"

# Run migrations
npx prisma migrate deploy

# Run seed
npx prisma db seed
```

---

## Troubleshooting

### Error: "Target i-xxx is not registered with SSM"

**Solution:** Wait 2-3 minutes after instance launch, then check:

```bash
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
  --region us-east-1
```

### Error: "Port forwarding session failed"

**Solution:** Make sure:

1. EC2 instance is running
2. SSM agent is registered (PingStatus = Online)
3. IAM role has correct permissions
4. Security groups allow traffic

### Cannot connect to RDS from EC2

**Solution:** Check security group rules:

```bash
# Verify RDS security group allows EC2 security group
aws ec2 describe-security-groups \
  --group-ids sg-0c0c2f73a69ad62da \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' \
  --region us-east-1 \
  --output json
```

### Port 5432 already in use locally

**Solution:** Use a different local port:

```bash
aws ssm start-session \
  --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5433"]}' \
  --region us-east-1
```

Then use `localhost:5433` in your DATABASE_URL.

---

## Cleanup (After Migrations)

**Stop the EC2 instance (to save costs):**

```bash
aws ec2 stop-instances \
  --instance-ids $INSTANCE_ID \
  --region us-east-1
```

**Or terminate it if you don't need it:**

```bash
aws ec2 terminate-instances \
  --instance-ids $INSTANCE_ID \
  --region us-east-1
```

**Remove security group rule (optional):**

```bash
aws ec2 revoke-security-group-ingress \
  --group-id sg-0c0c2f73a69ad62da \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID \
  --region us-east-1
```

---

## Summary

**What you've set up:**

-   ✅ EC2 instance in private subnet with SSM access
-   ✅ IAM role with SSM permissions
-   ✅ Security group rules allowing EC2 → RDS
-   ✅ Port forwarding from local machine → EC2 → RDS

**Next steps:**

1. Keep SSM session running
2. Run migrations from local machine
3. Set up RDS Proxy for Vercel dashboard (next guide)

**Cost:**

-   t3.micro instance: ~$7.50/month (or stop when not in use)
-   SSM sessions: Free
-   Data transfer: Minimal cost
