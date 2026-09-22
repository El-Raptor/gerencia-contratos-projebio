import { getContratosData, getExtratoContrato, getFiltrosOptions } from '../model/ContratoModel.js';
import { parseFloatSafe, parseDateSafe } from '../utils/formatters.js';

// Nova função para buscar e separar os filtros
export async function loadFiltrosOptions() {
    const raw = await getFiltrosOptions();
    return {
        parceiros: raw.filter(r => r.TIPO === 'Parceiro'),
        contratos: raw.filter(r => r.TIPO === 'Contrato')
    };
}

// Atualizado para receber os filtros
export async function loadDashboardMetrics(filtros = { apenasVigentes: false, parceiro: '', contrato: '' }) {
    const response = await getContratosData();
    let dados = response.data || response; 

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Aplicar Filtros recebidos
    dados = dados.filter(row => {
        let aprovado = true;

        // Filtro Vigente
        if (filtros.apenasVigentes) {
            const dtIni = parseDateSafe(row.DTINI);
            const dtFim = parseDateSafe(row.DTFIM);
            if (dtIni && dtFim) {
                dtIni.setHours(0, 0, 0, 0);
                dtFim.setHours(0, 0, 0, 0);
                if (hoje < dtIni || hoje > dtFim) aprovado = false;
            } else {
                aprovado = false; // Se não tem data não está vigente
            }
        }

        // Filtro Parceiro (compara o código no início da string)
        if (aprovado && filtros.parceiro) {
            if (!row.PARCEIRO || !row.PARCEIRO.startsWith(filtros.parceiro + ' -')) {
                aprovado = false;
            }
        }

        // Filtro Contrato
        if (aprovado && filtros.contrato) {
            if (row.CODCONT != filtros.contrato) {
                aprovado = false;
            }
        }

        return aprovado;
    });

    // 2. Cálculos das Métricas (usando os dados já filtrados)
    let qtdVigentes = 0;
    let valorTotalContratado = 0;
    let valorFaturarTotal = 0;
    let qtdPendenteTotal = 0;

    const parceirosMap = {};
    const entregasMensaisMap = {};

    dados.forEach(row => {
        const vlrFaturar = parseFloatSafe(row.VLRFATURAR);
        const vlrCaucao = parseFloatSafe(row.VLRCAUCAO);
        const saldoAdiant = parseFloatSafe(row.SALDOADIANT);
        const qtdPen = parseFloatSafe(row.QTDPEN);
        const qtdNeg = parseFloatSafe(row.QTDNEG);

        const dtIni = parseDateSafe(row.DTINI);
        const dtFim = parseDateSafe(row.DTFIM);

        // Quantidade Vigente
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

        if (dtIni) {
            const mesAno = `${String(dtIni.getMonth() + 1).padStart(2, '0')}/${dtIni.getFullYear()}`;
            entregasMensaisMap[mesAno] = (entregasMensaisMap[mesAno] || 0) + qtdNeg;
        }
    });

    const mesesOrdenados = Object.keys(entregasMensaisMap).sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1) - new Date(anoB, mesB - 1);
    });

    const entregasMensaisOrdenadoMap = {};
    mesesOrdenados.forEach(mesAno => { entregasMensaisOrdenadoMap[mesAno] = entregasMensaisMap[mesAno]; });

    return {
        cards: { qtdVigentes, valorTotalContratado, valorFaturarTotal, qtdPendenteTotal },
        charts: { parceirosMap, entregasMensaisMap: entregasMensaisOrdenadoMap },
        tableData: dados
    };
}

export async function loadExtratoDados(codContrato) {
    return await getExtratoContrato(codContrato);
}