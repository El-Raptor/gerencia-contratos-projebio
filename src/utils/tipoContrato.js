// Configuração das TOPs e tipos de título por tipo de contrato.
// Os números vêm desta configuração fixa (nunca do usuário), por isso podem
// ser interpolados nas queries com segurança.
export const TIPOS_CONTRATO = {
    compras: {
        chave: 'compras',
        label: 'Compras',
        topContrato: 1314,
        topNota: 1407,
        topProgramacao: 1315,      // Usada no gráfico Pendências Mensais (pela Previsão de Entrega)
        programacaoNoExtrato: false,
        topAdiantamento: 1607,
        titCaucao: 1000,
        titAdiantamento: 2000,
        titulosNota: [4, 34]
    },
    vendas: {
        chave: 'vendas',
        label: 'Vendas',
        topContrato: 1001,
        topNota: 1101,
        topProgramacao: 1009,      // Usada no gráfico Pendências Mensais (pela Previsão de Entrega)
        programacaoNoExtrato: false, // Programações não aparecem no extrato
        topAdiantamento: 1607,
        titCaucao: 1000,
        titAdiantamento: 2000,
        titulosNota: [4, 34]
    }
};

let tipoAtual = 'compras';

export function getTipoContrato() {
    return tipoAtual;
}

export function setTipoContrato(tipo) {
    if (!TIPOS_CONTRATO[tipo]) throw new Error(`Tipo de contrato inválido: ${tipo}`);
    tipoAtual = tipo;
}

export function getConfigTipo() {
    return TIPOS_CONTRATO[tipoAtual];
}