import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  checkEquivalence,
  generateStrings,
  parseRegex,
} from './lib/regex';
import nsutLogo from '../assets/NSUT_logo.png';

const modules = [
  {
    icon: '◕',
    title: 'String Generator',
    section: 'generate',
  },
  {
    icon: '◑',
    title: 'Equivalence Checker',
    section: 'validate',
  },
];

const howItWorks = [
  {
    icon: '✎',
    title: 'Enter RegEx & Get Strings',
    description: 'Use our intuitive palette to input your expression and instantly view a generated set of valid strings.',
  },
  {
    icon: '⚖',
    title: 'Compare Two Expressions',
    description: 'Verify if two expressions define the same language using our built-in equivalence checker.',
  },
  // {
  //   icon: '↻',
  //   title: 'Generate Finite Automata',
  //   description: 'Seamlessly convert your regular expression into its corresponding NFA or DFA.',
  // },
];

const paletteValues = ['a', 'b', '0', '1', '|', '*', '+', '(', ')', 'ε'];
const validatorPalette = [...paletteValues];
const quickPickValues = ['(a|b)*', '(a*b*)*', '(a|b)*ab(a|b)*', '(b|ab)*', '(a|b)*a(a|b)*a(a|b)*'];
const symbolTips = {
  '|': 'union',
  '*': 'kleene star',
  '+': 'kleene plus',
  ε: 'null (epsilon)',
};

const displayOperatorMap = {
  '*': '﹡',
  '+': '⁺',
};

const routeToSection = {
  '/': 'home',
  '/generate': 'generate',
  '/validate': 'validate',
};

