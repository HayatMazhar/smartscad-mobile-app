# -----------------------------------------------------------------------------
# Sanadkom launcher MASTER (sanadkom_apk_icon_composite.png @ 1024x1024) — recreated.
# - Renders internally at supersampled resolution, then downsizes (clean edges).
# - Background: darker Sanadkom-family blue gradient (#1E4A82 -> #0B1E38), harmonizes with primary #297DE3
# - Logo: keyed near-white matte from sanadkom_icon.png, scaled large in upper area
# - UAE flag: full width, waved edge + shading, smooth bands (no 1px ladders)
#
# Prerequisites: sanadkom_icon.png in this folder
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File _compose_launcher_tamm_official.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File _square_launcher_master.ps1
# Then from android/:  powershell -NoProfile -ExecutionPolicy Bypass -File .\generate_app_icons.ps1
# -----------------------------------------------------------------------------

Add-Type -AssemblyName System.Drawing
if (-not ('LauncherKey' -as [type])) {
Add-Type -ReferencedAssemblies 'System.Drawing.dll' @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LauncherKey {
  public static Bitmap RemoveNearWhite(Bitmap src, byte threshold) {
    int w = src.Width;
    int h = src.Height;
    var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    var rect = new Rectangle(0, 0, w, h);

    BitmapData bs = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData bd = dst.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    try {
      int sStride = bs.Stride;
      int dStride = bd.Stride;
      const int bpp = 4;

      for (int y = 0; y < h; y++) {
        IntPtr pS = IntPtr.Add(bs.Scan0, y * sStride);
        IntPtr pD = IntPtr.Add(bd.Scan0, y * dStride);

        for (int x = 0; x < w; x++) {
          int o = x * bpp;
          byte b = Marshal.ReadByte(pS, o);
          byte g = Marshal.ReadByte(pS, o + 1);
          byte r = Marshal.ReadByte(pS, o + 2);
          byte a = Marshal.ReadByte(pS, o + 3);

          if (a < 12 || (r >= threshold && g >= threshold && b >= threshold)) {
            Marshal.WriteByte(pD, o, 0);
            Marshal.WriteByte(pD, o + 1, 0);
            Marshal.WriteByte(pD, o + 2, 0);
            Marshal.WriteByte(pD, o + 3, 0);
          } else {
            Marshal.WriteByte(pD, o, b);
            Marshal.WriteByte(pD, o + 1, g);
            Marshal.WriteByte(pD, o + 2, r);
            Marshal.WriteByte(pD, o + 3, a);
          }
        }
      }
    }
    finally {
      src.UnlockBits(bs);
      dst.UnlockBits(bd);
    }

    return dst;
  }
}
'@
}

$assets   = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconPath = Join-Path $assets 'sanadkom_icon.png'
$outPath  = Join-Path $assets 'sanadkom_apk_icon_composite.png'

if (-not (Test-Path $iconPath)) {
  throw "Missing $iconPath"
}

# Dark-ish brand blue (same hue family as colors.ts primary #297DE3; reads well behind light logo / flag band)
$cTopRgb = @(0x1E, 0x4A, 0x82)
$cBotRgb = @(0x0B, 0x1E, 0x38)

function New-KeyedLogoBitmap {
  param(
    [string]$Path,
    [byte]$Thr = 247
  )
  $pfArgb = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  $raw = [System.Drawing.Bitmap]::FromFile($Path)
  try {
    $src = $raw
    if ($raw.PixelFormat -ne $pfArgb) {
      $converted = New-Object System.Drawing.Bitmap($raw.Width, $raw.Height, $pfArgb)
      $tg = [System.Drawing.Graphics]::FromImage($converted)
      $tg.DrawImage($raw, 0, 0)
      $tg.Dispose()
      $src = $converted
    }
    $out = [LauncherKey]::RemoveNearWhite($src, $Thr)
    if ($src -ne $raw) {
      $src.Dispose()
    }
    return $out
  }
  finally {
    $raw.Dispose()
  }
}

function New-ShadedColor([double]$k, [int]$r, [int]$g, [int]$b) {
  $k = [math]::Max(0.74, [math]::Min(1.06, $k))
  return [System.Drawing.Color]::FromArgb(255,
    [int][math]::Min(255, $r * $k),
    [int][math]::Min(255, $g * $k),
    [int][math]::Min(255, $b * $k))
}

