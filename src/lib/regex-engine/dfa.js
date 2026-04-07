import { epsClosure } from './core.js';
import { buildGlobalMap } from './graph.js';

function idsKey(ids) {
  return [...new Set(ids)].sort((leftId, rightId) => leftId - rightId).join(',');
}

export function nfaToDfa(nfa) {
  const globalMap = buildGlobalMap(nfa);
  const alphabet = new Set();

  Object.values(globalMap).forEach((state) => {
    Object.keys(state.trans || {}).forEach((symbol) => {
      if (symbol !== 'ε') alphabet.add(symbol);
    });
  });

  const startIds = epsClosure([nfa.start]).map((state) => state.id);
  const startKey = idsKey(startIds);
  const dfaStates = { [startKey]: { key: startKey, id: 0, ids: startIds } };
  const dfaTrans = {};
  const acceptKeys = new Set();

  if (startIds.includes(nfa.end.id)) acceptKeys.add(startKey);

  const queue = [startIds];
  const visited = new Set([startKey]);
  let nextId = 1;

  while (queue.length) {
    const currentIds = queue.shift();
    const currentKey = idsKey(currentIds);
    dfaTrans[currentKey] = {};

    for (const symbol of alphabet) {
      const raw = [];

      for (const stateId of currentIds) {
        const state = globalMap[stateId];
        if (!state || !state.trans || !state.trans[symbol]) continue;
        raw.push(...state.trans[symbol].map((nextState) => globalMap[nextState.id] || nextState).filter(Boolean));
      }

      if (!raw.length) continue;

      const nextIds = epsClosure(raw).map((state) => state.id);
      const nextKey = idsKey(nextIds);

      if (!dfaStates[nextKey]) {
        dfaStates[nextKey] = { key: nextKey, id: nextId++, ids: nextIds };
        if (nextIds.includes(nfa.end.id)) acceptKeys.add(nextKey);
      }

      dfaTrans[currentKey][symbol] = nextKey;

      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push(nextIds);
      }
    }
  }

  return { states: dfaStates, trans: dfaTrans, startKey, acceptKeys, alpha: alphabet };
}

export function minimizeDfa(dfa) {
  const { states, trans, startKey, acceptKeys, alpha } = dfa;
  const keys = Object.keys(states);

  if (!keys.length) return dfa;

  const deadState = '__dead__';
  const allKeys = [...keys, deadState];
  const fullTrans = {};

  for (const key of allKeys) {
    fullTrans[key] = {};
    for (const symbol of alpha) {
      fullTrans[key][symbol] = trans[key]?.[symbol] || deadState;
    }
  }

  let partition = [
    new Set(allKeys.filter((key) => acceptKeys.has(key))),
    new Set(allKeys.filter((key) => !acceptKeys.has(key))),
  ].filter((group) => group.size > 0);

  const buildBlockMap = (groups) => {
    const blockMap = {};
    groups.forEach((group, index) => {
      group.forEach((key) => {
        blockMap[key] = index;
      });
    });
    return blockMap;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const blockMap = buildBlockMap(partition);
    const nextPartition = [];

    for (const group of partition) {
      if (group.size <= 1) {
        nextPartition.push(group);
        continue;
      }

      const bySignature = {};
      for (const key of group) {
        const signature = [...alpha].map((symbol) => blockMap[fullTrans[key][symbol]] ?? -1).join(',');
        if (!bySignature[signature]) bySignature[signature] = new Set();
        bySignature[signature].add(key);
      }

      const splits = Object.values(bySignature);
      if (splits.length > 1) changed = true;
      splits.forEach((split) => nextPartition.push(split));
    }

    partition = nextPartition;
  }

  const blockMap = buildBlockMap(partition);
  const blockKey = (key) => `B${blockMap[key]}`;

  const minStates = {};
  const minTrans = {};
  const minAccept = new Set();

  for (const group of partition) {
    const representative = [...group][0];
    if (representative === deadState) continue;

    const groupKey = blockKey(representative);
    minStates[groupKey] = { key: groupKey, id: blockMap[representative] };
    minTrans[groupKey] = {};

    if ([...group].some((key) => acceptKeys.has(key))) minAccept.add(groupKey);

    for (const symbol of alpha) {
      const destination = fullTrans[representative][symbol];
      if (destination !== deadState) {
        minTrans[groupKey][symbol] = blockKey(destination);
      }
    }
  }

  return {
    states: minStates,
    trans: minTrans,
    startKey: blockKey(startKey),
    acceptKeys: minAccept,
    alpha,
  };
}

export function dfasAreIsomorphic(leftDfa, rightDfa) {
  const alphabet = [...new Set([...leftDfa.alpha, ...rightDfa.alpha])].sort();

  if (Object.keys(leftDfa.states).length !== Object.keys(rightDfa.states).length) return false;

  const mapLeftToRight = new Map();
  const mapRightToLeft = new Map();
  const queue = [[leftDfa.startKey, rightDfa.startKey]];

  mapLeftToRight.set(leftDfa.startKey, rightDfa.startKey);
  mapRightToLeft.set(rightDfa.startKey, leftDfa.startKey);

  while (queue.length) {
    const [leftKey, rightKey] = queue.shift();

    if (leftDfa.acceptKeys.has(leftKey) !== rightDfa.acceptKeys.has(rightKey)) return false;

    for (const symbol of alphabet) {
      const nextLeft = leftDfa.trans[leftKey]?.[symbol];
      const nextRight = rightDfa.trans[rightKey]?.[symbol];

      if (!nextLeft && !nextRight) continue;
      if (!nextLeft || !nextRight) return false;

      if (mapLeftToRight.has(nextLeft)) {
        if (mapLeftToRight.get(nextLeft) !== nextRight) return false;
        continue;
      }

      if (mapRightToLeft.has(nextRight) && mapRightToLeft.get(nextRight) !== nextLeft) return false;

      mapLeftToRight.set(nextLeft, nextRight);
      mapRightToLeft.set(nextRight, nextLeft);
      queue.push([nextLeft, nextRight]);
    }
  }

  return true;
}
