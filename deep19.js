EXTRA(19, "What cloud computing is", {
  deep: [
    "Under the hood, the cloud is built on virtualisation and multi-tenancy. One big physical server is cut into many virtual machines by a hypervisor, and the machines of many customers share the same hardware. The provider sells more flexible capacity than any one customer could buy, because not all customers are busy at the same time. This sharing is why the price is low, and it is also why isolation between tenants is the first security job of the provider.",
    "Every cloud has two parts: a control plane and a data plane. The control plane is the API that creates, changes and deletes resources; the console, the CLI and Terraform all call this same API. The data plane is the running resource itself, such as the VM that serves your traffic. They fail separately: during an outage the control plane may be down, so you cannot create new servers, while the servers you already have keep working. Good designs do not depend on creating new resources in the middle of an incident.",
    "A common misconception is that the cloud is always cheaper. For steady load that never changes, owning hardware can cost less per hour. The cloud wins when load changes, when you need speed, or when the team is too small to run data centres. Another misconception is that scalability and elasticity are the same. Scalability means the system can handle more load if you add resources; elasticity means resources are added and removed automatically as load goes up and down. A third trade-off is lock-in: the more managed services you use, the less work you do, but the harder it is to move away."
  ],
  iq: [
    { q: "Explain IaaS, PaaS and SaaS with one example of each. How do you decide between them?", a: "IaaS gives you raw virtual machines, disks and networks (EC2, Azure Virtual Machines, Compute Engine), and you manage the operating system and everything above it. PaaS runs your code or database for you (Azure App Service, Cloud Run, RDS), so you manage only code and data. SaaS is a finished application you only use (Gmail, Salesforce). Choose the highest level that meets your needs, because every lower level adds patching and operations work for your team.", c: `
#  One web shop, three ways
#
#  IaaS   EC2 VM + you install Python, Nginx, PostgreSQL     you patch OS, runtime, database
#  PaaS   Cloud Run for the code + Cloud SQL for the data     you patch only your own code
#  SaaS   Shopify                                             you only configure the shop
` },
    { q: "What is the difference between vertical and horizontal scaling in the cloud?", a: "Vertical scaling means making one machine bigger (more CPU and memory). It is simple but has an upper limit, usually needs a restart, and the machine is still a single point of failure. Horizontal scaling means adding more machines behind a load balancer. It has almost no limit and also gives high availability, but the application must be stateless, so sessions and files must live outside the server (for example in Redis and object storage).", c: `
# vertical: make one VM bigger (the VM restarts)
az vm resize --resource-group rg-demo --name vm1 --size Standard_D4s_v5

# horizontal: change the number of VMs in a group
az vmss scale --resource-group rg-demo --name web-vmss --new-capacity 6
aws autoscaling set-desired-capacity --auto-scaling-group-name web-asg --desired-capacity 6
gcloud compute instance-groups managed resize web-mig --size 6 --zone asia-south1-a
` },
    { q: "What is the difference between scalability and elasticity?", a: "Scalability is the ability of a system to handle more load when you add resources. Elasticity is doing this automatically in both directions: adding resources when load rises and removing them when load falls. A system can be scalable but not elastic, for example if an engineer must add servers by hand. Elasticity is what saves money, because you stop paying for capacity as soon as the peak is over." },
    { q: "Is the cloud always cheaper than running your own servers?", a: "No. For a large, steady workload that runs all day at the same level, owned hardware can be cheaper per hour. The cloud is cheaper when load changes a lot, when you need to start fast without buying hardware, or when you count the cost of staff, power, space and spare capacity. In an interview, say that the main benefits are speed and flexibility, and that cost must be managed actively." },
    { q: "What is the difference between high availability, fault tolerance and disaster recovery?", a: "High availability means the system stays reachable when one part fails, usually with a short interruption, for example servers in two zones behind a load balancer. Fault tolerance is stronger: there is no interruption at all, because spare capacity is already running and takes over at once, and it costs more. Disaster recovery is the plan to bring the system back after a large failure such as the loss of a whole region, measured by RTO (how long until you are back) and RPO (how much data you may lose)." }
  ],
  tips: [
    "On your first day with any cloud account, do three things before creating anything: turn on MFA for the main account, create a budget alert, and pick one default region. Most beginner disasters come from skipping one of these.",
    "For a new project, start with a serverless container service (Cloud Run, Azure Container Apps, AWS Fargate or App Runner) plus a managed database. Move down to VMs or Kubernetes only when you hit a real limit you can name.",
    "Create learning resources inside one container that you can delete in one step: a resource group on Azure, a project on Google Cloud, or a separate sandbox account on AWS. Cleanup is then one command and nothing is forgotten.",
    "Write down who manages what for each service you use (OS patches, backups, failover). Teams often assume the provider does something on a VM that it only does on a managed service."
  ]
});

EXTRA(19, "Regions, availability zones and global infrastructure", {
  deep: [
    "Zone names are not the same physical place for every customer. On AWS, the name ap-south-1a in your account can be a different data centre from ap-south-1a in another account, because AWS mixes the mapping to spread load. The stable name is the zone ID, such as aps1-az1. Azure does the same thing: logical zone 1 in one subscription may be a different physical zone in another. This matters when two accounts want to be in the same physical zone, for example to avoid cross-zone data charges.",
    "Zones in one region are joined by private fibre with very low delay, usually a few milliseconds or less. This is fast enough for synchronous replication, where a database write is confirmed only after a second zone has it. Regions are much farther apart, so replication between regions is normally asynchronous and the second region is a little behind. This is why multi-zone gives you zero or near-zero data loss, but multi-region usually means you accept losing the last seconds of data, or you pay with slower writes.",
    "Global services are less global than they look. Their data plane runs everywhere, but the control plane often lives in one region; for AWS IAM, Route 53 and CloudFront it is in US East (N. Virginia). If that region has trouble, existing logins and DNS answers keep working, but you may not be able to change roles or DNS records. A trade-off people forget: traffic between zones is not free on AWS, so a chatty service spread over three zones pays a per-GB charge in both directions. Also, not every region has three zones or every service, so always check before you design."
  ],
  iq: [
    { q: "What is the difference between a region, an availability zone and an edge location?", a: "A region is a geographic area, such as Mumbai, that is independent from other regions. An availability zone is one or more separate data centres inside a region, with its own power and network, used to survive a data centre failure. An edge location is a small site in a city that only runs CDN, DNS and similar edge services to bring content close to users; you cannot run normal VMs or databases there. So you deploy in regions and zones, and you cache at the edge.", c: `
# zone names and the stable zone IDs behind them
aws ec2 describe-availability-zones --region ap-south-1 --query "AvailabilityZones[].[ZoneName,ZoneId]" --output table

# zones on the other two clouds
az vm list-skus --location centralindia --resource-type virtualMachines --zone --output table
gcloud compute zones list --filter "region:asia-south1"
` },
    { q: "How do you make an application highly available?", a: "Remove every single point of failure. Run at least two copies of the application in different zones behind a load balancer with health checks, and use an auto-scaling group so failed machines are replaced automatically. Use a managed database with a standby in another zone and automatic failover. Keep the application stateless, so any copy can serve any request, and store sessions and files in shared services such as Redis and object storage.", c: `
# AWS: an auto-scaling group spread over three zones, health-checked by the load balancer
aws autoscaling create-auto-scaling-group --auto-scaling-group-name web-asg --launch-template LaunchTemplateName=web-lt --min-size 2 --max-size 6 --vpc-zone-identifier "subnet-aaa,subnet-bbb,subnet-ccc" --target-group-arns TARGET_GROUP_ARN --health-check-type ELB

# Azure: a scale set across zones 1, 2 and 3
az vmss create --resource-group rg-shop --name web-vmss --image Ubuntu2204 --instance-count 3 --zones 1 2 3

# Google Cloud: a regional managed instance group (spread over zones automatically)
gcloud compute instance-groups managed create web-mig --region asia-south1 --template web-template --size 3
` },
    { q: "When is multi-AZ enough, and when do you need multi-region?", a: "Multi-AZ protects you from the loss of one data centre and is enough for most applications, because whole-region outages are rare. You need multi-region when the business requires it: very strict uptime targets, legal rules for a disaster recovery site, or users on several continents who need low latency. Multi-region is much harder because data replication between regions is asynchronous, so you must handle lag, conflicts and failover of DNS. Always ask for the RTO and RPO first; they decide the design." },
    { q: "Name the common disaster recovery strategies from cheapest to most expensive.", a: "Backup and restore: only backups are copied to another region, recovery takes hours. Pilot light: the database is replicated and the rest is switched off until needed. Warm standby: a small but complete copy of the system runs in the second region and is scaled up on failover. Active-active: both regions serve traffic all the time, recovery is almost instant but cost and complexity are highest. The right choice comes from how much downtime (RTO) and data loss (RPO) the business accepts." },
    { q: "Is ap-south-1a the same data centre for every AWS account?", a: "No. AWS maps zone names to physical zones separately for each account, so that customers do not all pick the first zone and overload it. The zone ID, such as aps1-az1, is the same physical place for everyone. Use zone IDs when two accounts must be placed in the same zone. Azure also maps logical zone numbers per subscription." }
  ],
  tips: [
    "Choose the region once, write it in your config and Terraform, and check the region selector in the console before you say a resource has disappeared. Looking in the wrong region is the most common reason people cannot find a resource.",
    "Before choosing a region, check three things: the service you need exists there, the region has at least three zones, and the price. The same VM can cost clearly more in one region than in another.",
    "Use three zones, not two, when you can. With two zones, losing one removes half of your capacity; with three, you lose only a third, so each zone needs less spare capacity.",
    "Test a zone failure before production does it for you: stop all instances in one zone and watch if the load balancer and the database failover behave as you expect."
  ]
});

