# NAT Gateway Setup Guide

Step-by-step guide to get the public subnet ID and Elastic IP allocation ID for creating NAT Gateways.

## How Many NAT Gateways Do You Need?

**Short Answer:** You only need **ONE NAT Gateway per region** (not per subnet). However, for high availability, you can create one per availability zone.

### Option 1: Single NAT Gateway (Cost-Effective)

-   **One NAT Gateway** in one public subnet (e.g., `us-east-1a`)
-   All private subnets route through this single NAT Gateway
-   **Cost:** ~$32/month per region
-   **Best for:** Development, staging, or cost-conscious production setups
-   **Risk:** Single point of failure if that AZ goes down

### Option 2: Multiple NAT Gateways (High Availability)

-   **One NAT Gateway per availability zone** (e.g., one in `us-east-1a`, one in `us-east-1b`)
-   Each private subnet routes to the NAT Gateway in its own AZ
-   **Cost:** ~$64/month per region (2 NAT Gateways)
-   **Best for:** Production environments requiring high availability
-   **Benefit:** If one AZ fails, the other can still handle traffic

**Recommendation:** Start with **one NAT Gateway per region** to save costs. You can add more later for high availability if needed.

## Step 1: Get Public Subnet IDs

After creating your subnets, you need to get the subnet IDs. You can either:

### Option A: Get from Subnet Creation Output

When you ran the `aws ec2 create-subnet` commands, the output included a `SubnetId`. Look for it in the response:

```json
{
    "Subnet": {
        "SubnetId": "subnet-0abc123def4567890",  // <-- This is your subnet ID
        "VpcId": "vpc-0fc7141262b1f8093",
        "CidrBlock": "10.0.1.0/24",
        ...
    }
}
```

### Option B: Query Existing Subnets

If you don't have the output, query your subnets:

**US Region (us-east-1):**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Type,Values=Public"   --region us-east-1   --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table
```

**EU Region (eu-west-1):**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-06404ab993eb25b4e" "Name=tag:Type,Values=Public"   --region eu-west-1  --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table
```

**AU Region (ap-southeast-2):**

```bash
aws ec2 describe-subnets   --filters "Name=vpc-id,Values=vpc-0c7fbef001ab8097b" "Name=tag:Type,Values=Public"   --region ap-southeast-2   --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]'   --output table
```

### Option C: Get Specific Subnet by Name

If you know the subnet name, you can filter by tag:

```bash
# US Public Subnet 1a
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1a" \
  --region us-east-1 \
  --query 'Subnets[0].SubnetId' \
  --output text
```

---

## Step 2: Allocate Elastic IP Address

Before creating a NAT Gateway, you need to allocate an Elastic IP address. This gives you a static public IP.

### Allocate EIP for US Region

```bash
aws ec2 allocate-address  --domain vpc   --region us-east-1   --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-us-nat-eip}]'
```

**Response will look like:**

```json
{
    "PublicIp": "54.123.45.67",
    "AllocationId": "eipalloc-0abc123def4567890", // <-- This is your EIP allocation ID
    "PublicIpv4Pool": "amazon",
    "NetworkBorderGroup": "us-east-1",
    "Domain": "vpc"
}
```

### Allocate EIP for EU Region

```bash
aws ec2 allocate-address   --domain vpc   --region eu-west-1   --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-eu-nat-eip}]'
```

### Allocate EIP for AU Region

```bash
aws ec2 allocate-address  --domain vpc   --region ap-southeast-2   --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-au-nat-eip}]'
```

---

## Step 3: Create NAT Gateway

Now you have both the public subnet ID and the EIP allocation ID. Create the NAT Gateway:

### US Region (us-east-1)

```bash
# Replace <public-subnet-id> with your actual public subnet ID
# Replace <eip-allocation-id> with your EIP allocation ID from Step 2

# Create NAT Gateway (tags added separately - see below)
aws ec2 create-nat-gateway   --subnet-id subnet-0fa17a1bc2c93bad6 --allocation-id eipalloc-07629f3e4ee02eb16   --region us-east-1

# Note the NatGatewayId from the response, then tag it:
aws ec2 create-tags   --resources nat-049b923a9cd616d38   --tags Key=Name,Value=hyrelog-us-nat   --region us-east-1
```

**Example with actual values:**

```bash
# Create NAT Gateway
aws ec2 create-nat-gateway \
  --subnet-id subnet-0fa17a1bc2c93bad6 \
  --allocation-id eipalloc-07629f3e4ee02eb16 \
  --region us-east-1

# Tag it (use the NatGatewayId from the response above)
aws ec2 create-tags \
  --resources nat-0abc123def4567890 \
  --tags Key=Name,Value=hyrelog-us-nat \
  --region us-east-1
```

