import { getContratosData, getExtratoContrato, getFiltrosOptions, getProgramacoesContrato } from '../model/ContratoModel.js';
import { parseFloatSafe, parseDateSafe } from '../utils/formatters.js';

// Nova função para buscar e separar os filtros
export async function loadFiltrosOptions() {
    const raw = await getFiltrosOptions();
    return {
        parceiros: raw.filter(r => r.TIPO === 'Parceiro'),
        contratos: raw.filter(r => r.TIPO === 'Contrato')
    };
}

function chaveMes(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

// Pendências Mensais:
// - Contrato com programações: pendente de cada programação no mês da Previsão de Entrega
//   (programação sem previsão cai no mês de DTFIM; programação 100% entregue não aparece).
// - Contrato sem programação: pendente do contrato no mês de DTFIM.
// Recebe os contratos JÁ filtrados, então os filtros do dashboard valem para o gráfico.
function montarPendenciasMensais(contratos, programacoes) {
    const programacoesPorContrato = {};
    programacoes.forEach(p => {
        const cod = String(p.CODCONT);
        (programacoesPorContrato[cod] = programacoesPorContrato[cod] || []).push(p);
    });

    const mapa = {};
    const somar = (data, qtd) => {
        if (!data || qtd <= 0) return;
        const chave = chaveMes(data);
        mapa[chave] = (mapa[chave] || 0) + qtd;
    };

    contratos.forEach(row => {
        const progs = programacoesPorContrato[String(row.CODCONT)];
        const dtFim = parseDateSafe(row.DTFIM);

        if (progs && progs.length) {
            progs.forEach(p => somar(parseDateSafe(p.DTPREVENT) || dtFim, parseFloatSafe(p.QTDPEN)));
        } else {
            somar(dtFim, parseFloatSafe(row.QTDPEN));
        }
    });

    // Ordena cronologicamente e devolve com rótulo MM/AAAA
    const ordenado = {};
    Object.keys(mapa).sort().forEach(chave => {
        const [ano, mes] = chave.split('-');
        ordenado[`${mes}/${ano}`] = mapa[chave];
    });
    return ordenado;
}

// Atualizado para receber os filtros
export async function loadDashboardMetrics(filtros = { apenasVigentes: false, parceiro: '', contrato: '' }) {
    const [response, programacoes] = await Promise.all([
        getContratosData(),
        getProgramacoesContrato()
    ]);
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

    dados.forEach(row => {
        const vlrFaturar = parseFloatSafe(row.VLRFATURAR);
        const qtdPen = parseFloatSafe(row.QTDPEN);

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

        valorTotalContratado += parseFloatSafe(row.VLRCONTRATO);
        valorFaturarTotal += vlrFaturar;
        qtdPendenteTotal += qtdPen;

        if (!parceirosMap[row.PARCEIRO]) {
            parceirosMap[row.PARCEIRO] = { pendente: 0, vlrFaturar: 0 };
        }
        parceirosMap[row.PARCEIRO].pendente += qtdPen;
        parceirosMap[row.PARCEIRO].vlrFaturar += vlrFaturar;
    });

    const pendenciasMensaisMap = montarPendenciasMensais(dados, programacoes);

    return {
        cards: { qtdVigentes, valorTotalContratado, valorFaturarTotal, qtdPendenteTotal },
        charts: { parceirosMap, pendenciasMensaisMap },
        tableData: dados
    };
}

export async function loadExtratoDados(codContrato) {
    return await getExtratoContrato(codContrato);
}