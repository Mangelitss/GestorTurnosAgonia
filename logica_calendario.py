import json
import os
import datetime
import base64

ARCHIVO_CALENDARIO = "calendario.json"

def cargar_eventos():
    if not os.path.exists(ARCHIVO_CALENDARIO):
        return []
    try:
        with open(ARCHIVO_CALENDARIO, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def guardar_eventos(eventos):
    # Backup automático antes de sobreescribir
    if os.path.exists(ARCHIVO_CALENDARIO):
        try:
            import shutil
            fecha_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup = f"calendario_backup_{fecha_str}.json"
            shutil.copy(ARCHIVO_CALENDARIO, backup)
            # Conservamos solo los 5 backups más recientes
            backups = sorted([
                f for f in os.listdir(".")
                if f.startswith("calendario_backup_") and f.endswith(".json")
            ])
            for viejo in backups[:-5]:
                try: os.remove(viejo)
                except: pass
        except:
            pass
    with open(ARCHIVO_CALENDARIO, "w", encoding="utf-8") as f:
        json.dump(eventos, f, indent=4, ensure_ascii=False)

def generar_html_calendario(eventos):
    fecha_hoy = datetime.datetime.now().strftime("%d/%m/%Y")
    
    # Ordenamos los eventos por fecha (mes y día)
    _MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
              "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    def _clave_fecha(ev):
        try:
            partes = ev.get('fecha', '').split(' de ')
            dia = int(partes[0])
            mes = _MESES.index(partes[1]) + 1
            return (mes, dia)
        except:
            return (99, 99)
    eventos = sorted(eventos, key=_clave_fecha)
    
    img_b64 = ""
    if os.path.exists("bandera_tercio_npj.png"):
        try:
            with open("bandera_tercio_npj.png", "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode()
                img_b64 = f"data:image/png;base64,{encoded_string}"
        except: pass

    html_eventos = ""
    if not eventos:
        html_eventos = "<p style='text-align:center; color:#666;'>No hay citas ni ensayos programados actualmente.</p>"
    else:
        # Ordenar (opcional, por ahora los pinta en el orden que se crearon)
        for ev in eventos:
            motivo = ev.get('motivo', '')
            es_ensayo = "ensayo" in motivo.lower()
            
            color_borde = "#d4af37" if es_ensayo else "#5c164e"
            bg_color = "#fff9c4" if es_ensayo else "#f4f6f8"
            
            lugar = ev.get('lugar', '')
            indicaciones = ev.get('indicaciones', '')
            
            html_lugar = f"<div class='detalle-secundario'>📍 <b>LUGAR:</b> {lugar}</div>" if lugar else ""
            html_ind = f"<div class='detalle-secundario' style='margin-top:4px;'>📝 <b>NOTAS:</b> <i>{indicaciones}</i></div>" if indicaciones and indicaciones != "Ej: Venir con calzado oscuro, ropa cómoda..." else ""

            html_eventos += f"""
            <div class="evento-card" style="border-left-color: {color_borde}; background-color: {bg_color};">
                <div class="evento-header">
                    <span class="fecha">📅 {ev.get('fecha', '')}</span>
                    <span class="hora">⏰ {ev.get('hora', '')}</span>
                </div>
                <div class="motivo">{motivo}</div>
                <div class="detalles-box">
                    {html_lugar}
                    {html_ind}
                </div>
            </div>
            """

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Calendario Oficial</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Open+Sans:wght@400;600;800&display=swap');
            
            body {{ font-family: 'Open Sans', sans-serif; background: #f4f6f8; color: #333; margin: 0; padding: 20px; }}
            .container {{ max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-top: 8px solid #5c164e; }}
            
            .web-controls {{ text-align: center; margin-bottom: 20px; }}
            .btn-pdf {{ background: #5c164e; color: #fff; padding: 12px 25px; border-radius: 5px; font-weight: bold; cursor: pointer; border: none; font-size: 14px; text-transform: uppercase; }}
            
            .header {{ text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }}
            .logo-img {{ width: 90px; height: auto; margin-bottom: 10px; }}
            .header h1 {{ color: #4a148c; margin: 0; font-size: 20px; text-transform: uppercase; font-family: 'Cinzel', serif; }}
            .header h2 {{ color: #b5952f; margin: 5px 0; font-size: 16px; letter-spacing: 1px; }}
            .header p {{ color: #666; font-size: 12px; margin-top: 5px; }}
            
            .evento-card {{ padding: 15px; margin-bottom: 15px; border-radius: 6px; border-left: 6px solid; border-bottom: 1px solid #eee; border-right: 1px solid #eee; border-top: 1px solid #eee; page-break-inside: avoid; }}
            .evento-header {{ display: flex; justify-content: space-between; border-bottom: 2px solid rgba(0,0,0,0.05); padding-bottom: 8px; margin-bottom: 8px; }}
            .fecha {{ font-weight: bold; color: #5c164e; font-size: 16px; text-transform: uppercase; }}
            .hora {{ font-weight: bold; color: #b5952f; font-size: 16px; }}
            
            .motivo {{ font-size: 18px; color: #111; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }}
            
            .detalles-box {{ background: rgba(255,255,255,0.6); padding: 10px; border-radius: 4px; border: 1px dashed rgba(0,0,0,0.1); }}
            .detalle-secundario {{ font-size: 13px; color: #444; }}
            
            @media print {{
                body {{ background: #fff; padding: 0; }}
                .web-controls {{ display: none !important; }}
                .container {{ box-shadow: none; border-top: none; padding: 0; }}
                .evento-card {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
                .detalles-box {{ background: transparent !important; border: 1px dashed #ccc !important; }}
            }}
        </style>
    </head>
    <body>
        <div class="web-controls">
            <button class="btn-pdf" onclick="generarPDF()">📥 DESCARGAR PDF PARA WHATSAPP</button>
        </div>
        
        <div class="container" id="calendario-content">
            <div class="header">
                <img src="{img_b64}" class="logo-img" style="{'display:none' if not img_b64 else ''}">
                <h1>OFS Muy Ilustre Mayordomía de Nuestro Padre Jesús Nazareno</h1>
                <h2>Calendario Oficial de Convocatorias y Ensayos</h2>
                <p>Actualizado a: {fecha_hoy}</p>
            </div>
            
            {html_eventos}
            
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
                Generado por el Sistema Gestor Cofrade de la Agonía.
            </div>
        </div>
        
        <script>
            function generarPDF() {{
                const element = document.getElementById('calendario-content');
                const btn = document.querySelector('.btn-pdf');
                btn.innerText = "⏳ GENERANDO PDF...";
                
                const opt = {{
                    margin:       10, 
                    filename:     'Convocatorias_Agonia.pdf',
                    image:        {{ type: 'jpeg', quality: 0.98 }},
                    html2canvas:  {{ scale: 2 }},
                    jsPDF:        {{ unit: 'mm', format: 'a4', orientation: 'portrait' }}
                }};
                
                setTimeout(() => {{
                    html2pdf().set(opt).from(element).save().then(() => {{
                        btn.innerText = "📥 DESCARGAR PDF PARA WHATSAPP";
                    }});
                }}, 150);
            }}
        </script>
    </body>
    </html>
    """
    
    with open("calendario_generado.html", "w", encoding="utf-8") as f:
        f.write(html)
    return True, "calendario_generado.html"