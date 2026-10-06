EXTRA(15, "What a shell is, and why Bash", {
  deep: [
    "When you run an external command such as ls, the shell does three system calls. fork makes a copy of the shell process. In that copy, exec replaces the shell program with the ls program. The original shell calls wait and sleeps until the child ends, then stores its exit code in $?. Every external command costs one new process, which is why a loop that calls sed 10,000 times is slow.",
    "Some commands are builtins: cd, export, read, echo, exit and others. They run inside the shell process itself, with no fork. cd must be a builtin. A child process can change only its own working directory, so an external cd program would change directory and then end, and your shell would still be in the old place. When you type a name, Bash looks for an alias, then a function, then a builtin, and last a program in the PATH folders. It remembers where it found each program, so after you install a new copy in another folder, the old one may still run until you type 'hash -r'.",
    "A common misconception is that sh and bash are the same. On Debian and Ubuntu, /bin/sh is dash, a small fast shell without Bash features such as [[ ]], arrays or 'set -o pipefail' on older versions. On Alpine it is BusyBox ash. Also, shells start in different modes. A login shell reads ~/.bash_profile, an interactive non-login shell reads ~/.bashrc, and a script reads neither. That is why an alias or PATH change from ~/.bashrc is missing inside scripts, cron jobs and 'ssh host command'."
  ],
  iq: [
    { q: "Why is cd a shell builtin and not a normal program?", a: "The working directory belongs to a process, and a child process cannot change anything in its parent. An external cd would run in a child, change the child's directory and exit; the shell would not move. The same reason applies to export, umask and exit: they must change the shell itself." },
    { q: "A script works with 'bash script.sh' but fails with 'sh script.sh'. Why?", a: "sh is often not Bash. On Ubuntu and Debian it is dash, and on Alpine it is BusyBox ash. These shells do not know Bash-only syntax such as [[ ]], arrays or the 'function' keyword, so they report errors like '[[: not found'. Run the script with bash, or write only POSIX syntax when the shebang is #!/bin/sh.", c: `
ls -l /bin/sh            # on Ubuntu: /bin/sh -> dash

# Bash only:   [[ -f "$file" ]]
# works in sh: [ -f "$file" ]
` },
    { q: "What is the difference between ./script.sh, bash script.sh and source script.sh?", a: "The first two start a new child process. Variables the script sets and directory changes it makes are lost when it ends; ./script.sh also needs execute permission and uses the shebang. source (or a single dot) runs the lines in your current shell, so variables, cd and functions stay. Be careful: an 'exit' in a sourced file closes your terminal session.", c: `
echo 'cd /tmp; myvar=hello' > demo.sh

bash demo.sh;   pwd; echo "$myvar"     # still in the old folder, myvar is empty
source demo.sh; pwd; echo "$myvar"     # now in /tmp, myvar is hello
` },
    { q: "An alias works in your terminal but 'ssh server myalias' says 'command not found'. Why?", a: "With a command, ssh starts a non-interactive shell on the server. Aliases are an interactive feature and are normally defined in ~/.bashrc, which many systems skip for non-interactive shells. The same happens in scripts and cron. Use the full command, or a function or script in a folder that is in PATH." }
  ],
  tips: [
    "Use 'type -a python3' to see every match for a name (alias, function, builtin, each path). It answers 'which one is really running?' better than which.",
    "In small containers there is often no bash. Use 'docker exec -it NAME sh', and write Dockerfile RUN lines in plain sh syntax, or install bash first (apk add bash on Alpine).",
    "Before 'rm -r' with a wildcard, run the same pattern with ls first. One extra space, as in 'rm -r build /' or 'rm -r * .tmp', deletes far more than you wanted and there is no undo.",
    "'cd -' jumps back to the previous folder, and Ctrl+R searches your command history. On a server during an incident these two save more time than anything else."
  ]
});

