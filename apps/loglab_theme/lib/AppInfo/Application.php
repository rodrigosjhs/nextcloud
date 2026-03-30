<?php

declare(strict_types=1);

namespace OCA\LoglabTheme\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Http\Events\BeforeLoginTemplateRenderedEvent;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;

class Application extends App implements IBootstrap {

	public const APP_ID = 'loglab_theme';

	public function __construct() {
		parent::__construct(self::APP_ID);
	}

	public function register(IRegistrationContext $context): void {
		$context->registerEventListener(BeforeTemplateRenderedEvent::class, \OCA\LoglabTheme\Listener\BeforeTemplateRenderedListener::class);
		$context->registerEventListener(BeforeLoginTemplateRenderedEvent::class, \OCA\LoglabTheme\Listener\BeforeLoginTemplateRenderedListener::class);
	}

	public function boot(IBootContext $context): void {
	}
}
