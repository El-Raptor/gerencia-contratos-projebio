import { JSK } from "https://cdn.jsdelivr.net/npm/@jtandrelevicius/utils-js-library@latest/index.js";
import { getConfigTipo } from '../utils/tipoContrato.js';

// =====================================================================================
// Regras de saldo compartilhadas entre o EXTRATO e a TABELA PRINCIPAL do dashboard.
// As duas telas montam as mesmas movimentações e aplicam as mesmas fórmulas,
// então o saldo final de um contrato no extrato é sempre igual ao da tabela.
// =====================================================================================

// Ordem cronológica das movimentações (define exibição e consumo dos saldos):
// 1) Contrato sempre em primeiro lugar
// 2) dia do movimento (sem hora; lançamentos sem data vão para o fim)
// 3) NUFIN como desempate dentro do mesmo dia
// 4) ID_REGISTRO como último desempate, para a ordem ser sempre a mesma
const ORDEM_EXTRATO = `CASE WHEN TIPOLANC = 'Contrato' THEN 0 ELSE 1 END, TRUNC(DTMOV) NULLS LAST, NUFIN NULLS FIRST, ID_REGISTRO`;
const JANELA = `OVER (PARTITION BY CODCONT ORDER BY ${ORDEM_EXTRATO} ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`;

// Fórmulas dos saldos a partir dos totais:
// - Consumo: as notas gastam primeiro o adiantamento, depois a caução;
//   só então o adiantamento fica negativo.
// - A faturar = contrato - depósitos - notas que não consumiram depósito
//   (vendas sem caução/adiantamento) - parte das notas que passou do depositado.
function exprSaldos({ contrato, caucao, adiant, consumo, notasTotal }) {
    return {
        saldoCaucao: `LEAST(${caucao}, GREATEST(${adiant} + ${caucao} - ${consumo}, 0))`,
        saldoAdiant: `GREATEST(${adiant} - ${consumo}, LEAST(${adiant} + ${caucao} - ${consumo}, 0))`,
        aFaturar: `${contrato} - ${caucao} - ${adiant} - (${notasTotal} - ${consumo}) - GREATEST(${consumo} - ${adiant} - ${caucao}, 0)`
    };
}

