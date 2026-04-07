import { epsClosure } from './core.js';
import { buildGlobalMap } from './graph.js';

function stateKey(states) {
  return [...new Set(states.map((state) => state.id))].sort().join(',');
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
  let currentStates = epsClosure([start]);

  if (input === 'ε' || input === '') {
    return currentStates.some((state) => state.id === end.id);
  }

  for (const symbol of input) {
    const nextStates = [];

    for (const currentState of currentStates) {
      const transitions = currentState.trans[symbol];
      if (!transitions) continue;
      nextStates.push(...transitions.map((target) => globalMap[target.id] || target).filter(Boolean));
    }

    currentStates = epsClosure(nextStates);
  }

  return currentStates.some((state) => state.id === end.id);
}

export function generateStrings(nfa, limit = 150) {
  const { start, end } = nfa;
  const results = [];
  const globalMap = buildGlobalMap(nfa);
  const initialStates = epsClosure([start]);
  const queue = [[initialStates, '']];
  const seen = new Set([`${stateKey(initialStates)}|`]);

  const isAccepting = (states) => states.some((state) => state.id === end.id);

  if (isAccepting(initialStates)) results.push('ε');

  const alphabet = new Set();
  Object.values(globalMap).forEach((state) => {
    Object.keys(state.trans || {}).forEach((symbol) => {
      if (symbol !== 'ε') alphabet.add(symbol);
    });
  });

  if (!alphabet.size) {
    alphabet.add('a');
    alphabet.add('b');
  }

  while (queue.length && results.length < limit) {
    const [states, value] = queue.shift();

    if (value.length > 10) continue;

    for (const symbol of alphabet) {
      const nextRaw = [];

      for (const state of states) {
        const transitions = state.trans[symbol];
        if (!transitions) continue;
        nextRaw.push(...transitions.map((target) => globalMap[target.id] || target).filter(Boolean));
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

  results.sort((left, right) => {
    const leftLength = left === 'ε' ? 0 : left.length;
    const rightLength = right === 'ε' ? 0 : right.length;
    if (leftLength !== rightLength) return leftLength - rightLength;
    return left.localeCompare(right);
  });

  return [...new Set(results)].slice(0, limit);
}
