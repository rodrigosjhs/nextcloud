# Intranet Log.lab | SARA (Nextcloud)

Este repositório contém uma instância **Nextcloud** (alvo atual: **33.x**) com o tema customizado **Log.lab | SARA**, implementado como aplicação `loglab_theme`. Este documento é orientado a **DevOps** e a quem precisa **subir o ambiente do zero**, incluindo o layout visual acordado (sidebar escura, barra superior, área de conteúdo clara, menu de apps vertical, integração com navegação dos apps Vue).

---

## 1. O que você está implantando

| Componente | Descrição |
|------------|-----------|
| **Nextcloud** | Plataforma de ficheiros/colaboração em `NEXTCLOUD/`. |
| **`loglab_theme`** | App em `NEXTCLOUD/apps/loglab_theme/`: CSS/JS + listeners PHP que injetam o tema em páginas de utilizador e de login. |
| **Base de dados** | MySQL/MariaDB (obrigatório para instalação completa). |
| **Opcional** | API externa de login configurável (`loglab_auth_login_url` no `config.php`) — usada pelo fluxo de login customizado do tema. |

O tema **não** é só “ficheiros estáticos”: há **PHP** (eventos `BeforeTemplateRendered` / `BeforeLoginTemplateRendered`) e **JavaScript** que corrigem layout face ao Vue do Nextcloud (menus, navegação lateral dos apps, etc.).

---

## 2. Estrutura de pastas (o que importa para deploy)

```
INTRANET/
├── README.md                      ← este ficheiro
├── docker-compose.nextcloud.yml   ← exemplo Docker (MariaDB + Nextcloud)
└── NEXTCLOUD/                     ← código Nextcloud + dados (ajuste em produção)
    ├── apps/
    │   └── loglab_theme/          ← tema Log.lab (OBRIGATÓRIO para o layout SARA)
    ├── config/
    │   └── config.php             ← configuração da instância (gerado / mantido por vocês)
    ├── data/                      ← ficheiros dos utilizadores (volume persistente)
    ├── router-dev.php             ← router para servidor embutido PHP (desenvolvimento)
    └── index.php
```

**Em produção**, trate `NEXTCLOUD/data/` e `NEXTCLOUD/config/config.php` como **dados persistentes** (backups, permissões, segredos).

---

## 3. Pré-requisitos

- **PHP** compatível com a versão do Nextcloud (para NC 33, tipicamente **PHP 8.2+**).
- Extensões PHP habituais do Nextcloud: `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `iconv`, `json`, `libxml`, `mbstring`, `openssl`, `pdo_mysql`, `posix`, `session`, `simplexml`, `xmlreader`, `xmlwriter`, `zip`, `zlib`.
- **MariaDB ou MySQL**.
- (Opcional) **Docker** + Docker Compose, se for o modelo de deploy.
- Servidor web (**Apache** com `mod_rewrite` ou **Nginx** com regras oficiais Nextcloud) **ou**, só para desenvolvimento, o **servidor embutido do PHP** com o router indicado abaixo.

---

## 4. Subir do zero — visão geral do fluxo

1. Disponibilizar o código (clone artefacto) com `NEXTCLOUD/` completo e **`NEXTCLOUD/apps/loglab_theme/`** presente.
2. Criar base de dados e utilizador SQL dedicados ao Nextcloud.
3. Garantir permissões corretas no filesystem (utilizador do PHP/webserver com escrita em `data/`, `config/`, `apps/` se necessário).
4. Completar instalação Nextcloud (**instalador web** ou **`occ maintenance:install`**).
5. Ativar a app do tema: **`occ app:enable loglab_theme`**.
6. Ajustar `config.php`: `trusted_domains`, `overwrite.cli.url`, URLs de confiança atrás de proxy (se aplicável).
7. (Opcional) Configurar `loglab_auth_login_url` se usarem login integrado com API externa.
8. Em produção: **`'debug' => false`**, cache/opcache ativos, HTTPS, backups.

Os passos 4–6 são detalhados nas secções seguintes.

---

## 5. Modo A — Desenvolvimento local (PHP embutido + MySQL)

Útil para máquinas de desenvolvimento. O projeto já inclui um **router** para o servidor embutido do PHP encaminhar todos os pedidos para o Nextcloud (sem isto, rotas como `/apps/...` quebram).

### 5.1. Base de dados

Crie a base e o utilizador (exemplo):

```sql
CREATE DATABASE nextcloud CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'nextcloud'@'%' IDENTIFIED BY 'ALTERE_ESTA_PASSWORD';
GRANT ALL PRIVILEGES ON nextcloud.* TO 'nextcloud'@'%';
FLUSH PRIVILEGES;
```

### 5.2. Ficheiro `config/config.php`

- Na **primeira instalação**, o ficheiro pode ainda não existir: o assistente web cria-no.
- Se copiar de outro ambiente, **revise**:
  - `datadirectory` — caminho absoluto correto no servidor.
  - `dbhost`, `dbname`, `dbuser`, `dbpassword`.
  - `trusted_domains` — hostname(s) e portas que os utilizadores usam no browser.
  - `overwrite.cli.url` — URL base (ex.: `https://intranet.empresa.com`).

