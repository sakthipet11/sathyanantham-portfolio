param(
    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$ArgsList
)

python -m backend.python.cli.chromium_apply @ArgsList