EXTRA(19, "Amazon Web Services (AWS)", {
  deep: [
    "Every AWS action is an HTTPS API call, and every call is signed. The CLI or SDK takes your secret key and builds a signature (Signature Version 4) from the request and the current time; AWS builds the same signature on its side and compares. The secret key itself is never sent. Because the time is part of the signature, a computer with a wrong clock gets signature errors even if the keys are correct. The CLI and SDKs look for credentials in a fixed order: command line options, environment variables, the shared config and credentials files (including SSO and assume-role profiles), container credentials, and finally the instance metadata service.",
    "An ARN has a fixed shape: arn, partition, service, region, account ID and resource. Reading it tells you a lot: S3 bucket ARNs have no region and no account because bucket names are global, and IAM ARNs have no region because IAM is global. Many AWS APIs are eventually consistent, so a role you created one second ago may not be visible to another service yet; scripts need a short wait or a retry. APIs are also rate limited, and SDKs retry throttling errors automatically with increasing delays.",
    "The account is the strongest isolation boundary in AWS, stronger than a VPC or a tag. That is why companies use many accounts under AWS Organizations: a mistake or a breach in the dev account cannot touch production. Service control policies (SCPs) set the maximum that any identity in an account may do, even its administrators. Each account also has service quotas, such as the number of vCPUs you may run in a region; new accounts have low quotas, so request increases before a launch, not during it. A common misconception is that the root user is just an admin: root can do things that no policy can block inside the account, so it should be locked away with MFA."
  ],
  iq: [
    { q: "Explain the parts of an ARN. Why do some ARNs have empty fields?", a: "An ARN is arn:partition:service:region:account-id:resource. The partition is normally aws, and the rest say which service, where, whose account and which resource. Fields are empty when they do not apply: IAM is global so it has no region, and S3 bucket names are unique worldwide so the bucket ARN has no region and no account. You need to read ARNs well because every IAM policy uses them in the Resource field.", c: `
#  arn : partition : service : region     : account-id   : resource
arn:aws:ec2:ap-south-1:123456789012:instance/i-0abc1234def567890
arn:aws:iam::123456789012:role/shop-api-role            (no region: IAM is global)
arn:aws:s3:::my-company-invoices/2026/*                 (no region, no account)
arn:aws:lambda:ap-south-1:123456789012:function:make-thumbnail
` },
    { q: "What is the difference between an Application Load Balancer and a Network Load Balancer?", a: "An Application Load Balancer works at layer 7. It understands HTTP and HTTPS, so it can route by path or host name, and it is the normal choice for web applications and APIs. A Network Load Balancer works at layer 4 with TCP and UDP. It handles very high traffic with very low delay and gives a static IP address per zone, so it is used for non-HTTP protocols or when clients need fixed IPs." },
    { q: "What is the difference between SQS and SNS?", a: "SQS is a queue: messages wait until one consumer pulls and deletes them, so it is used to separate a producer from a worker and to absorb spikes. SNS is publish and subscribe: one message is pushed at once to all subscribers, such as email, Lambda or several queues. They are often used together in a fan-out pattern, where SNS sends one event to many SQS queues and each service reads its own queue at its own speed." },
    { q: "What is the difference between CloudWatch and CloudTrail?", a: "CloudWatch is for monitoring how the system is behaving: metrics such as CPU, application logs, and alarms. CloudTrail is for auditing: it records who made which API call, when and from where. If the question is 'why is the server slow?' use CloudWatch; if it is 'who deleted the bucket?' use CloudTrail." },
    { q: "Why do companies use many AWS accounts instead of one? How does a person work across them?", a: "An account is a hard boundary for security, billing and quotas, so separate accounts for dev, staging and production limit the damage of any mistake. AWS Organizations groups them and applies service control policies and one combined bill. People sign in once through IAM Identity Center and then assume a role in the account they need, so nobody has a separate user and password in every account.", c: `
# take a role in another account and get temporary credentials
aws sts assume-role --role-arn arn:aws:iam::111122223333:role/deploy --role-session-name ci-run

# or define a named profile in ~/.aws/config and let the CLI assume the role for you
[profile prod-deploy]
role_arn = arn:aws:iam::111122223333:role/deploy
source_profile = default
region = ap-south-1

aws s3 ls --profile prod-deploy
` }
  ],
  tips: [
    "Run aws sts get-caller-identity before any important command. It shows the account and the role you are really using, and it prevents the classic mistake of running a delete in production with the wrong profile.",
    "Use named profiles (--profile or the AWS_PROFILE variable) for each account instead of changing the default credentials. Never keep production keys as the default profile.",
    "Create the budget alert and enable MFA on the root user before you create your first resource, then stop using root. Create an admin identity through IAM Identity Center for daily work.",
    "Agree on a small set of tags (project, env, owner) and add them to every resource from the first day. Cost reports by tag only work for resources that were tagged, and you must also activate the tags as cost allocation tags in the billing console."
  ]
});

EXTRA(19, "Microsoft Azure", {
  deep: [
    "All management requests in Azure go through one front door called Azure Resource Manager (ARM). The portal, the az CLI, PowerShell, Bicep and Terraform all send the same kind of request to ARM, and ARM checks your identity with Entra ID, checks RBAC and Azure Policy, and then passes the request to a resource provider such as Microsoft.Compute or Microsoft.Storage. A resource provider must be registered in the subscription before its resources can be created, which explains some confusing first-time errors. Every resource has a long ID that shows the whole path: subscription, resource group, provider and name.",
    "Azure has two separate role systems, and mixing them up is a classic mistake. Entra ID roles, such as Global Administrator, control the directory: users, groups and app registrations. Azure RBAC roles, such as Owner, Contributor and Reader, control resources in subscriptions. Azure RBAC is additive and inherited downwards from management group to subscription to resource group to resource. There is also a split between management and data: being Owner of a storage account lets you configure it, but to read blobs with your Entra login you need a data role such as Storage Blob Data Reader.",
    "RBAC answers who may do something; Azure Policy answers what is allowed to exist. A policy can deny creating resources outside approved regions or without a required tag, even for an Owner. Resource locks are a third tool: a CanNotDelete lock on a production resource group stops accidental deletion by anyone until the lock is removed. A common misconception is that a resource group must hold resources from one region. The group has a location only for its own metadata; the resources inside can be in any region."
  ],
  iq: [
    { q: "What is the difference between Entra ID roles and Azure RBAC roles?", a: "Entra ID roles manage the identity directory, for example creating users, resetting passwords and registering applications; Global Administrator is the highest. Azure RBAC roles manage Azure resources at a scope such as a subscription or resource group; Owner, Contributor and Reader are the main ones. They are separate systems, so a Global Administrator does not automatically have access to resources in subscriptions, and an Owner of a subscription cannot manage users in the directory." },
    { q: "What is the difference between a service principal and a managed identity? And system-assigned vs user-assigned?", a: "A service principal is an identity for an application, and you must store and rotate its secret or certificate yourself. A managed identity is a service principal that Azure creates and manages for an Azure resource, so there is no secret to store at all. A system-assigned identity belongs to one resource and is deleted with it. A user-assigned identity is a separate resource that you can attach to many resources, which is better when several apps need the same permissions or when you want the permissions to exist before the app is deployed.", c: `
# system-assigned: lives and dies with the web app
az webapp identity assign --name shop-api --resource-group rg-shop

# user-assigned: created once, attached to many resources
az identity create --name id-shop-api --resource-group rg-shop
az webapp identity assign --name shop-api --resource-group rg-shop --identities ID_RESOURCE_ID

# in Python the same code works locally (az login) and in Azure (managed identity)
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
client = BlobServiceClient("https://stshop.blob.core.windows.net", credential=DefaultAzureCredential())
` },
    { q: "What is the difference between Azure RBAC and Azure Policy?", a: "RBAC controls what a user or application is allowed to do, such as create VMs in a resource group. Azure Policy controls the properties of resources, no matter who creates them, such as 'only Central India region' or 'every resource must have an owner tag'. They work together: a request must pass both. Use RBAC to give access and Policy to enforce company rules." },
    { q: "What is the difference between an availability set, an availability zone and a scale set?", a: "An availability set spreads VMs over different racks (fault domains) and update groups inside one data centre, so it protects against a rack failure or planned maintenance. Availability zones place VMs in separate data centres in the region, so they protect against the loss of a whole data centre and give a higher SLA. A Virtual Machine Scale Set is a group of identical VMs that can scale in and out automatically, and it can be spread across zones. For new designs, zones plus a scale set are the normal answer." },
    { q: "Is Contributor enough to give another person access to a resource group?", a: "No. Contributor can create and manage resources but cannot change role assignments. To grant access you need Owner or User Access Administrator (or the newer Role Based Access Control Administrator role) at that scope. This split is useful for least privilege: most engineers need Contributor on their own resource group and nothing more.", c: `
# who has access here, including inherited assignments?
az role assignment list --resource-group rg-shop --include-inherited --output table

# what can this user or app do anywhere in the subscription?
az role assignment list --assignee USER_OR_APP_ID --all --output table

# protect production from accidental deletion
az lock create --name no-delete --resource-group rg-shop-prod --lock-type CanNotDelete
` }
  ],
  tips: [
    "Use one resource group per application per environment (rg-shop-dev, rg-shop-prod). Deleting dev is then one safe command, and cost reports by resource group are useful without any extra work.",
    "Follow the naming abbreviations from the Cloud Adoption Framework (rg-, vm-, st, kv-) from the start. Storage account names allow only lowercase letters and digits and must be unique worldwide, so plan for that.",
    "If a role assignment does not seem to work, wait a few minutes and sign in again before changing anything. Assignments take time to spread, and tokens issued before the change do not contain the new access.",
    "If a deployment fails saying the subscription is not registered to use a namespace, register the provider with az provider register --namespace NAME and try again. It is a one-time step per subscription."
  ]
});

