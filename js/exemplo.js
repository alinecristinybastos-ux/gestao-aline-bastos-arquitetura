// =====================================================================
//  Dados de exemplo — usados SOMENTE no modo demonstração
//  (quando o Supabase ainda não foi configurado em config.js)
// =====================================================================
import { store, inserir, atualizar } from './dados.js?v=202611221646';
import { montarModelo, PAGAMENTOS_PADRAO } from './modelos.js?v=202611221646';
import { criarProjeto, etapasDo, itensDa } from './negocio.js?v=202611221646';
import { hoje, somarDias } from './util.js?v=202611221646';

const d = (n) => somarDias(hoje(), n);

async function projetoExemplo({ cliente, nome, categoria, tipo, intervencao, inicio, valor, endereco, area, concluir, parcial, pagos = 1, extras = [] }) {
  const modelo = montarModelo(categoria, tipo, intervencao).filter(e => !e.opcional);
  let ini = inicio;
  const etapas = modelo.map(e => { const o = { ...e, data_inicio: ini, prazo: somarDias(ini, e.dias - 1) }; ini = somarDias(o.prazo, 1); return o; });
  const recebimentos = PAGAMENTOS_PADRAO.map(pg => ({
    descricao: pg.descricao, valor: valor * pg.pct / 100, gatilho: 'etapa',
    etapaIndice: Math.max(0, etapas.findIndex(e => e.chave === pg.chave)),
  })).concat(extras);
  const p = await criarProjeto({
    projeto: { cliente_id: cliente.id, nome, categoria, tipo, intervencao, valor_contrato: valor, endereco_obra: endereco, area_m2: area, contrato_assinado: nome !== 'Apartamento Helena',
      data_assinatura: inicio, data_inicio: inicio, data_prevista: etapas[etapas.length - 1].prazo },
    etapas, recebimentos,
  });
  const ets = etapasDo(p.id);
  for (let i = 0; i < concluir; i++) {
    for (const it of itensDa(ets[i].id)) await atualizar('itens', it.id, { status: 'concluido', data: ets[i].prazo, responsavel: i % 2 ? 'Julia' : 'Aline' });
    await atualizar('etapas', ets[i].id, { status: 'concluida', concluida_em: ets[i].prazo });
  }
  if (ets[concluir]) {
    await atualizar('etapas', ets[concluir].id, { status: 'andamento' });
    const its = itensDa(ets[concluir].id);
    for (const it of its.slice(0, Math.round(its.length * parcial))) await atualizar('itens', it.id, { status: 'concluido', data: hoje(), responsavel: 'Aline' });
    if (its[Math.round(its.length * parcial)]) await atualizar('itens', its[Math.round(its.length * parcial)].id, { status: 'andamento', responsavel: 'Julia' });
  }
  // pagamentos já recebidos
  const recs = store.recebimentos.filter(r => r.projeto_id === p.id).sort((a, b) => a.ordem - b.ordem);
  for (const r of recs.slice(0, pagos)) await atualizar('recebimentos', r.id, { status: 'pago', pago_em: inicio, forma: 'PIX' });
  return p;
}

