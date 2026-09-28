@echo off
echo ========================================
echo   Burger Lub POS - Manual Packaging
echo ========================================
echo.
echo Cleaning previous builds...
echo.
rmdir /s /q dist 2>nul
echo.
echo Building web assets...
echo.
npm run build
echo.
echo Creating portable package...
echo.
mkdir dist
mkdir dist\BurgerLubPOS
echo.
echo Copying application files...
echo.
xcopy main.js dist\BurgerLubPOS\ /Y
xcopy preload.cjs dist\BurgerLubPOS\ /Y
xcopy license.js dist\BurgerLubPOS\ /Y
xcopy gen-key.js dist\BurgerLubPOS\ /Y
xcopy assets dist\BurgerLubPOS\assets\ /E /Y
xcopy dist dist\BurgerLubPOS\dist\ /E /Y
xcopy renderer dist\BurgerLubPOS\renderer\ /E /Y
echo.
echo Creating start script...
echo.
echo @echo off > dist\BurgerLubPOS\Start_Burger_Lub_POS.bat
echo cd /d "%%~dp0" >> dist\BurgerLubPOS\Start_Burger_Lub_POS.bat
echo electron main.js >> dist\BurgerLubPOS\Start_Burger_Lub_POS.bat
echo pause >> dist\BurgerLubPOS\Start_Burger_Lub_POS.bat
echo.
echo Creating README...
echo.
echo ============================= >> dist\BurgerLubPOS\README.txt
echo    Burger Lub POS >> dist\BurgerLubPOS\README.txt
echo ============================= >> dist\BurgerLubPOS\README.txt
echo. >> dist\BurgerLubPOS\README.txt
echo To run the application: >> dist\BurgerLubPOS\README.txt
echo 1. Install Node.js and Electron globally >> dist\BurgerLubPOS\README.txt
echo    (npm install -g electron) >> dist\BurgerLubPOS\README.txt
echo 2. Double-click Start_Burger_Lub_POS.bat >> dist\BurgerLubPOS\README.txt
echo. >> dist\BurgerLubPOS\README.txt
echo System Requirements: >> dist\BurgerLubPOS\README.txt
echo - Windows 7 or later >> dist\BurgerLubPOS\README.txt
echo - Node.js installed >> dist\BurgerLubPOS\README.txt
echo - Electron installed globally >> dist\BurgerLubPOS\README.txt
echo ============================= >> dist\BurgerLubPOS\README.txt
echo.
echo Creating zip package...
echo.
powershell Compress-Archive -Path dist\BurgerLubPOS\* -DestinationPath dist\BurgerLubPOS.zip -Force
echo.
echo Packaging complete!
echo.
echo Package created: dist\BurgerLubPOS.zip
echo.
echo To install:
echo 1. Extract the zip file to any location
echo 2. Install Node.js from https://nodejs.org/
echo 3. Open command prompt as Administrator and run:
echo    npm install -g electron
echo 4. Double-click Start_Burger_Lub_POS.bat to run
echo.
pause