// CTEs MOVIMENTACOES e ORDENADAS.
// filtroContrato é aplicado ao campo AD_CONTRATO de cada bloco:
//   extrato -> "= ?"  |  dashboard -> "IN (contratos do tipo selecionado)"
function ctesMovimentacoes(cfg, filtroContrato) {
    // Programação: só entra no extrato se a configuração pedir (hoje, nunca)
    const blocoProgramacao = (cfg.topProgramacao && cfg.programacaoNoExtrato) ? `
            UNION ALL

            SELECT 
                  CAB.AD_CONTRATO AS CODCONT
                , 'Programação' AS TIPOLANC
                , CAB.DTNEG AS DTMOV
                , (SELECT MIN(NUFIN) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA) AS NUFIN
                , CAB.NUNOTA AS NUNOTA
                , SUM(ITE.QTDNEG) AS QTDNEG
                , CAB.VLRNOTA AS VLRNOTA
                , CAST(NULL AS NUMBER) AS DEPOSITO
                , CAB.NUNOTA AS ID_REGISTRO
                , CAB.STATUSNOTA AS STATUSNOTA
            FROM TGFCAB CAB
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            WHERE CAB.CODTIPOPER = ${cfg.topProgramacao} AND CAB.AD_CONTRATO ${filtroContrato}
            GROUP BY CAB.AD_CONTRATO, CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA
    ` : '';

    return `
        MOVIMENTACOES AS (
            SELECT 
                  CAB.AD_CONTRATO AS CODCONT
                , 'Contrato' AS TIPOLANC
                , CAB.DTNEG AS DTMOV
                , MIN(FIN.NUFIN) AS NUFIN
                , CAB.NUNOTA AS NUNOTA
                , SUM(ITE.QTDNEG) AS QTDNEG
                , CAB.VLRNOTA AS VLRNOTA
                , CAST(NULL AS NUMBER) AS DEPOSITO
                , CAB.NUNOTA AS ID_REGISTRO
                , CAB.STATUSNOTA AS STATUSNOTA
            FROM TGFCAB CAB
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
                LEFT JOIN TGFFIN FIN ON CAB.NUNOTA = FIN.NUNOTA
            WHERE CAB.CODTIPOPER = ${cfg.topContrato} AND CAB.AD_CONTRATO ${filtroContrato}
            GROUP BY CAB.AD_CONTRATO, CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA

            UNION ALL

            SELECT 
                  FIN.AD_CONTRATO AS CODCONT
                , 'Caução' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , CAST(NULL AS NUMBER) AS NUNOTA
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
                , CAST(NULL AS VARCHAR2(1)) AS STATUSNOTA
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = ${cfg.topAdiantamento} AND FIN.CODTIPTIT = ${cfg.titCaucao} AND FIN.AD_CONTRATO ${filtroContrato}
            GROUP BY FIN.AD_CONTRATO, FIN.DHBAIXA, FIN.NUFIN

            UNION ALL

            SELECT 
                  FIN.AD_CONTRATO AS CODCONT
                , 'Adiantamento' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , CAST(NULL AS NUMBER) AS NUNOTA
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
                , CAST(NULL AS VARCHAR2(1)) AS STATUSNOTA
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = ${cfg.topAdiantamento} AND FIN.CODTIPTIT = ${cfg.titAdiantamento} AND FIN.AD_CONTRATO ${filtroContrato}
            GROUP BY FIN.AD_CONTRATO, FIN.DHBAIXA, FIN.NUFIN
            ${blocoProgramacao}
            UNION ALL

            SELECT 
                  CAB.AD_CONTRATO AS CODCONT
                , 'Nota Fiscal' AS TIPOLANC
                , CAB.DTNEG AS DTMOV
                , (SELECT MIN(NUFIN) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA) AS NUFIN
                , CAB.NUNOTA AS NUNOTA
                , SUM(ITE.QTDNEG) AS QTDNEG
                , CAB.VLRNOTA AS VLRNOTA
                , CAST(NULL AS NUMBER) AS DEPOSITO
                , CAB.NUNOTA AS ID_REGISTRO
                , CAB.STATUSNOTA AS STATUSNOTA
            FROM TGFCAB CAB
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            WHERE CAB.CODTIPOPER = ${cfg.topNota} AND CAB.AD_CONTRATO ${filtroContrato}
            GROUP BY CAB.AD_CONTRATO, CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA
        ),
        ORDENADAS AS (
            -- TEM_DEPOSITO = 1 em todas as linhas do contrato se ele tiver ao menos
            -- uma caução ou adiantamento (em qualquer data); 0 se não tiver nenhum
            SELECT 
                  M.*
                , MAX(CASE WHEN TIPOLANC IN ('Caução', 'Adiantamento') THEN 1 ELSE 0 END) OVER (PARTITION BY CODCONT) AS TEM_DEPOSITO
            FROM MOVIMENTACOES M
        )`;
}

// Vendas: se o contrato não tem nenhuma caução/adiantamento, as notas não consomem saldo
// (colunas ficam zeradas). Se tem, as notas consomem desde o início, mesmo antes do depósito,
// deixando o adiantamento negativo até o depósito entrar.
function filtroConsumo(cfg) {
    return cfg.consumoAposDeposito ? 'AND TEM_DEPOSITO = 1' : '';
}

