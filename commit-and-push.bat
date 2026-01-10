@echo off
REM Initialize git, commit, and push to GitHub for WRDLNKDN
cd /d C:\Projects\WRDLNKDN

REM Initialize git repo if not already initialized
if not exist .git (
    git init
)

REM Add all files
git add .

REM Commit changes
git commit -m "Initial commit: scaffold frontend and backend for WRDLNKDN"

REM Set main branch
git branch -M main

REM Add remote (replace if already exists)
git remote remove origin 2>nul

git remote add origin https://github.com/AprilLorDrake/WRDLNKDN.git

REM Push to GitHub
git push -u origin main

pause
