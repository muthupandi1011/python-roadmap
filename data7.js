ROADMAP.push({
n: 14, track: "DevOps, data and design",
title: "PowerShell Basics",
blurb: "The Windows (and cross-platform) automation shell where commands pass objects, not text.",
topics: [
X("What PowerShell is",
["PowerShell is both a command-line shell and a scripting language made by Microsoft. It is the standard tool for automating Windows, Microsoft 365, Active Directory and Azure, and since version 6 it also runs on Linux and macOS.",
 "The one idea that makes PowerShell different from Bash or the old Command Prompt is that commands pass objects, not text. In Bash, a command prints lines of text and the next command has to cut that text apart to find, say, the third column. In PowerShell, Get-Process returns process objects with named properties such as Name, Id and CPU. The next command can simply ask for the CPU property. There is no text parsing, so scripts are shorter and break less often.",
 "There are two editions. Windows PowerShell 5.1 is built into Windows, runs on the old .NET Framework and is no longer developed. PowerShell 7 is the modern, open-source, cross-platform edition that you install separately; its program name is pwsh. New work should target PowerShell 7 unless a specific module only works in 5.1."],
["Windows PowerShell 5.1 = powershell.exe (built in). PowerShell 7 = pwsh (install it).",
 "Commands are called cmdlets and return .NET objects.",
 "Not case-sensitive: Get-Process and get-process are the same.",
 "Script files end in .ps1; you run one with ./script.ps1.",
 "$PSVersionTable shows which version you are in."],
"A Windows administrator has to create 200 user accounts from a spreadsheet, add each to the right groups and create a home folder. By hand that is two days of clicking; a 20-line PowerShell script does it in a minute and can be reused next month.",
`
# which version am I running?
$PSVersionTable.PSVersion

# objects, not text: the 5 processes using the most memory
Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 Name, Id, WorkingSet64

# properties and methods of an object
$today = Get-Date
$today.DayOfWeek
$today.AddDays(30).ToString("yyyy-MM-dd")

# install PowerShell 7 on Windows
# winget install Microsoft.PowerShell
`,
"PowerShell was designed by Jeffrey Snover, whose 2002 'Monad Manifesto' described a shell built on objects. Version 1.0 was released in 2006. In 2016 Microsoft made it open source and cross-platform; PowerShell Core 6 was released in 2018 and PowerShell 7 in 2020.",
[["PowerShell documentation", "https://learn.microsoft.com/en-us/powershell/"],
 ["What is PowerShell?", "https://learn.microsoft.com/en-us/powershell/scripting/overview"],
 ["PowerShell on GitHub", "https://github.com/PowerShell/PowerShell"]]),

X("Cmdlets and the help system",
["PowerShell commands are called cmdlets (pronounced 'command-lets'). Every cmdlet follows the same Verb-Noun naming pattern: Get-Process, Stop-Service, New-Item, Remove-Item, Set-Content. The verbs come from an approved list, so once you know that Get reads, Set changes, New creates and Remove deletes, you can guess the name of a command you have never used.",
 "You do not need to memorise commands, because PowerShell is built to be explored from inside. Three cmdlets are the key. Get-Command finds commands, with wildcards. Get-Help shows what a command does, its parameters and worked examples. Get-Member shows the properties and methods of whatever object a command returns, which tells you what you can do with it next.",
 "For familiarity, PowerShell has aliases: ls, dir, cd, cat, cp, mv, rm and others point to cmdlets. They are fine at the keyboard, but in scripts you should write the full cmdlet name so the script is clear and works the same on every system."],
["Pattern: Verb-Noun. Common verbs: Get, Set, New, Remove, Start, Stop, Test, Invoke, Import, Export.",
 "Get-Command *service*   finds commands. Get-Help Stop-Service -Examples   shows examples.",
 "Anything | Get-Member   lists that object's properties and methods.",
 "Parameters start with a dash: -Name, -Path, -Force. Tab completes names and parameters.",
 "-WhatIf shows what a command would do without doing it; -Confirm asks first."],
"An engineer needs to work with Windows scheduled tasks and has never done it in PowerShell. Get-Command *ScheduledTask* lists the cmdlets, Get-Help Register-ScheduledTask -Examples shows how to use one, and the job is done without leaving the terminal.",
`
# discover
Get-Command -Verb Get -Noun *Service*
Get-Command *firewall*

# learn
Get-Help Get-Service
Get-Help Get-Service -Examples
Update-Help                      # download the latest help (run as admin)

# inspect what comes back
Get-Service | Get-Member

# aliases
Get-Alias ls
Get-Alias -Definition Get-ChildItem

# safety net
Remove-Item ./old-logs -Recurse -WhatIf
`,
"The Verb-Noun convention and built-in discoverability were central to the original 2002 design. Microsoft publishes the list of approved verbs, and the Get-Verb cmdlet prints it.",
[["Discover PowerShell", "https://learn.microsoft.com/en-us/powershell/scripting/discover-powershell"],
 ["Approved verbs", "https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands"],
 ["Get-Help reference", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help"]]),

X("The object pipeline",
["The pipe symbol | sends the output of one command into the next. Because what travels down the pipe is objects, each stage can work with properties by name. Most everyday PowerShell is a short chain: get things, filter them, sort them, pick the columns you want, and output them.",
 "A handful of cmdlets do most of the work. Where-Object filters, keeping only the objects that pass a test. Select-Object picks properties or the first or last few items. Sort-Object orders them. Group-Object groups by a property. Measure-Object counts, sums and averages. ForEach-Object runs a block of code for each item. Inside those blocks, the automatic variable $_ means 'the current object'.",
 "Comparison operators are written as words with a dash, not symbols: -eq, -ne, -gt, -lt, -ge, -le, -like (wildcards), -match (regular expression), -contains, -in. This is a common stumbling block for people coming from other languages, because > in PowerShell means 'redirect output to a file'."],
["$_ (or $PSItem) is the current object in the pipeline.",
 "Filter early: put Where-Object, or better a cmdlet's own -Filter parameter, as far left as possible.",
 "Format-Table and Format-List are for display only; always put them last.",
 "Export with Export-Csv or ConvertTo-Json, not by formatting text.",
 "Operators: -eq -ne -gt -lt -like -match -and -or -not."],
"A server is running out of disk space. One pipeline finds every file over 500 MB under a folder, sorts them by size and lists the top 20 with size in gigabytes, and a second exports the list to CSV for the team.",
`
# services that are stopped but set to start automatically
Get-Service | Where-Object { $_.Status -eq "Stopped" -and $_.StartType -eq "Automatic" } | Select-Object Name, DisplayName

# the 20 biggest files under a folder
Get-ChildItem C:/Data -Recurse -File |
    Where-Object { $_.Length -gt 500MB } |
    Sort-Object Length -Descending |
    Select-Object -First 20 FullName, @{ Name = "SizeGB"; Expression = { [math]::Round($_.Length / 1GB, 2) } }

# group and count
Get-ChildItem . -File | Group-Object Extension | Sort-Object Count -Descending

# totals
Get-ChildItem . -File | Measure-Object Length -Sum -Average

# do something for each item
1..5 | ForEach-Object { $_ * $_ }
`,
"Pipes were invented for Unix by Doug McIlroy in 1973 and carried text. PowerShell's object pipeline (2006) was the first mainstream shell to pass structured data, an idea later followed by shells such as Nushell.",
[["Understanding the pipeline", "https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/04-pipelines"],
 ["about_Comparison_Operators", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comparison_operators"],
 ["Where-Object reference", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/where-object"]]),

X("Variables, data types, arrays and hashtables",
["Variables in PowerShell start with a dollar sign: $name. You create one by assigning to it; there is no declaration. PowerShell works out the type from the value, but because it sits on .NET, every value has a real type (string, int, datetime, bool and so on) and you can force one by writing it in square brackets, for example [int]$count = 5.",
 "Strings have an important rule. In double quotes, variables are expanded: \"Hello $name\" becomes Hello Anu. In single quotes, the text is literal: 'Hello $name' stays exactly as written. To put an expression or a property inside a double-quoted string, wrap it in $( ).",
 "Two collection types are used constantly. An array is an ordered list, written @(1, 2, 3) or just 1, 2, 3, and indexed from zero. A hashtable is a set of key-value pairs, written @{ Name = 'Anu'; Age = 30 }, like a Python dictionary. A hashtable cast with [pscustomobject] becomes a proper object with properties, which is how you build your own rows of data for output or CSV export."],
["Double quotes expand variables; single quotes do not.",
 "Use $( ) inside a string for expressions: \"Total: $($items.Count)\".",
 "Array: @(1,2,3), index with $a[0], last item $a[-1], length $a.Count.",
 "Hashtable: @{ key = value }, read with $h.key or $h['key'].",
 "Special values: $true, $false, $null. Environment variables: $env:PATH, $env:USERNAME.",
 "[pscustomobject]@{...} creates a structured record."],
"A script reads a list of server names, checks each one, and builds a custom object per server with its name, status and free disk space. The collection of objects is then exported straight to a CSV report with one command.",
`
$name = "Anu"
[int]$age = 30
$price = 99.5

"Hello $name, next year you will be $($age + 1)"     # expands
'Hello $name'                                         # literal

# arrays
$servers = @("web1", "web2", "db1")
$servers[0]
$servers.Count
$servers += "cache1"

# hashtables
$user = @{ Name = "Anu"; City = "Chennai" }
$user.Name
$user["Role"] = "Admin"

# custom objects make good report rows
$report = foreach ($s in $servers) {
    [pscustomobject]@{ Server = $s; Checked = (Get-Date); Online = $true }
}
$report | Format-Table

$env:USERNAME
$null -eq $missing
`,
"PowerShell's type system comes directly from .NET (2002). The [pscustomobject] shortcut was added in PowerShell 3.0 (2012), making structured output much easier than the earlier New-Object approach.",
[["about_Variables", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_variables"],
 ["Everything about arrays", "https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-arrays"],
 ["Everything about hashtables", "https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-hashtable"]]),

X("Conditions and loops",
["Control flow in PowerShell looks like C-family languages: conditions go in parentheses and blocks go in curly braces. The if / elseif / else statement makes decisions. The switch statement compares one value against many options and is cleaner than a long chain of elseif; it can also match wildcards and regular expressions.",
 "There are several loops. foreach ($item in $collection) is the one you will use most. for is the classic counter loop. while repeats while a condition is true, and do...while or do...until run the body at least once. break leaves a loop and continue jumps to the next round.",
 "Be aware of two things that look alike: the foreach statement and the ForEach-Object cmdlet. The statement loads the whole collection first and is faster. The cmdlet works inside a pipeline, handling items one at a time as they arrive, so it uses less memory on very large inputs."],
["Conditions use word operators: if ($x -gt 10), not if ($x > 10).",
 "Combine with -and, -or, -not (or !).",
 "Test-Path checks whether a file or folder exists; it is the most common condition in scripts.",
 "switch handles many cases cleanly and supports -Wildcard and -Regex.",
 "In PowerShell 7: ternary $a ? $b : $c, and the null-coalescing operator ??."],
"A nightly script checks free space on each drive. If it is under 10% it sends a critical alert, under 20% a warning, and otherwise logs 'OK'. It loops through all drives so nothing has to be changed when a disk is added.",
`
$freePercent = 14

if ($freePercent -lt 10) {
    "CRITICAL"
} elseif ($freePercent -lt 20) {
    "WARNING"
} else {
    "OK"
}

switch ((Get-Date).DayOfWeek) {
    "Saturday" { "Weekend" }
    "Sunday"   { "Weekend" }
    default    { "Weekday" }
}

foreach ($server in @("web1", "web2", "db1")) {
    if ($server -like "db*") { continue }
    "Checking $server"
}

for ($i = 1; $i -le 3; $i++) { "Attempt $i" }

$tries = 0
do {
    $tries++
    $ok = Test-Path "./ready.txt"
} until ($ok -or $tries -ge 5)

if (-not (Test-Path "./logs")) { New-Item -ItemType Directory -Path "./logs" | Out-Null }
`,
"The syntax was deliberately modelled on C# so that administrators could grow into .NET developers and vice versa. The ternary and null-coalescing operators were added in PowerShell 7.0 (2020).",
[["about_If", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_if"],
 ["about_Switch", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_switch"],
 ["about_Foreach", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_foreach"]]),

X("Functions and parameters",
["A function packages a piece of script under a name so it can be reused. You should name functions with the same Verb-Noun pattern as cmdlets, for example Get-DiskReport, so they feel like part of PowerShell.",
 "Inputs are declared in a param( ) block at the top of the function. Each parameter can have a type, a default value and attributes. [Parameter(Mandatory)] makes PowerShell prompt for the value if it is missing. Validation attributes such as [ValidateSet('Dev','Prod')] or [ValidateRange(1,100)] reject bad input before your code runs. Adding [CmdletBinding()] above the param block turns it into an 'advanced function' that supports the common parameters -Verbose, -ErrorAction, -Debug and others for free (-WhatIf and -Confirm need [CmdletBinding(SupportsShouldProcess)]).",
 "Output works differently from most languages. A function returns everything that is written to the output stream, not only what follows the return keyword. Any value left on a line by itself is output. This is a frequent source of bugs: a stray expression silently becomes part of the result. Use Write-Host or Write-Verbose for messages meant for people, and keep the output stream for data."],
["function Verb-Noun { [CmdletBinding()] param(...) ... }",
 "[Parameter(Mandatory)] forces a value; give others sensible defaults.",
 "[ValidateSet()], [ValidateRange()], [ValidateNotNullOrEmpty()] check input automatically.",
 "Everything output inside the function is returned; pipe unwanted output to Out-Null.",
 "Add comment-based help (.SYNOPSIS, .EXAMPLE) so Get-Help works on your function."],
"A support team keeps a Get-ServerHealth function in a shared module. Anyone can run 'Get-ServerHealth -ComputerName web1 -Verbose' and get the same checks in the same format, instead of each person having their own slightly different script.",
`
function Get-FolderSize {
    <#
    .SYNOPSIS
        Returns the total size of a folder.
    .EXAMPLE
        Get-FolderSize -Path C:/Data -Unit GB
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [ValidateSet("MB", "GB")]
        [string]$Unit = "MB"
    )

    if (-not (Test-Path $Path)) {
        throw "Folder not found: $Path"
    }

    Write-Verbose "Measuring $Path"
    $bytes = (Get-ChildItem $Path -Recurse -File | Measure-Object Length -Sum).Sum
    $divisor = if ($Unit -eq "GB") { 1GB } else { 1MB }

    [pscustomobject]@{
        Path = $Path
        Size = [math]::Round($bytes / $divisor, 2)
        Unit = $Unit
    }
}

Get-FolderSize -Path . -Unit MB -Verbose
`,
"Advanced functions, which let scripts behave like compiled cmdlets, were introduced in PowerShell 2.0 (2009). Before that, real cmdlets could only be written in C#.",
[["about_Functions", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions"],
 ["about_Functions_Advanced_Parameters", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced_parameters"],
 ["PowerShell 101: Functions", "https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/09-functions"]]),

X("Scripts, execution policy and modules",
["A PowerShell script is a text file with the extension .ps1. You run it by giving its path, such as ./deploy.ps1; unlike the old Command Prompt, PowerShell will not run a script from the current folder by bare name, as a safety measure. A script can take parameters with a param( ) block at the top, exactly like a function.",
 "On Windows, the execution policy controls whether scripts may run at all. On Windows client editions the default is Restricted, which blocks every script; this is why a new user's first script fails with 'running scripts is disabled on this system'. The usual setting for a workstation is RemoteSigned: scripts you write locally run, and scripts downloaded from the internet must be digitally signed. Execution policy is a guard against accidents, not a security boundary, since a user can bypass it.",
 "A module is a package of related functions, usually a .psm1 file with a .psd1 manifest. Modules are how PowerShell is extended: there are modules for Azure (Az), AWS, Active Directory, VMware and thousands more. The PowerShell Gallery is the public repository, and Install-Module downloads from it."],
["Run a script: ./script.ps1   (the ./ is required).",
 "See the policy: Get-ExecutionPolicy -List. Set it for yourself: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser.",
 "Find and install modules: Find-Module, Install-Module NAME -Scope CurrentUser, Import-Module, Get-Module -ListAvailable.",
 "Your profile script ($PROFILE) runs every time PowerShell starts; put your own functions and aliases there.",
 "Start scripts with Set-StrictMode -Version Latest to catch typos in variable names."],
"A developer downloads a setup script from the company wiki and it refuses to run. They learn the cause is the Restricted execution policy, set RemoteSigned for their user account, unblock the file, and it runs.",
`
# backup.ps1
param(
    [Parameter(Mandatory)][string]$Source,
    [string]$Destination = "./backup"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $Destination "backup-$stamp.zip"
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
Compress-Archive -Path $Source -DestinationPath $target
"Created $target"

# run it
# ./backup.ps1 -Source ./documents

# execution policy
Get-ExecutionPolicy -List
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
Unblock-File ./downloaded-script.ps1

# modules
Find-Module Az.Accounts
Install-Module Az -Scope CurrentUser
Get-Module -ListAvailable
`,
"Execution policy was introduced in PowerShell 1.0 (2006) in response to the script-borne viruses of the early 2000s, such as the ILOVEYOU worm. Modules arrived in version 2.0 (2009) and the PowerShell Gallery opened in 2014-2016.",
[["about_Execution_Policies", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies"],
 ["about_Modules", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_modules"],
 ["PowerShell Gallery", "https://www.powershellgallery.com/"]]),

X("Error handling",
["PowerShell has two kinds of errors, and the difference explains most confusion about try/catch. A terminating error stops the current command or script and can be caught. A non-terminating error is reported in red but the script carries on to the next item; this is the default for most cmdlets, so that one bad file in a list of a thousand does not stop the other 999.",
 "try { } catch { } finally { } only catches terminating errors. So a try block around a cmdlet often seems to do nothing: the cmdlet writes a non-terminating error and the catch block never runs. The fix is to add -ErrorAction Stop to the cmdlet, or set $ErrorActionPreference = 'Stop' at the top of the script, which turns every error into a terminating one.",
 "Inside a catch block, $_ holds the error record: $_.Exception.Message is the readable message. You raise your own errors with throw. External programs (git, docker, robocopy) do not raise PowerShell errors at all; you check the number in $LASTEXITCODE after they run, where zero conventionally means success."],
["Put $ErrorActionPreference = 'Stop' at the top of scripts so failures are not ignored.",
 "Use -ErrorAction Stop on a cmdlet to make its errors catchable.",
 "catch can target specific exception types; finally always runs, for cleanup.",
 "$Error holds recent errors; $? is true if the last command succeeded.",
 "For native programs, check $LASTEXITCODE."],
"A deployment script copies files, then restarts a service. Without error handling, a failed copy is ignored and the service restarts with half the files. With 'Stop' and try/catch, the script halts at the copy, logs the reason and exits with a failure code so the CI pipeline goes red.",
`
$ErrorActionPreference = "Stop"

try {
    $content = Get-Content "./config.json" -Raw
    $config = $content | ConvertFrom-Json
    "Loaded config for $($config.name)"
}
catch [System.Management.Automation.ItemNotFoundException] {
    Write-Warning "Config file is missing, using defaults"
}
catch {
    Write-Warning "Unexpected problem: $($_.Exception.Message)"   # Write-Error would itself stop the script here
    exit 1
}
finally {
    "Finished at $(Get-Date -Format T)"
}

# raise your own error
function Set-Discount([int]$Percent) {
    if ($Percent -lt 0 -or $Percent -gt 90) { throw "Discount must be 0-90, got $Percent" }
}

# external programs
git status
if ($LASTEXITCODE -ne 0) { throw "git failed with code $LASTEXITCODE" }
`,
"try/catch/finally was added in PowerShell 2.0 (2009), replacing the awkward 'trap' statement of version 1.0. The distinction between terminating and non-terminating errors exists because PowerShell was designed for bulk administration of many objects.",
[["about_Try_Catch_Finally", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_try_catch_finally"],
 ["Everything about exceptions", "https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-exceptions"],
 ["about_Preference_Variables", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables"]]),

X("Files, CSV, JSON and web requests",
["Much of practical scripting is moving data between files, formats and web services, and PowerShell makes this unusually easy because it converts between text formats and objects for you.",
 "For plain files, Get-Content reads, Set-Content writes and Add-Content appends. Get-ChildItem lists files and folders, and Copy-Item, Move-Item, Remove-Item and New-Item manage them. For structured data, Import-Csv turns each row of a CSV file into an object whose properties are the column headings, and Export-Csv does the reverse. ConvertFrom-Json and ConvertTo-Json do the same for JSON.",
 "For web APIs, Invoke-RestMethod sends an HTTP request and automatically converts a JSON response into objects, so you can read fields with a dot. Invoke-WebRequest gives you the raw response with status code and headers when you need them."],
["Get-Content FILE -Raw reads the whole file as one string (needed before ConvertFrom-Json).",
 "Always pass -Encoding utf8 when writing files that other tools will read.",
 "Import-Csv gives objects; every value is a string, so cast numbers with [int] or [decimal].",
 "ConvertTo-Json -Depth 10 avoids nested data being cut off (the default depth is 2).",
 "Join-Path builds paths correctly on both Windows and Linux."],
"HR sends a CSV of new employees. A script imports it, calls the company's REST API to create an account for each person, records the result of each call, and exports a results CSV to send back.",
`
# text files
Set-Content -Path ./notes.txt -Value "first line" -Encoding utf8
Add-Content -Path ./notes.txt -Value "second line"
Get-Content ./notes.txt

# CSV
$people = Import-Csv ./employees.csv           # columns: Name, Department, Salary
$people | Where-Object { [int]$_.Salary -gt 50000 } | Export-Csv ./high-earners.csv -NoTypeInformation

# JSON
$config = Get-Content ./config.json -Raw | ConvertFrom-Json
$config.database.host
@{ name = "shop"; replicas = 3 } | ConvertTo-Json -Depth 5 | Set-Content ./out.json -Encoding utf8

# REST API
$repo = Invoke-RestMethod -Uri "https://api.github.com/repos/PowerShell/PowerShell"
"$($repo.full_name) has $($repo.stargazers_count) stars"

$body = @{ title = "Test"; done = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "https://httpbin.org/post" -Method Post -Body $body -ContentType "application/json"
`,
"Invoke-RestMethod, Invoke-WebRequest and the JSON cmdlets were added in PowerShell 3.0 (2012), as web APIs became the normal way to manage cloud services.",
[["Invoke-RestMethod reference", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-restmethod"],
 ["Import-Csv reference", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/import-csv"],
 ["ConvertFrom-Json reference", "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertfrom-json"]])
]});

ROADMAP.push({
n: 15, track: "DevOps, data and design",
title: "Shell Scripting Basics (Bash)",
blurb: "The language of Linux servers, containers and CI pipelines: commands, pipes, variables, conditions, loops and safe scripts.",
topics: [
X("What a shell is, and why Bash",
["A shell is the program that reads the commands you type and asks the operating system to run them. When you open a terminal on Linux or macOS, or connect to a server over SSH, you are talking to a shell. A shell script is simply a file containing the commands you would have typed, so they can be run again at any time.",
 "Bash (the 'Bourne Again SHell') is the most common shell. It is the default on most Linux distributions and is what you get inside most Docker containers and CI runners. That is why shell scripting matters even to people who mainly write Python: Dockerfile RUN lines, CI pipeline steps, server start-up scripts and cron jobs are all shell.",
 "You will meet relatives of Bash. sh is the older, minimal POSIX shell; scripts written for it run almost anywhere, and very small container images such as Alpine have only this. zsh is the default interactive shell on macOS and is largely compatible. On Windows you can use Bash through WSL (Windows Subsystem for Linux) or Git Bash."],
["Everyday commands: pwd, ls, cd, cp, mv, rm, mkdir, cat, less, head, tail, touch, echo.",
 "'man COMMAND' or 'COMMAND --help' shows how a command works.",
 "Linux is case-sensitive: File.txt and file.txt are different files.",
 "Paths: / is the root, ~ is your home folder, . is the current folder, .. is the parent.",
 "'echo $SHELL' shows your login shell; 'bash --version' shows the Bash version."],
"A developer has to find out why a production server is slow. There is no graphical desktop, only an SSH connection. With a dozen shell commands they check disk space, find the largest log file, look at its last lines and identify the looping error.",
`
pwd                        # where am I?
ls -lah                    # list files with sizes, including hidden ones
cd /var/log                # change folder
mkdir -p ~/projects/demo   # create nested folders
cp notes.txt backup.txt    # copy
mv backup.txt archive/     # move or rename
rm -r old-folder           # delete a folder and its contents (no undo!)

cat app.log                # print a whole file
tail -n 50 app.log         # last 50 lines
tail -f app.log            # follow new lines as they are written
less app.log               # scroll through a big file (q to quit)

df -h                      # free disk space
du -sh *                   # size of each item here
man tail                   # manual page
`,
"The first Unix shell was written by Ken Thompson in 1971. Stephen Bourne's shell (sh, 1979) introduced scripting features. Brian Fox wrote Bash for the GNU Project in 1989 as a free replacement; the name is a pun on Bourne's.",
[["GNU Bash manual", "https://www.gnu.org/software/bash/manual/bash.html"],
 ["POSIX Shell Command Language", "https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html"],
 ["Install WSL on Windows", "https://learn.microsoft.com/en-us/windows/wsl/install"]]),

X("Your first script: shebang and permissions",
["A shell script is a text file. Two things turn it into something you can run like a program. The first line, called the shebang, tells the system which interpreter should execute the file. The file must also have execute permission.",
 "The shebang starts with the two characters #! followed by the path of the interpreter. '#!/bin/bash' uses Bash at its usual location. '#!/usr/bin/env bash' finds Bash wherever it is installed and is the more portable choice. If you only use basic features, '#!/bin/sh' runs on the widest range of systems.",
 "Linux files have three permissions (read, write, execute) for three groups (the owner, the group, everyone else). A new file is not executable. 'chmod +x script.sh' adds execute permission. You then run it as ./script.sh; the ./ is needed because the current folder is not in the list of places (the PATH) the shell searches for commands."],
["First line: #!/usr/bin/env bash",
 "chmod +x script.sh makes it executable; ./script.sh runs it.",
 "'bash script.sh' runs it without needing execute permission.",
 "ls -l shows permissions such as -rwxr-xr-x (owner: all; group and others: read and execute).",
 "chmod 755 = rwxr-xr-x (programs). chmod 644 = rw-r--r-- (ordinary files). chmod 600 = private files such as SSH keys.",
 "Lines starting with # are comments."],
"A team's deployment used to be eight commands copied from a wiki page, and people regularly missed one. They put them in deploy.sh; now everyone runs the same single command and the script is reviewed and versioned in Git.",
`
#!/usr/bin/env bash
# hello.sh - my first script

echo "Hello from $(hostname)"
echo "Today is $(date +%Y-%m-%d)"
echo "You are $(whoami), in $(pwd)"

# --- in the terminal ---
# chmod +x hello.sh
# ./hello.sh
#
# ls -l hello.sh
# -rwxr-xr-x 1 anu anu 142 Oct  5 10:00 hello.sh
`,
"The #! mechanism was added to Unix by Dennis Ritchie around 1980. The name 'shebang' probably comes from 'sharp' or 'hash' plus 'bang' (the exclamation mark). The permission model dates from the first Unix in the early 1970s.",
[["Bash manual: Shell Scripts", "https://www.gnu.org/software/bash/manual/html_node/Shell-Scripts.html"],
 ["GNU coreutils: chmod", "https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html"]]),

X("Variables, quoting and arguments",
["A variable is set with NAME=value, with no spaces around the equals sign, and read with a dollar sign: $NAME. The no-spaces rule surprises everyone once: 'name = Anu' is read as a command called 'name' with two arguments. All shell variables are text; there are no separate number types.",
 "Quoting is the most important thing to get right in shell scripting. Without quotes, the shell splits a value on spaces and expands wildcards, so a file called 'my report.txt' becomes two separate words and your command breaks or, worse, acts on the wrong files. Double quotes keep the value as one word while still expanding variables. Single quotes keep everything literal with no expansion. The safe habit is to put double quotes around every variable: \"$file\".",
 "Scripts receive arguments in special variables. $1, $2 and so on are the individual arguments, $0 is the script's name, \"$@\" is all the arguments (each kept as a separate word), and $? is the exit code of the last command. $(command) runs a command and substitutes its output, which is how you capture a result into a variable."],
["name=\"Anu\"   (no spaces around =).   echo \"$name\"",
 "Always quote: \"$var\" and \"$@\".",
 "Double quotes expand $variables; single quotes do not.",
 "today=$(date +%F) captures a command's output.",
 "Arithmetic: total=$((a + b))",
 "'export NAME=value' makes a variable visible to programs the script starts (an environment variable).",
 "Use lower-case names for your own variables; upper-case is conventionally for environment variables."],
"A backup script takes the folder to back up as its first argument. A user runs it on a folder named 'Client Files'. Because the script wrote \"$1\" in quotes, it works; an unquoted $1 would have tried to back up two folders, 'Client' and 'Files'.",
`
#!/usr/bin/env bash

name="Anu"
count=3
echo "Hello $name, you have $count messages"
echo 'Single quotes: $name is not expanded'

today=$(date +%F)
files=$(ls | wc -l)
echo "On $today there are $files items here"

total=$((count * 10 + 5))
echo "Total: $total"

# arguments:  ./script.sh report.txt 2026
echo "Script: $0"
echo "First:  $1"
echo "Second: $2"
echo "All:    $@"

# default value when an argument is missing
target="\${1:-./backup}"
echo "Target is $target"

export APP_ENV=production      # visible to child programs
`,
"Variables and positional parameters come from the Bourne shell (1979). The $(...) form of command substitution came from the Korn shell (ksh88, 1988) and replaced the harder-to-read backquotes.",
[["Bash manual: Shell Parameters", "https://www.gnu.org/software/bash/manual/html_node/Shell-Parameters.html"],
 ["Bash manual: Quoting", "https://www.gnu.org/software/bash/manual/html_node/Quoting.html"],
 ["Bash manual: Shell Expansions", "https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html"]]),

X("Conditions and tests",
["The shell's if statement works differently from most languages. It does not evaluate an expression; it runs a command and looks at whether that command succeeded. Every command returns an exit code when it finishes: 0 means success and anything else means failure. 'if' takes the 'then' branch when the exit code is 0.",
 "The tests you write in square brackets are themselves a command. In Bash, use the double-bracket form [[ ... ]], which is safer and more capable than the older single [ ... ]. The spaces inside the brackets are required. There are separate operators for text and for numbers: = and != compare strings, while -eq, -ne, -lt, -le, -gt and -ge compare integers. File tests are very common: -f (is a regular file), -d (is a directory), -e (exists), -r, -w, -x (readable, writable, executable), and -z and -n test whether a string is empty or not.",
 "Commands can be chained by their success: 'a && b' runs b only if a succeeded, and 'a || b' runs b only if a failed. The 'case' statement matches one value against several patterns and is the tidy way to handle options."],
["if [[ condition ]]; then ... elif ...; then ... else ... fi",
 "Strings: = != -z (empty) -n (not empty). Numbers: -eq -ne -lt -le -gt -ge.",
 "Files: -f file, -d directory, -e exists, -s not empty, -x executable.",
 "Combine with && and || inside [[ ]]; negate with !.",
 "mkdir -p out && cd out     (second runs only if the first worked)",
 "command || { echo \"failed\"; exit 1; }     (handle a failure)"],
"A start-up script checks that the configuration file exists and that the DATABASE_URL variable is set before starting the application. If either is missing it prints a clear message and exits with code 1, instead of starting and crashing with a confusing error later.",
`
#!/usr/bin/env bash

file="config.yml"

if [[ -f "$file" ]]; then
    echo "Config found"
elif [[ -d "config" ]]; then
    echo "Config is a folder"
else
    echo "No config, aborting" >&2
    exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
    echo "DATABASE_URL is not set" >&2
    exit 1
fi

usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [[ "$usage" -gt 90 ]]; then
    echo "Disk almost full: $usage%"
fi

case "$1" in
    start)   echo "Starting" ;;
    stop)    echo "Stopping" ;;
    restart) echo "Restarting" ;;
    *)       echo "Usage: $0 start|stop|restart"; exit 2 ;;
esac

# success of a command as the condition
if grep -q "ERROR" app.log; then
    echo "Errors found in the log"
fi
`,
"The 'test' command, also written [, dates from Unix Version 7 (1979). The [[ ]] form came from the Korn shell and was adopted by Bash. The unusual closing keywords 'fi' and 'esac' (if and case backwards) were Stephen Bourne's homage to ALGOL 68.",
[["Bash manual: Conditional Constructs", "https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html"],
 ["Bash manual: Bash Conditional Expressions", "https://www.gnu.org/software/bash/manual/html_node/Bash-Conditional-Expressions.html"]]),

X("Loops",
["Loops repeat commands. The for loop goes through a list of words: file names, server names, numbers. The list is often produced by a wildcard pattern such as *.log, which the shell expands to all matching file names. The while loop repeats as long as a command succeeds, and until is its opposite.",
 "The most useful while pattern reads a file line by line: 'while IFS= read -r line; do ... done < file'. It looks odd, but each part has a purpose: IFS= keeps leading spaces, -r keeps backslashes literal, and the < at the end feeds the file into the loop. This is the correct way to process a text file; looping over $(cat file) breaks on spaces.",
 "break leaves the loop and continue skips to the next round, as in other languages. A loop together with sleep is the standard way to wait for something, such as a database becoming ready before the application starts."],
["for x in a b c; do ...; done",
 "for f in *.txt; do ...; done     (wildcards expand to file names)",
 "for i in {1..5}; do ...; done     or     for ((i = 0; i < 5; i++)); do ...; done",
 "while [[ condition ]]; do ...; done",
 "while IFS= read -r line; do ...; done < file.txt",
 "Quote the loop variable when you use it: \"$f\"."],
"A script has to resize every image in a folder. A for loop over *.jpg runs the conversion command once per file. Another script waits in a loop, trying to connect to the database every 2 seconds for up to a minute, before running migrations.",
`
#!/usr/bin/env bash

for server in web1 web2 db1; do
    echo "Pinging $server"
done

for file in *.log; do
    [[ -e "$file" ]] || continue          # no matches: skip
    echo "$file has $(wc -l < "$file") lines"
done

for i in {1..3}; do
    echo "Attempt $i"
done

# read a file line by line
while IFS= read -r line; do
    echo "Host: $line"
done < servers.txt

# wait for a service, with a limit
tries=0
until curl -fsS http://localhost:8000/health > /dev/null; do
    tries=$((tries + 1))
    if [[ "$tries" -ge 30 ]]; then
        echo "Service did not start" >&2
        exit 1
    fi
    sleep 2
done
echo "Service is up"
`,
"for, while and until were all in the Bourne shell of 1979. Brace expansion such as {1..5} was added to Bash in version 3.0 (2004), and the C-style for loop in 2.04 (2000).",
[["Bash manual: Looping Constructs", "https://www.gnu.org/software/bash/manual/html_node/Looping-Constructs.html"],
 ["Bash manual: Brace Expansion", "https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html"]]),

X("Pipes and redirection",
["Every program on Linux has three standard channels. Standard input (stdin, number 0) is where it reads from, normally the keyboard. Standard output (stdout, number 1) is where it writes its results, normally the screen. Standard error (stderr, number 2) is a separate channel for error messages, also the screen by default. Keeping errors separate means you can save the results to a file and still see the errors.",
 "Redirection changes where these channels point. > sends output to a file, replacing its contents; >> appends. < takes input from a file. 2> redirects errors. '> file 2>&1' sends both output and errors to the same file. /dev/null is a special file that discards everything written to it, used to silence output.",
 "The pipe | connects the stdout of one command to the stdin of the next. This is the core of the Unix philosophy: small programs that each do one job well, combined into pipelines. Instead of one large program that finds the top ten IP addresses in a log, you chain five tiny ones."],
["cmd > file   overwrite.   cmd >> file   append.   cmd < file   read input from file.",
 "cmd 2> errors.log   errors only.   cmd > all.log 2>&1   everything.",
 "cmd > /dev/null 2>&1   run silently.",
 "a | b | c   output of each feeds the next.",
 "'tee file' writes to a file and passes the data on, so you can save and view at once.",
 "echo \"message\" >&2 writes a message to stderr, the right place for errors."],
"An operator wants to know which IP addresses are hitting a web server hardest. A single pipeline pulls the first column from the access log, sorts it, counts repeats, sorts by count and shows the top ten. It takes ten seconds to type.",
`
# save output and errors separately
./build.sh > build.log 2> build-errors.log

# everything in one file
./build.sh > build.log 2>&1

# append a line to a log
echo "$(date) backup finished" >> backup.log

# discard output
ping -c 1 example.com > /dev/null 2>&1 && echo "online"

# top 10 client IP addresses in a web log
cut -d ' ' -f 1 access.log | sort | uniq -c | sort -rn | head -10

# count error lines
grep "ERROR" app.log | wc -l

# watch output and save it at the same time
./deploy.sh 2>&1 | tee deploy.log

# feed several lines to a command (a 'here document')
cat > config.ini <<EOF
[app]
env=production
EOF
`,
"Pipes were proposed by Doug McIlroy and implemented by Ken Thompson in one night in 1973. McIlroy summarised the resulting philosophy: 'Write programs that do one thing and do it well. Write programs to work together.'",
[["Bash manual: Redirections", "https://www.gnu.org/software/bash/manual/html_node/Redirections.html"],
 ["Bash manual: Pipelines", "https://www.gnu.org/software/bash/manual/html_node/Pipelines.html"]]),

X("Text tools: grep, sed, awk, cut, sort",
["On Linux, almost everything is text: logs, configuration files, command output. A small set of text tools, combined with pipes, lets you search, slice and summarise that text without writing a program. These are among the most valuable commands to learn.",
 "grep finds lines that match a pattern; it answers 'which lines contain this?'. sed is a stream editor, most often used for search-and-replace across a file. awk treats each line as a row of fields (columns) and is ideal for picking out columns and doing sums. Around them are simpler helpers: cut extracts columns, sort orders lines, uniq removes or counts adjacent duplicates (so sort first), wc counts lines and words, head and tail take the start or end, tr translates or deletes characters, and find locates files by name, age or size.",
 "Patterns in grep, sed and awk are regular expressions. A little goes a long way: ^ is the start of a line, $ the end, . any character, * 'zero or more of the previous', and [0-9] a digit."],
["grep -i (ignore case), -r (search folders), -n (line numbers), -v (lines NOT matching), -c (count), -E (extended patterns).",
 "sed 's/old/new/g' file prints the changed text; add -i to change the file in place.",
 "awk '{print $1, $3}' prints columns 1 and 3; -F ',' sets the separator.",
 "sort -n numeric, -r reverse, -k 2 by column 2, -u unique.",
 "sort | uniq -c | sort -rn is the classic 'count and rank' pipeline.",
 "find . -name '*.log' -mtime +7 finds log files older than 7 days."],
"After a deployment, errors spike. An engineer greps the log for 'ERROR' in the last hour, uses awk to pull out the error-type column, and counts them. In under a minute they see that 95% are one message, 'connection refused', pointing at a database that did not restart.",
`
# search
grep "ERROR" app.log
grep -rn "TODO" src/                 # recursive, with line numbers
grep -c "ERROR" app.log              # how many
grep -v "DEBUG" app.log              # everything except DEBUG lines
grep -E "ERROR|FATAL" app.log        # either word

# replace
sed 's/localhost/db.internal/g' config.ini          # print the result
sed -i 's/DEBUG=true/DEBUG=false/' .env             # edit the file

# columns
awk '{print $1, $7}' access.log                     # fields 1 and 7
awk -F ',' '{sum += $3} END {print sum}' sales.csv  # total of column 3
awk '$9 >= 500' access.log                          # rows where field 9 is 500+
cut -d ',' -f 1,3 sales.csv

# rank the most common errors
grep "ERROR" app.log | awk '{print $4}' | sort | uniq -c | sort -rn | head -5

# find files
find /var/log -name "*.log" -mtime +7 -size +100M
find . -name "*.pyc" -delete
`,
"grep was written by Ken Thompson in 1973; its name comes from the editor command g/re/p, 'globally search for a regular expression and print'. sed is by Lee McMahon (1974). awk (1977) is named after its authors Aho, Weinberger and Kernighan.",
[["GNU grep manual", "https://www.gnu.org/software/grep/manual/grep.html"],
 ["GNU sed manual", "https://www.gnu.org/software/sed/manual/sed.html"],
 ["GNU awk user's guide", "https://www.gnu.org/software/gawk/manual/gawk.html"]]),

X("Functions and exit codes",
["A function gives a name to a group of commands so a script can reuse them and read more clearly. A shell function is defined as name() { commands; } and called like any other command, with arguments separated by spaces. Inside the function, the arguments appear as $1, $2 and \"$@\", just like a script's arguments.",
 "Functions do not return values the way they do in Python. 'return' sets only the function's exit code, a number from 0 to 255 that signals success or failure. To hand back data, the function prints it with echo and the caller captures it with result=$(myfunc). Variables inside a function are global unless you declare them with 'local', which you should nearly always do.",
 "Exit codes are how scripts communicate with whatever runs them. 'exit 0' means success and any other number means failure. CI systems, cron, Docker and other scripts all decide what to do next based on this number, so a script that fails must exit with a non-zero code. $? holds the exit code of the command that just ran."],
["Define: greet() { echo \"Hello $1\"; }    Call: greet Anu",
 "Use 'local' for variables inside functions.",
 "Return data by printing it; return status with 'return N' (0 = success).",
 "exit 0 = success; exit 1 = general error; exit 2 = wrong usage.",
 "$? = exit code of the last command.",
 "Send error messages to stderr with >&2."],
"A CI pipeline runs test.sh. The tests fail, but the script ends with an 'echo Done' line, whose success makes the script exit 0. The pipeline goes green and broken code is deployed. Proper exit codes, or 'set -e', would have stopped it.",
`
#!/usr/bin/env bash

log() {
    echo "[$(date +%T)] $*" >&2
}

is_installed() {
    command -v "$1" > /dev/null 2>&1      # exit code is the answer
}

file_size_mb() {
    local file="$1"
    local bytes
    bytes=$(wc -c < "$file")
    echo $((bytes / 1024 / 1024))         # 'return' data by printing it
}

main() {
    if ! is_installed docker; then
        log "docker is not installed"
        return 1
    fi
    log "docker found"
    local size
    size=$(file_size_mb "$0")
    log "this script is $size MB"
}

main "$@"
exit $?
`,
"Functions were added to the Bourne shell in 1984. The convention that 0 means success goes back to the earliest Unix: there is one way to succeed and many ways to fail, so the non-zero values can say which.",
[["Bash manual: Shell Functions", "https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html"],
 ["Bash manual: Exit Status", "https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html"]]),

X("Writing safe scripts",
["By default Bash is dangerously forgiving. If a command in the middle of a script fails, Bash carries on with the next line. If you misspell a variable name, Bash treats it as an empty string. The famous disaster is 'rm -rf \"$FOLDER/\"' with FOLDER unset, which becomes 'rm -rf /'. A few lines at the top of every script remove most of this danger.",
 "'set -e' makes the script exit as soon as a command fails (with exceptions: commands tested by if or while, or followed by && or ||, do not trigger it). 'set -u' makes using an undefined variable an error. 'set -o pipefail' makes a pipeline fail if any command in it fails, not only the last one. They are usually written together as 'set -euo pipefail'. A 'trap' registers a command to run when the script exits, for any reason, which is the right way to clean up temporary files.",
 "Beyond that: quote your variables, validate arguments before doing anything destructive, and check scripts with ShellCheck, a free tool that points out bugs and risky constructs. For anything longer than about a hundred lines or with complicated data, switch to Python."],
["Start scripts with: set -euo pipefail",
 "Quote every variable: \"$var\".",
 "trap 'cleanup commands' EXIT   runs on any exit, including errors.",
 "Use mktemp for temporary files, never fixed names in /tmp.",
 "Check arguments first and print a usage message if they are wrong.",
 "Run 'shellcheck script.sh', ideally in CI.",
 "'bash -x script.sh' prints each command as it runs, for debugging."],
"A cleanup script contained 'cd \"$BUILD_DIR\"' followed by 'rm -rf *'. One day BUILD_DIR was not set. The cd with an empty value silently did nothing, and the script deleted everything in the folder it happened to be in. With 'set -u' it would have stopped at the unset variable, and an explicit check that the value is not empty makes it safer still.",
`
#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "Usage: $0 SOURCE_DIR" >&2
    exit 2
}

[[ "$#" -eq 1 ]] || usage
src="$1"
[[ -d "$src" ]] || { echo "Not a directory: $src" >&2; exit 1; }

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT          # always clean up

echo "Working in $workdir"
tar czf "$workdir/backup.tar.gz" -C "$src" .
mv "$workdir/backup.tar.gz" "./backup-$(date +%F).tar.gz"
echo "Backup complete"

# check the script
# shellcheck backup.sh
# bash -x backup.sh ./data
`,
"The combination 'set -euo pipefail' is often called Bash 'strict mode', a name popularised by Aaron Maxwell's 2014 article. ShellCheck was created by Vidar Holen in 2012.",
[["Bash manual: The Set Builtin", "https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html"],
 ["ShellCheck", "https://www.shellcheck.net/"],
 ["Google Shell Style Guide", "https://google.github.io/styleguide/shellguide.html"]]),

X("Scheduling with cron, and environment",
["Scripts become really useful when they run by themselves. cron is the classic Linux scheduler. Each user has a crontab (cron table) listing commands and when to run them. You edit it with 'crontab -e' and list it with 'crontab -l'.",
 "A schedule is five fields followed by the command: minute, hour, day of month, month, day of week. A star means 'every'. So '0 2 * * *' is 02:00 every day, '*/15 * * * *' is every 15 minutes, and '0 9 * * 1-5' is 09:00 on weekdays. The most common cron problem is that jobs run in a very bare environment: a minimal PATH, no variables from your login shell, and a different working directory. A script that works when you run it by hand can fail under cron for that reason.",
 "Environment variables are the standard way to give configuration to programs: which database to use, which mode to run in. PATH is the list of folders searched for commands. Variables set with 'export' in ~/.bashrc are loaded for interactive shells. On modern systems, systemd timers are an alternative to cron with better logging."],
["Fields: minute hour day-of-month month day-of-week command.",
 "Use absolute paths in cron jobs, and redirect output to a log file.",
 "'env' or 'printenv' lists environment variables; 'echo $PATH' shows the search path.",
 "export PATH=\"$HOME/bin:$PATH\" adds a folder to the path.",
 "'which CMD' or 'command -v CMD' shows where a command comes from.",
 "Run something in the background with & and keep it after logout with nohup."],
"A database backup script runs every night at 02:00 through cron, writes to a dated file, deletes backups older than 14 days, and appends its output to a log. On Monday the team can read the log to confirm every night's backup ran.",
`
# edit the schedule:  crontab -e
#
#  min hour dom mon dow  command
   0   2    *   *   *    /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
   */15 *   *   *   *    /opt/scripts/healthcheck.sh
   0   9    *   *   1-5  /opt/scripts/daily-report.sh
   0   0    1   *   *    /opt/scripts/monthly-cleanup.sh

# list the schedule
crontab -l

# environment
env | sort
echo "$PATH"
export APP_ENV=production
export PATH="$HOME/bin:$PATH"
command -v python3

# make settings permanent for your user
echo 'export EDITOR=nano' >> ~/.bashrc
source ~/.bashrc

# run in the background and keep running after logout
nohup ./long-job.sh > job.log 2>&1 &
`,
"cron first appeared in Unix Version 7 (1979); the widely used version was written by Paul Vixie in 1987. The name comes from Chronos, the Greek word for time. Environment variables were also introduced in Version 7.",
[["crontab(5) manual page", "https://man7.org/linux/man-pages/man5/crontab.5.html"],
 ["Bash manual: Bash Startup Files", "https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html"],
 ["systemd timers", "https://man7.org/linux/man-pages/man5/systemd.timer.5.html"]])
]});

ROADMAP.push({
n: 16, track: "DevOps, data and design",
title: "Networking Basics",
blurb: "How computers find and talk to each other: addresses, DNS, TCP, HTTP, TLS, firewalls and the tools to troubleshoot them.",
topics: [
X("How networks are layered: OSI and TCP/IP",
["Sending data between two computers involves many separate problems: turning bits into electrical or radio signals, finding a route across the world, making sure nothing is lost, and agreeing what the data means. Networking handles this by splitting the work into layers. Each layer solves one problem and relies on the layer below, without needing to know how that layer does its job.",
 "The OSI model describes seven layers and is the vocabulary everyone uses: 1 Physical (cables, radio), 2 Data Link (Ethernet, Wi-Fi, MAC addresses), 3 Network (IP addresses, routing), 4 Transport (TCP and UDP, ports), 5 Session, 6 Presentation, and 7 Application (HTTP, DNS, SMTP). When someone says 'a layer 4 load balancer' or 'a layer 7 firewall', they mean it works with TCP connections or with HTTP requests respectively.",
 "The TCP/IP model is what the internet actually uses and has four layers: Link, Internet (IP), Transport (TCP/UDP) and Application. When you send data, each layer wraps it with its own header, like putting a letter in an envelope and the envelope in a parcel. This is called encapsulation. The receiver unwraps them in reverse order."],
["Layer 2: MAC addresses, switches, the local network.",
 "Layer 3: IP addresses, routers, getting between networks.",
 "Layer 4: TCP and UDP, ports, connections.",
 "Layer 7: application protocols such as HTTP, DNS, SSH.",
 "Data unit names: frame (L2), packet (L3), segment (L4).",
 "Troubleshoot from the bottom up: is it connected? does it have an IP? can it reach the host? is the port open? does the application answer?"],
"A website will not load. Thinking in layers gives an order of checks: Wi-Fi connected (layers 1-2), ping to the server's IP works (layer 3), the connection to port 443 opens (layer 4), but the HTTP response is a 502 error (layer 7). The fault is in the application, not the network.",
`
#  OSI layer            TCP/IP layer     Examples
#  7 Application   \\
#  6 Presentation   >   Application      HTTP, DNS, SSH, SMTP, TLS
#  5 Session       /
#  4 Transport          Transport        TCP, UDP          (ports)
#  3 Network            Internet         IP, ICMP          (IP addresses)
#  2 Data Link     \\
#  1 Physical       >   Link             Ethernet, Wi-Fi   (MAC addresses)
#
#  Encapsulation of one web request:
#  [Ethernet header [IP header [TCP header [HTTP request ]]]]
`,
"TCP/IP was designed by Vint Cerf and Bob Kahn in 1974 and became the standard of the ARPANET on 1 January 1983, often called the birthday of the internet. The OSI model was published by ISO in 1984; its protocols lost to TCP/IP but its seven-layer vocabulary survived.",
[["RFC 1122: Requirements for Internet Hosts", "https://www.rfc-editor.org/rfc/rfc1122"],
 ["Cloudflare Learning: the OSI model", "https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/"],
 ["Internet Engineering Task Force (IETF)", "https://www.ietf.org/"]]),

X("IP addresses, subnets and CIDR",
["Every device on a network needs an address so data can be delivered to it, just as a house needs a postal address. An IPv4 address is a 32-bit number written as four numbers from 0 to 255 separated by dots, such as 192.168.1.20. That gives about 4.3 billion addresses, which the world has run out of. IPv6 uses 128-bit addresses written in hexadecimal, such as 2001:db8::1, giving a practically unlimited supply.",
 "An address has two parts: the network part (like the street) and the host part (like the house number). The subnet mask, usually written in CIDR notation as a slash and a number, says how many of the 32 bits belong to the network. In 192.168.1.0/24, the first 24 bits are the network, leaving 8 bits for hosts: 256 addresses, of which 254 are usable (the first is the network address and the last is the broadcast address). A smaller number after the slash means a bigger network: /16 has 65,536 addresses, /28 has 16.",
 "Some ranges are reserved as private addresses that are used inside homes, offices and cloud networks and are not reachable from the internet: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. The address 127.0.0.1, called localhost, always means 'this machine itself'. Devices in the same subnet talk directly; to reach another network they send traffic to the default gateway, a router."],
["/24 = 256 addresses, /16 = 65,536, /32 = exactly one address, /0 = everything.",
 "Number of addresses = 2 to the power (32 minus the prefix).",
 "Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
 "127.0.0.1 (localhost) is this machine; 0.0.0.0 means 'all interfaces' when a server listens.",
 "Public IP: reachable on the internet. Private IP: only inside its own network.",
 "In cloud networks you choose a CIDR block for the network and divide it into subnets."],
"A team designs a cloud network as 10.0.0.0/16 and divides it: 10.0.1.0/24 for public web servers, 10.0.2.0/24 for private application servers and 10.0.3.0/24 for databases. Firewall rules then say 'only the application subnet may reach the database subnet'.",
`
# your addresses
ip addr                # Linux
ipconfig               # Windows

# CIDR calculations with Python's standard library
import ipaddress

net = ipaddress.ip_network("10.0.1.0/24")
print(net.num_addresses)            # 256
print(net.netmask)                  # 255.255.255.0
print(net.network_address)          # 10.0.1.0
print(net.broadcast_address)        # 10.0.1.255
print(list(net.hosts())[:3])        # first usable hosts

print(ipaddress.ip_address("10.0.1.57") in net)        # True
print(ipaddress.ip_address("192.168.1.5").is_private)  # True

# split a /16 into /24 subnets
big = ipaddress.ip_network("10.0.0.0/16")
print(list(big.subnets(new_prefix=24))[:3])
`,
"IPv4 was defined in RFC 791 in 1981. Addresses were first handed out in fixed classes A, B and C, which wasted huge numbers; CIDR replaced that in 1993. IPv6 was standardised in 1998, and the central pool of IPv4 addresses ran out in 2011.",
[["RFC 791: Internet Protocol", "https://www.rfc-editor.org/rfc/rfc791"],
 ["RFC 1918: Private address ranges", "https://www.rfc-editor.org/rfc/rfc1918"],
 ["RFC 4632: CIDR", "https://www.rfc-editor.org/rfc/rfc4632"]]),

X("DNS: names to addresses",
["People remember names; computers route by numbers. The Domain Name System (DNS) is the internet's phone book: it translates a name such as www.example.com into an IP address. Almost every network action starts with a DNS lookup, which is why 'it is always DNS' is a running joke among engineers when something breaks.",
 "DNS is a hierarchy read from right to left. When you look up www.example.com, your computer asks a resolver (run by your internet provider, or a public one such as 8.8.8.8 or 1.1.1.1). If the resolver does not have the answer cached, it asks a root server, which points to the servers for .com, which point to the authoritative name servers for example.com, which give the final answer. The result is cached for a period set by the record's TTL (time to live), so the next lookup is instant.",
 "DNS stores several types of records. An A record maps a name to an IPv4 address and AAAA to IPv6. CNAME makes one name an alias for another. MX names the mail servers for a domain. TXT holds free text, used for verification and email security. NS lists the domain's name servers."],
["A = IPv4 address. AAAA = IPv6. CNAME = alias. MX = mail server. TXT = text. NS = name servers.",
 "TTL is how long an answer may be cached. Lower it before a planned change so the change spreads quickly.",
 "DNS changes are not instant everywhere, because old answers stay cached until their TTL expires.",
 "The hosts file (/etc/hosts, or C:/Windows/System32/drivers/etc/hosts) overrides DNS on one machine.",
 "DNS normally uses UDP port 53.",
 "Tools: nslookup, dig, host."],
"A company moves its website to a new server. Two days before, they lower the DNS TTL from 24 hours to 5 minutes. On the day they change the A record, and within 5 minutes nearly all visitors reach the new server. Then they raise the TTL again.",
`
# look up a name
nslookup example.com
dig example.com               # Linux and macOS
dig +short example.com A
dig example.com MX
dig +trace example.com        # follow the whole chain from the root

# ask a specific resolver
nslookup example.com 1.1.1.1

# in Python
import socket
print(socket.gethostbyname("example.com"))
print(socket.getaddrinfo("example.com", 443)[0][4])

# example zone records
# example.com.      300  IN  A      93.184.215.14
# www.example.com.  300  IN  CNAME  example.com.
# example.com.      3600 IN  MX     10 mail.example.com.
# example.com.      3600 IN  TXT    "v=spf1 include:_spf.google.com ~all"
`,
"Before DNS, every computer on the ARPANET downloaded one shared file, HOSTS.TXT, maintained by hand at the Stanford Research Institute (SRI). Paul Mockapetris designed DNS in 1983 to replace it, and it has scaled from a few hundred hosts to billions.",
[["RFC 1034: Domain Names, Concepts and Facilities", "https://www.rfc-editor.org/rfc/rfc1034"],
 ["Cloudflare Learning: What is DNS?", "https://www.cloudflare.com/learning/dns/what-is-dns/"],
 ["ICANN: DNS basics", "https://www.icann.org/resources/pages/dns-2022-09-13-en"]]),

X("TCP, UDP and ports",
["IP gets a packet to the right machine, but it makes no promises: packets can be lost, duplicated or arrive out of order. And a machine runs many programs, so something must say which program the data is for. The transport layer solves both, with two protocols that make opposite trade-offs.",
 "TCP (Transmission Control Protocol) is reliable. Before sending data, the two sides set up a connection with a three-way handshake: SYN, SYN-ACK, ACK. TCP then numbers every byte, has the receiver acknowledge what arrives, resends anything lost, puts data back in order, and slows down when the network is congested. The application simply sees a dependable stream of bytes. The price is extra delay. Web pages, APIs, email, file transfer, SSH and databases all use TCP.",
 "UDP (User Datagram Protocol) is minimal: it sends individual messages with no connection, no acknowledgement and no ordering. It is faster and suits cases where a late packet is useless anyway, such as voice and video calls, online games and DNS lookups. A port is a number from 0 to 65535 that identifies a program on a machine. An IP address plus a port is called a socket. Servers listen on well-known ports so clients know where to find them."],
["TCP: connection, reliable, ordered, slower to start. UDP: no connection, no guarantees, fast.",
 "Common ports: 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS, 25 SMTP, 3306 MySQL, 5432 PostgreSQL, 6379 Redis, 27017 MongoDB, 3389 RDP.",
 "Ports below 1024 are 'well-known' and need administrator rights to listen on.",
 "'Connection refused' = the machine answered but nothing is listening on that port.",
 "'Connection timed out' = no answer at all, usually a firewall or wrong address.",
 "HTTP/3 runs on QUIC, which is built on UDP."],
"An application cannot reach its database. The error is 'connection timed out', not 'connection refused'. That one word tells the engineer the packets are being dropped on the way, and the cause turns out to be a firewall rule that does not allow port 5432 from the application's subnet.",
`
# which ports is this machine listening on?
ss -tlnp                         # Linux
netstat -ano | findstr LISTENING # Windows

# is a remote port open?
nc -zv db.example.com 5432       # Linux / macOS
Test-NetConnection db.example.com -Port 5432    # PowerShell

# a tiny TCP server and client in Python
import socket

# server
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.bind(("0.0.0.0", 9000))
srv.listen()
conn, addr = srv.accept()            # waits for a client
print("connected from", addr)
conn.sendall(b"hello")
conn.close()

# client (run in another terminal)
# c = socket.create_connection(("localhost", 9000), timeout=5)
# print(c.recv(1024))
`,
"TCP was specified in 1974 by Vint Cerf and Bob Kahn and split into separate TCP and IP layers in 1978. UDP was defined by David Reed in 1980. The current TCP specification, RFC 9293, was published in 2022, consolidating 40 years of updates.",
[["RFC 9293: Transmission Control Protocol", "https://www.rfc-editor.org/rfc/rfc9293"],
 ["RFC 768: User Datagram Protocol", "https://www.rfc-editor.org/rfc/rfc768"],
 ["IANA port number registry", "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml"]]),

X("HTTP and HTTPS",
["HTTP (HyperText Transfer Protocol) is the language of the web and of most APIs. It is a simple request-response protocol: a client sends a request, and the server sends back a response. Each request stands alone; the server does not remember earlier ones (HTTP is 'stateless'), which is why cookies and tokens exist to carry identity from one request to the next.",
 "A request has a method, a path, headers and sometimes a body. The method says what you want to do: GET reads, POST creates, PUT replaces, PATCH changes part, DELETE removes. Headers carry extra information such as the content type and credentials. The response has a status code, headers and a body. Status codes are grouped: 2xx success, 3xx redirect, 4xx the client made a mistake, 5xx the server failed.",
 "HTTPS is HTTP sent through an encrypted TLS connection, on port 443 instead of 80. It stops others on the network from reading or changing the traffic and proves the server is who it claims to be. HTTP/1.1 sends one request at a time per connection; HTTP/2 sends many at once over one connection; HTTP/3 does the same over QUIC and UDP for faster starts and better behaviour on poor networks."],
["Methods: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE.",
 "200 OK, 201 Created, 204 No Content, 301/302 redirect, 304 Not Modified.",
 "400 Bad Request, 401 not logged in, 403 not allowed, 404 Not Found, 409 Conflict, 429 Too Many Requests.",
 "500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.",
 "Important headers: Content-Type, Authorization, Accept, Cache-Control, Cookie / Set-Cookie, User-Agent.",
 "GET, PUT and DELETE should be idempotent (safe to repeat); POST is not."],
"A mobile app shows 'something went wrong'. The developer looks at the API call: status 401. That means the login token expired, a client-side matter, not a server crash. Had it been 502, they would have looked at the server behind the load balancer instead.",
`
# see the full conversation
curl -v https://example.com
curl -I https://example.com                       # headers only

# call a JSON API
curl -X POST https://httpbin.org/post -H "Content-Type: application/json" -d '{"item": "pen", "qty": 2}'

# what the raw messages look like
# --- request ---
# GET /orders/1042 HTTP/1.1
# Host: api.shop.com
# Authorization: Bearer eyJhbGciOi...
# Accept: application/json
#
# --- response ---
# HTTP/1.1 200 OK
# Content-Type: application/json
# Cache-Control: no-store
#
# {"id": 1042, "status": "shipped"}

# in Python
import httpx
r = httpx.get("https://httpbin.org/get", params={"page": 2}, timeout=5)
print(r.status_code, r.headers["content-type"])
print(r.json())
`,
"Tim Berners-Lee invented HTTP at CERN in 1989-1991 together with HTML and the first web browser. HTTP/1.1 was standardised in 1997, HTTP/2 in 2015 (from Google's SPDY) and HTTP/3 in 2022.",
[["MDN: HTTP", "https://developer.mozilla.org/en-US/docs/Web/HTTP"],
 ["RFC 9110: HTTP Semantics", "https://www.rfc-editor.org/rfc/rfc9110"],
 ["MDN: HTTP response status codes", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status"]]),

X("TLS and certificates",
["TLS (Transport Layer Security) is the protocol that puts the S in HTTPS. It gives three guarantees. Encryption: nobody between you and the server can read the data. Integrity: nobody can change it without detection. Authentication: you are really talking to the site you asked for, not an impostor. People still say 'SSL', which was the name of its obsolete predecessor.",
 "Authentication rests on certificates. A certificate is a small file that binds a domain name to a public key and is digitally signed by a Certificate Authority (CA). Your operating system and browser ship with a list of CAs they trust. When you connect, the server presents its certificate, and your browser checks that it is for the right name, has not expired, and chains up to a trusted CA.",
 "A connection starts with the TLS handshake. The client and server agree on a protocol version and encryption method, the server proves its identity with its certificate, and both sides use public-key cryptography to agree on a fresh secret key that only they know. From then on, everything is encrypted with fast symmetric encryption using that key. In TLS 1.3 the handshake takes a single round trip."],
["Use TLS 1.2 or 1.3 only; SSL and TLS 1.0/1.1 are insecure and disabled in modern systems.",
 "Public key: shared in the certificate. Private key: stays secret on the server; never commit or share it.",
 "Certificates expire (publicly trusted ones in about a year or less, Let's Encrypt in 90 days); automate renewal.",
 "Let's Encrypt issues free certificates automatically through the ACME protocol.",
 "A self-signed certificate encrypts but is not trusted by browsers; fine for local testing only.",
 "mTLS (mutual TLS) means the client also presents a certificate, common between internal services."],
"One morning a company's whole website shows a red 'Your connection is not private' warning and sales stop. The certificate expired overnight because renewal was a manual calendar reminder that someone missed. They move to automatic renewal and add an alert 14 days before expiry.",
`
# inspect a site's certificate
openssl s_client -connect example.com:443 -servername example.com < /dev/null | openssl x509 -noout -subject -issuer -dates

curl -vI https://example.com          # shows the TLS handshake and certificate

# check days until expiry in Python
import socket, ssl
from datetime import datetime, timezone

host = "example.com"
ctx = ssl.create_default_context()
with socket.create_connection((host, 443), timeout=5) as sock:
    with ctx.wrap_socket(sock, server_hostname=host) as tls:
        cert = tls.getpeercert()
        print(tls.version())                        # TLSv1.3
        expires = datetime.fromtimestamp(ssl.cert_time_to_seconds(cert["notAfter"]), timezone.utc)
        print("days left:", (expires - datetime.now(timezone.utc)).days)

# free certificate with Let's Encrypt (certbot)
# sudo certbot --nginx -d example.com -d www.example.com
`,
"SSL was created at Netscape in 1994-1995 by Taher Elgamal's team to make online shopping possible. It was renamed TLS when the IETF standardised it in 1999. TLS 1.3 was published in 2018. Let's Encrypt launched in 2015 and made HTTPS free, pushing encrypted web traffic from under half to over 90%.",
[["RFC 8446: TLS 1.3", "https://www.rfc-editor.org/rfc/rfc8446"],
 ["Let's Encrypt: How it works", "https://letsencrypt.org/how-it-works/"],
 ["Cloudflare Learning: What is TLS?", "https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/"]]),

X("Routers, NAT, DHCP and firewalls",
["Several pieces of equipment and services sit between your device and the internet. A switch connects devices within one local network. A router connects different networks and forwards packets toward their destination, hop by hop; your home router connects your home network to your provider's network. Your device's 'default gateway' is the router it sends everything to that is not on its own subnet.",
 "DHCP (Dynamic Host Configuration Protocol) is how a device gets its network settings automatically. When you join a network, your device broadcasts a request and the DHCP server leases it an IP address along with the subnet mask, gateway and DNS servers. NAT (Network Address Translation) lets many devices with private addresses share one public address. The router rewrites the source address of outgoing packets to its own public address and remembers which internal device each connection belongs to, so replies get back to the right one. NAT is why IPv4 has lasted so long, and why devices inside a home or office network cannot be reached directly from outside.",
 "A firewall decides which traffic is allowed, based on rules about source, destination, port and protocol. The sound default is to deny everything inbound and allow only what is needed. A stateful firewall remembers connections, so replies to requests you made are let back in automatically. In the cloud, firewalls appear as security groups and network access control lists."],
["Switch = inside one network (layer 2). Router = between networks (layer 3).",
 "DHCP hands out IP address, mask, gateway and DNS automatically; servers usually get fixed (static) addresses.",
 "NAT maps many private addresses to one public address. Port forwarding lets a chosen inbound port through to one internal machine.",
 "Firewall rule = allow or deny + source + destination + port + protocol.",
 "Default deny inbound; open only the required ports; never expose a database port to 0.0.0.0/0.",
 "Restrict SSH (22) and RDP (3389) to known addresses or a VPN."],
"A new cloud database is created with a security group allowing port 5432 from 0.0.0.0/0, the whole internet, 'just for testing'. Within hours automated scanners find it and start guessing passwords. The fix is to allow that port only from the application servers' security group.",
`
# your gateway and routing table
ip route                    # Linux
route print                 # Windows

# your public address as the internet sees it (after NAT)
curl https://ifconfig.me

# Linux firewall with ufw: default deny, open only what is needed
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 443/tcp
sudo ufw allow from 203.0.113.10 to any port 22 proto tcp
sudo ufw enable
sudo ufw status verbose

# cloud security group rules, as a table
# direction  protocol  port   source              purpose
# inbound    tcp       443    0.0.0.0/0           public HTTPS
# inbound    tcp       22     203.0.113.10/32     admin SSH from the office
# inbound    tcp       5432   sg-app-servers      database, only from the app tier
# outbound   all       all    0.0.0.0/0           allow replies and updates
`,
"DHCP was standardised in 1993 (updated in RFC 2131, 1997), succeeding BOOTP. NAT was proposed in 1994 as a short-term fix for the IPv4 address shortage and became permanent. Firewalls emerged in the late 1980s, after the 1988 Morris worm showed that an open internet needed gatekeepers.",
[["RFC 2131: DHCP", "https://www.rfc-editor.org/rfc/rfc2131"],
 ["RFC 3022: Traditional NAT", "https://www.rfc-editor.org/rfc/rfc3022"],
 ["Cloudflare Learning: What is a firewall?", "https://www.cloudflare.com/learning/security/what-is-a-firewall/"]]),

X("Load balancers, proxies, CDNs and VPNs",
["Between the client and your application there are usually several intermediaries, each with a job. A forward proxy sits in front of clients and makes requests on their behalf; companies use them to filter and log staff web access. A reverse proxy sits in front of servers and receives requests on their behalf. Nginx, HAProxy, Traefik and Envoy are reverse proxies. They terminate TLS, route requests to the right service, compress and cache responses, and hide the internal servers.",
 "A load balancer is a reverse proxy whose main job is to spread requests across several identical servers and stop sending traffic to any that fail health checks. A layer 4 load balancer forwards TCP connections without looking inside; it is very fast. A layer 7 load balancer understands HTTP, so it can route by URL path or host name, for example /api to one group of servers and /images to another.",
 "A CDN (Content Delivery Network) keeps copies of your static content (images, scripts, videos) on servers in hundreds of locations and serves each user from the nearest one, which cuts loading time and takes load off your servers. A VPN (Virtual Private Network) creates an encrypted tunnel across the internet, so a remote laptop or another office behaves as if it were inside the private network."],
["Forward proxy: acts for clients. Reverse proxy: acts for servers.",
 "Load-balancing methods: round robin, least connections, IP hash (same client to same server).",
 "Health checks remove broken servers automatically.",
 "L4 = by IP and port, fast. L7 = by HTTP host, path and headers, flexible.",
 "CDN: cache static content close to users; also absorbs traffic spikes and attacks.",
 "VPN: private access over the public internet. WireGuard, OpenVPN and IPsec are common."],
"An online store has customers in India, Europe and the US but servers only in Mumbai. Product images take three seconds to load in the US. After putting a CDN in front, images are served from a location near each customer and load in 200 milliseconds, while the Mumbai servers handle only the API calls.",
`
# nginx as reverse proxy and load balancer
upstream api_servers {
    least_conn;
    server 10.0.2.11:8000 max_fails=3 fail_timeout=30s;
    server 10.0.2.12:8000 max_fails=3 fail_timeout=30s;
    server 10.0.2.13:8000 backup;
}

server {
    listen 443 ssl;
    server_name shop.example.com;
    ssl_certificate     /etc/letsencrypt/live/shop.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.example.com/privkey.pem;

    location /api/ {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        root /var/www;
        expires 30d;                   # let browsers and CDNs cache
    }
}
`,
"Akamai, founded in 1998 from MIT research by Tom Leighton and Daniel Lewin, created the CDN industry. Nginx was released in 2004. VPN technology began with Microsoft's PPTP in 1996; WireGuard, a much simpler modern design, entered the Linux kernel in 2020.",
[["nginx documentation", "https://nginx.org/en/docs/"],
 ["Cloudflare Learning: What is a CDN?", "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/"],
 ["WireGuard", "https://www.wireguard.com/"]]),

X("Troubleshooting tools",
["Network problems feel mysterious until you have a method. The method is to work up the layers, checking one thing at a time: Does this machine have an address? Can it resolve the name? Can it reach the other machine? Is the port open? Does the application answer correctly? Each question has a tool, and the answer narrows down where the fault is.",
 "ping sends small test packets and reports whether replies come back and how long they take; it tests basic reachability, though some servers block it. traceroute (tracert on Windows) shows each router on the path, revealing where packets stop. nslookup and dig test DNS. nc, telnet or PowerShell's Test-NetConnection test whether a TCP port is open. curl makes a real HTTP request and shows the response in full. ss or netstat show what is listening locally.",
 "When all of those look fine and it still fails, tcpdump and Wireshark capture the actual packets so you can see exactly what was sent and received. Learning to read the common error messages saves the most time: 'could not resolve host' is DNS, 'connection refused' is nothing listening, 'connection timed out' is usually a firewall, and a certificate error is TLS."],
["Address: ip addr / ipconfig.   Name: nslookup, dig.   Reachability: ping, traceroute.",
 "Port: nc -zv HOST PORT / Test-NetConnection.   HTTP: curl -v.   Listening: ss -tlnp / netstat.",
 "'Could not resolve host' = DNS problem.",
 "'Connection refused' = host reachable, no service on that port.",
 "'Connection timed out' = packets dropped: firewall, security group or routing.",
 "Test from the machine that has the problem, not from your laptop; the network path is different."],
"A new service cannot call the payments API. From the service's own container the engineer runs: nslookup (the name resolves), nc to port 443 (times out). From their laptop the same test works. So the name and the API are fine; the container's outbound traffic is blocked. An egress rule was missing.",
`
# 1. do I have an address and a gateway?
ip addr ; ip route              # Windows: ipconfig /all

# 2. does the name resolve?
nslookup api.example.com

# 3. is the host reachable, and where does the path stop?
ping -c 4 api.example.com       # Windows: ping api.example.com
traceroute api.example.com      # Windows: tracert api.example.com

# 4. is the port open?
nc -zv api.example.com 443
# PowerShell: Test-NetConnection api.example.com -Port 443

# 5. does the application answer, and how fast?
curl -v https://api.example.com/health
curl -o /dev/null -s -w "dns %{time_namelookup}s  connect %{time_connect}s  tls %{time_appconnect}s  total %{time_total}s" https://api.example.com/health

# 6. what is listening here?
ss -tlnp                        # Windows: netstat -ano

# 7. last resort: look at the packets
sudo tcpdump -i any port 5432 -n
`,
"ping was written by Mike Muuss in one evening in December 1983 and named after the sound of sonar. traceroute was written by Van Jacobson in 1987. Wireshark began as Ethereal, by Gerald Combs, in 1998. curl was released by Daniel Stenberg in 1998 and now runs on billions of devices.",
[["curl documentation", "https://curl.se/docs/"],
 ["Wireshark user's guide", "https://www.wireshark.org/docs/wsug_html_chunked/"],
 ["tcpdump manual", "https://www.tcpdump.org/manpages/tcpdump.1.html"]])
]});
