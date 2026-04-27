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
            cursor: grab;
        }
        .dark #workspace {
            background-color: #111827;
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
    </style>
</head>
<body class="text-gray-900 dark:text-gray-100 transition-colors duration-200">

    <div id="toolbar" class="flex items-center space-x-4">
        <button id="back-btn" class="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Back to Dashboard">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <input type="text" id="map-title" class="px-3 py-1 border rounded bg-gray-50 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Map Title">
        <button id="save-btn" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">Save</button>
        <div id="save-status" class="text-sm text-gray-500 dark:text-gray-400 ml-2"></div>

        <div class="flex-grow"></div>

        <button id="theme-toggle" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none transition-colors">
            <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.32a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM16 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-1.32 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-1.32a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 10a1 1 0 01-1-1V8a1 1 0 112 0v1a1 1 0 01-1 1zm1.32-4.22a1 1 0 010-1.415l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 14a4 4 0 100-8 4 4 0 000 8z"></path></svg>
        </button>
    </div>

    <div id="workspace">
        <div id="canvas">
            <svg id="lines-layer"></svg>
            <div id="nodes-layer"></div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/js/init.js"></script>
    <script src="/js/theme.js"></script>
    <script src="/js/auth.js"></script>
    <script src="/js/editor.js"></script>
</body>
</html>
