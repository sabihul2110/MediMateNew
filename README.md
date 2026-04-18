<!-- # MediMate/README.md -->

# To run the backend, from MediMate/backend/:

source ../.venv/bin/activate     # .venv is at root now
python3 dataset_loader.py        # smoke test first
uvicorn main:app --reload --port 8000


# To run the frontend, from MediMate/frontend/:

npm run dev