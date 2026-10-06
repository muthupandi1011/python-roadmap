EXTRA(11, "What Docker is and why containers exist", {
  deep: [
    "The 'docker' command does not start containers itself. It sends a request over a Unix socket (/var/run/docker.sock) to the daemon, dockerd. The daemon passes the work to containerd, which manages images and container life cycles. containerd then calls a small program named runc, which asks the Linux kernel to create the container and then exits. A tiny 'shim' process stays behind for each container, so containers keep running even if dockerd is restarted.",
    "A container is a normal Linux process with two kinds of limits. Namespaces limit what it can see: the pid namespace gives it its own process numbers, the net namespace its own network interfaces and ports, the mnt namespace its own filesystem view, the uts namespace its own host name, the ipc namespace its own shared memory, and the user namespace its own user IDs. Cgroups limit what it can use: CPU time, memory, number of processes and disk I/O. If the process goes over its memory limit, the kernel kills it.",
    "The trade-off is the shared kernel. A kernel bug can let a process escape from a container, so the isolation is weaker than a virtual machine. You also cannot load a different kernel or run a Windows program in a Linux container. Do not use plain containers to run untrusted code from strangers; use virtual machines or a sandboxed runtime such as gVisor, Kata Containers or Firecracker for that. Containers also add little value for a single static binary on one server."
  ],
  iq: [
    { q: "What is the real difference between a container and a virtual machine?", a: "A virtual machine runs its own kernel on virtual hardware created by a hypervisor. A container is only a process on the host kernel, hidden behind namespaces and limited by cgroups. This is why a container starts in under a second and uses little memory, but it is also why its isolation is weaker.", c: `
# the container reports the kernel of the host, not its own
uname -r
docker run --rm alpine uname -r
` },
    { q: "What happens step by step when you type 'docker run nginx'?", a: "The client sends the request to dockerd over the socket. dockerd pulls the image if it is not on disk, then asks containerd to create the container. containerd calls runc, which creates the namespaces and cgroups, mounts the image layers as the root filesystem and starts the nginx process as PID 1. Docker also creates a virtual network interface and connects it to the bridge network." },
    { q: "Do you need Docker to run containers? What does Kubernetes use?", a: "No. Docker is one tool that builds and runs OCI images. Kubernetes removed its Docker integration (dockershim) in version 1.24 and talks directly to containerd or CRI-O. Images built with Docker still run there, because the image format is an open standard." },
    { q: "How can a Linux container run on a Windows or macOS laptop?", a: "It cannot run directly, because a Linux container needs a Linux kernel. Docker Desktop starts a small Linux virtual machine (WSL 2 on Windows) and runs the daemon inside it. This is the reason file sharing between the laptop and the container is slower than on a real Linux host.", c: `
docker version          # shows the client and the server (the VM) separately
docker info             # shows the kernel version and operating system of the server
docker context ls       # shows which daemon the client is talking to
` }
  ],
  tips: [
    "Run 'docker info' first when something is strange. It shows the storage driver, cgroup version, number of containers and where Docker keeps its data.",
    "A container is a host process, so you can see it from the host: 'docker top web' or 'docker inspect -f {{.State.Pid}} web' gives the real PID on a Linux host.",
    "On Windows with WSL 2, keep your project files inside the Linux filesystem, not under /mnt/c. Bind mounts from the Windows drive are many times slower.",
    "Run 'docker system df' to see how much disk images, containers, volumes and build cache use. A full disk on the Docker host is one of the most common production incidents."
  ]
});

