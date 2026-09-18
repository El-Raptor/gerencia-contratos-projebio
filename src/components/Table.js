import { formatCurrency, formatNumber, formatDate } from '../utils/formatters.js';

export function renderTable(dados) {
    const rows = dados.map(row => `
        <tr class="clickable-row" data-codcont="${row.CODCONT}">
            <td>${row.PARCEIRO}</td>
            <td>${row.CONTRATO}</td>
            <td>${formatDate(row.DTINI)}</td>
            <td>${formatDate(row.DTFIM)}</td>
            <td>${formatNumber(row.QTDNEG)}</td>
            <td>${formatNumber(row.QTDPEN)}</td>
            <td>${formatCurrency(row.VLRCAUCAO)}</td>
            <td>${formatCurrency(row.SALDOADIANT)}</td>
            <td>${formatCurrency(row.VLRFATURAR)}</td>
        </tr>
    `).join('');

    return `
        <table class="custom-table">
            <thead>
                <tr>
                    <th>Parceiro</th><th>Contrato</th><th>Data Início</th><th>Data Fim</th>
                    <th>Qtd. Neg.</th><th>Qtd. Pen.</th><th>Vlr Caução</th><th>Saldo Adiant.</th><th>Vlr Faturar</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}