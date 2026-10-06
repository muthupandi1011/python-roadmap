ROADMAP.push({
n: 11, track: "DevOps, data and design",
title: "Docker in Depth",
blurb: "Containers from the ground up: what they are, how images are built in layers, and how to run, connect, store and secure them.",
topics: [
X("What Docker is and why containers exist",
["Before containers, an application was installed directly on a server. It depended on whatever version of Python, system libraries and settings that server happened to have. The same code would work on the developer's laptop and fail in production because something small was different. Teams lost days to 'it works on my machine' problems.",
 "Docker solves this by packaging the application together with everything it needs to run: the language runtime, libraries, system tools and configuration. That package is called an image. When you run an image you get a container, which is an isolated process on the host machine. Because the image carries its own environment, the container behaves the same on a laptop, a test server and a cloud machine.",
 "A container is not a virtual machine. A virtual machine includes a full guest operating system with its own kernel, so it takes gigabytes of disk and a minute to boot. A container shares the kernel of the host and only isolates the process using Linux features called namespaces (what the process can see) and cgroups (how much CPU and memory it may use). That is why a container starts in under a second and you can run dozens on one laptop."],
["Image = the read-only package (a template). Container = a running instance of an image.",
 "Containers share the host kernel; virtual machines each carry their own operating system.",
 "The Docker Engine (dockerd) does the work; the 'docker' command is a client that talks to it.",
 "On Windows and macOS, Docker Desktop runs a small Linux virtual machine behind the scenes, because containers need a Linux kernel.",
 "Containers are meant to be disposable: you replace them, you do not repair them."],
"A company has a Python 3.9 billing service and a Python 3.13 reporting service. On one server they would fight over library versions. As two containers each carries its own Python, and both run side by side on the same machine without knowing about each other.",
`
# check the installation
docker --version
docker run hello-world

# run a web server in the background, host port 8080 -> container port 80
docker run -d --name web -p 8080:80 nginx

docker ps                 # list running containers
docker logs web           # see its output
docker stop web
docker rm web
`,
"Process isolation goes back to Unix chroot (1979), FreeBSD jails (2000) and Linux LXC (2008). Solomon Hykes showed Docker publicly at PyCon in March 2013. It did not invent containers; it made them easy to build, share and run. The image and runtime formats were later standardised by the Open Container Initiative (2015).",
[["Docker overview (official docs)", "https://docs.docker.com/get-started/docker-overview/"],
 ["Get started with Docker", "https://docs.docker.com/get-started/"],
 ["Open Container Initiative", "https://opencontainers.org/"]]),

X("Images and layers",
["An image is built as a stack of read-only layers. Each instruction in a Dockerfile that changes the filesystem (FROM, RUN, COPY, ADD) creates one layer containing only the files that changed. The final image is all the layers stacked on top of each other, shown to the container as one filesystem.",
 "Layers are what make Docker fast and economical. They are cached and shared. If ten images are all based on python:3.13-slim, that base layer is stored on disk once and downloaded once. When you rebuild an image, Docker reuses every layer whose instruction and inputs have not changed, and only rebuilds from the first changed step onward.",
 "When a container starts, Docker adds one thin writable layer on top of the image layers. Everything the container writes goes there. When the container is deleted that layer is deleted too, which is why data you care about must be stored in a volume, not inside the container."],
["An image name has the form registry/repository:tag, for example docker.io/library/python:3.13-slim.",
 "A tag is a movable label. 'latest' is just a default tag name and does not mean newest; pin exact versions in production.",
 "A digest (sha256:...) identifies the exact image content and never changes.",
 "Smaller base images (slim, alpine, distroless) mean faster downloads and fewer security holes.",
 "Order matters for caching: put the steps that change rarely at the top of the Dockerfile."],
"A team's build took 6 minutes because 'COPY . .' came before 'pip install', so every code change reinstalled all libraries. Moving the dependency install above the code copy let Docker reuse the cached layer, and builds dropped to 20 seconds.",
`
docker pull python:3.13-slim        # download an image
docker images                       # list local images
docker history python:3.13-slim     # see the layers and their sizes
docker inspect python:3.13-slim     # full metadata as JSON

docker tag shop-api:1.4 myregistry.example.com/shop-api:1.4
docker rmi python:3.13-slim         # remove an image
docker image prune                  # delete dangling (untagged) images; add -a for all unused
`,
"Layered filesystems (union filesystems such as AUFS and later OverlayFS) existed in Linux before Docker. Docker's key idea in 2013 was to use them for a content-addressed, shareable image format. BuildKit, the modern build engine with better caching, became the default builder in Docker 23.0 (2023).",
[["What is an image?", "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/"],
 ["Understanding image layers", "https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/"],
 ["Build cache", "https://docs.docker.com/build/cache/"]]),

X("Writing a Dockerfile",
["A Dockerfile is a plain text recipe that tells Docker how to build an image, one instruction per line, run from top to bottom. You start FROM a base image, set a working directory, copy files in, run commands to install what is needed, and finally declare what command the container should run when it starts.",
 "It is important to know which instructions run at build time and which at run time. RUN executes while the image is being built and its result is saved in a layer. CMD and ENTRYPOINT do not run during the build; they only record what to execute when a container starts. ENV sets environment variables, EXPOSE documents which port the app listens on (it does not publish it), and USER switches away from root.",
 "A .dockerignore file next to the Dockerfile lists files that should not be sent to the build, such as .git, virtual environments, caches and secrets. It keeps builds fast and prevents private files from ending up inside the image."],
["FROM: the base image. WORKDIR: the folder later commands run in. COPY: bring files from your machine into the image.",
 "RUN: execute a command at build time (install packages). CMD: default command at start. ENTRYPOINT: the fixed executable; CMD then supplies its default arguments.",
 "Use the JSON 'exec form' CMD [\"python\", \"app.py\"] so the app receives stop signals correctly.",
 "Copy the dependency list and install first, then copy the source code, so the install layer is cached.",
 "Never put passwords or keys in a Dockerfile; they stay in the image history forever."],
"A FastAPI service is containerised so that the same image is tested in CI and then deployed unchanged to production. New developers run one command and have the whole service working without installing Python at all.",
`
# Dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# 1. dependencies first (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. then the source code
COPY . .

# 3. do not run as root
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# build:  docker build -t shop-api:1.0 .
# run:    docker run -p 8000:8000 shop-api:1.0
`,
"The Dockerfile format has been part of Docker since its 2013 release and was inspired by Makefiles and shell provisioning scripts. Later additions include HEALTHCHECK (2016), multi-stage builds (2017) and BuildKit features such as cache and secret mounts (2018 onward).",
[["Dockerfile reference", "https://docs.docker.com/reference/dockerfile/"],
 ["Writing a Dockerfile", "https://docs.docker.com/get-started/docker-concepts/building-images/writing-a-dockerfile/"],
 ["Building best practices", "https://docs.docker.com/build/building/best-practices/"]]),

X("Running and managing containers",
["A container has a life cycle: created, running, stopped (exited) and removed. 'docker run' creates and starts a container in one step. It runs until its main process exits. If that process is a web server it runs forever; if it is a script, the container stops when the script ends.",
 "Most day-to-day Docker work is a small set of commands. You start containers with options for name, ports, environment variables and restart behaviour. You look at their output with 'docker logs', get a shell inside with 'docker exec', check resource use with 'docker stats', and stop and remove them when you are done.",
 "Stopping is a two-step process. 'docker stop' sends SIGTERM to the main process and waits 10 seconds for it to finish cleanly, then sends SIGKILL. A well-behaved application handles SIGTERM by finishing current requests and closing connections."],
["-d runs in the background. -it gives an interactive terminal. --rm deletes the container when it exits.",
 "-p HOST:CONTAINER publishes a port. -e NAME=value sets an environment variable. --name gives it a readable name.",
 "--restart unless-stopped brings the container back after a crash or a reboot.",
 "--memory and --cpus limit resources so one container cannot starve the others.",
 "'docker exec -it NAME sh' opens a shell in a running container for debugging."],
"At 2 am an API container keeps restarting. The on-call engineer runs 'docker ps -a' to see the exit code, 'docker logs --tail 100 api' to read the last error, and finds a missing environment variable. They restart it with the variable set.",
`
docker run -d --name api -p 8000:8000 -e APP_ENV=prod --restart unless-stopped --memory 512m shop-api:1.0

docker ps                      # running containers
docker ps -a                   # all, including stopped ones
docker logs -f --tail 50 api   # follow the last 50 lines
docker exec -it api sh         # shell inside the container
docker stats                   # live CPU and memory
docker inspect api             # full configuration as JSON

docker stop api
docker rm api
docker system prune            # clean up stopped containers and unused data
`,
"The 'docker run' command line has been remarkably stable since 2013. The management commands were regrouped in Docker 1.13 (2017) into forms such as 'docker container ls' and 'docker image ls'; the short originals still work.",
[["docker run reference", "https://docs.docker.com/reference/cli/docker/container/run/"],
 ["Running containers", "https://docs.docker.com/engine/containers/run/"],
 ["Resource constraints", "https://docs.docker.com/engine/containers/resource_constraints/"]]),

X("Volumes and persistent data",
["Anything written inside a container lives in its writable layer and disappears when the container is removed. That is fine for a stateless web service, but a database, uploaded files or logs must survive. Docker provides storage that lives outside the container's life cycle.",
 "There are two main kinds. A named volume is storage managed by Docker (you give it a name and Docker decides where it lives on disk). It is the right choice for databases and other application data. A bind mount maps a specific folder from your machine into the container. It is the right choice in development, because edits you make in your editor appear inside the container at once.",
 "Volumes can be shared between containers, backed up, and moved. Removing a container does not remove its volumes; you have to delete them explicitly, which protects you from losing data by accident."],
["Named volume: -v pgdata:/var/lib/postgresql/data  (Docker manages the location).",
 "Bind mount: -v ./src:/app/src  (a folder you choose on the host).",
 "Add :ro to make a mount read-only, for example for configuration files.",
 "tmpfs mounts keep data in memory only, useful for secrets and scratch files.",
 "Back up a volume by running a temporary container that archives it to the host."],
"A PostgreSQL container is upgraded from version 16.3 to 16.4. The old container is deleted and a new one started with the same named volume attached, so all the data is still there.",
`
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16

docker volume ls
docker volume inspect pgdata

# development: live code reload with a bind mount
docker run -d -p 8000:8000 -v ./app:/app shop-api:dev

# back up a volume to a tar file in the current folder
docker run --rm -v pgdata:/data -v .:/backup alpine tar czf /backup/pgdata.tar.gz -C /data .
`,
"Early Docker had only 'data volume containers', which were awkward to use. Named volumes and volume drivers arrived in Docker 1.9 (2015), and the clearer --mount syntax in 17.06 (2017).",
[["Volumes", "https://docs.docker.com/engine/storage/volumes/"],
 ["Bind mounts", "https://docs.docker.com/engine/storage/bind-mounts/"],
 ["Storage overview", "https://docs.docker.com/engine/storage/"]]),

X("Docker networking",
["Each container gets its own private network stack: its own IP address, its own ports and its own 'localhost'. This is why 'localhost' inside a container means the container itself, not your machine and not another container. Understanding this removes most Docker networking confusion.",
 "Containers talk to each other over Docker networks. On the default bridge network they can only reach each other by IP address. On a user-defined bridge network, Docker runs a small built-in DNS server so containers can reach each other by name: the API connects to the host name 'db' and Docker resolves it to the database container.",
 "To reach a container from outside, you publish a port with -p. '-p 8080:80' means 'traffic arriving at port 8080 on the host is forwarded to port 80 in the container'. Containers on the same network do not need published ports to talk to each other; publishing is only for access from the host or the outside world."],
["bridge: the default, a private network on one host. host: the container uses the host's network directly. none: no network.",
 "Always create your own network for an application so containers find each other by name.",
 "Only publish the ports that must be reachable from outside; keep the database unpublished.",
 "From a container, reach a service on your own machine using the name host.docker.internal (built in on Docker Desktop; on Linux add --add-host=host.docker.internal:host-gateway).",
 "overlay networks connect containers across several hosts (Swarm); Kubernetes has its own network model."],
"A web API, a Redis cache and a PostgreSQL database run as three containers on one network. Only the API publishes a port. The database is unreachable from the internet, but the API reaches it simply as 'db:5432'.",
`
docker network create shopnet

docker run -d --name db --network shopnet -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name cache --network shopnet redis:7
docker run -d --name api --network shopnet -p 8000:8000 -e DATABASE_URL=postgresql://postgres:secret@db:5432/postgres shop-api:1.0

docker network ls
docker network inspect shopnet
docker run --rm --network shopnet alpine ping -c 1 db    # name resolution works inside the network
`,
"Early Docker connected containers with '--link', now a legacy feature. The current pluggable network system (libnetwork, with user-defined networks and built-in DNS) arrived in Docker 1.9 in 2015.",
[["Networking overview", "https://docs.docker.com/engine/network/"],
 ["Bridge network driver", "https://docs.docker.com/engine/network/drivers/bridge/"],
 ["Publishing ports", "https://docs.docker.com/engine/network/port-publishing/"]]),

X("Docker Compose",
["Real applications are several containers: an API, a database, a cache, maybe a worker. Starting each with a long 'docker run' command, in the right order, on the right network, is tedious and error-prone. Docker Compose lets you describe the whole application in one YAML file, compose.yaml, and start everything with one command.",
 "In the file, each container is a 'service'. For each service you state the image or build folder, ports, environment variables, volumes and what it depends on. Compose automatically creates a network for the project, so services reach each other by service name. 'docker compose up' builds what is needed and starts everything; 'docker compose down' stops and removes it.",
 "Compose is the standard way to run a development environment and is also used for small single-server deployments. For large multi-server production systems, teams usually move to Kubernetes, but the concepts carry over directly."],
["'docker compose up -d' starts everything in the background; 'docker compose down' removes it; add -v to also delete volumes.",
 "'depends_on' with 'condition: service_healthy' waits for a health check, not just for the container to start.",
 "Put changeable values in a .env file next to compose.yaml; Compose reads it automatically.",
 "'docker compose logs -f api' follows one service; 'docker compose exec api sh' opens a shell in it.",
 "The modern command is 'docker compose' (a plugin). The older 'docker-compose' with a hyphen is retired."],
"A new developer joins the team. Instead of a two-day setup of Python, PostgreSQL and Redis, they clone the repository, run 'docker compose up', and the complete system is running in five minutes.",
`
# compose.yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:secret@db:5432/shop
      REDIS_URL: redis://cache:6379/0
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: shop
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  cache:
    image: redis:7

volumes:
  pgdata:
`,
"Compose began as a tool called Fig, created by Orchard in 2013. Docker bought Orchard in 2014 and renamed it Docker Compose. Compose V2, rewritten in Go as the 'docker compose' plugin, became the default in 2022.",
[["Docker Compose documentation", "https://docs.docker.com/compose/"],
 ["Compose file reference", "https://docs.docker.com/reference/compose-file/"],
 ["Compose quickstart", "https://docs.docker.com/compose/gettingstarted/"]]),

X("Multi-stage builds and small images",
["Building software often needs tools that running it does not: compilers, build systems, test frameworks, development headers. If they stay in the final image, the image is large, slow to download and has more software that could contain security holes.",
 "A multi-stage build uses several FROM instructions in one Dockerfile. Each FROM starts a new stage. An early stage has all the build tools and produces the result (installed packages, a compiled binary, built front-end files). The final stage starts from a small clean base and copies in only the result with 'COPY --from=stagename'. Everything else is thrown away.",
 "The effect can be dramatic. A Go or Rust service can shrink from over 1 GB to under 20 MB. A Python image typically goes from around 1 GB (full python image with build tools) to 150-200 MB."],
["Name stages with 'AS name' and copy from them with 'COPY --from=name'.",
 "The final stage decides what ships. Earlier stages are not part of the image.",
 "Choose the smallest practical base: python:3.13-slim for most Python apps.",
 "Combine related shell commands in one RUN and clean package caches in the same step.",
 "Use 'docker build --target builder' to stop at a stage, for example to run tests."],
"A Python service needs gcc to compile a database driver. With a multi-stage build, gcc exists only in the builder stage; the production image contains just the compiled packages and the code, and passes the security scan that the larger image failed.",
`
# ---- stage 1: build ----
FROM python:3.13 AS builder
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ---- stage 2: final, small ----
FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY . .
ENV PATH="/opt/venv/bin:$PATH"
USER nobody
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
"Before 2017, teams kept two Dockerfiles and a shell script (the 'builder pattern') to achieve this. Multi-stage builds were added in Docker 17.05 (May 2017). Google's 'distroless' images, which contain no shell or package manager at all, appeared the same year.",
[["Multi-stage builds", "https://docs.docker.com/build/building/multi-stage/"],
 ["Building best practices", "https://docs.docker.com/build/building/best-practices/"]]),

X("Registries: sharing images",
["A registry is a server that stores and distributes images, in the same way that GitHub stores code. You build an image on one machine, push it to a registry, and any other machine with access can pull and run it. This is the link between your CI pipeline (which builds) and your servers (which run).",
 "Docker Hub is the default public registry and hosts the official images such as python, postgres and nginx. Companies normally keep their own images in a private registry: Amazon ECR, Azure Container Registry, Google Artifact Registry or GitHub Container Registry.",
 "To push an image it must be tagged with the registry address and repository name. Good practice is to tag each build with something unique and traceable, such as the version number or the Git commit hash, so you always know exactly what code is running and can roll back to a known image."],
["Flow: docker build -> docker tag -> docker login -> docker push -> (on the server) docker pull.",
 "Tag with a version or commit hash, not only 'latest'. Never overwrite a released tag.",
 "Use official or verified-publisher images as your base and keep them updated.",
 "Private registries need 'docker login'; in CI, use a short-lived token, not a personal password.",
 "Docker Hub limits anonymous pulls, which can break CI; authenticate or use a mirror."],
"The CI pipeline builds shop-api, tags it with the Git commit a1b2c3d and pushes it to the company registry. Staging and production both pull that exact tag, so what was tested is exactly what is released.",
`
docker build -t shop-api:1.4.0 .

# tag for a private registry
docker tag shop-api:1.4.0 ghcr.io/mycompany/shop-api:1.4.0
docker tag shop-api:1.4.0 ghcr.io/mycompany/shop-api:a1b2c3d

docker login ghcr.io
docker push ghcr.io/mycompany/shop-api:1.4.0
docker push ghcr.io/mycompany/shop-api:a1b2c3d

# on the server
docker pull ghcr.io/mycompany/shop-api:1.4.0
`,
"Docker Hub launched in 2014. The registry protocol was standardised as the OCI Distribution Specification, which is why every cloud's registry works with the same docker push and pull commands.",
[["Docker Hub", "https://hub.docker.com/"],
 ["What is a registry?", "https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-registry/"],
 ["GitHub Container Registry", "https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry"]]),

X("Container security and good practice",
["Containers isolate processes, but the isolation is thinner than a virtual machine's because the kernel is shared. A container running as root with extra privileges can, in the worst case, affect the host. Security is therefore mostly about reducing what a container contains and what it is allowed to do.",
 "The basics are simple and cover most of the risk. Run as a non-root user. Use small, official, regularly updated base images. Scan images for known vulnerabilities. Never bake secrets into images. Give containers only the access they need: no --privileged flag, a read-only filesystem where possible, and resource limits.",
 "Add a HEALTHCHECK so the platform can tell whether the application inside is actually working, not just whether the process exists. An orchestrator can then restart or replace unhealthy containers automatically."],
["Add a USER instruction; do not run the application as root.",
 "Pin base image versions and rebuild regularly to pick up security patches.",
 "Scan with 'docker scout cves IMAGE' or a tool such as Trivy, and do it in CI.",
 "Pass secrets at run time (environment, secret stores, mounted files), never in the Dockerfile or image.",
 "Avoid --privileged and avoid mounting the Docker socket into containers; both give near-total control of the host.",
 "One main process per container; log to standard output so the platform can collect logs."],
"A security audit finds an API key in an old image layer, added by 'COPY . .' because .env was not in .dockerignore. Deleting the file in a later layer did not remove it from history. The key has to be revoked and the team adds .dockerignore and secret scanning to CI.",
`
# .dockerignore
.git
.env
__pycache__
.venv

# Dockerfile additions
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
USER appuser

# run with least privilege
docker run -d --read-only --cap-drop ALL --security-opt no-new-privileges --memory 512m --cpus 1 shop-api:1.4.0

# scan for known vulnerabilities
docker scout cves shop-api:1.4.0
`,
"Container escapes such as the runc vulnerability CVE-2019-5736 showed why running as root is dangerous. Rootless Docker (the daemon itself without root) became stable in Docker 20.10 (2020). The CIS Docker Benchmark is the commonly used hardening checklist.",
[["Docker Engine security", "https://docs.docker.com/engine/security/"],
 ["Docker Scout", "https://docs.docker.com/scout/"],
 ["OWASP Docker Security Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html"]])
]});

ROADMAP.push({
n: 12, track: "DevOps, data and design",
title: "CI/CD in Depth",
blurb: "Automating the path from a code change to a running release: pipelines, the main tools, deployment strategies and safe handling of secrets.",
topics: [
X("What CI/CD means",
["CI/CD is the practice of automating everything that happens between a developer writing code and users getting it. It has three parts that people often blur together, so it helps to separate them.",
 "Continuous Integration (CI) means every developer merges their work into the shared main branch often, at least daily, and every change is automatically built and tested. The goal is to find problems within minutes of introducing them, while the change is small and fresh in mind, instead of weeks later during a painful 'integration phase'.",
 "Continuous Delivery means that after CI passes, the software is automatically packaged and deployed to a test or staging environment, so it is always in a releasable state; releasing to production is a button press. Continuous Deployment goes one step further and removes the button: every change that passes all the automated checks goes to production on its own."],
["CI = merge often + automated build + automated tests on every change.",
 "Continuous Delivery = always releasable, production release is a manual decision.",
 "Continuous Deployment = fully automatic release to production.",
 "The main branch should always be green (passing). A broken build is fixed before anything else.",
 "Small, frequent releases are safer than large, rare ones because each contains less change."],
"A team used to release once a month over a weekend, with a long checklist and frequent rollbacks. After adopting CI/CD they release several times a day; each release is a few small changes, so when something breaks they know exactly which change caused it.",
`
# The path of one change
#
#  developer pushes a commit
#          |
#          v
#  CI:  lint -> unit tests -> build image -> security scan
#          |
#          v
#  CD:  deploy to staging -> integration tests
#          |
#          v   (manual approval for Delivery, automatic for Deployment)
#  deploy to production -> health checks -> monitor
`,
"Grady Booch used the term continuous integration in 1991. Kent Beck made it a core practice of Extreme Programming in the late 1990s, and Martin Fowler's 2000 article spread it widely. The 2010 book 'Continuous Delivery' by Jez Humble and David Farley defined the deployment pipeline.",
[["Martin Fowler: Continuous Integration", "https://martinfowler.com/articles/continuousIntegration.html"],
 ["Continuous Delivery (Jez Humble)", "https://continuousdelivery.com/"],
 ["DORA research on delivery performance", "https://dora.dev/"]]),

X("Anatomy of a pipeline",
["A pipeline is the automated sequence of steps a change goes through. It is defined in a file stored in the repository itself ('pipeline as code'), so it is versioned and reviewed like any other code. Although every tool has its own syntax, they all share the same building blocks.",
 "A trigger decides when the pipeline runs: on a push, on a pull request, on a schedule or manually. The pipeline is divided into stages (for example test, build, deploy) that run in order. A stage contains jobs, which can run in parallel. A job is a list of steps (shell commands or reusable actions) executed on a runner, a machine or container provided by the service or by you.",
 "A good pipeline is fast and fails early. Cheap checks such as linting and unit tests run first, so a simple mistake is reported in a minute rather than after a 20-minute build. Slow steps are sped up with caching (keeping downloaded dependencies between runs) and parallel jobs."],
["Trigger -> stages -> jobs -> steps, executed on runners (also called agents).",
 "Artifacts are files a job produces and passes on: a built package, a test report, a Docker image.",
 "Cache dependencies (pip, npm) between runs to save minutes on every build.",
 "'Build once, deploy many': build one artifact and promote the same one through every environment.",
 "Keep the whole pipeline under about 10 minutes, or developers stop waiting for it."],
"A pull request is opened. Within 3 minutes the author sees a red cross: one unit test fails. They fix it and push again; the pipeline goes green, a reviewer approves, and merging to main triggers the build and deployment stages automatically.",
`
# typical stages for a Python service
stages:
  1. lint         ruff check .            (seconds)
  2. test         pytest --cov            (1-3 minutes)
  3. build        docker build            (1-2 minutes)
  4. scan         dependency and image vulnerability scan
  5. publish      docker push registry/app:COMMIT_SHA
  6. deploy-stg   deploy that image to staging, run smoke tests
  7. deploy-prod  manual approval, then deploy the SAME image
`,
"Early CI servers such as CruiseControl (2001) and Hudson (2005) were configured by clicking through web forms. Travis CI (2011) popularised a YAML file in the repository, and that 'pipeline as code' model is now universal.",
[["GitHub Actions: understanding workflows", "https://docs.github.com/en/actions/get-started/understand-github-actions"],
 ["GitLab CI/CD pipelines", "https://docs.gitlab.com/ci/pipelines/"]]),

X("GitHub Actions",
["GitHub Actions is the CI/CD system built into GitHub. Workflows are YAML files in the .github/workflows folder of the repository. Because it lives next to the code and is free for public repositories, it has become the most common choice for new projects.",
 "A workflow has a name, an 'on' section (the events that trigger it) and one or more jobs. Each job runs on a fresh virtual machine called a runner (ubuntu-latest, windows-latest or macos-latest) and consists of steps. A step either runs a shell command with 'run' or uses a ready-made action with 'uses'. Actions are reusable building blocks published by GitHub and the community, such as actions/checkout to fetch your code.",
 "Jobs run in parallel by default; 'needs' makes one wait for another. A matrix runs the same job across several versions or operating systems. Secrets are stored in the repository settings and read in the workflow through the secrets context; they are masked in the logs."],
["File location: .github/workflows/NAME.yml",
 "on: push, pull_request, schedule (cron), workflow_dispatch (manual button).",
 "'uses' runs a published action; 'run' runs shell commands.",
 "Pin third-party actions to a version (or commit hash) for safety.",
 "Environments add protection rules such as required reviewers before a production deploy."],
"An open-source Python library tests every pull request on Python 3.11, 3.12 and 3.13 on Linux and Windows using a matrix: six jobs run in parallel and the contributor sees all results within minutes.",
`
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.12", "3.13"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
          cache: pip
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/\${{ github.repository }}:\${{ github.sha }}
`,
"GitHub Actions was announced in 2018 and gained full CI/CD features in November 2019, after Microsoft's acquisition of GitHub. It quickly overtook Travis CI as the default for open-source projects.",
[["GitHub Actions documentation", "https://docs.github.com/en/actions"],
 ["Workflow syntax reference", "https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax"],
 ["GitHub Marketplace: Actions", "https://github.com/marketplace?type=actions"]]),

X("GitLab CI, Jenkins and Azure Pipelines",
["Besides GitHub Actions you will meet three other major CI/CD tools at work. They express the same ideas with different words, so once you understand one, the others take a day to learn.",
 "GitLab CI/CD is built into GitLab. The pipeline is one file, .gitlab-ci.yml, at the root of the repository. You list stages, and each job names its stage, a Docker image to run in and a script. Jenkins is the oldest and most flexible: an open-source server you host yourself, extended with over a thousand plugins. Its pipeline is a Jenkinsfile written in a Groovy-based language. It is very common in large and older companies. Azure Pipelines is part of Azure DevOps, uses azure-pipelines.yml, and is strong in Microsoft and enterprise environments.",
 "The choice is usually made by where the code lives and what the company already runs. Hosted services (GitHub, GitLab.com, Azure DevOps) need no maintenance; Jenkins gives full control at the cost of running and patching it yourself."],
["GitLab: .gitlab-ci.yml, with stages, jobs and runners.",
 "Jenkins: Jenkinsfile, with pipeline, agent, stages and steps; self-hosted; plugin-based.",
 "Azure Pipelines: azure-pipelines.yml, with trigger, pool, stages, jobs and steps.",
 "All of them support secrets, caching, artifacts, manual approvals and self-hosted runners.",
 "Other names you may see: CircleCI, TeamCity, Bitbucket Pipelines, AWS CodePipeline, Google Cloud Build."],
"A bank cannot send source code to an outside service, so it runs Jenkins on its own servers inside its network. A startup with nothing to maintain uses GitLab.com's shared runners and has a pipeline working in an afternoon.",
`
# .gitlab-ci.yml
stages: [test, build]

test:
  stage: test
  image: python:3.13-slim
  script:
    - pip install -r requirements.txt
    - pytest

build:
  stage: build
  image: docker:27
  services: [docker:27-dind]
  script:
    - echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Jenkinsfile (declarative)
# pipeline {
#   agent any
#   stages {
#     stage('Test')  { steps { sh 'pytest' } }
#     stage('Build') { steps { sh 'docker build -t shop-api .' } }
#   }
# }
`,
"Jenkins began as Hudson, written by Kohsuke Kawaguchi at Sun Microsystems in 2005, and was renamed in 2011 after a dispute with Oracle. GitLab CI was added to GitLab in 2015. Azure Pipelines descends from Team Foundation Server and took its current name in 2018.",
[["GitLab CI/CD documentation", "https://docs.gitlab.com/ci/"],
 ["Jenkins documentation", "https://www.jenkins.io/doc/"],
 ["Azure Pipelines documentation", "https://learn.microsoft.com/en-us/azure/devops/pipelines/"]]),

X("Automated testing in the pipeline",
["A pipeline is only as trustworthy as the tests it runs. If the checks are weak, automation simply delivers bugs faster. The pipeline is where a team's quality rules are enforced automatically and identically for everyone.",
 "Tests are usually arranged as a pyramid. At the bottom are many fast unit tests that check single functions in isolation. Above them are fewer integration tests that check parts working together, for example the API with a real database. At the top are a small number of end-to-end tests that drive the whole system like a user. The higher you go the slower, more expensive and more fragile the tests are, so you want most of your confidence to come from the bottom.",
 "Beyond tests, pipelines run static checks that need no execution: a linter and formatter (ruff), a type checker (mypy or pyright), a dependency vulnerability scan (pip-audit), and secret scanning. A 'quality gate' blocks the merge if any required check fails."],
["Unit tests: fast, many, no network or database. Integration tests: real dependencies, fewer. End-to-end: few, slow.",
 "Run the fastest checks first so failures are reported early.",
 "Code coverage shows which lines tests execute; it is a guide, not proof of quality.",
 "Flaky tests (that pass and fail at random) destroy trust; fix or remove them quickly.",
 "Protect the main branch so nothing merges without a passing pipeline and a review."],
"A developer changes a tax calculation. A unit test written two years earlier by someone else fails in CI, showing the change breaks invoices for one state. The bug is caught in three minutes instead of by a customer.",
`
# test_pricing.py
import pytest
from pricing import total_with_tax

def test_adds_18_percent_tax():
    assert total_with_tax(100) == 118

def test_rejects_negative_amount():
    with pytest.raises(ValueError):
        total_with_tax(-5)

# commands the pipeline runs
# ruff check .                        lint
# ruff format --check .               formatting
# mypy src                            types
# pytest --cov=src --cov-fail-under=80
# pip-audit                           known vulnerabilities in dependencies
`,
"The test pyramid was described by Mike Cohn in 2009. Automated unit testing became mainstream with Kent Beck's JUnit (1997) and test-driven development. pytest, now Python's standard test tool, dates from 2004.",
[["pytest documentation", "https://docs.pytest.org/"],
 ["Martin Fowler: The Practical Test Pyramid", "https://martinfowler.com/articles/practical-test-pyramid.html"],
 ["Ruff linter", "https://docs.astral.sh/ruff/"]]),

X("Deployment strategies",
["How you replace the old version with the new one matters as much as building it. The naive way, stop the old version and start the new one, causes downtime and gives every user the new version at once, so a bug hits everybody. Several strategies reduce that risk.",
 "A rolling deployment replaces instances a few at a time, so some capacity is always serving. It is the default in Kubernetes. Blue-green deployment runs two complete environments: blue (current) and green (new). You deploy to green, test it, then switch all traffic at once; rolling back is switching back. A canary release sends a small share of real traffic, say 5%, to the new version, watches error rates and latency, and increases the share gradually if all is well.",
 "Feature flags separate deploying code from releasing a feature. The new code is deployed but switched off, then turned on for staff, then for 10% of users, and so on, with an instant off switch. Whatever the strategy, you need health checks, monitoring and a tested rollback, and database changes must be backward compatible so old and new code can run together."],
["Recreate: simple, has downtime. Rolling: no downtime, old and new run together for a while.",
 "Blue-green: instant switch and instant rollback, but needs double the infrastructure.",
 "Canary: lowest risk for big systems; needs good metrics to judge the canary.",
 "Feature flags: release to chosen users without a new deployment.",
 "Database changes: add first, switch code, remove later (expand and contract)."],
"A payment company releases a new checkout to 1% of users. The dashboard shows the error rate for that 1% is five times normal, so the release is automatically rolled back. 99% of customers never saw the problem.",
`
# Kubernetes rolling update settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  replicas: 6
  selector:
    matchLabels: { app: shop-api }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1      # at most one pod down at a time
      maxSurge: 2            # up to two extra pods during the rollout
  template:
    metadata:
      labels: { app: shop-api }
    spec:
      containers:
        - name: api
          image: ghcr.io/mycompany/shop-api:a1b2c3d
          readinessProbe:
            httpGet: { path: /health, port: 8000 }

# roll back:  kubectl rollout undo deployment/shop-api
`,
"Blue-green deployment was named by Daniel North and Jez Humble around 2005. 'Canary' comes from the canaries coal miners carried to detect gas. Large-scale feature flagging was publicised by Flickr in 2009 and Facebook's Gatekeeper system.",
[["Kubernetes: Deployments", "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"],
 ["Martin Fowler: Blue Green Deployment", "https://martinfowler.com/bliki/BlueGreenDeployment.html"],
 ["Martin Fowler: Canary Release", "https://martinfowler.com/bliki/CanaryRelease.html"]]),

X("Secrets and security in pipelines",
["A CI/CD system holds the keys to everything: it can push images, change cloud infrastructure and deploy to production. That makes it a prime target. An attacker who controls your pipeline controls your product, which is what happened in several large supply-chain attacks.",
 "Secrets (passwords, tokens, keys) must never be written in the pipeline file or the repository. They are stored in the CI system's encrypted secret store and injected as environment variables only into the jobs that need them. Better still is to avoid long-lived secrets altogether: with OpenID Connect (OIDC), the pipeline proves its identity to the cloud and receives a short-lived credential that expires in minutes.",
 "Apply least privilege everywhere: a job that runs tests needs no deploy rights. Be careful with code from outside contributors, because a pull request can change the pipeline file itself. Pin the versions of third-party actions and base images so that someone else's compromised update cannot silently enter your build."],
["Store secrets in the CI secret store or a vault; never commit them, never print them.",
 "Prefer OIDC short-lived credentials over stored cloud access keys.",
 "Give each job the minimum permissions; separate secrets per environment.",
 "Require approval before production jobs and before running pipelines from forks.",
 "Scan for leaked secrets and vulnerable dependencies on every change.",
 "If a secret leaks, rotate it immediately; deleting the commit is not enough."],
"A developer commits an AWS access key by mistake to a public repository. Automated bots find it in under five minutes and start cryptocurrency-mining servers on the company's account. With OIDC there would have been no long-lived key to leak.",
`
# GitHub Actions: deploy to AWS without storing any access key
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production          # can require a reviewer's approval
    permissions:
      id-token: write                # allow an OIDC token
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-shop-api
          aws-region: ap-south-1
      - run: aws ecs update-service --cluster prod --service shop-api --force-new-deployment
`,
"The SolarWinds attack (2020), where malicious code was inserted during the build, and the Codecov breach (2021) made pipeline security a board-level topic. The SLSA framework for supply-chain integrity was published by Google in 2021.",
[["GitHub Actions security hardening", "https://docs.github.com/en/actions/reference/security/secure-use"],
 ["OpenID Connect in GitHub Actions", "https://docs.github.com/en/actions/concepts/security/openid-connect"],
 ["SLSA supply-chain framework", "https://slsa.dev/"]]),

X("Infrastructure as Code and GitOps",
["CI/CD automates the application. Infrastructure as Code (IaC) applies the same idea to the things the application runs on: servers, networks, databases, load balancers. Instead of clicking in a cloud console, you describe the infrastructure in text files, keep them in Git, review changes, and let a tool create or update the real resources to match.",
 "Terraform (and its open-source fork OpenTofu) is the most widely used IaC tool and works across all clouds. You declare the desired state; 'terraform plan' shows exactly what would change and 'terraform apply' makes it so. Each cloud also has its own tool: AWS CloudFormation, Azure Bicep and Google Cloud Infrastructure Manager.",
 "GitOps takes this to its conclusion for deployment. The Git repository is the single source of truth for what should be running. A controller inside the cluster, such as Argo CD or Flux, continuously compares the live system with Git and corrects any difference. To deploy you merge a change; to roll back you revert a commit. Nobody runs deployment commands by hand."],
["Declarative: you describe the end state, not the steps to get there.",
 "Benefits: repeatable environments, change history, code review, quick disaster recovery.",
 "Always read 'terraform plan' before applying; keep the state file in a secure, shared, locked location.",
 "GitOps is pull-based: the cluster pulls its desired state from Git, so CI needs no cluster credentials.",
 "'Drift' is when reality differs from the code, usually from manual changes; GitOps tools detect and fix it."],
"A company needs an identical copy of production in another region for a new market. Because everything is in Terraform, they change one variable and run apply; the new region is ready in an hour instead of weeks of manual setup.",
`
# main.tf  (Terraform)
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "ap-south-1"
}

resource "aws_s3_bucket" "invoices" {
  bucket = "mycompany-invoices-prod"
  tags   = { team = "billing", env = "prod" }
}

# terraform init      download providers
# terraform plan      preview the changes
# terraform apply     make the changes
`,
"Infrastructure as Code grew from configuration tools such as CFEngine (1993), Puppet (2005) and Chef (2009). Terraform was released by HashiCorp in 2014. The term GitOps was coined by Alexis Richardson of Weaveworks in 2017.",
[["Terraform documentation", "https://developer.hashicorp.com/terraform/docs"],
 ["OpenGitOps principles", "https://opengitops.dev/"],
 ["Argo CD documentation", "https://argo-cd.readthedocs.io/"]])
]});

ROADMAP.push({
n: 13, track: "DevOps, data and design",
title: "Ansible",
blurb: "Configuring and managing many servers from one place using simple, readable YAML, with no agent to install on them.",
topics: [
X("What Ansible is and how it works",
["Ansible is an automation tool for configuring servers, installing software, deploying applications and running routine operations across many machines at once. Instead of logging in to 50 servers and typing the same commands on each, you describe what you want in a file and Ansible makes it so on all of them.",
 "Its defining feature is that it is agentless. Other tools require a special program installed and running on every managed machine. Ansible needs only what is already there: SSH access to Linux machines (and Python on them) or WinRM for Windows. You install Ansible on one machine, called the control node, and it connects out to the managed nodes, pushes small programs called modules, runs them, collects the results and removes them.",
 "Ansible is declarative and idempotent. You state the desired end state ('nginx is installed and running') rather than the commands to run. Idempotent means that running the same playbook once or ten times gives the same result: if nginx is already installed, Ansible reports 'ok' and changes nothing. This makes it safe to re-run at any time."],
["Control node: where Ansible is installed and run (Linux, macOS or WSL; not native Windows).",
 "Managed nodes: the servers being configured. No agent required.",
 "Inventory: the list of managed nodes. Playbook: the YAML file describing the desired state.",
 "Module: a unit of work, such as 'install a package' or 'copy a file'.",
 "Idempotent: safe to run again; only makes changes when something is not as described."],
"A security patch must be applied to 300 web servers tonight. With Ansible, one engineer runs one playbook that updates them 20 at a time, checks each is healthy before moving on, and finishes in 40 minutes with a report of every change.",
`
# install on the control node
pip install ansible
ansible --version

# test the connection to every host in the inventory
ansible all -i inventory.ini -m ping

# typical project layout
# project/
#   ansible.cfg
#   inventory.ini
#   site.yml            the main playbook
#   group_vars/         variables per group
#   roles/              reusable units
`,
"Ansible was created by Michael DeHaan and released in 2012. The name comes from the instant communication device in Ursula K. Le Guin's science-fiction novels. Red Hat acquired Ansible in 2015, and IBM acquired Red Hat in 2019.",
[["Ansible documentation", "https://docs.ansible.com/"],
 ["Getting started with Ansible", "https://docs.ansible.com/ansible/latest/getting_started/index.html"],
 ["Ansible on GitHub", "https://github.com/ansible/ansible"]]),

X("Inventory",
["The inventory tells Ansible which machines exist and how to reach them. In its simplest form it is a text file listing host names or IP addresses. Hosts are organised into groups, such as web servers and database servers, so that a playbook can target 'all web servers' with one word.",
 "Groups can contain other groups, and a host can belong to several. Two groups always exist: 'all' (every host) and 'ungrouped'. You can attach variables to a host or a group, for example the SSH user, a port number or an application setting. The recommended way is to put these in files under group_vars/ and host_vars/ rather than in the inventory itself.",
 "A static inventory file is fine for a fixed set of servers. In the cloud, where servers come and go, you use a dynamic inventory: a plugin that asks AWS, Azure or Google Cloud for the current list of machines and groups them by tags, region or type."],
["Formats: INI (simple) or YAML (structured). Both work the same way.",
 "Target patterns: 'all', a group name, 'web:&prod' (in both), 'web:!web3' (exclude).",
 "Connection variables: ansible_host, ansible_user, ansible_port, ansible_ssh_private_key_file.",
 "Keep separate inventories for staging and production to avoid accidents.",
 "'ansible-inventory --graph' shows the group tree Ansible sees."],
"A company has web and database servers in staging and production. With two inventory files, the same playbook is run against staging first with '-i staging' and, once verified, against production with '-i production'.",
`
# inventory.ini
[web]
web1.example.com
web2.example.com
web3.example.com ansible_port=2222

[db]
db1.example.com

[prod:children]
web
db

[all:vars]
ansible_user=deploy

# group_vars/web.yml
# http_port: 8080
# app_version: "1.4.0"

# ansible-inventory -i inventory.ini --graph
# ansible web -i inventory.ini -m ping
`,
"The INI inventory has been there since the first release in 2012. Dynamic inventory scripts followed quickly for cloud use and were replaced by inventory plugins in Ansible 2.4 (2017).",
[["Building an inventory", "https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html"],
 ["Dynamic inventory", "https://docs.ansible.com/ansible/latest/inventory_guide/intro_dynamic_inventory.html"],
 ["Host patterns", "https://docs.ansible.com/ansible/latest/inventory_guide/intro_patterns.html"]]),

X("Ad-hoc commands and modules",
["An ad-hoc command runs a single task on a group of hosts straight from the command line, without writing a playbook. It is ideal for quick one-off jobs: check disk space everywhere, restart a service, copy a file. The form is: ansible GROUP -m MODULE -a 'ARGUMENTS'.",
 "Modules are the tools in Ansible's toolbox. Each does one kind of job and knows how to do it idempotently. There are thousands, covering packages, files, services, users, databases, cloud resources and network devices. You should prefer a specific module over running raw shell commands, because the module checks the current state and only acts if needed, and reports accurately whether anything changed.",
 "Modules are distributed in collections. The core ones are in ansible.builtin; others live in collections such as community.general, amazon.aws and azure.azcollection, installed with ansible-galaxy. The '--become' flag runs the task with elevated rights (sudo), which is needed for most system changes."],
["Common modules: package/apt/dnf, service/systemd, copy, template, file, user, lineinfile, git, command, shell.",
 "'command' runs a program directly; 'shell' runs it through a shell (needed for pipes). Use them only when no module fits.",
 "-b or --become: use sudo. -f 20: run on 20 hosts in parallel. --check: dry run.",
 "'ansible-doc MODULE' shows a module's options and examples offline.",
 "Output colours: green ok (no change), yellow changed, red failed."],
"A disk-full alert fires on one server. The engineer runs one ad-hoc command to see free disk space on all 80 servers and spots four more that are about to fill, before they cause an outage.",
`
# is everything reachable?
ansible all -m ping

# free disk space on every web server
ansible web -m command -a "df -h /"

# install and start nginx (needs sudo)
ansible web -b -m apt -a "name=nginx state=present update_cache=yes"
ansible web -b -m service -a "name=nginx state=started enabled=yes"

# copy a file
ansible web -b -m copy -a "src=./motd dest=/etc/motd mode=0644"

# gather facts about one host
ansible web1.example.com -m setup

# read a module's documentation
ansible-doc ansible.builtin.copy
`,
"Ansible originally shipped every module in one package ('batteries included'). From version 2.10 (2020) modules were split into separately versioned collections, with a small ansible-core.",
[["Introduction to ad hoc commands", "https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html"],
 ["Collection and module index", "https://docs.ansible.com/ansible/latest/collections/index.html"],
 ["ansible.builtin modules", "https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html"]]),

X("Playbooks",
["A playbook is a YAML file that describes, in order, what should be true on which hosts. It is the heart of Ansible: the repeatable, reviewable, version-controlled record of how your servers are set up. Where an ad-hoc command is a single instruction, a playbook is the whole recipe.",
 "A playbook contains one or more plays. Each play maps a group of hosts to a list of tasks. Each task has a human-readable name and calls one module with arguments. Tasks run from top to bottom, and each task runs on all the targeted hosts before the next task starts. If a task fails on a host, that host is dropped from the rest of the play while the others continue.",
 "YAML is sensitive to indentation: use two spaces, never tabs. Before running against real servers, use '--check' for a dry run that shows what would change, and '--diff' to see the exact differences in files."],
["Structure: playbook -> plays -> tasks -> module.",
 "'hosts' selects targets; 'become: true' uses sudo; 'vars' defines variables.",
 "Give every task a clear 'name'; it becomes the run log.",
 "ansible-playbook site.yml --check --diff   (preview)   --limit web1   (only one host)   --tags deploy   (only tagged tasks).",
 "'serial: 5' updates 5 hosts at a time for a rolling update."],
"The setup of a web server, once a 12-page document that people followed by hand with frequent mistakes, becomes a 60-line playbook. A new server is ready in 4 minutes and is identical to all the others.",
`
# site.yml
- name: Configure web servers
  hosts: web
  become: true
  vars:
    app_port: 8000

  tasks:
    - name: Install required packages
      ansible.builtin.apt:
        name: [nginx, python3-venv, git]
        state: present
        update_cache: true

    - name: Create the application user
      ansible.builtin.user:
        name: shop
        shell: /bin/bash

    - name: Get the application code
      ansible.builtin.git:
        repo: https://github.com/mycompany/shop-api.git
        dest: /opt/shop-api
        version: v1.4.0

    - name: Make sure nginx is running and starts at boot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

# run:  ansible-playbook -i inventory.ini site.yml
`,
"Playbooks have used YAML since Ansible's first release in 2012; the choice of a plain data format instead of a programming language (as Puppet and Chef used) was deliberate, to keep automation readable by anyone.",
[["Ansible playbooks", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html"],
 ["Playbook guide", "https://docs.ansible.com/ansible/latest/playbook_guide/index.html"],
 ["YAML syntax", "https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html"]]),

X("Variables, facts, conditions and loops",
["Real environments differ: a different port in staging, a different package name on Ubuntu and Red Hat, more workers on bigger machines. Variables let one playbook handle all of them. A variable is referenced inside double curly braces, which is Jinja2 template syntax.",
 "Variables can be defined in many places: in the playbook, in group_vars and host_vars files, in the inventory, or on the command line with -e. When the same variable is defined in several places, a precedence order decides which wins; the practical rule is that more specific beats more general, and command-line -e beats everything. Facts are variables Ansible discovers automatically about each host at the start of a play: operating system, IP addresses, memory, CPU count and more.",
 "Three keywords give tasks logic. 'when' runs a task only if a condition is true. 'loop' repeats a task for each item in a list. 'register' saves the result of a task in a variable so later tasks can use it."],
["Reference a variable as {{ name }}; quote the whole value if it starts with a brace.",
 "Facts live under ansible_facts, for example ansible_facts['os_family'] or ansible_facts['memtotal_mb'].",
 "'when' conditions are written without the curly braces.",
 "Typical precedence, low to high: role defaults < group_vars < host_vars < play vars < extra vars (-e).",
 "The 'debug' module prints a variable, which is the quickest way to see what Ansible thinks its value is."],
"One playbook manages both Ubuntu and Red Hat servers. A 'when' on the OS family fact picks apt or dnf, and group variables give production 8 workers and staging 2, with no copy-pasted playbooks.",
`
- name: Variables, facts, conditions and loops
  hosts: web
  become: true
  vars:
    packages: [git, curl, htop]
    workers: "{{ ansible_facts['processor_vcpus'] * 2 }}"

  tasks:
    - name: Install packages on Debian family
      ansible.builtin.apt:
        name: "{{ packages }}"
        state: present
      when: ansible_facts['os_family'] == "Debian"

    - name: Create several users
      ansible.builtin.user:
        name: "{{ item }}"
        state: present
      loop: [anu, bala, chitra]

    - name: Check whether the app is installed
      ansible.builtin.stat:
        path: /opt/shop-api
      register: app_dir

    - name: Show a message if it is missing
      ansible.builtin.debug:
        msg: "App not installed on {{ inventory_hostname }}; workers would be {{ workers }}"
      when: not app_dir.stat.exists
`,
"Ansible adopted the Jinja2 template engine (created by Armin Ronacher in 2008, also used by Flask) from the beginning. 'loop' replaced the older family of 'with_items' keywords in Ansible 2.5 (2018).",
[["Using variables", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html"],
 ["Conditionals", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html"],
 ["Loops", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html"]]),

X("Templates and handlers",
["Configuration files are rarely identical on every server: they contain the host's name, its IP address, a port, a list of other servers. The template module solves this. You write the file once as a Jinja2 template with variables, conditions and loops inside it, and Ansible renders a finished, host-specific file on each server.",
 "Changing a configuration file usually means the service must be restarted or reloaded, but only if the file really changed. Restarting on every run would cause needless interruptions. Handlers exist for exactly this. A handler is a task that runs only when another task 'notifies' it, and only if that task reported a change.",
 "Handlers run once at the end of the play, however many tasks notified them. So if five configuration tasks all change something and all notify 'Restart nginx', nginx restarts once, at the end."],
["Template files conventionally end in .j2 and live in a templates/ folder.",
 "Inside templates: {{ variable }}, {% if %}...{% endif %}, {% for %}...{% endfor %}.",
 "A task triggers a handler with 'notify: Handler name'; the name must match exactly.",
 "Handlers run only on change, once, at the end of the play.",
 "'validate' tests a whole config file before it replaces the old one (for example sshd -t -f %s); for nginx fragments run 'nginx -t' as its own task."],
"An nginx configuration is deployed to 30 servers with each server's own name and the correct list of backend addresses. nginx is reloaded only on the 3 servers whose rendered file actually differed.",
`
# templates/app.conf.j2
server {
    listen {{ http_port }};
    server_name {{ inventory_hostname }};
{% for backend in backends %}
    # backend {{ backend }}
{% endfor %}
    location / {
        proxy_pass http://127.0.0.1:{{ app_port }};
    }
}

# playbook
- name: Configure nginx
  hosts: web
  become: true
  vars:
    http_port: 80
    app_port: 8000
    backends: [10.0.0.11, 10.0.0.12]
  tasks:
    - name: Deploy the site configuration
      ansible.builtin.template:
        src: templates/app.conf.j2
        dest: /etc/nginx/conf.d/app.conf
        mode: "0644"
      notify: Reload nginx

    - name: Check the whole nginx configuration
      ansible.builtin.command: nginx -t
      changed_when: false

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
`,
"Handlers were part of Ansible's original 2012 design, borrowing the notify idea from Puppet. Templating with Jinja2 has likewise been there since the first version.",
[["Templating (Jinja2)", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html"],
 ["Handlers", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html"],
 ["Jinja2 template designer documentation", "https://jinja.palletsprojects.com/en/stable/templates/"]]),

X("Roles and Ansible Galaxy",
["As playbooks grow, one long file becomes hard to read and impossible to reuse. A role is Ansible's unit of reuse: a folder with a standard structure that bundles everything needed for one job, such as 'install and configure PostgreSQL': its tasks, handlers, templates, files and default variables.",
 "Because the structure is standard, Ansible finds everything automatically. tasks/main.yml holds the tasks, handlers/main.yml the handlers, templates/ the Jinja2 files, defaults/main.yml the variables that users are expected to override, and meta/main.yml the role's dependencies. A playbook then becomes a short, readable list: these hosts get these roles.",
 "Ansible Galaxy is the public hub where the community shares roles and collections. Before writing a role for a common piece of software, check whether a well-maintained one already exists. The ansible-galaxy command installs them and can also create the empty skeleton of a new role."],
["'ansible-galaxy role init NAME' creates the standard folder structure.",
 "defaults/ = low-priority variables meant to be overridden; vars/ = high-priority internal ones.",
 "List dependencies in a requirements.yml file and install with 'ansible-galaxy install -r requirements.yml'.",
 "Pin versions of external roles and collections so runs are repeatable.",
 "Keep roles small and focused on one thing."],
"A platform team writes one 'baseline' role (users, SSH hardening, monitoring agent, time sync). Every team's playbook includes it, so all 500 servers in the company meet the same security standard, and a fix to the role reaches all of them.",
`
# create a role skeleton
# ansible-galaxy role init roles/webserver

# roles/webserver/
#   defaults/main.yml      http_port: 80
#   tasks/main.yml         the tasks
#   handlers/main.yml      Reload nginx
#   templates/app.conf.j2
#   meta/main.yml          dependencies

# site.yml becomes short and readable
- name: Web tier
  hosts: web
  become: true
  roles:
    - baseline
    - role: webserver
      vars:
        http_port: 8080

- name: Database tier
  hosts: db
  become: true
  roles:
    - baseline
    - postgresql

# requirements.yml
# collections:
#   - name: community.postgresql
#     version: "3.4.0"
`,
"Roles were introduced in Ansible 1.2 (2013) and Ansible Galaxy launched the same year. Collections, which package roles together with modules and plugins, arrived in 2019-2020.",
[["Roles", "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html"],
 ["Ansible Galaxy", "https://galaxy.ansible.com/"],
 ["Galaxy user guide", "https://docs.ansible.com/ansible/latest/galaxy/user_guide.html"]]),

X("Ansible Vault: protecting secrets",
["Playbooks need secrets: database passwords, API keys, certificates. Playbooks also belong in Git. Putting plain-text secrets in Git is one of the most common security failures. Ansible Vault solves this by encrypting the sensitive data so that the encrypted form can be safely committed.",
 "Vault can encrypt a whole file (typically a variables file) or a single value inside an otherwise readable file. Encryption uses AES-256 with a password you choose. When you run a playbook you supply the password, either by typing it (--ask-vault-pass) or from a protected file or script (--vault-password-file), and Ansible decrypts the values in memory only.",
 "A common pattern keeps things readable: a normal file defines 'db_password: \"{{ vault_db_password }}\"', and an encrypted file next to it defines vault_db_password. Anyone can see which variables exist without seeing the secret values."],
["ansible-vault create / edit / view / encrypt / decrypt / rekey FILE.",
 "'ansible-vault encrypt_string' encrypts one value to paste into a YAML file.",
 "Never commit the vault password itself; in CI, supply it from the pipeline's secret store.",
 "Add 'no_log: true' to tasks that handle secrets so they are not printed in the output.",
 "For large organisations, Ansible can also read secrets from HashiCorp Vault or cloud secret managers through lookup plugins."],
"A team's playbooks, including the production database password, live in a shared Git repository. The password is vault-encrypted, so developers can read and review all the automation while only the deployment pipeline and two administrators can decrypt the secret.",
`
# create an encrypted variables file
ansible-vault create group_vars/prod/vault.yml
#   vault_db_password: "S3cure-Pa55"

ansible-vault view group_vars/prod/vault.yml
ansible-vault edit group_vars/prod/vault.yml

# encrypt a single value
ansible-vault encrypt_string "S3cure-Pa55" --name vault_db_password

# group_vars/prod/vars.yml  (readable)
#   db_password: "{{ vault_db_password }}"

# run the playbook
ansible-playbook site.yml --ask-vault-pass
ansible-playbook site.yml --vault-password-file ~/.vault_pass

# in a task that uses the secret
#   - name: Create the database user
#     community.postgresql.postgresql_user:
#       name: shop
#       password: "{{ db_password }}"
#     no_log: true
`,
"Ansible Vault was added in Ansible 1.5 (2014). Support for several vault passwords at once (vault IDs), useful for separate staging and production secrets, came in 2.4 (2017).",
[["Ansible Vault guide", "https://docs.ansible.com/ansible/latest/vault_guide/index.html"],
 ["Encrypting content with Ansible Vault", "https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html"]]),

X("Good practice and where Ansible fits",
["Ansible is easy to start with and easy to make a mess of. A few habits keep automation reliable. Always name tasks. Prefer modules to shell commands, because modules are idempotent. Use fully qualified module names such as ansible.builtin.copy. Keep secrets in Vault. Test changes with --check and --diff, run against staging before production, and lint with ansible-lint.",
 "It also helps to know what Ansible is for. Terraform is best at creating infrastructure: networks, virtual machines, databases. Ansible is best at configuring what is inside those machines: packages, files, services, application deployment. Many teams use both: Terraform creates the servers, then Ansible configures them. Docker and Kubernetes reduce the need for server configuration, but someone still has to set up the hosts, and Ansible is widely used for that and for network devices.",
 "For teams, Red Hat's Ansible Automation Platform and its open-source upstream AWX add a web interface, scheduling, role-based access, credential storage and an audit log on top of the same playbooks."],
["Idempotency is the goal: a second run should report zero changes.",
 "Use 'changed_when' and 'creates' to make unavoidable shell commands idempotent.",
 "Use 'serial' and health checks for rolling updates so a bad change stops early.",
 "Keep everything in Git; run playbooks from CI rather than from laptops.",
 "Run ansible-lint in the pipeline to catch mistakes and bad habits."],
"A company's standard flow: Terraform creates ten virtual machines in the cloud and outputs their addresses; a dynamic inventory picks them up; an Ansible playbook installs Docker, hardens SSH and joins them to the cluster. Rebuilding the whole environment is one pipeline run.",
`
# rolling update: 2 servers at a time, stop if any fails
- name: Deploy the new version
  hosts: web
  become: true
  serial: 2
  max_fail_percentage: 0

  tasks:
    - name: Pull and restart the application container
      community.docker.docker_container:
        name: shop-api
        image: "ghcr.io/mycompany/shop-api:{{ app_version }}"
        state: started
        restart_policy: unless-stopped
        published_ports: ["8000:8000"]

    - name: Wait until the app answers
      ansible.builtin.uri:
        url: http://localhost:8000/health
        status_code: 200
      register: health
      retries: 10
      delay: 3
      until: health.status == 200

# ansible-lint site.yml
# ansible-playbook site.yml -e app_version=1.4.1 --check --diff
`,
"Configuration management began with CFEngine (1993), followed by Puppet (2005) and Chef (2009), all agent-based. Ansible (2012) won many users with its agentless model and plain YAML. AWX, the open-source version of Ansible Tower, was released in 2017.",
[["Ansible tips and tricks", "https://docs.ansible.com/ansible/latest/tips_tricks/index.html"],
 ["ansible-lint", "https://ansible.readthedocs.io/projects/lint/"],
 ["AWX project", "https://github.com/ansible/awx"]])
]});