export async function criarDadosExemplo() {
  const [costa, clinica, sabor, helena, rodrigo] = await inserir('clientes', [
    { familia: [{ nome: 'Rafael Costa', parentesco: 'Cônjuge', idade: 41, idade_em: hoje(), profissao: 'Médico', obs: 'Plantões noturnos — quarto precisa de blackout' }, { nome: 'Laura', parentesco: 'Filho(a)', idade: 9, idade_em: hoje(), profissao: 'Estudante', obs: 'Faz balé' }, { nome: 'Pedro', parentesco: 'Filho(a)', idade: 5, idade_em: hoje() }], nome: 'Mariana e Rafael Costa', telefone: '(31) 99876-1122', email: 'mariana.costa@email.com', cidade: 'Belo Horizonte', origem: 'Indicação', documento: '123.456.789-00' },
    { tipo_pessoa: 'juridica', responsaveis: [{ nome: 'Dra. Paula Mendes', cargo: 'Sócia-diretora', telefone: '(31) 98765-4433' }, { nome: 'Lúcia Ramos', cargo: 'Gerente administrativa', email: 'lucia@viverbem.com' }], nome: 'Clínica Viver Bem Ltda', telefone: '(31) 98765-4433', email: 'contato@viverbem.com', cidade: 'Contagem', origem: 'Instagram' },
    { tipo_pessoa: 'juridica', responsaveis: [{ nome: 'Eng. Roberto Saldanha', cargo: 'Gerente de engenharia', telefone: '(31) 99876-5544' }], nome: 'Sabor do Campo Alimentos Ltda', telefone: '(31) 3333-2211', email: 'obras@sabordocampo.com', cidade: 'Betim', origem: 'Construtora parceira', documento: '12.345.678/0001-90' },
    { nome: 'Helena Duarte', telefone: '(31) 99111-2233', email: 'helena.duarte@email.com', cidade: 'Nova Lima', origem: 'Cliente antigo' },
    { nome: 'Rodrigo Albuquerque', telefone: '(31) 99555-7788', cidade: 'Belo Horizonte', origem: 'Google' },
  ]);
  const [carlos, fernanda, marcos] = await inserir('parceiros', [
    { nome: 'Eng. Carlos Ribeiro', especialidade: 'Projeto estrutural', empresa: 'Ribeiro Estruturas', registro: 'CREA-MG 123456', telefone: '(31) 99222-3344', pix: 'carlos@ribeiroestruturas.com' },
    { nome: 'Eng. Fernanda Lima', especialidade: 'Projeto elétrico de baixa tensão', registro: 'CREA-MG 234567', telefone: '(31) 99333-4455' },
    { nome: 'Eng. Marcos Tavares', especialidade: 'Projeto hidrossanitário e drenagem', empresa: 'MT Projetos', registro: 'CREA-MG 345678', telefone: '(31) 99444-5566' },
  ]);

  const p1 = await projetoExemplo({ cliente: costa, nome: 'Residência Costa', categoria: 'arquitetonico', tipo: 'residencial', intervencao: 'novo',
    inicio: d(-62), valor: 38000, endereco: 'Rua das Acácias, 120 — Condomínio Vale Verde', area: 280, concluir: 3, parcial: 0.55, pagos: 1 });
  const p2 = await projetoExemplo({ cliente: clinica, nome: 'Clínica Viver Bem', categoria: 'interiores', tipo: 'comercial', intervencao: 'reforma',
    inicio: d(-24), valor: 22000, endereco: 'Av. João César de Oliveira, 900 — sala 302', area: 140, concluir: 2, parcial: 0.7, pagos: 1 });
  const p3 = await projetoExemplo({ cliente: sabor, nome: 'Ampliação Galpão Sabor do Campo', categoria: 'arquitetonico', tipo: 'industrial', intervencao: 'ampliacao',
    inicio: d(-110), valor: 65000, endereco: 'Rod. Fernão Dias, km 492', area: 1850, concluir: 4, parcial: 0.3, pagos: 1,
    extras: [{ descricao: 'Aditivo — layout do refeitório', valor: 4800, gatilho: 'data', vencimento: d(-3) }] });
  const p4 = await projetoExemplo({ cliente: helena, nome: 'Apartamento Helena', categoria: 'interiores', tipo: 'residencial', intervencao: 'novo',
    inicio: d(-4), valor: 15000, endereco: 'Rua Ouro Preto, 45 — apto 801', area: 110, concluir: 1, parcial: 0.4, pagos: 1 });
  await projetoExemplo({ cliente: rodrigo, nome: 'Paginação de piso — Loft Rodrigo', categoria: 'arquitetonico', tipo: 'paginacao_piso', intervencao: null,
    inicio: d(-9), valor: 3200, endereco: 'Rua Tomé de Souza, 300', area: 75, concluir: 2, parcial: 0.2, pagos: 1 });

  await inserir('complementares', [
    { projeto_id: p1.id, parceiro_id: carlos.id, disciplina: 'Projeto estrutural', status: 'andamento', enviado_em: d(-6), prazo: d(14), valor: 6500,
      informacoes: 'Base arquitetônica do anteprojeto rev. 01. Laje da área gourmet com piscina sobre a garagem. Balanço de 2,5 m na fachada frontal.' },
    { projeto_id: p1.id, parceiro_id: fernanda.id, disciplina: 'Projeto elétrico de baixa tensão', status: 'a_enviar', prazo: d(28), valor: 3800, informacoes: 'Aguardar layout de interiores. Prever carregador de carro elétrico e automação.' },
    { projeto_id: p3.id, parceiro_id: marcos.id, disciplina: 'Projeto hidrossanitário e drenagem', status: 'revisao', enviado_em: d(-40), prazo: d(-2), valor: 7200,
      informacoes: 'Ampliação do vestiário (NR-24) e nova caixa de gordura do refeitório.' },
    { projeto_id: p3.id, parceiro_id: carlos.id, disciplina: 'Projeto estrutural', status: 'entregue', enviado_em: d(-60), prazo: d(-20), entregue_em: d(-22), valor: 14000 },
  ]);

  await inserir('pagamentos_parceiros', [
    { parceiro_id: carlos.id, data: d(-50), valor: 7000, forma: 'PIX', obs: 'Sinal — estrutural galpão' },
    { parceiro_id: carlos.id, data: d(-15), valor: 7000, forma: 'PIX', obs: 'Saldo estrutural galpão' },
    { parceiro_id: carlos.id, data: d(-3), valor: 2000, forma: 'PIX', obs: 'Adiantamento Residência Costa' },
    { parceiro_id: marcos.id, data: d(-30), valor: 3000, forma: 'Transferência' },
  ]);

  const g1 = crypto.randomUUID(), g2 = crypto.randomUUID(), g3 = crypto.randomUUID();
  const mesAnt = (n, dia) => { const t = new Date(); const x = new Date(t.getFullYear(), t.getMonth() + n, dia); return x.toISOString().slice(0, 10); };
  const desp = [];
  for (let i = -2; i <= 9; i++) {
    desp.push({ descricao: 'Salário Julia', categoria: 'Equipe (salários e encargos)', valor: 3500, vencimento: mesAnt(i, 5), grupo: g1, pago: i <= 0, pago_em: i <= 0 ? mesAnt(i, 5) : null, forma: 'PIX' });
    desp.push({ descricao: 'Claude Pro e ChatGPT', categoria: 'Software, IA e assinaturas', valor: 220, vencimento: mesAnt(i, 12), grupo: g2, pago: i <= 0, pago_em: i <= 0 ? mesAnt(i, 12) : null, forma: 'Cartão de crédito' });
    desp.push({ descricao: 'Contador', categoria: 'Contador', valor: 450, vencimento: mesAnt(i, 20), grupo: g3, pago: i < 0, pago_em: i < 0 ? mesAnt(i, 20) : null, forma: 'Boleto' });
  }
  desp.push({ descricao: 'DAS Simples Nacional', categoria: 'Impostos e taxas', valor: 980, vencimento: mesAnt(0, 20), pago: false, forma: 'Boleto' });
  desp.push({ descricao: 'Anuidade CAU', categoria: 'CAU / anuidades', valor: 690, vencimento: mesAnt(-1, 28), pago: true, pago_em: mesAnt(-1, 28) });
  await inserir('despesas', desp);

  await inserir('servicos', [
    { projeto_id: p1.id, servico: 'Processo de alvará na prefeitura', status: 'a_fazer', prazo: d(40), registros: [] },
    { projeto_id: p1.id, servico: 'Assinatura de RRT de projeto', status: 'concluido', referencia: '0001234567', concluido_em: d(-60), registros: [] },
    { projeto_id: p1.id, servico: 'Acompanhamento da obra', status: 'andamento', quantidade: 8, registros: [{ data: d(-20), obs: 'Marcação da obra e conferência das cotas de implantação' }, { data: d(-6), obs: 'Conferência das esperas e das alturas das vigas' }] },
    { projeto_id: p2.id, servico: 'Acompanhamento de compras', status: 'andamento', registros: [{ data: d(-5), obs: 'Revestimentos — Portobello Shop' }] },
  ]);

  await inserir('pendencias', [
    { projeto_id: p2.id, etapa_id: etapasDo(p2.id).find(e => e.status === 'andamento')?.id, tipo: 'aprovacao', descricao: 'Aprovar o layout da recepção e dos consultórios', solicitado_em: d(-6), prazo: d(-1), status: 'aberta', cobrancas: 1, ultima_cobranca: d(-3) },
    { projeto_id: p4.id, etapa_id: etapasDo(p4.id).find(e => e.status === 'andamento')?.id, tipo: 'acabamento', descricao: 'Escolher o porcelanato da sala e o granito da cozinha', solicitado_em: d(-2), prazo: d(2), status: 'aberta', cobrancas: 0 },
  ]);

  await inserir('tarefas', [
    { titulo: 'Renderizar imagens 3D da fachada', responsavel: 'Julia', projeto_id: p1.id, prazo: d(2), prioridade: 'alta', status: 'fazendo' },
    { titulo: 'Moodboard e paleta da recepção', responsavel: 'Julia', projeto_id: p2.id, prazo: d(4), prioridade: 'media', status: 'afazer' },
    { titulo: 'Medição do apartamento', responsavel: 'Aline', projeto_id: p4.id, prazo: d(1), prioridade: 'alta', status: 'afazer', descricao: 'Levar trena a laser. Fotografar pontos elétricos e hidráulicos.' },
    { titulo: 'Cobrar hidrossanitário revisado do Marcos', responsavel: 'Aline', projeto_id: p3.id, prazo: d(-1), prioridade: 'alta', status: 'afazer' },
    { titulo: 'Detalhamento da marcenaria dos consultórios', responsavel: 'Julia', projeto_id: p2.id, prazo: d(12), prioridade: 'media', status: 'afazer' },
    { titulo: 'Enviar proposta para Rodrigo (cozinha)', responsavel: 'Aline', prazo: d(3), prioridade: 'baixa', status: 'afazer' },
    { titulo: 'Reunião de apresentação do estudo preliminar', responsavel: 'Aline', projeto_id: p1.id, prazo: d(-12), prioridade: 'media', status: 'feito' },
  ].map((t, i) => ({ ...t, ordem: i })));

  await inserir('orcamentos', [
    { numero: '001/' + hoje().slice(0, 4), cliente_nome: 'Beatriz Fontes', telefone: '(31) 98888-1111', descricao: 'Reforma de cobertura duplex', categoria: 'interiores', tipo: 'residencial', intervencao: 'reforma', area_m2: 220, valor: 28000, data: d(-8), validade: d(7), status: 'enviado', condicoes: '30% na assinatura · 30% na apresentação do 3D · 40% na entrega final', escopo: 'Briefing e levantamento\nEstudo preliminar com 3D\nExecutivo de interiores com detalhamento de marcenaria' },
    { numero: '002/' + hoje().slice(0, 4), cliente_id: rodrigo.id, descricao: 'Projeto de cozinha planejada', categoria: 'interiores', tipo: 'residencial', intervencao: 'reforma', area_m2: 18, valor: 4500, data: d(-2), validade: d(13), status: 'rascunho' },
    { numero: '003/' + hoje().slice(0, 4), cliente_id: costa.id, projeto_id: p1.id, descricao: 'Residência Costa', categoria: 'arquitetonico', tipo: 'residencial', intervencao: 'novo', area_m2: 280, valor: 38000, data: d(-70), validade: d(-55), status: 'aprovado' },
    { numero: '004/' + hoje().slice(0, 4), cliente_nome: 'Loja Bella Moda', descricao: 'Interiores de loja', categoria: 'interiores', tipo: 'comercial', intervencao: 'reforma', area_m2: 60, valor: 9000, data: d(-30), validade: d(-15), status: 'recusado' },
  ]);
}
