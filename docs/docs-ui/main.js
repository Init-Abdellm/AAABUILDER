(function(){const cEl=document.getElementById('content'),docLinks=[...document.querySelectorAll('[data-doc]')],homeLink=document.querySelector('[data-page="home"]'),searchInput=document.getElementById('search-input'),searchResults=document.getElementById('search-results');function docsBase(){try{return window.location.pathname.includes('/docs/docs-ui/')?'..':'./docs'}catch(_){return'./docs'}}function assetBase(){try{return window.location.pathname.includes('/docs/docs-ui/')?'../':'docs/'}catch(_){return'docs/'}}function setActive(el){document.querySelectorAll('[data-doc].active,[data-page].active').forEach(n=>n.classList.remove('active'));el&&el.classList.add('active')}function setLogos(){document.querySelectorAll('img[data-logo]').forEach(img=>{img.src=`${assetBase()}docs-assets/aaab.png`;img.alt='AAABuilder logo'})}async function loadDoc(file){try{cEl.innerHTML='<div style="color:#7a8594">Loading…</div>';let res=await fetch(`${docsBase()}/${file}`);if(!res.ok&&docsBase()==='./docs'){res=await fetch(`../docs/${file}`)}const txt=await res.text();cEl.innerHTML=marked.parse(txt);highlight();window.scrollTo(0,0)}catch(_){cEl.innerHTML='<div style="color:#f88">Failed to load document.</div>'}}function highlight(){try{document.querySelectorAll('pre code').forEach(b=>{window.hljs&&window.hljs.highlightElement(b)})}catch(_){}}function renderHome(){setActive(homeLink);const hero=`<section class="hero"><img class="logo" data-logo="aaab" alt=""/><span class="pill">Agent as a Backend</span><h1 class="title">Build AI/ML agents as production-ready APIs</h1><p class="subtitle">AAABuilder is a TypeScript-first framework that turns <code>.agent</code> workflows into scalable services. Unified providers for LLMs, Computer Vision, Audio, and Traditional ML. Includes debugger, testing, scaffolding, and auto-docs.</p><div class="cta"><a class="btn primary" data-doc="quickstart.md">Get Started</a><a class="btn" data-doc="architecture.md">How it Works</a></div></section>`;const features=`<section class="features"><div class="card"><h3>Unified Providers</h3><p>One interface across OpenAI, Gemini, Hugging Face, Ollama, YOLO, Whisper, scikit-learn, XGBoost, TF, and more.</p></div><div class="card"><h3>Operational Rigor</h3><p>Validation, linting, auto-correction, model optimization, caching, and observability built-in.</p></div><div class="card"><h3>Dev Experience</h3><p>Step debugger, test harness, interactive playground, scaffolding, and docs generator.</p></div></section>`;const code=`<section class="code-sample"><pre><code class="language-typescript">import { createProviderRouter } from "./src/providers";

const router = await createProviderRouter({
  whisper: { enabled: true, priority: 25 },
  yolo: { enabled: true, priority: 20 },
  scikitLearn: { enabled: true, priority: 5 }
});

const res = await router.executeRequest({
  model: "yolo-v8-detection",
  input: imageBuffer,
  parameters: { confidence: 0.5 }
});</code></pre></section>`;const getStarted=`<section class="features"><div class="card"><h3>Quick Start</h3><pre><code class="language-bash"># Install globally
npm install -g aaab

aaab --version

aaab create my-ai-project
cd my-ai-project

export OPENAI_API_KEY="..."

npm run dev</code></pre></div><div class="card"><h3>Your First Agent</h3><pre><code class="language-yaml">@agent hello-world v1
description: "Simple greeting agent"

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

variables:
  name:
    type: input
    path: name
    required: true

steps:
  - id: greet
    type: llm
    provider: openai
    model: gpt-4o
    prompt: "Greet {name} warmly"
    save: greeting

outputs:
  message: "{greeting}"
@end</code></pre></div><div class="card"><h3>Explore the Idea</h3><p>Read about the UNIFIED Idea and how it streamlines backend automation using <code>.agent</code> files.</p><p><a class="btn" data-doc="Idea.md">Learn more</a></p></div></section>`;cEl.innerHTML=hero+features+code+getStarted;setLogos();attachCtas();highlight()}function attachCtas(){[...cEl.querySelectorAll('[data-doc]')].forEach(a=>{a.addEventListener('click',ev=>{ev.preventDefault();const doc=a.getAttribute('data-doc'),link=[...document.querySelectorAll('[data-doc]')].find(l=>l.getAttribute('data-doc')===doc);setActive(link);history.pushState({doc},'',`#${doc}`);loadDoc(doc)})})}function wireNav(){docLinks.forEach(link=>{link.addEventListener('click',ev=>{ev.preventDefault();const doc=link.getAttribute('data-doc');setActive(link);history.pushState({doc},'',`#${doc}`);loadDoc(doc)})});homeLink&&homeLink.addEventListener('click',ev=>{ev.preventDefault();history.pushState({page:'home'},'',`#home`);renderHome()})}async function buildIndex(){try{const files=['Idea.md','index.md','quickstart.md','architecture.md','cli.md','providers.md','parser.md','server.md','examples.md','templates.md'];const results=await Promise.all(files.map(async f=>{try{let res=await fetch(`${docsBase()}/${f}`);if(!res.ok&&docsBase()==='./docs'){res=await fetch(`../docs/${f}`)}const text=await res.text();return{file:f,text:text.toLowerCase(),title:f.replace('.md','')}}catch(_){return{file:f,text:'',title:f.replace('.md','')}}}));return results}catch(_){return[]}}function onSearch(index){const q=(searchInput&&searchInput.value||'').trim().toLowerCase();if(!q){searchResults&&(searchResults.innerHTML='');return}const hits=[];index.forEach(({file,text,title})=>{const inTitle=title.toLowerCase().includes(q);const i=text.indexOf(q);if(inTitle||i>=0){const excerpt=i>=0?text.substring(Math.max(0,i-40),i+q.length+60).replace(/\n/g,' '):'';hits.push({file,excerpt})}});const unique=Array.from(new Map(hits.map(h=>[h.file,h])).values()).slice(0,10);if(searchResults){searchResults.innerHTML=unique.map(m=>`<a class="result" data-doc="${m.file}"><div>${m.file}</div><small>${m.excerpt}</small></a>`).join('');[...searchResults.querySelectorAll('[data-doc]')].forEach(a=>{a.addEventListener('click',ev=>{ev.preventDefault();const doc=a.getAttribute('data-doc'),link=[...document.querySelectorAll('[data-doc]')].find(l=>l.getAttribute('data-doc')===doc);setActive(link);history.pushState({doc},'',`#${doc}`);loadDoc(doc);searchResults.innerHTML='';searchInput&&(searchInput.value='')})})}}function init(){wireNav();setLogos();const hash=(location.hash||'#home').slice(1);if(hash==='home'){renderHome()}else{const link=docLinks.find(l=>l.getAttribute('data-doc')===hash)||docLinks[0];setActive(link);loadDoc(hash)}window.addEventListener('popstate',ev=>{const st=ev.state;if(st&&st.page==='home'){renderHome()}else{const doc=(st&&st.doc)||(location.hash||'#index.md').slice(1),link=docLinks.find(l=>l.getAttribute('data-doc')===doc)||docLinks[0];setActive(link);loadDoc(doc)}});const yearEl=document.getElementById('year');yearEl&&(yearEl.textContent=String(new Date().getFullYear()));buildIndex().then(idx=>{searchInput&&searchInput.addEventListener('input',()=>onSearch(idx))})}init()})();

