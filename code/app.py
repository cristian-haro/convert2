import tkinter as tk
from tkinter import filedialog, messagebox
import os
import tkinter.ttk
import subprocess 
from PyPDF2 import PdfReader, PdfWriter 
from PIL import Image, ImageDraw, ImageFont
import sys
import ctypes

def resource_path(relative_path):
    """ Obtiene la ruta absoluta para recursos, necesaria para el .exe """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# FUNCIONES DE MANIPULACIÓN DE PDF
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
        
        for pagina in lector.pages:
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
        img = Image.open(archivo_entrada)

        if formato_destino.upper() in ['JPEG', 'JPG'] and img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
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

        for i, pagina in enumerate(lector.pages):
            texto_completo += f"\n--- Página {i + 1} ---\n"
            texto_completo += pagina.extract_text() or ""
            
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
        img = Image.open(archivo_entrada).convert("RGBA")
        ancho, alto = img.size
        
        capa_marca = Image.new("RGBA", (ancho, alto), (255, 255, 255, 0))
        dibujo = ImageDraw.Draw(capa_marca)
        
        try:
            font_size = int(ancho / 10)
            fuente = ImageFont.truetype("arial.ttf", font_size) # Intentar Arial
        except IOError:
            font_size = int(ancho / 10)
            fuente = ImageFont.load_default() 

        bbox = dibujo.textbbox((0, 0), texto_marca, font=fuente)
        ancho_texto = bbox[2] - bbox[0]
        alto_texto = bbox[3] - bbox[1]
        
        x = (ancho - ancho_texto) / 2
        y = (alto - alto_texto) / 2
        
        color_marca = (0, 0, 0, 100) 
        
        dibujo.text((x, y), texto_marca, font=fuente, fill=color_marca)
        
        img_final = Image.alpha_composite(img, capa_marca)

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
        if os.name == 'nt':
            os.startfile(ruta_archivo)
        elif os.uname().sysname == 'Darwin':  # macOS
            subprocess.run(['open', ruta_archivo], check=True)
        else:
            subprocess.run(['xdg-open', ruta_archivo], check=True)
            
    except Exception as e:
        print(f"No se pudo abrir automáticamente el archivo {ruta_archivo}: {e}")

# INTERFAZ DE USUARIO CON TKINTER

