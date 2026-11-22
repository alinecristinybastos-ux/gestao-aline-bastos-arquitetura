// =====================================================================
//  Aplicativo: login, menu lateral e rotas
// =====================================================================
import { iniciar, carregarTudo, entrar, sair, modoDemo, demoVazio, zerarDemo, store, tabelasFaltando } from './dados.js?v=202611221525';
import { icone, h, aviso, diasAte } from './util.js?v=202611221525';
import { nav } from './nav.js?v=202611221525';
import { situacaoRecebimento } from './negocio.js?v=202611221525';
import { abrirBackup, diasSemBackup } from './backup.js?v=202611221525';
import { criarDadosExemplo } from './exemplo.js?v=202611221525';

import * as painel from './telas/painel.js?v=202611221525';
import * as projetos from './telas/projetos.js?v=202611221525';
import * as projeto from './telas/projeto.js?v=202611221525';
import * as clientes from './telas/clientes.js?v=202611221525';
import * as financeiro from './telas/financeiro.js?v=202611221525';
import * as orcamentos from './telas/orcamentos.js?v=202611221525';
import * as tarefas from './telas/tarefas.js?v=202611221525';
import * as parceiros from './telas/parceiros.js?v=202611221525';

const MENU = [
  ['painel', 'Painel', 'painel'],
  ['projetos', 'Projetos', 'projetos'],
  ['clientes', 'Clientes', 'clientes'],
  ['financeiro', 'Financeiro', 'financeiro'],
  ['orcamentos', 'Orçamentos', 'orcamentos'],
  ['tarefas', 'Tarefas da equipe', 'tarefas'],
  ['parceiros', 'Parceiros', 'parceiros'],
];

const ROTAS = {
  painel, projetos, projeto, clientes, cliente: clientes, financeiro, orcamentos, tarefas, parceiros, parceiro: parceiros,
};

let conteudo;

function montarCasca(usuario) {
  document.getElementById('raiz').innerHTML = `
  <div class="app">
    <aside class="lateral">
      <div class="marca"><img src="assets/logo-claro.png" alt="Aline Bastos Arquitetura Exclusiva"></div>
      <nav class="nav">
        ${MENU.map(([r, nome, ic]) => `<a href="#/${r}" data-rota="${r}">${icone(ic, 19)}<span>${nome}</span><span class="contador oculto" data-cont="${r}"></span></a>`).join('')}
      </nav>
      <div class="rodape-lateral">
        ${modoDemo ? `<div class="selo-demo">Modo demonstração — dados só neste navegador.<br><button id="btn-zerar">Apagar e recomeçar</button></div>` : ''}
        <button id="btn-backup">${icone('arquivo', 16)} Baixar backup</button>
        <div>${h(usuario?.email || '')}</div>
        ${!modoDemo ? `<button id="btn-sair">${icone('sair', 16)} Sair</button>` : ''}
      </div>
    </aside>
    <div class="principal">
      <div class="topo-movel">
        <button class="btn-icone" id="btn-menu" aria-label="Menu">${icone('menu', 22)}</button>
        <img src="assets/logo-horizontal-branco.png" alt="Aline Bastos">
      </div>
      <main class="conteudo" id="conteudo"></main>
    </div>
  </div>`;
  conteudo = document.getElementById('conteudo');
  document.getElementById('btn-menu').onclick = () => document.body.classList.toggle('menu-aberto');
  document.getElementById('btn-sair')?.addEventListener('click', sair);
  document.getElementById('btn-backup').addEventListener('click', abrirBackup);
  document.getElementById('btn-zerar')?.addEventListener('click', () => {
    if (confirm('Apagar todos os dados de demonstração deste navegador?')) zerarDemo();
  });
  document.addEventListener('click', e => {
    if (document.body.classList.contains('menu-aberto') && (e.target.closest('.nav a') || !e.target.closest('.lateral, #btn-menu'))) {
      document.body.classList.remove('menu-aberto');
    }
  });
}

function atualizarContadores() {
  const atrasadas = store.tarefas.filter(t => t.status !== 'feito' && t.prazo && diasAte(t.prazo) < 0).length;
  const cobrar = store.recebimentos.filter(r => ['liberado', 'atrasado'].includes(situacaoRecebimento(r).cod)).length
    + store.despesas.filter(d => !d.pago && d.vencimento && diasAte(d.vencimento) < 0).length;
  const marcar = (rota, n) => {
    const el = document.querySelector(`[data-cont="${rota}"]`);
    if (!el) return;
    el.textContent = n; el.classList.toggle('oculto', !n);
  };
  marcar('tarefas', atrasadas);
  marcar('projetos', store.pendencias.filter(x => x.status !== 'resolvida' && x.prazo && diasAte(x.prazo) <= 0).length);
  marcar('financeiro', cobrar);
}

