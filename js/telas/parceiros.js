// =====================================================================
//  PARCEIROS — engenheiros dos projetos complementares
//  Conta corrente: o que cada parceiro cobrou nos complementares,
//  menos os pagamentos lançados (independentes de projeto).
// =====================================================================
import { store, porId, remover } from '../dados.js?v=202611241859';
import { h, icone, moeda, confirmar, tentar } from '../util.js?v=202611241859';
import { nav } from '../nav.js?v=202611241859';
import { complAtrasado, contaParceiro, pagamentoCompl } from '../negocio.js?v=202611241859';
import {
  formParceiro, formComplementar, linhaComplementar, ligarLinhasComplementares, iniciais,
  formPagamentoParceiro, extratoPagamentos, ligarExtrato,
} from '../componentes.js?v=202611241859';

let filtroSit = 'abertos';

const saldoTexto = (conta) => conta.credito ? `<span class="tag tag-verde">crédito ${moeda(conta.credito)}</span>`
  : conta.saldo > 0 ? `<b style="font-weight:400;color:var(--terracota)">${moeda(conta.saldo)}</b>` : '<span class="tag tag-ok">Em dia</span>';

const CAB_COMPL = '<thead><tr><th>Disciplina / projeto</th><th>Parceiro</th><th>Situação</th><th>Prazo</th><th class="num">Valor</th><th>Pagamento</th><th></th></tr></thead>';

