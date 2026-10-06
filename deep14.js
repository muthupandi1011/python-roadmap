EXTRA(14, "What PowerShell is", {
  deep: [
    "PowerShell is a .NET program. The file pwsh.exe is only a 'host' that shows text; the real work is done by the PowerShell engine, which is a .NET library. A cmdlet is a .NET class that runs inside the same process. This is different from Bash, where most commands (grep, ls, awk) are separate programs and each one needs a new process. So a PowerShell pipeline of cmdlets costs no process start, but the shell itself starts slower because it must load the .NET runtime.",
    "External programs such as ipconfig, git or docker are called native commands. They know nothing about objects. PowerShell reads their text output and gives you one string object per line. So 'objects, not text' is true only for cmdlets; with native tools you still parse text, as in Bash.",
    "The two editions are really two different products that can be installed side by side. Windows PowerShell 5.1 runs on .NET Framework and its edition name is 'Desktop'. PowerShell 7 runs on modern .NET and its edition name is 'Core'. They differ in real ways: in 5.1 the > operator writes UTF-16 files, in 7 it writes UTF-8 without BOM; the operators && and ||, the ternary operator and ForEach-Object -Parallel exist only in 7. A common misconception is that installing PowerShell 7 upgrades 5.1. It does not; powershell.exe stays as it is."
  ],
  iq: [
    { q: "What is the difference between Windows PowerShell 5.1 and PowerShell 7, and how does a script check which one is running it?", a: "5.1 is built into Windows, runs on the old .NET Framework and gets only fixes. 7 is installed separately, runs on modern .NET, is cross-platform and gets the new features. A script can read $PSVersionTable.PSEdition ('Desktop' or 'Core') or put a #Requires line at the top so it refuses to run on the wrong version.", c: `
#Requires -Version 7.0

$PSVersionTable.PSEdition      # Core = PowerShell 6 or 7, Desktop = 5.1
$PSVersionTable.PSVersion.Major
` },
    { q: "If PowerShell passes objects, what do you get when you pipe ipconfig or git into a cmdlet?", a: "You get strings, one per output line. Native programs only write text, so PowerShell cannot create rich objects from them. You must filter the text (Select-String, -match, -split) or ask the tool for JSON and convert it with ConvertFrom-Json.", c: `
$lines = ipconfig
$lines.GetType().Name            # Object[]  (an array of strings)
$lines | Select-String "IPv4"

# better: ask the tool for JSON, then you have objects again
docker ps --format json | ForEach-Object { $_ | ConvertFrom-Json }
` },
    { q: "Is PowerShell case-sensitive?", a: "By default no: command names, parameter names, variable names and the -eq, -like and -match operators all ignore case. If you need a case-sensitive compare, use the 'c' versions: -ceq, -clike, -cmatch. One trap: on Linux the file system is case-sensitive, so a path that worked on Windows can fail there.", c: `
"abc" -eq "ABC"      # True
"abc" -ceq "ABC"     # False
` },
    { q: "Why does PowerShell start slower than cmd or Bash, and what do you do about it in automation?", a: "It has to load the .NET runtime, the engine and then run the profile script. The profile is often the biggest part. In scheduled tasks and CI, start it with -NoProfile so no profile is loaded; this is faster and also makes the run the same on every machine." }
  ],
  tips: [
    "In CI and Task Scheduler call scripts as: pwsh -NoProfile -NonInteractive -File ./deploy.ps1. -NonInteractive makes a hidden prompt fail fast instead of hanging the job forever.",
    "Put '#Requires -Version 7.0' as the first line of any script that uses &&, ||, the ternary operator or -Parallel. Without it, 5.1 gives a confusing syntax error.",
    "The variables $IsWindows, $IsLinux and $IsMacOS exist only in PowerShell 6 and later. In 5.1 they are undefined, so check $PSVersionTable.PSEdition first if the script must run on both.",
    "When a script behaves differently on two machines, compare $PSVersionTable on both before anything else. Many 'random' bugs are just 5.1 on one machine and 7 on the other."
  ]
});

