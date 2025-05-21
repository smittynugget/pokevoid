#!/usr/bin/env python3
import os
import sys
import subprocess
import shutil
import tempfile
from pathlib import Path
import webbrowser
import http.server
import socketserver
import threading

REPO_URL = "https://github.com/smittynugget/pokevoid.git"
CURRENT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = CURRENT_DIR / "dist"

def run_command(command, cwd=None, shell=False):
    try:
        if isinstance(command, str) and not shell:
            command = command.split()
        
        result = subprocess.run(
            command,
            cwd=cwd if cwd else CURRENT_DIR,
            shell=shell,
            check=True,
            text=True,
            capture_output=True
        )
        print(f"Command succeeded: {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {command}")
        print(f"Error: {e.stderr}")
        sys.exit(1)

def check_git_installed():
    try:
        run_command("git --version")
        return True
    except:
        print("Git is not installed. Please install Git and try again.")
        return False

def check_npm_installed():
    try:
        run_command("npm --version")
        return True
    except:
        print("npm is not installed. Please install Node.js and npm and try again.")
        return False

def check_for_updates():
    if not (CURRENT_DIR / ".git").exists():
        print(f"Error: {CURRENT_DIR} is not a git repository")
        sys.exit(1)
    
    print("Fetching latest changes from remote...")
    run_command("git fetch", cwd=CURRENT_DIR)
    
    local_commit = run_command("git rev-parse HEAD", cwd=CURRENT_DIR).strip()
    remote_commit = run_command("git rev-parse @{u}", cwd=CURRENT_DIR).strip()
    
    return local_commit != remote_commit

def update_repository():
    print("Pulling latest changes...")
    run_command("git pull", cwd=CURRENT_DIR)

def install_dependencies():
    print("Installing dependencies...")
    run_command("npm install", cwd=CURRENT_DIR)

def build_project():
    print("Building project...")
    run_command("npm run build", cwd=CURRENT_DIR)

def serve_and_open():
    from serve_game import serve_game
    serve_game()

def main():
    print("Checking for prerequisites...")
    if not check_git_installed() or not check_npm_installed():
        sys.exit(1)
    
    print("Checking for updates...")
    if check_for_updates():
        print("Updates found! Downloading changes...")
        update_repository()
        print("Installing dependencies...")
        install_dependencies()
        print("Building project...")
        build_project()
    else:
        print("No updates found.")
        if not DIST_DIR.exists() or not any(DIST_DIR.iterdir()):
            print("Dist directory empty or not found. Building project...")
            build_project()
    
    serve_and_open()

if __name__ == "__main__":
    main() 