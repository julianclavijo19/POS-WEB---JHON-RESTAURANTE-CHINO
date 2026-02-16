# Envía bytes RAW a una impresora Windows por nombre.
# Uso: .\send-raw-printer.ps1 -PrinterName "Nombre Impresora" -Base64Bytes "G3AA..."
# Pausa para que la impresora termine trabajos previos (ticket, etc.).
# 800ms recomendado cuando la impresora está ocupada.
param(
  [Parameter(Mandatory=$true)]
  [string]$PrinterName,
  [Parameter(Mandatory=$true)]
  [string]$Base64Bytes,
  [int]$PreDelayMs = 800
)

Start-Sleep -Milliseconds $PreDelayMs

$code = @'
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName = "Raw";
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile = null;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType = "RAW";
  }
  [DllImport("winspool.Drv", CharSet=CharSet.Ansi, SetLastError=true)]
  public static extern bool OpenPrinterA([MarshalAs(UnmanagedType.LPStr)] string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", CharSet=CharSet.Ansi, SetLastError=true)]
  public static extern bool StartDocPrinterA(IntPtr hPrinter, int Level, [In] DOCINFOA pDocInfo);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static bool SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter = IntPtr.Zero;
    IntPtr pBytes = IntPtr.Zero;
    try {
      if (!OpenPrinterA(printerName, out hPrinter, IntPtr.Zero)) return false;
      DOCINFOA di = new DOCINFOA();
      if (!StartDocPrinterA(hPrinter, 1, di)) return false;
      if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); return false; }
      pBytes = Marshal.AllocHGlobal(bytes.Length);
      Marshal.Copy(bytes, 0, pBytes, bytes.Length);
      int written;
      bool ok = WritePrinter(hPrinter, pBytes, bytes.Length, out written);
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      return ok;
    } finally {
      if (pBytes != IntPtr.Zero) Marshal.FreeHGlobal(pBytes);
      if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
    }
  }
}
'@

try {
  Add-Type -TypeDefinition $code -ErrorAction Stop
} catch {
  if ($_.Exception.Message -notmatch 'already exists') { throw }
}
$bytes = [Convert]::FromBase64String($Base64Bytes)
$ok = [RawPrinter]::SendBytes($PrinterName, $bytes)
if (-not $ok) {
  Write-Error "WritePrinter falló - Impresora ocupada o desconectada"
  exit 1
}