EXTRA(14, "Cmdlets and the help system", {
  deep: [
    "When you type a name, PowerShell looks for a command in a fixed order: first aliases, then functions, then cmdlets, and last external programs found in PATH. The first match wins. This means an alias or a function can silently hide a cmdlet or a program with the same name. Get-Command NAME -All shows every match in the order PowerShell would use.",
    "You do not need to import most modules by hand. PowerShell keeps an index of the commands in every module found in the folders listed in $env:PSModulePath. The first time you use a command, its module is loaded automatically. That is why the first call of a command from a big module such as Az can be slow.",
    "Parameter binding has steps. Named parameters are bound first, then positional ones, then values that come from the pipeline. You may shorten a parameter name as long as it stays unique, so -Rec works for -Recurse. This is fine at the keyboard but risky in scripts, because a new version of the cmdlet can add a parameter that makes the short name ambiguous. Also note that the Unix-style aliases (ls, cat, cp, rm) exist only on Windows; on Linux those names run the real Linux programs."
  ],
  iq: [
    { q: "A function and a cmdlet have the same name. Which one runs, and how do you run the other?", a: "The function runs, because the lookup order is alias, function, cmdlet, external program. To see all matches use Get-Command with -All. To run the cmdlet anyway, get it from its module and call it with the & operator.", c: `
function Get-Date { "fake date" }
Get-Date                              # fake date

Get-Command Get-Date -All             # lists every command with this name
& (Get-Command Get-Date -Module Microsoft.PowerShell.Utility)     # runs the real cmdlet
` },
    { q: "In Windows PowerShell 5.1, why does 'curl -s https://example.com' give a parameter error?", a: "In 5.1, curl is an alias for Invoke-WebRequest, which has no -s parameter. Aliases are checked before programs in PATH, so the real curl is never reached. Type curl.exe to run the real program. PowerShell 7 removed this alias.", c: `
Get-Alias curl            # 5.1: curl -> Invoke-WebRequest
curl.exe -s https://example.com
` },
    { q: "Does every command support -WhatIf?", a: "No. -WhatIf works only when the author of the command implemented it (called ShouldProcess). Most built-in cmdlets that change something support it. Your own function supports it only if you write [CmdletBinding(SupportsShouldProcess)] and call $PSCmdlet.ShouldProcess. Native programs such as git or robocopy ignore it completely." },
    { q: "How do you find out whether a parameter accepts input from the pipeline?", a: "Ask the help for that one parameter. The line 'Accept pipeline input?' says ByValue (the whole object is bound when its type fits) or ByPropertyName (a property with the same name as the parameter is used). This explains why some pipelines work and others say 'the input object cannot be bound'.", c: `
Get-Help Stop-Service -Parameter Name
# Accept pipeline input?  True (ByPropertyName, ByValue)
` }
  ],
  tips: [
    "Get-Command Copy-Item -Syntax prints only the parameter sets. It is the fastest way to recall the exact parameter names without reading the full help.",
    "On servers without internet, run Save-Help on a connected machine and then Update-Help -SourcePath on the server. Without this, Get-Help shows only the short auto-generated text.",
    "Set defaults once per session with $PSDefaultParameterValues, for example $PSDefaultParameterValues['Export-Csv:NoTypeInformation'] = $true. Put such lines in the script itself, not only in your profile, or the script will behave differently for other people.",
    "To see every property with its value, use 'Get-Service spooler | Format-List *'. The default view hides most properties, so people often think the data is not there."
  ]
});

