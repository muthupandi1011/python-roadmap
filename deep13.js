EXTRA(13, "What Ansible is and how it works", {
  deep: [
    "For each task and each host, Ansible does real work on the control node first. It takes the module's Python code, adds the helper code it imports and the task arguments, and packs all of this into one self-contained file (the mechanism is called AnsiballZ). It opens an SSH connection, creates a temporary folder on the managed node (under ~/.ansible/tmp by default), copies the file there and runs it with the remote Python. The module prints one JSON result, with fields such as 'changed' and 'failed', and Ansible reads it and deletes the temporary files.",
    "Two settings decide most of the speed. SSH connection sharing (ControlPersist) keeps one SSH connection open per host, so later tasks do not log in again. Pipelining sends the module to the remote Python through the open SSH session and skips the temporary file copy, which removes several network steps per task. The 'forks' setting is how many hosts Ansible works on at the same time; the default is 5, which is low for a large inventory.",
    "The push model has limits you should know. Nothing on the server enforces the configuration between runs, so a manual change stays until the next playbook run. Ansible keeps no record of what it created, so it cannot remove something only because you deleted the task. Very large inventories are slow, because each task means SSH work for each host. For thousands of machines that must check themselves all the time, an agent-based tool, 'ansible-pull' run from cron, or immutable server images can fit better."
  ],
  iq: [
    { q: "What does 'agentless' really mean? What must be on a managed Linux host?", a: "It means no special Ansible service is installed or running on the managed host. Ansible needs an SSH server, a user it can log in as, and a Python interpreter, because most modules are Python programs that run on the host. For a machine with no Python you can use the 'raw' module, which only sends a command over SSH, for example to install Python first.", c: `
ansible new_servers -b -m ansible.builtin.raw -a "apt-get update && apt-get install -y python3"
` },
    { q: "What does idempotent mean? Give an example.", a: "An idempotent task gives the same end state however many times it runs, and it reports a change only when it really changed something. 'state: present' for a package installs it the first time and does nothing after that. A shell command that appends a line to a file is not idempotent, because every run adds the line again." },
    { q: "Ansible is push-based. What is the difference from a pull-based tool such as Puppet?", a: "With push, the control node connects to the hosts and applies changes when you start a run. With pull, an agent on each host asks a central server at fixed times and applies the configuration itself. Push is simple and gives direct control over order and timing; pull scales to very many hosts and repairs drift by itself, but needs agents and a server." },
    { q: "How can you make Ansible run faster over SSH?", a: "Turn on pipelining so modules are not copied as temporary files, raise forks so more hosts run in parallel, and keep SSH connections open with ControlPersist (on by default with OpenSSH). Also turn off fact gathering in plays that do not use facts.", c: `
# ansible.cfg
[defaults]
forks = 25

[ssh_connection]
pipelining = True
` }
  ],
  tips: [
    "When a host is 'UNREACHABLE', run the same command with -vvv. It prints the exact ssh command Ansible uses, which you can copy and test by hand.",
    "'ansible --version' shows which ansible.cfg file is in use and which Python runs Ansible. 'ansible-config dump --only-changed' shows every setting that differs from the default.",
    "Install Ansible in a Python virtual environment for each project and pin the version in a requirements file. A different Ansible version on each engineer's laptop gives different results.",
    "Set ANSIBLE_KEEP_REMOTE_FILES=1 for one run to keep the generated module file on the host. You can then log in and run it by hand to debug a strange module error."
  ]
});

