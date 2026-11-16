import math,json
def f(v):
    s=("%.1f"%v).rstrip("0").rstrip(".");return "0" if s in("-0","") else s
def pol(cx,cy,r,a):  # a в градусах, 0 = вверх, по часовой
    return cx+r*math.sin(math.radians(a)),cy-r*math.cos(math.radians(a))
def circ(x,y,r):return '<circle cx="%s" cy="%s" r="%s"/>'%(f(x),f(y),f(r))
def ell(x,y,rx,ry,rot):return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" transform="rotate(%s %s %s)"/>'%(f(x),f(y),f(rx),f(ry),f(rot),f(x),f(y))
def path(d):return '<path d="%s"/>'%d
def qb(p0,p1,p2,t):
    x=(1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0];y=(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]
    dx=2*(1-t)*(p1[0]-p0[0])+2*t*(p2[0]-p1[0]);dy=2*(1-t)*(p1[1]-p0[1])+2*t*(p2[1]-p1[1])
    return (x,y),math.degrees(math.atan2(dx,-dy))   # угол направления: 0 = вверх
def lens(p,ang,L,W,rib=True):
    # лист: от точки p в направлении ang, длина L, ширина W
    tip=pol(p[0],p[1],L,ang);c1=pol(*pol(p[0],p[1],L*.5,ang),W*.62,ang-90);c2=pol(*pol(p[0],p[1],L*.5,ang),W*.62,ang+90)
    d="M%s %sQ%s %s %s %sQ%s %s %s %s"%(f(p[0]),f(p[1]),f(c1[0]),f(c1[1]),f(tip[0]),f(tip[1]),f(c2[0]),f(c2[1]),f(p[0]),f(p[1]))
    if rib:
        m=pol(p[0],p[1],L*.82,ang);d+="M%s %sL%s %s"%(f(p[0]),f(p[1]),f(m[0]),f(m[1]))
    return d
# 1. Розетка в кольце (символ Posy)
def rosette(cx,cy,R):
    d="".join("M%s %sA%s %s 0 0 1 %s %sA%s %s 0 0 1 %s %s"%(f(cx),f(cy),f(R),f(R),f(pol(cx,cy,R,60*k)[0]),f(pol(cx,cy,R,60*k)[1]),f(R),f(R),f(cx),f(cy)) for k in range(6))
    return circ(cx,cy,R)+path(d)
# 2. Гипсофила
def gyps_big():
    d=("M24 97C30 74 40 58 48 44"      # ствол
       "M48 44C50 34 50 24 46 15" "M48 44C56 38 66 32 73 23" "M48 44C40 38 32 34 25 31"
       "M36 64C46 60 58 58 67 51" "M55 58C57 62 59 65 60 68" "M30 78C24 70 18 62 15 54"
       "M50 28C53 25 56 23 58 22" "M35 36C33 39 31 42 30 45" "M65 31C71 30 77 31 81 33")
    B=[(46,11.5,3.6),(75.5,20,4),(22,29.5,3.6),(70.5,49,4),(61,71,3),(13.5,50.5,3.6),(60.5,20.5,2.6),(29,47.5,2.6),(84,34.5,3)]
    return path(d)+"".join(circ(*b) for b in B)+"".join(circ(b[0],b[1],.9) for b in B if b[2]>=3.6)
def gyps_small():
    return path("M4 15.5C5 11.5 6.5 9 8 7.2M8 7.2C8.3 5.8 8.2 4.8 7.7 3.9M8 7.2C9.5 6.7 10.8 6 11.8 5.2M6 10.4C5 9.6 4.2 9 3.5 8.6")+circ(7.3,2.5,1.5)+circ(12.9,4.3,1.5)+circ(2.5,7.8,1.4)
# 3. Роза (вид сверху)
def rose(cx,cy,layers,core):
    d=""
    for r,n,ph,ov in layers:
        span=360/n*ov
        for k in range(n):
            a0=ph+k*360/n;a1=a0+span;am=(a0+a1)/2
            p0=pol(cx,cy,r*.86,a0);p1=pol(cx,cy,r*.96,a1);c=pol(cx,cy,r*1.42,am)
            d+="M%s %sQ%s %s %s %s"%(f(p0[0]),f(p0[1]),f(c[0]),f(c[1]),f(p1[0]),f(p1[1]))
    # сердцевина: маленький завиток
    s=core
    d+="M%s %sa%s %s 0 1 1 %s %sa%s %s 0 1 1 %s %s"%(f(cx-s*.2),f(cy+s*.1),f(s*.55),f(s*.55),f(s*.8),f(s*.3),f(s),f(s),f(-s*1.5),f(-s*1.1))
    return path(d)