EXTRA(14, "The object pipeline", {
  deep: [
    "The pipeline is a stream, not a list. Each cmdlet has three parts: begin runs once, process runs once for every incoming object, and end runs once at the finish. As soon as the first command produces one object, that object travels through all the stages before the second object is created. So memory use stays low, and Select-Object -First 5 can stop the whole pipeline early. Some cmdlets cannot stream: Sort-Object, Group-Object and Measure-Object must collect everything first, so they hold all objects in memory.",
    "What you see on the screen is made by the formatting system, a separate step at the very end. PowerShell silently adds Out-Default to every pipeline. It looks up a predefined view for the object type. If there is none, objects with up to four properties are shown as a table and objects with five or more as a list. The first object decides the columns, so if a pipeline outputs two different types, the second type can appear with empty columns or not at all.",
    "The Format-* cmdlets do not return your data. They return special formatting objects that only the screen output understands. That is the real reason for the rule 'Format last': after Format-Table the original objects are gone, so Export-Csv, Where-Object or Sort-Object receive rubbish. A common misconception is that Select-Object and Format-Table are similar. Select-Object makes new data objects; Format-Table makes display instructions."
  ],
  iq: [
    { q: "Why is the CSV file full of strange values when you run Get-Process | Format-Table Name, Id | Export-Csv p.csv?", a: "Format-Table replaces the process objects with formatting objects that describe a screen layout. Export-Csv then exports the properties of those layout objects. Use Select-Object to pick columns for data, and use Format-* only when the next step is the screen.", c: `
# wrong: exports formatting objects
Get-Process | Format-Table Name, Id | Export-Csv ./p.csv

# right
Get-Process | Select-Object Name, Id | Export-Csv ./p.csv -NoTypeInformation
` },
    { q: "What does -eq return when the left side is an array?", a: "It does not return True or False. With an array on the left, comparison operators work as a filter and return the elements that match. An empty result counts as false and a non-empty result usually counts as true, which hides the bug. To test membership use -contains or -in.", c: `
$nums = 1, 2, 3, 2
$nums -eq 2          # 2, 2   (the matching items, not True)
$nums -eq 9          # nothing
$nums -contains 2    # True
2 -in $nums          # True
` },
    { q: "Why is Get-ChildItem -Filter *.log faster than Get-ChildItem | Where-Object { $_.Extension -eq '.log' }?", a: "The -Filter value is passed down to the provider, here the Windows file system, which returns only matching files. With Where-Object, PowerShell first creates an object for every file and then throws most of them away. The same idea applies to Get-ADUser -Filter or SQL queries: filter at the source, as far left as possible." },
    { q: "What is the difference between -contains, -like and -match?", a: "-contains asks whether a collection has an item that is equal to a value; it does not search inside a string. -like compares a string with a wildcard pattern (* and ?). -match uses a regular expression and fills the $Matches variable. People often use -contains for a substring test and it returns False.", c: `
"hello" -contains "ell"       # False (a string is not a collection of parts)
"hello" -like "*ell*"         # True
"hello" -match "e(l+)"        # True
$Matches[1]                   # ll
` }
  ],
  tips: [
    "Use Select-Object -ExpandProperty Name when you need plain values. Without -ExpandProperty you get objects with one property called Name, and later string operations fail.",
    "When a table cuts values with '...', pipe to Format-Table -AutoSize -Wrap, or to Format-List. For log files use Out-File -Width 300 so long lines are not cut.",
    "In PowerShell 7, speed up slow network calls with ForEach-Object -Parallel { ... } -ThrottleLimit 5. Variables from outside must be read as $using:name inside the block.",
    "Time two versions of a pipeline with Measure-Command { ... }. Do this before optimising; often one Where-Object placed too far right is the whole problem."
  ]
});

