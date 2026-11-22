// =====================================================================
//  Componentes compartilhados entre telas: formulários e anexos
// =====================================================================
import { store, inserir, atualizar, remover, porId, enviarArquivo, urlArquivo, apagarArquivo } from './dados.js?v=202611221347';
import { h, icone, formModal, abrirModal, confirmar, aviso, tentar, data, tamanhoArquivo, moeda, prazoTexto, hoje } from './util.js?v=202611221347';
import { EQUIPE } from './config.js?v=202611221347';
import { opcoesDisciplina, COMPLEMENTARES_PRINCIPAIS, DISCIPLINAS } from './modelos.js?v=202611221347';
import { nav } from './nav.js?v=202611221347';
import { STATUS_COMPL, complAtrasado, nomeParceiro, situacaoRecebimento, etapasDo, contaParceiro, pagamentoCompl } from './negocio.js?v=202611221347';

export const opcoesEquipe = () => EQUIPE.map(n => [n, n]);
export const opcoesClientes = () => [...store.clientes].sort((a, b) => a.nome.localeCompare(b.nome)).map(c => [c.id, c.nome]);
export const opcoesProjetos = (soAtivos = true) => store.projetos
  .filter(p => !soAtivos || p.status === 'ativo' || p.status === 'pausado')
  .sort((a, b) => a.nome.localeCompare(b.nome)).map(p => [p.id, p.nome]);
export const opcoesParceiros = () => [...store.parceiros].sort((a, b) => a.nome.localeCompare(b.nome))
  .map(p => [p.id, `${p.nome}${p.especialidade ? ' — ' + p.especialidade : ''}`]);