**Não commitem** `config.php` com passwords reais em repositórios públicos. Use variáveis/secrets no pipeline.

### 5.3. Arrancar o PHP (com router)

Na raiz do código Nextcloud:

```bash
cd NEXTCLOUD
php -S 0.0.0.0:8080 router-dev.php
```

Abra no browser `http://localhost:8080` (ou o host/porta que configurou) e conclua o assistente de instalação, **ou** use `occ` (secção 5.5).

### 5.4. Permissões (Linux)

O utilizador que corre o PHP precisa de escrever em `data/` e em `config/`. Exemplo (ajuste utilizador/grupo ao vosso SO):

```bash
chown -R www-data:www-data NEXTCLOUD/data NEXTCLOUD/config
find NEXTCLOUD/data -type d -exec chmod 750 {} \;
find NEXTCLOUD/data -type f -exec chmod 640 {} \;
```

### 5.5. Instalação por linha de comando (`occ`)

Com o webserver/PHP a conseguir aceder ao código e à BD:

```bash
cd NEXTCLOUD
sudo -u www-data php occ maintenance:install \
  --database "mysql" \
  --database-name "nextcloud" \
  --database-user "nextcloud" \
  --database-pass "ALTERE_ESTA_PASSWORD" \
  --database-host "127.0.0.1" \
  --admin-user "admin" \
  --admin-pass "ALTERE_ADMIN_PASSWORD" \
  --data-dir "/caminho/absoluto/para/NEXTCLOUD/data"
```

Depois:

```bash
sudo -u www-data php occ app:enable loglab_theme
sudo -u www-data php occ maintenance:mode --off
```

### 5.6. Ativar o tema Log.lab

```bash
sudo -u www-data php occ app:enable loglab_theme
sudo -u www-data php occ app:list | grep loglab
```

Se a app não aparecer, confirme que existe a pasta `apps/loglab_theme/` com `appinfo/info.xml` e que o servidor lê essa árvore.

---

## 6. Modo B — Docker Compose (exemplo no repositório)

Existe o ficheiro `docker-compose.nextcloud.yml` na raiz do repositório com um exemplo **MariaDB + imagem oficial Nextcloud**.

### 6.1. Atenção ao volume da aplicação

O exemplo usa um volume nomeado em `/var/www/html`. Num **primeiro `up`**, isso corresponde ao conteúdo da imagem Docker, **não** automaticamente ao vosso `NEXTCLOUD/` do Git.

Para usar **este código** (com `loglab_theme`) dentro do container, habitualmente faz-se **bind mount** do diretório local para `/var/www/html`, por exemplo:

```yaml
services:
  nextcloud:
    volumes:
      - ./NEXTCLOUD:/var/www/html
```

(Ajustem caminhos relativos ao `docker-compose.yml`.)

### 6.2. Subir

```bash
docker compose -f docker-compose.nextcloud.yml up -d
```

### 6.3. Trusted domains e `occ` dentro do container

```bash
docker exec -u www-data nextcloud php occ config:system:set trusted_domains 0 --value="localhost"
docker exec -u www-data nextcloud php occ config:system:set trusted_domains 1 --value="o-vosso-dominio.tld"
docker exec -u www-data nextcloud php occ app:enable loglab_theme
```