EXTRA(13, "Inventory", {
  deep: [
    "Ansible reads all inventory sources first and builds one data structure in memory: hosts, groups, and the variables of each. You can give several sources, for example a folder that holds a static file and a dynamic plugin file together, and they are merged. Variables are then flattened for each host. The order is: the 'all' group first, then parent groups, then child groups, then the host itself. A value set closer to the host wins.",
    "One case is tricky. When a host is in two groups at the same level and both set the same variable, the groups are merged in alphabetical order by name, and the last one wins. So the result depends on how the groups are named. You can set 'ansible_group_priority' on a group to control this, but the cleaner fix is to not define the same variable in two sibling groups.",
    "A dynamic inventory plugin is configured with a small YAML file. On each run it calls the cloud API, gets the list of machines and creates groups from tags, regions or other fields. This is always up to date, but it adds an API call to every command, needs cloud credentials on the control node, and depends on correct tags. A missing or wrong tag means a server is silently not managed. For ten fixed servers, a static file is simpler and safer."
  ],
  iq: [
    { q: "What is the difference between a static and a dynamic inventory? When do you use each?", a: "A static inventory is a file you edit by hand. A dynamic inventory is created on each run by a plugin that asks a source such as AWS for the current machines. Use static for a small, stable set of servers, and dynamic when machines are created and removed automatically, because a hand-made list would be wrong within hours.", c: `
# inventory/prod.aws_ec2.yml   (the file name must end in aws_ec2.yml)
plugin: amazon.aws.aws_ec2
regions:
  - ap-south-1
filters:
  tag:env: prod
  instance-state-name: running
keyed_groups:
  - key: tags.role
    prefix: role
` },
    { q: "A host is in two groups and both define the same variable. Which value wins?", a: "If one group is a child of the other, the child wins, because it is more specific. If they are at the same level, Ansible merges them in alphabetical order and the later name wins, unless 'ansible_group_priority' is set. A host variable beats all group variables." },
    { q: "How do you run a playbook on only one host or a few hosts, and check the target list first?", a: "Use --limit with a host name, a group or a pattern. Add --list-hosts to print the hosts that would be used without running anything. This check is a good habit before every production run.", c: `
ansible-playbook -i inventories/prod site.yml --limit web1.example.com
ansible-playbook -i inventories/prod site.yml --limit 'web:!web3.example.com' --list-hosts
` },
    { q: "Where does Ansible look for group_vars and host_vars folders?", a: "In two places: next to the inventory file and next to the playbook file. If both exist, the ones next to the playbook win over the ones next to the inventory. Keeping them next to the inventory is cleaner when you have one inventory folder per environment, because each environment then carries its own values." }
  ],
  tips: [
    "Use one folder per environment: inventories/staging/ and inventories/prod/, each with its own hosts file and group_vars folder. Then '-i inventories/prod' is always a clear and deliberate choice.",
    "Do not set production as the default inventory in ansible.cfg. Make staging the default, so a forgotten -i can never change production.",
    "'ansible-inventory -i inventories/prod --host web1.example.com' prints the final merged variables for one host. It is the quickest answer to the question where a value comes from.",
    "Give hosts readable inventory names and put the address in ansible_host, for example 'web1 ansible_host=10.0.1.11'. Logs and --limit then use the short name."
  ]
});

