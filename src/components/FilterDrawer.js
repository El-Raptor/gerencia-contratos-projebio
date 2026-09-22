export function renderFilterDrawer(opcoesFiltro, filtrosAtuais) {
    const parceirosOptions = opcoesFiltro.parceiros.map(p => 
        `<option value="${p.CODIGO}" ${filtrosAtuais.parceiro == p.CODIGO ? 'selected' : ''}>${p.CODIGO} - ${p.DESCRICAO}</option>`
    ).join('');

    const contratosOptions = opcoesFiltro.contratos.map(c => 
        `<option value="${c.CODIGO}" ${filtrosAtuais.contrato == c.CODIGO ? 'selected' : ''}>${c.CODIGO} - ${c.DESCRICAO}</option>`
    ).join('');

    return `
        <div id="filterOverlay" class="filter-overlay"></div>
        <div id="filterDrawer" class="filter-drawer">
            <div class="drawer-header">
                <h2>Filtros do Dashboard</h2>
                <button id="closeDrawerBtn" class="close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="drawer-body">
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="filtroVigente" ${filtrosAtuais.apenasVigentes ? 'checked' : ''}>
                        Apenas Contratos Vigentes
                    </label>
                </div>
                <div class="form-group">
                    <label for="filtroParceiro">Parceiro</label>
                    <select id="filtroParceiro" class="custom-select">
                        <option value="">Todos</option>
                        ${parceirosOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="filtroContrato">Contrato</label>
                    <select id="filtroContrato" class="custom-select">
                        <option value="">Todos</option>
                        ${contratosOptions}
                    </select>
                </div>
            </div>
            <div class="drawer-footer">
                <button id="btnLimparFiltros" class="button-container" style="background-color: var(--text-muted);">Limpar</button>
                <button id="btnAplicarFiltros" class="button-container">Aplicar Filtros</button>
            </div>
        </div>
    `;
}