#!/bin/bash
echo "Starting LinkRide!"

if [ ! -d ".venv" ]; then
  echo "Virtual environment not found! Creating!"
  python3 -m venv .venv
fi

echo "Entering virtual environment!"
source .venv/bin/activate
echo "Upgrading pip!"
pip install --upgrade pip
echo "Installing requirements!"
pip install -r requirements.txt

echo "Starting app!"
cd src || (echo "ERROR! no src folder found!" && exit)
uvicorn main:app --host 0.0.0.0 --port 8001
echo "Bye!"