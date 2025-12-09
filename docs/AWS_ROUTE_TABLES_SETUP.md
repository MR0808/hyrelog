# Route Tables and Internet Gateway Setup Guide

Complete guide for setting up Internet Gateways and Route Tables for all three regions.

## Overview

**Yes, you need route tables for each region.** Each region needs:

-   1 Public Route Table (for public subnets)
-   1 Private Route Table (for private subnets)

## Step 1: Create Internet Gateways (All Regions)

### US Region (us-east-1)

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway \
  --region us-east-1 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-us-igw}]'

# Note the InternetGatewayId from the response, then attach it:
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id> \
  --vpc-id vpc-0fc7141262b1f8093 \
  --region us-east-1
```

### EU Region (eu-west-1)

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway   --region eu-west-1   --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-eu-igw}]'

# Attach it
aws ec2 attach-internet-gateway   --internet-gateway-id igw-0b22774c5215bf714   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1
```

### AU Region (ap-southeast-2)

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway   --region ap-southeast-2   --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-au-igw}]'

# Attach it
aws ec2 attach-internet-gateway   --internet-gateway-id igw-05cded642c99531f3   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2
```

---

## Step 2: Create Route Tables (All Regions)

### US Region (us-east-1)

#### Public Route Table

**Step 1: Create public route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-us-public-rt}]'
```

**Copy the `RouteTableId` from the response (e.g., `rtb-0abc123def4567890`)**

**Step 2: Add route to Internet Gateway**

```bash
aws ec2 create-route   --route-table-id rtb-051281ed81141e289   --destination-cidr-block 0.0.0.0/0   --gateway-id igw-03c08b4e2988754ca   --region us-east-1
```

**Replace `<route-table-id-from-step-1>` with the RouteTableId from Step 1, and `<igw-id>` with your US IGW ID**

**Step 3: Get public subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1a"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId (e.g., `subnet-0abc123def4567890`)**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1b"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate public subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-0fa17a1bc2c93bad6   --route-table-id rtb-051281ed81141e289   --region us-east-1
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-060fbe383eb77f162   --route-table-id rtb-051281ed81141e289  --region us-east-1
```

#### Private Route Table

**Step 1: Create private route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-0fc7141262b1f8093   --region us-east-1   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-us-private-rt}]'
```

**Copy the `RouteTableId` from the response**

**Step 2: Add route to NAT Gateway**

```bash
aws ec2 create-route   --route-table-id rtb-0ada0ebe07dc34ff8   --destination-cidr-block 0.0.0.0/0   --nat-gateway-id nat-049b923a9cd616d38   --region us-east-1
```

**Replace `<private-route-table-id-from-step-1>` with the RouteTableId from Step 1, and `<nat-gateway-id>` with your US NAT Gateway ID (e.g., `nat-049b923a9cd616d38`)**

**Step 3: Get private subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-private-1a"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-private-1b"   --region us-east-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate private subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-09312f31c201b0383   --route-table-id rtb-0ada0ebe07dc34ff8  --region us-east-1
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-0332ebd18eaecdd8c   --route-table-id rtb-0ada0ebe07dc34ff8   --region us-east-1
```

### EU Region (eu-west-1)

#### Public Route Table

**Step 1: Create public route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-eu-public-rt}]'
```

**Copy the `RouteTableId` from the response**

**Step 2: Add route to Internet Gateway**

```bash
aws ec2 create-route   --route-table-id rtb-0e65355d8c1aa58cb   --destination-cidr-block 0.0.0.0/0   --gateway-id igw-0b22774c5215bf714   --region eu-west-1
```

**Replace `<route-table-id-from-step-1>` with the RouteTableId from Step 1**

**Step 3: Get public subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Name,Values=hyrelog-eu-public-1a"   --region eu-west-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Name,Values=hyrelog-eu-public-1b"   --region eu-west-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate public subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-0a0979e812972e4eb   --route-table-id rtb-0e65355d8c1aa58cb  --region eu-west-1
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-051ef196f4bf571bc   --route-table-id rtb-0e65355d8c1aa58cb  --region eu-west-1
```

#### Private Route Table

**Step 1: Create private route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-06404ab993eb25b4e   --region eu-west-1   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-eu-private-rt}]'
```