export function render(el, params, rota) {
  if (rota === 'parceiro') return ficha(el, params[0]);
  const compl = store.complementares.filter(c => {
    const pago = pagamentoCompl(c).cod === 'pago';
    return filtroSit === 'abertos' ? c.status !== 'entregue' || !pago
      : filtroSit === 'apagar' ? !pago && Number(c.valor) > 0
      : filtroSit === 'atrasados' ? complAtrasado(c) : true;
  }).sort((a, b) => String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
  const contas = store.parceiros.map(p => ({ p, conta: contaParceiro(p.id) }));
  const aPagar = contas.reduce((s, x) => s + Math.max(0, x.conta.saldo), 0);

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Parceiros e complementares</h1>
      <div class="sub">Projetos repassados aos engenheiros e a conta corrente de cada um.</div></div>
      <div class="acoes"><button class="btn" id="novo-parc">${icone('mais', 16)} Parceiro</button>
        <button class="btn" id="lancar-pag">${icone('financeiro', 16)} Lançar pagamento</button>
        <button class="btn btn-primario" id="novo-compl">${icone('enviar', 16)} Enviar complementar</button></div></div>

    <div class="cartao" style="margin-bottom:18px"><div class="cartao-cab"><h2>Engenheiros parceiros</h2><span class="tag tag-alerta">Total a pagar: ${moeda(aPagar)}</span></div>
      ${store.parceiros.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Nome</th><th>Especialidade</th><th>Em andamento</th><th class="num">Cobrado</th><th class="num">Pago</th><th class="num">Saldo a pagar</th><th></th></tr></thead><tbody>
      ${contas.sort((a, b) => b.conta.saldo - a.conta.saldo || a.p.nome.localeCompare(b.p.nome)).map(({ p, conta }) => {
        const abertos = store.complementares.filter(c => c.parceiro_id === p.id && c.status !== 'entregue').length;
        return `<tr class="clicavel" data-parc="${p.id}"><td><span class="avatar" style="margin-right:8px">${h(iniciais(p.nome))}</span>${h(p.nome)}</td>
          <td class="fraco">${h(p.especialidade || '')}</td>
          <td>${abertos ? `<span class="tag tag-areia">${abertos}</span>` : '<span class="fraco">—</span>'}</td>
          <td class="num">${moeda(conta.total)}</td><td class="num">${moeda(conta.pago)}</td><td class="num">${saldoTexto(conta)}</td>
          <td class="num"><button class="btn btn-peq" data-pagar-parc="${p.id}">${icone('mais', 13)} Pagamento</button></td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="vazio">Cadastre seus engenheiros parceiros (estrutural, elétrico, hidrossanitário…).</div>'}
    </div>

    <div class="cartao"><div class="cartao-cab"><h2>Complementares</h2>
        <select id="f-sit" class="entrada" style="width:auto;padding:5px 9px">${[['abertos', 'Em aberto (não entregues ou não quitados)'], ['atrasados', 'Atrasados'], ['apagar', 'Não quitados'], ['todos', 'Todos']].map(([k, v]) => `<option value="${k}" ${filtroSit === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      ${compl.length ? `<div class="tabela-envolve"><table class="tabela">${CAB_COMPL}<tbody>${compl.map(c => linhaComplementar(c)).join('')}</tbody></table></div>` : '<div class="vazio">Nada por aqui.</div>'}
    </div>`;
  el.querySelector('#novo-parc').addEventListener('click', () => formParceiro());
  el.querySelector('#novo-compl').addEventListener('click', () => formComplementar());
  el.querySelector('#lancar-pag').addEventListener('click', () => formPagamentoParceiro());
  el.querySelector('#f-sit').addEventListener('change', e => { filtroSit = e.target.value; render(el, params, rota); });
  el.querySelectorAll('[data-parc]').forEach(tr => tr.addEventListener('click', e => {
    if (e.target.closest('[data-pagar-parc]')) return;
    nav.ir('parceiro/' + tr.dataset.parc);
  }));
  el.querySelectorAll('[data-pagar-parc]').forEach(b => b.addEventListener('click', () => formPagamentoParceiro(null, b.dataset.pagarParc)));
  ligarLinhasComplementares(el);
}

function ficha(el, id) {
  const p = porId('parceiros', id);
  if (!p) { el.innerHTML = '<div class="cartao vazio">Parceiro não encontrado.</div>'; return; }
  const cs = store.complementares.filter(c => c.parceiro_id === id).sort((a, b) => String(b.enviado_em || '').localeCompare(String(a.enviado_em || '')));
  const conta = contaParceiro(id);
  const noPrazo = cs.filter(c => c.status === 'entregue' && c.prazo && c.entregue_em && c.entregue_em <= c.prazo).length;
  const entregues = cs.filter(c => c.status === 'entregue').length;
  const zap = (p.telefone || '').replace(/\D/g, '');
  el.innerHTML = `
    <a class="migalha" href="#/parceiros">${icone('voltar', 15)} Parceiros</a>
    <div class="cab"><div class="titulos"><h1>${h(p.nome)}</h1><div class="sub">${[p.especialidade, p.empresa, p.registro].filter(Boolean).map(h).join(' · ')}</div></div>
      <div class="acoes">${zap ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${zap.length <= 11 ? '55' + zap : zap}">WhatsApp</a>` : ''}
        <button class="btn" id="ed-parc">${icone('editar', 15)} Editar</button>
        <button class="btn" id="pag-parc">${icone('financeiro', 15)} Lançar pagamento</button>
        <button class="btn btn-primario" id="env-parc">${icone('enviar', 15)} Enviar complementar</button></div></div>
    <div class="indicadores">
      <div class="indicador"><div class="rot">Total cobrado</div><div class="val">${moeda(conta.total)}</div><div class="det">${cs.length} complementares · ${cs.length - entregues} em aberto</div></div>
      <div class="indicador"><div class="rot">Total pago</div><div class="val">${moeda(conta.pago)}</div><div class="det">${conta.pagamentos.length} pagamento${conta.pagamentos.length === 1 ? '' : 's'}</div></div>
      <div class="indicador ${conta.saldo > 0 ? 'alerta' : ''}"><div class="rot">${conta.credito ? 'Crédito (pago a mais)' : 'Saldo a pagar'}</div><div class="val">${moeda(conta.credito || Math.max(0, conta.saldo))}</div><div class="det">${conta.credito ? 'abate nos próximos complementares' : 'abatido do mais antigo ao mais novo'}</div></div>
      <div class="indicador"><div class="rot">Entregas no prazo</div><div class="val">${entregues ? Math.round(noPrazo / entregues * 100) + '%' : '—'}</div><div class="det">${noPrazo} de ${entregues} entregues</div></div>
    </div>
    <div class="grade grade-2" style="margin-bottom:18px;align-items:start">
      <div class="cartao"><div class="cartao-cab"><h2>Complementares</h2></div>
        ${cs.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Disciplina / projeto</th><th>Situação</th><th class="num">Valor</th><th>Pagamento</th></tr></thead><tbody>
        ${cs.map(c => {
          const pr = porId('projetos', c.projeto_id);
          return `<tr class="clicavel" data-compl="${c.id}"><td><div>${h(c.disciplina)}</div><div class="fraco">${h(pr?.nome || '')}</div></td>
            <td class="fraco">${c.status === 'entregue' ? 'Entregue' : complAtrasado(c) ? '<span class="tag tag-atrasado">Atrasado</span>' : 'Em aberto'}</td>
            <td class="num">${Number(c.valor) ? moeda(c.valor) : '—'}</td><td>${tagPag(c)}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum projeto enviado ainda.</div>'}</div>
      <div class="cartao"><div class="cartao-cab"><h2>Pagamentos realizados</h2><button class="btn btn-peq btn-primario" id="pag-parc2">${icone('mais', 14)} Lançar</button></div>
        ${extratoPagamentos(conta.pagamentos)}</div>
    </div>
    <div class="cartao"><div class="cartao-cab"><h2>Dados</h2></div><table class="tabela"><tbody>
      <tr><td class="fraco" style="width:200px">Telefone</td><td>${h(p.telefone || '—')}</td></tr>
      <tr><td class="fraco">E-mail</td><td>${h(p.email || '—')}</td></tr>
      <tr><td class="fraco">PIX / banco</td><td>${h(p.pix || '—')}</td></tr>
      <tr><td class="fraco">Observações</td><td>${h(p.obs || '—')}</td></tr></tbody></table>
      <div class="modal-rodape"><button class="btn btn-leve" id="rm-parc">${icone('lixo', 15)} Excluir parceiro</button></div></div>`;
  el.querySelector('#ed-parc').addEventListener('click', () => formParceiro(p));
  el.querySelectorAll('#pag-parc, #pag-parc2').forEach(b => b.addEventListener('click', () => formPagamentoParceiro(null, id)));
  el.querySelector('#env-parc').addEventListener('click', () => formComplementar(null, { parceiro_id: id, disciplina: p.especialidade }));
  el.querySelector('#rm-parc').addEventListener('click', async () => {
    if (!await confirmar(`Excluir ${p.nome}? Os complementares ficam como "a definir" e os pagamentos lançados para ele são apagados.`, { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('parceiros', id), 'Parceiro excluído');
    store.complementares.forEach(c => { if (c.parceiro_id === id) c.parceiro_id = null; });
    store.pagamentos_parceiros = store.pagamentos_parceiros.filter(x => x.parceiro_id !== id);
    nav.ir('parceiros');
  });
  ligarLinhasComplementares(el);
  ligarExtrato(el);
}

function tagPag(c) {
  const pg = pagamentoCompl(c);
  if (pg.cod === 'sem_valor') return '<span class="fraco">valor a definir</span>';
  if (pg.cod === 'pago') return '<span class="tag tag-ok">Quitado</span>';
  if (pg.cod === 'parcial') return `<span class="tag tag-areia">Falta ${moeda(pg.falta)}</span><div class="fraco">pago ${moeda(pg.pago)}</div>`;
  return '<span class="tag tag-alerta">A pagar</span>';
}