EXTRA(13, "Ad-hoc commands and modules", {
  deep: [
    "A module is a small program with a contract: it reads its arguments, looks at the current state of the host, changes it only if needed, and prints JSON that says whether something changed. Ansible itself does not know what a package or a service is; all that knowledge is in the module. This is also why 'command' and 'shell' are different from all the others. They cannot know what your command does, so they report 'changed' on every run unless you tell them more.",
    "The command module starts the program directly, without a shell. Characters such as the pipe, redirect arrows, the ampersand and environment variables like $HOME are not processed; they are passed to the program as plain text. The shell module runs the line through /bin/sh, so all shell features work, and shell injection becomes possible if a variable holds untrusted text. The raw module sends text over SSH without any Python module on the remote side, and the script module copies a local script to the host and runs it.",
    "Some modules do part of their work on the control node. For 'template' and 'copy', a piece of code named an action plugin first runs locally, renders or reads the file, compares checksums with the remote file, and transfers it only if it differs. Check mode also depends on the module: a module that supports it reports what it would change without doing it. The command and shell modules are skipped in check mode, so tasks that use their result may behave differently in a dry run."
  ],
  iq: [
    { q: "What is the difference between the command and shell modules?", a: "'command' executes the program directly, so pipes, redirects and shell variables do not work, and it is safer and more predictable. 'shell' runs the line in /bin/sh, so those features work, but a variable with unexpected content can run extra commands. Use command by default and shell only when you need a shell feature." },
    { q: "How do you make a command or shell task idempotent?", a: "Tell Ansible when the work is already done. 'creates' skips the task if a file already exists, and 'removes' skips it if a file does not exist. For commands that only read information, set 'changed_when: false'. You can also register the output and write a 'changed_when' condition that checks it.", c: `
- name: Create the swap file only once
  ansible.builtin.command: fallocate -l 2G /swapfile
  args:
    creates: /swapfile

- name: Read the current kernel version
  ansible.builtin.command: uname -r
  register: kernel
  changed_when: false
` },
    { q: "Why should you prefer a module such as 'apt' over 'shell: apt-get install'?", a: "The module checks the current state first, so it changes nothing when the package is already there and reports 'changed' correctly. It supports check mode and diff mode and gives clear error messages. The shell version reports changed every time, which makes handlers fire on every run and makes the run report useless." },
    { q: "How do you treat a command whose non-zero exit code is not an error?", a: "Register the result and define failure yourself with 'failed_when'. For example grep returns 1 when it finds nothing, which is a normal answer and not a failure. Without failed_when the task would stop the play for that host.", c: `
- name: Check whether the old setting is still in the file
  ansible.builtin.command: grep -q legacy_mode /etc/shop/app.conf
  register: legacy
  changed_when: false
  failed_when: legacy.rc not in [0, 1]
` }
  ],
  tips: [
    "Add -o to an ad-hoc command to get one line per host, for example: ansible web -m command -a 'uptime' -o. It is much easier to read and to grep with 80 servers.",
    "Limit the facts you print: ansible web1 -m setup -a 'filter=ansible_distribution*'. The full output of setup is hundreds of lines.",
    "'ansible-doc -l' lists all installed modules, and the EXAMPLES section at the end of 'ansible-doc MODULE' usually has a task you can copy.",
    "Be careful with ad-hoc restarts: 'ansible web -b -m service -a ...' restarts on 5 hosts at a time by default. Add '-f 1' to go one host at a time on a live system."
  ]
});

EXTRA(13, "Playbooks", {
  deep: [
    "How tasks are spread over hosts is decided by the 'strategy'. The default, linear, runs task 1 on all hosts (up to 'forks' at once), waits until every host has finished it, and then starts task 2. One slow host therefore holds back all the others. The 'free' strategy lets each host go through the tasks as fast as it can, which is quicker but gives output that is hard to read and no fixed order between hosts.",
    "'forks' and 'serial' are often mixed up. Forks is only parallelism: how many hosts Ansible talks to at the same time. Serial changes the structure of the run: the play is executed completely, from the first task to the handlers, for one batch of hosts, and then again for the next batch. Serial is what makes a rolling update. With serial, 'max_fail_percentage' or 'any_errors_fatal' can stop the whole run when a batch fails, so a bad change does not reach the remaining servers.",
    "A play has a fixed order of sections: pre_tasks, then roles, then tasks, then post_tasks, and handlers that were notified run at the end of each section. When a task fails on a host, that host is removed from the rest of the play, and its pending handlers do not run. A playbook is still a list of steps in order, not a full description of the server: things you no longer mention are not removed. When the logic becomes complex, with many conditions and loops inside loops, a small custom module or a script is easier to test than YAML."
  ],
  iq: [
    { q: "A task fails on one host out of ten. What happens next?", a: "That host is marked failed and gets no more tasks in this play. The other nine continue. Handlers already notified on the failed host do not run unless you use --force-handlers. You can change this behaviour with 'ignore_errors', with a block and rescue, or with 'any_errors_fatal: true' to stop every host at once." },
    { q: "What is the difference between 'forks' and 'serial'?", a: "Forks sets how many hosts are worked on in parallel for each task, and it does not change the order of anything. Serial splits the hosts into batches and runs the whole play for one batch before the next begins. For a rolling update you need serial, because with forks alone every server is still changed in the same pass.", c: `
- name: Rolling update with a canary batch
  hosts: web
  serial:
    - 1
    - 5
    - "100%"
  max_fail_percentage: 0
  tasks:
    - name: Restart the application
      ansible.builtin.service:
        name: shop-api
        state: restarted
` },
    { q: "How do you handle errors and run clean-up steps in a playbook?", a: "Put the tasks in a 'block' and add 'rescue' and 'always' sections. Rescue runs only if a task in the block fails, like an except clause in Python. Always runs in both cases, like finally. If the rescue tasks succeed, the host is not counted as failed and the play continues.", c: `
- name: Deploy with a way back
  block:
    - name: Point the link to the new release
      ansible.builtin.file:
        src: /opt/releases/1.4.1
        dest: /opt/shop-api/current
        state: link
  rescue:
    - name: Point the link back to the old release
      ansible.builtin.file:
        src: /opt/releases/1.4.0
        dest: /opt/shop-api/current
        state: link
  always:
    - name: Report the result
      ansible.builtin.debug:
        msg: deploy step finished on {{ inventory_hostname }}
` },
    { q: "How do you run only a part of a large playbook?", a: "Use tags on tasks or roles and select them with --tags or leave them out with --skip-tags. Use --limit to choose hosts and --start-at-task to continue from a named task after a failure. Running a part is useful, but remember that skipped tasks may have set variables that later tasks need." }
  ],
  tips: [
    "Before a production run, use 'ansible-playbook site.yml --syntax-check' and then '--list-hosts --list-tasks'. You see exactly which tasks will run on which hosts without touching any server.",
    "Use '--step' to confirm each task by hand, or '--start-at-task' with the task name to continue after you fixed a failure. Both save time on long playbooks.",
    "Set 'any_errors_fatal: true' on plays where a half-finished result is dangerous, such as a database cluster change. One failure then stops all hosts at once.",
    "Use 'run_once: true' with 'delegate_to' for work that must happen on one machine only, such as a database migration, even when the play targets ten web servers."
  ]
});

