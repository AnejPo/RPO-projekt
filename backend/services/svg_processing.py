from __future__ import annotations
from typing import List, Tuple
import xml.etree.ElementTree as ET
from svgpathtools import parse_path #dependency

Point = Tuple[float, float]

def sv_string_to_points(svg_text: str, samples: int = 300) -> List[Point]:
    """
    Izvlece vse <path d="..."> iz SVG stringa in vzorči točke po njih
    
    :param svg_text: Description
    :type svg_text: str
    :param samples: Description
    :type samples: int
    :return: Seznam (x,y) tock
    :rtype: List[Point]
    """

    try:
        root = ET.fromstring(svg_text)