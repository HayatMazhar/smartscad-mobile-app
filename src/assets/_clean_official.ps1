Add-Type -AssemblyName System.Drawing

$src = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\src\assets\scad-logo-official.png'
$dst = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\src\assets\scad-logo-official.png'

$img = [System.Drawing.Bitmap]::new($src)
Write-Host ("Input: {0}x{1}" -f $img.Width, $img.Height)

# 1. Find first non-blue-header row (the screenshot has a solid blue ribbon up top)
$cropTop = 0
for ($y = 0; $y -lt $img.Height; $y++) {
    $px = $img.GetPixel(2, $y)
    # blue header pixel ~ (41,125,227)
    if (-not ($px.R -lt 90 -and $px.G -gt 100 -and $px.G -lt 160 -and $px.B -gt 200)) {
        $cropTop = $y
        break
    }
}
Write-Host "Blue header ends at y=$cropTop"

# 2. Find content bbox below the header (anything that isn't the off-white bg)
$bgR = 237; $bgG = 241; $bgB = 245
function IsBg($p) {
    return ([Math]::Abs($p.R - $bgR) -lt 12) -and
           ([Math]::Abs($p.G - $bgG) -lt 12) -and
           ([Math]::Abs($p.B - $bgB) -lt 12)
}
$minX = $img.Width; $maxX = 0; $minY = $img.Height; $maxY = $cropTop
for ($y = $cropTop; $y -lt $img.Height; $y++) {
    for ($x = 0; $x -lt $img.Width; $x++) {
        $px = $img.GetPixel($x, $y)
        if ($px.A -lt 30) { continue }
        if (IsBg $px) { continue }
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
    }
}
Write-Host ("Logo bbox: ({0},{1})-({2},{3})" -f $minX, $minY, $maxX, $maxY)

# 3. Crop with small padding and convert background pixels to transparent
$pad = 8
$x0 = [Math]::Max(0, $minX - $pad)
$y0 = [Math]::Max($cropTop, $minY - $pad)
$x1 = [Math]::Min($img.Width - 1, $maxX + $pad)
$y1 = [Math]::Min($img.Height - 1, $maxY + $pad)
$w = $x1 - $x0 + 1
$h = $y1 - $y0 + 1

$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($yy = 0; $yy -lt $h; $yy++) {
    for ($xx = 0; $xx -lt $w; $xx++) {
        $px = $img.GetPixel($x0 + $xx, $y0 + $yy)
        if (IsBg $px) {
            # Knock out background -> transparent
            $out.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Compute "how close to bg" -> blend alpha so anti-aliased edges look clean
            $dist = [Math]::Sqrt(
                [Math]::Pow($px.R - $bgR, 2) +
                [Math]::Pow($px.G - $bgG, 2) +
                [Math]::Pow($px.B - $bgB, 2)
            )
            $alpha = if ($dist -gt 80) { 255 } else { [int](255 * ($dist / 80)) }
            $out.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb($alpha, $px.R, $px.G, $px.B))
        }
    }
}

$img.Dispose()
$out.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("Saved cleaned logo: {0}x{1}" -f $out.Width, $out.Height)
$out.Dispose()