EXTRA(14, "Variables, data types, arrays and hashtables", {
  deep: [
    "A PowerShell array is a fixed-size .NET array. The += operator cannot grow it, so it creates a new, bigger array and copies every item. In a loop of 50,000 items this means millions of copies and a script that takes minutes. The fix is to let PowerShell collect the loop output ($result = foreach ...) or to use a generic List and its Add method.",
    "Variables live in scopes. There is a global scope, a script scope for each script file, and a new local scope for each function call. Code in a child scope can read a variable of its parent, but when it assigns to that name it creates a new local variable and the parent keeps its old value. To really change the outer variable you write $script:name or $global:name. Dot-sourcing a file (a dot, a space, then the path) runs it in the current scope, so its variables and functions stay.",
    "Type conversion follows the left operand. '5' + 3 gives the string 53, but 5 + '3' gives the number 8. When you put a type in front of a variable, such as [int]$count, the variable keeps that type and a later assignment of text is an error. Also remember that a command that returns one item gives you that single item, not an array of one. Wrap the call in @( ) when you need an array every time. A normal hashtable does not keep the order of its keys; write [ordered] in front of it when order matters."
  ],
  iq: [
    { q: "Why should $null be on the left side of a comparison?", a: "If the variable holds an array, '$var -eq $null' works as a filter and returns the $null items inside it, not True or False. The result can be empty (false) even when you expected true, or non-empty for an array that is not null. With $null on the left, the left side is a single value, so you always get a real boolean.", c: `
$items = @(1, $null, 2, $null)

if ($items -eq $null) { "looks null" }     # prints: the filter found two items
if ($null -eq $items) { "is null" }        # prints nothing: correct
` },
    { q: "What do '5' + 3 and 5 + '3' return?", a: "The type of the left operand decides. With a string on the left, the number is converted to text and joined: 53. With a number on the left, the text is converted to a number and added: 8. This matters with Read-Host and Import-Csv, which always give strings.", c: `
"5" + 3        # 53
5 + "3"        # 8
[int]"5" + 3   # 8
` },
    { q: "Why is building a big array with += inside a loop slow, and what is the fix?", a: "Arrays have a fixed size, so each += allocates a new array and copies all old items. The total work grows with the square of the number of items. Collect the loop output directly, or use a List, which grows without copying everything each time.", c: `
# slow
$all = @()
foreach ($i in 1..50000) { $all += $i }

# fast: let PowerShell collect the output
$all = foreach ($i in 1..50000) { $i }

# fast: a list
$list = [System.Collections.Generic.List[int]]::new()
foreach ($i in 1..50000) { $list.Add($i) }
` },
    { q: "A function increases a counter that was defined in the script, but after the call the counter is still 0. Why?", a: "The function runs in a child scope. It can read the script variable, but the assignment creates a new local variable that disappears when the function ends. Use the script: scope modifier, or better, return the new value and assign it in the caller.", c: `
$count = 0
function Add-One { $count++ }
Add-One
$count            # 0

function Add-OneFixed { $script:count++ }
Add-OneFixed
$count            # 1
` }
  ],
  tips: [
    "Write $files = @(Get-ChildItem ./logs -File) when the next line uses .Count or an index. Then zero, one and many results all behave the same.",
    "Use [ordered]@{ ... } when you build a hashtable for a report or a JSON file. A plain hashtable can print the keys in a different order on every run.",
    "For lookups inside a loop, first build a hashtable keyed by ID, then read $byId[$id]. Calling Where-Object inside the loop scans the whole list every time and becomes very slow on large data.",
    "To put a property inside a double-quoted string, wrap it like this: $($user.Name). If you write only $user.Name there, PowerShell prints the whole object followed by the text '.Name'."
  ]
});

EXTRA(14, "Conditions and loops", {
  deep: [
    "PowerShell converts any value to true or false with fixed rules. $null, 0, an empty string and an empty array are false. Any non-empty string is true, even the string 'False'. An array with exactly one item is judged by that item, so @(0) is false. An array with two or more items is always true, even @(0, 0). These rules explain many 'if' statements that take the wrong branch.",
    "Comparison operators convert the right side to the type of the left side. '10' -gt 9 compares two strings, and as text '10' sorts before '9', so the result is False. 10 -gt '9' compares numbers and is True. Data from Read-Host, Import-Csv and text files is always a string, so cast it with [int] before a numeric comparison.",
    "switch is more than a tidy if. It checks every case and runs all that match, unless you write break. If you give it an array, it loops over each item. With -File it reads a text file line by line, which is a fast way to parse logs. Inside ForEach-Object the block is a script block, not a loop body, so break and continue do not work as you expect: return skips to the next item, and break can stop the whole script."
  ],
  iq: [
    { q: "What does a switch statement do when two cases match?", a: "It runs both. PowerShell tests every case in order and does not stop at the first match. Add break in a case when only the first match should run. This is different from if/elseif, where only one branch runs.", c: `
switch (15) {
    { $_ -gt 10 } { "more than 10" }
    { $_ -gt 5 }  { "more than 5" }
}
# prints both lines; add 'break' inside the first block to stop there
` },
    { q: "What is the result of '10' -gt 9, and why?", a: "False. The left side is a string, so 9 is converted to the string '9' and the two are compared as text, character by character. '1' comes before '9', so '10' is smaller. Put the number on the left or cast the string to [int].", c: `
"10" -gt 9         # False (text comparison)
[int]"10" -gt 9    # True
10 -gt "9"         # True
` },
    { q: "How do you skip the current item inside ForEach-Object?", a: "Use return. ForEach-Object calls your script block once per item, so return ends only that one call and the next item is processed. continue is made for real loops; inside ForEach-Object it searches for an outer loop, and if there is none it silently stops the whole pipeline or script.", c: `
1..5 | ForEach-Object {
    if ($_ -eq 3) { return }      # skip 3, go on with 4
    $_
}
` },
    { q: "Is if ('False') true or false? What about if (@()) and if (@($false))?", a: "'False' is a non-empty string, so it is true. An empty array is false. An array with one item is judged by that item, so @($false) is false. This often hurts when a setting is read from a text file as the string 'False'; convert it first with [bool]::Parse or compare it with -eq 'true'.", c: `
if ("False")     { "runs" }
if (@())         { "does not run" }
if (@($false))   { "does not run" }
[bool]::Parse("False")     # False
` }
  ],
  tips: [
    "Check for empty text with [string]::IsNullOrWhiteSpace($name). It handles $null, an empty string and a string of only spaces in one call.",
    "Do not write if ($x = 5). A single = is an assignment, the value 5 is true, and the condition always passes. PowerShell gives no warning for this.",
    "To parse a large log, use switch -Regex -File ./app.log with one case per pattern. It reads line by line and is much faster than Get-Content piped to Where-Object.",
    "To leave two nested loops at once, label the outer loop (:outer foreach ...) and write 'break outer'. A plain break leaves only the inner loop."
  ]
});

