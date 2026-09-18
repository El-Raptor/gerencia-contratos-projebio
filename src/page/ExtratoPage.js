import { loadExtratoDados } from '../service/ContratoService.js';
import { renderExtratoTable } from '../components/ExtratoTable.js';
import { renderDashboard } from './DashboardPage.js';

export async function renderExtratoPage(rootElement, codContrato) {
    rootElement.innerHTML = `<div class="loader">Carregando Extrato do Contrato...</div>`;

    try {
        const dados = await loadExtratoDados(codContrato);

        rootElement.innerHTML = `
            <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h1>Extrato de Movimentações (Contrato: ${codContrato})</h1>
                <button id="btnVoltar" class="button-container">
                    <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
                </button>
            </div>
            
            <div class="table-container">
                ${renderExtratoTable(dados)}
            </div>
        `;

        document.getElementById('btnVoltar').addEventListener('click', () => {
            renderDashboard(rootElement);
        });

    } catch (error) {
        rootElement.innerHTML = `
            <div class="error-msg">Erro ao carregar extrato: ${error.message}</div>
            <button id="btnVoltar" class="button-container" style="margin-top:20px;">Voltar</button>
        `;
        document.getElementById('btnVoltar').addEventListener('click', () => renderDashboard(rootElement));
    }
}