export const iniciais = (n) => String(n || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
export const avatar = (nome) => nome ? `<span class="avatar ${nome.toLowerCase() === 'julia' ? 'julia' : ''}" title="${h(nome)}">${h(iniciais(nome))}</span>` : '';

export function tagPrazo(iso, concluido) {
  const p = prazoTexto(iso, concluido);
  return `<span class="tag tag-${p.cls}">${icone('calendario', 12)} ${h(p.txt)}</span>`;
}

// ---------------------------------------------------------------- cliente
export const ehPJ = (c) => c?.tipo_pessoa === 'juridica';
export const responsaveisDe = (c) => (Array.isArray(c?.responsaveis) ? c.responsaveis : []).filter(r => r && r.nome);

export const PARENTESCOS = ['Cônjuge', 'Filho(a)', 'Enteado(a)', 'Pai', 'Mãe', 'Sogro(a)', 'Avô / Avó', 'Neto(a)', 'Irmão(ã)', 'Outro familiar', 'Funcionário(a) da casa', 'Outro morador'];
/** Idade atualizada: guarda a idade informada e a data em que foi informada. */
export function idadeAtual(f) {
  if (f?.idade === '' || f?.idade == null) return null;
  const anos = f.idade_em ? Math.floor((new Date() - new Date(f.idade_em + 'T12:00:00')) / (365.25 * 86400000)) : 0;
  return Number(f.idade) + Math.max(0, anos);
}
export const familiaDe = (c) => (Array.isArray(c?.familia) ? c.familia : []).filter(f => f && f.nome);

function linhaFamilia(f = {}) {
  const idade = idadeAtual(f);
  return `<div class="fam-linha" data-idade-em="${h(f.idade_em || '')}" data-idade-orig="${h(f.idade ?? '')}">
    <input class="entrada" data-fam="nome" placeholder="Nome *" value="${h(f.nome || '')}">
    <select class="entrada" data-fam="parentesco"><option value="">Parentesco…</option>${PARENTESCOS.map(p => `<option ${p === f.parentesco ? 'selected' : ''}>${h(p)}</option>`).join('')}</select>
    <input class="entrada" data-fam="idade" type="number" min="0" max="120" placeholder="Idade" value="${idade ?? ''}">
    <input class="entrada" data-fam="profissao" placeholder="Profissão / ocupação" value="${h(f.profissao || '')}">
    <input class="entrada" data-fam="obs" placeholder="Necessidades, rotina, hobbies…" value="${h(f.obs || '')}">
    <button type="button" class="btn-icone" data-rm-linha title="Remover">${icone('lixo', 15)}</button>
  </div>`;
}

function linhaResponsavel(r = {}) {
  return `<div class="resp-linha">
    <input class="entrada" data-resp="nome" placeholder="Nome do responsável *" value="${h(r.nome || '')}">
    <input class="entrada" data-resp="cargo" placeholder="Cargo / função" value="${h(r.cargo || '')}">
    <input class="entrada" data-resp="telefone" type="tel" placeholder="Telefone / WhatsApp" value="${h(r.telefone || '')}">
    <input class="entrada" data-resp="email" type="email" placeholder="E-mail" value="${h(r.email || '')}">
    <button type="button" class="btn-icone" data-rm-linha title="Remover responsável">${icone('lixo', 15)}</button>
  </div>`;
}

export function formCliente(cliente = null, aoSalvar) {
  const campos = [
    { nome: 'tipo_pessoa', rotulo: 'Tipo de cliente', tipo: 'select', vazio: false, largura: 'meia',
      opcoes: [['fisica', 'Pessoa física'], ['juridica', 'Pessoa jurídica (empresa)']] },
    { nome: 'documento', rotulo: 'CPF', largura: 'meia' },
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', largura: 'meia', tipo: 'tel' },
    { nome: 'email', rotulo: 'E-mail', largura: 'meia', tipo: 'email' },
    { nome: 'aniversario', rotulo: 'Aniversário', largura: 'meia', tipo: 'date' },
    { nome: 'endereco', rotulo: 'Endereço', largura: 'meia' },
    { nome: 'cidade', rotulo: 'Cidade', largura: 'meia' },
    { nome: 'origem', rotulo: 'Como chegou ao escritório', tipo: 'select', opcoes: ['Indicação', 'Instagram', 'Google', 'Site', 'Cliente antigo', 'Construtora parceira', 'Outro'].map(o => [o, o]), largura: 'meia' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
  ];
  const m = formModal({
    titulo: cliente ? 'Editar cliente' : 'Novo cliente', campos, largura: 680,
    valores: { tipo_pessoa: 'fisica', ...(cliente || {}) },
    onSalvar: async (d, modal) => {
      const pj = d.tipo_pessoa === 'juridica';
      d.responsaveis = pj ? [...modal.el.querySelectorAll('.resp-linha')].map(l => Object.fromEntries(
        [...l.querySelectorAll('[data-resp]')].map(i => [i.dataset.resp, i.value.trim()]))).filter(r => r.nome) : [];
      if (pj && !d.responsaveis.length) throw new Error('Informe pelo menos um responsável pelo projeto');
      d.familia = pj ? [] : [...modal.el.querySelectorAll('.fam-linha')].map(l => {
        const f = Object.fromEntries([...l.querySelectorAll('[data-fam]')].map(i => [i.dataset.fam, i.value.trim()]));
        // a idade é guardada com a data em que foi informada (assim se atualiza com os anos)
        const orig = { idade: l.dataset.idadeOrig, idade_em: l.dataset.idadeEm };
        if (f.idade === '') { f.idade = null; f.idade_em = null; }
        else if (orig.idade_em && String(idadeAtual(orig)) === f.idade) { f.idade = Number(orig.idade); f.idade_em = orig.idade_em; }
        else { f.idade = Number(f.idade); f.idade_em = hoje(); }
        return f;
      }).filter(f => f.nome);
      if (pj) d.aniversario = null;
      let c;
      if (cliente) c = await atualizar('clientes', cliente.id, d);
      else [c] = await inserir('clientes', d);
      aviso(cliente ? 'Cliente atualizado' : 'Cliente cadastrado');
      aoSalvar ? aoSalvar(c) : nav.recarregar();
    },
  });

  // blocos extras: responsáveis (empresa) e família (pessoa física)
  const form = m.el.querySelector('form');
  const criarBloco = (classe, titulo, ajuda, linhas, botao, novaLinha) => {
    const bl = document.createElement('div');
    bl.className = `campo bloco-resp ${classe}`;
    bl.innerHTML = `<div class="secao-form" style="grid-column:auto">${titulo}</div><small>${ajuda}</small>
      <div class="lista-linhas">${linhas}</div>
      <button type="button" class="btn btn-peq" data-add-linha style="align-self:flex-start">${icone('mais', 14)} ${botao}</button>`;
    const lista = bl.querySelector('.lista-linhas');
    const ligar = () => lista.querySelectorAll('[data-rm-linha]').forEach(b => { b.onclick = () => b.closest('.resp-linha, .fam-linha').remove(); });
    bl.adicionar = () => { lista.insertAdjacentHTML('beforeend', novaLinha()); ligar(); };
    bl.vazio = () => !lista.children.length;
    bl.querySelector('[data-add-linha]').addEventListener('click', () => { bl.adicionar(); lista.lastElementChild.querySelector('input').focus(); });
    ligar();
    return bl;
  };
  const bloco = criarBloco('bloco-pj', 'Responsáveis pelo projeto na empresa', 'Quem decide e acompanha o projeto. Pode incluir mais de um.',
    responsaveisDe(cliente).map(linhaResponsavel).join(''), 'Adicionar responsável', linhaResponsavel);
  const blocoFam = criarBloco('bloco-fam', 'Família / moradores da casa', 'Todos que vão usar os ambientes. A idade se atualiza sozinha com o passar dos anos.',
    familiaDe(cliente).map(linhaFamilia).join(''), 'Adicionar pessoa', linhaFamilia);
  form.insertBefore(bloco, form.elements.telefone.closest('.campo'));
  form.insertBefore(blocoFam, form.elements.origem.closest('.campo'));

  const rotulo = (nome, txt) => { form.elements[nome].closest('.campo').querySelector('label').firstChild.textContent = txt; };
  const alternar = () => {
    const pj = form.elements.tipo_pessoa.value === 'juridica';
    bloco.classList.toggle('oculto', !pj);
    blocoFam.classList.toggle('oculto', pj);
    rotulo('nome', pj ? 'Razão social / nome da empresa' : 'Nome completo');
    rotulo('documento', pj ? 'CNPJ' : 'CPF');
    rotulo('telefone', pj ? 'Telefone da empresa' : 'Telefone / WhatsApp');
    rotulo('email', pj ? 'E-mail da empresa' : 'E-mail');
    form.elements.aniversario.closest('.campo').classList.toggle('oculto', pj);
    if (pj && bloco.vazio()) bloco.adicionar();
  };
  form.elements.tipo_pessoa.addEventListener('change', alternar);
  alternar();
}

// ---------------------------------------------------------------- parceiro
export function formParceiro(parceiro = null, aoSalvar) {
  const campos = [
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, largura: 'meia' },
    { nome: 'empresa', rotulo: 'Empresa', largura: 'meia' },
    { nome: 'especialidade', rotulo: 'Especialidade principal', tipo: 'select', opcoes: opcoesDisciplina(parceiro?.especialidade), largura: 'meia' },
    { nome: 'registro', rotulo: 'CREA / CAU', largura: 'meia' },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', largura: 'meia', tipo: 'tel' },
    { nome: 'email', rotulo: 'E-mail', largura: 'meia', tipo: 'email' },
    { nome: 'pix', rotulo: 'Chave PIX / dados bancários' },
    { nome: 'obs', rotulo: 'Observações', tipo: 'textarea' },
  ];
  formModal({
    titulo: parceiro ? 'Editar parceiro' : 'Novo engenheiro parceiro', campos, valores: parceiro || {},
    onSalvar: async (d) => {
      let p;
      if (parceiro) p = await atualizar('parceiros', parceiro.id, d);
      else [p] = await inserir('parceiros', d);
      aviso('Parceiro salvo');
      aoSalvar ? aoSalvar(p) : nav.recarregar();
    },
  });
}

// ---------------------------------------------------------------- tarefa
export function formTarefa(tarefa = null, padrao = {}) {
  const campos = [
    { nome: 'titulo', rotulo: 'Tarefa', obrigatorio: true, placeholder: 'Ex.: Renderizar 3D da sala' },
    { nome: 'responsavel', rotulo: 'Responsável', tipo: 'select', opcoes: opcoesEquipe(), largura: 'meia' },
    { nome: 'prazo', rotulo: 'Prazo', tipo: 'date', largura: 'meia' },
    { nome: 'projeto_id', rotulo: 'Projeto', tipo: 'select', opcoes: opcoesProjetos(false), vazio: 'Nenhum (tarefa geral)', largura: 'meia' },
    { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'select', vazio: false, opcoes: [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']], largura: 'meia' },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: [['afazer', 'A fazer'], ['fazendo', 'Fazendo'], ['feito', 'Feito']], largura: 'meia' },
    { nome: 'descricao', rotulo: 'Detalhes', tipo: 'textarea', linhas: 4 },
  ];
  const m = formModal({
    titulo: tarefa ? 'Editar tarefa' : 'Nova tarefa', campos,
    valores: tarefa || { prioridade: 'media', status: 'afazer', responsavel: EQUIPE[0], ...padrao },
    extraRodape: tarefa ? `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)} Excluir</button>` : '',
    onSalvar: async (d) => {
      if (tarefa) await atualizar('tarefas', tarefa.id, d);
      else await inserir('tarefas', { ...d, ordem: 0 });
      aviso('Tarefa salva'); nav.recarregar();
    },
  });
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir esta tarefa?', { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('tarefas', tarefa.id), 'Tarefa excluída');
    m.fechar(); nav.recarregar();
  });
}

// ---------------------------------------------------------------- complementar (repasse ao parceiro)
export function formComplementar(c = null, padrao = {}) {
  const campos = [
    { nome: 'projeto_id', rotulo: 'Projeto', tipo: 'select', opcoes: opcoesProjetos(false), obrigatorio: true, largura: 'meia' },
    { nome: 'disciplina', rotulo: 'Disciplina', tipo: 'select', opcoes: opcoesDisciplina(c?.disciplina || padrao.disciplina), obrigatorio: true, largura: 'meia' },
    { nome: 'parceiro_id', rotulo: 'Engenheiro parceiro', tipo: 'select', opcoes: opcoesParceiros(), vazio: 'A definir', largura: 'meia' },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: Object.entries(STATUS_COMPL), largura: 'meia' },
    { nome: 'enviado_em', rotulo: 'Enviado em', tipo: 'date', largura: 'terco' },
    { nome: 'prazo', rotulo: 'Prazo de entrega do parceiro', tipo: 'date', largura: 'terco' },
    { nome: 'entregue_em', rotulo: 'Entregue em', tipo: 'date', largura: 'terco' },
    { nome: 'valor', rotulo: 'Valor cobrado pelo parceiro', tipo: 'moeda', largura: 'meia',
      ajuda: 'Os pagamentos ao parceiro são lançados em Parceiros e abatidos automaticamente' },
    { nome: 'informacoes', rotulo: 'Informações relevantes enviadas ao parceiro', tipo: 'textarea', linhas: 5,
      placeholder: 'Ex.: Base arquitetônica rev. 02; carga extra na laje da piscina; padrão de entrada de energia trifásico…' },
    { nome: 'arquivos', rotulo: 'Anexar arquivos (plantas, DWG, PDF…)', tipo: 'arquivo', multiplo: true },
    { nome: 'obs', rotulo: 'Observações internas', tipo: 'textarea', linhas: 2 },
  ];
  const m = formModal({
    titulo: c ? `Complementar — ${c.disciplina}` : 'Enviar projeto complementar ao parceiro', campos, largura: 680,
    valores: c || { status: 'a_enviar', ...padrao },
    extraRodape: c ? `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)} Excluir</button>` : '',
    onSalvar: async (d) => {
      const arquivos = d.arquivos || []; delete d.arquivos;
      if (d.status === 'entregue' && !d.entregue_em) d.entregue_em = hoje();
      if (d.status !== 'a_enviar' && !d.enviado_em) d.enviado_em = hoje();
      let reg;
      if (c) reg = await atualizar('complementares', c.id, d);
      else [reg] = await inserir('complementares', d);
      for (const f of arquivos) await anexar(f, 'complementar', reg.id, 'Enviado ao parceiro');
      aviso('Complementar salvo'); nav.recarregar();
    },
  });
  if (c) {
    // lista os anexos já enviados dentro do formulário
    const lista = store.anexos.filter(a => a.ref_tipo === 'complementar' && a.ref_id === c.id);
    if (lista.length) {
      const div = document.createElement('div');
      div.className = 'campo';
      div.innerHTML = `<label>Arquivos já anexados</label><div class="anexos">${lista.map(cartaoAnexo).join('')}</div>`;
      m.el.querySelector('form').insertBefore(div, m.el.querySelector('[name=obs]').closest('.campo'));
      ligarAnexos(div);
    }
  }
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir este projeto complementar?', { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('complementares', c.id), 'Excluído');
    m.fechar(); nav.recarregar();
  });
}