function rotaAtual() {
  const partes = (location.hash.replace(/^#\/?/, '') || 'painel').split('/');
  return { nome: partes[0], params: partes.slice(1).map(decodeURIComponent) };
}

function desenhar() {
  const { nome, params } = rotaAtual();
  const tela = ROTAS[nome] || painel;
  document.querySelectorAll('.nav a').forEach(a => {
    const r = a.dataset.rota;
    a.classList.toggle('ativo', r === nome || (r === 'projetos' && nome === 'projeto') || (r === 'clientes' && nome === 'cliente') || (r === 'parceiros' && nome === 'parceiro'));
  });
  try {
    tela.render(conteudo, params, nome);
  } catch (e) {
    console.error(e);
    conteudo.innerHTML = `<div class="cartao cartao-corpo">Não foi possível abrir esta tela: ${h(e.message)}</div>`;
  }
  const semBackup = diasSemBackup();
  if (nome === 'painel' && (semBackup === null || semBackup > 7)) {
    conteudo.insertAdjacentHTML('afterbegin', `<div class="cartao cartao-corpo lembrete-backup">${icone('arquivo', 16)}
      <span>${semBackup === null ? 'Você ainda não baixou nenhum backup dos dados neste computador.' : `Seu último backup foi há ${semBackup} dias.`} Vale guardar uma cópia fora.</span>
      <button class="btn btn-peq" id="lembrete-bk">Baixar backup</button></div>`);
    document.getElementById('lembrete-bk').addEventListener('click', abrirBackup);
  }
  if (tabelasFaltando.length) {
    conteudo.insertAdjacentHTML('afterbegin', `<div class="cartao cartao-corpo" style="margin-bottom:16px;border-color:var(--terracota);background:var(--terracota-clara);color:var(--terracota)">
      ${icone('alerta', 16)} O banco de dados precisa de uma atualização para esta versão do app (falta: ${h(tabelasFaltando.join(', '))}). Rode o SQL de atualização no Supabase.</div>`);
  }
  atualizarContadores();
}

let rotaAnterior = '';
async function aoNavegar() {
  const r = location.hash;
  const mudouTela = r.split('/')[1] !== rotaAnterior.split('/')[1] || r.split('/')[2] !== rotaAnterior.split('/')[2];
  rotaAnterior = r;
  if (!modoDemo) {
    try { await carregarTudo(); } catch (e) { aviso(e.message, 'erro'); }
  }
  desenhar();
  if (mudouTela) window.scrollTo(0, 0);
}

function telaLogin() {
  document.getElementById('raiz').innerHTML = `
  <div class="tela-login">
    <form class="caixa-login" id="form-login">
      <img src="assets/logo-claro.png" alt="Aline Bastos Arquitetura Exclusiva">
      <label for="email">E-mail</label>
      <input id="email" type="email" autocomplete="username" required>
      <label for="senha">Senha</label>
      <input id="senha" type="password" autocomplete="current-password" required>
      <button class="btn" type="submit">Entrar</button>
      <div class="erro" id="erro-login"></div>
    </form>
  </div>`;
  document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const u = await entrar(document.getElementById('email').value.trim(), document.getElementById('senha').value);
      await abrirApp(u);
    } catch (err) {
      document.getElementById('erro-login').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
}

async function abrirApp(usuario) {
  if (!modoDemo) await carregarTudo();
  else if (demoVazio()) await criarDadosExemplo();
  montarCasca(usuario);
  nav.recarregar = desenhar;
  window.addEventListener('hashchange', aoNavegar);
  // ao voltar para a aba, busca alterações feitas por outra pessoa (ex.: Julia)
  window.addEventListener('focus', () => { if (!modoDemo && !document.body.classList.contains('com-modal')) aoNavegar(); });
  rotaAnterior = location.hash;
  desenhar();
}

(async () => {
  try {
    const { logado, usuario } = await iniciar();
    if (logado) await abrirApp(usuario); else telaLogin();
  } catch (e) {
    console.error(e);
    document.getElementById('raiz').innerHTML = `<div class="carregando">Erro ao iniciar: ${h(e.message)}</div>`;
  }
})();
