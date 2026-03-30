/**
 * Log.lab | SARA - Layout engine
 * Logo, sidebar toggle, busca, badge + fix de overflow da NcAppNavigation Vue.
 */
(function() {
	'use strict';

	var STORAGE_KEY = 'loglab-sidebar-collapsed';
	/** Igual a --loglab-dark em loglab.css — inline !important vence CSS tardio do NcAppNavigation (Vue). */
	var VUE_NAV_BG = '#1a1a1d';
	var VUE_NAV_FG = 'rgba(255, 255, 255, 0.9)';
	var VUE_NAV_MUTED = 'rgba(255, 255, 255, 0.55)';
	var vueNavClosedWired = new WeakSet();
	var vueNavSubtreeObserverStarted = false;
	var vueNavPatchScheduled = false;
	/** Estilos inline no menu de apps — vence CSS injetado depois pelo Vue (scoped). */
	var appMenuPatchScheduled = false;
	var APP_MENU_ICON_DEFAULT = 'brightness(0) invert(1)';
	var APP_MENU_ICON_ACTIVE = 'brightness(0) saturate(100%) invert(80%) sepia(60%) saturate(560%) hue-rotate(359deg) brightness(103%) contrast(104%)';
	var ACCOUNT_MENU_ICON_COLOR = '#f93';
	var accountMenuIconPatchScheduled = false;
	var tintedAccountIconCache = Object.create(null);

	function createLoglabIcon() {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('class', 'loglab-icon');
		svg.setAttribute('viewBox', '0 0 40 24');
		svg.setAttribute('aria-hidden', 'true');
		svg.innerHTML = '<circle cx="8" cy="12" r="6" fill="white"/><circle cx="20" cy="12" r="8" fill="white"/><circle cx="32" cy="12" r="6" fill="white"/>';
		return svg;
	}

	function createChevronSvg() {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('aria-hidden', 'true');
		svg.innerHTML = '<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>';
		return svg;
	}

	/** Mesmo ficheiro que loglab-login.css (#body-login .logo → ../img/logo.png). */
	function getLoglabLoginLogoUrl() {
		var roots = window.OC && window.OC.appswebroots;
		if (roots && roots.loglab_theme) {
			return roots.loglab_theme + '/img/logo.png';
		}
		var scripts = document.getElementsByTagName('script');
		for (var i = 0; i < scripts.length; i++) {
			var src = scripts[i].src || '';
			if (src.indexOf('loglab_theme/js/loglab') !== -1) {
				return src.replace(/\/js\/loglab\.js(\?.*)?$/i, '/img/logo.png');
			}
		}
		return '/apps/loglab_theme/img/logo.png';
	}

	function initSidebarLoginLogo(headerStart, appmenu) {
		if (!headerStart || document.querySelector('.loglab-sidebar-login-logo')) return;
		var searchWrap = headerStart.querySelector('.loglab-sidebar-search-wrap');
		var anchor = searchWrap || appmenu;
		if (!anchor) return;

		var nc = document.getElementById('nextcloud');

		var logoLink = document.createElement('a');
		logoLink.className = 'loglab-sidebar-login-logo';
		logoLink.href = (nc && nc.getAttribute('href')) ? nc.getAttribute('href') : '/';
		logoLink.setAttribute('aria-label', 'Log.lab | SARA — Início');

		var img = document.createElement('img');
		img.src = getLoglabLoginLogoUrl();
		img.alt = 'Log.lab | SARA';
		img.className = 'loglab-sidebar-login-logo__img';
		img.decoding = 'async';
		img.onerror = function() {
			logoLink.style.display = 'none';
		};
		logoLink.appendChild(img);

		headerStart.insertBefore(logoLink, anchor);
	}

	function setSidebarState(collapsed) {
		document.body.classList.toggle('loglab-sidebar-collapsed', collapsed);
		try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) {}
	}

	function isSidebarCollapsed() {
		try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
	}

	function initSidebarToggle() {
		if (document.querySelector('.loglab-sidebar-toggle')) return;

		var btn = document.createElement('button');
		btn.className = 'loglab-sidebar-toggle';
		btn.setAttribute('aria-label', 'Expandir/recolher menu');
		btn.setAttribute('title', 'Expandir/recolher menu');
		btn.appendChild(createChevronSvg());
		btn.addEventListener('click', function(e) {
			e.preventDefault();
			e.stopPropagation();
			setSidebarState(!document.body.classList.contains('loglab-sidebar-collapsed'));
		});
		document.body.appendChild(btn);

		if (isSidebarCollapsed()) {
			document.body.classList.add('loglab-sidebar-collapsed');
		}
	}

	function init() {
		var headerStart = document.querySelector('#header .header-start');
		var nextcloudLogo = document.querySelector('#header .header-start #nextcloud');
		var appmenu = document.getElementById('header-start__appmenu');
		var headerEnd = document.querySelector('#header .header-end');

		if (!headerStart) return;

		if (nextcloudLogo) {
			var oldLogo = nextcloudLogo.querySelector('.logo, .logo-icon');
			if (oldLogo) oldLogo.style.display = 'none';
			var oldCustomHeader = nextcloudLogo.querySelector('.loglab-header');
			if (oldCustomHeader) oldCustomHeader.remove();
		}

		if (appmenu && !document.querySelector('.loglab-sidebar-search-wrap')) {
			var wrap = document.createElement('div');
			wrap.className = 'loglab-sidebar-search-wrap';
			wrap.style.cssText = 'padding: 12px 16px; box-sizing: border-box;';
			var search = document.createElement('input');
			search.type = 'text';
			search.className = 'loglab-sidebar-search';
			search.placeholder = 'Buscar no menu...';
			search.setAttribute('aria-label', 'Buscar no menu');
			wrap.appendChild(search);
			appmenu.parentNode.insertBefore(wrap, appmenu);
		}

		initSidebarLoginLogo(headerStart, appmenu);

		if (headerEnd && !document.querySelector('.loglab-version-badge')) {
			var badge = document.createElement('span');
			badge.className = 'loglab-version-badge';
			badge.textContent = '1.0';
			headerEnd.insertBefore(badge, headerEnd.firstChild);
		}

		initSidebarToggle();
	}

	function applyVueNavigationSkin(nav) {
		if (!nav || nav.nodeType !== 1 || nav.id === 'app-navigation') return;
		if (!nav.classList.contains('app-navigation')) return;
		if (nav.__loglabNavSkinning) return;
		nav.__loglabNavSkinning = true;
		try {
			nav.style.setProperty('background-color', VUE_NAV_BG, 'important');
			nav.style.setProperty('background-image', 'none', 'important');
			nav.style.setProperty('backdrop-filter', 'none', 'important');
			nav.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
			nav.style.setProperty('color', VUE_NAV_FG, 'important');
			nav.style.setProperty('--color-main-background', VUE_NAV_BG, 'important');
			nav.style.setProperty('--color-main-background-blur', VUE_NAV_BG, 'important');
			nav.style.setProperty('--color-main-text', VUE_NAV_FG, 'important');
			nav.style.setProperty('--color-text-maxcontrast', VUE_NAV_MUTED, 'important');
			nav.style.setProperty('--color-text-maxcontrast-default', VUE_NAV_MUTED, 'important');
			nav.style.setProperty('--color-text-maxcontrast-background-blur', VUE_NAV_MUTED, 'important');
		} finally {
			requestAnimationFrame(function() { nav.__loglabNavSkinning = false; });
		}
	}

	function syncVueNavClosedVisibility(nav) {
		if (!nav || nav.id === 'app-navigation') return;
		if (nav.classList.contains('app-navigation--closed')) {
			nav.style.setProperty('visibility', 'hidden', 'important');
			nav.style.setProperty('opacity', '0', 'important');
		} else {
			nav.style.removeProperty('visibility');
			nav.style.removeProperty('opacity');
		}
	}

	function wireVueNavClosedObserverOnce(nav) {
		if (!nav || vueNavClosedWired.has(nav)) return;
		vueNavClosedWired.add(nav);
		syncVueNavClosedVisibility(nav);
		new MutationObserver(function() {
			syncVueNavClosedVisibility(nav);
		}).observe(nav, { attributes: true, attributeFilter: ['class'] });
	}

	function patchVueAppNavigations() {
		document.querySelectorAll('.app-navigation').forEach(function(nav) {
			if (nav.id === 'app-navigation') return;
			applyVueNavigationSkin(nav);
			wireVueNavClosedObserverOnce(nav);
		});
	}

	function schedulePatchVueAppNavigations() {
		if (vueNavPatchScheduled) return;
		vueNavPatchScheduled = true;
		requestAnimationFrame(function() {
			vueNavPatchScheduled = false;
			patchVueAppNavigations();
		});
	}

	/**
	 * Shell do menu: id do template ou nav.app-menu após mount (Vue pode trocar o nó).
	 */
	function getLoglabAppMenuNav() {
		var byId = document.getElementById('header-start__appmenu');
		if (byId) return byId;
		var hs = document.querySelector('#header:not(.header-guest) .header-start');
		if (!hs) return null;
		var nav = hs.querySelector(':scope > nav.app-menu');
		return nav || null;
	}

	function applyLoglabAppMenuLayout() {
		var shell = getLoglabAppMenuNav();
		if (!shell || shell.nodeType !== 1) return;

		if (!shell.id) {
			try { shell.id = 'header-start__appmenu'; } catch (e) {}
		}

		var appMenu = shell.classList.contains('app-menu') ? shell : shell.querySelector('.app-menu');
		if (!appMenu) return;

		shell.style.setProperty('display', 'flex', 'important');
		shell.style.setProperty('flex-direction', 'column', 'important');
		shell.style.setProperty('align-items', 'stretch', 'important');
		shell.style.setProperty('flex', '1 1 auto', 'important');
		shell.style.setProperty('width', '100%', 'important');
		shell.style.setProperty('min-width', '0', 'important');
		shell.style.setProperty('min-height', '0', 'important');
		shell.style.setProperty('overflow-x', 'hidden', 'important');
		shell.style.setProperty('overflow-y', 'auto', 'important');

		appMenu.style.setProperty('display', 'flex', 'important');
		appMenu.style.setProperty('flex-direction', 'column', 'important');
		appMenu.style.setProperty('align-items', 'stretch', 'important');
		appMenu.style.setProperty('flex', '1 1 auto', 'important');
		appMenu.style.setProperty('width', '100%', 'important');
		appMenu.style.setProperty('min-width', '0', 'important');

		var list = appMenu.querySelector('.app-menu__list');
		if (list) {
			list.style.setProperty('display', 'flex', 'important');
			list.style.setProperty('flex-direction', 'column', 'important');
			list.style.setProperty('flex-wrap', 'nowrap', 'important');
			list.style.setProperty('width', '100%', 'important');
			list.style.setProperty('margin', '0', 'important');
		}

		appMenu.querySelectorAll('.app-menu-entry').forEach(function(li) {
			li.style.setProperty('width', '100%', 'important');
			li.style.setProperty('height', 'auto', 'important');
			li.style.setProperty('min-height', '0', 'important');
		});

		appMenu.querySelectorAll('.app-menu-entry__link').forEach(function(a) {
			a.style.setProperty('display', 'flex', 'important');
			a.style.setProperty('flex-direction', 'row', 'important');
			a.style.setProperty('align-items', 'center', 'important');
			a.style.setProperty('justify-content', 'flex-start', 'important');
			a.style.setProperty('height', 'auto', 'important');
			a.style.setProperty('width', 'calc(100% - 16px)', 'important');
			a.style.setProperty('max-width', 'calc(100% - 16px)', 'important');
		});

		appMenu.querySelectorAll('.app-menu-entry__label').forEach(function(span) {
			span.style.setProperty('opacity', '1', 'important');
			span.style.setProperty('position', 'static', 'important');
			span.style.setProperty('transform', 'none', 'important');
			span.style.setProperty('max-width', 'none', 'important');
		});

		appMenu.querySelectorAll('.app-menu-icon__icon').forEach(function(img) {
			img.style.setProperty('mask', 'none', 'important');
			img.style.setProperty('-webkit-mask', 'none', 'important');
			var row = img.closest('.app-menu-entry');
			var active = row && row.classList.contains('app-menu-entry--active');
			img.style.setProperty('filter', active ? APP_MENU_ICON_ACTIVE : APP_MENU_ICON_DEFAULT, 'important');
		});
	}

	function schedulePatchLoglabAppMenu() {
		if (appMenuPatchScheduled) return;
		appMenuPatchScheduled = true;
		requestAnimationFrame(function() {
			appMenuPatchScheduled = false;
			applyLoglabAppMenuLayout();
		});
	}

	function ensureVueNavSubtreeObserver() {
		if (vueNavSubtreeObserverStarted) return;
		vueNavSubtreeObserverStarted = true;
		new MutationObserver(function() {
			schedulePatchVueAppNavigations();
			schedulePatchLoglabAppMenu();
			scheduleAccountMenuIconTints();
		}).observe(document.body, { childList: true, subtree: true });
	}

	function buildTintedSvgDataUri(svgText) {
		if (!svgText || svgText.indexOf('<svg') === -1) return null;
		/* 1) Troca cores hardcoded (hex/rgb/hsl/nomes comuns) em fill/stroke/style */
		var tinted = svgText
			.replace(/\b(fill|stroke)\s*=\s*(['"])(?!none|transparent|currentColor)([^'"]+)\2/gi, function(_m, prop, q) {
				return prop + '=' + q + ACCOUNT_MENU_ICON_COLOR + q;
			})
			.replace(/\b(fill|stroke)\s*:\s*(?!none|transparent|currentColor)([^;"']+)/gi, function(_m, prop) {
				return prop + ':' + ACCOUNT_MENU_ICON_COLOR;
			});

		/* 2) Reforço via style global no SVG para elementos sem fill/stroke explícitos */
		var style = '<style>*{fill:' + ACCOUNT_MENU_ICON_COLOR + ' !important;stroke:' + ACCOUNT_MENU_ICON_COLOR + ' !important;}[fill="none"],[fill="transparent"]{fill:none !important;}[stroke="none"],[stroke="transparent"]{stroke:none !important;}</style>';
		tinted = tinted.replace(/<svg([^>]*)>/i, '<svg$1>' + style);
		return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(tinted);
	}

	function tintOneAccountMenuIcon(img) {
		if (!img || !img.getAttribute) return;
		if (img.dataset.loglabTintingInProgress === '1') return;

		var originalSrc = img.dataset.loglabOriginalSrc || img.getAttribute('src');
		if (!originalSrc || /^data:image\/svg\+xml/i.test(originalSrc)) return;
		if (!/\.svg(\?|$)/i.test(originalSrc)) return;

		img.dataset.loglabOriginalSrc = originalSrc;

		if (tintedAccountIconCache[originalSrc]) {
			img.src = tintedAccountIconCache[originalSrc];
			return;
		}

		img.dataset.loglabTintingInProgress = '1';
		fetch(originalSrc, { credentials: 'same-origin' })
			.then(function(res) { return res.ok ? res.text() : ''; })
			.then(function(svgText) {
				var tintedSrc = buildTintedSvgDataUri(svgText);
				if (!tintedSrc) return;
				tintedAccountIconCache[originalSrc] = tintedSrc;
				img.src = tintedSrc;
			})
			.catch(function() {})
			.finally(function() {
				delete img.dataset.loglabTintingInProgress;
			});
	}

	function patchAccountMenuIcons() {
		/* Ícones do menu da conta foram removidos via CSS (somente bolinha). */
		return;
	}

	function scheduleAccountMenuIconTints() {
		if (accountMenuIconPatchScheduled) return;
		accountMenuIconPatchScheduled = true;
		requestAnimationFrame(function() {
			accountMenuIconPatchScheduled = false;
			patchAccountMenuIcons();
		});
	}

	function fixContentOverflow() {
		var content = document.getElementById('content');
		if (content) {
			content.style.setProperty('padding-left', '0', 'important');
			content.style.setProperty('overflow-x', 'clip', 'important');
			content.style.setProperty('overflow-y', 'auto', 'important');
		}
		var headerStart = document.querySelector('#header:not(.header-guest) .header-start');
		if (headerStart) {
			headerStart.style.setProperty('white-space', 'normal', 'important');
		}
		patchVueAppNavigations();
		schedulePatchLoglabAppMenu();
		scheduleAccountMenuIconTints();
		ensureVueNavSubtreeObserver();
	}

	if (isSidebarCollapsed()) {
		document.body.classList.add('loglab-sidebar-collapsed');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() { init(); fixContentOverflow(); });
	} else {
		init();
		fixContentOverflow();
	}
	setTimeout(function() { init(); fixContentOverflow(); }, 800);
	setTimeout(function() { init(); fixContentOverflow(); }, 2000);
})();
