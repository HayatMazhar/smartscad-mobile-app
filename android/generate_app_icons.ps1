Add-Type -AssemblyName System.Drawing

# Build square PNG launcher icons from the composited Sanadkom master (1024x1024).
# Master: src/assets/sanadkom_apk_icon_composite.png
# Build that file with: src/assets/_compose_launcher_tamm_official.ps1 (supersampled theme + waved flag + keyed logo)
# Legacy (ribbons + wordmark): src/assets/_compose_apk_icon.ps1
$resRoot = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\android\app\src\main\res'
$src     = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\src\assets\sanadkom_apk_icon_composite.png'

$densities = @(
  @{ Folder='mipmap-mdpi';    Size= 48 },
  @{ Folder='mipmap-hdpi';    Size= 72 },
  @{ Folder='mipmap-xhdpi';   Size= 96 },
  @{ Folder='mipmap-xxhdpi';  Size=144 },
  @{ Folder='mipmap-xxxhdpi'; Size=192 }
)

# Adaptive-icon foreground sizes (108dp visible, 33% safe-zone padding around the wordmark)
$adaptiveFg = @(
  @{ Folder='mipmap-mdpi';    Size=108 },
  @{ Folder='mipmap-hdpi';    Size=162 },
  @{ Folder='mipmap-xhdpi';   Size=216 },
  @{ Folder='mipmap-xxhdpi';  Size=324 },
  @{ Folder='mipmap-xxxhdpi'; Size=432 }
)

$srcImg = [System.Drawing.Image]::FromFile($src)
Write-Host "Source: $($srcImg.Width)x$($srcImg.Height)"

# Round-icon bleed / plate (matches compositor upper gradient stop #1E4A82)
$roundFill = [System.Drawing.Color]::FromArgb(255, 0x1E, 0x4A, 0x82)

function Render-LauncherIcon {
  param([int]$Size, [string]$OutPath, [int]$Padding = 0, [bool]$Round = $false, [bool]$Transparent = $false)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  if ($Transparent) {
    $g.Clear([System.Drawing.Color]::Transparent)
  }
  elseif ($Round) {
    $g.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush($roundFill)
    $g.FillEllipse($brush, 0, 0, $Size, $Size)
    $brush.Dispose()
  }
  else {
    $brush = New-Object System.Drawing.SolidBrush($roundFill)
    $g.FillRectangle($brush, 0, 0, $Size, $Size)
    $brush.Dispose()
  }

  # Logo aspect ratio
  $logoW = $script:srcImg.Width
  $logoH = $script:srcImg.Height
  $aspect = $logoW / $logoH

  $maxW = $Size - ($Padding * 2)
  $maxH = $Size - ($Padding * 2)

  $drawW = $maxW
  $drawH = [int]($drawW / $aspect)
  if ($drawH -gt $maxH) {
    $drawH = $maxH
    $drawW = [int]($drawH * $aspect)
  }

  $x = [int](($Size - $drawW) / 2)
  $y = [int](($Size - $drawH) / 2)

  $g.DrawImage($script:srcImg, $x, $y, $drawW, $drawH)

  $g.Dispose()
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Host ""
Write-Host "===== Generating square launcher icons ====="
foreach ($d in $densities) {
  $folder = Join-Path $resRoot $d.Folder
  $size = $d.Size
  # Inset so art is not clipped on OEM launchers (~7% balances size vs. bleed)
  $pad = [int]($size * 0.07)

  $sq = Join-Path $folder 'ic_launcher.png'
  $rd = Join-Path $folder 'ic_launcher_round.png'

  Render-LauncherIcon -Size $size -OutPath $sq -Padding $pad -Round $false
  Render-LauncherIcon -Size $size -OutPath $rd -Padding $pad -Round $true
  Write-Host ("  {0,-18} {1,4}x{1,-4}  -> {2}, {3}" -f $d.Folder, $size, (Split-Path $sq -Leaf), (Split-Path $rd -Leaf))
}

Write-Host ""
Write-Host "===== Generating adaptive-icon foreground (transparent bg; ~72dp safe zone) ====="
foreach ($d in $adaptiveFg) {
  $folder = Join-Path $resRoot $d.Folder
  $size = $d.Size
  # Android adaptive: 108dp artwork, inner safe zone diameter 72dp => pad ~18dp each side (18/108 ~ 16.67%).
  # Excessive padding (~27%) was shrinking the composite and making the launcher logo look tiny.
  $pad  = [int]($size / 108.0 * 18.0 + 0.99)
  $fg = Join-Path $folder 'ic_launcher_foreground.png'
  Render-LauncherIcon -Size $size -OutPath $fg -Padding $pad -Round $false -Transparent $true
  Write-Host ("  {0,-18} {1,4}x{1,-4}  -> {2}" -f $d.Folder, $size, (Split-Path $fg -Leaf))
}

$srcImg.Dispose()

Write-Host ""
Write-Host "===== Removing old .webp launcher icons ====="
Get-ChildItem $resRoot -Recurse -Filter 'ic_launcher*.webp' | ForEach-Object {
  Write-Host "  removing $($_.FullName)"
  Remove-Item $_.FullName -Force
}

Write-Host ""
Write-Host "===== DONE ====="
Get-ChildItem $resRoot -Recurse -Filter 'ic_launcher*' | Select-Object @{n='File';e={$_.FullName.Replace($resRoot + '\', '')}}, Length, LastWriteTime | Format-Table -AutoSize