EXTRA(19, "Google Cloud Platform (GCP)", {
  deep: [
    "A project has three identifiers and interviews like to ask about them. The project name is a label you can change. The project ID is unique across all of Google Cloud, is chosen at creation and can never be changed; it is what you type in commands. The project number is created by Google and is used inside service account names and some APIs. Deleting a project shuts down everything in it, and the project can be restored for a limited period (about 30 days) before it is removed for good.",
    "Access in Google Cloud is set with allow policies attached to the organisation, folders, projects and some single resources. Policies are inherited downwards and are additive: a role given at the folder level cannot be taken away at the project level by another allow policy. To block something you use a separate deny policy or an organisation policy constraint. Roles come in three kinds: basic roles (Owner, Editor, Viewer) that are very broad, predefined roles for one service such as roles/storage.objectViewer, and custom roles that you build from single permissions.",
    "Google Cloud networking is different from the other two. A VPC is a global resource and its subnets are regional, so VMs in Mumbai and Frankfurt can talk over private IP addresses in one VPC with no peering. Firewall rules belong to the VPC and are applied to VMs by network tag or service account. Compute Engine can also move a running VM to another host during maintenance (live migration), so you see fewer forced restarts. A misconception: a VM uses a service account, and in older projects the default Compute Engine service account has the Editor role on the whole project, which is far too much; always create your own service account with small roles."
  ],
  iq: [
    { q: "What is the difference between project name, project ID and project number?", a: "The name is a display label that you can change at any time. The ID is a unique text identifier that you choose once and can never change, and it is used in commands and resource paths. The number is a unique number that Google assigns and uses internally, for example in default service account emails. In scripts always use the project ID." },
    { q: "What are basic, predefined and custom roles, and which should you use?", a: "Basic roles are Owner, Editor and Viewer; they cover almost every service in the project and are too broad for production. Predefined roles are maintained by Google for one job on one service, such as roles/cloudsql.client. Custom roles are your own list of permissions for cases where no predefined role is small enough. Use predefined roles by default, custom roles when needed, and keep basic roles for small test projects only.", c: `
# what roles does this service account have on the project?
gcloud projects get-iam-policy my-project --flatten "bindings[].members" --filter "bindings.members:serviceAccount:shop-api-sa@my-project.iam.gserviceaccount.com" --format "table(bindings.role)"

# give one narrow predefined role instead of Editor
gcloud projects add-iam-policy-binding my-project --member "serviceAccount:shop-api-sa@my-project.iam.gserviceaccount.com" --role "roles/cloudsql.client"
` },
    { q: "What is a service account, and how should code use one without a key file?", a: "A service account is an identity for a program, not a person. The safe way to use it is to attach it to the resource that runs the code (a VM, a Cloud Run service, a GKE workload); the client libraries then get short-lived tokens from the metadata server through Application Default Credentials. Downloaded JSON key files do not expire by default and are a common source of leaks, so avoid them. For code outside Google Cloud, such as GitHub Actions, use Workload Identity Federation, and on a laptop use your own login or impersonation.", c: `
# attach a service account to a Cloud Run service: no key file anywhere
gcloud run deploy shop-api --image asia-south1-docker.pkg.dev/my-project/shop/api:1.0 --service-account shop-api-sa@my-project.iam.gserviceaccount.com

# local development: let client libraries use your own login
gcloud auth application-default login

# test as the service account without downloading a key
gcloud storage ls gs://my-shop-reports --impersonate-service-account shop-api-sa@my-project.iam.gserviceaccount.com
` },
    { q: "How is a Google Cloud VPC different from an AWS VPC or an Azure VNet?", a: "A Google Cloud VPC is global: one VPC can have subnets in many regions, and resources in them reach each other on private IPs without peering. An AWS VPC and an Azure VNet belong to one region, so you need peering or a transit hub to join regions. Subnets are regional in Google Cloud and Azure, covering all zones of the region, while an AWS subnet belongs to exactly one availability zone. Google Cloud firewall rules are set on the VPC and target VMs by tag or service account, and they can both allow and deny with priorities." },
    { q: "When would you choose Cloud Run, GKE, Cloud Run functions or Compute Engine?", a: "Cloud Run is the default for a stateless web service or API in a container: no servers, scales to zero, pay per use. Cloud Run functions fit small event handlers, such as reacting to a file upload or a Pub/Sub message. GKE is for teams that need full Kubernetes: many services, custom networking, or special workloads, and who can pay the operations cost. Compute Engine is for software that needs a full VM, such as a legacy application, special OS settings or licences. The reasoning is always the same: take the most managed option that meets the need." }
  ],
  tips: [
    "Create one project per application per environment (shop-dev, shop-prod). Billing, permissions and cleanup all follow the project, and gcloud projects delete removes everything in one step.",
    "Run gcloud config list before commands that change things. Use named configurations (gcloud config configurations create) to switch between dev and prod safely instead of editing the active project by hand.",
    "If an API call fails with a message that the API has not been used or is disabled, the fix is gcloud services enable for that API in that project, not an IAM change. Put the needed APIs in your Terraform so new projects work at once.",
    "Never give the Editor role to a service account. Create one service account per service, give it only the predefined roles it needs, and block key creation with the organisation policy that disables service account keys."
  ]
});

