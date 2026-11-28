#!/usr/bin/env python3
# Genereert de beeldbibliotheek (getekende scenes, SVG) en koppelt die aan de 15 startartikelen.
import json, random, re, os
W, H = 640, 400
SKIN = ['#f1c9a5', '#d9a577', '#a9744f', '#7a4b2f', '#f5d6bd']
HAIR = ['#2b2118', '#5a3a22', '#b5832f', '#8a8a8a', '#1b1b1b', '#7a3020']
TOP = ['#2f6f9f', '#c8553d', '#e3b23c', '#4b8b5a', '#7b5ea7', '#37424c', '#d7798c', '#f4f1ea']
LEG = ['#2a3441', '#3c4a5e', '#5b4a3a', '#1f2a37']

def svg(body, sky=('#bfe0f2', '#eaf5fb'), uid='x'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
            f'<defs><linearGradient id="g{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky[0]}"/><stop offset="1" stop-color="{sky[1]}"/></linearGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#g{uid})"/>{body}</svg>')

def r(x, y, w, h, c, rx=0, extra=''):
    return f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{rx}" fill="{c}" {extra}/>'
def c_(x, y, rad, col, extra=''):
    return f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rad:.1f}" fill="{col}" {extra}/>'
def poly(pts, col, extra=''):
    return '<polygon points="' + ' '.join(f'{x:.0f},{y:.0f}' for x, y in pts) + f'" fill="{col}" {extra}/>'
def line(x1, y1, x2, y2, col, w=3):
    return f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'
def txt(x, y, s, size=18, col='#222', anchor='middle', w=700):
    return f'<text x="{x}" y="{y}" font-family="Arial,Helvetica,sans-serif" font-size="{size}" font-weight="{w}" fill="{col}" text-anchor="{anchor}">{s}</text>'

def cloud(x, y, s=1, col='#fff'):
    return (c_(x, y, 22*s, col) + c_(x+24*s, y+4*s, 26*s, col) + c_(x-26*s, y+6*s, 18*s, col) + r(x-40*s, y+8*s, 90*s, 18*s, col, 9*s))
def tree(x, base, s=1, col='#4b8b5a'):
    return r(x-4*s, base-40*s, 8*s, 40*s, '#6b4a2f') + c_(x, base-58*s, 30*s, col) + c_(x-16*s, base-42*s, 20*s, col) + c_(x+16*s, base-44*s, 20*s, col)
def building(x, y, w, h, col, win='#dfeaf2', rows=4, cols=4, roof=None):
    out = r(x, y, w, h, col)
    if roof:
        out += poly([(x-6, y), (x+w/2, y-34), (x+w+6, y)], roof)
    ww, wh = w/(cols*2+1), h/(rows*2+1)
    for i in range(rows):
        for j in range(cols):
            out += r(x+ww*(1+2*j), y+wh*(1+2*i), ww, wh, win)
    return out
def road(y, h=70, col='#4a5560', mark=True):
    out = r(0, y, W, h, col)
    if mark:
        for i in range(0, W, 70):
            out += r(i+10, y+h/2-2, 36, 4, '#e8e8e8')
    return out
def car(x, y, col='#c8553d', s=1):
    return (r(x, y-22*s, 74*s, 22*s, col, 6*s) + r(x+14*s, y-38*s, 44*s, 20*s, col, 7*s) + r(x+19*s, y-34*s, 15*s, 13*s, '#cfe6f3') + r(x+37*s, y-34*s, 15*s, 13*s, '#cfe6f3')
            + c_(x+16*s, y, 9*s, '#1b1b1b') + c_(x+58*s, y, 9*s, '#1b1b1b') + c_(x+16*s, y, 4*s, '#aaa') + c_(x+58*s, y, 4*s, '#aaa'))
def police(x, y, s=1):
    return car(x, y, '#f4f4f4', s) + r(x+3*s, y-16*s, 68*s, 6*s, '#2f6f9f') + r(x+30*s, y-44*s, 14*s, 6*s, '#2f6f9f') + c_(x+34*s, y-46*s, 3*s, '#e53935') + c_(x+42*s, y-46*s, 3*s, '#2f6f9f')

def person(x, base, h=150, skin=0, hair=0, top=0, leg=0, hat=None, arms='down', item=None, face=True, long_hair=False):
    s = SKIN[skin % len(SKIN)]; hc = HAIR[hair % len(HAIR)]; tc = TOP[top % len(TOP)]; lc = LEG[leg % len(LEG)]
    hr = h*0.11; neck = base-h+hr*2; torso_h = h*0.36; leg_h = h*0.40
    ty = base-leg_h-torso_h; tw = h*0.26
    o = r(x-tw*0.42, base-leg_h, tw*0.38, leg_h, lc, 3) + r(x+tw*0.04, base-leg_h, tw*0.38, leg_h, lc, 3)
    o += r(x-tw*0.46, base-3, tw*0.42, 5, '#222', 2) + r(x+tw*0.02, base-3, tw*0.42, 5, '#222', 2)
    o += r(x-tw/2, ty, tw, torso_h, tc, h*0.05)
    if arms == 'up':
        o += line(x-tw/2, ty+8, x-tw*0.95, ty-h*0.18, s, h*0.055) + line(x+tw/2, ty+8, x+tw*0.95, ty-h*0.18, s, h*0.055)
    elif arms == 'hold':
        o += line(x-tw/2, ty+8, x-tw*0.2, ty+torso_h*0.7, s, h*0.055) + line(x+tw/2, ty+8, x+tw*0.5, ty+torso_h*0.55, s, h*0.055)
    elif arms == 'point':
        o += line(x-tw/2, ty+8, x-tw*0.5, ty+torso_h*0.85, s, h*0.055) + line(x+tw/2, ty+8, x+tw*1.25, ty+torso_h*0.1, s, h*0.055)
    else:
        o += line(x-tw/2, ty+8, x-tw*0.55, ty+torso_h*0.9, s, h*0.055) + line(x+tw/2, ty+8, x+tw*0.55, ty+torso_h*0.9, s, h*0.055)
    o += r(x-hr*0.35, neck, hr*0.7, hr*0.8, s)
    if long_hair:
        o += r(x-hr*1.15, base-h-hr*0.2, hr*2.3, hr*3.0, hc, hr*0.9)
    o += c_(x, base-h+hr, hr, s)
    o += f'<path d="M{x-hr:.0f},{base-h+hr*0.9:.0f} a{hr:.1f},{hr:.1f} 0 0 1 {hr*2:.0f},0 z" fill="{hc}"/>'
    if hat:
        o += r(x-hr*1.15, base-h+hr*0.1, hr*2.3, hr*0.5, hat, 2) + r(x-hr*0.8, base-h-hr*0.5, hr*1.6, hr*0.7, hat, 3)
    if face:
        o += c_(x-hr*0.35, base-h+hr, hr*0.1, '#222') + c_(x+hr*0.35, base-h+hr, hr*0.1, '#222')
    if item == 'mic':
        o += r(x+tw*0.45, ty+torso_h*0.1, 6, 30, '#222', 2) + c_(x+tw*0.45+3, ty+torso_h*0.1-4, 7, '#444')
    return o

def bike(x, y, s=1, col='#2f6f9f'):
    return (f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{22*s:.0f}" fill="none" stroke="#222" stroke-width="3"/>'
            f'<circle cx="{x+58*s:.0f}" cy="{y:.0f}" r="{22*s:.0f}" fill="none" stroke="#222" stroke-width="3"/>'
            + line(x, y, x+26*s, y-30*s, col, 4) + line(x+26*s, y-30*s, x+58*s, y, col, 4) + line(x+26*s, y-30*s, x+48*s, y-34*s, col, 4)
            + line(x+48*s, y-34*s, x+58*s, y, col, 4) + line(x+44*s, y-40*s, x+54*s, y-44*s, '#222', 4))

# ---------------------------------------------------------------- scenes
S = {}
def scene(id_, label, mensen, cat, q, **kw):
    def deco(f):
        S[id_] = dict(label=label, mensen=mensen, cat=cat, q=q, f=f, **kw)
        return f
    return deco

