import easyocr
import os

# Define the model storage directory relative to this script
model_dir = os.path.join(os.path.dirname(__file__), 'easyocr_model')

# Ensure the directory exists
if not os.path.exists(model_dir):
    os.makedirs(model_dir)

print(f"Downloading EasyOCR model to {model_dir}...")

# Initialize Reader to trigger download
# gpu=False because build environment likely doesn't have GPU
reader = easyocr.Reader(['en'], gpu=False, model_storage_directory=model_dir, download_enabled=True)

print("EasyOCR model downloaded successfully.")
