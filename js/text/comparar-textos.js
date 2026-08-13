import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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
