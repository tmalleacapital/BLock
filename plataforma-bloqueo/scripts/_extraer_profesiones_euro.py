"""
Script temporal para extraer las opciones de Profesión del portal Euro (Mobysuite).
Uso: python _extraer_profesiones_euro.py
Requiere: EURO_USER y EURO_PASS en variables de entorno o en scripts/.env
"""
import os, json
from playwright.sync_api import sync_playwright

def _load_dotenv():
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_file):
        return
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_dotenv()

URL_LOGIN  = "https://euro.mobysuite.com/login"
URL_CLIENTES = "https://euro.mobysuite.com/customers/create"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=300)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Login
    page.goto(URL_LOGIN, wait_until="networkidle")
    page.fill('[data-cy="login-email"]',    os.environ["EURO_USER"])
    page.fill('[data-cy="login-password"]', os.environ["EURO_PASS"])
    page.click('[data-cy="login-submit"]')
    page.wait_for_load_state("networkidle")

    # Ir a crear cliente
    page.goto(URL_CLIENTES, wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Abrir el dropdown de profesión
    prof_inp = page.locator('input.vs__search[placeholder="Seleccione Profesión"]')
    prof_inp.scroll_into_view_if_needed()
    prof_inp.click()
    page.wait_for_timeout(500)
    # Espacio para mostrar todas las opciones sin filtro
    page.keyboard.press(" ")
    page.keyboard.press("Backspace")
    page.wait_for_timeout(1000)

    opciones = page.locator('.vs__dropdown-option')
    opciones.first.wait_for(state="visible", timeout=10_000)
    page.wait_for_timeout(500)

    total = opciones.count()
    profesiones = [opciones.nth(i).text_content().strip() for i in range(total)]

    browser.close()

print(f"\nTotal: {total} profesiones\n")
for p in profesiones:
    print(f'  {{ value: {json.dumps(p)}, label: {json.dumps(p.title())} }},')
