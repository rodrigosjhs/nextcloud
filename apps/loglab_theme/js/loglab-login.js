/**
 * Log.lab – Ajustes de layout na tela de login
 * Campo usuário dividido (nome + @loglabdigital.com.br) e rodapé com versão 1.0
 * Remove o ícone “olho” (Nextcloud + navegador) – CSS sozinho não bastava.
 */
(function() {
	'use strict';

	var STYLE_ID = 'loglab-strip-password-eye';
	var AUTH_STORAGE_KEY = 'loglab_auth_session';

	function loglabAuthDebug() {
		try {
			return (
				/(?:^|[?&])loglab_debug=1(?:&|$)/.test(window.location.search || '') ||
				window.sessionStorage.getItem('loglab_debug') === '1'
			);
		} catch (e) {
			return false;
		}
	}

	function dbgLoglab() {
		if (loglabAuthDebug() && typeof console !== 'undefined' && console.log) {
			var a = ['[LoglabAuth]'];
			for (var di = 0; di < arguments.length; di++) {
				a.push(arguments[di]);
			}
			console.log.apply(console, a);
		}
	}

	/**
	 * ?loglab_debug=1 — além do console, mostra uma faixa na página (muita gente não abre F12).
	 */
	function persistLoglabDebugFromQuery() {
		try {
			if (/(?:^|[?&])loglab_debug=1(?:&|$)/.test(window.location.search || '')) {
				window.sessionStorage.setItem('loglab_debug', '1');
			}
		} catch (e) {
			/* ignore */
		}
	}

	function setDebugPageBanner(lines, tone) {
		if (!loglabAuthDebug()) {
			return;
		}
		var id = 'loglab-debug-banner';
		var el = document.getElementById(id);
		if (!el) {
			el = document.createElement('div');
			el.id = id;
			el.setAttribute('role', 'status');
			el.setAttribute('aria-live', 'polite');
			el.style.cssText =
				'position:fixed;bottom:0;left:0;right:0;z-index:2147483647;' +
				'font:12px/1.45 ui-monospace,Consolas,monospace;' +
				'background:#141414;color:#e8e8e8;padding:10px 14px;' +
				'border-top:3px solid #f97316;box-shadow:0 -4px 24px rgba(0,0,0,.45);' +
				'max-height:38vh;overflow:auto;white-space:pre-wrap;word-break:break-word;';
			var target = document.body || document.documentElement;
			if (target) {
				target.appendChild(el);
			} else {
				return;
			}
		}
		if (tone === 'ok') {
			el.style.borderTopColor = '#22c55e';
		} else if (tone === 'err') {
			el.style.borderTopColor = '#ef4444';
		} else {
			el.style.borderTopColor = '#f97316';
		}
		el.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines);
	}

	/** #body-login pode não existir em tema custom; body quase sempre existe. */
	function getLoginDelegateRoot() {
		return document.getElementById('body-login') || document.body || document.documentElement;
	}

	/**
	 * Um único endpoint (mesma origem): PHP fala com a API e abre sessão Nextcloud.
	 * URL absoluta — evita falhas com caminhos relativos.
	 */
	function getAuthProxyUrl() {
		var rel = '';
		var m = document.querySelector('meta[name="loglab-auth-proxy-url"]');
		if (m && m.getAttribute('content')) {
			rel = m.getAttribute('content').trim();
		} else if (typeof OC !== 'undefined' && typeof OC.generateUrl === 'function') {
			try {
				rel = OC.generateUrl('/apps/loglab_theme/api/auth-login');
			} catch (e1) {
				rel = '';
			}
		}
		if (!rel) {
			rel = '/index.php/apps/loglab_theme/api/auth-login';
		}
		try {
			return new URL(rel, window.location.href).href;
		} catch (e2) {
			return rel;
		}
	}

	function getAuthPingUrl() {
		try {
			return new URL('/index.php/apps/loglab_theme/api/auth-ping', window.location.href).href;
		} catch (e) {
			return '/index.php/apps/loglab_theme/api/auth-ping';
		}
	}

	function getLoginRoot() {
		return document.querySelector('#body-login');
	}

	function findLoginForm(root) {
		var scope = root || getLoginRoot();
		if (!scope) return null;
		return scope.querySelector('form.login-form') || scope.querySelector('#login form') || scope.querySelector('form');
	}

	function findUserInput(root) {
		var scope = root || getLoginRoot();
		if (!scope) return null;
		return (
			scope.querySelector('input[name="user"]') ||
			scope.querySelector('input[type="email"]') ||
			scope.querySelector('input[type="text"]')
		);
	}

	function findPasswordInput(root) {
		var scope = root || getLoginRoot();
		if (!scope) return null;
		return scope.querySelector('input#password') || scope.querySelector('input[type="password"][name="password"]') || scope.querySelector('input[type="password"]');
	}

	function findUserInputInForm(form) {
		if (!form) return null;
		return (
			form.querySelector('input[name="user"]') ||
			form.querySelector('input[type="email"]') ||
			form.querySelector('input[type="text"]')
		);
	}

	function findPasswordInputInForm(form) {
		if (!form) return null;
		return (
			form.querySelector('input#password') ||
			form.querySelector('input[type="password"][name="password"]') ||
			form.querySelector('input[type="password"]')
		);
	}

	function ensureApiMessageBox(root) {
		var scope = root || getLoginRoot();
		if (!scope) return null;
		var form = findLoginForm(scope);
		if (!form) return null;

		var box = form.querySelector('.loglab-auth-message');
		if (box) return box;

		box = document.createElement('div');
		box.className = 'loglab-auth-message';
		box.setAttribute('role', 'alert');
		box.style.display = 'none';
		box.style.margin = '8px 0 0';
		box.style.padding = '8px 10px';
		box.style.borderRadius = '10px';
		box.style.fontSize = '12px';
		box.style.lineHeight = '1.35';
		box.style.fontWeight = '600';
		box.style.border = '1px solid transparent';

		var submitWrap = form.querySelector('[data-login-form-submit]');
		if (submitWrap && submitWrap.parentNode) submitWrap.parentNode.insertBefore(box, submitWrap);
		else form.appendChild(box);

		return box;
	}

	function showApiMessage(type, message, root) {
		var box = ensureApiMessageBox(root);
		if (!box) return;
		var text = (message || '').trim();
		if (!text) {
			box.style.display = 'none';
			box.textContent = '';
			return;
		}

		box.style.display = 'block';
		box.textContent = text;
		if (type === 'success') {
			box.style.color = '#d9f7de';
			box.style.background = 'rgba(15, 80, 36, 0.72)';
			box.style.borderColor = 'rgba(52, 211, 153, 0.85)';
		} else {
			box.style.color = '#ffe5e5';
			box.style.background = 'rgba(110, 18, 18, 0.72)';
			box.style.borderColor = 'rgba(248, 113, 113, 0.85)';
		}
	}

	function setSubmitLoading(loading, root) {
		var scope = root || getLoginRoot();
		if (!scope) return;
		var submitBtn = scope.querySelector('button[type="submit"]');
		if (!submitBtn) return;
		if (loading) {
			if (!submitBtn.hasAttribute('data-loglab-original-text')) {
				submitBtn.setAttribute('data-loglab-original-text', submitBtn.textContent || 'ENTRAR');
			}
			submitBtn.disabled = true;
			submitBtn.setAttribute('aria-busy', 'true');
			submitBtn.textContent = 'Entrando...';
		} else {
			submitBtn.disabled = false;
			submitBtn.removeAttribute('aria-busy');
			var oldText = submitBtn.getAttribute('data-loglab-original-text') || 'ENTRAR';
			submitBtn.textContent = oldText;
		}
	}

	function parseApiError(status, payload) {
		if (payload && payload.erro) return payload.erro;
		if (status === 400) return 'Preencha usuário e senha.';
		if (status === 401) return 'Usuário ou senha inválidos.';
		if (status >= 500) return 'Falha na autenticação. Tente novamente em instantes.';
		return 'Não foi possível autenticar agora.';
	}

	function saveAuthSession(payload) {
		var session = {
			accessToken: payload.accessToken || '',
			refreshToken: payload.refreshToken || '',
			expiresIn: payload.expiresIn || 0,
			tokenType: payload.tokenType || 'Bearer',
			usuario: payload.usuario || null,
			authenticatedAt: Date.now()
		};
		try {
			localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
		} catch (e) {
			/* localStorage pode estar bloqueado; manter fluxo sem quebrar */
		}
	}

	function attachDelegatedLoginHandlers() {
		/* Login interception is handled entirely by loglab-early.js */
	}

	function injectStripCss() {
		var s = document.getElementById(STYLE_ID);
		if (!s) {
			s = document.createElement('style');
			s.id = STYLE_ID;
			(document.head || document.documentElement).appendChild(s);
		}
		/* textContent sempre regravado (cache antigo do browser não fica sem as regras novas) */
		s.textContent =
			'#body-login input[type=password]::-ms-reveal{display:none!important}' +
			'#body-login button.toggle-password,#body-login #login button[class*=toggle],#body-login input[type=password]~button:not([type=submit]){display:none!important;visibility:hidden!important;pointer-events:none!important}' +
			'#body-login #show,#body-login #dbpassword-toggle,#body-login label[for=show],#body-login label[for=dbpassword-toggle]{display:none!important}' +
			/* Nextcloud LoginForm: NcCheckboxRadioSwitch com id/name rememberme (não é só input[type=checkbox]) */
			'#body-login #rememberme,#body-login [data-login-form-input-rememberme],#body-login input[name=rememberme],#body-login label[for=rememberme]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important;position:absolute!important;clip:rect(0,0,0,0)!important;margin:0!important;padding:0!important;border:0!important}';
		/* Sempre no fim do <head>: chunks Vue injetam CSS depois do nosso — mover o nó ganha na cascata */
		var h = document.head || document.documentElement;
		if (h && s.parentNode) h.appendChild(s);
	}

	function stripPasswordEye() {
		var root = document.querySelector('#body-login');
		if (!root) return;
		var inputs = root.querySelectorAll('input[type="password"]');
		for (var i = 0; i < inputs.length; i++) {
			var inp = inputs[i];
			inp.classList.remove('password-with-toggle');
			var par = inp.parentElement;
			if (!par) continue;
			var btns = par.querySelectorAll('button');
			for (var b = 0; b < btns.length; b++) {
				if (btns[b].getAttribute('type') === 'submit') continue;
				btns[b].remove();
			}
		}
		var ids = ['show', 'dbpassword-toggle'];
		for (var j = 0; j < ids.length; j++) {
			var el = document.getElementById(ids[j]);
			if (el) el.remove();
			var lab = root.querySelector('label[for="' + ids[j] + '"]');
			if (lab) lab.remove();
		}
	}

	/** Remove “Lembre-se de mim” (NcCheckboxRadioSwitch: #rememberme, name=rememberme). */
	function removeRememberLogin() {
		var root = document.querySelector('#body-login');
		if (!root) return;
		var el;
		while ((el = document.getElementById('rememberme'))) {
			el.remove();
		}
		var marked = root.querySelectorAll('[data-login-form-input-rememberme]');
		for (var m = 0; m < marked.length; m++) {
			marked[m].remove();
		}
		var switches = root.querySelectorAll('.checkbox-radio-switch');
		for (var s = 0; s < switches.length; s++) {
			var sw = switches[s];
			if (sw.querySelector('input[name="rememberme"]') || sw.getAttribute('id') === 'rememberme') {
				sw.remove();
			}
		}
		var byName = root.querySelectorAll('input[name="rememberme"]');
		for (var n = 0; n < byName.length; n++) {
			var inp = byName[n];
			var wrap = inp.closest('.checkbox-radio-switch') || inp.closest('label') || inp.parentElement;
			if (wrap && wrap !== root) wrap.remove();
			else inp.remove();
		}
	}

	/**
	 * Espaço físico antes do ENTRAR: em alguns layouts o margin do input/botão é “comido”
	 * (flex, especificidade, #login ausente). Um div vazio garante a folga.
	 */
	/**
	 * Senha: NcInputField posiciona o label com :not(:placeholder-shown). Em type=password muitos
	 * navegadores NUNCA aplicam :placeholder-shown → o label fica sempre no modo “encolhido” (em cima).
	 * Classe .loglab-pw-label-empty = vazio + sem foco → forçamos o mesmo layout do texto do usuário.
	 */
	function stylePasswordLabelAsPlaceholder(scope) {
		var root = scope || document.querySelector('#body-login');
		if (!root) return;
		var pw =
			root.querySelector('[data-login-form-input-password] input[type="password"]') ||
			root.querySelector('.input-field input#password') ||
			root.querySelector('input#password') ||
			root.querySelector('input[type="password"][name="password"]');
		if (!pw || pw.closest('.loglab-user-wrap')) return;

		pw.setAttribute('placeholder', 'Senha');
		pw.setAttribute('aria-label', 'Senha');

		var wrap = pw.closest('.input-field');
		if (wrap) {
			/* Label fora gera o placeholder nativo visível sem depender de :placeholder-shown no password */
			wrap.classList.add('input-field--label-outside');
			wrap.classList.remove('loglab-pw-hide-label');
		}
	}

	function ensureSubmitSpacer() {
		var root = document.querySelector('#body-login');
		if (!root) return;
		var submit = root.querySelector('form.login-form [data-login-form-submit]') || root.querySelector('[data-login-form-submit]');
		if (!submit || !submit.parentNode) return;
		var prev = submit.previousElementSibling;
		if (prev && prev.classList && prev.classList.contains('loglab-submit-spacer')) return;
		var sp = document.createElement('div');
		sp.className = 'loglab-submit-spacer';
		sp.setAttribute('aria-hidden', 'true');
		submit.parentNode.insertBefore(sp, submit);
	}

	/** Remove o nome "Nextcloud/NextCoud" do título e do rodapé sempre que o Vue re-renderizar. */
	function removeNextcloudBranding(container) {
		var root = document.querySelector('#body-login');
		if (!root) return;

		var scope = container || root;
		var brandRx = /NextC(?:loud|oud)/i;

		/* Headline oficial do LoginForm Vue: manter fixo sem marca */
		var headline = scope.querySelector('[data-login-form-headline]');
		if (headline) {
			headline.textContent = 'Faça login';
		}

		/* Fallback para headings genéricos */
		var heading = scope.querySelector('h1, h2, [class*="headline"], [class*="title"], [class*="heading"]');
		if (heading && brandRx.test(heading.textContent || '')) {
			heading.textContent = (heading.textContent || '')
				.replace(/\s*em\s+NextC(?:loud|oud)\s*/gi, ' ')
				.replace(/NextC(?:loud|oud)/gi, '')
				.trim() || 'Faça login';
		}

		/* Remove o h1 oculto "Nextcloud" usado por acessibilidade no template */
		var hiddenH1 = scope.querySelector('h1.hidden.visually');
		if (hiddenH1 && brandRx.test(hiddenH1.textContent || '')) {
			hiddenH1.textContent = '';
		}

		var pageFooter = root.querySelector('footer.guest-box, .guest-box');
		if (pageFooter && brandRx.test(pageFooter.textContent || '')) {
			pageFooter.innerHTML = pageFooter.innerHTML
				.replace(/NextC(?:loud|oud)\s*[–—-]\s*/gi, '')
				.replace(/NextC(?:loud|oud)/gi, '')
				.trim();
			if ((pageFooter.textContent || '').trim() === '') pageFooter.style.display = 'none';
		}

		/* Limpeza defensiva: qualquer nó de texto no login/rodapé com a marca */
		var textHosts = [
			scope,
			root.querySelector('footer.guest-box'),
			root.querySelector('.guest-box .info'),
			root.querySelector('.guest-box')
		];
		for (var i = 0; i < textHosts.length; i++) {
			var host = textHosts[i];
			if (!host) continue;
			var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
			var node;
			while ((node = walker.nextNode())) {
				if (!node.nodeValue || !brandRx.test(node.nodeValue)) continue;
				node.nodeValue = node.nodeValue
					.replace(/NextC(?:loud|oud)\s*[–—-]\s*/gi, '')
					.replace(/NextC(?:loud|oud)/gi, '')
					.replace(/\s{2,}/g, ' ')
					.trim();
			}
		}
	}

	var obsTimer;
	function scheduleStrip() {
		clearTimeout(obsTimer);
		obsTimer = setTimeout(function() {
			injectStripCss();
			stripPasswordEye();
			removeRememberLogin();
			ensureSubmitSpacer();
			removeNextcloudBranding();
			stylePasswordLabelAsPlaceholder();
		}, 0);
	}

	function run() {
		injectStripCss();
		stripPasswordEye();
		removeRememberLogin();
		ensureSubmitSpacer();
		stylePasswordLabelAsPlaceholder();

		var guestContent = document.querySelector('#body-login .guest-content');
		var loginDiv = document.getElementById('login');
		if (!guestContent && !loginDiv) return;

		var container = guestContent || loginDiv;
		removeNextcloudBranding(container);
		stylePasswordLabelAsPlaceholder(container);

		/* Campo usuário: envolver input em .loglab-user-wrap e adicionar sufixo @loglabdigital.com.br */
		var userInput = container.querySelector('input[type="text"]') || container.querySelector('input[name="user"]') || container.querySelector('input[type="email"]');
		if (userInput && !userInput.closest('.loglab-user-wrap')) {
			userInput.placeholder = 'Digite seu nome';
			var wrap = document.createElement('div');
			wrap.className = 'loglab-user-wrap';
			var suffix = document.createElement('span');
			suffix.className = 'loglab-user-suffix';
			suffix.textContent = '@loglabdigital.com.br';
			userInput.parentNode.insertBefore(wrap, userInput);
			wrap.appendChild(userInput);
			wrap.appendChild(suffix);
		}

		/* Rodapé dentro da caixa: linha + versão 1.0 */
		if (!container.querySelector('.loglab-login-footer')) {
			var footer = document.createElement('div');
			footer.className = 'loglab-login-footer';
			var version = document.createElement('div');
			version.className = 'loglab-login-version';
			version.textContent = '1.0';
			footer.appendChild(version);
			container.appendChild(footer);
		}
	}

	function init() {
		persistLoglabDebugFromQuery();
		injectStripCss();
		stripPasswordEye();
		removeRememberLogin();
		ensureSubmitSpacer();
		stylePasswordLabelAsPlaceholder();
		run();
		setTimeout(run, 300);
		setTimeout(run, 800);
		setTimeout(run, 1500);
		var moRoot = document.getElementById('body-login') || document.body;
		if (moRoot && typeof MutationObserver !== 'undefined') {
			new MutationObserver(scheduleStrip).observe(moRoot, { childList: true, subtree: true });
		}
		document.addEventListener('focusin', function(e) {
			if (e.target && e.target.type === 'password') scheduleStrip();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