### 6.4. Login externo (opcional)

Se o login customizado chamar um serviço no **host** (fora do container), em Docker Desktop costuma funcionar `host.docker.internal`. Exemplo (do próprio compose comentado):

```bash
docker exec -u www-data nextcloud php occ config:system:set loglab_auth_login_url \
  --value="http://host.docker.internal:3001/auth/login"
```

Em Linux, o `extra_hosts` no compose já inclui `host.docker.internal` via `host-gateway`.

---

## 7. Configurações relevantes ao tema e login

| Chave / ação | Finalidade |
|--------------|------------|
| `loglab_auth_login_url` | URL da API de autenticação externa usada pelo fluxo de login do tema (se aplicável ao vosso ambiente). |
| `'debug' => true` | Apenas desenvolvimento: facilita ver alterações de CSS/JS; **desativar em produção**. |
| `overwrite.cli.url` | Evita links errados em CLI/notificações quando há HTTPS ou subpath. |
| `trusted_proxies` / `overwriteprotocol` | Obrigatório atrás de reverse proxy/load balancer (HTTPS terminado no proxy). |

Documentação oficial Nextcloud: [Administration manual](https://docs.nextcloud.com/server/latest/admin_manual/).

---

## 8. O que o layout Log.lab | SARA altera (resumo para DevOps)

- **Cabeçalho e sidebar esquerdos** escuros; **área principal** clara (tokens CSS próprios).
- **Menu de aplicações** (Painel, Arquivos, …) em formato de lista vertical na sidebar, com ícones e texto.
- **Logo** de login reutilizada na sidebar (`apps/loglab_theme/img/logo.png`).
- **Correções de layout** para `NcAppNavigation` (Vue) e `#content` / `#content-vue`, para o menu interno dos apps (ex.: Arquivos) ficar **ao lado** da sidebar Log.lab e não “por trás”.
- **JavaScript** (`apps/loglab_theme/js/loglab.js`): observadores de DOM, estado da sidebar colapsável (localStorage), patches de estilo inline onde o CSS do Nextcloud/Vue ganha na cascata.
- **Login**: ficheiros separados `loglab-login.css` / `loglab-login.js` registados no listener de login.

**Não há** um único “interruptor” no painel Nextcloud que reproduza todo este pacote: o comportamento depende da app **`loglab_theme`** estar **instalada e ativa**.

---

## 9. Verificação pós-deploy (checklist)

- [ ] Login carrega sem erros 500; assets `loglab_theme` devolvem 200 (inspecionar rede no browser).
- [ ] `occ app:list` contém `loglab_theme` **enabled**.
- [ ] Sidebar esquerda com fundo escuro e lista de apps; conteúdo principal claro.
- [ ] Abrir **Arquivos** e **Configurações**: navegação lateral do app visível ao lado da sidebar Log.lab (sem sobreposição incorreta).
- [ ] HTTPS e `trusted_domains` corretos em produção.
- [ ] `'debug' => false` e backups de `data/` + `config/`.

---

## 10. Problemas frequentes

| Sintoma | O que verificar |
|---------|------------------|
| CSS/JS do tema não aplica | Cache do browser; `debug` true; `occ maintenance:repair`; app `loglab_theme` ativa. |
| 404 em `/apps/...` com `php -S` | Usar sempre `router-dev.php` como router (secção 5.3). |
| Menu dos apps “atrás” da sidebar | Garantir versão do tema atualizada; `#content` com `position: relative` (já no tema); limpar cache. |
| Erro de BD | `dbhost` acessível do container/host; credenciais; charset utf8mb4. |

---

## 11. Referências úteis

- [Nextcloud Server](https://github.com/nextcloud/server)
- [Administração — instalação](https://docs.nextcloud.com/server/latest/admin_manual/installation/)
- [OCC commands](https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html)

---

## 12. Documentação dentro de `NEXTCLOUD/`

O ficheiro `NEXTCLOUD/README.md` remete a **este** README na raiz do repositório, para não haver duas fontes de verdade.

---

*Documentação gerada para o projeto **Log.lab | SARA** — Intranet Nextcloud.*