function Fill-UaeFlagWavySmooth {
  param(
    [System.Drawing.Graphics]$G,
    [int]$X, [int]$Y, [int]$W, [int]$H
  )

  $baseRedW = [int]($W / 4)
  $amp  = [math]::Max(10, [int]($W * 0.02))
  $lam1 = [double]$H / 2.15
  $lam2 = [double]$H / 1.05

  # Vertical band height (multiple rows at once = smoother when supersampled)
  $band = [math]::Max(3, [int]($H / 180))
  if ($band -gt 8) { $band = 8 }

  for ($yy = 0; $yy -lt $H; $yy += $band) {
    $hNow = [math]::Min($band, $H - $yy)
    $yMid = $yy + ($hNow / 2.0)
    $phase  = 2 * [math]::PI * $yMid / $lam1
    $phase2 = 2 * [math]::PI * $yMid / $lam2 + 0.65
    $shift  = [int]($amp * [math]::Sin($phase))
    $shade  = 0.88 + 0.09 * [math]::Cos($phase2)

    $redEdge = $baseRedW + $shift
    if ($redEdge -lt [int]($W * 0.19)) { $redEdge = [int]($W * 0.19) }
    if ($redEdge -gt [int]($W * 0.30)) { $redEdge = [int]($W * 0.30) }

    $t = $yMid / [double][math]::Max(1, $H - 1)
    $stripe = if ($t -lt (1.0 / 3.0)) { 'G' } elseif ($t -lt (2.0 / 3.0)) { 'W' } else { 'K' }

    $yAbs = $Y + $yy

    $cR = New-ShadedColor $shade 0xCE 0x11 0x26
    $bR = New-Object System.Drawing.SolidBrush($cR)
    $G.FillRectangle($bR, $X, $yAbs, $redEdge, $hNow)
    $bR.Dispose()

    switch ($stripe) {
      'G' { $cr = New-ShadedColor $shade 0x00 0x73 0x2F }
      'W' { $cr = New-ShadedColor $shade 0xFF 0xFF 0xFF }
      'K' { $cr = New-ShadedColor $shade 0x02 0x02 0x06 }
    }
    $bS = New-Object System.Drawing.SolidBrush($cr)
    $G.FillRectangle($bS, $X + $redEdge, $yAbs, $W - $redEdge, $hNow)
    $bS.Dispose()
  }
}

# --- Supersample (internal then box down to 1024) ---
$outDim   = 1024
$super    = 2
$S        = $outDim * $super

$hi = New-Object System.Drawing.Bitmap($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($hi)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$cTop = [System.Drawing.Color]::FromArgb(255, $cTopRgb[0], $cTopRgb[1], $cTopRgb[2])
$cBot = [System.Drawing.Color]::FromArgb(255, $cBotRgb[0], $cBotRgb[1], $cBotRgb[2])
$ptA = New-Object System.Drawing.Point(0, 0)
$ptB = New-Object System.Drawing.Point(0, $S)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($ptA, $ptB, $cTop, $cBot)
$g.FillRectangle($bg, 0, 0, $S, $S)
$bg.Dispose()

$flagFrac = 0.355
$flagH = [int]($S * $flagFrac)
$flagY = $S - $flagH
Fill-UaeFlagWavySmooth -G $g -X 0 -Y $flagY -W $S -H $flagH

$penDiv = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55, 0xFF, 0xFF, 0xFF), [float]($super * 1.2))
$g.DrawLine($penDiv, 0, $flagY, $S, $flagY)
$penDiv.Dispose()

# Logo (keyed), max size in region above flag
$keyed = New-KeyedLogoBitmap -Path $iconPath -Thr 247
$logoAreaH = $flagY
$padX = [int]($S * 0.035)
$padTop = [int]($S * 0.028)
$padBot = [int]($S * 0.018)
$maxW = $S - (2 * $padX)
$maxH = $logoAreaH - $padTop - $padBot

$aspect = $keyed.Width / [double]$keyed.Height
$drawW = $maxW
$drawH = [int]($drawW / $aspect)
if ($drawH -gt $maxH) {
  $drawH = $maxH
  $drawW = [int]($drawH * $aspect)
}

$dx = [int](($S - $drawW) / 2)
$dy = $padTop + [int](($maxH - $drawH) / 2)

$g.DrawImage($keyed, (New-Object System.Drawing.Rectangle($dx, $dy, $drawW, $drawH)), 0, 0, $keyed.Width, $keyed.Height, [System.Drawing.GraphicsUnit]::Pixel)
$keyed.Dispose()

$g.Dispose()

# Downscale to 1024
$lo = New-Object System.Drawing.Bitmap($outDim, $outDim, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($lo)
$g2.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g2.DrawImage($hi, 0, 0, $outDim, $outDim)
$g2.Dispose()
$hi.Dispose()

$lo.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$lo.Dispose()

Write-Host ""
Write-Host "Recreated master (supersampled -> 1024): $outPath" -ForegroundColor Green
Get-Item $outPath | Select-Object FullName, Length, LastWriteTime | Format-List
