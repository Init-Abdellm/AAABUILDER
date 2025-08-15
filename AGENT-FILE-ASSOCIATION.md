# .agent File Association Setup

This document explains how to set up `.agent` files to display the `z.png` icon in Windows File Explorer, just like how `.html` files show HTML icons, `.css` files show CSS icons, etc.

## What This Does

After setup, `.agent` files will:
- ✅ Display the `z.png` icon in File Explorer
- ✅ Show "AAABuilder Agent File" as the file type
- ✅ Have right-click context menu options:
  - **Open with AAABuilder** - Runs the agent
  - **Edit Agent** - Opens in Notepad
  - **Validate Agent** - Validates the agent file
  - **Run Agent** - Executes the agent

## Setup Methods

### Method 1: Automatic Setup (Recommended)

1. **Right-click** on `register-agent-files.bat`
2. Select **"Run as Administrator"**
3. Follow the prompts
4. Restart File Explorer if needed

### Method 2: Manual PowerShell

1. **Right-click** on `register-agent-files.ps1`
2. Select **"Run with PowerShell"**
3. Run as Administrator if prompted

### Method 3: Manual Registry

1. **Right-click** on `register-agent-files.reg`
2. Select **"Merge"**
3. Confirm the registry changes

## What Gets Registered

The scripts create these Windows registry entries:

```
HKEY_CLASSES_ROOT\.agent
├── (Default) = "AAABuilder.Agent"

HKEY_CLASSES_ROOT\AAABuilder.Agent
├── (Default) = "AAABuilder Agent File"
├── FriendlyTypeName = "AAABuilder Agent File"
├── DefaultIcon
│   └── (Default) = "path\to\z.png,0"
└── shell
    ├── open\command = "aaab.js %1"
    ├── edit\command = "notepad.exe %1"
    ├── validate\command = "aaab.js validate %1"
    └── run\command = "aaab.js run %1"
```

## Troubleshooting

### Icon Not Showing
- Restart File Explorer: `taskkill /f /im explorer.exe && start explorer.exe`
- Clear icon cache: `ie4uinit.exe -show`
- Check if `z.png` exists in the `public` folder

### File Association Not Working
- Ensure you ran the script as Administrator
- Check Windows Defender/antivirus isn't blocking registry changes
- Verify the paths in the registry are correct

### Right-Click Menu Missing
- Refresh the registry: `gpupdate /force`
- Restart the computer
- Check if the registry keys were created properly

## Uninstalling

To remove the file association:

```powershell
# Remove .agent file type
Remove-Item "HKCR:\.agent" -Recurse -Force
Remove-Item "HKCR:AAABuilder.Agent" -Recurse -Force
```

## File Structure

```
AAABuilder/
├── public/
│   └── z.png                    # Icon file for .agent files
├── register-agent-files.reg     # Registry file for manual setup
├── register-agent-files.ps1     # PowerShell script
├── register-agent-files.bat     # Batch file for easy execution
└── AGENT-FILE-ASSOCIATION.md    # This documentation
```

## Notes

- The icon path uses `%~dp0` (batch) or `$PSScriptRoot` (PowerShell) to get the current directory
- Windows may cache icons, so a restart of File Explorer might be needed
- The setup works for the current user and system-wide
- You can customize the icon by replacing `z.png` with any other image file
