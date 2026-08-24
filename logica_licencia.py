import requests

# Pega aquí la URL que copiaste de Firebase en el Paso 7.
# IMPORTANTE: Asegúrate de que termine en .json
URL_FIREBASE = "https://licencias-gestor-cofrade-default-rtdb.europe-west1.firebasedatabase.app/.json"

def comprobar_licencia(usuario, password):
    try:
        # Preguntamos a Firebase (le damos 5 segundos de margen)
        respuesta = requests.get(URL_FIREBASE, timeout=5)
        
        if respuesta.status_code != 200:
            return False, "Error en el servidor de licencias."
            
        clientes = respuesta.json()
        
        if not clientes:
            return False, "Base de datos vacía."

        # Comprobamos si el usuario existe
        if usuario in clientes:
            datos_cliente = clientes[usuario]
            
            # Comprobamos la contraseña
            if datos_cliente.get("password") == password:
                # Comprobamos si tú le has marcado como 'activa: true'
                if datos_cliente.get("activa") == True:
                    return True, "Acceso concedido"
                else:
                    return False, "Licencia caducada. Contacte con el administrador."
            else:
                return False, "Contraseña incorrecta."
        else:
            return False, "El usuario no existe."
            
    except requests.exceptions.ConnectionError:
        return False, "Sin conexión a Internet. Se requiere red para acceder."
    except Exception as e:
        return False, f"Error inesperado: {str(e)}"