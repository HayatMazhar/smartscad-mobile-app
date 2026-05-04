# Composites the Play Store / launcher master (1024) for Sanadkom:
# - Keeps UAE ribbons + radial background from sanadkom_uae_proud_icon.png
# - Replaces center mark with official sanadkom_icon.png (same asset as login)
# - Replaces bottom titles with official wordmark from sanadkom_logo.png (Arabic + SANADKOM)
#
# After editing assets or tuning rects below, run:
#   powershell -File _compose_apk_icon.ps1
# Then from android/:
#   powershell -File generate_app_icons.ps1

Add-Type -AssemblyName System.Drawing

$assets = Split-Path -Parent $MyInvocation.MyCommand.Path
$uaePath = Join-Path $assets 'sanadkom_uae_proud_icon.png'
$iconPath = Join-Path $assets 'sanadkom_icon.png'
$logoPath = Join-Path $assets 'sanadkom_logo.png'
$outPath = Join-Path $assets 'sanadkom_apk_icon_composite.png'

function Get-AverageBorderColor {
  param(
    [System.Drawing.Bitmap]$Bmp,
    [int]$Rx, [int]$Ry, [int]$Rw, [int]$Rh
  )
  [long]$tr = 0; [long]$tg = 0; [long]$tb = 0
  [int]$n = 0
  $x1 = $Rx + $Rw - 1
  $y1 = $Ry + $Rh - 1
  for ($x = $Rx; $x -le $x1; $x++) {
    foreach ($y in @($Ry, $y1)) {
      $p = $Bmp.GetPixel($x, $y)
      $tr += $p.R; $tg += $p.G; $tb += $p.B; $n++
    }
  }
  for ($y = $Ry; $y -le $y1; $y++) {
    foreach ($x in @($Rx, $x1)) {
      $p = $Bmp.GetPixel($x, $y)
      $tr += $p.R; $tg += $p.G; $tb += $p.B; $n++
    }
  }
  return [System.Drawing.Color]::FromArgb(255, [int]($tr / $n), [int]($tg / $n), [int]($tb / $n))
}

function New-ChromaDraw {
  param(
    [System.Drawing.Graphics]$G,
    [System.Drawing.Image]$Img,
    [int]$DstX, [int]$DstY, [int]$DstW, [int]$DstH
  )
  $ia = New-Object System.Drawing.Imaging.ImageAttributes
  # Knock out near-black (export backgrounds)
  $low  = [System.Drawing.Color]::FromArgb(255, 0, 0, 0)
  $high = [System.Drawing.Color]::FromArgb(255, 8, 8, 8)
  $ia.SetColorKey($low, $high)
  $dst = New-Object System.Drawing.Rectangle($DstX, $DstY, $DstW, $DstH)
  $G.DrawImage(
    $Img, $dst,
    0, 0, $Img.Width, $Img.Height,
    [System.Drawing.GraphicsUnit]::Pixel,
    $ia
  )
  $ia.Dispose()
}

