import json
import math
import random

# ==========================================
# CONFIGURACIÓN TÉCNICA
# ==========================================
PESO_TRONO_KG = 2000    
LIMITE_PESO_PERSONA = 90  
NUM_TURNOS = ""         

def cargar_datos():
    try:
        with open('datos.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error: {e}")
        return []

def generar_turnos_base(costaleros, n_config):
    # =================================================================
    # ⚙️ CONFIGURACIÓN EXCLUSIVA PARA EL TURNO A
    # Indica cuántos costaleros conforman el Bloque de Élite (Máximo 36).
    # Si pones 36, el Turno A se llenará entero. Si pones 30, dejará 6 huecos libres.
    # =================================================================
    PLAZAS_TURNO_A = 36 
    
    # 1. Ordenamos todo el censo por altura (de mayor a menor)
    pool = sorted(costaleros, key=lambda x: x['altura'], reverse=True)
    n_turnos = int(n_config) if n_config != "" else math.ceil(len(pool) / 36)
    
    # 2. Separar al Bloque de Élite (Turno A)
    plazas_reales_A = min(36, PLAZAS_TURNO_A)
    turno_a_personas = pool[:plazas_reales_A]
    
    # REGLA ESTRICTA: Las personas del Turno A quedan blindadas (No repiten NUNCA)
    for p in turno_a_personas:
        p["puede_repetir"] = False
        
    # 3. Inicializamos la lista de turnos (A, B, C...)
    turnos_list = [[] for _ in range(n_turnos)]
    
    # Llenamos el Turno A
    for p in turno_a_personas:
        turnos_list[0].append({**p, "bloqueado": False})
    # Rellenamos con huecos libres si has configurado menos de 36
    while len(turnos_list[0]) < 36:
        turnos_list[0].append({"nombre": "HUECO LIBRE", "altura": 0, "bloqueado": False})
        
    # 4. Rellenamos el resto de turnos de forma secuencial
    idx_persona_actual = plazas_reales_A
    for t in range(1, n_turnos):
        # Cogemos las siguientes 36 personas (Ej: para el Turno B, esto garantiza homogeneidad máxima)
        personas_este_turno = pool[idx_persona_actual : idx_persona_actual + 36]
        idx_persona_actual += len(personas_este_turno)
        
        for p in personas_este_turno:
            turnos_list[t].append({**p, "bloqueado": False})
            
        # Si sobran huecos en el turno actual (Ej: Turno C)
        if len(turnos_list[t]) < 36:
            # Buscamos en el TURNO ANTERIOR (Ej: el B) a los repetidores válidos
            # Excluimos huecos libres y a gente que ya estuviera repitiendo
            turno_anterior = [p for p in turnos_list[t-1] if p['altura'] > 0 and not p.get('nombre', '').endswith(" (R)")]
            
            # Filtramos solo a los que tienen la variable "puede_repetir" en True
            repetidores_validos = [p for p in turno_anterior if p.get("puede_repetir", True)]
            
            # Como el turno anterior se ordenó de mayor a menor, los más bajos están al final.
            # Invertimos la lista para extraer a los más bajitos primero.
            repetidores_validos.reverse()
            
            idx_rep = 0
            while len(turnos_list[t]) < 36:
                if idx_rep < len(repetidores_validos):
                    # Clonamos a la persona, le ponemos la (R) y la añadimos
                    p_rep = repetidores_validos[idx_rep].copy()
                    p_rep["nombre"] += " (R)"
                    p_rep["bloqueado"] = False
                    turnos_list[t].append(p_rep)
                    idx_rep += 1
                else:
                    # Si ya no quedan más repetidores válidos, metemos hueco
                    turnos_list[t].append({"nombre": "HUECO LIBRE", "altura": 0, "bloqueado": False})

    # 5. Formatear y distribuir en Varas (Delante / Detrás)
    resultado = {}
    varas = ["Izquierda", "Centro", "Derecha"]
    
    for t in range(n_turnos):
        id_t = f"Turno {chr(65 + t)}"
        bloque = turnos_list[t]
        
        # Ordenamos los de la mitad delantera (mandando los Huecos Libres al final)
        bloque.sort(key=lambda x: (x['altura'] == 0, -x['altura']))
        resultado[id_t] = {v: {"Delante": [], "Detras": []} for v in varas}
        
        # Repartimos las 18 personas delanteras
        for i in range(6):
            for v in varas: 
                resultado[id_t][v]["Delante"].append(bloque.pop(0))
                
        # Para la mitad trasera, ordenamos de forma inversa para equilibrar el peso visualmente
        bloque.sort(key=lambda x: (x['altura'] == 0, x['altura']))
        # Repartimos las 18 personas traseras
        for i in range(6):
            for v in varas: 
                resultado[id_t][v]["Detras"].append(bloque.pop(0))
                
    return resultado

def generar_html_interactivo(turnos, master_list):
    turnos_json = json.dumps(turnos)
    master_json = json.dumps(master_list)

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Gestor Inteligente Agonía</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
            /* PALETA COFRADE: Morado Terciopelo (#3d0c2e, #2a0820) y Oro (#d4af37) */
            body {{ font-family: 'Segoe UI', sans-serif; background: #0c0209; color: #f8f0f5; padding: 20px; }}
            .controles {{ position: sticky; top: 0; background: #1a0514; padding: 15px; z-index: 100; border-bottom: 2px solid #d4af37; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }}
            
            /* Evitamos que el PDF corte un trono por la mitad */
            .turno-container {{ background: #1a0514; padding: 20px; margin-bottom: 40px; border-radius: 15px; border: 1px solid #3d0c2e; page-break-inside: avoid; box-shadow: 0 0 15px rgba(212, 175, 55, 0.05); }}
            .turno-container h2 {{ color: #d4af37; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #3d0c2e; padding-bottom: 10px; }}
            
            .grid-trono {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
            .vara {{ background: #23061b; padding: 15px; border-radius: 10px; border-top: 5px solid #d4af37; }}
            .vara h3 {{ color: #e8d08c; margin-top: 0; font-size: 14px; }}
            .seccion {{ background: #160311; padding: 10px; margin: 10px 0; border-radius: 5px; min-height: 150px; border: 1px dashed #4a1038; }}
            
            /* Clases del Costalero */
            .costalero {{ background: #3d0c2e; border: 1px solid #571342; margin: 5px 0; padding: 8px; border-radius: 4px; cursor: move; display: flex; justify-content: space-between; align-items: center; font-size: 11px; transition: background-color 0.3s; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }}
            .costalero.vacio {{ border: 1px dashed #571342; background: #0c0209; color: #884d72; cursor: default; flex-direction: column; align-items: stretch; text-shadow: none; }}
            .costalero.sobrepeso {{ border: 2px solid #ff4757; background: #6b0b1c; }}
            
            /* Botones de Control */
            .btn-control {{ background: #3d0c2e; color: #f8f0f5; border: 1px solid #d4af37; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.3s; font-size: 12px; margin-left: 5px; text-transform: uppercase; letter-spacing: 1px; }}
            .btn-control:hover {{ background: #571342; box-shadow: 0 0 8px rgba(212, 175, 55, 0.4); }}
            .btn-pdf {{ background: #d4af37; color: #0c0209; border-color: #b5952f; }}
            .btn-pdf:hover {{ background: #b5952f; color: #000; box-shadow: 0 0 10px rgba(212, 175, 55, 0.6); }}

            .stats-box {{ background: #0c0209; padding: 8px; border-radius: 4px; font-size: 10px; color: #d4af37; margin-top: 5px; border-left: 3px solid #d4af37; }}
            input.search-p {{ background: #0c0209; border: 1px solid #3d0c2e; color: #d4af37; padding: 5px; width: 100%; font-size: 10px; border-radius: 3px; outline: none; }}
            input.search-p::placeholder {{ color: #61294d; }}
            .sugerencias {{ background: #1a0514; border: 1px solid #d4af37; max-height: 80px; overflow-y: auto; position: absolute; z-index: 200; width: 200px; }}
            .sug-item {{ padding: 5px; cursor: pointer; border-bottom: 1px solid #3d0c2e; color: #e8d08c; }}
            .sug-item:hover {{ background: #3d0c2e; color: #fff; }}
        </style>
    </head>
    <body>
        <div class="controles" data-html2canvas-ignore="true">
            <div>
                <div style="font-size:18px; font-weight:bold; color:#d4af37;">LA AGONÍA - GESTIÓN DE CUADRILLAS</div>
                <div style="font-size:11px; color:#a37c95; margin-top: 3px;">Cálculo de físicas | Mapa de Calor de Peso | Exportación PDF</div>
            </div>
            <div>
                <button id="btn-heatmap" class="btn-control" onclick="toggleHeatmap()">🧊 Mapa Peso: OFF</button>
                <button class="btn-control btn-pdf" onclick="exportarPDF()">📄 Exportar a PDF</button>
            </div>
        </div>
        <div id="app"></div>

        <script>
            let datos = {turnos_json};
            const MASTER_LIST = {master_json};
            const PESO_TOTAL = {PESO_TRONO_KG};
            const MAX_KG = {LIMITE_PESO_PERSONA};
            let heatmapActivo = false;

            // --- Lógica del Botón de PDF ---
            function exportarPDF() {{
                const elementoApp = document.getElementById('app');
                const opciones = {{
                    margin:       10,
                    filename:     'Cuadrillas_La_Agonia.pdf',
                    image:        {{ type: 'jpeg', quality: 0.98 }},
                    html2canvas:  {{ scale: 2, useCORS: true }},
                    jsPDF:        {{ unit: 'mm', format: 'a4', orientation: 'landscape' }}
                }};
                
                const btnPDF = document.querySelector('.btn-pdf');
                const textoOriginal = btnPDF.innerText;
                btnPDF.innerText = "⏳ Generando...";
                
                html2pdf().set(opciones).from(elementoApp).save().then(() => {{
                    btnPDF.innerText = textoOriginal;
                }});
            }}

            // --- Lógica del Mapa de Calor (PRIMER MODELO: PESO ABSOLUTO) ---
            function toggleHeatmap() {{
                heatmapActivo = !heatmapActivo;
                const btn = document.getElementById('btn-heatmap');
                btn.innerText = heatmapActivo ? '🔥 Mapa Peso: ON' : '🧊 Mapa Peso: OFF';
                
                // Estilos para cuando el botón está activo
                if (heatmapActivo) {{
                    btn.style.background = '#d4af37';
                    btn.style.color = '#0c0209';
                }} else {{
                    btn.style.background = '#3d0c2e';
                    btn.style.color = '#f8f0f5';
                }}
                render();
            }}

            // Primer modelo: evalúa los kilos reales respecto al ideal (base) y el límite (MAX_KG)
            function getHeatmapColor(peso) {{
                if (!peso || peso === 0) return '';
                
                const base = PESO_TOTAL / 36; // Peso ideal (ej: 55.5 kg)
                const minVal = base - 10;     // Verde absoluto (va muy ligero)
                const maxVal = MAX_KG;        // Rojo absoluto (límite de seguridad)
                
                let p = (peso - minVal) / (maxVal - minVal);
                p = Math.max(0, Math.min(1, p));
                
                const hue = (1 - p) * 120; // 120 es verde, 0 es rojo
                return `hsl(${{hue}}, 80%, 30%)`;
            }}

            function render() {{
                const app = document.getElementById('app');
                app.innerHTML = '';
                
                for (const [idT, varas] of Object.entries(datos)) {{
                    let html = `<div class="turno-container"><h2>${{idT}}</h2><div class="grid-trono">`;
                    
                    for (const vNom of ["Izquierda", "Centro", "Derecha"]) {{
                        let vData = varas[vNom];
                        const statsVara = calcularStats(vData.Delante.concat(vData.Detras));
                        
                        html += `<div class="vara"><h3>VARA ${{vNom.toUpperCase()}}</h3>`;
                        ["Delante", "Detras"].forEach(sec => {{
                            const statsSec = calcularStats(vData[sec]);
                            html += `<div class="stats-box"><b>${{sec.toUpperCase()}}:</b> ${{statsSec.media.toFixed(1)}}cm | ${{statsSec.totalVara.toFixed(1)}}kg</div>`;
                            html += `<div class="seccion" ondragover="allow(event)">`;
                            
                            vData[sec].forEach((p, i) => {{
                                const esVacio = p.altura === 0;
                                const esSobrepeso = p.peso >= MAX_KG;
                                
                                let bgStyle = '';
                                if (heatmapActivo && !esVacio) {{
                                    // Usamos la función del primer modelo, pasando solo el peso
                                    bgStyle = `background-color: ${{getHeatmapColor(p.peso)}} !important; border-color: transparent;`;
                                }}

                                html += `
                                    <div class="costalero ${{esVacio ? 'vacio' : ''}} ${{esSobrepeso && !heatmapActivo ? 'sobrepeso' : ''}}" 
                                         style="${{bgStyle}}"
                                         draggable="${{!esVacio}}" ondragstart="drag(event, '${{idT}}', '${{vNom}}', '${{sec}}', ${{i}})" ondrop="drop(event, '${{idT}}', '${{vNom}}', '${{sec}}', ${{i}})">
                                        ${{esVacio ? 
                                            `<input type="text" class="search-p" placeholder="Escribir nombre..." onkeyup="buscar(event, '${{idT}}','${{vNom}}','${{sec}}',${{i}})">
                                             <div id="sug-${{idT}}-${{vNom}}-${{sec}}-${{i}}" class="sugerencias" style="display:none"></div>` :
                                            `<span>
                                                <button data-html2canvas-ignore="true" style="background:none; border:none; color:#ff4757; cursor:pointer; padding:0 5px 0 0;" onclick="eliminar('${{idT}}','${{vNom}}','${{sec}}',${{i}})">🗑️</button>
                                                ${{p.nombre}}
                                            </span>
                                            <span>
                                                <span style="color:${{heatmapActivo ? '#fff' : '#d4af37'}}">${{p.altura}}cm</span> 
                                                <b style="color:${{heatmapActivo ? '#fff' : '#e8d08c'}}; margin-left:5px">${{p.peso.toFixed(1)}}kg</b>
                                            </span>`
                                        }}
                                    </div>`;
                            }});
                            html += `</div>`;
                        }});
                        html += `<div style="text-align:center; padding:10px; border:1px solid #d4af37; border-radius:5px; font-size:12px; color:#d4af37; margin-top:10px;"><b>TOTAL VARA: ${{statsVara.totalVara.toFixed(1)}} kg</b></div></div>`;
                    }}
                    app.innerHTML += html + `</div></div>`;
                }}
            }}

            function calcularStats(p_list) {{
                let filtrados = p_list.filter(p => p.altura > 0);
                let m = filtrados.length > 0 ? filtrados.reduce((a, b) => a + b.altura, 0) / filtrados.length : 0;
                let tV = 0; const base = PESO_TOTAL / 36;
                p_list.forEach(p => {{
                    if(p.altura > 0) {{
                        p.peso = Math.min(MAX_KG, Math.max(0, base + ((p.altura - m) * (base * 0.05))));
                        tV += p.peso;
                    }} else p.peso = 0;
                }});
                return {{ media: m, totalVara: tV }};
            }}

            function buscar(ev, t, v, s, i) {{
                const val = ev.target.value.toLowerCase();
                const sugDiv = document.getElementById(`sug-${{t}}-${{v}}-${{s}}-${{i}}`);
                if(val.length < 2) {{ sugDiv.style.display = 'none'; return; }}
                const matches = MASTER_LIST.filter(p => p.nombre.toLowerCase().includes(val)).slice(0, 5);
                sugDiv.innerHTML = '';
                if(matches.length > 0) {{
                    sugDiv.style.display = 'block';
                    matches.forEach(m => {{
                        const div = document.createElement('div');
                        div.className = 'sug-item';
                        div.innerHTML = `${{m.nombre}} (${{m.altura}}cm)`;
                        div.onclick = () => {{ datos[t][v][s][i] = {{...m}}; render(); }};
                        sugDiv.appendChild(div);
                    }});
                }} else sugDiv.style.display = 'none';
            }}

            let dragging = null;
            function allow(ev) {{ ev.preventDefault(); }}
            function drag(ev, t, v, s, i) {{ dragging = {{ t, v, s, i }}; }}
            function drop(ev, t, v, s, i) {{
                ev.preventDefault();
                let orig = datos[dragging.t][dragging.v][dragging.s][dragging.i];
                datos[dragging.t][dragging.v][dragging.s][dragging.i] = datos[t][v][s][i];
                datos[t][v][s][i] = orig;
                render();
            }}
            
            function eliminar(t, v, s, i) {{
                const persona = datos[t][v][s][i].nombre;
                if (confirm(`¿Estás seguro de que quieres quitar a ${{persona}} de este hueco?`)) {{
                    datos[t][v][s][i] = {{"nombre": "HUECO LIBRE", "altura": 0}};
                    render();
                }}
            }}
            
            window.onload = render;
        </script>
    </body>
    </html>
    """
    with open("visualizador_interactivo.html", "w", encoding="utf-8") as f: f.write(html)

if __name__ == "__main__":
    master_list = cargar_datos()
    if master_list:
        turnos = generar_turnos_base(master_list, NUM_TURNOS)
        generar_html_interactivo(turnos, master_list)
        print(">>> LISTO. Abre 'visualizador_interactivo.html'.")