def rose_big():return rose(50,50,[(11,3,10,1.18),(20,4,50,1.2),(30,5,0,1.22),(40.5,6,25,1.2)],4.2)
def rose_small():return rose(8,8,[(3.1,3,10,1.2),(6,5,0,1.22)],1.1)
# 4. Цветок персика
def peach(cx,cy,R,r0,wide,st,dots):
    d=""
    for k in range(5):
        a=72*k
        b=pol(cx,cy,r0,a);t=pol(cx,cy,R,a)
        c1=pol(*pol(cx,cy,R*.42,a),wide,a-90);c2=pol(*pol(cx,cy,R*1.02,a),wide*.98,a-90)
        c3=pol(*pol(cx,cy,R*1.02,a),wide*.98,a+90);c4=pol(*pol(cx,cy,R*.42,a),wide,a+90)
        d+="M%s %sC%s %s %s %s %s %sC%s %s %s %s %s %s"%(f(b[0]),f(b[1]),f(c1[0]),f(c1[1]),f(c2[0]),f(c2[1]),f(t[0]),f(t[1]),f(c3[0]),f(c3[1]),f(c4[0]),f(c4[1]),f(b[0]),f(b[1]))
    out=""
    if st:
        for k in range(5):
            for da,L in((0,st),(-15,st*.74),(15,st*.74)):
                a=72*k+da
                p=pol(cx,cy,r0*.9,a);q=pol(cx,cy,L,a);d+="M%s %sL%s %s"%(f(p[0]),f(p[1]),f(q[0]),f(q[1]));out+=circ(q[0],q[1],dots)
    return path(d)+out
def peach_big():return peach(50,50,45,4.5,18,19,1.2)+circ(50,50,2.4)
def peach_small():return peach(8,8,7.3,1.4,2.9,0,0)+circ(8,8,.9)
# 5. Лаванда
def lav_sprig(p0,p1,p2,levels,s0,s1,t0=.46):
    d="M%s %sQ%s %s %s %s"%(f(p0[0]),f(p0[1]),f(p1[0]),f(p1[1]),f(p2[0]),f(p2[1]));out=""
    for i in range(levels):
        t=t0+(0.97-t0)*i/(levels-1);s=s0+(s1-s0)*i/(levels-1)
        p,ang=qb(p0,p1,p2,t)
        for sd in(-1,1):
            c=pol(*pol(p[0],p[1],3.4*s,ang+sd*90),2.2*s,ang)
            out+=ell(c[0],c[1],2.5*s,4.6*s,ang+sd*30)
    tip,ang=qb(p0,p1,p2,1);c=pol(tip[0],tip[1],3*s1,ang);out+=ell(c[0],c[1],2.2*s1,4*s1,ang)
    return d,out
def lav_big():
    d1,o1=lav_sprig((50,97),(50,55),(50,14),7,1.05,.6)
    d2,o2=lav_sprig((50,97),(44,62),(24,30),6,.95,.55,.5)
    d3,o3=lav_sprig((50,97),(56,62),(76,30),6,.95,.55,.5)
    lv=lens((49,90),-38,24,6,False)+lens((51,90),38,24,6,False)
    return path(d1+d2+d3+lv)+o1+o2+o3
def lav_small():
    out="";d="M8 15.6L8 4.2"
    for i,(y,s) in enumerate([(9.6,1),(7,.9),(4.6,.75)]):
        for sd in(-1,1):out+=ell(8+sd*1.9*s,y-.6,1.05*s,1.9*s,sd*30)
    out+=ell(8,2.3,.9,1.6,0)
    return path(d)+out
# 6. Мята
def mint_big():
    p0,p1,p2=(48,97),(44,58),(52,16)
    d="M%s %sQ%s %s %s %s"%(p0+p1+p2)
    for t,L in[(.2,23),(.44,20),(.66,15.5),(.84,11)]:
        p,ang=qb(p0,p1,p2,t)
        for sd in(-1,1):d+=lens(p,ang+sd*58,L,L*.56)
    tip,ang=qb(p0,p1,p2,1)
    d+=lens(tip,ang-24,8,4,False)+lens(tip,ang+24,8,4,False)
    return path(d)
def mint_small():
    d="M8 15.6L8 3.4"
    for y,L in[(11.4,5.6),(7,4.4)]:
        for sd in(-1,1):d+=lens((8,y),sd*58,L,L*.56,False)
    d+=lens((8,3.6),0,3,1.9,False)
    return path(d)
# 7. Колокольчик
def bell(x,y,s,rot):
    P=[(0,0),(-5,1),(-7,8),(-9,18),(-4.5,15.3),(0,19.6),(4.5,15.3),(9,18),(7,8),(5,1),(0,0)]
    def tr(p):
        a=math.radians(rot);X=p[0]*s;Y=p[1]*s
        return x+X*math.cos(a)-Y*math.sin(a),y+X*math.sin(a)+Y*math.cos(a)
    Q=[tr(p) for p in P]
    d="M%s %sC%s %s %s %s %s %sL%s %sL%s %sL%s %sL%s %sC%s %s %s %s %s %s"%tuple(f(v) for p in Q for v in p)
    a,b=tr((0,13)),tr((0,22.5))
    d+="M%s %sL%s %s"%(f(a[0]),f(a[1]),f(b[0]),f(b[1]))
    return d,circ(b[0],b[1],1.1*s)
