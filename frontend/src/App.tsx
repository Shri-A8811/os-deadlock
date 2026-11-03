import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Activity, ArrowDownRight, ArrowRight, Check, CircleHelp, CookingPot, Cpu, Pause, Play, RotateCcw, Shield, SkipBack, SkipForward, TriangleAlert, Workflow, X } from 'lucide-react'
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { analyzeSafety, checkRequest, detectDeadlock } from './api'
import Simulation from './Simulation'
import { scenarios } from './data'
import type { RequestResult, SafetyResult, Scenario, TraceStep } from './types'

type Tab = 'avoidance' | 'detection' | 'prevention' | 'simulation'
const resourceColors = ['#a4472d', '#28724e', '#3d5c9c', '#916400', '#70446e']
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function App() {
  const [tab, setTab] = useState<Tab>('avoidance')
  const [scenarioKey, setScenarioKey] = useState('safe')
  const [scenario, setScenario] = useState<Scenario>(() => copy(scenarios.safe))
  const [detectionRequest, setDetectionRequest] = useState<number[][]>([[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])
  const [safety, setSafety] = useState<SafetyResult | null>(null)
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null)
  const [detectionResult, setDetectionResult] = useState<Awaited<ReturnType<typeof detectDeadlock>> | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [recoveredProcess, setRecoveredProcess] = useState<number | null>(null)
  const [orderPolicyEnabled, setOrderPolicyEnabled] = useState(true)

  const processCount = scenario.allocation.length
  const resourceCount = scenario.available.length
  const requestProcess = scenario.request?.process ?? 0
  const currentTrace = safety?.trace ?? []
  const currentStep: TraceStep | undefined = currentTrace[stepIndex]
  const need = useMemo(() => scenario.allocation.map((row, p) => row.map((value, r) => scenario.maximum[p][r] - value)), [scenario])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!playing) return
    if (stepIndex >= currentTrace.length - 1) { setPlaying(false); return }
    const timer = window.setTimeout(() => setStepIndex(step => step + 1), 1050)
    return () => window.clearTimeout(timer)
  }, [playing, stepIndex, currentTrace.length])

  const chooseScenario = (key: string) => {
    setScenarioKey(key)
    setScenario(copy(scenarios[key]))
    const value = scenarios[key]
    setDetectionRequest(value.allocation.map((_, p) => value.title.startsWith('Circular wait')
      ? value.allocation[p].map((_, r) => (p === 0 && r === 1) || (p === 1 && r === 0) ? 1 : 0)
      : value.allocation[p].map(() => 0)))
    setSafety(null); setRequestResult(null); setDetectionResult(null); setStepIndex(0); setPlaying(false); setNotice(''); setRecoveredProcess(null)
  }

  const editMatrix = (key: 'allocation' | 'maximum', row: number, col: number, value: number) => {
    setScenario((old) => ({ ...old, [key]: old[key].map((line, ri) => line.map((cell, ci) => ri === row && ci === col ? value : cell)) }))
    setSafety(null); setRequestResult(null); setNotice('')
  }
  const editAvailable = (col: number, value: number) => {
    setScenario((old) => ({ ...old, available: old.available.map((cell, i) => i === col ? value : cell) }))
    setSafety(null); setRequestResult(null); setNotice('')
  }
  const editDetectionRequest = (row: number, col: number, value: number) => {
    setDetectionRequest((old) => old.map((line, ri) => line.map((cell, ci) => ri === row && ci === col ? value : cell)))
    setDetectionResult(null)
  }
  const resize = (kind: 'process' | 'resource', size: number) => {
    if (kind === 'process') {
      setDetectionRequest(old => Array.from({ length: size }, (_, i) => old[i]?.slice() ?? Array(resourceCount).fill(0)))
    } else {
      setDetectionRequest(old => old.map(row => Array.from({ length: size }, (_, i) => row[i] ?? 0)))
    }
    setScenario((old) => {
      if (kind === 'process') {
        const allocation = Array.from({ length: size }, (_, i) => old.allocation[i]?.slice() ?? Array(resourceCount).fill(0))
        const maximum = Array.from({ length: size }, (_, i) => old.maximum[i]?.slice() ?? Array(resourceCount).fill(0))
        const request = old.request && { process: Math.min(old.request.process, size - 1), vector: old.request.vector.slice() }
        return { ...old, allocation, maximum, request }
      }
      const allocation = old.allocation.map((row) => Array.from({ length: size }, (_, i) => row[i] ?? 0))
      const maximum = old.maximum.map((row) => Array.from({ length: size }, (_, i) => row[i] ?? 0))
      const request = old.request && { ...old.request, vector: Array.from({ length: size }, (_, i) => old.request?.vector[i] ?? 0) }
      return { ...old, allocation, maximum, available: Array.from({ length: size }, (_, i) => old.available[i] ?? 0), request }
    })
    setSafety(null); setRequestResult(null); setDetectionResult(null); setNotice('')
  }

  const runSafety = async () => {
    setBusy(true); setNotice('')
    try { const result = await analyzeSafety(scenario.allocation, scenario.maximum, scenario.available); setSafety(result); setStepIndex(0); setPlaying(false); setRequestResult(null) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not reach the local algorithm service.') }
    finally { setBusy(false) }
  }
  const submitRequest = async () => {
    const request = scenario.request
    if (!request) return
    setBusy(true); setNotice('')
    try {
      const result = await checkRequest(scenario.allocation, scenario.maximum, scenario.available, request.process, request.vector)
      setRequestResult(result)
      if (result.status === 'granted') setScenario((old) => ({ ...old, allocation: result.allocation, available: result.available }))
      if (result.safety) { setSafety(result.safety); setStepIndex(0); setPlaying(false) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request or unavailable algorithm service.'
      setRequestResult({ status: 'invalid', message, safety: null, allocation: scenario.allocation, available: scenario.available })
    }
    finally { setBusy(false) }
  }
  const runDetection = async () => {
    setBusy(true); setNotice('')
    try { setDetectionResult(await detectDeadlock(scenario.allocation, detectionRequest, scenario.available)) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not reach the local algorithm service.') }
    finally { setBusy(false) }
  }

  const traceChart = useMemo(() => currentTrace.map((step, i) => ({
    label: step.process === null ? (i === 0 ? 'Start' : 'Stop') : `P${step.process}`,
    ...Object.fromEntries(step.workAfter.map((value, r) => [`R${r}`, value])),
  })), [currentTrace])

  const detectionGraph = useMemo(() => makeGraph(scenario.allocation, detectionRequest, scenario.available, detectionResult?.deadlocked ?? []), [scenario, detectionRequest, detectionResult])

  const recover = () => {
    if (recoveredProcess === null) return
    const released = scenario.allocation[recoveredProcess]
    setDetectionRequest(old => old.map((row, p) => p === recoveredProcess ? row.map(() => 0) : row))
    setScenario((old) => ({
      ...old,
      allocation: old.allocation.map((row, p) => p === recoveredProcess ? row.map(() => 0) : row),
      available: old.available.map((n, r) => n + released[r]),
    }))
    setNotice(`P${recoveredProcess} terminated; its allocation has been released to Available.`)
    setDetectionResult(null); setSafety(null); setRequestResult(null)
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Deadlock Lab home"><span className="brand-mark"><Cpu size={18} /></span><span>systems lab<span className="brand-dot">.</span></span></a>
      <div className="course-tag"><span className="live-dot" /> OPERATING SYSTEMS <span className="tag-divider">/</span> LAB 04</div>
      <div className="topbar-right"><span className="local-pill"><span className="local-dot" /> LOCAL SESSION</span><span className="avatar">OS</span></div>
    </header>

    <main id="top" className="main-content">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span>RESOURCE ALLOCATION</span><span className="eyebrow-line" /></div>
          <h1>Deadlock <span>analysis</span></h1>
          <p className="lede">Model the system. Follow the algorithm. See where progress stops.</p>
        </div>
        <div className="heading-meta"><div className="meta-label">CURRENT MODEL</div><div className="meta-value">{processCount} processes <span>·</span> {resourceCount} resource types</div><div className="meta-caption">Integer instances · zero-based IDs</div></div>
      </section>

      <nav className="workspace-tabs" aria-label="Analysis modes">
        <button className={tab === 'avoidance' ? 'active' : ''} onClick={() => setTab('avoidance')}><Shield size={16} /> Avoidance <span className="tab-index">01</span></button>
        <button className={tab === 'detection' ? 'active' : ''} onClick={() => setTab('detection')}><Workflow size={16} /> Detection <span className="tab-index">02</span></button>
        <button className={tab === 'prevention' ? 'active' : ''} onClick={() => setTab('prevention')}><Activity size={16} /> Prevention & recovery <span className="tab-index">03</span></button>
        <button className={tab === 'simulation' ? 'active' : ''} onClick={() => setTab('simulation')}><CookingPot size={16} /> Simulation <span className="tab-index">04</span></button>
        <span className="tabs-note"><CircleHelp size={14} /> Unsafe ≠ deadlocked</span>
      </nav>

      {tab !== 'simulation' && <section className="scenario-strip" aria-label="Example scenarios">
        <div className="scenario-label">LOAD EXAMPLE</div>
        <div className="scenario-buttons">
          {Object.entries(scenarios).map(([key, value], index) => <button key={key} aria-pressed={scenarioKey === key} className={`scenario-chip ${scenarioKey === key ? 'selected' : ''}`} onClick={() => chooseScenario(key)}><span className="scenario-number">0{index + 1}</span>{value.title}<ArrowRight size={13} /></button>)}
        </div>
        <div className="scenario-description">{scenario.description}</div>
      </section>}

      {tab === 'avoidance' && <div className="workspace-grid">
        <section className="panel input-panel">
          <div className="panel-header"><div><div className="panel-kicker">SYSTEM CONFIGURATION</div><h2>Resource state</h2></div><span className="editable-tag">EDITABLE</span></div>
          <div className="dimensions-row"><label>Processes <select value={processCount} onChange={(e) => resize('process', Number(e.target.value))}>{[2,3,4,5,6,7,8].map(n => <option key={n}>{n}</option>)}</select></label><label>Resource types <select value={resourceCount} onChange={(e) => resize('resource', Number(e.target.value))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label></div>
          <MatrixTable title="Allocation" subtitle="Instances currently held" matrix={scenario.allocation} onChange={(r,c,v) => editMatrix('allocation',r,c,v)} accent="copper" />
          <MatrixTable title="Maximum" subtitle="Declared demand per process" matrix={scenario.maximum} onChange={(r,c,v) => editMatrix('maximum',r,c,v)} accent="blue" />
          <div className="vector-block"><div className="table-title-row"><div><h3>Available</h3><p>Unallocated instances right now</p></div><div className="vector-inputs">{scenario.available.map((value, r) => <label key={r}><span>R{r}</span><NumberInput label={`Available resource R${r}`} value={value} onChange={v => editAvailable(r,v)} /></label>)}</div></div></div>
          <MatrixTable title="Need" subtitle="Calculated · Maximum − Allocation" matrix={need} readonly accent="green" />
          {notice && <div className="inline-notice" role="alert"><TriangleAlert size={15} />{notice}</div>}
          <div className="primary-actions"><button className="primary-button" onClick={runSafety} disabled={busy}><Activity size={16} />{busy ? 'Calculating…' : 'Run safety check'}<ArrowRight size={15} /></button><span className="action-hint">Banker’s safety algorithm</span></div>
        </section>

        <section className="results-column">
          <section className="panel result-panel">
            <div className="panel-header result-header"><div><div className="panel-kicker">BANKER’S SAFETY CHECK</div><h2>Can every process finish?</h2></div><span className={`state-badge ${safety ? (safety.safe ? 'safe' : 'unsafe') : 'idle'}`}><span className="state-icon">{safety ? (safety.safe ? <Check size={13} /> : <X size={13} />) : <span className="idle-dot" />}</span>{safety ? (safety.safe ? 'SAFE STATE' : 'UNSAFE STATE') : 'NOT RUN'}</span></div>
            {safety ? <>
              <p className="result-summary">{safety.message}</p>
              <div className="sequence-section"><div className="sequence-label">SAFE SEQUENCE <span>· {safety.safe ? `${safety.sequence.length} processes can finish` : 'no complete sequence'}</span></div><div className={`sequence-track ${!safety.safe ? 'no-sequence' : ''}`}>{safety.sequence.length ? safety.sequence.map((p,i) => <div key={p} className={`sequence-node ${stepIndex > 0 && currentStep?.process === p ? 'current' : ''}`}><span className="sequence-order">{String(i+1).padStart(2,'0')}</span><span className="process-token">P{p}</span>{i < safety.sequence.length - 1 && <ArrowRight className="sequence-arrow" size={14} />}</div>) : <span className="empty-sequence">No complete safe sequence exists in this state.</span>}</div></div>
              <div className="step-player"><div className="step-caption"><div className="step-count">STEP <b>{String(stepIndex+1).padStart(2,'0')}</b><span> / {String(currentTrace.length).padStart(2,'0')}</span></div><div className="step-explanation">{currentStep?.explanation}</div></div><div className="player-controls"><button aria-label="Previous algorithm step" title="Previous step" onClick={() => { setPlaying(false); setStepIndex(i => Math.max(0,i-1)) }} disabled={stepIndex === 0}><SkipBack size={15}/></button><button className="play-control" aria-label={reducedMotion ? 'Advance one step' : playing ? 'Pause animation' : 'Play animation'} title={reducedMotion ? 'Advance one step · reduced motion' : playing ? 'Pause' : 'Autoplay'} onClick={() => { if (reducedMotion) { setStepIndex(i => i >= currentTrace.length - 1 ? 0 : i + 1); return } if (stepIndex >= currentTrace.length - 1) setStepIndex(0); setPlaying(v => !v) }}>{reducedMotion ? <SkipForward size={15}/> : playing ? <Pause size={15}/> : <Play size={15}/>}</button><button aria-label="Next algorithm step" title="Next step" onClick={() => { setPlaying(false); setStepIndex(i => Math.min(currentTrace.length-1,i+1)) }} disabled={stepIndex >= currentTrace.length - 1}><SkipForward size={15}/></button><button aria-label="Reset algorithm walkthrough" title="Reset" onClick={() => { setPlaying(false); setStepIndex(0) }}><RotateCcw size={14}/></button></div></div>
              <div className="work-line"><div className="work-label"><span className="work-marker"/>CURRENT WORK</div><div className="work-values">{(currentStep?.workAfter ?? scenario.available).map((v,r) => <span key={r} style={{'--resource-color': resourceColors[r%resourceColors.length]} as CSSProperties}><i/>R{r}<b>{v}</b></span>)}</div><div className="work-change">{currentStep?.process !== null && currentStep?.process !== undefined ? <><ArrowDownRight size={13}/> P{currentStep.process} released resources</> : 'Initial available resources'}</div></div>
            </> : <div className="empty-result"><div className="empty-mark"><Activity size={21}/></div><div><strong>Run the safety check to begin</strong><p>The trace will show which process can finish, how Work changes, and whether the final state is safe.</p></div></div>}
          </section>

          {safety && <section className="panel chart-panel"><div className="panel-header chart-heading"><div><div className="panel-kicker">RESOURCE TRACE</div><h2>Work after each step</h2></div><span className="chart-unit">RESOURCE INSTANCES</span></div><div className="chart-wrap" aria-label="Work vector after each Banker’s safety algorithm step">{traceChart.length > 1 ? <ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={traceChart} margin={{top:8,right:12,bottom:0,left:-18}}><CartesianGrid stroke="#ded4bf" vertical={false}/><XAxis dataKey="label" tick={{fill:'#536055',fontSize:11}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#536055',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{border:'1px solid #d9ceb7',borderRadius:8,fontSize:12,background:'#fffaf0',color:'#202820',boxShadow:'none'}}/>{scenario.available.map((_,r)=><Line key={r} dataKey={`R${r}`} type="stepAfter" stroke={resourceColors[r%resourceColors.length]} strokeWidth={2.5} dot={{r:3,fill:resourceColors[r%resourceColors.length],strokeWidth:0}} activeDot={{r:4}}/> )}</LineChart></ResponsiveContainer> : <div className="chart-placeholder">Run the check to plot the Work vector across the trace.</div>}</div><div className="chart-legend">{scenario.available.map((_,r)=><span key={r}><i style={{background:resourceColors[r%resourceColors.length]}}/>Resource R{r}</span>)}</div><details className="trace-table-details"><summary>View exact Work values as a table</summary><div className="matrix-scroll"><table className="data-matrix trace-table"><thead><tr><th scope="col">STEP</th><th scope="col">PROCESS</th>{scenario.available.map((_,r)=><th key={r} scope="col">R{r}</th>)}</tr></thead><tbody>{safety.trace.map((step,i)=><tr key={i}><th scope="row">{i+1}</th><td>{step.process === null ? (i===0?'Start':'Stop') : `P${step.process}`}</td>{step.workAfter.map((value,r)=><td key={r}>{value}</td>)}</tr>)}</tbody></table></div></details></section>}

          <section className="panel request-panel"><div className="panel-header"><div><div className="panel-kicker">REQUEST VALIDATION</div><h2>Try a resource request</h2></div><span className="request-symbol">↗</span></div><div className="request-controls"><label className="select-label">PROCESS ID<NumberInput label="Process identifier for the resource request" value={requestProcess} onChange={v => {setRequestResult(null);setScenario(old => ({...old,request:{process:v,vector:old.request?.vector ?? Array(resourceCount).fill(0)}}))}}/></label><div className="request-vector">{scenario.available.map((_,r)=><label key={r}><span>R{r}</span><NumberInput label={`Request for resource R${r}`} value={scenario.request?.vector[r] ?? 0} onChange={v=>{setRequestResult(null);setScenario(old=>({...old,request:{process:old.request?.process??0,vector:Array.from({length:resourceCount},(_,i)=>i===r?v:(old.request?.vector[i]??0))}}))}}/></label>)}</div><button className="secondary-button" onClick={submitRequest} disabled={busy}><Check size={14}/> Check request</button></div>{requestResult && <div className={`request-result ${requestResult.status}`} role="status"><span className="request-result-icon">{requestResult.status === 'granted' ? '✓' : requestResult.status === 'waiting' ? 'Ⅱ' : '×'}</span><span><b>{requestResult.status === 'granted' ? 'Granted safely' : requestResult.status === 'waiting' ? 'Waiting / deferred' : requestResult.status === 'denied_unsafe' ? 'Denied · unsafe result' : 'Invalid input'}</b><small>{requestResult.message}</small>{requestResult.status === 'denied_unsafe' && requestResult.trialAllocation && <small className="rollback-proof">Trial P{requestProcess}: [{requestResult.trialAllocation[requestProcess]?.join(', ')}] · trial Available [{requestResult.trialAvailable?.join(', ')}] → rolled back to [{requestResult.allocation[requestProcess]?.join(', ')}] · original Available [{requestResult.available.join(', ')}]</small>}</span></div>}<div className="request-footnote">A request above Available is deferred. A request that would make the state unsafe is denied and rolled back.</div></section>
        </section>
      </div>}

      {tab === 'detection' && <div className="detection-layout">
        <section className="panel detection-input"><div className="panel-header"><div><div className="panel-kicker">DETECTION MODEL</div><h2>Outstanding requests</h2></div><span className="model-tag">MULTIPLE-INSTANCE METHOD</span></div><p className="panel-intro">Enter the resource instances each process is still waiting for. Detection uses Request, Allocation, and Available; it does not use Maximum.</p><div className="detection-matrix"><div className="matrix-title"><span>PROCESS</span>{scenario.available.map((_,r)=><span key={r}>R{r}</span>)}</div>{detectionRequest.map((row,p)=><div className="matrix-row" key={p}><span className="row-label">P{p}</span>{row.map((value,r)=><NumberInput key={r} label={`Outstanding request: process P${p}, resource R${r}`} value={value} onChange={v=>editDetectionRequest(p,r,v)}/>)}</div>)}</div><div className="allocation-summary"><span>ALLOCATION</span>{scenario.allocation.map((row,p)=><span key={p}>P{p} <b>{row.join(' · ')}</b></span>)}</div><button className="primary-button detection-run" onClick={runDetection} disabled={busy}><Workflow size={16}/>{busy ? 'Analyzing…' : 'Run deadlock detection'}<ArrowRight size={15}/></button>{notice && <div className="inline-notice" role="alert"><TriangleAlert size={15}/>{notice}</div>}</section>
        <section className="panel graph-panel"><div className="panel-header"><div><div className="panel-kicker">RESOURCE-ALLOCATION GRAPH</div><h2>Who holds what—and who waits</h2></div><span className="graph-count">{processCount}P / {resourceCount}R</span></div><div className="graph-canvas" aria-label="Directed resource-allocation graph; textual relationships follow"><ReactFlow nodes={detectionGraph.nodes} edges={detectionGraph.edges} fitView fitViewOptions={{padding:0.25}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{hideAttribution:true}}><Background color="#cfc4a8" gap={22}/><Controls showInteractive={false}/></ReactFlow></div><div className="graph-legend"><span><i className="legend-process"/>Process</span><span><i className="legend-resource"/>Resource</span><span><i className="legend-assignment"/>Assigned to process</span><span><i className="legend-request"/>Request edge</span></div><details className="graph-relations"><summary>Read graph relationships as text</summary><ul>{scenario.allocation.flatMap((row,p)=>row.flatMap((count,r)=>count>0?[<li key={`a-${p}-${r}`}>R{r} → P{p}: {count} instance{count===1?'':'s'} allocated</li>]:[])).concat(detectionRequest.flatMap((row,p)=>row.flatMap((count,r)=>count>0?[<li key={`q-${p}-${r}`}>P{p} → R{r}: waiting for {count} instance{count===1?'':'s'}</li>]:[])))}</ul>{detectionGraph.edges.length===0&&<p>No allocations or outstanding requests are currently shown.</p>}</details><div className="graph-caption"><b>Model assumption</b><span>A multiple-instance detection method is used. This example has {scenario.available.map((n,r)=>n+scenario.allocation.reduce((sum,row)=>sum+row[r],0)).every(total=>total===1)?'one instance per resource type':'multiple instances for at least one resource type'}. A graph cycle alone does not prove deadlock in every multiple-instance model.</span></div>{detectionResult && <div className={`detection-outcome ${detectionResult.deadlocked.length ? 'deadlocked' : 'clear'}`} role="status"><div className="outcome-top"><span className="outcome-label">DETECTION RESULT</span><b>{detectionResult.deadlocked.length ? `DEADLOCK · ${detectionResult.deadlocked.map(p=>`P${p}`).join(', ')}` : 'NO DEADLOCK DETECTED'}</b></div><p>{detectionResult.message}</p>{detectionResult.trace.map((step,i)=><div className="detection-step" key={i}><span>{step.process === null ? 'INIT' : `P${step.process}`}</span><p>{step.explanation}</p><small>Work: [{step.workAfter.join(', ')}]</small></div>)}</div>}</section>
        <section className="panel recovery-panel"><div className="panel-kicker">RECOVERY DEMONSTRATION</div><h2>Release a process’s resources</h2><p>Select a process to terminate. Its currently allocated resources return to Available so you can rerun detection and observe the change.</p><div className="recovery-controls"><label className="select-label">TERMINATE PROCESS<select value={recoveredProcess ?? ''} onChange={e=>setRecoveredProcess(e.target.value === '' ? null : Number(e.target.value))}><option value="">Choose process</option>{scenario.allocation.map((_,p)=><option key={p} value={p}>P{p} · holds [{scenario.allocation[p].join(', ')}]</option>)}</select></label><button className="secondary-button" onClick={recover} disabled={recoveredProcess === null}><X size={14}/> Terminate & release</button></div></section>
      </div>}

      {tab === 'prevention' && <div className="prevention-layout">
        <section className="panel prevention-intro"><div className="panel-kicker">POLICY EXPERIMENT</div><h2>Prevent circular wait with a fixed order</h2><p>Assign every resource type a global order. A process must request resources in ascending order and release lower-numbered resources before asking for a lower rank. This removes circular wait, one of the necessary deadlock conditions.</p><div className="policy-rule"><span className="rule-mark">01</span><span><b>Order the resource types</b><small>R0 → R1 → R2 → …</small></span><ArrowRight size={16}/><span><b>Request in order</b><small>Never acquire a lower rank while holding a higher one.</small></span></div><div className="policy-result"><Shield size={17}/><span><b>Condition prevented</b><small>Circular wait cannot form when every process follows the same strict ordering.</small></span></div></section>
        <section className="panel comparison-panel"><div className="panel-header"><div><div className="panel-kicker">TRADE-OFF</div><h2>What changes with the policy?</h2></div><span className="policy-tag">ORDERED ACQUISITION</span></div><div className="comparison-grid"><div className="comparison-side original"><span className="comparison-kicker">WITHOUT POLICY</span><h3>Flexible acquisition</h3><div className="resource-flow"><span>P0</span><ArrowRight size={14}/><b>R1</b><span className="flow-and">while waiting for</span><b>R0</b></div><p>Processes may hold resources in conflicting orders; circular wait remains possible.</p><span className="mini-state risk">CIRCULAR WAIT POSSIBLE</span></div><div className="comparison-divider"><ArrowRight size={16}/></div><div className="comparison-side modified"><span className="comparison-kicker">WITH GLOBAL ORDER</span><h3>Acquisition follows rank</h3><div className="ordered-resources">{scenario.available.map((_,r)=><span key={r} style={{'--resource-color':resourceColors[r%resourceColors.length]} as CSSProperties}>R{r}<small>{String(r+1).padStart(2,'0')}</small></span>)}</div><p>Requests move only forward in the order. Concurrency can fall when a process must wait to acquire resources in sequence.</p><span className="mini-state protected">CIRCULAR WAIT ELIMINATED</span></div></div><div className="caveat"><CircleHelp size={15}/><span>Prevention guarantees this condition is absent only when every process follows the policy. It may reduce resource utilization and concurrency.</span></div></section>
        <section className="panel policy-practice"><div className="policy-practice-heading"><div><div className="panel-kicker">TRY THE POLICY</div><h2>Is this request order allowed?</h2></div><button className={`policy-toggle ${orderPolicyEnabled?'enabled':''}`} aria-pressed={orderPolicyEnabled} onClick={()=>setOrderPolicyEnabled(value=>!value)}><span/>{orderPolicyEnabled?'POLICY ON':'POLICY OFF'}</button></div><p>Assume a process already holds R2 and next requests R0.</p><div className="policy-check"><div className="held-sequence"><span className="held-label">HELD</span><b>R2</b></div><ArrowRight size={17}/><div className="held-sequence"><span className="held-label">REQUEST</span><b className="request-resource">R0</b></div><span className={`mini-state ${orderPolicyEnabled?'risk':'protected'}`}>{orderPolicyEnabled?'REQUEST REJECTED':'REQUEST ALLOWED'}</span></div><p className="practice-explanation">{orderPolicyEnabled?'The process must release R2 before requesting lower-ranked R0. This enforces the global order and prevents circular wait.':'Without the policy, the request order is allowed; this can contribute to circular wait when processes hold and request resources in conflicting orders.'}</p></section>
      </div>}

      {tab === 'simulation' && <Simulation />}

      <footer className="footer-note"><span>DEADLOCK LAB <i>·</i> INTERACTIVE OS CONCEPTS</span><span>All computations run locally <span className="footer-separator">/</span> no external data</span></footer>
    </main>
  </div>
}

function NumberInput({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return <input className="cell-input" type="number" step={1} aria-label={label} value={text} onChange={e => {
    const next = e.target.value
    setText(next)
    if (next !== '' && next !== '-' && Number.isInteger(Number(next))) onChange(Number(next))
  }} onBlur={() => { if (text === '' || text === '-') setText(String(value)) }} />
}

function MatrixTable({ title, subtitle, matrix, readonly = false, onChange, accent }: { title: string; subtitle: string; matrix: number[][]; readonly?: boolean; onChange?: (r:number,c:number,v:number)=>void; accent: string }) {
  const cols = matrix[0]?.length ?? 0
  return <div className={`matrix-block accent-${accent}`}><div className="table-title-row"><div><h3>{title}{readonly && <span className="calculated-label">AUTO</span>}</h3><p>{subtitle}</p></div><span className="table-dimensions">{matrix.length} × {cols}</span></div><div className="matrix-scroll"><table className="data-matrix"><thead><tr><th scope="col">PROCESS</th>{Array.from({length:cols},(_,r)=><th scope="col" key={r}>R{r}</th>)}</tr></thead><tbody>{matrix.map((row,p)=><tr key={p}><th scope="row">P{p}</th>{row.map((value,r)=><td key={r}>{readonly ? <span className="need-value">{value}</span> : <NumberInput label={`${title}, process P${p}, resource R${r}`} value={value} onChange={v=>onChange?.(p,r,v)}/>}</td>)}</tr>)}</tbody></table></div></div>
}

function makeGraph(allocation: number[][], requests: number[][], available: number[], deadlocked: number[]) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const width = 590
  const processY = 54
  const resourceY = 208
  const spacing = width / (Math.max(allocation.length, available.length) + 1)
  allocation.forEach((_,p)=>nodes.push({id:`p${p}`,position:{x:spacing*(p+1),y:processY},data:{label:<span className={`graph-process-label ${deadlocked.includes(p)?'is-deadlocked':''}`}><span className="graph-node-type">PROCESS</span><b>P{p}</b>{deadlocked.includes(p)&&<small>DEADLOCKED</small>}</span>},style:{width:94,height:66,border:'1px solid #d9ceb7',borderRadius:10,background:deadlocked.includes(p)?'#fbe6d9':'#fffaf0',padding:8,boxShadow:'0 2px 6px #17372d12'}}))
  available.forEach((count,r)=>nodes.push({id:`r${r}`,position:{x:spacing*(r+1),y:resourceY},data:{label:<span className="graph-resource-label"><span className="graph-node-type">RESOURCE</span><b>R{r}</b><small>{count} free · instances</small></span>},style:{width:110,height:72,border:`1px solid ${resourceColors[r%resourceColors.length]}99`,borderRadius:10,background:'#fffaf0',padding:8,boxShadow:'0 2px 6px #17372d12'}}))
  allocation.forEach((row,p)=>row.forEach((count,r)=>{if(count>0)edges.push({id:`a-${r}-${p}`,source:`r${r}`,target:`p${p}`,label:`${count} held`,labelStyle:{fontSize:10,fill:'#405246'},labelBgStyle:{fill:'#faf4e7',fillOpacity:0.96},type:'default',markerEnd:{type:'arrowclosed',color:'#28724e'},style:{stroke:'#28724e',strokeWidth:2}})}))
  requests.forEach((row,p)=>row.forEach((count,r)=>{if(count>0)edges.push({id:`q-${p}-${r}`,source:`p${p}`,target:`r${r}`,label:`${count} requested`,labelStyle:{fontSize:10,fill:'#873820'},labelBgStyle:{fill:'#faf4e7',fillOpacity:0.96},markerEnd:{type:'arrowclosed',color:'#a4472d'},style:{stroke:'#a4472d',strokeWidth:2,strokeDasharray:'6 4'}})}))
  return {nodes,edges}
}

export default App
