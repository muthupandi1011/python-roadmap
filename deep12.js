EXTRA(12, "What CI/CD means", {
  deep: [
    "CI is a way of working, not a tool. A team can own a Jenkins server and still not do CI, if developers keep their work on long branches for two weeks. Real CI needs trunk-based development: branches live for hours or a day or two, and unfinished work is merged behind a feature flag. The longer a branch lives, the more the main branch moves away from it, and the bigger and more risky the final merge becomes.",
    "There is a small trap in how pull requests are tested. Your branch can pass, another branch can pass, and the main branch can still break after both are merged, because the two changes were never tested together. Hosted systems reduce this by testing a temporary merge of your branch with the target branch. Busy teams add a merge queue, which tests each change on top of the ones in front of it before it reaches main.",
    "The DORA research measures delivery with four numbers: how often you deploy, how long a change takes from commit to production (lead time), how many deployments cause a failure (change failure rate), and how fast you recover from a failed deployment. Full continuous deployment is not right for every product. Mobile apps wait for app-store review, firmware cannot be replaced ten times a day, and some regulated systems need a recorded human approval. In those cases continuous delivery with a manual release step is the correct target."
  ],
  iq: [
    { q: "What is the difference between continuous delivery and continuous deployment?", a: "In both, every change that passes the pipeline is built, tested and ready to release. In continuous delivery a person decides when to release to production. In continuous deployment there is no manual step; a green pipeline releases by itself. Deployment therefore needs much stronger automated tests and monitoring, because nobody looks before users get the change.", c: `
# GitHub Actions: the same deploy job in both models
deploy-prod:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment: production
  steps:
    - run: ./deploy.sh production

# Delivery:   the 'production' environment has required reviewers, so the job waits for a person
# Deployment: the environment has no reviewers, so the job runs as soon as staging is green
` },
    { q: "We have a CI server and our branches live for three weeks. Are we doing CI?", a: "No. Continuous integration means integrating into the shared main branch at least about once a day. The CI server only builds each branch alone, so conflicts and broken combinations appear at the end, in one large merge. The fix is short-lived branches and feature flags for unfinished work." },
    { q: "The build on main is red. What do you do first?", a: "Make main green again before anything else, and the fastest safe way is usually to revert the commit that broke it. Then fix the problem on a branch without pressure. While main is red, nobody can release and every other developer builds on broken code.", c: `
git revert --no-edit a1b2c3d
git push origin main
` },
    { q: "What are the DORA metrics and why do interviewers ask about them?", a: "They are deployment frequency, lead time for changes, change failure rate and time to recover from a failed deployment. The first two measure speed and the last two measure stability. The research shows that good teams are better at both together, so speed and safety are not opposites when releases are small and automated." }
  ],
  tips: [
    "Turn on branch protection for main: require the pipeline checks and one review, and block direct pushes. Without this rule the pipeline is only advice.",
    "Agree on a 'revert first, fix later' rule for a red main branch. Looking for a forward fix while the whole team is blocked costs much more than one revert.",
    "Keep pull requests small, around a few hundred changed lines at most. Small changes are reviewed faster, fail the pipeline less and are easy to roll back.",
    "Measure lead time from the Git history and deploy logs you already have. If a one-line fix needs two days to reach production, the pipeline or the approval steps are the first thing to improve."
  ]
});

