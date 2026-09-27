import{installEnhancements}from'./schedule-dom.ts';

const app=installEnhancements(document,{
 batch:(codes,term,campus)=>chrome.runtime.sendMessage({type:'CONTEXT_BATCH',codes,term,campus}),
 fit:courses=>chrome.runtime.sendMessage({type:'GET_FIT',courses}),
 connect:()=>chrome.runtime.sendMessage({type:'CONNECT'})
});

chrome.runtime.onMessage.addListener(message=>{
 if(message?.type==='PERSONALIZATION_CHANGED')app.refreshPersonalization();
});