EXTRA(15, "Your first script: shebang and permissions", {
  deep: [
    "The shebang is handled by the Linux kernel, not by the shell. When a program asks the kernel to execute a file, the kernel reads the first bytes. If they are #!, the kernel starts the named interpreter and gives it the script path as an argument. So ./hello.sh really runs '/usr/bin/env bash ./hello.sh'. Linux passes everything after the interpreter path as one single argument, so a shebang with several options, like '#!/usr/bin/env bash -e', usually fails.",
    "Permissions are nine bits stored with the file: read, write and execute for the owner, the group and others. In octal, r is 4, w is 2 and x is 1, so 7 is rwx and 5 is r-x. On a directory the bits mean something else: r lets you list the names, w lets you create and delete entries, and x lets you enter it and reach the files inside. Deleting a file changes the directory, not the file, so it needs write permission on the directory only.",
    "A script needs read permission as well as execute, because the interpreter must open and read it; a compiled program needs only execute. New files get permissions from the umask, a mask of bits to remove. With the usual umask 022, new files are 644 and new directories are 755. A file system mounted with the noexec option refuses ./script.sh even when the x bit is set, but 'bash script.sh' still works because then only bash is executed."
  ],
  iq: [
    { q: "You run ./deploy.sh and get 'bad interpreter: No such file or directory', but bash is installed. What is wrong?", a: "The file has Windows line endings (CRLF). The kernel reads the shebang up to the line feed, so the interpreter name becomes 'bash' plus an invisible carriage-return character, and no such program exists. Convert the file to Unix line endings and stop your editor or Git from adding CRLF again.", c: `
file deploy.sh              # ... with CRLF line terminators
cat -A deploy.sh | head -2  # lines end with ^M$
dos2unix deploy.sh          # fix
` },
    { q: "Can you delete a file when you have no write permission on that file?", a: "Yes, if you have write and execute permission on the directory that contains it. Deleting removes the name from the directory, so it is a change to the directory. Write permission on the file itself controls only changing its content. (A directory with the sticky bit, such as /tmp, adds the rule that only the owner may delete.)" },
    { q: "What does chmod 750 mean, and what is a umask of 022?", a: "750 is rwx for the owner (4+2+1), r-x for the group (4+1) and nothing for others. The umask lists the bits that are removed when a file is created: 022 removes write for group and others. New files start from 666 and become 644; new directories start from 777 and become 755.", c: `
umask               # 0022
touch a.txt; mkdir d
ls -ld a.txt d      # -rw-r--r-- a.txt    drwxr-xr-x d
` },
    { q: "A script has execute permission but ./script.sh still says 'Permission denied'. Name possible causes.", a: "The file system may be mounted with noexec (common for /tmp and some shared volumes). You may lack read permission on the script, which the interpreter needs. Or a parent directory lacks x permission for you, so you cannot reach the file. Running 'bash script.sh' works in the noexec case, which helps you tell the causes apart." }
  ],
  tips: [
    "Add a .gitattributes file with the line '*.sh text eol=lf'. Then scripts edited on Windows keep Unix line endings and do not break in Linux containers.",
    "On Windows, Git cannot see the execute bit. Store it with 'git update-index --chmod=+x deploy.sh' (or 'git add --chmod=+x deploy.sh'), otherwise CI fails with 'Permission denied'.",
    "Run 'bash -n script.sh' to check the syntax without executing anything. It catches a missing 'fi' or 'done' before the script runs on a server.",
    "SSH refuses a private key that others can read. Run 'chmod 600 ~/.ssh/id_ed25519' and 'chmod 700 ~/.ssh'; this fixes the 'UNPROTECTED PRIVATE KEY FILE' error."
  ]
});

EXTRA(15, "Variables, quoting and arguments", {
  deep: [
    "Before a command runs, Bash rewrites the line in a fixed order: brace expansion, tilde expansion, then variable, command and arithmetic substitution, then word splitting, then filename expansion (globbing), and last it removes the quotes. Two facts follow. Brace expansion comes before variables, so {1..$n} does not work. Word splitting and globbing are applied to the result of an unquoted variable, so a value with spaces becomes several words and a value containing * is replaced by file names.",
    "Word splitting uses the characters in the IFS variable: space, tab and newline by default. Double quotes switch off splitting and globbing but keep $ expansion. Single quotes switch off everything. So quoting is not about the string type as in Python; it tells the shell which rewriting steps to skip.",
    "There are two kinds of variable. A shell variable lives only inside the current shell. An environment variable is one that was marked with export; when the shell starts a program, the kernel hands that program a copy of the exported variables. It is a copy, so a child can never change a variable in its parent. Command substitution $(...) runs in a subshell and removes the trailing newlines from the output, which is why you can use it directly in a string."
  ],
  iq: [
    { q: "What is the difference between $* and $@?", a: "Without quotes they behave the same and both are unsafe, because the arguments are split again on spaces. In double quotes they differ: the quoted $@ gives each argument as its own word, exactly as the caller passed them, while the quoted $* joins all arguments into one single word. Use the quoted $@ to pass arguments on; use the quoted $* only to build one message string.", c: `
set -- "my file.txt" second

for a in "$@"; do echo "[$a]"; done
# [my file.txt]
# [second]

for a in "$*"; do echo "[$a]"; done
# [my file.txt second]
` },
    { q: "What is the difference between single and double quotes?", a: "Inside double quotes the shell still replaces $variables and $(commands), but it does not split the result into words or expand wildcards. Inside single quotes nothing is replaced; every character is literal. Use double quotes around variables, and single quotes for fixed text that contains $ or other special characters, such as awk programs and regular expressions.", c: `
name="Anu"
echo "Hello $name, it is $(date +%H:%M)"    # expanded
echo 'Hello $name, it is $(date +%H:%M)'    # printed as written
` },
    { q: "Why does 'for i in {1..$n}' not loop from 1 to n?", a: "Brace expansion happens first, before variables are replaced. At that moment the shell sees the text $n, not a number, so it cannot build the list and leaves the braces as plain text. Use the C-style loop or seq instead.", c: `
n=3
for i in {1..$n}; do echo "$i"; done        # prints {1..3}

for ((i = 1; i <= n; i++)); do echo "$i"; done
for i in $(seq 1 "$n"); do echo "$i"; done
` },
    { q: "You set a variable in a script and run the script, but afterwards the variable is not set in your terminal. Why?", a: "The script runs in a child process with its own copy of the environment. When it ends, the copy is gone. A child can never change its parent, with or without export. To change your current shell you must run the file with source, which executes it inside the current shell." }
  ],
  tips: [
    "Use 'declare -p var' to see the exact content of a variable, including hidden spaces and newlines. It is the quickest way to find out why a comparison fails.",
    "Put -- before file-name variables, as in 'rm -- $file' with the variable in double quotes. Without the --, a file named '-rf' or '-n' is read as an option.",
    "Use printf '%s' with the quoted variable instead of echo when the data is not under your control. echo can treat values like -n or -e as options and print nothing.",
    "To set a variable for one command only, write it in front: 'APP_ENV=test ./run.sh'. The variable is exported to that command and does not stay in your shell."
  ]
});

