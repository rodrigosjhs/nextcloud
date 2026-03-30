<?php

declare(strict_types=1);

return [
	'routes' => [
		[
			'name' => 'auth_proxy#login',
			'url' => '/api/auth-login',
			'verb' => 'POST',
		],
		[
			'name' => 'auth_proxy#ping',
			'url' => '/api/auth-ping',
			'verb' => 'GET',
		],
	],
];
