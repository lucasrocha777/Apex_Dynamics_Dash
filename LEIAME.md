# Apex Dash · demonstração em sala (Vite + Vercel)

O painel do Apex Dash v2 roda no celular, em tela cheia e na horizontal. Pelo PC, vocês disparam as situações (óleo esquentando, água, turbo, combustível) e o celular reage em cerca de 1 segundo.

- **Celular (painel):** `/` (o QR do controle já leva o código da sala)
- **PC (controle):** `/controle.html`

## 1. Rodar no seu PC (cada integrante da equipe)

Precisa do **Node.js 20.19+ ou 22.12+** (baixe a versão LTS em nodejs.org). Para conferir: `node -v`.

```bash
cd apex-dash-sala
npm install        # só na primeira vez (baixa o Vite)
npm run dev
```

O terminal mostra dois endereços:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.0.10:5173/
```

1. No PC, abra **http://localhost:5173/controle.html**.
2. No celular, **no mesmo Wi-Fi**, escaneie o QR do controle. O controle descobre sozinho o endereço de rede do PC para montar o QR.
3. Salvou um arquivo em `src/`, `index.html` ou `controle.html`? A página recarrega sozinha, no PC e no celular.

Se o celular não abrir:
- **Windows:** na primeira vez, o Firewall pergunta se o Node pode usar a rede. Marque **Redes privadas** e permita.
- **Wi-Fi da faculdade:** muitas redes isolam os aparelhos entre si. Use o **roteador do celular** (hotspot) e conecte o PC nele.
- Confira se o QR mostra o mesmo endereço **Network** do terminal. Se não mostrar, digite esse endereço no campo **Endereço do site para o celular**.

Cada PC tem as próprias salas, na memória. O celular precisa abrir o link do PC que vai controlá-lo.

### Ver a versão final antes de subir

```bash
npm run preview    # gera dist/ e serve em http://localhost:4173, como ficará na Vercel
```

Se funciona no `preview`, funciona na Vercel.

### Sem npm install (plano B)

`node server.js` serve os arquivos direto, sem Vite, em http://localhost:3000. Não recarrega sozinho, mas não precisa baixar nada.

## 2. Estrutura

```
apex-dash-sala/
├── index.html              painel (celular): só a marcação
├── controle.html           controle remoto (PC): só a marcação
├── src/
│   ├── painel.js / painel.css       simulação, alertas, tela cheia
│   ├── controle.js / controle.css   botões, QR, estado do painel, espelho
│   ├── layout.js                    regras do layout personalizável (grade, tamanhos, modelos)
│   └── link.js                      conexão com o backend (usada pelos dois)
├── public/                 manifest e ícones (copiados como estão)
├── api/sala.js             backend na Vercel (função serverless)
├── lib/
│   ├── sala.js             regras do backend: salas, comandos, estado (memória ou Redis)
│   └── api-middleware.js   o mesmo backend dentro do Vite (dev e preview) e do server.js
├── vite.config.js          duas páginas + plugin que liga a API ao Vite
├── vercel.json             diz à Vercel: Vite, build "npm run build", saída "dist"
├── server.js               servidor sem Vite (plano B e Render)
└── .env.example            variáveis opcionais do Redis
```

Na primeira vez que alguém rodar `npm install`, aparece o arquivo `package-lock.json`. Coloquem esse arquivo no repositório, assim todos usam as mesmas versões.

## 3. Como funciona

1. O controle cria uma **sala** com código de 4 letras (ex.: `K7Q2`) e mostra um QR com o link do painel.
2. O controle envia cada comando com `POST /api/sala?code=K7Q2&op=cmd`.
3. O celular consulta `GET /api/sala?code=K7Q2&op=poll` a cada 0,4 s e executa os comandos novos. A simulação roda no próprio celular, como no protótipo.
4. O celular publica o que está mostrando (`op=status`), e o controle exibe isso em **No painel agora**.

| Método | Rota | Quem usa | O que faz |
|---|---|---|---|
| POST | `/api/sala?code=K7Q2&op=cmd` | controle | envia `{t:"cmd", a:"sim", v:"oil"}` (ou `ping`) |
| GET | `/api/sala?code=K7Q2&op=poll&since=N` | painel e controle | comandos com número maior que N + último estado do painel |
| POST | `/api/sala?code=K7Q2&op=status` | painel | alertas ativos, carro, tela cheia (a cada mudança e a cada 8 s) |
| GET | `/api/rede` | controle (só no PC) | endereços de rede do PC, para o QR |

Comandos (`a`): `sim` (`water`, `oil`, `boost`, `fuel`, `clear`), `ack`, `car` (`track`, `parked`), `amb` (0–100), `five` (true/false), `reboot`. Cada sala expira 6 h depois do último uso e guarda só os 50 últimos comandos.

## 4. Publicar na Vercel

1. Suba a pasta para um repositório no GitHub (sem `node_modules` e sem `dist`; o `.gitignore` já cuida disso). As pastas `src/`, `api/` e o `package.json` devem ficar na **raiz** do repositório.
2. Na Vercel: **Add New → Project** → importe o repositório. O `vercel.json` já configura o Vite; é só clicar em **Deploy**.
3. **Ligue o Redis:** no projeto, aba **Storage** (ou Marketplace) → **Upstash for Redis** → plano gratuito → conecte ao projeto. Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`. Sem o Redis, cada pedido pode cair numa cópia diferente da função e a sala se perde.
4. Em **Deployments**, faça **Redeploy**.
5. Abra `https://SEU-PROJETO.vercel.app/controle.html`. Em **Painel no celular** deve aparecer **Armazenamento: Redis**.

