<?php

declare(strict_types=1);

namespace OCA\LoglabTheme\Listener;

use OCP\AppFramework\Http\Events\BeforeLoginTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IURLGenerator;
use OCP\Util;

/** @template-implements IEventListener<BeforeLoginTemplateRenderedEvent> */
class BeforeLoginTemplateRenderedListener implements IEventListener {

	public function __construct(
		private IURLGenerator $urlGenerator,
	) {
	}

	public function handle(Event $event): void {
		if (!$event instanceof BeforeLoginTemplateRenderedEvent) {
			return;
		}
		try {
			Util::addStyle('loglab_theme', 'loglab-login');

			$proxyUrl = $this->urlGenerator->linkToRouteAbsolute('loglab_theme.auth_proxy.login');
			Util::addHeader('meta', [
				'name' => 'loglab-auth-proxy-url',
				'content' => $proxyUrl,
			]);

			$nonce = \OC::$server->getContentSecurityPolicyNonceManager()->getNonce();

			$earlyJs = $this->urlGenerator->linkTo('loglab_theme', 'js/loglab-early.js');
			Util::addHeader('script', [
				'src' => $earlyJs . '?v=' . time(),
				'nonce' => $nonce,
			], ' ');

			$mainJs = $this->urlGenerator->linkTo('loglab_theme', 'js/loglab-login.js');
			Util::addHeader('script', [
				'src' => $mainJs . '?v=' . time(),
				'defer' => 'defer',
				'nonce' => $nonce,
			], ' ');
		} catch (\Throwable $e) {
		}
	}
}
