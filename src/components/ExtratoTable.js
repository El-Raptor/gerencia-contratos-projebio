import { formatCurrency, formatNumber, formatDate } from '../utils/formatters.js';

// Biblioteca SheetJS (carregada só no momento da exportação)
const XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

function formatStatusNota(status) {
    if (!status) return '-'; // Caução/Adiantamento não possuem nota
    return status === 'L' ? 'Recebida' : 'Em Trânsito';
}

function toNumber(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return isNaN(n) ? null : n;
}

export function renderExtratoTable(dados) {
    if (!dados || dados.length === 0) {
        return `<p style="text-align:center; padding: 20px; color: var(--lables);">Nenhuma movimentação encontrada para este contrato.</p>`;
    }

    const rows = dados.map(row => `
        <tr>
            <td><strong>${row.TIPOLANC || '-'}</strong></td>
            <td>${formatDate(row.DTMOV)}</td>
            <td>${row.NUFIN || '-'}</td>
            <td>${row.NUNOTA || '-'}</td>
            <td>${formatStatusNota(row.STATUSNOTA)}</td>
            <td>${formatNumber(row.QTDNEG)}</td>
            <td>${formatCurrency(row.VLRNOTA)}</td>
            <td>${formatCurrency(row.DEPOSITO)}</td>
            <td>${formatNumber(row.QTD_PENDENTE)}</td>
            <td>${formatCurrency(row.SALDO_CAUCAO)}</td>
            <td>${formatCurrency(row.SALDO_ADIANTAMENTO)}</td>
            <td>${formatCurrency(row.VLR_A_FATURAR)}</td>
        </tr>
    `).join('');

    return `
        <table class="custom-table">
            <thead>
                <tr>
                    <th>Tipo Lanç.</th><th>Data Mov.</th><th>Nº Fin.</th><th>Nº Nota</th><th>Status Nota</th>
                    <th>Qtd. Neg.</th><th>Vlr. Nota</th><th>Depósito</th>
                    <th>Qtd. Pend.</th><th>Saldo Caução</th><th>Saldo Adiant.</th><th>Vlr. a Faturar</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

export async function exportExtratoExcel(dados, codContrato) {
    const XLSX = await import(XLSX_URL);

    // Colunas na mesma ordem da tabela; tipo define o formato da célula no Excel
    const colunas = [
        { titulo: 'Tipo Lanç.',     valor: r => r.TIPOLANC || '' },
        { titulo: 'Data Mov.',      valor: r => formatDate(r.DTMOV) },
        { titulo: 'Nº Fin.',        valor: r => toNumber(r.NUFIN) },
        { titulo: 'Nº Nota',        valor: r => toNumber(r.NUNOTA) },
        { titulo: 'Status Nota',    valor: r => formatStatusNota(r.STATUSNOTA) },
        { titulo: 'Qtd. Neg.',      valor: r => toNumber(r.QTDNEG),             tipo: 'qtd' },
        { titulo: 'Vlr. Nota',      valor: r => toNumber(r.VLRNOTA),            tipo: 'moeda' },
        { titulo: 'Depósito',       valor: r => toNumber(r.DEPOSITO),           tipo: 'moeda' },
        { titulo: 'Qtd. Pend.',     valor: r => toNumber(r.QTD_PENDENTE),       tipo: 'qtd' },
        { titulo: 'Saldo Caução',   valor: r => toNumber(r.SALDO_CAUCAO),       tipo: 'moeda' },
        { titulo: 'Saldo Adiant.',  valor: r => toNumber(r.SALDO_ADIANTAMENTO), tipo: 'moeda' },
        { titulo: 'Vlr. a Faturar', valor: r => toNumber(r.VLR_A_FATURAR),      tipo: 'moeda' }
    ];

    const formatos = {
        moeda: '"R$" #,##0.00;-"R$" #,##0.00',
        qtd: '#,##0.00'
    };

    // Monta a planilha como matriz: cabeçalho + linhas
    const matriz = [
        colunas.map(c => c.titulo),
        ...dados.map(row => colunas.map(c => c.valor(row)))
    ];

    const ws = XLSX.utils.aoa_to_sheet(matriz);

    // Aplica formato numérico às colunas de valor e quantidade
    colunas.forEach((col, c) => {
        if (!col.tipo) return;
        for (let r = 1; r < matriz.length; r++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.t === 'n') cell.z = formatos[col.tipo];
        }
    });

    // Largura das colunas
    ws['!cols'] = colunas.map(c => ({ wch: Math.max(c.titulo.length + 2, 15) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
    XLSX.writeFile(wb, `Extrato_Contrato_${codContrato}.xlsx`);
}