EXTRA(13, "Variables, facts, conditions and loops", {
  deep: [
    "Ansible has more than twenty levels of variable precedence. The order worth remembering, from weak to strong, is: role defaults, inventory group variables, inventory host variables, facts, play 'vars', role 'vars' (the vars/main.yml of a role), task-level vars, then set_fact and registered variables, and last the extra vars given with -e. Two results surprise people. Variables in a role's vars folder beat the inventory, so users of the role cannot change them from group_vars. And extra vars always win, even over set_fact.",
    "Variables are lazy. A value that contains a template is not calculated where you define it; it is calculated each time it is used, with the values that exist at that moment. 'set_fact' is different: it calculates the value once, at that task, and stores the result for that host for the rest of the run. Each host also has its own separate set of variables. To read the value of another host you go through the special variable 'hostvars'.",
    "Facts are collected by the 'setup' module at the start of every play, on every host. This takes a few seconds per host, which is a lot of time for a big inventory and many plays. If a play does not use facts, turn gathering off. If it uses a few, gather a subset. Fact caching stores the facts in files or Redis between runs, so they need not be collected each time; the cost is that cached facts can be old. Another design limit: when the same dictionary variable is defined at two levels, the stronger one replaces the weaker one completely; the two are not merged."
  ],
  iq: [
    { q: "A variable is set in group_vars and also in the vars folder of a role. Which wins?", a: "The role's vars wins, because role vars are stronger than all inventory variables. This is why values that users should be able to change belong in the role's defaults folder, which is the weakest level. Only -e on the command line beats everything." },
    { q: "How do you use a fact from another host, for example the database server's IP in the web server's config?", a: "Use 'hostvars' with the other host's name. The facts of that host must have been gathered in this run or be in the fact cache, so the play (or an earlier play) must include the db group. If not, the value is undefined.", c: `
- name: Write the database address into the app settings
  ansible.builtin.lineinfile:
    path: /etc/shop/app.env
    regexp: ^DB_HOST=
    line: DB_HOST={{ hostvars[groups['db'][0]]['ansible_facts']['default_ipv4']['address'] }}
` },
    { q: "What happens when you use 'when' and 'loop' in the same task?", a: "The condition is checked again for every item, not once for the whole task, so you can use 'item' inside the condition. If you want to skip the whole loop, check the condition on a block around the task or make the list empty. A registered variable from a looped task also has a different shape: the results are in a list named 'results'.", c: `
- name: Install only the packages that are switched on
  ansible.builtin.apt:
    name: "{{ item.name }}"
    state: present
  loop:
    - { name: nginx, enabled: true }
    - { name: redis-server, enabled: false }
  when: item.enabled
` },
    { q: "Why does 'when: debug_mode' behave wrongly when I pass '-e debug_mode=false'?", a: "Values passed as key=value with -e are always strings. The string 'false' is not empty, so some conditions see it as true. Use the bool filter in the condition, or pass the extra vars in JSON or from a YAML file with '-e @vars.yml', which keeps the real types.", c: `
- name: Turn on verbose logging
  ansible.builtin.debug:
    msg: debug mode is on
  when: debug_mode | bool
` }
  ],
  tips: [
    "Turn off facts where they are not used with 'gather_facts: false' at the play level. On 200 hosts this alone can save minutes per run.",
    "Turn on fact caching in ansible.cfg with 'gathering = smart', 'fact_caching = jsonfile' and 'fact_caching_connection = /tmp/ansible_facts'. Facts are then collected again only when the cache is too old.",
    "In loops over dictionaries, add 'loop_control' with a 'label', for example 'label: {{ item.name }}' in quotes. The output then shows one short name per item and not the whole dictionary, which may contain passwords.",
    "Give required variables no default and check them at the start with the 'assert' module. A clear error in the first second is better than a half-configured server after ten minutes."
  ]
});

