# Burger Lub POS Installer

## Installer Files

The following installer files have been created in the `dist` folder:

1. **[Burger Lub POS-Setup-1.0.0.exe](file://e:\New%20folder%20(3)\dist\Burger%20Lub%20POS-Setup-1.0.0.exe)** - Full installer for Burger Lub POS
   - Size: ~689 KB
   - Creates desktop shortcut
   - Installs to user's AppData folder
   - Includes automatic uninstaller

2. **[dist/win-unpacked](file://e:\New%20folder%20(3)\dist\win-unpacked)** - Portable version
   - Complete standalone application
   - Can be copied to any location and run directly
   - No installation required

## Installation Instructions

### Option 1: Using the Installer (Recommended)
1. Double-click **[Burger Lub POS-Setup-1.0.0.exe](file://e:\New%20folder%20(3)\dist\Burger%20Lub%20POS-Setup-1.0.0.exe)**
2. Follow the installation wizard
3. The application will be installed and a desktop shortcut will be created
4. Launch the application from the desktop shortcut or Start Menu

### Option 2: Portable Version
1. Copy the entire **[dist/win-unpacked](file://e:\New%20folder%20(3)\dist\win-unpacked)** folder to your desired location
2. Double-click **Burger Lub POS.exe** to run the application
3. No installation is required

## Features Included in This Build

1. **All Printing Fixes**:
   - Receipt size accommodation improvements
   - Flexible print settings for various printer types
   - Consistent receipt formatting

2. **Receipt Length Enhancement**:
   - Increased bottom spacing on all receipts (80px instead of 40px)
   - Better visual presentation

3. **Electron Integration**:
   - Silent printing without dialog boxes
   - Custom printer selection
   - Automatic printer detection

4. **Full POS Functionality**:
   - Food, Drinks, Deals, and Extras management
   - Sales tracking and reporting
   - Day open/close operations
   - User management (Admin/Cashier roles)

## System Requirements
- Windows 7 or later
- At least 50 MB of free disk space
- Printer recommended for receipt printing

## Troubleshooting

If you encounter any issues:

1. **Printing Problems**:
   - Ensure your printer is turned ON and has paper
   - Check that your printer is properly connected
   - Verify printer is set as default if using default printing

2. **Application Won't Start**:
   - Ensure all previous versions are completely closed
   - Check Windows Event Viewer for error details
   - Try running as Administrator

3. **Installation Issues**:
   - Ensure you have sufficient disk space
   - Check Windows permissions for installation directory
   - Temporarily disable antivirus during installation

## Uninstalling

### If Installed with Installer:
1. Go to Windows Control Panel → Programs and Features
2. Find "Burger Lub POS" in the list
3. Click "Uninstall"

### If Using Portable Version:
1. Simply delete the [dist/win-unpacked](file://e:\New%20folder%20(3)\dist\win-unpacked) folder
2. No registry entries or system files are created

## Version Information
- Version: 1.0.0
- Build Date: October 19, 2025
- All fixes and enhancements included