@scene('brug_file', 'Drukke brug in de spits', 0, 'verkeer', 5)
def _(i):
    b = r(0, 215, W, 18, '#8d99a5') + r(0, 233, W, 8, '#6f7b87')
    for x in range(30, W, 90): b += r(x, 241, 10, 60, '#6f7b87')
    b += r(0, 300, W, 100, '#5f93b8') + r(0, 300, W, 8, '#7ba9c8')
    b += r(0, 160, W, 56, '#5a6672') + r(0, 190, W, 4, '#e8e8e8', extra='opacity=".8"')
    for k, x in enumerate(range(20, W, 82)):
        b += car(x, 188 + (k % 2)*18 - 18, ['#c8553d', '#2f6f9f', '#e3b23c', '#f4f4f4', '#4b8b5a'][k % 5], .9)
    return svg(cloud(120, 70, 1.2) + cloud(430, 50) + building(520, 90, 90, 80, '#b7c3cd', rows=3, cols=3) + b, uid=i)
@scene('brug_drone', 'Brug van boven', 0, 'verkeer', 4)
def _(i):
    b = r(0, 0, W, H, '#6aa0c4') + r(250, 0, 110, H, '#5a6672') + r(300, 0, 4, H, '#e8e8e8')
    for k, y in enumerate(range(20, H, 62)): b += r(262 + (k % 2)*50, y, 34, 22, ['#c8553d', '#f4f4f4', '#e3b23c', '#2f6f9f'][k % 4], 5)
    b += r(236, 0, 14, H, '#8d99a5') + r(360, 0, 14, H, '#8d99a5') + r(0, 340, 90, 60, '#4b8b5a') + r(550, 0, 90, 90, '#4b8b5a')
    return svg(b, uid=i)
@scene('bord_omleiding', 'Verkeersbord met omleiding', 0, 'verkeer', 2)
def _(i):
    b = road(300, 100) + r(300, 120, 10, 190, '#6b7885') + r(220, 80, 190, 100, '#f2c230', 10, 'stroke="#222" stroke-width="4"')
    b += poly([(250, 150), (350, 150), (350, 130), (385, 160), (350, 190), (350, 170), (250, 170)], '#222')
    b += txt(315, 112, 'OMLEIDING', 20, '#222')
    return svg(b + cloud(90, 70), uid=i)
@scene('winkelstraat', 'Winkelstraat met volle parkeerplaatsen', 0, 'politiek', 4)
def _(i):
    b = building(10, 80, 190, 210, '#d9b99b', rows=3, cols=3) + building(215, 110, 170, 180, '#b5c4cf', rows=3, cols=3) + building(400, 70, 230, 220, '#c9a98f', rows=3, cols=4)
    b += r(0, 290, W, 110, '#6d7782') + r(0, 290, W, 10, '#9aa4ad')
    for k, x in enumerate(range(20, W, 105)):
        b += car(x, 365, ['#c8553d', '#2f6f9f', '#4b8b5a', '#e3b23c', '#f4f4f4', '#7b5ea7'][k % 6])
    b += r(560, 250, 10, 50, '#37424c') + r(548, 222, 34, 34, '#2f6f9f', 4) + txt(565, 246, 'P', 22, '#fff')
    return svg(b, uid=i)
@scene('raadzaal', 'Raadzaal met lege stoelen', 0, 'politiek', 2, sky=('#e4dccb', '#d7cdb8'))
def _(i):
    b = r(0, 250, W, 150, '#8b6b4a') + r(220, 60, 200, 130, '#f4f1ea', 4) + txt(320, 135, 'RAAD', 26, '#6b4a2f') + r(80, 100, 6, 150, '#b08b5a') + r(554, 100, 6, 150, '#b08b5a')
    for row in range(3):
        for k in range(7):
            b += r(60 + k*78 + row*8, 210 + row*55, 46, 30, '#a24a3a', 6) + r(66 + k*78 + row*8, 190 + row*55, 34, 26, '#8c3d30', 6)
    return svg(b, sky=('#e4dccb', '#d7cdb8'), uid=i)
@scene('nacht_politie', 'Woonstraat in het donker met politieauto', 0, 'misdaad', 5, sky=('#0e1a2b', '#25364f'))
def _(i):
    b = c_(540, 70, 28, '#f4efd0') + r(0, 270, W, 130, '#2a3441')
    for k, x in enumerate([20, 170, 330, 480]):
        b += building(x, 130, 130, 140, ['#3a475a', '#445168', '#33404f', '#3d4a5e'][k], win='#f2c230' if k % 2 == 0 else '#59677c', rows=2, cols=3)
    b += police(250, 350, 1.3) + r(0, 395, W, 5, '#1b222c')
    b += poly([(250, 310), (200, 400), (310, 400)], '#5b7bd5', 'opacity=".25"')
    return svg(b, sky=('#0e1a2b', '#25364f'), uid=i)
@scene('deurslot', 'Deurslot in close-up', 0, 'misdaad', 3, sky=('#6b4a2f', '#8b6240'))
def _(i):
    b = r(0, 0, W, H, '#7a5535') + r(250, 120, 140, 190, '#c0c8cf', 16, 'stroke="#8a949c" stroke-width="5"') + c_(320, 205, 26, '#6b7885') + r(316, 205, 8, 40, '#222', 3) + r(300, 140, 40, 14, '#8a949c', 7)
    b += line(250, 320, 350, 360, '#e3b23c', 5)
    return svg(b, uid=i)
@scene('kraam', 'Fruitkraam op de markt', 0, 'human_interest', 3)
def _(i):
    b = r(0, 300, W, 100, '#a9a79f') + poly([(120, 120), (520, 120), (560, 180), (80, 180)], '#c8553d') + r(120, 120, 400, 12, '#f4f1ea')
    for k in range(5): b += poly([(120+k*80, 132), (160+k*80, 132), (160+k*80, 180), (120+k*80, 180)], '#f4f1ea')
    b += r(110, 230, 420, 70, '#8b6240') + r(100, 220, 440, 14, '#a67c52')
    for k, col in enumerate(['#d6453d', '#f0a030', '#8fbf3f', '#d6453d', '#f0a030', '#8fbf3f', '#d6453d']):
        b += c_(150+k*55, 214, 18, col) + c_(170+k*55, 220, 14, col)
    b += r(125, 180, 8, 50, '#6b4a2f') + r(507, 180, 8, 50, '#6b4a2f')
    return svg(b, uid=i)
@scene('gevel_bakkerij', 'Gevel van de bakkerij', 0, 'economie', 3)
def _(i):
    b = r(0, 330, W, 70, '#8d99a5') + r(90, 90, 460, 240, '#c9a07a') + r(90, 90, 460, 50, '#7a3020') + txt(320, 126, 'BAKKERIJ VAN DIJK', 26, '#f4efd0')
    b += r(130, 170, 200, 130, '#cfe6f3', 4) + r(135, 175, 190, 120, '#f2dfb5') + r(370, 170, 110, 160, '#6b4a2f', 4) + c_(462, 255, 6, '#e3b23c')
    for k in range(5): b += r(150+k*36, 255, 28, 30, '#c98b3d', 14)
    b += poly([(130, 140), (330, 140), (350, 170), (110, 170)], '#f4f1ea')
    return svg(b, uid=i)
@scene('school_buiten', 'Schoolgebouw van buiten', 0, 'onderwijs', 2)
def _(i):
    b = r(0, 320, W, 80, '#7fae72') + r(70, 130, 500, 190, '#b86a4f') + poly([(50, 130), (320, 60), (590, 130)], '#7a3020') + building(70, 150, 500, 170, '#b86a4f', win='#e8f1f6', rows=2, cols=7)
    b += r(285, 230, 70, 90, '#6b4a2f', 4) + r(310, 90, 20, 20, '#f4f1ea') + c_(320, 100, 10, '#f4f1ea') + tree(30, 330, 1.2) + tree(615, 330, 1.2)
    return svg(b, uid=i)
