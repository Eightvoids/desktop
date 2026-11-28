(function(){try{
if(window.top!==window)return;
var CFG=window.__EVACX||{mode:'dl'},PICK=CFG.pick&&CFG.pick.length?CFG.pick.map(function(x){return String(x).toUpperCase().replace(/\s+/g,'')}):null;var DL=CFG.mode==='scan',MS=false,LS=false,n=0,iv=0,st={sel:0,btn:0,dlg:0,icons:0};
function docs(){var out=[document];function walk(d){var fr=d.querySelectorAll('iframe,frame');for(var i=0;i<fr.length;i++){try{var cd=fr[i].contentDocument;if(cd&&cd.body){out.push(cd);walk(cd)}}catch(e){}}}try{walk(document)}catch(e){}return out}
function txt(el){return String(el.innerText||el.textContent||el.value||el.getAttribute('aria-label')||el.getAttribute('title')||'').replace(/\s+/g,' ').trim()}
function vis(el){try{var r=el.getBoundingClientRect();return r.width>0&&r.height>0}catch(e){return false}}
function clickables(d){return d.querySelectorAll('button,a,[role=button],[role=menuitem],input[type=button],input[type=submit]')}
function findBtn(D,re,scope){for(var k=0;k<D.length;k++){var L=clickables(D[k]);for(var i=0;i<L.length;i++){if(scope&&!scope(L[i]))continue;var t=txt(L[i]).replace(/[^A-Za-z0-9()\s&-]+/g,' ').replace(/\s+/g,' ').trim();if(t&&re.test(t)&&vis(L[i])&&!L[i].disabled)return L[i]}}return null}
function findText(D,re,not){for(var k=0;k<D.length;k++){var L=D[k].querySelectorAll('li,a,button,span,div,td,[role=menuitem],[role=option]');var best=null;for(var i=0;i<L.length;i++){var el=L[i];if(el===not)continue;var t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!re.test(t)||!vis(el))continue;var deeper=false;for(var j=0;j<el.children.length;j++){if(re.test(String(el.children[j].textContent||'').replace(/\s+/g,' ').trim())){deeper=true;break}}if(!deeper){best=el;break}}if(best)return best}return null}
function attTable(D){for(var k=0;k<D.length;k++){var T=D[k].querySelectorAll('table');for(var i=0;i<T.length;i++){var h=T[i].tHead?txt(T[i].tHead):txt(T[i].rows[0]||T[i]);if(/document\s*no/i.test(h)&&/(revision|title|status)/i.test(h))return T[i]}}return null}
function hdrIdx(t,re){var r=t.tHead?t.tHead.rows[0]:t.rows[0];if(!r)return -1;for(var i=0;i<r.cells.length;i++)if(re.test(txt(r.cells[i])))return i;return -1}
function bodyRows(t){var R=[];var B=t.tBodies.length?t.tBodies:[t];for(var b=0;b<B.length;b++)for(var i=0;i<B[b].rows.length;i++){var r=B[b].rows[i];if(r.parentNode&&r.parentNode.tagName==='THEAD')continue;if(r.querySelector('th')&&!r.querySelector('td'))continue;R.push(r)}return R}
function rowsOf(t){var H={},hr=t.tHead?t.tHead.rows[0]:t.rows[0];if(hr)for(var i=0;i<hr.cells.length;i++){var h=txt(hr.cells[i]).toLowerCase();if(/^file$/.test(h))H.file=i;else if(/document\s*no/.test(h))H.no=i;else if(/^revision$/.test(h)||/^rev$/.test(h))H.rev=i;else if(/revision\s*date|^date$/.test(h))H.date=i;else if(/^title$/.test(h))H.title=i;else if(/^status$/.test(h))H.st=i}
 return bodyRows(t).map(function(r){function c(k){return H[k]!=null&&r.cells[H[k]]?txt(r.cells[H[k]]):''}var no=c('no');var ty='';var fc=H.file!=null?r.cells[H.file]:null;if(fc){var im=fc.querySelector('img');ty=(im&&(im.getAttribute('alt')||im.getAttribute('title')||im.getAttribute('src')||''))||fc.className||''}var m=no.match(/_(PDF|DWG|DXF|XLSX?|DOCX?|ZIP|RVT|NWD|IFC|JPE?G|PNG)$/i);if(m)ty=m[1];else{var t2=String(ty).match(/(pdf|dwg|xls|doc|zip|rvt|jpg|png|excel|word|acrobat|autocad)/i);ty=t2?t2[1]:''}
   return {no:no,rev:c('rev'),date:c('date'),title:c('title'),status:c('st'),type:String(ty).toUpperCase()}}).filter(function(x){return x.no})}
function totalOf(D){for(var k=0;k<D.length;k++){var m=String((D[k].body&&D[k].body.innerText)||'').match(/document\s+attachments\s*\((\d+)\)/i);if(m)return +m[1]}return 0}
function scroller(el){var x=el;while(x&&x!==x.ownerDocument.body){try{var cs=x.ownerDocument.defaultView.getComputedStyle(x);if(/(auto|scroll)/.test(cs.overflowY)&&x.scrollHeight>x.clientHeight+4)return x}catch(e){}x=x.parentElement}return null}
var EXP={n:-1,same:0,done:false,clicks:0};
function expand(D,t){if(EXP.done)return true;var R=bodyRows(t).length,tot=totalOf(D);if(tot&&R>=tot){EXP.done=true;return true}
 var box=t.parentElement;for(var u=0;u<5&&box&&box.parentElement;u++)box=box.parentElement;
 var more=null;/* Aconex: "+190 more..." under the attachments list (ng-click="showAll()") */for(var q=0;q<D.length&&!more;q++){var sa=D[q].querySelector('.mailAttachedDocuments-showAll a,[ng-click="showAll()"],[ng-click*="showAll"],[ng-click*="showMore"],[ng-click*="loadMore"]');if(sa&&vis(sa))more=sa}
 if(!more&&box){var L=box.querySelectorAll('button,a,[role=button],span,div');for(var i=0;i<L.length;i++){var tx=txt(L[i]).replace(/[^A-Za-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();if(/^(show|load|view|see) (more|all)( documents| attachments| files| rows)?$|^more$|^show all \d+|^\d+ more$|^show \d+ more$/i.test(tx)&&vis(L[i])&&!L[i].children.length){more=L[i];break}}}
 if(more&&EXP.clicks<60){EXP.clicks++;try{more.click()}catch(e){}}
 var sc=scroller(t.tBodies[0]||t);if(sc)sc.scrollTop=sc.scrollHeight;try{t.rows[t.rows.length-1].scrollIntoView({block:'end'})}catch(e){}
 if(more)EXP.ct=Date.now();if(R===EXP.n){EXP.same++}else{EXP.same=0;EXP.n=R}
 if(EXP.same>=(EXP.ct?20:4)&&Date.now()-(EXP.ct||0)>3000){EXP.done=true;try{(t.tHead||t).scrollIntoView({block:'start'})}catch(e){}return true}return false}
function key(x){return String(x||'').toUpperCase().replace(/\s+/g,'')}
function tryList(D){if(LS)return;var t=attTable(D);if(!t){if(MS&&n>30){LS=true;save('evatt.json',{ev:'aconex-files',rows:[],total:totalOf(D)})}return}if(!expand(D,t))return;LS=true;save('evatt.json',{ev:'aconex-files',rows:rowsOf(t),total:totalOf(D)})}
function tryDl(D){if(DL)return;if(!PICK){var all=findBtn(D,/^download all( files| attachments| documents)?$/i);if(all){DL=true;all.click();return}}
 var t=attTable(D);if(!t)return;if(!expand(D,t))return;if(!st.sent){st.sent=1;save('evatt.json',{ev:'aconex-files',rows:rowsOf(t),total:totalOf(D),mode:'dl'})}
 if(st.sel&&!st.all2&&!PICK){var sa=findText(D,/^select all \d+( documents| items| files| attachments)?$/i);if(sa){st.all2=1;try{sa.click()}catch(e){}return}}
 if(!st.sel){if(PICK){var R0=bodyRows(t),ni=hdrIdx(t,/document\s*no/i);R0.forEach(function(r){var no=ni>=0&&r.cells[ni]?key(txt(r.cells[ni])):'';if(PICK.indexOf(no)<0)return;var cb=r.querySelector('input[type=checkbox],[role=checkbox]');if(cb&&!(cb.checked||cb.getAttribute('aria-checked')==='true'))cb.click()});st.sel=n;return}var cb=(t.tHead||t).querySelector('input[type=checkbox],[role=checkbox]');if(cb){var on=cb.checked||cb.getAttribute('aria-checked')==='true';if(!on)cb.click();st.sel=n;return}st.sel=n}
 if(n-st.sel<2)return;
 if(!st.btn){var b=findBtn(D,/^(download|download selected|download files|download documents)(\s*\(\d+\))?$/i);if(b){st.btn=n;st.bEl=b;b.click();return}
   if(n-st.sel<15)return;
   /* no Download button: click each file icon in the File column, one by one */
   var ci=hdrIdx(t,/^file$/i),ni2=hdrIdx(t,/document\s*no/i);var R=bodyRows(t);if(!R.length)return;DL=true;var q=[];R.forEach(function(r){if(PICK){var no2=ni2>=0&&r.cells[ni2]?key(txt(r.cells[ni2])):'';if(PICK.indexOf(no2)<0)return}var c=ci>=0?r.cells[ci]:null;var a=c?(c.querySelector('a[href],a,[role=link],img,svg')):null;if(!a){var l=r.querySelector('a[href*=ownload],a[href*=file],a[href*=File]');a=l}if(a)q.push(a)});
   q.forEach(function(a,i){setTimeout(function(){try{(a.closest&&a.closest('a')||a).click()}catch(e){}},i*700)});return}
 /* Aconex: Download ▾ opens a menu – "Zip Download" (not "with Markups") */
 if(!st.zip){var z=findText(D,/^zip download$/i,st.bEl);if(z){st.zip=n;try{(z.closest&&z.closest('a,button,li,[role=menuitem]')||z).click()}catch(e){}return}if(n-st.btn>=8){st.zip=n}return}
 /* a dialog that follows (e.g. "Download" / "OK" once the zip is ready) */
 if(!st.dlg){var dg=findBtn(D,/^(download|ok|continue|start download|download now|download zip|download file)$/i,function(el){return el!==st.bEl&&!!(el.closest&&el.closest('[role=dialog],.modal,.dialog,.ui-dialog,.popup,.overlay,.notification,.toast,[class*=modal],[class*=dialog]'))});if(dg){st.dlg=n;dg.click()}}
 if(n-st.zip>225)DL=true}
function toData(u){return fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.blob():null}).then(function(b){if(!b)return '';return new Promise(function(ok){var f=new FileReader();f.onload=function(){ok(String(f.result||''))};f.onerror=function(){ok('')};f.readAsDataURL(b)})}).catch(function(){return ''})}
function save(name,obj){var b=new Blob([JSON.stringify(obj)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;(document.body||document.documentElement).appendChild(a);a.click();setTimeout(function(){try{a.remove()}catch(e){}},3000)}
function grab(d){var c=d.documentElement.cloneNode(true),P=[];
 [].forEach.call(c.querySelectorAll('script,noscript,iframe,frame,object,embed'),function(x){x.remove()});
 [].forEach.call(c.querySelectorAll('img'),function(im){var s=im.getAttribute('src');if(!s||/^data:/i.test(s))return;var u;try{u=new URL(s,d.baseURI).href}catch(e){im.remove();return}P.push(toData(u).then(function(v){if(v)im.setAttribute('src',v);else im.remove()}))});
 [].forEach.call(c.querySelectorAll('link[rel~=stylesheet]'),function(l){var u;try{u=new URL(l.getAttribute('href'),d.baseURI).href}catch(e){l.remove();return}P.push(fetch(u,{credentials:'include'}).then(function(r){return r.ok?r.text():''}).then(function(css){var s2=d.createElement('style');s2.textContent=css;l.parentNode&&l.parentNode.replaceChild(s2,l)}).catch(function(){l.remove()}))});
 var hd=c.querySelector('head');if(hd){var bs=d.createElement('base');bs.setAttribute('href',d.baseURI);hd.insertBefore(bs,hd.firstChild)}
 Promise.all(P).then(function(){save('evmail.json',{ev:'aconex-mail',url:String(d.location&&d.location.href||''),title:d.title||'',text:String((d.body&&d.body.innerText)||'').slice(0,200000),html:'<!doctype html>'+c.outerHTML})})}
function tick(){n++;var D=docs();if(!MS&&!CFG.noMail){for(var k=0;k<D.length;k++){var b=D[k].body,t=b?(b.innerText||''):'';if(/mail\s*number/i.test(t)&&/mail\s*type/i.test(t)){MS=true;(function(dd){setTimeout(function(){try{grab(dd)}catch(e){}},600)})(D[k]);break}}}var ready=MS||(CFG.noMail&&n>5);if(ready){if(CFG.mode==='scan')tryList(D);else tryDl(D)}if(n>750||(CFG.mode==='scan'&&LS&&MS)||(CFG.mode!=='scan'&&DL&&n>50))clearInterval(iv)}
iv=setInterval(tick,400)}catch(e){}})();
