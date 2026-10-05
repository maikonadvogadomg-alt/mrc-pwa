# Mini SK — editor modular ao vivo

Abra o **index.html**: no computador, com dois cliques; no celular, pelo navegador ou hospedado de graça (GitHub Pages ou Netlify).
Ele não usa Replit nem servidor. Também não depende de nenhuma biblioteca de fora: são só HTML, CSS e JavaScript.

## O que tem

| Botão | Para quê |
|---|---|
| ☰ | Árvore de arquivos. Cria arquivo ou pasta (＋📄 ＋📁). Importa arquivos, uma pasta inteira ou um .zip (⤒). Baixa o projeto em .zip (⤓). |
| ⋯ ao lado de cada arquivo (ou segurar o dedo) | Abrir, ver no preview, renomear, duplicar, mover, baixar, copiar o caminho, **analisar com a IA** e apagar. |
| Preview (embaixo) | Mostra o resultado ao vivo enquanto você digita (⚡). Para mudar o tamanho, arraste a barrinha ou use ▁ ▔. O botão ▤ abre o console de erros. Funciona com CSS, JS, imagens, módulos (`import`) e `fetch('dados.json')`. |
| 🔍 Buscar | Procura em todos os arquivos e destaca o que achou em amarelo. Tocar num resultado abre o arquivo no ponto certo. Também troca tudo de uma vez. |
| 🤖 IA | Aceita chave do Groq, Gemini (a antiga `AIza…` e a nova `AQ.…`), OpenRouter, Claude, OpenAI, xAI e outras. Quando o código vem com o nome do arquivo, o botão **Aplicar** grava direto nele. Tem 🎤 ditado e 🔊 voz. |
| ⌨️ Terminal | Terminal **ligado à árvore**: o que você cria aqui aparece em ☰ na hora. Funciona no celular, sem internet.<br>• `ls`, `cd`, `pwd`, `tree`, `cat`, `head`, `tail`, `wc`, `mkdir`, `touch`, `rm`, `mv`, `cp`, `echo texto > arquivo`, `grep`, `find`, `du`, `open`, `zip`.<br>• **`npm search pdf`** procura bibliotecas (como na Replit), com botão **＋ instalar**. Também tem `npm info`, `npm install`, `npm uninstall`, `npm ls` e `npm init`. Aqui o npm anota no `package.json`; os arquivos de verdade são baixados ao montar (GitHub, PC ou Termux).<br>• **`cdn nome`** dá a linha `<script>` para usar a biblioteca direto no HTML.<br>• **`run arquivo.js`** roda JavaScript do projeto ali mesmo.<br>• ↑ ↓ repetem comandos; Tab completa nomes; `&&` junta comandos. Antes de `rm` e `mv`, ele tira um 📸 checkpoint. |
| 🔗 Links | **Meus Links:** guarda os endereços dos seus PWAs e sites, que não somem.<br>• Cole **um ou vários links**, até um texto inteiro: ele acha os links e dá nome e ícone sozinho. Tem pastas, busca, 📋 copiar, ✏️ editar e 🗑 apagar.<br>• Vai junto para a sua conta (☁️), se a nuvem estiver ligada.<br>• **📲 Criar página no projeto** gera `meus-links/index.html`, só com os seus links, para instalar como app pelo 📱 PWA ou publicar no GitHub Pages.<br>• **💬 Colar conversa** (Monica, Claude, ChatGPT…): manda para o **✂️ Fatiador**, para o **🧩 Desembaralhar** ou só pega os links dela. |
| ▶️ Play | **Playground ao lado**, separado do projeto (não é a primeira tela).<br>• **HTML** (com abas CSS e JS), **React** e **Python**. O Python roda no próprio navegador, sem servidor.<br>• **Ao vivo** ou no ▶ Rodar. O console aparece embaixo e o ⛶ abre em tela cheia.<br>• Se você colar um código React ou Python, ele troca o modo sozinho.<br>• **💾 Salvos:** ficam guardados no aparelho, com procurar, abrir, renomear, duplicar e apagar.<br>• **⤒ Importar vários:** escolha vários .html de uma vez, ou um .zip com todos os seus códigos. Cada um vira um Salvo, e os repetidos são ignorados.<br>• **⤓ Cópia de segurança:** baixa todos os Salvos num .zip para guardar no Drive. Para voltar tudo, é só importar esse .zip.<br>• **Mais:** pegar o arquivo aberto, gravar no projeto (tira foto antes), abrir .html/.py, baixar e copiar.<br>React e Python precisam de internet na primeira vez para baixar o motor; HTML funciona sem internet. |
| 📸 Voltar | Checkpoints, que são fotos do projeto inteiro. Antes de apagar, importar, trocar tudo ou aplicar código da IA, ele tira uma foto sozinho. Na lista, você pode voltar, ver o que mudou ou baixar o .zip. |
| 🐙 GitHub | Cole o token uma vez: ele fica salvo e o painel mostra sempre **"Conectado como …"**.<br>• **Enviar:** escreva só o nome do repositório. Se não existir, ele cria.<br>• **Meus repositórios:** a lista aparece sozinha, com **Importar** ou **Puxar aqui**.<br>• **Importar por link** e **Publicar site (Pages)**.<br>• **⚙️ Execuções:** depois de enviar, ele acompanha sozinho o que o GitHub faz (teste, APK, site), passo a passo. Se falhar, mostra o motivo e tem **🤖 Explicar com a IA**. Também lista as receitas (workflows) do repositório, com **▶ Rodar** e **🗑 Tirar**.<br>O token precisa de **Workflows: Read and write** para enviar receitas. |
| ✂️ Fatiar | Divide um arquivo grande (JS, TS, TSX, HTML, CSS, Python, MD) em **blocos com índice**: imports, funções, componentes, tipos, estilos.<br>• Cada bloco mostra as linhas e **quem usa quem**.<br>• **✂️ por dentro** abre os blocos gigantes, como um componente de 3.000 linhas.<br>• Exporta em **MD**, **TXT** (o ⤵ Montar recria) e **HTML** com Copiar em cada bloco.<br>• **Criar módulos** e **🔗 Juntar** sempre **conferem**: juntando dá o original, letra por letra. |
| 🧪 API | Testa o **servidor do projeto** rodando no seu PC (ex.: `http://localhost:8080`).<br>• **Procurar rotas:** lê o código e lista as rotas do servidor e as chamadas que a tela faz. Marca **"rota não achada"** quando a tela chama algo que o servidor não tem, que é o jeito de achar onde quebrou.<br>• **Enviar** (GET/POST/…) mostra o status, o tempo e a resposta.<br>• **Testar todas as GET** testa uma por uma (✅/❌).<br>• **🤖 Perguntar à IA** manda o resultado para a IA explicar. |
| 📦 APK | Gera um **APK de verdade**: o HTML vai **dentro** do app e funciona sem internet. Não é a "casca" TWA.<br>1. **Preparar arquivos** cria `apk.config.json`, a pasta `android/` e `.github/workflows/apk.yml`.<br>2. **Enviar e gerar** envia ao GitHub e manda montar.<br>3. O painel acompanha cada passo (✅ ❌ ⏳). Se der certo, mostra o botão de baixar; se der erro, mostra o motivo e o botão **🤖 Explicar com a IA**.<br>A chave de assinatura fica guardada, então o APK novo instala por cima do antigo. |
| 🧬 Raio-X | Lê **todos** os package.json, inclusive dos projetos da Replit com vários projetos dentro (monorepo).<br>• Explica cada dependência em português: para que serve, se é obrigatória ou só para montar, se é coisa da Replit.<br>• Gera o **plano completo** (baixar .md, copiar ou salvar), o package.json unificado e as pastas vazias em .bat.<br>• **📦 Pacote para a IA:** junta os arquivos importantes num .txt para mandar no chat.<br>• **⤵ Montar:** cola um texto com `===== ARQUIVO: caminho =====` e ele cria os arquivos.<br>• **🧩 Conversa sem marcação:** para conversas copiadas do app de IA em que o código veio sem ```. Ele separa o texto do código e recupera cada arquivo:<br>&nbsp;&nbsp;– páginas inteiras;<br>&nbsp;&nbsp;– "montagens" (PARTE 1, 2, 3…) já na estrutura de pastas certa;<br>&nbsp;&nbsp;– trechos soltos;<br>&nbsp;&nbsp;– versões (v1, v2…), com a mais recente marcada. |
| 📱 PWA | **🎨 Ícone:** o seu Gerador de Ícones PRO, agora com a versão *maskable* (que o Android recorta sem cortar o desenho), SVG, favicon.ico e apple-touch-icon. Grava em `icons/` ou baixa em .zip.<br>**📲 Instalável:** escolha a página. Ele cria o que faltar (ícones, manifest e service worker com a lista de arquivos feita sozinha) e arruma o `<head>` sem duplicar nada.<br>**🧭 Hub:** acha todas as páginas .html do projeto, sem você digitar endereço, e **gera o index do Hub já montado**, com a lista gravada dentro. Instalou uma vez, está tudo lá, em qualquer celular. |
| ⚙️ Config | **Conta, chaves e backup na nuvem (Supabase)**, tudo lá dentro, nunca na tela de entrada.<br>• **Tela de entrada** só com e-mail e senha, **Criar conta** e **Esqueci a senha** (chega um link por e-mail). Sem internet, entra com a mesma senha e usa o que está no aparelho.<br>• **🔑 Cofre de chaves:** as chaves de IA, o token do GitHub e **"Minhas chaves e links"** (link do Neon, DataJud…) ficam guardados **na sua conta**. Entrou em outro aparelho, já está tudo lá. Cada chave tem 👁 ver, 📋 copiar e ✏️ editar.<br>• **☁️ Backup:** guarda sozinho o projeto aberto e os Salvos do Playground. A lista "Projetos na nuvem" tem **⤓ Abrir** para trazer de volta.<br>• **Ligação com a nuvem (uma vez só):** cole o Project URL e a chave **anon public** do Supabase, copie o **SQL** e rode uma vez no Supabase (cria só a tabela `minisk_dados`, sem mexer nas outras). O botão **⤓ config.js** gera o arquivo para o Mini SK publicado já vir ligado.<br>Sem configurar nada, o Mini SK funciona como antes, só no aparelho. |
| 🗂 Projetos | Vários projetos: abrir um .zip como projeto novo, renomear e apagar. Também mostra o espaço usado e os atalhos. |

## Cérebro da IA (para ela não se perder)
Cada projeto tem uma pasta `.sk/` com dois arquivos:
- `.sk/diario.md` é o resumo do projeto: o objetivo, o que já funciona e o que falta. A IA lê esse arquivo em toda mensagem e o atualiza quando termina algo.
- `.sk/memoria.json` guarda a conversa daquele projeto.

**💰 Gasto:** embaixo de cada resposta aparece ↑ tokens enviados · ↓ tokens recebidos · custo em reais. Na linha 💰 do painel ficam o total de hoje e do mês; tocando nela você define o **limite do mês**, o **aviso antes de pedido caro**, a cotação do dólar e preços próprios. Groq e Gemini (cota grátis) aparecem como grátis. Se a resposta parar no meio, aparece **▶ Continuar de onde parou**.

O medidor de tokens mostra quanto está sendo enviado. Quando passa do limite escolhido, as mensagens antigas ficam de fora, mas o diário continua sendo enviado.

## Codificação e tipos
Ao importar, ele reconhece UTF-8, UTF-16 e Windows-1252 (o "Latin-1" de arquivos antigos do Windows), para os acentos não virem lixo. Arquivos binários, como imagens, PDF e APK, são guardados intactos. A barra de baixo do editor mostra o tipo do arquivo (HTML, JS, Java, JSON…), a codificação e o tamanho.

## Onde ficam os arquivos
Os projetos ficam **no navegador deste aparelho** (IndexedDB) e continuam lá quando você fecha.
Para não perder nada:
- baixe o .zip (⤓) de vez em quando, **ou**
- envie para o GitHub (🐙).

Limpar os dados do navegador apaga os projetos.

## Links entre páginas no preview
Se uma página tem link para outra do projeto (ex.: `<a href="peticao/index.html">`), clicar no preview abre essa outra página ali mesmo.

## Atalhos (no computador)
| Atalho | Faz |
|---|---|
| Ctrl+S | Salvar |
| Ctrl+B | Abrir ou fechar os arquivos |
| Ctrl+Shift+F | Buscar |
| Ctrl+J | IA |
| Ctrl+G | Ir para uma linha |
| Ctrl+Enter | Enviar para a IA |
| Alt+P | Aumentar ou diminuir o preview |

## Módulos (pasta `js/`)
Cada arquivo faz uma coisa. Eles conversam por eventos (`SK.on` / `SK.emit`), então dá para trocar um módulo sem quebrar os outros.

| Arquivo | Cuida de |
|---|---|
| config.js | ligação com o Supabase (opcional; só URL e chave pública) |
| 00-core.js | base, avisos, janelas, banco do navegador |
| 04-conta.js | 🔐 entrada com senha, conta, sessão, nuvem (sem biblioteca) |
| 10-fs.js | arquivos, pastas, projetos, codificação, importar e exportar |
| 20-zip.js | ler e criar .zip (sem biblioteca) |
| 30-highlight.js | cores do código |
| 40-editor.js | editor e abas |
| 50-tree.js | árvore de arquivos |
| 60-preview.js | preview ao vivo e console |
| 70-search.js | buscar e trocar |
| 80-ai.js | IA, chaves, memória, tokens |
| 81-gasto.js | 💰 gasto da IA: tokens, custo, limite do mês |
| 85-checkpoints.js | checkpoints |
| 86-terminal.js | ⌨️ terminal ligado à árvore, npm search |
| 87-links.js | 🔗 Meus Links, página dos links, colar conversa |
| 89-config.js | ⚙️ Configuração: conta, cofre de chaves, backup |
| 90-github.js | GitHub |
| 91-acoes.js | Execuções no GitHub (Actions): acompanhar, rodar, tirar receita |
| 92-playground.js | Playground (HTML, React, Python) e salvos |
| 93-conversa.js | Desembaralhar conversa (código sem marcação) |
| 94-fatiador.js | Fatiador: blocos, índice, módulos, juntar |
| 95-pwa.js | ícones, instalar como app, Hub |
| 96-apk.js | APK Android pelo GitHub (projeto Android em Java + receita) |
| 97-analise.js | Raio-X: dependências, plano, pacote para IA, montar de texto |
| 98-api.js | Testar a API do projeto (rotas, chamadas, pedidos) |
| 99-app.js | junta tudo e monta a tela |

## Próximos passos planejados
- 🔗 Ponte com o Termux/PC para rodar Node de verdade.
