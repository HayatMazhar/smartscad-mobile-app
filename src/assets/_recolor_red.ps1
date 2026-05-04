Add-Type -AssemblyName System.Drawing

# SCAD brand red — the proper Statistics Centre Abu Dhabi corporate red.
$red = [System.Drawing.Color]::FromArgb(255, 0x9D, 0x22, 0x35)

$assets = 'D:\SCAD\Codebase\devops\smarthelp\SmartHelp\SmartSCAD.Mobile\SmartSCAD.Mobile.App\src\assets'

function Recolor-Png {
    param([string]$InPath, [string]$OutPath, [System.Drawing.Color]$Color)
    $src = [System.Drawing.Bitmap]::new($InPath)

    # Trim to bounding box of opaque pixels
    $minX = $src.Width; $maxX = 0; $minY = $src.Height; $maxY = 0
    for ($x = 0; $x -lt $src.Width; $x++) {
        for ($y = 0; $y -lt $src.Height; $y++) {
            $a = $src.GetPixel($x, $y).A
            if ($a -gt 30) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $tw = $maxX - $minX + 1
    $th = $maxY - $minY + 1
    $pad = 14
    Write-Host ("  in:  {0}  ({1}x{2})  bbox ({3},{4})-({5},{6})" -f (Split-Path $InPath -Leaf), $src.Width, $src.Height, $minX, $minY, $maxX, $maxY)

    $out = New-Object System.Drawing.Bitmap(($tw + $pad * 2), ($th + $pad * 2), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.Dispose()

    # Pixel replace — preserve alpha, swap RGB to target color
    for ($x = 0; $x -lt $tw; $x++) {
        for ($y = 0; $y -lt $th; $y++) {
            $px = $src.GetPixel($x + $minX, $y + $minY)
            if ($px.A -gt 0) {
                $out.SetPixel($x + $pad, $y + $pad,
                    [System.Drawing.Color]::FromArgb($px.A, $Color.R, $Color.G, $Color.B))
            }
        }
    }

    $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host ("  out: {0}  ({1}x{2})" -f (Split-Path $OutPath -Leaf), $out.Width, $out.Height)
    $out.Dispose()
    $src.Dispose()
}

Write-Host "===== Recolor Sanadkom icon -> red ====="
Recolor-Png "$assets\sanadkom_icon.png" "$assets\sanadkom_icon_red.png" $red

Write-Host ""
Write-Host "===== Recolor SCAD logo -> red ====="
Recolor-Png "$assets\scad-logo-white.png" "$assets\scad-logo-red.png" $red

Write-Host ""
Write-Host "===== Final assets ====="
Get-ChildItem $assets -File -Filter '*.png' | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