EXTRA(19, "Identity and access management (IAM)", {
  deep: [
    "On AWS every request is checked against all policies that apply, in a fixed logic. First, if any policy has an explicit Deny that matches, the request is refused and nothing can override it. Then every layer that sets a limit must allow the action: service control policies of the organisation, the permission boundary of the identity, and the session policy if one was used. Finally the action must be granted by an identity-based policy or, inside the same account, by a resource-based policy such as a bucket policy. If nothing allows it, the result is an implicit deny. Permission boundaries and SCPs never grant anything; they only limit what other policies can grant.",
    "Temporary credentials for a VM come from the instance metadata service at the special address 169.254.169.254, which is reachable only from inside the machine. On AWS the role is attached through an instance profile, and the SDK asks the metadata service for an access key, a secret key and a session token that expire after some hours and are renewed automatically. Azure managed identities and Google Cloud service accounts work the same way, but return OAuth tokens. The old AWS version (IMDSv1) answered any simple GET request, so a web application bug that let an attacker make the server fetch a URL (SSRF) could steal the role credentials; this was part of the Capital One breach. IMDSv2 requires a token obtained with a PUT request first, which blocks most such attacks, so enforce it.",
    "The three clouds differ in useful ways. Azure RBAC and Google Cloud allow policies are additive and inherited down the hierarchy; denying is done with separate tools (Azure deny assignments and Policy, Google Cloud deny policies). AWS mixes allow and deny in the same policy language. For access between AWS accounts both sides must agree: the resource or role in account A must trust account B, and the identity in account B must be allowed to call it. A common misconception is that an IAM role is a kind of user. A role has no password and no permanent keys; it is a set of permissions that a trusted principal takes on for a limited time through STS."
  ],
  iq: [
    { q: "What is the difference between an IAM user and an IAM role?", a: "An IAM user is a permanent identity for one person or program, with long-lived credentials: a password or access keys. An IAM role has no long-lived credentials; a trusted principal assumes it and receives temporary credentials from STS that expire automatically. Roles are preferred for applications, for access between accounts and for people who sign in through single sign-on, because there is no permanent secret to leak or rotate. Today IAM users are needed only in rare cases, such as a tool outside AWS that cannot use federation." },
    { q: "How does an application on a VM get credentials without any keys in its code or config?", a: "You attach an identity to the VM: an IAM role through an instance profile on AWS, a managed identity on Azure, a service account on Google Cloud. The SDK calls the instance metadata service at 169.254.169.254, which is reachable only from inside the VM, and gets short-lived credentials that the platform rotates automatically. Nothing is stored on disk or in the repository, so there is nothing to leak. The same idea exists for containers and functions.", c: `
# AWS (IMDSv2): get a session token, then ask for the role credentials
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/shop-api-role

# Azure: token for the managed identity
curl -s -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"

# Google Cloud: token for the attached service account
curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
` },
    { q: "One policy allows s3:DeleteObject and another policy denies it for the same user. What happens, and why?", a: "The request is denied. In AWS policy evaluation an explicit Deny always wins over any Allow, wherever it is: an identity policy, a bucket policy, a permission boundary or a service control policy. This rule makes Deny a reliable safety tool, for example to protect audit logs from everybody. If no statement matches at all, the request is also refused, but that is an implicit deny, which an Allow can fix." },
    { q: "How do you give a role in account B access to an S3 bucket or a role in account A?", a: "Access between accounts needs permission on both sides. In account A you create a role whose trust policy names account B (or one role in it) as a principal allowed to call sts:AssumeRole, and you give that role the permissions it needs. In account B the identity needs a policy that allows sts:AssumeRole on the role in A. The caller then assumes the role and works with temporary credentials. For a third party, add an ExternalId condition to prevent the confused deputy problem.", c: `
# trust policy on the role in account A: who may assume this role
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::222233334444:role/ci-runner" },
    "Action": "sts:AssumeRole"
  }]
}

# policy on the ci-runner role in account B: permission to assume it
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::111122223333:role/deploy"
  }]
}
` },
    { q: "What are the Azure and Google Cloud equivalents of an AWS IAM role attached to a server? What is a permission boundary?", a: "On Azure it is a managed identity with an RBAC role assignment at some scope; on Google Cloud it is a service account attached to the resource, with roles bound in an allow policy. All three give the workload short-lived credentials with no stored secret. A permission boundary is an AWS feature: a policy attached to a user or role that sets the maximum permissions it can ever have. The effective permissions are only what both the boundary and the normal policies allow, so teams can create their own roles without being able to give themselves more power." }
  ],
  tips: [
    "When you get access denied, first check who you really are (aws sts get-caller-identity, az account show, gcloud auth list). Then read the full error: it names the exact action and resource, and newer AWS messages also say which policy type blocked it.",
    "Use the provider tools before guessing: IAM Policy Simulator and IAM Access Analyzer on AWS, the 'Check access' tab on Azure, Policy Troubleshooter on Google Cloud. For encoded AWS errors use aws sts decode-authorization-message.",
    "To build a least-privilege policy, start with a narrow guess, run the application, and add only the actions that appear as denied in the audit log (CloudTrail on AWS). Never fix a denied error by adding a star to Action and Resource.",
    "In S3 policies remember the two resource levels: s3:ListBucket needs the bucket ARN, and s3:GetObject needs the object ARN ending with /*. Mixing them up is the most common cause of a policy that looks right and still fails."
  ]
});

EXTRA(19, "Compute: virtual machines, containers and serverless", {
  deep: [
    "A virtual machine is a slice of a physical host made by a hypervisor: AWS uses its Nitro system (a light KVM-based hypervisor with network and disk work moved to special hardware cards), Azure uses a version of Hyper-V, and Google Cloud uses KVM. Because the host is shared, another customer can sometimes slow you down; this is the noisy neighbour problem, and you can see it as CPU steal time in Linux. Cheap burstable sizes (AWS T series, Azure B series, Google Cloud shared-core E2) make sharing explicit: you collect CPU credits when idle and spend them when busy, and when the credits are gone the machine is slowed down or you pay extra. Use them for small or spiky loads, not for a server that is busy all day.",
    "A cold start happens when a function or serverless container has no warm instance ready. The platform must create a small isolated environment (AWS Lambda uses Firecracker micro virtual machines), download your code or image, start the language runtime and run your start-up code; only then is the request handled. After that the instance stays warm for some minutes and the next requests are fast. Cold starts are longer with big packages, heavy frameworks, runtimes such as Java and .NET, and more work at import time. You reduce them by keeping the package small, creating clients outside the handler, and paying for warm instances: provisioned concurrency on Lambda, minimum instances on Cloud Run, always-ready instances on Azure Functions premium plans.",
    "Serverless has hard limits that decide if it fits. A Lambda function can run for at most 15 minutes, has a limit on memory and package size, and has a concurrency limit per region that all functions in the account share. Azure Functions on the Consumption plan has a shorter time limit, while Cloud Run allows much longer requests. A common misconception is that serverless is always the cheapest. It is cheapest when traffic is low or spiky; at high steady traffic, a VM or container that is always busy costs less per request. Another trap is the database: a thousand function copies open a thousand connections, so you need a connection pooler such as RDS Proxy."
  ],
  iq: [
    { q: "What is a Lambda cold start, what makes it worse, and how do you reduce it?", a: "A cold start is the extra delay when a request arrives and no warm instance exists, so the platform must create an environment, load the code and start the runtime. It is worse with large packages, heavy imports, Java or .NET runtimes, and big start-up work. Reduce it by making the package smaller, creating SDK clients and database connections outside the handler so they are reused, and using provisioned concurrency to keep instances warm for latency-sensitive endpoints. The same idea on other clouds is minimum instances on Cloud Run and always-ready instances on Azure Functions.", c: `
# AWS: keep 5 instances of the prod alias always warm
aws lambda put-provisioned-concurrency-config --function-name make-thumbnail --qualifier prod --provisioned-concurrent-executions 5

# Google Cloud Run: never scale below one instance
gcloud run services update shop-api --min-instances 1

# in code: create clients once, outside the handler, so warm calls reuse them
import boto3
s3 = boto3.client("s3")              # runs once per cold start

def handler(event, context):
    return s3.list_buckets()["Buckets"][0]["Name"]   # reuses the client
` },
    { q: "What are the main limits of AWS Lambda, and what do you do when you hit them?", a: "The main limits are a maximum run time of 15 minutes, a maximum memory size, limits on package and request payload size, and a shared concurrency limit per region. For work longer than 15 minutes, split it into steps with Step Functions or run it as a container task on Fargate or AWS Batch. For large files, pass an S3 location instead of the data itself. For concurrency, ask for a quota increase and set reserved concurrency so one function cannot use the capacity of all the others." },
    { q: "When would you choose a VM, a container service or a function?", a: "Choose a function for short event-driven work with spiky or low traffic, such as reacting to a file upload. Choose a serverless container service for a normal web API: you get any language and any library, longer requests and simple scaling. Choose VMs when you need full control of the operating system, special hardware, licensed software or very steady heavy load where reserved VMs are cheapest. Choose managed Kubernetes only when you have many services and a team able to operate it." },
    { q: "What are spot instances, and how do you design for them?", a: "Spot (AWS, Azure) or Spot VMs (Google Cloud) are spare capacity sold at a big discount, but the provider can take them back with very short notice: about two minutes on AWS and about thirty seconds on Azure and Google Cloud. They fit work that can stop and continue: batch jobs, CI runners, stateless web workers behind a load balancer. Design for interruption: save progress often, handle the termination notice, use several instance types and zones, and keep a base of on-demand machines for the minimum capacity.", c: `
aws ec2 run-instances --image-id ami-xxxxxxxx --instance-type c6i.large --instance-market-options MarketType=spot
az vm create --resource-group rg-batch --name batch1 --image Ubuntu2204 --priority Spot --eviction-policy Deallocate --max-price -1
gcloud compute instances create batch1 --zone asia-south1-a --provisioning-model SPOT --instance-termination-action STOP
` },
    { q: "What happens to data and IP addresses when you stop, start or terminate an EC2 instance?", a: "When you stop an instance, the EBS disks keep their data and you keep paying for them, but data on instance store (local) disks is lost. On start the instance usually moves to another physical host and gets a new public IP address unless you use an Elastic IP; the private IP stays the same. Terminate deletes the instance, and by default the root EBS volume is deleted too. This is why servers should be replaceable: keep data in managed services and build servers from images and scripts." }
  ],
  tips: [
    "In a Lambda triggered by S3, never write the result to the same bucket and prefix that triggers it. The function will trigger itself in an endless loop and create a large bill; use a second bucket or a separate prefix with a filter.",
    "Object keys in S3 event records are URL-encoded, so a file named 'my photo.jpg' arrives as 'my+photo.jpg'. Decode the key with urllib.parse.unquote_plus before calling get_object, or files with spaces will fail with a not-found error.",
    "Set memory and timeout on purpose. On Lambda more memory also means more CPU, so a function can finish faster and cost the same or less; test two or three sizes and compare the real duration.",
    "For auto-scaling to work, make servers stateless and make the health check honest. The health endpoint should return an error when the app cannot do its job, and scale-in should give running requests time to finish (connection draining)."
  ]
});

