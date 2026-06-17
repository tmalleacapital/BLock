"""
Bloqueo Cliente Simonetti.py
Automatización de bloqueo de clientes en el portal Simonetti (Mobysuite).

Uso standalone:  python "Bloqueo Cliente Simonetti.py"
Uso con datos:   python "Bloqueo Cliente Simonetti.py" '{"rut":"...", ...}'
"""

import sys
import json
import re
import datetime
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

URL_LOGIN = "https://simonetti.mobysuite.com/login"
CREDS = {
    "usuario": os.environ['SIMONETTI_USER'],
    "clave":   os.environ['SIMONETTI_PASS'],
}


def _norm(texto: str) -> str:
    """Elimina acentos, paréntesis y pasa a minúsculas para comparación."""
    s = unicodedata.normalize("NFD", texto)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().replace("(", " ").replace(")", " ").replace("/", " ").replace(".", " ")


def calcular_rango_edad(fecha_nacimiento: str) -> str:
    """Devuelve el rango de edad dada una fecha 'DD-MM-AAAA'."""
    dia, mes, anio = fecha_nacimiento.split("-")
    nac = datetime.date(int(anio), int(mes), int(dia))
    hoy = datetime.date.today()
    edad = hoy.year - nac.year - ((hoy.month, hoy.day) < (nac.month, nac.day))
    if edad < 26:   return "1-25"
    elif edad < 36: return "26-35"
    elif edad < 46: return "36-45"
    elif edad < 56: return "46-55"
    elif edad < 66: return "56-65"
    else:           return "66 o más"


def vs_placeholder(page: Page, placeholder_fragment: str, opcion: str) -> None:
    """Selecciona en un vue-select identificado por texto de placeholder."""
    inp = page.locator(f'input.vs__search[placeholder*="{placeholder_fragment}"]')
    inp.scroll_into_view_if_needed()
    inp.click()
    inp.fill(opcion)
    page.wait_for_timeout(300)
    page.locator('.vs__dropdown-option').filter(has_text=opcion).first.click()
    page.wait_for_timeout(200)


def vs_placeholder_nth(page: Page, placeholder_fragment: str, n: int) -> None:
    """Abre un vue-select por placeholder y selecciona la n-ésima opción (1-indexed)."""
    inp = page.locator(f'input.vs__search[placeholder*="{placeholder_fragment}"]')
    inp.scroll_into_view_if_needed()
    inp.click()
    page.wait_for_timeout(400)
    page.locator('.vs__dropdown-option').nth(n - 1).click()
    page.wait_for_timeout(200)


def vs_placeholder_fuzzy(page: Page, placeholder_fragment: str, opcion: str) -> None:
    """Abre vue-select por placeholder, tipea 5 letras y elige por fuzzy (ignora género -o/-a)."""
    search_term = _norm(opcion).replace(" ", "")[:5]
    inp = page.locator(f'input.vs__search[placeholder*="{placeholder_fragment}"]')
    inp.scroll_into_view_if_needed()
    inp.click()
    page.wait_for_timeout(200)
    page.keyboard.type(search_term, delay=80)
    page.wait_for_timeout(600)

    opts = page.locator('.vs__dropdown-option')
    opts.first.wait_for(state="visible", timeout=20_000)
    page.wait_for_timeout(200)

    total = opts.count()
    target_words = [w for w in _norm(opcion).split() if len(w) > 2]
    best_idx, best_score = 0, -1

    for i in range(total):
        opt_text = _norm(opts.nth(i).text_content() or "")
        opt_words = [w for w in opt_text.split() if len(w) > 2]
        score = sum(
            1 for tw in target_words
            if any(bw[:5] == tw[:5] for bw in opt_words)
        )
        if score > best_score:
            best_score, best_idx = score, i

    opts.nth(best_idx).scroll_into_view_if_needed()
    opts.nth(best_idx).click()
    page.wait_for_timeout(200)


def placeholder_select_nth(page: Page, label: str, n: int) -> None:
    """Abre un div.placeholderInputText (vue-select) y elige la n-ésima opción (1-indexed)."""
    tgt = page.locator('div.placeholderInputText').filter(has_text=label).first
    tgt.wait_for(state="visible", timeout=30_000)
    tgt.scroll_into_view_if_needed()
    tgt.click()
    page.wait_for_timeout(500)
    opt = page.locator('li.vs__dropdown-option').nth(n - 1)
    opt.wait_for(state="visible", timeout=20_000)
    opt.scroll_into_view_if_needed()
    opt.click()
    page.wait_for_timeout(200)