EXTRA(14, "Functions and parameters", {
  deep: [
    "PowerShell has six output streams: 1 Success (the data), 2 Error, 3 Warning, 4 Verbose, 5 Debug and 6 Information. Only stream 1 goes down the pipeline and into a variable. A function's 'return value' is simply everything that was written to stream 1 while it ran. Many .NET methods and some cmdlets write a value you did not ask for, for example ArrayList.Add returns the new index and New-Item returns the created item. These values join your result unless you discard them with $null = ..., [void](...) or | Out-Null.",
    "A function can have begin, process and end blocks, like a cmdlet. If you write none, the whole body is treated as the end block. That matters for pipeline input: the body then runs only once, after all input has arrived, and a pipeline parameter holds only the last object. To handle each piped object you must put the work inside process { }.",
    "When a function outputs an array, PowerShell unrolls it and sends the items one by one. The caller collects them again, so an array with one item arrives as a single value and an empty array arrives as $null. To send an array as one unit, write a comma in front of it (return ,$list) or use Write-Output -NoEnumerate. Another useful feature is splatting: put parameters in a hashtable and pass it with @ instead of $, which keeps long calls readable without line-continuation characters."
  ],
  iq: [
    { q: "Why does my function return an array with extra items, when I return only one value?", a: "Because everything written to the success stream is returned, not only the value after return. A method such as ArrayList.Add or a cmdlet such as New-Item outputs a value, and that value is added to the result. Find the line that leaks output and discard it.", c: `
function Get-Names {
    $list = [System.Collections.ArrayList]::new()
    $list.Add("anu")           # outputs 0  (the index) - a leak
    $null = $list.Add("ravi")  # fixed: output discarded
    return $list
}
Get-Names        # 0, anu, ravi
` },
    { q: "What is the difference between Write-Host and Write-Output?", a: "Write-Output sends objects to the success stream, so they can be piped, stored in a variable and returned from a function. Write-Host writes text for a person to read; since version 5 it goes to the information stream, so it is not part of the function's result. Use Write-Output (or just the value) for data and Write-Host, Write-Verbose or Write-Warning for messages.", c: `
function Test-Streams {
    Write-Host "starting..."     # shown on screen, not returned
    Write-Output "data"          # returned
}
$x = Test-Streams
$x                               # data
` },
    { q: "My function accepts pipeline input but only processes the last item. Why?", a: "The function has no process block. Without one, the body runs as the end block, once, after all input is done, and the parameter holds only the last object. Move the code into process { } so it runs for every object.", c: `
function Show-Item {
    param([Parameter(ValueFromPipeline)]$Item)
    process { "Got $Item" }      # without 'process' only 'Got 3' is printed
}
1, 2, 3 | Show-Item
` },
    { q: "A function returns an array with one item, but the caller gets a single value and .Count or [0] behaves strangely. Why?", a: "PowerShell unrolls arrays on output and sends each item separately. The caller rebuilds an array only if there are two or more items. Either wrap the call in @( ) on the caller side, or return the array with a comma in front so it travels as one object.", c: `
function Get-One { @("only") }
(Get-One).GetType().Name         # String  (the array was unrolled)

function Get-OneArray { ,@("only") }
(Get-OneArray).GetType().Name    # Object[]

$r = @(Get-One)                  # caller side fix: always an array
` }
  ],
  tips: [
    "Call functions like cmdlets: Add-Numbers 1 2 or Add-Numbers -A 1 -B 2. Writing Add-Numbers(1, 2) passes one array to the first parameter and nothing to the second.",
    "Use splatting for long calls: $p = @{ Path = './a'; Destination = './b'; Recurse = $true }; Copy-Item @p. It is easier to read and you can add keys with an if statement.",
    "For any function that deletes or changes things, write [CmdletBinding(SupportsShouldProcess)] and wrap the action in if ($PSCmdlet.ShouldProcess($target, 'Remove')) { ... }. Then -WhatIf works and you can test safely in production.",
    "Use $PSBoundParameters.ContainsKey('Unit') to know whether the caller really passed a parameter. Comparing with the default value cannot tell 'not passed' from 'passed the default'."
  ]
});

