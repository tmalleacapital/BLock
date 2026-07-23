"""
_browser_comun.py
Utilidades comunes para los scripts de bloqueo POR PORTAL (Playwright).

Igual que _email_comun.py unifica el correo, esto unifica lo que todos repiten:
carga del .env, arranque del navegador con auto-aceptado de diálogos nativos, y
el relleno de inputs con evento `blur` (clave: muchos portales —intl-tel-input,
RUT con búsqueda— solo validan al perder el foco, y page.fill() no lo dispara).
"""

import os
from contextlib import contextmanager

from playwright.sync_api import sync_playwright, Page


def load_dotenv() -> None:
    """Carga scripts/.env en os.environ (sin pisar variables ya definidas)."""
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_file):
        return
    with open(env_file, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())


@contextmanager
def abrir_navegador(
    headless: bool = True,
    slow_mo: int = 150,
    width: int = 1440,
    height: int = 960,
    locale: str = 'es-CL',
    accept_dialogs: bool = True,
):
    """Entrega una Page lista (navegador + contexto) y cierra todo al salir.
    Con accept_dialogs=True auto-acepta los alert/confirm nativos."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, slow_mo=slow_mo)
        context = browser.new_context(viewport={"width": width, "height": height}, locale=locale)
        page = context.new_page()
        if accept_dialogs:
            page.on("dialog", lambda d: d.accept())
        try:
            yield page
        finally:
            browser.close()


def _solo_digitos(valor: str) -> str:
    """Deja solo dígitos y quita el prefijo país 56 si viene incluido."""
    t = "".join(c for c in (valor or "") if c.isdigit())
    if len(t) > 9 and t.startswith("56"):
        t = t[2:]
    return t


def telefono_9(valor: str) -> str:
    """Móvil en formato local de 9 dígitos ('993092974').
    Para campos intl-tel-input / vue-tel-input, que ya traen el +56 aparte: si se
    les pasa el prefijo otra vez el número queda inválido y el form no guarda."""
    return _solo_digitos(valor)


def telefono_56(valor: str) -> str:
    """Móvil en formato internacional ('+56993092974'), para portales que lo
    esperan completo en un input de texto normal."""
    t = _solo_digitos(valor)
    if not t:
        return ""
    return "+56" + t if len(t) == 9 else "+" + t


def set_input(page: Page, campo_id: str, valor: str) -> bool:
    """Rellena un input/textarea/select por id disparando input/change/BLUR.
    Devuelve False si el elemento no existe."""
    return page.evaluate(
        """({id, val}) => {
            const el = document.getElementById(id);
            if (!el) return false;
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input',  {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
            el.dispatchEvent(new Event('blur',   {bubbles:true}));
            return true;
        }""",
        {"id": campo_id, "val": valor},
    )