EXTRA(12, "Anatomy of a pipeline", {
  deep: [
    "Where a job runs decides how much you can trust it. A hosted runner gives every job a fresh virtual machine or container and throws it away after the job. Nothing remains from the last run, so builds are clean, but everything must be downloaded again. A self-hosted runner that stays alive is faster, but files, Docker images and even running processes stay behind. A job can then pass only because of leftovers from an earlier job, or fail because of them.",
    "A cache and an artifact look similar but have different jobs. A cache is an optimisation: a folder saved under a key and restored in later runs. The key normally includes the operating system and a hash of the lock file, so a changed dependency list gives a new key and a fresh install. A cache may be missing at any time, and the pipeline must still work. An artifact is a real output of the pipeline, such as a test report or a built package, stored with the run and passed to later jobs.",
    "Modern pipelines are a graph, not a straight line. Jobs declare which jobs they need, the system runs everything else in parallel, and results are joined again at the end. Each job should be safe to run twice, because retries and re-runs happen. A deploy job that fails in the middle and cannot be run again is a design mistake. Also avoid putting large logic into the YAML file: keep it in scripts or a Makefile that a developer can run on a laptop."
  ],
  iq: [
    { q: "What is the difference between a cache and an artifact?", a: "A cache speeds up a job by reusing downloaded or generated files from an earlier run; it is optional and can be dropped at any time. An artifact is a result that the pipeline must keep or hand over, such as a wheel file or a coverage report. Never deploy from a cache, because its content is not guaranteed.", c: `
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-\${{ runner.os }}-\${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-\${{ runner.os }}-
` },
    { q: "What does 'build once, deploy many' mean, and why not rebuild for each environment?", a: "You build one artifact, for example one Docker image, and promote that same artifact from staging to production. A second build can pick up a newer base image or library version, so production would run something that was never tested. Environment differences belong in configuration given at deploy time, not in the artifact." },
    { q: "The pipeline takes 30 minutes. How do you make it faster?", a: "First measure which steps take the time. Then cache dependencies, run independent jobs in parallel, split the test suite over several runners, and run cheap checks first so most failures stop early. Skip work that is not needed, for example do not build the image when only the documentation changed.", c: `
# run tests on all CPU cores (needs the pytest-xdist plugin)
pytest -n auto

# show the 10 slowest tests
pytest --durations=10
` },
    { q: "What makes a pipeline flaky?", a: "A flaky pipeline fails without a code change. The usual causes are tests that depend on time, order or shared state, network calls to outside services, unpinned tool or dependency versions, and leftovers on long-lived runners. Fix it by pinning versions, isolating tests, replacing sleeps with waiting for a condition and using fresh runners." }
  ],
  tips: [
    "Cancel old runs of the same branch when a new commit arrives. In GitHub Actions use a 'concurrency' group with 'cancel-in-progress: true'; it saves a lot of runner minutes.",
    "Give every job a timeout, for example 'timeout-minutes: 15'. A hung test otherwise holds a runner for hours (the GitHub default is 6 hours).",
    "Put the real commands in a Makefile or script ('make lint', 'make test') and call those from the pipeline. Developers can then run exactly the same thing before they push.",
    "Pin tool versions in the pipeline (Python version, linter version, base image). A pipeline that installs 'the newest' of anything will break one day without any change from you."
  ]
});