def bell_big():
    p0,p1,p2=(30,97),(26,34),(74,18)
    d="M30 97Q26 34 74 18";out=""
    for t,s,rot,dx in[(.46,1.15,4,0),(.74,1,-3,0),(1,.82,-10,0)]:
        p,ang=qb(p0,p1,p2,t)
        q=(p[0]+7*s,p[1]+7*s)
        d+="M%s %sQ%s %s %s %s"%(f(p[0]),f(p[1]),f(p[0]+6*s),f(p[1]+.5),f(q[0]),f(q[1]))
        bd,bc=bell(q[0],q[1],s,rot);d+=bd;out+=bc
    d+=lens((29.6,88),-50,21,6.5,False)+lens((28.6,72),-44,16,5,False)
    return path(d)+out
def bell_small():
    d="M3 15.5C3 8 5 3.6 10.4 3.2M10.4 3.2L10.6 4.6"
    bd,bc=bell(10.6,4.6,.5,-6)
    return path(d+bd)+bc
# 8. Одуванчик
def tuft(x,y,ang,L,n=3,spread=34):
    d=""
    for i in range(n):
        a=ang+(i-(n-1)/2)*spread;q=pol(x,y,L,a);d+="M%s %sL%s %s"%(f(x),f(y),f(q[0]),f(q[1]))
    return d
def dand_big():
    cx,cy=45,40;d="";n=18
    for k in range(n):
        a=360/n*k+6;L=27 if k%2 else 21.5
        p=pol(cx,cy,3.6,a);q=pol(cx,cy,L,a)
        d+="M%s %sL%s %s"%(f(p[0]),f(p[1]),f(q[0]),f(q[1]))+tuft(q[0],q[1],a,3.6)
    d+="M45 43.6C46 62 43 80 46 98"
    for x,y,a in[(77,20,38),(89,36,62),(71,6,20)]:
        q=pol(x,y,7,a);d+="M%s %sL%s %s"%(f(x),f(y),f(q[0]),f(q[1]))+tuft(q[0],q[1],a,3.4)
    return path(d)+circ(cx,cy,3.6)
def dand_small():
    d="";out=""
    for k in range(8):
        a=45*k+22.5;p=pol(8,6.4,1.3,a);q=pol(8,6.4,4.6,a);d+="M%s %sL%s %s"%(f(p[0]),f(p[1]),f(q[0]),f(q[1]));out+=circ(q[0],q[1],.75)
    return path(d+"M8 7.7L8 15.6")+out
M={"Ч/Б":("Символ Posy",rosette(50,50,46),rosette(8,8,7),"spin"),
"Жемчуг":("Гипсофила",gyps_big(),gyps_small(),"sway"),
"Нежная роза":("Роза",rose_big(),rose_small(),"spin"),
"Персик":("Цветок персика",peach_big(),peach_small(),"spin"),
"Лаванда":("Лаванда",lav_big(),lav_small(),"sway"),
"Мята":("Мята",mint_big(),mint_small(),"sway"),
"Сумерки":("Колокольчик",bell_big(),bell_small(),"sway"),
"Туман":("Одуванчик",dand_big(),dand_small(),"sway")}
if __name__=="__main__":
    PAL={"Ч/Б":("#ffffff","#000000","#000000"),"Жемчуг":("#f8f4ef","#3d3536","#96626a"),"Нежная роза":("#f9eeee","#43333a","#a65d6c"),"Персик":("#fbf1e9","#43342c","#a3643c"),"Лаванда":("#f2effa","#342e48","#7462ae"),"Мята":("#eef5f2","#2c3a35","#3f7d69"),"Сумерки":("#1e1b27","#f0e9ef","#e0c2d2"),"Туман":("#181d23","#e9eef1","#a9c6d8")}
    h='<!doctype html><meta charset="utf-8"><style>body{margin:0;display:grid;grid-template-columns:repeat(4,300px);font:14px -apple-system,Arial}.c{height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}svg{fill:none;stroke-linecap:round;stroke-linejoin:round}</style>'
    tot=0
    for n,(nm,big,small,mv) in M.items():
        bg,fg,ac=PAL[n];tot+=len(big)+len(small)
        h+=f'<div class="c" style="background:{bg};color:{fg}"><svg width="200" height="200" viewBox="0 0 100 100" stroke="{ac}" stroke-width="1.3">{big}</svg><div style="display:flex;gap:14px;align-items:center"><svg width="16" height="16" viewBox="0 0 16 16" stroke="{ac}" stroke-width="1">{small}</svg><svg width="40" height="40" viewBox="0 0 16 16" stroke="{ac}" stroke-width=".9">{small}</svg><span>{n}: {nm}</span></div></div>'
    open("sheet.html","w").write(h);print("bytes",tot)
