document.addEventListener("DOMContentLoaded", () => {
    const currentUser = Parse.User.current();
    if (!currentUser) return;

    const mapsContainer = document.getElementById('maps-container');
    const newMapBtn = document.getElementById('new-map-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noMapsIndicator = document.getElementById('no-maps-indicator');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const tabActive = document.getElementById('tab-active');
    const tabTrash = document.getElementById('tab-trash');
    const viewTitle = document.getElementById('view-title');
    const tagFilter = document.getElementById('tag-filter');
    const viewGridBtn = document.getElementById('view-grid');
    const viewListBtn = document.getElementById('view-list');
    const templateModal = document.getElementById('template-modal');
    const closeTemplateModal = document.getElementById('close-template-modal');

    let allMaps = [];
    let currentView = 'active'; // active or trash
    let isListView = false;

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
        query.equalTo("isTrashed", currentView === 'trash');

        try {
            allMaps = await query.find();
            loadingIndicator.classList.add('hidden');
            updateTagsDropdown();
            renderFilteredAndSortedMaps();
        } catch (error) {
            console.error("Error loading maps: ", error);
            loadingIndicator.classList.add('hidden');
            showToast("Error loading maps. Please try again.");
        }
    }

    function updateTagsDropdown() {
        if(!tagFilter) return;
        const currentTag = tagFilter.value;
        const tags = new Set();
        allMaps.forEach(m => {
            const mapTags = m.get('tags') || [];
            mapTags.forEach(t => tags.add(t));
        });

        tagFilter.innerHTML = '<option value="">All Tags</option>';
        Array.from(tags).sort().forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            tagFilter.appendChild(opt);
        });
        if(tags.has(currentTag)) tagFilter.value = currentTag;
    }

    function renderFilteredAndSortedMaps() {
        mapsContainer.innerHTML = '';

        if (isListView) {
            mapsContainer.className = "flex flex-col gap-4 transition-all";
        } else {
            mapsContainer.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 transition-all";
        }

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const sortValue = sortSelect ? sortSelect.value : 'date-desc';
        const tagValue = tagFilter ? tagFilter.value : '';

        let filteredMaps = allMaps.filter(map => {
            const title = (map.get("title") || "Untitled Map").toLowerCase();
            const mapTags = map.get("tags") || [];
            const matchesSearch = title.includes(searchTerm);
            const matchesTag = tagValue === '' || mapTags.includes(tagValue);
            return matchesSearch && matchesTag;
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
    if(tagFilter) tagFilter.addEventListener('change', renderFilteredAndSortedMaps);

    function renderMapCard(map) {
        const title = map.get("title") || "Untitled Map";
        const date = map.updatedAt.toLocaleDateString();

        const thumbnail = map.get("thumbnail");
        const mapTags = map.get("tags") || [];
        const tagsHtml = mapTags.map(t => `<span class="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300 mr-1 mb-1">${t}</span>`).join('');

        const card = document.createElement('div');
        if (isListView) {
            card.className = "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 relative group flex items-center justify-between";
            card.innerHTML = `
                <div class="flex items-center flex-grow" onclick="${currentView === 'active' ? `window.location.href='/map/${map.id}'` : ''}">
                    <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded mr-4 overflow-hidden flex-shrink-0">
                        ${thumbnail ? `<img src="${thumbnail}" class="w-full h-full object-cover">` : `<svg class="w-6 h-6 m-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`}
                    </div>
                    <div>
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white">${title}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Updated: ${date}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="hidden md:flex flex-wrap max-w-xs mr-4">${tagsHtml}</div>
                    ${currentView === 'active' ? `
                    <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="rename-btn p-1.5 text-gray-400 hover:text-blue-500" title="Rename"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button class="dup-btn p-1.5 text-gray-400 hover:text-green-500" title="Duplicate"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                        <button class="delete-btn p-1.5 text-gray-400 hover:text-red-500" title="Move to Trash"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>` : `
                    <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="restore-btn p-1.5 text-gray-400 hover:text-green-500" title="Restore"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>
                        <button class="perm-delete-btn p-1.5 text-gray-400 hover:text-red-500" title="Delete Permanently"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>`}
                </div>
            `;
        } else {
            card.className = "bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 relative group flex flex-col h-full overflow-hidden";
            card.innerHTML = `
                <div class="h-32 bg-gray-100 dark:bg-gray-900 w-full relative flex items-center justify-center border-b border-gray-200 dark:border-gray-700 overflow-hidden" onclick="${currentView === 'active' ? `window.location.href='/map/${map.id}'` : ''}">
                    ${thumbnail ? `<img src="${thumbnail}" class="w-full h-full object-cover">` : `<svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`}
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate pr-6">${title}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Updated: ${date}</p>
                    <div class="mt-auto flex flex-wrap pt-2">${tagsHtml}</div>
                </div>
                ${currentView === 'active' ? `
                <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                    <button class="rename-btn p-1.5 text-gray-400 hover:text-blue-500" title="Rename"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button class="dup-btn p-1.5 text-gray-400 hover:text-green-500" title="Duplicate"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                    <button class="delete-btn p-1.5 text-gray-400 hover:text-red-500" title="Move to Trash"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>` : `
                <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                    <button class="restore-btn p-1.5 text-gray-400 hover:text-green-500" title="Restore"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>
                    <button class="perm-delete-btn p-1.5 text-gray-400 hover:text-red-500" title="Delete Permanently"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>`}
            `;
        }

        if (currentView === 'active') {
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm("Move this map to Trash?")) {
                    try {
                        map.set("isTrashed", true);
                        await map.save();
                        allMaps = allMaps.filter(m => m.id !== map.id);
                        renderFilteredAndSortedMaps();
                        showToast("Map moved to trash.", "success");
                    } catch (error) {
                        console.error("Error trashing map: ", error);
                        showToast("Error moving map.");
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
                newMap.set("tags", map.get("tags") || []);
                newMap.set("isTrashed", false);
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
        } else {
            const restoreBtn = card.querySelector('.restore-btn');
            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    map.set("isTrashed", false);
                    await map.save();
                    allMaps = allMaps.filter(m => m.id !== map.id);
                    renderFilteredAndSortedMaps();
                    showToast("Map restored.", "success");
                } catch (error) {
                    console.error("Error restoring: ", error);
                    showToast("Error restoring map.");
                }
            });

            const permDeleteBtn = card.querySelector('.perm-delete-btn');
            permDeleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm("Delete this map PERMANENTLY? This cannot be undone.")) {
                    try {
                        await map.destroy();
                        allMaps = allMaps.filter(m => m.id !== map.id);
                        renderFilteredAndSortedMaps();
                        showToast("Map deleted permanently.", "success");
                    } catch (error) {
                        console.error("Error deleting map: ", error);
                        showToast("Error deleting map.");
                    }
                }
            });
        }

    // Create New Map
    if (newMapBtn) {
        newMapBtn.addEventListener('click', () => {
            templateModal.classList.remove('hidden');
        });
    }

    if(closeTemplateModal) {
        closeTemplateModal.addEventListener('click', () => {
            templateModal.classList.add('hidden');
        });
    }

    // Template creation
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
        card.addEventListener('click', async () => {
            templateModal.classList.add('hidden');
            const type = card.dataset.template;
            const MindMap = Parse.Object.extend("MindMap");
            const map = new MindMap();

            map.set("title", "New Mind Map");
            map.set("owner", currentUser);

            // Set ACL to ensure privacy
            const acl = new Parse.ACL(currentUser);
            map.setACL(acl);

            map.set("isTrashed", false);
            map.set("tags", []);

            // Initial map data based on template
            let initialData = { nodes: [{ id: 'root', x: 0, y: 0, text: 'Main Topic' }], edges: [] };

            if (type === 'brainstorm') {
                map.set("title", "Brainstorming Session");
                initialData = {
                    nodes: [
                        { id: 'root', x: 0, y: 0, text: 'Central Idea' },
                        { id: 'n1', x: -150, y: -100, text: 'Concept A' },
                        { id: 'n2', x: 150, y: -100, text: 'Concept B' },
                        { id: 'n3', x: 0, y: 150, text: 'Concept C' }
                    ],
                    edges: [
                        { source: 'root', target: 'n1' },
                        { source: 'root', target: 'n2' },
                        { source: 'root', target: 'n3' }
                    ]
                };
            } else if (type === 'org') {
                map.set("title", "Organization Chart");
                initialData = {
                    nodes: [
                        { id: 'root', x: 0, y: 0, text: 'CEO' },
                        { id: 'n1', x: -150, y: 100, text: 'CTO' },
                        { id: 'n2', x: 150, y: 100, text: 'CFO' },
                        { id: 'n3', x: -200, y: 200, text: 'Engineering' },
                        { id: 'n4', x: -100, y: 200, text: 'Product' }
                    ],
                    edges: [
                        { source: 'root', target: 'n1' },
                        { source: 'root', target: 'n2' },
                        { source: 'n1', target: 'n3' },
                        { source: 'n1', target: 'n4' }
                    ]
                };
            }

            map.set("data", JSON.stringify(initialData));

            try {
                await map.save();
                window.location.href = `/map/${map.id}`;
            } catch (error) {
                console.error('Failed to create new map:', error);
                showToast('Failed to create new map.');
            }
        });
    });

    // View Toggles
    if(tabActive) {
        tabActive.addEventListener('click', () => {
            currentView = 'active';
            viewTitle.textContent = "My Mind Maps";
            tabActive.className = "px-3 py-1 rounded shadow bg-white dark:bg-gray-600 text-sm font-medium transition-colors";
            tabTrash.className = "px-3 py-1 rounded text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors";
            loadMaps();
        });
    }
    if(tabTrash) {
        tabTrash.addEventListener('click', () => {
            currentView = 'trash';
            viewTitle.textContent = "Trash";
            tabTrash.className = "px-3 py-1 rounded shadow bg-white dark:bg-gray-600 text-sm font-medium transition-colors";
            tabActive.className = "px-3 py-1 rounded text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors";
            loadMaps();
        });
    }

    if(viewGridBtn) {
        viewGridBtn.addEventListener('click', () => {
            isListView = false;
            viewGridBtn.className = "p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";
            viewListBtn.className = "p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600";
            renderFilteredAndSortedMaps();
        });
    }
    if(viewListBtn) {
        viewListBtn.addEventListener('click', () => {
            isListView = true;
            viewListBtn.className = "p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";
            viewGridBtn.className = "p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600";
            renderFilteredAndSortedMaps();
        });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if(e.key === '/') {
            e.preventDefault();
            if(searchInput) searchInput.focus();
        } else if (e.key.toLowerCase() === 'n') {
            e.preventDefault();
            if(templateModal) templateModal.classList.remove('hidden');
        }
    });

    // Initialize
    if (document.getElementById('maps-container')) {
        loadMaps();
    }
});
