# Importaciones de Tkinter y otras estándar
import tkinter as tk
from tkinter import filedialog, messagebox
import os
import tkinter.ttk
import subprocess # <-- ¡Asegúrate de que esté aquí!

# ----------------------------------------------------
# A. Importaciones de PyPDF2 
from PyPDF2 import PdfReader, PdfWriter 

# ----------------------------------------------------
# B. Importaciones de Pillow (Para convertir y ahora dibujar)
from PIL import Image, ImageDraw, ImageFont # <-- IMPORTACIONES DE DIBUJO

# --- 1. FUNCIONES DE MANIPULACIÓN DE PDF ---
def unir_pdfs(lista_archivos, nombre_salida):
    """Une una lista de archivos PDF en uno solo."""
    try:
        escritor = PdfWriter()
        for archivo in lista_archivos:
            lector = PdfReader(archivo)
            for pagina in lector.pages:
                escritor.add_page(pagina)
        
        with open(nombre_salida, "wb") as f_salida:
            escritor.write(f_salida)
        
        messagebox.showinfo("Éxito", f"PDFs unidos exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al unir: {e}")

def separar_pdf(archivo_entrada, pagina_inicio, pagina_fin, nombre_salida):
    """Extrae un rango de páginas de un PDF."""
    try:
        lector = PdfReader(archivo_entrada)
        escritor = PdfWriter()
        
        # PyPDF2 usa indexación base 0, por lo que restamos 1 a inicio
        for i in range(pagina_inicio - 1, pagina_fin):
            if i < len(lector.pages):
                escritor.add_page(lector.pages[i])
            else:
                messagebox.showwarning("Advertencia", "El rango de páginas excede el total.")
                break
        
        with open(nombre_salida, "wb") as f_salida:
            escritor.write(f_salida)
        
        messagebox.showinfo("Éxito", f"Páginas separadas exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al separar: {e}")

def rotar_pdf(archivo_entrada, grados, nombre_salida):
    """
    Rota todas las páginas del PDF por 90, 180 o 270 grados.
    """
    try:
        lector = PdfReader(archivo_entrada)
        escritor = PdfWriter()
        
        # PyPDF2 ofrece el método rotate(grados)
        for pagina in lector.pages:
            # La rotación se acumula, así que le sumamos los grados
            # que ya pueda tener la página si los tenía definidos.
            pagina.rotate(grados)
            escritor.add_page(pagina)
        
        with open(nombre_salida, "wb") as f_salida:
            escritor.write(f_salida)
        
        messagebox.showinfo("Éxito", f"PDF rotado {grados}° exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al rotar: {e}")