EXTRA(15, "Conditions and tests", {
  deep: [
    "The single bracket [ is an ordinary command; there is even a program file /usr/bin/[. Its arguments go through normal word splitting and globbing before it sees them, and the closing ] is just its last argument. So if an unquoted variable is empty, it disappears and the command gets the wrong number of arguments. Inside [ ], the characters < and > are redirections, so [ $a > $b ] creates a file named after $b.",
    "The double bracket [[ is a shell keyword, parsed by Bash itself. Variables inside it are not split and not globbed, so missing quotes are much less dangerous. It adds && and ||, the < and > string comparison, pattern matching with ==, and regular expressions with =~. The price is that it works only in Bash, ksh and zsh, not in plain sh.",
    "Remember that < and > inside [[ ]] compare text, not numbers: as text, 10 is smaller than 9. For numbers use -lt and -gt, or the arithmetic form (( a > b )). Arithmetic has its own trap: (( expr )) returns exit code 1 when the result is 0, so a line like (( count++ )) with count at 0 counts as a failure and stops a script that uses 'set -e'. Finally, 'a && b || c' is not if/else: c also runs when b fails."
  ],
  iq: [
    { q: "What is the difference between [ ] and [[ ]]?", a: "[ is a normal command (the same as test) and works in every POSIX shell, but its arguments are split and globbed first, so unquoted or empty variables cause errors. [[ is Bash syntax: no word splitting inside, plus &&, ||, pattern matching and regular expressions. In Bash scripts prefer [[ ]]; in #!/bin/sh scripts you must use [ ] and quote everything.", c: `
name=""
[ $name = "anu" ] && echo yes       # error: unary operator expected
[[ $name = "anu" ]] && echo yes     # no error, simply false

file="report 2026.txt"
[ -f $file ]                        # error: too many arguments
[[ -f $file ]]                      # works
` },
    { q: "Is 'cmd1 && cmd2 || cmd3' the same as if/else?", a: "No. cmd3 runs when cmd1 fails, but also when cmd1 succeeds and cmd2 fails. With if/else the else branch depends only on the condition. Use the short form only when cmd2 cannot fail, such as a simple echo; otherwise write a real if.", c: `
true && false || echo "this runs, although the first command succeeded"
` },
    { q: "What does [ -f $file ] return when the variable file is empty?", a: "It returns true, which is the opposite of what you want. The empty unquoted variable vanishes, so the command is [ -f ]. With a single argument, test only checks that the argument is a non-empty string, and '-f' is non-empty. With double quotes around $file, the test gets an empty file name and correctly fails.", c: `
file=""
[ -f $file ] && echo "wrongly true"
[ -f "$file" ] || echo "correctly false"
` },
    { q: "Why is [[ 10 < 9 ]] true?", a: "Inside [[ ]] the < operator compares strings in dictionary order, and the character 1 comes before 9. Numbers must be compared with -lt, -gt and friends, or inside (( )). Mixing these up gives code that works for small numbers and breaks when a value gets one more digit.", c: `
[[ 10 < 9 ]] && echo "true as text"
[[ 10 -lt 9 ]] || echo "false as numbers"
(( 10 > 9 )) && echo "arithmetic form"
` }
  ],
  tips: [
    "Validate input before a numeric test: [[ $n =~ ^[0-9]+$ ]] || { echo 'not a number' >&2; exit 2; }. Otherwise -gt prints an error and the script continues with a wrong decision.",
    "In [[ $name == prod-* ]] the pattern on the right must be unquoted. If you quote it, the star is a literal character and the test is a plain string compare.",
    "Test a command directly: 'if grep -q ERROR app.log; then'. Do not wrap commands in brackets or compare their output to an empty string; the exit code is the answer.",
    "Learn the special exit codes: 126 is 'found but cannot execute', 127 is 'command not found', and 128+N means killed by signal N. Code 137 (128+9) in a container usually means the kernel killed it for using too much memory."
  ]
});

