export const html = `
<section class="tab-panel" id="panel-inicio">
    <div class="inicio-container">
        <!-- Hero section -->
        <div class="inicio-hero">
            <h1>Caja de Herramientas Local y Privada</h1>
            <p>Procesa, edita, convierte y gestiona tus PDFs e imágenes de forma 100% confidencial en tu navegador. Tus archivos nunca salen de tu ordenador.</p>
        </div>

        <!-- Category: PDF & Documents -->
        <div class="inicio-category-section">
            <h2 class="inicio-category-title">Documentos PDF</h2>
            <div class="inicio-grid">
                <div class="mosaic-card" data-tab="unir-pdf">
                    <i class="fa-solid fa-object-group"></i>
                    <div class="mosaic-card-body">
                        <h3>Unir PDF</h3>
                        <p>Combina múltiples documentos PDF en uno solo en el orden que decidas.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="separar-pdf">
                    <i class="fa-solid fa-scissors"></i>
                    <div class="mosaic-card-body">
                        <h3>Separar PDF</h3>
                        <p>Extrae rangos de páginas o guárdalas como archivos independientes.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="rotar-pdf">
                    <i class="fa-solid fa-rotate"></i>
                    <div class="mosaic-card-body">
                        <h3>Rotar PDF</h3>
                        <p>Gira las páginas de tus archivos y guárdalas en la orientación correcta.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="imagenes-pdf">
                    <i class="fa-solid fa-images"></i>
                    <div class="mosaic-card-body">
                        <h3>Imágenes a PDF</h3>
                        <p>Convierte fotos JPEG, PNG o WebP en un documento PDF consolidado.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="pdf-imagenes">
                    <i class="fa-solid fa-file-image"></i>
                    <div class="mosaic-card-body">
                        <h3>PDF a Imágenes</h3>
                        <p>Extrae todas las páginas de un PDF y guárdalas en JPEG o PNG.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="firmar-pdf">
                    <i class="fa-solid fa-signature"></i>
                    <div class="mosaic-card-body">
                        <h3>Firmar PDF</h3>
                        <p>Añade firmas manuscritas digitales en el lienzo de tus documentos.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="proteger-pdf">
                    <i class="fa-solid fa-lock"></i>
                    <div class="mosaic-card-body">
                        <h3>Proteger PDF</h3>
                        <p>Cifra tus documentos con contraseña o elimina restricciones de copiado.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="docx-pdf">
                    <i class="fa-solid fa-file-pdf"></i>
                    <div class="mosaic-card-body">
                        <h3>Word a PDF</h3>
                        <p>Convierte documentos de Word (DOCX) a formato PDF de forma directa.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="pdf-docx">
                    <i class="fa-solid fa-file-word"></i>
                    <div class="mosaic-card-body">
                        <h3>PDF a Word</h3>
                        <p>Convierte el texto e imágenes de un PDF en un archivo DOCX editable.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="organizar-pdf">
                    <i class="fa-solid fa-folder-tree"></i>
                    <div class="mosaic-card-body">
                        <h3>Organizar PDF</h3>
                        <p>Ordena, rota, duplica o elimina páginas de forma interactiva.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="compresor-pdf">
                    <i class="fa-solid fa-compress"></i>
                    <div class="mosaic-card-body">
                        <h3>Comprimir PDF</h3>
                        <p>Reduce el peso de tus documentos optimizando la resolución de imagen.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Category: Image Editing -->
        <div class="inicio-category-section">
            <h2 class="inicio-category-title">Edición de Imágenes</h2>
            <div class="inicio-grid">
                <div class="mosaic-card" data-tab="convertir-img">
                    <i class="fa-solid fa-image"></i>
                    <div class="mosaic-card-body">
                        <h3>Convertir Imagen</h3>
                        <p>Convierte formatos (PNG, JPEG, WebP) en lote conservando la resolución.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="compresor-img">
                    <i class="fa-solid fa-minimize"></i>
                    <div class="mosaic-card-body">
                        <h3>Comprimir Imagen</h3>
                        <p>Reduce el peso de tus fotos controlando la escala y compresión visual.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="recortar-img">
                    <i class="fa-solid fa-crop-simple"></i>
                    <div class="mosaic-card-body">
                        <h3>Recortar y Redim.</h3>
                        <p>Ajusta dimensiones, recorta áreas y redimensiona fotos libremente.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="marca-agua">
                    <i class="fa-solid fa-stamp"></i>
                    <div class="mosaic-card-body">
                        <h3>Marca de Agua</h3>
                        <p>Protege tus imágenes añadiendo firmas de texto o logotipos opacos.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="eliminar-fondo">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <div class="mosaic-card-body">
                        <h3>Eliminar Fondo</h3>
                        <p>Elimina fondos automáticamente con IA de forma local y transparente.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="limpiar-exif">
                    <i class="fa-solid fa-user-secret"></i>
                    <div class="mosaic-card-body">
                        <h3>Limpiar EXIF</h3>
                        <p>Remueve metadatos de geolocalización y autor de tus archivos fotográficos.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="cuadrar-img">
                    <i class="fa-solid fa-vector-square"></i>
                    <div class="mosaic-card-body">
                        <h3>Cuadrar Imagen</h3>
                        <p>Adapta fotos a proporciones de redes sociales agregando bordes difuminados.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Category: Text & Office -->
        <div class="inicio-category-section">
            <h2 class="inicio-category-title">Texto y Oficina</h2>
            <div class="inicio-grid">
                <div class="mosaic-card" data-tab="extraer-texto">
                    <i class="fa-solid fa-file-lines"></i>
                    <div class="mosaic-card-body">
                        <h3>Extraer Texto</h3>
                        <p>Copia texto plano contenido en archivos PDF y Word de forma rápida.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="ocr-local">
                    <i class="fa-solid fa-eye"></i>
                    <div class="mosaic-card-body">
                        <h3>OCR Local</h3>
                        <p>Reconoce y extrae texto de imágenes o PDFs escaneados usando Tesseract.</p>
                    </div>
                </div>
                <div class="mosaic-card" data-tab="comparar-textos">
                    <i class="fa-solid fa-columns"></i>
                    <div class="mosaic-card-body">
                        <h3>Comparar Textos</h3>
                        <p>Compara diferencias de texto lado a lado resaltando líneas y palabras.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
`;

export function init() {
    const cards = document.querySelectorAll('#panel-inicio .mosaic-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const tabId = card.getAttribute('data-tab');
            if (tabId) {
                // Find matching nav trigger in the header/sidebar navigation lists and trigger it
                const navTrigger = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
                if (navTrigger) {
                    navTrigger.click();
                }
            }
        });
    });
}