def convertir_imagen(archivo_entrada, formato_destino, nombre_salida):
    """
    Convierte una imagen de cualquier formato compatible con Pillow 
    al formato de destino especificado (JPG, PNG, GIF, etc.).
    """
    try:
        # 1. Abrir la imagen con Pillow
        img = Image.open(archivo_entrada)

        # 2. Asegurar el modo RGB si el destino es JPG (JPG no soporta modos de transparencia como PNG)
        if formato_destino.upper() in ['JPEG', 'JPG'] and img.mode in ('RGBA', 'P'):
            # Crea un fondo blanco para evitar errores de transparencia
            img = img.convert('RGB')
        
        # 3. Guardar la imagen con el formato especificado
        # Pillow infiere el formato a partir de la extensión en nombre_salida, 
        # pero es bueno indicarlo también en el método save.
        img.save(nombre_salida, format=formato_destino)
        
        messagebox.showinfo("Éxito", f"Imagen convertida a {formato_destino.upper()} exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
    except FileNotFoundError:
        messagebox.showerror("Error", "Archivo no encontrado. Por favor, verifica la ruta de origen.")
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al convertir la imagen. Esto puede ser un formato de origen no compatible o un error de Pillow: {e}")

def extraer_texto_pdf(archivo_entrada, nombre_salida):
    """
    Extrae todo el texto de un PDF y lo guarda en un archivo de texto plano (.txt).
    """
    try:
        lector = PdfReader(archivo_entrada)
        texto_completo = ""
        
        # Iterar sobre todas las páginas y extraer el texto
        for i, pagina in enumerate(lector.pages):
            texto_completo += f"\n--- Página {i + 1} ---\n"
            texto_completo += pagina.extract_text() or "" # Añadir el texto o cadena vacía si no hay texto
            
        # Guardar el texto en un archivo .txt
        with open(nombre_salida, "w", encoding="utf-8") as f_salida:
            f_salida.write(texto_completo)
            
        messagebox.showinfo("Éxito", f"Texto extraído exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al extraer el texto: {e}")

def aplicar_marca_agua(archivo_entrada, texto_marca, nombre_salida):
    """
    Aplica una marca de agua de texto al centro de la imagen.
    """
    try:
        img = Image.open(archivo_entrada).convert("RGBA") # Convertir a RGBA para manejar transparencia
        ancho, alto = img.size
        
        # 1. Crear una capa transparente para la marca de agua
        capa_marca = Image.new("RGBA", (ancho, alto), (255, 255, 255, 0))
        dibujo = ImageDraw.Draw(capa_marca)
        
        # 2. Configurar la fuente (usamos una fuente predeterminada simple, como Arial si está disponible)
        # Esto es un punto delicado en apps autónomas. Si la fuente no existe, fallará. 
        # Usaremos una fuente TTF estándar (Arial en Windows/macOS) o una simple por defecto.
        try:
            # Puedes intentar usar una ruta específica o un nombre de fuente común
            # En la mayoría de los sistemas, "arial.ttf" funciona si está en el path de fuentes.
            # Aquí asumimos una fuente genérica, ya que Pillow debe usar una por defecto si falla.
            # El tamaño de la fuente debe ser dinámico, por ejemplo, 1/10 del ancho de la imagen.
            font_size = int(ancho / 10)
            fuente = ImageFont.truetype("arial.ttf", font_size) # Intentar Arial
        except IOError:
            # Si Arial no se encuentra, usa la fuente predeterminada (aunque no controlamos el tamaño)
            font_size = int(ancho / 10)
            fuente = ImageFont.load_default() 

        # 3. Calcular la posición del texto (centrado)
        # Obtenemos las dimensiones del texto
        bbox = dibujo.textbbox((0, 0), texto_marca, font=fuente)
        ancho_texto = bbox[2] - bbox[0]
        alto_texto = bbox[3] - bbox[1]
        
        x = (ancho - ancho_texto) / 2
        y = (alto - alto_texto) / 2
        
        # 4. Definir color y transparencia (Ej: Negro semitransparente)
        # RGBA: (R, G, B, Alpha). Alpha (A) de 0 a 255. 100 es semitransparente.
        color_marca = (0, 0, 0, 100) 
        
        # 5. Dibujar el texto
        dibujo.text((x, y), texto_marca, font=fuente, fill=color_marca)
        
        # 6. Combinar la imagen original con la capa de la marca de agua
        img_final = Image.alpha_composite(img, capa_marca)
        
        # 7. Guardar la imagen (convertir de nuevo a RGB si el formato de destino no soporta transparencia, ej. JPG)
        if nombre_salida.lower().endswith(('.jpg', '.jpeg')):
             img_final = img_final.convert("RGB")
             
        img_final.save(nombre_salida)
        
        messagebox.showinfo("Éxito", f"Marca de agua aplicada exitosamente en: {nombre_salida}")
        abrir_archivo(nombre_salida)
        
    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un error al aplicar la marca de agua: {e}")

def abrir_archivo(ruta_archivo):
    """
    Intenta abrir el archivo generado utilizando la herramienta predeterminada del sistema.
    """
    try:
        if os.name == 'nt':  # Windows
            # El comando 'startfile' es ideal para Windows
            os.startfile(ruta_archivo)
        elif os.uname().sysname == 'Darwin':  # macOS
            # El comando 'open' es el estándar en macOS
            subprocess.run(['open', ruta_archivo], check=True)
        else:  # Linux (generalmente usa 'xdg-open')
            # El comando 'xdg-open' es el estándar para abrir archivos en la mayoría de los entornos Linux
            subprocess.run(['xdg-open', ruta_archivo], check=True)
            
    except Exception as e:
        # Esto puede fallar si el archivo no existe o si el sistema no tiene un comando de apertura predeterminado
        print(f"No se pudo abrir automáticamente el archivo {ruta_archivo}: {e}")
        # No mostramos un messagebox de error al usuario, ya que la generación fue exitosa.

# (Aquí se añadirían las funciones de Comprimir, Rotar, etc.)

# --- 2. INTERFAZ DE USUARIO CON TKINTER ---

class PDFToolApp:
    def __init__(self, master):
        self.master = master
        master.title("Convert2")
        master.geometry("650x400")
        
        # Variables de la aplicación
        self.archivos_a_unir = []
        
        # Configuración de Pestañas
        self.notebook = tk.ttk.Notebook(master)
        self.notebook.pack(pady=10, padx=10, expand=True, fill="both")

        # Crear pestañas
        self.frame_unir = tk.Frame(self.notebook)
        self.frame_separar = tk.Frame(self.notebook)
        self.frame_rotar = tk.Frame(self.notebook) # <-- NUEVA LÍNEA
        self.frame_convertir_img = tk.Frame(self.notebook) # <-- NUEVA LÍNEA
        self.frame_extraer_texto = tk.Frame(self.notebook) # <-- NUEVA LÍNEA
        self.frame_marca_agua = tk.Frame(self.notebook) # <-- NUEVA LÍNEA

        self.notebook.add(self.frame_unir, text="Unir PDF")
        self.notebook.add(self.frame_separar, text="Separar PDF")
        self.notebook.add(self.frame_rotar, text="Rotar Páginas") # <-- NUEVA LÍNEA
        self.notebook.add(self.frame_convertir_img, text="Convertir Imagen") # <-- NUEVA PESTAÑA
        self.notebook.add(self.frame_extraer_texto, text="Extraer Texto") # <-- NUEVA PESTAÑA
        self.notebook.add(self.frame_marca_agua, text="Marca de Agua") # <-- NUEVA PESTAÑA
        
        # Inicializar contenido
        self._setup_unir_tab()
        self._setup_separar_tab()
        self._setup_rotar_tab() # <-- NUEVA LÍNEA
        self._setup_convertir_img_tab() # <-- NUEVA LÍNEA
        self._setup_extraer_texto_tab() # <-- NUEVA LÍNEA
        self._setup_marca_agua_tab() # <-- NUEVA LÍNEA

    # --- Configuración de Pestaña UNIR ---
    def _setup_unir_tab(self):
        tk.Label(self.frame_unir, text="Archivos a unir:", font=("Arial", 10)).pack(pady=5)
        
        self.lista_archivos = tk.Listbox(self.frame_unir, height=5, width=60)
        self.lista_archivos.pack(pady=5, padx=10)
        
        # btn_agregar = tk.Button(self.frame_unir, text="Agregar PDF", command=self.agregar_archivo_unir)
        # btn_agregar.pack(pady=5)
        frame_btns_unir = tk.Frame(self.frame_unir)
        frame_btns_unir.pack(pady=5)

        btn_agregar = tk.Button(frame_btns_unir, text="➕ Agregar PDF", command=self.agregar_archivo_unir)
        btn_agregar.pack(side=tk.LEFT, padx=10)
        # NUEVO BOTÓN
        btn_eliminar = tk.Button(frame_btns_unir, text="🗑️ Eliminar Seleccionado", command=self.eliminar_archivo_unir)
        btn_eliminar.pack(side=tk.LEFT, padx=10)
        
        btn_unir = tk.Button(self.frame_unir, text="UNIR ARCHIVOS", bg="green", fg="white", command=self.ejecutar_unir)
        btn_unir.pack(pady=15)

    def agregar_archivo_unir(self):
        archivos = filedialog.askopenfilenames(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")]
        )
        for archivo in archivos:
            if archivo not in self.archivos_a_unir:
                self.archivos_a_unir.append(archivo)
                self.lista_archivos.insert(tk.END, os.path.basename(archivo))

    def eliminar_archivo_unir(self):
        try:
            seleccion = self.lista_archivos.curselection()
            if seleccion:
                indice = seleccion[0]
                # Eliminar del listbox
                self.lista_archivos.delete(indice)
                # Eliminar de la lista de rutas
                del self.archivos_a_unir[indice]
        except Exception as e:
            messagebox.showerror("Error", "No se pudo eliminar el archivo. Asegúrate de que uno esté seleccionado.")

    def ejecutar_unir(self):
        if not self.archivos_a_unir:
            messagebox.showwarning("Advertencia", "Por favor, agrega al menos dos archivos PDF.")
            return

        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")],
            title="Guardar PDF Unido Como"
        )
        if nombre_salida:
            unir_pdfs(self.archivos_a_unir, nombre_salida)
            # Limpiar después de unir
            self.archivos_a_unir = []
            self.lista_archivos.delete(0, tk.END)

    # --- Configuración de Pestaña SEPARAR ---
    def _setup_separar_tab(self):
        # Campos de entrada
        self.separar_archivo_path = tk.StringVar()
        self.separar_inicio = tk.IntVar(value=1)
        self.separar_fin = tk.IntVar(value=1)
        
        tk.Label(self.frame_separar, text="Archivo Fuente:").pack(pady=5)
        tk.Entry(self.frame_separar, textvariable=self.separar_archivo_path, width=50).pack(pady=5, padx=10)
        btn_buscar = tk.Button(self.frame_separar, text="Buscar PDF", command=self.seleccionar_archivo_separar)
        btn_buscar.pack(pady=5)

        # Rango de páginas
        frame_rango = tk.Frame(self.frame_separar)
        frame_rango.pack(pady=10)
        tk.Label(frame_rango, text="Página Inicio:").pack(side=tk.LEFT, padx=5)
        tk.Spinbox(frame_rango, from_=1, to=999, width=5, textvariable=self.separar_inicio).pack(side=tk.LEFT, padx=10)
        tk.Label(frame_rango, text="Página Fin:").pack(side=tk.LEFT, padx=5)
        tk.Spinbox(frame_rango, from_=1, to=999, width=5, textvariable=self.separar_fin).pack(side=tk.LEFT, padx=10)

        # Botón Separar
        btn_separar = tk.Button(self.frame_separar, text="SEPARAR PÁGINAS", bg="blue", fg="white", command=self.ejecutar_separar)
        btn_separar.pack(pady=15)
    
    def seleccionar_archivo_separar(self):
        archivo = filedialog.askopenfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")]
        )
        if archivo:
            self.separar_archivo_path.set(archivo)

    def ejecutar_separar(self):
        archivo_in = self.separar_archivo_path.get()
        if not archivo_in:
            messagebox.showwarning("Advertencia", "Por favor, selecciona un archivo PDF para separar.")
            return
            
        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")],
            title="Guardar Páginas Separadas Como"
        )
        
        if nombre_salida:
            separar_pdf(
                archivo_in, 
                self.separar_inicio.get(), 
                self.separar_fin.get(), 
                nombre_salida
            )

    # --- Configuración de Pestaña ROTAR ---
    def _setup_rotar_tab(self):
        self.rotar_archivo_path = tk.StringVar()
        self.grados_rotacion = tk.IntVar(value=90)

        tk.Label(self.frame_rotar, text="Selecciona el PDF a Rotar:", font=("Arial", 10)).pack(pady=5)
        
        # Entrada de Archivo
        frame_archivo = tk.Frame(self.frame_rotar)
        frame_archivo.pack(pady=5)
        tk.Entry(frame_archivo, textvariable=self.rotar_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar PDF", command=self.seleccionar_archivo_rotar)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        # Selector de Grados
        tk.Label(self.frame_rotar, text="Grados de Rotación (Todos):", font=("Arial", 10)).pack(pady=10)
        
        opciones_rotacion = [90, 180, 270]
        frame_grados = tk.Frame(self.frame_rotar)
        frame_grados.pack(pady=5)
        
        for grado in opciones_rotacion:
            tk.Radiobutton(frame_grados, 
                           text=f"{grado}°", 
                           variable=self.grados_rotacion, 
                           value=grado).pack(side=tk.LEFT, padx=10)

        # Botón Rotar
        btn_rotar = tk.Button(self.frame_rotar, text="ROTAR PÁGINAS", bg="#8B4513", fg="white", command=self.ejecutar_rotar)
        btn_rotar.pack(pady=15)
        
    def seleccionar_archivo_rotar(self):
        archivo = filedialog.askopenfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")]
        )
        if archivo:
            self.rotar_archivo_path.set(archivo)

    def ejecutar_rotar(self):
        archivo_in = self.rotar_archivo_path.get()
        if not archivo_in:
            messagebox.showwarning("Advertencia", "Por favor, selecciona un archivo PDF para rotar.")
            return
            
        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")],
            title="Guardar PDF Rotado Como"
        )
        
        if nombre_salida:
            rotar_pdf(
                archivo_in, 
                self.grados_rotacion.get(),
                nombre_salida
            )