EXTRA(11, "Images and layers", {
  deep: [
    "On Linux, Docker normally uses the overlay2 storage driver. Each image layer is a folder on disk. OverlayFS stacks the read-only folders (the 'lower' directories) and one writable folder (the 'upper' directory) and shows them as one merged filesystem. When a container changes a file that comes from an image layer, the kernel first copies the whole file up into the writable layer. This is called copy-on-write. Changing one byte in a 1 GB file therefore copies 1 GB.",
    "Deleting a file works in a similar way. The lower layers are read-only, so the file cannot really be removed. Instead the upper layer gets a special 'whiteout' entry that hides the file. The bytes are still inside the old layer and are still downloaded. This is why 'RUN rm' in a later instruction does not make an image smaller, and why a secret that was copied in one layer can always be taken out again.",
    "The build cache works with a key for each step. For a RUN instruction, the key is the text of the command plus the parent layer; Docker does not look at what the command would download. For COPY and ADD, the key includes a checksum of the content and metadata of the copied files, not their modification time. When one step misses the cache, every step after it is rebuilt. An image itself is a JSON manifest that lists layer digests (sha256 of the content), so two images that share layers store and transfer them only once."
  ],
  iq: [
    { q: "Why does deleting a file in a later layer not shrink the image?", a: "Layers are read-only and are only added, never changed. The delete only adds a whiteout marker in the new layer; the file still exists in the earlier layer. To really save space, create and delete the file inside the same RUN instruction, or use a multi-stage build.", c: `
# BAD: 3 layers, the archive stays in the image forever
COPY data.tar.gz /tmp/
RUN tar -xzf /tmp/data.tar.gz -C /opt
RUN rm /tmp/data.tar.gz

# GOOD: download, unpack and delete in one layer
RUN curl -fsSL https://example.com/data.tar.gz -o /tmp/data.tar.gz && tar -xzf /tmp/data.tar.gz -C /opt && rm /tmp/data.tar.gz
` },
    { q: "My image is 2 GB. How do you find out why and fix it?", a: "Run 'docker history IMAGE' to see the size of each layer. The usual causes are a full base image instead of slim, build tools left in the final image, package caches (pip, apt) and a 'COPY . .' that brings in .git, virtual environments or data files. The fixes are a slim base, a .dockerignore file, cleaning caches in the same RUN, and a multi-stage build.", c: `
docker history --no-trunc shop-api:1.0
docker image ls shop-api
` },
    { q: "What is the difference between a tag and a digest?", a: "A tag is a name that someone can move to a different image at any time, so python:3.13-slim today may not be the same image next month. A digest is the sha256 hash of the image manifest, so it always means exactly the same content. Use a digest when you need a build that can be repeated exactly." },
    { q: "I changed only one line of code. Why did Docker reinstall all my dependencies?", a: "Because the COPY of the whole source came before the install step. The checksum of the copied files changed, so that step missed the cache, and all later steps are rebuilt too. Copy only requirements.txt first, run the install, and copy the rest of the code after it." }
  ],
  tips: [
    "Pin the base image by digest for repeatable builds: 'FROM python:3.13-slim@sha256:...'. Let a tool such as Dependabot or Renovate update the digest in a pull request.",
    "'docker image prune' removes only dangling images (images with no tag). Use 'docker image prune -a --filter until=168h' to remove all unused images older than a week.",
    "The open-source tool 'dive' shows the files added by each layer. It is the fastest way to find the one big folder you did not mean to ship.",
    "Do not write large or frequently changed files to the container's writable layer. Copy-on-write makes it slow; use a volume for databases, uploads and logs."
  ]
});

