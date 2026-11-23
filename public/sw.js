self.addEventListener('push',event=>{
  let data={title:'Meu Financeiro',body:'Você tem uma nova notificação.',url:'/'};
  try{if(event.data)data={...data,...event.data.json()};}
  catch{if(event.data)data.body=event.data.text();}
  event.waitUntil(self.registration.showNotification(data.title||'Meu Financeiro',{
    body:data.body||'Você recebeu uma atualização.',
    tag:data.tag||'meu-financeiro',
    data:{url:data.url||'/'},
    icon:'/apple-touch-icon.png',
    badge:'/apple-touch-icon.png',
    renotify:true
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus'in client){client.navigate(target);return client.focus();}}
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
