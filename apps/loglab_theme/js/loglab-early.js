(function() {
	if (window.__loglabEarlyCapture) return;
	window.__loglabEarlyCapture = true;

	// Usuários que fazem login nativo (sem Keycloak) — admin direto
	var NATIVE_LOGIN_USERS = ['josealves'];

	var PROXY_META = 'loglab-auth-proxy-url';

	function getProxyUrl() {
		var m = document.querySelector('meta[name="' + PROXY_META + '"]');
		if (m && m.getAttribute('content')) {
			return m.getAttribute('content').trim();
		}
		return '/index.php/apps/loglab_theme/api/auth-login';
	}

	function findUser(form) {
		return form.querySelector('input[name="user"]') ||
			form.querySelector('input[type="text"]') ||
			form.querySelector('input[type="email"]');
	}

	function findPass(form) {
		return form.querySelector('input[name="password"]') ||
			form.querySelector('input[type="password"]');
	}

	function isNativeUser(form) {
		var u = findUser(form);
		var user = u ? u.value.trim().toLowerCase() : '';
		return NATIVE_LOGIN_USERS.indexOf(user) !== -1;
	}

	function doLogin(form) {
		if (form.__loglabNativeBypass) return;
		if (form.getAttribute('data-loglab-inflight') === '1') return;
		var u = findUser(form);
		var p = findPass(form);
		var user = u ? u.value.trim() : '';
		var pass = p ? p.value : '';
		if (!user || !pass) return;

		if (isNativeUser(form)) {
			form.__loglabNativeBypass = true;
			releaseForm(form);
			HTMLFormElement.prototype.submit.call(form);
			return;
		}

		form.setAttribute('data-loglab-inflight', '1');

		var btn = form.querySelector('button[type="submit"]') ||
			form.querySelector('[data-login-form-submit] button');
		if (btn) {
			btn.disabled = true;
			btn.textContent = 'Entrando...';
		}

		var url = getProxyUrl();

		fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: user, password: pass }),
			credentials: 'include',
			mode: 'same-origin'
		}).then(function(res) {
			return res.json().catch(function() { return {}; }).then(function(d) {
				return { ok: res.ok, status: res.status, data: d };
			});
		}).then(function(r) {
			if (r.ok && r.data && r.data.sucesso === true) {
				var dest = r.data.redirectUrl || '/index.php/apps/dashboard/';
				try {
					var u = new URL(dest, window.location.href);
					dest = u.pathname + u.search + u.hash;
				} catch (e) {}
				window.location.replace(dest);
				return;
			}
			var msg = (r.data && r.data.erro) || (r.data && r.data.detalhes) || 'Usuário ou senha inválidos.';
			showErr(form, msg);
		}).catch(function(err) {
			showErr(form, 'Erro de rede: ' + (err.message || err));
		}).finally(function() {
			form.removeAttribute('data-loglab-inflight');
			if (btn) {
				btn.disabled = false;
				btn.textContent = 'Entrar';
			}
		});
	}

	function showErr(form, msg) {
		var box = form.querySelector('.loglab-early-err');
		if (!box) {
			box = document.createElement('div');
			box.className = 'loglab-early-err';
			box.setAttribute('role', 'alert');
			box.style.cssText = 'color:#f87171;font-size:13px;font-weight:600;margin:8px 0;text-align:center;';
			var ref = form.querySelector('[data-login-form-submit]') || form.querySelector('button[type="submit"]');
			if (ref && ref.parentNode) {
				ref.parentNode.insertBefore(box, ref);
			} else {
				form.appendChild(box);
			}
		}
		box.textContent = msg;
		box.style.display = 'block';
	}

	function releaseForm(form) {
		if (!form) return;
		var origAction = form._loglabOrigAction || '/index.php/login';
		try { delete form.action; } catch (e) {}
		try {
			Object.defineProperty(form, 'action', {
				value: origAction,
				writable: true,
				configurable: true
			});
		} catch (e) {}
		form.setAttribute('action', origAction);
		form.method = 'post';
		form.removeAttribute('data-loglab-hijacked');
		form.submit = HTMLFormElement.prototype.submit;
	}

	function hijack(form) {
		if (!form || form.getAttribute('data-loglab-hijacked') === '1') return;
		form.setAttribute('data-loglab-hijacked', '1');

		form._loglabOrigAction = form.getAttribute('action') || '/index.php/login';
		form.action = 'javascript:void(0)';
		form.method = 'get';

		try {
			Object.defineProperty(form, 'action', {
				get: function() { return 'javascript:void(0)'; },
				set: function() {},
				configurable: true
			});
		} catch (e) {}

		form.submit = function() { doLogin(form); };

		form.addEventListener('submit', function(e) {
			if (form.__loglabNativeBypass) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			doLogin(form);
		}, true);
	}

	function scanAndHijack() {
		var f = document.querySelector('form[name="login"]') ||
			document.querySelector('form.login-form');
		if (f) hijack(f);
	}

	window.addEventListener('submit', function(e) {
		var f = e.target;
		if (!f || f.tagName !== 'FORM') return;
		if (f.getAttribute('name') !== 'login' && (!f.classList || !f.classList.contains('login-form'))) return;
		if (isNativeUser(f)) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		doLogin(f);
	}, true);

	document.addEventListener('click', function(e) {
		var t = e.target;
		if (!t) return;
		var btn = t.closest ? t.closest('button') : null;
		if (!btn) return;
		var form = btn.closest ? (btn.closest('form[name="login"]') || btn.closest('form.login-form')) : null;
		if (!form) return;
		if (isNativeUser(form)) return;
		if (btn.type === 'submit' || (btn.closest && btn.closest('[data-login-form-submit]'))) {
			e.preventDefault();
			e.stopImmediatePropagation();
			doLogin(form);
		}
	}, true);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', scanAndHijack);
	} else {
		scanAndHijack();
	}

	var moStarted = false;
	function startObserver() {
		if (moStarted) return;
		moStarted = true;
		var target = document.getElementById('body-login') || document.body;
		if (!target || typeof MutationObserver === 'undefined') return;
		new MutationObserver(function() { scanAndHijack(); }).observe(target, { childList: true, subtree: true });
	}

	if (document.body) {
		startObserver();
	} else {
		document.addEventListener('DOMContentLoaded', startObserver);
	}
})();
