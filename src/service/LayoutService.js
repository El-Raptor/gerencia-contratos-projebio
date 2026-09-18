export default class LayoutService {
    static async ajustar(nomePagina, idGdt) {
        try {
            if (typeof window.JSK === 'undefined') {
                console.warn("Aviso: biblioteca JSK não encontrada no escopo global.");
            }

            await window.JSK.removerFrame({ paginaInicial: nomePagina, nuGdt: idGdt });
            console.log(`Layout ajustado (Frame removido) para a página: ${nomePagina}.`);

        } catch (error) {
            console.error("Erro ao ajustar layout (Remover Frame):", error);
        }
    }
}