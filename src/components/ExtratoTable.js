import { formatCurrency, formatNumber, formatDate } from '../utils/formatters.js';

export function renderExtratoTable(dados) {
    if (!dados || dados.length === 0) {
        return `<p style="text-align:center; padding: 20px; color: var(--lables);">Nenhuma movimentação encontrada para este contrato.</p>`;
    }

    const rows = dados.map(row => `
        <tr>
            <td><strong>${row.TIPOLANC || '-'}</strong></td>
            <td>${formatDate(row.DTMOV)}</td>
            <td>${row.NUFIN || '-'}</td>
            <td>${formatNumber(row.QTDNEG)}</td>
            <td>${formatCurrency(row.VLRNOTA)}</td>
            <td>${formatCurrency(row.DEPOSITO)}</td>
            <td>${formatNumber(row.QTD_PENDENTE)}</td>
            <td>${formatCurrency(row.CAUCAO_ACUMULADA)}</td>
            <td>${formatCurrency(row.SALDO_ADIANTAMENTO)}</td>
            <td>${formatCurrency(row.VLR_A_FATURAR)}</td>
        </tr>
    `).join('');

    return `
        <table class="custom-table">
            <thead>
                <tr>
                    <th>Tipo Lanç.</th><th>Data Mov.</th><th>Nº Fin.</th>
                    <th>Qtd. Neg.</th><th>Vlr. Nota</th><th>Depósito</th>
                    <th>Qtd. Pend.</th><th>Caução Acum.</th><th>Saldo Adiant.</th><th>Vlr. a Faturar</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}