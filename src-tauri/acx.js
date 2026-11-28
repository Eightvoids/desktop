(function(){try{
if(window.top!==window)return;
var DL=false,MS=false,n=0,iv=0,st={sel:0,btn:0,dlg:0,icons:0};
function docs(){var out=[document];function walk(d){var fr=d.querySelectorAll('iframe,frame');for(var i=0;i<fr.length;i++){try{var cd=fr[i].contentDocument;if(cd&&cd.body){out.push(cd);walk(cd)}}catch(e){}}}try{walk(document)}catch(e){}return out}
function txt(el){return String(el.innerText||el.textContent||el.value||el.getAttribute('aria-label')||el.getAttribute('title')||'').replace(/\s+/g,' ').trim()}
function vis(el){try{var r=el.getBoundingClientRect();return r.width>0&&r.height>0}catch(e){return false}}
function clickables(d){return d.querySelectorAll('button,a,[role=button],[role=menuitem],input[type=button],input[type=submit]')}
function findBtn(D,re,scope){for(var k=0;k<D.length;k++){var L=clickables(D[k]);for(var i=0;i<L.length;i++){if(scope&&!scope(L[i]))continue;var t=txt(L[i]);if(t&&re.test(t)&&vis(L[i])&&!L[i].disabled)return L[i]}}return null}
function attTable(D){for(var k=0;k<D.length;k++){var T=D[k].querySelectorAll('table');for(var i=0;i<T.length;i++){var h=T[i].tHead?txt(T[i].tHead):txt(T[i].rows[0]||T[i]);if(/document\s*no/i.test(h)&&/(revision|title|status)/i.test(h))return T[i]}}return null}
function hdrIdx(t,re){var r=t.tHead?t.tHead.rows[0]:t.rows[0];if(!r)return -1;for(var i=0;i<r.cells.length;i++)if(re.test(txt(r.cells[i])))return i;return -1}
function bodyRows(t){var R=[];var B=t.tBodies.length?t.tBodies:[t];for(var b=0;b<B.length;b++)for(var i=0;i<B[b].rows.length;i++){var r=B[b].rows[i];if(r.parentNode&&r.parentNode.tagName==='THEAD')continue;if(r.querySelector('th')&&!r.querySelector('td'))continue;R.push(r)}return R}
function tryDl(D){if(DL)return;var all=findBtn(D,/^download all( files| attachments| documents)?$/i);if(all){DL=true;all.click();return}
 var t=attTable(D);if(!t)return;
 if(!st.sel){var cb=(t.tHead||t).querySelector('input[type=checkbox],[role=checkbox]');if(cb){var on=cb.checked||cb.getAttribute('aria-checked')==='true';if(!on)cb.click();st.sel=n;return}st.sel=n}
 if(n-st.sel<2)return;
 if(!st.btn){var b=findBtn(D,/^(download|download selected|download files|download documents)(\s*\(\d+\))?$/i);if(b){st.btn=n;b.click();return}
   if(n-st.sel<6)return;
   /* no Download button: click each file icon in the File column, one by one */
   var ci=hdrIdx(t,/^file$/i);var R=bodyRows(t);if(!R.length)return;DL=true;var q=[];R.forEach(function(r){var c=ci>=0?r.cells[ci]:null;var a=c?(c.querySelector('a[href],a,[role=link],img,svg')):null;if(!a){var l=r.querySelector('a[href*=ownload],a[href*=file],a[href*=File]');a=l}if(a)q.push(a)});
   q.forEach(function(a,i){setTimeout(function(){try{(a.closest&&a.closest('a')||a).click()}catch(e){}},i*1500)});return}
 if(!st.dlg&&n-st.btn>=1){var dg=findBtn(D,/^(download|ok|continue|start download|download now)$/i,function(el){return !!(el.closest&&el.closest('[role=dialog],.modal,.dialog,.ui-dialog,.popup,.overlay'))});if(dg){st.dlg=n;dg.click()}if(n-st.btn>6)DL=true}}
function toData(u){return fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.blob():null}).then(function(b){if(!b)return '';return new Promise(function(ok){var f=new FileReader();f.onload=function(){ok(String(f.result||''))};f.onerror=function(){ok('')};f.readAsDataURL(b)})}).catch(function(){return ''})}
function save(name,obj){var b=new Blob([JSON.stringify(obj)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;(document.body||document.documentElement).appendChild(a);a.click();setTimeout(function(){try{a.remove()}catch(e){}},3000)}
function grab(d){var c=d.documentElement.cloneNode(true),P=[];
 [].forEach.call(c.querySelectorAll('script,noscript,iframe,frame,object,embed'),function(x){x.remove()});
 [].forEach.call(c.querySelectorAll('img'),function(im){var s=im.getAttribute('src');if(!s||/^data:/i.test(s))return;var u;try{u=new URL(s,d.baseURI).href}catch(e){im.remove();return}P.push(toData(u).then(function(v){if(v)im.setAttribute('src',v);else im.remove()}))});
 [].forEach.call(c.querySelectorAll('link[rel~=stylesheet]'),function(l){var u;try{u=new URL(l.getAttribute('href'),d.baseURI).href}catch(e){l.remove();return}P.push(fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.text():''}).then(function(css){var s2=d.createElement('style');s2.textContent=css;l.parentNode&&l.parentNode.replaceChild(s2,l)}).catch(function(){l.remove()}))});
 var hd=c.querySelector('head');if(hd){var bs=d.createElement('base');bs.setAttribute('href',d.baseURI);hd.insertBefore(bs,hd.firstChild)}
 Promise.all(P).then(function(){save('evmail.json',{ev:'aconex-mail',url:String(d.location&&d.location.href||''),title:d.title||'',text:String((d.body&&d.body.innerText)||'').slice(0,200000),html:'<!doctype html>'+c.outerHTML})})}
function tick(){n++;var D=docs();if(!MS){for(var k=0;k<D.length;k++){var b=D[k].body,t=b?(b.innerText||''):'';if(/mail\s*number/i.test(t)&&/mail\s*type/i.test(t)){MS=true;(function(dd){setTimeout(function(){try{grab(dd)}catch(e){}},1500)})(D[k]);break}}}if(MS)tryDl(D);if(n>120||(MS&&DL&&n>20))clearInterval(iv)}
iv=setInterval(tick,1000)}catch(e){}})();
