#!/bin/bash

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed. Please install Python3 and try again."
    exit 1
fi

# Check if serve_game.py exists
if [ ! -f "serve_game.py" ]; then
    echo "Error: serve_game.py not found in the current directory."
    exit 1
fi

# Run serve_game.py
python3 serve_game.py 