export function linhaComplementar(c, { mostrarProjeto = true } = {}) {
  const p = porId('projetos', c.projeto_id);
  const st = c.status === 'entregue' ? 'ok' : complAtrasado(c) ? 'atrasado' : c.status === 'a_enviar' ? 'neutro' : 'areia';
  const n = store.anexos.filter(a => a.ref_tipo === 'complementar' && a.ref_id === c.id).length;
  return `<tr class="clicavel" data-compl="${c.id}">
    <td><div>${h(c.disciplina)}</div>${mostrarProjeto ? `<div class="fraco">${h(p?.nome || '—')}</div>` : ''}</td>
    <td>${h(nomeParceiro(c.parceiro_id))}</td>
    <td><span class="tag tag-${st}">${complAtrasado(c) ? 'Atrasado · ' : ''}${h(STATUS_COMPL[c.status] || c.status)}</span></td>
    <td>${c.status === 'entregue' ? `<span class="fraco">entregue ${data(c.entregue_em)}</span>` : tagPrazo(c.prazo)}</td>
    <td class="num">${Number(c.valor) ? moeda(c.valor) : '—'}</td>
    <td>${tagPagamentoCompl(c)}</td>
    <td class="fraco">${n ? `${icone('anexo', 14)} ${n}` : ''}</td>
  </tr>`;
}
export function tagPagamentoCompl(c) {
  const pg = pagamentoCompl(c);
  if (pg.cod === 'sem_valor') return '<span class="fraco">valor a definir</span>';
  if (pg.cod === 'pago') return '<span class="tag tag-ok">Quitado</span>';
  if (pg.cod === 'parcial') return `<span class="tag tag-areia" title="Pago ${moeda(pg.pago)}">Falta ${moeda(pg.falta)}</span>`;
  return '<span class="tag tag-alerta">A pagar</span>';
}