EXTRA(12, "GitHub Actions", {
  deep: [
    "Each job on a GitHub-hosted runner gets its own fresh virtual machine, which is deleted when the job ends. Two jobs in the same workflow do not share a disk. To pass data between them you use job outputs for small values and artifacts for files. At the start of each job GitHub creates a GITHUB_TOKEN, an access token for this repository that stops working when the job finishes. The 'permissions' block decides what this token may do, and when you set any permission, all the ones you did not list become 'none'.",
    "Expressions in double curly braces are replaced with their values before the shell starts. This creates an injection risk. If you put a pull request title or a branch name directly inside a 'run' script, an attacker can choose a title that contains shell commands, and the runner will execute them. The safe pattern is to place the value in an environment variable with 'env' and use the variable in the script.",
    "Events have different trust levels. For a 'pull_request' from a fork, the workflow runs with a read-only token and no secrets, because the code is from a stranger. 'pull_request_target' runs with the workflow file of the base branch and has secrets and a write token; it is dangerous if it then checks out and runs the code from the pull request. For reuse there are two tools: a reusable workflow (called with 'workflow_call') replaces whole jobs, and a composite action packs several steps into one step."
  ],
  iq: [
    { q: "How do you pass a value from one job to another?", a: "Jobs run on different machines, so variables and files do not carry over. A step writes 'name=value' to the file in $GITHUB_OUTPUT, the job publishes it under 'outputs', and a later job reads it through the 'needs' context. For files, upload an artifact in one job and download it in the next.", c: `
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      tag: \${{ steps.meta.outputs.tag }}
    steps:
      - id: meta
        run: echo "tag=$GITHUB_SHA" >> "$GITHUB_OUTPUT"
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "deploying \${{ needs.build.outputs.tag }}"
` },
    { q: "What is the difference between pull_request and pull_request_target?", a: "'pull_request' runs the workflow from the pull request's merge commit; for forks it gets no secrets and a read-only token, so it is safe for testing unknown code. 'pull_request_target' runs the workflow from the base branch with secrets and write access. It is meant for jobs like labelling, and it must never build or run the code of the pull request." },
    { q: "Why should you pin a third-party action to a commit SHA and not to a tag like v4?", a: "A tag can be moved by whoever controls the action's repository. If that account is taken over, the tag can point to code that steals your secrets, and your workflow runs it on the next build. This happened to a popular action in 2025. A full commit SHA cannot be changed.", c: `
# the SHA below is a placeholder: copy the real one from the action's release page
- uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v4
` },
    { q: "How do you stop two deployments from running at the same time?", a: "Use a 'concurrency' group. Jobs or workflows with the same group name run one at a time. For a deploy, keep 'cancel-in-progress' false so a running deployment finishes and the new one waits; for CI on a branch, set it to true so old runs are cancelled.", c: `
concurrency:
  group: deploy-production
  cancel-in-progress: false
` }
  ],
  tips: [
    "Put 'permissions: contents: read' at the top of every workflow and add more only in the job that needs it. Remember that listing one permission sets all others to none, so a job with only 'packages: write' cannot check out a private repository.",
    "Never write an event value such as a pull request title inside a 'run' script. Put it in 'env:' and use the shell variable; this blocks script injection.",
    "Use the GitHub CLI for daily work: 'gh run watch' follows the current run, 'gh run view --log-failed' prints only the failed step and 'gh run rerun --failed' reruns only the failed jobs.",
    "Add 'if: always()' to the step that uploads test reports. Without it the step is skipped exactly when the tests fail, which is when you need the report."
  ]
});