export async function getContratosData() {
    const cfg = getConfigTipo();

    // Movimentações apenas dos contratos do tipo selecionado
    const filtroContrato = `IN (SELECT C.AD_CONTRATO FROM TGFCAB C WHERE C.CODTIPOPER = ${cfg.topContrato})`;

    const saldos = exprSaldos({
        contrato:   'COALESCE(TOT.TOT_VLR_CONTRATO, 0)',
        caucao:     'COALESCE(TOT.TOT_VLR_CAUCAO, 0)',
        adiant:     'COALESCE(TOT.TOT_VLR_ADIANT, 0)',
        consumo:    'COALESCE(TOT.TOT_VLRNOTA, 0)',
        notasTotal: 'COALESCE(TOT.TOT_VLRNOTA_TOTAL, 0)'
    });

    const query = `
        WITH
        CONTRATO AS (
            SELECT 
                  PAR.CODPARC || ' - ' || PAR.NOMEPARC AS PARCEIRO
                , CON.CODCONT
                , CON.CONTRATO
                , CON.DTINI
                , CON.DTFIM
                , CAB.VLRNOTA
                , SUM(ITE.QTDNEG) AS QTDNEG
            FROM TGFCAB CAB
                JOIN AD_REGCONT CON ON CAB.AD_CONTRATO = CON.CODCONT
                JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
                JOIN TGFTOP TPO ON CAB.CODTIPOPER = TPO.CODTIPOPER
                               AND CAB.DHTIPOPER = TPO.DHALTER
            WHERE CAB.CODTIPOPER = ${cfg.topContrato}
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CAB.VLRNOTA, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        ENTREGA AS (
            SELECT 
                  CON.CODCONT
                , SUM(ITE.QTDNEG) AS QTDNEG
            FROM TGFCAB CAB
                JOIN AD_REGCONT CON ON CAB.AD_CONTRATO = CON.CODCONT
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            WHERE CAB.CODTIPOPER = ${cfg.topNota}
            GROUP BY CON.CODCONT
        ),
        ${ctesMovimentacoes(cfg, filtroContrato)},
        TOTAIS AS (
            -- Totais finais de cada contrato = última linha do extrato
            SELECT 
                  CODCONT
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN VLRNOTA ELSE 0 END) AS TOT_VLR_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Caução' THEN DEPOSITO ELSE 0 END) AS TOT_VLR_CAUCAO
                , SUM(CASE WHEN TIPOLANC = 'Adiantamento' THEN DEPOSITO ELSE 0 END) AS TOT_VLR_ADIANT
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' ${filtroConsumo(cfg)} THEN VLRNOTA ELSE 0 END) AS TOT_VLRNOTA
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN VLRNOTA ELSE 0 END) AS TOT_VLRNOTA_TOTAL
            FROM ORDENADAS
            GROUP BY CODCONT
        )
        SELECT 
              CON.PARCEIRO
            , CON.CONTRATO
            , CON.CODCONT
            , CON.DTINI
            , CON.DTFIM
            , CON.QTDNEG
            , CON.QTDNEG - COALESCE(ENT.QTDNEG, 0) AS QTDPEN
            , CON.VLRNOTA AS VLRCONTRATO
            , ${saldos.saldoCaucao} AS VLRCAUCAO
            , ${saldos.saldoAdiant} AS SALDOADIANT
            , ${saldos.aFaturar} AS VLRFATURAR
        FROM CONTRATO CON
            LEFT JOIN ENTREGA ENT ON CON.CODCONT = ENT.CODCONT
            LEFT JOIN TOTAIS TOT ON CON.CODCONT = TOT.CODCONT
    `;

    const results = await JSK.consultar(query, []);

    if (results.status == 0) {
        console.error("Erro ao obter dados de contratos:", results.statusMessage);
        throw new Error(results.statusMessage);
    }

    return results;
}

export async function getExtratoContrato(codContrato) {
    const cfg = getConfigTipo();

    const saldos = exprSaldos({
        contrato:   'TOT_VLR_CONTRATO',
        caucao:     'TOT_VLR_CAUCAO',
        adiant:     'TOT_VLR_ADIANT',
        consumo:    'TOT_VLRNOTA',
        notasTotal: 'TOT_VLRNOTA_TOTAL'
    });

    const query = `
        WITH
        ${ctesMovimentacoes(cfg, '= ?')},
        ACUMULADOS AS (
            SELECT 
                  CODCONT, TIPOLANC, DTMOV, NUFIN, NUNOTA, STATUSNOTA, QTDNEG, VLRNOTA, DEPOSITO, ID_REGISTRO
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN QTDNEG ELSE 0 END) ${JANELA} AS TOT_QTD_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN QTDNEG ELSE 0 END) ${JANELA} AS TOT_QTD_NOTA
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN VLRNOTA ELSE 0 END) ${JANELA} AS TOT_VLR_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Caução' THEN DEPOSITO ELSE 0 END) ${JANELA} AS TOT_VLR_CAUCAO
                , SUM(CASE WHEN TIPOLANC = 'Adiantamento' THEN DEPOSITO ELSE 0 END) ${JANELA} AS TOT_VLR_ADIANT
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' ${filtroConsumo(cfg)} THEN VLRNOTA ELSE 0 END) ${JANELA} AS TOT_VLRNOTA
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN VLRNOTA ELSE 0 END) ${JANELA} AS TOT_VLRNOTA_TOTAL
            FROM ORDENADAS
        )
        SELECT 
              TIPOLANC, DTMOV, NUFIN, NUNOTA, STATUSNOTA, QTDNEG, VLRNOTA, DEPOSITO
            , (TOT_QTD_CONTRATO - TOT_QTD_NOTA) AS QTD_PENDENTE
            , ${saldos.saldoCaucao} AS SALDO_CAUCAO
            , ${saldos.saldoAdiant} AS SALDO_ADIANTAMENTO
            , ${saldos.aFaturar} AS VLR_A_FATURAR
        FROM ACUMULADOS
        ORDER BY ${ORDEM_EXTRATO}
    `;

    // Um único parâmetro, replicado em todas as posições "?" da query
    const param = { value: codContrato, type: 'I' };
    const qtdParams = (query.match(/\?/g) || []).length;
    const results = await JSK.consultar(query, Array(qtdParams).fill(param));

    if (results.status == 0) {
        throw new Error(results.statusMessage);
    }
    return results.data || results;
}

