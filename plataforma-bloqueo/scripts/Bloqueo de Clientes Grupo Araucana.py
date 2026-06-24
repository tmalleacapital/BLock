"""
Bloqueo de Clientes Grupo Araucana.py
Automatización de bloqueo de clientes en Cliperty para Grupo Araucana – Aires de Marañon.

Uso standalone:  python "Bloqueo de Clientes Grupo Araucana.py"
Uso con datos:   python "Bloqueo de Clientes Grupo Araucana.py" '{"rut":"...", ...}'
Ver navegador:   HEADLESS=0 python "Bloqueo de Clientes Grupo Araucana.py"
"""

import sys
import json
import unicodedata
import os
from playwright.sync_api import sync_playwright, Page


def _load_dotenv() -> None:
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

URL_LOGIN = "https://app.cliperty.com/login"
PROYECTO = "Aires de Marañon"
HEADLESS = os.environ.get('HEADLESS', '1') != '0'


def _norm(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("(", " ").replace(")", " ").replace("/", " ").strip()


def _fecha_iso(fecha_ddmmyyyy: str) -> str:
    """Convierte dd/mm/yyyy a yyyy-mm-dd para inputs type=date."""
    partes = fecha_ddmmyyyy.replace("-", "/").split("/")
    if len(partes) == 3:
        dd, mm, yyyy = partes
        return f"{yyyy}-{mm.zfill(2)}-{dd.zfill(2)}"
    return fecha_ddmmyyyy


def angular_select(page: Page, selector: str, label: str) -> None:
    """Selecciona por texto exacto en un <select> Angular y dispara change."""
    if not label:
        raise ValueError(f'Valor vacío para el select {selector}')
    loc = page.locator(selector)
    loc.wait_for(state="visible", timeout=30_000)
    loc.scroll_into_view_if_needed()
    page.select_option(selector, label=label)
    loc.evaluate("el => el.dispatchEvent(new Event('change'))")
    page.wait_for_timeout(600)


def angular_select_fuzzy(page: Page, selector: str, label: str) -> None:
    """Selecciona la opción cuyo texto normalizado más coincide con label."""
    if not label:
        raise ValueError(f'Valor vacío para el select {selector}')
    loc = page.locator(selector)
    loc.wait_for(state="visible", timeout=30_000)
    loc.scroll_into_view_if_needed()

    target = _norm(label)
    options = loc.locator("option").all()

    best_text: str | None = None
    best_score = 0  # exige al menos 1 coincidencia real; evita elegir opción arbitraria

    for opt in options:
        raw = (opt.text_content() or "").strip()
        norm = _norm(raw)
        if norm in ("seleccione una opcion", ""):
            continue
        if norm == target:
            best_text = raw
            best_score = 9999
            break
        target_words = [w for w in target.split() if len(w) > 2]
        norm_words = [w for w in norm.split() if len(w) > 2]
        score = sum(
            1 for tw in target_words
            if any(nw.startswith(tw[:5]) or tw.startswith(nw[:5]) for nw in norm_words)
        )
        if score > best_score:
            best_score = score
            best_text = raw

    if best_text is None:
        raise ValueError(f'Opción "{label}" no encontrada en {selector}')

    page.select_option(selector, label=best_text)
    loc.evaluate("el => el.dispatchEvent(new Event('change'))")
    page.wait_for_timeout(700)


def fill_date(page: Page, fecha_ddmmyyyy: str) -> None:
    """Rellena el campo de fecha de nacimiento detectando si es date o text."""
    # Intentar por type=date primero
    date_loc = page.locator("input[type='date']").first
    if date_loc.count() > 0 and date_loc.is_visible():
        date_loc.scroll_into_view_if_needed()
        date_loc.fill(_fecha_iso(fecha_ddmmyyyy))
        page.wait_for_timeout(300)
        return

    # Buscar input de texto cercano al label "Dirección y Número" (que viene antes)
    # o al label de fecha de nacimiento
    filled = page.evaluate(
        """(fecha) => {
            const inputs = Array.from(document.querySelectorAll('input.input'));
            for (const inp of inputs) {
                const ph = inp.placeholder || '';
                const id = inp.id || '';
                if (/fecha|birth|nasc|born|nacimiento/i.test(id + ph)) {
                    inp.value = fecha;
                    inp.dispatchEvent(new Event('input', {bubbles: true}));
                    inp.dispatchEvent(new Event('change', {bubbles: true}));
                    return true;
                }
            }
            return false;
        }""",
        fecha_ddmmyyyy,
    )
    if not filled:
        # Fallback: 5.° input de clase .input (aproximación posicional)
        inputs = page.locator("input.input")
        if inputs.count() >= 5:
            inputs.nth(4).fill(fecha_ddmmyyyy)
    page.wait_for_timeout(300)


def fill_direccion(page: Page, direccion: str) -> None:
    """Rellena el campo de dirección buscándolo por el label id="label-address"."""
    filled = page.evaluate(
        """(dir) => {
            const label = document.getElementById('label-address');
            if (!label) return false;
            let el = label.nextElementSibling;
            while (el) {
                if (el.tagName === 'INPUT') {
                    el.value = dir;
                    el.dispatchEvent(new Event('input', {bubbles: true}));
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                    return true;
                }
                const inp = el.querySelector && el.querySelector('input');
                if (inp) {
                    inp.value = dir;
                    inp.dispatchEvent(new Event('input', {bubbles: true}));
                    inp.dispatchEvent(new Event('change', {bubbles: true}));
                    return true;
                }
                el = el.nextElementSibling;
            }
            // Fallback: input dentro del parent del label
            const parent = label.parentElement;
            if (parent) {
                const inp2 = parent.querySelector('input');
                if (inp2) {
                    inp2.value = dir;
                    inp2.dispatchEvent(new Event('input', {bubbles: true}));
                    inp2.dispatchEvent(new Event('change', {bubbles: true}));
                    return true;
                }
            }
            return false;
        }""",
        direccion,
    )
    if not filled:
        try:
            page.locator("input[placeholder*='irección']").first.fill(direccion)
        except Exception:
            pass
    page.wait_for_timeout(300)


def select_commune(page: Page, comuna: str) -> None:
    """Selecciona la comuna en el select que se habilita tras elegir provincia."""
    # Esperar a que aparezca un select habilitado que no sea ninguno de los conocidos
    known_ids = (
        "select-country", "select-region", "select-province",
        "select-gender", "select-profession", "select-nationalities", "select-mediaOrigin",
    )
    known_js = json.dumps(list(known_ids))
    page.wait_for_function(
        f"""() => {{
            const known = {known_js};
            const sel = Array.from(document.querySelectorAll('select.select'))
                .find(s => !known.includes(s.id) && !s.disabled && s.options.length > 1);
            return !!sel;
        }}""",
        timeout=15_000,
    )
    commune_id = page.evaluate(
        f"""() => {{
            const known = {known_js};
            const sel = Array.from(document.querySelectorAll('select.select'))
                .find(s => !known.includes(s.id) && !s.disabled && s.options.length > 1);
            return sel ? ('#' + (sel.id || '')) : null;
        }}"""
    )
    if commune_id and commune_id != '#':
        angular_select_fuzzy(page, commune_id, comuna)
        return

    # Fallback posicional: el 4.º select.select (índice 3)
    sel = page.locator("select.select").nth(3)
    sel.wait_for(state="visible", timeout=10_000)
    target = _norm(comuna)
    best_text: str | None = None
    best_score = -1
    for opt in sel.locator("option").all():
        raw = (opt.text_content() or "").strip()
        if _norm(raw) in ("seleccione una opcion", ""):
            continue
        if _norm(raw) == target:
            best_text = raw
            break
        if target and (target in _norm(raw) or _norm(raw) in target):
            score = len(_norm(raw))
            if score > best_score:
                best_score = score
                best_text = raw
    if best_text:
        sel.select_option(label=best_text)
        sel.evaluate("el => el.dispatchEvent(new Event('change'))")
        page.wait_for_timeout(600)
    else:
        raise ValueError(f'Comuna "{comuna}" no encontrada en el portal')


def bloquear_cliente(data: dict) -> dict:
    usuario = os.environ.get('ARAUCANA_USER')
    clave = os.environ.get('ARAUCANA_PASS')
    if not usuario or not clave:
        return {
            "status": "error",
            "message": "Faltan credenciales: define ARAUCANA_USER y ARAUCANA_PASS en las variables de entorno.",
        }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, slow_mo=300)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()

        try:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="domcontentloaded")
            page.wait_for_selector("#input-usuario", state="visible", timeout=30_000)
            page.fill("#input-usuario", usuario)
            page.fill("#input-password", clave)
            page.locator(".btn_login").click()
            page.wait_for_timeout(3_000)

            # ── 2. Seleccionar proyecto ────────────────────────────────────────
            proyecto_loc = page.locator("div.col-12 h1").filter(has_text=PROYECTO).first
            proyecto_loc.wait_for(state="visible", timeout=30_000)
            proyecto_loc.scroll_into_view_if_needed()
            proyecto_loc.click()
            page.wait_for_timeout(2_500)

            # ── 3. Gestión → Cotizador ─────────────────────────────────────────
            gestion = page.locator("div.item_cnt").filter(has_text="Gestión").first
            gestion.wait_for(state="visible", timeout=30_000)
            gestion.click()
            page.wait_for_timeout(800)

            cotizador = page.locator("div.item_cnt").filter(has_text="Cotizador").first
            cotizador.wait_for(state="visible", timeout=15_000)
            cotizador.click()
            page.wait_for_timeout(2_000)

            # ── 4. Vista lista ─────────────────────────────────────────────────
            page.locator("div.icon-list").first.wait_for(state="visible", timeout=20_000)
            page.locator("div.icon-list").first.click()
            page.wait_for_timeout(1_000)

            # ── 5. Filtro → Disponible ─────────────────────────────────────────
            page.locator("button").filter(has_text="Agregar Filtros").first.click()
            page.wait_for_timeout(700)

            dropdown = page.locator("span.dropdown-btn").first
            dropdown.wait_for(state="visible", timeout=10_000)
            dropdown.click()
            page.wait_for_timeout(500)

            page.locator("div").filter(has_text="Disponible").first.click()
            page.wait_for_timeout(1_500)

            # ── 6. Carrito → primera unidad disponible ─────────────────────────
            cart = page.locator("i.fa-solid.fa-cart-shopping.fa-xl.show-active").first
            cart.wait_for(state="visible", timeout=20_000)
            cart.scroll_into_view_if_needed()
            cart.click()
            page.wait_for_timeout(1_000)

            # ── 7. Ir a Cotización ─────────────────────────────────────────────
            page.locator("button.btn_save").filter(has_text="Ir a Cotización").wait_for(
                state="visible", timeout=15_000
            )
            page.locator("button.btn_save").filter(has_text="Ir a Cotización").click()
            page.wait_for_timeout(2_000)

            # ── 8. Agregar Cliente ─────────────────────────────────────────────
            page.locator("button.btn_search").filter(has_text="Agregar Cliente").wait_for(
                state="visible", timeout=20_000
            )
            page.locator("button.btn_search").filter(has_text="Agregar Cliente").click()
            page.wait_for_timeout(1_500)

            # ── 9. Formulario del cliente ─────────────────────────────────────
            rut_loc = page.locator("#input-rut")
            rut_loc.wait_for(state="visible", timeout=30_000)
            rut_loc.click()
            rut_loc.fill(data.get("rut", ""))
            page.wait_for_timeout(1_000)  # el portal puede buscar si ya existe

            page.locator("#input-name").scroll_into_view_if_needed()
            page.locator("#input-name").fill(data.get("nombres", ""))
            page.wait_for_timeout(300)

            apellidos = f"{data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
            page.locator("#input-lastName").fill(apellidos)
            page.wait_for_timeout(300)

            # Teléfono — intl-tel-input ya pone +56, solo ingresar los 9 dígitos
            celular = data.get("telefonoCelular", "")
            celular_loc = page.locator("#input-cellPhone")
            celular_loc.scroll_into_view_if_needed()
            celular_loc.click()
            celular_loc.fill(celular)
            page.wait_for_timeout(300)

            page.locator("#input-email").fill(data.get("correoElectronico", ""))
            page.wait_for_timeout(300)

            # País → Chile (predeterminado)
            page.select_option("#select-country", label="Chile")
            page.locator("#select-country").evaluate("el => el.dispatchEvent(new Event('change'))")
            page.wait_for_timeout(500)

            # Región
            angular_select_fuzzy(page, "#select-region", data.get("region", ""))

            # Ciudad / Provincia (se habilita tras seleccionar Región)
            page.wait_for_function(
                "() => { const s = document.getElementById('select-province'); "
                "return s && !s.disabled && s.options.length > 1; }",
                timeout=10_000,
            )
            angular_select_fuzzy(page, "#select-province", data.get("ciudad", ""))

            # Comuna (select que se habilita tras elegir Provincia)
            select_commune(page, data.get("comuna", ""))

            # Dirección y Número
            fill_direccion(page, data.get("direccion", ""))

            # Fecha de nacimiento
            fill_date(page, data.get("fechaNacimiento", ""))

            # Sexo
            angular_select(page, "#select-gender", data.get("genero", ""))

            # Profesión
            angular_select_fuzzy(page, "#select-profession", data.get("profesion", ""))

            # Nacionalidad
            angular_select_fuzzy(page, "#select-nationalities", data.get("nacionalidad", "Chileno/a"))

            # Medio de origen
            angular_select_fuzzy(page, "#select-mediaOrigin", data.get("mediaOrigen", "Capital Inteligente"))

            # ── 10. Guardar ────────────────────────────────────────────────────
            save_btn = page.locator("button.btn_save").first
            save_btn.wait_for(state="visible", timeout=15_000)
            save_btn.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            save_btn.click()
            page.wait_for_timeout(2_000)

            return {
                "status": "success",
                "message": f"Cliente bloqueado correctamente en Cliperty (Grupo Araucana – {PROYECTO}).",
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

        finally:
            browser.close()


DATOS_PRUEBA = {
    "rut":               "12.345.678-5",
    "nombres":           "Juan Carlos",
    "apellidoPaterno":   "García",
    "apellidoMaterno":   "López",
    "telefonoCelular":   "912345678",
    "correoElectronico": "juan@example.com",
    "region":            "Región Metropolitana de Santiago",
    "ciudad":            "Santiago",
    "comuna":            "Providencia",
    "direccion":         "Av. Providencia 1234",
    "fechaNacimiento":   "15/06/1985",
    "genero":            "Masculino",
    "profesion":         "Ingeniero(a)",
    "nacionalidad":      "Chileno/a",
    "mediaOrigen":       "Capital Inteligente",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
