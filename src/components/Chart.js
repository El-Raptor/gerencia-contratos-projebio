export function renderCharts({ parceirosMap, entregasMensaisMap }) {
    const parceiros = Object.keys(parceirosMap);
    const qtdPendente = parceiros.map(p => parceirosMap[p].pendente);
    const vlrFaturar = parceiros.map(p => parceirosMap[p].vlrFaturar);

    const meses = Object.keys(entregasMensaisMap);
    const entregas = meses.map(m => entregasMensaisMap[m]);

    // Cores baseadas nas variáveis de KPI
    const colorPendente = '#6b7aff'; // kpi-open-text
    const colorFaturar = '#00bcd4';  // kpi-closed-text
    const colorEntregas = '#1f3c88'; // primary-color

    // Configuração base da fonte
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#a3aed1";

    // Gráfico: Qtd Pendente por Parceiro
    new Chart(document.getElementById('chartQtdPendente'), {
        type: 'bar',
        data: {
            labels: parceiros,
            datasets: [{ 
                label: 'Qtd Pendente', 
                data: qtdPendente, 
                backgroundColor: colorPendente,
                borderRadius: 4
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });

    // Gráfico: Vlr Faturar por Parceiro
    new Chart(document.getElementById('chartVlrFaturar'), {
        type: 'bar',
        data: {
            labels: parceiros,
            datasets: [{ 
                label: 'Valor a Faturar', 
                data: vlrFaturar, 
                backgroundColor: colorFaturar,
                borderRadius: 4
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });

    // Gráfico: Entregas Mensais
    new Chart(document.getElementById('chartEntregasMensais'), {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Entregas Mensais (Qtd)',
                data: entregas,
                borderColor: colorEntregas,
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(31, 60, 136, 0.08)' // accent-dim
            }]
        }
    });
}