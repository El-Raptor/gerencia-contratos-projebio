export function renderCard(title, value, iconClass, colorClass) {
    return `
        <div class="kpi-card">
            <div class="card-icon ${colorClass}"><i class="${iconClass}"></i></div>
            <div class="card-info">
                <h3>${title}</h3>
                <p>${value}</p>
            </div>
        </div>
    `;
}