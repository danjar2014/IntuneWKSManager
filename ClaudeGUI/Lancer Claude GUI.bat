@echo off
title Claude AI - Interface graphique
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "ClaudeGUI.ps1"
