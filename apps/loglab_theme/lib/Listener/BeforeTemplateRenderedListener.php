<?php

declare(strict_types=1);

namespace OCA\LoglabTheme\Listener;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/** @template-implements IEventListener<BeforeTemplateRenderedEvent> */
class BeforeTemplateRenderedListener implements IEventListener {

	public function handle(Event $event): void {
		if (!$event instanceof BeforeTemplateRenderedEvent) {
			return;
		}
		if ($event->getResponse()->getRenderAs() !== TemplateResponse::RENDER_AS_USER) {
			return;
		}
		Util::addStyle('loglab_theme', 'loglab', false);
		Util::addScript('loglab_theme', 'loglab', 'core');
	}
}
