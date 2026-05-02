<?php

// Check if running from PHP built-in server and request is for a static file
if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
    if (is_file(__DIR__ . $path)) {
        return false; // Let the built-in server handle the request
    }
}

// Simple Router
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($request_uri, '/');

// Base routing
if ($path === '' || $path === 'dashboard') {
    require __DIR__ . '/dashboard.php';
} elseif ($path === 'login') {
    require __DIR__ . '/login.php';
} elseif ($path === 'register') {
    require __DIR__ . '/register.php';
} elseif (preg_match('/^map\/([a-zA-Z0-9]+)$/', $path, $matches)) {
    // We can simulate passing the ID via $_GET so app.php works similarly
    // Or just let JS parse it from the URL. Let's let JS parse the URL,
    // but just require app.php
    $_GET['id'] = $matches[1]; // Set it anyway just in case, though JS will parse pathname
    require __DIR__ . '/app.php';
} else {
    // 404
    http_response_code(404);
    echo "<h1>404 Not Found</h1>";
}
