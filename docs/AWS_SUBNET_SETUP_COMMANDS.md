# AWS Subnet Setup Commands

Commands to create subnets for all three regions using your VPC IDs.

## Step 1: Get Availability Zones

First, get the availability zones for each region:

```bash
# US Region (us-east-1)
aws ec2 describe-availability-zones --region us-east-1 --query 'AvailabilityZones[*].[ZoneName]' --output text

# EU Region (eu-west-1)
aws ec2 describe-availability-zones --region eu-west-1 --query 'AvailabilityZones[*].[ZoneName]' --output text

# AU Region (ap-southeast-2)
aws ec2 describe-availability-zones --region ap-southeast-2 --query 'AvailabilityZones[*].[ZoneName]' --output text
```

---

## Step 2: Create Subnets - US Region (us-east-1)

**VPC ID: vpc-0fc7141262b1f8093**

### Public Subnets

```bash
# Public Subnet 1 (us-east-1a)
aws ec2 create-subnet --vpc-id vpc-0fc7141262b1f8093   --cidr-block 10.0.1.0/24  --availability-zone us-east-1a   --region us-east-1  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-public-1a},{Key=Type,Value=Public}]'

# Public Subnet 2 (us-east-1b)
aws ec2 create-subnet   --vpc-id vpc-0fc7141262b1f8093   --cidr-block 10.0.2.0/24   --availability-zone us-east-1b   --region us-east-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-public-1b},{Key=Type,Value=Public}]'
```

### Private Subnets

```bash
# Private Subnet 1 (us-east-1a)
aws ec2 create-subnet   --vpc-id vpc-0fc7141262b1f8093   --cidr-block 10.0.11.0/24   --availability-zone us-east-1a   --region us-east-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-private-1a},{Key=Type,Value=Private}]'

# Private Subnet 2 (us-east-1b)
aws ec2 create-subnet   --vpc-id vpc-0fc7141262b1f8093   --cidr-block 10.0.12.0/24   --availability-zone us-east-1b   --region us-east-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-us-private-1b},{Key=Type,Value=Private}]'
```

---

## Step 3: Create Subnets - EU Region (eu-west-1)

**VPC ID: vpc-06404ab993eb25b4e**

### Public Subnets

```bash
# Public Subnet 1 (eu-west-1a)
aws ec2 create-subnet   --vpc-id vpc-06404ab993eb25b4e   --cidr-block 10.1.1.0/24   --availability-zone eu-west-1a   --region eu-west-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-eu-public-1a},{Key=Type,Value=Public}]'

# Public Subnet 2 (eu-west-1b)
aws ec2 create-subnet   --vpc-id vpc-06404ab993eb25b4e   --cidr-block 10.1.2.0/24   --availability-zone eu-west-1b   --region eu-west-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-eu-public-1b},{Key=Type,Value=Public}]'
```

### Private Subnets

```bash
# Private Subnet 1 (eu-west-1a)
aws ec2 create-subnet   --vpc-id vpc-06404ab993eb25b4e   --cidr-block 10.1.11.0/24   --availability-zone eu-west-1a   --region eu-west-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-eu-private-1a},{Key=Type,Value=Private}]'

# Private Subnet 2 (eu-west-1b)
aws ec2 create-subnet   --vpc-id vpc-06404ab993eb25b4e   --cidr-block 10.1.12.0/24   --availability-zone eu-west-1b   --region eu-west-1   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-eu-private-1b},{Key=Type,Value=Private}]'
```

---

## Step 4: Create Subnets - AU Region (ap-southeast-2)

**VPC ID: vpc-0c7fbef001ab8097b**

### Public Subnets

```bash
# Public Subnet 1 (ap-southeast-2a)
aws ec2 create-subnet   --vpc-id vpc-0c7fbef001ab8097b   --cidr-block 10.2.1.0/24   --availability-zone ap-southeast-2a   --region ap-southeast-2   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-au-public-1a},{Key=Type,Value=Public}]'

# Public Subnet 2 (ap-southeast-2b)
aws ec2 create-subnet   --vpc-id vpc-0c7fbef001ab8097b   --cidr-block 10.2.2.0/24   --availability-zone ap-southeast-2b   --region ap-southeast-2   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-au-public-1b},{Key=Type,Value=Public}]'
```

