/* =========================================================================
   Mini SK — 96-apk.js
   📦 APK de verdade a partir de um projeto HTML (o app vai DENTRO do APK,
   funciona sem internet — não é a "casca" TWA que só abre um site).

   Como funciona:
   1. Você preenche nome, versão, cor, orientação → "Preparar arquivos":
      o Mini SK cria no projeto:
        apk.config.json                 (suas escolhas)
        android/…                       (projeto Android pequeno, em Java)
        .github/workflows/apk.yml       (a receita para o GitHub montar)
   2. "Enviar e gerar": envia ao GitHub e manda montar.
   3. O painel acompanha passo a passo (✅ ❌ ⏳). Se falhar, mostra o erro
      e o botão "Explicar com a IA". Se der certo, mostra o link do APK.

   Detalhes que evitam os erros antigos:
   - nenhum "|| true" ou "| tail": se falhar, fica VERMELHO;
   - a chave de assinatura é criada uma vez e guardada no repositório
     (o APK novo instala por cima do antigo, sem desinstalar);
   - o APK sai num link de download (Releases), não escondido.
   ========================================================================= */
(function (SK) {
  'use strict';
  const fs = () => SK.fs;
  let box, polling = null;
  const WF = '.github/workflows/apk.yml';

  // ── Modelos dos arquivos ────────────────────────────────────────────────────
  const T = {};
  T['android/settings.gradle'] = `pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "MiniSKApp"
include ':app'
`;
  T['android/build.gradle'] = `plugins {
    id 'com.android.application' version '8.5.2' apply false
}
`;
  T['android/gradle.properties'] = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
`;
  T['android/app/build.gradle'] = `plugins { id 'com.android.application' }

// As escolhas feitas no painel 📦 APK do Mini SK ficam em apk.config.json
def cfg = new groovy.json.JsonSlurper().parse(rootProject.file('../apk.config.json'))

android {
    namespace 'app.minisk.shell'
    compileSdk 34

    defaultConfig {
        applicationId cfg.pacote
        minSdk 24
        targetSdk 34
        versionCode((cfg.versaoCodigo ?: 1) as Integer)
        versionName "\${cfg.versao ?: '1.0'}"
        resValue "string", "app_name", "\${cfg.nome}"
        resValue "color", "tema", "\${cfg.cor ?: '#0f1420'}"
        manifestPlaceholders = [orientacao: (cfg.orientacao ?: 'unspecified')]
    }

    signingConfigs {
        release {
            storeFile rootProject.file('release.keystore')
            storePassword 'minisk-apk'
            keyAlias 'app'
            keyPassword 'minisk-apk'
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.webkit:webkit:1.11.0'
}
`;
  T['android/app/src/main/AndroidManifest.xml'] = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="\${orientacao}"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|keyboard|uiMode|smallestScreenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
  T['android/app/src/main/java/app/minisk/shell/MainActivity.java'] = `package app.minisk.shell;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * App de uma tela só: abre o index.html que vai DENTRO do APK (pasta assets/www).
 * Usa um endereço https "de mentira" (appassets.androidplatform.net) para o
 * navegador interno liberar tudo: banco do navegador, módulos, service worker.
 */
public class MainActivity extends Activity {
    private static final String INICIO = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int ESCOLHER_ARQUIVO = 41;
    private WebView web;
    private ValueCallback<Uri[]> retornoArquivo;

    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        try { getWindow().setStatusBarColor(getResources().getColor(R.color.tema, null)); } catch (Exception ignorado) { }

        final WebViewAssetLoader carregador = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return carregador.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                // links de fora (sites) abrem no navegador do celular
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignorado) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> retorno, FileChooserParams p) {
                if (retornoArquivo != null) retornoArquivo.onReceiveValue(null);
                retornoArquivo = retorno;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher arquivo"), ESCOLHER_ARQUIVO);
                } catch (Exception e) {
                    retornoArquivo = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Ponte(), "AndroidBridge");
        setContentView(web);
        if (salvo != null) web.restoreState(salvo);
        else web.loadUrl(INICIO);
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido == ESCOLHER_ARQUIVO && retornoArquivo != null) {
            Uri[] lista = null;
            if (resultado == RESULT_OK && dados != null) {
                if (dados.getClipData() != null) {
                    int n = dados.getClipData().getItemCount();
                    lista = new Uri[n];
                    for (int k = 0; k < n; k++) lista[k] = dados.getClipData().getItemAt(k).getUri();
                } else if (dados.getData() != null) {
                    lista = new Uri[]{ dados.getData() };
                }
            }
            retornoArquivo.onReceiveValue(lista);
            retornoArquivo = null;
            return;
        }
        super.onActivityResult(pedido, resultado, dados);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle saida) {
        super.onSaveInstanceState(saida);
        if (web != null) web.saveState(saida);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    /** Ponte JavaScript → Android: salva arquivos baixados na pasta Downloads. */
    class Ponte {
        @JavascriptInterface
        public String salvar(String nome, String base64, String tipo) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, nome);
                    cv.put(MediaStore.Downloads.MIME_TYPE, (tipo == null || tipo.isEmpty()) ? "application/octet-stream" : tipo);
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) return "sem acesso a Downloads";
                    try (OutputStream os = getContentResolver().openOutputStream(u)) { os.write(bytes); }
                } else {
                    File pasta = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    try (FileOutputStream os = new FileOutputStream(new File(pasta, nome))) { os.write(bytes); }
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Salvo em Downloads: " + nome, Toast.LENGTH_LONG).show());
                return "ok";
            } catch (Exception e) {
                return String.valueOf(e.getMessage());
            }
        }
    }
}
`;
  T[WF] = `# Receita para o GitHub montar o APK — gerada pelo painel 📦 APK do Mini SK.