def placeholder_select_texto(page: Page, label: str, opcion: str) -> None:
    """Abre un div.placeholderInputText (vue-select) y elige opción por texto.
    Primero intenta filter(has_text). Si no lo encuentra, busca el label en el DOM
    y navega al div.placeholderInputText más cercano."""
    tgt = page.locator('div.placeholderInputText').filter(has_text=label).first
    try:
        tgt.wait_for(state="visible", timeout=5_000)
    except Exception:
        # Label está fuera del div — buscarlo en el DOM circundante
        clicked = page.evaluate(
            """(label) => {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                    if (node.textContent.trim().toLowerCase() === label.toLowerCase()) {
                        let el = node.parentElement;
                        for (let i = 0; i < 8; i++) {
                            if (!el) break;
                            const ph = el.querySelector('div.placeholderInputText');
                            if (ph) { ph.scrollIntoView({block:'center'}); ph.click(); return true; }
                            el = el.parentElement;
                        }
                    }
                }
                return false;
            }""",
            label,
        )
        if not clicked:
            raise ValueError(f'div.placeholderInputText con label "{label}" no encontrado')
        page.wait_for_timeout(500)
        opt = page.locator('li.vs__dropdown-option').filter(has_text=opcion).first
        opt.wait_for(state="visible", timeout=20_000)
        opt.scroll_into_view_if_needed()
        opt.click()
        page.wait_for_timeout(200)
        return
    tgt.scroll_into_view_if_needed()
    tgt.click()
    page.wait_for_timeout(500)
    opt = page.locator('li.vs__dropdown-option').filter(has_text=opcion).first
    opt.wait_for(state="visible", timeout=20_000)
    opt.scroll_into_view_if_needed()
    opt.click()
    page.wait_for_timeout(200)


