document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = Parse.User.current();
    if (!currentUser) return; // auth.js will handle redirect

    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('id');

    if (!mapId) {
        window.location.href = 'dashboard.php';
        return;
    }

    const workspace = document.getElementById('workspace');
    const canvas = document.getElementById('canvas');
    const nodesLayer = document.getElementById('nodes-layer');
    const linesLayer = document.getElementById('lines-layer');
    const mapTitleInput = document.getElementById('map-title');
    const saveBtn = document.getElementById('save-btn');
    const saveStatus = document.getElementById('save-status');
    const backBtn = document.getElementById('back-btn');

    let currentMapObject = null;
    let nodes = [];
    let edges = [];
    let scale = 1;
    let panX = window.innerWidth / 2;
    let panY = window.innerHeight / 2;

    // --- Pan & Zoom ---
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    workspace.addEventListener('mousedown', (e) => {
        if (e.target === workspace || e.target === canvas || e.target === linesLayer) {
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateCanvasTransform();
        }

        if (draggedNode) {
            const dx = (e.clientX - dragStartX) / scale;
            const dy = (e.clientY - dragStartY) / scale;

            const nodeData = nodes.find(n => n.id === draggedNode.id);
            if (nodeData) {
                nodeData.x = initialNodeX + dx;
                nodeData.y = initialNodeY + dy;
                updateNodeElement(draggedNode, nodeData);
                drawLines();
            }
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        draggedNode = null;
    });

    workspace.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        // Calculate point relative to canvas to zoom into
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const canvasMouseX = (mouseX - panX) / scale;
        const canvasMouseY = (mouseY - panY) / scale;

        let newScale = scale * Math.exp(delta);
        newScale = Math.max(0.1, Math.min(newScale, 5)); // Limit zoom

        // Adjust pan to zoom into cursor
        panX = mouseX - canvasMouseX * newScale;
        panY = mouseY - canvasMouseY * newScale;
        scale = newScale;

        updateCanvasTransform();
    }, { passive: false });

    function updateCanvasTransform() {
        canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    // --- Node Interaction ---
    let draggedNode = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialNodeX = 0;
    let initialNodeY = 0;

    function createNodeElement(nodeData) {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'node';
        nodeEl.id = nodeData.id;

        const content = document.createElement('div');
        content.className = 'node-content';
        content.contentEditable = true;
        content.textContent = nodeData.text;

        // Prevent drag when editing text
        content.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        content.addEventListener('input', () => {
            const node = nodes.find(n => n.id === nodeData.id);
            if (node) {
                node.text = content.textContent;
            }
            drawLines(); // Text might change node size
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'node-add-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Add child node';

        addBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Don't drag parent
        });

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addChildNode(nodeData.id);
        });

        nodeEl.appendChild(content);
        nodeEl.appendChild(addBtn);
        nodesLayer.appendChild(nodeEl);

        // Drag logic
        nodeEl.addEventListener('mousedown', (e) => {
            if (e.target !== content && e.target !== addBtn) {
                draggedNode = nodeEl;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                const nd = nodes.find(n => n.id === nodeData.id);
                initialNodeX = nd.x;
                initialNodeY = nd.y;
            }
        });

        updateNodeElement(nodeEl, nodeData);
        return nodeEl;
    }

    function updateNodeElement(el, data) {
        el.style.left = `${data.x}px`;
        el.style.top = `${data.y}px`;
    }

    function addChildNode(parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        const newId = 'node_' + Date.now();
        // Position relative to parent
        const newNode = {
            id: newId,
            x: parentNode.x + 200, // Offset horizontally
            y: parentNode.y + (Math.random() * 100 - 50), // Random vertical offset
            text: 'New Topic'
        };

        nodes.push(newNode);
        edges.push({ source: parentId, target: newId });

        createNodeElement(newNode);
        drawLines();
    }

    // --- Connections (SVG) ---
    function drawLines() {
        linesLayer.innerHTML = '';

        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (sourceNode && targetNode) {
                const sourceEl = document.getElementById(sourceNode.id);
                const targetEl = document.getElementById(targetNode.id);

                if (sourceEl && targetEl) {
                    // Coordinates are node centers (due to translate(-50%, -50%) in css)
                    const x1 = sourceNode.x;
                    const y1 = sourceNode.y;
                    const x2 = targetNode.x;
                    const y2 = targetNode.y;

                    // Draw a cubic bezier curve
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('class', 'connection');

                    // Simple curve control points
                    const cp1x = x1 + (x2 - x1) / 2;
                    const cp1y = y1;
                    const cp2x = x1 + (x2 - x1) / 2;
                    const cp2y = y2;

                    path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
                    linesLayer.appendChild(path);
                }
            }
        });

        // Ensure SVG layer covers all nodes (dynamically resizing isn't strictly needed if we don't constrain overflow, but good practice)
    }

    // --- Load Data ---
    async function loadMap() {
        const MindMap = Parse.Object.extend("MindMap");
        const query = new Parse.Query(MindMap);
        query.equalTo("owner", currentUser);

        try {
            currentMapObject = await query.get(mapId);
            mapTitleInput.value = currentMapObject.get("title") || "";

            const dataStr = currentMapObject.get("data");
            if (dataStr) {
                const data = JSON.parse(dataStr);
                nodes = data.nodes || [];
                edges = data.edges || [];
            } else {
                nodes = [{ id: 'root', x: 0, y: 0, text: 'Main Topic' }];
                edges = [];
            }

            renderMap();
        } catch (error) {
            console.error("Error loading map:", error);
            alert("Error loading map. It might not exist or you don't have permission.");
            window.location.href = 'dashboard.php';
        }
    }

    function renderMap() {
        nodesLayer.innerHTML = '';
        nodes.forEach(nodeData => {
            createNodeElement(nodeData);
        });
        drawLines();
        updateCanvasTransform();
    }

    // --- Save Data ---
    async function saveMap() {
        if (!currentMapObject) return;

        saveStatus.textContent = 'Saving...';

        currentMapObject.set("title", mapTitleInput.value);

        const dataToSave = {
            nodes: nodes,
            edges: edges
        };
        currentMapObject.set("data", JSON.stringify(dataToSave));

        try {
            await currentMapObject.save();
            saveStatus.textContent = 'Saved!';
            setTimeout(() => {
                saveStatus.textContent = '';
            }, 2000);
        } catch (error) {
            console.error("Error saving map:", error);
            saveStatus.textContent = 'Error saving.';
        }
    }

    // Event Listeners
    saveBtn.addEventListener('click', saveMap);

    // Auto-save periodically (e.g., every 10 seconds) if there are changes
    // setInterval(saveMap, 10000); // Optional

    // Save on title change
    mapTitleInput.addEventListener('change', saveMap);

    backBtn.addEventListener('click', () => {
        saveMap().then(() => {
            window.location.href = 'dashboard.php';
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        // Adjust pan if necessary, but usually leaving it as is works
    });

    // Initialize
    loadMap();
});