EXTRA(14, "Scripts, execution policy and modules", {
  deep: [
    "Execution policy can be set in five places, checked in this order: MachinePolicy and UserPolicy (both from Group Policy), Process (only this session), CurrentUser, and LocalMachine. The first one that is set wins. So if your company sets a Group Policy, your own Set-ExecutionPolicy seems to have no effect. On Linux and macOS the policy is always Unrestricted and cannot be changed.",
    "RemoteSigned needs to know that a file came from the internet. Windows browsers and mail programs add a hidden marker to downloaded files, called the Zone.Identifier stream or 'Mark of the Web'. PowerShell reads this marker. Unblock-File removes it. A file copied from a network share or unpacked by some tools may have no marker, so the policy does not stop it. This is why Microsoft says execution policy is a safety feature and not a security boundary.",
    "How you start a script decides its scope. ./lib.ps1 runs the file in a new child scope, so its functions and variables are gone when it ends. Dot-sourcing (. ./lib.ps1) runs it in the current scope and everything stays. A module has its own private scope: only what it exports is visible, and it does not see the variables of your script. Use $PSScriptRoot, the folder of the running script, to build paths; the current folder is whatever the caller happened to be in."
  ],
  iq: [
    { q: "Is execution policy a security feature? How does RemoteSigned know a script was downloaded?", a: "It is a guard against running scripts by accident, not a security boundary. Anyone can start PowerShell with -ExecutionPolicy Bypass or paste the script text into the console. RemoteSigned works by reading the Zone.Identifier marker that Windows adds to downloaded files; Unblock-File removes that marker.", c: `
Get-Item ./setup.ps1 -Stream Zone.Identifier    # exists only on downloaded files (Windows)
Unblock-File ./setup.ps1
` },
    { q: "What is the difference between ./lib.ps1 and . ./lib.ps1?", a: "The first runs the script in its own child scope: functions and variables defined in it are removed when it ends. The second is dot-sourcing: the file runs in the current scope, so its functions and variables stay available. Dot-sourcing is how you load a file of helper functions.", c: `
./helpers.ps1        # functions inside are gone afterwards
. ./helpers.ps1      # functions inside can now be called
Get-Helper
` },
    { q: "A script works when you run it by hand but fails as a scheduled task with 'file not found'. What is the usual cause?", a: "Relative paths. A scheduled task usually starts in C:/Windows/System32, not in the script's folder, so ./config.json points to the wrong place. Build paths from $PSScriptRoot, which is always the folder that contains the script.", c: `
$configPath = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
` },
    { q: "You ran Set-ExecutionPolicy RemoteSigned but scripts are still blocked. Why?", a: "A scope with higher priority is set, normally MachinePolicy or UserPolicy from Group Policy. Those always win over CurrentUser and LocalMachine. Get-ExecutionPolicy -List shows every scope and you can see which one decides. Only an administrator of the domain can change a Group Policy setting." }
  ],
  tips: [
    "In Task Scheduler and CI use: pwsh -NoProfile -ExecutionPolicy Bypass -File C:/scripts/job.ps1. With -File the script's exit code is passed back; with -Command you often get only 0 or 1.",
    "Declare what a script needs at the top: '#Requires -Modules Az.Accounts' and '#Requires -Version 7.0'. The script then stops at once with a clear message instead of failing halfway.",
    "Pin module versions in automation with Install-Module NAME -RequiredVersion and an exact version number. An unpinned install can bring a new major version one night and break the job.",
    "While developing a module, reload it with Import-Module ./MyModule.psd1 -Force. Without -Force PowerShell keeps the old version in memory and your changes seem to do nothing."
  ]
});

