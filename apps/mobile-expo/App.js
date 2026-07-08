import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import b4a from 'b4a';

const WIKI_DIR = FileSystem.documentDirectory + 'llmwiki/';
const MACHINE_ID_FILE = WIKI_DIR + '.machine-id';
const TDAI_DIR = FileSystem.documentDirectory + 'tdai/';
const TDAI_L0_DIR = TDAI_DIR + 'l0/';
const TDAI_L1_DIR = TDAI_DIR + 'l1/';
const TDAI_L2_DIR = TDAI_DIR + 'l2/';
const TDAI_L3_DIR = TDAI_DIR + 'l3/';

let machineIdCache = null;
async function getMachineId() {
  if (machineIdCache) return machineIdCache;
  try {
    const id = await FileSystem.readAsStringAsync(MACHINE_ID_FILE);
    machineIdCache = id;
    return id;
  } catch (e) {
    const id = 'ch-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    await FileSystem.writeAsStringAsync(MACHINE_ID_FILE, id).catch(() => {});
    machineIdCache = id;
    return id;
  }
}

const SOCCER_DIR = FileSystem.documentDirectory + 'soccer/';
const AI_COACH_PROMPTS_DIR = SOCCER_DIR + 'prompts/';
const ANALYTICS_DATA_DIR = SOCCER_DIR + 'analytics/';

async function initSoccerDirs() {
  try {
    await FileSystem.makeDirectoryAsync(SOCCER_DIR, { intermediates: true }).catch(() => {});
    await FileSystem.makeDirectoryAsync(AI_COACH_PROMPTS_DIR, { intermediates: true }).catch(() => {});
    await FileSystem.makeDirectoryAsync(ANALYTICS_DATA_DIR, { intermediates: true }).catch(() => {});
  } catch (e) {
    console.error('Failed to init soccer dirs:', e);
  }
}