### Private Subnets

```bash
# Private Subnet 1 (ap-southeast-2a)
aws ec2 create-subnet   --vpc-id vpc-0c7fbef001ab8097b   --cidr-block 10.2.11.0/24   --availability-zone ap-southeast-2a   --region ap-southeast-2   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-au-private-1a},{Key=Type,Value=Private}]'

# Private Subnet 2 (ap-southeast-2b)
aws ec2 create-subnet   --vpc-id vpc-0c7fbef001ab8097b   --cidr-block 10.2.12.0/24   --availability-zone ap-southeast-2b   --region ap-southeast-2   --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=hyrelog-au-private-1b},{Key=Type,Value=Private}]'
```

---

## Step 5: Verify Subnets Created

After creating all subnets, verify they were created successfully:

```bash
# US Region
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093"   --region us-east-1   --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table

# EU Region
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e"  --region eu-west-1   --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table

# AU Region
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b"   --region ap-southeast-2   --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table
```

---

## Subnet Summary

| Region | VPC ID                | Subnet Type | CIDR Block   | AZ              | Name                  |
| ------ | --------------------- | ----------- | ------------ | --------------- | --------------------- |
| **US** | vpc-0fc7141262b1f8093 | Public      | 10.0.1.0/24  | us-east-1a      | hyrelog-us-public-1a  |
| **US** | vpc-0fc7141262b1f8093 | Public      | 10.0.2.0/24  | us-east-1b      | hyrelog-us-public-1b  |
| **US** | vpc-0fc7141262b1f8093 | Private     | 10.0.11.0/24 | us-east-1a      | hyrelog-us-private-1a |
| **US** | vpc-0fc7141262b1f8093 | Private     | 10.0.12.0/24 | us-east-1b      | hyrelog-us-private-1b |
| **EU** | vpc-06404ab993eb25b4e | Public      | 10.1.1.0/24  | eu-west-1a      | hyrelog-eu-public-1a  |
| **EU** | vpc-06404ab993eb25b4e | Public      | 10.1.2.0/24  | eu-west-1b      | hyrelog-eu-public-1b  |
| **EU** | vpc-06404ab993eb25b4e | Private     | 10.1.11.0/24 | eu-west-1a      | hyrelog-eu-private-1a |
| **EU** | vpc-06404ab993eb25b4e | Private     | 10.1.12.0/24 | eu-west-1b      | hyrelog-eu-private-1b |
| **AU** | vpc-0c7fbef001ab8097b | Public      | 10.2.1.0/24  | ap-southeast-2a | hyrelog-au-public-1a  |
| **AU** | vpc-0c7fbef001ab8097b | Public      | 10.2.2.0/24  | ap-southeast-2b | hyrelog-au-public-1b  |
| **AU** | vpc-0c7fbef001ab8097b | Private     | 10.2.11.0/24 | ap-southeast-2a | hyrelog-au-private-1a |
| **AU** | vpc-0c7fbef001ab8097b | Private     | 10.2.12.0/24 | ap-southeast-2b | hyrelog-au-private-1b |

---

## Next Steps

After creating the subnets, you'll need to:

1. **Enable Auto-assign Public IPv4** for public subnets:

    ```bash
    # US Public Subnets
    aws ec2 modify-subnet-attribute --subnet-id <subnet-id> --map-public-ip-on-launch --region us-east-1
    ```

2. **Create Internet Gateway** and attach to VPC
3. **Create NAT Gateway** in public subnet
4. **Create Route Tables** and associate subnets
5. **Create Security Groups**

See the main [AWS Deployment Guide](./AWS_DEPLOYMENT_GUIDE.md) for these next steps.

---

## Troubleshooting

If you get an error about availability zone names, first check available AZs:

```bash
aws ec2 describe-availability-zones --region <region> --query 'AvailabilityZones[*].ZoneName' --output text
```

Then adjust the `--availability-zone` parameter in the commands above to match the actual zone names.

If you get a CIDR block conflict, the VPC might already have subnets. Check existing subnets:

```bash
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<vpc-id>" --region <region>
```

Adjust the CIDR blocks if needed (e.g., use 10.0.3.0/24, 10.0.4.0/24, etc.).