export function ligarLinhasComplementares(raiz) {
  raiz.querySelectorAll('[data-compl]').forEach(tr => tr.addEventListener('click', () => formComplementar(porId('complementares', tr.dataset.compl))));
}

// ---------------------------------------------------------------- pagamentos aos parceiros
export function formPagamentoParceiro(pg = null, parceiroId = null) {
  const pid = pg?.parceiro_id || parceiroId;
  const saldoAtual = pid ? contaParceiro(pid).saldo : null;
  const campos = [
    { nome: 'parceiro_id', rotulo: 'Parceiro', tipo: 'select', opcoes: opcoesParceiros(), obrigatorio: true },
    { nome: 'data', rotulo: 'Data do pagamento', tipo: 'date', obrigatorio: true, largura: 'meia', padrao: hoje() },
    { nome: 'valor', rotulo: 'Valor pago', tipo: 'moeda', obrigatorio: true, largura: 'meia',
      ajuda: saldoAtual != null && !pg ? `Saldo a pagar hoje: ${moeda(saldoAtual)}` : '' },
    { nome: 'forma', rotulo: 'Forma', tipo: 'select', opcoes: ['PIX', 'Transferência', 'Boleto', 'Dinheiro', 'Cheque'].map(o => [o, o]), largura: 'meia' },
    { nome: 'obs', rotulo: 'Observação', largura: 'meia', placeholder: 'Ex.: adiantamento estrutural Residência Costa' },
    { nome: 'comprovante', rotulo: 'Comprovante (opcional)', tipo: 'arquivo', aceita: '.pdf,image/*' },
  ];
  const m = formModal({
    titulo: pg ? 'Editar pagamento ao parceiro' : 'Lançar pagamento ao parceiro', campos,
    valores: pg || { parceiro_id: pid },
    extraRodape: pg ? `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)} Excluir</button>` : '',
    onSalvar: async d => {
      const arq = d.comprovante; delete d.comprovante;
      if (!(Number(d.valor) > 0)) throw new Error('Informe o valor pago');
      let reg;
      if (pg) reg = await atualizar('pagamentos_parceiros', pg.id, d);
      else [reg] = await inserir('pagamentos_parceiros', d);
      if (arq) await anexar(arq, 'pagamento_parceiro', reg.id, 'Comprovante');
      const conta = contaParceiro(d.parceiro_id);
      aviso(`Pagamento lançado. Saldo com ${nomeParceiro(d.parceiro_id)}: ${conta.credito ? `crédito de ${moeda(conta.credito)}` : moeda(conta.saldo)}`);
      nav.recarregar();
    },
  });
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir este pagamento? O valor volta para o saldo a pagar.', { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('pagamentos_parceiros', pg.id), 'Pagamento excluído');
    m.fechar(); nav.recarregar();
  });
}

