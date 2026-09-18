import { formatCurrency, formatDate } from '../utils/formatters.js';

export function renderTable(dados) {
    const rows = dados.map(row => `
        <tr>
            <td>${row.PARCEIRO}</td>
            <td>${row.CONTRATO}</td>
            <td>${formatDate(row.DTINI)}</td>
            <td>${formatDate(row.DTFIM)}</td>
            <td>${row.QTDNEG}</td>
            <td>${row.QTDPEN}</td>
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