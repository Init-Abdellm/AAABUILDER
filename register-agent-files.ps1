# PowerShell script to register .agent files with z.png icon
# Run this as Administrator

param(
    [string]$ProjectPath = $PSScriptRoot
)

Write-Host "Registering .agent file association with z.png icon..." -ForegroundColor Green

# Get the full path to z.png
$iconPath = Join-Path $ProjectPath "public\z.png"
if (-not (Test-Path $iconPath)) {
    Write-Error "Icon file not found: $iconPath"
    exit 1
}

# Convert to absolute path
$iconPath = (Get-Item $iconPath).FullName

Write-Host "Using icon: $iconPath" -ForegroundColor Yellow

try {
    # Register .agent file extension
    New-ItemProperty -Path "HKCR:\.agent" -Name "(Default)" -Value "AAABuilder.Agent" -Force | Out-Null
    
    # Create file type association
    New-Item -Path "HKCR:AAABuilder.Agent" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent" -Name "(Default)" -Value "AAABuilder Agent File" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent" -Name "FriendlyTypeName" -Value "AAABuilder Agent File" -Force | Out-Null
    
    # Set the icon
    New-Item -Path "HKCR:AAABuilder.Agent\DefaultIcon" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\DefaultIcon" -Name "(Default)" -Value "$iconPath,0" -Force | Out-Null
    
    # Add shell commands
    New-Item -Path "HKCR:AAABuilder.Agent\shell\open" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\open" -Name "(Default)" -Value "Open with AAABuilder" -Force | Out-Null
    
    New-Item -Path "HKCR:AAABuilder.Agent\shell\open\command" -Force | Out-Null
    $aaabPath = Join-Path $ProjectPath "bin\aaab.js"
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\open\command" -Name "(Default)" -Value "`"$aaabPath`" `"%1`"" -Force | Out-Null
    
    # Add edit command
    New-Item -Path "HKCR:AAABuilder.Agent\shell\edit" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\edit" -Name "(Default)" -Value "Edit Agent" -Force | Out-Null
    
    New-Item -Path "HKCR:AAABuilder.Agent\shell\edit\command" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\edit\command" -Name "(Default)" -Value "notepad.exe `"%1`"" -Force | Out-Null
    
    # Add validate command
    New-Item -Path "HKCR:AAABuilder.Agent\shell\validate" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\validate" -Name "(Default)" -Value "Validate Agent" -Force | Out-Null
    
    New-Item -Path "HKCR:AAABuilder.Agent\shell\validate\command" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\validate\command" -Name "(Default)" -Value "`"$aaabPath`" validate `"%1`"" -Force | Out-Null
    
    # Add run command
    New-Item -Path "HKCR:AAABuilder.Agent\shell\run" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\run" -Name "(Default)" -Value "Run Agent" -Force | Out-Null
    
    New-Item -Path "HKCR:AAABuilder.Agent\shell\run\command" -Force | Out-Null
    New-ItemProperty -Path "HKCR:AAABuilder.Agent\shell\run\command" -Name "(Default)" -Value "`"$aaabPath`" run `"%1`"" -Force | Out-Null
    
    Write-Host "Successfully registered .agent files with z.png icon!" -ForegroundColor Green
    Write-Host "You may need to restart File Explorer or refresh the desktop for changes to take effect." -ForegroundColor Yellow
    
} catch {
    Write-Error "Failed to register file association: $_"
    exit 1
}
