import json
import time
import base64
import os

def cargar_datos_viernes(archivo='datos.json'):
    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            datos = json.load(f)
            return [d for d in datos if d.get('viernes_santo', False)]
    except Exception as e:
        print(f"Error cargando {archivo}: {e}")
        return []

def generar_cuadrillas_viernes(costaleros, es_par=True):
    pool = sorted(costaleros, key=lambda x: x.get('altura', 0), reverse=True)
    
    turno_a = pool[:36]
    while len(turno_a) < 36: turno_a.append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
    
    turno_b = pool[36:72]
    while len(turno_b) < 36: turno_b.append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
    
    turno_c = pool[72:108]
    if len(turno_c) < 36:
        repetidores_b = [p for p in turno_b if p.get('id', -1) != -1]
        repetidores_b.sort(key=lambda x: x.get('altura', 0)) 
        idx_rep = 0
        while len(turno_c) < 36:
            if idx_rep < len(repetidores_b):
                p_rep = repetidores_b[idx_rep].copy()
                p_rep["nombre"] = p_rep.get("nombre")
                turno_c.append(p_rep)
                idx_rep += 1
            else:
                turno_c.append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
                
    cruz_turnos = [[], [], [], []]
    
    disp_b = [p.copy() for p in turno_b if p.get('id', -1) != -1]
    disp_c = [p.copy() for p in turno_c if p.get('id', -1) != -1 and not p.get('nombre', '').endswith('(R)')]
    
    disp_b.sort(key=lambda x: x.get('altura', 0), reverse=True)
    disp_c.sort(key=lambda x: x.get('altura', 0), reverse=True)

    def extraer_seguro(lista, cantidad):
        res = []
        while len(res) < cantidad and len(lista) > 0: res.append(lista.pop(0))
        return res

    # ==========================================
    # ASIGNACIÓN QUIRÚRGICA CRUZ (PAR / IMPAR)
    # ==========================================
    if es_par:
        cruz_turnos[0].extend(extraer_seguro(disp_c, 8)) # T1: Cruz C
        cruz_turnos[1].extend(extraer_seguro(disp_c, 8)) # T2: Cruz C
        cruz_turnos[2].extend(extraer_seguro(disp_b, 4)) # T3: Cruz B(4) + C(4) [TRAMO MALDITO]
        cruz_turnos[2].extend(extraer_seguro(disp_c, 4))
        cruz_turnos[3].extend(extraer_seguro(disp_b, 8)) # T4: Cruz B
    else:
        cruz_turnos[0].extend(extraer_seguro(disp_b, 8)) # T1: Cruz B
        cruz_turnos[1].extend(extraer_seguro(disp_b, 4)) # T2: Cruz B(4) + C(4) [TRAMO MALDITO]
        cruz_turnos[1].extend(extraer_seguro(disp_c, 4))
        cruz_turnos[2].extend(extraer_seguro(disp_c, 8)) # T3: Cruz C
        cruz_turnos[3].extend(extraer_seguro(disp_c, 8)) # T4: Cruz C

    for i in range(4):
        while len(cruz_turnos[i]) < 8: 
            cruz_turnos[i].append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})

    def distribuir_trono(personas):
        varas = ["Izquierda", "Centro", "Derecha"]
        res = {v: {"Delante": [], "Detras": []} for v in varas}
        reales = [p for p in personas if p.get('altura', 0) > 0]
        huecos = [p for p in personas if p.get('altura', 0) == 0]
        
        reales.sort(key=lambda x: (x.get('altura',0)==0, -x.get('altura',0)))
        para_delante = reales[:18]
        para_detras = reales[18:]
        para_detras.sort(key=lambda x: (x.get('altura',0)==0, x.get('altura',0)))
        
        zigzag = ["Centro", "Derecha", "Izquierda"]
        for i in range(6):
            for v in zigzag:
                if para_delante: res[v]["Delante"].append(para_delante.pop(0))
                elif huecos: res[v]["Delante"].append(huecos.pop(0))
                else: res[v]["Delante"].append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
                
        for i in range(6):
            for v in zigzag:
                if para_detras: res[v]["Detras"].append(para_detras.pop(0))
                elif huecos: res[v]["Detras"].append(huecos.pop(0))
                else: res[v]["Detras"].append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})

        def can_go_to(p2, target_vara):
            pref2 = str(p2.get('pref_hombro', '')).lower().strip()
            if not pref2 or "indiferente" in pref2 or "ambos" in pref2: return True
            if target_vara == "Izquierda" and "derech" in pref2: return True
            if target_vara == "Derecha" and "izquierd" in pref2: return True
            return False

        for v_nom in ["Izquierda", "Derecha"]:
            for sec in ["Delante", "Detras"]:
                for i in range(6):
                    p1 = res[v_nom][sec][i]
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
                            for j in range(6):
                                p2 = res[opp_vara][sec2][j]
                                if p2 and p2.get('altura') == p1.get('altura'):
                                    if can_go_to(p2, v_nom):
                                        res[v_nom][sec][i], res[opp_vara][sec2][j] = res[opp_vara][sec2][j], res[v_nom][sec][i]
                                        swapped = True
                                        break
                        
                        if not swapped:
                            for sec2 in ["Delante", "Detras"]:
                                if swapped: break
                                for j in range(6):
                                    p_centro = res["Centro"][sec2][j]
                                    if p_centro and p_centro.get('altura') == p1.get('altura'):
                                        if can_go_to(p_centro, v_nom):
                                            res[v_nom][sec][i], res["Centro"][sec2][j] = res["Centro"][sec2][j], res[v_nom][sec][i]
                                            swapped = True
                                            break

        for sec in ["Delante", "Detras"]:
            for i in range(6):
                p_centro = res["Centro"][sec][i]
                if not p_centro or p_centro.get('altura', 0) == 0: continue
                
                pref_centro = str(p_centro.get('pref_hombro', '')).lower().strip()
                target_vara = None
                
                if "derech" in pref_centro: target_vara = "Izquierda"
                elif "izquierd" in pref_centro: target_vara = "Derecha"
                
                if target_vara:
                    swapped = False
                    for sec_lat in ["Delante", "Detras"]:
                        if swapped: break
                        for j in range(6):
                            p_lat = res[target_vara][sec_lat][j]
                            if p_lat and p_lat.get('altura') == p_centro.get('altura'):
                                pref_lat = str(p_lat.get('pref_hombro', '')).lower().strip()
                                if not pref_lat or "indiferente" in pref_lat or "ambos" in pref_lat:
                                    res["Centro"][sec][i], res[target_vara][sec_lat][j] = res[target_vara][sec_lat][j], res["Centro"][sec][i]
                                    swapped = True
                                    break
        return res

    def distribuir_cruz(personas):
        varas = ["Izquierda", "Derecha"]
        res = {v: {"Delante": [], "Detras": []} for v in varas}
        reales = [p for p in personas if p.get('altura', 0) > 0]
        huecos = [p for p in personas if p.get('altura', 0) == 0]
        
        reales.sort(key=lambda x: x.get('altura', 0), reverse=True)
        for _ in range(2):
            fila = []
            for _ in range(2): fila.append(reales.pop(0) if reales else huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
            asig = {"Izquierda": None, "Derecha": None}
            libres = []
            for p in fila:
                pref = str(p.get('pref_hombro', '')).lower()
                if 'derech' in pref and asig["Izquierda"] is None: asig["Izquierda"] = p
                elif 'izquierd' in pref and asig["Derecha"] is None: asig["Derecha"] = p
                else: libres.append(p)
            for v in varas:
                if asig[v] is None and libres: asig[v] = libres.pop(0)
            for v in varas: res[v]["Delante"].append(asig[v])
            
        reales.sort(key=lambda x: x.get('altura', 0))
        for _ in range(2):
            fila = []
            for _ in range(2): fila.append(reales.pop(0) if reales else huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
            asig = {"Izquierda": None, "Derecha": None}
            libres = []
            for p in fila:
                pref = str(p.get('pref_hombro', '')).lower()
                if 'derech' in pref and asig["Izquierda"] is None: asig["Izquierda"] = p
                elif 'izquierd' in pref and asig["Derecha"] is None: asig["Derecha"] = p
                else: libres.append(p)
            for v in varas:
                if asig[v] is None and libres: asig[v] = libres.pop(0)
            for v in varas: res[v]["Detras"].append(asig[v])
        return res

    return {
        "tipo_procesion": "viernes_santo",
        "Trono": {"Turno A": distribuir_trono(turno_a), "Turno B": distribuir_trono(turno_b), "Turno C": distribuir_trono(turno_c)},
        "Cruz": {"Turno 1": distribuir_cruz(cruz_turnos[0]), "Turno 2": distribuir_cruz(cruz_turnos[1]), "Turno 3": distribuir_cruz(cruz_turnos[2]), "Turno 4": distribuir_cruz(cruz_turnos[3])}
    }


def generar_html_viernes(datos_completos, master_list, anio, es_par, peso_trono, peso_cruz, limite_peso):
    turnos_json = json.dumps(datos_completos)
    master_json = json.dumps(master_list)
    marca_tiempo = str(int(time.time()))

    if es_par:
        tramos_trono_a = "[1, 3, 5, 7]"
        tramos_trono_b = "[2, 6]"
        tramos_trono_c = "[4, 6]"
        txt_t1, txt_t2, txt_t3, txt_t4 = "Turno A", "Turno B", "Turno A", "Turno C"
        txt_r1, txt_r2, txt_r3 = "Turno A", "Turnos B + C", "Turno A"
    else:
        tramos_trono_a = "[2, 4, 6]"
        tramos_trono_b = "[3, 5, 7]"
        tramos_trono_c = "[1, 5, 7]"
        txt_t1, txt_t2, txt_t3, txt_t4 = "Turno C", "Turno A", "Turno B", "Turno A"
        txt_r1, txt_r2, txt_r3 = "Turnos B + C", "Turno A", "Turnos B + C"

    try:
        with open('datos.json', 'r', encoding='utf-8') as f:
            censo_completo = f.read().strip()
            if not censo_completo: censo_completo = "[]"
    except:
        censo_completo = "[]"

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Viernes Santo - Gestor de Procesión</title>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #0c0209; color: #f8f0f5; padding: 20px; }}
            .controles {{ position: sticky; top: 0; background: #1a0514; padding: 15px; z-index: 100; border-bottom: 2px solid #d4af37; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }}
            
            .alerta-box {{ background: #b30000; color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 2px solid #ff4d4d; display: none; font-weight: bold; box-shadow: 0 0 15px rgba(255,0,0,0.5); }}
            .alerta-box ul {{ margin: 10px 0 0 0; padding-left: 20px; font-weight: normal; }}

            .buscador-box {{ background: #23061b; padding: 20px; margin: 20px 0; border: 1px solid #d4af37; border-radius: 8px; }}
            .buscador-box input {{ width: 100%; padding: 12px; font-size: 16px; background: #0c0209; color: #d4af37; border: 1px solid #3d0c2e; border-radius: 5px; outline: none; }}
            .itinerario-result {{ margin-top: 15px; display: none; }}
            
            .bloque-ruta {{ background: #160311; padding: 15px; border-radius: 5px; border-left: 5px solid #d4af37; margin-bottom: 10px; }}
            .bloque-ruta h5 {{ margin: 0 0 8px 0; color: #e8d08c; font-size: 14px; border-bottom: 1px solid #3d0c2e; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }}
            .bloque-ruta ul {{ margin: 0; padding: 0; list-style: none; }}
            .bloque-ruta li {{ padding: 8px 0; border-bottom: 1px dashed #3d0c2e; font-size: 13px; display: flex; }}
            .tramo-label {{ width: 220px; color: #a37c95; flex-shrink: 0; }}

            .turno-container {{ background: #1a0514; padding: 20px; margin-bottom: 40px; border-radius: 15px; border: 1px solid #3d0c2e; box-shadow: 0 0 15px rgba(212, 175, 55, 0.05); }}
            .turno-container h2 {{ color: #d4af37; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #3d0c2e; padding-bottom: 10px; }}
            .grid-trono {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
            .grid-cruz {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 700px; margin: 0 auto; }}
            .vara {{ background: #23061b; padding: 15px; border-radius: 10px; border-top: 5px solid #d4af37; }}
            .vara h3 {{ color: #e8d08c; margin: 0 0 10px 0; font-size: 14px; text-align: center; }}
            .seccion {{ background: #160311; padding: 10px; margin: 10px 0; border-radius: 5px; min-height: 80px; border: 1px dashed #4a1038; }}
            
            .costalero {{ background: #3d0c2e; border: 1px solid #571342; margin: 5px 0; padding: 8px; border-radius: 4px; cursor: move; display: flex; justify-content: space-between; align-items: center; font-size: 11px; transition: 0.3s; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }}
            .costalero.vacio {{ border: 1px dashed #571342; background: #0c0209; color: #884d72; cursor: default; flex-direction: column; align-items: stretch; text-shadow: none; overflow: visible; position: relative; }}
            .costalero.sobrepeso {{ border: 2px solid #ff4757; background: #6b0b1c; }}
            
            .costalero.dyn-rep-c {{ border: 1px solid #ffd700; box-shadow: inset 0 0 8px rgba(255, 215, 0, 0.2); }}
            .costalero.dyn-rep-cruz {{ border: 1px solid #00d2ff; box-shadow: inset 0 0 8px rgba(0, 210, 255, 0.2); }}
            .costalero.dyn-conflicto {{ border: 2px dashed #ff0000; background: #4a0000; animation: parpadeo 1s infinite; }}
            .dyn-text-conflicto {{ color: #fff; font-weight: bold; font-size: 12px; text-shadow: none; }}

            .modal-overlay {{ display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(3px); }}
            .modal-content {{ background: #1a0514; border: 2px solid #d4af37; padding: 25px; border-radius: 12px; width: 90%; max-width: 600px; position: relative; animation: slideIn 0.3s ease-out; }}
            .modal-close {{ position: absolute; top: 15px; right: 15px; background: none; border: none; color: #ff4757; font-size: 24px; cursor: pointer; transition: 0.2s; }}
            .modal-close:hover {{ transform: scale(1.2); }}
            
            @keyframes parpadeo {{ 50% {{ opacity: 0.5; }} }}
            @keyframes slideIn {{ from {{ transform: translateY(-30px); opacity: 0; }} to {{ transform: translateY(0); opacity: 1; }} }}

            .btn-control {{ background: #3d0c2e; color: #f8f0f5; border: 1px solid #d4af37; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; margin-left: 5px; text-transform: uppercase; transition: 0.3s; }}
            .btn-control:hover {{ background: #571342; box-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }}
            .btn-export {{ background: #d4af37; color: #000; border-color: #b5952f; }}
            .btn-export:hover {{ background: #b5952f; color:#000; }}
            .btn-load {{ background: #17517e; border-color: #2980b9; }}
            .btn-load:hover {{ background: #1f6b9c; }}
            .btn-danger {{ background: #b30000; border-color: #ff4d4d; }}
            .btn-danger:hover {{ background: #ff4d4d; color: #fff; box-shadow: 0 0 8px rgba(255, 77, 77, 0.4); }}
            
            .stats-box {{ background: #0c0209; padding: 8px; border-radius: 4px; font-size: 10px; color: #d4af37; margin-top: 5px; border-left: 3px solid #d4af37; }}
            input.search-p {{ background: #0c0209; border: 1px solid #3d0c2e; color: #d4af37; padding: 5px; width: 100%; font-size: 10px; border-radius: 3px; outline: none; box-sizing: border-box; }}
            input.search-p:focus {{ border-color: #d4af37; }}
            .sugerencias {{ background: #1a0514; border: 1px solid #d4af37; max-height: 100px; overflow-y: auto; position: absolute; z-index: 999; width: 100%; top: 100%; left: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.2); border-radius: 3px; }}
            .sug-item {{ padding: 6px; cursor: pointer; border-bottom: 1px solid #eee; color: #e8d08c; font-size: 11px; text-align: left; }}
            .sug-item:hover {{ background: #3d0c2e; color: #fff; font-weight: bold; }}
            
            /* PANEL LATERAL CENSO */
            #sidebar-toggle {{
                position: fixed; right: 0; top: 50%; transform: translateY(-50%);
                background: #d4af37; color: #0c0209; border: none; cursor: pointer;
                padding: 12px 7px; border-radius: 8px 0 0 8px; z-index: 200;
                font-size: 11px; font-weight: bold; writing-mode: vertical-rl;
                letter-spacing: 1px; transition: right 0.3s ease; box-shadow: -3px 0 8px rgba(0,0,0,0.4);
            }}
            #sidebar-toggle.abierto {{ right: 290px; }}
            #sidebar {{
                position: fixed; right: 0; top: 0; height: 100vh; width: 290px;
                background: #1a0514; border-left: 2px solid #d4af37;
                z-index: 150; transform: translateX(100%);
                transition: transform 0.3s ease;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: -5px 0 20px rgba(0,0,0,0.6);
            }}
            #sidebar.abierto {{ transform: translateX(0); }}
            #sidebar-header {{ padding: 15px; border-bottom: 1px solid #3d0c2e; background: #23061b; }}
            #sidebar-header h3 {{ color: #d4af37; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }}
            #sidebar-search {{
                width: 100%; background: #0c0209; border: 1px solid #3d0c2e;
                color: #d4af37; padding: 8px; border-radius: 4px; font-size: 12px;
                outline: none; box-sizing: border-box;
            }}
            #sidebar-search:focus {{ border-color: #d4af37; }}
            #sidebar-contador {{ font-size: 10px; color: #a37c95; margin-top: 6px; }}
            #sidebar-lista {{ flex: 1; overflow-y: auto; padding: 8px; }}
            .sidebar-item {{
                background: #3d0c2e; border: 1px solid #571342; margin: 3px 0;
                padding: 7px 10px; border-radius: 4px; cursor: grab;
                font-size: 11px; color: #f8f0f5;
                display: flex; justify-content: space-between; align-items: center;
                transition: background 0.2s; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                user-select: none;
            }}
            .sidebar-item:hover {{ background: #571342; border-color: #d4af37; }}
            .sidebar-item.ya-asignado {{ opacity: 0.38; border-style: dashed; cursor: grab; }}
        </style>
    </head>
    <body>
        <button id="sidebar-toggle" onclick="toggleSidebar()">👥 CENSO</button>
        <div id="sidebar">
            <div id="sidebar-header">
                <h3>👥 Costaleros — Viernes Santo</h3>
                <input type="text" id="sidebar-search" placeholder="Buscar nombre o altura..." oninput="renderSidebar()">
                <div id="sidebar-contador"></div>
            </div>
            <div id="sidebar-lista"></div>
        </div>
        <div class="controles">
            <div>
                <div style="font-size:18px; font-weight:bold; color:#d4af37;">VIERNES SANTO - GESTOR DE TURNOS</div>
                <div style="font-size:11px; color:#a37c95; margin-top: 3px;">Indicador de preferencia de hombro: ✅ Hombro Correcto</div>
            </div>
            <div>
                <input type="file" id="file-input" accept=".json" style="display: none;" onchange="cargarJSON(event)">
                <button class="btn-control btn-danger" onclick="vaciarCuadrante()">🗑️ VACIAR CUADRANTE</button>
                <button class="btn-control btn-load" onclick="document.getElementById('file-input').click()">📂 CARGAR DATOS</button>
                <button id="btn-heatmap" class="btn-control" onclick="toggleHeatmap()">🧊 Mapa Peso: OFF</button>
                <button class="btn-control btn-export" onclick="descargarDatosJSON()">💾 DESCARGAR DATOS</button>
            </div>
        </div>

        <div id="modal-info" class="modal-overlay" onclick="cerrarModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="cerrarModal()">✖</button>
                <div id="modal-body"></div>
            </div>
        </div>

        <div id="modal-indicaciones" class="modal-overlay" onclick="cerrarModalIndicaciones(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
                <button class="modal-close" onclick="cerrarModalIndicaciones()">✖</button>
                <h3 style="color:#d4af37; margin-top:0; border-bottom:1px solid #3d0c2e; padding-bottom:10px;">📝 Editar Indicaciones y Normativa (Viernes)</h3>
                
                <label style="color:#e8d08c; font-size:13px; font-weight:bold;">⚠️ Tramo 1 (Monserrate ➔ Ayto):</label>
                <textarea id="text-tramo1" class="indicaciones-input" style="height: 55px;" placeholder="Ej: Atención a la salida..."></textarea>
                
                <label style="color:#e8d08c; font-size:13px; font-weight:bold;">⚠️ Tramo 2 (Ayto ➔ As de Oros):</label>
                <textarea id="text-tramo2" class="indicaciones-input" style="height: 55px;" placeholder="Ej: Giro en Plaza Nueva..."></textarea>
                
                <label style="color:#e8d08c; font-size:13px; font-weight:bold;">⚠️ Tramo 3 (As Oros ➔ Glorieta):</label>
                <textarea id="text-tramo3" class="indicaciones-input" style="height: 55px;" placeholder="Ej: Mantener el paso firme..."></textarea>
                
                <label style="color:#e8d08c; font-size:13px; font-weight:bold;">⚠️ Tramo 4 y Regreso:</label>
                <textarea id="text-tramo4" class="indicaciones-input" style="height: 55px;" placeholder="Ej: Relevos en la Gasolinera..."></textarea>
                
                <label style="color:#e8d08c; font-size:13px; font-weight:bold;">📜 Normativa de la Cuadrilla:</label>
                <textarea id="text-normativa" class="indicaciones-input" style="height: 80px;" placeholder="Escribe aquí las normas generales o avisos del cuadrillero..."></textarea>
                
                <button onclick="guardarIndicaciones()" style="width:100%; background:#d4af37; color:#000; font-weight:bold; font-size: 14px; padding:12px; border:none; border-radius:5px; cursor:pointer; margin-top:5px; text-transform: uppercase;">💾 Guardar Notas en el Cuadrante</button>
            </div>
        </div>

        <div id="panel-alertas" class="alerta-box">
            ⚠️ ¡ALERTA CRÍTICA! Imposibilidad física detectada:
            <ul id="lista-alertas"></ul>
        </div>
        
        <div style="background:#23061b; padding:15px; border-left:5px solid #d4af37; margin:20px 0; border-radius:4px;">
            <h3 style="margin:0; color:#d4af37;">📅 AÑO {anio} ({'PAR' if es_par else 'IMPAR'})</h3>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #e8d08c; line-height: 1.6;">
                📍 <b>Tramos de la Procesión </b> tanto para Cruz, como Trono: <br>
                            ▶ Tramo 1: Monserrate → Ayuntamiento               || <b>{txt_t1}</b> <br>
                            ▶ Tramo 2: Ayuntamiento → As de Oros (Plaza Nueva) || <b>{txt_t2}</b> <br>
                            ▶ Tramo 3: As de Oros → Glorieta                   || <b>{txt_t3}</b> <br>
                            ▶ Tramo 4: Glorieta → Oficina de Turismo           || <b>{txt_t4}</b> <br>
                            
                📍 <b>Regreso</b> (Solo con el Trono Principal) <br>
                            ▶ Tramo 1: Oficina Turismo → Santiago              || <b>{txt_r1}</b> <br>
                            ▶ Tramo 2: Santiago → Gasolinera                   || <b>{txt_r2}</b> <br>
                            ▶ Tramo 3: Gasolinera → San Francisco              || <b>{txt_r3}</b> <br>
            </p>
        </div>

        <div class="buscador-box">
            <h3 style="margin-top:0; color:#d4af37;">🔍 BUSCADOR EN TIEMPO REAL</h3>
            <p style="font-size:12px; color:#a37c95; margin-top:-10px;">Busca el itinerario de alguien escribiendo, o pulsa el icono ℹ️ al lado de su nombre abajo.</p>
            <input type="text" id="input-buscador" placeholder="Escribe el nombre de un costalero/a..." onkeyup="actualizarBuscador()">
            <div id="resultado-itinerario" class="itinerario-result"></div>
        </div>
        
        <div style="margin-top:10px; padding:15px; border:1px dashed #3d0c2e; font-size:13px; background:#160311;">
            <b style="color:#e8d08c;">LEYENDA AUTOMÁTICA:</b><br><br>
            <span style="color:#ffd700; margin-right:20px; font-weight:bold;">■ Amarillo: Repite Trono (B y C)</span>
            <span style="color:#00d2ff; margin-right:20px; font-weight:bold;">■ Azul: Repite Cruz (Trono y Cruz)</span>
            <span style="color:#ffffff; background:#b30000; padding:2px 5px; font-weight:bold; border:1px dashed white;">■ ROJO PARPADEANTE: Imposible / Baja Censo / No Sale</span>
        </div>

        <div id="app"></div>
        
        <div id="indicaciones-container"></div>

        <script>
            const TS_PYTHON = "{marca_tiempo}";
            const DATOS_INICIALES = {turnos_json};
            const MASTER_LIST = {master_json};
            const CENSO_COMPLETO = {censo_completo}; 
            const DIA_PROCESION = 'viernes_santo';
            
            const PESO_TRONO = {peso_trono};
            const PESO_CRUZ = {peso_cruz};
            const MAX_KG = {limite_peso};
            
            let datos = {{}};
            let estadoGlobal = {{}};
            let heatmapActivo = false;
            
            const TRAMOS = {{
                "Trono": {{ "Turno A": {tramos_trono_a}, "Turno B": {tramos_trono_b}, "Turno C": {tramos_trono_c} }},
                "Cruz": {{ "Turno 1": [1], "Turno 2": [2], "Turno 3": [3], "Turno 4": [4] }}
            }};

            function init() {{
                let savedTs = localStorage.getItem('viernes_santo_ts');
                let savedDatos = localStorage.getItem('viernes_santo_datos');
                if (savedDatos && savedTs === TS_PYTHON) {{
                    datos = JSON.parse(savedDatos);
                }} else {{
                    datos = JSON.parse(JSON.stringify(DATOS_INICIALES));
                    localStorage.setItem('viernes_santo_ts', TS_PYTHON);
                    localStorage.setItem('viernes_santo_datos', JSON.stringify(datos));
                }}
                
                datos.tipo_procesion = "viernes_santo";
                if(!datos.indicaciones) {{
                    datos.indicaciones = {{ tramo1: "", tramo2: "", tramo3: "", tramo4: "", normativa: "" }};
                }}
                
                render();
            }}

            function guardarMemoria() {{
                datos.tipo_procesion = "viernes_santo";
                localStorage.setItem('viernes_santo_datos', JSON.stringify(datos));
            }}

            function descargarDatosJSON() {{
                datos.tipo_procesion = "viernes_santo";
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datos, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "Distribucion_Viernes_Definitiva.json");
                document.body.appendChild(dlAnchorElem);
                dlAnchorElem.click();
                dlAnchorElem.remove();
            }}
            
            function vaciarCuadrante() {{
                if(confirm("⚠️ ¿Estás completamente seguro de que quieres VACIAR el cuadrante?\\n\\nTodos los costaleros serán eliminados de sus puestos y tendrás que asignarlos manualmente de nuevo.\\n(Si te equivocas, puedes cargar de nuevo un archivo guardado).")) {{
                    for (let tipo of ["Trono", "Cruz"]) {{
                        if (!datos[tipo]) continue;
                        for (let t of Object.keys(datos[tipo])) {{
                            for (let v of Object.keys(datos[tipo][t])) {{
                                for (let sec of ["Delante", "Detras"]) {{
                                    if(datos[tipo][t][v][sec]) {{
                                        for (let i = 0; i < datos[tipo][t][v][sec].length; i++) {{
                                            datos[tipo][t][v][sec][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                    guardarMemoria();
                    render();
                }}
            }}

            function vaciarTurno(tipo, idT) {{
                if(confirm(`⚠️ ¿Vaciar solo el ${{idT}} (${{tipo}})?\\n\\nSolo se eliminarán los costaleros de ese turno. El resto del cuadrante no se toca.`)) {{
                    for (let v of Object.keys(datos[tipo][idT])) {{
                        for (let sec of ["Delante", "Detras"]) {{
                            if (datos[tipo][idT][v][sec]) {{
                                for (let i = 0; i < datos[tipo][idT][v][sec].length; i++) {{
                                    datos[tipo][idT][v][sec][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                                }}
                            }}
                        }}
                    }}
                    guardarMemoria();
                    render();
                }}
            }}

            function cargarJSON(event) {{
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {{
                    try {{
                        const loadedData = JSON.parse(e.target.result);
                        
                        if (loadedData.tipo_procesion && loadedData.tipo_procesion !== "viernes_santo") {{
                            alert("❌ ERROR: Este archivo pertenece a otra procesión. No puedes cargarlo en la vista del Viernes Santo.");
                            event.target.value = '';
                            return;
                        }} else if (!loadedData.tipo_procesion && loadedData.Trono && !loadedData.Trono["Turno C"]) {{
                            alert("❌ ERROR: Este archivo parece pertenecer al Miércoles Santo. No puedes cargarlo en la vista del Viernes Santo.");
                            event.target.value = '';
                            return;
                        }}

                        if(loadedData.Trono && loadedData.Cruz) {{
                            let msgBorrados = [];
                            let msgNoSalen = [];

                            for (let tipo of ["Trono", "Cruz"]) {{
                                if (!loadedData[tipo]) continue;
                                for (let t of Object.keys(loadedData[tipo])) {{
                                    for (let v of Object.keys(loadedData[tipo][t])) {{
                                        for (let sec of ["Delante", "Detras"]) {{
                                            for (let i = 0; i < loadedData[tipo][t][v][sec].length; i++) {{
                                                let p = loadedData[tipo][t][v][sec][i];
                                                if (p.id && p.id !== -1) {{
                                                    let personaCenso = CENSO_COMPLETO.find(c => c.id === p.id);
                                                    if (!personaCenso) {{
                                                        msgBorrados.push(`- ${{p.nombre}}`);
                                                        loadedData[tipo][t][v][sec][i] = {{ "nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1 }};
                                                    }} else {{
                                                        p.altura = personaCenso.altura;
                                                        p.pref_hombro = personaCenso.pref_hombro;
                                                        if (!personaCenso[DIA_PROCESION]) {{
                                                            msgNoSalen.push(`- ${{p.nombre}}`);
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
                                alertaFinal += "⚠️ EL CENSO SE HA MODIFICADO:\\nLas siguientes personas ya no aparecen en la base de datos oficial y sus huecos han sido liberados automáticamente:\\n" + msgBorrados.join("\\n") + "\\n\\n";
                            }}
                            if (msgNoSalen.length > 0) {{
                                alertaFinal += "⚠️ PERSONAS QUE NO SALEN HOY:\\n(Aparecerán parpadeando en ROJO en el cuadrante)\\n" + msgNoSalen.join("\\n") + "\\n\\n";
                            }}

                            if (alertaFinal !== "") {{
                                alert(alertaFinal);
                            }} else {{
                                alert("✅ Configuración cargada correctamente. Todo el personal está al día en el censo.");
                            }}

                            datos = loadedData;
                            datos.tipo_procesion = "viernes_santo";
                            if(!datos.indicaciones) datos.indicaciones = {{ tramo1: "", tramo2: "", tramo3: "", tramo4: "", normativa: "" }};
                            
                            guardarMemoria();
                            render();
                        }} else {{
                            alert("❌ Archivo JSON inválido.");
                        }}
                    }} catch (error) {{
                        alert("❌ Error al leer el archivo JSON.");
                    }}
                    event.target.value = '';
                }};
                reader.readAsText(file);
            }}

            function analizarEstado() {{
                let stats = {{}};
                let alertasCriticas = [];

                for (let tipo of ["Trono", "Cruz"]) {{
                    if (!datos[tipo]) continue;
                    for (let t of Object.keys(datos[tipo])) {{
                        for (let v of Object.keys(datos[tipo][t])) {{
                            for (let sec of ["Delante", "Detras"]) {{
                                datos[tipo][t][v][sec].forEach(p => {{
                                    if (p.id && p.id !== -1) {{
                                        if (!stats[p.id]) stats[p.id] = {{ nombre: p.nombre, cristo: [], cruz: [] }};
                                        if (tipo === "Trono") stats[p.id].cristo.push(t);
                                        if (tipo === "Cruz") stats[p.id].cruz.push(t);
                                    }}
                                }});
                            }}
                        }}
                    }}
                }}

                for (let id in stats) {{
                    let s = stats[id];
                    s.estadoStr = "normal";
                    
                    let cristoArr = [];
                    s.cristo.forEach(t => cristoArr.push(...(TRAMOS.Trono[t] || [])));
                    let cristoUniq = [...new Set(cristoArr)]; 
                    
                    let cruzArr = [];
                    s.cruz.forEach(t => cruzArr.push(...(TRAMOS.Cruz[t] || [])));
                    let cruzUniq = [...new Set(cruzArr)];
                    
                    let allTramos = [...new Set([...cristoUniq, ...cruzUniq])].sort((a,b) => a - b);
                    s.tramos = allTramos; 

                    let tieneConflicto = false;

                    let cristoTurnosUnicos = [...new Set(s.cristo)];
                    
                    if (s.cristo.length > cristoTurnosUnicos.length || s.cruz.length > [...new Set(s.cruz)].length) {{
                        tieneConflicto = true;
                        alertasCriticas.push(`<b>${{s.nombre}}</b> duplicado en un mismo turno.`);
                    }}

                    let interseccion = cristoUniq.filter(t => cruzUniq.includes(t));
                    if (interseccion.length > 0) {{
                        tieneConflicto = true;
                        alertasCriticas.push(`<b>${{s.nombre}}</b> en Trono y Cruz a la vez (Tramo ${{interseccion.join(', ')}}).`);
                    }}

                    let personaCenso = CENSO_COMPLETO.find(c => c.id == id);
                    if (!personaCenso) {{
                        s.estadoStr = "baja_censo";
                    }} else if (!personaCenso[DIA_PROCESION]) {{
                        s.estadoStr = "no_procesiona";
                    }} else if (tieneConflicto) {{
                        s.estadoStr = "conflicto";
                    }} else if (cruzUniq.length > 0 && cristoUniq.length > 0) {{
                        s.estadoStr = "repCruz"; 
                    }} else if (cristoTurnosUnicos.length >= 2) {{
                        s.estadoStr = "repC";
                    }}
                }}
                estadoGlobal = stats;

                let panel = document.getElementById("panel-alertas");
                let lista = document.getElementById("lista-alertas");
                if (alertasCriticas.length > 0) {{
                    lista.innerHTML = alertasCriticas.map(e => `<li>- ${{e}}</li>`).join("");
                    panel.style.display = "block";
                }} else {{
                    panel.style.display = "none";
                }}
            }}

            function abrirModalIndicaciones() {{
                if(!datos.indicaciones) datos.indicaciones = {{ tramo1: "", tramo2: "", tramo3: "", tramo4: "", normativa: "" }};
                document.getElementById('text-tramo1').value = datos.indicaciones.tramo1 || "";
                document.getElementById('text-tramo2').value = datos.indicaciones.tramo2 || "";
                document.getElementById('text-tramo3').value = datos.indicaciones.tramo3 || "";
                document.getElementById('text-tramo4').value = datos.indicaciones.tramo4 || "";
                document.getElementById('text-normativa').value = datos.indicaciones.normativa || "";
                document.getElementById('modal-indicaciones').style.display = 'flex';
            }}

            function cerrarModalIndicaciones(ev) {{
                if (!ev || ev.target.id === 'modal-indicaciones' || ev.target.className === 'modal-close') {{
                    document.getElementById('modal-indicaciones').style.display = 'none';
                }}
            }}

            function guardarIndicaciones() {{
                if(!datos.indicaciones) datos.indicaciones = {{}};
                datos.indicaciones.tramo1 = document.getElementById('text-tramo1').value;
                datos.indicaciones.tramo2 = document.getElementById('text-tramo2').value;
                datos.indicaciones.tramo3 = document.getElementById('text-tramo3').value;
                datos.indicaciones.tramo4 = document.getElementById('text-tramo4').value;
                datos.indicaciones.normativa = document.getElementById('text-normativa').value;
                
                guardarMemoria();
                renderIndicaciones(); 
                cerrarModalIndicaciones();
            }}

            function renderIndicaciones() {{
                if(!datos.indicaciones) datos.indicaciones = {{ tramo1: "", tramo2: "", tramo3: "", tramo4: "", normativa: "" }};
                
                let container = document.getElementById('indicaciones-container');
                container.innerHTML = `
                    <div class="turno-container" style="margin-top: 40px; border-color: #5c164e; box-shadow: 0 0 15px rgba(92, 22, 78, 0.15);">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #3d0c2e; padding-bottom: 10px; margin-bottom: 15px;">
                            <h2 style="margin:0; border:none; padding:0; color:#d4af37; text-transform: uppercase; letter-spacing: 2px;">📝 INDICACIONES Y NORMATIVA</h2>
                            <button class="btn-control" onclick="abrirModalIndicaciones()" style="background:#5c164e; border-color:#d4af37; color:#fff;">✏️ EDITAR TEXTOS</button>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                            <div style="background:#160311; padding:12px; border-radius:8px; border-left:4px solid #d4af37;">
                                <h4 style="color:#e8d08c; margin-top:0; font-size:13px;">⚠️ T1: Monserrate ➔ Ayto</h4>
                                <p class="texto-indicaciones">${{datos.indicaciones.tramo1 || "<i style='color:#a37c95;'>(Sin indicaciones)</i>"}}</p>
                            </div>
                            <div style="background:#160311; padding:12px; border-radius:8px; border-left:4px solid #d4af37;">
                                <h4 style="color:#e8d08c; margin-top:0; font-size:13px;">⚠️ T2: Ayto ➔ As de Oros</h4>
                                <p class="texto-indicaciones">${{datos.indicaciones.tramo2 || "<i style='color:#a37c95;'>(Sin indicaciones)</i>"}}</p>
                            </div>
                            <div style="background:#160311; padding:12px; border-radius:8px; border-left:4px solid #d4af37;">
                                <h4 style="color:#e8d08c; margin-top:0; font-size:13px;">⚠️ T3: As Oros ➔ Glorieta</h4>
                                <p class="texto-indicaciones">${{datos.indicaciones.tramo3 || "<i style='color:#a37c95;'>(Sin indicaciones)</i>"}}</p>
                            </div>
                            <div style="background:#160311; padding:12px; border-radius:8px; border-left:4px solid #d4af37;">
                                <h4 style="color:#e8d08c; margin-top:0; font-size:13px;">⚠️ T4: Glorieta ➔ Turismo</h4>
                                <p class="texto-indicaciones">${{datos.indicaciones.tramo4 || "<i style='color:#a37c95;'>(Sin indicaciones)</i>"}}</p>
                            </div>
                        </div>
                        
                        <div style="background:#160311; padding:15px; border-radius:8px; border-left:4px solid #5c164e; margin-top:15px;">
                            <h4 style="color:#e8d08c; margin-top:0;">📜 Normativa de la Cuadrilla</h4>
                            <p class="texto-indicaciones">${{datos.indicaciones.normativa || "<i style='color:#a37c95;'>(Sin normativa especificada)</i>"}}</p>
                        </div>
                    </div>
                `;
            }}

            function abrirInfoModal(id) {{
                let st = estadoGlobal[id];
                if (!st) return;
                let tOcupados = st.tramos;
                let html = `<h4 style="color:#d4af37; margin-top:0; margin-bottom:15px; font-size:18px;">📋 Hoja de Ruta de: ${{st.nombre.replace(" (R)","").replace(" (C)","").replace(" (C-Doble)","")}}</h4>`;
                html += `<div class="bloque-ruta"><h5>🌟 PROCESIÓN</h5><ul>`;
                [
                    {{ num: 1, txt: "1. Monserrate ➔ Ayto" }},
                    {{ num: 2, txt: "2. Ayto ➔ As de Oros" }},
                    {{ num: 3, txt: "3. As Oros ➔ Glorieta" }},
                    {{ num: 4, txt: "4. Glorieta ➔ Turismo" }}
                ].forEach(tr => {{ html += generarFilaTramo(tr, st, tOcupados); }});
                html += `</ul></div>`;
                
                html += `<div class="bloque-ruta"><h5>🏠 REGRESO (Solo Trono)</h5><ul>`;
                [
                    {{ num: 5, txt: "5. Turismo ➔ Santiago" }},
                    {{ num: 6, txt: "6. Santiago ➔ Gasolinera" }},
                    {{ num: 7, txt: "7. Gasolinera ➔ San Fco" }}
                ].forEach(tr => {{ html += generarFilaTramo(tr, st, tOcupados); }});
                html += `</ul></div>`;
                document.getElementById('modal-body').innerHTML = html;
                document.getElementById('modal-info').style.display = 'flex';
            }}

            function cerrarModal(ev) {{
                if (!ev || ev.target.id === 'modal-info' || ev.target.className === 'modal-close') {{
                    document.getElementById('modal-info').style.display = 'none';
                }}
            }}

            function actualizarBuscador() {{
                function normalizar(s) {{
                    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                }}
                const val = normalizar(document.getElementById('input-buscador').value);
                const resDiv = document.getElementById('resultado-itinerario');
                if (val.length < 3) {{ resDiv.style.display = 'none'; return; }}

                let idFound = null;
                for (let id in estadoGlobal) {{
                    if (normalizar(estadoGlobal[id].nombre).includes(val)) {{ idFound = id; break; }}
                }}

                if (idFound) {{
                    let st = estadoGlobal[idFound];
                    let tOcupados = st.tramos;
                    resDiv.style.display = 'block';
                    let html = `<h4 style="color:#d4af37; margin-bottom:10px; font-size:16px;">📋 Hoja de Ruta de: ${{st.nombre.replace(" (R)","").replace(" (C)","").replace(" (C-Doble)","")}}</h4>`;
                    html += `<div class="bloque-ruta"><h5>PROCESIÓN</h5><ul>`;
                    [
                        {{ num: 1, txt: "1. Monserrate ➔ Ayto" }},
                        {{ num: 2, txt: "2. Ayto ➔ As de Oros" }},
                        {{ num: 3, txt: "3. As Oros ➔ Glorieta" }},
                        {{ num: 4, txt: "4. Glorieta ➔ Turismo" }}
                    ].forEach(tr => {{ html += generarFilaTramo(tr, st, tOcupados); }});
                    html += `</ul></div>`;
                    html += `<div class="bloque-ruta"><h5>REGRESO (SOLO TRONO)</h5><ul>`;
                    [
                        {{ num: 5, txt: "5. Turismo ➔ Santiago" }},
                        {{ num: 6, txt: "6. Santiago ➔ Gasolinera" }},
                        {{ num: 7, txt: "7. Gasolinera ➔ San Fco" }}
                    ].forEach(tr => {{ html += generarFilaTramo(tr, st, tOcupados); }});
                    html += `</ul></div>`;
                    resDiv.innerHTML = html;
                }} else {{
                    resDiv.style.display = 'none';
                }}
            }}

            function generarFilaTramo(tr, st, tOcupados) {{
                let label = "🕯️ <strong style='color:#884d72'>Cirio (Descanso)</strong>";
                let enCristo = [];
                st.cristo.forEach(t => {{ if((TRAMOS.Trono[t]||[]).includes(tr.num)) enCristo.push(t); }});
                let enCruz = [];
                st.cruz.forEach(t => {{ if((TRAMOS.Cruz[t]||[]).includes(tr.num)) enCruz.push(t); }});

                if (enCristo.length > 0 && enCruz.length > 0) {{
                    label = `💥 <strong style='color:#ff0000; animation: parpadeo 1s infinite;'>¡IMPOSIBLE! (${{enCristo.join('+')}} y ${{enCruz.join('+')}})</strong>`;
                }} else if (enCristo.length > 0) {{
                    label = `💪 <strong style='color:#e8d08c'>Trono (${{enCristo.join(" + ")}})</strong>`;
                }} else if (enCruz.length > 0) {{
                    label = `💪 <strong style='color:#00d2ff'>Cruz (${{enCruz.join('+')}})</strong>`;
                }}
                return `<li><span class="tramo-label">${{tr.txt}}</span> ${{label}}</li>`;
            }}

            function toggleHeatmap() {{
                heatmapActivo = !heatmapActivo;
                const btn = document.getElementById('btn-heatmap');
                btn.innerText = heatmapActivo ? '🔥 Mapa Peso: ON' : '🧊 Mapa Peso: OFF';
                if (heatmapActivo) {{ btn.style.background = '#d4af37'; btn.style.color = '#0c0209'; }} 
                else {{ btn.style.background = '#3d0c2e'; btn.style.color = '#f8f0f5'; }}
                render();
            }}

            function getHeatmapColor(peso, tipo) {{
                if (!peso || peso === 0) return '';
                const base = tipo === 'Trono' ? PESO_TRONO / 36 : PESO_CRUZ / 8;
                const minVal = base - 10;
                let p = (peso - minVal) / (MAX_KG - minVal);
                p = Math.max(0, Math.min(1, p));
                return `hsl(${{(1 - p) * 120}}, 80%, 30%)`;
            }}

            function render() {{
                analizarEstado(); 
                actualizarBuscador(); 
                
                const app = document.getElementById('app');
                app.innerHTML = '';
                
                for (const [tipo, turnos] of Object.entries(datos)) {{
                    if(tipo === "indicaciones" || tipo === "tipo_procesion") continue; 
                    
                    let tituloBloque = tipo === "Trono" ? "TRONO" : "CRUZ INSIGNIA";
                    app.innerHTML += `<h1 style="color:#d4af37; border-bottom: 2px solid #d4af37; padding-bottom:10px; margin-top:40px;">${{tituloBloque}}</h1>`;
                    
                    for (const [idT, varas] of Object.entries(turnos)) {{
                        let gridClass = tipo === "Cruz" ? "grid-cruz" : "grid-trono";
                        let html = `<div class="turno-container"><h2 style="display:flex; justify-content:space-between; align-items:center;">${{idT}} <button class="btn-control btn-danger" style="font-size:10px; padding:4px 12px; text-transform:none; letter-spacing:0;" onclick="vaciarTurno('${{tipo}}', '${{idT}}')">🗑️ Vaciar turno</button></h2><div class="${{gridClass}}">`;
                        
                        for (const [vNom, vData] of Object.entries(varas)) {{
                            const statsVara = calcularStats(vData.Delante.concat(vData.Detras), tipo);
                            html += `<div class="vara"><h3>VARA ${{vNom.toUpperCase()}}</h3>`;
                            
                            ["Delante", "Detras"].forEach(sec => {{
                                const statsSec = calcularStats(vData[sec], tipo);
                                if (sec === "Delante") html += `<div class="stats-box"><b>${{sec.toUpperCase()}}:</b> ${{statsSec.media.toFixed(1)}}cm | ${{statsSec.totalVara.toFixed(1)}}kg</div>`;
                                if (sec === "Detras") html += `<div style="text-align:center; padding-top:10px; margin-bottom:5px; color:#e8d08c; font-size:12px; font-weight:bold; letter-spacing:2px; border-top:1px dashed #3d0c2e;">${{tipo === "Trono" ? "▼ TRONO ▼" : "▼ CRUZ ▼"}}</div>`;
                                
                                html += `<div class="seccion" ondragover="allow(event)">`;
                                vData[sec].forEach((p, i) => {{
                                    const esVacio = p.altura === 0;
                                    const esSobrepeso = p.peso >= MAX_KG;
                                    
                                    let clExtra = ''; let nExtra = ''; let tagFinal = ''; 
                                    let tickHombro = ''; let prefLetra = '';

                                    if (!esVacio) {{
                                        let pref = (p.pref_hombro || "").toLowerCase().trim();
                                        if (pref !== "") {{
                                            if (pref.includes("derech")) {{
                                                prefLetra = ' <span style="color:#888; font-size:9px;">(D)</span>';
                                                if (vNom === "Izquierda") tickHombro = ' <span title="Hombro correcto" style="font-size:11px;">✅</span>';
                                                else if (vNom === "Derecha") tickHombro = ' <span title="Hombro INCORRECTO" style="font-size:11px;">❌</span>';
                                                else if (vNom === "Centro") tickHombro = ' <span title="Debería ir en la Izquierda" style="font-size:11px;">⚠️</span>';
                                            }} else if (pref.includes("izquierd")) {{
                                                prefLetra = ' <span style="color:#888; font-size:9px;">(I)</span>';
                                                if (vNom === "Derecha") tickHombro = ' <span title="Hombro correcto" style="font-size:11px;">✅</span>';
                                                else if (vNom === "Izquierda") tickHombro = ' <span title="Hombro INCORRECTO" style="font-size:11px;">❌</span>';
                                                else if (vNom === "Centro") tickHombro = ' <span title="Debería ir en la Derecha" style="font-size:11px;">⚠️</span>';
                                            }} else if (pref.includes("ambos") || pref.includes("indiferente")) {{
                                                tickHombro = ' <span title="Hombro indiferente" style="font-size:11px;">✅</span>';
                                            }}
                                        }}

                                        if (estadoGlobal[p.id]) {{
                                            let est = estadoGlobal[p.id].estadoStr;
                                            if (est === "baja_censo") {{ clExtra = 'dyn-conflicto'; nExtra = 'dyn-text-conflicto'; tagFinal = ' [BAJA]'; }} 
                                            else if (est === "no_procesiona") {{ clExtra = 'dyn-conflicto'; nExtra = 'dyn-text-conflicto'; tagFinal = ' [NO SALE]'; }} 
                                            else if (est === "conflicto") {{ clExtra = 'dyn-conflicto'; nExtra = 'dyn-text-conflicto'; tagFinal = ' [CRÍTICO]'; }} 
                                            else if (est === "repCruz") {{ clExtra = 'dyn-rep-cruz'; nExtra = 'dyn-text-cruz'; tagFinal = ' (Cruz)'; }} 
                                            else if (est === "repC") {{ clExtra = 'dyn-rep-c'; nExtra = 'dyn-text-c'; tagFinal = ' (Doble)'; }}
                                        }}
                                    }}
                                    
                                    let bgStyle = (heatmapActivo && !esVacio) ? `background-color: ${{getHeatmapColor(p.peso, tipo)}} !important; border-color: transparent;` : '';

                                    html += `
                                        <div class="costalero ${{esVacio ? 'vacio' : ''}} ${{esSobrepeso && !heatmapActivo ? 'sobrepeso' : ''}} ${{clExtra}}" 
                                             style="${{bgStyle}}" title="Hombro: ${{p.pref_hombro || 'Indiferente'}}"
                                             draggable="${{!esVacio}}" ondragstart="drag(event, '${{tipo}}', '${{idT}}', '${{vNom}}', '${{sec}}', ${{i}})" ondrop="drop(event, '${{tipo}}', '${{idT}}', '${{vNom}}', '${{sec}}', ${{i}})">
                                            ${{esVacio ? 
                                                `<input type="text" class="search-p" placeholder="Nombre o altura (ej: 180)..." onkeyup="buscarMini(event, '${{tipo}}','${{idT}}','${{vNom}}','${{sec}}',${{i}})">
                                                 <div id="sug-${{tipo}}-${{idT}}-${{vNom}}-${{sec}}-${{i}}" class="sugerencias" style="display:none"></div>` :
                                                `<span>
                                                    <button style="background:none; border:none; color:#00d2ff; cursor:pointer; padding:0 5px 0 0; font-size:14px;" onclick="abrirInfoModal(${{p.id}}); event.stopPropagation();">ℹ️</button>
                                                    <button style="background:none; border:none; color:#ff4757; cursor:pointer; padding:0 5px 0 0;" onclick="eliminar('${{tipo}}','${{idT}}','${{vNom}}','${{sec}}',${{i}})">🗑️</button>
                                                    <span class="${{nExtra}}">${{p.nombre}}${{prefLetra}} ${{tickHombro}} ${{tagFinal}}</span>
                                                </span>
                                                <span><span style="color:${{heatmapActivo?'#fff':'#d4af37'}}">${{p.altura}}cm</span> <b style="color:${{heatmapActivo?'#fff':'#e8d08c'}}; margin-left:5px">${{p.peso.toFixed(1)}}kg</b></span>`
                                            }}
                                        </div>`;
                                }});
                                html += `</div>`;
                                if (sec === "Detras") html += `<div class="stats-box"><b>${{sec.toUpperCase()}}:</b> ${{statsSec.media.toFixed(1)}}cm | ${{statsSec.totalVara.toFixed(1)}}kg</div>`;
                            }});
                            html += `<div style="text-align:center; padding:10px; border:1px solid #d4af37; border-radius:5px; font-size:12px; color:#d4af37; margin-top:10px;"><b>TOTAL VARA: ${{statsVara.totalVara.toFixed(1)}} kg</b></div></div>`;
                        }}
                        app.innerHTML += html + `</div></div>`;
                    }}
                }}
                
                renderIndicaciones();
            }}

            function calcularStats(p_list, tipo) {{
                let filtrados = p_list.filter(p => p.altura > 0);
                let m = filtrados.length > 0 ? filtrados.reduce((a, b) => a + b.altura, 0) / filtrados.length : 0;
                let tV = 0; let base = tipo === 'Trono' ? PESO_TRONO / 36 : PESO_CRUZ / 8;
                p_list.forEach(p => {{
                    if(p.altura > 0) {{ p.peso = Math.min(MAX_KG, Math.max(0, base + ((p.altura - m) * (base * 0.05)))); tV += p.peso;
                    }} else p.peso = 0;
                }});
                return {{ media: m, totalVara: tV }};
            }}

            function buscarMini(ev, tipo, t, v, s, i) {{
                function normalizar(s) {{
                    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                }}
                const val = normalizar(ev.target.value.trim());
                const sugDiv = document.getElementById(`sug-${{tipo}}-${{t}}-${{v}}-${{s}}-${{i}}`);
                if(val.length < 2) {{ sugDiv.style.display = 'none'; return; }}
                
                const matches = MASTER_LIST.filter(p => 
                    normalizar(p.nombre).includes(val) || 
                    (p.altura && p.altura.toString().includes(val))
                ).slice(0, 8);
                
                sugDiv.innerHTML = '';
                if(matches.length > 0) {{
                    sugDiv.style.display = 'block';
                    matches.forEach(m => {{
                        const div = document.createElement('div');
                        div.className = 'sug-item';
                        div.innerHTML = `${{m.nombre}} (${{m.altura}}cm)`;
                        div.onclick = () => {{ datos[tipo][t][v][s][i] = {{...m}}; render(); guardarMemoria(); }};
                        sugDiv.appendChild(div);
                    }});
                }} else sugDiv.style.display = 'none';
            }}

            let dragging = null;
            function allow(ev) {{ ev.preventDefault(); }}
            function drag(ev, tipo, t, v, s, i) {{ dragging = {{ source: 'slot', tipo, t, v, s, i }}; }}
            function drop(ev, tipo, t, v, s, i) {{
                ev.preventDefault();
                if (!dragging) return;
                if (dragging.source === 'sidebar') {{
                    datos[tipo][t][v][s][i] = {{...dragging.persona}};
                }} else {{
                    let orig = datos[dragging.tipo][dragging.t][dragging.v][dragging.s][dragging.i];
                    datos[dragging.tipo][dragging.t][dragging.v][dragging.s][dragging.i] = datos[tipo][t][v][s][i];
                    datos[tipo][t][v][s][i] = orig;
                }}
                render(); guardarMemoria();
                if (sidebarAbierto) renderSidebar();
            }}
            function eliminar(tipo, t, v, s, i) {{
                if (confirm(`¿Quitar a esta persona?`)) {{
                    datos[tipo][t][v][s][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                    render(); guardarMemoria();
                    if (sidebarAbierto) renderSidebar();
                }}
            }}

            // ==========================================
            // PANEL LATERAL CENSO
            // ==========================================
            let sidebarAbierto = false;
            function toggleSidebar() {{
                sidebarAbierto = !sidebarAbierto;
                document.getElementById('sidebar').classList.toggle('abierto', sidebarAbierto);
                document.getElementById('sidebar-toggle').classList.toggle('abierto', sidebarAbierto);
                document.getElementById('sidebar-toggle').textContent = sidebarAbierto ? '✕ CERRAR' : '👥 CENSO';
                if (sidebarAbierto) renderSidebar();
            }}

            function normalizarSidebar(s) {{
                return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            }}

            function getIdsAsignados() {{
                const ids = new Set();
                for (let tipo of ['Trono', 'Cruz']) {{
                    if (!datos[tipo]) continue;
                    for (let t of Object.values(datos[tipo])) {{
                        for (let v of Object.values(t)) {{
                            for (let sec of ['Delante', 'Detras']) {{
                                if (v[sec]) v[sec].forEach(p => {{ if (p.id && p.id !== -1) ids.add(p.id); }});
                            }}
                        }}
                    }}
                }}
                return ids;
            }}

            function renderSidebar() {{
                const val = normalizarSidebar(document.getElementById('sidebar-search').value.trim());
                const idsAsig = getIdsAsignados();
                let lista = MASTER_LIST.filter(p => !val || normalizarSidebar(p.nombre).includes(val) || (p.altura && p.altura.toString().includes(val)));
                lista.sort((a, b) => {{
                    const aA = idsAsig.has(a.id), bA = idsAsig.has(b.id);
                    if (aA !== bA) return aA ? 1 : -1;
                    return b.altura - a.altura;
                }});
                const div = document.getElementById('sidebar-lista');
                div.innerHTML = '';
                lista.forEach(p => {{
                    const yaAsig = idsAsig.has(p.id);
                    const item = document.createElement('div');
                    item.className = 'sidebar-item' + (yaAsig ? ' ya-asignado' : '');
                    item.draggable = true;
                    item.title = yaAsig ? 'Ya asignado en el cuadrante' : 'Arrastra a cualquier hueco';
                    
                    let prefLetra = '';
                    let pref = (p.pref_hombro || "").toLowerCase().trim();
                    if (pref.includes("derech")) prefLetra = ' <span style="color:#888; font-size:10px;">(D)</span>';
                    else if (pref.includes("izquierd")) prefLetra = ' <span style="color:#888; font-size:10px;">(I)</span>';
                    
                    item.innerHTML = `<span>${{p.nombre}}${{prefLetra}}</span><span style="color:#d4af37;font-weight:bold;">${{p.altura}}cm</span>`;
                    item.ondragstart = () => {{ dragging = {{ source: 'sidebar', persona: {{...p}} }}; }};
                    div.appendChild(item);
                }});
                const asig = MASTER_LIST.filter(p => idsAsig.has(p.id)).length;
                document.getElementById('sidebar-contador').textContent = `${{asig}} de ${{MASTER_LIST.length}} asignados`;
            }}

            window.onload = init; 
        </script>
    </body>
    </html>
    """
    with open("visualizador_viernes.html", "w", encoding="utf-8") as f: 
        f.write(html)