Cada push no GitHub publica de novo sozinho. Branches diferentes da principal ganham um link de prévia, bom para a equipe revisar antes.

Para testar no PC com o **mesmo Redis da Vercel**: copie `.env.example` para `.env.local` e preencha (ou rode `npx vercel env pull .env.local`). O `npm run dev` passa a usar o Redis.

## 5. Roteiro da demonstração

1. **Antes da aula:** abra o controle e clique em **Testar conexão**.
2. O professor escaneia o QR com a câmera do celular.
3. Ele toca em **Ligar em tela cheia** (ou na tela de abertura) e deita o celular.
   - **Android (Chrome):** entra em tela cheia e trava na horizontal.
   - **iPhone:** o Safari não deixa sites entrarem em tela cheia. Use **Compartilhar → Adicionar à Tela de Início** e abra pelo ícone. A chave de silencioso corta os bipes.
4. No PC, aperte **Óleo esquentando** (ou a tecla `2`). Em uns 12 s aparece a faixa âmbar de atenção; uns 10 s depois, o crítico vermelho, com moldura pulsante e tom contínuo.
5. **Botão no volante** (ou `Espaço`): o tom vira lembrete, mas o alerta continua na tela.
6. **Voltar ao normal** (`0`), depois **Parado** (`P`). O professor toca num quadro do celular e muda o que ele mostra, o tamanho ou o lugar (veja abaixo).
7. Pelo controle, em **Layout do painel**, dá para trocar de modelo (Padrão, Corrida, Essencial). Teste também com o carro **em pista**: o pedido é recusado, porque o layout só muda parado.

Teclas no controle: `1` água · `2` óleo · `3` turbo · `4` combustível · `0` normal · `Espaço` reconhecer · `P` parado/em pista.

**Espelho:** a caixa **Mostrar espelho aqui** coloca uma cópia do painel no controle, para projetar para a turma.

**Plano B sem internet:** abra o painel no próprio PC ligado ao projetor e use as mesmas teclas direto nele (`F` para tela cheia).

Observação: o protótipo mede a **temperatura** do óleo, não a pressão. O botão **Óleo esquentando** dispara o alerta de óleo.

## 6. Personalizar o painel (só com o carro parado)

Com o carro parado, a faixa do topo avisa: **"PARADO · TOQUE NUM QUADRO PARA AJUSTAR"**. Também dá para entrar por **Ajustes → Editar layout**.

- **Alça entre dois quadros** (modo de edição): arraste para cima ou para baixo para redimensionar. Ela encaixa em Compacto, Padrão ou Grande, e a dica no centro mostra o resultado enquanto você arrasta. Não aparece em colunas com 3 quadros compactos: ali qualquer aumento tiraria alguém da tela, então o tamanho muda pelo ajuste, que avisa antes.
- **Tocar num quadro** abre o ajuste daquele lugar, cobrindo o centro e a outra coluna. A coluna editada continua à vista e mostra a mudança na hora.
  - **O que mostrar:** Água, Óleo, Turbo, Combustível, Tempo de volta ou Vazio. Se o item já estiver em outro lugar, os dois trocam.
  - **Tamanho deste lugar:** Compacto, Padrão, Grande ou Coluna inteira. Cada opção mostra uma miniatura e, **antes** do toque, o que vai acontecer com os vizinhos ("Óleo fica compacto", "Turbo sai da tela").
  - **Mover para outro lugar:** depois, um toque no destino. **Arrastar** um quadro até outro faz o mesmo (atalho para quem já conhece).
- **Modelos:** Padrão, Corrida (motor compacto à esquerda, volta grande à direita) e Essencial (três itens grandes).
- **Desfazer** (até 30 passos) e **Concluir**. Tudo fica salvo no aparelho.

O que muda com o tamanho:

| Tamanho | Altura | Mostra |
|---|---|---|
| Compacto | 2 de 6 | nome, valor (52 px) e barra. Em alerta, a etiqueta ATENÇÃO/CRÍTICO ocupa o lugar do nome; o ícone continua |
| Padrão | 3 de 6 | igual à v2 |
| Grande | 4 de 6 | valor de 84 px, limites de atenção e crítico, máximo da sessão (no combustível: quantas voltas ainda dá) |
| Coluna inteira | 6 de 6 | tudo do Grande + tendência dos últimos 90 s com as linhas dos limites (na volta: as 5 últimas voltas) |

Regras que **não** mudam: centro (marcha, rotação, velocidade, delta) e faixa de alertas fixos; nada fora da grade; vazio não desloca vizinhos; no máximo 3 itens por coluna; textos em movimento com pelo menos 25 px e alertas com 31 px; alerta de item que não está na tela continua na faixa.