EXTRA(15, "Loops", {
  deep: [
    "Each part of a pipeline runs in its own child process (a subshell). So in 'cat file | while read line; do ...; done' the whole while loop runs in a child. It can change variables, but those changes are in the child's copy and vanish when the loop ends. Feed the loop with a redirection instead (done < file, or done < <(command)); then the loop runs in the main shell and its variables stay.",
    "The read command returns a non-zero exit code when it reaches the end of the input. If the last line of a file has no newline at the end, read still fills the variable but reports failure, so the loop body is skipped for that line. Another trap is standard input: every command inside the loop shares the loop's input. A command such as ssh or ffmpeg reads from it and eats the remaining lines, so the loop ends after the first round.",
    "A wildcard that matches nothing is not removed; the pattern stays as plain text, so 'for f in *.log' runs once with f set to the text *.log. The option 'shopt -s nullglob' makes such a pattern expand to nothing. Wildcards are safe with spaces because each matching file name becomes exactly one word. 'for f in $(ls)' is not safe, because the output of ls is split again on spaces. Also note that a redirection after 'done' opens the file once for the whole loop, which is faster and cleaner than appending inside the loop."
  ],
  iq: [
    { q: "Why does a variable set inside a while loop disappear when the loop is fed by a pipe?", a: "Every command in a pipeline runs in a subshell, a child copy of the shell. The loop changes the variable in the child, and the parent shell never sees it. Feed the loop with a redirection or process substitution so it runs in the current shell.", c: `
count=0
grep ERROR app.log | while read -r line; do count=$((count + 1)); done
echo "$count"        # 0  (the loop ran in a subshell)

count=0
while read -r line; do count=$((count + 1)); done < <(grep ERROR app.log)
echo "$count"        # the real number
` },
    { q: "A loop reads host names from a file and runs ssh for each one, but it stops after the first host. Why?", a: "ssh reads from standard input, and inside the loop standard input is the hosts file. The first ssh consumes all the remaining lines, so read finds nothing more. Give ssh the -n option or redirect its input from /dev/null.", c: `
while read -r host; do
    ssh -n "$host" uptime          # -n: do not read stdin
done < hosts.txt
` },
    { q: "Why is 'for f in $(ls *.txt)' a bad pattern?", a: "The output of ls is plain text, and the shell splits it on spaces, tabs and newlines. A file named 'my notes.txt' becomes two words. The wildcard alone already gives the correct list with one word per file, so write 'for f in *.txt' and put double quotes around $f when you use it." },
    { q: "A while-read loop skips the last line of a file. Why, and how do you fix it?", a: "The last line has no newline at its end. read stores the text in the variable but returns a failure code because it hit end of file, so the loop condition is false. Add a second test that runs the body when the variable is not empty.", c: `
while IFS= read -r line || [[ -n "$line" ]]; do
    echo "got: $line"
done < data.txt
` }
  ],
  tips: [
    "Put 'shopt -s nullglob' before loops over wildcards in Bash scripts. Then an empty folder gives zero rounds instead of one round with the literal pattern.",
    "For many files with any names, use find with null separators: find . -name '*.log' -print0 | xargs -0 -n 1 -P 4 gzip. -P 4 runs four jobs at once and -0 keeps names with spaces intact.",
    "Give every waiting loop a limit and a timeout per try, for example 'timeout 5 curl -fsS URL' and a maximum number of rounds. A loop without a limit hangs a CI job until the runner kills it.",
    "To run tasks in parallel, start each with & and save its PID from $!, then call 'wait PID' for each one and check the result. A bare 'wait' returns 0 even when a background job failed."
  ]
});

