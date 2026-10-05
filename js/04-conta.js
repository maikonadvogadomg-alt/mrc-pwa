/* =========================================================================
   Mini SK — 04-conta.js
   🔐 Conta e nuvem (Supabase), sem biblioteca de fora.
   - Tela de ENTRADA só com: e-mail, senha, Entrar, Criar conta, Esqueci a senha.
     Nada de link de banco na entrada.
   - O endereço do Supabase e a chave pública (anon) ficam guardados por dentro:
     no arquivo config.js do Mini SK, ou em ⚙️ Configuração (uma vez só).
   - Sem internet: entra com a mesma senha (conferida no aparelho) e continua
     trabalhando com o que está guardado nele.
   - SK.nuvem guarda e lê dados na tabela minisk_dados (só o dono enxerga).
   ========================================================================= */
(function (SK) {
  'use strict';
  const PREF_CFG = 'nuvemCfg', PREF_SESS = 'sessao', PREF_VER = 'sessaoLocal';
  let sess = SK.pref.get(PREF_SESS, null);   // { access_token, refresh_token, expires_at, user }
  let offline = false;

  // ── Configuração (endereço + chave pública) ────────────────────────────────
  function cfg() {
    const p = SK.pref.get(PREF_CFG, null) || {};
    const f = window.SK_CONFIG || {};
    const url = String(p.url || f.supabaseUrl || '').trim().replace(/\/+$/, '');
    const anon = String(p.anon || f.supabaseAnonKey || '').trim();
    return { url, anon, ok: /^https:\/\/.+/.test(url) && anon.length > 20, pedirLogin: p.pedirLogin !== false, fromFile: !p.url && !!f.supabaseUrl };
  }
  function setCfg(c) { SK.pref.set(PREF_CFG, Object.assign({}, SK.pref.get(PREF_CFG, {}), c)); SK.emit('conta-cfg'); }

  // ── Chamadas ───────────────────────────────────────────────────────────────
  async function call(path, opts) {
    const c = cfg();
    if (!c.ok) throw new Error('A nuvem ainda não foi configurada (⚙️ Configuração).');
    opts = opts || {};
    const headers = Object.assign({ apikey: c.anon, 'Content-Type': 'application/json' }, opts.headers || {});
    if (opts.auth !== false) {
      if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
      else if (sess && sess.access_token) { await refreshIfNeeded(); headers.Authorization = 'Bearer ' + sess.access_token; }
    }
    let r;
    try { r = await fetch(c.url + path, { method: opts.method || 'GET', headers, body: opts.body == null ? undefined : JSON.stringify(opts.body) }); }
    catch (e) { const er = new Error('Sem conexão com a nuvem.'); er.offline = true; throw er; }
    const txt = await r.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!r.ok) {
      const m = (data && (data.error_description || data.msg || data.message || data.error)) || ('Erro ' + r.status);
      const er = new Error(traduz(String(m), r.status)); er.status = r.status; er.data = data; throw er;
    }
    return data;
  }
  function traduz(m, st) {
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha errados.';
    if (/email not confirmed/i.test(m)) return 'Falta confirmar o e-mail: abra o link que o Supabase mandou para você.';
    if (/user already registered/i.test(m)) return 'Esse e-mail já tem conta. Use "Entrar" ou "Esqueci a senha".';
    if (/password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
    if (/relation .*minisk_dados.* does not exist|could not find the table/i.test(m)) return 'A tabela ainda não foi criada no Supabase. Em ⚙️ Configuração, copie o SQL e rode no Supabase (SQL Editor).';
    if (/jwt expired/i.test(m)) return 'Sua entrada venceu. Entre de novo.';
    if (st === 401) return 'Não autorizado: entre de novo. (' + m + ')';
    return m;
  }

  // ── Sessão ─────────────────────────────────────────────────────────────────
  function saveSess(d) {
    if (!d || !d.access_token) return;
    sess = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)), user: d.user || (sess && sess.user) || null };
    SK.pref.set(PREF_SESS, sess);
  }
  async function refreshIfNeeded() {
    if (!sess || !sess.refresh_token) return;
    if (sess.expires_at && sess.expires_at - 60 > Date.now() / 1000) return;
    try { saveSess(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: sess.refresh_token } })); }
    catch (e) { if (!e.offline) { sess = null; SK.pref.set(PREF_SESS, null); } throw e; }
  }

  // Senha conferida no aparelho (para entrar sem internet). Nunca guarda a senha.
  async function verifier(email, pass, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt + '|' + email.toLowerCase()), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function rememberLocal(email, pass) {
    try { const salt = SK.uid(); SK.pref.set(PREF_VER, { email: email.toLowerCase(), salt, h: await verifier(email, pass, salt) }); } catch {}
  }
  async function checkLocal(email, pass) {
    const v = SK.pref.get(PREF_VER, null);
    if (!v || v.email !== email.toLowerCase()) return false;
    try { return (await verifier(email, pass, v.salt)) === v.h; } catch { return false; }
  }

  async function login(email, pass) {
    try {
      const d = await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password: pass } });
      saveSess(d); offline = false; await rememberLocal(email, pass);
      return { ok: true };
    } catch (e) {
      if (e.offline && await checkLocal(email, pass)) { offline = true; return { ok: true, offline: true }; }
      if (e.offline) throw new Error('Sem internet, e este aparelho ainda não tem uma entrada guardada com esse e-mail. Conecte-se uma vez.');
      throw e;
    }
  }
  async function signup(email, pass) {
    const d = await call('/auth/v1/signup', { method: 'POST', auth: false, body: { email, password: pass, options: { emailRedirectTo: here() } } });
    if (d && d.access_token) { saveSess(d); await rememberLocal(email, pass); return { ok: true, entrou: true }; }
    return { ok: true, confirmar: true };
  }
  async function recover(email) {
    await call('/auth/v1/recover?redirect_to=' + encodeURIComponent(here()), { method: 'POST', auth: false, body: { email } });
  }
  async function setPassword(pass) {
    const d = await call('/auth/v1/user', { method: 'PUT', body: { password: pass } });
    if (sess) { sess.user = d; SK.pref.set(PREF_SESS, sess); }
    if (d && d.email) await rememberLocal(d.email, pass);
  }
  function logout(apagarChaves) {
    const t = sess && sess.access_token;
    if (t) call('/auth/v1/logout', { method: 'POST', token: t }).catch(() => {});
    sess = null; SK.pref.set(PREF_SESS, null);
    if (apagarChaves) SK.emit('conta-apagar-chaves');
    SK.emit('conta-saiu');
    showGate();
  }
  const here = () => location.href.split('#')[0];
  const user = () => (sess && sess.user) || null;

  // ── Dados na nuvem (tabela minisk_dados: chave → valor) ────────────────────
  const T = '/rest/v1/minisk_dados';
  const nuvem = {
    get pronto() { return cfg().ok && !!(sess && sess.access_token) && !offline; },
    async get(chave) {
      const r = await call(T + '?select=valor,atualizado&chave=eq.' + encodeURIComponent(chave));
      return r && r[0] ? { valor: r[0].valor, atualizado: r[0].atualizado } : null;
    },
    async set(chave, valor) {
      await call(T + '?on_conflict=user_id,chave', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { chave, valor, atualizado: new Date().toISOString() } });
    },
    async list(prefixo) {
      return (await call(T + '?select=chave,atualizado&order=atualizado.desc&chave=like.' + encodeURIComponent(prefixo + '*'))) || [];
    },
    async del(chave) { await call(T + '?chave=eq.' + encodeURIComponent(chave), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); },
  };

  // ── Tela de entrada ────────────────────────────────────────────────────────
  let gate = null;
  function showGate(mode) {
    if (gate) gate.remove();
    gate = document.createElement('div');
    gate.className = 'gate'; gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true');
    const last = (SK.pref.get(PREF_VER, null) || {}).email || (user() && user().email) || '';
    gate.innerHTML =
      '<form class="gate-box" autocomplete="on">' +
        '<div class="gate-logo">⚡</div><h2>Mini SK</h2>' +
        '<p class="muted small gate-sub" id="gt-sub">Entre na sua conta</p>' +
        '<div class="gate-fields" id="gt-fields">' +
          '<input class="inp" id="gt-email" type="email" placeholder="E-mail" autocomplete="username" required value="' + SK.esc(last) + '">' +
          '<input class="inp" id="gt-pass" type="password" placeholder="Senha" autocomplete="current-password" required>' +
          '<input class="inp" id="gt-pass2" type="password" placeholder="Repita a senha" autocomplete="new-password" hidden>' +
        '</div>' +
        '<div class="gate-msg" id="gt-msg" aria-live="polite"></div>' +
        '<button class="btn primary gate-go" id="gt-go" type="submit">Entrar</button>' +
        '<div class="gate-links"><button type="button" class="linkbtn" data-m="signup">Criar conta</button><button type="button" class="linkbtn" data-m="recover">Esqueci a senha</button><button type="button" class="linkbtn" data-m="login" hidden>Voltar para Entrar</button></div>' +
      '</form>';
    document.body.appendChild(gate);
    const g = gate, $ = (s) => g.querySelector(s);
    let m = mode || 'login';
    const setMode = (k) => {
      m = k;
      const t = { login: ['Entre na sua conta', 'Entrar'], signup: ['Criar conta nova', 'Criar conta'], recover: ['Mandamos um link para o seu e-mail', 'Mandar link'], nova: ['Crie a sua senha nova', 'Salvar senha nova'] }[k];
      $('#gt-sub').textContent = t[0]; $('#gt-go').textContent = t[1];
      $('#gt-email').hidden = k === 'nova'; $('#gt-email').required = k !== 'nova';
      $('#gt-pass').hidden = k === 'recover'; $('#gt-pass').required = k !== 'recover';
      $('#gt-pass').autocomplete = k === 'login' ? 'current-password' : 'new-password';
      $('#gt-pass').placeholder = k === 'nova' ? 'Senha nova' : 'Senha';
      $('#gt-pass2').hidden = !(k === 'signup' || k === 'nova'); $('#gt-pass2').required = !$('#gt-pass2').hidden;
      g.querySelectorAll('[data-m]').forEach((b) => { b.hidden = b.dataset.m === k || (k === 'login' ? b.dataset.m === 'login' : k === 'nova'); });
      msg('');
      setTimeout(() => ((k === 'nova' || $('#gt-email').value) ? $('#gt-pass') : $('#gt-email')).focus(), 30);
    };
    const msg = (t, kind) => { $('#gt-msg').textContent = t || ''; $('#gt-msg').className = 'gate-msg ' + (kind || ''); };
    g.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });
    $('form').onsubmit = async (e) => {
      e.preventDefault();
      const email = $('#gt-email').value.trim(), pass = $('#gt-pass').value, pass2 = $('#gt-pass2').value;
      if ((m === 'signup' || m === 'nova') && pass !== pass2) return msg('As duas senhas não são iguais.', 'error');
      if ((m === 'signup' || m === 'nova') && pass.length < 6) return msg('A senha precisa ter pelo menos 6 caracteres.', 'error');
      $('#gt-go').disabled = true; msg('Aguarde…');
      try {
        if (m === 'login') { const r = await login(email, pass); return enter(r.offline); }
        if (m === 'signup') {
          const r = await signup(email, pass);
          if (r.entrou) return enter();
          setMode('login'); msg('✅ Conta criada! Abra o e-mail que o Supabase mandou e toque no link para confirmar. Depois é só entrar.', 'ok');
        }
        if (m === 'recover') { await recover(email); msg('✅ Se esse e-mail tem conta, chegou um link para criar senha nova. Abra o link neste mesmo aparelho.', 'ok'); }
        if (m === 'nova') { await setPassword(pass); msg('✅ Senha trocada!', 'ok'); return enter(); }
      } catch (er) { msg(er.message, 'error'); }
      finally { $('#gt-go').disabled = false; }
    };
    setMode(m);
  }
  function enter(isOffline) {
    if (gate) { gate.remove(); gate = null; }
    if (isOffline) SK.toast('Sem internet: entrou com o que está guardado neste aparelho. A nuvem volta quando a internet voltar.');
    SK.emit('conta-entrou', { offline: !!isOffline, user: user() });
  }

  // Links que voltam do e-mail (#access_token=…&type=recovery|signup)
  function fromEmailLink() {
    const h = location.hash.replace(/^#/, '');
    if (!/access_token=/.test(h)) return null;
    const q = new URLSearchParams(h);
    saveSess({ access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: Number(q.get('expires_in') || 3600) });
    history.replaceState(null, '', here());
    call('/auth/v1/user').then((u) => { if (sess) { sess.user = u; SK.pref.set(PREF_SESS, sess); SK.emit('conta-entrou', { user: u }); } }).catch(() => {});
    return q.get('type') || 'login';
  }

  function start() {
    const c = cfg();
    if (!c.ok) return; // sem nuvem configurada: o Mini SK funciona só no aparelho, como sempre
    const tipo = fromEmailLink();
    if (tipo === 'recovery') return showGate('nova');
    if (tipo) return enter();
    if (c.pedirLogin || !sess) showGate('login');
    else { refreshIfNeeded().catch(() => {}); setTimeout(() => SK.emit('conta-entrou', { user: user() }), 0); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // Link do e-mail aberto com o Mini SK já aberto na mesma aba
  window.addEventListener('hashchange', () => { if (/access_token=/.test(location.hash) && cfg().ok) { const t = fromEmailLink(); if (t === 'recovery') showGate('nova'); else if (t) enter(); } });

  SK.conta = { cfg, setCfg, login, signup, recover, setPassword, logout, call, showGate, get user() { return user(); }, get logado() { return !!(sess && sess.access_token); }, get offline() { return offline; } };
  SK.nuvem = nuvem;
})(window.SK);
