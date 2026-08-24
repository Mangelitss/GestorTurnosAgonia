import sys
import os
import time
import subprocess
import threading
import tkinter as tk
from tkinter import ttk

# Intentamos importar Pillow para el redimensionado de calidad
try:
    from PIL import Image, ImageTk
    USAR_PILLOW = True
except ImportError:
    USAR_PILLOW = False
    print("Aviso: Librería Pillow (PIL) no instalada. El logo no se redimensionará. Ejecuta: pip install pillow")

# ==========================================
# CONFIGURACIÓN VISUAL (Mismo estilo que App Principal)
# ==========================================
C_MORADO = "#6A1857"      # Morado más claro y vivo para que no se vea negro
C_DORADO = "#d4af37"      # Dorado real para contrastes finos y barra
C_BLANCO = "#ffffff"
C_GRIS = "#cccccc"

# Nombre del archivo del logo (debe estar en la misma carpeta)
ARCHIVO_LOGO = "bandera_tercio_npj.png"

# ==========================================
# FUNCIONES AUXILIARES
# ==========================================
def obtener_ruta_recurso(nombre_archivo):
    """Obtiene la ruta absoluta al recurso, compatible con PyInstaller single-file exe."""
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, nombre_archivo)

# --- LÓGICA DE ACTUALIZACIÓN (HILO SECUNDARIO) ---
def proceso_actualizacion(root, progress_var, lbl_estado):
    archivo_viejo = "GestorCofrade.exe"
    archivo_nuevo = "Gestor_Temp.exe"
    
    if len(sys.argv) >= 3:
        archivo_viejo = sys.argv[1]
        archivo_nuevo = sys.argv[2]

    # --- FASE 1: Esperar cierre ---
    lbl_estado.config(text="Cerrando sesión anterior...")
    for i in range(20):
        time.sleep(0.1)
        progress_var.set(i * 1.5)  # 0% a 30%

    max_reintentos = 5
    exito = False

    # --- FASE 2: Intercambio ---
    lbl_estado.config(text="Aplicando nuevos archivos de sistema...")
    for intento in range(max_reintentos):
        try:
            if os.path.exists(archivo_viejo):
                os.remove(archivo_viejo)
            
            if os.path.exists(archivo_nuevo):
                os.rename(archivo_nuevo, archivo_viejo)
            
            exito = True
            break
        except Exception:
            time.sleep(1)

    progress_var.set(70)

    # --- FASE 3: Apertura ---
    if exito:
        lbl_estado.config(text="¡Actualización completada! Iniciando Gestor...")
    else:
        lbl_estado.config(text="Fallo. Reabriendo versión actual...")

    for i in range(15):
        time.sleep(0.1)
        progress_var.set(70 + (i * 2))  # 70% a 100%

    if exito and os.path.exists(archivo_viejo):
        subprocess.Popen([archivo_viejo])
    else:
        if os.path.exists(archivo_viejo):
            subprocess.Popen([archivo_viejo])
        elif os.path.exists(archivo_nuevo):
            subprocess.Popen([archivo_nuevo])

    root.destroy()
    sys.exit()