EXTRA(11, "Writing a Dockerfile", {
  deep: [
    "CMD and ENTRYPOINT each have two forms, and the form changes which process becomes PID 1. The exec form (a JSON list) starts your program directly. The shell form (a plain string) starts '/bin/sh -c' and your program becomes a child of that shell. The shell usually does not pass signals on, so 'docker stop' sends SIGTERM to the shell, the app never hears it, and Docker kills it after 10 seconds. When both are set, ENTRYPOINT is the program and CMD is its default argument list; arguments after the image name in 'docker run' replace CMD only.",
    "A build starts by sending the 'build context' (the folder you give to docker build) to the builder. Only files in the context can be copied. BuildKit, the modern builder, reads the whole Dockerfile first and makes a graph of steps. It runs independent stages in parallel and skips stages that the final image does not need. It also adds mounts that exist only during one RUN step: a cache mount keeps a folder such as the pip cache between builds, and a secret mount shows a secret file to one command without saving it in any layer.",
    "ARG and ENV are easy to mix up. ARG exists only during the build and is set with --build-arg. ENV is saved in the image and is visible in every container. Both are stored in the image metadata or history, so neither is safe for passwords. Also remember that every instruction is permanent: a Dockerfile is not a good place for steps that must differ between environments. Build one image and give it configuration at run time."
  ],
  iq: [
    { q: "What is the difference between CMD and ENTRYPOINT?", a: "ENTRYPOINT sets the program that always runs. CMD sets default arguments, or the default command when there is no ENTRYPOINT. Arguments given to 'docker run' replace CMD but are added after ENTRYPOINT. Use ENTRYPOINT when the image should behave like one fixed tool, and CMD when users may want to run something else.", c: `
ENTRYPOINT ["python", "manage.py"]
CMD ["runserver", "0.0.0.0:8000"]

# docker run app                -> python manage.py runserver 0.0.0.0:8000
# docker run app migrate        -> python manage.py migrate
# docker run --entrypoint sh -it app   -> replaces the entrypoint
` },
    { q: "What is the difference between COPY and ADD?", a: "COPY only copies files from the build context or from another stage. ADD does the same but can also download a URL and automatically unpacks a local tar archive. This extra behaviour can surprise you, so the official advice is to use COPY unless you need the tar unpacking." },
    { q: "Why is 'RUN apt-get update' on its own line a bug?", a: "The cache key of a RUN step is only the command text. 'RUN apt-get update' never changes, so Docker reuses an old cached package list for months. A later 'RUN apt-get install' then tries to download package versions that no longer exist and fails. Always put update and install in the same RUN.", c: `
RUN apt-get update && apt-get install -y --no-install-recommends curl libpq5 && rm -rf /var/lib/apt/lists/*
` },
    { q: "What is the difference between ARG and ENV, and can I use ARG for a password?", a: "ARG is a build-time variable and is gone when the container runs. ENV is stored in the image and is present at run time. Do not use either for a password: ARG values can appear in 'docker history' and ENV values in 'docker inspect'. Use a BuildKit secret mount for build-time secrets and run-time injection for the rest." }
  ],
  tips: [
    "Use a secret mount for private package tokens: 'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci' and build with 'docker build --secret id=npmrc,src=$HOME/.npmrc .'. The file never enters a layer.",
    "Speed up dependency installs with a cache mount: 'RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt'. The pip cache stays on the build machine but not in the image.",
    "Use 'COPY --chown=appuser:appuser . .' instead of COPY followed by 'RUN chown -R'. The chown RUN copies every file into a new layer and doubles the size.",
    "When a build step fails without a clear message, run 'docker build --progress=plain --no-cache .' to see the full output of every command."
  ]
});

EXTRA(11, "Running and managing containers", {
  deep: [
    "The main process of a container is PID 1 inside its pid namespace, and Linux treats PID 1 in a special way. For a normal process, SIGTERM stops it even when the program has no code for it. For PID 1, the kernel delivers a signal only if the program has installed a handler. So an app that does not handle SIGTERM ignores 'docker stop', and after the 10-second wait Docker sends SIGKILL, which cannot be ignored. PID 1 should also collect ('reap') finished child processes; if it does not, they stay as zombies.",
    "The exit code tells you how a container ended. 0 means success. 1 or another small number is an error from the application. 125 means Docker itself failed to start the container, 126 means the command could not be executed, and 127 means the command was not found. Codes above 128 mean a signal: 137 is 128 + 9 (SIGKILL, often the out-of-memory killer) and 143 is 128 + 15 (SIGTERM).",
    "Restart policies are handled by the daemon, not by the container. 'on-failure' restarts only on a non-zero exit code, 'always' restarts in every case, and 'unless-stopped' is like always but remembers a manual stop after a reboot. Docker waits longer between attempts each time, so a crashing container does not use all the CPU. A restart policy is not a health system: it reacts only when the process exits, not when the app is stuck."
  ],
  iq: [
    { q: "My container exits immediately after 'docker run -d'. Why?", a: "A container lives only as long as its main process. Common causes: the command finished (a script, not a server), the app crashed at start because of a missing variable or file, or the main program started itself in the background as a daemon so PID 1 ended. Check the exit code and the logs, and run servers in the foreground.", c: `
docker ps -a --filter name=api
docker logs api
docker inspect -f '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}' api

# start a shell instead of the app to look around
docker run --rm -it --entrypoint sh shop-api:1.0
` },
    { q: "What is the difference between 'docker stop' and 'docker kill'?", a: "'docker stop' sends SIGTERM, waits for the grace period (10 seconds by default) and then sends SIGKILL. This gives the app time to finish requests and close connections. 'docker kill' sends SIGKILL at once (or another signal with --signal), so the app gets no chance to clean up and data in memory can be lost." },
    { q: "A container shows exit code 137. What does it mean?", a: "137 is 128 + 9, so the process was killed with SIGKILL. The two usual reasons are the kernel out-of-memory killer, because the container went over its --memory limit, or a 'docker stop' where the app did not exit within the grace period. 'docker inspect' shows OOMKilled true in the first case.", c: `
docker inspect -f '{{.State.OOMKilled}}' api
docker stats --no-stream api
` },
    { q: "What is the difference between 'docker run', 'docker start' and 'docker exec'?", a: "'docker run' creates a new container from an image and starts it. 'docker start' starts an existing stopped container again with its old settings and its old writable layer. 'docker exec' runs an extra process inside a container that is already running; it does not restart anything, and that extra process ends when the container stops." }
  ],
  tips: [
    "The default json-file log driver has no size limit and can fill the disk. Set 'log-opts' with 'max-size' and 'max-file' in /etc/docker/daemon.json, or pass '--log-opt max-size=10m --log-opt max-file=3' to docker run.",
    "If your app cannot handle signals or leaves zombie processes, start the container with '--init'. Docker then runs a tiny init program as PID 1 that forwards signals and reaps children.",
    "If the app needs more than 10 seconds to shut down cleanly, use 'docker stop -t 30 api' or set '--stop-timeout 30' on docker run. Otherwise long requests are cut off on every deploy.",
    "Use 'docker events' in a second terminal while you debug a restart loop. It shows each die, oom, kill and start event with a timestamp."
  ]
});