const sectionToRoute = {
  home: '/',
  generate: '/generate',
  validate: '/validate',
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeSection = routeToSection[location.pathname] || 'home';

  const [generateInput, setGenerateInput] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [allStrings, setAllStrings] = useState([]);
  const [displayCount, setDisplayCount] = useState(0);

  const [validatorInput1, setValidatorInput1] = useState('');
  const [validatorInput2, setValidatorInput2] = useState('');
  const [validatorError, setValidatorError] = useState('');
  const [validatorResult, setValidatorResult] = useState(null);

  const generateInputRef = useRef(null);
  const validatorInput1Ref = useRef(null);
  const validatorInput2Ref = useRef(null);
  const validatorFocusRef = useRef('left');

  const pageSize = 15;

  useEffect(() => {
    if (!routeToSection[location.pathname]) {
      navigate('/', { replace: true });
      return;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, navigate]);

  function showSection(section) {
    const route = sectionToRoute[section] || '/';
    if (location.pathname !== route) {
      navigate(route);
    }
  }

  function insertSymbol(ref, setter, symbol) {
    const input = ref.current;
    if (!input) return;

    const displaySymbol = displayOperatorMap[symbol] || symbol;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const nextValue = `${input.value.slice(0, start)}${displaySymbol}${input.value.slice(end)}`;

    setter(nextValue);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + displaySymbol.length;
      input.setSelectionRange(cursor, cursor);
    });
  }

  function formatRegexForDisplay(value) {
    return value.replace(/\*/g, '﹡').replace(/\+/g, '⁺');
  }

  function formatPaletteSymbol(symbol) {
    if (symbol === '*') {
      return <span className="relative -top-[3px]">∗</span>;
    }
    return <span>{symbol}</span>;
  }

  function formatQuickPickLabel(value) {
    return value.replace(/\*/g, '﹡');
  }

  function applyQuickPick(section, value) {
    if (section === 'generate') {
      setGenerateInput(formatRegexForDisplay(value));
      requestAnimationFrame(() => generateInputRef.current?.focus());
      return;
    }

    if (validatorFocusRef.current === 'right') {
      setValidatorInput2(formatRegexForDisplay(value));
      requestAnimationFrame(() => validatorInput2Ref.current?.focus());
      return;
    }

    setValidatorInput1(formatRegexForDisplay(value));
    requestAnimationFrame(() => validatorInput1Ref.current?.focus());
  }

  function runGenerator() {
    const value = generateInput.trim();
    setGenerateError('');
    setAllStrings([]);
    setDisplayCount(0);

    try {
      const nfa = parseRegex(value);
      const strings = generateStrings(nfa, 150);
      setAllStrings(strings.length ? strings : ['∅ (empty language)']);
      setDisplayCount(Math.min(pageSize, strings.length || 1));
      showSection('generate');
    } catch (error) {
      setGenerateError(`⚠ ${error.message}`);
    }
  }

  function loadMore() {
    setDisplayCount((current) => Math.min(current + pageSize, allStrings.length));
  }

  function runValidator() {
    const left = validatorInput1.trim();
    const right = validatorInput2.trim();
    setValidatorError('');
    setValidatorResult(null);

    if (!left || !right) {
      setValidatorError('⚠ Please enter both expressions');
      return;
    }

    try {
      const result = checkEquivalence(left, right);
      setValidatorResult({ ...result, left, right });
      showSection('validate');
    } catch (error) {
      setValidatorError(`⚠ ${error.message}`);
    }
  }

  const visibleStrings = allStrings.slice(0, displayCount);
  const hasMoreStrings = displayCount < allStrings.length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070707] text-[#f0f0f0] [font-family:'Syne',sans-serif]">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-35" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E\")" }} />

      <nav className="fixed left-1/2 top-0 z-40 flex w-[min(1120px,calc(100%-20px))] -translate-x-1/2 items-center justify-between px-3 py-3 sm:px-5 md:px-10 md:py-4 bg-black">
        <button className="text-[1.6rem] font-extrabold leading-none tracking-[-1px] sm:text-[1.9rem] md:text-[2.1rem]" type="button" onClick={() => showSection('home')}>
          Reg<span className="text-[#b8ef39]">Ex</span>
        </button>
        <div className="hidden items-center gap-5 md:flex">
          <button className={`text-[0.98rem] font-semibold ${activeSection === 'home' ? 'text-[#b8ef39]' : 'text-white'}`} type="button" onClick={() => showSection('home')}>
            Home
          </button>
          <button className={`text-[0.98rem] font-semibold ${activeSection === 'generate' ? 'text-[#b8ef39]' : 'text-white'}`} type="button" onClick={() => showSection('generate')}>
            String Generator
          </button>
          <button className={`text-[0.98rem] font-semibold ${activeSection === 'validate' ? 'text-[#b8ef39]' : 'text-white'}`} type="button" onClick={() => showSection('validate')}>
            Equivalence Checker
          </button>
        </div>
        <button className="rounded-md bg-[#b8ef39] px-2.5 py-1.5 text-xs font-bold text-black sm:px-3 sm:py-2 sm:text-sm" type="button" onClick={() => showSection('generate')}>
          Get Started
        </button>
      </nav>

      <section id="home" className={`${activeSection === 'home' ? 'flex' : 'hidden'} justify-center pb-5 pt-14 sm:pt-16`}>
        <div className="relative min-h-[calc(100vh-22px)] w-full max-w-[1120px] overflow-hidden bg-[#050505] px-4 pb-5 pt-20 sm:px-5 sm:pb-5 sm:pt-24 md:px-[70px] md:pb-5 md:pt-24">

          <div className="relative z-10 grid items-center gap-4 md:grid-cols-[320px_1fr] md:gap-12">
            <img src={nsutLogo} alt="NSUT Logo" className="mx-auto w-[165px] md:w-[245px]" />
            <h1 className="flex flex-col items-center gap-1 text-center text-[2rem] font-bold leading-none tracking-[-0.4px] md:gap-2 md:text-[2.7rem]">
              <span>TAFL Project Created</span>
              <span>By</span>
              <span className="text-[#b8ef39]">Yash Tayal</span>
              <span className="inline-block leading-none tracking-[0.03em] text-[#b8ef39]">
                2024UCS1647
              </span>
            </h1>
          </div>

          <div className="relative z-10 mx-auto mt-30 w-full max-w-[860px] md:mt-25">
            <p className="mb-3 text-center text-base font-semibold tracking-[1px] text-[#b8ef39] md:text-[1.55rem]">MODULES</p>
            <div className="grid rounded-xl border border-white/10 bg-[#202127] md:grid-cols-2">
              {modules.map((module, index) => (
                <button
                  key={module.title}
                  type="button"
                  className={`flex min-h-[56px] items-center gap-3 px-4 py-2 text-left text-[1.05rem] font-medium text-white transition hover:bg-[#282c33] hover:text-[#b8ef39] md:min-h-[70px] md:px-8 md:text-[1.78rem] ${
                    index === 0 ? 'border-b border-white/10 md:border-b-0 md:border-r md:border-white/10' : ''
                  }`}
                  onClick={() => showSection(module.section)}
                >
                  <span className="text-base text-[#cfd3de] md:text-[1.65rem]">{module.icon}</span>
                  <span>{module.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-30 text-center md:mt-40">
            <h2 className="text-[2.4rem] font-bold leading-[1.04] tracking-[-0.7px] md:text-[4.9rem]">
              Explore
              <br />
              <em className="font-bold italic text-[#b8ef39]">Regular Expressions</em>
            </h2>
            <span className="absolute right-1 top-3 text-4xl text-[#b8ef39]/65 md:right-[100px] md:top-0 md:text-[5.2rem]">✦</span>

            <div className="pointer-events-none absolute left-1/2 h-[400px] w-[490px] top-[-60%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(165,231,60,0.38)_0%,rgba(165,231,60,0.05)_58%,transparent_100%)] blur-[52px]" />
          </div>

          <div className="relative z-10 mx-auto mt-40 flex w-full max-w-[760px] items-center justify-center gap-6">
  
            {/* LEFT SIDE: Line and Arrow */}
            <div className="flex flex-1 items-center justify-end">
              {/* CSS Arrowhead (Left) */}
              <div className="w-2 h-2 border-t-2 border-l-2 border-[#b8ef39] rotate-[-45deg] translate-x-[1px]"></div>
              {/* The Line */}
              <div className="flex-1 h-[2px] bg-[#b8ef39]"></div>
            </div>

            {/* CENTER TEXT */}
            <span className="relative shrink-0 bg-transparent px-4 text-[0.65rem] font-semibold tracking-[0.25em] text-[#b8ef39] md:text-[0.85rem] uppercase leading-none">
              What IT DOES
            </span>

            {/* RIGHT SIDE: Line and Arrow */}
            <div className="flex flex-1 items-center justify-start">
              {/* The Line */}
              <div className="flex-1 h-[2px] bg-[#b8ef39]"></div>
              {/* CSS Arrowhead (Right) */}
              <div className="w-2 h-2 border-t-2 border-r-2 border-[#b8ef39] rotate-[45deg] translate-x-[-1px]"></div>
            </div>
            
          </div>

          <div className="relative z-10 mx-auto mt-6 grid w-full max-w-[760px] gap-7 md:mt-9 md:grid-cols-2 md:gap-10 ">
            {howItWorks.map((card) => (
              <div key={card.title} className="text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#b8ef39] text-[1.6rem] font-bold text-black md:mb-4 md:h-[58px] md:w-[58px] md:text-[1.72rem]">{card.icon}</div>
                <h3 className="mb-2 text-base font-semibold md:text-[1.38rem]">{card.title}</h3>
                <p className="mx-auto max-w-[250px] text-xs leading-relaxed text-[#d9d9d9] md:text-[0.88rem]">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="generate" className={`${activeSection === 'generate' ? 'flex' : 'hidden'} min-h-screen px-2.5 pb-12 pt-24 sm:px-3 sm:pb-16 sm:pt-28 md:px-8`}>
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5 md:p-10">
          <div className="mb-8">
            <h2 className="text-4xl font-extrabold tracking-tight">
              String <span className="text-[#b8ef39]">Generator</span>
            </h2>
            <p className="mt-2 text-xs text-[#7f7f7f] [font-family:'Space_Mono',monospace]">// Enter a regular expression and generate accepted strings in increasing order of length</p>
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">Symbol Palette - click to insert</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {paletteValues.map((symbol) => (
              <button
                key={symbol}
                className="group relative inline-flex min-h-[42px] min-w-[42px] items-center justify-center overflow-visible rounded-md border border-white/10 bg-[#161616] px-3 py-2 text-base font-bold leading-none text-[#b8ef39] transition hover:border-[#b8ef39]/40 hover:bg-[#b8ef39]/10 [font-family:'Space_Mono',monospace]"
                type="button"
                onClick={() => insertSymbol(generateInputRef, setGenerateInput, symbol)}
              >
                {formatPaletteSymbol(symbol)}
                {symbolTips[symbol] ? (
                  <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#b8ef39]/35 bg-[#1c1c1c] px-2.5 py-1 text-[0.63rem] uppercase tracking-[0.07em] text-[#b8ef39] group-hover:block [font-family:'Space_Mono',monospace]">
                    {symbolTips[symbol]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">Quick Picks</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {quickPickValues.map((value) => (
              <button
                key={`generate-${value}`}
                className="rounded-full border border-[#b8ef39]/20 bg-[#b8ef39]/8 px-3 py-1.5 text-xs text-[#9ba072] transition hover:border-[#b8ef39]/45 hover:bg-[#b8ef39]/14 hover:text-[#b8ef39] [font-family:'Space_Mono',monospace]"
                type="button"
                onClick={() => applyQuickPick('generate', value)}
              >
                {formatQuickPickLabel(value)}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label htmlFor="gen-input" className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">
              Regular Expression
            </label>
            <input
              id="gen-input"
              ref={generateInputRef}
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-lg tracking-[0.04em] text-[#f0f0f0] outline-none transition focus:border-[#b8ef39]/40 [font-family:'Space_Mono',monospace]"
              type="text"
              placeholder="e.g.  (a|b)*ab  or  a*b+"
              spellCheck="false"
              value={generateInput}
              onChange={(event) => setGenerateInput(formatRegexForDisplay(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runGenerator();
              }}
            />
          </div>

          {generateError ? <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 [font-family:'Space_Mono',monospace]">{generateError}</div> : null}

          <button className="rounded-xl bg-[#b8ef39] px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#a8d420]" type="button" onClick={runGenerator}>
            ⚡ Generate Strings
          </button>

          {allStrings.length > 0 ? (
            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-[#7a7a7a] [font-family:'Space_Mono',monospace]">
                <span>Accepted Strings</span>
              </div>
              <div className="flex max-h-[320px] flex-wrap gap-2 overflow-y-auto px-5 py-4">
                {visibleStrings.map((candidate, index) => (
                  <span
                    key={`${candidate}-${index}`}
                    className={`rounded-md border px-3 py-1 text-sm [font-family:'Space_Mono',monospace] ${candidate === 'ε' ? 'border-white/15 bg-white/5 text-[#8e8e8e]' : 'border-[#b8ef39]/20 bg-[#b8ef39]/8 text-[#b8ef39]'}`}
                  >
                    {candidate}
                  </span>
                ))}
              </div>
              {hasMoreStrings ? (
                <button className="mx-4 mb-4 block w-[calc(100%-2rem)] rounded-lg border border-[#b8ef39]/35 px-4 py-2 text-sm font-semibold text-[#b8ef39] transition hover:bg-[#b8ef39]/10" type="button" onClick={loadMore}>
                  Load 15 More →
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section id="validate" className={`${activeSection === 'validate' ? 'flex' : 'hidden'} min-h-screen px-2.5 pb-12 pt-24 sm:px-3 sm:pb-16 sm:pt-28 md:px-8`}>
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5 md:p-10">
          <div className="mb-8">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Equivalence <span className="text-[#b8ef39]">Checker</span>
            </h2>
            <p className="mt-2 text-xs text-[#7f7f7f] [font-family:'Space_Mono',monospace]">// Compare two regular expressions to check if they define the same language</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="val-input1" className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">
                Regular Expression 1
              </label>
              <input
                id="val-input1"
                ref={validatorInput1Ref}
                className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-lg tracking-[0.04em] text-[#f0f0f0] outline-none transition focus:border-[#b8ef39]/40 [font-family:'Space_Mono',monospace]"
                type="text"
                placeholder="e.g.  (a|b)*"
                spellCheck="false"
                value={validatorInput1}
                onChange={(event) => setValidatorInput1(formatRegexForDisplay(event.target.value))}
                onFocus={() => {
                  validatorFocusRef.current = 'left';
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runValidator();
                }}
              />
            </div>
            <div>
              <label htmlFor="val-input2" className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">
                Regular Expression 2
              </label>
              <input
                id="val-input2"
                ref={validatorInput2Ref}
                className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-lg tracking-[0.04em] text-[#f0f0f0] outline-none transition focus:border-[#b8ef39]/40 [font-family:'Space_Mono',monospace]"
                type="text"
                placeholder="e.g.  a*b*"
                spellCheck="false"
                value={validatorInput2}
                onChange={(event) => setValidatorInput2(formatRegexForDisplay(event.target.value))}
                onFocus={() => {
                  validatorFocusRef.current = 'right';
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runValidator();
                }}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {validatorPalette.map((symbol) => (
              <button
                key={`validator-${symbol}`}
                className="group relative inline-flex min-h-[42px] min-w-[42px] items-center justify-center overflow-visible rounded-md border border-white/10 bg-[#161616] px-3 py-2 text-base font-bold leading-none text-[#b8ef39] transition hover:border-[#b8ef39]/40 hover:bg-[#b8ef39]/10 [font-family:'Space_Mono',monospace]"
                type="button"
                onClick={() => {
                  if (validatorFocusRef.current === 'right') {
                    insertSymbol(validatorInput2Ref, setValidatorInput2, symbol);
                    return;
                  }
                  insertSymbol(validatorInput1Ref, setValidatorInput1, symbol);
                }}
              >
                {formatPaletteSymbol(symbol)}
                {symbolTips[symbol] ? (
                  <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#b8ef39]/35 bg-[#1c1c1c] px-2.5 py-1 text-[0.63rem] uppercase tracking-[0.07em] text-[#b8ef39] group-hover:block [font-family:'Space_Mono',monospace]">
                    {symbolTips[symbol]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#878787] [font-family:'Space_Mono',monospace]">Quick Picks</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {quickPickValues.map((value) => (
              <button
                key={`validate-${value}`}
                className="rounded-full border border-[#b8ef39]/20 bg-[#b8ef39]/8 px-3 py-1.5 text-xs text-[#9ba072] transition hover:border-[#b8ef39]/45 hover:bg-[#b8ef39]/14 hover:text-[#b8ef39] [font-family:'Space_Mono',monospace]"
                type="button"
                onClick={() => applyQuickPick('validate', value)}
              >
                {formatQuickPickLabel(value)}
              </button>
            ))}
          </div>

          {validatorError ? <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 [font-family:'Space_Mono',monospace]">{validatorError}</div> : null}

          <button className="rounded-xl bg-[#b8ef39] px-8 py-3 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#a8d420]" type="button" onClick={runValidator}>
            ⚖ Check Equivalence
          </button>

          {validatorResult ? (
            <div
              className={`mt-7 rounded-2xl border px-8 py-8 text-center ${
                validatorResult.equivalent ? 'border-[#b8ef39]/25 bg-[#b8ef39]/8' : 'border-red-400/25 bg-red-500/8'
              }`}
            >
              <div className="mb-3 text-5xl">{validatorResult.equivalent ? '✅' : '❌'}</div>
              <div className={`mb-2 text-2xl font-extrabold ${validatorResult.equivalent ? 'text-[#b8ef39]' : 'text-red-400'}`}>
                {validatorResult.equivalent ? 'EQUIVALENT' : 'NOT EQUIVALENT'}
              </div>
              <div className="mx-auto max-w-2xl whitespace-pre-line text-sm leading-relaxed text-[#939393] [font-family:'Space_Mono',monospace]">
                {validatorResult.equivalent
                  ? `${validatorResult.reason}\n\nBoth expressions ${validatorResult.left} and ${validatorResult.right} define the same language.`
                  : `The expressions define different languages.${
                      validatorResult.mismatch
                        ? `\n\nCounterexample: "${validatorResult.mismatch.string}" is ${validatorResult.mismatch.leftAccepted ? 'accepted' : 'rejected'} by RE1 but ${validatorResult.mismatch.rightAccepted ? 'accepted' : 'rejected'} by RE2.`
                        : `\n\n${validatorResult.reason}`
                    }`}
              </div>
            </div>
          ) : null}
        </div>
      </section>

    </div>
  );
}

export default App;