/** Tabela de pagamentos lançados (extrato). */
export function extratoPagamentos(lista, { mostrarParceiro = false } = {}) {
  if (!lista.length) return '<div class="vazio">Nenhum pagamento lançado.</div>';
  return `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Data</th>${mostrarParceiro ? '<th>Parceiro</th>' : ''}<th>Forma</th><th>Observação</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${lista.map(p => {
      const comp = store.anexos.find(a => a.ref_tipo === 'pagamento_parceiro' && a.ref_id === p.id);
      return `<tr><td>${data(p.data)}</td>${mostrarParceiro ? `<td>${h(nomeParceiro(p.parceiro_id))}</td>` : ''}
        <td>${h(p.forma || '')}</td><td class="fraco">${h(p.obs || '')}</td><td class="num">${moeda(p.valor)}</td>
        <td class="num">${comp ? `<button class="btn-icone" data-abrir-anexo="${h(comp.path)}" title="Ver comprovante">${icone('anexo', 15)}</button>` : ''}
          <button class="btn-icone" data-ed-pagparc="${p.id}" title="Editar">${icone('editar', 15)}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}
export function ligarExtrato(raiz) {
  raiz.querySelectorAll('[data-ed-pagparc]').forEach(b => b.addEventListener('click', () => formPagamentoParceiro(porId('pagamentos_parceiros', b.dataset.edPagparc))));
  raiz.querySelectorAll('[data-abrir-anexo]').forEach(b => b.addEventListener('click', () => abrirArquivo(b.dataset.abrirAnexo)));
}

