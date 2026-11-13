import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import type { Track } from "../data/music"
import { supabase } from "../lib/supabase"
import CreatorAnalytics from "./CreatorAnalytics"
import "./Studio.css"

type Note = { pitch: number; step: number; velocity: number }
type Lane = { id: string; name: string; kind: "drum" | "synth"; sound: "kick" | "snare" | "hat" | "bass" | "lead"; steps: boolean[]; notes: Note[]; muted: boolean; volume: number }
type SavedProject = { id: string; title: string; tempo: number; project_data: { lanes?: Lane[] } }
const lane = (name: string, sound: Lane["sound"], kind: Lane["kind"], active: number[] = []): Lane => ({
  id: sound + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, kind, sound,
  steps: Array.from({length:16}, (_,i) => active.includes(i)),
  notes: sound === "bass" ? [0,4,8,12].map((step,i)=>({pitch:[36,43,41,38][i],step,velocity:.8})) : [],
  muted:false, volume:.8
})
const starter = (): Lane[] => [lane("Kick","kick","drum",[0,4,8,12]),lane("Snare","snare","drum",[4,12]),lane("Closed Hat","hat","drum",[2,6,10,14]),lane("Bass","bass","synth"),lane("Lead","lead","synth")]
const names = ["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"]
const label = (p:number) => names[p%12] + (Math.floor(p/12)-1)

