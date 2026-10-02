// Petit client MQTT 3.1.1 sur WebSocket (sans bibliothèque) : connexion, abonnement,
// publication (QoS 0, avec ou sans « retain »), maintien de la connexion et reconnexion.
// Sert de relais public entre la tablette du live et les téléphones des viewers.

const enc = new TextEncoder();
const dec = new TextDecoder();

function str(s) {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 255, ...b];
}

function remaining(n) {
  const out = [];
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 128;
    out.push(byte);
  } while (n > 0);
  return out;
}

function packet(type, body) {
  const head = [type, ...remaining(body.length)];
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}

export class MqttClient {
  // url : wss://…/mqtt ; handlers : { onMessage(topic, text), onStatus(connected) }
  constructor(url, { onMessage, onStatus, keepAlive = 30 } = {}) {
    this.url = url;
    this.onMessage = onMessage || (() => {});
    this.onStatus = onStatus || (() => {});
    this.keepAlive = keepAlive;
    this.subs = new Set();
    this.connected = false;
    this.closed = false;
    this.buf = new Uint8Array(0);
    this.retry = 0;
    this.packetId = 1;
    this.connect();
  }

  connect() {
    if (this.closed) return;
    let ws;
    try {
      ws = new WebSocket(this.url, ['mqtt']);
    } catch (e) {
      this.schedule();
      return;
    }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => {
      const id = `portes-${Math.random().toString(36).slice(2, 12)}`;
      const body = [...str('MQTT'), 4, 0x02, this.keepAlive >> 8, this.keepAlive & 255, ...str(id)];
      ws.send(packet(0x10, body));
    };
    ws.onmessage = (e) => this.receive(new Uint8Array(e.data));
    ws.onclose = () => this.lost();
    ws.onerror = () => { try { ws.close(); } catch (err) { /* ignore */ } };
  }

  lost() {
    clearInterval(this.ping);
    this.buf = new Uint8Array(0);
    if (this.connected) {
      this.connected = false;
      this.onStatus(false);
    }
    this.schedule();
  }

  schedule() {
    if (this.closed) return;
    const delay = Math.min(30000, 1000 * 2 ** this.retry++) + Math.random() * 1000;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), delay);
  }

  receive(chunk) {
    const all = new Uint8Array(this.buf.length + chunk.length);
    all.set(this.buf, 0);
    all.set(chunk, this.buf.length);
    let pos = 0;
    while (pos + 2 <= all.length) {
      let len = 0;
      let mult = 1;
      let i = pos + 1;
      let done = false;
      while (i < all.length && i < pos + 5) {
        const b = all[i++];
        len += (b & 127) * mult;
        mult *= 128;
        if (!(b & 128)) { done = true; break; }
      }
      if (!done || i + len > all.length) break;
      this.handle(all[pos], all.subarray(i, i + len));
      pos = i + len;
    }
    this.buf = all.slice(pos);
  }

  handle(head, body) {
    const type = head >> 4;
    if (type === 2) { // CONNACK
      if (body[1] !== 0) { this.ws.close(); return; }
      this.connected = true;
      this.retry = 0;
      this.subs.forEach((t) => this.sendSubscribe(t));
      clearInterval(this.ping);
      this.ping = setInterval(() => this.send(new Uint8Array([0xc0, 0])), (this.keepAlive * 1000) / 2);
      this.onStatus(true);
    } else if (type === 3) { // PUBLISH
      const tlen = (body[0] << 8) | body[1];
      const topic = dec.decode(body.subarray(2, 2 + tlen));
      let start = 2 + tlen;
      if ((head >> 1) & 3) start += 2; // identifiant de paquet (QoS > 0)
      this.onMessage(topic, dec.decode(body.subarray(start)));
    }
  }

  send(bytes) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(bytes);
      return true;
    }
    return false;
  }

  sendSubscribe(topic) {
    const id = this.packetId++ & 0xffff || 1;
    this.send(packet(0x82, [id >> 8, id & 255, ...str(topic), 0]));
  }

  subscribe(topic) {
    this.subs.add(topic);
    if (this.connected) this.sendSubscribe(topic);
  }

  // Publication QoS 0. retain : le relais garde le dernier message pour les nouveaux venus.
  publish(topic, text, retain = false) {
    if (!this.connected) return false;
    const payload = enc.encode(text);
    const t = str(topic);
    const body = new Uint8Array(t.length + payload.length);
    body.set(t, 0);
    body.set(payload, t.length);
    return this.send(packet(0x30 | (retain ? 1 : 0), body));
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    clearInterval(this.ping);
    try { this.send(new Uint8Array([0xe0, 0])); this.ws.close(); } catch (e) { /* ignore */ }
  }
}