EXTRA(15, "Pipes and redirection", {
  deep: [
    "A file descriptor is a small number that a process uses for an open file, pipe or terminal: 0, 1 and 2 are the standard ones. A child process gets copies of its parent's descriptors. Redirection is done by the shell in the child, after fork and before exec: the shell opens the file and points the descriptor at it, and then starts the program. The program does not know it was redirected. This also means that 'sudo cmd > file' opens the file as you, not as root.",
    "'2>&1' means: make descriptor 2 point to the same place that descriptor 1 points to right now. It is a copy at that moment, not a permanent link. Redirections are processed from left to right, so the order changes the result. Also, '> file' empties the file before the command starts, which is why 'sort data.txt > data.txt' leaves you with an empty file.",
    "A pipe is a small buffer inside the kernel, 64 KB on Linux by default. All commands of a pipeline start at the same time. A writer that fills the buffer is paused until the reader takes data out, so a slow reader slows the whole line and memory use stays small. When a reader exits early, as head does, the writer receives the SIGPIPE signal on its next write and stops. One more surprise: many programs buffer their output in large blocks when it goes to a pipe instead of a terminal, so a live pipeline such as 'tail -f log | grep x | tee out' can look frozen."
  ],
  iq: [
    { q: "What does 2>&1 mean, and why does the order matter?", a: "It sends stderr (2) to wherever stdout (1) is pointing at that moment. The shell reads redirections left to right. In 'cmd > f 2>&1', stdout goes to the file first and then stderr copies that target, so both go to the file. In 'cmd 2>&1 > f', stderr copies the terminal first, and only stdout is then moved to the file.", c: `
ls /nope > out.log 2>&1     # error message is in out.log
ls /nope 2>&1 > out.log     # error message still on the screen
` },
    { q: "Why does 'sort data.txt > data.txt' produce an empty file?", a: "The shell handles the redirection before it starts sort. '>' opens data.txt and cuts it to zero bytes, and only then sort begins and reads an empty file. Write to a temporary file and rename it, or use the tool's own option for in-place output.", c: `
sort -o data.txt data.txt                  # sort can write back safely

grep -v DEBUG app.log > app.tmp && mv app.tmp app.log
` },
    { q: "Why does 'sudo echo 1 > /etc/protected.conf' fail with 'Permission denied'?", a: "The redirection is done by your own shell, as your user, before sudo runs. Only echo runs as root, and echo does not open the file. Let a root process open the file instead, for example tee.", c: `
echo "1" | sudo tee /etc/protected.conf > /dev/null
echo "1" | sudo tee -a /etc/protected.conf > /dev/null     # append
` },
    { q: "What is the exit code of 'false | true', and how do you find a failure inside a pipeline?", a: "It is 0. By default the exit code of a pipeline is the exit code of its last command, so earlier failures are hidden. 'set -o pipefail' makes the pipeline fail when any part fails. Bash also stores every exit code of the last pipeline in the PIPESTATUS array.", c: `
false | true; echo "$?"        # 0

set -o pipefail
false | true; echo "$?"        # 1
` }
  ],
  tips: [
    "To log everything a script prints, put this near the top: exec > >(tee -a /var/log/myjob.log) 2>&1. Every later command then writes to the screen and to the log file.",
    "Use a quoted marker, <<'EOF', when a here document contains $ signs that must stay as text, such as when you generate another script or an nginx config. With a plain EOF the shell replaces the variables.",
    "In live pipelines add 'grep --line-buffered' (or run a tool under 'stdbuf -oL'). Without it, output arrives in large blocks and it looks as if nothing is happening.",
    "Compare the output of two commands without temporary files: diff <(sort a.txt) <(sort b.txt). Each <( ) appears to diff as a file name."
  ]
});

