import json
import time
import string

def generar_datos_personalizados(num_turnos_trono, num_turnos_cruz, num_tramos, lleva_cruz, costaleros_7, auto_trono=False, auto_cruz=False, master_list=None):
    if master_list is None: master_list = []
    letras = list(string.ascii_uppercase)
    plazas_por_vara = 7 if costaleros_7 else 6
    varas_trono = ["Izquierda", "Centro", "Derecha"]
    
    pool = sorted(master_list, key=lambda x: x.get('altura', 0), reverse=True)
    
    trono = {}
    turnos_trono_nombres = [f"Turno {letras[i % len(letras)]}" for i in range(num_turnos_trono)]
    
    if auto_trono:
        # 1. Preparar las listas de personas para cada turno
        personas_a = pool[:36]
        while len(personas_a) < 36: personas_a.append({"nombre": "HUECO LIBRE", "altura": 0, "id": -1})
        
        plazas_b_c = 42 if costaleros_7 else 36
        personas_b = pool[36:36+plazas_b_c]
        while len(personas_b) < plazas_b_c: personas_b.append({"nombre": "HUECO LIBRE", "altura": 0, "id": -1})
        
        pool_c = pool[36+plazas_b_c:]
        personas_c = pool_c[:plazas_b_c]
        if len(personas_c) < plazas_b_c:
            faltan = plazas_b_c - len(personas_c)
            b_reales = [p for p in personas_b if p.get('altura', 0) > 0]
            b_reales.sort(key=lambda x: x.get('altura', 0)) # Cogemos los más bajitos del B
            for p in b_reales[:faltan]:
                p_copy = p.copy()
                personas_c.append(p_copy)
            while len(personas_c) < plazas_b_c:
                personas_c.append({"nombre": "HUECO LIBRE", "altura": 0, "id": -1})
                
        asignaciones = {}
        for i, t_nom in enumerate(turnos_trono_nombres):
            if i == 0: asignaciones[t_nom] = (personas_a, True) # Es Turno A
            elif i == 1: asignaciones[t_nom] = (personas_b, False)
            elif i == 2: asignaciones[t_nom] = (personas_c, False)
            else: asignaciones[t_nom] = ([], False) # Si hay más de 3, no se autocompletan
            
        for t_nom, (personas, is_a) in asignaciones.items():
            res = {
                "Delante": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(plazas_por_vara)] for v in varas_trono},
                "Detras": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(plazas_por_vara)] for v in varas_trono}
            }
            if not personas:
                trono[t_nom] = res
                continue
                
            reales = [p for p in personas if p.get('altura',0) > 0]
            huecos = [p for p in personas if p.get('altura',0) == 0]
            
            reales.sort(key=lambda x: x.get('altura',0), reverse=True)
            mitad = len(reales) // 2
            para_delante = reales[:mitad]
            para_detras = reales[mitad:]
            
            zigzag = ["Centro", "Derecha", "Izquierda"]
            
            # Definir qué posiciones se rellenan (las puntas vacías para el Turno A si son 7)
            if is_a and costaleros_7:
                slots_delante = list(range(1, 7)) # Rellena de 1 a 6 (el 0 es la punta alejada)
                slots_detras = list(range(5, -1, -1)) # Rellena del 5 al 0 (el 6 es la punta alejada)
            else:
                slots_delante = list(range(plazas_por_vara)) # Rellena de la punta al trono
                slots_detras = list(range(plazas_por_vara - 1, -1, -1)) # Rellena de la punta al trono
                
            # Repartimos en ZigZag desde las puntas hacia el trono
            for idx in slots_delante:
                for v in zigzag:
                    p_to_add = para_delante.pop(0) if para_delante else (huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "id": -1})
                    p_to_add["bloqueado"] = False
                    res["Delante"][v][idx] = p_to_add
                    
            for idx in slots_detras:
                for v in zigzag:
                    p_to_add = para_detras.pop(0) if para_detras else (huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "id": -1})
                    p_to_add["bloqueado"] = False
                    res["Detras"][v][idx] = p_to_add
                    
            # Algoritmo interno para cuadrar hombros (Misma lógica que JavaScript)
            def can_go_to(p2, target_vara):
                pref2 = str(p2.get('pref_hombro', '')).lower().strip()
                if not pref2 or "indiferente" in pref2 or "ambos" in pref2: return True
                if target_vara == "Izquierda" and "derech" in pref2: return True
                if target_vara == "Derecha" and "izquierd" in pref2: return True
                return False

            for v_nom in ["Izquierda", "Derecha"]:
                for sec in ["Delante", "Detras"]:
                    for i in range(plazas_por_vara):
                        p1 = res[sec][v_nom][i]
                        if not p1 or p1.get('altura', 0) == 0: continue
                        
                        pref1 = str(p1.get('pref_hombro', '')).lower().strip()
                        mismatched = False
                        if v_nom == "Izquierda" and "izquierd" in pref1: mismatched = True
                        if v_nom == "Derecha" and "derech" in pref1: mismatched = True
                        
                        if mismatched:
                            swapped = False
                            opp_vara = "Derecha" if v_nom == "Izquierda" else "Izquierda"
                            for sec2 in ["Delante", "Detras"]:
                                if swapped: break
                                for j in range(plazas_por_vara):
                                    p2 = res[sec2][opp_vara][j]
                                    if p2 and p2.get('altura') == p1.get('altura') and can_go_to(p2, v_nom):
                                        res[sec][v_nom][i], res[sec2][opp_vara][j] = res[sec2][opp_vara][j], res[sec][v_nom][i]
                                        swapped = True
                                        break
                            if not swapped:
                                for sec2 in ["Delante", "Detras"]:
                                    if swapped: break
                                    for j in range(plazas_por_vara):
                                        p_centro = res[sec2]["Centro"][j]
                                        if p_centro and p_centro.get('altura') == p1.get('altura') and can_go_to(p_centro, v_nom):
                                            pref_p1 = str(res[sec][v_nom][i].get('pref_hombro','')).lower()
                                            conflict = False
                                            for cc in res[sec2]["Centro"]:
                                                if cc == p_centro: continue
                                                cc_pref = str(cc.get('pref_hombro','')).lower()
                                                if "izquierd" in pref_p1 and "derech" in cc_pref: conflict=True
                                                if "derech" in pref_p1 and "izquierd" in cc_pref: conflict=True
                                            if not conflict:
                                                res[sec][v_nom][i], res[sec2]["Centro"][j] = res[sec2]["Centro"][j], res[sec][v_nom][i]
                                                swapped = True
                                                break
            trono[t_nom] = res
    else:
        for t_nom in turnos_trono_nombres:
            trono[t_nom] = {
                "Delante": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(plazas_por_vara)] for v in varas_trono},
                "Detras": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(plazas_por_vara)] for v in varas_trono}
            }
            
    # CRUZ (En pausa esperando tu lógica)
    varas_cruz = ["Izquierda", "Derecha"]
    cruz = {}
    if lleva_cruz:
        for i in range(num_turnos_cruz):
            nombre_turno = f"Turno {i+1}"
            if auto_cruz:
                pass # AQUÍ METEREMOS LA LÓGICA QUE ME DIGAS LUEGO
                
            cruz[nombre_turno] = {
                "Delante": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(2)] for v in varas_cruz},
                "Detras": {v: [{"nombre": "HUECO LIBRE", "altura": 0, "id": -1, "bloqueado": False} for _ in range(2)] for v in varas_cruz}
            }

    mapping = {}
    for i in range(num_tramos):
        tramo_name = f"Tramo {i+1}"
        t_trono = f"Turno {letras[i % num_turnos_trono]}" if num_turnos_trono > 0 else ""
        t_cruz = f"Turno {(i % num_turnos_cruz) + 1}" if (lleva_cruz and num_turnos_cruz > 0) else ""
        mapping[tramo_name] = {"Ruta": "", "Trono": t_trono, "Cruz": t_cruz}
        
    indicaciones = {f"Tramo {i+1}": "" for i in range(num_tramos)}

    return {
        "tipo_procesion": "personalizada",
        "lleva_cruz": lleva_cruz,
        "costaleros_7": costaleros_7,
        "Trono": trono,
        "Cruz": cruz,
        "Mapping": mapping,
        "Indicaciones": indicaciones
    }

