import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ChefHat, CircleCheck, CookingPot, CupSoda, Pause, Play, RotateCcw, SkipBack, SkipForward, Sandwich } from 'lucide-react'

const steps = [
  { process: null, work: [0, 0], note: 'Start with no free appliances. Check each breakfast task’s remaining Need against Work.' },
  { process: 1, work: [0, 1], note: 'The smoothie is ready: it needs no more appliances. It finishes and returns the blender.' },
  { process: 2, work: [1, 1], note: 'Toast is ready too. It returns its stove space, so another task can continue.' },
  { process: 0, work: [2, 1], note: 'Now one stove space is free for the eggs. P0 uses it, finishes, and returns both stove spaces.' },
]

const tasks = [
  { id: 0, name: 'Make eggs', icon: CookingPot, held: [1, 0], need: [1, 0], accent: 'eggs' },
  { id: 1, name: 'Blend a smoothie', icon: CupSoda, held: [0, 1], need: [0, 0], accent: 'smoothie' },
  { id: 2, name: 'Make toast', icon: Sandwich, held: [1, 0], need: [0, 0], accent: 'toast' },
]

export default function Simulation() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const current = steps[step]
  const finished = new Set(steps.slice(1, step + 1).map(item => item.process))
  const activeTask = current.process === null ? null : tasks[current.process]

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) { setPlaying(false); return }
    const timer = window.setTimeout(() => setStep(value => value + 1), 1700)
    return () => window.clearTimeout(timer)
  }, [playing, step])

  const advance = (amount: number) => {
    setPlaying(false)
    setStep(value => Math.min(steps.length - 1, Math.max(0, value + amount)))
  }

  return <section className="simulation-page" aria-labelledby="simulation-title">
    <div className="simulation-intro">
      <div><div className="panel-kicker">A MORNING AT HOME · BANKER’S ALGORITHM</div><h2 id="simulation-title">Three breakfasts, one shared kitchen</h2><p>Roommates share two stove spaces and one blender. The scheduler checks who can safely finish, then puts their appliances back for the next person.</p></div>
      <div className="simulation-tag"><ChefHat size={15}/> EVERYDAY EXAMPLE</div>
    </div>

    <div className="simulation-stage" aria-label="Animated shared kitchen resource scheduling illustration">
      <div className="kitchen-scene">
        <div className="scene-window"><span/><span/><span/><span/></div>
        <div className="scene-shelf"><span>GOOD MORNING</span><i/><i/><i/></div>
        <div className="scene-counters">
          <div className="counter-appliance stove"><CookingPot size={23}/><span>STOVE</span><b>{current.work[0]} / 2 free</b></div>
          <div className="counter-appliance blender"><CupSoda size={22}/><span>BLENDER</span><b>{current.work[1]} / 1 free</b></div>
          <div className="counter-line"/>
        </div>
        <div className="kitchen-people">
          {tasks.map(task => {
            const Icon = task.icon
            const isDone = finished.has(task.id)
            const isActive = current.process === task.id
            const isReady = !isDone && task.need.every((need, resource) => need <= current.work[resource])
            return <div key={task.id} className={`kitchen-person ${task.accent} ${isDone ? 'done' : ''} ${isActive ? 'working' : ''} ${isReady ? 'ready' : 'waiting'}`} aria-label={`P${task.id}, ${task.name}, ${isDone ? 'finished' : isReady ? 'can finish' : 'waiting for resources'}`}>
              <div className="person-head"><span className="person-hair"/><span className="person-face"><i/><i/></span></div>
              <div className="person-body"><span className="person-arm left"/><span className="person-apron"><Icon size={18}/></span><span className="person-arm right"/></div>
              <div className="person-task"><b>P{task.id} · {task.name}</b><small>{isDone ? 'Breakfast served' : isActive ? 'Finishing now…' : isReady ? 'Ready to finish' : `Needs ${task.need[0]} stove · ${task.need[1]} blender`}</small></div>
              {isDone && <span className="served-mark"><CircleCheck size={16}/> Done</span>}
              {isActive && <span className="steam steam-one"/>}{isActive && <span className="steam steam-two"/>}
            </div>
          })}
        </div>
        <div className="scene-floor"><span>CHECK NEED</span><ArrowRight size={13}/><span>LET THEM FINISH</span><ArrowRight size={13}/><span>RETURN RESOURCES</span></div>
      </div>
    </div>

    <div className="simulation-dashboard">
      <section className="panel simulation-step-card" aria-live="polite">
        <div className="panel-header"><div><div className="panel-kicker">SCHEDULER WALKTHROUGH</div><h3>{activeTask ? `P${activeTask.id} can finish` : 'The kitchen is ready to schedule'}</h3></div><span className="simulation-step-number">0{step + 1} <i>/ 04</i></span></div>
        <p>{current.note}</p>
        <div className="resource-equation"><span>WORK NOW</span>{current.work.map((count, index) => <b key={index} className={index === 0 ? 'stove-value' : 'blender-value'}>{index === 0 ? 'Stove' : 'Blender'} <i>{count}</i></b>)}{activeTask && <><ArrowDown size={14}/><span className="release-caption">P{activeTask.id} returns {activeTask.held[0] + activeTask.need[0]} stove · {activeTask.held[1] + activeTask.need[1]} blender</span></>}</div>
        <div className="simulation-controls" aria-label="Simulation controls">
          <button aria-label="Previous step" onClick={() => advance(-1)} disabled={step === 0}><SkipBack size={15}/></button>
          <button className="simulation-play" aria-label={reducedMotion ? 'Advance one step' : playing ? 'Pause simulation' : 'Play simulation'} onClick={() => { if (reducedMotion) { setStep(value => value >= steps.length - 1 ? 0 : value + 1); return } if (step === steps.length - 1) setStep(0); setPlaying(value => !value) }}>{reducedMotion ? <SkipForward size={15}/> : playing ? <Pause size={15}/> : <Play size={15}/>}<span>{reducedMotion ? 'Next step' : playing ? 'Pause' : 'Play animation'}</span></button>
          <button aria-label="Next step" onClick={() => advance(1)} disabled={step === steps.length - 1}><SkipForward size={15}/></button>
          <button aria-label="Reset simulation" onClick={() => { setPlaying(false); setStep(0) }}><RotateCcw size={14}/></button>
          <div className="simulation-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <button key={index} aria-label={`Go to step ${index + 1}`} aria-current={step === index ? 'step' : undefined} className={step === index ? 'current' : step > index ? 'complete' : ''} onClick={() => { setPlaying(false); setStep(index) }}/>)}</div>
        </div>
      </section>

      <section className="panel task-ledger">
        <div className="panel-kicker">NEED ≤ WORK?</div><h3>Who can finish right now?</h3>
        {tasks.map(task => {
          const complete = finished.has(task.id)
          const canFinish = !complete && task.need.every((need, resource) => need <= current.work[resource])
          return <div className={`ledger-row ${complete ? 'complete' : canFinish ? 'can-finish' : ''}`} key={task.id}><span className="ledger-id">P{task.id}</span><span className="ledger-name">{task.name}</span><span className="ledger-need">Need {task.need[0]} stove · {task.need[1]} blender</span><b>{complete ? 'DONE' : canFinish ? 'READY' : 'WAIT'}</b></div>
        })}
        <div className="ledger-takeaway"><span>SAFE ORDER</span><b>{steps.slice(1).map(item => `P${item.process}`).join('  →  ')}</b></div>
      </section>
    </div>

    <p className="simulation-footnote"><b>OS connection</b> A roommate is a process; the stove and blender are resources. Need is what remains. Work is what is free. When a process finishes, its allocation returns to the system.</p>
  </section>
}
