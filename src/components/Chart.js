export function renderCharts({ parceirosMap, pendenciasMensaisMap }) {
    const parceiros = Object.keys(parceirosMap);
    const qtdPendente = parceiros.map(p => parceirosMap[p].pendente);
    const vlrFaturar = parceiros.map(p => parceirosMap[p].vlrFaturar);

    // Já vem agrupado e ordenado pelo ContratoService (MM/AAAA -> quantidade)
    const meses = Object.keys(pendenciasMensaisMap);
    const pendenciasMensais = meses.map(m => pendenciasMensaisMap[m]);

    const colorPendente = '#6b7aff'; 
    const colorFaturar = '#00bcd4';  
    const colorPendenciasMensais = '#1f3c88'; 

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

    // Gráfico: Pendências Mensais (Barras verticais, por mês de Previsão de Entrega)
    new Chart(document.getElementById('chartPendenciasMensais'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Qtd Pendente',
                data: pendenciasMensais,
                backgroundColor: colorPendenciasMensais,
                borderRadius: 4
            }]
        },
        options: { 
            ...commonOptions,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                ...commonOptions.plugins,
                title: { display: true, text: 'Pendências Mensais', color: '#1b2559', font: { size: 14, weight: '600' } }
            }
        }
    });
}