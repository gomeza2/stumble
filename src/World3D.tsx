import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

type Props = { onProgress?: (value:number)=>void; onFinish?: (result:'win'|'fall')=>void; onCheckpoint?:()=>void; startAtCheckpoint?:boolean };
type Hazard = { group:THREE.Group; kind:'sweeper'|'bumper'|'spinner'; baseX:number; baseZ:number; phase:number; };
type Held = 'forward'|'back'|'left'|'right'|'jump'|'dash';
const keyMap:Record<string,Held>={ArrowUp:'forward',w:'forward',W:'forward',ArrowDown:'back',s:'back',S:'back',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'jump',Space:'jump',Shift:'dash'};

export default function World3D({onProgress,onFinish,onCheckpoint,startAtCheckpoint=false}:Props){
 const hostRef=useRef<HTMLDivElement>(null);
 const gameRef=useRef<{reset:()=>void;press:(key:Held,down:boolean)=>void}|null>(null);
 const [help,setHelp]=useState('WASD / FLECHAS para moverte · ESPACIO para saltar');
 const [checkpoint,setCheckpoint]=useState(startAtCheckpoint);
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const host=hostRef.current;if(!host)return;
  let alive=true,raf=0,elapsed=0,last=performance.now(),finished=false,checkpointHit=startAtCheckpoint,invulnerable=0,dashUntil=0,jumpQueued=false,dashQueued=false,steps=0,lastStep=0;
  const held=new Set<Held>();
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b6d8ff');scene.fog=new THREE.Fog('#b6d8ff',42,145);
  const camera=new THREE.PerspectiveCamera(58,1,.1,240);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#eaf5ff','#5a6987',2.0));
  const sun=new THREE.DirectionalLight('#fff3d5',3.1);sun.position.set(-12,25,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
  const mat=(color:string,roughness=.55,metalness=.02)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const floorMat=mat('#f1f4fb'),edgeMat=mat('#3d4b70'),lime=mat('#c5ff6b',.3),pink=mat('#ff5d8f',.35),blue=mat('#4f8dff',.35),purple=mat('#9066ff',.4),orange=mat('#ffae50',.4),white=mat('#ffffff',.4),dark=mat('#27314c');
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),mat('#92b6d7'));ground.rotation.x=-Math.PI/2;ground.position.y=-2.8;ground.receiveShadow=true;scene.add(ground);
  const course=new THREE.Group();scene.add(course);
  const box=(parent:THREE.Object3D,w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number,cast=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
  const sphere=(parent:THREE.Object3D,r:number,material:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m};
  const slab=(x:number,z:number,w:number,d:number,material:THREE.Material=floorMat)=>{box(course,w,.65,d,material,x,-.45,z);box(course,.22,.38,d+.15,edgeMat,x-w/2-.12,-.27,z,false);box(course,.22,.38,d+.15,edgeMat,x+w/2+.12,-.27,z,false)};
  // A complete, readable obstacle course: 4 themed sectors and 2 safe checkpoints.
  slab(0,4,14,24);slab(0,-17,14,18);slab(0,-37,14,18);slab(0,-51,14,5);slab(0,-64,14,8);slab(0,-79,14,22);
  // Colored sector strips
  for(const z of [ -7,-27,-48,-69,-91 ]){box(course,13.7,.035,.16,lime,0,-.115,z,false)}
  // Start gate
  for(const x of [-6.2,6.2]){box(course,.38,5,.42,purple,x,2.15,11);sphere(course,.36,lime,x,4.85,11)}
  box(course,12.8,.34,.5,purple,0,4.4,11);
  // Side banners and distant floating scenery
  for(let i=0;i<17;i++){const z=9-i*6;for(const side of [-1,1]){const p=sphere(scene,.35,i%3===0?pink:i%3===1?blue:lime,side*(10+Math.sin(i)*1.2),1.2,z);p.userData.bob=i*.8;}}
  // Moving bumpers, spinning sweeper bars, and rotating gates.
  const hazards:Hazard[]=[];
  const makeSweeper=(z:number,phase:number)=>{const g=new THREE.Group();g.position.set(0,.48,z);course.add(g);const hub=sphere(g,.72,orange,0,0,0);hub.scale.set(1,.55,1);box(g,11,.34,.6,pink,0,.05,0);for(const x of [-4.6,-2.3,2.3,4.6])sphere(g,.4,white,x,.1,0);hazards.push({group:g,kind:'sweeper',baseX:0,baseZ:z,phase});};
  makeSweeper(-12,0);makeSweeper(-32,1.3);makeSweeper(-63,2.1);
  for(const [z,phase] of [[-21,0],[-43,1.5],[-73,2.8]] as number[][]){const g=new THREE.Group();g.position.set(0,.1,z);course.add(g);const ball=sphere(g,1.1,blue,0,1.15,0);ball.material=blue;const ring=new THREE.Mesh(new THREE.TorusGeometry(1.45,.14,8,32),lime);ring.position.y=1.15;ring.rotation.x=Math.PI/2;g.add(ring);hazards.push({group:g,kind:'bumper',baseX:0,baseZ:z,phase});}
  // A row of springy stepping pads that can throw the player off line.
  for(let i=0;i<5;i++){const x=-4+i*2;const p=box(course,1.35,.42,2.2,i%2?purple:blue,x,.12,-49);p.userData.baseY=.12;p.userData.phase=i*.8;}
  // The split bridge: jump across a real gap, with safe side platforms.
  const gap=box(course,5,.12,8,mat('#35405f'),0,-.02,-56);gap.position.y=-1.1;
  for(const side of [-1,1]){box(course,3.2,.35,7,lime,side*5.1,-.05,-56)}
  // Final lane gates and finish arch
  for(let i=0;i<4;i++){const z=-77-i*2.5;const gate=new THREE.Group();gate.position.set(i%2===0?-2.7:2.7,.55,z);course.add(gate);box(gate,.3,2.5,.45,i%2===0?pink:blue,0,1.15,0);sphere(gate,.36,lime,0,2.5,0);hazards.push({group:gate,kind:'spinner',baseX:gate.position.x,baseZ:z,phase:i});}
  const finish=new THREE.Group();finish.position.set(0,0,-94);course.add(finish);for(const x of [-5.5,5.5])box(finish,.5,6,.6,lime,x,2.7,0);box(finish,11.5,.45,.65,purple,0,5.6,0);for(let i=0;i<7;i++){const flag=box(finish,1.5,.16,.1,i%2?pink:blue,-4.5+i*1.5,4.9,0);flag.rotation.z=(i%2?.15:-.15)}
  // Player: rounded capsule-like body, face visor, gloves, shoes.
  const player=new THREE.Group();scene.add(player);
  const bodyMat=mat('#f7fbff',.28),visorMat=new THREE.MeshStandardMaterial({color:'#18223b',roughness:.2,metalness:.2}),shoeMat=mat('#b7ff73',.3);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.53,.8,5,10),bodyMat);torso.position.y=1.13;torso.castShadow=true;player.add(torso);
  const head=sphere(player,.46,bodyMat,0,2.03,0);
  const visor=new THREE.Mesh(new THREE.SphereGeometry(.31,18,12,0,Math.PI*2,0,Math.PI*.55),visorMat);visor.position.set(0,2.12,-.32);visor.scale.set(1,.65,.32);player.add(visor);
  for(const x of [-.58,.58]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.54,4,8),bodyMat);arm.position.set(x,1.2,0);arm.rotation.z=x<0?-.18:.18;player.add(arm);const glove=sphere(player,.2,white,x,.88,-.02);glove.scale.set(1,.85,1)}
  const legL=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.48,4,8),purple);legL.position.set(-.25,.43,0);player.add(legL);const legR=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.48,4,8),purple);legR.position.set(.25,.43,0);player.add(legR);
  for(const x of [-.27,.27]){const shoe=sphere(player,.24,shoeMat,x,.16,-.12);shoe.scale.set(1,.65,1)}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.72,24),new THREE.MeshBasicMaterial({color:'#1b2442',transparent:true,opacity:.24}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.1;player.add(shadow);
  const checkpointRing=new THREE.Mesh(new THREE.TorusGeometry(1.25,.13,10,36),lime);checkpointRing.rotation.x=Math.PI/2;checkpointRing.position.set(0,.1,-38);course.add(checkpointRing);
  let checkpointZ=-38,px=0,pz=13,vy=0,onGround=true,airTime=0,playerYaw=0,hitFlash=0,knockX=0;
  const reset=()=>{px=0;pz=checkpointHit?checkpointZ:13;vy=0;onGround=true;airTime=0;finished=false;invulnerable=performance.now()+1200;player.position.set(px,0,pz);setHelp('¡Dale! Saltá, esquivá y buscá los atajos.');onProgress?.(Math.max(0,Math.round((13-pz)/107*100)));};
  const press=(key:Held,down:boolean)=>{if(down&&!held.has(key)){if(key==='jump')jumpQueued=true;if(key==='dash')dashQueued=true}if(down)held.add(key);else held.delete(key)};
  gameRef.current={reset,press};
  const collide=(x:number,z:number)=>{for(const h of hazards){const dx=x-h.group.position.x,dz=z-h.group.position.z;if(h.kind==='sweeper'&&Math.abs(dz)<.95&&Math.abs(dx)<5.5)return h;if(h.kind==='bumper'&&Math.hypot(dx,dz)<1.35)return h;if(h.kind==='spinner'&&Math.abs(dz)<.8&&Math.abs(dx)<.8)return h;}return null};
  const finishRun=(result:'win'|'fall')=>{if(finished)return;finished=true;held.clear();onFinish?.(result);setHelp(result==='win'?'¡META ALCANZADA!':'¡Caíste! Volvé al último checkpoint.');};
  const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};const ro=new ResizeObserver(resize);ro.observe(host);resize();
  const onKeyDown=(e:KeyboardEvent)=>{const k=keyMap[e.key]||keyMap[e.code];if(!k)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();press(k,true)};
  const onKeyUp=(e:KeyboardEvent)=>{const k=keyMap[e.key]||keyMap[e.code];if(k)press(k,false)};
  window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
  const animate=(now:number)=>{if(!alive)return;raf=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.035);last=now;elapsed+=dt;
   // Animate hazards independently so the world feels alive even while the player pauses.
   hazards.forEach(h=>{if(h.kind==='sweeper'){h.group.rotation.y=Math.sin(elapsed*1.25+h.phase)*.72;h.group.rotation.y+=dt*1.8;}else if(h.kind==='bumper'){h.group.position.x=Math.sin(elapsed*1.7+h.phase)*4.3;h.group.position.y=.1+Math.abs(Math.sin(elapsed*2.2+h.phase))*.35;}else{h.group.rotation.y=Math.sin(elapsed*1.9+h.phase)*.42;}});
   if(!finished){const forward=(held.has('forward')?1:0)-(held.has('back')?1:0),side=(held.has('right')?1:0)-(held.has('left')?1:0);const moving=forward!==0||side!==0;const dash=now<dashUntil;if(dashQueued&&now>dashUntil){dashUntil=now+230;dashQueued=false;setHelp('¡IMPULSO! Aprovechá el dash para cruzar huecos.')}const speed=dash?13.8:7.5;let dx=side*speed*dt,dz=-forward*speed*dt;if(moving){const n=Math.hypot(dx,dz);if(n>speed*dt){dx*=speed*dt/n;dz*=speed*dt/n}playerYaw=Math.atan2(dx,-dz);if(now-lastStep>130){steps++;lastStep=now}}
    const nextX=THREE.MathUtils.clamp(px+dx,-6.15,6.15),nextZ=pz+dz;px=nextX;pz=nextZ;
    if(jumpQueued&&onGround){vy=held.has('dash')?10.8:9.4;onGround=false;airTime=0;jumpQueued=false;setHelp('¡Buen salto! Podés combinar salto + dash.')}else jumpQueued=false;
    vy-=22*dt;player.position.y+=vy*dt;if(player.position.y<=0){player.position.y=0;vy=0;onGround=true}else airTime+=dt;
    // Rebounds on contact are forgiving but cost a little distance.
    const h=collide(px,pz);if(h&&now>invulnerable){invulnerable=now+800;const sign=px-h.group.position.x;px=THREE.MathUtils.clamp(px+(sign===0?(Math.random()>.5?1:-1):Math.sign(sign))*1.8,-6,6);pz+=.85;vy=Math.max(vy,4.5);player.position.y=Math.max(player.position.y,.25);setHelp('¡PUM! Te empujaron. Usá el impulso para recuperar terreno.')}
    if(pz<-35&&!checkpointHit){checkpointHit=true;checkpointZ=-38;setCheckpoint(true);onCheckpoint?.();setHelp('CHECKPOINT ACTIVADO · Si caés, volvés acá.')}
    // Gaps are risky; a jump or dash carries the player over the broken bridge.
    if(pz<-53&&pz>-60&&Math.abs(px)<3.15&&player.position.y<.25){finishRun('fall')}
    if(pz<-98){finishRun('win')}
    if(player.position.y < -4 || Math.abs(px)>7.8 || pz>19){finishRun('fall')}
    if(now>invulnerable){const hit=collide(px,pz);if(hitFlash>0)hitFlash-=dt}
    player.position.x=px;player.position.z=pz;player.rotation.y=playerYaw;torso.rotation.z=side*.08;head.rotation.y=Math.sin(elapsed*3)*.04;legL.rotation.x=moving?Math.sin(elapsed*13)*.65:0;legR.rotation.x=moving?-Math.sin(elapsed*13)*.65:0;shadow.scale.setScalar(1-Math.min(player.position.y*.1,.4));shadow.material.opacity=.24-Math.min(player.position.y*.025,.16);
    if(Math.abs(px)>6.05)setHelp('¡Cuidado con el borde! Mantenete sobre la pista.');
    onProgress?.(Math.max(0,Math.min(100,Math.round((13-pz)/111*100))));
   }
   const camTarget=new THREE.Vector3(px*.35,2.1+player.position.y*.45,pz+9.8);camera.position.lerp(new THREE.Vector3(px*.55,6.8+player.position.y*.35,pz+12.5),1-Math.pow(.001,dt));camera.lookAt(camTarget);
   renderer.render(scene,camera);
  };
  reset();raf=requestAnimationFrame(animate);
  return()=>{alive=false;cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}});if(renderer.domElement.parentNode===host)host.removeChild(renderer.domElement)};
 },[onProgress,onFinish,onCheckpoint]);
 const hold=(key:Held,down:boolean)=>gameRef.current?.press(key,down);
 return <div className="course-shell"><div className="course-canvas" ref={hostRef}/><div className="course-label"><span className="live-dot"/> CIRCUITO 01 <b>· NUBE DE CAOS</b></div><div className="course-hint">{help}</div><div className="course-checkpoint">{checkpoint?'✓ CHECKPOINT GUARDADO':'META A 100 METROS'}</div><div className="touch-controls"><div className="touch-pad"><button onPointerDown={()=>hold('forward',true)} onPointerUp={()=>hold('forward',false)} onPointerLeave={()=>hold('forward',false)} aria-label="Adelante"><ArrowUp/></button><div><button onPointerDown={()=>hold('left',true)} onPointerUp={()=>hold('left',false)} onPointerLeave={()=>hold('left',false)} aria-label="Izquierda"><ArrowLeft/></button><button onPointerDown={()=>hold('back',true)} onPointerUp={()=>hold('back',false)} onPointerLeave={()=>hold('back',false)} aria-label="Atrás"><ArrowDown/></button><button onPointerDown={()=>hold('right',true)} onPointerUp={()=>hold('right',false)} onPointerLeave={()=>hold('right',false)} aria-label="Derecha"><ArrowRight/></button></div></div><div className="touch-actions"><button className="jump-control" onPointerDown={()=>hold('jump',true)} onPointerUp={()=>hold('jump',false)} onPointerLeave={()=>hold('jump',false)}>SALTAR</button><button className="dash-control" onPointerDown={()=>hold('dash',true)} onPointerUp={()=>hold('dash',false)} onPointerLeave={()=>hold('dash',false)}>DASH ↗</button></div></div><div className="course-keys">WASD / FLECHAS · ESPACIO SALTA · SHIFT DASH</div></div>;
}