function Get-WordmarkBitmap {
  param([string]$LogoFile)
  $full = [System.Drawing.Bitmap]::new($LogoFile)
  # Horizontal layout: geometric mark ends ~295px — start wordmark after it (no blue bar)
  $x0 = 312
  $cropW = $full.Width - $x0
  $cropH = $full.Height
  $wm = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($xx = 0; $xx -lt $cropW; $xx++) {
    for ($yy = 0; $yy -lt $cropH; $yy++) {
      $px = $full.GetPixel($x0 + $xx, $yy)
      if (($px.R + $px.G + $px.B) -lt 28) {
        $wm.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      } else {
        $wm.SetPixel($xx, $yy, $px)
      }
    }
  }
  $full.Dispose()
  # Trim transparent margins
  $minX = $wm.Width; $maxX = 0; $minY = $wm.Height; $maxY = 0
  for ($xx = 0; $xx -lt $wm.Width; $xx++) {
    for ($yy = 0; $yy -lt $wm.Height; $yy++) {
      if ($wm.GetPixel($xx, $yy).A -gt 40) {
        if ($xx -lt $minX) { $minX = $xx }
        if ($xx -gt $maxX) { $maxX = $xx }
        if ($yy -lt $minY) { $minY = $yy }
        if ($yy -gt $maxY) { $maxY = $yy }
      }
    }
  }
  if ($maxX -lt $minX) { return $wm }
  $tw = $maxX - $minX + 1
  $th = $maxY - $minY + 1
  $tight = New-Object System.Drawing.Bitmap($tw, $th, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($xx = 0; $xx -lt $tw; $xx++) {
    for ($yy = 0; $yy -lt $th; $yy++) {
      $tight.SetPixel($xx, $yy, $wm.GetPixel($minX + $xx, $minY + $yy))
    }
  }
  $wm.Dispose()
  return $tight
}

$base = [System.Drawing.Bitmap]::new($uaePath)
if ($base.Width -ne $base.Height) { throw "Expected square UAE master" }
$S = $base.Width

$out = New-Object System.Drawing.Bitmap($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# 1) Full background (flags + gradient) as starting point
$g.DrawImage($base, 0, 0, $S, $S)

# Brand navy matches Android colorPrimary / launcher script (avoids cyan bands from bad pixel samples)
$navyBrand = [System.Drawing.Color]::FromArgb(255, 0x02, 0x3C, 0x69)

# 2) Center icon zone — tint with semi-transparent navy so underlying gradient still reads, then official mark
#    Tune these if ribbons clip (values are for 1024; scale proportionally if source size changes)
$scale = $S / 1024.0
# Slightly tighter box so UAE ribbons that wrap the mark stay visible; still clears the old 3D crest
$iconZoneX = [int](256 * $scale)
$iconZoneY = [int](128 * $scale)
$iconZoneW = [int](512 * $scale)
$iconZoneH = [int](472 * $scale)
$iconFill = Get-AverageBorderColor -Bmp $base -Rx $iconZoneX -Ry $iconZoneY -Rw $iconZoneW -Rh $iconZoneH
$brush = New-Object System.Drawing.SolidBrush($iconFill)
$g.FillRectangle($brush, $iconZoneX, $iconZoneY, $iconZoneW, $iconZoneH)
$brush.Dispose()

$iconImg = [System.Drawing.Image]::FromFile($iconPath)
$pad = [int]([Math]::Min($iconZoneW, $iconZoneH) * 0.06)
$innerW = $iconZoneW - 2 * $pad
$innerH = $iconZoneH - 2 * $pad
$aspect = $iconImg.Width / $iconImg.Height
$drawW = $innerW
$drawH = [int]($drawW / $aspect)
if ($drawH -gt $innerH) {
  $drawH = $innerH
  $drawW = [int]($drawH * $aspect)
}
$dx = $iconZoneX + ($iconZoneW - $drawW) / 2
$dy = $iconZoneY + ($iconZoneH - $drawH) / 2
New-ChromaDraw -G $g -Img $iconImg -DstX $dx -DstY $dy -DstW $drawW -DstH $drawH
$iconImg.Dispose()

# 3) Bottom wordmark band — clear a centered strip (leaves corner ribbons) then official type
$textBandX = [int](138 * $scale)
$textBandY = [int](668 * $scale)
$textBandW = $S - 2 * $textBandX
$textBandH = $S - $textBandY - [int](28 * $scale)
# Bottom band: flat brand navy (border sample would pick up flag stripes at the sides)
$b2 = New-Object System.Drawing.SolidBrush($navyBrand)
$g.FillRectangle($b2, $textBandX, $textBandY, $textBandW, $textBandH)
$b2.Dispose()

$wmBmp = Get-WordmarkBitmap -LogoFile $logoPath
$maxTextW = [int]($textBandW * 0.92)
$tw = $wmBmp.Width
$th = $wmBmp.Height
$scaleText = [Math]::Min(1.0, $maxTextW / $tw)
$dw = [int]($tw * $scaleText)
$dh = [int]($th * $scaleText)
$tx = $textBandX + ($textBandW - $dw) / 2
$ty = $textBandY + ($textBandH - $dh) / 2
New-ChromaDraw -G $g -Img $wmBmp -DstX $tx -DstY $ty -DstW $dw -DstH $dh
$wmBmp.Dispose()

$g.Dispose()
$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
$base.Dispose()

Write-Host "Wrote $outPath"
Get-Item $outPath | Select-Object FullName, Length, LastWriteTime | Format-List
