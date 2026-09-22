import { JSK } from "https://cdn.jsdelivr.net/npm/@jtandrelevicius/utils-js-library@latest/index.js";

export async function getContratosData() {
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
            WHERE CAB.CODTIPOPER = 1314
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CAB.VLRNOTA, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        COMPRA AS (
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
            WHERE CAB.CODTIPOPER = 1407
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        ADIANTAMENTO AS (
            SELECT 
                  PAR.CODPARC || ' - ' || PAR.NOMEPARC AS PARCEIRO
                , CON.CODCONT
                , CON.CONTRATO
                , CON.DTINI
                , CON.DTFIM
                , SUM(CASE WHEN CODTIPTIT = 1000 THEN FIN.VLRDESDOB ELSE 0 END) AS VLRCAUCAO
                , SUM(CASE WHEN CODTIPTIT = 2000 THEN FIN.VLRDESDOB ELSE 0 END) AS VLRADIANT
            FROM TGFFIN FIN
                JOIN AD_REGCONT CON ON FIN.AD_CONTRATO = CON.CODCONT
                JOIN TGFPAR PAR ON FIN.CODPARC = PAR.CODPARC
            WHERE FIN.CODTIPOPER IN (1607) AND FIN.CODTIPTIT IN (1000, 2000)
            GROUP BY PAR.CODPARC, PAR.NOMEPARC, CON.CODCONT, CON.CONTRATO, CON.DTINI, CON.DTFIM
        ),
        FINANCEIRO AS (
            SELECT 
                  CON.CODCONT
                , SUM(FIN.VLRDESDOB) AS VLRFIN
            FROM TGFFIN FIN
                JOIN AD_REGCONT CON ON FIN.AD_CONTRATO = CON.CODCONT
            WHERE FIN.CODTIPOPER IN (1407)
            GROUP BY CON.CODCONT
        )
        SELECT 
              CON.PARCEIRO
            , CON.CONTRATO
            , CON.CODCONT
            , CON.DTINI
            , CON.DTFIM
            , CON.QTDNEG
            , CON.QTDNEG - COM.QTDNEG AS QTDPEN
            , ADI.VLRCAUCAO
            , COALESCE(ADI.VLRADIANT, 0) - COALESCE(FIN.VLRFIN, 0) AS SALDOADIANT
            , CON.VLRNOTA - COALESCE(ADI.VLRCAUCAO, 0) - COALESCE(ADI.VLRADIANT, 0) AS VLRFATURAR
        FROM CONTRATO CON
            LEFT JOIN COMPRA COM ON CON.CODCONT = COM.CODCONT
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
    const query = `
        WITH MOVIMENTACOES AS (
            SELECT 
                  'Contrato' AS TIPOLANC
                , CAB.DTNEG AS DTMOV
                , MIN(FIN.NUFIN) AS NUFIN
                , SUM(ITE.QTDNEG) AS QTDNEG
                , CAB.VLRNOTA AS VLRNOTA
                , CAST(NULL AS NUMBER) AS DEPOSITO
                , CAB.NUNOTA AS ID_REGISTRO
            FROM TGFCAB CAB
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
                LEFT JOIN TGFFIN FIN ON CAB.NUNOTA = FIN.NUNOTA
            WHERE CAB.CODTIPOPER = 1314 AND CAB.AD_CONTRATO = ?
            GROUP BY CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA

            UNION ALL

            SELECT 
                  'Caução' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = 1607 AND FIN.CODTIPTIT = 1000 AND FIN.AD_CONTRATO = ?
            GROUP BY FIN.DHBAIXA, FIN.NUFIN

            UNION ALL

            SELECT 
                  'Adiantamento' AS TIPOLANC
                , FIN.DHBAIXA AS DTMOV
                , FIN.NUFIN AS NUFIN
                , 0 AS QTDNEG
                , CAST(NULL AS NUMBER) AS VLRNOTA
                , SUM(FIN.VLRDESDOB) AS DEPOSITO
                , FIN.NUFIN AS ID_REGISTRO
            FROM TGFFIN FIN
            WHERE FIN.CODTIPOPER = 1607 AND FIN.CODTIPTIT = 2000 AND FIN.AD_CONTRATO = ?
            GROUP BY FIN.DHBAIXA, FIN.NUFIN

            UNION ALL

            SELECT 
                  'Nota Fiscal' AS TIPOLANC
                , CAB.DTNEG AS DTMOV
                , MIN(FIN.NUFIN) AS NUFIN
                , SUM(ITE.QTDNEG) AS QTDNEG
                , CAB.VLRNOTA AS VLRNOTA
                , CAST(NULL AS NUMBER) AS DEPOSITO
                , CAB.NUNOTA AS ID_REGISTRO
            FROM TGFCAB CAB
                JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
                LEFT JOIN TGFFIN FIN ON CAB.NUNOTA = FIN.NUNOTA
            WHERE CAB.CODTIPOPER = 1407 AND CAB.AD_CONTRATO = ?
            GROUP BY CAB.DTNEG, CAB.VLRNOTA, CAB.NUNOTA
        ),
        ACUMULADOS AS (
            SELECT 
                  TIPOLANC, DTMOV, NUFIN, QTDNEG, VLRNOTA, DEPOSITO
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN QTDNEG ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_QTD_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN QTDNEG ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_QTD_NOTA
                , SUM(CASE WHEN TIPOLANC = 'Contrato' THEN VLRNOTA ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_CONTRATO
                , SUM(CASE WHEN TIPOLANC = 'Caução' THEN DEPOSITO ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_CAUCAO
                , SUM(CASE WHEN TIPOLANC = 'Adiantamento' THEN DEPOSITO ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLR_ADIANT
                , SUM(CASE WHEN TIPOLANC = 'Nota Fiscal' THEN VLRNOTA ELSE 0 END) OVER (ORDER BY NUFIN NULLS FIRST) AS TOT_VLRNOTA
            FROM MOVIMENTACOES
        )
        SELECT 
              TIPOLANC, DTMOV, NUFIN, QTDNEG, VLRNOTA, DEPOSITO
            , (TOT_QTD_CONTRATO - TOT_QTD_NOTA) AS QTD_PENDENTE
            , TOT_VLR_CAUCAO AS CAUCAO_ACUMULADA
            , GREATEST(0, TOT_VLR_ADIANT - TOT_VLRNOTA) AS SALDO_ADIANTAMENTO
            , (TOT_VLR_CONTRATO - TOT_VLR_CAUCAO - GREATEST(TOT_VLR_ADIANT, TOT_VLRNOTA)) AS VLR_A_FATURAR
        FROM ACUMULADOS
        ORDER BY NUFIN NULLS FIRST
    `;

    // A variável é instanciada apenas uma vez no JS
    const param = { value: codContrato, type: 'I' };
    
    // E replicada nas 4 posições do Prepared Statement dinamicamente
    const results = await JSK.consultar(query, [param, param, param, param]);

    if (results.status == 0) {
        throw new Error(results.statusMessage);
    }
    return results.data || results;
}

export async function getFiltrosOptions() {
    const query = `
        SELECT DISTINCT 
              PAR.CODPARC AS CODIGO
            , PAR.NOMEPARC AS DESCRICAO
            , 'Parceiro' AS TIPO
        FROM
            AD_REGCONT CON
            JOIN TGFCAB CAB ON CON.CODCONT = CAB.AD_CONTRATO
            JOIN TGFPAR PAR ON CAB.CODPARC = PAR.CODPARC
            
        UNION ALL

        SELECT
              CON.CODCONT AS CODIGO
            , CON.CONTRATO AS DESCRICAO
            , 'Contrato' AS TIPO
        FROM
            AD_REGCONT CON
    `;

    const results = await JSK.consultar(query, []);

    if (results.status == 0) {
        throw new Error(results.statusMessage);
    }
    return results.data || results;
}