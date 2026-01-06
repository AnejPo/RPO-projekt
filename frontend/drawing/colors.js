// ==================== COLORS ==================== //

// Preddefinirane barve
const PREDEFINED_COLORS = [
    { id: 1, hex: '#000000', name: 'Črna' },
    { id: 2, hex: '#ffffff', name: 'Bela' },
    { id: 3, hex: '#ff0000', name: 'Rdeča' },
    { id: 4, hex: '#00ff00', name: 'Zelena' },
    { id: 5, hex: '#0000ff', name: 'Modra' }
];

// Nastavi trenutno barvo čopiča + UI
function setCurrentColor(hex) {
    if (typeof currentBrush !== 'undefined' && currentBrush.setColor) {
        currentBrush.setColor(hex);
    }

    const swatch = document.getElementById('currentColorSwatch');
    const label = document.getElementById('currentColorLabel');

    if (swatch) {
        swatch.style.backgroundColor = hex;
    }

    const colorObj = PREDEFINED_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    if (label && colorObj) {
        label.textContent = colorObj.name;
    }
}

// allowedColors: opcijsko [id...] ali ["#hex"...]
// Če lesson ne poda ničesar, default = samo črna (id 1)
function initColorUI(allowedColors = null) {
    const group = document.getElementById('colorSelectorGroup');
    const menu = document.getElementById('colorDropdownMenu');

    if (!group || !menu) {
        console.warn('[colors] Color UI elements not found');
        return;
    }

    let colorsToShow = PREDEFINED_COLORS;

    if (Array.isArray(allowedColors) && allowedColors.length > 0) {
        const byId = allowedColors.some(v => typeof v === 'number' || /^[0-9]+$/.test(v));
        if (byId) {
            const allowedSet = new Set(allowedColors.map(Number));
            colorsToShow = PREDEFINED_COLORS.filter(c => allowedSet.has(c.id));
        } else {
            const allowedSet = new Set(allowedColors.map(v => v.toLowerCase()));
            colorsToShow = PREDEFINED_COLORS.filter(c => allowedSet.has(c.hex.toLowerCase()));
        }
    } else {
        // default: samo črna
        colorsToShow = PREDEFINED_COLORS.filter(c => c.id === 1);
    }

    menu.innerHTML = '';
    colorsToShow.forEach(color => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dropdown-item d-flex justify-content-between align-items-center';
        btn.dataset.colorId = color.id;
        btn.title = color.name;

        const left = document.createElement('span');
        left.className = 'd-flex align-items-center';

        const swatch = document.createElement('span');
        swatch.style.display = 'inline-block';
        swatch.style.width = '16px';
        swatch.style.height = '16px';
        swatch.style.borderRadius = '50%';
        swatch.style.border = '1px solid #fff';
        swatch.style.backgroundColor = color.hex;
        swatch.className = 'me-2';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = color.name;

        left.appendChild(swatch);
        left.appendChild(labelSpan);

        const idBadge = document.createElement('span');
        idBadge.className = 'badge bg-secondary ms-2';
        idBadge.textContent = color.id;

        btn.appendChild(left);
        btn.appendChild(idBadge);

        btn.addEventListener('click', () => {
            setCurrentColor(color.hex);
        });

        li.appendChild(btn);
        menu.appendChild(li);
    });

    const initial = colorsToShow[0] || PREDEFINED_COLORS[0];
    setCurrentColor(initial.hex);
}

// ==================== END COLORS ==================== //