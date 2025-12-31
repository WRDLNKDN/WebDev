@echo off
REM Initialize git, commit, and push to GitHub for WeirdLinkedIn
cd /d C:\Projects\WeirdLinkedIn

REM Initialize git repo if not already initialized
if not exist .git (
    git init
)

REM Add all files
git add .

REM Commit changes
git commit -m "Initial commit: scaffold frontend and backend for WeirdLinkedIn"

REM Set main branch
git branch -M main

REM Add remote (replace if already exists)
git remote remove origin 2>nul

git remote add origin https://github.com/AprilLorDrake/WeirdLinkedIn.git

REM Push to GitHub
git push -u origin main

pause
