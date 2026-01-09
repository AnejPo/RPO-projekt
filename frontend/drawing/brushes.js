// Preddefinirani čopiči (5 px narazen)
const PREDEFINED_BRUSHES = [
    { id: 1, size: 2,  name: 'Čopič 1 (2px)'  },
    { id: 2, size: 5,  name: 'Čopič 2 (5px)'  },
    { id: 3, size: 10, name: 'Čopič 3 (10px)' },
    { id: 4, size: 15, name: 'Čopič 4 (15px)' },
    { id: 5, size: 20, name: 'Čopič 5 (20px)' },
    { id: 6, size: 25, name: 'Čopič 6 (25px)' }
];

// Trenutni čopič
let currentBrush = {
    id: PREDEFINED_BRUSHES[0].id,
    size: PREDEFINED_BRUSHES[0].size,
    color: '#000000',
    setSize(newSize) {
        this.size = newSize;
    },
    setColor(newColor) {
        this.color = newColor;
    }
};

// UI inicializacija – klic v lesson po DOMContentLoaded
function initBrushUI(allowedBrushIds = null) {
    const group = document.getElementById('brushSelectorGroup');
    const currentBtn = document.getElementById('currentBrushButton');
    const currentLabel = document.getElementById('currentBrushLabel');
    const dropdownMenu = document.getElementById('brushDropdownMenu');

    if (!group || !currentBtn || !currentLabel || !dropdownMenu) {
        console.warn('[brushes] Brush UI elements not found');
        return;
    }

    // filtriranje po allowedBrushIds (če lesson želi omejiti čopiče)
    let brushesToShow = PREDEFINED_BRUSHES;
    if (Array.isArray(allowedBrushIds) && allowedBrushIds.length > 0) {
        const allowedSet = new Set(allowedBrushIds.map(Number));
        brushesToShow = PREDEFINED_BRUSHES.filter(b => allowedSet.has(b.id));
    }

    // napolni dropdown
    dropdownMenu.innerHTML = '';
    brushesToShow.forEach(brush => {
        const li = document.createElement('li');
        const a = document.createElement('button');
        a.type = 'button';
        a.className = 'dropdown-item d-flex justify-content-between align-items-center';
        a.dataset.brushId = brush.id;
        a.title = brush.name; // hover ime

        const labelSpan = document.createElement('span');
        labelSpan.textContent = brush.name;

        const idBadge = document.createElement('span');
        idBadge.className = 'badge bg-secondary ms-2';

        a.appendChild(labelSpan);
        a.appendChild(idBadge);

        a.addEventListener('click', () => {
            selectBrushById(brush.id);
            if (typeof setCurrentTool === 'function') {
                setCurrentTool('brush');
            }
        });

        li.appendChild(a);
        dropdownMenu.appendChild(li);
    });

    // nastavi začetni brush
    const initial = brushesToShow[0] || PREDEFINED_BRUSHES[0];
    setCurrentBrush(initial);
    currentLabel.textContent = initial.name;
}

// pomožna – nastavi currentBrush
function setCurrentBrush(brush) {
    currentBrush.id = brush.id;
    currentBrush.size = brush.size;

    const currentLabel = document.getElementById('currentBrushLabel');
    if (currentLabel) {
        currentLabel.textContent = brush.name;
    }

    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    if (brushSizeInput) {
        brushSizeInput.value = brush.size;
    }
    if (brushSizeValue) {
        brushSizeValue.textContent = brush.size + 'px';
    }
}

// Izbira čopič po id
function selectBrushById(brushId) {
    const brush = PREDEFINED_BRUSHES.find(b => b.id === Number(brushId));
    if (!brush) {
        console.warn('[brushes] brush not found for id', brushId);
        return;
    }
    setCurrentBrush(brush);
}