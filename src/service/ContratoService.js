import { getContratosData, getExtratoContrato } from '../model/ContratoModel.js';
import { parseFloatSafe, parseDateSafe } from '../utils/formatters.js'; // Importando parseDateSafe

export async function loadDashboardMetrics() {
    const response = await getContratosData();
    const dados = response.data || response; 

    let qtdVigentes = 0;
    let valorTotalContratado = 0;
    let valorFaturarTotal = 0;
    let qtdPendenteTotal = 0;

    const parceirosMap = {};
    const entregasMensaisMap = {};
    
    // Zera as horas para comparar datas de forma justa
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    dados.forEach(row => {
        const vlrFaturar = parseFloatSafe(row.VLRFATURAR);
        const vlrCaucao = parseFloatSafe(row.VLRCAUCAO);
        const saldoAdiant = parseFloatSafe(row.SALDOADIANT);
        const qtdPen = parseFloatSafe(row.QTDPEN);
        const qtdNeg = parseFloatSafe(row.QTDNEG);

        const dtIni = parseDateSafe(row.DTINI);
        const dtFim = parseDateSafe(row.DTFIM);

        // 1. Contratos Vigentes: Hoje está entre a data inicial e a data final
        if (dtIni && dtFim) {
            dtIni.setHours(0, 0, 0, 0);
            dtFim.setHours(0, 0, 0, 0);
            
            if (hoje >= dtIni && hoje <= dtFim) {
                qtdVigentes++;
            }
        }

        valorTotalContratado += (vlrFaturar + vlrCaucao + saldoAdiant);
        valorFaturarTotal += vlrFaturar;
        qtdPendenteTotal += qtdPen;

        if (!parceirosMap[row.PARCEIRO]) {
            parceirosMap[row.PARCEIRO] = { pendente: 0, vlrFaturar: 0 };
        }
        parceirosMap[row.PARCEIRO].pendente += qtdPen;
        parceirosMap[row.PARCEIRO].vlrFaturar += vlrFaturar;

        // 2. Gráfico Entregas Mensais
        if (dtIni) {
            const mesAno = `${String(dtIni.getMonth() + 1).padStart(2, '0')}/${dtIni.getFullYear()}`;
            entregasMensaisMap[mesAno] = (entregasMensaisMap[mesAno] || 0) + qtdNeg;
        }
    });

    // Opcional: Ordena os meses do gráfico de linha de forma cronológica
    const mesesOrdenados = Object.keys(entregasMensaisMap).sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1) - new Date(anoB, mesB - 1);
    });

    const entregasMensaisOrdenadoMap = {};
    mesesOrdenados.forEach(mesAno => {
        entregasMensaisOrdenadoMap[mesAno] = entregasMensaisMap[mesAno];
    });

    return {
        cards: { qtdVigentes, valorTotalContratado, valorFaturarTotal, qtdPendenteTotal },
        charts: { parceirosMap, entregasMensaisMap: entregasMensaisOrdenadoMap },
        tableData: dados
    };
}

export async function loadExtratoDados(codContrato) {
    return await getExtratoContrato(codContrato);
}