// =====================================================================
//  Componentes compartilhados entre telas: formulários e anexos
// =====================================================================
import { store, inserir, atualizar, remover, porId, enviarArquivo, urlArquivo, apagarArquivo } from './dados.js?v=202611221235';
import { h, icone, formModal, confirmar, aviso, tentar, data, tamanhoArquivo, moeda, prazoTexto, hoje } from './util.js?v=202611221235';
import { EQUIPE } from './config.js?v=202611221235';
import { DISCIPLINAS } from './modelos.js?v=202611221235';
import { nav } from './nav.js?v=202611221235';
import { STATUS_COMPL, complAtrasado, nomeParceiro, situacaoRecebimento, etapasDo } from './negocio.js?v=202611221235';

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
export function formCliente(cliente = null, aoSalvar) {
  const campos = [
    { nome: 'nome', rotulo: 'Nome completo / Razão social', obrigatorio: true },
    { nome: 'documento', rotulo: 'CPF / CNPJ', largura: 'meia' },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', largura: 'meia', tipo: 'tel' },
    { nome: 'email', rotulo: 'E-mail', largura: 'meia', tipo: 'email' },
    { nome: 'aniversario', rotulo: 'Aniversário', largura: 'meia', tipo: 'date' },
    { nome: 'endereco', rotulo: 'Endereço', largura: 'meia' },
    { nome: 'cidade', rotulo: 'Cidade', largura: 'meia' },
    { nome: 'origem', rotulo: 'Como chegou ao escritório', tipo: 'select', opcoes: ['Indicação', 'Instagram', 'Google', 'Site', 'Cliente antigo', 'Construtora parceira', 'Outro'].map(o => [o, o]) },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
  ];
  formModal({
    titulo: cliente ? 'Editar cliente' : 'Novo cliente', campos, valores: cliente || {},
    onSalvar: async (d) => {
      let c;
      if (cliente) c = await atualizar('clientes', cliente.id, d);
      else [c] = await inserir('clientes', d);
      aviso(cliente ? 'Cliente atualizado' : 'Cliente cadastrado');
      aoSalvar ? aoSalvar(c) : nav.recarregar();
    },
  });
}

// ---------------------------------------------------------------- parceiro
export function formParceiro(parceiro = null, aoSalvar) {
  const campos = [
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, largura: 'meia' },
    { nome: 'empresa', rotulo: 'Empresa', largura: 'meia' },
    { nome: 'especialidade', rotulo: 'Especialidade principal', tipo: 'select', opcoes: DISCIPLINAS.map(d => [d, d]), largura: 'meia' },
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
    { nome: 'disciplina', rotulo: 'Disciplina', tipo: 'select', opcoes: DISCIPLINAS.map(d => [d, d]), obrigatorio: true, largura: 'meia' },
    { nome: 'parceiro_id', rotulo: 'Engenheiro parceiro', tipo: 'select', opcoes: opcoesParceiros(), vazio: 'A definir', largura: 'meia' },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: Object.entries(STATUS_COMPL), largura: 'meia' },
    { nome: 'enviado_em', rotulo: 'Enviado em', tipo: 'date', largura: 'terco' },
    { nome: 'prazo', rotulo: 'Prazo de entrega do parceiro', tipo: 'date', largura: 'terco' },
    { nome: 'entregue_em', rotulo: 'Entregue em', tipo: 'date', largura: 'terco' },
    { nome: 'valor', rotulo: 'Valor cobrado pelo parceiro', tipo: 'moeda', largura: 'meia' },
    { nome: 'pago_em', rotulo: 'Pago ao parceiro em', tipo: 'date', largura: 'meia', ajuda: 'Preencha quando pagar' },
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
      d.pago = !!d.pago_em;
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
    <td class="num">${moeda(c.valor)}</td>
    <td>${c.pago ? '<span class="tag tag-ok">Pago</span>' : '<span class="tag tag-alerta">A pagar</span>'}</td>
    <td class="fraco">${n ? `${icone('anexo', 14)} ${n}` : ''}</td>
  </tr>`;
}
export function ligarLinhasComplementares(raiz) {
  raiz.querySelectorAll('[data-compl]').forEach(tr => tr.addEventListener('click', () => formComplementar(porId('complementares', tr.dataset.compl))));
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
