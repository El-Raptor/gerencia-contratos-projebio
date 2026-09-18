import { loadDashboardMetrics } from '../service/ContratoService.js';
import { renderCard } from '../components/Card.js';
import { renderCharts } from '../components/Chart.js';
import { renderTable } from '../components/Table.js';
import { formatCurrency } from '../utils/formatters.js';
import { renderExtratoPage } from './ExtratoPage.js'; // Novo Import

export async function renderDashboard(rootElement) {
    rootElement.innerHTML = `<div class="loader">Carregando Dashboard...</div>`;

    try {
        const data = await loadDashboardMetrics();
        
        rootElement.innerHTML = `
            <div class="dashboard-header">
                <h1>Gerência de Contratos</h1>
            </div>
            
            <div class="cards-container">
                ${renderCard('Contratos Vigentes', data.cards.qtdVigentes, 'fas fa-file-contract', 'icon-open')}
                ${renderCard('Valor Total Contratado', formatCurrency(data.cards.valorTotalContratado), 'fas fa-money-bill-wave', 'icon-calc')}
                ${renderCard('Valor a Faturar', formatCurrency(data.cards.valorFaturarTotal), 'fas fa-hand-holding-usd', 'icon-initial')}
                ${renderCard('Quantidade Pendente', data.cards.qtdPendenteTotal, 'fas fa-boxes', 'icon-backlog')}
            </div>

            <div class="charts-container">
                <div class="chart-wrapper"><canvas id="chartQtdPendente"></canvas></div>
                <div class="chart-wrapper"><canvas id="chartVlrFaturar"></canvas></div>
                <div class="chart-wrapper"><canvas id="chartEntregasMensais"></canvas></div>
            </div>

            <div class="table-container" id="mainTableContainer">
                ${renderTable(data.tableData)}
            </div>
        `;

        renderCharts(data.charts);

        // Event Delegation: Escuta cliques dentro da tabela
        const tableContainer = document.getElementById('mainTableContainer');
        tableContainer.addEventListener('click', (event) => {
            const row = event.target.closest('.clickable-row');
            if (row) {
                const codContrato = row.getAttribute('data-codcont');
                if (codContrato) {
                    // Navega para a página de extrato
                    renderExtratoPage(rootElement, codContrato);
                }
            }
        });

    } catch (error) {
        rootElement.innerHTML = `<div class="error-msg">Erro ao carregar dados: ${error.message}</div>`;
    }
}