# --- Configuración de Pestaña EXTRAER TEXTO ---
    def _setup_extraer_texto_tab(self):
        self.extraer_archivo_path = tk.StringVar()

        tk.Label(self.frame_extraer_texto, text="Selecciona el PDF para extraer texto:", font=("Arial", 10)).pack(pady=10)
        
        # Entrada de Archivo
        frame_archivo = tk.Frame(self.frame_extraer_texto)
        frame_archivo.pack(pady=5)
        
        tk.Entry(frame_archivo, textvariable=self.extraer_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar PDF", command=self.seleccionar_archivo_extraer)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        # Descripción
        tk.Label(self.frame_extraer_texto, 
                 text="Guarda el texto incrustado en un archivo .txt (No funciona en PDFs escaneados).", 
                 fg="gray").pack(pady=20)

        # Botón Extraer
        btn_extraer = tk.Button(self.frame_extraer_texto, text="EXTRAER TEXTO", bg="#6495ED", fg="white", command=self.ejecutar_extraer_texto)
        btn_extraer.pack(pady=15)
        
    def seleccionar_archivo_extraer(self):
        archivo = filedialog.askopenfilename(
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")]
        )
        if archivo:
            self.extraer_archivo_path.set(archivo)

    def ejecutar_extraer_texto(self):
        archivo_in = self.extraer_archivo_path.get()
        if not archivo_in:
            messagebox.showwarning("Advertencia", "Por favor, selecciona un archivo PDF.")
            return
            
        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Archivo de Texto", "*.txt")],
            title="Guardar Texto Extraído Como"
        )
        
        if nombre_salida:
            extraer_texto_pdf(archivo_in, nombre_salida)

