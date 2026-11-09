import { JSK } from "https://cdn.jsdelivr.net/npm/@jtandrelevicius/utils-js-library@latest/index.js";
import { getConfigTipo } from '../utils/tipoContrato.js';

export async function getContratosData() {
    const cfg = getConfigTipo();

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
                  PAR.CODPARC || ' - ' || PAR.NOMEPARC AS PARCEIRO
                , CON.CODCONT
                , CON.CONTRATO
                , CON.DTINI
                , CON.DTFIM
                , SUM(ITE.QTDNEG) AS QTDNEG
            FROM TGFCAB CAB
                JOIN AD_REGCONT CON ON CAB.AD_CONTRATO = CON.CODCONT
                JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
            WHERE CAB.CODTIPOPER = ${cfg.topNota}
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        ADIANTAMENTO AS (
            SELECT 
                  PAR.CODPARC || ' - ' || PAR.NOMEPARC AS PARCEIRO
                , CON.CODCONT
                , CON.CONTRATO
                , CON.DTINI
                , CON.DTFIM
                , SUM(CASE WHEN CODTIPTIT = ${cfg.titCaucao} THEN FIN.VLRDESDOB ELSE 0 END) AS VLRCAUCAO
                , SUM(CASE WHEN CODTIPTIT = ${cfg.titAdiantamento} THEN FIN.VLRDESDOB ELSE 0 END) AS VLRADIANT
            FROM TGFFIN FIN
                JOIN AD_REGCONT CON ON FIN.AD_CONTRATO = CON.CODCONT
                JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
            WHERE FIN.CODTIPOPER IN (${cfg.topAdiantamento}) AND FIN.CODTIPTIT IN (${cfg.titCaucao}, ${cfg.titAdiantamento})
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        FINANCEIRO AS (
            SELECT 
                  CON.CODCONT
                , SUM(FIN.VLRDESDOB) AS VLRFIN
            FROM TGFFIN FIN
                JOIN TGFCAB CAB ON FIN.NUNOTA = CAB.NUNOTA
                JOIN AD_REGCONT CON ON CAB.AD_CONTRATO = CON.CODCONT
            WHERE FIN.CODTIPOPER IN (${cfg.topNota})
                AND FIN.CODTIPTIT IN (${cfg.titulosNota.join(', ')})
            GROUP BY CON.CODCONT
        )
        SELECT 
              CON.PARCEIRO
            , CON.CONTRATO
            , CON.CODCONT
            , CON.DTINI
            , CON.DTFIM
            , CON.QTDNEG
            , CON.QTDNEG - COALESCE(ENT.QTDNEG, 0) AS QTDPEN
            , ADI.VLRCAUCAO
            , COALESCE(ADI.VLRADIANT, 0) - COALESCE(FIN.VLRFIN, 0) AS SALDOADIANT
            , CON.VLRNOTA - COALESCE(ADI.VLRCAUCAO, 0) - COALESCE(ADI.VLRADIANT, 0) AS VLRFATURAR
        FROM CONTRATO CON
            LEFT JOIN ENTREGA ENT ON CON.CODCONT = ENT.CODCONT
            LEFT JOIN ADIANTAMENTO ADI ON CON.CODCONT = ADI.CODCONT
            LEFT JOIN FINANCEIRO FIN ON CON.CODCONT = FIN.CODCONT
    `;

    // Parâmetros vazios já que a query não exige filtros dinâmicos no momento
    const params = [];

    const results = await JSK.consultar(query, params);

    if (results.status == 0) {
        console.error("Erro ao obter dados de contratos:", results.statusMessage);
        throw new Error(results.statusMessage);
    }

    return results;
}

export async function getExtratoContrato(codContrato) {
    const cfg = getConfigTipo();

    // Programação de Venda: só existe em vendas e é apenas informativa no extrato
    // (o TIPOLANC 'Programação' não entra em nenhum acumulado abaixo)
    const blocoProgramacao = cfg.topProgramacao ? `
            UNION ALL

            SELECT 
                  'Programação' AS TIPOLANC
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
            WHERE CAB.CODTIPOPER = ${cfg.topProgramacao} AND CAB.AD_CONTRATO = ?
            GROUP BY CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA
    ` : '';

    const query = `
        WITH MOVIMENTACOES AS (
            SELECT 
                  'Contrato' AS TIPOLANC
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
            WHERE CAB.CODTIPOPER = ${cfg.topContrato} AND CAB.AD_CONTRATO = ?
            GROUP BY CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA

            UNION ALL

            SELECT 
                  'Caução' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , CAST(NULL AS NUMBER) AS NUNOTA
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
                , CAST(NULL AS VARCHAR2(1)) AS STATUSNOTA
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = ${cfg.topAdiantamento} AND FIN.CODTIPTIT = ${cfg.titCaucao} AND FIN.AD_CONTRATO = ?
            GROUP BY FIN.DHBAIXA, FIN.NUFIN

            UNION ALL

            SELECT 
                  'Adiantamento' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , CAST(NULL AS NUMBER) AS NUNOTA
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
                , CAST(NULL AS VARCHAR2(1)) AS STATUSNOTA
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = ${cfg.topAdiantamento} AND FIN.CODTIPTIT = ${cfg.titAdiantamento} AND FIN.AD_CONTRATO = ?
            GROUP BY FIN.DHBAIXA, FIN.NUFIN
            ${blocoProgramacao}
            UNION ALL

            SELECT 
                  'Nota Fiscal' AS TIPOLANC
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
            WHERE CAB.CODTIPOPER = ${cfg.topNota} AND CAB.AD_CONTRATO = ?
            GROUP BY CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA, CAB.STATUSNOTA
        ),
        ACUMULADOS AS (
            SELECT 
                  TIPOLANC, DTMOV, NUFIN, NUNOTA, STATUSNOTA, QTDNEG, VLRNOTA, DEPOSITO
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN QTDNEG ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_QTD_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN QTDNEG ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_QTD_NOTA
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN VLRNOTA ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Caução' THEN DEPOSITO ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_CAUCAO
                , SUM(CASE WHEN TIPOLANC = 'Adiantamento' THEN DEPOSITO ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_ADIANT
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN VLRNOTA ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLRNOTA
            FROM MOVIMENTACOES
        )
        SELECT 
              TIPOLANC, DTMOV, NUFIN, NUNOTA, STATUSNOTA, QTDNEG, VLRNOTA, DEPOSITO
            , (TOT_QTD_CONTRATO - TOT_QTD_NOTA) AS QTD_PENDENTE
            , TOT_VLR_CAUCAO AS CAUCAO_ACUMULADA
            , (TOT_VLR_ADIANT - TOT_VLRNOTA) AS SALDO_ADIANTAMENTO
            , (TOT_VLR_CONTRATO - TOT_VLR_CAUCAO - TOT_VLR_ADIANT) AS VLR_A_FATURAR
        FROM ACUMULADOS
        ORDER BY NUFIN NULLS FIRST
    `;

    // Um único parâmetro, replicado em todas as posições "?" da query
    // (4 em compras, 5 em vendas por causa do bloco de Programação)
    const param = { value: codContrato, type: 'I' };
    const qtdParams = (query.match(/\?/g) || []).length;
    const results = await JSK.consultar(query, Array(qtdParams).fill(param));

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