@scene('klas_leeg', 'Leeg klaslokaal met stoelen op tafels', 0, 'onderwijs', 4, sky=('#e8e3d2', '#d9d2bc'))
def _(i):
    b = r(0, 280, W, 120, '#b9a07a') + r(70, 50, 500, 150, '#2f5a45', 6, 'stroke="#8b6b4a" stroke-width="8"') + txt(320, 130, '2 + 2 = ?', 40, '#f4f1ea', w=400)
    for row in range(2):
        for k in range(4):
            x = 60 + k*140 + row*20; y = 230 + row*70
            b += r(x, y, 100, 14, '#a67c52') + r(x+8, y+14, 6, 40, '#6b4a2f') + r(x+86, y+14, 6, 40, '#6b4a2f') + r(x+20, y-26, 50, 6, '#37424c') + r(x+24, y-22, 4, 22, '#37424c') + r(x+62, y-22, 4, 22, '#37424c')
    return svg(b, uid=i)
@scene('stethoscoop', 'Stethoscoop op een bureau', 0, 'zorg', 2, sky=('#dbe6ee', '#c8d6e0'))
def _(i):
    b = r(0, 260, W, 140, '#a67c52') + r(0, 255, W, 10, '#c19a6b')
    b += '<path d="M230 160 q-20 90 60 100 q80 10 70 -90" fill="none" stroke="#37424c" stroke-width="9" stroke-linecap="round"/>' + c_(290, 285, 30, '#c0c8cf') + c_(290, 285, 18, '#8a949c')
    b += line(230, 160, 220, 120, '#37424c', 9) + line(360, 170, 372, 126, '#37424c', 9)
    b += r(450, 200, 110, 80, '#f4f1ea', 4) + r(465, 215, 80, 6, '#c0c8cf') + r(465, 232, 60, 6, '#c0c8cf') + r(465, 249, 70, 6, '#c0c8cf')
    return svg(b, sky=('#dbe6ee', '#c8d6e0'), uid=i)
@scene('poster_festival', 'Festivalposter met lijst van namen', 0, 'cultuur', 3, sky=('#2b1c4a', '#5b2a6a'))
def _(i):
    b = r(150, 30, 340, 340, '#f06b3a', 10) + c_(320, 130, 56, '#f2c230') + txt(320, 230, 'VECHTWAARD LIVE', 28, '#2b1c4a')
    for k, n in enumerate(['DJ MARIE', 'THE CANALS', 'NOOR &amp; CO', 'BLAUWE UREN']):
        b += txt(320, 268+k*26, n, 20, '#fff', w=600)
    return svg(b, sky=('#2b1c4a', '#5b2a6a'), uid=i)
@scene('storm_bomen', 'Bomen die hevig waaien langs het water', 0, 'weer', 5, sky=('#55606b', '#8d99a5'))
def _(i):
    b = cloud(120, 70, 1.6, '#6f7b87') + cloud(400, 50, 1.8, '#5f6a75') + cloud(560, 100, 1.4, '#7c8791')
    b += r(0, 300, W, 100, '#4b7aa0') + r(0, 290, W, 14, '#6f9fc2')
    for k, x in enumerate([90, 230, 380, 520]):
        b += f'<g transform="rotate(14 {x} 300)">' + tree(x, 300, 1.5, '#3f7a4d') + '</g>'
    for k in range(7): b += line(20+k*90, 150+k%3*30, 80+k*90, 160+k%3*30, '#d8e2ea', 3)
    return svg(b, sky=('#55606b', '#8d99a5'), uid=i)
@scene('weerkaart', 'Weerkaart met gele waarschuwing', 0, 'weer', 3, sky=('#cfe0ea', '#bcd0dc'))
def _(i):
    b = r(120, 40, 400, 320, '#6aa0c4', 10) + poly([(200, 100), (320, 80), (440, 130), (470, 230), (390, 320), (250, 300), (180, 210)], '#8fbf8a')
    b += poly([(260, 150), (370, 140), (420, 210), (350, 270), (270, 240)], '#f2c230', 'opacity=".85"') + txt(330, 215, 'CODE GEEL', 24, '#37424c')
    return svg(b, sky=('#cfe0ea', '#bcd0dc'), uid=i)
@scene('water_alg', 'Groene waas op het water bij het strand', 0, 'milieu', 5)
def _(i):
    b = r(0, 150, W, 250, '#5fa889') + r(0, 150, W, 14, '#7bbf9f') + r(0, 320, W, 80, '#e9d9a8')
    for k in range(9): b += c_(40+k*72, 200+(k*37) % 90, 40, '#7fcf4a', 'opacity=".55"')
    b += cloud(160, 70, 1.2) + cloud(470, 60)
    return svg(b, uid=i)
@scene('waarschuwingsbord', 'Waarschuwingsbord bij de plas', 0, 'milieu', 3)
def _(i):
    b = r(0, 280, W, 120, '#7fae72') + r(0, 230, W, 60, '#5fa0c0') + r(310, 140, 10, 150, '#6b7885') + r(220, 60, 190, 100, '#e03c31', 10) + txt(315, 98, 'NIET', 20, '#fff') + txt(315, 120, 'ZWEMMEN', 22, '#fff') + txt(315, 142, 'BLAUWALG', 16, '#fff')
    return svg(b + cloud(110, 60), uid=i)
@scene('kaart_gebied', 'Kaart met het verbodsgebied', 0, 'veiligheid', 3, sky=('#eef0f2', '#e1e5e9'))
def _(i):
    b = r(60, 40, 520, 320, '#f4f1ea', 8)
    for k in range(6): b += line(60, 80+k*50, 580, 80+k*50, '#d4d9de', 6)
    for k in range(8): b += line(100+k*65, 40, 100+k*65, 360, '#d4d9de', 6)
    b += poly([(200, 110), (400, 100), (440, 250), (270, 290)], '#e03c31', 'opacity=".35" stroke="#e03c31" stroke-width="4"') + r(60, 330, 520, 4, '#5fa0c0')
    return svg(b, sky=('#eef0f2', '#e1e5e9'), uid=i)
@scene('bouwkranen', 'Bouwkranen boven een half afgebouwd gebouw', 0, 'zorg', 4)
def _(i):
    b = r(0, 330, W, 70, '#9a8f7e') + r(200, 130, 240, 200, '#c9d1d8') + r(200, 130, 240, 200, 'none', 0, 'stroke="#8d99a5" stroke-width="3"')
    for k in range(4): b += line(200, 180+k*38, 440, 180+k*38, '#8d99a5', 3)
    b += building(220, 150, 150, 180, '#dfe5ea', rows=4, cols=3)
    for x, hgt in [(120, 260), (520, 300)]:
        b += r(x, 330-hgt, 10, hgt, '#e3b23c') + r(x-110, 330-hgt, 230, 9, '#e3b23c') + line(x-100, 339-hgt, x-100, 380-hgt, '#37424c', 2) + r(x-110, 378-hgt, 20, 14, '#37424c')
    return svg(b, uid=i)
@scene('maquette', 'Maquette van het nieuwe gebouw', 0, 'zorg', 2, sky=('#e8e3d2', '#d9d2bc'))
def _(i):
    b = r(0, 280, W, 120, '#c9b99a') + r(120, 230, 400, 30, '#f4f1ea', 4)
    b += r(180, 150, 120, 80, '#f4f1ea') + r(300, 110, 90, 120, '#e8edf1') + r(390, 170, 80, 60, '#f4f1ea')
    for k in range(5): b += r(190+k*20, 170, 12, 16, '#9fb7c9')
    b += tree(150, 230, .5, '#6aa56e') + tree(490, 230, .5, '#6aa56e')
    return svg(b, sky=('#e8e3d2', '#d9d2bc'), uid=i)