# Nada aqui esconde erro: se um passo falhar, fica VERMELHO e o painel mostra onde.
name: "📦 Gerar APK"

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - name: "1. Baixar o projeto"
        uses: actions/checkout@v4

      - name: "2. Conferir configuração"
        run: |
          test -f apk.config.json || { echo "::error::Falta o apk.config.json. Use 'Preparar arquivos' no painel 📦 APK."; exit 1; }
          test -f index.html || { echo "::error::Falta o index.html na raiz do projeto."; exit 1; }
          test -f android/app/build.gradle || { echo "::error::Falta a pasta android/. Use 'Preparar arquivos' no painel 📦 APK."; exit 1; }
          jq . apk.config.json

      - name: "3. Instalar Java 17"
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: "4. Instalar Gradle"
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: "8.7"

      - name: "5. Chave de assinatura (só na primeira vez)"
        run: |
          if [ -f android/release.keystore ]; then
            echo "Chave já existe — o APK novo instala por cima do antigo."
          else
            keytool -genkeypair -v -keystore android/release.keystore -alias app -keyalg RSA -keysize 2048 -validity 10000 -storepass minisk-apk -keypass minisk-apk -dname "CN=Mini SK, O=App, C=BR"
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add android/release.keystore
            git commit -m "Chave de assinatura do APK (não apagar)"
            git push
          fi

      - name: "6. Colocar o site dentro do APK"
        run: |
          mkdir -p android/app/src/main/assets/www
          rsync -a --exclude '.git' --exclude '.github' --exclude 'android' --exclude '.sk' --exclude 'apk.config.json' ./ android/app/src/main/assets/www/
          echo "Arquivos dentro do APK: $(find android/app/src/main/assets/www -type f | wc -l)"

      - name: "7. Montar o APK"
        working-directory: android
        run: gradle assembleRelease --no-daemon --stacktrace

      - name: "8. Dar nome ao APK"
        id: apk
        run: |
          NOME=$(jq -r '.arquivo' apk.config.json)
          VER=$(jq -r '.versao' apk.config.json)
          SAIDA="\${NOME}-v\${VER}.apk"
          cp android/app/build/outputs/apk/release/app-release.apk "$SAIDA"
          ls -la "$SAIDA"
          echo "arquivo=$SAIDA" >> "$GITHUB_OUTPUT"

      - name: "9. Guardar o APK"
        uses: actions/upload-artifact@v4
        with:
          name: apk
          path: \${{ steps.apk.outputs.arquivo }}
          if-no-files-found: error

      - name: "10. Link de download (Releases)"
        uses: softprops/action-gh-release@v2
        with:
          tag_name: apk-\${{ github.run_number }}
          name: "APK \${{ steps.apk.outputs.arquivo }}"
          files: \${{ steps.apk.outputs.arquivo }}
