(function() {
    'use strict';

    const contentEl = document.getElementById('content');
    const docLinks = [...document.querySelectorAll('[data-doc]')];
    const homeLink = document.querySelector('[data-page="home"]');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const searchResults = document.getElementById('search-results');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const yearEl = document.getElementById('year');

    let searchIndex = [];
    let currentSearchQuery = '';
    let searchTimeout = null;

    function docsBase() {
        try {
            const path = window.location.pathname;
            if (path.endsWith('/') || path.endsWith('/index.html')) {
                return 'docs';
            }
            // If running locally with docs/docs-ui/index.html
            return path.includes('/docs/docs-ui/') ? '..' : 'docs';
        } catch (_) {
            return 'docs';
        }
    }

    function assetBase() {
        try {
            const path = window.location.pathname;
            if (path.endsWith('/') || path.endsWith('/index.html')) {
                return '';
            }
            return path.includes('/docs/docs-ui/') ? '../' : '';
        } catch (_) {
            return '';
        }
    }

    function setActive(el) {
        document.querySelectorAll('[data-doc].active, [data-page].active').forEach(n => n.classList.remove('active'));
        if (el) el.classList.add('active');
    }

    function setLogos() {
        document.querySelectorAll('img[data-logo]').forEach(img => {
            img.src = `${assetBase()}docs-assets/aaab.png`;
            img.alt = 'AAABuilder logo';
        });
    }

    async function loadDoc(file) {
        try {
            contentEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';
            
            let res = await fetch(`${docsBase()}/${file}`);
            if (!res.ok && docsBase() === './docs') {
                res = await fetch(`../docs/${file}`);
            }
            
            if (!res.ok) {
                throw new Error(`Failed to load ${file}`);
            }
            
            const txt = await res.text();
            contentEl.innerHTML = marked.parse(txt);
            highlightCode();
            window.scrollTo(0, 0);
            
            attachAnchorLinks();
            
        } catch (error) {
            console.error('Error loading document:', error);
            contentEl.innerHTML = `
                <div class="error-message">
                    <i class="ri-error-warning-line"></i>
                    <h3>Failed to load document</h3>
                    <p>Unable to load "${file}". Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    function highlightCode() {
        try {
            document.querySelectorAll('pre code').forEach(block => {
                if (window.hljs) {
                    window.hljs.highlightElement(block);
                }
            });
        } catch (error) {
            console.error('Error highlighting code:', error);
        }
    }

    function attachAnchorLinks() {
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            if (!heading.id) {
                heading.id = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            }
            
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.className = 'anchor-link';
            link.innerHTML = '<i class="ri-link"></i>';
            link.setAttribute('aria-label', `Link to ${heading.textContent}`);
            
            heading.appendChild(link);
        });
    }

    function renderHome() {
        setActive(homeLink);
        
        const hero = `
            <section class="hero">
                <img class="logo" data-logo="aaab" alt="AAABuilder logo"/>
                <span class="pill">Agent as a Backend</span>
                <h1 class="title">Build AI/ML agents as production-ready APIs</h1>
                <p class="subtitle">
                    AAABuilder is a TypeScript-first framework that turns <code>.agent</code> workflows into scalable services. 
                    Unified providers for LLMs, Computer Vision, Audio, and Traditional ML. 
                    Includes debugger, testing, scaffolding, and auto-docs.
                </p>
                                 <div class="cta">
                     <a class="btn btn-primary" data-doc="quickstart.md">
                         <i class="ri-rocket-line"></i>
                         <span>Get Started</span>
                     </a>
                     <a class="btn btn-secondary" data-doc="architecture.md">
                         <i class="ri-building-line"></i>
                         <span>How it Works</span>
                     </a>
                 </div>
            </section>
        `;

        const features = `
                         <section class="features">
                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-database-2-line"></i>
                     </div>
                     <h3>Unified Providers</h3>
                     <p>One interface across OpenAI, Gemini, Hugging Face, Ollama, YOLO, Whisper, scikit-learn, XGBoost, TF, and more.</p>
                 </div>
                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-shield-check-line"></i>
                     </div>
                     <h3>Operational Rigor</h3>
                     <p>Validation, linting, auto-correction, model optimization, caching, and observability built-in.</p>
                 </div>
                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-tools-line"></i>
                     </div>
                     <h3>Dev Experience</h3>
                     <p>Step debugger, test harness, interactive playground, scaffolding, and docs generator.</p>
                 </div>
             </section>
        `;

        const code = `
            <section class="code-sample">
                <h2>Quick Example</h2>
                <pre><code class="language-typescript">import { createProviderRouter } from "./src/providers";

const router = await createProviderRouter({
  whisper: { enabled: true, priority: 25 },
  yolo: { enabled: true, priority: 20 },
  scikitLearn: { enabled: true, priority: 5 }
});

const res = await router.executeRequest({
  model: "yolo-v8-detection",
  input: imageBuffer,
  parameters: { confidence: 0.5 }
});</code></pre>
            </section>
        `;

        const getStarted = `
            <section class="features">
                                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-terminal-line"></i>
                     </div>
                     <h3>Quick Start</h3>
                     <pre><code class="language-bash"># Install globally
npm install -g aaab

aaab --version

aaab create my-ai-project
cd my-ai-project

export OPENAI_API_KEY="..."

npm run dev</code></pre>
                 </div>
                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-file-code-line"></i>
                     </div>
                     <h3>Your First Agent</h3>
                     <pre><code class="language-yaml">@agent hello-world v1
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
@end</code></pre>
                 </div>
                 <div class="card">
                     <div class="card-icon">
                         <i class="ri-lightbulb-line"></i>
                     </div>
                     <h3>Explore the Idea</h3>
                     <p>Read about the UNIFIED Idea and how it streamlines backend automation using <code>.agent</code> files.</p>
                     <a class="btn btn-secondary" data-doc="Idea.md">
                         <i class="ri-arrow-right-line"></i>
                         <span>Learn more</span>
                     </a>
                 </div>
            </section>
        `;

        contentEl.innerHTML = hero + features + code + getStarted;
        setLogos();
        attachCtas();
        highlightCode();
    }

    function attachCtas() {
        [...contentEl.querySelectorAll('[data-doc]')].forEach(a => {
            a.addEventListener('click', ev => {
                ev.preventDefault();
                const doc = a.getAttribute('data-doc');
                const link = [...document.querySelectorAll('[data-doc]')].find(l => l.getAttribute('data-doc') === doc);
                setActive(link);
                history.pushState({ doc }, '', `#${doc}`);
                loadDoc(doc);
            });
        });
    }

    function wireNav() {
        docLinks.forEach(link => {
            link.addEventListener('click', ev => {
                ev.preventDefault();
                const doc = link.getAttribute('data-doc');
                setActive(link);
                history.pushState({ doc }, '', `#${doc}`);
                loadDoc(doc);
            });
        });

        if (homeLink) {
            homeLink.addEventListener('click', ev => {
                ev.preventDefault();
                history.pushState({ page: 'home' }, '', `#home`);
                renderHome();
            });
        }
    }

    async function buildIndex() {
        try {
            const files = [
                'Idea.md', 'agent.md', 'index.md', 'quickstart.md', 'architecture.md', 
                'cli.md', 'providers.md', 'parser.md', 'server.md', 'examples.md', 
                'templates.md', 'reviews.md'
            ];
            
            const results = await Promise.all(files.map(async f => {
                try {
                    let res = await fetch(`${docsBase()}/${f}`);
                    if (!res.ok && docsBase() === './docs') {
                        res = await fetch(`../docs/${f}`);
                    }
                    
                    if (!res.ok) {
                        return { file: f, text: '', title: f.replace('.md', '') };
                    }
                    
                    const text = await res.text();
                    return { file: f, text: text.toLowerCase(), title: f.replace('.md', '') };
                } catch (_) {
                    return { file: f, text: '', title: f.replace('.md', '') };
                }
            }));
            
            return results;
        } catch (_) {
            return [];
        }
    }

    function onSearch(index) {
        const query = (searchInput && searchInput.value || '').trim().toLowerCase();
        
        if (query === currentSearchQuery) return;
        currentSearchQuery = query;
        
        if (!query) {
            if (searchResults) {
                searchResults.innerHTML = '';
                searchResults.classList.remove('visible');
            }
            if (searchClear) {
                searchClear.classList.remove('visible');
            }
            return;
        }
        
        if (searchClear) {
            searchClear.classList.add('visible');
        }
        
        const hits = [];
        index.forEach(({ file, text, title }) => {
            const inTitle = title.toLowerCase().includes(query);
            const i = text.indexOf(query);
            
            if (inTitle || i >= 0) {
                const excerpt = i >= 0 
                    ? text.substring(Math.max(0, i - 40), i + query.length + 60).replace(/\n/g, ' ')
                    : '';
                hits.push({ file, excerpt, inTitle });
            }
        });
        
        const unique = Array.from(new Map(hits.map(h => [h.file, h])).values())
            .sort((a, b) => {
                if (a.inTitle && !b.inTitle) return -1;
                if (!a.inTitle && b.inTitle) return 1;
                return 0;
            })
            .slice(0, 10);
        
        if (searchResults) {
            if (unique.length > 0) {
                searchResults.innerHTML = unique.map(m => `
                    <a class="result" data-doc="${m.file}">
                        <div class="result-title">
                            <i class="ri-file-text-line"></i>
                            <span>${m.file}</span>
                        </div>
                        <small>${m.excerpt}</small>
                    </a>
                `).join('');
                
                [...searchResults.querySelectorAll('[data-doc]')].forEach(a => {
                    a.addEventListener('click', ev => {
                        ev.preventDefault();
                        const doc = a.getAttribute('data-doc');
                        const link = [...document.querySelectorAll('[data-doc]')].find(l => l.getAttribute('data-doc') === doc);
                        setActive(link);
                        history.pushState({ doc }, '', `#${doc}`);
                        loadDoc(doc);
                        searchResults.innerHTML = '';
                        searchResults.classList.remove('visible');
                        if (searchInput) searchInput.value = '';
                        if (searchClear) searchClear.classList.remove('visible');
                        currentSearchQuery = '';
                    });
                });
                
                searchResults.classList.add('visible');
            } else {
                searchResults.innerHTML = `
                    <div class="no-results">
                        <i class="ri-search-line"></i>
                        <p>No results found for "${query}"</p>
                    </div>
                `;
                searchResults.classList.add('visible');
            }
        }
    }

    function toggleMobileMenu() {
        sidebar.classList.toggle('open');
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            mobileMenuToggle.innerHTML = '<i class="ri-close-line"></i>';
            mobileMenuToggle.setAttribute('aria-label', 'Close mobile menu');
        } else {
            mobileMenuToggle.innerHTML = '<i class="ri-menu-line"></i>';
            mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
        }
    }

    function closeMobileMenu() {
        sidebar.classList.remove('open');
        mobileMenuToggle.innerHTML = '<i class="ri-menu-line"></i>';
        mobileMenuToggle.setAttribute('aria-label', 'Open mobile menu');
    }

    function handleSearchInput() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(() => {
            onSearch(searchIndex);
        }, 300);
    }

    function handleSearchClear() {
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('visible');
        }
        if (searchClear) {
            searchClear.classList.remove('visible');
        }
        currentSearchQuery = '';
    }

    function handleKeyboard(e) {
        if (e.key === 'Escape') {
            closeMobileMenu();
            handleSearchClear();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    function handleClickOutside(e) {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            closeMobileMenu();
        }
        
        if (searchResults.classList.contains('visible') && !searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            searchResults.classList.remove('visible');
        }
    }

    function init() {
        wireNav();
        setLogos();
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', handleSearchInput);
            searchInput.addEventListener('focus', () => {
                if (currentSearchQuery && searchResults) {
                    searchResults.classList.add('visible');
                }
            });
        }
        
        if (searchClear) {
            searchClear.addEventListener('click', handleSearchClear);
        }
        
        document.addEventListener('keydown', handleKeyboard);
        document.addEventListener('click', handleClickOutside);
        
        const hash = (location.hash || '#home').slice(1);
        if (hash === 'home') {
            renderHome();
        } else {
            const link = docLinks.find(l => l.getAttribute('data-doc') === hash) || docLinks[0];
            setActive(link);
            loadDoc(hash);
        }
        
        window.addEventListener('popstate', ev => {
            const st = ev.state;
            if (st && st.page === 'home') {
                renderHome();
            } else {
                const doc = (st && st.doc) || (location.hash || '#index.md').slice(1);
                const link = docLinks.find(l => l.getAttribute('data-doc') === doc) || docLinks[0];
                setActive(link);
                loadDoc(doc);
            }
        });
        
        if (yearEl) {
            yearEl.textContent = String(new Date().getFullYear());
        }
        
        buildIndex().then(idx => {
            searchIndex = idx;
        });
        
        const style = document.createElement('style');
        style.textContent = `
            .loading-spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-20);
                color: var(--text-secondary);
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--border-primary);
                border-top: 3px solid var(--accent-primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: var(--space-4);
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .error-message {
                text-align: center;
                padding: var(--space-20);
                color: var(--accent-error);
            }
            
            .error-message i {
                font-size: var(--font-size-4xl);
                margin-bottom: var(--space-4);
            }
            
            .anchor-link {
                opacity: 0;
                margin-left: var(--space-2);
                color: var(--text-muted);
                transition: opacity var(--transition-fast);
            }
            
            h1:hover .anchor-link,
            h2:hover .anchor-link,
            h3:hover .anchor-link,
            h4:hover .anchor-link,
            h5:hover .anchor-link,
            h6:hover .anchor-link {
                opacity: 1;
            }
            
                         .card-icon {
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 width: 64px;
                 height: 64px;
                 background: var(--accent-yellow);
                 border: 3px solid var(--accent-yellow-dark);
                 margin-bottom: var(--space-6);
                 box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
             }
            
                         .card-icon i {
                 font-size: var(--font-size-2xl);
                 color: var(--text-primary);
             }
            
                         .pill {
                 display: inline-block;
                 background: var(--accent-yellow);
                 color: var(--text-inverse);
                 padding: var(--space-2) var(--space-4);
                 border: 2px solid var(--accent-yellow-dark);
                 font-size: var(--font-size-sm);
                 font-weight: var(--font-weight-semibold);
                 margin-bottom: var(--space-6);
                 text-transform: uppercase;
                 letter-spacing: 0.05em;
             }
            
            .no-results {
                text-align: center;
                padding: var(--space-6);
                color: var(--text-muted);
            }
            
            .no-results i {
                font-size: var(--font-size-2xl);
                margin-bottom: var(--space-2);
            }
            
            .result-title {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                font-weight: var(--font-weight-medium);
                margin-bottom: var(--space-1);
            }
            
            .result-title i {
                color: var(--accent-primary);
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

