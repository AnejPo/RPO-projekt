import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] # backend/routes -> backend
DATA_DIR = BACKEND_DIR / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"
ASSETS_DIR = BACKEND_DIR / "assets"

def load_manifest() -> dict:
    """
    Helper funkcija za nalaganje manifest.json v a python dictionary
    
    :return: dictionary of tasks
    :rtype: dict
    """

    if not MANIFEST_PATH.exists():
        raise FileNotFoundError("manifest.json not found")
    
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

def find_task(manifest: dict, task_id: str) -> dict | None:
    """
    Najde eno vajo/template glede na task_id.
    
    :param manifest: python dictionary taskov in lessonov
    :type manifest: dict
    :param lesson_id: id lekcije/templata, ki ga zelimo najti
    :type lesson_id: str
    :return: Dictionary ene lekcije/templata
    :rtype: dict | None
    """

    #manifest shema: "tasks":[]
    tasks = manifest.get("tasks") or []

    for item in tasks:
        #lesson_id = id in manifest
        if item.get("task_id") == task_id:
            return item
        
    return None

def find_lesson(manifest: dict, lesson_id: str) -> dict | None:
    """
    Najde eno lekcijo glede na lesson_id
    
    :param manifest: python dictionary taskov in lessonov
    :type manifest: dict
    :param lesson_id: id lekcije/templata, ki ga zelimo najti
    :type lesson_id: str
    :return: Dictionary ene lekcije/templata
    :rtype: dict | None
    """

    #manifest shema: "lessons":[]
    tasks = manifest.get("lessons") or []

    for item in tasks:
        #lesson_id = id in manifest
        if item.get("task_id") == lesson_id:
            return item
        
    return None