EXTRA(11, "Volumes and persistent data", {
  deep: [
    "A named volume is a normal folder on the host, by default /var/lib/docker/volumes/NAME/_data. Docker mounts it into the container's mount namespace on top of the image filesystem. Reads and writes to a volume do not go through the overlay filesystem, so there is no copy-on-write cost. This is the main technical reason why databases must use volumes: they are faster and they live outside the container.",
    "There is one behaviour that surprises people. When you mount an empty named volume on a path where the image already has files, Docker copies those files into the volume the first time. A bind mount never does this: it simply hides whatever the image had at that path. So a bind mount of an empty host folder over /app makes your application code disappear inside the container.",
    "Permissions are checked by numeric user ID, not by name. If the container process runs as UID 1000 and the host folder belongs to UID 0, writes fail, even when the names look right. On Docker Desktop, bind mounts must cross from the laptop into the Linux virtual machine, which is slow for folders with many small files. Volumes are also local to one host. They are not a backup, and a container on another server cannot see them, so on a cluster you need network storage or a managed database."
  ],
  iq: [
    { q: "What is the difference between a named volume, a bind mount and a tmpfs mount?", a: "A named volume is storage that Docker creates and manages; it is portable and best for application data. A bind mount is an exact host path, so it depends on the folder layout of that host; it is best for source code in development and for config files. A tmpfs mount lives in memory only and is gone when the container stops, which is good for secrets and temporary files." },
    { q: "My app gets 'permission denied' when writing to a bind-mounted folder. Why?", a: "The kernel compares the numeric UID of the process in the container with the owner of the host folder. A non-root user in the image usually has a different UID from the owner of the folder on the host. Fix it by making the UIDs match, either by running the container with your UID or by changing the owner of the host folder.", c: `
# run the container process with the UID and GID of the current host user
docker run --rm --user $(id -u):$(id -g) -v ./out:/app/out shop-api:dev

# check which user the process really runs as
docker exec api id
` },
    { q: "We ran 'docker compose down -v' and the database is empty. What happened?", a: "The -v flag removes the named volumes declared in the Compose file together with the containers. The data lived only in that volume, so it is gone. Without -v, 'down' keeps volumes. This is why a real database also needs backups outside the Docker host." },
    { q: "How do you back up a database that runs in a container?", a: "Do not copy the files of a running database from the volume, because the copy can be in an inconsistent state. Use the database's own dump tool through 'docker exec', or stop the database first and then archive the volume. Store the result on another machine and test the restore.", c: `
docker exec db pg_dump -U postgres shop > shop_backup.sql

# restore into a fresh database
docker exec -i db psql -U postgres shop < shop_backup.sql
` }
  ],
  tips: [
    "With '-v /host/path:/data', Docker silently creates the host folder as root if it does not exist. '--mount type=bind,source=/host/path,target=/data' gives an error instead, which catches typing mistakes.",
    "Look inside any volume with a throwaway container: 'docker run --rm -v pgdata:/data alpine ls -la /data'.",
    "In Node or Python development, a bind mount of the whole project hides the dependencies installed in the image. Add a second, anonymous volume for that folder, for example '-v /app/node_modules', so the image's copy stays visible.",
    "A minor PostgreSQL upgrade (16.3 to 16.4) can reuse the same volume, but a major upgrade (16 to 17) cannot. The new server refuses to start on the old data folder; you must dump and restore or run pg_upgrade."
  ]
});