EXTRA(19, "Storage: object, block and file", {
  deep: [
    "Object storage reaches its very high durability by spreading each object over many disks in several zones. Large systems such as S3 do not simply keep three full copies; they use erasure coding, which cuts the object into pieces plus extra parity pieces, so the object can be rebuilt even if some pieces or a whole zone are lost. Background jobs check stored data against checksums all the time and repair damage. Azure lets you choose the redundancy of a storage account: copies in one data centre (LRS), across zones (ZRS), or also in a second region (GRS, GZRS). Google Cloud Storage buckets are regional, dual-region or multi-region. Durability does not protect you from yourself: if you delete or overwrite an object, the system durably stores your mistake, so you still need versioning or backups.",
    "The consistency model answers the question: if I write and then read at once, do I see the new data? Amazon S3 now gives strong read-after-write consistency for all objects and listings, and so do Azure Blob Storage and Google Cloud Storage. Many older articles still say S3 is eventually consistent; that changed in December 2020. Object storage has no real folders: a key such as reports/2026/a.pdf is one flat name, and the console only draws folders from the slashes. It also has no append or partial edit and no locking, so two writers to the same key means the last one wins.",
    "Cold tiers are cheap to store but have rules that can make them more expensive than standard. They charge for each GB you read back and they have a minimum storage time: if you delete or move an object earlier, you still pay for the rest of that period. Some classes also bill small objects as if they were a minimum size, so millions of tiny files in an infrequent-access class can cost more. Block storage is different in every way: a disk lives in one zone, is attached to a VM there, and you pay for the size you provision, not for what you use. Snapshots of disks are incremental and kept in object storage. Local instance disks are the fastest but lose their data when the VM stops."
  ],
  iq: [
    { q: "What are the S3 storage classes and when do you use each? What are the Azure and Google Cloud equivalents?", a: "S3 Standard is for data read often. Intelligent-Tiering moves objects between tiers automatically and fits unknown or changing access patterns. Standard-IA and One Zone-IA are for data read rarely but needed at once; One Zone is cheaper but kept in a single zone. Glacier Instant Retrieval is archive with immediate access, Glacier Flexible Retrieval takes minutes to hours, and Glacier Deep Archive is the cheapest with retrieval in hours. Azure has hot, cool, cold and archive tiers; Google Cloud has Standard, Nearline, Coldline and Archive, and all four give immediate access.", c: `
# put an object directly into a colder class
aws s3 cp backup-2025.tar s3://my-company-backups/ --storage-class DEEP_ARCHIVE
az storage blob set-tier --account-name stshopdev2026 --container-name backups --name backup-2025.tar --tier Cool --auth-mode login
gcloud storage cp backup-2025.tar gs://my-company-backups/ --storage-class NEARLINE
` },
    { q: "What is the difference between durability and availability?", a: "Durability is the chance that your data is not lost over time; object storage is designed for eleven nines of durability. Availability is the chance that you can reach the data right now, and it is lower, for example 99.9 or 99.99 percent. During an outage a service can be unavailable for an hour while every object is still perfectly safe. Cheaper classes usually keep the same durability but give lower availability or slower access." },
    { q: "Is S3 strongly consistent? If I overwrite an object and read it at once, what do I get?", a: "You get the new version. Since December 2020, S3 gives strong read-after-write consistency for new objects, overwrites, deletes and list operations, at no extra cost. Before that, overwrites and lists were eventually consistent, which is why old material says so. What S3 does not give is locking for writers: if two clients write the same key at the same time, the last write wins, unless you use conditional writes or versioning." },
    { q: "When do you use object, block and file storage? Can I run a database on S3?", a: "Use object storage for whole files reached over HTTP: images, backups, logs, data lakes. Use block storage as the disk of one VM when you need fast random reads and writes, as a database does. Use file storage when several machines must mount the same folder with normal file system behaviour. You should not put the data files of a normal database such as PostgreSQL on S3, because objects cannot be changed in place and every small write would replace a whole object; analytics engines that read whole files, such as Athena or BigQuery external tables, are the exception." },
    { q: "How do you upload very large files, and what cost trap comes with it?", a: "Use multipart upload: the file is cut into parts that are uploaded in parallel and retried one by one, and then joined into one object. The high-level tools (aws s3 cp, boto3 upload_file, gcloud storage cp, azcopy) do this automatically. The trap is that the parts of an upload that failed or was abandoned stay in the bucket, are invisible in a normal listing, and are billed. Add a lifecycle rule that aborts incomplete multipart uploads after some days.", c: `
# lifecycle.json: remove the parts of uploads that never finished
{
  "Rules": [{
    "ID": "abort-unfinished-uploads",
    "Status": "Enabled",
    "Filter": { "Prefix": "" },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}

aws s3api put-bucket-lifecycle-configuration --bucket my-company-backups --lifecycle-configuration file://lifecycle.json
` }
  ],
  tips: [
    "put-bucket-lifecycle-configuration replaces the whole lifecycle configuration of the bucket, it does not add to it. Read the current rules first, or keep all rules in one Terraform resource, or you will silently delete someone else's rule.",
    "If you turn on versioning, also add a lifecycle rule that expires old versions after some days. Without it every overwrite and delete keeps the old data forever and the bucket bill only grows.",
    "Do not move small or short-lived objects to cold tiers. Check the minimum storage time and the minimum billable object size first; logs that are deleted after two weeks belong in the standard tier.",
    "Bucket and storage account names are global and often appear in URLs, so use a pattern such as company-project-env-purpose and never put secrets or customer names in them. Give users presigned URLs or SAS tokens with a short lifetime instead of making anything public."
  ]
});

