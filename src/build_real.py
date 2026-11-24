import os, shutil, subprocess, sys
import os as _o
base = _o.path.dirname(_o.path.abspath(__file__)) + '/'
URL = 'https://fqdemhhcpetnrbtlgpxa.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZGVtaGhjcGV0bnJidGxncHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzQ1NTYsImV4cCI6MjEwNjcxMDU1Nn0.Tji9meaHe0rS_Z18X-CUcwaybv48kSa77Dav3hEgP_I'

subprocess.check_call([sys.executable, base + 'make_real.py'])
src = open(base + 'bureau.src.html', encoding='utf8').read()
css = open(base + 'docent.css', encoding='utf8').read()
engine = open(base + 'engine.js', encoding='utf8').read()
app = open(base + 'app.real.js', encoding='utf8').read().replace('/*SUPA_URL*/', URL).replace('/*SUPA_KEY*/', KEY)

extra_css = css + """
[hidden]{display:none!important}
body{margin:0}
.who{color:#9fb0bc;font-size:13px;margin-left:auto;margin-right:4px}
.who+.dbtn{margin-left:8px}
.top .hint{margin-left:0}
body.is-docent #room{display:none}
#login{position:fixed;inset:0;z-index:100;background:radial-gradient(1100px 600px at 50% 0%,#233039 0%,#12161b 70%);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
.lbox{background:#fff;color:var(--ink);border-radius:14px;padding:28px 28px 24px;width:100%;max-width:420px;display:grid;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.lbrand{font:700 24px var(--f-head);color:var(--brand)}
.lbrand small{display:block;font:400 14px var(--f-ui);color:var(--mute);margin-top:4px}
.ltabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#eef1f4;padding:4px;border-radius:10px}
.ltabs button{border:0;background:transparent;padding:10px;border-radius:8px;font:600 14px var(--f-ui);color:#46535f;cursor:pointer}
.ltabs button.on{background:#fff;color:var(--brand);box-shadow:0 1px 3px rgba(0,0,0,.12)}
#login form{display:grid;gap:12px}
#login label{display:grid;gap:5px;font-weight:600;font-size:13px}
#login input{font:400 16px var(--f-ui);padding:11px 12px;border:1px solid #c5cdd5;border-radius:8px;width:100%;background:#fff;color:var(--ink)}
#login input:focus{outline:2px solid var(--brand);border-color:var(--brand)}
#login .btn:disabled{opacity:.6;cursor:default}
.lerr{margin:0;color:var(--alert);font-size:14px;min-height:1.2em;line-height:1.4}
.lnote{margin:0;color:var(--mute);font-size:13px;line-height:1.45}
.toast{z-index:200}
"""

login = """<div id="login" hidden>
  <div class="lbox">
    <div class="lbrand">Redactie Vechtwaard<small>Oefenomgeving voor nieuwsredacteuren</small></div>
    <div class="ltabs"><button data-lt="s" class="on" type="button">Student</button><button data-lt="d" type="button">Docent</button></div>
    <form id="lf-s" autocomplete="off">
      <label>Klascode<input name="code" required placeholder="Bijvoorbeeld VW-MR2A" autocapitalize="characters" autocomplete="off"></label>
      <label>Voornaam<input name="naam" required maxlength="30" placeholder="Jouw voornaam" autocomplete="given-name"></label>
      <button class="btn" type="submit">Naar mijn bureau</button>
    </form>
    <form id="lf-d" hidden autocomplete="off">
      <label>Klascode<input name="code" required placeholder="Bijvoorbeeld VW-MR2A" autocapitalize="characters" autocomplete="off"></label>
      <label>Docentcode<input name="dcode" type="password" required autocomplete="current-password"></label>
      <button class="btn" type="submit">Open docentbesturing</button>
    </form>
    <p class="lerr" id="lerr" role="alert"></p>
    <p class="lnote">Je logt in met de klascode van je docent en je voornaam. Een wachtwoord heb je niet nodig.</p>
  </div>
</div>
"""

out = src.replace('/*CSS_EXTRA*/', extra_css)
out = out.replace('<button class="dbtn" id="docbtn">Docentenmodus</button>',
                  '<span class="who" id="who" hidden></span><button class="dbtn" id="outbtn" hidden>Uitloggen</button>')
out = out.replace('<div id="docent" hidden></div>', '<div id="docent" hidden></div>\n' + login)
out = out.replace('<!--ENGINE-->', '<script>\n' + engine + '\n</script>')
out = out.replace('<!--APP-->', '<script>\n' + app + '\n</script>')
html = ('<!doctype html><html lang="nl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="robots" content="noindex">\n') + out + '\n</html>'
d = base + 'deploy/'
os.makedirs(d, exist_ok=True)
open(d + 'index.html', 'w', encoding='utf8').write(html)
shutil.copy(base + 'bureau.jpg', d + 'bureau.jpg')
print('deploy/index.html', len(html))