export default function Studio({tracks,onPlayTrack}:{tracks:Track[];onPlayTrack:(track:Track)=>void}) {
  const [lanes,setLanes]=useState<Lane[]>(starter)
  const [tempo,setTempo]=useState(110)
  const [title,setTitle]=useState("Untitled project")
  const [projectId,setProjectId]=useState<string|null>(null)
  const [saved,setSaved]=useState<SavedProject[]>([])
  const [selected,setSelected]=useState("bass-Bass".toLowerCase())
  const [playing,setPlaying]=useState(false)
  const [step,setStep]=useState(-1)
  const [saveStatus,setSaveStatus]=useState("Not saved")
  const [error,setError]=useState("")
  const [userId,setUserId]=useState<string|null>(null)
  const [royalPrompt,setRoyalPrompt]=useState("")
  const [royalReply,setRoyalReply]=useState("")
  const [royalBusy,setRoyalBusy]=useState(false)
  const [voiceText,setVoiceText]=useState("")
  const [voiceUrl,setVoiceUrl]=useState("")
  const [voiceError,setVoiceError]=useState("")
  const [voiceBusy,setVoiceBusy]=useState(false)
  const [voiceId,setVoiceId]=useState("21m00Tcm4TlvDq8ikWAM")
  const ctx=useRef<AudioContext|null>(null)
  const timer=useRef<number|null>(null)
  const stepRef=useRef(0)
  const lanesRef=useRef(lanes)
  const voiceRef=useRef<HTMLAudioElement|null>(null)
  const voiceUrlRef=useRef<string|null>(null)
  useEffect(()=>{lanesRef.current=lanes},[lanes])
  useEffect(()=>{if(!supabase)return;let live=true;void supabase.auth.getUser().then(({data})=>{if(live)setUserId(data.user?.id||null)});return()=>{live=false}},[])
  useEffect(()=>()=>{if(timer.current!==null)window.clearInterval(timer.current);if(ctx.current)void ctx.current.close();if(voiceUrlRef.current)URL.revokeObjectURL(voiceUrlRef.current)},[])

  const loadProjects=useCallback(async()=>{
    if(!supabase||!userId){setSaved([]);return}
    const {data,error}=await supabase.from("music_studio_projects").select("id,title,tempo,project_data").eq("user_id",userId).order("updated_at",{ascending:false}).limit(30)
    if(error){setError(error.message);return}
    setSaved((data||[]) as SavedProject[])
  },[userId])
  useEffect(()=>{void loadProjects()},[loadProjects])
  const audio=()=>{if(!ctx.current)ctx.current=new AudioContext();if(ctx.current.state==="suspended")void ctx.current.resume();return ctx.current}
  const drum=(sound:Lane["sound"],volume:number)=>{
    const a=audio(),now=a.currentTime,g=a.createGain();g.gain.setValueAtTime(Math.max(.001,volume),now);g.connect(a.destination)
    if(sound==="kick"){const o=a.createOscillator();o.type="sine";o.frequency.setValueAtTime(145,now);o.frequency.exponentialRampToValueAtTime(42,now+.16);g.gain.exponentialRampToValueAtTime(.001,now+.22);o.connect(g);o.start();o.stop(now+.23);return}
    const b=a.createBuffer(1,Math.floor(a.sampleRate*.18),a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1
    const n=a.createBufferSource(),f=a.createBiquadFilter();n.buffer=b;f.type=sound==="hat"?"highpass":"bandpass";f.frequency.value=sound==="hat"?7500:1800;n.connect(f);f.connect(g);g.gain.exponentialRampToValueAtTime(.001,now+(sound==="hat"?.045:.14));n.start();n.stop(now+.18)
  }
  const note=(pitch:number,volume:number,sound:Lane["sound"])=>{const a=audio(),o=a.createOscillator(),g=a.createGain();o.type=sound==="bass"?"triangle":"sawtooth";o.frequency.value=440*Math.pow(2,(pitch-69)/12);g.gain.setValueAtTime(Math.max(.001,volume*.16),a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.28);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.3)}
  const playStep=useCallback((index:number)=>{for(const item of lanesRef.current){if(item.muted)continue;if(item.kind==="drum"&&item.steps[index])drum(item.sound,item.volume);if(item.kind==="synth")item.notes.filter(n=>n.step===index).forEach(n=>note(n.pitch,item.volume*n.velocity,item.sound))}setStep(index)},[])
  const stop=()=>{if(timer.current!==null)window.clearInterval(timer.current);timer.current=null;setPlaying(false);setStep(-1)}
  const start=()=>{audio();stepRef.current=0;playStep(0);timer.current=window.setInterval(()=>{stepRef.current=(stepRef.current+1)%16;playStep(stepRef.current)},60000/tempo/4);setPlaying(true)}
  useEffect(()=>{if(!playing)return;if(timer.current!==null)window.clearInterval(timer.current);timer.current=window.setInterval(()=>{stepRef.current=(stepRef.current+1)%16;playStep(stepRef.current)},60000/tempo/4);return()=>{if(timer.current!==null)window.clearInterval(timer.current)}},[tempo,playing,playStep])
  const update=(id:string,fn:(item:Lane)=>Lane)=>setLanes(old=>old.map(item=>item.id===id?fn(item):item))
  const selectedLane=useMemo(()=>lanes.find(item=>item.id===selected)||lanes.find(item=>item.kind==="synth")||lanes[0],[lanes,selected])
  const save=useCallback(async(silent=false)=>{
    if(!supabase||!userId){setSaveStatus("Sign in to save projects");return}
    const payload={user_id:userId,title:title.trim().slice(0,100)||"Untitled project",tempo,time_signature:"4/4",project_data:{version:1,lanes}}
    setSaveStatus("Saving…")
    const result=projectId?await supabase.from("music_studio_projects").update(payload).eq("id",projectId).eq("user_id",userId).select("id").single():await supabase.from("music_studio_projects").insert(payload).select("id").single()
    if(result.error||!result.data){setSaveStatus("Save failed");setError(result.error?.message||"Could not save project");return}
    setProjectId(result.data.id);setSaveStatus(silent?"Autosaved":"Saved to your KUS cloud library");void loadProjects()
  },[userId,title,tempo,lanes,projectId,loadProjects])
  useEffect(()=>{if(!projectId||!userId)return;const id=window.setTimeout(()=>{void save(true)},1800);return()=>window.clearTimeout(id)},[lanes,tempo,title,projectId,userId,save])
  const openProject=async(id:string)=>{if(!supabase||!userId)return;const {data,error}=await supabase.from("music_studio_projects").select("id,title,tempo,project_data").eq("id",id).eq("user_id",userId).single();if(error||!data){setError(error?.message||"Project not found");return}const p=data as SavedProject;setProjectId(p.id);setTitle(p.title);setTempo(p.tempo);setLanes(Array.isArray(p.project_data?.lanes)?p.project_data.lanes:starter());setSaveStatus("Project loaded")}
  const newProject=()=>{stop();setProjectId(null);setTitle("Untitled project");setTempo(110);setLanes(starter());setSaveStatus("New project")}
  const exportProject=()=>{const blob=new Blob([JSON.stringify({version:1,title,tempo,lanes},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.replace(/[^a-z0-9-_]+/gi,"-")||"kus-project")+".kusmusic.json";a.click();URL.revokeObjectURL(url)}
  const askRoyal=async(e:FormEvent)=>{e.preventDefault();if(!royalPrompt.trim()||royalBusy)return;setRoyalBusy(true);setRoyalReply("");try{if(!supabase)throw new Error("Sign in to use Royal");const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Sign in to use Royal");const base=(import.meta.env.VITE_ROYAL_API_URL||"").replace(/\/$/,"");if(!base)throw new Error("Royal connection is not configured");const res=await fetch(base+"/api/royal/companion",{method:"POST",headers:{"Content-Type":"application/json","x-supabase-auth":token},body:JSON.stringify({companionId: 'music',conversationId:"music-studio-"+(projectId||"new"),prompt:"Studio project "+title+", tempo "+tempo+" BPM, "+lanes.length+" tracks. "+royalPrompt.trim()})});const body=await res.json();if(!res.ok)throw new Error(body.error||"Royal unavailable");setRoyalReply(body.content||"Royal returned an empty response")}catch(err){setRoyalReply(err instanceof Error?err.message:"Royal unavailable")}finally{setRoyalBusy(false)}}
  const generateVoice=async(e:FormEvent)=>{e.preventDefault();if(!voiceText.trim()||voiceBusy)return;setVoiceBusy(true);setVoiceError("");try{if(!supabase)throw new Error("Sign in to generate voice");const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Sign in to generate voice");const res=await fetch("/api/studio/elevenlabs",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({text:voiceText.trim(),voice:voiceId})});if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error||"ElevenLabs failed")}const blob=await res.blob();if(voiceUrlRef.current)URL.revokeObjectURL(voiceUrlRef.current);const url=URL.createObjectURL(blob);voiceUrlRef.current=url;setVoiceUrl(url);if(voiceRef.current){voiceRef.current.src=url;await voiceRef.current.play().catch(()=>undefined)}}catch(err){setVoiceError(err instanceof Error?err.message:"Voice generation unavailable")}finally{setVoiceBusy(false)}}
  const notes=selectedLane?.notes||[]

  return <div className="tab-scroll studio-workspace">
    <header className="studio-heading"><div><span className="hero-tag">KUS-LORDS MUSIC</span><h1>Music Studio</h1><p>Build beats and melodies, then save your session to your KUS account.</p></div><div className="studio-heading-actions"><button onClick={newProject}>＋ New</button><button className="studio-primary" onClick={()=>void save()}>Save project</button></div></header>
    <section className="studio-project-bar"><input aria-label="Project name" value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/><label>BPM <input type="number" min={40} max={240} value={tempo} onChange={e=>setTempo(Math.max(40,Math.min(240,Number(e.target.value)||110)))}/></label><button onClick={()=>playing?stop():start()}>{playing?"Ⅱ Stop":"▶ Play"}</button><button onClick={exportProject}>Export project</button><span className="studio-save-state">{saveStatus}</span></section>
    <section className="studio-panel studio-sequencer"><div className="studio-section-heading"><div><h2>Step sequencer</h2><p>Tap a step to switch it on or off.</p></div><span className="studio-step-count">STEP {step<0?"—":step+1}/16</span></div>
      <div className="studio-lanes">{lanes.map(item=><div className="studio-lane" key={item.id}><button className={"studio-lane-name "+(selected===item.id?"selected":"")} onClick={()=>setSelected(item.id)}>{item.name}<small>{item.kind}</small></button>
        {item.kind==="drum"?<div className="studio-steps">{item.steps.map((on,i)=><button aria-label={item.name+" step "+(i+1)} key={i} className={"studio-step "+(on?"on ":"")+(step===i?"current ":"")+(i%4===0?"beat":"")} onClick={()=>update(item.id,l=>({...l,steps:l.steps.map((v,j)=>j===i?!v:v)}))}/>)}</div>:<button className="studio-piano-lane" onClick={()=>setSelected(item.id)}>{item.notes.length} notes · open piano roll</button>}
        <button className={"studio-mute "+(item.muted?"muted":"")} onClick={()=>update(item.id,l=>({...l,muted:!l.muted}))}>{item.muted?"M":"♪"}</button></div>)}</div>
      <div className="studio-pad-row">{lanes.filter(l=>l.kind==="drum").map((item,i)=><button key={item.id} className="studio-touch-pad" onPointerDown={()=>drum(item.sound,item.volume)}><span>0{i+1}</span><strong>{item.name}</strong></button>)}</div>
    </section>
    <section className="studio-panel studio-piano-panel"><div className="studio-section-heading"><div><h2>Piano roll</h2><p>Select a synth lane and tap cells to add or remove notes.</p></div><select value={selectedLane?.id||""} onChange={e=>setSelected(e.target.value)}>{lanes.filter(l=>l.kind==="synth").map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
      <div className="studio-piano-roll">{Array.from({length:13},(_,row)=>{const pitch=72-row;return <div className="studio-piano-row" key={pitch}><span>{label(pitch)}</span><div>{Array.from({length:16},(_,i)=><button key={i} aria-label={label(pitch)+" step "+(i+1)} className={"studio-note-cell "+(notes.some(n=>n.pitch===pitch&&n.step===i)?"note-on ":"")+(i%4===0?"beat":"")} onClick={()=>selectedLane&&update(selectedLane.id,l=>({...l,notes:l.notes.some(n=>n.pitch===pitch&&n.step===i)?l.notes.filter(n=>!(n.pitch===pitch&&n.step===i)):[...l.notes,{pitch,step:i,velocity:.8}]}))}/>)}</div></div>})}</div>
    </section>
    <section className="studio-panel studio-arrangement"><div className="studio-section-heading"><div><h2>Arrangement</h2><p>Pattern overview for each lane.</p></div><button onClick={()=>setLanes(old=>[...old,lane("Synth "+(old.length-3),"lead","synth")])}>＋ Add synth lane</button></div>
      {lanes.map(l=><div className="studio-arrangement-row" key={l.id}><span>{l.name}</span><div>{Array.from({length:4},(_,i)=><div className="studio-arrangement-block" key={i}>{l.kind==="drum"?l.steps.filter(Boolean).length:l.notes.length} events</div>)}</div></div>)}
    </section>
    <section className="studio-panel studio-projects"><div className="studio-section-heading"><div><h2>Your projects</h2><p>Cloud projects are private to your account.</p></div><button onClick={()=>void loadProjects()}>Refresh</button></div>{!userId&&<p className="studio-empty">Sign in to save and reopen projects across devices.</p>}{saved.map(p=><div className="studio-saved-project" key={p.id}><span><strong>{p.title}</strong><small>{p.tempo} BPM</small></span><button onClick={()=>void openProject(p.id)}>Open</button></div>)}{error&&<p className="studio-error" role="alert">{error}</p>}</section>
    <div className="studio-grid"><section className="studio-panel"><h3>Royal Studio Companion</h3><p className="studio-panel-hint">Shared Royal intelligence with this project as context.</p><form onSubmit={askRoyal} className="studio-chat-form"><input value={royalPrompt} onChange={e=>setRoyalPrompt(e.target.value)} placeholder="Help me build an Afrobeats groove…"/><button disabled={royalBusy}>{royalBusy?"Thinking…":"Ask Royal"}</button></form>{royalReply&&<p className="studio-reply">{royalReply}</p>}</section>
      <section className="studio-panel"><h3>ElevenLabs voice generation</h3><form onSubmit={generateVoice} className="studio-tts-form"><textarea rows={2} value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder="Write a voiceover or intro…"/><select value={voiceId} onChange={e=>setVoiceId(e.target.value)}>{[["21m00Tcm4TlvDq8ikWAM","Rachel"],["AZnzlk1XvdvUeBnXmlld","Domi"],["EXAVITQu4vr4xnSDxMaL","Bella"],["ErXwobaYiN019PkySvjV","Antoni"],["MF3mGyEYCl7XYWbV9V6O","Elli"]].map(v=><option key={v[0]} value={v[0]}>{v[1]}</option>)}</select><button disabled={voiceBusy}>{voiceBusy?"Generating…":"Generate narration"}</button></form>{voiceError&&<p className="studio-error">{voiceError}</p>}{voiceUrl&&<audio ref={voiceRef} src={voiceUrl} controls className="studio-audio-output"/>}</section></div>
    <CreatorAnalytics/><section className="studio-panel studio-source-library"><h3>Published music to work with</h3>{tracks.length?tracks.slice(0,8).map(t=><button key={t.id} onClick={()=>onPlayTrack(t)}>{t.title} · {t.artist}</button>):<p className="studio-empty">Published tracks will appear here when the shared catalogue has audio.</p>}</section>
  </div>
}