EXTRA(19, "Databases in the cloud", {
  deep: [
    "Managed high availability works with a standby copy in another zone. On Amazon RDS Multi-AZ, every write is copied synchronously to the standby before the database confirms it, so no committed data is lost in a failover. When the primary fails, the service promotes the standby and points the same DNS name of the database to it; the application keeps its connection string but all open connections break and must be opened again, usually within one or two minutes. Google Cloud SQL high availability and Azure zone-redundant options work on the same idea. In the classic RDS Multi-AZ setup the standby cannot be used for reads; it only waits.",
    "Read replicas are a different tool. They copy changes asynchronously, so they are always a little behind the primary; this is called replication lag. They are for scaling reads and for reporting, not for safety: a failover to a replica must be started by you (or by extra tooling) and the last changes may be missing. Reading from a replica right after a write can return old data, so code that needs to read its own writes must read from the primary. Amazon Aurora changes the design: the storage layer itself keeps six copies over three zones, and replicas share that storage, so failover is usually faster and replicas are almost up to date.",
    "Backups are a third, separate thing. Automated backups take a daily snapshot and keep the transaction logs, which allows point-in-time recovery to any second inside the retention period; a restore always creates a new database instance with a new address, it does not rewind the existing one. High availability does not replace backups: a wrong DELETE is copied to the standby at once. For NoSQL the key under-the-hood idea is partitioning: DynamoDB, Cosmos DB and Bigtable spread data over many servers by a partition key, so a key with few values or one very busy value creates a hot partition and throttling, even when total capacity looks fine."
  ],
  iq: [
    { q: "What is the difference between RDS Multi-AZ and a read replica?", a: "Multi-AZ is for availability: a standby in another zone gets every write synchronously, failover is automatic and uses the same endpoint, and in the classic setup the standby does not serve reads. A read replica is for scaling reads: replication is asynchronous, it has its own endpoint, it can be in another region, and promotion is a manual step. So Multi-AZ answers 'what if the database server dies?' and read replicas answer 'the database has too many read queries'. Production systems often use both.", c: `
# turn on a standby in another zone
aws rds modify-db-instance --db-instance-identifier shop-db --multi-az --apply-immediately

# add a read replica for reports (it has its own endpoint)
aws rds create-db-instance-read-replica --db-instance-identifier shop-db-replica --source-db-instance-identifier shop-db

# test the failover before you need it
aws rds reboot-db-instance --db-instance-identifier shop-db --force-failover

# Google Cloud SQL: enable high availability, then test it
gcloud sql instances patch shop-db --availability-type REGIONAL
gcloud sql instances failover shop-db
` },
    { q: "A developer ran a wrong DELETE on production. Does Multi-AZ help? What do you do?", a: "Multi-AZ does not help, because the delete was copied to the standby in the same moment. You use point-in-time recovery to create a new instance at the time just before the mistake, then copy the missing rows back or switch the application to the new instance. This is why high availability, replicas and backups are three different protections and you need all of them. The data you can lose is limited by the backup retention and log shipping, which defines your RPO." },
    { q: "How do you scale a relational database in the cloud when it becomes slow?", a: "First fix the cheap things: missing indexes, slow queries and too many connections. Then scale up to a bigger instance, which is simple but has a limit and needs a short restart. Then reduce read load with a cache such as Redis and with read replicas. Only when writes are the limit do you look at sharding or a distributed SQL database such as Spanner or Aurora with its special options, because these add a lot of complexity." },
    { q: "Why can serverless functions overload a relational database, and how do you fix it?", a: "Each running copy of a function opens its own database connection, and a traffic spike can start hundreds of copies in seconds. A relational database has a limited number of connections and each one uses memory, so the database refuses new connections or slows down. The fix is a connection pooler between the functions and the database, such as RDS Proxy, PgBouncer or the built-in pooling of some managed services, plus a limit on function concurrency. Also create the connection outside the handler so warm copies reuse it." },
    { q: "When do you choose DynamoDB (or Cosmos DB, Firestore) over a relational database, and what is a hot partition?", a: "Choose a NoSQL key-value or document store when access patterns are simple and known (get and put by key), when you need very large scale with steady low latency, and when you do not need joins or complex queries. Choose relational when you need flexible queries, joins and multi-row transactions, which is the safer default for most business applications. A hot partition happens when many requests go to the same partition key value, so one partition is overloaded and throttled while the others are idle; the fix is a key with many well-spread values, such as user ID instead of country.", c: `
import boto3

table = boto3.resource("dynamodb").Table("carts")

# reads are eventually consistent by default (cheaper, may be slightly old)
cart = table.get_item(Key={"user_id": "u-7"}).get("Item")

# ask for a strongly consistent read when you must see your own last write
cart = table.get_item(Key={"user_id": "u-7"}, ConsistentRead=True).get("Item")
` }
  ],
  tips: [
    "Test a restore, not only the backup. Once a quarter, restore production to a new instance with point-in-time recovery, connect to it and check the data; a backup you never restored is only a hope.",
    "Turn on deletion protection for production databases and take a final snapshot on delete. In Terraform also add prevent_destroy to the database resource, because one wrong terraform destroy is a common way to lose data.",
    "Make the application reconnect with retries and a short DNS cache time. During a failover the endpoint name stays the same but its IP changes, and applications that keep old connections or cache DNS forever stay down long after the database is healthy.",
    "Do not give the database a public IP to make development easier. Reach it through a bastion host, a VPN, AWS Systems Manager port forwarding or the Cloud SQL Auth Proxy, and keep the password in the secrets manager."
  ]
});

EXTRA(19, "Networking in the cloud", {
  deep: [
    "A subnet is not public or private by a setting on the subnet itself. Each subnet is linked to a route table, and the route table decides where packets go. If the table has a route for 0.0.0.0/0 that points to an internet gateway, the subnet is public; if not, it is private. When several routes match, the most specific one (the longest prefix) wins, so the local route for 10.0.0.0/16 is always used for traffic inside the VPC. Even in a public subnet an instance also needs a public IP address to be reached from the internet, because the internet gateway only translates between public and private addresses one to one.",
    "A NAT gateway sits in a public subnet and has its own public IP. The route table of a private subnet sends 0.0.0.0/0 to the NAT gateway; the NAT gateway replaces the private source address with its own, sends the packet out through the internet gateway, and remembers the connection so the answer can come back. Nobody outside can start a connection through it. It is billed per hour and per GB that passes through it, so heavy traffic to cloud services such as object storage should go through a private endpoint instead. For high availability on AWS you need one NAT gateway per zone; Azure NAT Gateway and Google Cloud NAT do the same job with different packaging.",
    "AWS has two firewall layers. A security group is attached to an instance network interface, has only allow rules, and is stateful: if a request is allowed in, the answer is allowed out automatically. A network ACL is attached to a subnet, has numbered allow and deny rules checked from the lowest number until one matches, and is stateless: you must allow the return traffic yourself, including the high ephemeral ports. On Azure one tool, the network security group, does both jobs: it is stateful, has allow and deny rules with priorities, and can be attached to a subnet or a network interface. Google Cloud firewall rules are also stateful with allow, deny and priorities. A common misconception is that a private subnet is safe by itself; security group rules and IAM still decide what can talk to what inside the network."
  ],
  iq: [
    { q: "What actually makes a subnet public or private?", a: "The route table linked to the subnet. A subnet is public when its route table sends 0.0.0.0/0 to an internet gateway, and private when it does not. The name of the subnet and any console label mean nothing. For an instance to be reachable from the internet it needs three things: a public subnet, a public IP address and a security group rule that allows the traffic.", c: `
# show the routes that apply to one subnet
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-0abc1234 --query "RouteTables[].Routes[]" --output table

#  Public subnet route table            Private subnet route table
#  10.0.0.0/16   -> local               10.0.0.0/16   -> local
#  0.0.0.0/0     -> igw-0abc...         0.0.0.0/0     -> nat-0def...
#
#  (if a subnet has no explicit association, it uses the main route table of the VPC)
` },
    { q: "What is the difference between a security group and a network ACL?", a: "A security group works at the instance level, has only allow rules and is stateful, so return traffic is allowed automatically. A network ACL works at the subnet level, has allow and deny rules that are checked in number order, and is stateless, so you must write rules for both directions. Security groups are the main tool for daily work; network ACLs are an extra layer, mostly used to block a specific IP range, which a security group cannot do because it has no deny. On Azure the network security group covers both roles." },
    { q: "What is the difference between an internet gateway and a NAT gateway?", a: "An internet gateway allows traffic in both directions between the VPC and the internet for resources that have public IPs; it is free and highly available by design. A NAT gateway allows only outbound connections from private resources and hides them behind one public IP; nothing outside can start a connection to them. A NAT gateway itself lives in a public subnet and uses the internet gateway. It costs money per hour and per GB, and you need one per zone for high availability." },
    { q: "An instance in a private subnet must read from S3. How do you do it without sending traffic over the internet?", a: "Create a VPC endpoint for S3. A gateway endpoint adds a route in the private route table so S3 traffic stays on the AWS network, and it is free, so it also removes NAT gateway data charges for that traffic. Most other services use interface endpoints (PrivateLink), which place a private IP in your subnet and are billed per hour and per GB. The equivalents are service endpoints and Private Endpoint on Azure, and Private Google Access and Private Service Connect on Google Cloud.", c: `
# AWS: a free gateway endpoint for S3, added to the private route table
aws ec2 create-vpc-endpoint --vpc-id vpc-0abc1234 --service-name com.amazonaws.ap-south-1.s3 --route-table-ids rtb-0abc1234

# Google Cloud: let VMs without public IPs reach Google APIs from this subnet
gcloud compute networks subnets update app-subnet --region asia-south1 --enable-private-ip-google-access
` },
    { q: "Your app server cannot connect to the database. How do you debug it step by step?", a: "Go layer by layer. Check that the database is running and you use the right endpoint and port. Check the security group of the database: it must allow the port from the security group of the app server. Check that both are in the same VPC or that peering and routes exist, then check route tables and network ACLs for both directions. A connection that hangs until timeout usually means a firewall or route problem, while 'connection refused' means the network is fine but nothing listens on that port. Tools such as VPC Reachability Analyzer and flow logs show where the packet is dropped." }
  ],
  tips: [
    "Plan CIDR ranges before you build. Give every VPC and environment a range that does not overlap with the others or with the office network, because overlapping ranges cannot be peered later and changing a VPC range means rebuilding.",
    "Learn the two error shapes: a timeout means a security group, network ACL or route is dropping the packet; connection refused means the packet arrived and the service is not listening. This one fact saves hours.",
    "Watch NAT gateway cost. It is charged per hour and per GB, so add gateway endpoints for S3 and DynamoDB, and in dev environments use one NAT gateway instead of one per zone.",
    "Do not open port 22 or 3389 to reach servers. Use Systems Manager Session Manager on AWS, Azure Bastion, or IAP TCP forwarding on Google Cloud; they need no public IP and every session is logged."
  ]
});