EXTRA(11, "Docker networking", {
  deep: [
    "On a bridge network, Docker creates a pair of virtual network interfaces (a 'veth pair') for each container. One end is placed in the container's network namespace and named eth0. The other end stays on the host and is plugged into a virtual switch, the bridge (docker0 for the default network). Containers on the same bridge talk to each other directly through it. Each user-defined network gets its own bridge and its own subnet, and Docker blocks traffic between different bridges.",
    "Traffic to and from the outside world uses NAT rules that Docker writes into iptables. For outgoing traffic, a MASQUERADE rule replaces the container's private address with the host's address. For a published port, a DNAT rule rewrites the destination from host-port to container-IP:container-port. These rules sit in front of the normal host firewall rules. So a published port is open to the world even when a tool such as ufw says the port is blocked.",
    "Name lookup on user-defined networks is done by a DNS server built into the daemon. Inside each container it listens on 127.0.0.11. It answers for container names, Compose service names and network aliases, and forwards all other names to the DNS servers of the host. The default bridge network does not have this, for historical reasons. Host networking removes the network namespace completely: it is the fastest, but there is no port isolation and port conflicts come back, so use it only when you really need it."
  ],
  iq: [
    { q: "My app in a container cannot connect to the database on 'localhost'. Why?", a: "Inside a container, localhost is the container's own network namespace, and no database runs there. If the database is another container, put both on the same user-defined network and use its container or service name as the host. If the database runs on the host machine, use host.docker.internal.", c: `
# on plain Linux Docker Engine you must add the name yourself
docker run -d --add-host=host.docker.internal:host-gateway -e DB_HOST=host.docker.internal shop-api:1.0
` },
    { q: "What is the difference between EXPOSE and -p?", a: "EXPOSE in a Dockerfile is only documentation; it opens nothing. '-p HOST:CONTAINER' creates the real NAT rule that forwards a host port to the container. Containers on the same network can reach every port of each other without either of them." },
    { q: "The port is published, but the browser says 'connection reset' or 'empty reply'. What is the likely cause?", a: "The app inside the container listens on 127.0.0.1. Docker forwards the traffic to the container's eth0 address, and a server bound only to loopback does not accept it. Make the app listen on 0.0.0.0 inside the container.", c: `
# wrong inside a container: only reachable from the container itself
uvicorn main:app --host 127.0.0.1 --port 8000

# right
uvicorn main:app --host 0.0.0.0 --port 8000
` },
    { q: "Why can containers on the default bridge not find each other by name, but on my own network they can?", a: "Docker's built-in DNS server is active only on user-defined networks. The default bridge is kept as it was in early Docker, where names worked only through the old --link option. This, plus better isolation between applications, is why you should always create your own network." }
  ],
  tips: [
    "'-p 5432:5432' listens on all host interfaces and bypasses ufw. For a port that only the host itself needs, write '-p 127.0.0.1:5432:5432'.",
    "Debug name lookup from inside the network with a throwaway container: 'docker run --rm --network shopnet alpine nslookup db'. Slim application images usually have no ping or nslookup.",
    "Use 'docker port api' to see the real port mappings of a container, and 'docker network inspect shopnet' to see which containers are attached and their IP addresses.",
    "If containers lose access to office or VPN addresses, Docker's subnet (172.17.0.0/16 and up) may overlap with the company network. Change the ranges with 'default-address-pools' in /etc/docker/daemon.json."
  ]
});