def generar_html_personalizado(datos_gen, master_list, lleva_cruz):
    datos_json = json.dumps(datos_gen)
    master_json = json.dumps(master_list)
    marca_tiempo = str(int(time.time()))

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Procesión Personalizada — Gestor Manual</title>
    <style>
        body {{ font-family: 'Segoe UI', sans-serif; background:#0c0209; color:#f8f0f5; padding:20px; margin:0; }}
        .controles {{ position:sticky; top:0; background:#1a0514; padding:15px; z-index:100; border-bottom:2px solid #d4af37; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 6px rgba(0,0,0,.5); }}
        .tabla-relevos {{ width:100%; border-collapse:collapse; margin-bottom:30px; background:#1a0514; border-radius:8px; overflow:hidden; }}
        .tabla-relevos th {{ background:#23061b; color:#d4af37; padding:12px; border-bottom:2px solid #3d0c2e; font-size:13px; text-transform: uppercase; }}
        .tabla-relevos td {{ padding:10px; border-bottom:1px solid #3d0c2e; text-align:center; }}
        .tabla-relevos select {{ background:#0c0209; color:#e8d08c; border:1px solid #3d0c2e; padding:6px; border-radius:4px; font-weight:bold; outline:none; width: 100%; }}
        
        .titulo-bloque {{ background:#23061b; padding:15px; border-left:5px solid #d4af37; margin:40px 0 20px; }}
        .titulo-bloque h2 {{ color:#d4af37; margin:0; font-size:20px; letter-spacing:2px; }}
        
        .turno-container {{ background:#1a0514; padding:20px; margin-bottom:30px; border-radius:10px; border:1px solid #3d0c2e; }}
        .turno-container h3 {{ color:#e8d08c; margin-top:0; font-size:16px; border-bottom:1px dashed #4a1038; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center; }}
        
        .grid-trono {{ display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom: 15px; }}
        .grid-cruz  {{ display:grid; grid-template-columns:repeat(2,1fr); gap:15px; margin-bottom: 15px; }}
        .vara {{ background:#160311; padding:10px; border-radius:8px; border-top:3px solid #571342; }}
        .vara-titulo {{ text-align:center; color:#a37c95; font-size:14px; margin-bottom:10px; font-weight:bold; text-transform:uppercase; border-bottom: 1px solid #3d0c2e; padding-bottom: 5px; }}
        
        .sep-delante {{ font-size: 13px; color: #d4af37; text-align: center; margin: 15px 0 10px 0; font-weight: bold; letter-spacing: 2px; }}
        .sep-mid {{ font-size: 13px; color: #fff; text-align: center; margin: 20px 0; font-weight: bold; background: #5c164e; padding: 6px; border-radius: 4px; letter-spacing: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }}
        .sep-detras {{ font-size: 13px; color: #d4af37; text-align: center; margin: 15px 0 10px 0; font-weight: bold; letter-spacing: 2px; }}
        
        .costalero {{ background:#3d0c2e; border:1px solid #571342; margin:5px 0; padding:8px; border-radius:4px; cursor:grab; display:flex; justify-content:space-between; align-items:center; font-size:11px; transition:.3s; text-shadow:1px 1px 2px rgba(0,0,0,.8); position:relative; }}
        .costalero:active {{ cursor:grabbing; }}
        .costalero.vacio {{ border:1px dashed #571342; background:#0c0209; color:#884d72; flex-direction:column; align-items:stretch; text-shadow:none; overflow:visible; }}
        
        .costalero.estado-dosTurnos  {{ border:1px solid #ffd700; box-shadow:inset 0 0 8px rgba(255,215,0,.25); }}
        .costalero.estado-cruzYTrono {{ border:1px solid #00d2ff; box-shadow:inset 0 0 8px rgba(0,210,255,.25); }}
        .costalero.estado-critico    {{ border:2px dashed #ff0000; background:#4a0000; animation:parpadeo 1s infinite; }}
        .txt-dosTurnos  {{ color:#ffd700; font-weight:bold; }}
        .txt-cruzYTrono {{ color:#00d2ff; font-weight:bold; }}
        .txt-critico    {{ color:#fff; font-weight:bold; }}
        @keyframes parpadeo {{ 50% {{ opacity:.5; }} }}
        
        .btn-accion {{ background:none; border:none; cursor:pointer; padding:0 3px; transition:.2s; }}
        .btn-accion:hover {{ opacity:.7; transform:scale(1.1); }}
        .btn-info {{ color:#3498db; font-size:13px; }}
        .btn-del  {{ color:#ff4757; font-size:12px; }}
        
        .btn-control {{ background:#3d0c2e; color:#f8f0f5; border:1px solid #d4af37; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:12px; margin-left:5px; text-transform:uppercase; transition:.3s; }}
        .btn-control:hover {{ background:#571342; box-shadow:0 0 8px rgba(212,175,55,.4); }}
        .btn-export {{ background:#d4af37; color:#000; border-color:#b5952f; }}
        .btn-export:hover {{ background:#b5952f; color:#000; }}
        .btn-danger {{ background:#b30000; border-color:#ff4d4d; }}
        .btn-danger:hover {{ background:#ff4d4d; color:#fff; }}
        
        .btn-vacar {{ background:transparent; border:1px solid #b30000; color:#ff6b81; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; transition: 0.2s; }}
        .btn-vacar:hover {{ background:#b30000; color:#fff; }}
        
        .btn-copiar {{ background:transparent; border:1px solid #3498db; color:#3498db; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; transition: 0.2s; }}
        .btn-copiar:hover {{ background:#3498db; color:#fff; }}
        
        .btn-pegar {{ background:transparent; border:1px solid #27ae60; color:#27ae60; padding:4px 10px; border-radius:4px; cursor:not-allowed; font-size:11px; font-weight:bold; opacity: 0.4; transition: 0.2s; }}
        .btn-pegar.activo {{ opacity: 1; cursor: pointer; animation: pulseVerde 2s infinite; }}
        .btn-pegar.activo:hover {{ background:#27ae60; color:#fff; }}
        @keyframes pulseVerde {{ 0% {{ box-shadow:0 0 0 0 rgba(39,174,96,0.6); }} 70% {{ box-shadow:0 0 0 6px rgba(39,174,96,0); }} 100% {{ box-shadow:0 0 0 0 rgba(39,174,96,0); }} }}

        .btn-lock-turn {{ background:transparent; border:1px solid #e8d08c; color:#e8d08c; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; transition: 0.2s; }}
        .btn-lock-turn:hover {{ background:#e8d08c; color:#0c0209; }}

        .btn-cuadrar {{ background:transparent; border:1px solid #00d2ff; color:#00d2ff; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; transition: 0.2s; }}
        .btn-cuadrar:hover {{ background:#00d2ff; color:#0c0209; }}
        
        input.search-p {{ background:#0c0209; border:1px solid #3d0c2e; color:#d4af37; padding:5px; width:100%; font-size:10px; border-radius:3px; outline:none; box-sizing:border-box; }}
        .sugerencias {{ background:#1a0514; border:1px solid #d4af37; max-height:100px; overflow-y:auto; position:absolute; z-index:999; width:100%; top:100%; left:0; box-shadow:0 4px 6px rgba(0,0,0,.2); border-radius:3px; }}
        .sug-item {{ padding:6px; cursor:pointer; border-bottom:1px solid #3d0c2e; color:#e8d08c; font-size:11px; }}
        .sug-item:hover {{ background:#3d0c2e; color:#fff; font-weight:bold; }}
        
        .caja-indicacion {{ background:#160311; border:1px solid #3d0c2e; padding:15px; margin-bottom:15px; border-radius:8px; }}
        .caja-indicacion textarea {{ width:100%; background:#0c0209; color:#f8f0f5; border:1px solid #571342; padding:10px; border-radius:4px; outline:none; resize:vertical; min-height:60px; font-family:inherit; box-sizing:border-box; }}
        .caja-indicacion textarea:focus {{ border-color:#d4af37; }}
        
        /* SIDEBAR */
        #sidebar-toggle {{ position:fixed; right:0; top:50%; transform:translateY(-50%); background:#d4af37; color:#0c0209; border:none; cursor:pointer; padding:12px 7px; border-radius:8px 0 0 8px; z-index:200; font-size:11px; font-weight:bold; writing-mode:vertical-rl; transition:right .3s ease; box-shadow:-3px 0 8px rgba(0,0,0,.4); }}
        #sidebar-toggle.abierto {{ right:290px; }}
        #sidebar {{ position:fixed; right:0; top:0; height:100vh; width:290px; background:#1a0514; border-left:2px solid #d4af37; z-index:150; transform:translateX(100%); transition:transform .3s ease; display:flex; flex-direction:column; overflow:hidden; box-shadow:-5px 0 20px rgba(0,0,0,.6); }}
        #sidebar.abierto {{ transform:translateX(0); }}
        #sidebar-header {{ padding:15px; border-bottom:1px solid #3d0c2e; background:#23061b; }}
        #sidebar-search {{ width:100%; background:#0c0209; border:1px solid #3d0c2e; color:#d4af37; padding:8px; border-radius:4px; font-size:12px; outline:none; box-sizing:border-box; margin-top:10px; }}
        #sidebar-lista {{ flex:1; overflow-y:auto; padding:8px; }}
        .sidebar-item {{ background:#3d0c2e; border:1px solid #571342; margin:3px 0; padding:7px 10px; border-radius:4px; cursor:grab; font-size:11px; color:#f8f0f5; display:flex; justify-content:space-between; align-items:center; transition:.2s; user-select:none; }}
        .sidebar-item:hover {{ background:#571342; border-color:#d4af37; }}
        .sidebar-item.ya-asignado {{ opacity:.4; border-style:dashed; }}
        
        /* MODAL */
        .modal-overlay {{ display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.85); z-index:1000; justify-content:center; align-items:center; backdrop-filter:blur(3px); }}
        .modal-overlay.activo {{ display:flex; }}
        .modal-box {{ background:#1a0514; border:2px solid #d4af37; padding:28px; border-radius:12px; width:90%; max-width:580px; position:relative; max-height:85vh; overflow-y:auto; animation:slideIn .25s ease-out; }}
        .modal-close {{ position:absolute; top:12px; right:15px; background:none; border:none; color:#ff4757; font-size:24px; cursor:pointer; }}
        @keyframes slideIn {{ from {{ transform:translateY(-25px); opacity:0; }} to {{ transform:translateY(0); opacity:1; }} }}
        
        /* LEYENDA */
        .leyenda {{ display:flex; flex-wrap:wrap; gap:12px; background:#160311; padding:14px; border-radius:8px; margin-top:10px; font-size:12px; }}
        .ley-item {{ display:flex; align-items:center; gap:7px; }}
        .ley-dot {{ width:14px; height:14px; border-radius:3px; flex-shrink:0; }}
    </style>
</head>
<body>

    <div id="modal-ruta" class="modal-overlay" onclick="cerrarModalRuta(event)">
        <div class="modal-box" onclick="event.stopPropagation()">
            <button class="modal-close" onclick="cerrarModalRuta()">✖</button>
            <div id="modal-ruta-body"></div>
        </div>
    </div>

    <button id="sidebar-toggle" onclick="toggleSidebar()">👥 CENSO</button>
    <div id="sidebar">
        <div id="sidebar-header">
            <h3 style="color:#d4af37; margin:0; font-size:13px;">👥 Costaleros</h3>
            <input type="text" id="sidebar-search" placeholder="Nombre o altura..." oninput="renderSidebar()">
            <div id="sidebar-contador" style="font-size:10px; color:#a37c95; margin-top:5px;"></div>
        </div>
        <div id="sidebar-lista"></div>
    </div>

    <div class="controles">
        <div>
            <div style="font-size:18px; font-weight:bold; color:#d4af37;">⚙️ ENTORNO MANUAL PERSONALIZADO</div>
            <div style="font-size:11px; color:#a37c95; margin-top:3px;">Arrastra costaleros desde el panel derecho · Pulsa ℹ️ para ver la hoja de ruta.</div>
        </div>
        <div>
            <input type="file" id="file-input" accept=".json" style="display: none;" onchange="cargarJSON(event)">
            <button class="btn-control" style="background:#0a2a3d; border-color:#00d2ff; color:#00d2ff;" onclick="cuadrarTodos()">⚖️ CUADRAR TODOS</button>
            <button class="btn-control btn-danger" onclick="vaciarTodo()">🗑️ VACIAR TODO</button>
            <button class="btn-control" onclick="abrirModalHojaRuta()">📋 RUTA DE COSTALERO</button>
            <button class="btn-control" onclick="document.getElementById('file-input').click()">📂 CARGAR</button>
            <button class="btn-control btn-export" onclick="descargarDatos()">💾 GUARDAR</button>
            <button class="btn-control" style="background:#5c164e; border-color:#d4af37;" onclick="exportarPDF()">📤 EXPORTAR A PDF</button>
        </div>
    </div>

    <div style="max-width:960px; margin:30px auto;">
        <div class="titulo-bloque"><h2>📍 RELEVOS POR TRAMO</h2></div>
        <table class="tabla-relevos" id="tabla-mapping"></table>

        <div class="titulo-bloque"><h2>⛪ TRONO (EL CRISTO)</h2></div>
        <div id="app-trono"></div>

        { '<div class="titulo-bloque"><h2>✝ CRUZ INSIGNIA</h2></div><div id="app-cruz"></div>' if lleva_cruz else '' }

        <div class="titulo-bloque"><h2>📝 INDICACIONES POR TRAMO</h2></div>
        <div id="app-indicaciones"></div>

        <div class="titulo-bloque"><h2>⚖️ NORMAS DE LA CUADRILLA</h2></div>
        <div style="background:#160311; border:1px solid #3d0c2e; padding:15px; border-radius:8px; color:#e8d08c; font-size:13px; line-height:1.8;">
            1. Queda totalmente prohibido el uso de móviles durante la procesión.<br>
            2. Indumentaria estricta: traje oscuro y calzado negro sin logotipos visibles.<br>
            3. Puntualidad extrema en los puntos de relevo.<br>
            4. Seguir en todo momento las instrucciones de los Celadores y Capataces.
        </div>

        <div class="titulo-bloque"><h2>🎨 LEYENDA</h2></div>
        <div class="leyenda">
            <div class="ley-item"><div class="ley-dot" style="background:#3d0c2e; border:1px solid #571342;"></div><span>Normal</span></div>
            <div class="ley-item"><div class="ley-dot" style="background:#3d0c2e; border:1px solid #ffd700; box-shadow:inset 0 0 6px rgba(255,215,0,.3);"></div><span style="color:#ffd700;">Repiten B y C</span></div>
            <div class="ley-item"><div class="ley-dot" style="background:#3d0c2e; border:1px solid #00d2ff; box-shadow:inset 0 0 6px rgba(0,210,255,.3);"></div><span style="color:#00d2ff;">Repiten En Cruz</span></div>
            <div class="ley-item"><div class="ley-dot" style="background:#4a0000; border:2px dashed #ff0000;"></div><span style="color:#ff0000;">⚠️ CRÍTICO: 2 posiciones o Cruz/Trono en mismo tramo</span></div>
        </div>
    </div>

<script>
    const TS          = "{marca_tiempo}";
    const DATOS_INIC  = {datos_json};
    const MASTER_LIST = {master_json};
    const LLEVA_CRUZ  = {str(lleva_cruz).lower()};
    let datos = {{}};
    let portapapeles = null; 

    // --- CONFIGURACIÓN CUADRADOR AUTOMÁTICO ---
    const TOLERANCIA_ALTURA = 0; // Margen de cm permitidos para intercambiar costaleros. (0 = altura exacta)

    /* ── HELPER DE ESTADÍSTICAS ── */
    function getStats(arr) {{
        let valid = arr.filter(p => p.id !== -1 && p.altura > 0);
        if (valid.length === 0) return '';
        let sum = valid.reduce((acc, p) => acc + p.altura, 0);
        let avg = Math.round(sum / valid.length);
        let min = Math.min(...valid.map(p => p.altura));
        let max = Math.max(...valid.map(p => p.altura));
        let rango = min === max ? min : `${{min}}-${{max}}`;
        return `<span style="font-size:10px; color:#888; font-weight:normal; margin-left:4px; letter-spacing:0;">[∅ ${{avg}}cm | ↕ ${{rango}}]</span>`;
    }}

    /* ── INIT ── */
    function init() {{
        let savedTs   = localStorage.getItem('pers_ts_v14');
        let savedData = localStorage.getItem('pers_datos_v14');
        
        if (savedData && savedTs === TS) {{
            try {{
                let parsed = JSON.parse(savedData);
                if (parsed.Trono) {{
                    datos = parsed;
                }} else {{
                    throw new Error("Estructura corrupta o antigua");
                }}
            }} catch(e) {{
                datos = JSON.parse(JSON.stringify(DATOS_INIC));
                localStorage.setItem('pers_ts_v14', TS);
                localStorage.setItem('pers_datos_v14', JSON.stringify(datos));
            }}
        }} else {{
            datos = JSON.parse(JSON.stringify(DATOS_INIC));
            localStorage.setItem('pers_ts_v14', TS);
            localStorage.setItem('pers_datos_v14', JSON.stringify(datos));
        }}
        render();
    }}

    function guardarMemoria() {{
        localStorage.setItem('pers_datos_v14', JSON.stringify(datos));
    }}

    /* ── CARGAR JSON ── */
    /* ── LÓGICA DE CARGA JSON (CON COMPROBACIÓN DE CENSO) ── */
            /* ── LÓGICA DE CARGA JSON (CON COMPROBACIÓN DE CENSO) ── */
            window.cargarJSON = function(event) {{
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {{
                    try {{
                        const loadedData = JSON.parse(e.target.result);
                        if (loadedData.tipo_procesion && loadedData.tipo_procesion !== "personalizada") {{
                            alert("❌ ERROR: Este archivo pertenece a otra procesión. No puedes cargarlo aquí.");
                            event.target.value = '';
                            return;
                        }}

                        // --- REVISIÓN DE CENSO USANDO 'MASTER_LIST' ---
                        let msgBorrados = [];
                        let msgModificados = [];

                        for (let tipo of ["Trono", "Cruz"]) {{
                            if (!loadedData[tipo]) continue;
                            for (let t in loadedData[tipo]) {{
                                for (let sec in loadedData[tipo][t]) {{
                                    for (let v in loadedData[tipo][t][sec]) {{
                                        for (let i = 0; i < loadedData[tipo][t][sec][v].length; i++) {{
                                            let p = loadedData[tipo][t][sec][v][i];
                                            
                                            if (p.id && p.id !== -1) {{
                                                // AQUÍ ESTABA EL ERROR: Usamos MASTER_LIST que es el censo real
                                                let personaCenso = MASTER_LIST.find(c => c.id === p.id);
                                                
                                                if (!personaCenso) {{
                                                    // Ya no existe en el censo
                                                    msgBorrados.push(`- ${{p.nombre}} (ID: ${{p.id}})`);
                                                    loadedData[tipo][t][sec][v][i] = {{ "nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1, "bloqueado": false }};
                                                }} else {{
                                                    // Comprobar si hay cambios
                                                    let cambios = [];
                                                    if (p.altura !== personaCenso.altura) cambios.push(`Altura: ${{p.altura}} ➔ ${{personaCenso.altura}}`);
                                                    if (p.nombre !== personaCenso.nombre) cambios.push(`Nombre: ${{p.nombre}} ➔ ${{personaCenso.nombre}}`);
                                                    
                                                    let oldPref = (p.pref_hombro || "Indiferente").toLowerCase();
                                                    let newPref = (personaCenso.pref_hombro || "Indiferente").toLowerCase();
                                                    if (oldPref !== newPref) cambios.push(`Hombro: ${{oldPref}} ➔ ${{newPref}}`);

                                                    let oldDias = (p.miercoles_santo ? "M" : "") + (p.viernes_santo ? "V" : "");
                                                    let newDias = (personaCenso.miercoles_santo ? "M" : "") + (personaCenso.viernes_santo ? "V" : "");
                                                    if (oldDias !== newDias) cambios.push(`Días: ${{oldDias||'Ninguno'}} ➔ ${{newDias||'Ninguno'}}`);

                                                    if (cambios.length > 0) {{
                                                        msgModificados.push(`- ${{personaCenso.nombre}}: ${{cambios.join(", ")}}`);
                                                        // Actualizamos los datos en la memoria del archivo cargado
                                                        p.altura = personaCenso.altura;
                                                        p.nombre = personaCenso.nombre;
                                                        p.pref_hombro = personaCenso.pref_hombro;
                                                        p.miercoles_santo = personaCenso.miercoles_santo;
                                                        p.viernes_santo = personaCenso.viernes_santo;
                                                    }}
                                                }}
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}

                        let alertaFinal = "";
                        if (msgBorrados.length > 0) {{
                            alertaFinal += "⚠️ COSTALEROS BORRADOS DEL CENSO (Se han vaciado sus huecos):\\n" + msgBorrados.join("\\n") + "\\n\\n";
                        }}
                        if (msgModificados.length > 0) {{
                            alertaFinal += "🔄 DATOS ACTUALIZADOS SEGÚN EL CENSO:\\n" + msgModificados.join("\\n") + "\\n\\n";
                        }}

                        if (alertaFinal !== "") {{
                            alert(alertaFinal);
                        }} else {{
                            alert("✅ Archivo cargado correctamente. Todo el personal está al día con el censo.");
                        }}
                        // --- FIN DEL NUEVO CÓDIGO ---

                        datos = loadedData;
                        datos.tipo_procesion = "personalizada";
                        
                        // Si no tiene mapping (archivo antiguo), usamos el por defecto inicial
                        if (!datos.Mapping) datos.Mapping = DATOS_INIC.Mapping || {{}};
                        if (!datos.Indicaciones) datos.Indicaciones = DATOS_INIC.Indicaciones || {{}};
                        
                        guardarMemoria();
                        render();
                        if (typeof sidebarAbierto !== 'undefined' && sidebarAbierto) renderSidebar();
                        
                    }} catch (error) {{
                        alert("❌ Error al leer el archivo JSON.\\n" + error);
                    }}
                    event.target.value = '';
                }};
                reader.readAsText(file);
            }};

    /* ── COPIAR Y PEGAR TURNO ── */
    window.copiarTurno = function(tipo, turno) {{
        portapapeles = {{
            tipo: tipo,
            datos: JSON.parse(JSON.stringify(datos[tipo][turno]))
        }};
        
        let toast = document.createElement('div');
        toast.textContent = `📋 ${{turno}} de ${{tipo}} copiado al portapapeles`;
        toast.style.cssText = "position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#27ae60; color:#fff; padding:12px 24px; border-radius:30px; font-weight:bold; box-shadow:0 4px 10px rgba(0,0,0,0.5); z-index:9999;";
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 3000);
        
        render(); 
    }};

    window.pegarTurno = function(tipo, turno) {{
        if (!portapapeles || portapapeles.tipo !== tipo) return;
        
        if (confirm(`⚠️ Vas a SOBREESCRIBIR por completo el ${{turno}} de ${{tipo}} con los datos copiados.\n\n(Se respetarán y copiarán los candados exactamente igual que en el original).\n\n¿Estás seguro?`)) {{
            datos[tipo][turno] = JSON.parse(JSON.stringify(portapapeles.datos));
            guardarMemoria();
            render();
            if (sidebarAbierto) renderSidebar();
        }}
    }};

    /* ── BLOQUEO MASIVO INTELIGENTE ── */
    window.toggleLockTurno = function(tipo, turno) {{
        let blq = datos[tipo][turno];
        
        let todosBloqueados = true;
        for (let s in blq) {{
            for (let v in blq[s]) {{
                blq[s][v].forEach(p => {{
                    if (!p.bloqueado) todosBloqueados = false;
                }});
            }}
        }}
        
        let nuevoEstado = !todosBloqueados;
        
        for (let s in blq) {{
            for (let v in blq[s]) {{
                blq[s][v].forEach(p => {{
                    p.bloqueado = nuevoEstado;
                }});
            }}
        }}
        
        guardarMemoria();
        render();
    }};

    /* ── AUTOSOLVER: CUADRAR HOMBROS ── */
    function esError(p, vara) {{
        if (p.id === -1 || p.altura === 0) return false;
        let pref = (p.pref_hombro || '').toLowerCase();
        if (vara === 'Izquierda' && pref.includes('izquierd')) return true;
        if (vara === 'Derecha' && pref.includes('derech')) return true;
        return false;
    }}

    function conflictoCentro(p_new, varaCentroArray, idx_removed) {{
        let prefNew = (p_new.pref_hombro || '').toLowerCase();
        let isI = prefNew.includes('izquierd');
        let isD = prefNew.includes('derech');
        
        if (!isI && !isD) return false; 
        
        for (let i = 0; i < varaCentroArray.length; i++) {{
            if (i === idx_removed) continue;
            let p = varaCentroArray[i];
            if (p.id === -1 || p.altura === 0) continue;
            
            let pPref = (p.pref_hombro || '').toLowerCase();
            if (isI && pPref.includes('derech')) return true;
            if (isD && pPref.includes('izquierd')) return true;
        }}
        return false;
    }}

    function cuadrarHombrosTurno(tipo, turno) {{
        let modificado = false;
        let bloque = datos[tipo][turno];

        for (let sec of ['Delante', 'Detras']) {{
            let varas = bloque[sec];
            
            for (let vOrigen of ['Izquierda', 'Derecha']) {{
                let vDestino = vOrigen === 'Izquierda' ? 'Derecha' : 'Izquierda';
                
                for (let i = 0; i < varas[vOrigen].length; i++) {{
                    let p1 = varas[vOrigen][i];
                    if (p1.id === -1 || p1.bloqueado) continue; 
                    
                    if (esError(p1, vOrigen)) {{
                        let swapeado = false;
                        
                        for (let j = 0; j < varas[vDestino].length; j++) {{
                            let p2 = varas[vDestino][j];
                            if (p2.id === -1 || p2.bloqueado) continue;
                            
                            if (Math.abs(p1.altura - p2.altura) <= TOLERANCIA_ALTURA) {{
                                if (!esError(p2, vOrigen) && !esError(p1, vDestino)) {{
                                    varas[vOrigen][i] = p2;
                                    varas[vDestino][j] = p1;
                                    p1 = p2; 
                                    swapeado = true;
                                    modificado = true;
                                    break;
                                }}
                            }}
                        }}
                        
                        if (!swapeado && tipo === 'Trono' && varas['Centro']) {{
                            for (let j = 0; j < varas['Centro'].length; j++) {{
                                let p2 = varas['Centro'][j];
                                if (p2.id === -1 || p2.bloqueado) continue;
                                
                                if (Math.abs(p1.altura - p2.altura) <= TOLERANCIA_ALTURA) {{
                                    if (!esError(p2, vOrigen) && !conflictoCentro(p1, varas['Centro'], j)) {{
                                        varas[vOrigen][i] = p2;
                                        varas['Centro'][j] = p1;
                                        p1 = p2;
                                        swapeado = true;
                                        modificado = true;
                                        break;
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}
            }}
        }}
        return modificado;
    }}

    window.cuadrarTurno = function(tipo, turno) {{
        if (cuadrarHombrosTurno(tipo, turno)) {{
            guardarMemoria();
            render();
            alert(`✅ Hombros cuadrados en el ${{turno}} de ${{tipo}}.`);
        }} else {{
            alert(`ℹ️ No se encontró ningún intercambio válido para el ${{turno}} de ${{tipo}}.`);
        }}
    }};

    window.cuadrarTodos = function() {{
        let modificado = false;
        
        for (let t in datos.Trono) {{
            if (cuadrarHombrosTurno('Trono', t)) modificado = true;
        }}
        
        if (LLEVA_CRUZ && datos.Cruz) {{
            for (let t in datos.Cruz) {{
                if (cuadrarHombrosTurno('Cruz', t)) modificado = true;
            }}
        }}
        
        if (modificado) {{
            guardarMemoria();
            render();
            alert("✅ Se han cuadrado los hombros automáticamente en todos los turnos posibles.");
        }} else {{
            alert("ℹ️ Ya estaba todo cuadrado, o no se ha encontrado ningún intercambio posible por altura o bloqueo.");
        }}
    }};

    /* ── ESTADO GLOBAL (CRITICO, DOBLE...) ── */
    let estadoGlobal = {{}};

    function computarEstados() {{
        const est = {{}};
        function tramoNum(n) {{ return parseInt(n.replace('Tramo ', '')); }}

        let scanearBloque = (bloque, isCruz) => {{
            for (let turno in bloque) {{
                for (let sec of ['Delante', 'Detras']) {{
                    for (let vara in bloque[turno][sec]) {{
                        bloque[turno][sec][vara].forEach(p => {{
                            if (p.id !== -1) {{
                                if (!est[p.id]) est[p.id] = {{ nombre: p.nombre, tronoT: new Set(), cruzT: new Set(), tronoC: {{}}, cruzC: {{}}, tramos: [] }};
                                if (isCruz) {{
                                    est[p.id].cruzT.add(turno);
                                    est[p.id].cruzC[turno] = (est[p.id].cruzC[turno] || 0) + 1;
                                }} else {{
                                    est[p.id].tronoT.add(turno);
                                    est[p.id].tronoC[turno] = (est[p.id].tronoC[turno] || 0) + 1;
                                }}
                            }}
                        }});
                    }}
                }}
            }}
        }};

        scanearBloque(datos.Trono, false);
        if (LLEVA_CRUZ) scanearBloque(datos.Cruz, true);

        for (let pid in est) {{
            let e = est[pid];
            
            e.duplicado = false;
            for (let c in e.tronoC) if (e.tronoC[c] > 1) e.duplicado = true;
            for (let c in e.cruzC)  if (e.cruzC[c] > 1)  e.duplicado = true;

            let misTramos = new Set();
            e.choqueTramo = false; 
            
            for (let tramo in datos.Mapping) {{
                let num = tramoNum(tramo);
                let enT = e.tronoT.has(datos.Mapping[tramo].Trono);
                let enC = LLEVA_CRUZ && e.cruzT.has(datos.Mapping[tramo].Cruz);
                
                if (enT) misTramos.add(num);
                if (enC) misTramos.add(num);
                if (enT && enC) e.choqueTramo = true; 
            }}
            e.tramos = Array.from(misTramos).sort((a,b) => a - b);
            
            e.tronoArr = Array.from(e.tronoT);
            e.cruzArr = Array.from(e.cruzT);
        }}

        for (let pid in est) {{
            let e = est[pid];

            if (e.duplicado || e.choqueTramo)        e.estadoStr = 'critico';
            else if (e.tronoT.size > 0 && e.cruzT.size > 0) e.estadoStr = 'cruzYTrono';
            else if (e.tronoT.size > 1 || e.cruzT.size > 1) e.estadoStr = 'dosTurnos';
            else                                     e.estadoStr = 'normal';
        }}
        return est;
    }}

    /* ── CELDA HTML ── */
    function celdaHTML(p, tipo, turno, sec, vara, idx) {{
        const esVacio = (p.altura === 0 || p.id === -1);
        let prefLetra = '', claseEst = '', claseTxt = '', tickHombro = '';
        let isLocked = p.bloqueado || false;

        if (!esVacio) {{
            let pref = (p.pref_hombro || '').toLowerCase();
            if (pref.includes('derech')) {{
                prefLetra = ' <span style="color:#888;font-size:9px;">(D)</span>';
                if (vara === 'Izquierda') tickHombro = ' <span title="Hombro correcto">✅</span>';
                else if (vara === 'Derecha') tickHombro = ' <span title="Hombro incorrecto">❌</span>';
            }} else if (pref.includes('izquierd')) {{
                prefLetra = ' <span style="color:#888;font-size:9px;">(I)</span>';
                if (vara === 'Derecha') tickHombro = ' <span title="Hombro correcto">✅</span>';
                else if (vara === 'Izquierda') tickHombro = ' <span title="Hombro incorrecto">❌</span>';
            }}

            let est = estadoGlobal[p.id];
            if (est) {{
                const map = {{ critico:['estado-critico','txt-critico'], cruzYTrono:['estado-cruzYTrono','txt-cruzYTrono'], dosTurnos:['estado-dosTurnos','txt-dosTurnos'] }};
                if (map[est.estadoStr]) {{ claseEst = map[est.estadoStr][0]; claseTxt = map[est.estadoStr][1]; }}
            }}
        }}

        const idSug = `sug-${{tipo}}-${{turno.replace(/ /g,'')}}-${{sec}}-${{vara}}-${{idx}}`;
        let dragAttr = isLocked ? 'false' : (!esVacio).toString();
        let lockBtn = `<button class="btn-accion" onclick="toggleLock('${{tipo}}','${{turno}}','${{sec}}','${{vara}}',${{idx}})" title="Bloquear / Desbloquear hueco">${{isLocked ? '🔒' : '🔓'}}</button>`;

        return `<div class="costalero ${{esVacio ? 'vacio' : claseEst}}" ${{isLocked ? 'style="border-color:#d4af37; background:#1a0514;"' : ''}}
                     draggable="${{dragAttr}}"
                     ondragstart="drag(event,'${{tipo}}','${{turno}}','${{sec}}','${{vara}}',${{idx}})"
                     ondragover="allow(event)"
                     ondrop="drop(event,'${{tipo}}','${{turno}}','${{sec}}','${{vara}}',${{idx}})">
            ${{esVacio ?
                `<div style="display:flex; width:100%; gap:5px;">
                    <input type="text" class="search-p" placeholder="Arrastrar o buscar..." onkeyup="buscarMini(event,'${{tipo}}','${{turno}}','${{sec}}','${{vara}}',${{idx}})" ${{isLocked ? 'disabled' : ''}}>
                    ${{lockBtn}}
                 </div>
                 <div id="${{idSug}}" class="sugerencias" style="display:none"></div>` :
                `<span>
                    <button class="btn-accion btn-del"  onclick="eliminar('${{tipo}}','${{turno}}','${{sec}}','${{vara}}',${{idx}})" title="Quitar">🗑️</button>
                    <button class="btn-accion btn-info" onclick="verHoja(${{p.id}})" title="Hoja de ruta">ℹ️</button>
                    ${{lockBtn}}
                    <span class="${{claseTxt}}">${{p.nombre}}${{prefLetra}}${{tickHombro}}</span>
                 </span>
                 <span style="color:#d4af37;font-weight:bold;">${{p.altura}}cm</span>`
            }}
        </div>`;
    }}

    /* ── RENDER PRINCIPAL ── */
    window.cambiarMap = function(tramo, tipo, val) {{ datos.Mapping[tramo][tipo] = val; guardarMemoria(); render(); }}
    window.cambiarRuta = function(tramo, val) {{ datos.Mapping[tramo].Ruta = val; guardarMemoria(); }}

    function render() {{
        estadoGlobal = computarEstados();

        const tablaMap = document.getElementById('tabla-mapping');
        const optT = Object.keys(datos.Trono || {{}}).map(k => `<option value="${{k}}">${{k}}</option>`).join('');
        const optC = (LLEVA_CRUZ && datos.Cruz) ? Object.keys(datos.Cruz).map(k => `<option value="${{k}}">${{k}}</option>`).join('') : '';

        let hMap = `<tr><th style="width:90px;">TRAMO</th><th>📍 RECORRIDO (Opcional)</th><th>⛪ Turno Trono</th>${{LLEVA_CRUZ ? '<th>✝ Turno Cruz</th>' : ''}}</tr>`;
        for (let tr in datos.Mapping) {{
            let sT = datos.Mapping[tr].Trono;
            let sC = datos.Mapping[tr].Cruz;
            let sR = datos.Mapping[tr].Ruta || '';
            
            let inpR = `<input type="text" value="${{sR}}" placeholder="Ej: De San Francisco a Catedral..." oninput="cambiarRuta('${{tr}}', this.value)" style="width:95%; background:#0c0209; border:1px solid #3d0c2e; color:#e8d08c; padding:6px; border-radius:4px; font-size:12px; outline:none;">`;
            let selT = `<select onchange="cambiarMap('${{tr}}','Trono',this.value)">${{optT.replace(`value="${{sT}}"`,`value="${{sT}}" selected`)}}</select>`;
            let selC = LLEVA_CRUZ ? `<td><select onchange="cambiarMap('${{tr}}','Cruz',this.value)">${{optC.replace(`value="${{sC}}"`,`value="${{sC}}" selected`)}}</select></td>` : '';
            
            hMap += `<tr><td><b>${{tr}}</b></td><td>${{inpR}}</td><td>${{selT}}</td>${{selC}}</tr>`;
        }}
        tablaMap.innerHTML = hMap;

        let btnsControl = (tipo, turno) => {{
            let activo = (portapapeles && portapapeles.tipo === tipo) ? 'activo' : '';
            let disabled = (portapapeles && portapapeles.tipo === tipo) ? '' : 'disabled';
            
            let blq = datos[tipo][turno];
            let todosBloqueados = true;
            for (let s in blq) {{
                for (let v in blq[s]) {{
                    blq[s][v].forEach(p => {{ if (!p.bloqueado) todosBloqueados = false; }});
                }}
            }}
            let txtLock = todosBloqueados ? '🔓 Soltar Turno' : '🔒 Fijar Turno';
            
            return `
            <div style="display:flex; gap:8px;">
                <button class="btn-cuadrar" onclick="cuadrarTurno('${{tipo}}','${{turno}}')" title="Intercambiar costaleros para corregir hombros">⚖️ Cuadrar</button>
                <button class="btn-copiar" onclick="copiarTurno('${{tipo}}','${{turno}}')" title="Copiar este turno">📄 Copiar</button>
                <button class="btn-pegar ${{activo}}" onclick="pegarTurno('${{tipo}}','${{turno}}')" title="Pegar datos" ${{disabled}}>📋 Pegar</button>
                <button class="btn-lock-turn" onclick="toggleLockTurno('${{tipo}}','${{turno}}')">${{txtLock}}</button>
                <button class="btn-vacar" onclick="vaciarTurno('${{tipo}}','${{turno}}')" title="Vacía solo los huecos que NO tienen candado">🗑️ Vaciar</button>
            </div>`;
        }};

        // 2. Trono (NUEVA ESTRUCTURA HORIZONTAL)
        const appT = document.getElementById('app-trono');
        appT.innerHTML = '';
        for (let turno in datos.Trono) {{
            let sec = datos.Trono[turno];
            
            let listDelante = ['Izquierda', 'Centro', 'Derecha'].map(vara => `
                <div class="varal">
                    <div class="vara-titulo">${{vara}} ${{getStats(sec.Delante[vara])}}</div>
                    ${{sec.Delante[vara].map((p,i)=>celdaHTML(p,'Trono',turno,'Delante',vara,i)).join('')}}
                </div>
            `).join('');

            let listDetras = ['Izquierda', 'Centro', 'Derecha'].map(vara => `
                <div class="varal">
                    <div class="vara-titulo">${{vara}} ${{getStats(sec.Detras[vara])}}</div>
                    ${{sec.Detras[vara].map((p,i)=>celdaHTML(p,'Trono',turno,'Detras',vara,i)).join('')}}
                </div>
            `).join('');

            appT.innerHTML += `
            <div class="turno-container">
                <h3>${{turno}} ${{btnsControl('Trono', turno)}}</h3>
                <div class="sep-delante">▲ DELANTE ▲</div>
                <div class="grid-trono">
                    ${{listDelante}}
                </div>
                <div class="sep-mid">CRISTO</div>
                <div class="grid-trono">
                    ${{listDetras}}
                </div>
                <div class="sep-detras">▼ DETRÁS ▼</div>
            </div>`;
        }}

        // 3. Cruz (NUEVA ESTRUCTURA HORIZONTAL)
        if (LLEVA_CRUZ && datos.Cruz) {{
            const appC = document.getElementById('app-cruz');
            if (appC) {{
                appC.innerHTML = '';
                for (let turno in datos.Cruz) {{
                    let sec = datos.Cruz[turno];
                    
                    let listDelante = ['Izquierda', 'Derecha'].map(vara => `
                        <div class="varal">
                            <div class="vara-titulo">${{vara}} ${{getStats(sec.Delante[vara])}}</div>
                            ${{sec.Delante[vara].map((p,i)=>celdaHTML(p,'Cruz',turno,'Delante',vara,i)).join('')}}
                        </div>
                    `).join('');

                    let listDetras = ['Izquierda', 'Derecha'].map(vara => `
                        <div class="varal">
                            <div class="vara-titulo">${{vara}} ${{getStats(sec.Detras[vara])}}</div>
                            ${{sec.Detras[vara].map((p,i)=>celdaHTML(p,'Cruz',turno,'Detras',vara,i)).join('')}}
                        </div>
                    `).join('');

                    appC.innerHTML += `
                    <div class="turno-container">
                        <h3>${{turno}} ${{btnsControl('Cruz', turno)}}</h3>
                        <div class="sep-delante">▲ DELANTE ▲</div>
                        <div class="grid-cruz">
                            ${{listDelante}}
                        </div>
                        <div class="sep-mid">CRUZ</div>
                        <div class="grid-cruz">
                            ${{listDetras}}
                        </div>
                        <div class="sep-detras">▼ DETRÁS ▼</div>
                    </div>`;
                }}
            }}
        }}

        // 4. Indicaciones
        const appInd = document.getElementById('app-indicaciones');
        appInd.innerHTML = '';
        for (let tr in datos.Indicaciones) {{
            let tT = datos.Mapping[tr] ? datos.Mapping[tr].Trono : '';
            let tC = (LLEVA_CRUZ && datos.Mapping[tr]) ? datos.Mapping[tr].Cruz : '';
            let badge = `<span style="color:#a37c95; font-size:11px; margin-left:10px;">⛪ ${{tT}}${{tC ? ' · ✝ '+tC : ''}}</span>`;
            appInd.innerHTML += `
            <div class="caja-indicacion">
                <div style="color:#d4af37; font-weight:bold; margin-bottom:8px;">${{tr}} ${{badge}}</div>
                <textarea placeholder="Indicaciones para los celadores en este tramo..." onchange="guardarInd('${{tr}}',this.value)">${{datos.Indicaciones[tr]}}</textarea>
            </div>`;
        }}
    }}

    /* ── MODAL HOJA DE RUTA CON BUSCADOR ── */
    window.cerrarModalRuta = function(event) {{
        if (!event || event.target === document.getElementById('modal-ruta'))
            document.getElementById('modal-ruta').classList.remove('activo');
    }}

    window.abrirModalHojaRuta = function() {{
        document.getElementById('modal-ruta-body').innerHTML = `
            <h3 style="color:#d4af37; margin:0 0 12px;">📋 Hoja de Ruta Individual</h3>
            <input type="text" id="buscador-hoja" placeholder="🔍 Escribe el nombre del costalero..." onkeyup="buscarHojaRuta(this.value)" style="width:100%; padding:10px; border-radius:4px; border:1px solid #3d0c2e; background:#0c0209; color:#d4af37; outline:none; margin-bottom:15px; font-size:14px; box-sizing:border-box;">
            <div id="res-hoja-ruta" style="max-height: 400px; overflow-y: auto;">
                <p style="color:#a37c95; font-size:13px; line-height:1.6;">
                    Busca a un costalero para ver su itinerario completo, o pulsa el icono <b style="color:#3498db;">ℹ️</b> al lado de su nombre directamente en el cuadrante.
                </p>
            </div>`;
        document.getElementById('modal-ruta').classList.add('activo');
        setTimeout(() => document.getElementById('buscador-hoja').focus(), 100);
    }}

    window.buscarHojaRuta = function(val) {{
        val = normalizar(val);
        const resDiv = document.getElementById('res-hoja-ruta');
        if (val.length < 2) {{ resDiv.innerHTML = ''; return; }}
        
        const matches = MASTER_LIST.filter(p => normalizar(p.nombre).includes(val));
        if (matches.length === 0) {{
            resDiv.innerHTML = '<p style="color:#ff4757; font-size:12px;">No se encontraron costaleros.</p>';
            return;
        }}
        
        let html = '';
        matches.forEach(m => {{
            html += `<div style="background:#23061b; padding:10px; margin-bottom:5px; border-radius:4px; cursor:pointer; border-left:3px solid #d4af37; display:flex; justify-content:space-between;" onclick="verHoja(${{m.id}})">
                <b style="color:#e8d08c;">${{m.nombre}}</b> <span style="color:#a37c95; font-size:11px;">${{m.altura}} cm</span>
            </div>`;
        }});
        resDiv.innerHTML = html;
    }}

    window.verHoja = function(pid) {{
        let e = estadoGlobal[pid];
        let p = MASTER_LIST.find(x => x.id === pid) || {{}};
        let nombre = e ? e.nombre : (p.nombre || 'Desconocido');

        let turnosList = [];
        if (e) {{
           e.tronoArr.forEach(t => turnosList.push(`⛪ ${{t}} (Trono)`));
           e.cruzArr.forEach(t => turnosList.push(`✝ ${{t}} (Cruz)`));
        }}
        let turnosStr = turnosList.length > 0 ? turnosList.join(' &nbsp;|&nbsp; ') : '<span style="color:#ff4757;">Ninguno asignado</span>';

        let tramosInfo = [];
        for (let tr in datos.Mapping) {{
            let map = datos.Mapping[tr];
            let enTrono = e && e.tronoArr.includes(map.Trono);
            let enCruz  = e && LLEVA_CRUZ && e.cruzArr.includes(map.Cruz);
            
            let trLabel = `<b>${{tr}}</b>${{map.Ruta ? `<br><span style="font-size:10px;color:#a37c95;font-weight:normal;">${{map.Ruta}}</span>` : ''}}`;

            if (enTrono || enCruz) {{
                let roles = [];
                if (enTrono) roles.push('⛪ Trono');
                if (enCruz)  roles.push('✝ Cruz');
                tramosInfo.push(`<li style="padding:10px; background:#23061b; margin-bottom:6px; border-radius:4px; border-left:4px solid #d4af37; color:#e8d08c; display:flex; justify-content:space-between; align-items:center;">
                    <span>${{trLabel}}</span><span style="color:#d4af37; font-weight:bold; font-size:13px; text-align:right;">${{roles.join(' + ')}}</span></li>`);
            }} else {{
                tramosInfo.push(`<li style="padding:10px; background:#160311; margin-bottom:6px; border-radius:4px; border-left:4px solid #571342; color:#888; display:flex; justify-content:space-between; align-items:center;">
                    <span>${{trLabel}}</span><span style="font-size:13px;">🕯️ Cirio (Descanso)</span></li>`);
            }}
        }}
        let tramosHTML = `<ul style="list-style:none; padding:0; margin:0;">${{tramosInfo.join('')}}</ul>`;

        const badges = {{
            critico:    `<span style="background:#4a0000;border:2px dashed #ff0000;color:#fff;padding:4px 12px;border-radius:4px;animation:parpadeo 1s infinite;display:inline-block; font-size:11px; font-weight:bold;">⚠️ CRÍTICO — Conflicto de turnos</span>`,
            cruzYTrono: `<span style="background:#0a2a3d;border:1px solid #00d2ff;color:#00d2ff;padding:4px 12px;border-radius:4px; font-size:11px; font-weight:bold;">🔵 Repite En Cruz</span>`,
            dosTurnos:  `<span style="background:#2a2000;border:1px solid #ffd700;color:#ffd700;padding:4px 12px;border-radius:4px; font-size:11px; font-weight:bold;">🟡 Repite En Turnos B y C</span>`,
            normal:     `<span style="color:#a37c95;font-size:12px;">✅ Carga óptima (Sin alertas)</span>`,
        }};
        let badge = e ? (badges[e.estadoStr] || '') : '';

        document.getElementById('modal-ruta-body').innerHTML = `
            <button onclick="abrirModalHojaRuta()" style="background:none; border:none; color:#d4af37; cursor:pointer; font-size:13px; margin-bottom:15px; padding:0;">← Volver al buscador</button>
            <div style="font-size:22px; font-weight:bold; color:#f8f0f5; margin-bottom:8px;">${{nombre}}</div>
            <div style="margin-bottom:18px;">${{badge}}</div>
            <div style="background:#160311; padding:12px; border-radius:6px; border-left:4px solid #d4af37; margin-bottom:18px;">
                <div style="color:#a37c95; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Asignado a</div>
                <div style="color:#e8d08c; font-weight:bold; font-size:13px;">${{turnosStr}}</div>
            </div>
            <div style="color:#a37c95; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">📍 Itinerario Completo</div>
            ${{tramosHTML}}`;
            
        document.getElementById('modal-ruta').classList.add('activo');
    }}

    /* ── ACCIONES ── */
    window.guardarInd = function(tramo, val) {{ datos.Indicaciones[tramo] = val; guardarMemoria(); }}
    window.toggleLock = function(tipo, turno, sec, vara, idx) {{ 
        datos[tipo][turno][sec][vara][idx].bloqueado = !datos[tipo][turno][sec][vara][idx].bloqueado; 
        guardarMemoria(); render(); 
    }}

    window.vaciarTodo = function() {{
        if (!confirm(`⚠️ ¿Vaciar TODO el cuadrante? \n\n(Se respetarán todos los huecos bloqueados 🔒)`)) return;
        let limpia = (blq) => {{
            for (let t in blq) for (let s in blq[t]) for (let v in blq[t][s])
                blq[t][s][v] = blq[t][s][v].map(p => p.bloqueado ? p : ({{ nombre:'HUECO LIBRE', altura:0, id:-1, bloqueado:false }}));
        }};
        limpia(datos.Trono);
        if (LLEVA_CRUZ && datos.Cruz) limpia(datos.Cruz);
        render(); guardarMemoria(); if (sidebarAbierto) renderSidebar();
    }}

    window.vaciarTurno = function(tipo, turno) {{
        if (!confirm(`⚠️ ¿Vaciar el ${{turno}} de ${{tipo}}?\n\n(Se respetarán todos los huecos bloqueados 🔒)`)) return;
        let blq = datos[tipo][turno];
        for (let s in blq) for (let v in blq[s])
            blq[s][v] = blq[s][v].map(p => p.bloqueado ? p : ({{ nombre:'HUECO LIBRE', altura:0, id:-1, bloqueado:false }}));
        render(); guardarMemoria(); if (sidebarAbierto) renderSidebar();
    }}

    window.descargarDatos = function() {{
        const dl = document.createElement('a');
        dl.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(datos, null, 2)));
        dl.setAttribute('download', 'Cuadrante_Personalizado.json');
        document.body.appendChild(dl); dl.click(); dl.remove();
    }}

    window.eliminar = function(tipo, turno, sec, v, idx) {{
        if (datos[tipo][turno][sec][v][idx].bloqueado) {{
            alert("🔒 Desbloquea la posición primero para poder eliminarla.");
            return;
        }}
        datos[tipo][turno][sec][v][idx] = {{ nombre:'HUECO LIBRE', altura:0, id:-1, bloqueado:false }};
        render(); guardarMemoria(); if (sidebarAbierto) renderSidebar();
    }}

    /* ── EXPORTAR A PDF (INFORME OFICIAL NUEVA ESTRUCTURA HORIZONTAL) ── */
    window.exportarPDF = function() {{
        window.exportDataForPDF = {{ estadoGlobal: estadoGlobal, datos: datos, lleva_cruz: LLEVA_CRUZ, master: MASTER_LIST }};
        
        let anio = new Date().getFullYear();
        let fecha_hoy = new Date().toLocaleDateString('es-ES');
        
        let html_pdf = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Oficial - Personalizada ${{anio}}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Open+Sans:wght@400;600;800&display=swap');
        body {{ font-family: 'Open Sans', Arial, sans-serif; background: #f4f6f8; color: #333; margin: 0; padding: 20px; }}
        .container {{ max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-top: 8px solid #5c164e; position: relative; }}
        .web-controls {{ display: flex; flex-direction: column; align-items: center; gap: 15px; margin-bottom: 30px; background: #1a0514; padding: 20px; border-radius: 8px; border: 1px solid #d4af37; }}
        .buscador-box {{ width: 100%; max-width: 600px; text-align: center; }}
        .buscador-box input {{ width: 100%; padding: 12px; font-size: 16px; background: #0c0209; color: #d4af37; border: 1px solid #3d0c2e; border-radius: 5px; outline: none; }}
        .itinerario-result {{ margin-top: 15px; padding: 15px; background: #23061b; border-radius: 5px; border-left: 5px solid #d4af37; display: none; color: #f8f0f5; text-align: left; }}
        .itinerario-result ul {{ list-style: none; padding: 0; margin: 0; }}
        .itinerario-result li {{ padding: 8px 0; border-bottom: 1px dashed #3d0c2e; font-size: 13px; display: flex; justify-content:space-between; }}
        .tramo-label {{ width: 220px; color: #a37c95; flex-shrink: 0; }}
        .btn-pdf {{ background: #5c164e; color: #fff; text-align: center; padding: 12px 25px; border-radius: 5px; font-weight: bold; cursor: pointer; border: none; font-size: 14px; text-transform: uppercase; box-shadow: 0 4px 6px rgba(92, 22, 78, 0.3); transition: 0.3s; width: 100%; max-width: 350px; }}
        .btn-pdf:hover {{ background: #7a1b67; transform: translateY(-2px); }}
        .header {{ text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 20px; }}
        .logo-img {{ width: 100px; height: auto; margin-bottom: 10px; }}
        .header h1 {{ color: #4a148c; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Cinzel', serif; font-weight: 600; }}
        .header h2 {{ color: #b5952f; margin: 5px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; }}
        .sello-anio {{ position: absolute; top: 30px; right: 40px; background: #5c164e; color: #fff; padding: 8px 15px; font-size: 16px; font-weight: bold; border-radius: 5px; letter-spacing: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }}
        .leyenda {{ display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; font-size: 11px; font-weight: bold; background: #fafafa; padding: 10px; border-radius: 5px; border: 1px solid #eee; flex-wrap: wrap; }}
        .leyenda-item {{ display: flex; align-items: center; gap: 5px; }}
        .caja {{ width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px solid rgba(0,0,0,0.2); }}
        .turno-box {{ border: 1px solid #d4af37; border-radius: 8px; margin-bottom: 30px; overflow: hidden; page-break-inside: avoid; }}
        .turno-title {{ background: #5c164e; color: #fff; padding: 10px 15px; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; text-align: center; }}
        .grid-varales {{ display: flex; width: 100%; }}
        .varal {{ flex: 1; padding: 10px; border-right: 1px solid #eee; }}
        .varal:last-child {{ border-right: none; }}
        .varal-title {{ text-align: center; color: #5c164e; border-bottom: 2px solid #d4af37; padding-bottom: 5px; margin-top: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; }}
        .seccion-top {{ font-size: 12px; color: #5c164e; text-align: center; margin: 10px 0; font-weight: bold; background: #eee; padding: 6px; border-radius: 3px; letter-spacing: 2px; }}
        .seccion-mid {{ font-size: 12px; color: #fff; text-align: center; margin: 15px 0; font-weight: bold; background: #5c164e; padding: 6px; border-radius: 3px; letter-spacing: 4px; }}
        .seccion-bot {{ font-size: 12px; color: #5c164e; text-align: center; margin: 10px 0; font-weight: bold; background: #eee; padding: 6px; border-radius: 3px; letter-spacing: 2px; }}
        .lista-costaleros {{ list-style: none; padding: 0; margin: 0; font-size: 11px; }}
        .costalero-cell {{ padding: 5px 8px; margin-bottom: 3px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; background: #fff; }}
        .hueco-libre {{ padding: 5px 8px; margin-bottom: 3px; border-radius: 4px; display: flex; justify-content: center; align-items: center; border: 1px dashed #ccc; background: #fafafa; color: #aaa; font-style: italic; }}
        .bg-amarillo {{ background-color: #fff9c4 !important; border-color: #fbc02d !important; color: #000 !important; }}
        .bg-azul {{ background-color: #e1f5fe !important; border-color: #4fc3f7 !important; color: #000 !important; }}
        .bg-rojo {{ background-color: #ffebee !important; border-color: #ef9a9a !important; color: #000 !important; }}
        .c-info {{ display: flex; align-items: center; gap: 5px; }}
        .nombre {{ font-weight: 600; font-size: 11px; }}
        .meta {{ font-size: 9px; opacity: 0.7; font-weight: bold; }}
        .seccion-texto {{ background: #fafafa; padding: 20px; border-radius: 8px; border-left: 4px solid #5c164e; margin-bottom: 20px; page-break-inside: avoid; }}
        .seccion-texto h3 {{ color: #5c164e; margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size: 16px; text-transform: uppercase; }}
        .lista-tramos {{ font-size: 12px; color: #444; line-height: 1.6; margin: 0; padding-left: 20px; }}
        @media print {{
            @page {{ margin: 0; }}
            body {{ background: #fff !important; padding: 1.5cm !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important; }}
            .no-print, .web-controls {{ display: none !important; }}
            .container {{ box-shadow: none !important; border-top: none !important; padding: 0 !important; max-width: 100% !important; }}
            .turno-box {{ border: 1px solid #000 !important; page-break-inside: avoid !important; margin-bottom: 20px !important; }}
            .turno-title {{ background: #eee !important; color: #000 !important; border-bottom: 1px solid #000 !important; }}
            .seccion-texto {{ background: transparent !important; border: 1px solid #ccc !important; border-left: 4px solid #5c164e !important; }}
            .page-break-avoid {{ page-break-inside: avoid !important; }}
            * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
        }}
    </style>
</head>
<body>
    <div class="web-controls no-print">
        <button class="btn-pdf" onclick="window.print()">🖨️ IMPRIMIR / GUARDAR PDF</button>
        <p style="color:#d4af37; font-size:12px; margin-top:-5px;">*En la ventana de impresión, selecciona "Guardar como PDF"</p>
        
        <div class="buscador-box">
            <h3 style="margin-top:0; color:#d4af37;">🔍 BUSCADOR DE COSTALERO</h3>
            <input type="text" id="input-buscador" placeholder="Escribe un nombre..." onkeyup="actualizarBuscador()">
            <div id="resultado-itinerario" class="itinerario-result"></div>
        </div>
    </div>
    
    <div class="container" id="informe-content">
        <div class="sello-anio no-print">AÑO ${{anio}}</div>
        <div class="header">
            <img src="bandera_tercio_npj.png" alt="Escudo" class="logo-img" onerror="this.style.display='none'">
            <h1>OFS Muy Ilustre Mayordomía de Nuestro Padre Jesús Nazareno</h1>
            <h2>Tercio del Cristo de la Agonía y María Magdalena</h2>
            <p>Fecha de emisión: ${{fecha_hoy}} | Cuadrante del Año: ${{anio}}</p>
        </div>
        
        <div class="leyenda">
            <div class="leyenda-item"><span class="caja bg-amarillo"></span> Sale en 2 Turnos</div>
            <div class="leyenda-item"><span class="caja bg-azul"></span> Lleva Trono y Cruz</div>
        </div>
        
        <div id="content-turnos"></div>
    </div>

    <script>
        const estadoGlobal = window.opener.exportDataForPDF.estadoGlobal;
        const datosExport = window.opener.exportDataForPDF.datos;
        const LLEVA_CRUZ = window.opener.exportDataForPDF.lleva_cruz;
        const MASTER_LIST = window.opener.exportDataForPDF.master;
        
        function normalizar(s) {{ return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase(); }}
        
        function actualizarBuscador() {{
            const val = normalizar(document.getElementById('input-buscador').value.trim());
            const resDiv = document.getElementById('resultado-itinerario');
            if (val.length < 2) {{ resDiv.style.display = 'none'; return; }}
            
            let foundId = null;
            for (let pid in estadoGlobal) {{
                if (normalizar(estadoGlobal[pid].nombre).includes(val)) {{
                    foundId = pid; break;
                }}
            }}
            
            if (!foundId) {{
                resDiv.innerHTML = '<p style="color:#ff4757; font-size:12px; margin:0;">No se encontró al costalero.</p>';
                resDiv.style.display = 'block';
                return;
            }}
            
            let e = estadoGlobal[foundId];
            let tramosInfo = [];
            for (let tr in datosExport.Mapping) {{
                let map = datosExport.Mapping[tr];
                let enTrono = e.tronoArr.includes(map.Trono);
                let enCruz  = LLEVA_CRUZ && e.cruzArr.includes(map.Cruz);
                if (enTrono || enCruz) {{
                    let roles = [];
                    if (enTrono) roles.push('⛪ Trono');
                    if (enCruz)  roles.push('✝ Cruz');
                    tramosInfo.push('<li><span class="tramo-label"><b>'+tr+'</b></span><span style="color:#d4af37; font-weight:bold;">'+roles.join(' + ')+'</span></li>');
                }} else {{
                    tramosInfo.push('<li><span class="tramo-label">'+tr+'</span><span style="color:#888;">🕯️ Cirio (Descanso)</span></li>');
                }}
            }}
            
            resDiv.innerHTML = '<div style="margin-bottom:10px; border-bottom:1px solid #d4af37; padding-bottom:5px;"><b>' + e.nombre + '</b></div><ul>' + tramosInfo.join('') + '</ul>';
            resDiv.style.display = 'block';
        }}
    <\/script>
</body>
</html>`;
        
        let contentHTML = "";

        // Para PDF (Compartimos la funcion de obtener stats visualmente en PDF)
        function getStatsPDF(arr) {{
            let valid = arr.filter(p => p.id !== -1 && p.altura > 0);
            if (valid.length === 0) return '';
            let sum = valid.reduce((acc, p) => acc + p.altura, 0);
            let avg = Math.round(sum / valid.length);
            let min = Math.min(...valid.map(p => p.altura));
            let max = Math.max(...valid.map(p => p.altura));
            let rango = min === max ? min : `${{min}}-${{max}}`;
            return `<span style="font-size:10px; color:#888; font-weight:normal; margin-left:4px; letter-spacing:0;">[∅ ${{avg}}cm | ↕ ${{rango}}]</span>`;
        }}
        
        let parseSlot = (p) => {{
            if (p.id === -1 || p.altura === 0) return '<li class="hueco-libre">Hueco Libre</li>';
            let e = estadoGlobal[p.id]; 
            let bg = '';
            if (e) {{
                if (e.estadoStr === 'critico') bg = 'bg-rojo';
                else if (e.estadoStr === 'cruzYTrono') bg = 'bg-azul';
                else if (e.estadoStr === 'dosTurnos') bg = 'bg-amarillo';
            }}
            return '<li class="costalero-cell '+bg+'"><div class="c-info"><span class="nombre">'+p.nombre+'</span></div><span class="meta">'+p.altura+'cm</span></li>';
        }};

        let d_export = datos;

        for (let turno in d_export.Trono) {{ 
            contentHTML += '<div class="turno-box page-break-avoid"><h3 class="turno-title">⛪ TRONO - '+turno+'</h3>';
            
            // DELANTE
            contentHTML += '<div class="seccion-top">▲ DELANTE ▲</div><div class="grid-varales">';
            ['Izquierda', 'Centro', 'Derecha'].forEach(vara => {{
                contentHTML += '<div class="varal"><h4 class="varal-title">'+vara+' '+getStatsPDF(d_export.Trono[turno].Delante[vara])+'</h4><ul class="lista-costaleros">';
                d_export.Trono[turno].Delante[vara].forEach(p => {{ contentHTML += parseSlot(p); }});
                contentHTML += '</ul></div>';
            }});
            contentHTML += '</div>';

            // CRISTO
            contentHTML += '<div class="seccion-mid">CRISTO</div>';

            // DETRÁS
            contentHTML += '<div class="grid-varales">';
            ['Izquierda', 'Centro', 'Derecha'].forEach(vara => {{
                contentHTML += '<div class="varal"><h4 class="varal-title">'+vara+' '+getStatsPDF(d_export.Trono[turno].Detras[vara])+'</h4><ul class="lista-costaleros">';
                d_export.Trono[turno].Detras[vara].forEach(p => {{ contentHTML += parseSlot(p); }});
                contentHTML += '</ul></div>';
            }});
            contentHTML += '</div><div class="seccion-bot">▼ DETRÁS ▼</div></div>';
        }}

        if (LLEVA_CRUZ && d_export.Cruz) {{ 
            for (let turno in d_export.Cruz) {{
                contentHTML += '<div class="turno-box page-break-avoid"><h3 class="turno-title">✝ CRUZ INSIGNIA - '+turno+'</h3>';
                
                // DELANTE
                contentHTML += '<div class="seccion-top">▲ DELANTE ▲</div><div class="grid-varales">';
                ['Izquierda', 'Derecha'].forEach(vara => {{
                    contentHTML += '<div class="varal"><h4 class="varal-title">'+vara+' '+getStatsPDF(d_export.Cruz[turno].Delante[vara])+'</h4><ul class="lista-costaleros">';
                    d_export.Cruz[turno].Delante[vara].forEach(p => {{ contentHTML += parseSlot(p); }});
                    contentHTML += '</ul></div>';
                }});
                contentHTML += '</div>';

                // CRUZ
                contentHTML += '<div class="seccion-mid">CRUZ</div>';

                // DETRÁS
                contentHTML += '<div class="grid-varales">';
                ['Izquierda', 'Derecha'].forEach(vara => {{
                    contentHTML += '<div class="varal"><h4 class="varal-title">'+vara+' '+getStatsPDF(d_export.Cruz[turno].Detras[vara])+'</h4><ul class="lista-costaleros">';
                    d_export.Cruz[turno].Detras[vara].forEach(p => {{ contentHTML += parseSlot(p); }});
                    contentHTML += '</ul></div>';
                }});
                contentHTML += '</div><div class="seccion-bot">▼ DETRÁS ▼</div></div>';
            }}
        }}

        contentHTML += '<div class="seccion-texto page-break-avoid"><h3>🗺️ Hoja de Ruta y Tramos</h3><ul class="lista-tramos">';
        for (let tr in d_export.Mapping) {{ 
            let m = d_export.Mapping[tr];
            let rStr = m.Ruta ? ` <i>(${{m.Ruta}})</i>` : '';
            let tStr = m.Trono ? 'Trono: ' + m.Trono : '';
            let cStr = (LLEVA_CRUZ && m.Cruz) ? ' | Cruz: ' + m.Cruz : ''; 
            contentHTML += '<li><b>'+tr+rStr+':</b> '+tStr+cStr+'</li>';
        }}
        contentHTML += '</ul></div>';

        html_pdf = html_pdf.replace('<div id="content-turnos"></div>', contentHTML);

        let pdfWin = window.open('', '_blank');
        pdfWin.document.write(html_pdf);
        pdfWin.document.close();
    }}

    /* ── DRAG & DROP ── */
    let dragging = null;
    window.allow = function(ev) {{ ev.preventDefault(); }}
    window.drag = function(ev, tipo, turno, sec, v, idx) {{ 
        dragging = {{ source:'slot', tipo, turno, sec, v, idx }}; 
    }}
    
    window.drop = function(ev, tipo, turno, sec, v, idx) {{
        ev.preventDefault();
        if (!dragging) return;
        
        let target = datos[tipo][turno][sec][v][idx];
        if (target.bloqueado) {{
            alert("🔒 No puedes modificar un hueco que está bloqueado.");
            dragging = null; return;
        }}

        if (dragging.source === 'sidebar') {{
            if (target.id !== -1 && !confirm(`El hueco ya está ocupado por ${{target.nombre}}. ¿Reemplazar?`)) {{ dragging = null; return; }}
            datos[tipo][turno][sec][v][idx] = {{...dragging.persona, bloqueado: false}};
        }} else {{
            let orig = datos[dragging.tipo][dragging.turno][dragging.sec][dragging.v][dragging.idx];
            if (orig.bloqueado) {{
                alert("🔒 El costalero que intentas mover está bloqueado en su posición actual.");
                dragging = null; return;
            }}
            // Intercambio
            datos[dragging.tipo][dragging.turno][dragging.sec][dragging.v][dragging.idx] = target;
            datos[tipo][turno][sec][v][idx] = orig;
        }}
        render(); guardarMemoria(); if (sidebarAbierto) renderSidebar();
        dragging = null; // Reiniciar
    }}

    /* ── SIDEBAR ── */
    let sidebarAbierto = false;
    window.toggleSidebar = function() {{
        sidebarAbierto = !sidebarAbierto;
        document.getElementById('sidebar').classList.toggle('abierto', sidebarAbierto);
        document.getElementById('sidebar-toggle').classList.toggle('abierto', sidebarAbierto);
        document.getElementById('sidebar-toggle').textContent = sidebarAbierto ? '✕ CERRAR' : '👥 CENSO';
        if (sidebarAbierto) renderSidebar();
    }}

    function normalizar(s) {{ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }}

    function getIdsAsig() {{
        const ids = new Set();
        let scan = (blq) => {{ for(let t in blq) for(let s in blq[t]) for(let v in blq[t][s]) blq[t][s][v].forEach(p => {{ if(p.id !== -1) ids.add(p.id); }}); }};
        if (datos && datos.Trono) scan(datos.Trono);
        if (LLEVA_CRUZ && datos && datos.Cruz) scan(datos.Cruz);
        return ids;
    }}

    window.renderSidebar = function() {{
        const val = normalizar(document.getElementById('sidebar-search').value.trim());
        const asig = getIdsAsig();
        let lista = val
            ? MASTER_LIST.filter(p => normalizar(p.nombre).includes(val) || (p.altura && p.altura.toString().includes(val)))
            : [...MASTER_LIST];
        lista.sort((a,b) => {{ let aA=asig.has(a.id), bA=asig.has(b.id); return aA!==bA ? (aA?1:-1) : b.altura-a.altura; }});
        const div = document.getElementById('sidebar-lista');
        div.innerHTML = '';
        lista.forEach(p => {{
            let ya = asig.has(p.id);
            let pref = (p.pref_hombro||'').toLowerCase();
            let pt = pref.includes('derech') ? ' <span style="color:#888;">(D)</span>' : pref.includes('izquierd') ? ' <span style="color:#888;">(I)</span>' : '';
            let item = document.createElement('div');
            item.className = 'sidebar-item' + (ya ? ' ya-asignado' : '');
            item.draggable = true;
            item.innerHTML = `<span>${{p.nombre}}${{pt}}</span><span style="color:#d4af37;">${{p.altura}}cm</span>`;
            item.ondragstart = () => {{ dragging = {{ source:'sidebar', persona:{{...p}} }}; }};
            div.appendChild(item);
        }});
        document.getElementById('sidebar-contador').textContent = `${{asig.size}} asignados`;
    }}

    /* ── MINI BUSCADOR EN HUECOS ── */
    window.buscarMini = function(ev, tipo, turno, sec, v, idx) {{
        const val = normalizar(ev.target.value.trim());
        const idSug = `sug-${{tipo}}-${{turno.replace(/ /g,'')}}-${{sec}}-${{v}}-${{idx}}`;
        const sug = document.getElementById(idSug);
        if (!sug) return;
        if (val.length < 2) {{ sug.style.display='none'; return; }}
        const matches = MASTER_LIST.filter(p => normalizar(p.nombre).includes(val) || (p.altura && p.altura.toString().includes(val))).slice(0,6);
        sug.innerHTML = '';
        if (matches.length > 0) {{
            sug.style.display = 'block';
            matches.forEach(m => {{
                let d = document.createElement('div');
                d.className = 'sug-item';
                d.textContent = `${{m.nombre}} (${{m.altura}}cm)`;
                d.onclick = () => {{ 
                    datos[tipo][turno][sec][v][idx] = {{...m, bloqueado: false}}; 
                    render(); guardarMemoria(); if(sidebarAbierto) renderSidebar(); 
                }};
                sug.appendChild(d);
            }});
        }} else sug.style.display = 'none';
    }}

    window.onload = init;
</script>
</body>
</html>"""

    with open("visualizador_personalizado.html", "w", encoding="utf-8") as f:
        f.write(html)