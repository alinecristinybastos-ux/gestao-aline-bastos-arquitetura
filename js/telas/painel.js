// =====================================================================
//  PAINEL — visão geral do escritório
// =====================================================================
import { store, porId } from '../dados.js?v=202611221511';
import { h, icone, moeda, diasAte, hoje, prazoTexto, tentar } from '../util.js?v=202611221511';
import { nav } from '../nav.js?v=202611221511';
import { ESCRITORIO } from '../config.js?v=202611221511';
import { nomeCliente, faseAtual, progressoProjeto, situacaoRecebimento, complAtrasado, nomeParceiro, aguardandoParceiros, pendenciasAbertas } from '../negocio.js?v=202611221511';
import { tagPrazo, tagRecebimento, marcarRecebido, linhaPendencia, ligarPendencias } from '../componentes.js?v=202611221511';
import { novoProjeto } from './projetos.js?v=202611221511';

function saudacao() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
}

function proximosPrazos() {
  const lista = [];
  const LIMITE = 21;
  store.projetos.filter(p => p.status === 'ativo').forEach(p => {
    const f = faseAtual(p.id);
    if (f?.prazo && diasAte(f.prazo) <= LIMITE) lista.push({ data: f.prazo, tit: f.nome, sub: p.nome, tipo: 'Etapa', ir: `projeto/${p.id}` });
  });
  store.complementares.filter(c => c.status !== 'entregue' && c.prazo && diasAte(c.prazo) <= LIMITE).forEach(c => {
    lista.push({ data: c.prazo, tit: `${c.disciplina} — ${nomeParceiro(c.parceiro_id)}`, sub: porId('projetos', c.projeto_id)?.nome || '', tipo: 'Parceiro', ir: `projeto/${c.projeto_id}/complementares` });
  });
  store.tarefas.filter(t => t.status !== 'feito' && t.prazo && diasAte(t.prazo) <= LIMITE).forEach(t => {
    lista.push({ data: t.prazo, tit: t.titulo, sub: `${t.responsavel || ''}${t.projeto_id ? ' · ' + (porId('projetos', t.projeto_id)?.nome || '') : ''}`, tipo: 'Tarefa', ir: 'tarefas' });
  });
  store.despesas.filter(x => !x.pago && x.vencimento && diasAte(x.vencimento) <= 7).forEach(x => {
    lista.push({ data: x.vencimento, tit: `${x.descricao} · ${moeda(x.valor)}`, sub: x.categoria || '', tipo: 'Despesa', ir: 'financeiro' });
  });
  store.servicos.filter(x => x.status !== 'concluido' && x.prazo && diasAte(x.prazo) <= LIMITE).forEach(x => {
    lista.push({ data: x.prazo, tit: x.servico, sub: porId('projetos', x.projeto_id)?.nome || '', tipo: 'Serviço', ir: `projeto/${x.projeto_id}/servicos` });
  });
  pendenciasAbertas().filter(x => x.prazo && diasAte(x.prazo) <= LIMITE).forEach(x => {
    lista.push({ data: x.prazo, tit: `Cobrar cliente: ${x.descricao}`, sub: porId('projetos', x.projeto_id)?.nome || '', tipo: 'Cliente', ir: `projeto/${x.projeto_id}` });
  });
  store.recebimentos.filter(r => r.status !== 'pago' && r.gatilho === 'data' && r.vencimento && diasAte(r.vencimento) <= LIMITE).forEach(r => {
    lista.push({ data: r.vencimento, tit: `${r.descricao} · ${moeda(r.valor)}`, sub: porId('projetos', r.projeto_id)?.nome || '', tipo: 'Recebimento', ir: `projeto/${r.projeto_id}/financeiro` });
  });
  return lista.sort((a, b) => a.data.localeCompare(b.data)).slice(0, 14);
}

