document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Přepínání záložek ve spodním menu
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

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
    const btnSearch = document.getElementById('btn-search');
    const recipesGrid = document.getElementById('recipes-grid');

    let selectedIngredients = [];
    let debounceTimer; // Pro ochranu proti vyčerpání API limitu

    // Otevření modalu
    btnAdd.addEventListener('click', () => {
        modal.classList.add('active');
        modalSearch.value = '';
        modalList.innerHTML = ''; // Vyčistí předchozí hledání
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

    // Real-time hledání ingrediencí s napojením na API
    modalSearch.addEventListener('input', (e) => {
        // Odstranění mezer a diakritiky pro čistší query (Spoonacular si s tím poradí lépe)
        const query = e.target.value.trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "");
        
        // Zrušení předchozího časovače, pokud uživatel stále píše
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            modalList.innerHTML = ''; // Hledáme až od 2 znaků
            return;
        }

        // Počkáme 500ms po dopsání, než pošleme request (šetříme API limity)
        debounceTimer = setTimeout(async () => {
            try {
                // Volání Autocomplete API od Spoonacular
                const response = await fetch(`https://api.spoonacular.com/food/ingredients/autocomplete?query=${query}&number=10&apiKey=${API_KEY}`);
                if (!response.ok) throw new Error('Chyba při načítání ingrediencí');
                
                const data = await response.json();
                
                // API vrací objekty, vezmeme z nich jen vlastnost 'name'
                const ingredientNames = data.map(item => item.name);
                renderModalList(ingredientNames);
            } catch (error) {
                console.error("Nepodařilo se našeptat ingredience:", error);
            }
        }, 500); 
    });

    // Vykreslení seznamu našeptaných ingrediencí v modalu
    function renderModalList(items) {
        modalList.innerHTML = '';
        
        if (items.length === 0) {
            modalList.innerHTML = '<li>Žádné ingredience nenalezeny</li>';
            return;
        }

        items.forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing; // Spoonacular vrací anglické názvy (např. "apple", "chicken")
            li.addEventListener('click', () => {
                if (!selectedIngredients.includes(ing)) {
                    selectedIngredients.push(ing);
                    renderTags();
                }
                modal.classList.remove('active');
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

    // --- TRIGGER TLAČÍTKEM ---
    btnSearch.addEventListener('click', () => {
        fetchRecipesByIngredients();
    });

    // --- NOVÁ FUNKCE PRO HLEDÁNÍ RECEPTŮ ---
    async function fetchRecipesByIngredients() {
        if (!recipesGrid) return; 

        if (selectedIngredients.length === 0) {
            alert('Nejdřív vyber aspoň jednu surovinu!');
            return;
        }

        // Spojí ingredience čárkou pro API formát (např. "apples,+flour,+sugar")
        const ingredientsString = selectedIngredients.join(',+');
        recipesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Hledám nejlepší recepty...</p>';

        try {
            // Volání API pro hledání podle ingrediencí
            const response = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientsString}&number=10&apiKey=${API_KEY}`);
            if (!response.ok) throw new Error('Chyba při stahování receptů');
            
            const recipes = await response.json();
            renderRecipes(recipes);
        } catch (error) {
            console.error("Chyba:", error);
            recipesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Došlo k chybě při načítání receptů. Zkontroluj API klíč.</p>';
        }
    }

    // Vykreslení nalezených receptů do mřížky
    function renderRecipes(recipes) {
        recipesGrid.innerHTML = '';
        
        if (recipes.length === 0) {
            recipesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Z těchto ingrediencí se asi nic neuvaří. Zkus přidat další!</p>';
            return;
        }

        recipes.forEach(recipe => {
            const article = document.createElement('article');
            article.className = 'recipe-card';
            article.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.title}" class="recipe-img">
                <div class="recipe-info">
                    <h3>${recipe.title}</h3>
                    <p class="recipe-nutrition">Chybí suroviny: ${recipe.missedIngredientCount}</p>
                    <button class="btn-fav"><i class="ph ph-heart"></i></button>
                </div>
            `;
            recipesGrid.appendChild(article);
        });
    }
});