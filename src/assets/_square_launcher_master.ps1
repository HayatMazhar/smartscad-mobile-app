# Crops or pads sanadkom_apk_icon_composite.png to a strict 1024x1024 square (center crop if larger).
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$p = Join-Path $dir 'sanadkom_apk_icon_composite.png'
$b = [System.Drawing.Bitmap]::FromFile($p)
Write-Host "Input: $($b.Width)x$($b.Height)"
$S = 1024
$out = New-Object System.Drawing.Bitmap($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
if ($b.Width -ge $S -and $b.Height -ge $S) {
  $sx = [int](($b.Width - $S) / 2)
  $sy = [int](($b.Height - $S) / 2)
  $g.DrawImage($b, [System.Drawing.Rectangle]::new(0, 0, $S, $S), [System.Drawing.Rectangle]::new($sx, $sy, $S, $S), [System.Drawing.GraphicsUnit]::Pixel)
}
else {
  $fill = [System.Drawing.Color]::FromArgb(255, 0x1E, 0x4A, 0x82)
  $g.Clear($fill)
  $scale = [Math]::Max($S / $b.Width, $S / $b.Height)
  $nw = [int]($b.Width * $scale)
  $nh = [int]($b.Height * $scale)
  $dx = [int](($S - $nw) / 2)
  $dy = [int](($S - $nh) / 2)
  $g.DrawImage($b, $dx, $dy, $nw, $nh)
}
$g.Dispose()
$b.Dispose()
# Save to a temp file first (GDI+ fails writing in-place over the file still open on some systems)
$tmp = Join-Path $dir 'sanadkom_apk_icon_composite._tmp.png'
$out.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Move-Item -LiteralPath $tmp -Destination $p -Force
Write-Host "Wrote square $p"