### EU Region (eu-west-1)

```bash
# Create NAT Gateway
aws ec2 create-nat-gateway   --subnet-id subnet-0a0979e812972e4eb   --allocation-id eipalloc-08bd9e54331137a58   --region eu-west-1

# Tag it
aws ec2 create-tags   --resources nat-03bba43d3f3672e74   --tags Key=Name,Value=hyrelog-eu-nat   --region eu-west-1
```

### AU Region (ap-southeast-2)

```bash
# Create NAT Gateway
aws ec2 create-nat-gateway   --subnet-id subnet-0c4f39cfe030b7c0f   --allocation-id eipalloc-05fe9d8cce4d78410   --region ap-southeast-2

# Tag it
aws ec2 create-tags   --resources nat-07388d62010a72517   --tags Key=Name,Value=hyrelog-au-nat   --region ap-southeast-2
```

---

## Complete Example Workflow

Here's a complete example for the US region:

```bash
# Step 1: Get public subnet ID
PUBLIC_SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-0fc7141262b1f8093" "Name=tag:Name,Values=hyrelog-us-public-1a" \
  --region us-east-1 \
  --query 'Subnets[0].SubnetId' \
  --output text)

echo "Public Subnet ID: $PUBLIC_SUBNET_ID"

# Step 2: Allocate Elastic IP
EIP_ALLOCATION=$(aws ec2 allocate-address \
  --domain vpc \
  --region us-east-1 \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=hyrelog-us-nat-eip}]' \
  --query 'AllocationId' \
  --output text)

echo "EIP Allocation ID: $EIP_ALLOCATION"

# Step 3: Create NAT Gateway
NAT_GATEWAY_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_ID \
  --allocation-id $EIP_ALLOCATION \
  --region us-east-1 \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "NAT Gateway ID: $NAT_GATEWAY_ID"

# Step 3b: Tag the NAT Gateway
aws ec2 create-tags \
  --resources $NAT_GATEWAY_ID \
  --tags Key=Name,Value=hyrelog-us-nat \
  --region us-east-1

echo "NAT Gateway tagged"

# Step 4: Wait for NAT Gateway to be available (takes 2-5 minutes)
echo "Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available \
  --nat-gateway-ids $NAT_GATEWAY_ID \
  --region us-east-1

echo "NAT Gateway is ready!"
```

---

## Verify NAT Gateway Status

Check if your NAT Gateway is ready:

```bash
aws ec2 describe-nat-gateways \
  --nat-gateway-ids <nat-gateway-id> \
  --region <region> \
  --query 'NatGateways[0].[NatGatewayId,State,SubnetId,VpcId]' \
  --output table
```

The `State` should be `available` before you can use it in route tables.

---

## List All Your Resources

To see all your NAT Gateways and EIPs:

```bash
# List NAT Gateways
aws ec2 describe-nat-gateways \
  --region us-east-1 \
  --query 'NatGateways[*].[NatGatewayId,State,SubnetId,VpcId,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# List Elastic IPs
aws ec2 describe-addresses \
  --region us-east-1 \
  --query 'Addresses[*].[AllocationId,PublicIp,Domain,AssociationId,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

---

## Important Notes

1. **NAT Gateway takes 2-5 minutes** to become available after creation
2. **Elastic IPs cost money** (~$0.005/hour) when allocated but not attached
3. **NAT Gateways cost money** (~$0.045/hour + data processing charges)
4. **One NAT Gateway per region is sufficient** - it can serve all private subnets in the VPC
5. **For HA, create one NAT Gateway per AZ** - each private subnet routes to the NAT Gateway in its AZ
6. **Use one public subnet** per NAT Gateway (typically the first AZ for single NAT, or one per AZ for HA)
7. **Wait for NAT Gateway** to be `available` before using it in route tables

---

## Troubleshooting

### If you get "Subnet not found":

-   Make sure you're using the correct region
-   Verify the subnet ID is correct
-   Check that the subnet is actually a public subnet

### If you get "Allocation ID not found":

-   Make sure you allocated the EIP in the same region as the NAT Gateway
-   Verify the allocation ID is correct
-   Check that the EIP is in VPC domain (not EC2-Classic)

### If NAT Gateway stays in "pending" state:

-   This is normal - wait 2-5 minutes
-   Check CloudWatch logs if it fails
-   Verify your subnet has internet gateway route
