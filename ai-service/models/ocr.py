import re
import cv2
import numpy as np

# Lazy load easyocr
reader = None

def get_reader():
    global reader
    if reader is None:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)
    return reader

def perform_ocr(front_img: np.ndarray, back_img: np.ndarray = None) -> dict:
    """
    Simulates extracting MRZ and OCR text from an ID.
    In a real scenario, this would use PaddleOCR or EasyOCR for text bounds.
    """
    try:
        ocr_reader = get_reader()
        # Read text from image
        result = ocr_reader.readtext(front_img)
        
        # A real pipeline would map bounding boxes to specific fields using a template matcher.
        # Here we mock the parsing for demonstration.
        full_text = " ".join([res[1] for res in result])
        
        # Heuristic extraction (mocked)
        return {
            "status": "ok",
            "quality": {
                "blur": 0.05,
                "glare": 0.02,
                "resolution": [front_img.shape[1], front_img.shape[0]],
                "passed": True
            },
            "fields": {
                "fullName": {"value": "Jane Doe", "conf": 0.95, "box": [0,0,100,20]},
                "dob": {"value": "1990-01-01", "conf": 0.98, "box": [0,0,100,20]},
                "idNumber": {"value": "ID123456789", "conf": 0.99, "box": [0,0,100,20]},
                "expiry": {"value": "2030-12-31", "conf": 0.96, "box": [0,0,100,20]}
            },
            "mrz": {
                "present": True,
                "valid": True,
                "checks": {
                    "docNo": True,
                    "dob": True,
                    "expiry": True,
                    "composite": True
                }
            },
            "crossChecks": {
                "mrzVsViz": True,
                "nameVsApplicant": 0.99
            }
        }
    except Exception as e:
        print(f"OCR Error: {e}")
        return {"status": "error"}
