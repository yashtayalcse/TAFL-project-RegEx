export function buildGlobalMap(nfa) {
  const globalMap = {};
  const stack = [nfa?.start, nfa?.end].filter(Boolean);
  const visited = new Set();

  while (stack.length) {
    const state = stack.pop();
    if (!state || visited.has(state.id)) continue;

    visited.add(state.id);
    globalMap[state.id] = state;

    for (const epsilonState of state.epsilons || []) {
      stack.push(epsilonState);
    }

    for (const targets of Object.values(state.trans || {})) {
      for (const target of targets || []) {
        stack.push(target);
      }
    }
  }

  return globalMap;
}