EXTRA(13, "Templates and handlers", {
  deep: [
    "A template is rendered on the control node, not on the server. Ansible reads the .j2 file, fills in the variables of the current host and produces the final text in memory. It then compares a checksum of this text with the file on the server. Only when they differ does it copy the new file and report 'changed'. This comparison is what makes templates idempotent and what decides whether a handler is notified. The 'validate' option runs a command on the server against the new temporary file, and the real file is replaced only if that command succeeds.",
    "Handlers have exact rules. A notification is only recorded when the task reports 'changed'. Recorded handlers run at the end of the section of the play (pre_tasks, tasks with roles, post_tasks), each one only once, and in the order in which they are written in the handlers section, not in the order they were notified. A handler is found by its name or by a 'listen' topic, and the text must match exactly.",
    "This design has one well-known trap. A task changes a config file and notifies a restart. Then a later task fails on that host, and the play stops for it before the handlers run. On the next run the config file is already correct, so the task reports 'ok', nothing is notified, and the service keeps running with the old configuration. The answers are --force-handlers, a 'flush_handlers' task right after the critical change, or fixing the service by hand once. Also remember that a restart drops connections; use reload when the service supports it."
  ],
  iq: [
    { q: "My handler did not run. What are the possible reasons?", a: "The notifying task reported 'ok' and not 'changed', so nothing was notified. Or the name in 'notify' does not match the handler name exactly. Or a later task failed on that host, so the play ended for it before the handlers ran. Or the handler is in a different play or in a role that is not loaded. Running with --check also shows handlers differently, because nothing is really changed." },
    { q: "How do you make a handler run immediately and not at the end of the play?", a: "Add a task with 'meta: flush_handlers'. All handlers notified so far run at that point, and the play then continues. This is needed when a later task depends on the restarted service, for example a health check or a database schema task.", c: `
- name: Deploy the service configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/shop/app.conf
  notify: Restart shop-api

- name: Run pending handlers now
  ansible.builtin.meta: flush_handlers

- name: Check that the service answers
  ansible.builtin.uri:
    url: http://localhost:8000/health
` },
    { q: "Several tasks should trigger the same group of handlers. How do you do that cleanly?", a: "Give the handlers a common 'listen' topic and notify the topic. Every handler that listens to it runs, each once. This also separates the task from the handler names, so you can rename or add handlers without editing every task.", c: `
handlers:
  - name: Reload nginx
    ansible.builtin.service:
      name: nginx
      state: reloaded
    listen: web config changed

  - name: Clear the page cache
    ansible.builtin.file:
      path: /var/cache/nginx/pages
      state: absent
    listen: web config changed
` },
    { q: "What is the difference between the copy and template modules?", a: "'copy' sends a file as it is, byte for byte. 'template' first runs the file through Jinja2, so variables, conditions and loops are replaced with values for each host. Use copy for fixed files such as certificates or scripts, and template when the content depends on the host or the environment." }
  ],
  tips: [
    "Always use 'validate' for files that can lock you out: 'validate: /usr/sbin/sshd -t -f %s' for sshd_config and 'validate: /usr/sbin/visudo -cf %s' for sudoers files.",
    "'validate' tests only the single new file. An nginx file in conf.d is a fragment and fails that test on its own, so add a separate task that runs 'nginx -t' after the file is in place and before the reload.",
    "Run the template task with '--check --diff' first. It prints a line-by-line diff of what would change in the file on each server, without changing it.",
    "Put '{{ ansible_managed | comment }}' in the first line of every template and add 'backup: true' on important files. People then know not to edit the file by hand, and the old version is kept on the server."
  ]
});

