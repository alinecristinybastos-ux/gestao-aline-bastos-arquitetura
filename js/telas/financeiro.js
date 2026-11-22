// =====================================================================
//  FINANCEIRO — a receber (programados por data ou por fase),
//  a pagar aos parceiros e visão do ano
// =====================================================================
import { store, porId, atualizar } from '../dados.js?v=202611221307';
import { h, icone, moeda, data, hoje, tentar, aviso } from '../util.js?v=202611221307';
import { nav } from '../nav.js?v=202611221307';
import { nomeCliente, situacaoRecebimento, dataReferencia, nomeParceiro } from '../negocio.js?v=202611221307';
import { tagRecebimento, marcarRecebido, formRecebimento, formComplementar } from '../componentes.js?v=202611221307';

let aba = 'receber';
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
  const recebidosAno = recs.filter(r => r.status === 'pago' && String(r.pago_em || '').startsWith(String(ano)));
  const aPagar = store.complementares.filter(c => !c.pago && Number(c.valor));

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Financeiro</h1><div class="sub">Pagamentos programados por data certa ou pela entrega de fases do projeto.</div></div></div>
    <div class="indicadores">
      <div class="indicador ${cobrar.length ? 'alerta' : ''}"><div class="rot">Para cobrar agora</div><div class="val">${moeda(soma(cobrar))}</div><div class="det">fases entregues ou datas vencidas</div></div>
      <div class="indicador"><div class="rot">A receber (total)</div><div class="val">${moeda(soma(abertos))}</div><div class="det">${abertos.length} parcelas</div></div>
      <div class="indicador destaque"><div class="rot">Recebido em ${ano}</div><div class="val">${moeda(soma(recebidosAno))}</div></div>
      <div class="indicador"><div class="rot">A pagar a parceiros</div><div class="val">${moeda(soma(aPagar))}</div><div class="det">${aPagar.length} complementares</div></div>
    </div>
    <div class="abas">
      ${[['receber', 'A receber', abertos.length], ['recebidos', 'Recebidos'], ['pagar', 'A pagar (parceiros)', aPagar.length], ['ano', 'Visão do ano']]
        .map(([k, n, c]) => `<button data-aba="${k}" class="${aba === k ? 'ativo' : ''}">${n}${c ? ` <span class="contagem">${c}</span>` : ''}</button>`).join('')}
    </div>
    <div id="fin-area"></div>`;
  const area = el.querySelector('#fin-area');
  ({ receber: () => tabReceber(area, abertos), recebidos: () => tabRecebidos(area, recs), pagar: () => tabPagar(area, aPagar), ano: () => tabAno(area, recs) })[aba]();
  el.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { aba = b.dataset.aba; render(el); }));
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
  area.innerHTML = `<div class="cartao">${aPagar.length ? `<div class="tabela-envolve"><table class="tabela">
    <thead><tr><th>Parceiro</th><th>Disciplina / projeto</th><th>Entrega</th><th class="num">Valor</th><th></th></tr></thead>
    <tbody>${aPagar.map(c => `<tr>
      <td>${h(nomeParceiro(c.parceiro_id))}</td>
      <td><div>${h(c.disciplina)}</div><div class="fraco">${h(porId('projetos', c.projeto_id)?.nome || '')}</div></td>
      <td>${c.status === 'entregue' ? `<span class="tag tag-ok">Entregue ${data(c.entregue_em)}</span>` : `<span class="tag tag-neutro">Prazo ${data(c.prazo)}</span>`}</td>
      <td class="num">${moeda(c.valor)}</td>
      <td class="num"><button class="btn btn-peq" data-pagar="${c.id}">${icone('check', 14)} Pago</button>
        <button class="btn-icone" data-ed-compl="${c.id}">${icone('editar', 15)}</button></td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="3">Total a pagar</td><td class="num">${moeda(soma(aPagar))}</td><td></td></tr></tfoot></table></div>` : '<div class="vazio">Nenhum valor a pagar aos parceiros.</div>'}</div>`;
  area.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', async () => {
    await tentar(() => atualizar('complementares', b.dataset.pagar, { pago: true, pago_em: hoje() }));
    aviso('Pagamento ao parceiro registrado'); nav.recarregar();
  }));
  area.querySelectorAll('[data-ed-compl]').forEach(b => b.addEventListener('click', () => formComplementar(porId('complementares', b.dataset.edCompl))));
}

function tabAno(area, recs) {
  const meses = MESES.map((m, i) => {
    const chave = `${ano}-${String(i + 1).padStart(2, '0')}`;
    const recebido = soma(recs.filter(r => r.status === 'pago' && String(r.pago_em || '').startsWith(chave)));
    const previsto = soma(recs.filter(r => r.status !== 'pago' && String(dataReferencia(r) || '').startsWith(chave)));
    const pagar = soma(store.complementares.filter(c => String((c.pago ? c.pago_em : c.prazo) || '').startsWith(chave)));
    return { m, recebido, previsto, pagar };
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
      <thead><tr><th>Mês</th><th class="num">Recebido</th><th class="num">A receber</th><th class="num">Parceiros</th></tr></thead>
      <tbody>${meses.map(x => `<tr><td>${x.m}</td><td class="num">${moeda(x.recebido)}</td><td class="num">${moeda(x.previsto)}</td><td class="num">${moeda(x.pagar)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${moeda(meses.reduce((s, x) => s + x.recebido, 0))}</td><td class="num">${moeda(meses.reduce((s, x) => s + x.previsto, 0))}</td><td class="num">${moeda(meses.reduce((s, x) => s + x.pagar, 0))}</td></tr></tfoot>
    </table></div>`;
  area.querySelectorAll('[data-ano]').forEach(b => b.addEventListener('click', () => { ano += Number(b.dataset.ano); nav.recarregar(); }));
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