EXTRA(14, "Error handling", {
  deep: [
    "There are really three kinds of error. A non-terminating error is written to the error stream and the command goes on. A statement-terminating error stops only the current statement; a .NET method that throws, or a cmdlet that hits a fatal problem, makes this kind. A script-terminating error, made by throw or by the 'Stop' setting, unwinds everything until a catch is found. The surprise is the middle kind: without try/catch, the script prints the error and continues with the next line.",
    "The object in $_ inside catch is an ErrorRecord, not just an exception. It has the .NET exception in $_.Exception, the place in $_.InvocationInfo (script name and line number), a stable ID in $_.FullyQualifiedErrorId and the call path in $_.ScriptStackTrace. Logging only the message throws away the most useful parts.",
    "$ErrorActionPreference is a normal variable, so it follows scope rules. A value set in your script is seen by your functions, but functions from a script module live in the module's own scope and do not see it. So a module function can still write non-terminating errors. Pass -ErrorAction Stop on the call when it matters. For native programs, PowerShell 7.4 added $PSNativeCommandUseErrorActionPreference; when it is $true, a non-zero exit code becomes a PowerShell error, so you no longer need to check $LASTEXITCODE after every call."
  ],
  iq: [
    { q: "Why did try/catch not catch the error from my cmdlet?", a: "Most cmdlet errors are non-terminating: the cmdlet reports the error and continues, so there is nothing to catch. catch runs only for terminating errors. Add -ErrorAction Stop to the cmdlet, or set $ErrorActionPreference = 'Stop', to turn the error into a terminating one.", c: `
try {
    Get-Item ./missing.txt                       # error shown, catch does NOT run
    Get-Item ./missing.txt -ErrorAction Stop     # now catch runs
}
catch {
    "Caught: $($_.Exception.Message)"
}
` },
    { q: "What is the difference between throw and Write-Error?", a: "throw makes a terminating error: execution stops and moves to the nearest catch. Write-Error writes a non-terminating error and the code continues, so the caller can decide with -ErrorAction what should happen. One trap: when $ErrorActionPreference is 'Stop', Write-Error also becomes terminating, so the lines after it do not run." },
    { q: "What is the difference between $? and $LASTEXITCODE?", a: "$? is True or False for the last statement of any kind, and it is overwritten by every new statement, so you must read it immediately. $LASTEXITCODE is the number returned by the last native program and it keeps its value until another native program runs. For git, docker or robocopy, check $LASTEXITCODE.", c: `
git status
$code = $LASTEXITCODE        # save it at once
if ($code -ne 0) { throw "git failed with code $code" }
` },
    { q: "A .NET method throws an exception and there is no try/catch. Does the script stop?", a: "By default, no. The exception is a statement-terminating error: that one statement is stopped, the error is shown, and the script goes on with the next line. With $ErrorActionPreference = 'Stop' the script stops. This is the main reason to set 'Stop' at the top of every automation script.", c: `
[int]::Parse("abc")          # error is printed
"this line still runs"

$ErrorActionPreference = "Stop"
[int]::Parse("abc")          # now the script ends here
"this line does not run"
` }
  ],
  tips: [
    "In catch, log more than the message: $_.InvocationInfo.ScriptLineNumber and $_.ScriptStackTrace tell you where it failed. In PowerShell 7, Get-Error prints the full detail of the last error.",
    "To add context but keep the original error, write a log line in catch and then a bare 'throw'. A bare throw re-raises the same error record with its original line number.",
    "robocopy returns exit codes 1 to 7 for success with details (files copied, extra files). Treat only 8 or higher as failure, or your CI step fails on every successful copy.",
    "To handle an expected failure quietly, use -ErrorAction SilentlyContinue -ErrorVariable problems and then test if ($problems). Do not hide errors with SilentlyContinue alone; you lose the only sign that something went wrong."
  ]
});