EXTRA(12, "GitLab CI, Jenkins and Azure Pipelines", {
  deep: [
    "In GitLab, the work is done by a program named GitLab Runner, and its 'executor' decides the isolation. The shell executor runs commands directly on the runner machine, so jobs share its files and tools. The docker executor starts a new container for every job from the image you name. The kubernetes executor starts a new pod per job. Building Docker images inside a containerised job is the hard case: 'docker-in-docker' needs a privileged container, which weakens the isolation of the runner, so many teams use a daemonless builder such as Buildah or rootless BuildKit.",
    "Jenkins has one controller and many agents. The controller stores the configuration, schedules builds and shows the web pages; agents run the builds. Builds should not run on the controller, because a build script there can read all stored credentials. A Jenkinsfile has two styles. Declarative has a fixed structure (pipeline, agent, stages, steps, post) and is checked before it runs. Scripted is free Groovy code, more powerful and harder to maintain. Shared libraries let many repositories reuse the same pipeline code.",
    "Azure Pipelines uses 'agents' grouped in 'pools', either hosted by Microsoft or your own. Access to outside systems goes through 'service connections', and approvals are attached to 'environments'. Templates let teams share steps and whole stages. The honest trade-off across the three: Jenkins can do anything, but you must patch the server and its plugins, and plugin updates can break each other. Hosted systems remove that work but give less control over the build machines."
  ],
  iq: [
    { q: "What is the difference between a declarative and a scripted Jenkins pipeline?", a: "Declarative uses a fixed, simple structure and Jenkins can check the whole file for errors before running it. Scripted is plain Groovy code with loops and conditions anywhere, so it is more flexible but easier to get wrong. Use declarative by default and move complex logic into a shared library.", c: `
pipeline {
  agent any
  options { timeout(time: 20, unit: 'MINUTES') }
  stages {
    stage('Test') { steps { sh 'pytest --junitxml=report.xml' } }
  }
  post {
    always { junit 'report.xml' }
  }
}
` },
    { q: "In GitLab CI, what is the difference between 'only/except' and 'rules'?", a: "'only' and 'except' are the old keywords for choosing when a job runs. 'rules' is the newer and more powerful form: a list of conditions checked in order, each able to set when the job runs and to check changed files or variables. GitLab recommends 'rules', and you cannot mix the two in one job.", c: `
build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
` },
    { q: "What are the risks of Docker-in-Docker and of mounting the Docker socket in CI?", a: "Docker-in-Docker needs a privileged container, so a job can break out to the runner host. Mounting the host's socket is not safer: the job controls the host's Docker daemon and can see or change the containers of other jobs. On shared runners, prefer builders that need no daemon and no privileges." },
    { q: "How do you use a secret in a Jenkins pipeline without printing it?", a: "Store it in the Jenkins credentials store and bind it to a variable only for the steps that need it with 'withCredentials'. Use single quotes around the shell command, so the shell reads the variable. With double quotes Groovy puts the secret value into the command text, and it can appear in logs.", c: `
withCredentials([string(credentialsId: 'registry-token', variable: 'TOKEN')]) {
  sh 'echo $TOKEN | docker login ghcr.io -u ci-bot --password-stdin'
}
` }
  ],
  tips: [
    "In GitLab, log in before you push an image: 'echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY'. These variables are created for every job.",
    "Mark production variables in GitLab as 'protected' and 'masked'. Protected variables are given only to jobs on protected branches and tags, so a feature branch cannot read the production password.",
    "On Jenkins, set the number of executors on the controller to 0, so no build runs there, and keep the server configuration in Git with the Configuration as Code plugin.",
    "Check a .gitlab-ci.yml before you push with the pipeline editor or CI Lint page in the project. It shows syntax errors and the final file after all includes are merged."
  ]
});

EXTRA(12, "Automated testing in the pipeline", {
  deep: [
    "Tests behave differently in CI than on a laptop, and knowing why saves hours. The runner is a clean machine: no local database, no cached login, no files left from yesterday. It often has fewer CPU cores, so timing is different, and its clock is in UTC. Tests may also run in a different order or in parallel. A test that passes only on your laptop usually depends on one of these hidden things.",
    "A flaky test is a test that gives different results on the same code. The main causes are shared state between tests (a database row or global variable left by another test), dependence on test order, real time and dates, fixed sleeps that are too short on a slow runner, random data and calls to real outside services. Simply re-running until it passes hides real bugs, such as race conditions. The usual process is: mark the test as quarantined so it does not block others, create a ticket, and fix or delete it within days.",
    "For integration tests, the best database is the same engine and version as production, started as a container for the job. An in-memory substitute such as SQLite behaves differently in types, locking and SQL features, so tests can pass against it and fail in production. Coverage also needs care: line coverage says a line was executed, not that its result was checked. A high number with weak assertions gives false safety, so use coverage to find untested areas, not as a target to reach."
  ],
  iq: [
    { q: "How do you run tests that need a real database in CI?", a: "Start the database as a service container next to the job and give the tests its address. Each run gets a new empty database, so tests do not depend on old data. Wait for the health check before the tests start, or the first tests fail with connection errors.", c: `
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
` },
    { q: "A test passes on your machine but fails in CI. How do you find the cause?", a: "Look for what is different: dependency versions, environment variables, time zone, test order, missing files and available services. Run the tests locally in the same container image the pipeline uses and in the same order. Most cases turn out to be an unpinned dependency or a test that needs state left by another test." },
    { q: "Does 100% code coverage mean the code has no bugs?", a: "No. Coverage only shows which lines ran during the tests. A test can execute a line without checking the result, and coverage does not show missing cases, such as input the code never handles. It is useful for finding code with no tests at all, not as proof of quality." },
    { q: "What do you do with a flaky test?", a: "Do not ignore it and do not just press re-run, because people then stop trusting red builds. Find the cause: shared state, time, order, sleeps or network. If it cannot be fixed today, quarantine it with a marker and a ticket so it does not block the team, and fix or remove it soon.", c: `
# run the failing test many times to reproduce it (needs the pytest-repeat plugin)
pytest tests/test_orders.py::test_refund --count 50 -x

# rerun only the tests that failed last time
pytest --lf
` }
  ],
  tips: [
    "Write a JUnit XML report with 'pytest --junitxml=report.xml' and upload it. GitHub, GitLab, Jenkins and Azure can then show which test failed without anyone reading the full log.",
    "Mark slow tests with '@pytest.mark.slow' and skip them on pull requests with the option -m 'not slow'. Run the full suite on main or every night.",
    "Use the pytest-randomly plugin to run tests in random order. It finds tests that depend on each other while the problem is still small.",
    "Never use the real clock in a test. Freeze time with a library such as freezegun or time-machine, or pass the current time into the function, so the test gives the same result at midnight and at month end."
  ]
});