EXTRA(13, "Roles and Ansible Galaxy", {
  deep: [
    "There are three ways to use a role, and they do not behave the same. The 'roles:' keyword of a play and 'import_role' are static: Ansible reads the role when it parses the playbook, before anything runs. 'include_role' is dynamic: the role is loaded only when the run reaches that task. With a static import, a 'when' or a tag on the import is copied to every task inside the role. With a dynamic include, the 'when' decides once whether the role is loaded at all, and tags on the include do not reach the tasks inside unless you ask for that.",
    "Order is another detail. Roles listed under 'roles:' always run before the play's 'tasks' section, even if you write tasks first in the file. Dependencies listed in a role's meta/main.yml run before that role, and a role used twice in a play with the same parameters runs only once. Ansible looks for roles in a 'roles' folder next to the playbook, then in the paths of the 'roles_path' setting.",
    "Roles have costs. Variables of all roles share one namespace per host, so two roles that both use a variable named 'port' will clash; this is why role variables carry the role name as a prefix. A role from Galaxy is code that runs as root on your servers, written by a stranger, so read it and pin its version. And a role that tries to support every operating system and every option becomes harder to understand than the ten tasks you really need."
  ],
  iq: [
    { q: "What is the difference between defaults/main.yml and vars/main.yml in a role?", a: "Both define variables, but at opposite ends of the precedence order. Defaults are the weakest level, so inventory variables and play variables can change them; they are the public settings of the role. Role vars are very strong and beat the inventory; they are for internal values that users should not change, such as package names per operating system." },
    { q: "What is the difference between import_role and include_role?", a: "'import_role' is static and is processed at parse time, so its tasks appear in --list-tasks and inherit tags and conditions. 'include_role' is dynamic and is processed during the run, so it can be used in a loop or with a condition that depends on earlier results. Use import for a fixed structure and include when the decision is made at run time.", c: `
- name: Install the database role only on db hosts
  ansible.builtin.include_role:
    name: postgresql
  when: inventory_hostname in groups['db']
` },
    { q: "What is the difference between a role and a collection?", a: "A role packages tasks, handlers, templates and variables for one job. A collection is a larger distribution format with a namespace and a version, and it can contain many roles plus modules and plugins. You refer to collection content with a full name such as community.postgresql.postgresql_user." },
    { q: "How do you make sure every engineer and the CI system use the same external roles and collections?", a: "List them with exact versions in a requirements.yml file in the repository and install from that file. Without pinned versions, a new release of a role can change behaviour between two runs of the same playbook.", c: `
# requirements.yml
roles:
  - name: baseline
    src: git+https://github.com/mycompany/ansible-role-baseline.git
    version: v2.3.0
collections:
  - name: community.postgresql
    version: 3.4.0

# ansible-galaxy install -r requirements.yml
` }
  ],
  tips: [
    "Prefix every variable of a role with the role name, such as 'nginx_http_port' and not 'http_port'. All roles share one variable namespace per host, so short names clash.",
    "Keep tasks/main.yml short and let it import files such as install.yml, configure.yml and service.yml. A 400-line main.yml is as hard to read as the playbook the role replaced.",
    "Test a role alone with Molecule: it starts a container, applies the role, runs it a second time to check that nothing changes (the idempotence check), and then verifies the result.",
    "Describe the inputs of a role in meta/argument_specs.yml. Ansible then checks required variables and their types before the first task of the role runs."
  ]
});