class PDFToolApp:
    def __init__(self, master):
        self.master = master
        master.title("Convert2 by Cristian Haro")
        master.geometry("650x400")
        
        self.archivos_a_unir = []
        
        self.notebook = tk.ttk.Notebook(master)
        self.notebook.pack(pady=10, padx=10, expand=True, fill="both")

        self.frame_unir = tk.Frame(self.notebook)
        self.frame_separar = tk.Frame(self.notebook)
        self.frame_rotar = tk.Frame(self.notebook)
        self.frame_convertir_img = tk.Frame(self.notebook)
        self.frame_extraer_texto = tk.Frame(self.notebook)
        self.frame_marca_agua = tk.Frame(self.notebook)

        self.notebook.add(self.frame_unir, text="Unir PDF")
        self.notebook.add(self.frame_separar, text="Separar PDF")
        self.notebook.add(self.frame_rotar, text="Rotar Páginas")
        self.notebook.add(self.frame_convertir_img, text="Convertir Imagen")
        self.notebook.add(self.frame_extraer_texto, text="Extraer Texto")
        self.notebook.add(self.frame_marca_agua, text="Marca de Agua")
        
        self._setup_unir_tab()
        self._setup_separar_tab()
        self._setup_rotar_tab()
        self._setup_convertir_img_tab()
        self._setup_extraer_texto_tab()
        self._setup_marca_agua_tab()

    def _setup_unir_tab(self):
        tk.Label(self.frame_unir, text="Archivos a unir:", font=("Arial", 10)).pack(pady=5)
        
        self.lista_archivos = tk.Listbox(self.frame_unir, height=5, width=60)
        self.lista_archivos.pack(pady=5, padx=10)
        
        frame_btns_unir = tk.Frame(self.frame_unir)
        frame_btns_unir.pack(pady=5)

        btn_agregar = tk.Button(frame_btns_unir, text="➕ Agregar PDF", command=self.agregar_archivo_unir)
        btn_agregar.pack(side=tk.LEFT, padx=10)

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
                self.lista_archivos.delete(indice)
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
            self.archivos_a_unir = []
            self.lista_archivos.delete(0, tk.END)

    def _setup_separar_tab(self):
        self.separar_archivo_path = tk.StringVar()
        self.separar_inicio = tk.IntVar(value=1)
        self.separar_fin = tk.IntVar(value=1)
        
        tk.Label(self.frame_separar, text="Archivo Fuente:").pack(pady=5)
        tk.Entry(self.frame_separar, textvariable=self.separar_archivo_path, width=50).pack(pady=5, padx=10)
        btn_buscar = tk.Button(self.frame_separar, text="Buscar PDF", command=self.seleccionar_archivo_separar)
        btn_buscar.pack(pady=5)

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

    def _setup_rotar_tab(self):
        self.rotar_archivo_path = tk.StringVar()
        self.grados_rotacion = tk.IntVar(value=90)

        tk.Label(self.frame_rotar, text="Selecciona el PDF a Rotar:", font=("Arial", 10)).pack(pady=5)
        
        frame_archivo = tk.Frame(self.frame_rotar)
        frame_archivo.pack(pady=5)
        tk.Entry(frame_archivo, textvariable=self.rotar_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar PDF", command=self.seleccionar_archivo_rotar)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        tk.Label(self.frame_rotar, text="Grados de Rotación (Todos):", font=("Arial", 10)).pack(pady=10)
        
        opciones_rotacion = [90, 180, 270]
        frame_grados = tk.Frame(self.frame_rotar)
        frame_grados.pack(pady=5)
        
        for grado in opciones_rotacion:
            tk.Radiobutton(frame_grados, 
                           text=f"{grado}°", 
                           variable=self.grados_rotacion, 
                           value=grado).pack(side=tk.LEFT, padx=10)

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

    def _setup_extraer_texto_tab(self):
        self.extraer_archivo_path = tk.StringVar()

        tk.Label(self.frame_extraer_texto, text="Selecciona el PDF para extraer texto:", font=("Arial", 10)).pack(pady=10)

        frame_archivo = tk.Frame(self.frame_extraer_texto)
        frame_archivo.pack(pady=5)
        
        tk.Entry(frame_archivo, textvariable=self.extraer_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar PDF", command=self.seleccionar_archivo_extraer)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        tk.Label(self.frame_extraer_texto, 
                 text="Guarda el texto incrustado en un archivo .txt (No funciona en PDFs escaneados).", 
                 fg="gray").pack(pady=20)

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

    def _setup_convertir_img_tab(self):
        self.img_archivo_path = tk.StringVar()
        self.img_formato_destino = tk.StringVar(value="PNG")
        
        FORMATOS_COMUNES = ["PNG", "JPEG", "ICO","GIF", "BMP", "TIFF", "WEBP"]

        tk.Label(self.frame_convertir_img, text="Selecciona la Imagen de Origen:", font=("Arial", 10)).pack(pady=5)
        
        frame_archivo = tk.Frame(self.frame_convertir_img)
        frame_archivo.pack(pady=5)
        tk.Entry(frame_archivo, textvariable=self.img_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar Imagen", command=self.seleccionar_archivo_img)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        tk.Label(self.frame_convertir_img, text="Formato de Destino:", font=("Arial", 10)).pack(pady=10)
        
        self.menu_formato = tk.OptionMenu(self.frame_convertir_img, self.img_formato_destino, *FORMATOS_COMUNES)
        self.menu_formato.config(width=15)
        self.menu_formato.pack(pady=5)

        btn_convertir = tk.Button(self.frame_convertir_img, text="CONVERTIR IMAGEN", bg="#20B2AA", fg="white", command=self.ejecutar_conversion_img)
        btn_convertir.pack(pady=15)

    def seleccionar_archivo_img(self):
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

    def _setup_marca_agua_tab(self):
        self.marca_agua_archivo_path = tk.StringVar()
        self.texto_marca = tk.StringVar(value="CONFIDENCIAL")

        tk.Label(self.frame_marca_agua, text="1. Selecciona la Imagen:", font=("Arial", 10)).pack(pady=5)
        
        frame_archivo = tk.Frame(self.frame_marca_agua)
        frame_archivo.pack(pady=5)
        
        tk.Entry(frame_archivo, textvariable=self.marca_agua_archivo_path, width=40).pack(side=tk.LEFT, padx=5)
        btn_buscar = tk.Button(frame_archivo, text="Buscar Imagen", command=self.seleccionar_archivo_marca_agua)
        btn_buscar.pack(side=tk.LEFT, padx=5)

        tk.Label(self.frame_marca_agua, text="2. Texto de la Marca de Agua:", font=("Arial", 10)).pack(pady=10)
        
        tk.Entry(self.frame_marca_agua, textvariable=self.texto_marca, width=40).pack(pady=5)

        tk.Label(self.frame_marca_agua, 
                 text="El texto se aplicará en negro semitransparente y se centrará.", 
                 fg="gray").pack(pady=10)

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

# EJECUCIÓN

if __name__ == "__main__":
    try:
        import tkinter.ttk
    except ImportError:
        messagebox.showerror("Error", "Necesitas la librería 'tkinter.ttk'. Revisa tu instalación de Python.")
    myappid = 'miempresa.convert2.version1.0' 
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    root = tk.Tk()
    try:
        root.iconbitmap(resource_path("logo.ico"))
    except:
        pass

    style = tkinter.ttk.Style()
    
    style.theme_use("clam") 
    
    style.configure('TNotebook.Tab', font=('Arial', 10, 'bold'))
    style.configure('TButton', font=('Arial', 10), padding=5)
    style.configure('TLabel', font=('Arial', 10))
    app = PDFToolApp(root)
    root.mainloop()