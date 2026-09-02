export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (url.pathname === '/api/ai') return handleAI(request, env);
    return new Response(renderPage(url.pathname), { headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
  }
};

async function handleAI(request, env) {
  if (request.method !== 'POST') return cors(json({ error: 'Method not allowed' }, 405));
  let body;
  try { body = await request.json(); } catch { return cors(json({ error: 'JSON invàlid.' }, 400)); }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) return cors(json({ error: 'Escriu una pregunta.' }, 400));
  if (question.length > 4000) return cors(json({ error: 'La pregunta és massa llarga.' }, 413));
  if (!env.AI) return cors(json({ error: 'La IA encara no està connectada al servei d’IA de Cloudflare.' }, 503));

  try {
    const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: 'Ets OPVILO IA. Respon de manera clara, útil i pràctica. Detecta automàticament la llengua de l’usuari i respon en la mateixa llengua. No inventis dades. Si no tens prou informació, digues-ho i indica què cal comprovar.' },
        { role: 'user', content: question }
      ],
      max_tokens: 700
    });
    const answer = result?.response || result?.result?.response || result?.output_text;
    if (!answer) throw new Error('Resposta IA buida');
    return cors(json({ answer }));
  } catch (error) {
    return cors(json({ error: 'No s’ha pogut completar la consulta. Torna-ho a provar.' }, 502));
  }
}

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=UTF-8' } }); }
function cors(response) { response.headers.set('access-control-allow-origin', '*'); response.headers.set('access-control-allow-methods', 'POST, OPTIONS'); response.headers.set('access-control-allow-headers', 'content-type'); return response; }

