# AWS VPC Troubleshooting

## Issue: VPC ID Not Found When Attaching Internet Gateway

This error typically occurs when:

1. The internet gateway and VPC are in different regions
2. The VPC ID is incorrect
3. The VPC doesn't exist in the specified region

## Solution: Verify VPC Region and Location

### Step 1: Check Which Region Your VPCs Are In

```bash
# Check US VPC in all regions
aws ec2 describe-vpcs --vpc-ids vpc-0fc7141262b1f8093 --region us-east-1
aws ec2 describe-vpcs --vpc-ids vpc-0fc7141262b1f8093 --region eu-west-1
aws ec2 describe-vpcs --vpc-ids vpc-0fc7141262b1f8093 --region ap-southeast-2

# Check EU VPC
aws ec2 describe-vpcs --vpc-ids vpc-06404ab993eb25b4e --region us-east-1
aws ec2 describe-vpcs --vpc-ids vpc-06404ab993eb25b4e --region eu-west-1
aws ec2 describe-vpcs --vpc-ids vpc-06404ab993eb25b4e --region ap-southeast-2

# Check AU VPC
aws ec2 describe-vpcs --vpc-ids vpc-0c7fbef001ab8097b --region us-east-1
aws ec2 describe-vpcs --vpc-ids vpc-0c7fbef001ab8097b --region eu-west-1
aws ec2 describe-vpcs --vpc-ids vpc-0c7fbef001ab8097b --region ap-southeast-2
```

### Step 2: List All VPCs to Find Their Regions

```bash
# List all VPCs across all regions
for region in us-east-1 eu-west-1 ap-southeast-2; do
  echo "=== Region: $region ==="
  aws ec2 describe-vpcs --region $region --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table
done
```

### Step 3: Attach Internet Gateway with Correct Region

Once you know which region each VPC is in, attach the internet gateway in the same region:

**For US VPC (vpc-0fc7141262b1f8093):**

```bash
# First, create IGW in us-east-1 (if not already created)
aws ec2 create-internet-gateway  --region us-east-1 --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-us-igw}]'

# Then attach (replace igw-xxx with the actual IGW ID from us-east-1)
aws ec2 attach-internet-gateway   --internet-gateway-id igw-03c08b4e2988754ca --vpc-id vpc-0fc7141262b1f8093   --region us-east-1
```

**For EU VPC (vpc-06404ab993eb25b4e):**

```bash
# Create IGW in eu-west-1
aws ec2 create-internet-gateway \
  --region eu-west-1 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-eu-igw}]'

# Attach (use the IGW ID from eu-west-1)
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id-from-eu-west-1> \
  --vpc-id vpc-06404ab993eb25b4e \
  --region eu-west-1
```

**For AU VPC (vpc-0c7fbef001ab8097b):**

```bash
# Create IGW in ap-southeast-2
aws ec2 create-internet-gateway \
  --region ap-southeast-2 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-au-igw}]'

# Attach (use the IGW ID from ap-southeast-2)
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id-from-ap-southeast-2> \
  --vpc-id vpc-0c7fbef001ab8097b \
  --region ap-southeast-2
```

## Quick Fix: Check Your Default Region

```bash
# Check your AWS CLI default region
aws configure get region

# Or check your current region setting
echo $AWS_DEFAULT_REGION
```

If your default region doesn't match where your VPC is, either:

1. Specify `--region` in all commands
2. Set the default region: `aws configure set region us-east-1`

## Complete Internet Gateway Setup Commands (All Regions)

### US Region (us-east-1)

```bash
# Create IGW
aws ec2 create-internet-gateway \
  --region us-east-1 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-us-igw}]'

# Note the InternetGatewayId from the response, then:
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id> \
  --vpc-id vpc-0fc7141262b1f8093 \
  --region us-east-1
```

### EU Region (eu-west-1)

```bash
# Create IGW
aws ec2 create-internet-gateway \
  --region eu-west-1 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-eu-igw}]'

# Attach
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id> \
  --vpc-id vpc-06404ab993eb25b4e \
  --region eu-west-1
```

### AU Region (ap-southeast-2)

```bash
# Create IGW
aws ec2 create-internet-gateway \
  --region ap-southeast-2 \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=hyrelog-au-igw}]'

# Attach
aws ec2 attach-internet-gateway \
  --internet-gateway-id <igw-id> \
  --vpc-id vpc-0c7fbef001ab8097b \
  --region ap-southeast-2
```

## Verify Internet Gateway Attachment

```bash
# Check IGW attachment status
aws ec2 describe-internet-gateways \
  --internet-gateway-ids igw-00d3c2d0f5cb0b775 \
  --region <region> \
  --query 'InternetGateways[0].Attachments'
```

If attached, you should see:

```json
[
    {
        "State": "available",
        "VpcId": "vpc-0fc7141262b1f8093"
    }
]
```