**Copy the `RouteTableId` from the response**

**Step 2: Add route to NAT Gateway**

First, check your NAT Gateway status for EU region:

```bash
aws ec2 describe-nat-gateways \
  --region eu-west-1 \
  --query 'NatGateways[*].[NatGatewayId,State,SubnetId]' \
  --output table
```

**If the NAT Gateway shows `failed` state, delete it first:**

```bash
aws ec2 delete-nat-gateway   --nat-gateway-id nat-03bba43d3f3672e74   --region eu-west-1
```

**Wait a few minutes, then create a new NAT Gateway:**

```bash
# Get your public subnet ID (if you don't have it)
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Name,Values=hyrelog-eu-public-1a"   --region eu-west-1   --query 'Subnets[0].SubnetId'   --output text

# Allocate Elastic IP
aws ec2 allocate-address   --domain vpc   --region eu-west-1   --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-eu-nat-eip}]'

# Create NAT Gateway (use subnet ID and EIP allocation ID from above)
aws ec2 create-nat-gateway   --subnet-id subnet-0a0979e812972e4eb   --allocation-id eipalloc-0b5a1cec04f1c2099   --region eu-west-1

# Tag it (use the NatGatewayId from the response above)
aws ec2 create-tags   --resources nat-036c39e1fd7b132e6   --tags Key=Name,Value=hyrelog-eu-nat   --region eu-west-1
```

**Wait 2-5 minutes for the NAT Gateway to become `available`, then verify:**

```bash
aws ec2 describe-nat-gateways   --region eu-west-1   --query 'NatGateways[*].[NatGatewayId,State,SubnetId]'   --output table
```

**Once State is `available`, add the route:**

```bash
aws ec2 create-route   --route-table-id rtb-0eefc14478831844d   --destination-cidr-block 0.0.0.0/0   --nat-gateway-id nat-036c39e1fd7b132e6  --region eu-west-1
```

**Replace `<nat-gateway-id>` with the new NAT Gateway ID (State must be `available`)**

**Step 3: Get private subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Name,Values=hyrelog-eu-private-1a"   --region eu-west-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Name,Values=hyrelog-eu-private-1b"   --region eu-west-1   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate private subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-06d22722484ded3bf   --route-table-id rtb-0eefc14478831844d   --region eu-west-1
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-0dae120db0af29e3a   --route-table-id rtb-0eefc14478831844d   --region eu-west-1
```

### AU Region (ap-southeast-2)

#### Public Route Table

**Step 1: Create public route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-au-public-rt}]'
```

**Copy the `RouteTableId` from the response**

**Step 2: Add route to Internet Gateway**

```bash
aws ec2 create-route   --route-table-id rtb-0c91d92ee4275bdb4   --destination-cidr-block 0.0.0.0/0   --gateway-id igw-05cded642c99531f3   --region ap-southeast-2
```

**Replace `<route-table-id-from-step-1>` with the RouteTableId from Step 1**

**Step 3: Get public subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Name,Values=hyrelog-au-public-1a"   --region ap-southeast-2   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Name,Values=hyrelog-au-public-1b"   --region ap-southeast-2   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate public subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-0c4f39cfe030b7c0f   --route-table-id rtb-0c91d92ee4275bdb4 --region ap-southeast-2
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-0b9ee8fc614be2f2d  --route-table-id rtb-0c91d92ee4275bdb4   --region ap-southeast-2
```

#### Private Route Table

**Step 1: Create private route table**

```bash
aws ec2 create-route-table   --vpc-id vpc-0c7fbef001ab8097b   --region ap-southeast-2   --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=hyrelog-au-private-rt}]'
```

**Copy the `RouteTableId` from the response**

**Step 2: Add route to NAT Gateway**

First, check your NAT Gateway status for AU region:

```bash
aws ec2 describe-nat-gateways   --region ap-southeast-2   --query 'NatGateways[*].[NatGatewayId,State,SubnetId]'   --output table
```

**If the NAT Gateway shows `failed` state, delete it first:**

```bash
aws ec2 delete-nat-gateway \
  --nat-gateway-id nat-07388d62010a72517 \
  --region ap-southeast-2