EXTRA(15, "Text tools: grep, sed, awk, cut, sort", {
  deep: [
    "grep has three pattern languages. The default is basic regular expressions, where the characters +, ?, | and ( ) are plain text unless you put a backslash before them. With -E (extended) they have their special meaning directly. With -F the pattern is a fixed string with no special characters at all, which is the fastest and the safest choice for searching text that contains dots or brackets. Always put patterns in single quotes; otherwise the shell may expand * or $ before grep sees them. Also do not confuse wildcards and regular expressions: in a regular expression, * means 'repeat the previous character'.",
    "sed reads one line at a time into a buffer, applies your commands and prints the result. 'sed -i' does not really edit in place: it writes a new file and renames it over the old one. The file gets a new inode, so hard links break and a program that holds the old file open keeps writing to the old, now invisible, copy. On macOS, sed -i needs an argument for the backup suffix, so the same command can fail there.",
    "awk splits each line into fields on runs of spaces and tabs, and ignores leading spaces. cut splits on exactly one delimiter character, so two spaces in a row give an empty field. This is why awk is the right tool for the aligned output of commands like ps, df and ls -l. awk also has variables and arrays, so 'count per key' can be done in one pass without sort. sort itself can handle files bigger than memory by using temporary files, and its order depends on the locale; LC_ALL=C gives simple byte order and is much faster."
  ],
  iq: [
    { q: "Why must you run sort before uniq?", a: "uniq only compares each line with the line directly before it. It does not remember earlier lines. If equal lines are not next to each other, they are not merged and uniq -c shows several small counts. sort puts equal lines together so uniq can count them correctly.", c: `
echo a > t.txt; echo b >> t.txt; echo a >> t.txt     # three lines: a, b, a
uniq -c t.txt            # 1 a, 1 b, 1 a
sort t.txt | uniq -c     # 2 a, 1 b
` },
    { q: "grep 'ERROR|FATAL' app.log finds nothing, although both words are in the file. Why?", a: "Without options, grep uses basic regular expressions, where the | character is ordinary text. grep searches for the literal text ERROR|FATAL. Use -E so | means 'or', or give two patterns with -e.", c: `
grep -E 'ERROR|FATAL' app.log
grep -e 'ERROR' -e 'FATAL' app.log
` },
    { q: "When do you use awk instead of cut?", a: "Use cut when fields are separated by exactly one fixed character, such as a comma or a tab. Use awk when columns are separated by a varying number of spaces, when you need a condition, or when you need arithmetic. cut treats every single space as a separator, so with aligned output you get empty fields.", c: `
echo "anu    42" | cut -d ' ' -f 2       # empty
echo "anu    42" | awk '{print $2}'      # 42

df -h | awk '$5+0 > 80 {print $6, $5}'   # mount points over 80% full
` },
    { q: "How do you use a shell variable inside an awk program?", a: "Pass it with -v. The awk program should stay in single quotes so the shell does not touch awk's own $1, $2. If you switch to double quotes to let the shell insert a value, the shell also replaces $1 with the script's first argument and the program breaks.", c: `
limit=500
awk -v max="$limit" '$9 >= max {print $1, $9}' access.log
` }
  ],
  tips: [
    "Use grep -rn --include='*.py' TODO . to search only some file types, and grep -C 3 PATTERN FILE to see three lines before and after each match.",
    "Write 'sed -i.bak ...' in scripts. It works on both GNU and macOS sed and leaves a .bak copy, so a wrong pattern does not destroy the only copy of a config file.",
    "Print a range of lines from a huge file with: sed -n '1000,1020p' big.log. It is much faster than opening the file in an editor on a server.",
    "Do not parse real CSV with cut or awk -F ','. A quoted field with a comma inside shifts all columns. Use Python's csv module for such files.",
    "Skip a header line with 'tail -n +2 file.csv' before sort or awk, and sort a CSV column as numbers with: sort -t ',' -k 3,3n."
  ]
});

EXTRA(15, "Functions and exit codes", {
  deep: [
    "A function normally runs inside the current shell process. There is no fork, so it can change variables, change directory, and an 'exit' inside it ends the whole script. This changes when you call the function inside $( ) or as part of a pipeline: then it runs in a subshell. There, variable changes are lost and 'exit' ends only the subshell, so the main script continues.",
    "'local' uses dynamic scope, not the lexical scope of Python. A local variable is visible in the function that declares it and also in every function called from it. There is also a trap with exit codes: in 'local out=$(cmd)', the command 'local' itself succeeds and its exit code 0 replaces the exit code of cmd. A failure of cmd is hidden, even with 'set -e'. That is why careful scripts declare first and assign on the next line.",
    "An exit code is one byte, 0 to 255. 'return 256' gives 0, which looks like success. Some values have a fixed meaning: 126 means the file was found but could not be executed, 127 means command not found, and 128+N means the process was killed by signal N (130 is Ctrl+C, 137 is SIGKILL, 143 is SIGTERM). $? is replaced by every command, including echo and [[ ]], so copy it to a variable on the very next line if you need it later."
  ],
  iq: [
    { q: "With 'set -e' active, the line local out=$(failing_command) does not stop the script. Why?", a: "The exit code of the line is the exit code of 'local', which succeeded in creating the variable. The failure of the command substitution is thrown away. Split the line: declare first, assign second. Then the assignment carries the exit code of the command.", c: `
f() {
    local out=$(false)       # exit code 0: failure hidden
    echo "after first: $?"

    local out2
    out2=$(false)            # exit code 1: seen by set -e and by $?
    echo "after second: $?"
}
` },
    { q: "A function calls 'exit 1', but the script continues. How is that possible?", a: "The function was called inside a command substitution or a pipeline, so it ran in a subshell. exit ended only that subshell. The parent sees just a non-zero exit code of the substitution, which it ignores unless you check it or use 'set -e'.", c: `
get_port() { echo "no port configured" >&2; exit 1; }

port=$(get_port)
echo "still running"         # this line is reached

port=$(get_port) || exit 1   # correct: pass the failure on
` },
    { q: "What happens with 'return 256' or 'return 1000'?", a: "Exit codes are stored in 8 bits, so only 0 to 255 fit and larger values wrap around: 256 becomes 0 and 1000 becomes 232. A function that tries to return a count this way reports success at exactly 256. Use return only for status and print data to stdout." },
    { q: "What do exit codes 126, 127 and 137 tell you?", a: "126: the command was found but is not executable, usually a missing x permission. 127: the command was not found, often a PATH problem in cron or CI. 137 is 128+9: the process was killed with SIGKILL, which in containers usually means it went over its memory limit. Knowing these three codes saves a lot of log reading." }
  ],
  tips: [
    "Save the exit code at once: 'some_command; rc=$?'. Any command in between, even an echo for logging, overwrites $?.",
    "Keep one small helper in every script: a function named die that prints its arguments to stderr and then runs 'exit 1'. Then checks read clearly, as in: [[ -f $cfg ]] || die 'config file is missing'.",
    "Put the main work in a main function and call it on the last line, passing on all arguments (main followed by the quoted $@). If the file is only half copied or half downloaded, nothing runs.",
    "In a file that is meant to be sourced, use return, not exit. An exit in a sourced file closes the user's terminal or kills the calling script."
  ]
});

