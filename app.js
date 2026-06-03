document.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. PWA & OFFLINE STAV ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker úspěšně registrován s rozsahem:', reg.scope))
            .catch(err => console.error('Registrace Service Workeru selhala:', err));
    }

    const offlineIndicator = document.getElementById('offlineIndicator');
    
    function updateOnlineStatus() {
        if (!offlineIndicator) return;
        if (navigator.onLine) {
            offlineIndicator.style.display = 'none';
        } else {
            offlineIndicator.style.display = 'block';
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Okamžitá kontrola po načtení
    
    // --- 1. STAVOVÉ PROMĚNNÉ ---
    let selectedIngredients = [];
    // Načtení a okamžitá filtrace poškozených dat (odstranění záznamů s null/NaN ID)
    let favorites = (JSON.parse(localStorage.getItem('cookit_favorites')) || [])
        .filter(f => f && f.id !== null && f.id !== undefined && !isNaN(Number(f.id)));
    let shoppingList = JSON.parse(localStorage.getItem('cookit_shopping_list')) || [];
    
    // Migrace starých textových dat na objekty (pro případ, že už tam něco máš z minula)
    shoppingList = shoppingList.map(item => typeof item === 'string' ? { recipeTitle: 'Samostatně přidané', name: item } : item);

    let debounceTimer; 

    // --- 2. DOM ELEMENTY ---
    // Navigace
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // Modal pro ingredience
    const modal = document.getElementById('ingredient-modal');
    const btnAdd = document.getElementById('btn-add-ingredient');
    const btnClose = document.getElementById('btn-close-modal');
    const modalSearch = document.getElementById('modal-search');
    const modalList = document.getElementById('modal-ingredient-list');
    const tagsContainer = document.getElementById('tags-container');
    const btnSearch = document.getElementById('btn-search');
    const searchContainer = document.querySelector('.search-container');
    const searchSentinel = document.getElementById('search-sentinel');
    const searchPlaceholder = document.getElementById('search-placeholder');
    const recipesGrid = document.getElementById('recipes-grid');
    const favoritesGrid = document.getElementById('favorites-grid');

    // Elementy pro detail receptu
    const detailModal = document.getElementById('recipe-detail-modal');
    const btnCloseDetail = document.getElementById('btn-close-detail');
    const detailTitle = document.getElementById('detail-title');
    const detailImg = document.getElementById('detail-img');
    const detailNutrition = document.getElementById('detail-nutrition');
    const detailIngredients = document.getElementById('detail-ingredients');
    const detailInstructions = document.getElementById('detail-instructions');
    const detailFavBtn = document.getElementById('detail-fav-btn');

    // --- DETEKCE STICKY STAVU ---
    const observer = new IntersectionObserver(
        ([e]) => {
            if (!e.isIntersecting && e.boundingClientRect.top < 0) {
                // Zmizel za horním okrajem (odscrollovali jsme dolů)
                if (!searchContainer.classList.contains('is-sticky')) {
                    const oldHeight = searchContainer.offsetHeight;
                    searchContainer.classList.add('is-sticky');
                    const newHeight = searchContainer.offsetHeight;
                    
                    // Zkompenzujeme ztracenou výšku zástupným elementem
                    if (oldHeight > newHeight) {
                        searchPlaceholder.style.height = `${oldHeight - newHeight}px`;
                    }
                }
            } else if (e.isIntersecting) {
                // Vrátil se na obrazovku (jsme zpět nahoře)
                searchContainer.classList.remove('is-sticky');
                searchPlaceholder.style.height = '0px';
            }
        },
        { threshold: [0] }
    );

    if (searchSentinel) observer.observe(searchSentinel);

    // --- 3. EVENT LISTENERY ---

    // Přepínání záložek ve spodním menu
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'favorites-section') {
                renderFavorites();
            } else if (targetId === 'shopping-section') {
                renderShoppingList();
            }
        });
    });

    btnCloseDetail.addEventListener('click', () => {
        detailModal.classList.remove('active');
    });

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
        
        if (selectedIngredients.length === 0) {
            tagsContainer.innerHTML = `
                <div class="empty-state-msg">
                    <i class="ph ph-basket" style="font-size: 1.5rem"></i>
                    <span>Zatím jsi nepřidal žádné suroviny</span>
                </div>`;
            return;
        }

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
        recipesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><i class="ph ph-circle-notch ph-spin" style="font-size: 2rem; color: var(--primary);"></i><p style="margin-top: 1rem; color: var(--text-muted);">Hledám nejlepší recepty...</p></div>';

        try {
            // Volání API pro hledání podle ingrediencí
            const response = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientsString}&number=10&apiKey=${API_KEY}`);
            if (!response.ok) throw new Error('Chyba při stahování receptů');
            
            const recipes = await response.json();
            renderRecipes(recipes, recipesGrid);
        } catch (error) {
            console.error("Chyba při stahování receptů:", error);
            alert("Došlo k chybě při načítání nových receptů. API limit je pravděpodobně vyčerpán.");
        }
    }

    async function fetchRecipeDetail(id) {
        // Obrana proti neplatným ID (např. "null" jako řetězec z datasetu)
        if (!id || id === 'null' || id === 'undefined') return;

        detailModal.classList.add('active');
        detailTitle.textContent = "Načítám...";
        detailImg.src = "";
        detailNutrition.innerHTML = "";
        detailIngredients.innerHTML = "";
        detailInstructions.innerHTML = "";
        
        try {
            const res = await fetch(`https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true&apiKey=${API_KEY}`);
            if (!res.ok) throw new Error('Nepodařilo se načíst data z API (možná neplatné ID nebo limit)');
            
            const recipe = await res.json();
            
            renderRecipeDetail(recipe);
        } catch (error) {
            console.error("Chyba při načítání detailu:", error);
            detailTitle.textContent = "Limit API vyčerpán";
            detailInstructions.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--danger-text);">
                <i class="ph ph-warning-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p><strong>Nepodařilo se načíst recept.</strong></p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem;">Pravděpodobně byl vyčerpán denní limit u poskytovatele receptů (Spoonacular API). Zkuste to prosím zítra, nebo vložte nový API klíč.</p>
            </div>`;
        }
    }

    function renderRecipeDetail(recipe) {
        detailTitle.textContent = recipe.title;
        detailImg.src = recipe.image;

        // Nastavení stavu srdíčka v detailu
        const isFav = favorites.some(f => f.id === recipe.id);
        detailFavBtn.classList.toggle('active', isFav);
        const favIcon = detailFavBtn.querySelector('i');
        if (favIcon) {
            favIcon.className = isFav ? 'ph-fill ph-heart' : 'ph ph-heart';
        }

        // Kliknutí na srdíčko v detailu
        detailFavBtn.onclick = () => {
            toggleFavorite(recipe);
        };
        
        // 1. Nutriční hodnoty
        const nutrients = recipe.nutrition.nutrients;
        const translations = {
            'Calories': 'Kalorie',
            'Fat': 'Tuky',
            'Protein': 'Bílkoviny',
            'Carbohydrates': 'Sacharidy'
        };
        const important = Object.keys(translations);

        detailNutrition.innerHTML = nutrients
            .filter(n => important.includes(n.name))
            .map(n => `
                <div class="nutrition-item">
                    <small style="display:block; color:var(--text-muted)">${translations[n.name] || n.name}</small>
                    <strong>${Math.round(n.amount)} ${n.unit}</strong>
                </div>
            `).join('');

        // 2. Ingredience
        detailIngredients.innerHTML = recipe.extendedIngredients
            .map(ing => {
                const ingName = ing.original || ing.name;
                const safeIngName = ingName.replace(/"/g, '&quot;'); // Obrana proti rozbití HTML, kdyby název obsahoval uvozovky
                // Nová kontrola – hledáme podle názvu i názvu receptu
                const isInList = shoppingList.some(item => item.name === ingName && item.recipeTitle === recipe.title);
                return `<li>
                    <span class="ing-name" style="flex: 1;">${ingName}</span>
                    <button class="btn-shop-toggle ${isInList ? 'active' : ''}" data-name="${safeIngName}" title="${isInList ? 'Odebrat z nákupního seznamu' : 'Přidat do nákupního seznamu'}">
                        <i class="${isInList ? 'ph-fill ph-shopping-cart' : 'ph ph-shopping-cart'}"></i>
                    </button>
                </li>`;
            }).join('');

        // 3. Postup
        let instructionsHTML = "<p>Postup bohužel není k dispozici.</p>";
        
        // Preferujeme analyzovaný postup rozdělený na kroky
        if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
            const steps = recipe.analyzedInstructions[0].steps;
            instructionsHTML = '<ol>' + steps.map(s => `<li>${s.step}</li>`).join('') + '</ol>';
        } else if (recipe.instructions) {
            instructionsHTML = recipe.instructions.includes('<') ? recipe.instructions : `<div>${recipe.instructions}</div>`;
        }
        detailInstructions.innerHTML = instructionsHTML;
    }

    // Delegovaná událost pro tlačítka "Přidat do nákupu" v detailu receptu
    detailIngredients.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-shop-toggle');
        if (!btn) return;

        const ingName = btn.dataset.name;
        const recipeTitle = detailTitle.textContent;
        const index = shoppingList.findIndex(item => item.name === ingName && item.recipeTitle === recipeTitle);

        if (index === -1) {
            shoppingList.push({ recipeTitle, name: ingName });
            btn.classList.add('active');
            btn.querySelector('i').className = 'ph-fill ph-shopping-cart';
            btn.title = 'Odebrat z nákupního seznamu';
        } else {
            shoppingList.splice(index, 1);
            btn.classList.remove('active');
            btn.querySelector('i').className = 'ph ph-shopping-cart';
            btn.title = 'Přidat do nákupního seznamu';
        }

        localStorage.setItem('cookit_shopping_list', JSON.stringify(shoppingList));
    });

    // Funkce pro přepínání oblíbených
    function toggleFavorite(recipe) {
        if (!recipe || recipe.id === null || recipe.id === undefined) return;
        
        // Vždy pracujeme s ID jako s číslem pro spolehlivé porovnání
        const recipeId = Number(recipe.id);
        if (isNaN(recipeId)) return;

        const index = favorites.findIndex(f => Number(f.id) === recipeId);
        const isNowFav = index === -1;
        
        if (!isNowFav) {
            favorites.splice(index, 1);
        } else {
            // Uložíme kopii se zaručeným číselným ID
            favorites.push({ ...recipe, id: recipeId });
        }

        localStorage.setItem('cookit_favorites', JSON.stringify(favorites));
        
        // Synchronizace VŠECH srdíček pro tento recept (na kartách i v detailu)
        updateHeartIcons(recipeId, isNowFav);

        // Pokud jsme zrovna v sekci oblíbených, rovnou to překreslíme
        if (document.getElementById('favorites-section').classList.contains('active')) {
            renderFavorites();
        }
    }

    function updateHeartIcons(recipeId, isActive) {
        // Najdeme všechna tlačítka v mřížce podle data-id
        const gridButtons = document.querySelectorAll(`.btn-fav[data-id="${recipeId}"]`);
        const detailBtn = document.getElementById('detail-fav-btn');
        
        const updateBtn = (btn) => {
            btn.classList.toggle('active', isActive);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isActive ? 'ph-fill ph-heart' : 'ph ph-heart';
            }
        };

        gridButtons.forEach(updateBtn);
        if (detailBtn) updateBtn(detailBtn);
    }

    function renderFavorites() {
        renderRecipes(favorites, favoritesGrid);
    }

    // --- DELEGACE KLIKNUTÍ PRO GRID (pro statické i dynamické karty) ---
    function handleGridClick(e, grid) {
        const card = e.target.closest('.recipe-card');
        if (!card) return;

        const recipeIdStr = card.dataset.id;
        if (!recipeIdStr || recipeIdStr === 'null' || recipeIdStr === 'undefined') return;

        const recipeId = Number(recipeIdStr);
        const btnFav = e.target.closest('.btn-fav');

        if (btnFav) {
            e.stopPropagation();
            toggleFavorite({ 
                id: recipeId, 
                title: card.querySelector('h3').textContent, 
                image: card.querySelector('img').src 
            });
        } else {
            fetchRecipeDetail(recipeId);
        }
    }

    recipesGrid.addEventListener('click', (e) => handleGridClick(e, recipesGrid));
    favoritesGrid.addEventListener('click', (e) => handleGridClick(e, favoritesGrid));

    // Univerzální vykreslení receptů do mřížky
    function renderRecipes(recipes, container) {
        container.innerHTML = '';
        
        if (recipes.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Zatím tu nic není.</p>';
            return;
        }

        recipes.forEach(recipe => {
            const isFav = favorites.some(f => f.id === recipe.id);
            const article = document.createElement('article');
            article.className = 'recipe-card';
            article.dataset.id = recipe.id;

            article.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.title}" class="recipe-img">
                <div class="recipe-info">
                    <h3>${recipe.title}</h3>
                    <p class="recipe-nutrition" style="margin-bottom: 0.5rem">
                        ${recipe.missedIngredientCount !== undefined ? `Chybí suroviny: ${recipe.missedIngredientCount}` : 'Uložený recept'}
                    </p>
                    <button class="btn-fav ${isFav ? 'active' : ''}" data-id="${recipe.id}">
                        <i class="${isFav ? 'ph-fill ph-heart' : 'ph ph-heart'}"></i>
                    </button>
                </div>
            `;

            container.appendChild(article);
        });
    }

    // --- NÁKUPNÍ SEZNAM ---
    const shoppingListContainer = document.getElementById('shopping-list');
    
    function renderShoppingList() {
        if (!shoppingListContainer) return;
        shoppingListContainer.innerHTML = '';

        if (shoppingList.length === 0) {
            shoppingListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">V nákupním seznamu zatím nemáš žádné suroviny.</p>';
            return;
        }

        // Seskupení ingrediencí podle názvu receptu (tzv. "Dictionary" pattern)
        const grouped = {};
        shoppingList.forEach(item => {
            if (!grouped[item.recipeTitle]) {
                grouped[item.recipeTitle] = [];
            }
            grouped[item.recipeTitle].push(item.name);
        });

        // Vykreslení jednotlivých "kartiček" pro každý recept
        for (const [recipeTitle, ingredients] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'shopping-group';
            
            groupDiv.innerHTML = `
                <h3 class="shopping-group-title">${recipeTitle}</h3>
                <ul class="shopping-group-list">
                    ${ingredients.map(ing => `
                        <li>
                            <span class="ing-name">${ing}</span>
                            <button class="btn-remove-shop" data-title="${recipeTitle.replace(/"/g, '&quot;')}" data-name="${ing.replace(/"/g, '&quot;')}" title="Odebrat surovinu">
                                <i class="ph ph-trash"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
            `;
            shoppingListContainer.appendChild(groupDiv);
        }
    }

    // Delegovaná událost pro mazání z nákupního seznamu
    if (shoppingListContainer) {
        shoppingListContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove-shop');
            if (!btn) return;

            const recipeTitle = btn.dataset.title;
            const ingName = btn.dataset.name;

            const index = shoppingList.findIndex(item => item.recipeTitle === recipeTitle && item.name === ingName);
            if (index !== -1) {
                shoppingList.splice(index, 1);
                localStorage.setItem('cookit_shopping_list', JSON.stringify(shoppingList));
                renderShoppingList(); // Překreslení seznamu po smazání
            }
        });
    }
});