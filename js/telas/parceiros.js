// =====================================================================
//  PARCEIROS — engenheiros dos projetos complementares
// =====================================================================
import { store, porId, remover } from '../dados.js';
import { h, icone, moeda, confirmar, tentar } from '../util.js';
import { nav } from '../nav.js';
import { complAtrasado } from '../negocio.js';
import { formParceiro, formComplementar, linhaComplementar, ligarLinhasComplementares, iniciais } from '../componentes.js';

let filtroSit = 'abertos';

export function render(el, params, rota) {
  if (rota === 'parceiro') return ficha(el, params[0]);
  const compl = store.complementares.filter(c =>
    filtroSit === 'abertos' ? c.status !== 'entregue' || !c.pago :
    filtroSit === 'apagar' ? !c.pago : filtroSit === 'atrasados' ? complAtrasado(c) : true)
    .sort((a, b) => String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
  const aPagar = store.complementares.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor || 0), 0);

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Parceiros e complementares</h1>
      <div class="sub">Projetos repassados aos engenheiros: o que foi enviado, prazo e preço.</div></div>
      <div class="acoes"><button class="btn" id="novo-parc">${icone('mais', 16)} Parceiro</button>
        <button class="btn btn-primario" id="novo-compl">${icone('enviar', 16)} Enviar complementar</button></div></div>

    <div class="cartao" style="margin-bottom:18px">
      <div class="cartao-cab"><h2>Complementares</h2>
        <select id="f-sit" class="entrada" style="width:auto;padding:5px 9px">${[['abertos', 'Em aberto (não entregues ou não pagos)'], ['atrasados', 'Atrasados'], ['apagar', 'A pagar'], ['todos', 'Todos']].map(([k, v]) => `<option value="${k}" ${filtroSit === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span class="tag tag-alerta">A pagar: ${moeda(aPagar)}</span></div>
      ${compl.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Disciplina / projeto</th><th>Parceiro</th><th>Situação</th><th>Prazo</th><th class="num">Valor</th><th>Pagamento</th><th></th></tr></thead>
        <tbody>${compl.map(c => linhaComplementar(c)).join('')}</tbody></table></div>` : '<div class="vazio">Nada por aqui.</div>'}
    </div>

    <div class="cartao"><div class="cartao-cab"><h2>Engenheiros parceiros</h2></div>
      ${store.parceiros.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Nome</th><th>Especialidade</th><th>Contato</th><th>Em andamento</th><th class="num">Total contratado</th></tr></thead><tbody>
      ${[...store.parceiros].sort((a, b) => a.nome.localeCompare(b.nome)).map(p => {
        const cs = store.complementares.filter(c => c.parceiro_id === p.id);
        const abertos = cs.filter(c => c.status !== 'entregue').length;
        return `<tr class="clicavel" data-parc="${p.id}"><td><span class="avatar" style="margin-right:8px">${h(iniciais(p.nome))}</span>${h(p.nome)}${p.empresa ? `<div class="fraco" style="margin-left:32px">${h(p.empresa)}</div>` : ''}</td>
          <td>${h(p.especialidade || '')}</td><td><div>${h(p.telefone || '')}</div><div class="fraco">${h(p.email || '')}</div></td>
          <td>${abertos ? `<span class="tag tag-areia">${abertos}</span>` : '<span class="fraco">—</span>'}</td>
          <td class="num">${moeda(cs.reduce((s, c) => s + Number(c.valor || 0), 0))}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="vazio">Cadastre seus engenheiros parceiros (estrutural, elétrico, hidrossanitário…).</div>'}
    </div>`;
  el.querySelector('#novo-parc').addEventListener('click', () => formParceiro());
  el.querySelector('#novo-compl').addEventListener('click', () => formComplementar());
  el.querySelector('#f-sit').addEventListener('change', e => { filtroSit = e.target.value; render(el, params, rota); });
  el.querySelectorAll('[data-parc]').forEach(tr => tr.addEventListener('click', () => nav.ir('parceiro/' + tr.dataset.parc)));
  ligarLinhasComplementares(el);
}

function ficha(el, id) {
  const p = porId('parceiros', id);
  if (!p) { el.innerHTML = '<div class="cartao vazio">Parceiro não encontrado.</div>'; return; }
  const cs = store.complementares.filter(c => c.parceiro_id === id).sort((a, b) => String(b.enviado_em || '').localeCompare(String(a.enviado_em || '')));
  const total = cs.reduce((s, c) => s + Number(c.valor || 0), 0);
  const aPagar = cs.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor || 0), 0);
  const noPrazo = cs.filter(c => c.status === 'entregue' && c.prazo && c.entregue_em && c.entregue_em <= c.prazo).length;
  const entregues = cs.filter(c => c.status === 'entregue').length;
  const zap = (p.telefone || '').replace(/\D/g, '');
  el.innerHTML = `
    <a class="migalha" href="#/parceiros">${icone('voltar', 15)} Parceiros</a>
    <div class="cab"><div class="titulos"><h1>${h(p.nome)}</h1><div class="sub">${[p.especialidade, p.empresa, p.registro].filter(Boolean).map(h).join(' · ')}</div></div>
      <div class="acoes">${zap ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${zap.length <= 11 ? '55' + zap : zap}">WhatsApp</a>` : ''}
        <button class="btn" id="ed-parc">${icone('editar', 15)} Editar</button>
        <button class="btn btn-primario" id="env-parc">${icone('enviar', 15)} Enviar complementar</button></div></div>
    <div class="indicadores">
      <div class="indicador"><div class="rot">Projetos enviados</div><div class="val">${cs.length}</div><div class="det">${cs.length - entregues} em aberto</div></div>
      <div class="indicador"><div class="rot">Total contratado</div><div class="val">${moeda(total)}</div></div>
      <div class="indicador ${aPagar ? 'alerta' : ''}"><div class="rot">A pagar</div><div class="val">${moeda(aPagar)}</div></div>
      <div class="indicador"><div class="rot">Entregas no prazo</div><div class="val">${entregues ? Math.round(noPrazo / entregues * 100) + '%' : '—'}</div><div class="det">${noPrazo} de ${entregues} entregues</div></div>
    </div>
    <div class="cartao" style="margin-bottom:18px"><div class="cartao-cab"><h2>Complementares</h2></div>
      ${cs.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Disciplina / projeto</th><th>Parceiro</th><th>Situação</th><th>Prazo</th><th class="num">Valor</th><th>Pagamento</th><th></th></tr></thead><tbody>${cs.map(c => linhaComplementar(c)).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum projeto enviado ainda.</div>'}</div>
    <div class="cartao"><div class="cartao-cab"><h2>Dados</h2></div><table class="tabela"><tbody>
      <tr><td class="fraco" style="width:200px">Telefone</td><td>${h(p.telefone || '—')}</td></tr>
      <tr><td class="fraco">E-mail</td><td>${h(p.email || '—')}</td></tr>
      <tr><td class="fraco">PIX / banco</td><td>${h(p.pix || '—')}</td></tr>
      <tr><td class="fraco">Observações</td><td>${h(p.obs || '—')}</td></tr></tbody></table>
      <div class="modal-rodape"><button class="btn btn-leve" id="rm-parc">${icone('lixo', 15)} Excluir parceiro</button></div></div>`;
  el.querySelector('#ed-parc').addEventListener('click', () => formParceiro(p));
  el.querySelector('#env-parc').addEventListener('click', () => formComplementar(null, { parceiro_id: id, disciplina: p.especialidade }));
  el.querySelector('#rm-parc').addEventListener('click', async () => {
    if (!await confirmar(`Excluir ${p.nome}? Os complementares ficam registrados como "a definir".`, { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('parceiros', id), 'Parceiro excluído');
    store.complementares.forEach(c => { if (c.parceiro_id === id) c.parceiro_id = null; });
    nav.ir('parceiros');
  });
  ligarLinhasComplementares(el);
}
