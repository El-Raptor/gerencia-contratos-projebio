import { loadExtratoDados } from '../service/ContratoService.js';
import { renderExtratoTable, exportExtratoExcel } from '../components/ExtratoTable.js';
import { renderDashboard } from './DashboardPage.js';
import { getConfigTipo } from '../utils/tipoContrato.js';

export async function renderExtratoPage(rootElement, codContrato) {
    rootElement.innerHTML = `<div class="loader">Carregando Extrato do Contrato...</div>`;

    try {
        const dados = await loadExtratoDados(codContrato);
        const semDados = !dados || dados.length === 0;

        rootElement.innerHTML = `
            <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h1>Extrato de Movimentações (Contrato de ${getConfigTipo().label}: ${codContrato})</h1>
                <div class="header-actions">
                    <button id="btnExportarExcel" class="button-container" ${semDados ? 'disabled' : ''}>
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                    <button id="btnVoltar" class="button-container">
                        <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
                    </button>
                </div>
            </div>
            
            <div class="table-container">
                ${renderExtratoTable(dados)}
            </div>
        `;

        document.getElementById('btnVoltar').addEventListener('click', () => {
            renderDashboard(rootElement);
        });

        const btnExportar = document.getElementById('btnExportarExcel');
        btnExportar.addEventListener('click', async () => {
            const conteudoOriginal = btnExportar.innerHTML;
            btnExportar.disabled = true;
            btnExportar.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exportando...`;

            try {
                await exportExtratoExcel(dados, codContrato);
            } catch (error) {
                console.error('Erro ao exportar extrato:', error);
                alert(`Erro ao exportar para Excel: ${error.message}`);
            } finally {
                btnExportar.disabled = false;
                btnExportar.innerHTML = conteudoOriginal;
            }
        });

    } catch (error) {
        rootElement.innerHTML = `
            <div class="error-msg">Erro ao carregar extrato: ${error.message}</div>
            <button id="btnVoltar" class="button-container" style="margin-top:20px;">Voltar</button>
        `;
        document.getElementById('btnVoltar').addEventListener('click', () => renderDashboard(rootElement));
    }
}