```

**Wait a few minutes, then create a new NAT Gateway:**

```bash
# Get your public subnet ID (if you don't have it)
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Name,Values=hyrelog-au-public-1a"   --region ap-southeast-2   --query 'Subnets[0].SubnetId'   --output text

# Allocate Elastic IP
aws ec2 allocate-address   --domain vpc   --region ap-southeast-2   --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-au-nat-eip}]'

# Create NAT Gateway (use subnet ID and EIP allocation ID from above)
aws ec2 create-nat-gateway   --subnet-id subnet-0c4f39cfe030b7c0f   --allocation-id eipalloc-0795bd25b1c9b4dc3   --region ap-southeast-2

# Tag it (use the NatGatewayId from the response above)
aws ec2 create-tags   --resources nat-0a2243b1e964b1658   --tags Key=Name,Value=hyrelog-au-nat  --region ap-southeast-2
```

**Wait 2-5 minutes for the NAT Gateway to become `available`, then verify:**

```bash
aws ec2 describe-nat-gateways   --region ap-southeast-2   --query 'NatGateways[*].[NatGatewayId,State,SubnetId]'   --output table
```

**Once State is `available`, add the route:**

```bash
aws ec2 create-route   --route-table-id rtb-08c1141215fd06f10   --destination-cidr-block 0.0.0.0/0   --nat-gateway-id nat-0a2243b1e964b1658   --region ap-southeast-2
```

**Replace `<nat-gateway-id>` with the new NAT Gateway ID (State must be `available`)**

**Step 3: Get private subnet IDs**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Name,Values=hyrelog-au-private-1a"   --region ap-southeast-2   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Name,Values=hyrelog-au-private-1b"   --region ap-southeast-2   --query 'Subnets[0].SubnetId'   --output text
```

**Copy the SubnetId**

**Step 4: Associate private subnets with route table**

```bash
aws ec2 associate-route-table   --subnet-id subnet-081f7ddb5dced06d8   --route-table-id rtb-08c1141215fd06f10   --region ap-southeast-2
```

```bash
aws ec2 associate-route-table   --subnet-id subnet-03ac2eafa16be8e43   --route-table-id rtb-08c1141215fd06f10   --region ap-southeast-2
```

---

## Step 3: Enable Auto-Assign Public IP for Public Subnets

Public subnets need to automatically assign public IPs to resources. Use the subnet IDs you copied earlier from Step 3 of the route table setup.

### US Region

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-0fa17a1bc2c93bad6  --map-public-ip-on-launch  --region us-east-1
```

**Replace `<public-subnet-1a-id>` with the subnet ID you copied earlier**

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-060fbe383eb77f162   --map-public-ip-on-launch  --region us-east-1
```

**Replace `<public-subnet-1b-id>` with the subnet ID you copied earlier**

### EU Region

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-0a0979e812972e4eb   --map-public-ip-on-launch   --region eu-west-1
```

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-051ef196f4bf571bc  --map-public-ip-on-launch   --region eu-west-1
```

### AU Region

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-0c4f39cfe030b7c0f   --map-public-ip-on-launch   --region ap-southeast-2
```

```bash
aws ec2 modify-subnet-attribute   --subnet-id subnet-0b9ee8fc614be2f2d   --map-public-ip-on-launch   --region ap-southeast-2
```

---

## Verify Setup

### Check Internet Gateways

```bash
# US
aws ec2 describe-internet-gateways   --filters "Name=attachment.vpc-id,Values=vpc-0fc7141262b1f8093"   --region us-east-1   --query 'InternetGateways[*].[InternetGatewayId,Tags[?Key==`Name`].Value|[0]]'   --output table

