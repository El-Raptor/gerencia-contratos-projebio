import { loadDashboardMetrics, loadFiltrosOptions } from '../service/ContratoService.js';
import { renderCard } from '../components/Card.js';
import { renderCharts } from '../components/Chart.js';
import { renderTable } from '../components/Table.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { renderExtratoPage } from './ExtratoPage.js'; 
import { renderFilterDrawer } from '../components/FilterDrawer.js';

// Estado global dos filtros para manter entre as navegações
let currentFilters = { apenasVigentes: false, parceiro: '', contrato: '' };
let opcoesFiltroCache = null;

export async function renderDashboard(rootElement) {
    rootElement.innerHTML = `<div class="loader">Carregando Dashboard...</div>`;

    try {
        // Carrega opções do filtro 1 vez para popular os selects
        if (!opcoesFiltroCache) {
            opcoesFiltroCache = await loadFiltrosOptions();
        }

        // Passa o estado atual para recalcular os dados
        const data = await loadDashboardMetrics(currentFilters);
        
        rootElement.innerHTML = `
            <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h1 style="margin-bottom:0;">Gerência de Contratos</h1>
                <button id="btnAbrirFiltro" class="button-container">
                    <i class="fas fa-filter"></i> Filtros
                </button>
            </div>
            
            <div class="cards-container">
                ${renderCard('Contratos Vigentes', formatNumber(data.cards.qtdVigentes), 'fas fa-file-contract', 'icon-open')}
                ${renderCard('Valor Total Contratado', formatCurrency(data.cards.valorTotalContratado), 'fas fa-money-bill-wave', 'icon-calc')}
                ${renderCard('Valor a Faturar', formatCurrency(data.cards.valorFaturarTotal), 'fas fa-hand-holding-usd', 'icon-initial')}
                ${renderCard('Quantidade Pendente', formatNumber(data.cards.qtdPendenteTotal), 'fas fa-boxes', 'icon-backlog')}
            </div>

            <div class="charts-container">
                <div class="chart-wrapper"><canvas id="chartQtdPendente"></canvas></div>
                <div class="chart-wrapper"><canvas id="chartVlrFaturar"></canvas></div>
                <div class="chart-wrapper"><canvas id="chartEntregasMensais"></canvas></div>
            </div>

            <div class="table-container" id="mainTableContainer">
                ${renderTable(data.tableData)}
            </div>

            <!-- Injetando a Gaveta no DOM -->
            <div id="drawerContainer">
                ${renderFilterDrawer(opcoesFiltroCache, currentFilters)}
            </div>
        `;

        renderCharts(data.charts);

        // Lógica de Tabela (Drill Down)
        const tableContainer = document.getElementById('mainTableContainer');
        tableContainer.addEventListener('click', (event) => {
            const row = event.target.closest('.clickable-row');
            if (row) {
                const codContrato = row.getAttribute('data-codcont');
                if (codContrato) renderExtratoPage(rootElement, codContrato);
            }
        });

        // Eventos da Gaveta de Filtros
        const drawer = document.getElementById('filterDrawer');
        const overlay = document.getElementById('filterOverlay');
        
        const fecharGaveta = () => {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
        };

        const abrirGaveta = () => {
            drawer.classList.add('open');
            overlay.classList.add('open');
        };

        document.getElementById('btnAbrirFiltro').addEventListener('click', abrirGaveta);
        document.getElementById('closeDrawerBtn').addEventListener('click', fecharGaveta);
        overlay.addEventListener('click', fecharGaveta);

        // Aplicar
        document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
            currentFilters = {
                apenasVigentes: document.getElementById('filtroVigente').checked,
                parceiro: document.getElementById('filtroParceiro').value,
                contrato: document.getElementById('filtroContrato').value
            };
            fecharGaveta();
            renderDashboard(rootElement); // Re-renderiza tudo com o novo filtro
        });

        // Limpar
        document.getElementById('btnLimparFiltros').addEventListener('click', () => {
            currentFilters = { apenasVigentes: false, parceiro: '', contrato: '' };
            fecharGaveta();
            renderDashboard(rootElement);
        });

    } catch (error) {
        rootElement.innerHTML = `<div class="error-msg">Erro ao carregar dados: ${error.message}</div>`;
    }
}