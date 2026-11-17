import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Wallet, TrendingDown, TrendingUp, Sparkles, Calculator, Info, Save, RefreshCw } from 'lucide-react';

const brl = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const monthLabel = value => new Date(value + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export function SalaryCenter({ transactions = [], supabase, session, onRefresh }) {
  const [salaryName,setSalaryName]=useState('Salário');
  const [salaryAmount,setSalaryAmount]=useState('');
  const [payDay,setPayDay]=useState('5');
  const [firstPayDate,setFirstPayDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [salaryCategory,setSalaryCategory]=useState('Salário');
  const [savingSalary,setSavingSalary]=useState(false);
  const [salaryMessage,setSalaryMessage]=useState('');
  const [allocationBills,setAllocationBills]=useState('50');
  const [allocationGoals,setAllocationGoals]=useState('20');
  const [allocationReserve,setAllocationReserve]=useState('10');
  const allocationFree=100-(Number(allocationBills)||0)-(Number(allocationGoals)||0)-(Number(allocationReserve)||0);
  const monthlyAmount=Math.max(0,Number(salaryAmount)||0);
  const formattedPayDate=new Date(firstPayDate+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const distribution=[
    {label:'Contas e compromissos',percent:Number(allocationBills)||0,color:'bills',icon:Wallet},
    {label:'Metas e objetivos',percent:Number(allocationGoals)||0,color:'goals',icon:Target},
    {label:'Reserva financeira',percent:Number(allocationReserve)||0,color:'reserve',icon:ShieldCheck},
    {label:'Livre para usar',percent:Math.max(0,allocationFree),color:'free',icon:Coins}
  ];
  async function saveSalaryAutomation(){
    if(!supabase||!session?.user?.id){setSalaryMessage('Entre na sua conta para configurar o salário.');return;}
    const amount=Number(salaryAmount), day=Number(payDay);
    const percentages=[Number(allocationBills),Number(allocationGoals),Number(allocationReserve)];
    if(!(amount>0)||!Number.isFinite(amount)||day<1||day>31){setSalaryMessage('Informe um salário válido e um dia entre 1 e 31.');return;}
    if(percentages.some(value=>!Number.isFinite(value)||value<0||value>100)||allocationFree<0){setSalaryMessage('Revise os percentuais. A distribuição precisa ficar entre 0% e 100%.');return;}
    setSavingSalary(true);setSalaryMessage('');
    const date=new Date(firstPayDate+'T12:00:00');
    if(Number.isNaN(date.getTime())){setSavingSalary(false);setSalaryMessage('Escolha uma data válida para o primeiro recebimento.');return;}
    const first=await supabase.from('transactions').insert({user_id:session.user.id,date:firstPayDate,type:'entrada',category:salaryCategory||'Salário',description:salaryName||'Salário',amount}).select('id').single();
    if(first.error){setSavingSalary(false);setSalaryMessage('Não foi possível registrar a primeira entrada: '+first.error.message);return;}
    const nextMonth=new Date(date.getFullYear(),date.getMonth()+1,1).toISOString().slice(0,10);
    const recurrence=await supabase.from('recurring_incomes').insert({user_id:session.user.id,description:salaryName||'Salário',amount,category:salaryCategory||'Salário',day_of_month:day,start_month:nextMonth,active:true});
    if(recurrence.error){await supabase.from('transactions').delete().eq('id',first.data.id).eq('user_id',session.user.id);setSavingSalary(false);setSalaryMessage('A automação não foi ativada: '+recurrence.error.message);return;}
    setSavingSalary(false);
    setSalaryMessage('Configuração salva! A primeira entrada foi registrada e a recorrência começa no próximo mês.');
    await onRefresh?.();
  }
  const [salary, setSalary] = useState('');
  const [months, setMonths] = useState('12');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const gross = Math.max(0, Number(salary) || 0) * Math.min(12, Math.max(0, Number(months) || 0)) / 12;
  const firstInstallment = gross / 2;
  const secondBeforeDeductions = gross / 2;
  return <div className="salary-center salary-redesign">
    <section className="salary-hero-pro">
      <div className="salary-hero-copy">
        <div className="salary-kicker-pro"><Sparkles size={14}/> NEXUS FINANCE <span>•</span> PLANEJAMENTO DE RENDA</div>
        <h2>Seu salário no <em>controle.</em></h2>
        <p>Configure seu recebimento uma vez, visualize a distribuição do dinheiro e acompanhe as próximas entradas em um só lugar.</p>
        <div className="salary-hero-tags"><span><ShieldCheck size={13}/> Seus dados protegidos</span><span><CalendarDays size={13}/> Organização mensal</span></div>
      </div>
      <div className="salary-hero-art" aria-hidden="true">
        <div className="salary-orbit salary-orbit-one"></div><div className="salary-orbit salary-orbit-two"></div>
        <div className="salary-hero-icon"><Wallet size={34}/></div>
        <span className="salary-orbit-dot dot-one"></span><span className="salary-orbit-dot dot-two"></span>
      </div>
    </section>

    <section className="salary-overview-grid">
      <article className="salary-overview-card salary-overview-main">
        <div className="salary-overview-icon"><CircleDollarSign size={19}/></div>
        <span>Salário mensal configurado</span>
        <strong>{monthlyAmount>0?brl(monthlyAmount):'Defina seu valor'}</strong>
        <small>{monthlyAmount>0?'Valor informado para seus recebimentos':'Seu valor aparecerá aqui'}</small>
      </article>
      <article className="salary-overview-card">
        <div className="salary-overview-icon cyan"><CalendarDays size={18}/></div>
        <span>Primeiro recebimento</span>
        <strong className="salary-date-value">{formattedPayDate}</strong>
        <small>Data escolhida para o primeiro lançamento</small>
      </article>
      <article className="salary-overview-card">
        <div className="salary-overview-icon green"><RefreshCw size={18}/></div>
        <span>Dia recorrente</span>
        <strong>Todo dia {payDay || '—'}</strong>
        <small>Previsão para os próximos meses</small>
      </article>
    </section>

    <div className="salary-main-grid">
      <section className="panel salary-config-panel">
        <div className="salary-section-heading">
          <div><span className="salary-step">01 / CONFIGURAÇÃO</span><h3>Configure seu salário</h3><p>Preencha os dados do seu pagamento mensal.</p></div>
          <div className="salary-heading-icon"><Wallet size={20}/></div>
        </div>
        <div className="salary-field-grid">
          <label className="salary-field salary-field-wide"><span>Nome do recebimento</span><input value={salaryName} onChange={e=>setSalaryName(e.target.value)} placeholder="Ex.: Salário da empresa"/></label>
          <label className="salary-field"><span>Valor mensal <i>R$</i></span><input type="number" min="0" step="0.01" inputMode="decimal" value={salaryAmount} onChange={e=>setSalaryAmount(e.target.value)} placeholder="0,00"/></label>
          <label className="salary-field"><span>Categoria</span><input value={salaryCategory} onChange={e=>setSalaryCategory(e.target.value)} placeholder="Salário"/></label>
          <label className="salary-field"><span>Dia habitual de pagamento</span><input type="number" min="1" max="31" value={payDay} onChange={e=>setPayDay(e.target.value)}/></label>
          <label className="salary-field"><span>Data do primeiro recebimento</span><input type="date" value={firstPayDate} onChange={e=>setFirstPayDate(e.target.value)}/></label>
        </div>
        <div className="salary-form-divider"></div>
        <div className="salary-section-heading salary-distribution-heading">
          <div><span className="salary-step">02 / DISTRIBUIÇÃO</span><h3>Para onde vai seu dinheiro?</h3><p>Defina como pretende organizar cada salário recebido.</p></div>
          <span className="salary-total-chip">100% do salário</span>
        </div>
        <div className="salary-allocation-fields">
          <label className="salary-allocation-field bills"><span><i></i> Contas e compromissos</span><div><input type="number" min="0" max="100" value={allocationBills} onChange={e=>setAllocationBills(e.target.value)}/><b>%</b></div></label>
          <label className="salary-allocation-field goals"><span><i></i> Metas e objetivos</span><div><input type="number" min="0" max="100" value={allocationGoals} onChange={e=>setAllocationGoals(e.target.value)}/><b>%</b></div></label>
          <label className="salary-allocation-field reserve"><span><i></i> Reserva financeira</span><div><input type="number" min="0" max="100" value={allocationReserve} onChange={e=>setAllocationReserve(e.target.value)}/><b>%</b></div></label>
          <div className="salary-allocation-field free"><span><i></i> Saldo livre</span><strong>{Math.max(0,allocationFree)}%</strong></div>
        </div>
        <button type="button" className="primary salary-save-button" disabled={savingSalary} onClick={saveSalaryAutomation}><Save size={17}/>{savingSalary?'Ativando sua automação...':'Salvar e ativar salário automático'}<ArrowUpRight size={16}/></button>
        {salaryMessage&&<p className={'salary-feedback '+(salaryMessage.startsWith('Configuração salva')?'success':'')} role="status">{salaryMessage}</p>}
        <p className="salary-disclaimer"><Info size={15}/> A configuração registra a primeira entrada na data escolhida e cria a recorrência mensal. A distribuição é um planejamento visual: não realiza transferências nem paga contas automaticamente.</p>
      </section>

      <aside className="salary-preview-column">
        <section className="panel salary-preview-panel">
          <div className="salary-preview-heading"><div><span className="salary-step">VISÃO DO SEU ORÇAMENTO</span><h3>Distribuição prevista</h3></div><span className="salary-live-dot">AO VIVO</span></div>
          <div className="salary-preview-total"><small>Valor de referência</small><strong>{monthlyAmount>0?brl(monthlyAmount):brl(0)}</strong><span>Seu salário dividido por prioridade</span></div>
          <div className="salary-stacked-bar">
            {distribution.map(item=><i key={item.color} className={'segment-'+item.color} style={{width:Math.max(0,item.percent)+'%'}}></i>)}
          </div>
          <div className="salary-preview-list">
            {distribution.map(item=>{const Icon=item.icon;return <div className={'salary-preview-row '+item.color} key={item.color}><div className="salary-preview-label"><span className="salary-preview-dot"></span><div><b>{item.label}</b><small>{item.percent}% do salário</small></div></div><strong>{brl(monthlyAmount*item.percent/100)}</strong></div>})}
          </div>
          <div className="salary-free-card"><div><span>Dinheiro livre estimado</span><small>Depois das separações planejadas</small></div><strong>{brl(monthlyAmount*Math.max(0,allocationFree)/100)}</strong></div>
        </section>
        <section className="salary-next-card">
          <div className="salary-next-icon"><CalendarDays size={19}/></div>
          <div><span>PRÓXIMO PASSO</span><b>Configure e acompanhe</b><p>Depois de salvar, suas entradas recorrentes poderão ser geradas na sincronização do aplicativo.</p></div>
        </section>
      </aside>
    </div>

    <div className="salary-lower-grid">
      <section className="panel salary-13-panel">
        <div className="salary-section-heading"><div><span className="salary-step">03 / RENDA EXTRA</span><h3><Calculator size={18}/> Calculadora de 13º</h3><p>Faça uma estimativa proporcional do décimo terceiro.</p></div><div className="salary-heading-icon violet"><Sparkles size={19}/></div></div>
        <label className="salary-field salary-field-wide"><span>Salário bruto mensal <i>R$</i></span><input type="number" min="0" step="0.01" inputMode="decimal" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="Ex.: 2500,00"/></label>
        <div className="salary-field-grid salary-13-fields">
          <label className="salary-field"><span>Meses elegíveis no ano</span><select value={months} onChange={e=>setMonths(e.target.value)}>{Array.from({length:13},(_,i)=><option key={i} value={i}>{i} {i===1?'mês':'meses'}</option>)}</select></label>
          <label className="salary-field"><span>Ano de referência</span><input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(e.target.value)}/></label>
        </div>
        <div className="salary-result-pro"><span>13º bruto estimado · {year}</span><strong>{brl(gross)}</strong><div><span>1ª parcela estimada <b>{brl(firstInstallment)}</b></span><span>2ª parcela antes dos descontos <b>{brl(secondBeforeDeductions)}</b></span></div></div>
        <p className="salary-disclaimer"><Info size={15}/> Regra proporcional: salário bruto ÷ 12 × meses elegíveis. O mês conta quando houver pelo menos 15 dias trabalhados. Médias de adicionais e descontos legais podem alterar o valor final.</p>
      </section>
      <section className="panel salary-guidance-panel">
        <div className="salary-section-heading"><div><span className="salary-step">04 / BOAS PRÁTICAS</span><h3>Seu dinheiro com estratégia</h3><p>Pequenos hábitos deixam o orçamento mais previsível.</p></div><div className="salary-heading-icon cyan"><Sparkles size={19}/></div></div>
        <div className="salary-tip-row"><span className="salary-tip-icon bills"><Wallet size={17}/></span><div><b>Priorize compromissos</b><p>Separe primeiro o que tem vencimento e valor definido.</p></div></div>
        <div className="salary-tip-row"><span className="salary-tip-icon goals"><Target size={17}/></span><div><b>Alimente suas metas</b><p>Defina uma quantia possível e mantenha a consistência.</p></div></div>
        <div className="salary-tip-row"><span className="salary-tip-icon reserve"><ShieldCheck size={17}/></span><div><b>Construa sua reserva</b><p>Guarde um pouco para imprevistos e meses mais apertados.</p></div></div>
      </section>
    </div>
  </div>;
}

export function ReportsDashboard({ transactions = [] }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7));
  const visible = useMemo(() => transactions.filter(t => String(t.date || '').slice(0,7) === month), [transactions, month]);
  const expenses = visible.filter(t => t.type === 'gasto');
  const income = visible.filter(t => t.type === 'entrada');
  const totalOut = expenses.reduce((sum,t)=>sum+Number(t.amount||0),0);
  const totalIn = income.reduce((sum,t)=>sum+Number(t.amount||0),0);
  const categories = Object.values(expenses.reduce((acc,t)=>{
    const name = String(t.category || 'Sem categoria');
    acc[name] ||= { name, value: 0, count: 0 };
    acc[name].value += Number(t.amount||0); acc[name].count += 1; return acc;
  },{})).sort((a,b)=>b.value-a.value);
  const previous = new Date(month+'-15T12:00:00'); previous.setMonth(previous.getMonth()-1);
  const previousKey = previous.toISOString().slice(0,7);
  const previousOut = transactions.filter(t=>t.type==='gasto'&&String(t.date||'').slice(0,7)===previousKey).reduce((sum,t)=>sum+Number(t.amount||0),0);
  const delta = totalOut - previousOut;
  const shiftMonth = direction => { const d=new Date(month+'-15T12:00:00'); d.setMonth(d.getMonth()+direction); setMonth(d.toISOString().slice(0,7)); };
  return <div className="reports-dashboard">
    <div className="report-month-nav"><button className="icon-button" onClick={()=>shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft/></button><div><CalendarDays size={16}/><b>{monthLabel(month)}</b></div><button className="icon-button" onClick={()=>shiftMonth(1)} aria-label="Próximo mês"><ChevronRight/></button><input aria-label="Selecionar mês" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
    <div className="stat-grid">
      <div className="stat-card"><span><TrendingUp size={17}/> Entradas</span><strong>{brl(totalIn)}</strong><small>{income.length} registros</small></div>
      <div className="stat-card"><span><TrendingDown size={17}/> Saídas</span><strong>{brl(totalOut)}</strong><small>{expenses.length} registros</small></div>
      <div className="stat-card"><span><Wallet size={17}/> Resultado do mês</span><strong>{brl(totalIn-totalOut)}</strong><small>Entradas menos saídas registradas</small></div>
      <div className="stat-card"><span><Sparkles size={17}/> Comparação</span><strong>{previousOut ? (delta>0?'+':'')+brl(delta) : '—'}</strong><small>{previousOut ? (delta>0?'Aumento':'Redução')+' vs. mês anterior' : 'Sem despesas no mês anterior'}</small></div>
    </div>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h3>Saídas por categoria</h3><p>{brl(totalOut)} no período selecionado</p></div></div>
        {categories.length ? <div className="category-list">{categories.map(c=><div className="category-row report-category" key={c.name}><div className="report-category-head"><span>{c.name}</span><b>{brl(c.value)}</b></div><small>{totalOut ? Math.round(c.value/totalOut*100) : 0}% das saídas · {c.count} lançamentos</small><div className="progress"><i style={{width:(totalOut?c.value/totalOut*100:0)+'%'}}/></div></div>)}</div> : <p className="muted">Nenhuma saída registrada neste mês.</p>}
      </section>
      <section className="panel"><div className="panel-head"><div><h3>Resumo do período</h3><p>Movimentações registradas</p></div></div>
        <div className="salary-plan-row"><span>Despesas categorizadas</span><b>{categories.length}</b></div>
        <div className="salary-plan-row"><span>Maior categoria</span><b>{categories[0]?.name || '—'}</b></div>
        <div className="salary-plan-row"><span>Gasto médio por lançamento</span><b>{brl(expenses.length?totalOut/expenses.length:0)}</b></div>
        <p className="salary-note"><Info size={15}/> Transferências entre contas próprias não devem ser registradas como gastos de consumo. Este relatório soma os lançamentos do tipo “gasto” existentes no mês selecionado.</p>
      </section>
    </div>
  </div>;
}
