@echo off
title Claude Web
cd /d "%~dp0"
if not exist "node_modules" npm install
node server.js