# --- Configuración de Pestaña CONVERTIR IMAGEN ---
    def _setup_convertir_img_tab(self):
        self.img_archivo_path = tk.StringVar()
        self.img_formato_destino = tk.StringVar(value="PNG")
        
        FORMATOS_COMUNES = ["PNG", "JPEG", "GIF", "BMP", "TIFF", "WEBP"]

        tk.Label(self.frame_convertir_img, text="Selecciona la Imagen de Origen:", font=("Arial", 10)).pack(pady=5)
        
        # Entrada de Archivo
        frame_archivo = tk.Frame(self.frame_convertir_img)
        frame_archivo.pack(pady=5)
        tk.Entry(frame_archivo, textvariable=self.img_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar Imagen", command=self.seleccionar_archivo_img)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        # Selector de Formato de Destino
        tk.Label(self.frame_convertir_img, text="Formato de Destino:", font=("Arial", 10)).pack(pady=10)
        
        # Usamos un Dropdown (OptionMenu) para la selección de formato
        self.menu_formato = tk.OptionMenu(self.frame_convertir_img, self.img_formato_destino, *FORMATOS_COMUNES)
        self.menu_formato.config(width=15)
        self.menu_formato.pack(pady=5)

        # Botón Convertir
        btn_convertir = tk.Button(self.frame_convertir_img, text="CONVERTIR IMAGEN", bg="#20B2AA", fg="white", command=self.ejecutar_conversion_img)
        btn_convertir.pack(pady=15)

    def seleccionar_archivo_img(self):
        # Permitimos seleccionar múltiples formatos de imagen conocidos
        archivo = filedialog.askopenfilename(
            filetypes=[
                ("Archivos de Imagen", "*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.tiff"),
                ("Todos los archivos", "*.*")
            ]
        )
        if archivo:
            self.img_archivo_path.set(archivo)

    def ejecutar_conversion_img(self):
        archivo_in = self.img_archivo_path.get()
        formato_out = self.img_formato_destino.get().upper()
        
        if not archivo_in:
            messagebox.showwarning("Advertencia", "Por favor, selecciona una imagen de origen.")
            return
            
        # Determinar el nombre de salida con la extensión correcta
        nombre_base, _ = os.path.splitext(os.path.basename(archivo_in))
        
        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=f".{formato_out.lower()}",
            filetypes=[(f"Archivo {formato_out}", f"*.{formato_out.lower()}")],
            initialfile=f"{nombre_base}_convertido.{formato_out.lower()}",
            title=f"Guardar Imagen Como {formato_out}"
        )
        
        if nombre_salida:
            convertir_imagen(
                archivo_in, 
                formato_out,
                nombre_salida
            )