EXTRA(13, "Ansible Vault: protecting secrets", {
  deep: [
    "A vault-encrypted file is plain text that starts with a header line containing ANSIBLE_VAULT, the format version and AES256. Below it is the encrypted content as hexadecimal digits. Ansible does not use your password directly as the key. It stretches the password with a key derivation function (PBKDF2 with a random salt) into keys, encrypts the content with AES-256 and adds an HMAC so that any change to the file is detected. The security therefore depends on the strength of the password: a short password can be guessed offline by anyone who has the file.",
    "Encrypting a whole file has a practical cost. Every time the file is saved, the complete ciphertext changes, so a Git diff shows only noise and a reviewer cannot see which secret changed. Encrypting single values with encrypt_string keeps the file readable and diffs useful, but those values cannot be opened with 'ansible-vault edit' or changed with 'rekey'; you must create each one again. Vault IDs let you label secrets and use a different password per environment, so staging staff do not need the production password.",
    "Vault protects secrets at rest, in the repository. It does not protect them during the run. Decrypted values are normal variables in memory, and they can appear in task output, in --diff output of a template, in registered results and in verbose mode. There is also no record of who read a secret, and everyone with the password can read everything. Changing the vault password does not help against someone who already has an old copy of the repository and the old password. For per-person access, audit logs and automatic rotation, teams read secrets at run time from a secret manager such as HashiCorp Vault or a cloud service."
  ],
  iq: [
    { q: "How do you supply the vault password in a CI pipeline?", a: "Store the password in the CI secret store, write it to a temporary file or pass it through a script during the job, and point Ansible to it with --vault-password-file. Never commit the password file and never type it as a command-line argument, because arguments show up in logs and process lists.", c: `
- name: Run the playbook
  env:
    ANSIBLE_VAULT_PASSWORD: \${{ secrets.ANSIBLE_VAULT_PASSWORD }}
  run: |
    printf '%s' "$ANSIBLE_VAULT_PASSWORD" > .vault_pass
    ansible-playbook -i inventories/prod site.yml --vault-password-file .vault_pass
    rm -f .vault_pass
` },
    { q: "An engineer who knew the vault password has left the company. What do you do?", a: "Running 'ansible-vault rekey' is not enough. That person may have a copy of the repository and can still decrypt it with the old password. You must change the real secrets themselves (database passwords, API keys) and then also rekey the files with a new vault password." },
    { q: "How do you use different vault passwords for staging and production?", a: "Use vault IDs. Each encrypted file or value gets a label, and at run time you give one password source per label. Ansible uses the right password for each piece of content, so a person or a pipeline that has only the staging password cannot read production secrets.", c: `
ansible-vault encrypt --vault-id prod@prompt group_vars/prod/vault.yml
ansible-vault encrypt --vault-id staging@prompt group_vars/staging/vault.yml

ansible-playbook -i inventories/prod site.yml --vault-id prod@prompt
` },
    { q: "The secret is in Vault, but it still appeared in the job log. How?", a: "Vault only encrypts the file in Git. During the run the value is decrypted, and a task can print it: a failed task shows its arguments, --diff shows the content of a rendered template, a debug task prints a variable, and -vvv prints module arguments. Add 'no_log: true' to tasks that handle secrets and do not run production with --diff on templates that contain passwords." }
  ],
  tips: [
    "Do not type a secret as an argument, because it stays in the shell history. Use 'ansible-vault encrypt_string --stdin-name vault_db_password' and paste the value, or create the file with 'ansible-vault create'.",
    "Set the environment variable ANSIBLE_VAULT_PASSWORD_FILE, or 'vault_password_file' in ansible.cfg, to a file outside the repository with mode 600. Add the file name to .gitignore as well.",
    "Keep the two-file pattern: vars.yml with 'db_password' pointing to 'vault_db_password', and vault.yml with the encrypted value. A search for a variable name then still works, which it does not inside an encrypted file.",
    "Add a pre-commit check that files named vault.yml start with the ANSIBLE_VAULT header. The most common vault accident is a file that was decrypted for editing and committed in plain text."
  ]
});

