import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,RotateCcw} from 'lucide-react';

type Direction='forward'|'back'|'left'|'right'|'jump';
const keyMap:Record<string,Direction>={ArrowUp:'forward',w:'forward',W:'forward',ArrowDown:'back',s:'back',S:'back',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'jump'};

export default function World3D(){
 const mountRef=useRef<HTMLDivElement>(null);
 const gameRef=useRef<{reset:()=>void}|null>(null);
 const [help,setHelp]=useState('¡Neon Nebula! Esquivá compuertas móviles, saltá y buscá la meta');
 const [moves,setMoves]=useState(0);

 useEffect(()=>{
  const host=mountRef.current;if(!host)return;
  let alive=true,frame=0,moveCounter=0,lastMoveAt=0,lastBumpAt=0;
  const keys=new Set<Direction>();
  const scene=new THREE.Scene();scene.background=new THREE.Color('#a9c7d9');scene.fog=new THREE.Fog('#a9c7d9',35,95);
  const camera=new THREE.PerspectiveCamera(48,1,.1,160);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.className='world3d-canvas';renderer.domElement.setAttribute('aria-label','Circuito tridimensional jugable');host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#eff8ff','#58627a',2.0));
  const sun=new THREE.DirectionalLight('#fff3d6',3.0);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
  const fill=new THREE.DirectionalLight('#91a7ff',1.2);fill.position.set(16,9,-16);scene.add(fill);
  const mat=(color:string,roughness=.72,metalness=.02)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const grass=mat('#6c8b79'),track=mat('#d5dce3'),trackEdge=mat('#53647c'),wallA=mat('#8b9aaf'),wallB=mat('#65758b'),lime=mat('#b7ff73',.35),pink=mat('#ff6689',.38),blue=mat('#718dff',.4),white=mat('#f8fafc',.5),dark=mat('#263247'),gold=mat('#ffd36a',.38,.2);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(110,110),grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.58;ground.receiveShadow=true;scene.add(ground);
  const groundGrid=new THREE.GridHelper(100,50,'#c3d7d0','#c3d7d0');groundGrid.position.y=-.565;(groundGrid.material as THREE.Material).opacity=.17;(groundGrid.material as THREE.Material).transparent=true;scene.add(groundGrid);
  const course=new THREE.Mesh(new THREE.BoxGeometry(17,.7,58),track);course.position.set(0,-.35,0);course.receiveShadow=true;course.castShadow=true;scene.add(course);
  const blockers:{x:number;z:number;w:number;h:number;d:number;mesh:THREE.Mesh}[]=[];
  const movers:{mesh:THREE.Mesh;blocker:{x:number;z:number;w:number;h:number;d:number;mesh:THREE.Mesh};baseX:number;range:number;speed:number;phase:number}[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material,collide=false)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
   if(collide)blockers.push({x,z,w,h,d,mesh});return mesh;
  };
  const cylinder=(x:number,y:number,z:number,r:number,h:number,material:THREE.Material)=>{
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  };
  // Course rails and lane markings.
  box(-8.15,.15,0,.35,.35,57,trackEdge);box(8.15,.15,0,.35,.35,57,trackEdge);
  for(let z=25;z>-27;z-=4){box(0,.158,z,.16,.025,1.5,white)}
  // Checkpoint gates.
  const gate=(z:number,color:THREE.Material)=>{
   box(-6.4,2.2,z,.32,4.4,.32,color);box(6.4,2.2,z,.32,4.4,.32,color);box(0,4.25,z,12.8,.34,.32,color);
   for(let x=-5;x<=5;x+=2.5)box(x,3.3,z,.09,1.3,.36,gold);
  };
  gate(23,lime);gate(-25,gold);
  // Jump hurdles, offset slalom blocks, and overhead arches.
  box(-3.4,.72,15,2.3,1.45,1.1,pink,true);box(3.1,.55,10,2.1,1.1,1.1,blue,true);
  box(-.5,.5,4,2.4,1,1.25,lime,true);box(-4,.85,-1,1.8,1.7,1.1,blue,true);
  box(3.5,.7,-6,2.4,1.4,1.1,pink,true);box(0,.48,-12,2.7,.95,1.1,gold,true);
  box(-3.3,.68,-18,2.2,1.35,1.1,lime,true);
  // Original signature obstacles: moving gates, bounce pads and comet hoops.
  const movingGate=(z:number,baseX:number,range:number,speed:number,phase:number,color:THREE.Material)=>{
   const mesh=box(baseX,.78,z,2.5,1.55,.9,color,true);
   const blocker=blockers[blockers.length-1];
   movers.push({mesh,blocker,baseX,range,speed,phase});
   box(baseX,.18,z,3.3,.18,1.35,dark);
   for(const side of [-1,1])cylinder(baseX+side*1.45,.55,z,.12,1.1,gold);
  };
  movingGate(12,0,3.8,1.4,0,pink);
  movingGate(1,0,4.2,1.05,2,blue);
  movingGate(-10,0,3.4,1.65,4,lime);
  movingGate(-20,0,4.0,1.2,1.1,gold);
  const bounce=(x:number,z:number,color:THREE.Material)=>{
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.13,10,28),color);ring.rotation.x=Math.PI/2;ring.position.set(x,.1,z);ring.castShadow=true;scene.add(ring);
   const core=new THREE.Mesh(new THREE.CylinderGeometry(.58,.7,.12,24),dark);core.position.set(x,.02,z);core.castShadow=true;scene.add(core);
   const center=new THREE.Mesh(new THREE.CircleGeometry(.42,24),color);center.rotation.x=-Math.PI/2;center.position.set(x,.09,z);scene.add(center);
  };
  bounce(-4,8,lime);bounce(4,-3,pink);bounce(-4,-14,blue);
  for(const [z,color] of [[17,'#ff6689'],[5,'#718dff'],[-9,'#b7ff73'],[-22,'#ffd36a']] as [number,string][]){
   const hoopMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,roughness:.35});
   const hoop=new THREE.Mesh(new THREE.TorusGeometry(2.1,.11,12,36),hoopMat);
   hoop.position.set(0,2.7,z);hoop.rotation.y=.18;hoop.castShadow=true;scene.add(hoop);
   for(const x of [-2.1,2.1]){const lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),gold);lamp.position.set(x,2.7,z);scene.add(lamp)}
  }
  // Soft, oversized stepping pads outside the main track make the world feel inhabited.
  for(let i=0;i<8;i++){const side=i%2===0?-1:1;const z=18-i*5;const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,.38,8),i%2?blue:lime);pad.position.set(side*(11+(i%3)*2),-.15,z);pad.castShadow=true;pad.receiveShadow=true;scene.add(pad);cylinder(side*(11+(i%3)*2),.22,z,.22,.44,gold)}
  // Decorative pylons and flags.
  for(let z=19;z>=-21;z-=8){for(const x of [-7.1,7.1]){cylinder(x,.9,z,.18,1.8,dark);const orb=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),x<0?pink:blue);orb.position.set(x,1.95,z);orb.castShadow=true;scene.add(orb)}}
  // Rotating crossbar hazard.
  const spinner=new THREE.Group();spinner.position.set(0,.65,-8.5);scene.add(spinner);
  const spinBar=new THREE.Mesh(new THREE.BoxGeometry(12,.22,.28),pink);spinBar.castShadow=true;spinBar.receiveShadow=true;spinner.add(spinBar);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.5,24),gold);hub.rotation.x=Math.PI/2;hub.castShadow=true;spinner.add(hub);
  // Faceless white humanoid player, assembled from smooth primitives.
  const player=new THREE.Group();scene.add(player);player.position.set(0,0,20);
  const body=new THREE.Group();player.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.34,24,20),white);head.position.y=1.95;head.castShadow=true;body.add(head);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.68,6,12),white);torso.position.y=1.25;torso.castShadow=true;body.add(torso);
  const chestMark=new THREE.Mesh(new THREE.BoxGeometry(.24,.09,.05),lime);chestMark.position.set(0,1.38,.345);body.add(chestMark);
  const armL=new THREE.Group();armL.position.set(-.43,1.55,0);body.add(armL);
  const armR=new THREE.Group();armR.position.set(.43,1.55,0);body.add(armR);
  for(const arm of [armL,armR]){const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.55,4,8),white);mesh.position.y=-.32;mesh.rotation.z=arm===armL?-.12:.12;mesh.castShadow=true;arm.add(mesh)}
  const legL=new THREE.Group();legL.position.set(-.19,.72,0);body.add(legL);
  const legR=new THREE.Group();legR.position.set(.19,.72,0);body.add(legR);
  for(const leg of [legL,legR]){const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.48,4,8),white);mesh.position.y=-.28;mesh.castShadow=true;leg.add(mesh);const shoe=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),dark);shoe.scale.set(1,.55,1.4);shoe.position.set(0,-.53,.08);shoe.castShadow=true;leg.add(shoe)}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:'#1c2635',transparent:true,opacity:.23}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;player.add(shadow);
  const velocity={y:0};let onGround=true,walkTime=0,won=false;
  const bounceZones=[{x:-4,z:8},{x:4,z:-3},{x:-4,z:-14}];
  const reset=()=>{player.position.set(0,0,20);velocity.y=0;onGround=true;won=false;keys.clear();setHelp('¡Neon Nebula! Esquivá compuertas móviles, saltá y buscá la meta.');};
  gameRef.current={reset};
  const resize=()=>{if(!host||!alive)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  const keyDown=(e:KeyboardEvent)=>{const dir=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(!dir)return;if(dir==='jump'||dir==='forward'||dir==='back'||dir==='left'||dir==='right')e.preventDefault();keys.add(dir)};
  const keyUp=(e:KeyboardEvent)=>{const dir=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(dir)keys.delete(dir)};
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  const clock=new THREE.Clock();
  const animate=()=>{
   if(!alive)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.045);
   const moving=keys.has('forward')||keys.has('back')||keys.has('left')||keys.has('right');
   const speed=keys.has('jump')?8:7.2;let dx=0,dz=0;
   if(keys.has('left'))dx-=speed*dt;if(keys.has('right'))dx+=speed*dt;if(keys.has('forward'))dz-=speed*dt;if(keys.has('back'))dz+=speed*dt;
   const length=Math.hypot(dx,dz);if(length>0){dx=dx/Math.max(1,length/(speed*dt));dz=dz/Math.max(1,length/(speed*dt))}
   const nx=THREE.MathUtils.clamp(player.position.x+dx,-7.25,7.25),nz=THREE.MathUtils.clamp(player.position.z+dz,-27,27);
   const collides=(x:number,z:number)=>blockers.some(b=>player.position.y<b.h-.15&&Math.abs(x-b.x)<b.w/2+.38&&Math.abs(z-b.z)<b.d/2+.32);
   if(!collides(nx,player.position.z))player.position.x=nx;else if(moving&&nowTime()-lastBumpAt>900){lastBumpAt=nowTime();setHelp('¡Obstáculo! Saltá o buscá un hueco.')}
   if(!collides(player.position.x,nz))player.position.z=nz;else if(moving&&nowTime()-lastBumpAt>900){lastBumpAt=nowTime();setHelp('¡Obstáculo! Saltá o buscá un hueco.')}
   if(keys.has('jump')&&onGround){velocity.y=8.1;onGround=false;keys.delete('jump')}
   if(!onGround){velocity.y-=19*dt;player.position.y+=velocity.y*dt;if(player.position.y<=0){player.position.y=0;velocity.y=0;onGround=true}}
   if(moving){walkTime+=dt*10;legL.rotation.x=Math.sin(walkTime)*.55;legR.rotation.x=-Math.sin(walkTime)*.55;armL.rotation.x=-Math.sin(walkTime)*.42;armR.rotation.x=Math.sin(walkTime)*.42;player.rotation.y=Math.atan2(dx,-dz)||0;if(nowTime()-lastMoveAt>.25){lastMoveAt=nowTime();moveCounter++;if(moveCounter%4===0)setMoves(moveCounter)}}
   else{legL.rotation.x=THREE.MathUtils.damp(legL.rotation.x,0,8,dt);legR.rotation.x=THREE.MathUtils.damp(legR.rotation.x,0,8,dt);armL.rotation.x=THREE.MathUtils.damp(armL.rotation.x,0,8,dt);armR.rotation.x=THREE.MathUtils.damp(armR.rotation.x,0,8,dt)}
   spinner.rotation.y+=dt*1.45;
   for(const m of movers){const x=m.baseX+Math.sin(nowTime()/1000*m.speed+m.phase)*m.range;m.mesh.position.x=x;m.blocker.x=x;}
   if(onGround&&bounceZones.some(b=>Math.abs(player.position.x-b.x)<.85&&Math.abs(player.position.z-b.z)<.85)){velocity.y=11.8;onGround=false;setHelp('¡IMPULSO! Usá el rebote para pasar el siguiente obstáculo.');}
   const desired=new THREE.Vector3(player.position.x*.48,player.position.y+5.7,player.position.z+9.2);camera.position.lerp(desired,1-Math.exp(-4*dt));camera.lookAt(player.position.x,player.position.y+1,player.position.z-2.5);
   if(!won&&player.position.z<-23){won=true;setHelp('¡META ALCANZADA! Tocá reiniciar para volver a correr.')}
   renderer.render(scene,camera);
  };
  const nowTime=()=>performance.now();
  animate();
  return()=>{alive=false;cancelAnimationFrame(frame);ro.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);renderer.dispose();scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const m=obj.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}});if(renderer.domElement.parentElement===host)host.removeChild(renderer.domElement);};
 },[]);
 const hold=(dir:Direction,on:boolean)=>{if(!gameRef.current)return;const canvas=mountRef.current;if(!canvas)return;const ev=new KeyboardEvent(on?'keydown':'keyup',{key:dir==='forward'?'ArrowUp':dir==='back'?'ArrowDown':dir==='left'?'ArrowLeft':dir==='right'?'ArrowRight':' '});window.dispatchEvent(ev)};
 return <div className="world3d-shell"><div className="world3d-top"><span><i/> NEON NEBULA · CIRCUITO 3D</span><button onClick={()=>{gameRef.current?.reset();setMoves(0)}} aria-label="Reiniciar circuito"><RotateCcw size={14}/></button></div><div className="world3d-view" ref={mountRef}><div className="world3d-crosshair">+</div><div className="world3d-hint"><b>OBJETIVO</b><span>{help}</span></div><div className="world3d-controls"><div className="world3d-pad"><button onPointerDown={()=>hold('forward',true)} onPointerUp={()=>hold('forward',false)} onPointerLeave={()=>hold('forward',false)} aria-label="Adelante"><ArrowUp/></button><div><button onPointerDown={()=>hold('left',true)} onPointerUp={()=>hold('left',false)} onPointerLeave={()=>hold('left',false)} aria-label="Izquierda"><ArrowLeft/></button><button onPointerDown={()=>hold('back',true)} onPointerUp={()=>hold('back',false)} onPointerLeave={()=>hold('back',false)} aria-label="Atrás"><ArrowDown/></button><button onPointerDown={()=>hold('right',true)} onPointerUp={()=>hold('right',false)} onPointerLeave={()=>hold('right',false)} aria-label="Derecha"><ArrowRight/></button></div></div><button className="world3d-jump" onPointerDown={()=>hold('jump',true)} onPointerUp={()=>hold('jump',false)} onPointerLeave={()=>hold('jump',false)}>SALTAR</button></div><div className="world3d-footer"><span>WASD / FLECHAS · ESPACIO PARA SALTAR</span><span>PASOS {moves}</span></div></div></div>;
}