EXTRA(12, "Deployment strategies", {
  deep: [
    "Zero downtime depends on two signals between the platform and the app. The first is readiness: the platform sends traffic to a new instance only after its readiness check passes. Without it, users are sent to an app that is still starting. The second is graceful shutdown: before an old instance is stopped it gets SIGTERM, and it must stop accepting new requests, finish the ones in progress and then exit. If the app ignores SIGTERM, every deploy cuts some requests.",
    "In every strategy except recreate, old and new code run at the same time for a while, and they share one database. That is the hard part. A migration that renames or drops a column breaks the old code that is still serving traffic, and it also makes rollback impossible. The safe method is expand and contract: first add the new structure, then deploy code that works with both, then move the data, and only in a later release remove the old structure. Code can be rolled back in seconds; a destructive database change cannot.",
    "Each strategy has a price. Blue-green needs two full environments for a short time and switches all users at once, so a bug still reaches everyone, only with a fast way back. Canary needs traffic splitting in a load balancer or service mesh, good metrics and enough traffic: with ten requests per minute, 5% is too little to see a real error rate. Feature flags add branches to the code, and old flags that are never removed become technical debt."
  ],
  iq: [
    { q: "What is the difference between blue-green and canary?", a: "Blue-green keeps two full environments and switches 100% of traffic from old to new at one moment, so rollback is one switch back. Canary sends a small share of real users to the new version and raises the share step by step while watching metrics. Blue-green is simpler and gives a clean cut; canary limits how many users a bug can hurt but needs traffic splitting and good monitoring." },
    { q: "How do you roll back a bad deploy?", a: "Deploy the previous image tag again; do not rebuild and do not use a Git revert as the first step, because that waits for a whole pipeline. This works only if old images are kept, the deploy is one command, and the database change in the release was backward compatible. After service is restored, find the cause and fix it in a new release.", c: `
kubectl rollout history deployment/shop-api
kubectl rollout undo deployment/shop-api
kubectl rollout undo deployment/shop-api --to-revision=3
kubectl rollout status deployment/shop-api --timeout=120s
` },
    { q: "How do you rename a database column with zero downtime?", a: "Not in one step, because old and new code run together during the rollout. Use expand and contract over several releases: add the new column, write to both, copy old data, switch reads to the new column, then drop the old one. Each step is safe to roll back.", c: `
-- release 1 (expand): add the new column, code writes to both
ALTER TABLE customers ADD COLUMN full_name text;

-- release 2: copy the old data, code now reads full_name
UPDATE customers SET full_name = name WHERE full_name IS NULL;

-- release 3 (contract): only when no running code uses the old column
ALTER TABLE customers DROP COLUMN name;
` },
    { q: "What is the difference between a readiness probe and a liveness probe?", a: "Readiness answers 'can this instance take traffic now?'; when it fails, the instance is removed from the load balancer but keeps running. Liveness answers 'is this process stuck?'; when it fails, the container is restarted. A common mistake is a liveness probe that checks the database: when the database is slow, all healthy app instances are restarted and the outage gets worse." }
  ],
  tips: [
    "Make the pipeline wait for the result: run 'kubectl rollout status deployment/shop-api --timeout=120s' after the deploy. Without it the job shows green even when the new pods crash.",
    "With few replicas, set 'maxUnavailable: 0' and 'maxSurge: 1'. With 2 replicas, the default settings can take half of your capacity away during a rollout.",
    "Practise the rollback in staging on a normal day and write the exact command in the runbook. A rollback that was never tested usually fails when it is needed.",
    "Give every feature flag an owner and a removal date when you create it. Delete the flag and the old code path soon after the feature is fully on."
  ]
});

