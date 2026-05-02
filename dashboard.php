<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - MapPro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
        }
    </script>
    <!-- Parse SDK -->
    <script type="text/javascript" src="https://npmcdn.com/parse/dist/parse.min.js"></script>
    <!-- Toastify -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 min-h-screen flex flex-col">

    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">MapPro</h1>
            <div class="flex items-center space-x-4">
                <button id="theme-toggle" class="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none transition-colors">
                    <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                    <svg id="theme-toggle-light-icon" class="hidden w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.32a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM16 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-1.32 4.22a1 1 0 010 1.415l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-1.32a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 10a1 1 0 01-1-1V8a1 1 0 112 0v1a1 1 0 01-1 1zm1.32-4.22a1 1 0 010-1.415l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 14a4 4 0 100-8 4 4 0 000 8z"></path></svg>
                </button>
                <button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors">
                    Logout
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div class="flex items-center space-x-4">
                <h2 id="view-title" class="text-xl font-semibold text-gray-800 dark:text-gray-200">My Mind Maps</h2>
                <div class="bg-gray-200 dark:bg-gray-700 p-1 rounded-lg flex">
                    <button id="tab-active" class="px-3 py-1 rounded shadow bg-white dark:bg-gray-600 text-sm font-medium transition-colors">Active</button>
                    <button id="tab-trash" class="px-3 py-1 rounded text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Trash</button>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div class="relative w-full sm:w-48">
                    <input type="text" id="search-input" placeholder="Search ( / )" class="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white">
                    <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                <select id="tag-filter" class="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white">
                    <option value="">All Tags</option>
                </select>

                <select id="sort-select" class="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="name-asc">A-Z</option>
                    <option value="name-desc">Z-A</option>
                </select>

                <div class="flex border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
                    <button id="view-grid" class="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200" title="Grid View">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                    </button>
                    <button id="view-list" class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600" title="List View">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </div>

                <button id="new-map-btn" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded flex items-center justify-center transition-colors whitespace-nowrap" title="New Map (N)">
                    <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    New
                </button>
            </div>
        </div>

        <div id="maps-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 transition-all">
            <!-- Maps will be loaded here -->
        </div>

        <div id="loading-indicator" class="text-center py-8 text-gray-500 hidden">
            Loading...
        </div>

        <div id="no-maps-indicator" class="hidden flex flex-col items-center justify-center py-16 px-4">
            <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No mind maps found</h3>
            <p class="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">Create your first mind map to start organizing your thoughts and ideas visually.</p>
        </div>
    </main>

    <!-- Template Modal -->
    <div id="template-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Choose a Template</h3>
                <button id="close-template-modal" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="template-card cursor-pointer border rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition" data-template="blank">
                    <div class="h-20 bg-gray-100 dark:bg-gray-900 rounded mb-2 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    </div>
                    <span class="font-medium text-sm text-gray-800 dark:text-gray-200">Blank Map</span>
                </div>
                <div class="template-card cursor-pointer border rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition" data-template="brainstorm">
                    <div class="h-20 bg-gray-100 dark:bg-gray-900 rounded mb-2 flex items-center justify-center border border-gray-200 dark:border-gray-700 relative">
                        <div class="w-8 h-4 bg-blue-400 rounded-full mx-auto mb-1"></div>
                        <div class="flex justify-center space-x-1"><div class="w-4 h-4 bg-green-400 rounded-full"></div><div class="w-4 h-4 bg-yellow-400 rounded-full"></div></div>
                    </div>
                    <span class="font-medium text-sm text-gray-800 dark:text-gray-200">Brainstorm</span>
                </div>
                <div class="template-card cursor-pointer border rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition" data-template="org">
                    <div class="h-20 bg-gray-100 dark:bg-gray-900 rounded mb-2 flex items-center justify-center border border-gray-200 dark:border-gray-700 flex-col">
                        <div class="w-6 h-3 bg-purple-500 rounded mb-1"></div>
                        <div class="w-12 h-px bg-gray-400 mb-1"></div>
                        <div class="flex space-x-1"><div class="w-4 h-3 bg-red-400 rounded"></div><div class="w-4 h-3 bg-pink-400 rounded"></div></div>
                    </div>
                    <span class="font-medium text-sm text-gray-800 dark:text-gray-200">Org Chart</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/js/init.js"></script>
    <script src="/js/theme.js"></script>
    <script src="/js/auth.js"></script>
    <script src="/js/dashboard.js"></script>
</body>
</html>
