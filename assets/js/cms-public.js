import { DEFAULT_CONTENT } from './cms-defaults.js';
import { readContent } from './cms-client.js';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
function apply(data) {
  const c = {...DEFAULT_CONTENT, ...data, images:{...DEFAULT_CONTENT.images,...(data.images||{})}};
  document.title = `${c.businessName} · Fisioterapia en Logroño`;
  $$('.brand__name').forEach(el => { el.textContent = c.businessName.replace(/^Centro de Fisioterapia /, '') || c.businessName; });
  $$('footer p').filter(el => el.textContent.includes('Centro de Fisioterapia San Juan')).forEach(el => el.textContent = `© ${new Date().getFullYear()} ${c.businessName}`);
  const phoneText = c.phone || DEFAULT_CONTENT.phone;
  $$('a[href^="tel:"]').forEach(a => { a.href=`tel:${c.phoneLink || phoneText.replace(/\D/g,'')}`; const span=a.querySelector('.btn__label,span'); if(span) span.textContent=phoneText; else { [...a.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).forEach(n=>n.textContent=phoneText); } });
  $$('.nav__phone span,.contact__phone,.location__note .link,.footer .link').forEach(el => { if(el.closest('a[href^="tel:"]')) el.textContent=phoneText; });
  $$('.addr').forEach(a => { const sr=a.querySelector('.sr-only'); a.textContent=c.address; if(sr) a.append(sr); const dest=encodeURIComponent(c.address); a.href=`https://www.google.com/maps/dir/?api=1&destination=${dest}`; });
  const map=$('[data-map] iframe'); if(map){map.title=`Mapa: ${c.businessName}, ${c.address}`;map.dataset.src=`https://www.google.com/maps?q=${encodeURIComponent(c.address)}&z=16&output=embed`;if(map.src)map.src=map.dataset.src;}
  const structured=$('script[type="application/ld+json"]'); if(structured){try{const json=JSON.parse(structured.textContent);json.name=c.businessName;json.telephone=`+${(c.phoneLink||phoneText.replace(/\D/g,'')).replace(/^\+/, '')}`;json.address.streetAddress=c.address;json.address.postalCode='';json.address.addressLocality='';json.address.addressRegion='';structured.textContent=JSON.stringify(json);}catch{}}
  const lead=$('.hero__lead'); if(lead) lead.textContent=c.description;
  const metaDescription=$('meta[name="description"]'); if(metaDescription) metaDescription.content=c.description;
  const h=$$('.hours dd'); if(h[0]) h[0].textContent=c.hoursWeek; if(h[1]) h[1].textContent=c.hoursWeekend;
  const fh=$('.footer__hours'); if(fh) fh.innerHTML=`Lunes a viernes, ${escapeHtml(c.hoursWeek)}<br>Fines de semana ${escapeHtml(c.hoursWeekend.toLowerCase())}`;
  const services=$$('.index__item');
  c.services.forEach((s,i)=>{let li=services[i]; if(!li){li=document.createElement('li');li.className='index__item';li.innerHTML='<details><summary><span class="index__name"></span><svg class="ico index__plus" aria-hidden="true"><use href="#i-plus"/></svg></summary><div class="index__body"><p></p><span class="cms-price"></span></div></details>';if(matchMedia('(min-width: 900px)').matches)li.querySelector('details').open=true;$('.index')?.append(li);} const name=$('.index__name',li), desc=$('.index__body p',li); if(name)name.textContent=s[0];if(desc)desc.textContent=s[1];let price=$('.cms-price',li);if(!price){price=document.createElement('span');price.className='cms-price';$('.index__body',li)?.append(price);}price.textContent=s[2] ? `Precio: ${s[2]}` : '';li.hidden=false;});
  services.slice(c.services.length).forEach(li=>li.hidden=true);
  Object.entries(c.images).forEach(([key,url])=>{const selectors={hero:'.hero__media img',consultation:'.intro__media img',pelvic:'.feature--a img',sports:'.feature--b img',pediatric:'.feature--c img'};const img=$(selectors[key]);if(img&&url){img.src=url;if(key==='hero')img.srcset='';}});
  let offer=$('#cms-offer'); if(c.offerActive&&c.offerTitle){if(!offer){offer=document.createElement('section');offer.id='cms-offer';offer.className='cms-offer';$('.featured')?.after(offer);}offer.innerHTML=`<div class="wrap"><p class="eyebrow">Oferta</p><h2>${escapeHtml(c.offerTitle)}</h2><p>${escapeHtml(c.offerText)}</p></div>`;}else offer?.remove();
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
apply(DEFAULT_CONTENT);
readContent().then(data=>{if(data)apply(data);}).catch(()=>{});