EXTRA(19, "Cost and pricing", {
  deep: [
    "A commitment discount is a simple trade: you promise to pay for capacity every hour for one or three years, used or not, and get a lower rate. The maths decides if it is worth it. If a commitment gives 40 percent off, you pay 60 percent of the on-demand price for every hour of the term, so you only win if the machine would have run more than 60 percent of the time. This is why you commit only to the baseline that is always on, and leave the changing part on demand or on spot. Commit a little less than the baseline; an unused commitment is pure waste.",
    "The products differ in how flexible they are. On AWS, Standard Reserved Instances and EC2 Instance Savings Plans are tied to an instance family in a region and give the biggest discount; Compute Savings Plans are a promise of dollars per hour that follows you across families, regions, Fargate and Lambda, for a somewhat smaller discount. Azure has reservations for a specific VM series and region, a more flexible savings plan for compute, and Azure Hybrid Benefit to reuse Windows and SQL Server licences. Google Cloud has committed use discounts and also gives sustained use discounts automatically on some machine types that run most of the month. Paying upfront gives a bit more discount than paying monthly.",
    "Data transfer pricing has a clear shape. Data in from the internet is free. Data out to the internet is charged per GB after a small free amount each month, and the price falls slowly with volume. Data between regions is charged, and on AWS data between zones in the same region is charged in both directions. Using a public IP between two of your own servers in the same region can be billed like cross-zone traffic even when a private IP would be free. NAT gateways and many load balancers add their own per-GB processing fee on top. A CDN often lowers the bill because data from the origin to the provider's own CDN is not charged and CDN egress rates can be lower."
  ],
  iq: [
    { q: "How would you reduce a cloud bill by 30 percent?", a: "Start with data, not guesses: open the cost report grouped by service and by tag and find the top five costs. Then do the quick wins: delete unused resources (unattached disks, old snapshots, idle load balancers, unused IPs), stop dev and test at night and weekends, and right-size machines that run at low CPU. Next, buy a savings plan or reservation for the steady baseline and move interruptible work to spot. Finally fix structure: storage lifecycle rules, endpoints to cut NAT and egress cost, and newer cheaper instance types such as ARM-based ones. Each step is safe to do in this order, from no risk to more effort.", c: `
# where does the money go? by service, then by project tag
aws ce get-cost-and-usage --time-period Start=2026-09-01,End=2026-10-01 --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE
aws ce get-cost-and-usage --time-period Start=2026-09-01,End=2026-10-01 --granularity MONTHLY --metrics UnblendedCost --group-by Type=TAG,Key=project

# quick wins: public IPs not attached to anything, and unattached disks
aws ec2 describe-addresses --query "Addresses[?AssociationId==null].[PublicIp,AllocationId]" --output table
az disk list --query "[?diskState=='Unattached'].[name,diskSizeGb,resourceGroup]" --output table
gcloud compute disks list --filter "-users:*" --format "table(name,sizeGb,zone)"
` },
    { q: "What is the difference between Reserved Instances and Savings Plans?", a: "Both give a discount for a one or three year commitment. A Reserved Instance is a commitment to a specific instance type or family in a region, and a Savings Plan is a commitment to spend a fixed amount of dollars per hour on compute. Compute Savings Plans apply automatically across instance families, sizes, regions and also Fargate and Lambda, so they are much easier to keep fully used when your architecture changes. Reserved Instances can give a slightly better rate and still matter for services such as RDS, where reservations are the usual commitment tool." },
    { q: "A server runs only 8 hours on working days. Should you buy a one-year commitment with 40 percent discount for it?", a: "No. The commitment is paid for every hour of the year, used or not. The server runs about 22 percent of the hours, so on demand you pay about 22 percent of the full-time price, while the commitment costs 60 percent of the full-time price. A commitment only pays off when usage is higher than the break-even point, here 60 percent of the time.", c: `
#  On-demand price                1.00 per hour      (730 hours in a month)
#  Commitment with 40% discount   0.60 per hour, paid for all 730 hours
#
#  Always on (730 h)      on-demand 730     commitment 438    -> commit, saves 40%
#  Half time (365 h)      on-demand 365     commitment 438    -> on-demand is cheaper
#  8 h x 5 days (173 h)   on-demand 173     commitment 438    -> never commit
#
#  Break-even = 1 - discount = 60% of the hours
` },
    { q: "The data transfer line on the bill is very high. What are the usual causes and fixes?", a: "The usual causes are large downloads sent straight from servers or buckets to the internet, chatty services spread across zones or regions, traffic to cloud services going through a NAT gateway, and servers talking to each other over public IPs. Fixes are a CDN in front of public content, compression, keeping services that talk a lot in the same zone or region, private endpoints for storage and other services, and private IPs for internal traffic. Find the cause first with the cost report filtered by usage type, because each cause has a different fix." },
    { q: "Do you still pay for a stopped virtual machine?", a: "You stop paying for the compute time, but you keep paying for everything attached: the disks, snapshots, reserved public IP addresses and any licences billed separately. On Azure the VM must be in the 'stopped (deallocated)' state; a VM shut down from inside the operating system is still allocated and still billed for compute. To pay nothing you must delete the VM and its disks." }
  ],
  tips: [
    "Create two budget alerts, not one: one on actual cost at 50, 80 and 100 percent, and one on forecast cost. Also enable cost anomaly detection, which catches a sudden jump days before a monthly budget would.",
    "Remember that a budget alert only sends a message; it does not stop anything. On a learning account also set a habit: delete the resource group or project at the end of every session.",
    "Enforce tags at creation with policy (AWS tag policies or SCPs, Azure Policy, Google Cloud labels in Terraform modules) instead of asking people to remember. Untagged cost should show up as its own line that someone must explain each month.",
    "Check the hidden always-on items after every experiment: NAT gateways, load balancers, managed Kubernetes control planes, public IPs, snapshots and log storage with no retention limit. They cost money with zero traffic."
  ]
});

