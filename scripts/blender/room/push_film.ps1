# Uploads a packed film to GitHub in small pieces (one scene at a time), retrying whenever the connection drops,
# then the index that switches the site over. Run from the jeemu-webapp folder after render_all.py --pack:
#   powershell -ExecutionPolicy Bypass -File scripts\blender\room\push_film.ps1 "Rendered film: WOOD base, oak table"
param([string]$Message = "Rendered film")
git config http.postBuffer 524288000
function Send() { do { git push -q; if ($LASTEXITCODE -ne 0) { Write-Host "  connection dropped, trying again in 10 s"; Start-Sleep 10 } } until ($LASTEXITCODE -eq 0) }
do { git pull -q; if ($LASTEXITCODE -ne 0) { Write-Host "  pull failed, trying again in 10 s"; Start-Sleep 10 } } until ($LASTEXITCODE -eq 0)
foreach ($d in Get-ChildItem public\tonight\seq\desk, public\tonight\seq\phone -Directory) {
  git add $d.FullName
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { git commit -q -m "Film frames: $($d.Parent.Name)/$($d.Name)" }
  Send; Write-Host "sent $($d.Parent.Name)/$($d.Name)"
}
git add public/tonight src/components/tonight/seqIndex.json src/components/tonight/assetVersion.js index.html
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -q -m "$Message (index and overhead stills)" }
Send
Write-Host "all sent: $Message"