EXTRA(15, "Writing safe scripts", {
  deep: [
    "'set -e' has many exceptions. A failing command does not stop the script when it is the condition of if, while or until, when it comes before && or ||, when it is negated with !, or when it is any part of a pipeline except the last (without pipefail). The biggest surprise: if a function is called in one of those places, for example 'if myfunc; then' or 'myfunc || true', then set -e is switched off for every command inside that function. Command substitutions also do not inherit it unless you run 'shopt -s inherit_errexit' (Bash 4.4 or later).",
    "The strict options also produce false alarms. grep returns 1 when it finds no match, which is not an error for you but stops the script. With pipefail, 'some_command | head -1' can fail with code 141, because head exits early and the writer is stopped by SIGPIPE. You handle these cases on purpose with '|| true' or an explicit if. So strict mode is a safety net, not a replacement for checking the commands that matter.",
    "A trap runs code when a signal arrives or when the shell exits. 'trap ... EXIT' runs on a normal end, on an error exit, and in Bash also when the script is ended by Ctrl+C (SIGINT) or SIGTERM. Nothing can catch SIGKILL (kill -9), so no cleanup runs then. Bash handles a signal only after the current foreground command has finished, so a script that sits in 'sleep 3600' reacts late. In a container, a shell script running as process 1 does not pass SIGTERM on to the program it started; the last line should be 'exec program' so the program replaces the shell and gets the signal itself."
  ],
  iq: [
    { q: "What does 'set -e' NOT catch?", a: "It ignores failures in if/while conditions, on the left side of && and ||, after !, and in the earlier parts of a pipeline. It also ignores a failure hidden by 'local x=$(cmd)' or 'export x=$(cmd)'. And when a function is called as a condition, set -e is off for the whole body of that function. So you still need explicit checks for the important steps.", c: `
set -e

check() {
    false                        # does NOT stop the script here ...
    echo "check continues"
}

if check; then echo "ok"; fi     # ... because check runs as a condition
false | true                     # not caught without pipefail
echo "end reached"
` },
    { q: "A script with 'set -euo pipefail' stops at the line count=$(grep -c ERROR app.log) when the log has no errors. Why?", a: "grep exits with code 1 when nothing matches. For grep that is normal, but set -e treats any non-zero code as failure and ends the script. Say explicitly that 'no match' is fine.", c: `
count=$(grep -c ERROR app.log || true)
echo "errors: $count"            # errors: 0
` },
    { q: "Does a 'trap cleanup EXIT' run when the script is killed?", a: "It runs when the script ends by itself, fails, or receives SIGINT or SIGTERM. It does not run on SIGKILL (kill -9) or a power loss, because the kernel removes the process without telling it. So use 'kill PID' first and kill -9 only as a last resort, and make the next run able to clean up old leftovers." },
    { q: "'docker stop' takes 10 seconds and the application gets no chance to shut down cleanly. The container starts with a shell script. What is wrong?", a: "The shell script is process 1 and receives SIGTERM, but a shell does not forward signals to its child and keeps waiting for it. After the 10-second grace period Docker sends SIGKILL to everything. Start the application with exec on the last line, so the application replaces the shell, becomes process 1 and receives SIGTERM directly.", c: `
#!/bin/sh
set -e
./run-migrations.sh
exec python app.py       # app replaces the shell and gets the signals
` }
  ],
  tips: [
    "Add an error trap to see where a script failed: trap 'echo failed at line $LINENO >&2' ERR. With set -e alone the script just stops without a message.",
    "Stop two copies from running at once with flock: flock -n /tmp/backup.lock ./backup.sh. The second start exits at once instead of corrupting the work of the first.",
    "Before any rm -rf on a variable, check it: [[ -n $dir && $dir != / ]] || exit 1. set -u catches an unset variable but not one that is set to an empty string.",
    "Write output to a temporary file and then mv it to the final name. A rename inside one file system is atomic, so readers never see a half-written file.",
    "For debugging, run with 'bash -x' and set PS4='+ line $LINENO: ' first. Each traced command then shows its line number."
  ]
});