@scene('zoekposter', 'Zoekposter aan een lantaarnpaal', 0, 'human_interest', 3)
def _(i):
    b = r(0, 330, W, 70, '#8d99a5') + r(310, 40, 12, 300, '#37424c') + r(240, 100, 150, 190, '#f4f1ea', 4, 'stroke="#c0c8cf" stroke-width="2"') + txt(315, 135, 'VERMIST', 24, '#c8553d') + c_(315, 205, 40, '#37424c') + poly([(285, 180), (297, 150), (307, 176)], '#37424c') + poly([(323, 176), (333, 150), (345, 180)], '#37424c')
    b += txt(315, 270, 'Mozes, grijze kat', 14, '#222', w=500)
    return svg(b + cloud(110, 70) + building(470, 120, 160, 210, '#c9a98f', rows=3, cols=3), uid=i)
@scene('afzetting', 'Afgezette weg met politieauto en lint', 0, 'misdaad', 4)
def _(i):
    b = road(240, 120) + police(260, 330, 1.4)
    b += r(90, 190, 8, 110, '#37424c') + r(520, 190, 8, 110, '#37424c') + line(94, 220, 524, 232, '#f2c230', 8) + line(94, 260, 524, 272, '#e03c31', 5)
    return svg(b + building(30, 80, 130, 120, '#b7c3cd', rows=3, cols=2) + tree(560, 200, 1) + cloud(300, 60), uid=i)
@scene('kruispunt', 'Kruispunt', 0, 'verkeer', 2)
def _(i):
    b = r(0, 150, W, 100, '#4a5560') + r(260, 0, 110, H, '#4a5560')
    for x in range(0, W, 60): b += r(x+8, 198, 30, 4, '#e8e8e8')
    for y in range(0, H, 60): b += r(312, y+8, 4, 30, '#e8e8e8')
    b += r(245, 0, 15, 150, '#7fae72') + r(370, 0, 15, 150, '#7fae72') + r(245, 250, 15, 150, '#7fae72') + r(370, 250, 15, 150, '#7fae72')
    b += r(250, 160, 8, 80, '#f4f4f4') + r(380, 160, 8, 80, '#f4f4f4')
    return svg(b, sky=('#bfe0f2', '#eaf5fb'), uid=i)
@scene('luchtfoto_terrein', 'Luchtfoto van een leeg terrein naast het dorp', 0, 'economie', 4)
def _(i):
    b = r(0, 0, W, H, '#8fbf8a') + r(60, 70, 330, 230, '#c9b88a') + r(0, 330, W, 70, '#6aa0c4')
    for x in range(60, 390, 55): b += line(x, 70, x, 300, '#b5a574', 2)
    for k in range(4):
        for j in range(3): b += r(430+k*48, 60+j*60, 32, 38, ['#c8553d', '#b86a4f', '#d9b99b'][(k+j) % 3])
    b += line(390, 190, 640, 190, '#6d7782', 12) + c_(560, 300, 16, '#5b8f55')
    return svg(b, uid=i)
@scene('vuurwerk_kade', 'Vuurwerk boven de haven', 0, 'veiligheid', 5, sky=('#0b1424', '#1f2f4a'))
def _(i):
    b = r(0, 300, W, 100, '#1b3350') + r(0, 296, W, 6, '#33527a')
    for k, x in enumerate([40, 140, 250, 380, 490]): b += building(x, 230-k % 3*18, 80, 70+k % 3*18, '#2a3a52', win='#f2c230', rows=2, cols=2)
    for (x, y, col) in [(200, 110, '#f2c230'), (420, 90, '#e03c31'), (320, 150, '#59d0f5')]:
        for a in range(0, 360, 30):
            import math
            b += line(x, y, x+math.cos(math.radians(a))*46, y+math.sin(math.radians(a))*46, col, 3) + c_(x+math.cos(math.radians(a))*52, y+math.sin(math.radians(a))*52, 3, col)
    return svg(b, sky=('#0b1424', '#1f2f4a'), uid=i)
@scene('terrein_impressie', 'Impressie van nieuwe bedrijfsgebouwen', 0, 'economie', 3)
def _(i):
    b = r(0, 300, W, 100, '#8fbf8a') + building(60, 150, 160, 150, '#dfe5ea', win='#6aa0c4', rows=3, cols=4) + building(250, 110, 150, 190, '#b7c3cd', win='#6aa0c4', rows=4, cols=3) + building(430, 180, 160, 120, '#e8edf1', win='#6aa0c4', rows=2, cols=4)
    b += r(0, 330, W, 30, '#6d7782') + tree(40, 320, .8, '#6aa56e') + tree(620, 320, .8, '#6aa56e') + cloud(180, 60) + cloud(470, 50, 1.2)
    return svg(b, uid=i)
@scene('laptop', 'Laptop op een bureau', 0, 'tech', 3, sky=('#dbe6ee', '#c8d6e0'))
def _(i):
    b = r(0, 290, W, 110, '#a67c52') + r(170, 120, 300, 170, '#37424c', 10) + r(184, 134, 272, 140, '#59d0f5', 4) + poly([(140, 290), (500, 290), (520, 320), (120, 320)], '#8a949c')
    b += r(210, 170, 150, 12, '#fff', 3, 'opacity=".8"') + r(210, 196, 200, 12, '#fff', 3, 'opacity=".6"') + r(210, 222, 110, 12, '#fff', 3, 'opacity=".6"')
    return svg(b, sky=('#dbe6ee', '#c8d6e0'), uid=i)
