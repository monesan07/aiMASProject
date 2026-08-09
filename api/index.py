import sys
import os

# Add backend directory to path and cd into it so relative imports in main.py work
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_dir))
os.chdir(os.path.abspath(backend_dir))

from main import app
