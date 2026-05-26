$ext = Get-Content "extension.js" -Encoding UTF8
$newFn = Get-Content "new_sidebar.js" -Encoding UTF8

# Keep lines before getSidebarHtml (indices 0..326 = lines 1..327)
# and after its closing brace (indices 1264.. = lines 1265+)
$before = $ext[0..326]
$after  = $ext[1264..($ext.Length - 1)]

$combined = $before + $newFn + $after
[System.IO.File]::WriteAllLines((Resolve-Path "extension.js").Path, $combined)
Write-Host "Done. Total lines: $($combined.Length)"
