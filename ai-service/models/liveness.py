import cv2
import numpy as np

def check_liveness(selfie_img: np.ndarray) -> dict:
    """
    Passive PAD heuristic (simulated MiniFASNet).
    A real system would run a lightweight CNN on the face crop.
    Here we mock it using basic heuristics for structure.
    """
    try:
        # Check blur using Laplacian variance
        gray = cv2.cvtColor(selfie_img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # If variance is too low, it's very blurry => fake
        # If variance is decent, pretend it's real for the mock
        passive_score = 0.95 if blur_score > 100 else 0.4
        
        return {
            "status": "ok",
            "passive": passive_score,
            "active": {
                "challenge": "none",
                "passed": True,
                "nonceOk": True
            }
        }
    except Exception as e:
        print(f"Liveness Error: {e}")
        return {"status": "error"}
