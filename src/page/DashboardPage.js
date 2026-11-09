import { loadDashboardMetrics, loadFiltrosOptions } from '../service/ContratoService.js';
import { renderCard } from '../components/Card.js';
import { renderCharts } from '../components/Chart.js';
import { renderTable } from '../components/Table.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { renderExtratoPage } from './ExtratoPage.js'; 
import { renderFilterDrawer } from '../components/FilterDrawer.js';
import { TIPOS_CONTRATO, getTipoContrato, setTipoContrato, getConfigTipo } from '../utils/tipoContrato.js';

// Estado global dos filtros para manter entre as navegações
let currentFilters = { apenasVigentes: false, parceiro: '', contrato: '' };
// Cache das opções de filtro separado por tipo (compras/vendas)
const opcoesFiltroCache = {};

function renderTipoSelector() {
    const atual = getTipoContrato();
    const botoes = Object.values(TIPOS_CONTRATO).map(t => `
        <button type="button" class="tipo-option ${t.chave === atual ? 'active' : ''}" data-tipo="${t.chave}" aria-pressed="${t.chave === atual}">
            ${t.label}
        </button>
    `).join('');

    return `<div class="tipo-selector" role="group" aria-label="Tipo de contrato">${botoes}</div>`;
}

export async function renderDashboard(rootElement) {
    rootElement.innerHTML = `<div class="loader">Carregando Dashboard...</div>`;

    try {
        // Carrega opções do filtro 1 vez para popular os selects
        const tipo = getTipoContrato();
        if (!opcoesFiltroCache[tipo]) {
            opcoesFiltroCache[tipo] = await loadFiltrosOptions();
        }

        // Passa o estado atual para recalcular os dados
        const data = await loadDashboardMetrics(currentFilters);
        
        rootElement.innerHTML = `
            <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h1 style="margin-bottom:0;">Gerência de Contratos de ${getConfigTipo().label}</h1>
                <div class="header-actions">
                    ${renderTipoSelector()}
                    <button id="btnAbrirFiltro" class="button-container">
                        <i class="fas fa-filter"></i> Filtros
                    </button>
                </div>
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
                <div class="chart-wrapper"><canvas id="chartPendenciasMensais"></canvas></div>
            </div>

            <div class="table-container" id="mainTableContainer">
                ${renderTable(data.tableData)}
            </div>

            <!-- Injetando a Gaveta no DOM -->
            <div id="drawerContainer">
                ${renderFilterDrawer(opcoesFiltroCache[tipo], currentFilters)}
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

        // Seletor Compras / Vendas
        rootElement.querySelectorAll('.tipo-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const novoTipo = btn.getAttribute('data-tipo');
                if (novoTipo === getTipoContrato()) return;

                setTipoContrato(novoTipo);
                // Parceiro e contrato de um tipo não existem no outro: zera esses filtros
                currentFilters = { ...currentFilters, parceiro: '', contrato: '' };
                renderDashboard(rootElement);
            });
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