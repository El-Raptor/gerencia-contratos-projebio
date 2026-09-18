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