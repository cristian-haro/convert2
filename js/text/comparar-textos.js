export const html = `
<section class="tab-panel" id="panel-comparar-textos">
                <div class="panel-header">
                    <h2>Comparador Visual de Textos (Diff Checker)</h2>
                    <p>Compara dos textos o archivos planos y resalta las diferencias (añadido/eliminado) de forma
                        visual.</p>
                </div>

                <div class="diff-checker-container" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div class="diff-input-pane" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div class="diff-text-box"
                            style="position: relative; display: flex; flex-direction: column; gap: 0.5rem;">
                            <label for="diff-text-1" style="font-weight: 500;">Texto Original (A)</label>
                            <textarea id="diff-text-1" placeholder="Escribe o arrastra un archivo .txt aquí..."
                                rows="12"
                                style="width: 100%; font-family: inherit; font-size: 0.9rem; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: rgba(0,0,0,0.15); color: var(--color-text); resize: vertical; outline: none;"></textarea>
                            <div class="diff-drop-overlay" id="diff-drop-1"
                                style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(139, 92, 246, 0.8); border: 2px dashed #fff; border-radius: var(--border-radius-md); align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 1.1rem; pointer-events: none; z-index: 10;">
                                Arrastra tu archivo aquí</div>
                        </div>
                        <div class="diff-text-box"
                            style="position: relative; display: flex; flex-direction: column; gap: 0.5rem;">
                            <label for="diff-text-2" style="font-weight: 500;">Texto Modificado (B)</label>
                            <textarea id="diff-text-2" placeholder="Escribe o arrastra un archivo .txt aquí..."
                                rows="12"
                                style="width: 100%; font-family: inherit; font-size: 0.9rem; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: rgba(0,0,0,0.15); color: var(--color-text); resize: vertical; outline: none;"></textarea>
                            <div class="diff-drop-overlay" id="diff-drop-2"
                                style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(139, 92, 246, 0.8); border: 2px dashed #fff; border-radius: var(--border-radius-md); align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 1.1rem; pointer-events: none; z-index: 10;">
                                Arrastra tu archivo aquí</div>
                        </div>
                    </div>

                    <div class="diff-controls-bar"
                        style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1rem; flex-wrap: wrap; gap: 1rem;">
                        <div class="input-group inline-layout" style="display: flex; align-items: center; gap: 10px;">
                            <label for="diff-view-mode">Modo de vista:</label>
                            <div class="select-wrapper">
                                <select id="diff-view-mode">
                                    <option value="split" selected>Lado a Lado (Split)</option>
                                    <option value="unified">Unificado (Unified)</option>
                                </select>
                            </div>
                        </div>
                        <button class="btn btn-primary" id="btn-run-diff">
                            <i class="fa-solid fa-columns"></i> Comparar Textos
                        </button>
                    </div>

                    <!-- Diff Result Render Area -->
                    <div class="diff-results-wrapper" id="diff-result-view"
                        style="display: none; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: 1.5rem;">
                        <h3
                            style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                            Resultado de la Comparación</h3>
                        <div class="diff-rendered-content" id="diff-rendered-output"></div>
                    </div>
                </div>
            </section>

            <!-- 15. Privacidad Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export async function init() {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsdiff/5.1.0/diff.min.js');

    // TOOL 12f: COMPARADOR DE TEXTOS (DIFF CHECKER) [NEW]
    // ----------------------------------------------------------------------
    setupDiffDragAndDrop('diff-text-1', 'diff-drop-1');
    setupDiffDragAndDrop('diff-text-2', 'diff-drop-2');

    function setupDiffDragAndDrop(textareaId, overlayId) {
        const textarea = document.getElementById(textareaId);
        const overlay = document.getElementById(overlayId);

        textarea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            overlay.style.display = 'flex';
        });

        textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        overlay.addEventListener('dragleave', () => {
            overlay.style.display = 'none';
        });

        overlay.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.style.display = 'none';
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const reader = new FileReader();
                reader.onload = (evt) => {
                    textarea.value = evt.target.result;
                };
                reader.readAsText(file);
                showToast(`Cargado: ${file.name}`, 'info');
            }
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    document.getElementById('btn-run-diff').addEventListener('click', () => {
        const text1 = document.getElementById('diff-text-1').value;
        const text2 = document.getElementById('diff-text-2').value;
        const mode = document.getElementById('diff-view-mode').value;
        const resultView = document.getElementById('diff-result-view');
        const outputEl = document.getElementById('diff-rendered-output');

        if (!text1.trim() && !text2.trim()) {
            showToast('Por favor introduce texto en las cajas para comparar.', 'warning');
            return;
        }

        showLoader('Calculando diferencias...');
        try {
            const diff = Diff.diffLines(text1, text2);
            outputEl.innerHTML = '';

            if (mode === 'split') {
                // Side-by-Side Split View
                let leftHtml = '';
                let rightHtml = '';
                let leftLineNum = 1;
                let rightLineNum = 1;

                diff.forEach(part => {
                    const lines = part.value.split('\n');
                    if (lines[lines.length - 1] === '') lines.pop(); // remove trailing line break split

                    if (part.removed) {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line diff-removed"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-content">- ${escapeHtml(line)}</span></div>`;
                            rightHtml += `<div class="diff-line diff-empty-line"><span class="diff-line-number"></span><span class="diff-line-content"></span></div>`;
                        });
                    } else if (part.added) {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line diff-empty-line"><span class="diff-line-number"></span><span class="diff-line-content"></span></div>`;
                            rightHtml += `<div class="diff-line diff-added"><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">+ ${escapeHtml(line)}</span></div>`;
                        });
                    } else {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                            rightHtml += `<div class="diff-line"><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                        });
                    }
                });

                outputEl.innerHTML = `
                    <div class="diff-split-container">
                        <div class="diff-split-column">
                            <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; border-bottom:1px solid var(--border-color); padding-bottom:4px; margin-bottom:8px; color:var(--color-text-muted);">Texto Original</div>
                            ${leftHtml}
                        </div>
                        <div class="diff-split-column">
                            <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; border-bottom:1px solid var(--border-color); padding-bottom:4px; margin-bottom:8px; color:var(--color-text-muted);">Texto Modificado</div>
                            ${rightHtml}
                        </div>
                    </div>
                `;
            } else {
                // Unified single column view
                let unifiedHtml = '';
                let leftLineNum = 1;
                let rightLineNum = 1;

                diff.forEach(part => {
                    const lines = part.value.split('\n');
                    if (lines[lines.length - 1] === '') lines.pop();

                    if (part.removed) {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line diff-removed"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-number">-</span><span class="diff-line-content">- ${escapeHtml(line)}</span></div>`;
                        });
                    } else if (part.added) {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line diff-added"><span class="diff-line-number">-</span><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">+ ${escapeHtml(line)}</span></div>`;
                        });
                    } else {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                        });
                    }
                });

                outputEl.innerHTML = `
                    <div class="diff-unified-container">
                        ${unifiedHtml}
                    </div>
                `;
            }

            resultView.style.display = 'block';
            showToast('Diferencias calculadas con éxito', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al comparar los textos.', 'error');
        } finally {
            hideLoader();
        }
    });

}
