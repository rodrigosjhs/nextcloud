<?php

declare(strict_types=1);

namespace OCA\LoglabTheme\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\OpenAPI;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\AppFramework\Http\Attribute\UseSession;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\JSONResponse;
use OCP\Http\Client\IClientService;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUserManager;
use OCP\IUserSession;

/**
 * Proxy de autenticação: Keycloak → auto-provisionamento no Nextcloud → sessão NC.
 *
 * URL da API (vista do SERVIDOR Nextcloud):
 *   occ config:system:set loglab_auth_login_url --value="http://127.0.0.1:3001/auth/login"
 */
#[OpenAPI(scope: OpenAPI::SCOPE_IGNORE)]
class AuthProxyController extends Controller {

	public function __construct(
		string $appName,
		IRequest $request,
		private IClientService $clientService,
		private IConfig $config,
		private IUserSession $userSession,
		private IURLGenerator $urlGenerator,
		private IUserManager $userManager,
	) {
		parent::__construct($appName, $request);
	}

	#[PublicPage]
	#[NoCSRFRequired]
	public function ping(): JSONResponse {
		$backendUrl = trim($this->config->getSystemValueString(
			'loglab_auth_login_url',
			'http://127.0.0.1:3001/auth/login',
		));

		return new JSONResponse([
			'ok' => true,
			'app' => 'loglab_theme',
			'loglab_auth_login_url' => $backendUrl,
			'time' => gmdate('c'),
		]);
	}

	#[PublicPage]
	#[NoCSRFRequired]
	#[UseSession]
	public function login(): JSONResponse|DataDisplayResponse {
		$raw = file_get_contents('php://input');
		if ($raw === false) {
			$raw = '';
		}

		$backendUrl = trim($this->config->getSystemValueString(
			'loglab_auth_login_url',
			'http://127.0.0.1:3001/auth/login',
		));

		/* ── 1. Chamar a API (Keycloak via microsserviço) ── */
		$status = 0;
		$body = '';
		try {
			$client = $this->clientService->newClient();
			$response = $client->post($backendUrl, [
				'body' => $raw,
				'headers' => ['Content-Type' => 'application/json'],
				'timeout' => 90,
				'nextcloud' => ['allow_local_address' => true],
			]);
			$status = $response->getStatusCode();
			$body = $response->getBody();
		} catch (\OCP\Http\Client\LocalServerException $e) {
			return $this->gatewayError($e, $backendUrl);
		} catch (\GuzzleHttp\Exception\RequestException $e) {
			$guzzleResp = $e->getResponse();
			if ($guzzleResp !== null) {
				$status = $guzzleResp->getStatusCode();
				$body = (string)$guzzleResp->getBody();
			} else {
				return $this->gatewayError($e, $backendUrl);
			}
		} catch (\Throwable $e) {
			return $this->gatewayError($e, $backendUrl);
		}

		$data = json_decode($body, true);
		if (!\is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
			return new DataDisplayResponse($body ?: '{}', $status ?: 502, [
				'Content-Type' => 'application/json; charset=utf-8',
			]);
		}

		if ($status < 200 || $status >= 300) {
			return new JSONResponse($data, $status);
		}

		if (($data['sucesso'] ?? false) !== true) {
			return new JSONResponse($data, $status);
		}

		/* ── 2. Credenciais do pedido ── */
		$creds = json_decode($raw, true);
		$ncUser = trim((string)($creds['username'] ?? ''));
		$ncPass = (string)($creds['password'] ?? '');
		$apiEmail = trim((string)($data['usuario']['email'] ?? ''));
		$apiDisplayName = trim((string)($data['usuario']['nome'] ?? ''));

		if ($ncUser === '' || $ncPass === '') {
			return new JSONResponse([
				'sucesso' => false,
				'erro' => 'Pedido inválido: faltam username/password no corpo.',
			], Http::STATUS_BAD_REQUEST);
		}

		/* ── 3. Auto-provisionar utilizador no Nextcloud ── */
		$this->ensureNcUser($ncUser, $ncPass, $apiEmail, $apiDisplayName);

		/* ── 4. Login no Nextcloud ── */
		$loggedIn = $this->userSession->login($ncUser, $ncPass);
		$loginUid = $ncUser;

		if (!$loggedIn && $apiEmail !== '' && $apiEmail !== $ncUser) {
			$this->ensureNcUser($apiEmail, $ncPass, $apiEmail, $apiDisplayName);
			$loggedIn = $this->userSession->login($apiEmail, $ncPass);
			$loginUid = $apiEmail;
		}

		if (!$loggedIn) {
			return new JSONResponse([
				'sucesso' => false,
				'erro' => 'Login externo OK, mas não foi possível abrir sessão no Nextcloud.',
				'api' => $data,
			], Http::STATUS_UNAUTHORIZED);
		}

		$this->userSession->createSessionToken($this->request, $loginUid, $loginUid, $ncPass);
		$this->userSession->createRememberMeToken($this->userManager->get($loginUid));

		$data['loglab_nextcloud_session'] = true;
		$data['redirectUrl'] = $this->urlGenerator->linkToDefaultPageUrl();

		return new JSONResponse($data, Http::STATUS_OK);
	}

	/**
	 * Garante que o utilizador existe no Nextcloud com a senha correta.
	 * - Se não existe: cria com a senha do Keycloak.
	 * - Se existe: atualiza a senha para coincidir com a do Keycloak.
	 */
	private function ensureNcUser(string $uid, string $password, string $email, string $displayName): void {
		if ($uid === '') {
			return;
		}

		$user = $this->userManager->get($uid);

		if ($user === null) {
			try {
				$user = $this->userManager->createUser($uid, $password);
			} catch (\Throwable $e) {
				return;
			}
			if ($user === null) {
				return;
			}
			if ($email !== '') {
				$user->setEMailAddress($email);
			}
			if ($displayName !== '') {
				$user->setDisplayName($displayName);
			}
			return;
		}

		/* Utilizador já existe — atualiza senha para que IUserSession::login funcione. */
		try {
			$user->setPassword($password);
		} catch (\Throwable $e) {
			/* ignore — pode ser backend LDAP/SAML que não permite */
		}
		if ($email !== '' && $user->getEMailAddress() !== $email) {
			$user->setEMailAddress($email);
		}
		if ($displayName !== '' && $user->getDisplayName() !== $displayName) {
			$user->setDisplayName($displayName);
		}
	}

	private function gatewayError(\Throwable $e, string $backendUrl): JSONResponse {
		return new JSONResponse([
			'sucesso' => false,
			'erro' => 'Erro ao contatar API de autenticação',
			'detalhes' => $e->getMessage(),
			'backend' => $backendUrl,
			'hint' => 'O POST parte do servidor Nextcloud. Ajuste loglab_auth_login_url para uma URL que este servidor alcance.',
		], Http::STATUS_BAD_GATEWAY);
	}
}
