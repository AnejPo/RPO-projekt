from __future__ import annotations
from typing import List, Tuple
import xml.etree.ElementTree as ET
from svgpathtools import parse_path #dependency

Point = Tuple[float, float]

def svg_string_to_points(svg_text: str, samples: int = 300) -> List[Point]:
    """
    Izvlece vse <path d="..."> iz SVG stringa in vzorči točke po njih
    
    :param svg_text: svg string, ki ga vzorcimo
    :type svg_text: str
    :param samples: Koliko tock bo vzorcenih po "risbi"
    :type samples: int
    :return: Seznam vseh (x,y) tock vzorcenih po vektorjih
    :rtype: List[Point]
    """

    try:
        root = ET.fromstring(svg_text) #root je <svg> elements poslan iz html
    except ET.ParseError:
        return []
    
    #ET sharnjuje tag kot {namespace}tagnamne
    def is_tag(elem, name: str) -> bool:
        return elem.tag.endswith("}" + name) or elem.tag == name
    
    #<path\n       style=\"fill:#ef5a5a;stroke:#ef5a5a;stroke-width:1;stroke-dasharray:none\"\n       d=\"M 45.593733,16.403173 V 83.765299\"\n       id=\"path3-2\" />

    #find all path elements
    ds: List[str] = []
    for elem in root.iter():
        if is_tag(elem, "path"):
            d = elem.attrib.get("d") #d = path string (glej gor)
            if d:
                ds.append(d)
    
    #no paths were found
    if not ds:
        return []
    
    paths = [parse_path(d) for d in ds] #converts d strings into Path objects
    
    lengths = [p.length(error=1e-3) for p in paths] #zracuna dolzino pathov da lahko enakomerno razdelimo tocke
    total = sum(lengths)
    if total <= 0:
        return []
    
    points: List[Point] = []
    for p, L in zip(paths, lengths):
        n = max(2, int(round(samples * (L / total)))) #vsaj 2 tocki za path

        for i in range(n):
            t = i / (n -1) if n > 1 else 0.0 #if tu samo za varnost, t = 0.0...1.0 (start...end)
            z = p.point(t) #z = x + yj -> coordinates
            points.append((float(z.real), float(z.imag)))

    return points

def normalize_points(points: List[Point]) -> List[Point]:
    """
    Normalizira točke tako da:
    - Lokacija risbe na kanvasu ni pomembna
    - Velikost risbe ni pomembna
    
    Vse tocke bodo na koncu med (0,0) in (1,1)
    :param points: Tocke za risbo, ki jo zelimo normalizirati
    :type points: List[Point]
    :return: Normalizirane tocke
    :rtype: List[Point]
    """

    if not points:
        return points
    
    xs = [x for x, _ in points]
    ys = [y for _, y in points]

    min_x, max_x = min(xs), max (xs)
    min_y, max_y = min(ys), max(ys)

    #zracunaj center
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0

    w = max_x - min_x
    h = max_y - min_y

    scale = max(w, h)

    if scale == 0:
        return [(0.0, 0.0) for _ in points]
    
    return [((x-cx)/scale, (y-cy)/scale) for (x,y) in points]
    
    