EXTRA(12, "Secrets and security in pipelines", {
  deep: [
    "OIDC removes stored cloud keys by using a signed identity document. When a job starts, it asks the CI provider for an ID token. This is a JWT, signed by the provider, with claims that describe the job: the repository, the branch or environment, and the workflow. The job sends this token to the cloud. The cloud checks the signature with the provider's public keys, compares the claims with the conditions in the role's trust policy, and if they match returns temporary credentials that expire, typically within an hour. Nothing long-lived is stored anywhere, so there is nothing to steal from the CI settings.",
    "The security of OIDC is in the trust policy. A policy that accepts any token from the CI provider lets every repository in the world take your role. The condition on the 'sub' claim must name your organisation, your repository and the exact branch or environment. This is the most common OIDC mistake.",
    "Log masking is weaker than people think. The CI system replaces the exact secret string with stars in the output. If a script prints the secret in another form, such as base64, reversed, or one character per line, the mask does not match and the value is visible. Shell tracing with 'set -x' prints every command with its arguments. Secrets inside a larger JSON value are also masked badly. So masking is a safety net; the real rule is to never write a secret to output and to give each job only the secrets it needs."
  ],
  iq: [
    { q: "How does OIDC between a pipeline and a cloud work, and why is it better than access keys?", a: "The job gets a short-lived signed token from the CI provider that says which repository and branch it is. The cloud checks the signature and the claims against a trust policy and returns temporary credentials. It is better because no long-lived key exists that could leak from CI settings, logs or a laptop, and access can be limited to one repository and environment.", c: `
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:mycompany/shop-api:environment:production"
  }
}
` },
    { q: "How do you keep secrets out of logs?", a: "Pass the secret as an environment variable to only the step that needs it, and never echo it or put it on a command line that is printed. Do not use 'set -x' in those steps, and register values created at run time with the masking command. Masking matches only the exact text, so a changed form of the secret is not hidden.", c: `
- name: Call the deploy API
  run: curl -fsS -H "Authorization: Bearer $API_TOKEN" https://api.example.com/deploy
  env:
    API_TOKEN: \${{ secrets.API_TOKEN }}

# mask a value that was created during the job
- run: echo "::add-mask::$SESSION_TOKEN"
` },
    { q: "A developer pushed an API key to the repository ten minutes ago. What do you do?", a: "Revoke or rotate the key at once, because you must assume it was already copied; removing the commit does not help. Then check the access logs of that service for use of the key. After that, clean the history if you want, and add secret scanning with push protection so it cannot happen again." },
    { q: "Why are pull requests from forks a security risk for a pipeline?", a: "The pull request can change the build scripts, the tests and even the workflow file, so the code that runs in your pipeline is written by a stranger. If that run had secrets or a write token, the attacker could print or send them out. This is why fork runs get no secrets and a read-only token, and why first-time contributors need approval before a run." }
  ],
  tips: [
    "Limit the cloud trust policy to the exact repository and environment in the 'sub' claim. Never use a wildcard for the repository part.",
    "Store production secrets as environment secrets, not repository secrets, and require a reviewer on that environment. A job on a feature branch then cannot read them.",
    "Run a secret scanner such as gitleaks as a pre-commit hook and in CI, and turn on push protection in GitHub. Stopping the secret before the push is far cheaper than rotating it after.",
    "Let Dependabot or Renovate update pinned actions and base images. Pinning without updates only moves you from 'surprise changes' to 'old vulnerable versions'."
  ]
});