// Programações do contrato com a quantidade ainda pendente de cada uma.
// Pendente = quantidade programada - quantidade já atendida por notas da TOP de nota
// (ligação pedido -> nota pela TGFVAR). Usada no gráfico Pendências Mensais.
export async function getProgramacoesContrato() {
    const cfg = getConfigTipo();
    if (!cfg.topProgramacao) return [];

    const query = `
        WITH PROGRAMACAO AS (
            SELECT
                  PRG.AD_CONTRATO AS CODCONT
                , PRG.NUNOTA
                , PRG.DTPREVENT
                , SUM(ITE.QTDNEG) AS QTDPROG
            FROM TGFCAB PRG
                JOIN TGFITE ITE ON ITE.NUNOTA = PRG.NUNOTA
            WHERE PRG.CODTIPOPER = ${cfg.topProgramacao}
              AND PRG.AD_CONTRATO IS NOT NULL
            GROUP BY PRG.AD_CONTRATO, PRG.NUNOTA, PRG.DTPREVENT
        ),
        ENTREGUE AS (
            SELECT
                  VAR.NUNOTAORIG
                , SUM(VAR.QTDATENDIDA) AS QTDENTREGUE
            FROM TGFVAR VAR
                JOIN TGFCAB NOTA ON NOTA.NUNOTA = VAR.NUNOTA
            WHERE NOTA.CODTIPOPER = ${cfg.topNota}
              AND VAR.NUNOTAORIG IN (SELECT NUNOTA FROM PROGRAMACAO)
            GROUP BY VAR.NUNOTAORIG
        )
        SELECT
              PRG.CODCONT
            , PRG.NUNOTA
            , PRG.DTPREVENT
            , PRG.QTDPROG
            , COALESCE(ENT.QTDENTREGUE, 0) AS QTDENTREGUE
            , PRG.QTDPROG - COALESCE(ENT.QTDENTREGUE, 0) AS QTDPEN
        FROM PROGRAMACAO PRG
            LEFT JOIN ENTREGUE ENT ON ENT.NUNOTAORIG = PRG.NUNOTA
    `;

    const results = await JSK.consultar(query, []);

    if (results.status == 0) {
        throw new Error(results.statusMessage);
    }
    return results.data || results;
}

export async function getFiltrosOptions() {
    const cfg = getConfigTipo();

    const query = `
        SELECT DISTINCT 
              PAR.CODPARC AS CODIGO
            , PAR.NOMEPARC AS DESCRICAO
            , 'Parceiro' AS TIPO
        FROM
            AD_REGCONT CON
            JOIN TGFCAB CAB ON CON.CODCONT = CAB.AD_CONTRATO
            JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
        WHERE CAB.CODTIPOPER = ${cfg.topContrato}
            
        UNION ALL

        SELECT
              CON.CODCONT AS CODIGO
            , CON.CONTRATO AS DESCRICAO
            , 'Contrato' AS TIPO
        FROM
            AD_REGCONT CON
        WHERE EXISTS (
            SELECT 1 FROM TGFCAB CAB
            WHERE CAB.AD_CONTRATO = CON.CODCONT
              AND CAB.CODTIPOPER = ${cfg.topContrato}
        )
    `;

    const results = await JSK.consultar(query, []);

    if (results.status == 0) {
        throw new Error(results.statusMessage);
    }
    return results.data || results;
}