# ==========================================
# INTERFAZ GRÁFICA (TARJETA REDONDEADA)
# ==========================================
def main():
    root = tk.Tk()
    root.title("Actualizando...")
    
    # --- CONFIGURACIÓN DE VENTANA ---
    window_width = 460
    window_height = 250 # Un poco más alta para que respire el logo redimensionado
    
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width // 2) - (window_width // 2)
    y = (screen_height // 2) - (window_height // 2)
    root.geometry(f"{window_width}x{window_height}+{x}+{y}")
    
    # 1. Quitamos bordes nativos
    root.overrideredirect(True)
    
    # 2. Aplicamos el fondo morado directamente para evitar el bug
    # del fondo negro en algunos sistemas Windows.
    root.configure(bg=C_MORADO)

    # --- DIBUJAR LA TARJETA REDONDEADA (Canvas) ---
    # Creamos un Canvas del tamaño de la ventana
    canvas = tk.Canvas(root, width=window_width, height=window_height, 
                       bg=C_MORADO, highlightthickness=0)
    canvas.pack()

    # Función para dibujar rectángulos redondeados
    def draw_rounded_rect(canvas, x1, y1, x2, y2, radius, **kwargs):
        points = [x1+radius, y1, x1+radius, y1, x2-radius, y1, x2-radius, y1, x2, y1, x2, y1+radius, x2, y1+radius, x2, y2-radius, x2, y2-radius, x2, y2, x2-radius, y2, x2-radius, y2, x1+radius, y2, x1+radius, y2, x1, y2, x1, y2-radius, x1, y2-radius, x1, y1+radius, x1, y1+radius, x1, y1]
        return canvas.create_polygon(points, **kwargs, smooth=True)

    # Dibujamos el fondo morado redondeado (Tarjeta principal)
    # Margen de 2px para el borde dorado
    draw_rounded_rect(canvas, 2, 2, window_width-2, window_height-2, radius=20, fill=C_MORADO)
    
    # Dibujamos el borde dorado redondeado (finito y elegante)
    draw_rounded_rect(canvas, 2, 2, window_width-2, window_height-2, radius=20, outline=C_DORADO, width=2)

    # --- CARGAR Y REDIMENSIONAR LOGO (Pillow) ---
    ruta_logo = obtener_ruta_recurso(ARCHIVO_LOGO)
    logo_final = None
    
    if os.path.exists(ruta_logo) and USAR_PILLOW:
        try:
            # Abrimos con Pillow
            img_pil = Image.open(ruta_logo)
            
            # Calculamos nuevo tamaño manteniendo proporción (Alto fijo de 60px)
            alto_deseado = 60
            w_percent = (alto_deseado / float(img_pil.size[1]))
            ancho_final = int((float(img_pil.size[0]) * float(w_percent)))
            
            # Redimensionado de alta calidad (LANCZOS)
            img_resized = img_pil.resize((ancho_final, alto_deseado), Image.Resampling.LANCZOS)
            
            # Convertimos a formato Tkinter
            logo_final = ImageTk.PhotoImage(img_resized)
            root.logo_img = logo_final # Referencia de seguridad
            
        except Exception as e:
            print(f"Error Pillow: {e}")

    # Si Pillow falló o no está, intentamos carga básica sin redimensionar (se verá gigante)
    if not logo_final and os.path.exists(ruta_logo):
        try:
            logo_final = tk.PhotoImage(file=ruta_logo)
            root.logo_img = logo_final
        except: pass

    # --- POSICIONAR ELEMENTOS DENTRO DEL CANVAS ---
    # Coordenada X central
    cx = window_width // 2
    
    # 1. Logo (si existe)
    current_y = 25
    if logo_final:
        canvas.create_image(cx, current_y + 30, image=logo_final, anchor="center")
        current_y += 75 # Espacio que ocupa el logo
    else:
        current_y += 20 # Margen si no hay logo

    # 2. Títulos (Cinzel para aspecto clásico/premium)
    canvas.create_text(cx, current_y, text="SISTEMA DE ACTUALIZACIÓN", 
                       fill=C_DORADO, font=("Cinzel", 15, "bold"), anchor="center")
    current_y += 28
    
    canvas.create_text(cx, current_y, text="OFS Muy Ilustre Mayordomía de Ntro. Padre Jesús Nazareno", 
                       fill=C_BLANCO, font=("Segoe UI", 9), anchor="center")
    current_y += 35

    # 3. Estilos barra de progreso
    style = ttk.Style()
    style.theme_use('clam')
    style.configure("Custom.Horizontal.TProgressbar",
                    troughcolor="#420D33", background=C_DORADO, bordercolor=C_MORADO,
                    lightcolor=C_DORADO, darkcolor=C_DORADO, thickness=4)

    # 4. Barra de progreso (hay que meterla en el canvas con create_window)
    progress_var = tk.DoubleVar()
    barra = ttk.Progressbar(root, style="Custom.Horizontal.TProgressbar", 
                           variable=progress_var, maximum=100)
    
    # Colocamos la barra centrada
    canvas.create_window(cx, current_y, window=barra, width=360) 
    current_y += 25

    # 5. Estado dinámico
    lbl_estado = tk.Label(root, text="Preparando entorno...", fg=C_GRIS, 
                          bg=C_MORADO, font=("Segoe UI", 9, "italic"))
    canvas.create_window(cx, current_y, window=lbl_estado)

    # --- EJECUCIÓN CON HILOS ---
    root.after(500, lambda: threading.Thread(target=proceso_actualizacion, 
                                             args=(root, progress_var, lbl_estado), 
                                             daemon=True).start())
    
    root.mainloop()

if __name__ == "__main__":
    main()