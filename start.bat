@echo off
echo Starting Employee Checklist Application...
cd /d %~dp0
pm2 delete employee-checklist
pm2 start ecosystem.config.js
pm2 save
echo Application is running on port 5000
echo Access locally at: http://localhost:5000
echo Access from other devices using your computer's IP address:
ipconfig | findstr /i "ipv4"
echo Port: 5000
pause
