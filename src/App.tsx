import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Crown, Gamepad2, Gauge, Medal, Play, RotateCcw, Sparkles, Trophy, Volume2, Zap } from 'lucide-react';
import World3D from './World3D';

type Result='win'|'fall'|null;
const readNumber=(key:string)=>{try{return Number(localStorage.getItem(key)||0)}catch{return 0}};
export default function App(){
 const [screen,setScreen]=useState<'home'|'race'>('home');
 const [progress,setProgress]=useState(0);
 const progressRef=useRef(0);
 const [result,setResult]=useState<Result>(null);
 const [courseKey,setCourseKey]=useState(0);
 const [best,setBest]=useState(()=>readNumber('nube-best'));
 const [wins,setWins]=useState(()=>readNumber('nube-wins'));
 const [checkpoint,setCheckpoint]=useState(false);
 const [muted,setMuted]=useState(false);
 useEffect(()=>{document.title='NUBE DE CAOS — Circuito de obstáculos'},[]);
 const onProgress=useCallback((n:number)=>{progressRef.current=n;setProgress(n)},[]);
 const onCheckpoint=useCallback(()=>setCheckpoint(true),[]);
 const onFinish=useCallback((r:'win'|'fall')=>{setResult(r);if(r==='win'){setWins(v=>{const next=v+1;try{localStorage.setItem('nube-wins',String(next))}catch{}return next});setBest(v=>{const next=Math.max(v,Math.round(1000+progressRef.current*12));try{localStorage.setItem('nube-best',String(next))}catch{}return next})}},[]);
 const launch=(fromCheckpoint=false)=>{setResult(null);setProgress(fromCheckpoint?46:0);if(!fromCheckpoint)setCheckpoint(false);setCourseKey(v=>v+1);setScreen('race')};
 const goHome=()=>{setResult(null);setScreen('home')};
 return <div className="game-app">
  <header className="nav wrap">
   <button className="brand" onClick={goHome} aria-label="Volver al inicio"><span className="brand-mark"><Zap fill="currentColor" size={23}/></span><span className="brand-type">NUBE<span> DE CAOS</span><small>OBSTACLE RUSH / PLAYTEST 01</small></span></button>
   <div className="nav-right"><span className="online"><i/> CIRCUITO DISPONIBLE</span><button className="sound-toggle" onClick={()=>setMuted(v=>!v)} aria-label={muted?'Activar sonido':'Silenciar sonido'}><Volume2 size={17}/><span>{muted?'SONIDO OFF':'SONIDO ON'}</span></button><span className="avatar">J1</span></div>
  </header>
  {screen==='home'?<main className="wrap home-screen">
   <section className="hero-block">
    <div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> UN CIRCUITO. MIL FORMAS DE CAER.</div><h1>NO ES UNA<br/>CARRERA.<br/><span>ES EL CAOS.</span></h1><p className="hero-desc">Saltá, esquivá, impulsate y encontrá tu propia ruta. El circuito cambia de ritmo y cada obstáculo tiene algo que decir.</p><div className="hero-cta"><button className="btn-main" onClick={()=>launch()}><Play fill="currentColor" size={17}/> ENTRAR AL CIRCUITO <ArrowRight size={17}/></button><div className="micro-proof"><span><i className="dot-lime"/> 3 SECTORES</span><span>·</span><span>CHECKPOINTS</span><span>·</span><span>DASH + SALTO</span></div></div></div>
    <div className="hero-art" aria-label="Ilustración de un circuito de obstáculos flotante"><div className="art-top"><span>MAPA 001</span><span className="art-live"><i/> EN VIVO</span></div><div className="art-grid"/><div className="art-track"><div className="track-piece track-a"/><div className="track-piece track-b"/><div className="track-piece track-c"/><div className="track-piece track-d"/><div className="track-ring"/><div className="art-runner"><span/></div><div className="art-obstacle obs-one"/><div className="art-obstacle obs-two"/><div className="art-orb orb-one"/><div className="art-orb orb-two"/></div><div className="art-caption"><b>NUBE DE CAOS</b><span>UN MAPA ORIGINAL · 3D</span></div><div className="art-coords">X: 00.7 / Z: 13.0</div></div>
   </section>
   <section className="quick-stats"><div className="quick-stat"><span className="quick-icon"><Trophy size={18}/></span><div><small>MEJOR RECORRIDO</small><b>{best.toLocaleString('es-AR')} <em>PTS</em></b></div></div><div className="quick-stat"><span className="quick-icon mint"><Medal size={18}/></span><div><small>VECES QUE LLEGASTE</small><b>{wins}</b></div></div><div className="quick-stat"><span className="quick-icon violet"><Gauge size={18}/></span><div><small>OBJETIVO ACTUAL</small><b>SUPERARTE</b></div></div></section>
   <section className="course-section"><div className="section-title"><div><div className="eyebrow">TU PRIMER DESAFÍO</div><h2>BIENVENIDO A <span>NUBE DE CAOS.</span></h2></div><span className="map-chip"><span/> MAPA JUGABLE · 01</span></div>
    <div className="feature-grid"><article className="feature-card feature-lime"><div className="feature-number">01 / MOVIMIENTO</div><div className="feature-emoji">🏃</div><h3>NO SOS UNA BOLA.</h3><p>Control preciso, salto con altura real y un dash corto para salvarte por los pelos.</p><div className="feature-bottom"><span>WASD / FLECHAS</span><ArrowUpRight size={16}/></div></article><article className="feature-card feature-pink"><div className="feature-number">02 / OBSTÁCULOS</div><div className="feature-emoji">🌀</div><h3>TODO SE MUEVE.</h3><p>Barras giratorias, bumpers que rebotan y compuertas que castigan el piloto automático.</p><div className="feature-bottom"><span>LEÉ EL RITMO</span><ArrowUpRight size={16}/></div></article><article className="feature-card feature-blue"><div className="feature-number">03 / RUTA</div><div className="feature-emoji">🛣️</div><h3>BUSCÁ TU ATAJO.</h3><p>Un puente roto, carriles estrechos y un checkpoint para volver a intentarlo.</p><div className="feature-bottom"><span>NO TE RINDAS</span><ArrowUpRight size={16}/></div></article></div>
   </section>
   <section className="controls-strip"><div className="controls-title"><Gamepad2 size={20}/><div><b>CONTROLES</b><small>Fáciles de aprender. Difíciles de dominar.</small></div></div><div className="key-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <em>MOVER</em></span><span><kbd>SPACE</kbd> <em>SALTAR</em></span><span><kbd>SHIFT</kbd> <em>DASH</em></span></div><button className="text-button" onClick={()=>launch()}>PROBAR MAPA <ArrowRight size={15}/></button></section>
   <footer className="site-footer"><span>© 2026 NUBE DE CAOS</span><span>HECHO PARA JUGAR, CAERSE Y VOLVER A INTENTAR. <b>✳</b></span><span>PROTOTIPO 01.0</span></footer>
  </main>:<main className="race-screen">
   <div className="race-top wrap"><button className="back-button" onClick={goHome}><ArrowLeft size={16}/> MENÚ</button><div className="race-title"><span className="live-dot"/> CIRCUITO 01 <b>/ NUBE DE CAOS</b></div><div className="race-progress-label">PROGRESO <b>{progress}%</b></div></div>
   <div className="progress-track"><div style={{width:progress+'%'}}/></div>
   <div className="race-stage"><World3D key={courseKey} onProgress={onProgress} onFinish={onFinish} onCheckpoint={onCheckpoint} startAtCheckpoint={checkpoint}/>{result&&<div className="result-overlay"><div className={'result-card '+(result==='win'?'result-win':'')}><span className="result-icon">{result==='win'?'🏆':'💥'}</span><div className="eyebrow">{result==='win'?'CIRCUITO COMPLETADO':'FIN DE LA CAÍDA'}</div><h2>{result==='win'?'¡LO HICISTE!':'¡UPS. OTRA VEZ.'}</h2><p>{result==='win'?'Cruzaste la meta. ¿Podés mejorar tu propio tiempo?':'La pista no perdona, pero ahora conocés un poco más el mapa.'}</p><div className="result-stats"><div><small>PROGRESO</small><b>{progress}%</b></div><div><small>CHECKPOINT</small><b>{checkpoint?'ACTIVO':'SIN ACTIVAR'}</b></div><div><small>RÉCORD</small><b>{best.toLocaleString('es-AR')}</b></div></div><button className="btn-main" onClick={()=>launch(result==='fall'&&checkpoint)}><RotateCcw size={17}/> VOLVER A INTENTAR</button><button className="result-menu" onClick={goHome}>VOLVER AL MENÚ</button></div></div>}</div>
   <div className="race-bottom wrap"><span><i className="dot-lime"/> {checkpoint?'CHECKPOINT ACTIVADO':'LLEGÁ AL CHECKPOINT PARA GUARDAR PROGRESO'}</span><span>ESPACIO <b>SALTAR</b>　·　SHIFT <b>DASH</b></span></div>
  </main>}
 </div>
}