@scene('stad_overzicht', 'Overzicht van de stad', 0, 'verkeer', 3)
def _(i):
    b = r(0, 300, W, 100, '#5a6672')
    for k, (x, h) in enumerate([(20, 180), (110, 120), (200, 220), (300, 150), (390, 200), (480, 130), (560, 170)]):
        b += building(x, 300-h, 80, h, ['#b7c3cd', '#c9a98f', '#9fb0bd', '#d9b99b'][k % 4], rows=h//40, cols=3)
    return svg(b + cloud(150, 60) + cloud(430, 80, 1.2), uid=i)

# ---- met mensen
@scene('oude_man_fiets', 'Oudere man op de fiets met boodschappen', 1, 'human_interest', 5)
def _(i):
    b = r(0, 310, W, 90, '#a9a79f') + building(0, 60, 180, 250, '#d9b99b', rows=3, cols=3) + building(470, 90, 170, 220, '#b5c4cf', rows=3, cols=3)
    b += bike(230, 330, 1.7, '#c8553d') + person(300, 300, 150, 0, 3, 1, 0, arms='hold', hat='#37424c')
    b += r(335, 255, 26, 30, '#e3b23c', 4) + r(342, 258, 5, 24, '#c9962a')
    return svg(b + cloud(300, 60), uid=i)
@scene('gerrit_route', 'Gerrit fietst door de wijk', 1, 'human_interest', 5)
def _(i):
    b = r(0, 320, W, 80, '#6d7782') + r(0, 313, W, 10, '#9aa4ad') + tree(80, 316, 1.3) + tree(560, 316, 1.4) + building(180, 130, 150, 180, '#d9b99b', rows=3, cols=3)
    b += bike(330, 350, 1.8, '#2f6f9f') + person(400, 330, 160, 0, 3, 5, 1, arms='hold', hat='#c8553d')
    return svg(b + cloud(120, 70) + cloud(470, 50), uid=i)
@scene('bakker_toonbank', 'Bakker achter de toonbank', 1, 'economie', 5, sky=('#f2d9a8', '#f8ead0'))
def _(i):
    b = r(0, 300, W, 100, '#a67c52') + r(0, 0, W, 300, '#f4e8cf') + r(60, 60, 140, 190, '#c98b3d', 8)
    for k in range(3): b += r(70, 80+k*56, 120, 8, '#8b5a1c')
    for k in range(5): b += c_(90+k*24, 74, 10, '#d9a05b')
    b += person(340, 330, 220, 0, 0, 7, 2, hat='#fff', arms='hold') + r(150, 270, 400, 70, '#8b6240') + r(140, 258, 420, 18, '#c19a6b')
    for k in range(5): b += c_(200+k*70, 252, 16, '#c98b3d') + r(186+k*70, 252, 28, 6, '#c98b3d')
    return svg(b, sky=('#f2d9a8', '#f8ead0'), uid=i)
@scene('klanten_rij', 'Rij klanten buiten de bakkerij', 1, 'economie', 4)
def _(i):
    b = r(0, 320, W, 80, '#8d99a5') + r(0, 70, 150, 250, '#c9a07a') + r(20, 100, 100, 100, '#cfe6f3') + txt(75, 240, 'BAKKERIJ', 16, '#7a3020')
    for k in range(6): b += person(190+k*74, 340, 150-k*4, k, k, k+1, k, arms='down')
    return svg(b + cloud(330, 60) + cloud(520, 90), uid=i)
@scene('menigte_festival', 'Menigte met handen in de lucht bij zonsondergang', 1, 'cultuur', 5, sky=('#f08a4b', '#f7c46b'))
def _(i):
    b = c_(320, 230, 70, '#fff3c4', 'opacity=".9"') + r(0, 250, W, 150, '#2b1c4a') + r(160, 150, 320, 110, '#37424c', 4) + r(160, 140, 320, 10, '#e3b23c')
    for k in range(8): b += person(40+k*80, 420, 150+(k % 3)*12, k, k+2, k+3, k, arms='up' if k % 2 == 0 else 'down', face=False)
    return svg(b, sky=('#f08a4b', '#f7c46b'), uid=i)
@scene('wachtkamer', 'Volle wachtkamer', 1, 'zorg', 4, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 290, W, 110, '#b9c3cb') + r(0, 0, W, 290, '#eef2f5') + r(60, 60, 120, 90, '#9fc4dc', 4) + r(470, 60, 110, 90, '#9fc4dc', 4)
    for k in range(5):
        b += r(30+k*125, 270, 100, 60, '#2f6f9f', 8) + person(80+k*125, 300, 120+(k % 2)*10, k, k+1, k+2, k, arms='down')
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('kind_kat', 'Kind knuffelt de kat op de bank', 1, 'human_interest', 5, sky=('#f4e3cf', '#f8eee0'))
def _(i):
    b = r(0, 300, W, 100, '#c9a07a') + r(100, 210, 440, 110, '#c8553d', 20) + r(100, 170, 440, 60, '#b04632', 20) + r(80, 230, 40, 90, '#b04632', 14) + r(520, 230, 40, 90, '#b04632', 14)
    b += person(320, 295, 150, 4, 5, 2, 2, long_hair=True, arms='hold') + c_(350, 240, 34, '#8a8a8a') + poly([(326, 220), (334, 192), (346, 214)], '#8a8a8a') + poly([(354, 214), (366, 192), (376, 222)], '#8a8a8a') + c_(342, 238, 4, '#222') + c_(358, 238, 4, '#222')
    return svg(b, sky=('#f4e3cf', '#f8eee0'), uid=i)
@scene('interview', 'Interview met een microfoon', 1, 'politiek', 4)
def _(i):
    b = r(0, 330, W, 70, '#8d99a5') + building(0, 80, 640, 250, '#c9a98f', rows=3, cols=7)
    b += person(240, 350, 200, 1, 1, 0, 0, arms='hold') + person(400, 350, 190, 3, 4, 3, 1, arms='hold', item='mic') + r(500, 250, 70, 50, '#37424c', 6) + c_(535, 275, 14, '#8a949c')
    return svg(b, uid=i)
@scene('winkelier_interview', 'Winkelier vertelt in de winkel', 1, 'politiek', 4, sky=('#f4e8cf', '#efe0c0'))
def _(i):
    b = r(0, 310, W, 90, '#a67c52') + r(40, 70, 560, 250, '#f4efdc') + r(60, 90, 160, 130, '#cfe6f3') + r(430, 90, 150, 140, '#c98b3d')
    for k in range(3): b += r(440, 110+k*40, 130, 6, '#8b5a1c')
    b += person(260, 340, 210, 2, 0, 4, 1, arms='hold') + person(390, 345, 190, 0, 3, 6, 2, arms='hold', item='mic')
    return svg(b, sky=('#f4e8cf', '#efe0c0'), uid=i)
@scene('wijkagent', 'Wijkagent geeft advies aan bewoners', 1, 'misdaad', 4)
def _(i):
    b = r(0, 320, W, 80, '#8d99a5') + building(0, 90, 240, 230, '#b5c4cf', rows=3, cols=4) + building(400, 70, 240, 250, '#c9a98f', rows=3, cols=4)
    b += person(300, 345, 210, 0, 4, 5, 3, arms='point', hat='#1f2a37') + person(430, 340, 180, 3, 2, 2, 0, arms='down') + person(180, 342, 170, 1, 5, 3, 1, arms='down', long_hair=True)
    b += r(262, 230, 26, 6, '#e3b23c')
    return svg(b + cloud(330, 60), uid=i)
@scene('huisarts', 'Huisarts legt uit', 1, 'zorg', 4, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 300, W, 100, '#b9c3cb') + r(60, 70, 170, 120, '#f4f1ea', 4) + r(80, 90, 80, 8, '#9fb7c9') + r(80, 110, 120, 8, '#9fb7c9') + r(80, 130, 100, 8, '#9fb7c9')
    b += person(340, 350, 230, 2, 3, 7, 3, arms='point') + c_(340, 188, 5, '#222', 'opacity="0"') + line(318, 232, 326, 262, '#37424c', 4) + line(362, 232, 354, 262, '#37424c', 4)
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('schoolleider', 'Schoolleider vertelt over de vacatures', 1, 'onderwijs', 3)
def _(i):
    b = r(0, 320, W, 80, '#7fae72') + r(280, 90, 320, 230, '#b86a4f') + poly([(260, 90), (440, 30), (620, 90)], '#7a3020') + building(280, 110, 320, 210, '#b86a4f', win='#e8f1f6', rows=2, cols=5)
    b += person(180, 360, 230, 0, 0, 5, 0, arms='hold') + tree(50, 330, 1.2)
    return svg(b + cloud(150, 60), uid=i)
@scene('wethouder_bord', 'Wethouder bij een bouwbord', 1, 'economie', 3)
def _(i):
    b = r(0, 320, W, 80, '#9a8f7e') + r(330, 120, 220, 150, '#f4f1ea', 6, 'stroke="#2f6f9f" stroke-width="6"') + txt(440, 175, 'HIER KOMT', 22, '#2f6f9f') + txt(440, 205, 'BEDRIJVENTERREIN', 18, '#37424c') + r(436, 270, 8, 60, '#6b7885')
    b += person(250, 350, 210, 0, 2, 5, 0, arms='point')
    return svg(b + cloud(130, 70) + tree(600, 320, 1.1), uid=i)
@scene('bouwvakkers', 'Rondleiding over de bouwplaats', 1, 'zorg', 4)
def _(i):
    b = r(0, 320, W, 80, '#9a8f7e') + r(200, 110, 240, 210, '#c9d1d8') + r(500, 60, 10, 260, '#e3b23c') + r(400, 60, 230, 9, '#e3b23c')
    b += person(130, 350, 200, 0, 1, 2, 0, arms='point', hat='#f2c230') + person(250, 350, 190, 3, 2, 1, 1, arms='down', hat='#f2c230') + person(560, 345, 180, 1, 3, 3, 2, arms='down', hat='#f2c230')
    return svg(b, uid=i)
@scene('monster_water', 'Medewerker neemt een watermonster', 1, 'milieu', 3)
def _(i):
    b = r(0, 200, W, 200, '#5fa889') + r(0, 330, W, 70, '#e9d9a8') + person(260, 350, 200, 1, 3, 2, 3, arms='hold', hat='#f2c230') + r(300, 290, 20, 34, '#cfe6f3', 4, 'stroke="#37424c" stroke-width="3"')
    return svg(b + cloud(150, 70) + cloud(480, 60), uid=i)
@scene('voetbal_veld', 'Spelers jubelen op het veld', 1, 'sport', 5)
def _(i):
    b = r(0, 220, W, 180, '#4b8b5a') + r(0, 330, W, 6, '#e8f1e8', extra='opacity=".6"') + c_(320, 340, 50, 'none', 'stroke="#e8f1e8" stroke-width="3" opacity=".6"')
    for k, x in enumerate([150, 260, 380, 490]): b += person(x, 360, 190-(k % 2)*10, k, k+1, [0, 1, 0, 1][k], 3, arms='up')
    b += r(20, 140, 6, 90, '#f4f4f4') + r(110, 140, 6, 6, '#f4f4f4')
    return svg(b + cloud(200, 60) + cloud(500, 80), uid=i)
@scene('team_kantoor', 'Team in overleg', 1, 'economie', 4, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 300, W, 100, '#b9c3cb') + r(80, 60, 480, 110, '#f4f1ea', 4) + r(100, 80, 80, 70, '#59d0f5') + r(200, 90, 160, 8, '#9fb7c9') + r(200, 110, 120, 8, '#9fb7c9')
    b += r(120, 270, 400, 20, '#a67c52')
    for k in range(4): b += person(160+k*100, 280, 170-(k % 2)*8, k, k+1, k+2, k, arms='hold' if k % 2 else 'down', long_hair=(k == 1))
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('weerzien', 'Het moment van het weerzien', 1, 'human_interest', 5, sky=('#f4e3cf', '#f8eee0'))
def _(i):
    b = r(0, 310, W, 90, '#c9a07a') + r(300, 80, 100, 230, '#6b4a2f', 6) + c_(380, 200, 6, '#e3b23c') + tree(570, 320, 1.1) + tree(70, 320, 1.1)
    b += person(210, 350, 170, 4, 5, 6, 2, long_hair=True, arms='up') + person(450, 350, 200, 0, 2, 0, 0, arms='hold') + c_(330, 330, 20, '#8a8a8a') + poly([(316, 318), (322, 298), (332, 314)], '#8a8a8a')
    return svg(b, sky=('#f4e3cf', '#f8eee0'), uid=i)


# ---------------------------------------------------------------- campagne: fietshuis De Trapper
def bigbike(x, y, s=2.2, col='#c8553d', ebike=False):
    o = bike(x, y, s, col)
    if ebike:
        o += r(x+20*s, y-28*s, 18*s, 10*s, '#37424c', 3*s) + c_(x+29*s, y-23*s, 2.5*s, '#59d0f5')
    return o

@scene('fiets_product', 'Nieuwe stadsfiets in de showroom', 0, 'aanbieding', 5, sky=('#eef0f2', '#e1e5e9'))
def _(i):
    b = r(0, 300, W, 100, '#cfd5da') + bigbike(180, 300, 3.2, '#2f6f9f') + r(470, 150, 110, 70, '#fff', 6, 'stroke="#c0c8cf" stroke-width="3"') + txt(525, 190, '€ 649', 28, '#c8553d') + txt(525, 212, 'stadsfiets', 13, '#6b7885', w=500)
    return svg(b, sky=('#eef0f2', '#e1e5e9'), uid=i)
@scene('ebike_product', 'E-bike met bereik van 100 kilometer', 0, 'nieuw_product', 5, sky=('#dbe9f2', '#eef6fb'))
def _(i):
    b = r(0, 320, W, 80, '#cfd5da') + bigbike(190, 315, 3.3, '#0e6b5e', True)
    b += '<path d="M120 120 A200 130 0 0 1 520 120" fill="none" stroke="#f2c230" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18"/>' + txt(320, 100, '100 km', 36, '#0e6b5e')
    return svg(b, sky=('#dbe9f2', '#eef6fb'), uid=i)
@scene('verlichting', 'Fietsverlichting aan', 0, 'aanbieding', 5, sky=('#0e1a2b', '#1c2b42'))
def _(i):
    b = r(0, 300, W, 100, '#1b222c')
    b += poly([(250, 220), (60, 400), (440, 400)], '#f6e7a0', 'opacity=".22"') + c_(250, 220, 26, '#f6e7a0') + c_(250, 220, 14, '#fff') + r(235, 246, 30, 40, '#37424c', 6)
    b += c_(470, 250, 18, '#e03c31') + c_(470, 250, 8, '#ff8a80') + r(458, 268, 24, 36, '#37424c', 5) + poly([(470, 250), (560, 300), (560, 210)], '#e03c31', 'opacity=".18"')
    return svg(b, sky=('#0e1a2b', '#1c2b42'), uid=i)
@scene('showroom', 'Showroom met fietsen op een rij', 0, 'aanbieding', 3, sky=('#e8e3d2', '#f2ede0'))
def _(i):
    b = r(0, 300, W, 100, '#b9a07a') + r(0, 0, W, 300, '#f2ede0') + r(40, 40, 560, 6, '#c9b99a')
    for k, col in enumerate(['#c8553d', '#2f6f9f', '#4b8b5a', '#e3b23c', '#7b5ea7']):
        b += bike(40+k*118, 330, 1.25, col)
    return svg(b, sky=('#e8e3d2', '#f2ede0'), uid=i)
@scene('prijsbord', 'Actiebord met korting', 0, 'aanbieding', 3, sky=('#eef0f2', '#e1e5e9'))
def _(i):
    b = r(0, 320, W, 80, '#cfd5da') + poly([(180, 330), (320, 90), (460, 330)], '#c8553d') + r(300, 90, 40, 14, '#a8402c') + poly([(210, 330), (320, 130), (430, 330)], '#e3553d')
    b += txt(320, 250, '-20%', 64, '#fff') + txt(320, 290, 'alle verlichting', 18, '#fff', w=500)
    return svg(b, sky=('#eef0f2', '#e1e5e9'), uid=i)
@scene('tweedehands', 'Tweedehands fietsen met prijskaartjes', 0, 'aanbieding', 4)
def _(i):
    b = r(0, 300, W, 100, '#8d99a5') + r(0, 296, W, 8, '#6f7b87')
    for k, (col, pr) in enumerate([('#2f6f9f', '149'), ('#c8553d', '179'), ('#4b8b5a', '199'), ('#7b5ea7', '229')]):
        x = 40+k*150
        b += bike(x, 330, 1.35, col) + r(x+30, 215, 60, 34, '#fff', 4, 'stroke="#c0c8cf" stroke-width="2"') + txt(x+60, 239, '€ '+pr, 17, '#c8553d')
    return svg(b + cloud(150, 60) + cloud(470, 70), uid=i)
@scene('donker_fietspad', 'Donker fietspad in de winter', 0, 'seizoen', 3, sky=('#0e1a2b', '#25364f'))
def _(i):
    b = poly([(250, 160), (390, 160), (560, 400), (80, 400)], '#2a3441') + line(320, 165, 320, 400, '#3c4a5e', 4)
    for k, x in enumerate([60, 150, 500, 590]): b += tree(x, 300 + (k % 2)*30, 1.4, '#1b3a2c')
    b += c_(540, 70, 24, '#e8e4c8') + poly([(320, 330), (230, 400), (410, 400)], '#f6e7a0', 'opacity=".10"')
    return svg(b, sky=('#0e1a2b', '#25364f'), uid=i)
@scene('werkplaats_leeg', 'Werkplaats met gereedschap', 0, 'dienst', 3, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 300, W, 100, '#8d99a5') + r(40, 40, 330, 170, '#a67c52', 4)
    for k in range(8): b += r(60+k*38, 60, 8, 60, '#c0c8cf', 2) + r(56+k*38, 130, 16, 8, '#c8553d', 3)
    b += r(400, 190, 200, 16, '#6b4a2f') + r(420, 206, 8, 100, '#6b4a2f') + r(570, 206, 8, 100, '#6b4a2f') + bike(420, 190, 1.0, '#2f6f9f') 
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('sloten_helmen', 'Fietssloten en helmen', 0, 'aanbieding', 3, sky=('#eef0f2', '#e1e5e9'))
def _(i):
    b = r(0, 300, W, 100, '#cfd5da')
    for k, col in enumerate(['#c8553d', '#2f6f9f', '#e3b23c']):
        x = 90+k*120
        b += f'<path d="M{x} 280 q0 -95 70 -95 q70 0 70 95 z" fill="{col}"/>' + r(x+10, 262, 120, 10, '#fff', 4, 'opacity=".5"')
    b += f'<circle cx="480" cy="250" r="48" fill="none" stroke="#37424c" stroke-width="14"/>' + r(450, 262, 60, 44, '#6b7885', 8) + c_(480, 284, 7, '#222')
    return svg(b, sky=('#eef0f2', '#e1e5e9'), uid=i)
@scene('bakfiets_product', 'Bakfiets in de winkel', 0, 'nieuw_product', 4, sky=('#e8e3d2', '#f2ede0'))
def _(i):
    b = r(0, 320, W, 80, '#b9a07a') + r(250, 200, 190, 70, '#4b8b5a', 8) + r(245, 190, 200, 14, '#3a7048', 4) + bike(160, 330, 1.6, '#4b8b5a') + c_(420, 330, 30, 'none', 'stroke="#222" stroke-width="4"')
    b += line(250, 270, 190, 300, '#222', 4) + line(445, 262, 420, 330, '#222', 4)
    return svg(b, sky=('#e8e3d2', '#f2ede0'), uid=i)

@scene('monteur_band', 'Monteur repareert een lekke band', 1, 'dienst', 5, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 310, W, 90, '#8d99a5') + r(60, 60, 150, 110, '#a67c52', 4) + bike(300, 330, 2.0, '#c8553d') + person(210, 345, 210, 0, 1, 1, 0, arms='hold', hat='#2f6f9f')
    b += r(250, 300, 60, 8, '#37424c', 3)
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('klant_ebike', 'Klant lacht op de nieuwe e-bike', 1, 'verhaal', 5)
def _(i):
    b = r(0, 320, W, 80, '#6d7782') + tree(80, 316, 1.4) + tree(570, 316, 1.5) + bigbike(210, 340, 2.4, '#0e6b5e', True) + person(262, 325, 170, 4, 5, 2, 2, long_hair=True, arms='hold')
    return svg(b + cloud(180, 60) + cloud(470, 50, 1.2), uid=i)
@scene('fatima_portret', 'Fatima met haar eerste e-bike', 1, 'verhaal', 5, sky=('#f4e3cf', '#f8eee0'))
def _(i):
    b = r(0, 330, W, 70, '#c9a07a') + bigbike(380, 335, 3.0, '#0e6b5e', True) + person(220, 380, 300, 3, 4, 3, 1, long_hair=True, arms='hold')
    return svg(b, sky=('#f4e3cf', '#f8eee0'), uid=i)
@scene('open_dag', 'Bezoekers bij de open dag', 1, 'evenement', 5, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 310, W, 90, '#8d99a5') + r(0, 0, W, 310, '#eef2f5') + r(40, 50, 560, 70, '#2f6f9f', 6) + txt(320, 96, 'OPEN DAG  ·  GRATIS FIETSCHECK', 28, '#fff')
    for k in range(5): b += person(80+k*120, 360, 160+(k % 3)*14, k, k+1, k+2, k, arms='up' if k == 2 else 'hold', hat='#c8553d' if k == 0 else None)
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('fietscheck', 'Medewerker checkt de remmen', 1, 'evenement', 4, sky=('#e4ebf0', '#d3dde5'))
def _(i):
    b = r(0, 310, W, 90, '#8d99a5') + bike(280, 330, 2.1, '#7b5ea7') + person(210, 345, 210, 1, 0, 1, 0, arms='point', hat='#2f6f9f') + person(480, 345, 190, 0, 3, 4, 2, arms='down')
    return svg(b, sky=('#e4ebf0', '#d3dde5'), uid=i)
@scene('gezin_bakfiets', 'Gezin met kinderen op de bakfiets', 1, 'nieuw_product', 5)
def _(i):
    b = r(0, 330, W, 70, '#6d7782') + tree(60, 326, 1.4) + tree(590, 326, 1.4) + r(250, 220, 190, 80, '#4b8b5a', 8) + bike(180, 345, 1.7, '#4b8b5a') + c_(440, 345, 32, 'none', 'stroke="#222" stroke-width="4"')
    b += person(235, 300, 120, 4, 5, 3, 2, arms='hold') + person(300, 265, 70, 0, 2, 5, 0) + person(360, 265, 66, 3, 4, 0, 0, long_hair=True)
    return svg(b + cloud(150, 60) + cloud(450, 70), uid=i)
@scene('student_fiets', 'Student met fiets bij de campus', 1, 'aanbieding', 5)
def _(i):
    b = r(0, 330, W, 70, '#8d99a5') + building(300, 90, 320, 240, '#b86a4f', win='#e8f1f6', rows=3, cols=5) + poly([(280, 90), (460, 30), (640, 90)], '#7a3020') + bike(110, 350, 1.9, '#c8553d') + person(185, 340, 200, 2, 1, 4, 3, arms='hold')
    b += r(45, 90, 150, 60, '#fff', 8, 'stroke="#c0c8cf" stroke-width="2"') + txt(120, 130, 'STUDENT -15%', 20, '#c8553d')
    return svg(b + cloud(250, 50), uid=i)
@scene('team_winkel', 'Team voor het fietshuis', 1, 'verhaal', 3)
def _(i):
    b = r(0, 320, W, 80, '#8d99a5') + r(60, 90, 520, 230, '#d9b99b') + r(60, 90, 520, 50, '#0e6b5e') + txt(320, 126, 'FIETSHUIS DE TRAPPER', 26, '#fff') + r(120, 170, 160, 150, '#cfe6f3', 4) + r(360, 170, 160, 150, '#cfe6f3', 4)
    for k in range(4): b += person(150+k*110, 380, 190-(k % 2)*12, k, k+2, [3, 0, 5, 1][k], k, arms='down' if k % 2 else 'hold', long_hair=(k == 2))
    return svg(b, uid=i)

def build():
    out = {}
    for k, v in S.items():
        sky = v.get('sky', ('#bfe0f2', '#eaf5fb'))
        out[k] = dict(l=v['label'], m=v['mensen'], c=v['cat'], q=v['q'], s=v['f'](k))
    return out

# ---- koppeling aan startartikelen (volgorde: foto1, foto2, video)
MAP = {
 'n01-f1': 'brug_file', 'n01-f2': 'bord_omleiding', 'n01-v1': 'brug_drone',
 'n02-f1': 'winkelstraat', 'n02-f2': 'raadzaal', 'n02-v1': 'winkelier_interview',
 'n03-f1': 'nacht_politie', 'n03-f2': 'deurslot', 'n03-v1': 'wijkagent',
 'n04-f1': 'oude_man_fiets', 'n04-f2': 'kraam', 'n04-v1': 'gerrit_route',
 'n05-f1': 'bakker_toonbank', 'n05-f2': 'gevel_bakkerij', 'n05-v1': 'klanten_rij',
 'n06-f1': 'wachtkamer', 'n06-f2': 'stethoscoop', 'n06-v1': 'huisarts',
 'n07-f1': 'klas_leeg', 'n07-f2': 'school_buiten', 'n07-v1': 'schoolleider',
 'n08-f1': 'menigte_festival', 'n08-f2': 'poster_festival', 'n08-v1': 'menigte_festival',
 'n09-f1': 'storm_bomen', 'n09-f2': 'weerkaart', 'n09-v1': 'storm_bomen',
 'n10-f1': 'water_alg', 'n10-f2': 'waarschuwingsbord', 'n10-v1': 'monster_water',
 'n11-f1': 'vuurwerk_kade', 'n11-f2': 'kaart_gebied', 'n11-v1': 'vuurwerk_kade',
 'n12-f1': 'bouwkranen', 'n12-f2': 'maquette', 'n12-v1': 'bouwvakkers',
 'n13-f1': 'kind_kat', 'n13-f2': 'zoekposter', 'n13-v1': 'weerzien',
 'n14-f1': 'afzetting', 'n14-f2': 'kruispunt', 'n14-v1': 'afzetting',
 'n15-f1': 'luchtfoto_terrein', 'n15-f2': 'wethouder_bord', 'n15-v1': 'terrein_impressie',
}

CAMPAGNE = [
 dict(id='c01', cat='aanbieding', titel='Winteractie: 20% korting op alle fietsverlichting', intro='Fietshuis De Trapper geeft tot en met zondag 20% korting op alle voor- en achterlichten. Een set kost nu vanaf 12 euro in plaats van 15 euro.',
      nw=(4,5,4,1,5), ij=(3,4,4,3), sens=2, tg=72, emo='blij', b=[('foto','verlichting',5),('foto','prijsbord',3),('video','donker_fietspad',3)]),
 dict(id='c02', cat='nieuw_product', titel='Nieuw binnen: e-bike Vecht Cruiser met 100 kilometer bereik', intro='De Vecht Cruiser is de nieuwe e-bike van De Trapper. Met een volle accu rijd je tot 100 kilometer. Prijs: 2.199 euro, proefrit mogelijk in de winkel.',
      nw=(5,4,2,3,4), ij=(2,4,5,4), sens=2, tg=168, emo='blij', b=[('foto','ebike_product',5),('foto','showroom',3),('video','klant_ebike',5)]),
 dict(id='c03', cat='evenement', titel='Open dag in de werkplaats: gratis fietscheck op zaterdag', intro='Op zaterdag van 10.00 tot 16.00 uur staat de werkplaats open. Monteurs checken je remmen, banden en verlichting gratis en laten zien hoe je zelf kleine reparaties doet.',
      nw=(3,5,3,3,3), ij=(3,4,4,4), sens=3, tg=72, emo='blij', b=[('foto','open_dag',5),('foto','werkplaats_leeg',3),('video','fietscheck',4)]),
 dict(id='c04', cat='verhaal', titel='Fatima fietst na dertig jaar weer: haar eerste e-bike', intro='Fatima (62) uit Vechtwaard stapte dertig jaar niet op een fiets. Nu fietst ze elke dag naar haar werk op een e-bike van De Trapper. Een klantverhaal over durven beginnen.',
      nw=(2,4,1,5,3), ij=(2,4,5,5), sens=2, tg=168, emo='blij', b=[('foto','fatima_portret',5),('foto','team_winkel',3),('video','klant_ebike',4)]),
 dict(id='c05', cat='dienst', titel='Winterklaar-pakket: remmen, licht en banden voor 49 euro', intro='Het winterklaar-pakket van De Trapper bevat een remcontrole, nieuwe lampjes en een bandenspanningscheck. Afspraak maken kan online en duurt een kwartier.',
      nw=(4,4,3,1,5), ij=(3,5,4,3), sens=3, tg=168, emo='neutraal', b=[('foto','monteur_band',5),('foto','werkplaats_leeg',3),('video','monteur_band',4)]),
 dict(id='c06', cat='aanbieding', titel='Tweedehands fietsen vanaf 149 euro, met een jaar garantie', intro='Alle tweedehands fietsen bij De Trapper zijn nagekeken door de monteurs en krijgen een jaar garantie. De goedkoopste fiets kost 149 euro.',
      nw=(5,3,2,1,3), ij=(5,4,3,2), sens=2, tg=168, emo='neutraal', b=[('foto','tweedehands',4),('foto','prijsbord',2),('video','team_winkel',3)]),
 dict(id='c07', cat='seizoen', titel='Donkere dagen: zorg dat je gezien wordt', intro='In de herfst en winter gebeuren de meeste fietsongelukken in het donker. De Trapper helpt je met goede verlichting, reflectoren en een veilige set voor onderweg.',
      nw=(3,4,3,1,5), ij=(4,4,4,3), sens=3, tg=96, emo='bezorgd', b=[('foto','donker_fietspad',4),('foto','verlichting',4),('video','donker_fietspad',3)]),
 dict(id='c08', cat='verhaal', titel='Zo maakt monteur Daan een lekke band in drie minuten heel', intro='Monteur Daan laat in een korte video zien hoe je een lekke band plakt. Handig voor wie het zelf wil proberen of eens bij De Trapper wil binnenlopen.',
      nw=(2,3,1,4,2), ij=(5,3,3,2), sens=2, tg=168, emo='blij', b=[('foto','monteur_band',5),('foto','werkplaats_leeg',3),('video','monteur_band',5)]),
 dict(id='c09', cat='nieuw_product', titel='Proefrit bakfiets: probeer de nieuwe bakfiets met je gezin', intro='Op zaterdag kun je de nieuwe bakfiets uitproberen bij De Trapper. Er is plek voor twee kinderen en de bakfiets heeft een elektrische motor.',
      nw=(4,4,2,4,3), ij=(2,5,4,2), sens=2, tg=96, emo='blij', b=[('foto','gezin_bakfiets',5),('foto','bakfiets_product',4),('video','gezin_bakfiets',4)]),
 dict(id='c10', cat='aanbieding', titel='Studentenkorting: 15% op fietsen en sloten met je studentenpas', intro='Studenten krijgen bij De Trapper 15% korting op fietsen en sloten. Laat je studentenpas zien in de winkel en de korting staat meteen op de bon.',
      nw=(5,3,3,1,3), ij=(5,2,2,1), sens=1, tg=168, emo='blij', b=[('foto','student_fiets',5),('foto','sloten_helmen',3),('video','student_fiets',3)]),
]

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    lib = build()
    js = 'const BIB=' + json.dumps(lib, ensure_ascii=False, separators=(',', ':')) + ';\n'
    js += "const bibSrc=id=>BIB[id]?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(BIB[id].s):'';\n"
    open(os.path.join(here, 'beelden.js'), 'w', encoding='utf8').write(js)
    data = [a for a in json.load(open(os.path.join(here, 'data.json.txt'), encoding='utf8')) if a['id'].startswith('n')]
    for a in data:
        for b in a['beelden']:
            sid = MAP[b['id']]
            b['bron'] = sid
            b['mensen'] = bool(lib[sid]['m'])
    for c in CAMPAGNE:
        bl = []
        for k, (typ, bron, q) in enumerate(c['b'], 1):
            e = dict(id=f"{c['id']}-{'v' if typ == 'video' else 'f'}{k}", type=typ, beschrijving=lib[bron]['l'], kwaliteit=q, bron=bron, mensen=bool(lib[bron]['m']))
            if typ == 'video': e['duur_sec'] = 30
            bl.append(e)
        imp, nab, urg, hum, act = c['nw']; j, v, m, se = c['ij']
        data.append(dict(id=c['id'], afdeling='campagne', categorie=c['cat'], titel_origineel=c['titel'], intro_origineel=c['intro'],
            nieuwswaarde=dict(impact=imp, nabijheid=nab, conflict=urg, human_interest=hum, actualiteit=act), emotie=c['emo'], tijdgevoeligheid_uren=c['tg'],
            interesse=dict(jongeren=j, volwassenen=v, midden=m, senioren=se), sensatie_potentieel=c['sens'], beelden=bl))
    json.dump(data, open(os.path.join(here, 'data.json.txt'), 'w', encoding='utf8'), ensure_ascii=False)
    print(len(lib), 'beelden,', sum(1 for v in lib.values() if v['m']), 'met mensen,', len(js), 'bytes')
    # contactvel
    cells = ''.join(f'<figure style="margin:6px;display:inline-block;width:220px"><img style="width:220px;height:138px;border-radius:6px" src="data:image/svg+xml;charset=utf-8,{__import__("urllib.parse").parse.quote(v["s"])}"><figcaption style="font:12px Arial">{k} {"(mensen)" if v["m"] else ""}</figcaption></figure>' for k, v in lib.items())
    open('/tmp/contact.html', 'w').write('<body style="background:#eee">' + cells)
