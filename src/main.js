import { renderDashboard } from './page/DashboardPage.js';
import LayoutService from './service/LayoutService.js';
import { JSK } from "https://cdn.jsdelivr.net/npm/@jtandrelevicius/utils-js-library@latest/index.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Garantir que a biblioteca JSK está disponível no escopo global para o LayoutService
    if (typeof window.JSK === 'undefined') {
        window.JSK = JSK;
    }

    // Remover o frame padrão do ERP (gadget 165)
    await LayoutService.ajustar('index.jsp', 165);

    // Inicializar o Dashboard
    const root = document.getElementById('app-root');
    renderDashboard(root);
});