`;

  // ── Configuração ────────────────────────────────────────────────────────────
  const slug = (s) => String(s || 'app').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
  const pkgPart = (s) => { const x = slug(s).replace(/-/g, ''); return /^[a-z]/.test(x) ? x : 'a' + x; };
  function readCfg() {
    let c = {}; try { c = JSON.parse(fs().read('apk.config.json') || '{}'); } catch {}
    const P = fs().project;
    let titulo = ''; const idx = fs().read('index.html'); if (idx) { const m = /<title[^>]*>([^<]*)</i.exec(idx); if (m) titulo = m[1].trim(); }
    const nome = c.nome || titulo || (P ? P.name : 'Meu App');
    const owner = (SK.github.getLink() || {}).owner || (SK.github.user && SK.github.user.login) || (SK.pref.get('ghUser', null) || {}).login || 'meuapp';
    return {
      nome, arquivo: c.arquivo || slug(nome), pacote: c.pacote || ('com.' + pkgPart(owner) + '.' + pkgPart(nome)),
      versao: c.versao || '1.0', versaoCodigo: c.versaoCodigo || 1, cor: c.cor || '#0f1420', orientacao: c.orientacao || 'unspecified',
    };
  }
  function validPkg(p) { return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(p); }

  async function prepare(cfg) {
    const rep = [];
    if (!fs().exists('index.html')) throw new Error('O projeto precisa ter um index.html na raiz (a primeira página do app).');
    if (!validPkg(cfg.pacote)) throw new Error('O "nome do pacote" precisa ser assim: com.seunome.app (só letras minúsculas, números e pontos).');
    await SK.checkpoints.auto('Antes de preparar o APK');
    fs().write('apk.config.json', JSON.stringify(cfg, null, 2) + '\n', { silent: true }); rep.push('✅ apk.config.json (suas escolhas)');
    let n = 0;
    for (const [p, t] of Object.entries(T)) { if (fs().read(p) !== t) { fs().write(p, t, { silent: true }); n++; } }
    rep.push('✅ Projeto Android e receita do GitHub (' + n + ' arquivo(s) criados/atualizados)');
    // ícone do app
    const icon = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png';
    const own = ['icons/icon-192.png', 'icon-192.png', 'icons/maskable-192.png'].find((p) => fs().exists(p) && fs().get(p).b64);
    if (own) { fs().writeRecord(icon, Object.assign({}, fs().get(own))); rep.push('✅ Ícone do app: usei ' + own); }
    else {
      const cv = document.createElement('canvas'); cv.width = cv.height = 192;
      const c = cv.getContext('2d'); c.save(); SK.pwa.draw(c, 192, false); c.restore();
      const bytes = await new Promise((r) => cv.toBlob(async (b) => r(new Uint8Array(await b.arrayBuffer())), 'image/png'));
      fs().writeRecord(icon, { b64: fs().toBase64(bytes), enc: 'binário', size: bytes.length });
      rep.push('✅ Ícone do app: desenhei com o estilo da aba 📱 PWA → 🎨 Ícone (troque lá se quiser)');
    }
    SK.emit('fs-change', { type: 'import' });
    return rep;
  }

  // ── GitHub: enviar, mandar montar, acompanhar ───────────────────────────────
  const gh = (p, o) => SK.github.gh(p, o);
  async function repoOf() {
    const v = SK.$('#apk-repo', box).value.trim();
    const l = SK.github.getLink();
    if (!v && l) return l;
    return SK.github.resolveRepo(v || SK.github.repoSlug(fs().project.name) + '-app');
  }
  async function sendAndBuild() {
    if (!SK.github.token) throw new Error('Cole o token do GitHub no painel 🐙 GitHub primeiro (ele fica salvo).');
    const cfg = readCfg();
    if (!fs().exists('apk.config.json') || !fs().exists(WF)) await prepare(cfg);
    const r = await repoOf();
    const ens = await SK.github.ensureRepo(r, false);
    status((ens.created ? 'Repositório criado. ' : '') + 'Enviando o projeto para ' + r.owner + '/' + r.repo + '…');
    SK.$('#apk-repo', box).value = r.repo;
    await SK.github.push(r.owner, r.repo, r.branch || '', 'APK v' + cfg.versao + ' (Mini SK)', { mirror: true, includeSk: true });
    const info = await gh('/repos/' + r.owner + '/' + r.repo);
    const branch = r.branch || info.default_branch;
    status('Pedindo ao GitHub para montar…');
    const before = await lastRun(r);
    try {
      // logo após enviar, o GitHub pode levar alguns segundos para "ver" a receita nova
      for (let tent = 1; ; tent++) {
        try { await gh('/repos/' + r.owner + '/' + r.repo + '/actions/workflows/apk.yml/dispatches', { method: 'POST', body: { ref: branch } }); break; }
        catch (e) { if ((e.status === 404 || e.status === 422) && tent < 5) { status('Esperando o GitHub reconhecer a receita… (' + tent + ')'); await new Promise((ok) => setTimeout(ok, 4000)); continue; } throw e; }
      }
    } catch (e) {
      if (e.status === 403 || e.status === 404) throw new Error('O GitHub não deixou mandar montar (' + e.message + '). Dê ao token a permissão "Actions: Read and write", ou abra o repositório → aba Actions → "📦 Gerar APK" → "Run workflow".');
      throw e;
    }
    watch(r, before ? before.id : 0);
  }
  async function lastRun(r) {
    try { const d = await gh('/repos/' + r.owner + '/' + r.repo + '/actions/workflows/apk.yml/runs?per_page=1'); return d.workflow_runs[0] || null; }
    catch { return null; }
  }
  function stopWatch() { if (polling) { clearTimeout(polling); polling = null; } }
  function watch(r, afterId) {
    stopWatch();
    const started = Date.now();
    const tick = async () => {
      try {
        const run = await lastRun(r);
        if (!run || run.id === afterId) {
          if (Date.now() - started > 90000) { status('O GitHub ainda não começou. Confira a aba Actions do repositório.', 'error'); return; }
          status('Esperando o GitHub começar…'); polling = setTimeout(tick, 4000); return;
        }
        await showRun(r, run);
        if (run.status !== 'completed') polling = setTimeout(tick, 8000);
      } catch (e) { status('⚠ ' + e.message, 'error'); }
    };
    tick();
  }
  const ICON = { success: '✅', failure: '❌', cancelled: '⛔', skipped: '⏭', in_progress: '⏳', queued: '🕒', completed: '✅' };
  async function showRun(r, run) {
    const jobs = await gh('/repos/' + r.owner + '/' + r.repo + '/actions/runs/' + run.id + '/jobs');
    const job = jobs.jobs[0];
    const out = SK.$('#apk-run', box);
    const mins = Math.round(((run.status === 'completed' ? new Date(run.updated_at) : new Date()) - new Date(run.run_started_at || run.created_at)) / 60000);
    let html = '<div class="row wrap"><b>Montagem nº ' + run.run_number + '</b><span class="muted small">' + mins + ' min</span><a class="small" href="' + SK.esc(run.html_url) + '" target="_blank" rel="noopener">abrir no GitHub ↗</a></div>';
    if (job && job.steps) html += '<div class="apk-steps">' + job.steps.map((s) => '<div class="apk-step ' + (s.conclusion || s.status) + '">' + (ICON[s.conclusion] || ICON[s.status] || '•') + ' ' + SK.esc(s.name) + '</div>').join('') + '</div>';
    out.innerHTML = html;
    if (run.status !== 'completed') { status('⏳ Montando… (o primeiro APK leva uns 5–8 minutos; os próximos são mais rápidos)'); return; }
    if (run.conclusion === 'success') {
      status('✅ APK pronto!', 'ok');
      try {
        const rel = await gh('/repos/' + r.owner + '/' + r.repo + '/releases/tags/apk-' + run.run_number);
        const a = rel.assets && rel.assets[0];
        if (a) out.innerHTML += '<div class="apk-ok"><a class="btn primary" href="' + SK.esc(a.browser_download_url) + '" target="_blank" rel="noopener">⤓ Baixar ' + SK.esc(a.name) + ' (' + SK.bytes(a.size) + ')</a><p class="muted small">No celular: baixe, abra e permita "instalar apps desta fonte". Das próximas vezes, instala por cima.</p></div>';
      } catch { out.innerHTML += '<p class="small">Pronto — o APK está em <a href="' + SK.esc(run.html_url) + '" target="_blank">Artifacts</a> e na aba Releases do repositório.</p>'; }
      const key = 'apkBumped:' + r.owner + '/' + r.repo;
      if (SK.pref.get(key, 0) !== run.id) { SK.pref.set(key, run.id); bumpVersion(); }
      return;
    }
    status('❌ A montagem falhou. Veja abaixo o motivo.', 'error');
    const fail = job && job.steps ? job.steps.find((s) => s.conclusion === 'failure') : null;
    let text = 'Passo que falhou: ' + (fail ? fail.name : '(não identificado)') + '\n';
    try {
      const ann = await gh('/repos/' + r.owner + '/' + r.repo + '/check-runs/' + job.id + '/annotations');
      if (ann.length) text += '\nMensagens do GitHub:\n' + ann.map((a) => '- ' + a.message).join('\n') + '\n';
    } catch {}
    try {
      const res = await fetch('https://api.github.com/repos/' + r.owner + '/' + r.repo + '/actions/jobs/' + job.id + '/logs', { headers: { Authorization: 'Bearer ' + SK.github.token } });
      if (res.ok) {
        const log = (await res.text()).replace(/^\S+Z /gm, '');
        const lines = log.split('\n');
        const idx = lines.findIndex((l) => /FAILURE|error:|ERROR|Error:|Exception|\* What went wrong/.test(l));
        const piece = (idx >= 0 ? lines.slice(Math.max(0, idx - 15), idx + 45) : lines.slice(-60)).join('\n');
        text += '\nTrecho do registro (log):\n' + piece;
      }
    } catch { text += '\n(O registro completo está no link "abrir no GitHub".)'; }
    out.innerHTML += '<pre class="apk-err">' + SK.esc(text) + '</pre><div class="row wrap"><button class="btn small primary" id="apk-ai">🤖 Explicar com a IA</button><button class="btn small" id="apk-copy">Copiar erro</button></div>';
    SK.$('#apk-copy', box).onclick = () => SK.copy(text);
    SK.$('#apk-ai', box).onclick = () => {
      SK.app.openSide('ai');
      const inp = SK.$('#ai-in'); if (inp) { inp.value = 'A montagem do APK no GitHub Actions falhou. Explique em português simples o motivo e diga o que mudar (se for um arquivo do projeto, mande o arquivo corrigido com filepath).\n\n' + text.slice(0, 6000); inp.focus(); }
    };
  }
  function bumpVersion() {
    try {
      const c = JSON.parse(fs().read('apk.config.json') || '{}');
      const next = (c.versaoCodigo || 1) + 1;
      const parts = String(c.versao || '1.0').split('.'); parts[parts.length - 1] = String((+parts[parts.length - 1] || 0) + 1);
      c.versaoCodigo = next; c.versao = parts.join('.');
      fs().write('apk.config.json', JSON.stringify(c, null, 2) + '\n', { silent: true });
      fill();
      SK.$('#apk-note', box).textContent = 'A versão já foi aumentada para ' + c.versao + ' — o próximo APK instala por cima deste.';
    } catch {}
  }

  // ── Painel ──────────────────────────────────────────────────────────────────
  function status(msg, kind) { const el = SK.$('#apk-status', box); if (el) { el.textContent = msg; el.className = 'gh-status ' + (kind || ''); } }
  function build(container) {
    box = container;
    box.innerHTML =
      '<p class="muted small">Gera um <b>APK de verdade</b>: o seu HTML vai <b>dentro</b> do app e funciona sem internet. Quem monta é o GitHub (de graça) — você só aperta o botão.</p>' +
      '<input class="inp" id="apk-nome" placeholder="Nome do app (aparece embaixo do ícone)">' +
      '<label class="small muted">Nome do pacote (identidade do app — não mude depois de instalar)</label><input class="inp mono" id="apk-pacote" placeholder="com.maikon.meuapp">' +
      '<div class="row wrap"><label class="chk">Versão <input class="inp tiny" id="apk-ver" style="width:70px"></label><label class="chk">Nº <input class="inp tiny" id="apk-cod" type="number" min="1" style="width:64px"></label><label class="chk">Cor da barra <input type="color" id="apk-cor"></label></div>' +
      '<select class="inp" id="apk-ori"><option value="unspecified">Gira com o celular (retrato e paisagem)</option><option value="portrait">Só retrato (em pé)</option><option value="landscape">Só paisagem (deitado)</option></select>' +
      '<div class="row wrap"><button class="btn" id="apk-prep">🧰 Preparar arquivos</button><button class="btn primary" id="apk-go">📦 Enviar e gerar APK</button></div>' +
      '<div class="row"><input class="inp mono grow" id="apk-repo" placeholder="nome do repositório (ex.: meu-app) — cria se não existir"><button class="btn small" id="apk-check">Ver último</button></div>' +
      '<div id="apk-rep" class="pw-rep"></div><div class="gh-status" id="apk-status"></div><div id="apk-run" class="stack"></div><p class="muted small" id="apk-note"></p>' +
      '<details><summary class="small">O que cada coisa faz</summary><div class="small muted stack" style="margin-top:6px">' +
      '<div><b>Preparar arquivos</b>: cria <code>apk.config.json</code>, a pasta <code>android/</code> (app Android pequeno, em Java) e <code>.github/workflows/apk.yml</code>. Você pode ver e editar tudo na árvore.</div>' +
      '<div><b>Token</b>: o mesmo do painel 🐙 GitHub. Precisa de <b>Contents: Read and write</b> e <b>Actions: Read and write</b>.</div>' +
      '<div><b>Chave de assinatura</b>: o GitHub cria na primeira vez e guarda em <code>android/release.keystore</code>. Não apague — é ela que deixa o APK novo instalar por cima do antigo.</div>' +
      '<div><b>Importar arquivos e baixar</b> funcionam dentro do APK: o que você baixar vai para a pasta Downloads do celular.</div></div></details>';
    const $ = (s) => SK.$(s, box);
    const save = () => {
      const c = readCfg();
      Object.assign(c, { nome: $('#apk-nome').value.trim() || c.nome, pacote: $('#apk-pacote').value.trim().toLowerCase() || c.pacote, versao: $('#apk-ver').value.trim() || c.versao, versaoCodigo: Math.max(1, parseInt($('#apk-cod').value, 10) || c.versaoCodigo), cor: $('#apk-cor').value, orientacao: $('#apk-ori').value });
      c.arquivo = slug(c.nome);
      return c;
    };
    const run = async (fn) => { const bs = SK.$$('button', box); bs.forEach((b) => (b.disabled = true)); try { await fn(); } catch (e) { status('⚠ ' + e.message, 'error'); } finally { bs.forEach((b) => (b.disabled = false)); } };
    $('#apk-prep').onclick = () => run(async () => { const rep = await prepare(save()); $('#apk-rep').innerHTML = rep.map((x) => '<div>' + SK.esc(x) + '</div>').join(''); status('Arquivos prontos. Agora: "Enviar e gerar APK".', 'ok'); });
    $('#apk-go').onclick = () => run(async () => { const c = save(); await prepare(c); await sendAndBuild(); });
    $('#apk-check').onclick = () => run(async () => { const r = await repoOf(); const last = await lastRun(r); if (!last) { status('Nenhuma montagem encontrada nesse repositório.'); return; } await showRun(r, last); if (last.status !== 'completed') watch(r, -1); });
    fill();
  }
  function fill() {
    if (!box || !fs().project) return;
    const c = readCfg(); const $ = (s) => SK.$(s, box);
    $('#apk-nome').value = c.nome; $('#apk-pacote').value = c.pacote; $('#apk-ver').value = c.versao; $('#apk-cod').value = c.versaoCodigo; $('#apk-cor').value = /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : '#0f1420'; $('#apk-ori').value = c.orientacao;
    const l = SK.github.getLink(); $('#apk-repo').value = l ? l.repo : '';
  }
  SK.on('project-open', () => { stopWatch(); if (box) { fill(); SK.$('#apk-run', box).innerHTML = ''; SK.$('#apk-rep', box).innerHTML = ''; status(''); } });

  SK.apk = { build, prepare, templates: T, readCfg };
})(window.SK);