// ---------------------------------------------------------------- complementares contratados
/** Prazo sugerido: antes da compatibilização (ou fim do executivo). */
export function prazoSugeridoComplementar(projetoId) {
  const ets = etapasDo(projetoId);
  const comp = ets.find(e => e.chave === 'compatibilizacao');
  if (comp?.data_inicio) return comp.data_inicio;
  return (ets.find(e => e.chave === 'executivo') || ets.find(e => e.chave === 'desenvolvimento'))?.prazo || null;
}

export async function registrarComplementares(projetoId, disciplinas) {
  const ja = store.complementares.filter(c => c.projeto_id === projetoId).map(c => c.disciplina);
  const novas = disciplinas.filter(d => !ja.includes(d));
  const prazo = prazoSugeridoComplementar(projetoId);
  if (novas.length) await inserir('complementares', novas.map(d => ({ projeto_id: projetoId, disciplina: d, status: 'a_enviar', prazo, valor: 0 })));
  return novas.length;
}

export function chipsComplementares(selecionados, extras = true) {
  const lista = extras ? DISCIPLINAS.filter(d => d !== 'Outro') : COMPLEMENTARES_PRINCIPAIS;
  return `<div class="chips">${lista.map(d => `<button type="button" class="chip ${selecionados.includes(d) ? 'sel' : ''}" data-comp-ctr="${h(d)}">${selecionados.includes(d) ? '✓ ' : ''}${h(d)}</button>`).join('')}</div>`;
}

/** Janela para marcar/desmarcar os complementares contratados de um projeto. */
export function formComplementaresContratados(projetoId) {
  const existentes = store.complementares.filter(c => c.projeto_id === projetoId);
  let sel = existentes.map(c => c.disciplina);
  const m = abrirModal({
    titulo: 'Complementares contratados pelo cliente', largura: 640,
    corpo: `<p class="fraco" style="margin-bottom:12px">Marque o que foi contratado. Cada um vira uma linha para você escolher o parceiro, o prazo e o valor, e acompanhar a entrega.</p><div id="cc-chips"></div>`,
    rodape: `<span class="espaco"></span><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Salvar</button>`,
  });
  const desenhar = () => {
    m.el.querySelector('#cc-chips').innerHTML = chipsComplementares(sel);
    m.el.querySelectorAll('[data-comp-ctr]').forEach(b => b.addEventListener('click', () => {
      const d = b.dataset.compCtr; sel = sel.includes(d) ? sel.filter(x => x !== d) : [...sel, d]; desenhar();
    }));
  };
  desenhar();
  m.el.querySelector('[data-ok]').addEventListener('click', async () => {
    const remover_ = existentes.filter(c => !sel.includes(c.disciplina));
    const presos = remover_.filter(c => c.parceiro_id || Number(c.valor) || c.status !== 'a_enviar');
    if (presos.length && !await confirmar(`${presos.map(c => c.disciplina).join(', ')} já ${presos.length > 1 ? 'têm' : 'tem'} parceiro, valor ou envio registrado. Remover mesmo assim?`, { ok: 'Remover', perigo: true })) return;
    await tentar(async () => {
      for (const c of remover_) await remover('complementares', c.id);
      await registrarComplementares(projetoId, sel);
    }, 'Complementares atualizados');
    m.fechar(); nav.recarregar();
  });
}

