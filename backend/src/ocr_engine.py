import easyocr
import sys
import json
import os
import re

def extract_plate(image_path):
    try:
        # Initialize EasyOCR Reader
        # gpu=False for Render free tier (CPU only), allow_list helps accuracy
        reader = easyocr.Reader(['en'], gpu=False)
        
        # Read the image
        result = reader.readtext(image_path)
        
        detected_text = []
        best_plate = ""
        
        # Indian License Plate Regex Patterns
        # e.g., MH 12 DE 1433, AP07TA4050
        # Relaxed pattern to catch variations, then strict check
        plate_pattern = re.compile(r'[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,2}[ -]?[0-9]{3,4}')

        for (bbox, text, prob) in result:
            upper_text = text.upper().replace(' ', '')
            detected_text.append(upper_text)
            
            # Simple heuristic: matches pattern and has reasonable length
            if len(upper_text) >= 6 and len(upper_text) <= 12:
                # Basic cleanup map for common OCR errors in plates
                # 0->O, O->0 based on position is hard here without specific logic, 
                # but let's do generic corrections if needed or just trust EasyOCR (it's usually good).
                # Actually, let's just look for the best pattern match.
                
                if plate_pattern.search(upper_text) or len(upper_text) == 10:
                     best_plate = upper_text
                     # If we find a strong match, prioritize it.
                     pass

        # If no regex match, take the longest alphanumeric string that looks like a plate
        if not best_plate and detected_text:
             for text in detected_text:
                  if len(text) > 4 and any(c.isdigit() for c in text) and any(c.isalpha() for c in text):
                       best_plate = text
                       break
        
        output = {
            "success": True,
            "plate": best_plate,
            "raw_results": detected_text
        }
        
        print(json.dumps(output))

    except Exception as e:
        error_out = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_out))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    extract_plate(image_path)