# --- Configuración de Pestaña MARCA DE AGUA ---
    def _setup_marca_agua_tab(self):
        self.marca_agua_archivo_path = tk.StringVar()
        self.texto_marca = tk.StringVar(value="CONFIDENCIAL")

        tk.Label(self.frame_marca_agua, text="1. Selecciona la Imagen:", font=("Arial", 10)).pack(pady=5)
        
        # Entrada de Archivo
        frame_archivo = tk.Frame(self.frame_marca_agua)
        frame_archivo.pack(pady=5)
        
        tk.Entry(frame_archivo, textvariable=self.marca_agua_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar Imagen", command=self.seleccionar_archivo_marca_agua)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        tk.Label(self.frame_marca_agua, text="2. Texto de la Marca de Agua:", font=("Arial", 10)).pack(pady=10)
        
        # Entrada de Texto
        tk.Entry(self.frame_marca_agua, textvariable=self.texto_marca, width=40).pack(pady=5)

        tk.Label(self.frame_marca_agua, 
                 text="El texto se aplicará en negro semitransparente y se centrará.", 
                 fg="gray").pack(pady=10)

        # Botón Aplicar
        btn_aplicar = tk.Button(self.frame_marca_agua, text="APLICAR MARCA DE AGUA", bg="#FF8C00", fg="white", command=self.ejecutar_marca_agua)
        btn_aplicar.pack(pady=15)
        
    def seleccionar_archivo_marca_agua(self):
        archivo = filedialog.askopenfilename(
            filetypes=[
                ("Archivos de Imagen", "*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.tiff"),
                ("Todos los archivos", "*.*")
            ]
        )
        if archivo:
            self.marca_agua_archivo_path.set(archivo)

    def ejecutar_marca_agua(self):
        archivo_in = self.marca_agua_archivo_path.get()
        texto = self.texto_marca.get()
        
        if not archivo_in or not texto:
            messagebox.showwarning("Advertencia", "Por favor, selecciona una imagen y escribe el texto de la marca.")
            return
            
        nombre_base, extension = os.path.splitext(os.path.basename(archivo_in))
        
        nombre_salida = filedialog.asksaveasfilename(
            defaultextension=extension,
            filetypes=[(f"Archivo {extension.upper()}", f"*{extension.lower()}")],
            initialfile=f"{nombre_base}_watermarked{extension}",
            title="Guardar Imagen con Marca de Agua Como"
        )
        
        if nombre_salida:
            aplicar_marca_agua(
                archivo_in, 
                texto,
                nombre_salida
            )

# --- 3. EJECUCIÓN ---

if __name__ == "__main__":
    # Necesitas instalar el módulo `tkinter.ttk` para las pestañas
    try:
        import tkinter.ttk
    except ImportError:
        # Esto solo ocurre si la instalación de Python está incompleta
        messagebox.showerror("Error", "Necesitas la librería 'tkinter.ttk'. Revisa tu instalación de Python.")

    root = tk.Tk()
    # --- Aplicar Tema Moderno ---
    style = tkinter.ttk.Style()
    
    # Puedes probar: 'clam', 'alt', 'default', o instalar temas externos como 'Azure'
    # 'clam' o 'alt' suelen ser mejores que el clásico 'default'
    style.theme_use("clam") 
    
    # --- Configuración global de fuentes y colores ---
    style.configure('TNotebook.Tab', font=('Arial', 10, 'bold'))
    style.configure('TButton', font=('Arial', 10), padding=5)
    style.configure('TLabel', font=('Arial', 10))
    app = PDFToolApp(root)
    root.mainloop()