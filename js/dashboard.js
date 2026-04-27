document.addEventListener("DOMContentLoaded", () => {
    const currentUser = Parse.User.current();
    if (!currentUser) return; // auth.js will handle redirect

    const mapsContainer = document.getElementById('maps-container');
    const newMapBtn = document.getElementById('new-map-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noMapsIndicator = document.getElementById('no-maps-indicator');

    // Load Maps
    async function loadMaps() {
        if (!mapsContainer) return;

        mapsContainer.innerHTML = '';
        loadingIndicator.classList.remove('hidden');
        noMapsIndicator.classList.add('hidden');

        const MindMap = Parse.Object.extend("MindMap");
        const query = new Parse.Query(MindMap);
        query.equalTo("owner", currentUser);
        query.descending("updatedAt");

        try {
            const results = await query.find();
            loadingIndicator.classList.add('hidden');

            if (results.length === 0) {
                noMapsIndicator.classList.remove('hidden');
            } else {
                results.forEach(map => {
                    renderMapCard(map);
                });
            }
        } catch (error) {
            console.error("Error loading maps: ", error);
            loadingIndicator.classList.add('hidden');
            alert("Error loading maps. Please try again.");
        }
    }

    function renderMapCard(map) {
        const title = map.get("title") || "Untitled Map";
        const date = map.updatedAt.toLocaleDateString();

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 relative group";

        card.innerHTML = `
            <div class="flex flex-col h-full" onclick="window.location.href='app.php?id=${map.id}'">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">${title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-auto">Last updated: ${date}</p>
            </div>
            <button class="delete-btn absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 hidden group-hover:block transition-colors" title="Delete Map">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click
            if (confirm("Are you sure you want to delete this map?")) {
                try {
                    await map.destroy();
                    card.remove();
                    if (mapsContainer.children.length === 0) {
                        noMapsIndicator.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error("Error deleting map: ", error);
                    alert("Error deleting map.");
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
                window.location.href = `app.php?id=${map.id}`;
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