# EU
aws ec2 describe-internet-gateways   --filters "Name=attachment.vpc-id,Values=vpc-06404ab993eb25b4e"   --region eu-west-1   --query 'InternetGateways[*].[InternetGatewayId,Tags[?Key==`Name`].Value|[0]]'   --output table

# AU
aws ec2 describe-internet-gateways   --filters "Name=attachment.vpc-id,Values=vpc-0c7fbef001ab8097b"   --region ap-southeast-2   --query 'InternetGateways[*].[InternetGatewayId,Tags[?Key==`Name`].Value|[0]]'   --output table
```

### Check Route Tables

```bash
# US - List route tables with basic info
aws ec2 describe-route-tables   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093"   --region us-east-1   --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0]]'   --output table

# US - Check routes for a specific route table (replace <route-table-id>)
aws ec2 describe-route-tables   --route-table-ids <route-table-id>   --region us-east-1   --query 'RouteTables[0].Routes[*].[DestinationCidrBlock,GatewayId,NatGatewayId,State]'   --output table

# EU - List route tables
aws ec2 describe-route-tables   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e"   --region eu-west-1   --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0]]'   --output table

# EU - Check routes for a specific route table
aws ec2 describe-route-tables   --route-table-ids <route-table-id>   --region eu-west-1   --query 'RouteTables[0].Routes[*].[DestinationCidrBlock,GatewayId,NatGatewayId,State]'   --output table

# AU - List route tables
aws ec2 describe-route-tables   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b"   --region ap-southeast-2   --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0]]'   --output table

# AU - Check routes for a specific route table
aws ec2 describe-route-tables   --route-table-ids  rtb-08c1141215fd06f10  --region ap-southeast-2   --query 'RouteTables[0].Routes[*].[DestinationCidrBlock,GatewayId,NatGatewayId,State]'   --output table
```

---

## About the Default/Main Route Table

When you create a VPC, AWS automatically creates a **default route table** (also called the "main route table"). This route table:

-   Has no Name tag (shows as `None` in queries)
-   Contains only the local route (for VPC internal communication)
-   Is not associated with any subnets if you've properly set up custom route tables

### Should You Delete It?

**Generally, NO** - you should **not delete** the default route table because:

1. **You cannot delete the main route table** - AWS prevents deletion of the main route table
2. **It's harmless** - If it's not associated with any subnets, it doesn't affect your network traffic
3. **It's useful as a fallback** - If you accidentally disassociate a subnet from a route table, it will use the main route table

### What You Should Do Instead

**Option 1: Leave it alone (Recommended)**

-   If it's not associated with any subnets, it's fine to leave it
-   It won't cause any issues or costs

**Option 2: Verify it's not associated with subnets**
Check which subnets are associated with each route table:

```bash
# US Region - Check route table associations
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" \
  --region us-east-1 \
  --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0],Associations[*].SubnetId]' \
  --output table

# EU Region
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" \
  --region eu-west-1 \
  --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0],Associations[*].SubnetId]' \
  --output table

# AU Region
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" \
  --region ap-southeast-2 \
  --query 'RouteTables[*].[RouteTableId,Tags[?Key==`Name`].Value|[0],Associations[*].SubnetId]' \
  --output table
```

**Expected Result:**

-   Your **public route table** should be associated with 2 public subnets
-   Your **private route table** should be associated with 2 private subnets
-   The **default route table** (with no Name tag) should show `[]` (empty array) for associations

**If the default route table IS associated with subnets:**

-   This means some subnets aren't using your custom route tables
-   You should associate those subnets with the correct route table (public or private)

---

## Summary

**Per Region, you need:**

-   ✅ 1 Internet Gateway (created and attached)
-   ✅ 1 Public Route Table (routes to IGW, associated with public subnets)
-   ✅ 1 Private Route Table (routes to NAT Gateway, associated with private subnets)
-   ✅ Auto-assign public IP enabled on public subnets

**Total across 3 regions:**

-   3 Internet Gateways
-   3 Public Route Tables
-   3 Private Route Tables
