Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Drawing2D -ErrorAction SilentlyContinue

$assets = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\src\assets'

# 1) Extract the Sanadkom icon (left section of the wordmark, before the gap)
$src = "$assets\sanadkom_logo.png"
$srcImg = [System.Drawing.Bitmap]::new($src)
$cropX = 0
$cropW = 295   # gap starts at 284, give a bit of breathing room
$cropY = 0
$cropH = $srcImg.Height

# Trim transparent rows/cols inside the crop region for a tight fit
$minX = $cropW; $maxX = 0; $minY = $cropH; $maxY = 0
for ($x = $cropX; $x -lt ($cropX + $cropW); $x++) {
    for ($y = $cropY; $y -lt ($cropY + $cropH); $y++) {
        $px = $srcImg.GetPixel($x, $y)
        if ($px.A -gt 30) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
Write-Host "Icon bounding box: ($minX,$minY) -> ($maxX,$maxY)  size $($maxX - $minX + 1)x$($maxY - $minY + 1)"

$tightW = $maxX - $minX + 1
$tightH = $maxY - $minY + 1
$pad = 16

$iconBmp = New-Object System.Drawing.Bitmap(($tightW + $pad * 2), ($tightH + $pad * 2), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $tightW, $tightH)
$dstRect = New-Object System.Drawing.Rectangle($pad, $pad, $tightW, $tightH)
$g.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$iconOut = "$assets\sanadkom_icon.png"
$iconBmp.Save($iconOut, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $iconOut  ($($iconBmp.Width)x$($iconBmp.Height))"
$iconBmp.Dispose()
$srcImg.Dispose()

# 2) Recolor SCAD white-on-transparent logo to NAVY for the white footer
$scadSrc = "$assets\scad-logo-white.png"
$scadImg = [System.Drawing.Bitmap]::new($scadSrc)
$navy = [System.Drawing.Color]::FromArgb(255, 0x02, 0x3C, 0x69)

# Trim to bounding box first
$sMinX = $scadImg.Width; $sMaxX = 0; $sMinY = $scadImg.Height; $sMaxY = 0
for ($x = 0; $x -lt $scadImg.Width; $x++) {
    for ($y = 0; $y -lt $scadImg.Height; $y++) {
        $px = $scadImg.GetPixel($x, $y)
        if ($px.A -gt 30) {
            if ($x -lt $sMinX) { $sMinX = $x }
            if ($x -gt $sMaxX) { $sMaxX = $x }
            if ($y -lt $sMinY) { $sMinY = $y }
            if ($y -gt $sMaxY) { $sMaxY = $y }
        }
    }
}
Write-Host ""
Write-Host "SCAD logo bbox: ($sMinX,$sMinY)-($sMaxX,$sMaxY)"

$tw = $sMaxX - $sMinX + 1
$th = $sMaxY - $sMinY + 1
$pad2 = 12
$navyBmp = New-Object System.Drawing.Bitmap(($tw + $pad2 * 2), ($th + $pad2 * 2), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($navyBmp)
$g2.Clear([System.Drawing.Color]::Transparent)
$g2.Dispose()

# Pixel-by-pixel: keep alpha, replace RGB with navy
for ($x = 0; $x -lt $tw; $x++) {
    for ($y = 0; $y -lt $th; $y++) {
        $sx = $x + $sMinX
        $sy = $y + $sMinY
        $px = $scadImg.GetPixel($sx, $sy)
        if ($px.A -gt 0) {
            $newPx = [System.Drawing.Color]::FromArgb($px.A, $navy.R, $navy.G, $navy.B)
            $navyBmp.SetPixel($x + $pad2, $y + $pad2, $newPx)
        }
    }
}

$navyOut = "$assets\scad-logo-navy.png"
$navyBmp.Save($navyOut, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $navyOut  ($($navyBmp.Width)x$($navyBmp.Height))"
$navyBmp.Dispose()
$scadImg.Dispose()

Write-Host ""
Write-Host "===== Final assets ====="
Get-ChildItem $assets -File | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
