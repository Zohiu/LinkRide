echo "Starting LinkRide!"

echo "Upgrading pip!"
python -m pip install --upgrade pip
echo "Installing requirements!"
python -m pip install -r requirements.txt

echo "Starting app!"
cd src
uvicorn main:app --reload
echo "Bye!"