EXTRA(15, "Scheduling with cron, and environment", {
  deep: [
    "The cron daemon wakes up once a minute, reads the crontabs and starts every job whose five fields match the current time. It runs the command with /bin/sh, not Bash, and with a tiny environment: HOME, LOGNAME, SHELL=/bin/sh and a PATH that is often only /usr/bin:/bin. Your ~/.bashrc and ~/.bash_profile are not read. Whatever the job prints is sent by local mail to the owner, or thrown away if no mail system is installed, so a failing job is silent unless you redirect its output.",
    "Some crontab rules are surprising. The percent sign is special: cron turns % into a newline, so 'date +%F' inside a crontab line breaks unless each % has a backslash in front, or the command is moved into a script. If both day-of-month and day-of-week are set (not *), the job runs when either one matches, not both. cron does not look back: if the machine was off at the scheduled time, the run is lost. It also does not wait: if the last run is still working, cron starts a second copy.",
    "Times are in the local time zone of the server. On the day the clocks change, a job between 02:00 and 03:00 can be skipped or run twice, so many teams keep servers on UTC. About the environment in general: each process gets its own copy at start, taken from its parent. Changing a variable in one terminal never affects another running program. Environment variables are also easy to leak, because child processes get them and debugging tools can print them, so be careful with secrets."
  ],
  iq: [
    { q: "A script works when you run it by hand but fails under cron. How do you find the reason?", a: "The cause is nearly always the environment: a short PATH, /bin/sh instead of bash, a different working directory, or missing variables from your login files. First capture the output by adding '>> /tmp/job.log 2>&1' to the crontab line. Then reproduce cron's environment by hand with 'env -i' and run the script the same way.", c: `
# 1. see what cron really provides
* * * * * env > /tmp/cron-env.txt 2>&1

# 2. run the script by hand in an equally empty environment
env -i HOME="$HOME" PATH=/usr/bin:/bin /bin/sh -c '/opt/scripts/backup.sh'
` },
    { q: "When does a job with the schedule '0 0 1 * 1' run?", a: "At midnight on the first day of every month and also at midnight on every Monday. When both the day-of-month and the day-of-week fields are restricted, cron joins them with OR, not AND. To run only when the first of the month is a Monday, schedule the job on day 1 and test the weekday inside the script." },
    { q: "A cron job runs every minute, but one run sometimes takes three minutes. What happens, and how do you prevent problems?", a: "cron does not check whether the earlier run is finished. It starts a new copy every minute, so several copies work on the same data and the load grows. Wrap the job in flock so a new start exits when the lock is still held.", c: `
* * * * * flock -n /tmp/sync.lock /opt/scripts/sync.sh >> /var/log/sync.log 2>&1
` },
    { q: "Why does a crontab line with $(date +%F) in it fail?", a: "In a crontab, an unescaped % ends the command and the rest of the line is given to the command as standard input. The shell then sees a broken command with an unclosed parenthesis. Put a backslash before each % or, simpler, move the command into a script file and call the script from cron." }
  ],
  tips: [
    "Set the environment at the top of the crontab: a line 'SHELL=/bin/bash' and a line 'PATH=/usr/local/bin:/usr/bin:/bin'. This removes most 'works by hand, fails in cron' problems.",
    "Check that cron really started the job: 'grep CRON /var/log/syslog' on Debian and Ubuntu, /var/log/cron on Red Hat systems, or 'journalctl -u cron'. No line there means a schedule problem, not a script problem.",
    "Keep the crontab in a file in Git and install it with 'crontab mycron.txt'. 'crontab -r' deletes the whole table without asking, and r is next to e on the keyboard.",
    "Make the job print a start and end line with a timestamp into its log. On Monday you can then see at once which nights ran, how long they took and which one failed.",
    "For jobs that must not be missed after downtime, use a systemd timer with Persistent=true. It runs the missed job at the next boot, which cron does not do."
  ]
});
