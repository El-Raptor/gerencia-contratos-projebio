export function renderCharts({ parceirosMap, entregasMensaisMap }) {
    const parceiros = Object.keys(parceirosMap);
    const qtdPendente = parceiros.map(p => parceirosMap[p].pendente);
    const vlrFaturar = parceiros.map(p => parceirosMap[p].vlrFaturar);

    const meses = Object.keys(entregasMensaisMap);
    const entregas = meses.map(m => entregasMensaisMap[m]);

    const colorPendente = '#6b7aff'; 
    const colorFaturar = '#00bcd4';  
    const colorEntregas = '#1f3c88'; 

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#a3aed1";

    const commonOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        }
    };

    // Gráfico: Qtd Pendente por Parceiro (Horizontal)
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
        options: { 
            ...commonOptions,
            indexAxis: 'y', /* Transforma o gráfico em barras horizontais */
            plugins: {
                ...commonOptions.plugins,
                title: { display: true, text: 'Quantidade Pendente', color: '#1b2559', font: { size: 14, weight: '600' } }
            }
        }
    });

    // Gráfico: Vlr Faturar por Parceiro (Horizontal)
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
        options: { 
            ...commonOptions,
            indexAxis: 'y', /* Transforma o gráfico em barras horizontais */
            plugins: {
                ...commonOptions.plugins,
                title: { display: true, text: 'Valor a Faturar', color: '#1b2559', font: { size: 14, weight: '600' } }
            }
        }
    });

    // Gráfico: Entregas Mensais (Linhas - Mantido igual)
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
                backgroundColor: 'rgba(31, 60, 136, 0.08)'
            }]
        },
        options: { 
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: { display: true, text: 'Entregas Mensais', color: '#1b2559', font: { size: 14, weight: '600' } }
            }
        }
    });
}