export default function App() {
  const [modelStatus, setModelStatus] = useState('initializing');
  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState(null);
  const [machineId, setMachineId] = useState('');
  const [pearAvailable, setPearAvailable] = useState(false);
  const [pearStatus, setPearStatus] = useState({ running: false, peers: 0, topics: [] });
  const [qvacAvailable, setQvacAvailable] = useState(false);
  const [qvacModelId, setQvacModelId] = useState(null);
  const [qvacModelLoading, setQvacModelLoading] = useState(false);
  const [qvacModelProgress, setQvacModelProgress] = useState(0);
  const webViewRef = useRef(null);
  const pearWorkletRef = useRef(null);
  const pearPendingRef = useRef(new Map());
  const pearReqIdRef = useRef(0);
  const qvacModelIdRef = useRef(null);

  useEffect(() => {
    async function init() {
      try {
        await FileSystem.makeDirectoryAsync(WIKI_DIR, { intermediates: true }).catch(() => {});
        await FileSystem.makeDirectoryAsync(TDAI_L0_DIR, { intermediates: true }).catch(() => {});
        await FileSystem.makeDirectoryAsync(TDAI_L1_DIR, { intermediates: true }).catch(() => {});
        await FileSystem.makeDirectoryAsync(TDAI_L2_DIR, { intermediates: true }).catch(() => {});
        await FileSystem.makeDirectoryAsync(TDAI_L3_DIR, { intermediates: true }).catch(() => {});
        await initSoccerDirs();
        const id = await getMachineId();
        setMachineId(id);

        // Load on-device LLM via @qvac/sdk. If BareKit/QVAC is unavailable,
        // the app keeps running and AI endpoints report unavailable.
        try {
          const { loadModel, LLAMA_3_2_1B_INST_Q4_0 } = await import('@qvac/sdk');
          console.log('[App] Loading QVAC on-device model...');
          setQvacModelLoading(true);
          setModelStatus('loading model');
          const modelId = await loadModel({
            modelSrc: LLAMA_3_2_1B_INST_Q4_0,
            modelType: 'llm',
            onProgress: (progress) => {
              console.log('[App] QVAC model load progress:', progress);
              setQvacModelProgress(progress);
            },
          });
          qvacModelIdRef.current = modelId;
          setQvacModelId(modelId);
          setQvacAvailable(true);
          setModelStatus('ready');
          console.log('[App] QVAC model loaded:', modelId);
        } catch (modelErr) {
          console.error('[App] QVAC model load failed:', modelErr);
          setModelStatus(`error: ${modelErr.message}`);
        } finally {
          setQvacModelLoading(false);
        }
      } catch (e) {
        console.error('Init error:', e);
        setModelStatus(`error: ${e.message}`);
      }
    }
    init();
  }, []);

  // Start the Pear P2P worklet (Bare + Hyperswarm) for native swarming.
  // If react-native-bare-kit is not available or the bundle has not been built,
  // the app falls back to the local-only stub swarm handlers.
  useEffect(() => {
    let worklet = null;
    let terminated = false;

    async function startPear() {
      try {
        const { Worklet } = await import('react-native-bare-kit');
        const bundle = await import('./pear-worker.bundle.js');
        if (!bundle.default) {
          console.log('[Pear] No worker bundle found. Run npm run build:pear-worker.');
          return;
        }
        worklet = new Worklet();
        worklet.start('/pear-worker.bundle', bundle.default);
        pearWorkletRef.current = worklet;

        const { IPC } = worklet;
        IPC.on('data', (data) => {
          try {
            const msg = JSON.parse(b4a.toString(data));
            if (msg.type === 'ready') {
              console.log('[Pear] Worklet ready');
              setPearAvailable(true);
              setPearStatus(s => ({ ...s, running: true }));
            } else if (msg.type === 'error') {
              console.error('[Pear] Worklet error:', msg.error);
              setPearAvailable(false);
            } else if (msg.type === 'response') {
              const pending = pearPendingRef.current.get(msg.id);
              if (pending) {
                pending.resolve(msg);
                pearPendingRef.current.delete(msg.id);
              }
            } else if (msg.type === 'peer-connected' || msg.type === 'peer-disconnected') {
              setPearStatus(s => ({ ...s, peers: msg.peers || s.peers }));
            }
          } catch (e) {
            console.error('[Pear] IPC parse error:', e);
          }
        });
      } catch (e) {
        console.log('[Pear] Bare worklet unavailable:', e.message);
      }
    }

    startPear();

    return () => {
      terminated = true;
      if (worklet) {
        try { worklet.terminate(); } catch (e) {}
      }
      for (const pending of pearPendingRef.current.values()) {
        pending.reject(new Error('Worklet terminated'));
      }
      pearPendingRef.current.clear();
    };
  }, []);

  // Handle deep links from the browser-based wallet flow
  useEffect(() => {
    async function handleUrl(url) {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const jwt = parsed.searchParams.get('jwt');
        const sub = parsed.searchParams.get('sub');
        const address = parsed.searchParams.get('address');
        const chain = parsed.searchParams.get('chain') || 'evm';
        if (jwt && sub) {
          console.log('[DeepLink] wallet callback received', { address, chain });
          webViewRef.current?.injectJavaScript(`
            window.__mobileWalletCallback = ${JSON.stringify({ jwt, sub, address, chain })};
            if (window.__onMobileWalletCallback) {
              window.__onMobileWalletCallback(window.__mobileWalletCallback);
            }
            true;
          `);
        }
      } catch (e) {
        console.error('[DeepLink] parse error:', e);
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription?.remove();
  }, []);

  async function handleAIWrite(body) {
    if (!qvacAvailable || !qvacModelIdRef.current) {
      return {
        success: false,
        error: 'On-device QVAC AI is not available in this build.',
      };
    }
    try {
      const { completion } = await import('@qvac/sdk');
      const history = [{ role: 'user', content: body?.prompt || '' }];
      const result = completion({ modelId: qvacModelIdRef.current, history, stream: false });
      let text = '';
      if (result && typeof result.text === 'object' && result.text !== null && typeof result.text.then === 'function') {
        text = await result.text;
      } else if (result && typeof result.tokenStream === 'object' && result.tokenStream !== null && typeof result.tokenStream[Symbol.asyncIterator] === 'function') {
        for await (const token of result.tokenStream) {
          text += token;
        }
      } else {
        text = String(result || '');
      }
      return {
        success: true,
        data: {
          title: body?.title || 'Generated',
          body: text,
          source: 'qvac-on-device',
          model: 'LLAMA_3_2_1B_INST_Q4_0',
        },
      };
    } catch (e) {
      console.error('[App] QVAC ai-write failed:', e);
      return { success: false, error: e.message || 'QVAC inference error' };
    }
  }

  async function handleAIStatus() {
    return {
      success: true,
      data: {
        available: qvacAvailable,
        qvacAvailable,
        model: qvacModelIdRef.current ? 'LLAMA_3_2_1B_INST_Q4_0' : null,
        modelLoading: qvacModelLoading,
        modelProgress: qvacModelProgress,
      },
    };
  }

  async function handleAIDocs() {
    return { success: true, data: [] };
  }

  // OpenViking-compatible response helpers
  function ovOk(result) { return { status: 'ok', result }; }
  function ovError(code, message) { return { status: 'error', error: { code, message } }; }

  // OpenViking /api/v1/fs/ls — list files in workspace
  async function handleFsLs(query) {
    try {
      const entries = await FileSystem.readDirectoryAsync(WIKI_DIR).catch(() => []);
      const items = [];
      for (const name of entries) {
        if (!name.endsWith('.md')) continue;
        const info = await FileSystem.getInfoAsync(WIKI_DIR + name);
        if (!info.exists) continue;
        items.push({
          name,
          uri: 'viking://wiki/' + name.replace(/\.md$/, ''),
          type: 'file',
          size: info.size || 0,
          modified: info.modificationTime ? new Date(info.modificationTime * 1000).toISOString() : new Date().toISOString(),
        });
      }
      items.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      return ovOk(items);
    } catch (e) {
      return ovError('INTERNAL', e.message);
    }
  }

  // OpenViking /api/v1/content/read — read file content
  async function handleContentRead(query) {
    try {
      const id = (query.replace(/^uri=/, '').replace(/^viking:\/\/wiki\//, '') || 'welcome').replace(/\.md$/, '');
      const filename = id.replace(/\s+/g, '_') + '.md';
      const path = WIKI_DIR + filename;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return ovError('NOT_FOUND', 'Page not found: ' + id);
      const content = await FileSystem.readAsStringAsync(path);
      return ovOk(content);
    } catch (e) {
      return ovError('INTERNAL', e.message);
    }
  }

  // OpenViking /api/v1/content/write — write file content
  async function handleContentWrite(body) {
    try {
      const uri = body.uri || '';
      const id = uri.replace(/^viking:\/\/wiki\//, '').replace(/\.md$/, '') || body.id || body.title;
      if (!id) return ovError('INVALID_ARGUMENT', 'Missing uri or id');
      const filename = String(id).replace(/\s+/g, '_') + '.md';
      await FileSystem.writeAsStringAsync(WIKI_DIR + filename, body.content || '');
      return ovOk({ uri: 'viking://wiki/' + id, written: true });
    } catch (e) {
      return ovError('INTERNAL', e.message);
    }
  }

  // OpenViking /api/v1/search/find — semantic search (keyword-based fallback)
  async function handleSearchFind(body) {
    try {
      const q = (body.query || '').trim().toLowerCase();
      if (!q) return ovOk([]);
      const entries = await FileSystem.readDirectoryAsync(WIKI_DIR).catch(() => []);
      const results = [];
      for (const name of entries) {
        if (!name.endsWith('.md')) continue;
        const id = name.replace(/\.md$/, '');
        const title = id.replace(/_/g, ' ');
        let score = 0;
        const titleLower = title.toLowerCase();
        if (titleLower === q) score = 100;
        else if (titleLower.includes(q)) score = 80;
        else {
          try {
            const content = await FileSystem.readAsStringAsync(WIKI_DIR + name);
            const contentLower = content.toLowerCase();
            if (contentLower.includes(q)) {
              const matches = (contentLower.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
              score = Math.min(60, matches * 10);
            }
          } catch (e) {}
        }
        if (score > 0) {
          results.push({
            uri: 'viking://wiki/' + id,
            title,
            score,
            snippet: '',
          });
        }
      }
      results.sort((a, b) => b.score - a.score);
      return ovOk(results);
    } catch (e) {
      return ovError('INTERNAL', e.message);
    }
  }

  // OpenViking /api/v1/relations — get relations for a resource
  async function handleRelations(query) {
    try {
      const id = (query.replace(/^uri=/, '').replace(/^viking:\/\/wiki\//, '') || '').trim();
      if (!id) return ovError('INVALID_ARGUMENT', 'Missing uri');
      const filename = String(id).replace(/\s+/g, '_') + '.md';
      const info = await FileSystem.getInfoAsync(WIKI_DIR + filename);
      if (!info.exists) return ovError('NOT_FOUND', 'Page not found: ' + id);
      const content = await FileSystem.readAsStringAsync(WIKI_DIR + filename);
      const entries = await FileSystem.readDirectoryAsync(WIKI_DIR).catch(() => []);
      const linkedIds = new Set();
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkPattern.exec(content)) !== null) {
        const target = m[2].replace(/\.md$/, '').replace(/\.\//, '');
        linkedIds.add(target.replace(/\s+/g, '_'));
      }
      const links = [];
      const backlinks = [];
      for (const name of entries) {
        if (!name.endsWith('.md')) continue;
        const otherId = name.replace(/\.md$/, '');
        if (otherId === id) continue;
        if (linkedIds.has(otherId)) {
          links.push({ uri: 'viking://wiki/' + otherId, title: otherId.replace(/_/g, ' '), reason: 'wikilink' });
        } else {
          try {
            const otherContent = await FileSystem.readAsStringAsync(WIKI_DIR + name);
            if (otherContent.toLowerCase().includes(id.replace(/_/g, ' ').toLowerCase())) {
              backlinks.push({ uri: 'viking://wiki/' + otherId, title: otherId.replace(/_/g, ' '), reason: 'backlink' });
            }
          } catch (e) {}
        }
      }
      return ovOk({ links, backlinks });
    } catch (e) {
      return ovError('INTERNAL', e.message);
    }
  }

  // ============================
  // TencentDB Agent Memory Gateway
  // Implements the same API contract as src/gateway/server.ts
  // /health, /recall, /capture, /search/memories, /search/conversations, /session/end
  // Uses file-based storage for L0/L1/L2/L3 tiers (replacing SQLite + sqlite-vec)
  // ============================

  const tdaiStartTime = Date.now();

  // /health — HealthResponse
  async function handleTdaiHealth() {
    return {
      status: 'ok',
      version: '0.3.6',
      uptime: Math.floor((Date.now() - tdaiStartTime) / 1000),
      stores: { vectorStore: false, embeddingService: false },
    };
  }

  // /capture — CaptureRequest -> CaptureResponse
  // Stores L0 conversation records as JSON files
  async function handleTdaiCapture(body) {
    try {
      const sessionKey = body.session_key || 'default';
      const sessionId = body.session_id || sessionKey;
      const userId = body.user_id || 'default_user';
      const timestamp = Date.now();
      const recordId = `l0_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id: recordId,
        session_key: sessionKey,
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        message_text: body.user_content || '',
        recorded_at: new Date(timestamp).toISOString(),
        timestamp,
      };
      await FileSystem.writeAsStringAsync(
        TDAI_L0_DIR + recordId + '.json',
        JSON.stringify(record)
      );
      if (body.assistant_content) {
        const aRecord = {
          id: `l0_${timestamp + 1}_${Math.random().toString(36).slice(2, 8)}`,
          session_key: sessionKey,
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          message_text: body.assistant_content,
          recorded_at: new Date(timestamp + 1).toISOString(),
          timestamp: timestamp + 1,
        };
        await FileSystem.writeAsStringAsync(
          TDAI_L0_DIR + aRecord.id + '.json',
          JSON.stringify(aRecord)
        );
      }
      return { l0_recorded: body.assistant_content ? 2 : 1, scheduler_notified: false };
    } catch (e) {
      return { error: e.message };
    }
  }

  // /recall — RecallRequest -> RecallResponse
  // Keyword-based recall from L1 atoms (falls back to L0 when no L1 exists)
  async function handleTdaiRecall(body) {
    try {
      const query = (body.query || '').toLowerCase();
      if (!query) return { context: '', strategy: 'none', memory_count: 0 };
      const l1Results = await tdaiSearchLayer(TDAI_L1_DIR, query, 5);
      if (l1Results.length > 0) {
        const context = l1Results.map(r => r.content).join('\n\n');
        return { context, strategy: 'keyword', memory_count: l1Results.length };
      }
      const l0Results = await tdaiSearchLayer(TDAI_L0_DIR, query, 3);
      const context = l0Results.map(r => r.message_text || r.content || '').filter(Boolean).join('\n\n');
      return { context, strategy: 'l0_fallback', memory_count: l0Results.length };
    } catch (e) {
      return { error: e.message };
    }
  }

  // /search/memories — MemorySearchRequest -> MemorySearchResponse
  async function handleTdaiSearchMemories(body) {
    try {
      const query = (body.query || '').toLowerCase();
      const limit = body.limit || 10;
      const results = await tdaiSearchLayer(TDAI_L1_DIR, query, limit);
      return {
        results: JSON.stringify(results),
        total: results.length,
        strategy: 'keyword',
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  // /search/conversations — ConversationSearchRequest -> ConversationSearchResponse
  async function handleTdaiSearchConversations(body) {
    try {
      const query = (body.query || '').toLowerCase();
      const limit = body.limit || 10;
      const results = await tdaiSearchLayer(TDAI_L0_DIR, query, limit);
      return {
        results: JSON.stringify(results),
        total: results.length,
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  // /session/end — SessionEndRequest -> SessionEndResponse
  async function handleTdaiSessionEnd(body) {
    try {
      const sessionKey = body.session_key || 'default';
      const entries = await FileSystem.readDirectoryAsync(TDAI_L0_DIR).catch(() => []);
      let count = 0;
      for (const name of entries) {
        if (!name.endsWith('.json')) continue;
        try {
          const raw = await FileSystem.readAsStringAsync(TDAI_L0_DIR + name);
          const rec = JSON.parse(raw);
          if (rec.session_key === sessionKey) count++;
        } catch (e) {}
      }
      return { flushed: count > 0 };
    } catch (e) {
      return { error: e.message };
    }
  }

  // Helper: keyword search across a directory of JSON files
  async function tdaiSearchLayer(dir, query, limit) {
    const entries = await FileSystem.readDirectoryAsync(dir).catch(() => []);
    const results = [];
    const qLower = query.toLowerCase();
    for (const name of entries) {
      if (!name.endsWith('.json')) continue;
      try {
        const raw = await FileSystem.readAsStringAsync(dir + name);
        const rec = JSON.parse(raw);
        const text = (rec.message_text || rec.content || '').toLowerCase();
        if (text.includes(qLower)) {
          const matches = (text.match(new RegExp(qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          results.push({ ...rec, score: Math.min(1, matches * 0.15) });
        }
      } catch (e) {}
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // /tdai/extract — get unprocessed L0 conversations for L1 extraction by on-device LLM
  async function handleTdaiExtract(body) {
    try {
      const sessionKey = body?.session_key;
      const entries = await FileSystem.readDirectoryAsync(TDAI_L0_DIR).catch(() => []);
      const l0Records = [];
      for (const name of entries) {
        if (!name.endsWith('.json')) continue;
        try {
          const raw = await FileSystem.readAsStringAsync(TDAI_L0_DIR + name);
          const rec = JSON.parse(raw);
          if (sessionKey && rec.session_key !== sessionKey) continue;
          l0Records.push(rec);
        } catch (e) {}
      }
      l0Records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      // Check which L1 records already exist to avoid reprocessing
      const l1Entries = await FileSystem.readDirectoryAsync(TDAI_L1_DIR).catch(() => []);
      const processedIds = new Set(l1Entries.filter(n => n.endsWith('.json')).map(n => n.replace(/\.json$/, '')));
      const unprocessed = l0Records.filter(r => !processedIds.has(r.id));
      // Group by session_id
      const sessions = {};
      for (const rec of unprocessed) {
        const sk = rec.session_key || 'default';
        if (!sessions[sk]) sessions[sk] = [];
        sessions[sk].push(rec);
      }
      return { sessions, total_unprocessed: unprocessed.length };
    } catch (e) {
      return { error: e.message };
    }
  }

  // /tdai/l1/save — save extracted L1 atoms (called by frontend after LLM extraction)
  async function handleTdaiL1Save(body) {
    try {
      const atoms = body.atoms || [];
      const sessionId = body.session_key || 'default';
      let saved = 0;
      for (const atom of atoms) {
        const recordId = `l1_${Date.now()}_${saved}_${Math.random().toString(36).slice(2, 6)}`;
        const record = {
          record_id: recordId,
          content: atom.content || '',
          type: atom.type || 'episodic',
          priority: atom.priority || 50,
          scene_name: atom.scene_name || '',
          session_key: sessionId,
          session_id: sessionId,
          timestamp_str: new Date().toISOString(),
          timestamp_start: atom.metadata?.activity_start_time || '',
          timestamp_end: atom.metadata?.activity_end_time || '',
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
          metadata_json: JSON.stringify(atom.metadata || {}),
          source_ids: atom.source_message_ids || [],
        };
        await FileSystem.writeAsStringAsync(
          TDAI_L1_DIR + recordId + '.json',
          JSON.stringify(record)
        );
        saved++;
      }
      // Also mark L0 records as processed by creating placeholder L1 files with their IDs
      if (body.processed_l0_ids) {
        for (const l0Id of body.processed_l0_ids) {
          await FileSystem.writeAsStringAsync(
            TDAI_L1_DIR + l0Id + '.json',
            JSON.stringify({ record_id: 'processed_' + l0Id, processed: true, l0_id: l0Id })
          ).catch(() => {});
        }
      }
      return { saved, total: saved };
    } catch (e) {
      return { error: e.message };
    }
  }

  // ============================
  // Unified Memory API — /api/memory
  // Single endpoint exposing all OpenViking + TDAI functions
  // POST body: { action: "...", ...params }
  // GET: /api/memory?action=health
  // ============================
  async function handleMemoryApi(method, body, query) {
    const action = (method === 'GET')
      ? (query.split('&').find(p => p.startsWith('action=')) || '').replace(/^action=/, '')
      : (body.action || '');

    switch (action) {
      // ── OpenViking: Knowledge Base ──
      case 'list':
        return await handleFsLs('');
      case 'read':
        return await handleContentRead('uri=' + (body.uri || ''));
      case 'write':
        return await handleContentWrite(body);
      case 'search':
        return await handleSearchFind(body);
      case 'relations':
        return await handleRelations('uri=' + (body.uri || ''));

      // ── TDAI: Conversation Memory ──
      case 'tdai.health':
        return await handleTdaiHealth();
      case 'tdai.capture':
        return await handleTdaiCapture(body);
      case 'tdai.recall':
        return await handleTdaiRecall(body);
      case 'tdai.searchMemories':
        return await handleTdaiSearchMemories(body);
      case 'tdai.searchConversations':
        return await handleTdaiSearchConversations(body);
      case 'tdai.sessionEnd':
        return await handleTdaiSessionEnd(body);
      case 'tdai.extract':
        return await handleTdaiExtract(body);
      case 'tdai.l1Save':
        return await handleTdaiL1Save(body);

      // ── Meta ──
      case 'health':
        return {
          status: 'ok',
          memory: {
            openviking: { endpoints: ['list', 'read', 'write', 'search', 'relations'] },
            tdai: { endpoints: ['tdai.health', 'tdai.capture', 'tdai.recall', 'tdai.searchMemories', 'tdai.searchConversations', 'tdai.sessionEnd', 'tdai.extract', 'tdai.l1Save'] },
          },
        };

      default:
        return { status: 'error', error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}. Use action=health for available actions.` } };
    }
  }

  // Legacy compat wrappers (translate old format <-> OpenViking format)
  async function handleWikiDocs() {
    const r = await handleFsLs('');
    if (r.status === 'ok') return { success: true, data: r.result.map(i => ({ id: i.name.replace(/\.md$/, ''), title: i.name.replace(/\.md$/, '').replace(/_/g, ' '), path: i.name, modified: i.modified })) };
    return { success: false, error: r.error?.message };
  }
  async function handleWikiRead(body, query) {
    const r = await handleContentRead(query);
    if (r.status === 'ok') { const id = query.replace(/^id=/, '').replace(/\.md$/, ''); return { success: true, data: { id, title: id.replace(/_/g, ' '), content: r.result } }; }
    return { success: false, error: r.error?.message };
  }
  async function handleWikiSave(body) {
    const r = await handleContentWrite(body);
    if (r.status === 'ok') return { success: true, data: { id: body.id || body.title, filename: String(body.id || body.title).replace(/\s+/g, '_') + '.md' } };
    return { success: false, error: r.error?.message };
  }
  async function handleWikiDelete(body, query) {
    try {
      const id = body.id || query.replace(/^id=/, '');
      if (!id) throw new Error('Missing page id');
      const filename = String(id).replace(/\s+/g, '_') + '.md';
      await FileSystem.deleteAsync(WIKI_DIR + filename, { idempotent: true });
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async function handleWikiSearch(query) {
    const q = query.replace(/^q=/, '');
    const r = await handleSearchFind({ query: q });
    if (r.status === 'ok') return { success: true, data: r.result.map(i => ({ id: i.uri.replace(/^viking:\/\/wiki\//, ''), title: i.title, score: i.score })) };
    return { success: false, error: r.error?.message };
  }
  async function handleWikiGraph(query) {
    const id = query.replace(/^id=/, '');
    const r = await handleRelations('uri=' + id);
    if (r.status === 'ok') {
      const nodes = [{ id, title: id.replace(/_/g, ' '), type: 'root' }];
      const edges = [];
      for (const l of r.result.links) { const oid = l.uri.replace(/^viking:\/\/wiki\//, ''); nodes.push({ id: oid, title: l.title, type: 'linked' }); edges.push({ from: id, to: oid, reason: l.reason }); }
      for (const b of r.result.backlinks) { const oid = b.uri.replace(/^viking:\/\/wiki\//, ''); nodes.push({ id: oid, title: b.title, type: 'backlink' }); edges.push({ from: oid, to: id, reason: b.reason }); }
      return { success: true, data: { nodes, edges } };
    }
    return { success: false, error: r.error?.message };
  }

  async function handleStart() {
    return { success: true, data: { running: true, registered: { url: 'mobile://on-device', evmAddress: '', casperProvider: '' }, casper: { registered: [], errors: [] } } };
  }

  async function handleStop() {
    return { success: true, data: { running: false } };
  }

  async function pearRequest(action, body = {}) {
    if (!pearAvailable || !pearWorkletRef.current) {
      throw new Error('Pear P2P not available');
    }
    const id = ++pearReqIdRef.current;
    const { IPC } = pearWorkletRef.current;
    return new Promise((resolve, reject) => {
      pearPendingRef.current.set(id, { resolve, reject });
      IPC.write(b4a.from(JSON.stringify({ id, action, body })));
      setTimeout(() => {
        if (pearPendingRef.current.has(id)) {
          pearPendingRef.current.delete(id);
          reject(new Error('Pear request timeout'));
        }
      }, 30000);
    });
  }

  async function handleSwarmStatus() {
    if (pearAvailable) {
      try {
        return await pearRequest('swarm/status');
      } catch (e) {
        console.warn('[Pear] swarm/status failed, falling back:', e.message);
      }
    }
    return { success: true, data: { ...pearStatus, id: null, status: 'local-only' } };
  }

  async function handleWeb3AuthConfig() {
    try {
      const res = await fetch('https://d78cd159.new-localchimera.pages.dev/api/web3auth-config');
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
      const text = await res.text();
      return { success: false, error: `Web3Auth config fetch failed: ${res.status} ${text}` };
    } catch (e) {
      return { success: false, error: e.message || 'Web3Auth config fetch error' };
    }
  }

  async function handleWeb3AuthJwt(body) {
    try {
      const res = await fetch('https://d78cd159.new-localchimera.pages.dev/api/web3auth-jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      }
      const text = await res.text();
      return { success: false, error: `Web3Auth JWT fetch failed: ${res.status} ${text}` };
    } catch (e) {
      return { success: false, error: e.message || 'Web3Auth JWT fetch error' };
    }
  }

  async function handleSwarmCreate(body) {
    if (pearAvailable) {
      try {
        return await pearRequest('swarm/create', body);
      } catch (e) {
        console.warn('[Pear] swarm/create failed, falling back:', e.message);
      }
    }
    const id = await getMachineId();
    const scope = body && body.scope;
    const pageId = body && body.pageId;
    const topic = scope === 'page'
      ? `${id}-page-${pageId || 'current'}`
      : `${id}-wiki`;
    return { success: true, data: { topic, inviteUrl: 'chimera://join/' + topic } };
  }

  async function handleSwarmJoin(body) {
    if (pearAvailable) {
      try {
        return await pearRequest('swarm/join', body);
      } catch (e) {
        console.warn('[Pear] swarm/join failed, falling back:', e.message);
      }
    }
    const topic = body.topic || (await getMachineId() + '-wiki');
    return { success: true, data: { topic, inviteUrl: 'chimera://join/' + topic } };
  }

  async function handleSwarmBroadcast(body) {
    if (pearAvailable) {
      try {
        return await pearRequest('swarm/broadcast', body);
      } catch (e) {
        console.warn('[Pear] swarm/broadcast failed:', e.message);
      }
    }
    return { success: true, data: { scope: body?.scope || 'wiki', pageId: body?.pageId || null, local: true } };
  }

  async function handleSwarmTopics(body) {
    if (pearAvailable) {
      try {
        return await pearRequest('swarm/topics', body);
      } catch (e) {
        console.warn('[Pear] swarm/topics failed, falling back:', e.message);
      }
    }
    return { success: true, data: { wiki: [], page: [] } };
  }

  // ============================
  // Soccer Coach Integration Endpoints (On-Device)
  // ============================

  // AI Coach using local prompt templates and rule-based insights
  async function handleSoccerAiCoach(body) {
    try {
      await initSoccerDirs();

      const coachPromptPath = AI_COACH_PROMPTS_DIR + 'coach_template.txt';
      let coachTemplate = '';
      try {
        coachTemplate = await FileSystem.readAsStringAsync(coachPromptPath);
      } catch (e) {
        coachTemplate = `You are a tactical soccer coach assistant. Analyze this match data: {data}`;
        await FileSystem.writeAsStringAsync(coachPromptPath, coachTemplate);
      }

      const prompt = coachTemplate.replace('{data}', JSON.stringify(body.events || []));
      const insight = generateLocalInsight(body.events, body.role || 'coach');

      return { success: true, insight };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function generateLocalInsight(events, role) {
    if (!events || events.length === 0) {
      return 'No match data available for analysis.';
    }

    const eventTypes = {};
    events.forEach(e => {
      eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
    });

    let analysis = `**Match Analysis**\n\n`;
    analysis += `**Event Summary**:\n`;
    Object.entries(eventTypes).forEach(([type, count]) => {
      analysis += `- ${type}: ${count}\n`;
    });

    if (role === 'coach') {
      analysis += `\n**Tactical Observations**:\n`;
      analysis += `- Total events analyzed: ${events.length}\n`;
      analysis += `- Key patterns detected based on event distribution\n`;
      analysis += `- Recommend reviewing player positioning based on event locations\n`;
    } else {
      analysis += `\n**Simple Summary**:\n`;
      analysis += `- The team had ${events.length} total events\n`;
      analysis += `- Main activities: ${Object.keys(eventTypes).slice(0, 3).join(', ')}\n`;
    }

    return analysis;
  }

  // ============================
  // On-Device LLM (QVAC)
  // ============================

  async function handleSoccerLlmConfig() {
    return {
      success: true,
      config: {
        provider: 'qvac',
        model: qvacModelIdRef.current ? 'LLAMA_3_2_1B_INST_Q4_0' : null,
        loaded: qvacModelIdRef.current !== null,
      },
    };
  }

  async function callQvacLlm(messages) {
    if (!qvacModelIdRef.current) {
      throw new Error('QVAC model not loaded');
    }
    const { completion } = await import('@qvac/sdk');
    const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));
    const result = completion({ modelId: qvacModelIdRef.current, history, stream: false });
    if (result && typeof result.text === 'object' && result.text !== null && typeof result.text.then === 'function') {
      return await result.text;
    }
    if (result && typeof result.tokenStream === 'object' && result.tokenStream !== null && typeof result.tokenStream[Symbol.asyncIterator] === 'function') {
      let text = '';
      for await (const token of result.tokenStream) {
        text += token;
      }
      return text;
    }
    return String(result || '');
  }

  async function handleSoccerAiCoach(body) {
    try {
      await initSoccerDirs();

      const coachPromptPath = AI_COACH_PROMPTS_DIR + 'coach_template.txt';
      let coachTemplate = '';
      try {
        coachTemplate = await FileSystem.readAsStringAsync(coachPromptPath);
      } catch (e) {
        coachTemplate = `You are a tactical soccer coach assistant. Analyze this match data and provide actionable coaching insights: {data}`;
        await FileSystem.writeAsStringAsync(coachPromptPath, coachTemplate);
      }

      const prompt = coachTemplate.replace('{data}', JSON.stringify(body.events || []));

      if (qvacModelIdRef.current) {
        const messages = [
          { role: 'system', content: 'You are an expert soccer coach assistant.' },
          { role: 'user', content: prompt }
        ];
        const insight = await callQvacLlm(messages);
        return { success: true, insight, source: 'qvac' };
      }

      const insight = generateLocalInsight(body.events, body.role || 'coach');
      return { success: true, insight, source: 'local' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function handleSoccerAiChat(body) {
    try {
      await handleTdaiCapture({
        user_content: body.message,
        assistant_content: null,
        session_key: 'soccer-coach'
      });

      let response;
      if (qvacModelIdRef.current) {
        const history = await getTdaiSessionRecords('soccer-coach', 6);
        const messages = [
          { role: 'system', content: 'You are a helpful soccer coach assistant for tactical analysis, player evaluation, and match planning.' },
          ...history,
          { role: 'user', content: body.message }
        ];
        response = await callQvacLlm(messages);
      } else {
        response = `I understand you're asking about: "${body.message}". As your soccer coach assistant, I can help with tactical analysis, player evaluations, and match planning. QVAC model is not loaded.`;
      }

      await handleTdaiCapture({
        user_content: body.message,
        assistant_content: response,
        session_key: 'soccer-coach'
      });

      return { success: true, response, source: qvacModelIdRef.current ? 'qvac' : 'local' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function getTdaiSessionRecords(sessionKey, limit) {
    const entries = await FileSystem.readDirectoryAsync(TDAI_L0_DIR).catch(() => []);
    const records = [];
    for (const name of entries) {
      if (!name.endsWith('.json')) continue;
      try {
        const raw = await FileSystem.readAsStringAsync(TDAI_L0_DIR + name);
        const rec = JSON.parse(raw);
        if (rec.session_key === sessionKey) {
          records.push(rec);
        }
      } catch (e) {}
    }
    records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return records.slice(-limit).map(r => ({
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.message_text || ''
    }));
  }

  async function handleSoccerVisualize(body) {
    try {
      await initSoccerDirs();

      const vizType = body.data_type || 'event_summary';
      const events = body.events || [];
      let vizData = { type: vizType };

      if (vizType === 'event_summary') {
        const counts = {};
        events.forEach(e => {
          counts[e.type] = (counts[e.type] || 0) + 1;
        });
        vizData.labels = Object.keys(counts);
        vizData.values = Object.values(counts);
      } else if (vizType === 'shot_map') {
        vizData.shots = events
          .filter(e => e.type === 'Shot')
          .map(e => ({
            x: (e.location && e.location[0]) || 50,
            y: (e.location && e.location[1]) || 50,
            xg: e.xg || 0,
            outcome: e.outcome || 'Unknown',
            player: e.player || 'Unknown',
          }));
      } else if (vizType === 'passing_network') {
        const passes = events.filter(e => e.type === 'Pass');
        const nodes = {};
        const links = {};
        passes.forEach(p => {
          const src = p.player || 'Unknown';
          const dst = p.recipient || 'Unknown';
          nodes[src] = (nodes[src] || 0) + 1;
          nodes[dst] = (nodes[dst] || 0) + 1;
          const key = src + '->' + dst;
          links[key] = (links[key] || 0) + 1;
        });
        vizData.nodes = Object.entries(nodes).map(([name, count]) => ({ name, count }));
        vizData.links = Object.entries(links).map(([key, count]) => {
          const parts = key.split('->');
          return { source: parts[0], target: parts[1], count };
        });
      } else if (vizType === 'xg_timeline') {
        const shots = events
          .filter(e => e.type === 'Shot' && typeof e.minute === 'number' && typeof e.xg === 'number')
          .sort((a, b) => a.minute - b.minute);
        let cumulative = 0;
        vizData.points = shots.map(s => {
          cumulative += s.xg;
          return { minute: s.minute, xg: cumulative, team: s.team || 'Unknown' };
        });
      }

      return { success: true, vizData };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function handleSoccerReference(query) {
    try {
      const topic = query.replace(/^topic=/, '');

      const refPath = ANALYTICS_DATA_DIR + 'reference_' + topic + '.md';
      try {
        const content = await FileSystem.readAsStringAsync(refPath);
        return { success: true, topic, content };
      } catch (e) {
        const basicRef = '# ' + topic + '\n\nReference information from analytics-handbook. Full content requires importing the notebook data.';
        return { success: true, topic, content: basicRef };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ============================
  // Data Import for Production
  // ============================

  async function handleSoccerImport(body) {
    try {
      await initSoccerDirs();
      const { source, format, content, target_page } = body;
      if (!content) {
        return { success: false, error: 'Missing content' };
      }

      let parsed;
      if (format === 'json') {
        parsed = JSON.parse(content);
      } else if (format === 'csv') {
        parsed = parseSimpleCsv(content);
      } else {
        return { success: false, error: 'Unsupported format. Use json or csv.' };
      }

      const pageId = target_page || (source ? source.replace(/\W+/g, '_') : 'imported_data');
      const markdown = convertToMarkdown(parsed, source);
      await FileSystem.writeAsStringAsync(WIKI_DIR + pageId + '.md', markdown);

      return { success: true, page: pageId, rows: Array.isArray(parsed) ? parsed.length : 1 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function parseSimpleCsv(text) {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ? values[i].trim() : '';
      });
      return row;
    });
  }

  function convertToMarkdown(data, source) {
    if (!Array.isArray(data) || data.length === 0) {
      return `# Imported Data\n\nSource: ${source || 'unknown'}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }
    const headers = Object.keys(data[0]);
    let md = `# Imported Data: ${source || 'unknown'}\n\n`;
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;
    data.forEach(row => {
      md += `| ${headers.map(h => String(row[h] || '')).join(' | ')} |\n`;
    });
    return md;
  }

  const sendBridgeResponse = (id, res) => {
    webViewRef.current?.injectJavaScript(`
      window.__bridgeResolve(${id}, ${JSON.stringify(res)});
      true;
    `);
  };

  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'bridge-ready') {
        console.log('Bridge ready from WebView');
        return;
      }
      if (msg.type === 'console') {
        console.log('WebView console:', msg.level, msg.args);
        return;
      }
      if (msg.type === 'diag') {
        console.log('WebView diag:', msg.msg);
        return;
      }
      if (msg.type === 'wallet-connected') {
        console.log('[Bridge] wallet connected, returning to app');
        try {
          Linking.openURL('io.chimera.mobile://wallet').catch(() => {});
        } catch (e) {}
        return;
      }
      if (msg.type === 'open-browser') {
        console.log('[Bridge] opening browser:', msg.url);
        Linking.openURL(msg.url).catch(e => console.error('[Bridge] openURL error:', e));
        return;
      }

      const { id, method, path, body } = msg;
      const query = path.includes('?') ? decodeURIComponent(path.split('?')[1]) : '';
      const cleanPath = path.split('?')[0];
      let res;

      try {
        if (method === 'POST' && cleanPath === '/api/ai-write') {
          res = await handleAIWrite(body);
        } else if (method === 'GET' && cleanPath === '/api/ai-status') {
          res = await handleAIStatus();
        } else if (method === 'GET' && cleanPath === '/api/ai-docs') {
          res = await handleAIDocs();
        } else if (method === 'GET' && cleanPath === '/api/llmwiki-docs') {
          res = await handleWikiDocs();
        } else if (method === 'GET' && cleanPath.startsWith('/api/llmwiki-read')) {
          res = await handleWikiRead(body, query);
        } else if (method === 'POST' && cleanPath === '/api/llmwiki-save') {
          res = await handleWikiSave(body);
        } else if (method === 'DELETE' && cleanPath.startsWith('/api/llmwiki-delete')) {
          res = await handleWikiDelete(body, query);
        } else if (method === 'GET' && cleanPath.startsWith('/api/llmwiki-search')) {
          res = await handleWikiSearch(query);
        } else if (method === 'GET' && cleanPath.startsWith('/api/llmwiki-graph')) {
          res = await handleWikiGraph(query);
        } else if (method === 'GET' && cleanPath === '/api/v1/fs/ls') {
          res = await handleFsLs(query);
        } else if (method === 'GET' && cleanPath.startsWith('/api/v1/content/read')) {
          res = await handleContentRead(query);
        } else if (method === 'POST' && cleanPath === '/api/v1/content/write') {
          res = await handleContentWrite(body);
        } else if (method === 'POST' && cleanPath === '/api/v1/search/find') {
          res = await handleSearchFind(body);
        } else if (method === 'GET' && cleanPath.startsWith('/api/v1/relations')) {
          res = await handleRelations(query);
        } else if (method === 'GET' && cleanPath === '/api/tdai/health') {
          res = await handleTdaiHealth();
        } else if (method === 'POST' && cleanPath === '/api/tdai/capture') {
          res = await handleTdaiCapture(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/recall') {
          res = await handleTdaiRecall(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/search/memories') {
          res = await handleTdaiSearchMemories(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/search/conversations') {
          res = await handleTdaiSearchConversations(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/session/end') {
          res = await handleTdaiSessionEnd(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/extract') {
          res = await handleTdaiExtract(body);
        } else if (method === 'POST' && cleanPath === '/api/tdai/l1/save') {
          res = await handleTdaiL1Save(body);
        } else if ((method === 'POST' || method === 'GET') && cleanPath === '/api/memory') {
          res = await handleMemoryApi(method, body, query);
        } else if (method === 'POST' && cleanPath === '/api/start') {
          res = await handleStart();
        } else if (method === 'POST' && cleanPath === '/api/stop') {
          res = await handleStop();
        } else if (method === 'GET' && cleanPath === '/api/swarm/status') {
          res = await handleSwarmStatus();
        } else if (method === 'GET' && cleanPath === '/api/web3auth-config') {
          res = await handleWeb3AuthConfig();
        } else if (method === 'POST' && cleanPath === '/api/web3auth-jwt') {
          res = await handleWeb3AuthJwt(body);
        } else if (method === 'POST' && cleanPath === '/api/swarm/create') {
          res = await handleSwarmCreate(body);
        } else if (method === 'POST' && cleanPath === '/api/swarm/join') {
          res = await handleSwarmJoin(body);
        } else if (method === 'POST' && cleanPath === '/api/swarm/broadcast') {
          res = await handleSwarmBroadcast(body);
        } else if (method === 'GET' && cleanPath === '/api/swarm/topics') {
          res = await handleSwarmTopics(body);
        } else if (method === 'POST' && cleanPath === '/api/soccer/ai-coach') {
          res = await handleSoccerAiCoach(body);
        } else if (method === 'POST' && cleanPath === '/api/soccer/ai-chat') {
          res = await handleSoccerAiChat(body);
        } else if (method === 'POST' && cleanPath === '/api/soccer/visualize') {
          res = await handleSoccerVisualize(body);
        } else if (method === 'GET' && cleanPath.startsWith('/api/soccer/reference')) {
          res = await handleSoccerReference(query);
        } else if (method === 'POST' && cleanPath === '/api/soccer/import') {
          res = await handleSoccerImport(body);
        } else if ((method === 'POST' || method === 'GET') && cleanPath === '/api/soccer/llm-config') {
          res = await handleSoccerLlmConfig(body);
        } else {
          res = { success: false, error: 'Not found: ' + method + ' ' + cleanPath };
        }
      } catch (handlerErr) {
        console.error('Bridge handler error:', handlerErr);
        res = { success: false, error: handlerErr.message || 'Handler error' };
      }

      sendBridgeResponse(id, res);
    } catch (e) {
      console.error('Bridge error:', e);
    }
  };

  const injectedBridge = `
    (function() {
      if (window.__bridgeActive) return;
      window.__bridgeActive = true;
      window.__bridgeFetch = true;
      window.__appVersion = ${JSON.stringify(Constants.nativeAppVersion || Constants.expoConfig?.version || '1.0.22')};
      window.__machineId = ${JSON.stringify(machineId)};
      window.__apiOrigin = ${JSON.stringify(machineId ? 'https://chimera.local/' + machineId : 'https://chimera.local')};
      window.__bridgeResolvers = {};
      const originalConsole = { log: console.log, warn: console.warn, error: console.error };
      function forwardConsole(level, args) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'console', level, args: Array.from(args).map(String) }));
        } catch (e) {}
        originalConsole[level].apply(console, args);
      }
      console.log = function(...args) { forwardConsole('log', args); };
      console.warn = function(...args) { forwardConsole('warn', args); };
      console.error = function(...args) { forwardConsole('error', args); };
      window.openBrowser = function(url) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open-browser', url }));
      };
      window.addEventListener('message', (event) => {
        console.log('[Bridge] postMessage received origin=' + event.origin + ' data=' + JSON.stringify(event.data));
      });
      console.log('[Bridge] Injected bridge script running');
      console.log('[Bridge] document.getElementById(root):', document.getElementById('root'));
      console.log('[Bridge] Scripts on page:', document.querySelectorAll('script').length);
      window.__bridgeResolve = function(id, data) {
        const cb = window.__bridgeResolvers[id];
        if (cb) cb(data);
        delete window.__bridgeResolvers[id];
      };

      const originalFetch = window.fetch;

      const isApiCall = (url) => {
        if (typeof url !== 'string') return false;
        return url.startsWith('/api') || url.startsWith('http://localhost:3002/api');
      };
      const extractPath = (url) => {
        if (url.startsWith('/api')) return url;
        return url.replace('http://localhost:3002', '');
      };

      window.fetch = async function(url, options = {}) {
        if (isApiCall(url)) {
          return new Promise((resolve, reject) => {
            const id = Date.now() + Math.random();
            const body = options.body ? JSON.parse(options.body) : {};
            window.__bridgeResolvers[id] = (res) => {
              var ok = res.success || res.status === 'ok' || res.status === 'success';
              resolve(new Response(JSON.stringify(res), {
                status: ok ? 200 : 500,
                headers: { 'Content-Type': 'application/json' }
              }));
            };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              id, method: options.method || 'GET', path: extractPath(url), body
            }));
            setTimeout(() => {
              if (window.__bridgeResolvers[id]) {
                delete window.__bridgeResolvers[id];
                reject(new Error('Bridge timeout'));
              }
            }, 120000);
          });
        }
        return originalFetch(url, options);
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bridge-ready' }));

      function showFatal(text) {
        try {
          var pre = document.createElement('pre');
          pre.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;margin:0;padding:16px;background:#fff;color:#c00;font-size:12px;white-space:pre-wrap;overflow:auto;z-index:999999;';
          pre.textContent = text;
          document.body.appendChild(pre);
        } catch (e) {}
      }
      window.onerror = function(message, source, lineno, colno, error) {
        showFatal('window.onerror: ' + message + '\\n@' + source + ':' + lineno + ':' + colno + '\\n' + (error && error.stack || ''));
        return false;
      };
      window.addEventListener('unhandledrejection', function(ev) {
        var r = ev.reason;
        showFatal('unhandledrejection: ' + (r && (r.stack || r.message) || String(r)));
      });

      // Check if React renders into root div
      setTimeout(function() {
        var root = document.getElementById('root');
        console.log('[Bridge] After 5s, root innerHTML length:', root ? root.innerHTML.length : 'no root');
        console.log('[Bridge] After 5s, root children:', root ? root.children.length : 'no root');
        if (root && root.innerHTML.length > 0) {
          console.log('[Bridge] React rendered successfully');
        } else {
          console.log('[Bridge] React did NOT render - root is empty');
          showFatal('[Bootstrap] React did not mount after 5s.\\nroot exists: ' + !!root + '\\ninnerHTML length: ' + (root ? root.innerHTML.length : 'n/a'));
        }
      }, 5000);
    })();
  `;

  if (webError) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, { color: '#ff6b6b' }]}>Failed to load frontend</Text>
        <Text style={[styles.text, { fontSize: 12, color: '#7a7468' }]}>{webError}</Text>
      </View>
    );
  }

  if (!machineId) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00e5ff" />
        <Text style={styles.text}>Initializing device identity...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={Platform.OS === 'ios'
          ? { uri: FileSystem.bundleDirectory + 'index.html' }
          : { uri: 'file:///android_asset/index.html' }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedBridge}
        injectedJavaScript={injectedBridge}
        onMessage={handleWebViewMessage}
        onLoad={() => { console.log('[App] WebView onLoad fired'); setWebLoading(false); }}
        onError={(e) => {
          console.error('WebView error:', e.nativeEvent);
          setWebLoading(false);
          setWebError('WebView error: ' + (e.nativeEvent.description || 'unknown'));
        }}
        onHttpError={(e) => {
          console.error('WebView HTTP error:', e.nativeEvent);
          setWebLoading(false);
          setWebError('HTTP ' + (e.nativeEvent.statusCode || 'error'));
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        renderToHardwareTextureAndroid={true}
        scalesPageToFit={true}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (url && (url.startsWith('wc:') || url.startsWith('metamask:') || url.startsWith('zerion:') || url.startsWith('trust:') || url.startsWith('cbwallet:') || url.startsWith('phantom:') || url.startsWith('solflare:'))) {
            console.log('[WebView] opening wallet deep link:', url);
            Linking.openURL(url).catch(e => console.error('[WebView] openURL error:', e));
            return false;
          }
          return true;
        }}
      />
      {webLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0a0a14', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.text}>Loading Chimera...</Text>
          {modelStatus !== 'ready' && (
            <Text style={[styles.text, { fontSize: 12, color: '#7a7468' }]}>{modelStatus}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  text: {
    color: '#18181b',
    marginTop: 16,
    fontSize: 14,
  },
});