EXTRA(13, "Good practice and where Ansible fits", {
  deep: [
    "The biggest technical difference between Ansible and Terraform is state. Terraform records everything it created in a state file. When you delete a resource from the code, Terraform sees that it is in the state but no longer wanted, and destroys it. Ansible keeps no such record. If you delete the task that installed a package, nothing happens on the servers; the package stays. To remove something with Ansible you must write a task that says 'state: absent', run it everywhere, and remove the task later.",
    "This leads to two ways of running servers. With mutable servers you keep machines for years and change them in place with Ansible; over time they collect old packages and manual changes, and no two are exactly the same. With immutable servers you never change a running machine: you build a new machine image (often with Packer, which can run an Ansible playbook during the build), start new servers from it and delete the old ones. Ansible is then used at build time and not against production.",
    "For speed at scale there are a few known levers: more forks, pipelining, fact caching or no facts, and the free strategy where order between hosts does not matter. Long tasks can run in the background with 'async' so that the SSH connection does not have to stay open. Check mode is useful but not complete: tasks that use command or shell are skipped, and tasks that depend on their results may fail or be skipped in a dry run. A clean check run is a good sign, not a guarantee."
  ],
  iq: [
    { q: "How does Ansible differ from Terraform? Can one replace the other?", a: "Terraform is declarative with a state file: it knows what it created, shows a plan and can destroy what is no longer in the code. It is made for cloud resources. Ansible runs tasks in order with no state and is made for work inside machines: packages, files, services, deploys. Each can do some of the other's job, but badly, so teams usually use Terraform to create infrastructure and Ansible to configure it." },
    { q: "You removed the task that installs a package from the playbook. Is the package removed from the servers?", a: "No. Ansible only does what the current tasks say and has no memory of earlier runs. The package stays until a task with 'state: absent' removes it. This is a main reason why old servers drift, and why some teams rebuild servers from images instead.", c: `
- name: Remove the old monitoring agent
  ansible.builtin.apt:
    name: old-agent
    state: absent
    purge: true
` },
    { q: "How do you do a zero-downtime rolling update of web servers behind a load balancer?", a: "Use 'serial' to take a few hosts at a time. For each batch: remove the host from the load balancer with a task delegated to the load balancer, update and restart the app, wait for the health check, and add the host back. Set 'max_fail_percentage: 0' so the run stops at the first bad batch while the other servers still serve the old version.", c: `
- name: Rolling deploy behind HAProxy
  hosts: web
  become: true
  serial: 2
  max_fail_percentage: 0
  pre_tasks:
    - name: Take this host out of the load balancer
      community.general.haproxy:
        state: disabled
        host: "{{ inventory_hostname }}"
        backend: shop
        socket: /run/haproxy/admin.sock
      delegate_to: "{{ item }}"
      loop: "{{ groups['lb'] }}"
` },
    { q: "A task takes 40 minutes and the SSH connection drops. How do you run it safely?", a: "Run it in asynchronous mode. 'async' gives the maximum run time in seconds, and 'poll' says how often Ansible checks whether it finished. The job runs in the background on the host, so a short network break does not kill it. With 'poll: 0' Ansible does not wait at all, and you check later with the async_status module.", c: `
- name: Run a long database migration
  ansible.builtin.command: /opt/shop-api/migrate.sh
  async: 3600
  poll: 15
` }
  ],
  tips: [
    "Test idempotency in CI: run the playbook twice against a test host and fail the job if the second run reports any 'changed'. This finds shell tasks without 'creates' or 'changed_when'.",
    "Find slow tasks with the profile_tasks callback: set 'callbacks_enabled = ansible.posix.profile_tasks' in ansible.cfg. The run then ends with a list of tasks sorted by time.",
    "Run production in two steps: first '--limit' one host and check it by hand, then the full run with 'serial'. A wrong variable then breaks one server and not all of them.",
    "Pin ansible-core and every collection version in the repository and let CI use only these. An unplanned upgrade of a collection between two runs is a common cause of sudden failures."
  ]
});
