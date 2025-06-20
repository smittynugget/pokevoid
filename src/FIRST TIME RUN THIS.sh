#!/bin/bash

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed. Please install Python3 and try again."
    exit 1
fi

# Check if update_game.py exists
if [ ! -f "update_game.py" ]; then
    echo "Error: update_game.py not found in the current directory."
    exit 1
fi

# Run update_game.py
python3 update_game.py 