EXTRA(14, "Files, CSV, JSON and web requests", {
  deep: [
    "Get-Content returns one string per line and adds extra properties (path, line number) to each string. That is handy but slow for big files. -Raw returns the whole file as a single string. For files of hundreds of megabytes, use switch -File or the .NET method [System.IO.File]::ReadLines, which streams lines without the extra cost. Note that .NET methods use the working directory of the process, not PowerShell's current location, so always give them a full path.",
    "Text encoding is the biggest difference between the editions. In Windows PowerShell 5.1 each cmdlet has its own default: > and Out-File write UTF-16, Set-Content writes the local ANSI code page, and -Encoding utf8 adds a BOM (three marker bytes at the start). PowerShell 7 writes UTF-8 without BOM everywhere. A BOM or UTF-16 file often breaks Linux tools, Git diffs and JSON parsers, so state the encoding explicitly in scripts that must run on both.",
    "The web cmdlets treat HTTP status 400 and above as errors: Invoke-RestMethod throws a terminating error and you get no response object. In 5.1 you read the status from the exception inside catch. PowerShell 7 adds -SkipHttpErrorCheck and -StatusCodeVariable so you can inspect any response. Also remember that Invoke-RestMethod converts JSON to objects with the same unrolling rules as the pipeline, and ConvertTo-Json cuts nested data at depth 2 unless you raise -Depth."
  ],
  iq: [
    { q: "After ConvertTo-Json, nested values show as 'System.Collections.Hashtable' or a type name instead of real data. Why?", a: "ConvertTo-Json goes only 2 levels deep by default. Anything deeper is turned into a plain string with ToString(). Pass -Depth with a number that is large enough. PowerShell 7 prints a warning when it cuts data; 5.1 cuts silently.", c: `
$data = @{ a = @{ b = @{ c = @{ d = 1 } } } }
$data | ConvertTo-Json             # c is cut off
$data | ConvertTo-Json -Depth 10   # complete
` },
    { q: "You sort a CSV by a Salary column and 100000 comes before 20000. Why?", a: "Import-Csv makes every value a string, so the sort compares text and '1' comes before '2'. Sort with a script block that converts the value to a number. The same problem appears with -gt and -lt comparisons.", c: `
Import-Csv ./employees.csv | Sort-Object { [int]$_.Salary } -Descending
` },
    { q: "What is the difference between Invoke-WebRequest and Invoke-RestMethod, and how do you read the status code of a failed call?", a: "Invoke-RestMethod returns only the body, already converted from JSON or XML to objects. Invoke-WebRequest returns the full response: status code, headers and raw content. Both throw on status 400 and above. In catch you can read the status from the exception; in PowerShell 7 you can also switch the throwing off.", c: `
try {
    Invoke-RestMethod -Uri "https://httpbin.org/status/404"
}
catch {
    [int]$_.Exception.Response.StatusCode      # 404
}

# PowerShell 7
$body = Invoke-RestMethod -Uri "https://httpbin.org/status/404" -SkipHttpErrorCheck -StatusCodeVariable code
$code                                          # 404
` },
    { q: "A file written with > in Windows PowerShell 5.1 cannot be read correctly by a Linux tool, and Git shows it as binary. Why?", a: "In 5.1 the > operator writes UTF-16 with two bytes per character. Most Linux tools and Git expect UTF-8. Write the file with Set-Content or Out-File and -Encoding utf8, or run the script in PowerShell 7 where UTF-8 without BOM is the default." }
  ],
  tips: [
    "In Windows PowerShell 5.1 set $ProgressPreference = 'SilentlyContinue' before Invoke-WebRequest downloads. The progress bar can make a large download many times slower.",
    "Use -LiteralPath when a file name can contain square brackets, such as report[1].csv. With -Path the brackets are treated as a wildcard and the file is 'not found'.",
    "For API calls always set -TimeoutSec. In PowerShell 7 add -MaximumRetryCount 3 -RetryIntervalSec 5 to survive short network failures without writing your own loop.",
    "Piping an array with one item to ConvertTo-Json gives a single object, not a JSON array, and the API rejects it. Use ConvertTo-Json -InputObject $array, or -AsArray in PowerShell 7."
  ]
});