// ---------------------------------------------------------------- recebimento
export function formRecebimento(r = null, projetoId) {
  const etapas = etapasDo(projetoId);
  const campos = [
    { nome: 'descricao', rotulo: 'Descrição', obrigatorio: true, placeholder: 'Ex.: Entrada, Apresentação do 3D, Entrega final…' },
    { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, largura: 'meia' },
    { nome: 'gatilho', rotulo: 'Quando é cobrado', tipo: 'select', vazio: false, largura: 'meia',
      opcoes: [['etapa', 'Na conclusão de uma etapa'], ['data', 'Em data certa']] },
    { nome: 'etapa_id', rotulo: 'Etapa que libera o pagamento', tipo: 'select', opcoes: etapas.map(e => [e.id, e.nome]), largura: 'meia' },
    { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'date', largura: 'meia' },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: [['previsto', 'A receber'], ['pago', 'Recebido']], largura: 'meia' },
    { nome: 'pago_em', rotulo: 'Recebido em', tipo: 'date', largura: 'meia' },
    { nome: 'forma', rotulo: 'Forma de pagamento', tipo: 'select', opcoes: ['PIX', 'Transferência', 'Boleto', 'Cartão', 'Dinheiro', 'Cheque'].map(o => [o, o]), largura: 'meia' },
    { nome: 'obs', rotulo: 'Observações', largura: 'meia' },
  ];
  const m = formModal({
    titulo: r ? 'Editar pagamento' : 'Novo pagamento programado', campos,
    valores: r || { gatilho: 'data', status: 'previsto' },
    extraRodape: r ? `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)} Excluir</button>` : '',
    onSalvar: async (d) => {
      if (d.gatilho === 'etapa') { if (!d.etapa_id) throw new Error('Escolha a etapa que libera o pagamento'); d.vencimento = null; }
      else { d.etapa_id = null; }
      if (d.status === 'pago' && !d.pago_em) d.pago_em = hoje();
      if (d.status !== 'pago') d.pago_em = null;
      if (r) await atualizar('recebimentos', r.id, d);
      else await inserir('recebimentos', { ...d, projeto_id: projetoId, ordem: store.recebimentos.length });
      aviso('Pagamento salvo'); nav.recarregar();
    },
  });
  const f = m.el.querySelector('form');
  const alternar = () => {
    const porEtapa = f.gatilho.value === 'etapa';
    f.etapa_id.closest('.campo').classList.toggle('oculto', !porEtapa);
    f.vencimento.closest('.campo').classList.toggle('oculto', porEtapa);
    f.pago_em.closest('.campo').classList.toggle('oculto', f.status.value !== 'pago');
  };
  f.gatilho.addEventListener('change', alternar); f.status.addEventListener('change', alternar); alternar();
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir este pagamento?', { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('recebimentos', r.id), 'Pagamento excluído');
    m.fechar(); nav.recarregar();
  });
}

export function tagRecebimento(r) {
  const s = situacaoRecebimento(r);
  const cls = { pago: 'ok', atrasado: 'atrasado', liberado: 'terracota', aguardando: 'neutro', previsto: 'areia' }[s.cod];
  return `<span class="tag tag-${cls}" title="${h(s.txt)}">${h(s.txt.length > 34 ? s.txt.slice(0, 33) + '…' : s.txt)}</span>`;
}

export async function marcarRecebido(r) {
  await atualizar('recebimentos', r.id, { status: 'pago', pago_em: hoje() });
  aviso(`${moeda(r.valor)} recebido`, 'dinheiro');
}

// ---------------------------------------------------------------- anexos
export async function anexar(file, refTipo, refId, categoria = 'Arquivo') {
  const pasta = `${refTipo}s/${refId}`;
  const arq = await enviarArquivo(file, pasta);
  const [a] = await inserir('anexos', { ref_tipo: refTipo, ref_id: refId, categoria, nome: arq.nome, path: arq.path, tamanho: arq.tamanho });
  return a;
}

