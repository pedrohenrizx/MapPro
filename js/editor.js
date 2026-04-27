document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = Parse.User.current();
    if (!currentUser) return; // auth.js will handle redirect

    let mapId = null;
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'map') {
        mapId = pathParts[2];
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        mapId = urlParams.get('id');
    }

    if (!mapId) {
        window.location.href = '/dashboard';
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
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    let currentMapObject = null;
    let nodes = [];
    let edges = [];
    let scale = 1;
    let panX = window.innerWidth / 2;
    let panY = window.innerHeight / 2;
    let isReadOnly = false;
    let autoSaveTimer = null;
    const GRID_SIZE = 20;

    // History
    let history = [];
    let historyIndex = -1;
    let isUndoRedo = false;

    function showToast(msg, type = 'success') {
        if(typeof Toastify === 'undefined') return;
        Toastify({ text: msg, duration: 3000, close: true, gravity: "top", position: "right", style: { background: type === 'error' ? "#ef4444" : "#10b981" } }).showToast();
    }

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

        if (draggedNode && !isReadOnly) {
            const dx = (e.clientX - dragStartX) / scale;
            const dy = (e.clientY - dragStartY) / scale;

            let targetX = initialNodeX + dx;
            let targetY = initialNodeY + dy;

            // Snap to Grid
            targetX = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
            targetY = Math.round(targetY / GRID_SIZE) * GRID_SIZE;

            const nodeData = nodes.find(n => n.id === draggedNode.id);
            if (nodeData) {
                nodeData.x = targetX;
                nodeData.y = targetY;
                updateNodeElement(draggedNode, nodeData);
                drawLines();
            }
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        if(draggedNode) {
            triggerAutoSave();
        }
        draggedNode = null;
    });

    function setZoom(newScale, center = false) {
        newScale = Math.max(0.1, Math.min(newScale, 5));

        if (center) {
            // Find root node or center of nodes
            const rootNode = nodes.find(n => n.id === 'root') || nodes[0];
            if (rootNode) {
                panX = (window.innerWidth / 2) - (rootNode.x * newScale);
                panY = (window.innerHeight / 2) - (rootNode.y * newScale);
            }
        } else {
            // Zoom towards center of screen if not wheeling
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const canvasCenterX = (centerX - panX) / scale;
            const canvasCenterY = (centerY - panY) / scale;

            panX = centerX - canvasCenterX * newScale;
            panY = centerY - canvasCenterY * newScale;
        }

        scale = newScale;
        updateCanvasTransform();
    }

    if(zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(scale * 1.2));
    if(zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(scale / 1.2));
    if(zoomResetBtn) zoomResetBtn.addEventListener('click', () => setZoom(1, true));

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

    const COLORS = ['#ffffff', '#fecaca', '#fde047', '#bbf7d0', '#bfdbfe', '#e9d5ff'];
    const FONT_SIZES = [12, 14, 16, 20, 24];

    function createNodeElement(nodeData) {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'node';
        nodeEl.id = nodeData.id;

        if (nodeData.collapsed) nodeEl.classList.add('collapsed');
        if (nodeData.color) nodeEl.style.backgroundColor = nodeData.color;

        const content = document.createElement('div');
        content.className = 'node-content';
        content.contentEditable = !isReadOnly;
        content.textContent = nodeData.text;
        if (nodeData.fontSize) content.style.fontSize = `${nodeData.fontSize}px`;

        // Prevent drag when editing text
        content.addEventListener('mousedown', (e) => e.stopPropagation());

        content.addEventListener('input', () => {
            const node = nodes.find(n => n.id === nodeData.id);
            if (node) {
                node.text = content.textContent;
                triggerAutoSave();
            }
            drawLines(); // Text might change node size
        });

        nodeEl.appendChild(content);

        if (!isReadOnly) {
            const addBtn = document.createElement('div');
            addBtn.className = 'node-add-btn';
            addBtn.textContent = '+';
            addBtn.title = 'Add child node';
            addBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addChildNode(nodeData.id);
            });
            nodeEl.appendChild(addBtn);

            if (nodeData.id !== 'root') {
                const delBtn = document.createElement('div');
                delBtn.className = 'node-del-btn';
                delBtn.textContent = '✕';
                delBtn.title = 'Delete node';
                delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteNode(nodeData.id);
                });
                nodeEl.appendChild(delBtn);
            }

            const colorPicker = document.createElement('div');
            colorPicker.className = 'color-picker';
            colorPicker.addEventListener('mousedown', (e) => e.stopPropagation());
            COLORS.forEach(c => {
                const opt = document.createElement('div');
                opt.className = 'color-option';
                opt.style.backgroundColor = c;
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    nodeEl.style.backgroundColor = c;
                    const node = nodes.find(n => n.id === nodeData.id);
                    if (node) {
                        node.color = c;
                        triggerAutoSave();
                        drawLines(); // Might affect inherited line color
                    }
                });
                colorPicker.appendChild(opt);
            });
            nodeEl.appendChild(colorPicker);

            const fontControls = document.createElement('div');
            fontControls.className = 'font-controls';
            fontControls.addEventListener('mousedown', (e) => e.stopPropagation());

            const btnDec = document.createElement('div');
            btnDec.className = 'font-btn'; btnDec.textContent = 'A-';
            btnDec.addEventListener('click', (e) => changeFontSize(nodeData.id, -1, content));

            const btnInc = document.createElement('div');
            btnInc.className = 'font-btn'; btnInc.textContent = 'A+';
            btnInc.addEventListener('click', (e) => changeFontSize(nodeData.id, 1, content));

            fontControls.appendChild(btnDec);
            fontControls.appendChild(btnInc);
            nodeEl.appendChild(fontControls);
        }

        const collapseInd = document.createElement('div');
        collapseInd.className = 'collapse-indicator';
        collapseInd.textContent = '...';
        nodeEl.appendChild(collapseInd);

        nodesLayer.appendChild(nodeEl);

        // Collapse logic
        nodeEl.addEventListener('dblclick', (e) => {
            if(e.target === content) return;
            const node = nodes.find(n => n.id === nodeData.id);
            if (node) {
                node.collapsed = !node.collapsed;
                if(node.collapsed) {
                    nodeEl.classList.add('collapsed');
                } else {
                    nodeEl.classList.remove('collapsed');
                }
                triggerAutoSave();
                drawLines();
                updateNodeVisibility();
            }
        });

        // Drag logic
        nodeEl.addEventListener('mousedown', (e) => {
            if (e.target === nodeEl || e.target.classList.contains('collapse-indicator')) {
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

    function changeFontSize(nodeId, dir, contentEl) {
        const node = nodes.find(n => n.id === nodeId);
        if(!node) return;
        let currentSize = node.fontSize || 16;
        let idx = FONT_SIZES.indexOf(currentSize);
        if(idx === -1) idx = 2; // default 16
        idx += dir;
        if(idx < 0) idx = 0;
        if(idx >= FONT_SIZES.length) idx = FONT_SIZES.length - 1;

        node.fontSize = FONT_SIZES[idx];
        contentEl.style.fontSize = `${node.fontSize}px`;
        drawLines();
        triggerAutoSave();
    }

    function deleteNode(nodeId) {
        if(isReadOnly || nodeId === 'root') return;

        // Find all descendants to delete
        const toDelete = new Set([nodeId]);
        let changed = true;
        while(changed) {
            changed = false;
            edges.forEach(e => {
                if(toDelete.has(e.source) && !toDelete.has(e.target)) {
                    toDelete.add(e.target);
                    changed = true;
                }
            });
        }

        // Remove from DOM and arrays
        toDelete.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });

        nodes = nodes.filter(n => !toDelete.has(n.id));
        edges = edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target));

        drawLines();
        triggerAutoSave();
    }

    function updateNodeElement(el, data) {
        el.style.left = `${data.x}px`;
        el.style.top = `${data.y}px`;
    }

    function getDescendants(parentId) {
        const desc = [];
        edges.forEach(e => {
            if(e.source === parentId) {
                desc.push(e.target);
                desc.push(...getDescendants(e.target));
            }
        });
        return desc;
    }

    function updateNodeVisibility() {
        const hiddenNodes = new Set();
        nodes.forEach(n => {
            if(n.collapsed) {
                getDescendants(n.id).forEach(d => hiddenNodes.add(d));
            }
        });

        nodes.forEach(n => {
            const el = document.getElementById(n.id);
            if(el) {
                if(hiddenNodes.has(n.id)) {
                    el.style.display = 'none';
                } else {
                    el.style.display = '';
                }
            }
        });
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
        // Keep defs
        const defs = linesLayer.querySelector('defs');
        linesLayer.innerHTML = '';
        if(defs) linesLayer.appendChild(defs);

        const isDark = document.documentElement.classList.contains('dark');

        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (sourceNode && targetNode) {
                const sourceEl = document.getElementById(sourceNode.id);
                const targetEl = document.getElementById(targetNode.id);

                if (sourceEl && targetEl && sourceEl.style.display !== 'none' && targetEl.style.display !== 'none') {
                    // Coordinates are node centers (due to translate(-50%, -50%) in css)
                    const x1 = sourceNode.x;
                    const y1 = sourceNode.y;
                    const x2 = targetNode.x;
                    const y2 = targetNode.y;

                    // Draw a cubic bezier curve
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('class', 'connection');

                    if(sourceNode.color && sourceNode.color !== '#ffffff') {
                        path.style.stroke = sourceNode.color;
                    }

                    // Add arrow marker
                    if(isDark) {
                        path.setAttribute('marker-end', 'url(#arrowhead-dark)');
                    } else {
                        path.setAttribute('marker-end', 'url(#arrowhead)');
                    }

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
    }

    // --- Load Data ---
    async function loadMap() {
        const MindMap = Parse.Object.extend("MindMap");
        const query = new Parse.Query(MindMap);
        query.equalTo("owner", currentUser);

        try {
            currentMapObject = await query.get(mapId);

            // Check read-only
            if (currentMapObject.get("owner").id !== currentUser.id) {
                isReadOnly = true;
                mapTitleInput.readOnly = true;
                saveBtn.style.display = 'none';
                showToast("Read-only mode. You cannot edit this map.", "error");
            }

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

            pushHistory(); // Initial state
            renderMap();
        } catch (error) {
            console.error("Error loading map:", error);
            alert("Error loading map. It might not exist or you don't have permission.");
            window.location.href = '/dashboard';
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

    // --- History ---
    function pushHistory() {
        if(isUndoRedo || isReadOnly) return;
        const state = JSON.stringify({ nodes, edges });
        // Don't push if same as last
        if (historyIndex >= 0 && history[historyIndex] === state) return;

        history = history.slice(0, historyIndex + 1);
        history.push(state);
        historyIndex++;
    }

    function undo() {
        if(historyIndex > 0) {
            isUndoRedo = true;
            historyIndex--;
            loadState(history[historyIndex]);
            isUndoRedo = false;
            triggerAutoSave();
        }
    }

    function redo() {
        if(historyIndex < history.length - 1) {
            isUndoRedo = true;
            historyIndex++;
            loadState(history[historyIndex]);
            isUndoRedo = false;
            triggerAutoSave();
        }
    }

    function loadState(stateStr) {
        const data = JSON.parse(stateStr);
        nodes = data.nodes || [];
        edges = data.edges || [];
        renderMap();
    }

    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);

    // --- Save Data ---
    function triggerAutoSave() {
        if(isReadOnly) return;
        pushHistory();
        if(autoSaveTimer) clearTimeout(autoSaveTimer);
        saveStatus.textContent = 'Unsaved changes...';
        autoSaveTimer = setTimeout(saveMap, 2000);
    }

    async function saveMap() {
        if (!currentMapObject || isReadOnly) return;

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
    saveBtn.addEventListener('click', () => {
        if(autoSaveTimer) clearTimeout(autoSaveTimer);
        saveMap();
    });

    // Save on title change
    mapTitleInput.addEventListener('change', triggerAutoSave);

    backBtn.addEventListener('click', () => {
        saveMap().then(() => {
            window.location.href = '/dashboard';
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        // Adjust pan if necessary, but usually leaving it as is works
    });

    // --- Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
        // Only if not typing in contenteditable or input
        const isEditing = e.target.isContentEditable || e.target.tagName === 'INPUT';

        if (e.key === 'Delete' && !isEditing && draggedNode) {
            deleteNode(draggedNode.id);
        }
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            } else if (e.key === 's') {
                e.preventDefault();
                saveMap();
            }
        }
    });

    // --- Export / Import ---
    document.getElementById('export-png-btn').addEventListener('click', () => {
        // Temporarily reset zoom to capture full quality if needed, or just capture canvas container
        const originalScale = scale;
        const originalX = panX;
        const originalY = panY;

        // Find bounding box
        if(nodes.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            if(n.x < minX) minX = n.x;
            if(n.y < minY) minY = n.y;
            if(n.x > maxX) maxX = n.x;
            if(n.y > maxY) maxY = n.y;
        });

        // Add padding
        minX -= 100; minY -= 100; maxX += 100; maxY += 100;
        const width = maxX - minX;
        const height = maxY - minY;

        // Reset view for capture
        panX = -minX;
        panY = -minY;
        scale = 1;
        updateCanvasTransform();

        showToast("Generating image...", "success");

        setTimeout(() => {
            if(typeof html2canvas === 'undefined') {
                showToast("html2canvas not loaded", "error");
                return;
            }
            html2canvas(document.getElementById('canvas'), {
                width: width,
                height: height,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f9fafb'
            }).then(canvasEl => {
                const link = document.createElement('a');
                link.download = (mapTitleInput.value || 'map') + '.png';
                link.href = canvasEl.toDataURL();
                link.click();

                // Restore view
                panX = originalX;
                panY = originalY;
                scale = originalScale;
                updateCanvasTransform();
            }).catch(err => {
                console.error("Export error", err);
                showToast("Error generating image", "error");
            });
        }, 100);
    });

    document.getElementById('export-json-btn').addEventListener('click', () => {
        const dataStr = JSON.stringify({nodes, edges}, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', (mapTitleInput.value || 'map') + '.json');
        link.click();
    });

    document.getElementById('import-json').addEventListener('change', (e) => {
        if(isReadOnly) {
            showToast("Cannot import in read-only mode", "error");
            return;
        }
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if(data.nodes && data.edges) {
                    nodes = data.nodes;
                    edges = data.edges;
                    triggerAutoSave();
                    renderMap();
                    showToast("Map imported successfully", "success");
                } else {
                    showToast("Invalid JSON format", "error");
                }
            } catch(err) {
                showToast("Error parsing JSON", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // reset
    });

    // Initialize
    loadMap();
});