EXTRA(19, "Security and the shared responsibility model", {
  deep: [
    "The line of responsibility moves with each service, and you must know it per service, not per cloud. On a VM the provider patches the hypervisor and you patch the guest operating system, the runtime and your libraries. On a managed database the provider patches the operating system and the database engine, but you still choose the maintenance window, decide when to take major version upgrades, set the network rules and manage the database users. On functions and serverless containers the provider patches the operating system and often the language runtime, but the libraries in your package and your base image are yours. In every case, data, identities and configuration are yours.",
    "Encryption at rest in the cloud uses envelope encryption. Your data is encrypted with a data key, and the data key is itself encrypted with a main key that lives inside the key management service and never leaves its hardware security modules. To read data, a service must ask KMS to decrypt the data key, so every use is an API call that IAM can allow or deny and the audit log records. This is the real benefit of customer-managed keys: a second, separate permission check and a log, plus the ability to disable the key. Default provider-managed encryption protects against a stolen disk, but it does not protect against someone who has valid read permission on the data.",
    "Audit logs have a split that people miss. Management events (creating, changing and deleting resources) are logged by default, but data events (reading one object from a bucket, running one query) are usually off because of volume and cost, so turn them on for sensitive data. Send logs to a separate account or project that the normal administrators cannot change, or an attacker will delete the evidence. A misconception is that a compliance certificate of the provider makes your application compliant; it covers only their part. Another is that a private network is enough: most cloud attacks today use stolen credentials through the public API, which no firewall in your VPC ever sees."
  ],
  iq: [
    { q: "In the shared responsibility model, who patches the operating system on EC2, on RDS and on Lambda?", a: "On EC2 you do: the guest operating system, the runtime and everything you installed are your job, and the provider only patches the hypervisor and hardware. On RDS the provider patches the operating system and the database engine, usually in a maintenance window that you choose. On Lambda the provider patches the operating system and the managed runtime. In all three you still patch your own code and its libraries, and you still own the data and the access settings.", c: `
#                         EC2 / VM       RDS / managed DB        Lambda / functions
#  Hardware, hypervisor   provider       provider                provider
#  Guest OS patches       YOU            provider                provider
#  DB engine / runtime    YOU            provider (your window)  provider
#  Your code, libraries   YOU            (your SQL, your users)  YOU
#  Network rules          YOU            YOU                     YOU (if in a VPC)
#  Data, IAM, encryption  YOU            YOU                     YOU
` },
    { q: "An AWS access key was pushed to a public GitHub repository. What do you do, in order?", a: "First make the key useless: set it to inactive or delete it at once, because bots find such keys in minutes. Do not only delete the commit; the key must be treated as stolen. Then look in the audit log for what the key did, check for new users, roles, keys and resources in all regions, and remove them. Finally fix the cause: move the workload to a role with temporary credentials, add secret scanning and a pre-commit hook, and reduce the permissions that identity had.", c: `
# 1. disable the key now
aws iam update-access-key --user-name deploy-bot --access-key-id AKIAEXAMPLEKEYID0000 --status Inactive

# 2. what did this key do?
aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAEXAMPLEKEYID0000 --max-results 50

# 3. did the attacker create other keys or users?
aws iam list-users --query "Users[].[UserName,CreateDate]" --output table
aws iam list-access-keys --user-name deploy-bot
` },
    { q: "What is the difference between encryption at rest and encryption in transit? Does default encryption at rest make a bucket safe?", a: "Encryption in transit protects data while it travels over the network, using TLS. Encryption at rest protects data stored on disks, using keys managed in a key service. Default encryption at rest protects against someone stealing the physical disks, but anyone with read permission still gets clear data, so a public bucket is still fully exposed. Real protection comes from access control first; a customer-managed key adds a second permission check, because the reader also needs permission to use the key." },
    { q: "What does 'security of the cloud' versus 'security in the cloud' mean? Give examples.", a: "Security of the cloud is the provider's part: buildings, hardware, the network, the hypervisor and the software of the managed services. Security in the cloud is your part: IAM policies, MFA, security group rules, bucket settings, encryption choices, patching your VMs and protecting your data. Example: if a disk fails or a hypervisor has a bug, that is the provider's problem; if a bucket is public or a root account has no MFA, that is yours. Most real incidents are on the customer side." },
    { q: "Where do you keep a database password in the cloud, and why not in an environment variable in the repository?", a: "Keep it in the provider's secret store: AWS Secrets Manager, Azure Key Vault or Google Secret Manager. The application reads it at run time using its own workload identity, so access is controlled by IAM, every read is logged, and the secret can be rotated without a new deployment. A value written in code, in a config file in Git or in a container image is copied to every laptop and CI log and stays in the Git history forever. Better still, avoid the password completely where the service supports IAM-based database login." }
  ],
  tips: [
    "Turn on the guardrails at the top level on day one: block public access for storage at the account level, require MFA, and enable the audit trail in all regions. These three settings stop the most common incident types.",
    "Enable the provider's threat detection (Amazon GuardDuty, Microsoft Defender for Cloud, Google Security Command Center) and send its alerts to a channel that people read. An alert that goes to an unread mailbox does not exist.",
    "Add secret scanning to the repository and a pre-commit hook such as gitleaks. If a secret is ever committed, rotate it at once; deleting the commit does not make it secret again.",
    "Enforce IMDSv2 on all AWS instances and keep audit logs in a separate account or project with write-once retention. Both are cheap, and both are asked about in security reviews."
  ]
});

EXTRA(19, "Service comparison: AWS, Azure and GCP side by side", {
  deep: [
    "The biggest hidden differences are in the structure, not in the service names. An AWS subnet lives in one zone, while Azure and Google Cloud subnets cover a whole region. A Google Cloud VPC is global, while AWS and Azure networks are regional. An S3 bucket and a Google Cloud Storage bucket are top-level resources with a globally unique name, but an Azure blob container lives inside a storage account, and the account is the unit for redundancy, network rules and naming. If you carry your mental model from one cloud to another without checking these points, your network or storage design will be wrong.",
    "The IAM models also differ under the surface. AWS attaches JSON policies to identities and to resources, and a policy can both allow and deny. Azure and Google Cloud bind a role to a principal at a scope in a hierarchy, and access is inherited downwards and is additive. The firewalls differ too: an AWS security group can only allow, while Azure network security groups and Google Cloud firewall rules have allow and deny with priorities. Default behaviour is another trap: in Google Cloud you must enable each API per project, in Azure you may need to register a resource provider, and in AWS services are simply there but limited by quotas.",
    "Multi-cloud has a real cost. To run the same system on two clouds you can use only the features that both have, you need two sets of skills, tooling and security rules, and data moving between the clouds pays egress on every GB. Terraform helps with one workflow, but it does not make code portable: an aws_instance and an azurerm_linux_virtual_machine are different resources and must be written twice. Portability comes more from open layers such as containers, Kubernetes, PostgreSQL and standard protocols than from the IaC tool. A good answer to lock-in is to know what moving would cost and accept it, not to avoid every managed service."
  ],
  iq: [
    { q: "What are the Azure and Google Cloud equivalents of EC2, S3, Lambda, RDS, IAM role, VPC and CloudWatch?", a: "EC2 maps to Azure Virtual Machines and Compute Engine. S3 maps to Blob Storage and Cloud Storage. Lambda maps to Azure Functions and Cloud Run functions. RDS maps to Azure SQL Database or Azure Database for PostgreSQL and MySQL, and to Cloud SQL. An IAM role on a workload maps to a managed identity and to a service account. VPC maps to Virtual Network and VPC, and CloudWatch maps to Azure Monitor and to Cloud Monitoring with Cloud Logging. Add that they are equivalent in purpose but differ in details such as limits and scope.", c: `
# the same three questions on each cloud

# who am I?
aws sts get-caller-identity
az account show --output table
gcloud auth list

# list virtual machines
aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name]" --output table
az vm list --show-details --output table
gcloud compute instances list

# list object storage
aws s3 ls
az storage account list --output table
gcloud storage ls
` },
    { q: "Name three differences between the clouds that cause real mistakes when people switch.", a: "First, network scope: a Google Cloud VPC is global and subnets are regional, while an AWS subnet is tied to one zone, so high availability on AWS needs one subnet per zone. Second, firewalls: AWS security groups have only allow rules, while Azure and Google Cloud rules can also deny and use priorities, so rule order matters there. Third, grouping and deletion: every Azure resource is in a resource group and deleting the group deletes all of it, a Google Cloud project works in a similar way, but AWS has no such container inside an account, so cleanup needs tags or infrastructure as code." },
    { q: "How would you build a simple serverless REST API with a NoSQL database on each cloud?", a: "On AWS: API Gateway in front of Lambda functions with DynamoDB. On Azure: Azure Functions with an HTTP trigger (or API Management in front) with Cosmos DB. On Google Cloud: Cloud Run or Cloud Run functions (with API Gateway if needed) with Firestore. In all three the functions use a workload identity to reach the database, so no keys are stored, and you pay per request with no cost when idle." },
    { q: "Does Terraform make your infrastructure portable between clouds?", a: "No. Terraform gives one language, one workflow and one state model for all clouds, which is a real benefit for the team. But every provider has its own resource types with different arguments, so the code for AWS cannot be applied to Azure; it must be rewritten. Portability comes from what you run (containers, Kubernetes, PostgreSQL), not from the tool that creates it.", c: `
# same tool, same workflow, but the resources are provider-specific

resource "aws_s3_bucket" "reports" {
  bucket = "my-company-reports-prod"
}

resource "azurerm_storage_account" "reports" {
  name                     = "stmycompanyreportsprod"
  resource_group_name      = "rg-shop-prod"
  location                 = "centralindia"
  account_tier             = "Standard"
  account_replication_type = "ZRS"
}

resource "google_storage_bucket" "reports" {
  name     = "my-company-reports-prod"
  location = "ASIA-SOUTH1"
}
` },
    { q: "When is multi-cloud a good idea, and when is it a mistake?", a: "It is reasonable when there is a clear reason: a regulator or customer requires it, a merger brought a second cloud, or one provider has a service that is clearly best for one job, such as BigQuery for analytics. It is a mistake as a default plan to avoid lock-in, because you pay with double skills, the lowest common set of features, harder security and egress charges between clouds. Most companies do better by going deep on one main provider and keeping the application portable with containers and open databases." }
  ],
  tips: [
    "When you move to a new cloud, do not start with the service table. First learn four things: the account hierarchy, how IAM grants access, how the network is scoped, and how billing is grouped. The services are easy after that.",
    "Keep provider-specific code at the edges of your application. Put storage, queue and secret access behind small interfaces of your own, so the business code does not import a cloud SDK in a hundred files.",
    "Use the same tag or label keys (project, env, owner) and the same naming pattern on every cloud. Cost reports and security tools that span clouds only work when the keys match.",
    "In interviews, do not pretend to know a cloud you have not used. Say which one you know well, then map the question with the equivalent service and name one difference you would check in the documentation; this shows real understanding."
  ]
});
