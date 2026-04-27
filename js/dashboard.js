document.addEventListener("DOMContentLoaded", () => {
    const currentUser = Parse.User.current();
    if (!currentUser) return;

    const mapsContainer = document.getElementById('maps-container');
    const newMapBtn = document.getElementById('new-map-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noMapsIndicator = document.getElementById('no-maps-indicator');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    let allMaps = [];

    function showToast(msg, type = 'error') {
        Toastify({ text: msg, duration: 3000, close: true, gravity: "top", position: "right", style: { background: type === 'error' ? "#ef4444" : "#10b981" } }).showToast();
    }

    // Load Maps
    async function loadMaps() {
        if (!mapsContainer) return;

        mapsContainer.innerHTML = '';
        loadingIndicator.classList.remove('hidden');
        noMapsIndicator.classList.add('hidden');

        const MindMap = Parse.Object.extend("MindMap");
        const query = new Parse.Query(MindMap);
        query.equalTo("owner", currentUser);

        try {
            allMaps = await query.find();
            loadingIndicator.classList.add('hidden');
            renderFilteredAndSortedMaps();
        } catch (error) {
            console.error("Error loading maps: ", error);
            loadingIndicator.classList.add('hidden');
            showToast("Error loading maps. Please try again.");
        }
    }

    function renderFilteredAndSortedMaps() {
        mapsContainer.innerHTML = '';
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const sortValue = sortSelect ? sortSelect.value : 'date-desc';

        let filteredMaps = allMaps.filter(map => {
            const title = (map.get("title") || "Untitled Map").toLowerCase();
            return title.includes(searchTerm);
        });

        filteredMaps.sort((a, b) => {
            if (sortValue === 'date-desc') return b.updatedAt - a.updatedAt;
            if (sortValue === 'date-asc') return a.updatedAt - b.updatedAt;

            const titleA = (a.get("title") || "Untitled Map").toLowerCase();
            const titleB = (b.get("title") || "Untitled Map").toLowerCase();
            if (sortValue === 'name-asc') return titleA.localeCompare(titleB);
            if (sortValue === 'name-desc') return titleB.localeCompare(titleA);
            return 0;
        });

        if (filteredMaps.length === 0) {
            noMapsIndicator.classList.remove('hidden');
        } else {
            noMapsIndicator.classList.add('hidden');
            filteredMaps.forEach(map => renderMapCard(map));
        }
    }

    if(searchInput) searchInput.addEventListener('input', renderFilteredAndSortedMaps);
    if(sortSelect) sortSelect.addEventListener('change', renderFilteredAndSortedMaps);

    function renderMapCard(map) {
        const title = map.get("title") || "Untitled Map";
        const date = map.updatedAt.toLocaleDateString();

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 relative group flex flex-col h-full";

        card.innerHTML = `
            <div class="flex-grow flex flex-col" onclick="window.location.href='/map/${map.id}'">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate pr-6 map-title-display">${title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-auto">Last updated: ${date}</p>
            </div>
            <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                <button class="rename-btn p-1.5 text-gray-400 hover:text-blue-500 transition-colors" title="Rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button class="dup-btn p-1.5 text-gray-400 hover:text-green-500 transition-colors" title="Duplicate">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
                <button class="delete-btn p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this map?")) {
                try {
                    await map.destroy();
                    allMaps = allMaps.filter(m => m.id !== map.id);
                    renderFilteredAndSortedMaps();
                    showToast("Map deleted.", "success");
                } catch (error) {
                    console.error("Error deleting map: ", error);
                    showToast("Error deleting map.");
                }
            }
        });

        const dupBtn = card.querySelector('.dup-btn');
        dupBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const MindMap = Parse.Object.extend("MindMap");
            const newMap = new MindMap();
            newMap.set("title", map.get("title") + " (Copy)");
            newMap.set("owner", currentUser);
            newMap.setACL(new Parse.ACL(currentUser));
            newMap.set("data", map.get("data"));
            try {
                await newMap.save();
                allMaps.push(newMap);
                renderFilteredAndSortedMaps();
                showToast("Map duplicated.", "success");
            } catch (error) {
                console.error("Error dup:", error);
                showToast("Error duplicating map.");
            }
        });

        const renameBtn = card.querySelector('.rename-btn');
        renameBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newTitle = prompt("Enter new title:", map.get("title") || "Untitled Map");
            if (newTitle !== null && newTitle.trim() !== "") {
                map.set("title", newTitle.trim());
                try {
                    await map.save();
                    renderFilteredAndSortedMaps();
                    showToast("Map renamed.", "success");
                } catch (error) {
                    console.error("Error rename:", error);
                    showToast("Error renaming map.");
                }
            }
        });

        mapsContainer.appendChild(card);
    }

    // Create New Map
    if (newMapBtn) {
        newMapBtn.addEventListener('click', async () => {
            const MindMap = Parse.Object.extend("MindMap");
            const map = new MindMap();

            map.set("title", "New Mind Map");
            map.set("owner", currentUser);

            // Set ACL to ensure privacy
            const acl = new Parse.ACL(currentUser);
            map.setACL(acl);

            // Initial map data with a root node
            const initialData = {
                nodes: [
                    { id: 'root', x: 0, y: 0, text: 'Main Topic' }
                ],
                edges: []
            };
            map.set("data", JSON.stringify(initialData));

            try {
                await map.save();
                window.location.href = `/map/${map.id}`;
            } catch (error) {
                console.error('Failed to create new map:', error);
                alert('Failed to create new map. Please try again.');
            }
        });
    }

    // Initialize
    if (document.getElementById('maps-container')) {
        loadMaps();
    }
});
