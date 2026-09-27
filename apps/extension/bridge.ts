if(location.origin==='http://127.0.0.1:4317'){
 const reply=(type:string,payload?:unknown)=>window.postMessage({channel:'smart-umn-extension',type,payload},location.origin);
 const getState=()=>chrome.runtime.sendMessage({type:'GET_STATE'}).then(s=>reply('STATE',s));
 window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin||event.data?.channel!=='smart-umn-web')return;const{type,payload}=event.data;if(type==='HELLO'){reply('READY');return;}if(!['GET_STATE','CONNECT','SAVE_PLANS','FORGET'].includes(type))return;chrome.runtime.sendMessage({type,payload}).then(data=>{if(data?.error)reply('ERROR',data.error);else if(type==='GET_STATE')reply('STATE',data);else void getState();}).catch(()=>reply('ERROR','Extension disconnected. Reload this page.'));});
 chrome.runtime.onMessage.addListener(m=>{if(m?.type==='STATE_CHANGED')void getState();});reply('READY');
}