EXTRA(11, "Docker Compose", {
  deep: [
    "Compose is a client-side tool. It reads the YAML file, turns it into normal Docker API calls and adds labels to everything it creates. All resources belong to a 'project', and the project name is the folder name by default. That name is used as a prefix: a network named shop_default, a volume named shop_pgdata, a container named shop-api-1. Two copies of the same repository in folders with the same name will therefore share and fight over the same resources.",
    "When you run 'docker compose up' again, Compose compares the stored configuration of each running container with the file. It recreates only the services whose configuration or image changed and leaves the rest alone. It does not rebuild images by itself when your source code changes; you must add --build. Compose also merges files: if a compose.override.yaml exists next to compose.yaml it is applied automatically, which is the usual place for development-only settings such as bind mounts.",
    "Compose manages one Docker host. It does not move containers to another server when the host dies, it has no rolling update, and 'depends_on' controls only the start order. This is fine for development, CI and small single-server systems. When you need several servers, zero-downtime deploys or automatic scaling, that is the point to move to an orchestrator such as Kubernetes."
  ],
  iq: [
    { q: "I use depends_on, but my API still starts before the database is ready. Why?", a: "Plain depends_on waits only until the database container has started, not until the database accepts connections. Add a healthcheck to the database and use 'condition: service_healthy' in depends_on. A good application should still retry its connection, because the database can also restart later." },
    { q: "What is the difference between the .env file, 'env_file' and 'environment'?", a: "The .env file next to compose.yaml is read by Compose itself and is used to fill in $VARIABLE placeholders in the YAML file. It does not automatically go into containers. 'environment' and 'env_file' set variables inside the container. When the same variable is in both, 'environment' wins over 'env_file'.", c: `
# .env  (read by Compose for the file itself)
# API_TAG=1.4.0

services:
  api:
    image: ghcr.io/mycompany/shop-api:$API_TAG
    env_file: ./api.env          # goes into the container
    environment:
      APP_ENV: prod              # goes into the container, wins over env_file
` },
    { q: "I changed my code and ran 'docker compose up -d', but the old code is still running. Why?", a: "Compose sees that an image for the service already exists and reuses it. It does not check your source files. Run 'docker compose up -d --build' to rebuild, or use a bind mount or 'docker compose watch' in development.", c: `
docker compose up -d --build api
docker compose config            # print the final merged file to check it
` },
    { q: "What is the difference between 'docker compose stop' and 'docker compose down'?", a: "'stop' only stops the containers; they still exist and 'start' brings them back with the same writable layer. 'down' stops and removes the containers and the project network. Named volumes are kept unless you add -v." }
  ],
  tips: [
    "Run one-off commands in a fresh container with the same settings: 'docker compose run --rm api pytest' or 'docker compose run --rm api alembic upgrade head'.",
    "Use profiles for optional services: add 'profiles: [tools]' to a service such as an admin UI, and it starts only with 'docker compose --profile tools up'.",
    "Set the project name explicitly with a top-level 'name: shop' in the file or with 'docker compose -p shop'. Then the resource names do not depend on the folder name on each machine.",
    "To update a single-server deployment, run 'docker compose pull' and then 'docker compose up -d'. Only services with a new image are recreated; add 'restart: unless-stopped' so they come back after a reboot."
  ]
});