def bloquear_cliente(data: dict) -> dict:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, slow_mo=350)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, locale='es-CL')
        page = context.new_page()

        try:
            # ── 1. Login ───────────────────────────────────────────────────────
            page.goto(URL_LOGIN, wait_until="networkidle")
            page.fill("#login-email", CREDS["usuario"])
            page.fill('input[type="password"]', CREDS["clave"])

            # ── 2. CAPTCHA Altcha (prueba matemática — el browser la resuelve) ──
            chk = page.locator('.altcha-checkbox input[type="checkbox"]')
            chk.wait_for(state="visible", timeout=30_000)
            chk.scroll_into_view_if_needed()
            page.wait_for_timeout(2_000)
            chk.evaluate("el => el.click()")
            page.wait_for_function(
                '() => { const el = document.querySelector(".altcha-checkbox input[type=\'checkbox\']"); return el ? el.checked : false; }',
                timeout=180_000,
            )

            # ── 3. Iniciar sesión ──────────────────────────────────────────────
            page.click('button[data-cy="login-submit"]')
            page.wait_for_load_state("networkidle")

            # ── 4. Ir a Clientes ───────────────────────────────────────────────
            page.locator('a[href="/customers"]').wait_for(state="visible", timeout=30_000)
            page.locator('a[href="/customers"]').click()
            page.wait_for_load_state("networkidle")

            # ── 5. Crear cliente ───────────────────────────────────────────────
            page.locator('button[data-cy="button-create-customer"]').wait_for(state="visible", timeout=30_000)
            page.locator('button[data-cy="button-create-customer"]').click()
            page.wait_for_load_state("networkidle")
            # Esperar a que el b-overlay aparezca y luego desaparezca
            try:
                page.locator('div.b-overlay.position-fixed').wait_for(state="visible", timeout=3_000)
            except Exception:
                pass
            try:
                page.locator('div.b-overlay.position-fixed').wait_for(state="hidden", timeout=15_000)
            except Exception:
                pass

            # ── 6. Datos personales ────────────────────────────────────────────
            def rellenar(selector: str, valor: str) -> None:
                loc = page.locator(selector)
                loc.scroll_into_view_if_needed()
                loc.click()
                loc.fill(valor)

            page.locator('[data-cy="create-customer-rut"]').wait_for(state="visible", timeout=30_000)

            # Ingresar RUT — la página recarga y navega si el cliente ya existe
            url_antes = page.url
            rellenar('[data-cy="create-customer-rut"]', data.get("rut", ""))
            page.keyboard.press("Tab")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1_500)

            url_actual = page.url

            # Detección primaria: la URL cambió → el portal navegó al perfil del cliente
            if url_actual != url_antes and '/create' not in url_actual:
                cliente_ya_existe = True
                quote_ya_visible = page.locator('button[data-cy="quote_btn"]').is_visible()
            else:
                # Detección secundaria: formulario pre-rellenado en la misma URL
                quote_ya_visible = False
                try:
                    nombres_autofill = page.evaluate(
                        "document.querySelector('[data-cy=\"create-customer-names\"]')?.value || ''"
                    ).strip()
                except Exception:
                    nombres_autofill = ""
                cliente_ya_existe = nombres_autofill != ""

            if not cliente_ya_existe:
                # ── Cliente nuevo: rellenar formulario completo ────────────────
                rellenar('[data-cy="create-customer-names"]', data.get("nombres", ""))
                apellidos = f"{data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
                rellenar('[data-cy="create-customer-lastname"]', apellidos)
                rellenar('[data-cy="create-customer-birthday"]', data.get("fechaNacimiento", ""))

                # Teléfono móvil (segundo vti__input — el primero es "Teléfono fijo")
                tel = page.locator("input.vti__input").nth(1)
                tel.scroll_into_view_if_needed()
                tel.click()
                tel.fill(data.get("telefonoCelular", ""))
                page.wait_for_timeout(200)

                rellenar('[data-cy="create-customer-email"]', data.get("correoElectronico", ""))

                # ── 7. Tipo de comprador → INVERSIONISTA ──────────────────────
                vs_placeholder(page, "Tipo de comprador", "INVERSIONISTA")

                # ── 8. Tipo de contacto → VISITA ──────────────────────────────
                vs_placeholder(page, "tipo de contacto", "VISITA")

                # ── 9. Profesión ──────────────────────────────────────────────
                profesion_input = data.get("profesion", "")
                search_term = _norm(profesion_input).split()[0][:4]

                prof_inp = page.locator('input.vs__search[placeholder="Seleccione Profesión"]')
                prof_inp.scroll_into_view_if_needed()
                prof_inp.click()
                page.wait_for_timeout(200)
                page.keyboard.type(search_term, delay=100)
                page.wait_for_timeout(700)

                opts = page.locator('.vs__dropdown-option')
                opts.first.wait_for(state="visible", timeout=20_000)
                page.wait_for_timeout(150)

                total = opts.count()
                target_words = [w for w in _norm(profesion_input).split() if len(w) > 2]
                best_idx, best_score, best_word_count = 0, -1, float('inf')

                for i in range(total):
                    opt_text = _norm(opts.nth(i).text_content() or "")
                    opt_words = [w for w in opt_text.split() if len(w) > 2]
                    score = sum(
                        1 for tw in target_words
                        if any(bw.startswith(tw) or tw.startswith(bw) for bw in opt_words)
                    )
                    # Ante empate, preferir la opción con menos palabras (más genérica)
                    if score > best_score or (score == best_score and len(opt_words) < best_word_count):
                        best_score, best_idx, best_word_count = score, i, len(opt_words)

                opts.nth(best_idx).scroll_into_view_if_needed()
                opts.nth(best_idx).click()
                page.wait_for_timeout(200)

                # ── 10. Género ────────────────────────────────────────────────
                vs_placeholder(page, "Seleccione Sexo", data.get("genero", ""))

                # ── 11. Estado civil ──────────────────────────────────────────
                vs_placeholder(page, "Seleccione Estado civil", data.get("estadoCivil", ""))

                # ── 12. Nacionalidad ──────────────────────────────────────────
                vs_placeholder_fuzzy(page, "Seleccione Nacionalidad", data.get("nacionalidad", ""))

                # ── 13. Rango de edad ─────────────────────────────────────────
                rango = calcular_rango_edad(data.get("fechaNacimiento", "01-01-1990"))
                vs_placeholder(page, "Rango de edad", rango)

                # ── 14. Expectativa → Muy Alta ────────────────────────────────
                vs_placeholder(page, "Seleccione Expectativa", "Muy Alta")

                # ── 15. Destino de compra → Inversión ─────────────────────────
                vs_placeholder(page, "Seleccione Destino de compra", "Inversión")

                # ── 16. Grupo familiar → primera opción ───────────────────────
                vs_placeholder_nth(page, "Seleccione Grupo familiar", 1)

                # ── 17. Actividad → Empleado fijo ─────────────────────────────
                vs_placeholder(page, "Seleccione Actividad", "Empleado fijo")

                # ── 18. Rango de renta → tercera opción ───────────────────────
                vs_placeholder_nth(page, "Rango de renta", 3)

                # ── 19. Medio → REFERIDO ──────────────────────────────────────
                vs_placeholder(page, "Seleccione medio", "REFERIDO")

                # ── Dirección del cliente ─────────────────────────────────────
                page.locator('span.stepTitle', has_text="Dirección del cliente").click()
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(2_000)

                rellenar('[data-cy="create-customer-address"]', data.get("direccion", ""))

                region_inp = page.locator('input.vs__search[placeholder*="Seleccione Región"]').first
                region_inp.scroll_into_view_if_needed()
                region_inp.click()
                _region = data.get("region", "")
                page.keyboard.type(_region[:10], delay=50)
                page.wait_for_timeout(500)
                page.locator('.vs__dropdown-option').filter(has_text=_region).first.click()
                page.wait_for_timeout(400)

                # Comuna se habilita tras seleccionar región (excluir el input disabled)
                _comuna = data.get("comuna", "")
                comuna_inp = page.locator('input.vs__search[placeholder="Seleccione Comuna"]:not([disabled])')
                comuna_inp.wait_for(state="visible", timeout=20_000)
                comuna_inp.scroll_into_view_if_needed()
                comuna_inp.click()
                page.wait_for_timeout(400)
                page.keyboard.type(_comuna, delay=50)
                page.wait_for_timeout(500)
                page.locator('.vs__dropdown-option').filter(
                    has_text=re.compile(rf'^\s*{re.escape(_comuna)}\s*$')
                ).first.click()
                page.wait_for_timeout(200)

                rellenar('[data-cy="create-customer-city"]', data.get("ciudad", ""))

                # ── Guardar cliente nuevo ─────────────────────────────────────
                save = page.locator('button[data-cy="save_btn"]')
                save.wait_for(state="visible", timeout=30_000)
                save.scroll_into_view_if_needed()
                page.wait_for_timeout(600)
                save.click()
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1_000)

            elif not quote_ya_visible:
                # Cliente existe con formulario pre-rellenado — guardar para llegar al perfil
                save = page.locator('button[data-cy="save_btn"]')
                save.wait_for(state="visible", timeout=30_000)
                save.scroll_into_view_if_needed()
                page.wait_for_timeout(600)
                save.click()
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1_000)

            # ── Cotizar (cliente nuevo o existente) ────────────────────────────
            quote_btn = page.locator('button[data-cy="quote_btn"]')
            quote_btn.wait_for(state="visible", timeout=15_000)
            quote_btn.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            quote_btn.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            # ── Proyecto → primera opción disponible ──────────────────────────
            placeholder_select_nth(page, "Proyecto", 1)

            # ── Tipo de bien → Departamento (provoca mini recarga) ─────────────
            placeholder_select_texto(page, "Tipo de bien", "Departamento")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            # ── N° de bien → primera opción ────────────────────────────────────
            placeholder_select_nth(page, "N° de bien", 1)

            # ── Agregar bien ───────────────────────────────────────────────────
            add_btn = page.locator('button[data-cy="add_quote"]:not([disabled])')
            add_btn.scroll_into_view_if_needed()
            add_btn.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2_000)

            # ── Destino de compra → Inversión ──────────────────────────────────
            placeholder_select_texto(page, "Destino de compra", "Inversión")

            # ── Expectativa → Muy Alta ─────────────────────────────────────────
            placeholder_select_texto(page, "Expectativa", "Muy Alta")

            # ── Medio de información → CAPITAL INTELIGENTE ────────────────────
            placeholder_select_texto(page, "Medio de información", "CAPITAL INTELIGENTE")

            # ── Tipo contacto → VISITA ─────────────────────────────────────────
            placeholder_select_texto(page, "Tipo contacto", "VISITA")

            # ── Guardar cotización ─────────────────────────────────────────────
            save_q = page.locator('button[data-cy="save_quote"]')
            save_q.scroll_into_view_if_needed()
            save_q.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(3_500)

            return {
                "status": "success",
                "message": "Cliente bloqueado correctamente en el portal de Simonetti.",
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
    "fechaNacimiento":   "15-06-1985",
    "telefonoCelular":   "912345678",
    "correoElectronico": "juan@example.com",
    "profesion":         "INGENIERO(A) CIVIL INDUSTRIAL",
    "genero":            "Masculino",
    "estadoCivil":       "Soltero",
    "nacionalidad":      "Chilena",
    "direccion":         "Av. Providencia 1234",
    "region":            "Región Metropolitana de Santiago",
    "comuna":            "Providencia",
    "ciudad":            "Santiago",
}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
    else:
        data = DATOS_PRUEBA

    result = bloquear_cliente(data)
    print(json.dumps(result, ensure_ascii=False))
