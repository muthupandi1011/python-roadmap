ROADMAP.push({
n: 19, track: "DevOps, data and design",
title: "Cloud Basics: AWS, Azure and GCP",
blurb: "What the cloud is, how the three big providers are organised, and the core services for identity, compute, storage, databases and networking, side by side.",
topics: [
X("What cloud computing is",
["Cloud computing means renting computing resources (servers, storage, databases, networking, ready-made software services) from a provider over the internet, and paying only for what you use, instead of buying and running your own hardware. The provider owns huge data centres and gives you a web console, a command line and an API to create resources in seconds.",
 "Before the cloud, launching a product meant estimating demand, ordering servers, waiting weeks for delivery, installing them in a data centre and hiring people to run them. Guess too low and the site crashed on a busy day; guess too high and expensive machines sat idle. The cloud replaces that upfront purchase (capital expense) with a monthly bill (operating expense) and lets capacity follow demand: you can go from one server to a thousand for a sale and back again the next day. This ability is called elasticity.",
 "Cloud services are grouped by how much the provider manages for you. Infrastructure as a Service (IaaS) gives you virtual machines, disks and networks; you manage the operating system and everything above. Platform as a Service (PaaS) runs your code or your database for you; you do not touch the servers. Software as a Service (SaaS) is a finished application you just use, such as Gmail or Microsoft 365. The further up you go, the less control you have and the less work you do. A common comparison is pizza: making it at home from ingredients (on-premises), buying a take-and-bake (IaaS), having it delivered (PaaS), or eating at a restaurant (SaaS)."],
["Five traits (NIST definition): on-demand self-service, network access, pooled resources, rapid elasticity, measured (pay-per-use) service.",
 "IaaS: virtual machines and networks (EC2, Azure VMs, Compute Engine). You manage the OS.",
 "PaaS: managed platforms (App Service, Cloud Run, managed databases). You manage the code and data.",
 "SaaS: complete applications (Gmail, Salesforce, Microsoft 365).",
 "Public cloud: shared provider infrastructure. Private cloud: dedicated to one organisation. Hybrid: both, connected. Multi-cloud: several providers.",
 "Main benefits: speed, elasticity, global reach, no hardware to maintain, pay as you go.",
 "Main risks: cost surprises, security misconfiguration, dependence on one provider (lock-in)."],
"A ticket-booking startup expects 500 users on a normal day and 200,000 in the ten minutes after a concert goes on sale. Buying servers for the peak would bankrupt it. In the cloud it runs on two small servers most of the time and scales to a hundred for the sale, paying for those hundred for one hour.",
`
#  Who manages what?
#
#                    On-premises   IaaS        PaaS        SaaS
#  Application       you           you         you         provider
#  Data              you           you         you         provider*
#  Runtime           you           you         provider    provider
#  Operating system  you           you         provider    provider
#  Virtualisation    you           provider    provider    provider
#  Servers           you           provider    provider    provider
#  Storage           you           provider    provider    provider
#  Networking        you           provider    provider    provider
#
#  * you always remain responsible for your own data and who can access it
#
#  Examples
#  IaaS   AWS EC2          Azure Virtual Machines   Google Compute Engine
#  PaaS   AWS Elastic Beanstalk / App Runner   Azure App Service   Google Cloud Run / App Engine
#  SaaS   Gmail, Microsoft 365, Salesforce, Slack
`,
"The idea of computing as a utility was voiced by John McCarthy in 1961. Salesforce delivered software over the web from 1999. The modern cloud began when Amazon Web Services launched S3 and EC2 in 2006, renting out the kind of infrastructure it had built for its own shop. Google App Engine followed in 2008 and Microsoft Azure in 2010. The US standards body NIST published the standard definition in 2011.",
[["NIST definition of cloud computing (SP 800-145)", "https://csrc.nist.gov/pubs/sp/800/145/final"],
 ["AWS: What is cloud computing?", "https://aws.amazon.com/what-is-cloud-computing/"],
 ["Microsoft Learn: Describe cloud concepts", "https://learn.microsoft.com/en-us/training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/"],
 ["Google Cloud: What is cloud computing?", "https://cloud.google.com/learn/what-is-cloud-computing"]]),

X("Regions, availability zones and global infrastructure",
["Cloud providers run data centres all over the world, organised in a hierarchy that every design decision refers to. A region is a geographic area, such as Mumbai, Frankfurt or Northern Virginia, containing several data centres. Regions are independent of each other; a failure in one should not affect another.",
 "Inside a region are availability zones (AZs): one or more physically separate data centres, each with its own power, cooling and network, a few kilometres to tens of kilometres apart and joined by fast private links. They are far enough apart that a fire or flood affects only one, and close enough that data can be copied between them almost instantly. This is the main tool for high availability. If you put all your servers in one zone, a zone outage takes you down. If you spread them across two or three zones behind a load balancer, you survive it. Most managed services offer a 'multi-AZ' or 'zone-redundant' option that does this for you.",
 "You choose a region by four considerations. Latency: closer to your users is faster. Data residency: laws may require data to stay in a country. Service availability: new services reach some regions first. Price: the same service costs different amounts in different regions. In addition, providers run hundreds of smaller edge locations in cities worldwide for their CDN and DNS services, bringing content physically close to users."],
["Region = a geographic area with several data centres. Zone = an isolated data centre (or group) within a region.",
 "Deploy across at least two zones for production workloads.",
 "Choose a region for latency, legal requirements, available services and price.",
 "Edge locations serve cached content and DNS close to users.",
 "Most resources belong to one region; a few, such as identity and DNS, are global.",
 "Multi-region designs survive a whole-region outage but are much more complex and costly; use them only when the business requires it.",
 "Data moving between regions, and out to the internet, is charged (egress fees)."],
"An Indian fintech must keep customer financial data inside India by regulation. It chooses the Mumbai region, runs its application across three availability zones there, and keeps backups in the Hyderabad region for disaster recovery, so even the loss of all of Mumbai would not lose data and nothing leaves the country.",
`
#  Hierarchy                         AWS                  Azure                 Google Cloud
#  ---------------------------------------------------------------------------------------
#  Region                            Region               Region                Region
#   example (India)                  ap-south-1 (Mumbai)  Central India (Pune)  asia-south1 (Mumbai)
#  Isolated data centres             Availability Zone    Availability Zone     Zone
#   example                          ap-south-1a          Zone 1                asia-south1-a
#  Edge / CDN points                 Edge locations       Edge locations (PoPs) Edge locations
#
#  A highly available layout inside one region
#
#                        [ load balancer ]
#               +---------------+----------------+
#           zone a           zone b            zone c
#          [app][app]       [app][app]        [app][app]
#          [db primary] --> [db standby]      (automatic failover)

# list regions from the command line
aws ec2 describe-regions --query "Regions[].RegionName" --output table
az account list-locations --query "[].name" --output table
gcloud compute regions list
`,
"AWS opened with one region (US East, Virginia) in 2006 and introduced availability zones in 2008. Azure added availability zones in 2018. Large incidents, such as the 2011 AWS US-East outage, taught the industry to design for the loss of a zone.",
[["AWS global infrastructure", "https://aws.amazon.com/about-aws/global-infrastructure/"],
 ["Azure: What are availability zones?", "https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview"],
 ["Google Cloud: Regions and zones", "https://cloud.google.com/compute/docs/regions-zones"]]),

X("Amazon Web Services (AWS)",
["AWS is the oldest and largest cloud provider, with the broadest catalogue: over 200 services. Because it was first, it has the biggest community, the most third-party tooling and the most job listings, and it is the provider most often assumed in tutorials and interviews. Its range can be overwhelming, but a small core covers most real systems.",
 "Resources live in an AWS account, which is the basic container for billing and security. Companies use many accounts (for production, staging, each team) grouped under AWS Organizations. Inside an account you work in a chosen region. Every resource has a unique identifier called an ARN (Amazon Resource Name), and tags (key-value labels) are used to organise resources and track costs.",
 "The core services to know first are: IAM for identity and permissions; EC2 for virtual machines; S3 for object storage; RDS for managed relational databases and DynamoDB for NoSQL; VPC for private networking; Lambda for serverless functions; ECS and EKS for containers; Elastic Load Balancing and Auto Scaling; Route 53 for DNS; CloudFront for CDN; SQS and SNS for messaging; and CloudWatch for logs, metrics and alarms. You can drive all of them from the web console, the aws command-line tool, SDKs such as boto3 for Python, or infrastructure-as-code tools."],
["Account = billing and security boundary. Region = where resources run. ARN = unique resource name.",
 "Core: IAM, EC2, S3, RDS, DynamoDB, VPC, Lambda, ECS/EKS, ELB, Route 53, CloudFront, SQS/SNS, CloudWatch.",
 "Do not use the root user for daily work; protect it with multi-factor authentication.",
 "The Free Tier lets you learn at little or no cost, but set a billing alarm on day one.",
 "CLI: aws SERVICE COMMAND, for example aws s3 ls.",
 "Infrastructure as code: CloudFormation, the CDK, or Terraform.",
 "Entry certification: AWS Certified Cloud Practitioner, then Solutions Architect Associate."],
"Netflix runs its streaming service on AWS, using thousands of EC2 instances that scale with the evening viewing peak, S3 for storing video files, and DynamoDB and other databases for user data. It finished moving out of its own data centres in 2016.",
`
# install the CLI, then configure credentials
aws configure                      # access key, secret, default region, output format
aws sts get-caller-identity        # who am I?

# S3: object storage
aws s3 mb s3://my-company-demo-bucket-2026
aws s3 cp report.pdf s3://my-company-demo-bucket-2026/reports/
aws s3 ls s3://my-company-demo-bucket-2026/reports/

# EC2: virtual machines
aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,InstanceType]" --output table

# the same from Python with boto3
import boto3

s3 = boto3.client("s3")
for bucket in s3.list_buckets()["Buckets"]:
    print(bucket["Name"])

ec2 = boto3.resource("ec2", region_name="ap-south-1")
for instance in ec2.instances.all():
    print(instance.id, instance.state["Name"], instance.instance_type)
`,
"AWS grew out of Amazon's own need for scalable infrastructure. It launched S3 in March 2006 and EC2 in August 2006, led by Andy Jassy, who later became Amazon's chief executive. Lambda (2014) started the serverless movement. AWS remains the market leader, with roughly a third of the cloud infrastructure market.",
[["AWS documentation", "https://docs.aws.amazon.com/"],
 ["Getting started with AWS", "https://aws.amazon.com/getting-started/"],
 ["AWS Free Tier", "https://aws.amazon.com/free/"],
 ["AWS CLI documentation", "https://docs.aws.amazon.com/cli/"]]),

X("Microsoft Azure",
["Azure is Microsoft's cloud and the second largest. Its great strength is integration with what enterprises already use: Windows Server, Active Directory, SQL Server, Microsoft 365 and .NET. A company whose staff already sign in with Microsoft accounts and whose software is licensed from Microsoft can extend into Azure very naturally, which is why Azure is especially common in large corporations, banks and government. It also offers OpenAI's models through Azure OpenAI Service.",
 "Azure has a distinctive organisational structure worth learning first. At the top is a tenant, which is your organisation's identity directory in Microsoft Entra ID (formerly Azure Active Directory). Under it are management groups, then subscriptions, which are the billing and access boundary, like an AWS account. Inside a subscription, every resource must belong to a resource group: a folder for resources that share a life cycle, such as everything for one application. Deleting the resource group deletes everything in it, which makes clean-up easy.",
 "Core services: Microsoft Entra ID for identity; Virtual Machines; App Service for hosting web applications without managing servers; Azure Functions for serverless; AKS for Kubernetes; Blob Storage for objects; Azure SQL Database and Cosmos DB for data; Virtual Network; Azure Monitor; and Azure DevOps for pipelines. You manage them through the Azure portal, the az command line, Azure PowerShell, or infrastructure as code with Bicep or Terraform."],
["Hierarchy: tenant (Entra ID) -> management groups -> subscriptions -> resource groups -> resources.",
 "Every resource lives in exactly one resource group.",
 "Core: Entra ID, Virtual Machines, App Service, Functions, AKS, Blob Storage, Azure SQL, Cosmos DB, Virtual Network, Monitor.",
 "Strong for Windows, .NET, SQL Server and hybrid setups that link to on-premises data centres (Azure Arc).",
 "CLI: az GROUP COMMAND, for example az group list. Also Azure PowerShell (Az module).",
 "Infrastructure as code: Bicep (Azure's own language), ARM templates, or Terraform.",
 "Entry certification: AZ-900 Azure Fundamentals, then AZ-104 Administrator."],
"A hospital group runs Windows servers and SQL Server in its own data centre and manages 20,000 staff logins in Active Directory. It moves to Azure because staff keep the same logins through Entra ID, its SQL Server databases migrate to Azure SQL with little change, and existing Microsoft licences reduce the cost.",
`
# sign in and choose a subscription
az login
az account show --output table
az account set --subscription "My Subscription"

# a resource group holds related resources
az group create --name rg-shop-dev --location centralindia

# storage account and a blob container
az storage account create --name stshopdev2026 --resource-group rg-shop-dev --location centralindia --sku Standard_LRS
az storage container create --name reports --account-name stshopdev2026 --auth-mode login
az storage blob upload --account-name stshopdev2026 --container-name reports --name report.pdf --file report.pdf --auth-mode login

# deploy a web app from the current folder
az webapp up --name shop-api-dev-2026 --resource-group rg-shop-dev --runtime "PYTHON:3.12"

# list everything in the group, then delete it all in one go
az resource list --resource-group rg-shop-dev --output table
az group delete --name rg-shop-dev --yes

# the same idea in PowerShell
# Connect-AzAccount
# Get-AzResourceGroup | Select-Object ResourceGroupName, Location
`,
"Microsoft announced 'Windows Azure' in 2008 and released it in February 2010, first as a platform-as-a-service. Under Satya Nadella, who led the cloud division before becoming chief executive in 2014, it was renamed Microsoft Azure and embraced Linux and open source. Azure Active Directory was renamed Microsoft Entra ID in 2023.",
[["Azure documentation", "https://learn.microsoft.com/en-us/azure/"],
 ["Azure fundamentals learning path", "https://learn.microsoft.com/en-us/training/paths/microsoft-azure-fundamentals-describe-cloud-concepts/"],
 ["Azure free account", "https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account"],
 ["Azure CLI documentation", "https://learn.microsoft.com/en-us/cli/azure/"]]),

X("Google Cloud Platform (GCP)",
["Google Cloud is the third of the big three. It runs on the same infrastructure Google built for Search, YouTube and Gmail, including one of the world's largest private networks. It is particularly known for data analytics, machine learning and containers: Google invented Kubernetes, and its BigQuery data warehouse and Vertex AI platform are leaders in their fields. Many data-heavy and AI-focused companies choose it for those strengths.",
 "The organising unit in Google Cloud is the project. Every resource belongs to a project, and the project is where billing, permissions and enabled APIs are set. A new service usually has to be enabled in a project before you can use it. Projects can be grouped in folders under an organisation, which represents your company. Compared with the other two, Google Cloud's networking is notably global: a single VPC network can span all regions, and its load balancer offers one global IP address serving users worldwide.",
 "Core services: Cloud IAM for permissions; Compute Engine for virtual machines; Cloud Run for running containers with no servers to manage, which is one of the simplest ways to deploy an application on any cloud; GKE for Kubernetes; Cloud Functions; Cloud Storage for objects; Cloud SQL, Firestore, Spanner and Bigtable for databases; BigQuery for analytics; Pub/Sub for messaging; and Vertex AI. They are managed from the Cloud console, the gcloud command line, client libraries or Terraform."],
["Hierarchy: organisation -> folders -> projects -> resources.",
 "A project is the boundary for billing, permissions and APIs; enable an API before using a service.",
 "Core: IAM, Compute Engine, Cloud Run, GKE, Cloud Storage, Cloud SQL, Firestore, BigQuery, Pub/Sub, Vertex AI.",
 "Strengths: data analytics (BigQuery), AI and ML, Kubernetes, global network.",
 "CLI: gcloud GROUP COMMAND, for example gcloud projects list. Storage also uses 'gcloud storage'.",
 "Cloud Shell gives a free browser terminal with the tools already installed.",
 "Entry certification: Cloud Digital Leader, then Associate Cloud Engineer."],
"Spotify moved from its own data centres to Google Cloud from 2016, largely for BigQuery and the data tools. They let its engineers analyse billions of listening events a day to produce features such as personalised playlists, without running the analytics clusters themselves.",
`
# sign in and select a project
gcloud auth login
gcloud projects list
gcloud config set project my-shop-dev-2026
gcloud config set run/region asia-south1

# enable the services you need in this project
gcloud services enable run.googleapis.com storage.googleapis.com

# Cloud Storage: buckets and objects
gcloud storage buckets create gs://my-shop-dev-2026-reports --location asia-south1
gcloud storage cp report.pdf gs://my-shop-dev-2026-reports/
gcloud storage ls gs://my-shop-dev-2026-reports/

# Cloud Run: build the code in this folder into a container and run it
gcloud run deploy shop-api --source . --allow-unauthenticated

# BigQuery: SQL over very large data
bq query --use_legacy_sql=false 'SELECT name, SUM(number) AS total FROM bigquery-public-data.usa_names.usa_1910_2013 GROUP BY name ORDER BY total DESC LIMIT 5'

# the same from Python
from google.cloud import storage          # pip install google-cloud-storage
client = storage.Client()
for bucket in client.list_buckets():
    print(bucket.name)
`,
"Google's cloud began with App Engine in 2008, a platform-as-a-service ahead of its time. Compute Engine followed in 2012. Google open-sourced Kubernetes in 2014, based on its internal Borg system, and it became the industry standard for running containers. BigQuery descends from Google's internal Dremel system, described in a 2010 paper.",
[["Google Cloud documentation", "https://cloud.google.com/docs"],
 ["Get started with Google Cloud", "https://cloud.google.com/docs/get-started"],
 ["Google Cloud Free Program", "https://cloud.google.com/free"],
 ["gcloud CLI documentation", "https://cloud.google.com/sdk/docs"]]),

X("Identity and access management (IAM)",
["IAM answers one question for every request made to the cloud: who is allowed to do what, on which resource? It is the foundation of cloud security. Most serious cloud breaches are not clever hacks; they are IAM mistakes such as a leaked access key with far too many permissions, or a storage bucket opened to the public.",
 "The concepts are the same on every provider, though the names differ. A principal (or identity) is who is asking: a human user, a group of users, or a non-human identity for an application. A permission is a single allowed action, such as 'read objects in this bucket'. A policy or role bundles permissions together. You grant a role to a principal on a scope (one resource, a group of resources, or a whole account), and permissions are inherited downwards. Everything is denied by default; access exists only where it has been explicitly granted.",
 "Two principles matter most. Least privilege: give each identity only the permissions it needs, and nothing more. And avoid long-lived secrets: an application running in the cloud should not have an access key stored in its code or configuration. Instead you attach an identity to the compute resource itself (an IAM role on AWS, a managed identity on Azure, a service account on Google Cloud), and the platform supplies short-lived credentials automatically. For people, always turn on multi-factor authentication, and use single sign-on with your company directory."],
["Authentication = proving who you are. Authorisation = what you may do.",
 "Principal + role (set of permissions) + scope = an access grant.",
 "Default deny: nothing is allowed until granted.",
 "Least privilege: start with nothing and add; avoid wildcards and 'admin' roles.",
 "AWS: IAM users, groups, roles and JSON policies. Azure: Entra ID identities plus Azure RBAC role assignments. GCP: principals bound to roles in an allow policy.",
 "Workload identity: IAM role (AWS), managed identity (Azure), service account (GCP). No keys in code.",
 "Enable MFA for all people, above all for the root or global administrator.",
 "Review and remove unused permissions and keys regularly; turn on audit logging."],
"A developer hard-codes an AWS access key with administrator rights into a script and pushes it to a public GitHub repository. Bots scanning GitHub find it within minutes and launch hundreds of large servers to mine cryptocurrency, running up a bill of tens of thousands of dollars. With an IAM role attached to the server and a least-privilege policy, there would have been no key to leak and little it could have done.",
`
# AWS: a least-privilege policy - read-only access to one folder of one bucket
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-company-invoices/2026/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-company-invoices"
    }
  ]
}

# Azure: give a web app's managed identity read access to one storage account
az webapp identity assign --name shop-api --resource-group rg-shop
az role assignment create --assignee PRINCIPAL_ID --role "Storage Blob Data Reader" --scope /subscriptions/SUB_ID/resourceGroups/rg-shop/providers/Microsoft.Storage/storageAccounts/stshop

# Google Cloud: let a service account read objects in one bucket
gcloud iam service-accounts create shop-api-sa
gcloud storage buckets add-iam-policy-binding gs://my-shop-reports --member "serviceAccount:shop-api-sa@my-project.iam.gserviceaccount.com" --role "roles/storage.objectViewer"

# application code needs no keys: the SDK finds the attached identity
import boto3
s3 = boto3.client("s3")              # credentials come from the instance's IAM role
`,
"AWS launched IAM in 2011; before that an account had a single all-powerful set of keys. Role-based access control (RBAC) was formalised by David Ferraiolo and Richard Kuhn of NIST in 1992. The 2019 Capital One breach, which exposed 100 million customers' data through an over-permissioned role, became the standard case study in why least privilege matters.",
[["AWS IAM documentation", "https://docs.aws.amazon.com/iam/"],
 ["AWS: Security best practices in IAM", "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"],
 ["Azure role-based access control (RBAC)", "https://learn.microsoft.com/en-us/azure/role-based-access-control/overview"],
 ["Google Cloud IAM documentation", "https://cloud.google.com/iam/docs"]]),

X("Compute: virtual machines, containers and serverless",
["Compute is where your code runs. Every provider offers a range of options that differ in how much you manage yourself. Moving along that range you give up control and gain convenience. Choosing the right level is one of the main cloud design decisions.",
 "Virtual machines (AWS EC2, Azure Virtual Machines, Google Compute Engine) are rented servers. You pick a size (CPU and memory), an operating system image and a disk, and you get full control: you install, patch and secure everything. They suit software that needs a specific setup, legacy applications and steady heavy workloads. Containers come next. You package the application as a Docker image and the platform runs it. Managed Kubernetes (EKS, AKS, GKE) gives great power with real complexity. Simpler 'serverless container' services (AWS Fargate and App Runner, Azure Container Apps, Google Cloud Run) run your container and scale it, even down to zero, with no cluster to operate. For most new web services this is the sweet spot.",
 "Serverless functions (AWS Lambda, Azure Functions, Google Cloud Functions) go furthest. You upload a single function; the platform runs it when an event occurs, such as an HTTP request, a file upload or a queue message, scales automatically, and bills for the milliseconds used. There is nothing to manage and no cost when idle. The limits are a maximum run time, a short delay when a function starts after being idle (a cold start), and a programming model tied to the provider."],
["Virtual machines: most control, most work. You patch the OS.",
 "Managed Kubernetes: powerful and portable, significant operational skill needed.",
 "Serverless containers: bring an image, the platform does the rest. A strong default.",
 "Functions: event-driven, pay per execution, scale to zero; limits on duration and cold starts.",
 "Instance pricing: on-demand (flexible), reserved or committed use (cheaper for steady load, 1 to 3 year commitment), spot or preemptible (very cheap, can be taken away at short notice).",
 "Auto-scaling groups add and remove machines with demand.",
 "Rule of thumb: start with the most managed option that meets your needs, and step down only when you hit a real limit."],
"A photo-sharing app needs thumbnails for every uploaded image. Instead of a server running all day waiting for uploads, a serverless function is triggered each time a file lands in storage, creates the thumbnail in about 300 milliseconds and stops. At 10,000 uploads a day it costs a few cents, and during a viral spike it scales to thousands of copies by itself.",
`
#  Level                 AWS                     Azure                    Google Cloud
#  ------------------------------------------------------------------------------------------
#  Virtual machines      EC2                     Virtual Machines         Compute Engine
#  Managed Kubernetes    EKS                     AKS                      GKE
#  Serverless containers Fargate, App Runner     Container Apps           Cloud Run
#  Web app platform      Elastic Beanstalk       App Service              App Engine
#  Functions             Lambda                  Functions                Cloud Functions (Cloud Run functions)

# AWS Lambda: make a thumbnail whenever an image is uploaded to S3
import io
import urllib.parse
import boto3
from PIL import Image

s3 = boto3.client("s3")

def handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])   # keys arrive URL-encoded

        original = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
        image = Image.open(io.BytesIO(original))
        image.thumbnail((200, 200))

        out = io.BytesIO()
        image.save(out, format="JPEG")
        s3.put_object(Bucket=f"{bucket}-thumbnails", Key=key, Body=out.getvalue())
    return {"processed": len(event["Records"])}

# create a virtual machine on each cloud
# aws ec2 run-instances --image-id ami-xxxxxxxx --instance-type t3.micro --key-name my-key
# az vm create --resource-group rg-demo --name vm1 --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys
# gcloud compute instances create vm1 --machine-type e2-micro --zone asia-south1-a
`,
"Virtualisation dates from IBM mainframes in the 1960s and was brought to ordinary servers by VMware in 1999. EC2 (2006) made virtual machines rentable by the hour. AWS Lambda (2014) introduced functions as a service, and Google Cloud Run (2019) popularised serverless containers.",
[["Amazon EC2 documentation", "https://docs.aws.amazon.com/ec2/"],
 ["AWS Lambda documentation", "https://docs.aws.amazon.com/lambda/"],
 ["Azure: Choose a compute service", "https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree"],
 ["Google Cloud Run documentation", "https://cloud.google.com/run/docs"]]),

X("Storage: object, block and file",
["Cloud storage comes in three kinds that behave very differently, and using the wrong one is a common beginner mistake. Object storage (Amazon S3, Azure Blob Storage, Google Cloud Storage) keeps files as whole objects in containers called buckets, each addressed by a key such as reports/2026/october.pdf and reached over HTTP. It is effectively unlimited in size, extremely durable and cheap. But it is not a file system: you cannot edit part of an object in place; you replace the whole thing. It is the right home for images, videos, backups, logs, static websites and data lakes.",
 "Block storage (Amazon EBS, Azure Managed Disks, Google Persistent Disk) is a virtual hard disk attached to one virtual machine. The operating system formats it and uses it like a local drive, with fast random reads and writes. It is what a database server or a boot disk needs. File storage (Amazon EFS, Azure Files, Google Filestore) is a shared network folder that many machines can mount at the same time, for applications that expect an ordinary shared file system.",
 "Object storage offers storage classes, or tiers, that trade retrieval speed and cost for price. Frequently used data stays in the standard (hot) tier. Data that is rarely read moves to cheaper infrequent-access (cool) tiers. Archives that may never be read go to archive tiers costing a small fraction of standard, with retrieval taking minutes to hours. Lifecycle rules move objects between tiers or delete them automatically as they age. Providers quote durability of 99.999999999% (eleven nines) for object storage, achieved by keeping several copies across zones."],
["Object storage: buckets and keys, HTTP access, unlimited, cheap; replace whole objects.",
 "Block storage: a disk for one VM; fast; for databases and boot volumes.",
 "File storage: a shared folder mounted by many machines.",
 "Durability (not losing data) is different from availability (being reachable right now).",
 "Tiers: hot / standard, cool / infrequent access, archive. Colder is cheaper to store, costlier and slower to read.",
 "Lifecycle rules automate tiering and deletion.",
 "Keep buckets private by default; share with time-limited signed URLs.",
 "Turn on versioning to recover from accidental deletes and overwrites; turn on encryption."],
"A hospital must keep scan images for ten years. New scans are viewed often, so they stay in the standard tier. A lifecycle rule moves them to the infrequent-access tier after 90 days and to the archive tier after a year, cutting the storage bill by about 80% with no manual work.",
`
#  Kind      AWS                 Azure                  Google Cloud
#  -------------------------------------------------------------------------
#  Object    S3                  Blob Storage           Cloud Storage
#  Block     EBS                 Managed Disks          Persistent Disk
#  File      EFS, FSx            Azure Files            Filestore
#  Archive   S3 Glacier classes  Archive access tier    Archive storage class

import boto3

s3 = boto3.client("s3")

# upload and download
s3.upload_file("scan-001.dcm", "hospital-scans", "2026/10/scan-001.dcm")
s3.download_file("hospital-scans", "2026/10/scan-001.dcm", "local-copy.dcm")

# share a private object for 15 minutes without making the bucket public
url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "hospital-scans", "Key": "2026/10/scan-001.dcm"},
    ExpiresIn=900,
)

# lifecycle: cheaper tiers as data ages, delete after 10 years
s3.put_bucket_lifecycle_configuration(
    Bucket="hospital-scans",
    LifecycleConfiguration={"Rules": [{
        "ID": "age-out",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Transitions": [
            {"Days": 90, "StorageClass": "STANDARD_IA"},
            {"Days": 365, "StorageClass": "GLACIER"},
        ],
        "Expiration": {"Days": 3650},
    }]},
)

# protect against accidental deletion
s3.put_bucket_versioning(Bucket="hospital-scans", VersioningConfiguration={"Status": "Enabled"})
`,
"Amazon S3, launched on 14 March 2006, was the first AWS service generally available and defined object storage as we know it; its API has become a de facto standard that many other products imitate. By 2021 S3 held over 100 trillion objects. Amazon Glacier introduced cheap archive storage in 2012.",
[["Amazon S3 documentation", "https://docs.aws.amazon.com/s3/"],
 ["Azure Storage documentation", "https://learn.microsoft.com/en-us/azure/storage/"],
 ["Google Cloud Storage documentation", "https://cloud.google.com/storage/docs"]]),

X("Databases in the cloud",
["You can install a database on a virtual machine yourself, but then you are responsible for installation, patching, backups, replication, failover and monitoring. A managed database service does all of that for you. You choose the engine and the size; the provider handles the operations. For most teams this is one of the most valuable things the cloud offers, because running databases well is hard and mistakes lose data.",
 "For relational data, each provider offers managed versions of the familiar engines. Amazon RDS runs PostgreSQL, MySQL, MariaDB, SQL Server and Oracle; Amazon Aurora is AWS's own faster, cloud-native engine compatible with PostgreSQL and MySQL. Azure has Azure SQL Database (SQL Server) and Azure Database for PostgreSQL and MySQL. Google has Cloud SQL, AlloyDB, and Spanner, a globally distributed relational database. They provide automatic backups with point-in-time recovery, a standby copy in another zone with automatic failover, and read replicas.",
 "For NoSQL, the main services are Amazon DynamoDB, Azure Cosmos DB, and Google's Firestore and Bigtable. They scale almost without limit and can be billed per request. For caching there are managed Redis services (ElastiCache, Azure Cache for Redis, Memorystore). For analytics over very large data there are data warehouses: Amazon Redshift, Azure Synapse and Microsoft Fabric, and Google BigQuery. These store data by column and can scan billions of rows in seconds, but they are for reporting and analysis, not for running an application's transactions."],
["Managed database = the provider handles patching, backups, failover and replication.",
 "Relational: RDS / Aurora (AWS), Azure SQL and Azure Database for PostgreSQL, Cloud SQL / AlloyDB / Spanner (GCP).",
 "NoSQL: DynamoDB (AWS), Cosmos DB (Azure), Firestore and Bigtable (GCP).",
 "Cache: ElastiCache, Azure Cache for Redis, Memorystore.",
 "Warehouse (analytics): Redshift, Synapse / Fabric, BigQuery.",
 "Turn on multi-zone high availability and automated backups for production.",
 "Keep databases in private subnets with no public IP address.",
 "OLTP = many small transactions (applications). OLAP = large analytical queries (reporting). Use different systems for each."],
"A three-person startup needs a production PostgreSQL database but has no database administrator. It creates a managed instance with multi-zone failover and daily backups in ten minutes. When a developer accidentally deletes a table six months later, point-in-time recovery restores the database to the minute before the mistake.",
`
#  Type            AWS                    Azure                               Google Cloud
#  -----------------------------------------------------------------------------------------------
#  Relational      RDS, Aurora            Azure SQL, DB for PostgreSQL/MySQL  Cloud SQL, AlloyDB, Spanner
#  Key-value/doc   DynamoDB, DocumentDB   Cosmos DB                           Firestore, Bigtable
#  Cache           ElastiCache            Azure Cache for Redis               Memorystore
#  Data warehouse  Redshift               Synapse Analytics, Fabric           BigQuery

# create a managed PostgreSQL with a standby in another zone and 7 days of backups
aws rds create-db-instance --db-instance-identifier shop-db --engine postgres --db-instance-class db.t4g.micro --allocated-storage 20 --master-username shopadmin --manage-master-user-password --multi-az --backup-retention-period 7 --no-publicly-accessible

# restore to a moment before a mistake
aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier shop-db --target-db-instance-identifier shop-db-restored --restore-time 2026-10-05T09:14:00Z

# DynamoDB from Python: a key-value table, billed per request
import boto3

table = boto3.resource("dynamodb").Table("carts")
table.put_item(Item={"user_id": "u-7", "items": [{"sku": "pen", "qty": 2}]})
cart = table.get_item(Key={"user_id": "u-7"}).get("Item")
print(cart)

# BigQuery: analytics over huge tables with plain SQL
# SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(total) AS revenue
# FROM shop.orders WHERE created_at >= '2026-01-01' GROUP BY day ORDER BY day;
`,
"Amazon RDS launched in 2009, offering MySQL as a service. DynamoDB (2012) grew out of the 2007 Dynamo paper. Google's Spanner paper (2012) described a globally consistent database using atomic clocks, and Amazon Aurora (2014) redesigned storage for the cloud. BigQuery became generally available in 2011.",
[["Amazon RDS documentation", "https://docs.aws.amazon.com/rds/"],
 ["Azure SQL documentation", "https://learn.microsoft.com/en-us/azure/azure-sql/"],
 ["Google Cloud SQL documentation", "https://cloud.google.com/sql/docs"],
 ["AWS: Choosing a database", "https://docs.aws.amazon.com/decision-guides/latest/databases-on-aws-how-to-choose/databases-on-aws-how-to-choose.html"]]),

X("Networking in the cloud",
["Cloud networking gives you a private, isolated network of your own inside the provider's data centres, in which you place your resources and control exactly what can talk to what. It is called a VPC (Virtual Private Cloud) on AWS and Google Cloud, and a Virtual Network (VNet) on Azure. Everything from the networking basics applies: you choose a private CIDR range, such as 10.0.0.0/16, and divide it into subnets.",
 "The key design idea is the split between public and private subnets. A public subnet has a route to an internet gateway, so resources in it can have public IP addresses and be reached from the internet. Only things that must face the internet go there, typically just the load balancer. A private subnet has no such route; nothing outside can start a connection to it. Application servers and databases live in private subnets. When they need to reach out, for example to download updates, they go through a NAT gateway, which permits outbound connections and blocks inbound ones.",
 "Traffic is filtered by virtual firewalls. Security groups (AWS), network security groups (Azure) and firewall rules (Google Cloud) list what is allowed by protocol, port and source. A well-built system chains them: the load balancer accepts port 443 from the internet; the application servers accept traffic only from the load balancer; the database accepts traffic only from the application servers. Further services round this out: managed load balancers, DNS (Route 53, Azure DNS, Cloud DNS), CDNs (CloudFront, Azure Front Door, Cloud CDN), and private links to your own offices through VPN or dedicated lines."],
["VPC / VNet = your private network, with a CIDR range you choose.",
 "Public subnet: routed to the internet gateway. Private subnet: no inbound route from the internet.",
 "Only the load balancer (and perhaps a bastion host) belongs in a public subnet.",
 "NAT gateway: outbound-only internet access for private subnets.",
 "Security groups are stateful allow-lists; reference other groups as the source, not IP ranges.",
 "Spread subnets across availability zones for resilience.",
 "Never open SSH (22), RDP (3389) or database ports to 0.0.0.0/0.",
 "Private endpoints let you reach services such as object storage without leaving the provider's network."],
"A standard three-tier web application: a load balancer in public subnets across two zones takes HTTPS from the internet; application containers in private subnets accept traffic only from the load balancer; a managed PostgreSQL database in separate private subnets accepts port 5432 only from the application's security group. An attacker scanning the internet can see nothing but the load balancer.",
`
#  VPC 10.0.0.0/16   (one region, two availability zones)
#
#                        internet
#                           |
#                   [ internet gateway ]
#                           |
#   public subnets    [ load balancer ]        10.0.1.0/24 (zone a)   10.0.2.0/24 (zone b)
#                     [ NAT gateway ]
#                           |
#   private app       [app] [app] [app]        10.0.11.0/24           10.0.12.0/24
#   subnets                 |
#   private data      [db primary] [standby]   10.0.21.0/24           10.0.22.0/24
#   subnets
#
#  Security groups, chained by reference
#   sg-lb    inbound 443 from 0.0.0.0/0
#   sg-app   inbound 8000 from sg-lb
#   sg-db    inbound 5432 from sg-app

# the same in Terraform (AWS)
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private_app_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "ap-south-1a"
}

resource "aws_security_group" "db" {
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]     # only the app tier
  }
}
`,
"Early EC2 instances all shared one flat network ('EC2-Classic'). Amazon introduced the Virtual Private Cloud in 2009 and made it the default in 2013. Software-defined networking, which makes such virtual networks possible, came out of research at Stanford and Berkeley around 2008.",
[["Amazon VPC documentation", "https://docs.aws.amazon.com/vpc/"],
 ["Azure Virtual Network documentation", "https://learn.microsoft.com/en-us/azure/virtual-network/"],
 ["Google Cloud VPC documentation", "https://cloud.google.com/vpc/docs"]]),

X("Cost and pricing",
["The cloud's pay-as-you-go model is its great advantage and its great danger. Nobody stops you from creating expensive resources, and everything you leave running keeps charging. A forgotten test cluster, an oversized database or an unnoticed flow of data between regions can turn into a shocking bill. Managing cost is an engineering responsibility, now a recognised discipline called FinOps.",
 "You are billed along a few main dimensions. Compute is charged for the time an instance runs, by the second or hour, according to its size. Storage is charged per gigabyte per month, depending on the tier. Requests are charged per million for serverless and many managed services. And data transfer is the one that surprises people: data coming into the cloud is generally free, but data going out to the internet, and often between regions and zones, is charged per gigabyte. This egress charge is a major hidden cost and a reason moving away from a provider is expensive.",
 "There are standard ways to pay less. Right-sizing means choosing an instance that matches actual usage; many servers run at 5% CPU. Shutting down non-production environments at night and weekends saves about 70% of their cost. Committing to one or three years of steady usage (reserved instances, savings plans, committed-use discounts) cuts prices by 30% to 70%. Spot or preemptible instances cost up to 90% less for work that can tolerate interruption, such as batch jobs. Auto-scaling and serverless make cost follow real demand. Before any of that, do the basics: set budgets with alerts, tag every resource with its owner and project, and look at the cost report each week."],
["Set a budget and billing alerts on the first day; it is the most important single step.",
 "You pay for what you provision, whether or not you use it. Stopped VMs still pay for their disks.",
 "Main charges: compute time, storage size, requests, data transfer out (egress).",
 "Tag resources (project, environment, owner) so costs can be attributed.",
 "Right-size; shut down what is idle; delete unattached disks, old snapshots and unused IP addresses.",
 "Commit for steady load; use spot or preemptible for interruptible work; serverless for spiky work.",
 "Use lifecycle rules to move old data to cheaper storage tiers.",
 "Estimate before you build with each provider's pricing calculator.",
 "Free tiers are for learning, and they have limits and expiry dates."],
"A student follows a Kubernetes tutorial, creates a three-node cluster with a load balancer, and forgets about it. A month later the bill is 150 dollars. A budget alert at 10 dollars would have warned them on the second day, and deleting the resource group or project at the end of the tutorial would have cost almost nothing.",
`
#  Rough comparison of ways to pay for the same virtual machine
#
#  On-demand                 100%     no commitment, start and stop any time
#  1-year commitment         ~60-70%  steady, predictable workloads
#  3-year commitment         ~40-50%  long-lived baseline
#  Spot / preemptible        ~10-40%  can be reclaimed with 30 seconds to 2 minutes notice
#
#  Dev server on 24 x 7:        730 hours a month
#  Dev server on 10 x 5 only:   about 217 hours a month   -> about 70% cheaper

# AWS: a monthly budget with an email alert at 80%
aws budgets create-budget --account-id 123456789012 --budget '{"BudgetName":"monthly","BudgetLimit":{"Amount":"50","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"me@example.com"}]}]'

# what did I spend, by service, last month?
aws ce get-cost-and-usage --time-period Start=2026-09-01,End=2026-10-01 --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE

# find waste: disks not attached to anything
aws ec2 describe-volumes --filters Name=status,Values=available --query "Volumes[].[VolumeId,Size]" --output table

# Azure and Google Cloud equivalents
# az consumption budget create --budget-name monthly --amount 50 --time-grain monthly --category cost --start-date 2026-10-01 --end-date 2027-10-01
# gcloud billing budgets create --billing-account ACCOUNT_ID --display-name monthly --budget-amount 50USD

# clean up after learning: delete the whole container of resources
# az group delete --name rg-demo --yes
# gcloud projects delete my-demo-project
`,
"EC2's hourly pricing in 2006 was revolutionary; per-second billing arrived in 2017. Spot instances date from 2009. As cloud bills grew into the largest technology expense for many companies, the FinOps Foundation was formed in 2019 to define practices for managing them.",
[["AWS Pricing Calculator", "https://calculator.aws/"],
 ["Azure Pricing Calculator", "https://azure.microsoft.com/en-us/pricing/calculator/"],
 ["Google Cloud Pricing Calculator", "https://cloud.google.com/products/calculator"],
 ["FinOps Foundation: What is FinOps?", "https://www.finops.org/introduction/what-is-finops/"]]),

X("Security and the shared responsibility model",
["Moving to the cloud does not hand security over to the provider. It divides it. The shared responsibility model sets out who is responsible for what, and misunderstanding it is behind most cloud security incidents. In short: the provider is responsible for the security of the cloud, and you are responsible for security in the cloud.",
 "The provider secures the things you cannot touch: the buildings, the hardware, the network backbone, the virtualisation layer and the managed services' own software. You secure what you put there and how you configure it: your data, who has access to it, your network rules, your operating systems and applications, and encryption settings. The line moves with the service type. On a virtual machine you patch the operating system; with a managed database or a serverless function the provider does. But in every model, your data and your access configuration stay your responsibility. A storage bucket set to public is your mistake, not the provider's.",
 "A short list of practices prevents most problems. Use IAM with least privilege and multi-factor authentication. Encrypt data at rest and in transit, and keep keys in the provider's key management service. Keep secrets in a secrets manager, never in code. Keep resources in private networks and block public access to storage by default. Turn on audit logging (CloudTrail, Azure Activity Log, Cloud Audit Logs) so every action is recorded. Enable the provider's security posture tools, which continuously check your configuration against best practice. And back up, then test the restore."],
["Provider: physical security, hardware, network, hypervisor, managed service software.",
 "You: data, identities and access, configuration, network rules, OS and application patching (on VMs), encryption choices.",
 "Your data and your access settings are always your responsibility.",
 "Misconfiguration, not provider failure, causes the great majority of cloud breaches.",
 "Encrypt at rest and in transit; manage keys with KMS / Key Vault / Cloud KMS.",
 "Secrets in Secrets Manager / Key Vault / Secret Manager, not in code or images.",
 "Block public access to storage at the account level.",
 "Enable audit logs and a posture tool: AWS Security Hub, Microsoft Defender for Cloud, Google Security Command Center.",
 "Each provider publishes a framework of best practice: Well-Architected (AWS and Azure) and the Well-Architected Framework (Google Cloud)."],
"A company stores customer documents in an object storage bucket and, to make a demo work quickly, sets it to public. Months later a researcher finds millions of files readable by anyone with the URL. The provider's systems worked exactly as configured; the breach was the customer's configuration. Account-level 'block public access' and a posture scanner would have caught it the same day.",
`
#  Shared responsibility by service type
#
#                          VMs (IaaS)    Managed DB / PaaS    SaaS
#  Data and its access     you           you                  you
#  Identity and MFA        you           you                  you
#  App code                you           you                  provider
#  Network rules           you           you (partly)         provider
#  Operating system        you           provider             provider
#  Hypervisor, hardware    provider      provider             provider
#  Physical data centre    provider      provider             provider

# AWS: block all public access to S3 for the whole account
aws s3control put-public-access-block --account-id 123456789012 --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# default encryption on a bucket
aws s3api put-bucket-encryption --bucket my-company-docs --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'

# record every API call in the account
aws cloudtrail create-trail --name org-audit --s3-bucket-name my-company-audit-logs --is-multi-region-trail
aws cloudtrail start-logging --name org-audit

# read a secret at run time instead of storing it in code
import boto3, json
secret = boto3.client("secretsmanager").get_secret_value(SecretId="prod/shop/db")
db = json.loads(secret["SecretString"])
# connect using db["username"] and db["password"]

# Azure:  az keyvault secret show --vault-name kv-shop --name db-password
# GCP:    gcloud secrets versions access latest --secret db-password
`,
"AWS formalised the shared responsibility model in the early 2010s as enterprises asked who was accountable for what. A long series of exposed-bucket incidents from 2017 onward led AWS to add 'Block Public Access' in 2018 and to make new buckets private by default in 2023.",
[["AWS shared responsibility model", "https://aws.amazon.com/compliance/shared-responsibility-model/"],
 ["Azure: Shared responsibility in the cloud", "https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility"],
 ["Google Cloud: Shared responsibilities and shared fate", "https://cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate"],
 ["AWS Well-Architected Framework", "https://aws.amazon.com/architecture/well-architected/"]]),

X("Service comparison: AWS, Azure and GCP side by side",
["The three providers offer the same building blocks under different names. Once you understand a concept on one cloud, moving to another is mostly a matter of learning the new name and the differences in detail. This table of equivalents is the fastest way to translate what you know.",
 "The equivalents are close but not identical. Features, limits, pricing and behaviour differ, sometimes in ways that matter. For example, a Google Cloud VPC is global while AWS and Azure networks are regional; Azure requires resource groups while the others do not; and their IAM models, though similar in purpose, are structured differently. Always read the documentation for the specific service before relying on an assumption carried over from another cloud.",
 "How should you choose a provider? In practice the decision is often made by circumstances: what the company already uses, what skills the team has, where its customers and regulators are, and commercial terms. As a rough guide, AWS has the widest range and largest community; Azure fits organisations built on Microsoft technology; Google Cloud is strong in data, AI and Kubernetes. For learning, pick one, learn the core services well, and the other two will come quickly. Using tools that work everywhere, such as Docker, Kubernetes, Terraform and PostgreSQL, keeps your skills and your systems portable."],
["Learn concepts first; the names are just vocabulary.",
 "Equivalent does not mean identical: check limits, pricing and behaviour.",
 "AWS: broadest catalogue, biggest ecosystem. Azure: Microsoft integration and enterprise. GCP: data, AI, Kubernetes.",
 "Portable tools: Docker, Kubernetes, Terraform, PostgreSQL, OpenTelemetry.",
 "Multi-cloud adds cost and complexity; do it for a clear reason, not by default.",
 "Each provider publishes an official mapping of its services to the others'.",
 "First certifications: AWS Cloud Practitioner, Azure AZ-900, Google Cloud Digital Leader."],
"An engineer with three years of AWS experience joins a company that uses Azure. With the comparison table they map what they know in a week: EC2 becomes Virtual Machines, S3 becomes Blob Storage, IAM roles become managed identities with RBAC, and CloudWatch becomes Azure Monitor. The concepts were the hard part, and those transfer.",
`
#  Category              AWS                       Azure                          Google Cloud
#  -----------------------------------------------------------------------------------------------------
#  Account boundary      Account                   Subscription                   Project
#  Grouping              Tags, Organizations       Resource group                 Folder, labels
#  Identity              IAM, IAM Identity Center  Microsoft Entra ID + RBAC      Cloud IAM
#  Workload identity     IAM role                  Managed identity               Service account
#
#  Virtual machines      EC2                       Virtual Machines               Compute Engine
#  Auto-scaling          Auto Scaling groups       VM Scale Sets                  Managed instance groups
#  Kubernetes            EKS                       AKS                            GKE
#  Serverless containers Fargate, App Runner       Container Apps                 Cloud Run
#  Functions             Lambda                    Functions                      Cloud Functions
#  Container registry    ECR                       Container Registry (ACR)       Artifact Registry
#
#  Object storage        S3                        Blob Storage                   Cloud Storage
#  Block storage         EBS                       Managed Disks                  Persistent Disk
#  File storage          EFS                       Azure Files                    Filestore
#
#  Relational database   RDS, Aurora               Azure SQL, DB for PostgreSQL   Cloud SQL, AlloyDB, Spanner
#  NoSQL database        DynamoDB                  Cosmos DB                      Firestore, Bigtable
#  Cache                 ElastiCache               Azure Cache for Redis          Memorystore
#  Data warehouse        Redshift                  Synapse, Fabric                BigQuery
#
#  Private network       VPC                       Virtual Network (VNet)         VPC
#  Firewall rules        Security groups           Network security groups        Firewall rules
#  Load balancer         ELB (ALB, NLB)            Load Balancer, App Gateway     Cloud Load Balancing
#  DNS                   Route 53                  Azure DNS                      Cloud DNS
#  CDN                   CloudFront                Front Door, CDN                Cloud CDN
#
#  Queue                 SQS                       Service Bus, Queue Storage     Pub/Sub, Cloud Tasks
#  Pub/sub and events    SNS, EventBridge          Event Grid                     Pub/Sub, Eventarc
#  Streaming             Kinesis, MSK              Event Hubs                     Pub/Sub, Dataflow
#
#  Monitoring and logs   CloudWatch                Azure Monitor                  Cloud Monitoring, Cloud Logging
#  Audit trail           CloudTrail                Activity Log                   Cloud Audit Logs
#  Secrets               Secrets Manager           Key Vault                      Secret Manager
#  Encryption keys       KMS                       Key Vault                      Cloud KMS
#
#  Infrastructure as code CloudFormation, CDK      Bicep, ARM templates           Infrastructure Manager
#  CI/CD                 CodePipeline, CodeBuild   Azure DevOps, GitHub Actions   Cloud Build, Cloud Deploy
#  AI platform           Bedrock, SageMaker        Azure AI Foundry, Azure OpenAI Vertex AI
#  Command line          aws                       az                             gcloud
`,
"For about a decade these three have held roughly two-thirds of the worldwide cloud infrastructure market between them, with AWS first, Azure second and Google Cloud third. Other notable providers include Alibaba Cloud, Oracle Cloud and IBM Cloud.",
[["Google Cloud: Compare AWS and Azure services to Google Cloud", "https://cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison"],
 ["Azure for AWS professionals", "https://learn.microsoft.com/en-us/azure/architecture/aws-professional/"],
 ["Azure for Google Cloud professionals", "https://learn.microsoft.com/en-us/azure/architecture/gcp-professional/"],
 ["Terraform documentation", "https://developer.hashicorp.com/terraform/docs"]])
]});
