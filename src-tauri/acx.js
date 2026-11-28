(function(){try{
if(window.top!==window)return;
var DL=false,MS=false,n=0,iv=0;
function docs(){var out=[document];function walk(d){var fr=d.querySelectorAll('iframe,frame');for(var i=0;i<fr.length;i++){try{var cd=fr[i].contentDocument;if(cd&&cd.body){out.push(cd);walk(cd)}}catch(e){}}}try{walk(document)}catch(e){}return out}
function txt(el){return (el.innerText||el.textContent||el.value||'').replace(/\s+/g,' ').trim()}
function tryDl(D){if(DL)return;for(var k=0;k<D.length;k++){var L=D[k].querySelectorAll('button,a,[role=button],[role=menuitem],input[type=button]');for(var i=0;i<L.length;i++){var t=txt(L[i]);if(/^download all( files| attachments)?$/i.test(t)&&L[i].offsetParent!==null){DL=true;try{L[i].click()}catch(e){}return}}}}
function toData(u){return fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.blob():null}).then(function(b){if(!b)return '';return new Promise(function(ok){var f=new FileReader();f.onload=function(){ok(String(f.result||''))};f.onerror=function(){ok('')};f.readAsDataURL(b)})}).catch(function(){return ''})}
function save(name,obj){var b=new Blob([JSON.stringify(obj)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;(document.body||document.documentElement).appendChild(a);a.click();setTimeout(function(){try{a.remove()}catch(e){}},3000)}
function grab(d){var c=d.documentElement.cloneNode(true),P=[];
 [].forEach.call(c.querySelectorAll('script,noscript,iframe,frame,object,embed'),function(x){x.remove()});
 [].forEach.call(c.querySelectorAll('img'),function(im){var s=im.getAttribute('src');if(!s||/^data:/i.test(s))return;var u;try{u=new URL(s,d.baseURI).href}catch(e){im.remove();return}P.push(toData(u).then(function(v){if(v)im.setAttribute('src',v);else im.remove()}))});
 [].forEach.call(c.querySelectorAll('link[rel~=stylesheet]'),function(l){var u;try{u=new URL(l.getAttribute('href'),d.baseURI).href}catch(e){l.remove();return}P.push(fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.text():''}).then(function(css){var st=d.createElement('style');st.textContent=css;l.parentNode&&l.parentNode.replaceChild(st,l)}).catch(function(){l.remove()}))});
 var hd=c.querySelector('head');if(hd){var bs=d.createElement('base');bs.setAttribute('href',d.baseURI);hd.insertBefore(bs,hd.firstChild)}
 Promise.all(P).then(function(){save('evmail.json',{ev:'aconex-mail',url:String(d.location&&d.location.href||''),title:d.title||'',text:String((d.body&&d.body.innerText)||'').slice(0,200000),html:'<!doctype html>'+c.outerHTML})})}
function tick(){n++;var D=docs();if(!MS){for(var k=0;k<D.length;k++){var b=D[k].body,t=b?(b.innerText||''):'';if(/mail\s*number/i.test(t)&&/mail\s*type/i.test(t)){MS=true;(function(dd){setTimeout(function(){try{grab(dd)}catch(e){}},1500)})(D[k]);break}}}tryDl(D);if(n>90||(MS&&DL))clearInterval(iv)}
iv=setInterval(tick,1000)}catch(e){}})();
