"""Render README screenshots of the card from demo data (no real home data involved)."""
import subprocess, sys, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'images'
SHOTS = [  # (file, scenario, lang, card width, viewport width)
    ('grid.png', 'grid', 'en', 780, 812),
    ('backup.png', 'backup', 'en', 780, 812),
    ('charging-uk.png', 'charging', 'uk', 780, 812),
    ('mobile.png', 'backup', 'uk', 390, 422),
]
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, s, lang, w, vw in SHOTS:
            pg = b.new_page(viewport={'width': vw, 'height': 900}, device_scale_factor=2, reduced_motion='reduce')
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.goto(f'http://127.0.0.1:8765/demo/index.html?s={s}&lang={lang}&w={w}')
            pg.wait_for_selector('body[data-ready="1"]', timeout=10000)
            pg.locator('home-energy-flow-card').screenshot(path=str(OUT / name))
            pg.close()
        b.close()
finally:
    srv.terminate()
print('errors:', errors or 'none')
