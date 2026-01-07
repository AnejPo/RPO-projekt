// ==================== COLORS ==================== //

let currentHue = null;
let currentOpacity = 1.0;
let currentHex = '#000000';

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
    currentHex = hex;
    const color = applyOpacity(hex, currentOpacity);

    if (typeof currentBrush !== 'undefined' && currentBrush.setColor) {
        currentBrush.setColor(color);
    }

    const swatch = document.getElementById('currentColorSwatch');
    const label = document.getElementById('currentColorLabel');

    if (swatch) {
        swatch.style.backgroundColor = color;
    }

    const colorObj = PREDEFINED_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    if (label && colorObj) {
        label.textContent = colorObj.name;
    }
}

//Na podlagi izbrane barve vrne novo barvo
function getStrokeColor() {
    if (currentHue !== null) {
        //pretvori base color v hsl
        const hsl = hexToHsl(currentHex);

        const newHue = (hsl.h + currentHue) % 360;
        return `hsla(${newHue}, ${hsl.s}%, ${hsl.l}%, ${currentOpacity})`;
    }
    return applyOpacity(currentHex, currentOpacity);
}

//RGB se pretvori v hue, saturation, lightness 
function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    //računanje svetlobe
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    //če so rgb enaki, je barva posledično siva
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0);break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;
    }

    return { h, s: s * 100, l: l * 100};
}

function applyOpacity(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})` //vrne obliko rgb+opacity
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

const opacitySlider = document.getElementById('opacitySlider');
if (opacitySlider) {
    opacitySlider.addEventListener('input', e => {
        currentOpacity = parseFloat(e.target.value);
        setCurrentColor(currentHex);
    })
}

const hueSlider = document.getElementById('hueSlider');
if (hueSlider) {
    hueSlider.addEventListener('input', e => {
        currentHue = parseInt(e.target.value, 10);
        const color = getStrokeColor();
        if (currentBrush?.setColor) currentBrush.setColor(color);

        const swatch = document.getElementById('currentColorSwatch');
        if (swatch) swatch.style.backgroundColor = color;
    });
}

// ==================== END COLORS ==================== //