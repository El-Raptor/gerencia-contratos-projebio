import { getContratosData } from '../model/ContratoModel.js';
import { getExtratoContrato } from '../model/ContratoModel.js';

export async function loadExtratoDados(codContrato) {
    return await getExtratoContrato(codContrato);
}

export async function loadDashboardMetrics() {
    const response = await getContratosData();
    // Tratativa assumindo que a biblioteca JSK retorne a listagem no array principal 
    const dados = response.data || response; 

    // Métricas dos Cards
    let qtdVigentes = 0;
    let valorTotalContratado = 0; // Usando a QTDNEG * VLRFATURAR (ou sum do VLRFATURAR)
    let valorFaturarTotal = 0;
    let qtdPendenteTotal = 0;

    // Dados para Gráficos
    const parceirosMap = {};
    const entregasMensaisMap = {};

    const hoje = new Date();

    dados.forEach(row => {
        // Quantidade Vigente (Considerando contratos que ainda não venceram)
        const dtFim = new Date(row.DTFIM);
        if (dtFim >= hoje) qtdVigentes++;

        valorTotalContratado += (row.VLRFATURAR || 0) + (row.VLRCAUCAO || 0) + (row.SALDOADIANT || 0); // Ajuste conforme regra de negócio exata
        valorFaturarTotal += (row.VLRFATURAR || 0);
        qtdPendenteTotal += (row.QTDPEN || 0);

        // Agrupamento por Parceiro (Gráficos 1 e 2)
        if (!parceirosMap[row.PARCEIRO]) {
            parceirosMap[row.PARCEIRO] = { pendente: 0, vlrFaturar: 0 };
        }
        parceirosMap[row.PARCEIRO].pendente += (row.QTDPEN || 0);
        parceirosMap[row.PARCEIRO].vlrFaturar += (row.VLRFATURAR || 0);

        // Agrupamento por Mês (Gráfico 3 de Linhas - Usando DTINI como referência)
        if (row.DTINI) {
            const dataIni = new Date(row.DTINI);
            const mesAno = `${String(dataIni.getMonth() + 1).padStart(2, '0')}/${dataIni.getFullYear()}`;
            entregasMensaisMap[mesAno] = (entregasMensaisMap[mesAno] || 0) + (row.QTDNEG || 0);
        }
    });

    return {
        cards: { qtdVigentes, valorTotalContratado, valorFaturarTotal, qtdPendenteTotal },
        charts: { parceirosMap, entregasMensaisMap },
        tableData: dados
    };
}