import { parseRegex } from './core.js';
import { dfasAreIsomorphic, minimizeDfa, nfaToDfa } from './dfa.js';
import { generateTestStrings, testString } from './matching.js';

export function checkEquivalence(leftRegex, rightRegex) {
  const leftNfa = parseRegex(leftRegex);
  const rightNfa = parseRegex(rightRegex);

  const leftMinimal = minimizeDfa(nfaToDfa(leftNfa));
  const rightMinimal = minimizeDfa(nfaToDfa(rightNfa));
  const equivalent = dfasAreIsomorphic(leftMinimal, rightMinimal);

  if (equivalent) {
    return {
      equivalent: true,
      reason: 'Minimal DFAs are isomorphic. L(R1) = L(R2).',
      mismatch: null,
    };
  }

  for (const candidate of ['', ...generateTestStrings(7)]) {
    const leftAccepted = testString(leftNfa, candidate);
    const rightAccepted = testString(rightNfa, candidate);

    if (leftAccepted !== rightAccepted) {
      const value = candidate === '' ? 'ε' : candidate;
      return {
        equivalent: false,
        reason: `Counterexample found: ${value}`,
        mismatch: { string: value, leftAccepted, rightAccepted },
      };
    }
  }

  return {
    equivalent: false,
    reason: 'Minimal DFAs differ structurally.',
    mismatch: null,
  };
}
