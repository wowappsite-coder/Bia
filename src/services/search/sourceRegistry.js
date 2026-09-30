'use strict';

/**
 * Catalogo de fontes. enabled:true so para o que e automatizavel sem bypass.
 * O resto fica documentado e desligado.
 */
const SOURCES = [
  // --- WEB / ENCICLOPEDIA ---
  { id: 'wikipedia', name: 'Wikipedia', type: 'web', enabled: true, priority: 1, requiresAuth: false },
  { id: 'duckduckgo', name: 'DuckDuckGo', type: 'web', enabled: true, priority: 2, requiresAuth: false },
  { id: 'wikidata', name: 'Wikidata', type: 'web', enabled: false, priority: 99, requiresAuth: false },
  { id: 'google', name: 'Google', type: 'web', enabled: false, priority: 99, requiresAuth: true },
  { id: 'bing', name: 'Bing', type: 'web', enabled: false, priority: 99, requiresAuth: true },
  { id: 'brave', name: 'Brave Search', type: 'web', enabled: false, priority: 99, requiresAuth: true },
  // --- CIENCIA ---
  { id: 'arxiv', name: 'arXiv', type: 'science', enabled: true, priority: 3, requiresAuth: false },
  { id: 'pubmed', name: 'PubMed', type: 'science', enabled: false, priority: 99, requiresAuth: false },
  { id: 'scholar', name: 'Google Scholar', type: 'science', enabled: false, priority: 99, requiresAuth: true },
  // --- DOCS ---
  { id: 'mdn', name: 'MDN', type: 'docs', enabled: true, priority: 4, requiresAuth: false },
  { id: 'npm', name: 'npm', type: 'docs', enabled: true, priority: 5, requiresAuth: false },
  { id: 'github', name: 'GitHub', type: 'docs', enabled: false, priority: 99, requiresAuth: true },
  // --- IMAGEM ---
  { id: 'openverse', name: 'Openverse', type: 'image', enabled: true, priority: 1, requiresAuth: false },
  { id: 'wikimedia', name: 'Wikimedia Commons', type: 'image', enabled: true, priority: 2, requiresAuth: false },
  { id: 'pexels', name: 'Pexels', type: 'image', enabled: true, priority: 3, requiresAuth: true },
  { id: 'pixabay', name: 'Pixabay', type: 'image', enabled: false, priority: 99, requiresAuth: true },
  { id: 'unsplash', name: 'Unsplash', type: 'image', enabled: true, priority: 4, requiresAuth: true },
  // --- VIDEO ---
  { id: 'openverse_video', name: 'Openverse Video', type: 'video', enabled: true, priority: 1, requiresAuth: false },
  { id: 'mixkit', name: 'Mixkit', type: 'video', enabled: false, priority: 99, requiresAuth: false },
  // --- IA (sem key = desligado; bia/groq ja existe no bot) ---
  { id: 'bia_local', name: 'Beatriz IA (Groq)', type: 'ai', enabled: true, priority: 1, requiresAuth: true },
  { id: 'chatgpt', name: 'ChatGPT', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'gemini', name: 'Gemini', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'claude', name: 'Claude', type: 'ai', enabled: true, priority: 2, requiresAuth: true },
  { id: 'perplexity', name: 'Perplexity', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'grok', name: 'Grok', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'mistral', name: 'Mistral', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'deepseek', name: 'DeepSeek', type: 'ai', enabled: false, priority: 99, requiresAuth: true },
  { id: 'copilot', name: 'Copilot', type: 'ai', enabled: false, priority: 99, requiresAuth: true }
];

function listByType(type) {
  return SOURCES.filter((s) => s.type === type).sort((a, b) => a.priority - b.priority);
}

function enabledByType(type) {
  return listByType(type).filter((s) => s.enabled);
}

function allCatalog() {
  return SOURCES.slice();
}

module.exports = { SOURCES, listByType, enabledByType, allCatalog };
