from __future__ import annotations
from typing import List, Tuple
import xml.etree.ElementTree as ET
from svgpathtools import parse_path #dependency
import math

Point = Tuple[float, float]

def svg_string_to_stroke(svg_text: str, samples: int = 300) -> List[List[Point]]:
    """
    Izvlece vse <path d="..."> iz SVG stringa in vzorči točke po njih
    
    :param svg_text: svg string, ki ga vzorcimo
    :type svg_text: str
    :param samples: Koliko tock bo vzorcenih po "risbi"
    :type samples: int
    :return: Seznam vseh poti z (x,y) tockami vzorcenih po njih
    :rtype: ListList[Point]]
    """

    def is_tag(elem, name: str) -> bool:
        return elem.tag.endswith("}" + name) or elem.tag == name
    
    try:
        root = ET.fromstring(svg_text) #root je <svg> elements poslan iz html
    except ET.ParseError:
        return []
    
    strokes: List[List[Point]] = []
    for elem in root.iter():
        #PATH
        if is_tag(elem, "path"):
            d = elem.attrib.get("d")
            if not d:
                continue

            p = parse_path(d)
            pts: List[Point] = []
            for i in range(samples):
                t = i / (samples - 1) if samples > 1 else 0.0
                z = p.point(t)
                pts.append((float(z.real), float(z.imag)))

            if pts:
                strokes.append(pts)
        #ELIPSE
        elif is_tag(elem, "ellipse"):
            cx = float(elem.attrib.get("cx", 0.0))
            cy = float(elem.attrib.get("cy", 0.0))
            rx = float(elem.attrib.get("rx", 0.0))
            ry = float(elem.attrib.get("ry", 0.0))

            pts = sample_ellipse(cx, cy, rx, ry, samples)
            if pts:
                strokes.append(pts)

        #RECT
        elif is_tag(elem, "rect"):
            x = float(elem.attrib.get("x", 0.0))
            y = float(elem.attrib.get("y", 0.0))
            w = float(elem.attrib.get("width", 0.0))
            h = float(elem.attrib.get("height", 0.0))

            pts = sample_rect(x,y,w,h,samples)
            if pts:
                strokes.append(pts)

    return strokes


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

def normalize_strokes(strokes: List[List[Point]]) -> List[List[Point]]:
    """
    Normalizira stroke tako da:
    - Lokacija risbe na kanvasu ni pomembna
    - Velikost risbe ni pomembna
    
    Vse tocke bodo na koncu med (0,0) in (1,1)
    :param strokes: crte za risbo, ki jo zelimo normalizirati
    :type points: List[List[Point]]
    :return: Normalizirane crte
    :rtype: List[List[Point]]
    """

    if not strokes:
        return strokes
    
    all_points = [pt for stroke in strokes for pt in stroke]
    if not all_points:
        return strokes
    
    cx, cy, scale = compute_normalization(all_points)

    if scale == 0:
        return [[(0.0, 0.0) for _ in stroke] for stroke in strokes]
    
    return [
        [((x - cx) / scale, (y - cy) / scale) for (x,y) in stroke]
        for stroke in strokes
    ]
    


def compute_normalization(points: List[Point]) -> tuple[float, float, float]:
    """
    Zracunaj globalni (cx, cy, scale) za normalizacijo

    Ne da se mi pisat vsega vec bruh
    """

    xs = [x for x, _ in points]
    ys = [y for _, y in points]

    min_x, max_x = min(xs), max (xs)
    min_y, max_y = min(ys), max(ys)

    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0

    w = max_x - min_x
    h = max_y - min_y

    scale = max(w, h)

    return cx, cy, scale

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
    
    cx, cy, scale = compute_normalization(points)

    if scale == 0:
        return [(0.0, 0.0) for _ in points]
    
    return [((x-cx)/scale, (y-cy)/scale) for (x,y) in points]
    
def sample_ellipse(cx: float, cy: float, rx:float, ry:float, samples:int) -> List[Point]:
    if samples <= 0 or rx <= 0 or ry <= 0:
        return pts
    
    pts: List[Point] = []

    for i in range(samples):
        t = 2.0 * math.pi * i / samples
        x = cx + rx * math.cos(t)
        y = cy + ry * math.sin(t)
        pts.append((x,y))
    return pts

def sample_rect(x:float, y:float, w:float, h:float, samples:int) -> List[Point]:
    pts: List[Point]

    if samples <= 0 or w <= 0 or h <= 0:
        return pts

    per_edge = max(2, samples // 4)

    for i in range(per_edge):
        t = i / (per_edge - 1)
        pts.append((x + t * w, y))

    for i in range(per_edge):
        t = i / (per_edge - 1)
        pts.append((x + w, y + t * h))

    for i in range(per_edge):
        t = i / (per_edge - 1)
        pts.append((x + w - t * w, y+h))

    for i in range(per_edge - 1):
        t = i / (per_edge - 1)
        pts.append((x, y + h - t * h))

    return pts