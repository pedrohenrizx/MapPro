<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor - MapPro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
    <!-- Parse SDK -->
    <script type="text/javascript" src="https://npmcdn.com/parse/dist/parse.min.js"></script>
    <!-- Toastify & html2canvas -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }
        #workspace {
            width: 100vw;
            height: 100vh;
            position: relative;
            background-color: #f9fafb;
            background-image: radial-gradient(#d1d5db 1px, transparent 1px);
            background-size: 20px 20px;
            background-position: 0 0;
            cursor: grab;
        }
        .dark #workspace {
            background-color: #111827;
            background-image: radial-gradient(#374151 1px, transparent 1px);
        }
        #workspace:active {
            cursor: grabbing;
        }
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 10000px;
            height: 10000px;
            transform-origin: 0 0;
        }
        #lines-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
        }
        .node {
            position: absolute;
            background-color: white;
            border: 2px solid #3b82f6; /* blue-500 */
            border-radius: 8px;
            padding: 10px 15px;
            min-width: 100px;
            text-align: center;
            cursor: grab;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            user-select: none;
            transform: translate(-50%, -50%); /* Center based on coordinate */
        }
        .dark .node {
            background-color: #1f2937; /* gray-800 */
            border-color: #60a5fa; /* blue-400 */
            color: #f3f4f6; /* gray-100 */
        }
        .node:active {
            cursor: grabbing;
        }
        .node-content {
            outline: none;
            min-height: 20px;
        }
        .node-add-btn {
            position: absolute;
            right: -25px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            line-height: 1;
            font-size: 16px;
        }
        .node:hover .node-add-btn {
            opacity: 1;
        }
        .connection {
            fill: none;
            stroke: #9ca3af; /* gray-400 */
            stroke-width: 2;
        }
        .dark .connection {
            stroke: #4b5563; /* gray-600 */
        }
        /* Toolbar */
        #toolbar {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
            display: flex;
            gap: 10px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .dark #toolbar {
            background: #1f2937;
        }
        /* Zoom Controls */
        #zoom-controls {
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: white;
            padding: 5px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .dark #zoom-controls {
            background: #1f2937;
        }
        .zoom-btn {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f3f4f6;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .dark .zoom-btn {
            background: #374151;
        }
        .zoom-btn:hover {
            background: #e5e7eb;
        }
        .dark .zoom-btn:hover {
            background: #4b5563;
        }
        /* Color Picker */
        .color-picker {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            display: none;
            gap: 2px;
            background: white;
            padding: 4px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dark .color-picker { background: #374151; }
        .node:hover .color-picker { display: flex; }
        .color-option {
            width: 16px; height: 16px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1);
        }
        /* Font Size controls */
        .font-controls {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            display: none;
            gap: 4px;
            background: white;
            padding: 2px 4px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-size: 12px;
        }
        .dark .font-controls { background: #374151; }
        .node:hover .font-controls { display: flex; }
        .font-btn { cursor: pointer; padding: 0 4px; user-select: none; }
        .font-btn:hover { background: #f3f4f6; border-radius: 2px; }
        .dark .font-btn:hover { background: #4b5563; }
        /* Delete btn */
        .node-del-btn {
            position: absolute; left: -10px; top: -10px; width: 20px; height: 20px; background: #ef4444; color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; line-height: 1; z-index: 10;
        }
        .node:hover .node-del-btn { display: flex; }
        /* Collapse indicator */
        .collapse-indicator {
            position: absolute; right: -10px; bottom: -10px; width: 16px; height: 16px; background: #9ca3af; color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; font-size: 10px; line-height: 1; pointer-events: none;
        }
        .node.collapsed .collapse-indicator { display: flex; }
        .node.collapsed .node-add-btn { display: none; }
    </style>
</head>
<body class="text-gray-900 dark:text-gray-100 transition-colors duration-200">

    <div id="toolbar" class="flex items-center space-x-2 text-sm">
        <button id="back-btn" class="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Back to Dashboard">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <input type="text" id="map-title" class="px-2 py-1 w-32 border rounded bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Map Title">
        <button id="save-btn" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">Save</button>

        <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <button id="undo-btn" class="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Undo (Ctrl+Z)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
        </button>
        <button id="redo-btn" class="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Redo (Ctrl+Y)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path></svg>
        </button>

        <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

        <button id="export-png-btn" class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" title="Export as Image">PNG</button>
        <button id="export-json-btn" class="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors" title="Export Data">Exp JSON</button>
        <label for="import-json" class="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors cursor-pointer" title="Import Data">Imp JSON</label>
        <input type="file" id="import-json" accept=".json" class="hidden">

        <div id="save-status" class="text-xs text-gray-500 dark:text-gray-400 ml-2"></div>

        <div class="flex-grow"></div>

        <button id="theme-toggle" class="p-1.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none transition-colors">
            <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.32a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM16 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-1.32 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-1.32a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 10a1 1 0 01-1-1V8a1 1 0 112 0v1a1 1 0 01-1 1zm1.32-4.22a1 1 0 010-1.415l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 14a4 4 0 100-8 4 4 0 000 8z"></path></svg>
        </button>
    </div>

    <div id="workspace">
        <div id="canvas">
            <svg id="lines-layer">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" class="arrow-fill" />
                    </marker>
                    <marker id="arrowhead-dark" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" class="arrow-fill-dark" />
                    </marker>
                </defs>
            </svg>
            <div id="nodes-layer"></div>
        </div>
    </div>

    <div id="zoom-controls">
        <button id="zoom-in" class="zoom-btn" title="Zoom In">+</button>
        <button id="zoom-reset" class="zoom-btn" title="Center Map">⌖</button>
        <button id="zoom-out" class="zoom-btn" title="Zoom Out">-</button>
    </div>

    <!-- Scripts -->
    <script src="/js/init.js"></script>
    <script src="/js/theme.js"></script>
    <script src="/js/auth.js"></script>
    <script src="/js/editor.js"></script>
</body>
</html>