EXTRA(11, "Multi-stage builds and small images", {
  deep: [
    "With BuildKit, a multi-stage Dockerfile is a graph, not a list. BuildKit starts from the target stage and builds only the stages it depends on, in parallel where possible. A stage that nothing copies from is skipped. Each stage has its own cache, so a change in the final stage does not rebuild the builder stage. 'COPY --from' can also name any image, not only a stage, which is a clean way to take one binary from another image.",
    "What you copy between stages must still work in the new place. A Python virtual environment contains absolute paths, so it must be created at the same path it will have in the final image, and both stages must use the same Python version. Compiled packages link against system libraries, so the final image needs the run-time library (for example libpq5) even though it does not need the compiler or the header files.",
    "Smaller is not always better. Alpine uses the musl C library instead of glibc. Many Python packages publish ready-made wheels only for glibc, so on Alpine pip may have to compile them from source, which is slow and sometimes fails. Distroless and scratch images have no shell and no package manager; this is very good for security, but you cannot 'docker exec' a shell to debug. For most Python services the slim Debian image is the practical choice."
  ],
  iq: [
    { q: "Why use a multi-stage build instead of removing the build tools in a later RUN step?", a: "Because layers are only added. Removing gcc in a later instruction hides the files but the earlier layer with gcc is still part of the image and is still downloaded. In a multi-stage build the final image starts from a clean base and contains only the layers of the last stage." },
    { q: "Should I use Alpine or slim for a Python image?", a: "Usually slim. Alpine is smaller, but it uses musl, so packages without musl wheels must be compiled during the build. That makes builds slower and can make the final image bigger than slim once compilers and headers are added. Alpine is a good choice for static Go or Rust binaries and for small tools." },
    { q: "How do you build a very small image for a compiled language?", a: "Compile a static binary in a full builder image and copy only that binary into an empty or distroless base. The final image contains one file, so it is a few megabytes and has almost nothing to attack.", c: `
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app
USER nonroot
ENTRYPOINT ["/app"]
` },
    { q: "How do you run tests in the build without shipping the test tools?", a: "Add a separate test stage that starts from the builder, installs the test dependencies and runs the tests. CI builds that stage with --target. The final stage does not copy from it, so nothing from it reaches the production image.", c: `
FROM builder AS test
COPY requirements-dev.txt .
RUN /opt/venv/bin/pip install -r requirements-dev.txt
COPY . .
RUN /opt/venv/bin/pytest

# CI:  docker build --target test .
` }
  ],
  tips: [
    "Install only run-time libraries in the final stage, for example 'libpq5', and keep the '-dev' packages and gcc in the builder stage.",
    "Put 'COPY . .' as late as possible in the final stage and keep a strict .dockerignore. One forgotten .git or data folder can cancel all the savings.",
    "Compare results with numbers: 'docker image ls shop-api' before and after, and 'docker history' to see which layer of the final stage is still large.",
    "To debug an image with no shell, build an earlier stage with '--target builder' and run that, or temporarily use the ':debug' tag of a distroless base, which includes a small shell."
  ]
});

EXTRA(11, "Registries: sharing images", {
  deep: [
    "A push is not one big upload. The client sends each layer as a separate 'blob', named by its sha256 digest. Before sending, it asks the registry whether that digest already exists; if yes, the layer is skipped and you see 'Layer already exists'. Last, the client uploads the manifest, a small JSON file that lists the config and the layer digests, and the tag is pointed at that manifest. A pull does the same in reverse and skips layers that are already on disk.",
    "A tag in the registry is only a pointer to a manifest digest, and by default anyone with push rights can move it. For images that run on different CPU types there is one more level: an 'image index' (also called a manifest list) that points to one manifest per platform, such as linux/amd64 and linux/arm64. The client picks the entry that matches its own machine. If the image has no entry for the machine's CPU, the container fails with an 'exec format error'.",
    "'docker login' stores the credentials in ~/.docker/config.json. Without a credential helper they are only base64-encoded, not encrypted, so anyone who can read that file can use them. Registries also keep everything you push until you delete it. Without a clean-up rule the storage bill grows with every CI run, so set a lifecycle or retention policy that keeps released tags and removes old commit builds."
  ],
  iq: [
    { q: "Why is deploying the 'latest' tag a bad idea in production?", a: "'latest' is a moving pointer, so you cannot tell which code is running, and two servers that pull at different times can run different versions. Rollback is also not possible, because the old 'latest' is gone. Deploy an immutable tag such as the Git commit hash, or a digest." },
    { q: "The image works on my Apple Silicon laptop but fails on the server with 'exec format error'. Why?", a: "The image was built for arm64 and the server CPU is amd64. A container runs native machine code, so the architecture must match. Build for the server's platform, or build a multi-platform image so each machine pulls the right variant.", c: `
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/mycompany/shop-api:1.4.0 --push .
docker buildx imagetools inspect ghcr.io/mycompany/shop-api:1.4.0
` },
    { q: "How do you roll back a bad release when you deploy with images?", a: "You do not rebuild anything. Every release has its own immutable tag in the registry, so you deploy the previous tag again. This takes seconds and you run exactly the bytes that worked before. It only works if old images are still in the registry and tags are never overwritten." },
    { q: "CI fails with 'toomanyrequests' when pulling the base image. What is it and how do you fix it?", a: "Docker Hub limits how many pulls an anonymous IP address can make, and shared CI runners use the same addresses as many other people. Log in to Docker Hub in the pipeline so the limit counts for your account, or pull base images through a mirror or pull-through cache in your own registry.", c: `
echo $DOCKERHUB_TOKEN | docker login -u $DOCKERHUB_USER --password-stdin
` }
  ],
  tips: [
    "Log in from scripts with '--password-stdin', as in 'echo $TOKEN | docker login ghcr.io -u USER --password-stdin'. A password given with -p is visible in the process list and the shell history.",
    "Tag every CI build with the commit: 'docker build -t app:$(git rev-parse --short HEAD) .'. Add the human version tag (1.4.0) to the same image only when you release it.",
    "Turn on tag immutability in the registry if it has the option (Amazon ECR does). Then nobody can overwrite a released tag by mistake.",
    "Reuse the build cache between CI runs by storing it in the registry: add '--cache-to type=registry,ref=REPO:buildcache,mode=max' and '--cache-from type=registry,ref=REPO:buildcache' to 'docker buildx build'."
  ]
});

