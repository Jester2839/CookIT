document.addEventListener('DOMContentLoaded', () => {
    // 1. Přepínání záložek ve spodním menu
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Odebrání aktivní třídy všem
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            // Přidání aktivní třídy kliknutému
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. Logika modálního okna pro ingredience
    const modal = document.getElementById('ingredient-modal');
    const btnAdd = document.getElementById('btn-add-ingredient');
    const btnClose = document.getElementById('btn-close-modal');
    const modalSearch = document.getElementById('modal-search');
    const modalList = document.getElementById('modal-ingredient-list');
    const tagsContainer = document.getElementById('tags-container');

    // Ukázková databáze ingrediencí
    const DATABASE_INGREDIENTS = [
        'Cibule', 'Česnek', 'Rajčata', 'Kuřecí prsa', 'Vejce', 'Mléko', 
        'Máslo', 'Těstoviny', 'Rýže', 'Brambory', 'Sýr Eidam', 'Parmazán', 
        'Slanina', 'Mrkev', 'Paprika', 'Mouka', 'Cukr', 'Olivový olej'
    ];
    
    let selectedIngredients = [];

    // Otevření modalu
    btnAdd.addEventListener('click', () => {
        modal.classList.add('active');
        modalSearch.value = '';
        renderModalList(DATABASE_INGREDIENTS); // Zobrazit všechny při otevření
    });

    // Zavření modalu křížkem nebo kliknutím mimo obsah
    btnClose.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Real-time filtrování
    modalSearch.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const filtered = DATABASE_INGREDIENTS.filter(ing => {
            const normalizedIng = ing.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            return normalizedIng.includes(query);
        });
        renderModalList(filtered);
    });

    // Vykreslení seznamu v modalu
    function renderModalList(items) {
        modalList.innerHTML = '';
        items.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing;
            li.addEventListener('click', () => {
                if (!selectedIngredients.includes(ing)) {
                    selectedIngredients.push(ing);
                    renderTags();
                }
                modal.classList.remove('active'); // Zavře modal po výběru
            });
            modalList.appendChild(li);
        });
    }

    // Vykreslení vybraných tagů na hlavní stránce
    window.removeIngredient = function(ingToRemove) {
        selectedIngredients = selectedIngredients.filter(ing => ing !== ingToRemove);
        renderTags();
    };

    function renderTags() {
        tagsContainer.innerHTML = '';
        selectedIngredients.forEach(ing => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.innerHTML = `${ing} <span class="remove-tag" onclick="removeIngredient('${ing}')">&times;</span>`;
            tagsContainer.appendChild(span);
        });
    }
});