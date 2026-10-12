const http = require('node:http');
let mode = 'normal';
let messages = [];
const reset = (count = 120) => { messages = Array.from({length:count}, (_,i) => ({id:`message-${120-i}`,textoOriginal:`Mensaje ${120-i}: preparar el parcial de Sistemas`,procesado:true,fechaRecibido:new Date(2026,9,9,10,0,-i).toISOString(),resultadoIA:{aclaracion:null},tareaGenerada:{id:`task-${120-i}`,titulo: i===0 ? 'Preparar el trabajo práctico de Arquitectura y organización de computadoras con documentación complementaria' : `Preparar parcial ${120-i}`,tipo:'examen',fechaLimite:'2026-10-10T02:59:59.999Z',materia:{nombre:'Sistemas de información'}}})); };
reset();
http.createServer(async (req,res) => {
 const url = new URL(req.url,'http://127.0.0.1');
 let raw='';for await (const chunk of req) raw+=chunk;
 const body=raw?JSON.parse(raw):{};
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const reply=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(url.pathname==='/__qa/reset'){mode=body.mode||'normal';reset(body.count??120);return reply({ok:true});}
 if(url.pathname==='/auth/session')return reply({usuario:{id:'qa-user',nombre:'Estudiante QA'},csrfToken:'fixture'});
 if(url.pathname==='/auth/login')return body.password==='incorrecta'?reply({message:'Credenciales inválidas'},401):reply({access_token:'qa-chat-token'});
 if(url.pathname==='/auth/logout')return mode==='logout-error'?reply({message:'No se pudo cerrar la sesión. Intentá de nuevo.'},503):reply({mensaje:'Sesión cerrada'});
 if(url.pathname==='/mensajes'&&req.method==='GET'){
   if(mode==='history-error')return reply({message:'No se pudo cargar el historial de prueba.'},503);
   if(mode==='slow-history')await new Promise(resolve=>setTimeout(resolve,1500));
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||100);
   return reply(messages.slice(offset,offset+limit));
 }
 if(url.pathname==='/mensajes'&&req.method==='POST'){
   await new Promise(resolve=>setTimeout(resolve,700));
   if(mode==='send-error')return reply({message:'No se pudo procesar. Intentá de nuevo.'},503);
   if(mode==='expired')return reply({message:'Sesión vencida'},401);
   const item={id:`sent-${Date.now()}`,textoOriginal:body.texto,procesado:true,resultadoIA:{aclaracion:null},tareaGenerada:{id:'task-new',titulo:body.texto,tipo:'tarea',fechaLimite:'2026-10-10T02:59:59.999Z',materia:{nombre:'Sistemas'}}};messages.unshift(item);return reply(item,201);
 }
 reply({message:'Endpoint de prueba desconocido'},404);
}).listen(4301,'127.0.0.1',()=>console.log('Fixture chat aislada en 4301'));
