let stateId = 0;

function newState() {
  return { id: stateId++, trans: {}, epsilons: [] };
}

export function tokenize(re) {
  re = re.replace(/\s/g, '').replace(/ε/g, '#EPS#');
  const tokens = [];

  for (let i = 0; i < re.length; i++) {
    const ch = re[i];
    if (re.slice(i).startsWith('#EPS#')) {
      tokens.push({ type: 'lit', val: 'ε' });
      i += 4;
      continue;
    }

    if ('()|*+?'.includes(ch)) tokens.push({ type: ch });
    else tokens.push({ type: 'lit', val: ch });
  }

  return tokens;
}

export function addConcat(tokens) {
  const out = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    out.push(token);

    if (i + 1 < tokens.length) {
      const next = tokens[i + 1];
      const leftOk = token.type === 'lit' || token.type === '*' || token.type === '+' || token.type === '?' || token.type === ')';
      const rightOk = next.type === 'lit' || next.type === '(';
      if (leftOk && rightOk) out.push({ type: '.' });
    }
  }

  return out;
}

const PREC = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };

export function toPostfix(tokens) {
  const out = [];
  const ops = [];

  for (const token of tokens) {
    if (token.type === 'lit') {
      out.push(token);
      continue;
    }

    if (token.type === '(') {
      ops.push(token);
      continue;
    }

    if (token.type === ')') {
      while (ops.length && ops[ops.length - 1].type !== '(') out.push(ops.pop());
      ops.pop();
      continue;
    }

    while (ops.length && ops[ops.length - 1].type !== '(' && PREC[ops[ops.length - 1].type] >= PREC[token.type]) {
      out.push(ops.pop());
    }
    ops.push(token);
  }

  while (ops.length) out.push(ops.pop());
  return out;
}

export function buildNFA(postfix) {
  stateId = 0;
  const stack = [];

  for (const token of postfix) {
    if (token.type === 'lit') {
      const start = newState();
      const end = newState();

      if (token.val === 'ε') {
        start.epsilons.push(end);
      } else {
        if (!start.trans[token.val]) start.trans[token.val] = [];
        start.trans[token.val].push(end);
      }

      stack.push({ start, end });
      continue;
    }

    if (token.type === '.') {
      const right = stack.pop();
      const left = stack.pop();
      left.end.epsilons.push(right.start);
      stack.push({ start: left.start, end: right.end });
      continue;
    }

    if (token.type === '|') {
      const right = stack.pop();
      const left = stack.pop();
      const start = newState();
      const end = newState();
      start.epsilons.push(left.start, right.start);
      left.end.epsilons.push(end);
      right.end.epsilons.push(end);
      stack.push({ start, end });
      continue;
    }

    if (token.type === '*') {
      const inner = stack.pop();
      const start = newState();
      const end = newState();
      start.epsilons.push(inner.start, end);
      inner.end.epsilons.push(inner.start, end);
      stack.push({ start, end });
      continue;
    }

    if (token.type === '+') {
      const inner = stack.pop();
      const start = newState();
      const end = newState();
      start.epsilons.push(inner.start);
      inner.end.epsilons.push(inner.start, end);
      stack.push({ start, end });
      continue;
    }

    if (token.type === '?') {
      const inner = stack.pop();
      const start = newState();
      const end = newState();
      start.epsilons.push(inner.start, end);
      inner.end.epsilons.push(end);
      stack.push({ start, end });
    }
  }

  if (stack.length !== 1) return null;
  return stack.pop();
}

export function epsClosure(states) {
  const closure = new Set(states.map((state) => state.id));
  const stateMap = {};

  states.forEach((state) => {
    stateMap[state.id] = state;
  });

  function addToMap(state) {
    if (stateMap[state.id]) return;
    stateMap[state.id] = state;
    state.epsilons.forEach(addToMap);
    Object.values(state.trans).forEach((arr) => arr.forEach(addToMap));
  }

  states.forEach(addToMap);

  const worklist = [...states];
  while (worklist.length) {
    const state = worklist.pop();
    for (const target of state.epsilons) {
      if (!closure.has(target.id)) {
        closure.add(target.id);
        stateMap[target.id] = target;
        worklist.push(target);
      }
    }
  }

  return [...closure].map((id) => stateMap[id]).filter(Boolean);
}

export function parseRegex(re) {
  if (!re.trim()) throw new Error('Empty expression');
  const tokens = tokenize(re);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);
  const nfa = buildNFA(postfix);

  if (!nfa) throw new Error('Invalid expression');
  return nfa;
}