export function cartaoAnexo(a) {
  return `<div class="anexo">
    <div class="ic-arq">${icone(/\.pdf$/i.test(a.nome) ? 'pdf' : 'arquivo', 18)}</div>
    <div class="info"><button type="button" class="link" data-abrir-anexo="${h(a.path)}" title="${h(a.nome)}">${h(a.nome)}</button>
      <small>${h(a.categoria || 'Arquivo')} · ${data(String(a.criado_em || '').slice(0, 10))} ${tamanhoArquivo(a.tamanho)}</small></div>
    <button type="button" class="btn-icone" data-apagar-anexo="${a.id}" title="Excluir arquivo">${icone('lixo', 15)}</button>
  </div>`;
}

export async function abrirArquivo(path) {
  // abre a janela antes (evita bloqueio de pop-up) e depois aponta para o link
  const janela = window.open('', '_blank');
  try {
    const url = await urlArquivo(path);
    if (!url) { janela?.close(); aviso('No modo demonstração arquivos grandes guardam só o nome.', 'erro'); return; }
    if (url.startsWith('data:')) {
      const blob = await (await fetch(url)).blob();
      janela.location = URL.createObjectURL(blob);
    } else janela.location = url;
  } catch (e) { janela?.close(); aviso(e.message, 'erro'); }
}

export function ligarAnexos(raiz) {
  raiz.querySelectorAll('[data-abrir-anexo]').forEach(b => b.addEventListener('click', () => abrirArquivo(b.dataset.abrirAnexo)));
  raiz.querySelectorAll('[data-apagar-anexo]').forEach(b => b.addEventListener('click', async () => {
    const a = porId('anexos', b.dataset.apagarAnexo);
    if (!a || !await confirmar(`Excluir o arquivo "${a.nome}"?`, { ok: 'Excluir', perigo: true })) return;
    await tentar(async () => {
      await apagarArquivo(a.path); await remover('anexos', a.id);
      const p = store.projetos.find(x => x.contrato_path === a.path);
      if (p) await atualizar('projetos', p.id, { contrato_path: null, contrato_nome: null });
    }, 'Arquivo excluído');
    nav.recarregar();
  }));
}

/** Bloco completo de anexos com área para soltar arquivos. */
export function blocoAnexos(refTipo, refId, { categorias = ['Arquivo'], titulo = 'Arquivos' } = {}) {
  const lista = store.anexos.filter(a => a.ref_tipo === refTipo && a.ref_id === refId)
    .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
  return `<div class="bloco-anexos" data-ref-tipo="${refTipo}" data-ref-id="${refId}">
    <div class="filtros">
      <label class="fraco">Tipo do arquivo:</label>
      <select data-cat-anexo>${categorias.map(c => `<option>${h(c)}</option>`).join('')}</select>
    </div>
    <label class="soltar-arquivos">${icone('anexo')} Clique ou arraste arquivos aqui para anexar a ${h(titulo.toLowerCase())}
      <input type="file" multiple hidden data-input-anexo></label>
    ${lista.length ? `<div class="anexos">${lista.map(cartaoAnexo).join('')}</div>` : '<div class="vazio">Nenhum arquivo anexado ainda.</div>'}
  </div>`;
}

export function ligarBlocoAnexos(raiz) {
  raiz.querySelectorAll('.bloco-anexos').forEach(bloco => {
    const { refTipo, refId } = bloco.dataset;
    const zona = bloco.querySelector('.soltar-arquivos');
    const enviar = async (files) => {
      if (!files.length) return;
      const cat = bloco.querySelector('[data-cat-anexo]').value;
      zona.textContent = 'Enviando…';
      await tentar(async () => {
        for (const f of files) {
          const a = await anexar(f, refTipo, refId, cat);
          if (refTipo === 'projeto' && cat === 'Contrato') await atualizar('projetos', refId, { contrato_path: a.path, contrato_nome: a.nome });
        }
      }, files.length > 1 ? `${files.length} arquivos anexados` : 'Arquivo anexado');
      nav.recarregar();
    };
    bloco.querySelector('[data-input-anexo]').addEventListener('change', e => enviar([...e.target.files]));
    zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('sobre'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('sobre'));
    zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('sobre'); enviar([...e.dataTransfer.files]); });
  });
  ligarAnexos(raiz);
}
