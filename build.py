import base64, os, re, sys

# сборка работает из любой папки: считаем пути от расположения скрипта
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

A = "assets"
def b64(p, mime): return f"data:{mime};base64," + base64.b64encode(open(p,"rb").read()).decode()

shell = open("src/shell.html", encoding="utf-8").read()
data  = open("src/data.js", encoding="utf-8").read()
game  = open("src/game.js", encoding="utf-8").read()

repl = {
 "__BG_SURFACE_V__":  b64(f"{A}/bg_surface_v_o.jpg", "image/jpeg"),
 "__BG_UNDERWATER__": b64(f"{A}/bg_underwater_o.jpg", "image/jpeg"),
 "__BG_RIVER_V__":    b64(f"{A}/bg_river_v_o.jpg", "image/jpeg"),
 "__BG_NIGHT_V__":    b64(f"{A}/bg_night_v_o.jpg", "image/jpeg"),
 "__BG_OCEAN_V__":    b64(f"{A}/bg_ocean_v_o.jpg", "image/jpeg"),
 "__BG_ICE_V__":      b64(f"{A}/bg_ice_v_o.jpg", "image/jpeg"),
 "__FISH_PLOTVA__":  b64(f"{A}/fish_plotva_s.png", "image/png"),
 "__FISH_KARAS__":   b64(f"{A}/fish_karas_s.png", "image/png"),
 "__FISH_OKUN__":    b64(f"{A}/fish_okun_s.png", "image/png"),
 "__FISH_LIN__":     b64(f"{A}/fish_lin_s.png", "image/png"),
 "__FISH_LESH__":    b64(f"{A}/fish_lesh_s.png", "image/png"),
 "__FISH_KARP__":    b64(f"{A}/fish_karp_s.png", "image/png"),
 "__FISH_SHCHUKA__": b64(f"{A}/fish_shchuka_s.png", "image/png"),
 "__FISH_SUDAK__":   b64(f"{A}/fish_sudak_s.png", "image/png"),
 "__FISH_FOREL__":   b64(f"{A}/fish_forel_s.png", "image/png"),
 "__FISH_SOM__":     b64(f"{A}/fish_som_s.png", "image/png"),
 "__FISH_ERSH__":     b64(f"{A}/fish_ersh_s.png", "image/png"),
 "__FISH_GOLAVL__":   b64(f"{A}/fish_golavl_s.png", "image/png"),
 "__FISH_ZHEREH__":   b64(f"{A}/fish_zhereh_s.png", "image/png"),
 "__FISH_NALIM__":    b64(f"{A}/fish_nalim_s.png", "image/png"),
 "__FISH_STERLYAD__": b64(f"{A}/fish_sterlyad_s.png", "image/png"),
 "__FISH_BELUGA__":   b64(f"{A}/fish_beluga_s.png", "image/png"),
 "__FISH_GOLUBOY__":  b64(f"{A}/fish_goluboy_s.png", "image/png"),
 "__FISH_MOONFISH__": b64(f"{A}/fish_moonfish_s.png", "image/png"),
 "__FISH_YAZ__":     b64(f"{A}/fish_yaz_s.png", "image/png"),
 "__FISH_HARIUS__":  b64(f"{A}/fish_harius_s.png", "image/png"),
 "__FISH_TAIMEN__":  b64(f"{A}/fish_taimen_s.png", "image/png"),
 "__FISH_UGOR__":    b64(f"{A}/fish_ugor_s.png", "image/png"),
 "__FISH_KARAS_ZOLOTOY__": b64(f"{A}/fish_karas_zolotoy_s.png", "image/png"),
 "__FISH_SVETLYACHOK__":   b64(f"{A}/fish_svetlyachok_s.png", "image/png"),
 "__FISH_KOROLEVSKIY__":   b64(f"{A}/fish_korolevskiy_s.png", "image/png"),
 "__FISH_COD__":       b64(f"{A}/fish_cod_s.png", "image/png"),
 "__FISH_FLOUNDER__":  b64(f"{A}/fish_flounder_s.png", "image/png"),
 "__FISH_TUNA__":      b64(f"{A}/fish_tuna_s.png", "image/png"),
 "__FISH_SHARK__":     b64(f"{A}/fish_shark_s.png", "image/png"),
 "__FISH_PIKE_PERCH__":b64(f"{A}/fish_pike_perch_s.png", "image/png"),
 "__FISH_MACKEREL__":  b64(f"{A}/fish_mackerel_s.png", "image/png"),
 "__FISH_ANGLERFISH__":b64(f"{A}/fish_anglerfish_s.png", "image/png"),
 "__FISH_SALMON__":    b64(f"{A}/fish_salmon_s.png", "image/png"),

}
for k, v in repl.items():
    game = game.replace(k, v)

html = shell.replace("/*__DATA__*/", data).replace("/*__GAME__*/", game)
missing = set(re.findall(r"__[A-Z_]+__", html)) - {"__DATA__","__GAME__"}
print("missing tokens:", missing)
open("rybalka.html","w",encoding="utf-8").write(html)
print("built rybalka.html", round(os.path.getsize("rybalka.html")/1048576,2), "MB")