EXTRA(12, "Infrastructure as Code and GitOps", {
  deep: [
    "Terraform works with three things: the configuration you wrote, the state file and the real cloud. The state file is Terraform's memory. It maps each resource in your code to the ID of the real object and stores its last known attributes. A plan first refreshes the state from the cloud API, then compares it with the configuration and lists what to create, change or destroy. Terraform builds a dependency graph from the references between resources and works on independent resources in parallel.",
    "Because the state is so important, it needs care. It often contains secrets in plain text, such as generated database passwords, so it must be encrypted and access to it limited. Two people who apply at the same time can damage it, so a remote backend with locking is required for team work. If the state is lost, Terraform no longer knows that the resources are its own and will try to create everything again. Large systems split the state into parts per environment and component, so one mistake cannot destroy everything.",
    "A GitOps controller such as Argo CD runs a loop inside the cluster: read the wanted state from Git, read the live state from the cluster, and apply the difference. Because the cluster pulls, CI needs no cluster password and the cluster needs no open inbound access. The limits are real too. Secrets cannot be stored in Git as plain text, so you need a tool such as Sealed Secrets, SOPS or the External Secrets Operator. A Git revert rolls back manifests, but not a database migration. And Terraform is the wrong tool for work inside a server, like installing packages; that is the job of a configuration tool or a container image."
  ],
  iq: [
    { q: "What is the Terraform state file, and why must it be remote and locked?", a: "It records which real resources belong to which blocks in the code. Without it Terraform cannot know what exists and what must change. It must be remote so the whole team and CI use the same copy, and locked so two applies cannot write it at the same time and corrupt it. It also needs encryption because it can contain secrets.", c: `
terraform {
  backend "s3" {
    bucket       = "mycompany-tfstate"
    key          = "prod/network/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
` },
    { q: "Someone changed a security group by hand in the cloud console. What happens on the next 'terraform plan'?", a: "The plan refreshes the state, sees that the real resource is different from the code, and proposes to change it back to what the code says. This difference is called drift. You then decide: apply to remove the manual change, or copy the change into the code if it was correct." },
    { q: "What is the difference between 'count' and 'for_each', and why does it matter?", a: "'count' identifies resources by position (0, 1, 2), and 'for_each' identifies them by a key. If you remove the first item of a list used with count, all later items move one position and Terraform plans to destroy and recreate them. With for_each only the removed key is destroyed. Use for_each for anything that has a name.", c: `
resource "aws_s3_bucket" "data" {
  for_each = toset(["mycompany-invoices-prod", "mycompany-reports-prod"])
  bucket   = each.key
}
` },
    { q: "What is the difference between push-based deployment and pull-based GitOps?", a: "In push-based deployment the CI pipeline connects to the cluster and runs the deploy commands, so CI must hold cluster credentials. In pull-based GitOps an agent in the cluster watches a Git repository and applies changes itself. Pull is safer for credentials and also repairs manual changes, but you need a second way to see whether the rollout really succeeded." }
  ],
  tips: [
    "In CI, save the plan and apply exactly that file: 'terraform plan -out=tfplan' and then 'terraform apply tfplan'. Then what was reviewed is what gets applied.",
    "Protect resources that hold data with a lifecycle block containing 'prevent_destroy = true'. A plan that would delete the production database then fails instead of asking for a yes.",
    "Commit the .terraform.lock.hcl file and run 'terraform fmt -check' and 'terraform validate' on every pull request. The lock file makes all machines use the same provider versions.",
    "Find drift with a scheduled job that runs 'terraform plan -detailed-exitcode'. Exit code 2 means the real infrastructure no longer matches the code."
  ]
});
