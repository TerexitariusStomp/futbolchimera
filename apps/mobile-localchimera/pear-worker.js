const Hyperswarm = require('hyperswarm');
const b4a = require('b4a');

const IPC = BareKit.IPC;

function randomBytes(n) {
  const buf = b4a.alloc(n);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

function randomPeerId() {
  return b4a.toString(randomBytes(8), 'hex');
}

class PearP2P {
  constructor() {
    this.peers = new Map();
    this.isRunning = false;
    this.swarm = null;
    this.topics = new Map();
  }

  async initialize() {
    this.swarm = new Hyperswarm();

    this.swarm.on('connection', (conn, info) => {
      const peerId = (info.publicKey ? b4a.toString(info.publicKey, 'hex').slice(0, 16) : null) || randomPeerId();
      this.peers.set(peerId, { conn, info, connected: true, connectedAt: Date.now() });
      IPC.write(JSON.stringify({ type: 'peer-connected', peerId, peers: this.peers.size }));

      conn.on('data', (data) => {
        try {
          const msg = JSON.parse(b4a.toString(data));
          IPC.write(JSON.stringify({ type: 'peer-message', peerId, msg }));
        } catch (e) {
          // Non-JSON data, ignore
        }
      });

      conn.on('close', () => {
        this.peers.delete(peerId);
        IPC.write(JSON.stringify({ type: 'peer-disconnected', peerId, peers: this.peers.size }));
      });

      conn.on('error', (err) => {
        IPC.write(JSON.stringify({ type: 'peer-error', peerId, error: err.message }));
        this.peers.delete(peerId);
      });
    });
  }

  async start() {
    this.isRunning = true;
  }

  async stop() {
    if (this.swarm) {
      for (const [topic] of this.topics) {
        try { await this.swarm.leave(topic); } catch (e) {}
      }
      try { await this.swarm.destroy(); } catch (e) {}
    }
    this.peers.clear();
    this.topics.clear();
    this.isRunning = false;
  }

  generateTopic() {
    return randomBytes(32);
  }

  async joinTopic(topicBuffer, meta = {}) {
    const topicHex = b4a.toString(topicBuffer, 'hex');
    if (this.topics.has(topicHex)) return topicHex;
    await this.swarm.join(topicBuffer, { client: true, server: true });
    this.topics.set(topicHex, {
      joinedAt: Date.now(),
      scope: meta.scope || 'wiki',
      pageId: meta.pageId || null,
      title: meta.title || null,
    });
    return topicHex;
  }

  async leaveTopic(topicHex) {
    const topicBuffer = b4a.from(topicHex, 'hex');
    await this.swarm.leave(topicBuffer);
    this.topics.delete(topicHex);
  }

  async broadcast(message, scope = 'wiki', pageId = null) {
    if (!this.isRunning || this.peers.size === 0) return;
    const payload = b4a.from(
      JSON.stringify({ ...message, _swarmScope: scope, _pageId: pageId }) + '\n'
    );
    for (const [peerId, peer] of this.peers) {
      if (peer.connected && peer.conn && !peer.conn.destroyed) {
        try { peer.conn.write(payload); } catch (e) {}
      }
    }
  }

  getTopicsByScope(scope, pageId = null) {
    const results = [];
    for (const [hex, meta] of this.topics) {
      if (meta.scope === scope) {
        if (scope === 'wiki' || (scope === 'page' && meta.pageId === pageId)) {
          results.push({ topic: hex, ...meta });
        }
      }
    }
    return results;
  }

  getStatus() {
    return {
      running: this.isRunning,
      peers: this.peers.size,
      wikiTopics: this.getTopicsByScope('wiki'),
      pageTopics: this.getTopicsByScope('page'),
      topics: Array.from(this.topics.entries()).map(([hex, meta]) => ({
        topic: hex,
        short: hex.slice(0, 16) + '...',
        ...meta,
      })),
    };
  }
}

const p2p = new PearP2P();

p2p.initialize()
  .then(() => p2p.start())
  .then(() => IPC.write(JSON.stringify({ type: 'ready' })))
  .catch((err) => IPC.write(JSON.stringify({ type: 'error', error: err.message })));

IPC.on('data', async (data) => {
  try {
    const req = JSON.parse(b4a.toString(data));
    const { id, action, body } = req;
    let res;

    if (action === 'swarm/create') {
      const topic = p2p.generateTopic();
      const topicHex = await p2p.joinTopic(topic, {
        scope: body?.scope || 'wiki',
        pageId: body?.pageId || null,
        title: body?.title || null,
      });
      res = {
        success: true,
        data: {
          topic: topicHex,
          shortTopic: topicHex.slice(0, 16) + '...',
          scope: body?.scope || 'wiki',
          pageId: body?.pageId || null,
          inviteUrl: 'chimera://join/' + topicHex,
        },
      };
    } else if (action === 'swarm/join') {
      const topicHex = body?.topic;
      if (!topicHex || topicHex.length !== 64) {
        throw new Error('Valid 64-char topic hex required');
      }
      await p2p.joinTopic(b4a.from(topicHex, 'hex'), {
        scope: body?.scope || 'wiki',
        pageId: body?.pageId || null,
      });
      res = {
        success: true,
        data: {
          topic: topicHex,
          status: 'joined',
          peers: p2p.peers.size,
          inviteUrl: 'chimera://join/' + topicHex,
        },
      };
    } else if (action === 'swarm/leave') {
      const topicHex = body?.topic;
      if (!topicHex) throw new Error('topic required');
      await p2p.leaveTopic(topicHex);
      res = { success: true, data: { topic: topicHex, status: 'left' } };
    } else if (action === 'swarm/status') {
      res = { success: true, data: p2p.getStatus() };
    } else if (action === 'swarm/broadcast') {
      await p2p.broadcast(
        body?.message || {},
        body?.scope || 'wiki',
        body?.pageId || null
      );
      res = { success: true, data: { scope: body?.scope || 'wiki', pageId: body?.pageId || null } };
    } else if (action === 'swarm/topics') {
      res = {
        success: true,
        data: {
          wiki: p2p.getTopicsByScope('wiki'),
          page: body?.pageId ? p2p.getTopicsByScope('page', body.pageId) : [],
        },
      };
    } else if (action === 'swarm/stop') {
      await p2p.stop();
      res = { success: true };
    } else {
      res = { success: false, error: 'Unknown action: ' + action };
    }

    IPC.write(JSON.stringify({ type: 'response', id, ...res }));
  } catch (e) {
    IPC.write(JSON.stringify({ type: 'response', id: req?.id, success: false, error: e.message }));
  }
});
