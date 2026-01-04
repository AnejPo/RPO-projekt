#Samo dummy code za testiranje

def compare_svg(template_id: str, user_svg: str) -> dict:
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

    return{
        "template_id" : template_id,
        "score": 0,
        "avg_error": None,
        "max_error": None,
        "errors": [],
        "hints": ["Not implemented yet"]
    }
