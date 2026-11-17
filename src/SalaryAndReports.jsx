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
  async function saveSalaryAutomation(){
    if(!supabase||!session?.user?.id){setSalaryMessage('Entre na sua conta para configurar o salário.');return;}
    const amount=Number(salaryAmount), day=Number(payDay);
    if(!(amount>0)||day<1||day>31){setSalaryMessage('Informe um salário válido e um dia entre 1 e 31.');return;}
    if(allocationFree<0){setSalaryMessage('A distribuição não pode passar de 100%.');return;}
    setSavingSalary(true);setSalaryMessage('');
    const date=new Date(firstPayDate+'T12:00:00');
    const first=await supabase.from('transactions').insert({user_id:session.user.id,date:firstPayDate,type:'entrada',category:salaryCategory||'Salário',description:salaryName||'Salário',amount}).select('id').single();
    if(first.error){setSavingSalary(false);setSalaryMessage('Não foi possível registrar a primeira entrada: '+first.error.message);return;}
    const nextMonth=new Date(date.getFullYear(),date.getMonth()+1,1).toISOString().slice(0,10);
    const recurrence=await supabase.from('recurring_incomes').insert({user_id:session.user.id,description:salaryName||'Salário',amount,category:salaryCategory||'Salário',day_of_month:day,start_month:nextMonth,active:true});
    if(recurrence.error){await supabase.from('transactions').delete().eq('id',first.data.id).eq('user_id',session.user.id);setSavingSalary(false);setSalaryMessage('A automação não foi ativada: '+recurrence.error.message);return;}
    setSavingSalary(false);setSalaryMessage('Salário cadastrado! A primeira entrada foi registrada e a recorrência começa no próximo mês.');
    await onRefresh?.();
  }
  const [salary, setSalary] = useState('');
  const [months, setMonths] = useState('12');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [hiredIn, setHiredIn] = useState('01');
  const gross = Math.max(0, Number(salary) || 0) * Math.min(12, Math.max(0, Number(months) || 0)) / 12;
  const firstInstallment = gross / 2;
  const secondBeforeDeductions = gross / 2;

  return <div className="salary-center">
    <section className="panel salary-hero">
      <div className="salary-kicker"><Sparkles size={15}/> PLANEJAMENTO INTELIGENTE</div>
      <h2>Salário e 13º Inteligente</h2>
      <p>O salário mensal automático continua usando a recorrência já disponível no cadastro de entradas. Aqui você simula seu décimo terceiro e acompanha o planejamento.</p>
    </section>
    <section className="panel salary-automation">
      <div className="panel-head"><div><h3><RefreshCw size={18}/> Salário Automático</h3><p>Configure uma vez para gerar as próximas entradas mensais.</p></div></div>
      <div className="form-row">
        <label>Descrição<input value={salaryName} onChange={e=>setSalaryName(e.target.value)} placeholder="Ex.: Salário"/></label>
        <label>Valor recebido (R$)<input type="number" min="0" step="0.01" value={salaryAmount} onChange={e=>setSalaryAmount(e.target.value)} placeholder="Ex.: 2500"/></label>
      </div>
      <div className="form-row">
        <label>Categoria<input value={salaryCategory} onChange={e=>setSalaryCategory(e.target.value)}/></label>
        <label>Dia habitual de pagamento<input type="number" min="1" max="31" value={payDay} onChange={e=>setPayDay(e.target.value)}/></label>
      </div>
      <label>Data do próximo recebimento<input type="date" value={firstPayDate} onChange={e=>setFirstPayDate(e.target.value)}/></label>
      <h4>Planejamento da distribuição (percentuais)</h4>
      <div className="form-row">
        <label>Contas e compromissos (%)<input type="number" min="0" max="100" value={allocationBills} onChange={e=>setAllocationBills(e.target.value)}/></label>
        <label>Metas (%)<input type="number" min="0" max="100" value={allocationGoals} onChange={e=>setAllocationGoals(e.target.value)}/></label>
      </div>
      <div className="form-row">
        <label>Reserva (%)<input type="number" min="0" max="100" value={allocationReserve} onChange={e=>setAllocationReserve(e.target.value)}/></label>
        <div className="salary-plan-row"><span>Disponível</span><b>{allocationFree}%</b></div>
      </div>
      <button type="button" className="primary" disabled={savingSalary} onClick={saveSalaryAutomation}><Save size={16}/>{savingSalary?'Salvando...':'Ativar salário automático'}</button>
      {salaryMessage&&<p className="salary-note" role="status">{salaryMessage}</p>}
      <p className="salary-note"><Info size={15}/> As entradas recorrentes são geradas quando o aplicativo sincroniza os dados. A distribuição é um planejamento: não transfere dinheiro nem quita contas automaticamente.</p>
    </section>
    <div className="two-col salary-columns">
      <section className="panel">
        <div className="panel-head"><div><h3><Calculator size={18}/> Calculadora de 13º</h3><p>Estimativa proporcional do ano selecionado</p></div></div>
        <label>Salário bruto mensal (R$)<input type="number" min="0" step="0.01" inputMode="decimal" value={salary} onChange={e=>setSalary(e.target.value)} placeholder="Ex.: 2500,00"/></label>
        <div className="form-row">
          <label>Meses com pelo menos 15 dias trabalhados<select value={months} onChange={e=>setMonths(e.target.value)}>{Array.from({length:13},(_,i)=><option key={i} value={i}>{i} {i===1?'mês':'meses'}</option>)}</select></label>
          <label>Ano de referência<input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(e.target.value)}/></label>
        </div>
        <div className="salary-result">
          <span>13º bruto estimado · {year}</span>
          <strong>{brl(gross)}</strong>
          <div className="salary-result-splits"><div><small>1ª parcela (estimada)</small><b>{brl(firstInstallment)}</b></div><div><small>2ª parcela antes dos descontos</small><b>{brl(secondBeforeDeductions)}</b></div></div>
        </div>
        <p className="salary-note"><Info size={15}/> Regra proporcional: salário bruto ÷ 12 × meses elegíveis. O mês conta quando houver pelo menos 15 dias trabalhados. O cálculo não inclui médias de adicionais, comissões ou variáveis; INSS e IRRF são descontados conforme a folha e as regras vigentes.</p>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3><Wallet size={18}/> Organização do recebimento</h3><p>Planeje antes de receber</p></div></div>
        <div className="salary-plan-row"><span>Valor bruto estimado</span><b>{brl(gross)}</b></div>
        <div className="salary-plan-row"><span>Separar para contas</span><b>Defina no seu orçamento</b></div>
        <div className="salary-plan-row"><span>Separar para metas</span><b>Defina no seu orçamento</b></div>
        <div className="salary-plan-row"><span>Valor livre</span><b>Após descontos e planejamento</b></div>
        <p className="salary-note">O 13º fica separado das entradas mensais comuns nesta simulação. Ao receber cada parcela, registre-a como entrada para atualizar o saldo real.</p>
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