function renderPage(path) {
  const active = path === '/ia' ? 'IA' : path === '/oportunitats' ? 'Oportunitats' : path === '/ofertes' ? 'Ofertes' : path === '/transport' ? 'Transport' : 'Inici';
  const content = path === '/ia' ? aiPage() : sectionPage(active);
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0f172a"><title>OPVILO · ${active}</title><style>${css()}</style></head><body><header><a class="brand" href="/">OPVILO</a><nav>${nav('/', 'Inici', active)}${nav('/oportunitats','Oportunitats',active)}${nav('/ia','IA',active)}${nav('/ofertes','Ofertes',active)}${nav('/transport','Transport',active)}</nav><div class="langs"><button data-lang="ca" class="lang active">CAT</button><button data-lang="es" class="lang">ES</button><button data-lang="en" class="lang">EN</button></div></header><main>${content}</main><footer>OPVILO · selecció útil <span>Sense banderes · navegació clara</span></footer><script>${script()}</script></body></html>`;
}
function nav(h, label, active) { return `<a href="${h}" class="${label === active ? 'selected' : ''}">${label}</a>`; }
function sectionPage(title) { const data = { Inici:['Descobreix coses que valen la pena.','Oportunitats, intel·ligència artificial, ofertes i recursos professionals reunits en un espai clar i fàcil d’explorar.'], Oportunitats:['Oportunitats seleccionades.','Idees i oportunitats presentades de forma clara per facilitar la descoberta i la comparació.'], Ofertes:['Ofertes que val la pena mirar.','Una selecció enfocada a utilitat, valor i interès real.'], Transport:['Transport més fàcil.','Recursos, eines i informació útil per a professionals i usuaris del transport.'] }[title] || []; return `<section class="hero"><p class="eyebrow">OPVILO · SELECCIÓ ÚTIL</p><h1>${data[0]}</h1><p class="lead">${data[1]}</p><div class="actions"><a class="primary" href="/oportunitats">Veure oportunitats</a><a class="secondary" href="/ia">Explorar IA</a></div></section><section class="cards"><article><b>Útil</b><span>selecció pensada per a persones reals</span></article><article><b>Clar</b><span>informació sense soroll innecessari</span></article><article><b>OPVILO</b><span>una plataforma preparada per créixer</span></article></section>`; }
function aiPage() { return `<section class="intro"><p class="eyebrow">OPVILO IA</p><h1>IA que serveix.</h1><p class="lead">Un assistent integrat a OPVILO per ajudar-te a entendre, redactar, comparar i convertir idees en accions.</p></section><section class="ai-box"><label for="q">Què vols preguntar?</label><textarea id="q" maxlength="4000" placeholder="Exemple: Explica’m de manera senzilla què és la intel·ligència artificial."></textarea><button id="ask" class="primary">Preguntar a OPVILO IA →</button><div id="status" class="status" hidden></div></section><section class="cards small"><article><b>Resposta útil</b><span>Directa i comprensible.</span></article><article><b>Multilingüe</b><span>Respon en la llengua de la pregunta.</span></article><article><b>24/7</b><span>Disponible quan la necessites.</span></article></section>`; }
function css() { return `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f8fafc}header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;padding:18px 28px;gap:28px}.brand{font-size:28px;font-weight:850;color:#0f172a;text-decoration:none}nav{display:flex;gap:8px;overflow:auto;flex:1}nav a{padding:12px 15px;border-radius:14px;color:#111827;text-decoration:none;white-space:nowrap}nav a.selected{background:#f1f5f9;font-weight:700}.langs{display:flex;gap:4px}.lang{border:0;background:transparent;padding:8px;font-weight:700;color:#64748b}.lang.active{color:#111827}.hero{background:#0f172a;color:#fff;padding:92px max(28px,calc((100% - 1100px)/2)) 100px}.eyebrow{letter-spacing:.18em;font-size:14px;font-weight:800;color:#94a3b8;margin:0 0 26px}.hero h1,.intro h1{font-size:clamp(48px,8vw,82px);line-height:.98;letter-spacing:-.055em;max-width:850px;margin:0 0 30px}.lead{font-size:clamp(20px,3vw,28px);line-height:1.55;color:#cbd5e1;max-width:850px}.actions{display:flex;gap:16px;margin-top:42px;flex-wrap:wrap}.primary,.secondary{border:0;border-radius:16px;padding:17px 24px;font-size:17px;font-weight:800;text-decoration:none;cursor:pointer;display:inline-block}.primary{background:#2563eb;color:#fff}.secondary{background:#fff;color:#111827}.intro,.ai-box,.cards{max-width:1100px;margin:auto}.intro{padding:78px 28px 30px}.intro .lead{color:#64748b}.ai-box{margin:35px auto 55px;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:34px;box-shadow:0 10px 35px #0f172a0b}.ai-box label{display:block;font-size:22px;font-weight:800;margin-bottom:18px}.ai-box textarea{width:100%;min-height:190px;border:1px solid #dbe2ea;border-radius:18px;padding:18px;font:inherit;font-size:18px;resize:vertical;outline:none}.ai-box textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}.ai-box .primary{margin-top:18px}.status{margin-top:22px;padding:18px;border-radius:16px;white-space:pre-wrap;line-height:1.55}.status.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}.status.answer{background:#f8fafc;color:#111827;border:1px solid #e2e8f0}.cards{padding:0 28px 90px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.cards article{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:30px;min-height:150px}.cards b{display:block;font-size:28px;margin-bottom:12px}.cards span{color:#64748b;font-size:17px;line-height:1.5}.small{padding-top:10px}footer{padding:28px;text-align:center;color:#64748b;border-top:1px solid #e2e8f0}footer span{display:block;font-size:13px;margin-top:8px}@media(max-width:760px){header{padding:14px 16px;gap:12px;flex-wrap:wrap}.brand{font-size:24px}nav{order:3;flex-basis:100%;width:100%}nav a{padding:10px 12px}.langs{margin-left:auto}.hero{padding:65px 24px 70px}.hero h1,.intro h1{font-size:52px}.cards{grid-template-columns:1fr;padding:0 24px 60px}.intro{padding:55px 24px 20px}.ai-box{margin:25px 18px 45px;padding:24px}}`; }
function script() { return `const q=document.querySelector('#q'),ask=document.querySelector('#ask'),status=document.querySelector('#status');if(ask){ask.addEventListener('click',async()=>{const question=q.value.trim();if(!question){show('Escriu una pregunta abans de continuar.','error');return}ask.disabled=true;ask.textContent='Consultant…';status.hidden=false;status.className='status';status.textContent='OPVILO IA està preparant la resposta…';try{const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Error inesperat');show(d.answer,'answer')}catch(e){show(e.message,'error')}finally{ask.disabled=false;ask.textContent='Preguntar a OPVILO IA →'}})}function show(t,c){status.hidden=false;status.className='status '+c;status.textContent=t}`; }
