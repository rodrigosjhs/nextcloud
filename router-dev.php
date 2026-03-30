<?php

/**
 * Servidor embutido do PHP — use SEMPRE este ficheiro como router, senão /apps/... não chega ao Nextcloud.
 *
 *   cd NEXTCLOUD && php8.2 -S 0.0.0.0:8080 router-dev.php
 *
 * Sem isto, o browser pede ficheiros que não existem e o PHP nunca corre — o teu proxy / API nunca são chamados.
 */
declare(strict_types=1);

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$file = __DIR__ . $uri;
if ($uri !== '/' && $uri !== '' && is_file($file)) {
	return false;
}

require __DIR__ . '/index.php';
