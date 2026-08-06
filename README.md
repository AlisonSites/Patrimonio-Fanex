# Sistema de Controle de Patrimônio Escolar

Site em React + Vite + Supabase para gestão do patrimônio da escola, com Dashboard, cadastros (Patrimônio, Tipo, Unidade, Setor, Responsável, Fornecedor) e Relatórios exportáveis em CSV e PDF.

Cores do projeto: `#000045` (azul, predominante), `#FF5400` (laranja, destaque), `#FFFFFF` (branco).

---

## 1. Passo a passo no Supabase

### 1.1. Rodar o script SQL
1. Acesse [supabase.com](https://supabase.com) e entre no seu projeto (`imhgfjvtekpqyqbvrgii`).
2. No menu lateral, clique em **SQL Editor** → **New query**.
3. Abra o arquivo `supabase_schema.sql` (incluído neste pacote), copie todo o conteúdo e cole no editor.
4. Clique em **Run**. Isso vai criar:
   - As tabelas: `tipos`, `unidades`, `setores`, `responsaveis`, `fornecedores`, `patrimonios`.
   - Os índices e o trigger de `updated_at`.
   - As políticas de RLS (Row Level Security) liberando leitura/escrita para a chave pública do site.
   - O bucket de Storage `notas-fiscais` (para anexar os arquivos das notas fiscais) e suas políticas de acesso.
   - Alguns tipos e unidades de exemplo (pode apagar depois pela própria tela de cadastro).

### 1.2. Conferir as tabelas
Vá em **Table Editor** e confira se apareceram as 6 tabelas listadas acima.

### 1.3. Conferir o Storage
Vá em **Storage** e confira se o bucket `notas-fiscais` foi criado.

### 1.4. Chaves de API usadas pelo site
O site usa a **Publishable Key** (chave pública), que já está configurada no arquivo `.env`:

```
VITE_SUPABASE_URL=https://imhgfjvtekpqyqbvrgii.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_LFSP9RVCzARNS70cQryfzA_TqwO2g8v
```

> ⚠️ **Importante sobre a chave secreta (`sb_secret_...`)**: essa chave dá acesso total ao banco, ignorando qualquer regra de segurança. **Ela nunca deve ser usada no site (frontend)**, pois qualquer pessoa que abrir o código do navegador conseguiria vê-la. Por isso ela **não foi incluída** no projeto. Guarde-a em local seguro — ela só deve ser usada em automações de servidor (ex: scripts de backend, funções do Supabase), nunca em React/JS que roda no navegador.

### 1.5. Sobre segurança (RLS)
Como é um sistema interno (sem tela de login), o script libera todas as operações (ler, criar, editar, excluir) para quem tiver a chave pública — que é a mesma usada pelo site. Isso é adequado para uso dentro da escola. Se no futuro você quiser exigir login antes de mexer nos dados, me avise que ajusto as políticas para exigir usuário autenticado.

---

## 2. Passo a passo para rodar o site

### 2.1. Pré-requisitos
- Ter o [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

### 2.2. Instalar as dependências
Abra um terminal na pasta do projeto (`patrimonio-escola`) e rode:

```bash
npm install
```

### 2.3. Rodar em desenvolvimento
```bash
npm run dev
```
Depois abra o endereço mostrado no terminal (normalmente `http://localhost:5173`).

### 2.4. Gerar versão de produção (para publicar)
```bash
npm run build
```
Isso cria a pasta `dist`, que é o site pronto para publicar em qualquer serviço de hospedagem (Vercel, Netlify, Hostinger, etc). Basta subir o conteúdo da pasta `dist`.

Ao publicar em um serviço de hospedagem, lembre-se de configurar as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no painel do serviço (mesmo conteúdo do arquivo `.env`).

---

## 3. Estrutura do projeto

```
patrimonio-escola/
├── supabase_schema.sql        # Script para rodar no Supabase
├── .env                        # Chaves do Supabase (já preenchidas)
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js  # Conexão com o Supabase
│   │   ├── utils.js           # Formatações e exportação CSV
│   │   └── exportPdf.js       # Exportação em PDF
│   ├── components/
│   │   ├── Layout.jsx         # Menu lateral + topo
│   │   ├── Modal.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── StatusBadge.jsx
│   │   └── CrudSimples.jsx    # CRUD genérico (Tipo, Unidade, Fornecedor)
│   └── pages/
│       ├── Dashboard.jsx
│       ├── Patrimonio.jsx
│       ├── Tipo.jsx
│       ├── Unidade.jsx
│       ├── Setor.jsx
│       ├── Responsavel.jsx
│       ├── Fornecedor.jsx
│       └── Relatorios.jsx
```

---

## 4. Funcionalidades por página

- **Dashboard**: totais gerais (quantidade, valores, garantias vencendo em 30 dias) e detalhamento por Tipo, Unidade, Setor e Responsável, com abas.
- **Cadastro de Patrimônio**: todos os campos pedidos (ID automático, modelo, nome, número de série, nota fiscal com upload opcional de arquivo, aquisição, valor original, valor de compra, vencimento de garantia, tipo, unidade, setor, responsável, fornecedor, observação e status). O setor é filtrado automaticamente pela unidade escolhida.
- **Cadastro de Tipo / Unidade**: ID automático, nome e status.
- **Cadastro de Setor**: ID automático, nome, unidade vinculada e status.
- **Cadastro de Responsável**: ID automático, nome, setor vinculado — a unidade é exibida automaticamente a partir do setor escolhido — e status.
- **Cadastro de Fornecedor**: ID automático, nome, cidade e status.
- **Relatórios**: 8 tipos de relatório (geral, por tipo, unidade, setor, responsável, fornecedor, status e garantias a vencer em 60 dias), com filtros combináveis e exportação em **CSV** e **PDF** (pronto para impressão).

---

## 5. Próximos passos sugeridos (opcional)
- Adicionar tela de login (Supabase Auth) caso queira restringir o acesso.
- Adicionar histórico de movimentação de patrimônio (transferência entre setores/responsáveis).
- Adicionar QR Code / código de barras por patrimônio para inventário físico.

Qualquer ajuste que precisar (novos campos, novos relatórios, tela de login etc.), é só pedir.