EXTRA(11, "Container security and good practice", {
  deep: [
    "Root inside a container is the same user ID 0 as root on the host, unless user namespaces are remapped or Docker runs in rootless mode. What makes it less dangerous is a set of extra kernel limits. Linux splits the power of root into pieces called capabilities; Docker gives a container only a small default set and drops the rest, such as loading kernel modules or changing the system clock. A seccomp profile blocks a list of risky system calls, and AppArmor or SELinux add rules about which files a process may touch.",
    "The '--privileged' flag removes almost all of this. It gives every capability, access to all host devices and turns off the seccomp and AppArmor profiles, so a process in such a container can take over the host with little effort. Mounting /var/run/docker.sock has the same effect in a different way: whoever can talk to the daemon can start a new container that mounts the host's root filesystem. For the same reason, membership of the 'docker' group on a server is equal to root access.",
    "Hardening has a cost, and you should know it. A read-only root filesystem breaks apps that write temp files, so you add a tmpfs for those paths. Dropping all capabilities breaks apps that bind to ports below 1024, so you listen on a high port and map it. Image scanners report only known vulnerabilities in installed packages; they do not find bugs in your own code or wrong settings, and they report many issues that cannot be reached in practice. Use them as a gate for serious findings, not as proof that the image is safe."
  ],
  iq: [
    { q: "Is root in a container the same as root on the host?", a: "It is the same UID 0, but with fewer powers: fewer capabilities, a seccomp filter and its own namespaces. If there is a kernel bug, a wrong mount or the --privileged flag, that root can become real host root. That is why you run the app as a non-root user and, where possible, use rootless mode or user namespace remapping." },
    { q: "Why is mounting the Docker socket into a container dangerous?", a: "The socket is the full control API of the daemon, and the daemon runs as root. A process that can reach it can start a privileged container with the host filesystem mounted and read or change anything on the host. Give the socket only to tools you fully trust, and prefer build tools that do not need it.", c: `
# what an attacker inside such a container can do
docker run --rm -v /:/host alpine cat /host/etc/shadow
` },
    { q: "Why is a secret in ENV or ARG a problem, even in a private image?", a: "ENV values are stored in the image config and anyone who can pull the image sees them with 'docker inspect'. ARG values used in a RUN step can show up in 'docker history'. Images get copied to laptops, CI caches and registries, so the secret spreads. Give secrets at run time or use a BuildKit secret mount during the build.", c: `
docker history --no-trunc shop-api:1.4.0
docker inspect -f '{{.Config.Env}}' shop-api:1.4.0
` },
    { q: "My app must be reachable on port 80, but I want it to run as non-root. How?", a: "Only root (or a process with the NET_BIND_SERVICE capability) can bind to ports below 1024 inside the container. The simple fix is to let the app listen on a high port such as 8000 and publish it as '-p 80:8000'. The port mapping is done by the daemon on the host, so the app needs no extra rights." }
  ],
  tips: [
    "Combine '--read-only' with '--tmpfs /tmp' so the app can still write temp files while the rest of the filesystem cannot be changed by an attacker.",
    "Use a numeric user in the Dockerfile, such as 'USER 10001'. Kubernetes cannot check 'runAsNonRoot' when the image only gives a user name.",
    "Make the scan fail the pipeline only for serious findings: 'trivy image --severity HIGH,CRITICAL --exit-code 1 shop-api:1.4.0'. A gate that fails on every low finding gets switched off.",
    "Add '--pids-limit 200' next to the memory and CPU limits. It stops a bug or an attack that creates endless processes from freezing the whole host."
  ]
});