export function render(el) {
  const ativos = store.projetos.filter(p => p.status === 'ativo');
  const etapasAtrasadas = ativos.filter(p => { const f = faseAtual(p.id); return f?.prazo && diasAte(f.prazo) < 0; }).length;
  const paraCobrar = store.recebimentos.filter(r => ['liberado', 'atrasado'].includes(situacaoRecebimento(r).cod));
  const mes = hoje().slice(0, 7);
  const recebidoMes = store.recebimentos.filter(r => r.status === 'pago' && (r.pago_em || '').startsWith(mes)).reduce((s, r) => s + Number(r.valor || 0), 0);
  const aReceber = store.recebimentos.filter(r => r.status !== 'pago' && porId('projetos', r.projeto_id)?.status !== 'cancelado').reduce((s, r) => s + Number(r.valor || 0), 0);
  const tarefasAbertas = store.tarefas.filter(t => t.status !== 'feito');
  const tarefasAtrasadas = tarefasAbertas.filter(t => t.prazo && diasAte(t.prazo) < 0).length;
  const complAtras = store.complementares.filter(complAtrasado).length;
  const prazos = proximosPrazos();
  const nomeMes = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  el.innerHTML = `
    <div class="cab">
      <div class="titulos"><h1>${saudacao()}, ${h(ESCRITORIO.nome.split(' ')[0])}</h1>
        <div class="sub">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <div class="acoes"><button class="btn btn-primario" id="p-novo">${icone('mais', 16)} Novo projeto</button></div>
    </div>

    <div class="indicadores">
      <div class="indicador destaque"><div class="rot">Projetos em andamento</div><div class="val">${ativos.length}</div>
        <div class="det">${etapasAtrasadas ? `${etapasAtrasadas} com etapa atrasada` : 'nenhuma etapa atrasada'}</div></div>
      <div class="indicador ${paraCobrar.length ? 'alerta' : ''}"><div class="rot">Para cobrar agora</div><div class="val">${moeda(paraCobrar.reduce((s, r) => s + Number(r.valor || 0), 0))}</div>
        <div class="det">${paraCobrar.length} pagamento${paraCobrar.length === 1 ? '' : 's'} liberado${paraCobrar.length === 1 ? '' : 's'} ou vencido${paraCobrar.length === 1 ? '' : 's'}</div></div>
      <div class="indicador"><div class="rot">Recebido em ${nomeMes}</div><div class="val">${moeda(recebidoMes)}</div>
        <div class="det">${moeda(aReceber)} ainda a receber</div></div>
      <div class="indicador ${tarefasAtrasadas ? 'alerta' : ''}"><div class="rot">Tarefas abertas</div><div class="val">${tarefasAbertas.length}</div>
        <div class="det">${tarefasAtrasadas ? `${tarefasAtrasadas} atrasada${tarefasAtrasadas === 1 ? '' : 's'}` : 'em dia'}${complAtras ? ` · ${complAtras} complementar atrasado` : ''}</div></div>
    </div>

    <div class="grade grade-painel">
      <div class="grade">
        <div class="cartao">
          <div class="cartao-cab"><h2>Projetos em andamento</h2><a href="#/projetos" class="btn btn-peq btn-leve">Ver quadro ${icone('seta', 14)}</a></div>
          ${ativos.length ? ativos.map(p => ({ p, f: faseAtual(p.id), pr: progressoProjeto(p.id) }))
            .sort((a, b) => String(a.f?.prazo || '9').localeCompare(String(b.f?.prazo || '9')))
            .map(({ p, f, pr }) => `<div class="linha-proj" data-ir="projeto/${p.id}">
              <div style="min-width:0"><div class="nome">${h(p.nome)}</div>
                <div class="det">${h(nomeCliente(p.cliente_id))} · <span style="color:var(--verde)">${h(f ? f.nome : 'Etapas concluídas')}</span>${aguardandoParceiros(p.id) ? ` · <span style="color:var(--terracota)">aguardando parceiros (${aguardandoParceiros(p.id).recebidos}/${aguardandoParceiros(p.id).total})</span>` : ''}</div></div>
              <div><div class="progresso"><span style="width:${pr.pct}%"></span></div><div class="pct">${pr.pct}% · etapa ${pr.etapasFeitas + 1 > pr.etapas ? pr.etapas : pr.etapasFeitas + 1} de ${pr.etapas}</div></div>
              <div class="col-prazo" style="text-align:right">${f ? tagPrazo(f.prazo) : ''}</div>
            </div>`).join('')
            : `<div class="vazio">Nenhum projeto em andamento.<br><button class="btn btn-primario" id="p-novo2">Cadastrar o primeiro projeto</button></div>`}
        </div>

        ${pendenciasAbertas().length ? `<div class="alerta-cliente" style="margin-bottom:0"><div class="cab-alerta">${icone('alerta', 16)} Aguardando os clientes (${pendenciasAbertas().length})</div>
          ${pendenciasAbertas().map(x => `<div data-ir="projeto/${x.projeto_id}" style="cursor:pointer">${linhaPendencia(x, { mostrarProjeto: true })}</div>`).join('')}</div>` : ''}

        <div class="cartao">
          <div class="cartao-cab"><h2>Pagamentos para cobrar</h2><a href="#/financeiro" class="btn btn-peq btn-leve">Financeiro ${icone('seta', 14)}</a></div>
          ${paraCobrar.length ? `<div class="tabela-envolve"><table class="tabela"><tbody>${paraCobrar.map(r => {
            const p = porId('projetos', r.projeto_id);
            return `<tr><td><div>${h(r.descricao)}</div><div class="fraco">${h(p?.nome || '')} · ${h(nomeCliente(p?.cliente_id))}</div></td>
              <td>${tagRecebimento(r)}</td><td class="num">${moeda(r.valor)}</td>
              <td class="num"><button class="btn btn-peq" data-receber="${r.id}">${icone('check', 14)} Recebido</button></td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="vazio">Nada para cobrar agora. Os pagamentos por fase aparecem aqui assim que a etapa é concluída.</div>'}
        </div>
      </div>

      <div class="cartao">
        <div class="cartao-cab"><h2>Próximos prazos</h2><span class="fraco">3 semanas</span></div>
        ${prazos.length ? `<ul class="lista-prazos">${prazos.map(x => {
          const pz = prazoTexto(x.data);
          const [, m, d] = x.data.split('-');
          const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1];
          return `<li data-ir="${x.ir}"><div class="dia"><b style="${pz.cls === 'atrasado' ? 'color:var(--perigo)' : ''}">${Number(d)}</b><span>${mes}</span></div>
            <div class="txt"><div>${h(x.tit)}</div><small>${h(x.tipo)} · ${h(x.sub)}</small></div>
            <span class="tag tag-${pz.cls}">${h(pz.txt)}</span></li>`;
        }).join('')}</ul>` : '<div class="vazio">Sem prazos nas próximas semanas.</div>'}
      </div>
    </div>`;

  el.querySelectorAll('[data-ir]').forEach(d => d.addEventListener('click', () => nav.ir(d.dataset.ir)));
  ligarPendencias(el);
  el.querySelector('#p-novo').addEventListener('click', () => novoProjeto());
  el.querySelector('#p-novo2')?.addEventListener('click', () => novoProjeto());
  el.querySelectorAll('[data-receber]').forEach(b => b.addEventListener('click', async () => {
    await tentar(() => marcarRecebido(porId('recebimentos', b.dataset.receber))); nav.recarregar();
  }));
}
