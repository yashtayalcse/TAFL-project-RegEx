let stateId = 0;

function createState() {
  return { id: stateId++, trans: {}, epsilons: [] };
}

export function tokenize(regex) {
  const normalized = regex
    .replace(/\s/g, '')
    .replace(/⁎|∗|﹡/g, '*')
    .replace(/⁺|＋|﹢|˖/g, '+')
    .replace(/ε/g, '#EPS#');

  const tokens = [];

  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized.slice(index).startsWith('#EPS#')) {
      tokens.push({ type: 'lit', val: 'ε' });
      index += 4;
      continue;
    }

    const symbol = normalized[index];
    if ('()|*+?'.includes(symbol)) {
      tokens.push({ type: symbol });
    } else {
      tokens.push({ type: 'lit', val: symbol });
    }
  }

  return tokens;
}

export function addConcat(tokens) {
  const output = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    output.push(token);

    if (index + 1 >= tokens.length) continue;

    const nextToken = tokens[index + 1];
    const leftCanConcat = token.type === 'lit' || token.type === '*' || token.type === '+' || token.type === '?' || token.type === ')';
    const rightCanConcat = nextToken.type === 'lit' || nextToken.type === '(';
    if (leftCanConcat && rightCanConcat) output.push({ type: '.' });
  }

  return output;
}

const precedence = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };

export function toPostfix(tokens) {
  const output = [];
  const operators = [];

  for (const token of tokens) {
    if (token.type === 'lit') {
      output.push(token);
      continue;
    }

    if (token.type === '(') {
      operators.push(token);
      continue;
    }

    if (token.type === ')') {
      while (operators.length && operators[operators.length - 1].type !== '(') {
        output.push(operators.pop());
      }
      operators.pop();
      continue;
    }

    while (
      operators.length &&
      operators[operators.length - 1].type !== '(' &&
      precedence[operators[operators.length - 1].type] >= precedence[token.type]
    ) {
      output.push(operators.pop());
    }
    operators.push(token);
  }

  while (operators.length) output.push(operators.pop());
  return output;
}

export function buildNFA(postfixTokens) {
  stateId = 0;
  const stack = [];

  for (const token of postfixTokens) {
    if (token.type === 'lit') {
      const startState = createState();
      const endState = createState();

      if (token.val === 'ε') {
        startState.epsilons.push(endState);
      } else {
        if (!startState.trans[token.val]) startState.trans[token.val] = [];
        startState.trans[token.val].push(endState);
      }

      stack.push({ start: startState, end: endState });
      continue;
    }

    if (token.type === '.') {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) return null;
      left.end.epsilons.push(right.start);
      stack.push({ start: left.start, end: right.end });
      continue;
    }

    if (token.type === '|') {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) return null;
      const startState = createState();
      const endState = createState();
      startState.epsilons.push(left.start, right.start);
      left.end.epsilons.push(endState);
      right.end.epsilons.push(endState);
      stack.push({ start: startState, end: endState });
      continue;
    }

    if (token.type === '*') {
      const inner = stack.pop();
      if (!inner) return null;
      const startState = createState();
      const endState = createState();
      startState.epsilons.push(inner.start, endState);
      inner.end.epsilons.push(inner.start, endState);
      stack.push({ start: startState, end: endState });
      continue;
    }

    if (token.type === '+') {
      const inner = stack.pop();
      if (!inner) return null;
      const startState = createState();
      const endState = createState();
      startState.epsilons.push(inner.start);
      inner.end.epsilons.push(inner.start, endState);
      stack.push({ start: startState, end: endState });
      continue;
    }

    if (token.type === '?') {
      const inner = stack.pop();
      if (!inner) return null;
      const startState = createState();
      const endState = createState();
      startState.epsilons.push(inner.start, endState);
      inner.end.epsilons.push(endState);
      stack.push({ start: startState, end: endState });
    }
  }

  if (stack.length !== 1) return null;
  return stack.pop();
}

export function epsClosure(states) {
  const closure = new Map();
  const stack = [...states];

  while (stack.length) {
    const state = stack.pop();
    if (!state || closure.has(state.id)) continue;

    closure.set(state.id, state);
    for (const epsilonState of state.epsilons || []) {
      stack.push(epsilonState);
    }
  }

  return [...closure.values()];
}

export function parseRegex(regex) {
  if (!regex.trim()) throw new Error('Empty expression');
  const tokens = tokenize(regex);
  const withConcat = addConcat(tokens);
  const postfix = toPostfix(withConcat);
  const nfa = buildNFA(postfix);

  if (!nfa) throw new Error('Invalid expression');
  return nfa;
}
