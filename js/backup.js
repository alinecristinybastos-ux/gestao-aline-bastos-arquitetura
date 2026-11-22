// =====================================================================
//  BACKUP — baixa uma cópia de todos os dados para guardar fora
//  - Planilha Excel (uma aba por tabela) para consultar
//  - Arquivo .json completo, que permite restaurar o banco
//  Os arquivos anexados (PDFs, imagens) continuam no Supabase; a
//  planilha traz a lista deles na aba "Anexos".
// =====================================================================
import { store, TABELAS, carregarTudo, modoDemo, porId } from './dados.js?v=202611221736';
import { abrirModal, aviso, icone, hoje, data } from './util.js?v=202611221736';

const CHAVE = 'ab_ultimo_backup';
const NOMES = {
  clientes: 'Clientes', projetos: 'Projetos', etapas: 'Etapas', itens: 'Itens do checklist',
  recebimentos: 'Recebimentos', orcamentos: 'Orçamentos', parceiros: 'Parceiros',
  complementares: 'Complementares', pagamentos_parceiros: 'Pagamentos parceiros',
  pendencias: 'Pendências cliente', servicos: 'Serviços', despesas: 'Despesas',
  tarefas: 'Tarefas', anexos: 'Anexos',
};

export function ultimoBackup() {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}
function marcarBackup() {
  try { localStorage.setItem(CHAVE, hoje()); } catch { /* navegador sem armazenamento */ }
}
/** Dias desde o último backup feito neste navegador (null = nunca). */
export function diasSemBackup() {
  const u = ultimoBackup();
  if (!u) return null;
  return Math.round((new Date(hoje() + 'T12:00') - new Date(u + 'T12:00')) / 86400000);
}

function baixar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Acrescenta nomes legíveis (cliente, projeto, parceiro, etapa) ao lado dos códigos. */
function legivel(linha) {
  const o = {};
  for (const [k, v] of Object.entries(linha)) {
    o[k] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
    if (k === 'cliente_id' && v) o.cliente = porId('clientes', v)?.nome || '';
    if (k === 'projeto_id' && v) o.projeto = porId('projetos', v)?.nome || '';
    if (k === 'parceiro_id' && v) o.parceiro = porId('parceiros', v)?.nome || '';
    if (k === 'etapa_id' && v) o.etapa = porId('etapas', v)?.nome || '';
  }
  return o;
}

let libXlsx = null;
function carregarXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (libXlsx) return libXlsx;
  libXlsx = new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => ok(window.XLSX);
    s.onerror = () => { libXlsx = null; erro(new Error('Não foi possível carregar o gerador de planilha. Verifique a internet.')); };
    document.head.appendChild(s);
  });
  return libXlsx;
}

async function baixarPlanilha() {
  const XLSX = await carregarXlsx();
  const wb = XLSX.utils.book_new();
  TABELAS.forEach(t => {
    const linhas = (store[t] || []).map(legivel);
    const ws = linhas.length ? XLSX.utils.json_to_sheet(linhas) : XLSX.utils.aoa_to_sheet([['(sem registros)']]);
    XLSX.utils.book_append_sheet(wb, ws, (NOMES[t] || t).slice(0, 31));
  });
  XLSX.writeFile(wb, `backup-aline-bastos-${hoje()}.xlsx`);
}

function baixarJson() {
  const pacote = {
    sistema: 'Gestão Aline Bastos Arquitetura', gerado_em: new Date().toISOString(),
    tabelas: Object.fromEntries(TABELAS.map(t => [t, store[t] || []])),
  };
  baixar(JSON.stringify(pacote, null, 1), `backup-aline-bastos-${hoje()}.json`, 'application/json');
}

export function abrirBackup() {
  const total = TABELAS.reduce((s, t) => s + (store[t] || []).length, 0);
  const u = ultimoBackup();
  const m = abrirModal({
    titulo: 'Baixar backup', largura: 540,
    corpo: `<p style="margin-bottom:12px">Salva uma cópia de todos os dados do escritório (${total.toLocaleString('pt-BR')} registros) no seu computador.
        Guarde no Google Drive, num pen drive ou no e-mail.</p>
      <div class="grade" style="gap:10px">
        <button class="opcao-tipo" data-bk="xlsx"><b>${icone('lista', 16)} Planilha Excel</b><small>Para consultar: uma aba para clientes, projetos, financeiro, despesas…</small></button>
        <button class="opcao-tipo" data-bk="json"><b>${icone('arquivo', 16)} Arquivo completo (.json)</b><small>Para restaurar: cópia exata do banco. Guarde este também.</small></button>
      </div>
      <p class="fraco" style="margin-top:12px;font-size:.85rem">Os arquivos anexados (PDFs, imagens) ficam guardados no Supabase; a planilha traz a lista deles.
        ${u ? `Último backup neste navegador: ${data(u)}.` : 'Nenhum backup feito ainda neste navegador.'}</p>`,
    rodape: `<span class="espaco"></span><button class="btn" data-fechar>Fechar</button>`,
  });
  m.el.querySelectorAll('[data-bk]').forEach(b => b.addEventListener('click', async () => {
    const original = b.innerHTML;
    b.disabled = true; b.querySelector('small').textContent = 'Preparando…';
    try {
      if (!modoDemo) await carregarTudo();
      if (b.dataset.bk === 'xlsx') await baixarPlanilha(); else baixarJson();
      marcarBackup();
      aviso('Backup baixado. Guarde o arquivo num lugar seguro.');
    } catch (e) { aviso(e.message, 'erro'); }
    b.disabled = false; b.innerHTML = original;
  }));
}
