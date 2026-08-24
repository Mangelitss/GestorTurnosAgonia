import json
import time

def generar_datos_viacrucis(seleccionados, num_turnos, autocompletar):
    pool = sorted(seleccionados, key=lambda x: x.get('altura', 0), reverse=True)
    turnos = {}
    
    for i in range(num_turnos):
        t_name = f"Tramo {i+1}"
        personas_turno = []
        if autocompletar and pool:
            start = (i * 8) % max(len(pool), 1) if pool else 0
            for j in range(8):
                if pool:
                    idx = (start + j) % len(pool)
                    personas_turno.append(pool[idx].copy())
                else:
                    personas_turno.append({"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
        else:
            personas_turno = [{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1} for _ in range(8)]
            
        turnos[t_name] = distribuir_estructura(personas_turno)
        
    return {"tipo_procesion": "via_crucis", "ViaCrucis": turnos}

def distribuir_estructura(personas):
    varas = ["Izquierda", "Derecha"]
    res = {v: {"Delante": [], "Detras": []} for v in varas}
    
    reales = [p for p in personas if p.get('altura', 0) > 0]
    huecos = [p for p in personas if p.get('altura', 0) == 0]
    
    # Delante
    reales.sort(key=lambda x: x.get('altura', 0), reverse=True)
    for _ in range(2):
        fila = []
        for _ in range(2): 
            fila.append(reales.pop(0) if reales else huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
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
        
    # Detras
    reales.sort(key=lambda x: x.get('altura', 0))
    for _ in range(2):
        fila = []
        for _ in range(2): 
            fila.append(reales.pop(0) if reales else huecos.pop(0) if huecos else {"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1})
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

def generar_html_viacrucis(datos_gen, master_list, seleccionados_ids):
    turnos_json = json.dumps(datos_gen)
    master_json = json.dumps(master_list)
    sel_json = json.dumps(seleccionados_ids)
    marca_tiempo = str(int(time.time()))

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Vía Crucis - Gestor de Turnos</title>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #0c0209; color: #f8f0f5; padding: 20px; }}
            .controles {{ position: sticky; top: 0; background: #1a0514; padding: 15px; z-index: 100; border-bottom: 2px solid #d4af37; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }}
            
            .turno-container {{ background: #1a0514; padding: 20px; margin-bottom: 40px; border-radius: 15px; border: 1px solid #3d0c2e; box-shadow: 0 0 15px rgba(212, 175, 55, 0.05); }}
            .turno-container h2 {{ color: #d4af37; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #3d0c2e; padding-bottom: 10px; }}
            .grid-cruz {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 700px; margin: 0 auto; }}
            .vara {{ background: #23061b; padding: 15px; border-radius: 10px; border-top: 5px solid #d4af37; }}
            .vara h3 {{ color: #e8d08c; margin: 0 0 10px 0; font-size: 14px; text-align: center; }}
            .seccion {{ background: #160311; padding: 10px; margin: 10px 0; border-radius: 5px; min-height: 80px; border: 1px dashed #4a1038; }}
            
            .costalero {{ background: #3d0c2e; border: 1px solid #571342; margin: 5px 0; padding: 8px; border-radius: 4px; cursor: grab; display: flex; justify-content: space-between; align-items: center; font-size: 11px; transition: 0.3s; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }}
            .costalero:active {{ cursor: grabbing; }}
            .costalero.vacio {{ border: 1px dashed #571342; background: #0c0209; color: #884d72; flex-direction: column; align-items: stretch; text-shadow: none; overflow: visible; position: relative; }}
            
            .btn-control {{ background: #3d0c2e; color: #f8f0f5; border: 1px solid #d4af37; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; margin-left: 5px; text-transform: uppercase; transition: 0.3s; }}
            .btn-control:hover {{ background: #571342; box-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }}
            .btn-export {{ background: #d4af37; color: #000; border-color: #b5952f; }}
            .btn-export:hover {{ background: #b5952f; color:#000; }}
            .btn-danger {{ background: #b30000; border-color: #ff4d4d; }}
            .btn-danger:hover {{ background: #ff4d4d; color: #fff; box-shadow: 0 0 8px rgba(255, 77, 77, 0.4); }}
            .btn-load {{ background: #17517e; border-color: #2980b9; }}
            .btn-load:hover {{ background: #1f6b9c; }}

            /* NUEVA ESTRUCTURA VISUAL VÍA CRUCIS */
            .vc-layout {{ max-width: 560px; margin: 0 auto; }}
            .vc-label {{ text-align:center; padding: 8px; color:#e8d08c; font-size:13px; font-weight:bold; letter-spacing:2px; border: 1px dashed #3d0c2e; border-radius:4px; margin: 8px 0; }}
            .vc-cristo {{ text-align:center; padding: 14px 20px; background:#23061b; border:2px solid #d4af37; border-radius:8px; color:#d4af37; font-size:16px; font-weight:bold; letter-spacing:3px; margin: 12px 0; box-shadow: 0 0 15px rgba(212,175,55,0.15); }}
            .vc-row {{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 4px 0; }}
            
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
            .sidebar-item:active {{ cursor: grabbing; }}
            .sidebar-item:hover {{ background: #571342; border-color: #d4af37; }}
            .sidebar-item.ya-asignado {{ opacity: 0.38; border-style: dashed; cursor: grab; }}
        </style>
    </head>
    <body>
        <button id="sidebar-toggle" onclick="toggleSidebar()">👥 CENSO</button>
        <div id="sidebar">
            <div id="sidebar-header">
                <h3>👥 Costaleros — Vía Crucis</h3>
                <input type="text" id="sidebar-search" placeholder="Busca nombre o altura en todo el censo..." oninput="renderSidebar()">
                <div id="sidebar-contador"></div>
            </div>
            <div id="sidebar-lista"></div>
        </div>
        
        <div class="controles">
            <div>
                <div style="font-size:18px; font-weight:bold; color:#d4af37;">VÍA CRUCIS - GESTOR DE TURNOS</div>
                <div style="font-size:11px; color:#a37c95; margin-top: 3px;">Indicador de preferencia de hombro: ✅ Hombro Correcto</div>
            </div>
            <div>
                <input type="file" id="file-input" accept=".json" style="display: none;" onchange="cargarJSON(event)">
                <button class="btn-control btn-danger" onclick="vaciarCuadrante()">🗑️ VACIAR CUADRANTE</button>
                <button class="btn-control btn-load" onclick="document.getElementById('file-input').click()">📂 CARGAR DATOS</button>
                <button class="btn-control" onclick="exportarPDF()">📄 EXPORTAR PDF</button>
                <button class="btn-control btn-export" onclick="descargarDatosJSON()">💾 DESCARGAR DATOS</button>
            </div>
        </div>

        <div style="max-width: 700px; margin: 30px auto 0 auto;">
            <div style="background:#23061b; padding:15px; border-left:5px solid #d4af37; margin-bottom:15px; border-radius:4px;">
                <h3 style="margin:0; color:#d4af37;">⛪ ESTRUCTURA DEL VÍA CRUCIS</h3>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #e8d08c; line-height: 1.6;">
                    Cada tramo: <b>2 costaleros delante</b> (Izq + Der) · <b>CRISTO</b> · <b>2 costaleros detrás</b> (Izq + Der) = 8 costaleros por relevo.
                </p>
            </div>

            <div style="background:#1a0514; padding:15px; border:1px solid #3d0c2e; margin-bottom:30px; border-radius:4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                <h3 style="margin:0 0 10px 0; color:#d4af37; font-size: 14px;">🔍 BUSCADOR DE COSTALEROS EN TRAMOS</h3>
                <p style="margin: 0 0 10px 0; font-size: 11px; color: #a37c95;">Escribe el nombre de un costalero para ver en qué tramo, vara y posición sale. Si lo has asignado varias veces, te aparecerá duplicado aquí abajo.</p>
                <input type="text" id="buscador-global" placeholder="Escribe el nombre a buscar..." onkeyup="buscarCostaleroGlobal()" style="width:100%; padding:8px; border-radius:4px; border:1px solid #3d0c2e; background:#0c0209; color:#d4af37; font-size:12px; outline:none; box-sizing:border-box;">
                <div id="res-buscador-global" style="margin-top:10px;"></div>
            </div>
        </div>

        <div id="app"></div>

        <script>
            const TS_PYTHON = "{marca_tiempo}";
            const DATOS_INICIALES = {turnos_json};
            const MASTER_LIST = {master_json};
            const SELECCIONADOS_IDS = {sel_json};
            
            let datos = {{}};

            function init() {{
                let savedTs = localStorage.getItem('viacrucis_ts');
                let savedDatos = localStorage.getItem('viacrucis_datos');
                if (savedDatos && savedTs === TS_PYTHON) {{
                    datos = JSON.parse(savedDatos);
                }} else {{
                    datos = JSON.parse(JSON.stringify(DATOS_INICIALES));
                    localStorage.setItem('viacrucis_ts', TS_PYTHON);
                    localStorage.setItem('viacrucis_datos', JSON.stringify(datos));
                }}
                render();
            }}

            function guardarMemoria() {{
                localStorage.setItem('viacrucis_datos', JSON.stringify(datos));
            }}

            function descargarDatosJSON() {{
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datos, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "Distribucion_ViaCrucis.json");
                document.body.appendChild(dlAnchorElem);
                dlAnchorElem.click();
                dlAnchorElem.remove();
            }}

            function vaciarCuadrante() {{
                if(confirm("⚠️ ¿VACIAR el cuadrante completo?")) {{
                    for (let t of Object.keys(datos.ViaCrucis)) {{
                        for (let v of ["Izquierda", "Derecha"]) {{
                            for (let sec of ["Delante", "Detras"]) {{
                                for (let i = 0; i < datos.ViaCrucis[t][v][sec].length; i++) {{
                                    datos.ViaCrucis[t][v][sec][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                                }}
                            }}
                        }}
                    }}
                    render(); guardarMemoria(); buscarCostaleroGlobal();
                }}
            }}

            function vaciarTurno(idT) {{
                if(confirm(`⚠️ ¿Vaciar solo el ${{idT}}?`)) {{
                    for (let v of ["Izquierda", "Derecha"]) {{
                        for (let sec of ["Delante", "Detras"]) {{
                            for (let i = 0; i < datos.ViaCrucis[idT][v][sec].length; i++) {{
                                datos.ViaCrucis[idT][v][sec][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                            }}
                        }}
                    }}
                    render(); guardarMemoria(); buscarCostaleroGlobal();
                }}
            }}

            function buscarCostaleroGlobal() {{
                const inputVal = document.getElementById('buscador-global').value;
                const resDiv = document.getElementById('res-buscador-global');
                if (!inputVal) {{
                    resDiv.innerHTML = '';
                    return;
                }}
                const query = normalizarSidebar(inputVal);
                if (query.length < 2) {{
                    resDiv.innerHTML = '';
                    return;
                }}

                let encontrados = [];
                for (const [idT, varas] of Object.entries(datos.ViaCrucis)) {{
                    for (const v of ["Izquierda", "Derecha"]) {{
                        for (const sec of ["Delante", "Detras"]) {{
                            for (let idx = 0; idx < varas[v][sec].length; idx++) {{
                                const p = varas[v][sec][idx];
                                if (p && p.id !== -1 && p.altura !== 0) {{
                                    if (normalizarSidebar(p.nombre).includes(query)) {{
                                        encontrados.push(`
                                            <div style="background:#3d0c2e; padding:8px; margin-bottom:5px; border-radius:4px; font-size:12px; color:#f8f0f5; border-left: 3px solid #d4af37;">
                                                👤 <b>${{p.nombre}}</b> está en <b>${{idT}}</b> ➔ Vara <b>${{v}}</b> ➔ <b>${{sec}}</b> (Posición: ${{idx+1}})
                                            </div>
                                        `);
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}

                if (encontrados.length > 0) {{
                    resDiv.innerHTML = encontrados.join('');
                }} else {{
                    resDiv.innerHTML = `<div style="font-size:12px; color:#a37c95;">No se han encontrado resultados en el cuadrante actual.</div>`;
                }}
            }}

            function render() {{
                const app = document.getElementById('app');
                app.innerHTML = '';

                for (const [idT, varas] of Object.entries(datos.ViaCrucis)) {{
                    let html = `<div class="turno-container"><h2 style="display:flex; justify-content:space-between; align-items:center;">${{idT}} <button class="btn-control btn-danger" style="font-size:10px; padding:4px 12px; text-transform:none; letter-spacing:0;" onclick="vaciarTurno('${{idT}}')">🗑️ Vaciar tramo</button></h2>`;
                    html += `<div class="vc-layout">`;

                    function celdaVC(p, idT2, vNom, sec, i) {{
                        const esVacio = p.altura === 0;
                        let tickHombro = ''; let prefLetra = '';
                        if (!esVacio) {{
                            let pref = (p.pref_hombro || "").toLowerCase().trim();
                            if (pref.includes("derech")) {{
                                prefLetra = ' <span style="color:#888; font-size:9px;">(D)</span>';
                                tickHombro = vNom === "Izquierda"
                                    ? ' <span title="Hombro correcto" style="font-size:11px;">✅</span>'
                                    : ' <span title="Hombro incorrecto" style="font-size:11px;">❌</span>';
                            }} else if (pref.includes("izquierd")) {{
                                prefLetra = ' <span style="color:#888; font-size:9px;">(I)</span>';
                                tickHombro = vNom === "Derecha"
                                    ? ' <span title="Hombro correcto" style="font-size:11px;">✅</span>'
                                    : ' <span title="Hombro incorrecto" style="font-size:11px;">❌</span>';
                            }}
                        }}
                        
                        // NOTA: Se ha añadido ondragover="allow(event)" para que permita soltar (Drop)
                        return `<div class="costalero ${{esVacio ? 'vacio' : ''}}"
                                     draggable="true"
                                     ondragstart="drag(event,'${{idT2}}','${{vNom}}','${{sec}}',${{i}})"
                                     ondragover="allow(event)"
                                     ondrop="drop(event,'${{idT2}}','${{vNom}}','${{sec}}',${{i}})">
                            ${{esVacio ?
                                `<input type="text" class="search-p" placeholder="Buscar / Arrastrar aquí..." onkeyup="buscarMini(event,'${{idT2}}','${{vNom}}','${{sec}}',${{i}})">
                                 <div id="sug-${{idT2}}-${{vNom}}-${{sec}}-${{i}}" class="sugerencias" style="display:none"></div>` :
                                `<span>
                                    <button style="background:none;border:none;color:#ff4757;cursor:pointer;padding:0 5px 0 0;" onclick="eliminar('${{idT2}}','${{vNom}}','${{sec}}',${{i}})">🗑️</button>
                                    <span>${{p.nombre}}${{prefLetra}} ${{tickHombro}}</span>
                                 </span>
                                 <span style="color:#d4af37;font-weight:bold;">${{p.altura}}cm</span>`
                            }}
                        </div>`;
                    }}

                    // DELANTE
                    html += `<div class="vc-label">▲ &nbsp; DELANTE &nbsp; ▲</div>`;
                    for (let idx = 0; idx < varas["Izquierda"]["Delante"].length; idx++) {{
                        html += `<div class="vc-row">`;
                        html += celdaVC(varas["Izquierda"]["Delante"][idx], idT, "Izquierda", "Delante", idx);
                        html += celdaVC(varas["Derecha"]["Delante"][idx],   idT, "Derecha",   "Delante", idx);
                        html += `</div>`;
                    }}

                    // CRISTO
                    html += `<div class="vc-cristo">✝ &nbsp; CRISTO &nbsp; ✝</div>`;

                    // DETRÁS
                    for (let idx = 0; idx < varas["Izquierda"]["Detras"].length; idx++) {{
                        html += `<div class="vc-row">`;
                        html += celdaVC(varas["Izquierda"]["Detras"][idx], idT, "Izquierda", "Detras", idx);
                        html += celdaVC(varas["Derecha"]["Detras"][idx],   idT, "Derecha",   "Detras", idx);
                        html += `</div>`;
                    }}
                    html += `<div class="vc-label">▼ &nbsp; DETRÁS &nbsp; ▼</div>`;

                    html += `</div></div>`;
                    app.innerHTML += html;
                }}
            }}

            function cargarJSON(event) {{
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {{
                    try {{
                        const loadedData = JSON.parse(e.target.result);
                        if (loadedData.tipo_procesion && loadedData.tipo_procesion !== "via_crucis") {{
                            alert("❌ ERROR: Este archivo no pertenece a un Vía Crucis.");
                            event.target.value = '';
                            return;
                        }}
                        if (loadedData.ViaCrucis) {{
                            datos = loadedData;
                            localStorage.setItem('viacrucis_ts', TS_PYTHON);
                            localStorage.setItem('viacrucis_datos', JSON.stringify(datos));
                            render();
                            buscarCostaleroGlobal();
                            if (sidebarAbierto) renderSidebar();
                        }} else {{
                            alert("❌ El archivo no tiene la estructura correcta de Vía Crucis.");
                        }}
                    }} catch(err) {{
                        alert("❌ Error al leer el archivo: " + err.message);
                    }}
                    event.target.value = '';
                }};
                reader.readAsText(file);
            }}

            function exportarPDF() {{
                let htmlPDF = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
                <title>Vía Crucis - Informe Oficial</title>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Open+Sans:wght@400;600;800&display=swap');
                    body {{ font-family: 'Open Sans', sans-serif; background:#f4f6f8; color:#333; margin:0; padding:20px; }}
                    .btn-pdf {{ background:#4F1243; color:#fff; padding:12px 25px; border-radius:5px; font-weight:bold; cursor:pointer; border:none; font-size:14px; text-transform:uppercase; display:block; margin-bottom:20px; }}
                    .container {{ max-width:800px; margin:0 auto; background:#fff; padding:40px; box-shadow:0 0 15px rgba(0,0,0,.1); border-top:8px solid #4F1243; }}
                    h1 {{ color:#4a148c; font-family:'Cinzel',serif; font-size:18px; text-transform:uppercase; margin:0 0 4px; }}
                    h2 {{ color:#b5952f; font-size:14px; margin:0 0 20px; letter-spacing:1px; }}
                    .tramo {{ border:1px solid #e0e0e0; border-left:5px solid #4F1243; border-radius:6px; margin-bottom:20px; padding:15px; page-break-inside:avoid; }}
                    .tramo h3 {{ color:#4F1243; margin:0 0 12px; font-size:15px; text-transform:uppercase; }}
                    .estructura {{ display:grid; grid-template-columns:1fr; max-width:400px; margin:0 auto; }}
                    .label-sec {{ text-align:center; background:#f4f6f8; padding:5px; font-weight:bold; font-size:11px; letter-spacing:2px; color:#4F1243; border-radius:4px; margin:5px 0; }}
                    .cristo-sep {{ text-align:center; background:#4F1243; color:#d4af37; padding:8px; font-weight:bold; font-size:13px; letter-spacing:3px; border-radius:4px; margin:8px 0; }}
                    .fila {{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:3px 0; }}
                    .celda {{ background:#f9f9f9; border:1px solid #ddd; padding:6px 10px; border-radius:4px; font-size:12px; }}
                    .celda.vacio {{ color:#aaa; font-style:italic; }}
                    @media print {{ .btn-pdf {{display:none;}} body {{background:#fff;padding:0;}} .container {{box-shadow:none;border-top:none;}} }}
                </style></head><body>
                <button class="btn-pdf" onclick="html2pdf().set({{margin:10,filename:'ViaCrucis.pdf',image:{{type:'jpeg',quality:0.98}},html2canvas:{{scale:2}},jsPDF:{{unit:'mm',format:'a4',orientation:'portrait'}}}}).from(document.getElementById('pdf-content')).save()">📥 DESCARGAR PDF</button>
                <div class="container" id="pdf-content">
                <h1>OFS Muy Ilustre Mayordomía de Nuestro Padre Jesús Nazareno</h1>
                <h2>Distribución Oficial del Vía Crucis</h2>`;

                for (const [idT, varas] of Object.entries(datos.ViaCrucis)) {{
                    htmlPDF += `<div class="tramo"><h3>${{idT}}</h3><div class="estructura">`;
                    htmlPDF += `<div class="label-sec">▲ DELANTE ▲</div>`;

                    const dI = varas["Izquierda"]["Delante"];
                    const dD = varas["Derecha"]["Delante"];
                    for (let idx = 0; idx < dI.length; idx++) {{
                        const pI = dI[idx], pD = dD[idx];
                        htmlPDF += `<div class="fila">
                            <div class="celda ${{pI.altura===0?'vacio':''}}">${{pI.altura===0?'HUECO LIBRE':pI.nombre+' ('+pI.altura+'cm)'}}</div>
                            <div class="celda ${{pD.altura===0?'vacio':''}}">${{pD.altura===0?'HUECO LIBRE':pD.nombre+' ('+pD.altura+'cm)'}}</div>
                        </div>`;
                    }}

                    htmlPDF += `<div class="cristo-sep">✝ CRISTO ✝</div>`;

                    const tI = varas["Izquierda"]["Detras"];
                    const tD = varas["Derecha"]["Detras"];
                    for (let idx = 0; idx < tI.length; idx++) {{
                        const pI = tI[idx], pD = tD[idx];
                        htmlPDF += `<div class="fila">
                            <div class="celda ${{pI.altura===0?'vacio':''}}">${{pI.altura===0?'HUECO LIBRE':pI.nombre+' ('+pI.altura+'cm)'}}</div>
                            <div class="celda ${{pD.altura===0?'vacio':''}}">${{pD.altura===0?'HUECO LIBRE':pD.nombre+' ('+pD.altura+'cm)'}}</div>
                        </div>`;
                    }}

                    htmlPDF += `<div class="label-sec">▼ DETRÁS ▼</div></div></div>`;
                }}

                htmlPDF += `</div></body></html>`;
                const ventana = window.open('', '_blank');
                ventana.document.write(htmlPDF);
                ventana.document.close();
            }}

            function buscarMini(ev, t, v, s, i) {{
                function normalizar(st) {{ return st.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }}
                const val = normalizar(ev.target.value.trim());
                const sugDiv = document.getElementById(`sug-${{t}}-${{v}}-${{s}}-${{i}}`);
                if(val.length < 2) {{ sugDiv.style.display = 'none'; return; }}
                
                const matches = MASTER_LIST.filter(p => normalizar(p.nombre).includes(val) || (p.altura && p.altura.toString().includes(val))).slice(0, 8);
                
                sugDiv.innerHTML = '';
                if(matches.length > 0) {{
                    sugDiv.style.display = 'block';
                    matches.forEach(m => {{
                        const div = document.createElement('div');
                        div.className = 'sug-item';
                        div.innerHTML = `${{m.nombre}} (${{m.altura}}cm)`;
                        div.onclick = () => {{ 
                            datos.ViaCrucis[t][v][s][i] = {{...m}}; 
                            render(); guardarMemoria(); buscarCostaleroGlobal(); 
                        }};
                        sugDiv.appendChild(div);
                    }});
                }} else sugDiv.style.display = 'none';
            }}

            let dragging = null;
            function allow(ev) {{ ev.preventDefault(); }}
            function drag(ev, t, v, s, i) {{ dragging = {{ source: 'slot', t, v, s, i }}; }}
            
            function drop(ev, t, v, s, i) {{
                ev.preventDefault();
                if (!dragging) return;
                
                let targetSlot = datos.ViaCrucis[t][v][s][i];

                if (dragging.source === 'sidebar') {{
                    // Si viene del menú lateral y hay alguien, pedimos confirmación
                    if (targetSlot && targetSlot.id !== -1 && targetSlot.altura !== 0) {{
                        if (!confirm(`⚠️ El hueco ya está ocupado por ${{targetSlot.nombre}}.\\n¿Deseas reemplazarlo por ${{dragging.persona.nombre}}?`)) {{
                            return; // Se cancela la acción
                        }}
                    }}
                    datos.ViaCrucis[t][v][s][i] = {{...dragging.persona}};
                }} else {{
                    // Intercambio (Swap) entre dos personas que ya están en el cuadrante
                    let orig = datos.ViaCrucis[dragging.t][dragging.v][dragging.s][dragging.i];
                    datos.ViaCrucis[dragging.t][dragging.v][dragging.s][dragging.i] = targetSlot;
                    datos.ViaCrucis[t][v][s][i] = orig;
                }}
                
                render(); guardarMemoria();
                if (sidebarAbierto) renderSidebar();
                buscarCostaleroGlobal(); // Actualizar resultados del buscador
            }}
            
            function eliminar(t, v, s, i) {{
                datos.ViaCrucis[t][v][s][i] = {{"nombre": "HUECO LIBRE", "altura": 0, "peso": 0, "id": -1}};
                render(); guardarMemoria();
                if (sidebarAbierto) renderSidebar();
                buscarCostaleroGlobal();
            }}

            // PANEL LATERAL CENSO
            let sidebarAbierto = false;
            function toggleSidebar() {{
                sidebarAbierto = !sidebarAbierto;
                document.getElementById('sidebar').classList.toggle('abierto', sidebarAbierto);
                document.getElementById('sidebar-toggle').classList.toggle('abierto', sidebarAbierto);
                document.getElementById('sidebar-toggle').textContent = sidebarAbierto ? '✕ CERRAR' : '👥 CENSO';
                if (sidebarAbierto) renderSidebar();
            }}

            function normalizarSidebar(s) {{ return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }}

            function getIdsAsignados() {{
                const ids = new Set();
                for (let t of Object.values(datos.ViaCrucis)) {{
                    for (let v of Object.values(t)) {{
                        for (let sec of ['Delante', 'Detras']) {{
                            if (v[sec]) {{
                                v[sec].forEach(p => {{ if (p.id && p.id !== -1) ids.add(p.id); }});
                            }}
                        }}
                    }}
                }}
                return ids;
            }}

            function renderSidebar() {{
                const val = normalizarSidebar(document.getElementById('sidebar-search').value.trim());
                const idsAsig = getIdsAsignados();
                
                let lista = MASTER_LIST;
                if (!val) {{
                    lista = lista.filter(p => SELECCIONADOS_IDS.includes(p.id));
                }} else {{
                    lista = lista.filter(p => normalizarSidebar(p.nombre).includes(val) || (p.altura && p.altura.toString().includes(val)));
                }}
                
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
                    item.title = yaAsig ? 'Ya asignado' : 'Arrastra a cualquier hueco';
                    
                    let prefLetra = '';
                    let pref = (p.pref_hombro || "").toLowerCase().trim();
                    if (pref.includes("derech")) prefLetra = ' <span style="color:#888; font-size:10px;">(D)</span>';
                    else if (pref.includes("izquierd")) prefLetra = ' <span style="color:#888; font-size:10px;">(I)</span>';
                    
                    item.innerHTML = `<span>${{p.nombre}}${{prefLetra}}</span><span style="color:#d4af37;font-weight:bold;">${{p.altura}}cm</span>`;
                    item.ondragstart = () => {{ dragging = {{ source: 'sidebar', persona: {{...p}} }}; }};
                    div.appendChild(item);
                }});
                
                const asig = MASTER_LIST.filter(p => idsAsig.has(p.id)).length;
                document.getElementById('sidebar-contador').textContent = `${{asig}} asignados actualmente`;
            }}

            window.onload = init; 
        </script>
    </body>
    </html>
    """
    with open("visualizador_viacrucis.html", "w", encoding="utf-8") as f: 
        f.write(html)