function stateKey(states) {
  return [...new Set(states.map((state) => state.id))].sort().join(',');
}

function buildGlobalMap(nfa) {
  const globalMap = {};

  function visit(state, visited = new Set()) {
    if (!state || visited.has(state.id)) return;
    visited.add(state.id);
    globalMap[state.id] = state;
    state.epsilons.forEach((next) => visit(next, visited));
    Object.values(state.trans).forEach((arr) => arr.forEach((next) => visit(next, visited)));
  }

  visit(nfa.start);
  globalMap[nfa.end.id] = nfa.end;
  return globalMap;
}

export function collectStates(nfa) {
  const states = {};

  function visit(state) {
    if (!state || states[state.id]) return;
    states[state.id] = state;
    state.epsilons.forEach(visit);
    Object.values(state.trans).forEach((arr) => arr.forEach(visit));
  }

  visit(nfa.start);
  states[nfa.end.id] = nfa.end;
  return Object.values(states);
}

export function generateStrings(nfa, limit = 150) {
  const { start, end } = nfa;
  const results = [];
  const globalMap = buildGlobalMap(nfa);

  const initialStates = epsClosure([start]);
  const queue = [[initialStates, '']];
  const seen = new Set([`${stateKey(initialStates)}|`]);

  function isAccepting(states) {
    return states.some((state) => state.id === end.id);
  }

  if (isAccepting(initialStates)) results.push('ε');

  const alphabet = new Set();
  Object.values(globalMap).forEach((state) => {
    Object.keys(state.trans).forEach((symbol) => {
      if (symbol !== 'ε') alphabet.add(symbol);
    });
  });

  if (!alphabet.size) alphabet.add('a').add('b');

  while (queue.length && results.length < limit) {
    const [states, value] = queue.shift();

    if (value.length > 10) continue;

    for (const symbol of alphabet) {
      const nextRaw = [];
      for (const state of states) {
        if (state.trans[symbol]) {
          nextRaw.push(...state.trans[symbol].map((next) => globalMap[next.id] || next).filter(Boolean));
        }
      }

      if (!nextRaw.length) continue;

      const nextStates = epsClosure(nextRaw);
      const nextValue = value + symbol;
      const key = `${stateKey(nextStates)}|${nextValue}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (isAccepting(nextStates) && nextValue.length > 0) results.push(nextValue);
      queue.push([nextStates, nextValue]);
    }
  }

  results.sort((a, b) => {
    const leftLength = a === 'ε' ? 0 : a.length;
    const rightLength = b === 'ε' ? 0 : b.length;
    if (leftLength !== rightLength) return leftLength - rightLength;
    return a < b ? -1 : 1;
  });

  return [...new Set(results)].slice(0, limit);
}

export function generateTestStrings(maxLen) {
  const strings = [''];
  const alphabet = ['a', 'b'];

  function generate(value) {
    if (value.length > maxLen) return;
    strings.push(value);
    for (const symbol of alphabet) generate(value + symbol);
  }

  for (const symbol of alphabet) generate(symbol);
  return strings;
}

export function testString(nfa, input) {
  const { start, end } = nfa;
  const globalMap = buildGlobalMap(nfa);

  let states = epsClosure([start]);

  if (input === 'ε' || input === '') {
    return states.some((state) => state.id === end.id);
  }

  for (const symbol of input) {
    const nextRaw = [];
    for (const state of states) {
      if (state.trans[symbol]) {
        nextRaw.push(...state.trans[symbol].map((next) => globalMap[next.id] || next).filter(Boolean));
      }
    }
    states = epsClosure(nextRaw);
  }

  return states.some((state) => state.id === end.id);
}

export function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function layoutPositions(stateList, width, height) {
  const positions = {};
  const count = stateList.length;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(160, Math.max(80, count * 25));

  if (count <= 2) {
    stateList.forEach((state, index) => {
      positions[state.id] = { x: 200 + index * 300, y: centerY };
    });
  } else if (count <= 5) {
    stateList.forEach((state, index) => {
      positions[state.id] = { x: 80 + (index * (width - 160)) / (count - 1), y: centerY };
    });
  } else {
    stateList.forEach((state, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2;
      positions[state.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }

  return positions;
}

function stateCircleSVG(x, y, radius, label, isStart, isAccept) {
  let svg = `<circle cx="${x}" cy="${y}" r="${radius}" fill="#161616" stroke="${isStart ? '#c8f135' : 'rgba(200,241,53,0.5)'}" stroke-width="${isStart ? '2.5' : '2'}"/>`;
  if (isAccept) {
    svg += `<circle cx="${x}" cy="${y}" r="${radius - 6}" fill="none" stroke="rgba(200,241,53,0.5)" stroke-width="1.5"/>`;
  }
  svg += `<text x="${x}" y="${y}" fill="#f0f0f0" font-family="Space Mono,monospace" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="central">${label}</text>`;
  return svg;
}

function startArrowSVG(x, y, radius) {
  return `<path d="M${x - radius - 35},${y} L${x - radius - 2},${y}" stroke="rgba(200,241,53,0.6)" stroke-width="1.8" marker-end="url(#arrowhead)" fill="none"/>`;
}

function selfLoopSVG(x, y, radius, label) {
  return `<path d="M${x - 12},${y - radius} C${x - 30},${y - radius - 55} ${x + 30},${y - radius - 55} ${x + 12},${y - radius}" fill="none" stroke="rgba(200,241,53,0.45)" stroke-width="1.8" marker-end="url(#arrowhead)"/><text x="${x}" y="${y - radius - 30}" fill="#c8f135" font-family="Space Mono,monospace" font-size="11" text-anchor="middle" dominant-baseline="central">${label}</text>`;
}

export function buildNfaMarkup(nfa, re) {
  const states = collectStates(nfa).sort((a, b) => a.id - b.id);
  const count = states.length;
  const width = 860;
  const height = 400;
  const viewHeight = height + 40;
  const positions = layoutPositions(states, width, height);
  const radius = 26;
  const pairTrans = {};

  for (const state of states) {
    for (const [symbol, targets] of Object.entries(state.trans || {})) {
      for (const target of targets || []) {
        const key = `${state.id}-${target.id}`;
        if (!pairTrans[key]) pairTrans[key] = [];
        pairTrans[key].push(symbol);
      }
    }
    for (const target of state.epsilons || []) {
      const key = `${state.id}-${target.id}`;
      if (!pairTrans[key]) pairTrans[key] = [];
      pairTrans[key].push('ε');
    }
  }

  let markup = `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(200,241,53,0.7)"/></marker></defs>`;
  const drawnPairs = {};

  for (const [pairKey, symbols] of Object.entries(pairTrans)) {
    const [fromId, toId] = pairKey.split('-').map(Number);
    const from = positions[fromId];
    const to = positions[toId];
    if (!from || !to) continue;

    const label = symbols.join(',');

    if (fromId === toId) {
      markup += selfLoopSVG(from.x, from.y, radius, label);
      continue;
    }

    const pairRouteKey = [fromId, toId].sort().join('|');
    const alreadyDrawn = drawnPairs[pairRouteKey];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const ux = dx / distance;
    const uy = dy / distance;
    const px = -uy;
    const py = ux;
    const curve = alreadyDrawn ? 35 : 0;

    const x1 = from.x + ux * radius;
    const y1 = from.y + uy * radius;
    const x2 = to.x - ux * radius;
    const y2 = to.y - uy * radius;
    const mx = (x1 + x2) / 2 + px * curve;
    const my = (y1 + y2) / 2 + py * curve;

    markup += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="rgba(200,241,53,0.45)" stroke-width="1.8" marker-end="url(#arrowhead)"/>`;
    const lx = x1 * 0.2 + mx * 0.6 + x2 * 0.2;
    const ly = y1 * 0.2 + my * 0.6 + y2 * 0.2 - 9;
    markup += `<text x="${lx}" y="${ly}" fill="#c8f135" font-family="Space Mono,monospace" font-size="11" text-anchor="middle" dominant-baseline="central">${label}</text>`;
    drawnPairs[pairRouteKey] = true;
  }

  for (const state of states) {
    const point = positions[state.id];
    if (!point) continue;
    const isStart = state.id === nfa.start.id;
    const isAccept = state.id === nfa.end.id;
    markup += stateCircleSVG(point.x, point.y, radius, `q${state.id}`, isStart, isAccept);
    if (isStart) markup += startArrowSVG(point.x, point.y, radius);
  }

  markup += `<text x="${width / 2}" y="${viewHeight - 10}" font-family="Space Mono,monospace" font-size="11" fill="#555" text-anchor="middle">NFA for: ${escapeHtml(re)}</text>`;

  return { markup, viewBox: `0 0 ${width} ${viewHeight}`, height: viewHeight };
}

export function buildDFA(nfa) {
  const globalMap = buildGlobalMap(nfa);
  const alphabet = new Set();

  Object.values(globalMap).forEach((state) => {
    Object.keys(state.trans).forEach((symbol) => {
      if (symbol !== 'ε') alphabet.add(symbol);
    });
  });

  function setKey(ids) {
    return [...new Set(ids)].sort((left, right) => left - right).join(',');
  }

  const startIds = epsClosure([nfa.start]).map((state) => state.id);
  const queue = [startIds];
  const dfaStates = { [setKey(startIds)]: { ids: startIds, id: 0 } };
  const dfaTrans = {};
  const visited = new Set([setKey(startIds)]);
  let nextId = 1;

  while (queue.length) {
    const current = queue.shift();
    const currentKey = setKey(current);
    dfaTrans[currentKey] = {};

    for (const symbol of alphabet) {
      const raw = [];
      for (const id of current) {
        const state = globalMap[id];
        if (state && state.trans[symbol]) {
          raw.push(...state.trans[symbol].map((next) => globalMap[next.id] || next).filter(Boolean));
        }
      }

      if (!raw.length) continue;

      const nextIds = epsClosure(raw).map((state) => state.id);
      const nextKey = setKey(nextIds);
      if (!dfaStates[nextKey]) dfaStates[nextKey] = { ids: nextIds, id: nextId++ };
      dfaTrans[currentKey][symbol] = nextKey;
      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push(nextIds);
      }
    }
  }

  return { dfaStates, dfaTrans, startKey: setKey(startIds), alpha: alphabet, acceptId: nfa.end.id };
}

export function buildDfaMarkup(nfa, re) {
  const { dfaStates, dfaTrans, startKey, acceptId } = buildDFA(nfa);
  const entries = Object.entries(dfaStates);
  const count = entries.length;
  const width = 860;
  const height = 420;
  const positions = {};

  if (count <= 2) {
    entries.forEach(([key], index) => {
      positions[key] = { x: 200 + index * 300, y: height / 2 };
    });
  } else if (count <= 5) {
    entries.forEach(([key], index) => {
      positions[key] = { x: 80 + (index * (width - 160)) / (count - 1), y: height / 2 };
    });
  } else {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(160, Math.max(80, count * 25));
    entries.forEach(([key], index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2;
      positions[key] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }

  const radius = 28;
  const drawnPairs = {};
  let markup = `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(200,241,53,0.7)"/></marker></defs>`;

  for (const [fromKey, transitions] of Object.entries(dfaTrans)) {
    const fromPoint = positions[fromKey];
    if (!fromPoint) continue;

    for (const [symbol, toKey] of Object.entries(transitions)) {
      const toPoint = positions[toKey];
      if (!toPoint) continue;

      if (fromKey === toKey) {
        markup += selfLoopSVG(fromPoint.x, fromPoint.y, radius, symbol);
        continue;
      }

      const pairKey = [fromKey, toKey].sort().join('|');
      const alreadyDrawn = drawnPairs[pairKey];
      const dx = toPoint.x - fromPoint.x;
      const dy = toPoint.y - fromPoint.y;
      const distance = Math.hypot(dx, dy);
      const ux = dx / distance;
      const uy = dy / distance;
      const px = -uy;
      const py = ux;
      const curve = alreadyDrawn ? 30 : 0;

      const x1 = fromPoint.x + ux * radius;
      const y1 = fromPoint.y + uy * radius;
      const x2 = toPoint.x - ux * radius;
      const y2 = toPoint.y - uy * radius;
      const mx = (x1 + x2) / 2 + px * curve;
      const my = (y1 + y2) / 2 + py * curve;

      markup += `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="rgba(200,241,53,0.45)" stroke-width="1.8" marker-end="url(#arrowhead)"/>`;
      markup += `<text x="${mx}" y="${my - 8}" fill="#c8f135" font-family="Space Mono,monospace" font-size="11" text-anchor="middle" dominant-baseline="central">${symbol}</text>`;
      drawnPairs[pairKey] = true;
    }
  }

  for (const [key, { ids, id }] of entries) {
    const point = positions[key];
    if (!point) continue;
    const isStart = key === startKey;
    const isAccept = ids.includes(acceptId);
    markup += stateCircleSVG(point.x, point.y, radius, `q${id}`, isStart, isAccept);
    if (isStart) markup += startArrowSVG(point.x, point.y, radius);
  }

  markup += `<text x="${width / 2}" y="${height - 10}" font-family="Space Mono,monospace" font-size="11" fill="#555" text-anchor="middle">DFA for: ${escapeHtml(re)}</text>`;

  return { markup, viewBox: `0 0 ${width} ${height}`, height };
}