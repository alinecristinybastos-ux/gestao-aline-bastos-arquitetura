// =====================================================================
//  CLIENTES — lista e ficha do cliente
// =====================================================================
import { store, porId, remover } from '../dados.js?v=202611221235';
import { h, icone, moeda, data, confirmar, tentar } from '../util.js?v=202611221235';
import { nav } from '../nav.js?v=202611221235';
import { recebimentosDo } from '../negocio.js?v=202611221235';
import { formCliente, blocoAnexos, ligarBlocoAnexos } from '../componentes.js?v=202611221235';
import { cartaoProjeto, ligarCartoes, novoProjeto } from './projetos.js?v=202611221235';

let busca = '';

export function render(el, params, rota) {
  if (rota === 'cliente') return ficha(el, params[0]);
  const lista = store.clientes
    .filter(c => !busca || `${c.nome} ${c.telefone} ${c.email} ${c.cidade}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Clientes</h1><div class="sub">${store.clientes.length} cadastrado${store.clientes.length === 1 ? '' : 's'}</div></div>
      <div class="acoes"><button class="btn btn-primario" id="novo-cli">${icone('mais', 16)} Novo cliente</button></div></div>
    <div class="filtros"><div class="busca">${icone('busca', 16)}<input id="b-cli" placeholder="Buscar por nome, telefone, e-mail…" value="${h(busca)}"></div></div>
    <div class="cartao tabela-envolve">${lista.length ? `<table class="tabela">
      <thead><tr><th>Nome</th><th>Contato</th><th>Cidade</th><th>Projetos</th><th class="num">Contratado</th></tr></thead>
      <tbody>${lista.map(c => {
        const ps = store.projetos.filter(p => p.cliente_id === c.id);
        const ativos = ps.filter(p => p.status === 'ativo').length;
        return `<tr class="clicavel" data-cli="${c.id}"><td>${h(c.nome)}${c.origem ? `<div class="fraco">${h(c.origem)}</div>` : ''}</td>
          <td><div>${h(c.telefone || '')}</div><div class="fraco">${h(c.email || '')}</div></td>
          <td>${h(c.cidade || '')}</td>
          <td>${ps.length ? `${ps.length}${ativos ? ` <span class="tag tag-verde">${ativos} em andamento</span>` : ''}` : '<span class="fraco">—</span>'}</td>
          <td class="num">${moeda(ps.reduce((s, p) => s + Number(p.valor_contrato || 0), 0))}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="vazio">Nenhum cliente encontrado.</div>'}</div>`;
  el.querySelector('#novo-cli').addEventListener('click', () => formCliente());
  const b = el.querySelector('#b-cli');
  b.addEventListener('input', () => { busca = b.value; render(el, params, rota); const n = el.querySelector('#b-cli'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
  el.querySelectorAll('[data-cli]').forEach(tr => tr.addEventListener('click', () => nav.ir('cliente/' + tr.dataset.cli)));
}

function ficha(el, id) {
  const c = porId('clientes', id);
  if (!c) { el.innerHTML = '<div class="cartao vazio">Cliente não encontrado.</div>'; return; }
  const ps = store.projetos.filter(p => p.cliente_id === id);
  const orcs = store.orcamentos.filter(o => o.cliente_id === id);
  const recs = ps.flatMap(p => recebimentosDo(p.id));
  const total = recs.reduce((s, r) => s + Number(r.valor || 0), 0);
  const pago = recs.filter(r => r.status === 'pago').reduce((s, r) => s + Number(r.valor || 0), 0);
  const zap = (c.telefone || '').replace(/\D/g, '');
  el.innerHTML = `
    <a class="migalha" href="#/clientes">${icone('voltar', 15)} Clientes</a>
    <div class="cab"><div class="titulos"><h1>${h(c.nome)}</h1>
      <div class="sub">${[c.documento, c.cidade, c.origem && 'via ' + c.origem].filter(Boolean).map(h).join(' · ')}</div></div>
      <div class="acoes">
        ${zap ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${zap.length <= 11 ? '55' + zap : zap}">WhatsApp</a>` : ''}
        <button class="btn" id="ed-cli">${icone('editar', 15)} Editar</button>
        <button class="btn btn-primario" id="np-cli">${icone('mais', 15)} Novo projeto</button></div></div>
    <div class="grade grade-painel">
      <div class="grade">
        <div class="cartao"><div class="cartao-cab"><h2>Projetos</h2></div>
          <div class="cartao-corpo">${ps.length ? `<div class="grade grade-2">${ps.map(cartaoProjeto).join('')}</div>` : '<div class="vazio">Nenhum projeto ainda.</div>'}</div></div>
        ${orcs.length ? `<div class="cartao"><div class="cartao-cab"><h2>Orçamentos</h2></div><table class="tabela"><tbody>${orcs.map(o => `<tr><td>${h(o.numero || '')} ${h(o.descricao || '')}</td><td>${data(o.data)}</td><td class="num">${moeda(o.valor)}</td><td>${h(o.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="cartao cartao-corpo"><h2 style="font-weight:400;font-size:1.05rem;color:var(--verde-escuro);margin-bottom:12px">Documentos do cliente</h2>
          ${blocoAnexos('cliente', id, { titulo: 'este cliente', categorias: ['Documento pessoal', 'Matrícula / escritura', 'IPTU', 'Projeto aprovado', 'Outro'] })}</div>
      </div>
      <div class="grade">
        <div class="cartao"><div class="cartao-cab"><h2>Contato</h2></div>
          <table class="tabela"><tbody>
            <tr><td class="fraco">Telefone</td><td>${h(c.telefone || '—')}</td></tr>
            <tr><td class="fraco">E-mail</td><td>${c.email ? `<a href="mailto:${h(c.email)}">${h(c.email)}</a>` : '—'}</td></tr>
            <tr><td class="fraco">Endereço</td><td>${h(c.endereco || '—')}</td></tr>
            <tr><td class="fraco">Aniversário</td><td>${data(c.aniversario)}</td></tr>
            <tr><td class="fraco">Observações</td><td>${h(c.observacoes || '—')}</td></tr>
          </tbody></table></div>
        <div class="cartao"><div class="cartao-cab"><h2>Financeiro</h2></div>
          <table class="tabela"><tbody>
            <tr><td class="fraco">Total contratado</td><td class="num">${moeda(total)}</td></tr>
            <tr><td class="fraco">Recebido</td><td class="num">${moeda(pago)}</td></tr>
            <tr><td class="fraco">A receber</td><td class="num">${moeda(total - pago)}</td></tr>
          </tbody></table></div>
        <button class="btn btn-leve" id="rm-cli">${icone('lixo', 15)} Excluir cliente</button>
      </div>
    </div>`;
  el.querySelector('#ed-cli').addEventListener('click', () => formCliente(c));
  el.querySelector('#np-cli').addEventListener('click', () => novoProjeto({ cliente_id: id, nome: `Projeto ${c.nome.split(' ')[0]}` }));
  el.querySelector('#rm-cli').addEventListener('click', async () => {
    if (ps.length) return confirmar('Este cliente tem projetos. Exclua ou transfira os projetos antes.', { ok: 'Entendi' });
    if (!await confirmar(`Excluir o cliente ${c.nome}?`, { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('clientes', id), 'Cliente excluído'); nav.ir('clientes');
  });
  ligarCartoes(el);
  ligarBlocoAnexos(el);
}
