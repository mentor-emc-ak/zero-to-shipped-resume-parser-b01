const LABD_CHAT_URL = 'https://agent.thedevlabs.io/v1/api/chat';
const REQUEST_TIMEOUT_MS = 60000;

// Thrown when labd can't give us an answer; status is what our API returns.
class LabdError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const UNAVAILABLE = 'Scoring is unavailable right now. Try again later.';

function errorForStatus(status) {
  if (status === 429) {
    return new LabdError(503, 'Too many scoring requests right now. Wait a minute and try again.');
  }
  return new LabdError(503, UNAVAILABLE);
}

// Sends one stateless chat request and returns the reply text.
async function chat(messages) {
  const apiKey = process.env.LABD_AI_KEY;
  if (!apiKey) {
    console.error('[Labd] LABD_AI_KEY is not set');
    throw new LabdError(503, UNAVAILABLE);
  }

  let res;
  try {
    res = await fetch(LABD_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[Labd] request failed: ${err.name} ${err.message}`);
    if (err.name === 'TimeoutError') {
      throw new LabdError(504, 'Scoring took too long. Try again.');
    }
    throw new LabdError(503, UNAVAILABLE);
  }

  if (!res.ok) {
    // 401 bad key, 402 allowance used up, 403 API switched off, 429 rate limited.
    console.error(`[Labd] HTTP ${res.status}`);
    throw errorForStatus(res.status);
  }

  const body = await res.json().catch(() => null);
  const content = body?.message?.content;
  if (typeof content !== 'string') {
    console.error('[Labd] response had no message.content');
    throw new LabdError(502, UNAVAILABLE);
  }
  if (typeof body.credits?.percentLeft === 'number') {
    console.log(`[Labd] ${body.credits.percentLeft}% credits left`);
  }
  return content;
}

module.exports = { chat, LabdError, LABD_CHAT_URL };
