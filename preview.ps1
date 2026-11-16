$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:8765/'
Write-Output "Preview: $previewUrl"
python -m http.server 8765 --bind 127.0.0.1 --directory $PSScriptRoot
