import perspective
import body_parts
import shading
import tracing

def compare_svg(task: dict, user_svg: str) -> dict:
    """
    Cilj te funkcije v prihodnosti je:
    1) Nalozi template SVG z template_id
    2) Parsaj oba SVG-ja v tocke
    3) Normaliziraj SVG-ja
    4) Zracuna razliko (poklici pravilno datoteko glede na to kateri course trenutno izvaja uporabnik)
    5) Vrni razliko + opis napak
    
    :param template_id: Description
    :type template_id: str
    :param user_svg: Description
    :type user_svg: str
    :return: Description
    :rtype: dict
    """

    compare_type = task.get("compare_type")
    params = task.get("params", {})

    if compare_type == "tracing":
        return tracing.compare(
            template_file = task.get("file"),
            user_svg = user_svg,
            **params
        )
    
    elif compare_type == "body":
        return body_parts.compare(
            template_file = task.get("file"),
            user_svg = user_svg,
            **params
        )
    
    elif compare_type == "perpective":
        return perspective.compare(
            template_file = task.get("file"),
            user_svg = user_svg,
            **params
        )
    
    elif compare_type == "shading":
        return shading.compare(
            template_file = task.get("file"),
            user_svg = user_svg,
            **params
        )

    else:
        raise ValueError(f"Unknown compare type: {compare_type}")
