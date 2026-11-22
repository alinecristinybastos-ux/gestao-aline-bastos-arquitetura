// =====================================================================
//  FINANCEIRO — resumo do mês (receitas, despesas e resultado),
//  a receber, recebidos, parceiros e visão do ano
// =====================================================================
import { store, porId, atualizar } from '../dados.js?v=202611221503';
import { h, icone, moeda, data, hoje, tentar, aviso } from '../util.js?v=202611221503';
import { nav } from '../nav.js?v=202611221503';
import { nomeCliente, situacaoRecebimento, dataReferencia, nomeParceiro, contaParceiro } from '../negocio.js?v=202611221503';
import { tagRecebimento, marcarRecebido, formRecebimento, formPagamentoParceiro, extratoPagamentos, ligarExtrato, formDespesa } from '../componentes.js?v=202611221503';

let aba = 'mes';
let mesSel = hoje().slice(0, 7);
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
let ano = Number(hoje().slice(0, 4));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const COR_RECEBIDO = '#4a7a36';
const COR_ARECEBER = '#b98a3c';

const ativo = (r) => !['cancelado'].includes(porId('projetos', r.projeto_id)?.status);
const soma = (l, f = 'valor') => l.reduce((s, x) => s + Number(x[f] || 0), 0);

export function render(el) {
  const recs = store.recebimentos.filter(ativo);
  const abertos = recs.filter(r => r.status !== 'pago');
  const cobrar = abertos.filter(r => ['liberado', 'atrasado'].includes(situacaoRecebimento(r).cod));
  const contas = store.parceiros.map(p => ({ p, conta: contaParceiro(p.id) }));
  const aPagar = contas.filter(x => x.conta.saldo > 0.009);

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Financeiro</h1><div class="sub">Receitas dos projetos, despesas do escritório e pagamentos aos parceiros.</div></div>
      <div class="acoes"><button class="btn btn-primario" id="nova-desp">${icone('mais', 16)} Despesa</button></div></div>
    <div class="indicadores">
      <div class="indicador ${cobrar.length ? 'alerta' : ''}"><div class="rot">Para cobrar agora</div><div class="val">${moeda(soma(cobrar))}</div><div class="det">fases entregues ou datas vencidas</div></div>
      <div class="indicador"><div class="rot">A receber (total)</div><div class="val">${moeda(soma(abertos))}</div><div class="det">${abertos.length} parcelas</div></div>
      <div class="indicador destaque"><div class="rot">Recebido em ${NOMES_MES[Number(hoje().slice(5, 7)) - 1]}</div><div class="val">${moeda(soma(recs.filter(r => r.status === 'pago' && String(r.pago_em || '').startsWith(hoje().slice(0, 7)))))}</div>
        <div class="det">${moeda(soma(recs.filter(r => r.status === 'pago' && String(r.pago_em || '').startsWith(hoje().slice(0, 4)))))} no ano de ${hoje().slice(0, 4)}</div></div>
      <div class="indicador"><div class="rot">A pagar a parceiros</div><div class="val">${moeda(aPagar.reduce((s, x) => s + x.conta.saldo, 0))}</div><div class="det">${aPagar.length} parceiro${aPagar.length === 1 ? '' : 's'} com saldo</div></div>
    </div>
    <div class="abas">
      ${[['mes', 'Mês a mês'], ['receber', 'A receber', abertos.length], ['recebidos', 'Recebidos'], ['pagar', 'Parceiros', aPagar.length], ['ano', 'Visão do ano']]
        .map(([k, n, c]) => `<button data-aba="${k}" class="${aba === k ? 'ativo' : ''}">${n}${c ? ` <span class="contagem">${c}</span>` : ''}</button>`).join('')}
    </div>
    <div id="fin-area"></div>`;
  const area = el.querySelector('#fin-area');
  ({ mes: () => tabMes(area, recs), receber: () => tabReceber(area, abertos), recebidos: () => tabRecebidos(area, recs), pagar: () => tabPagar(area, aPagar), ano: () => tabAno(area, recs) })[aba]();
  el.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { aba = b.dataset.aba; render(el); }));
  el.querySelector('#nova-desp').addEventListener('click', () => formDespesa(null, { vencimento: mesSel === hoje().slice(0, 7) ? hoje() : mesSel + '-10' }));
}

// =====================================================================
//  MÊS A MÊS
// =====================================================================
function trocarMes(delta) {
  const [a, m] = mesSel.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  mesSel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function tabMes(area, recs) {
  const [a, m] = mesSel.split('-').map(Number);
  const noMes = (iso) => String(iso || '').startsWith(mesSel);
  const recebidos = recs.filter(r => r.status === 'pago' && noMes(r.pago_em)).sort((x, y) => String(x.pago_em).localeCompare(String(y.pago_em)));
  const previstos = recs.filter(r => r.status !== 'pago' && noMes(dataReferencia(r))).sort((x, y) => String(dataReferencia(x)).localeCompare(String(dataReferencia(y))));
  const despesas = store.despesas.filter(d => noMes(d.vencimento)).sort((x, y) => String(x.vencimento).localeCompare(String(y.vencimento)));
  const pagParc = store.pagamentos_parceiros.filter(p => noMes(p.data));
  const vRec = soma(recebidos), vPrev = soma(previstos);
  const vDespPaga = soma(despesas.filter(d => d.pago)), vDesp = soma(despesas), vParc = soma(pagParc);
  const realizado = vRec - vDespPaga - vParc;
  const previsto = vRec + vPrev - vDesp - vParc;
  const atrasadasAntes = store.despesas.filter(d => !d.pago && d.vencimento < mesSel + '-01' && d.vencimento < hoje());
  const porCat = {};
  despesas.forEach(d => { porCat[d.categoria || 'Outros'] = (porCat[d.categoria || 'Outros'] || 0) + Number(d.valor || 0); });
  if (vParc) porCat['Parceiros (complementares)'] = vParc;
  const cats = Object.entries(porCat).sort((x, y) => y[1] - x[1]);
  const totalSaidas = vDesp + vParc;

  area.innerHTML = `
    <div class="nav-mes">
      <button class="btn-icone" data-mes-delta="-1" title="Mês anterior">${icone('voltar', 18)}</button>
      <h2>${NOMES_MES[m - 1]} ${a}</h2>
      <button class="btn-icone" data-mes-delta="1" title="Próximo mês">${icone('seta', 18)}</button>
      ${mesSel !== hoje().slice(0, 7) ? '<button class="btn btn-peq btn-leve" data-mes-hoje>Mês atual</button>' : ''}
    </div>
    ${atrasadasAntes.length ? `<div class="espera" style="margin-bottom:14px">${icone('alerta', 15)} ${atrasadasAntes.length} despesa${atrasadasAntes.length > 1 ? 's' : ''} de meses anteriores ainda não paga${atrasadasAntes.length > 1 ? 's' : ''}: ${atrasadasAntes.slice(0, 4).map(d => `${h(d.descricao)} (${data(d.vencimento)})`).join(', ')}${atrasadasAntes.length > 4 ? '…' : ''}</div>` : ''}
    <div class="resumo-fin" style="grid-template-columns:repeat(4,1fr)">
      <div><div class="rot">Receita recebida</div><div class="val" style="color:var(--ok)">${moeda(vRec)}</div><div class="fraco">+ ${moeda(vPrev)} a receber no mês</div></div>
      <div><div class="rot">Despesas do escritório</div><div class="val">${moeda(vDesp)}</div><div class="fraco">${moeda(vDespPaga)} pagas · ${moeda(vDesp - vDespPaga)} a pagar</div></div>
      <div><div class="rot">Pago a parceiros</div><div class="val">${moeda(vParc)}</div><div class="fraco">${pagParc.length} pagamento${pagParc.length === 1 ? '' : 's'}</div></div>
      <div><div class="rot">Resultado do mês</div><div class="val" style="color:${realizado < 0 ? 'var(--perigo)' : 'var(--verde-escuro)'}">${moeda(realizado)}</div><div class="fraco">realizado · previsto ${moeda(previsto)}</div></div>
    </div>

    <div class="grade grade-2" style="align-items:start">
      <div class="cartao"><div class="cartao-cab"><h2>Entradas</h2><span class="fraco">${moeda(vRec + vPrev)}</span></div>
        ${recebidos.length + previstos.length ? `<div class="tabela-envolve"><table class="tabela"><tbody>
          ${[...recebidos, ...previstos].map(r => {
            const p = porId('projetos', r.projeto_id);
            return `<tr><td><div>${h(r.descricao)}</div><div class="fraco">${h(p?.nome || '')} · ${h(nomeCliente(p?.cliente_id))}</div>
                <div class="linha-sit">${tagRecebimento(r)} <span class="fraco">${data(r.status === 'pago' ? r.pago_em : dataReferencia(r))}</span></div></td>
              <td class="num">${moeda(r.valor)}</td>
              <td class="num">${r.status !== 'pago' ? `<button class="btn-icone" data-receber="${r.id}" title="Marcar como recebido">${icone('check', 16)}</button>` : ''}</td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhuma entrada neste mês.</div>'}
      </div>

      <div class="cartao"><div class="cartao-cab"><h2>Saídas</h2><span class="fraco">${moeda(totalSaidas)}</span>
          <button class="btn btn-peq btn-primario" data-nova-desp>${icone('mais', 14)} Despesa</button></div>
        ${despesas.length + pagParc.length ? `<div class="tabela-envolve"><table class="tabela"><tbody>
          ${despesas.map(d => `<tr class="clicavel" data-desp="${d.id}">
            <td><div>${h(d.descricao)}${d.grupo ? ` <span class="fraco" title="Despesa fixa mensal">↻</span>` : ''}</div><div class="fraco">${h(d.categoria || '')}</div>
              <div class="linha-sit">${d.pago ? `<span class="tag tag-ok">Paga</span> <span class="fraco">${data(d.pago_em)}</span>`
              : `<span class="tag ${d.vencimento < hoje() ? 'tag-atrasado' : 'tag-alerta'}">${d.vencimento < hoje() ? 'Vencida' : 'A pagar'}</span> <span class="fraco">vence ${data(d.vencimento)}</span>`}</div></td>
            <td class="num">${moeda(d.valor)}</td>
            <td class="num">${!d.pago ? `<button class="btn-icone" data-pagar-desp="${d.id}" title="Marcar como paga">${icone('check', 16)}</button>` : ''}</td></tr>`).join('')}
          ${pagParc.map(x => `<tr><td><div>${h(nomeParceiro(x.parceiro_id))}</div><div class="fraco">Parceiros (complementares)${x.obs ? ' · ' + h(x.obs) : ''}</div>
            <div class="linha-sit"><span class="tag tag-ok">Pago</span> <span class="fraco">${data(x.data)}</span></div></td><td class="num">${moeda(x.valor)}</td><td></td></tr>`).join('')}
          </tbody></table></div>` : '<div class="vazio">Nenhuma despesa lançada neste mês.</div>'}
      </div>
    </div>

    ${cats.length ? `<div class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>Para onde foi o dinheiro</h2><span class="fraco">${NOMES_MES[m - 1]}</span></div>
      <div class="cartao-corpo">${cats.map(([c, v]) => `<div class="barra-cat"><span>${h(c)}</span>
        <div class="progresso"><span style="width:${totalSaidas ? v / totalSaidas * 100 : 0}%;background:var(--terracota)"></span></div>
        <b>${moeda(v)}</b><small>${totalSaidas ? Math.round(v / totalSaidas * 100) : 0}%</small></div>`).join('')}</div></div>` : ''}`;

  area.querySelectorAll('[data-mes-delta]').forEach(b => b.addEventListener('click', () => { trocarMes(Number(b.dataset.mesDelta)); nav.recarregar(); }));
  area.querySelector('[data-mes-hoje]')?.addEventListener('click', () => { mesSel = hoje().slice(0, 7); nav.recarregar(); });
  area.querySelector('[data-nova-desp]').addEventListener('click', () => formDespesa(null, { vencimento: mesSel === hoje().slice(0, 7) ? hoje() : mesSel + '-10' }));
  area.querySelectorAll('[data-desp]').forEach(tr => tr.addEventListener('click', e => {
    if (e.target.closest('[data-pagar-desp]')) return;
    formDespesa(porId('despesas', tr.dataset.desp));
  }));
  area.querySelectorAll('[data-pagar-desp]').forEach(b => b.addEventListener('click', async () => {
    await tentar(() => atualizar('despesas', b.dataset.pagarDesp, { pago: true, pago_em: hoje() }), 'Despesa paga'); nav.recarregar();
  }));
  ligarRec(area);
}

function linhaRec(r, comAcao = true) {
  const p = porId('projetos', r.projeto_id);
  const et = porId('etapas', r.etapa_id);
  const ref = dataReferencia(r);
  return `<tr>
    <td><div>${h(r.descricao)}</div><div class="fraco"><a href="#/projeto/${r.projeto_id}/financeiro">${h(p?.nome || '')}</a> · ${h(nomeCliente(p?.cliente_id))}</div></td>
    <td class="fraco">${r.gatilho === 'etapa' ? `Fase: ${h(et?.nome || '—')}${ref && r.status !== 'pago' ? `<br>${et?.status === 'concluida' ? 'concluída' : 'prevista'} ${data(ref)}` : ''}` : `Vence ${data(r.vencimento)}`}</td>
    <td>${tagRecebimento(r)}${r.status === 'pago' ? `<div class="fraco">${data(r.pago_em)}${r.forma ? ' · ' + h(r.forma) : ''}</div>` : ''}</td>
    <td class="num">${moeda(r.valor)}</td>
    <td class="num">${comAcao && r.status !== 'pago' ? `<button class="btn btn-peq" data-receber="${r.id}">${icone('check', 14)} Recebido</button>` : ''}
      <button class="btn-icone" data-editar-rec="${r.id}" title="Editar">${icone('editar', 15)}</button></td></tr>`;
}

function ligarRec(area) {
  area.querySelectorAll('[data-receber]').forEach(b => b.addEventListener('click', async () => {
    await tentar(() => marcarRecebido(porId('recebimentos', b.dataset.receber))); nav.recarregar();
  }));
  area.querySelectorAll('[data-editar-rec]').forEach(b => b.addEventListener('click', () => {
    const r = porId('recebimentos', b.dataset.editarRec); formRecebimento(r, r.projeto_id);
  }));
}

function tabReceber(area, abertos) {
  const ordem = { atrasado: 0, liberado: 1, previsto: 2, aguardando: 3 };
  const lista = [...abertos].sort((a, b) => ordem[situacaoRecebimento(a).cod] - ordem[situacaoRecebimento(b).cod]
    || String(dataReferencia(a) || '9').localeCompare(String(dataReferencia(b) || '9')));
  const grupos = [
    ['Cobrar agora', lista.filter(r => ['atrasado', 'liberado'].includes(situacaoRecebimento(r).cod))],
    ['Por data certa — a vencer', lista.filter(r => situacaoRecebimento(r).cod === 'previsto')],
    ['Aguardando entrega de fase', lista.filter(r => situacaoRecebimento(r).cod === 'aguardando')],
  ];
  area.innerHTML = grupos.map(([tit, l]) => `<div class="cartao" style="margin-bottom:16px">
    <div class="cartao-cab"><h2>${tit}</h2><span class="fraco">${l.length} · ${moeda(soma(l))}</span></div>
    ${l.length ? `<div class="tabela-envolve"><table class="tabela"><tbody>${l.map(r => linhaRec(r)).join('')}</tbody></table></div>` : '<div class="vazio">Nada aqui.</div>'}
  </div>`).join('');
  ligarRec(area);
}

function tabRecebidos(area, recs) {
  const lista = recs.filter(r => r.status === 'pago').sort((a, b) => String(b.pago_em).localeCompare(String(a.pago_em)));
  area.innerHTML = `<div class="cartao">${lista.length ? `<div class="tabela-envolve"><table class="tabela">
    <thead><tr><th>Descrição</th><th>Condição</th><th>Situação</th><th class="num">Valor</th><th></th></tr></thead>
    <tbody>${lista.map(r => linhaRec(r, false)).join('')}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td class="num">${moeda(soma(lista))}</td><td></td></tr></tfoot></table></div>` : '<div class="vazio">Nenhum recebimento registrado.</div>'}</div>`;
  ligarRec(area);
}

function tabPagar(area, aPagar) {
  const extrato = [...store.pagamentos_parceiros].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 30);
  area.innerHTML = `<div class="cartao" style="margin-bottom:16px">
    <div class="cartao-cab"><h2>Saldo com cada parceiro</h2><button class="btn btn-peq btn-primario" id="lancar-pag">${icone('mais', 14)} Lançar pagamento</button></div>
    ${aPagar.length ? `<div class="tabela-envolve"><table class="tabela">
    <thead><tr><th>Parceiro</th><th class="num">Cobrado</th><th class="num">Pago</th><th class="num">Saldo a pagar</th><th></th></tr></thead>
    <tbody>${aPagar.map(({ p, conta }) => `<tr>
      <td><a href="#/parceiro/${p.id}">${h(p.nome)}</a><div class="fraco">${h(p.especialidade || '')}${p.pix ? ' · PIX: ' + h(p.pix) : ''}</div></td>
      <td class="num">${moeda(conta.total)}</td><td class="num">${moeda(conta.pago)}</td>
      <td class="num" style="color:var(--terracota)">${moeda(conta.saldo)}</td>
      <td class="num"><button class="btn btn-peq" data-pagar-parc="${p.id}">${icone('mais', 13)} Pagamento</button></td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td></td><td></td><td class="num">${moeda(aPagar.reduce((s, x) => s + x.conta.saldo, 0))}</td><td></td></tr></tfoot></table></div>`
    : '<div class="vazio">Nenhum saldo a pagar aos parceiros.</div>'}</div>
    <div class="cartao"><div class="cartao-cab"><h2>Últimos pagamentos aos parceiros</h2></div>${extratoPagamentos(extrato, { mostrarParceiro: true })}</div>`;
  area.querySelector('#lancar-pag').addEventListener('click', () => formPagamentoParceiro());
  area.querySelectorAll('[data-pagar-parc]').forEach(b => b.addEventListener('click', () => formPagamentoParceiro(null, b.dataset.pagarParc)));
  ligarExtrato(area);
}

function tabAno(area, recs) {
  const meses = MESES.map((m, i) => {
    const chave = `${ano}-${String(i + 1).padStart(2, '0')}`;
    const recebido = soma(recs.filter(r => r.status === 'pago' && String(r.pago_em || '').startsWith(chave)));
    const previsto = soma(recs.filter(r => r.status !== 'pago' && String(dataReferencia(r) || '').startsWith(chave)));
    const pagar = soma(store.pagamentos_parceiros.filter(p => String(p.data || '').startsWith(chave)));
    const despesas = soma(store.despesas.filter(d => String(d.vencimento || '').startsWith(chave)));
    return { m, recebido, previsto, pagar, despesas, resultado: recebido - pagar - despesas };
  });
  const max = Math.max(1, ...meses.map(x => x.recebido + x.previsto));
  area.innerHTML = `
    <div class="cartao" style="margin-bottom:16px">
      <div class="cartao-cab"><h2>Entradas por mês — ${ano}</h2>
        <button class="btn-icone" data-ano="-1" title="Ano anterior">${icone('voltar', 16)}</button>
        <button class="btn-icone" data-ano="1" title="Próximo ano">${icone('seta', 16)}</button></div>
      <div class="cartao-corpo">
        <div class="legenda" style="margin-bottom:6px"><span><i style="background:${COR_RECEBIDO}"></i>Recebido</span><span><i style="background:${COR_ARECEBER}"></i>A receber (previsto pela data ou prazo da fase)</span></div>
        <div class="grafico-mes" style="position:relative">
          <div class="barras-mes">${meses.map((x, i) => {
            const hr = x.recebido / max * 100, hp = x.previsto / max * 100;
            return `<div class="b" data-mes="${i}" tabindex="0" aria-label="${x.m}: recebido ${moeda(x.recebido)}, a receber ${moeda(x.previsto)}">
              <div class="pilha" style="height:${Math.max(hr + hp, 0.8)}%">
                ${hr ? `<span style="height:${hr / (hr + hp) * 100}%;background:${COR_RECEBIDO}"></span>` : ''}
                ${hp ? `<span style="height:${hp / (hr + hp) * 100}%;background:${COR_ARECEBER};${hr ? 'margin-bottom:2px' : ''}"></span>` : ''}
              </div><div class="m">${x.m}</div></div>`;
          }).join('')}</div>
          <div class="dica-grafico oculto"></div>
        </div>
      </div>
    </div>
    <div class="cartao tabela-envolve"><table class="tabela">
      <thead><tr><th>Mês</th><th class="num">Recebido</th><th class="num">A receber</th><th class="num">Despesas</th><th class="num">Pago a parceiros</th><th class="num">Resultado</th></tr></thead>
      <tbody>${meses.map((x, i) => `<tr class="clicavel" data-ir-mes="${i}"><td>${x.m}</td><td class="num">${moeda(x.recebido)}</td><td class="num">${moeda(x.previsto)}</td><td class="num">${moeda(x.despesas)}</td><td class="num">${moeda(x.pagar)}</td>
        <td class="num" style="color:${x.resultado < 0 ? 'var(--perigo)' : 'inherit'}">${moeda(x.resultado)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td>${['recebido', 'previsto', 'despesas', 'pagar', 'resultado'].map(k => `<td class="num">${moeda(meses.reduce((s, x) => s + x[k], 0))}</td>`).join('')}</tr></tfoot>
    </table></div>`;
  area.querySelectorAll('[data-ano]').forEach(b => b.addEventListener('click', () => { ano += Number(b.dataset.ano); nav.recarregar(); }));
  area.querySelectorAll('[data-ir-mes]').forEach(tr => tr.addEventListener('click', () => {
    mesSel = `${ano}-${String(Number(tr.dataset.irMes) + 1).padStart(2, '0')}`; aba = 'mes'; nav.recarregar(); window.scrollTo(0, 0);
  }));
  // dica ao passar o mouse
  const dica = area.querySelector('.dica-grafico');
  const graf = area.querySelector('.grafico-mes');
  area.querySelectorAll('[data-mes]').forEach(b => {
    const mostrar = () => {
      const x = meses[b.dataset.mes];
      dica.innerHTML = `<b>${x.m} ${ano}</b><br><span style="color:${COR_RECEBIDO}">■</span> Recebido ${moeda(x.recebido)}<br><span style="color:${COR_ARECEBER}">■</span> A receber ${moeda(x.previsto)}`;
      dica.classList.remove('oculto');
      const rb = b.getBoundingClientRect(), rg = graf.getBoundingClientRect();
      dica.style.left = Math.min(rb.left - rg.left + rb.width / 2, rg.width - 90) + 'px';
      b.classList.add('foco');
    };
    const esconder = () => { dica.classList.add('oculto'); b.classList.remove('foco'); };
    b.addEventListener('mouseenter', mostrar); b.addEventListener('focus', mostrar);
    b.addEventListener('mouseleave', esconder); b.addEventListener('blur', esconder);
  });
}
