import { useEffect, useRef, useState } from 'react';
import {
  buildDfaMarkup,
  buildNfaMarkup,
  generateStrings,
  generateTestStrings,
  parseRegex,
  testString,
} from './lib/regex';
import nsutLogo from '../assets/NSUT_logo.png';

const modules = [
  {
    icon: '◔',
    title: 'Regex Palette',
    section: 'generate',
  },
  {
    icon: '◑',
    title: 'Equivalence Checker',
    section: 'validate',
  },
  {
    icon: '◕',
    title: 'String Generator',
    section: 'generate',
  },
  {
    icon: '◒',
    title: 'Automata Visualiser',
    section: 'visualize',
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
  {
    icon: '↻',
    title: 'Generate Finite Automata',
    description: 'Seamlessly convert your regular expression into its corresponding NFA or DFA.',
  },
];

const paletteValues = ['a', 'b', '0', '1', '|', '*', '+', '?', '(', ')', 'ε'];
const validatorPalette = ['a', 'b', '|', '*', '(', ')'];
const visualizerPalette = ['a', 'b', '0', '1', '|', '*', '+', '?', '(', ')'];

function App() {
  const [activeSection, setActiveSection] = useState('home');

  const [generateInput, setGenerateInput] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [allStrings, setAllStrings] = useState([]);
  const [displayCount, setDisplayCount] = useState(0);

  const [validatorInput1, setValidatorInput1] = useState('');
  const [validatorInput2, setValidatorInput2] = useState('');
  const [validatorError, setValidatorError] = useState('');
  const [validatorResult, setValidatorResult] = useState(null);

  const [visualizerInput, setVisualizerInput] = useState('');
  const [visualizerType, setVisualizerType] = useState('nfa');
  const [visualizerError, setVisualizerError] = useState('');
  const [visualizerSvg, setVisualizerSvg] = useState(null);

  const generateInputRef = useRef(null);
  const validatorInput1Ref = useRef(null);
  const validatorInput2Ref = useRef(null);
  const visualizerInputRef = useRef(null);

  const pageSize = 15;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  function showSection(section) {
    setActiveSection(section);
  }

  function insertSymbol(ref, setter, symbol) {
    const input = ref.current;
    if (!input) return;

    const realSymbol = symbol === '★' ? '*' : symbol === '＋' ? '+' : symbol;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const nextValue = `${input.value.slice(0, start)}${realSymbol}${input.value.slice(end)}`;

    setter(nextValue);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + realSymbol.length;
      input.setSelectionRange(cursor, cursor);
    });
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
      setActiveSection('generate');
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
      const nfaLeft = parseRegex(left);
      const nfaRight = parseRegex(right);
      const leftStrings = new Set(generateStrings(nfaLeft, 100));
      const rightStrings = new Set(generateStrings(nfaRight, 100));

      const diffLeft = [...leftStrings].filter((candidate) => !rightStrings.has(candidate));
      const diffRight = [...rightStrings].filter((candidate) => !leftStrings.has(candidate));

      const mismatches = [];
      for (const candidate of generateTestStrings(6)) {
        const leftAccepted = testString(nfaLeft, candidate);
        const rightAccepted = testString(nfaRight, candidate);
        if (leftAccepted !== rightAccepted) {
          mismatches.push({ string: candidate || 'ε', leftAccepted, rightAccepted });
        }
      }

      const equivalent = mismatches.length === 0 && diffLeft.length === 0 && diffRight.length === 0;
      setValidatorResult({ equivalent, left, right, mismatch: mismatches[0] || null });
      setActiveSection('validate');
    } catch (error) {
      setValidatorError(`⚠ ${error.message}`);
    }
  }

  function runVisualizer() {
    const value = visualizerInput.trim();
    setVisualizerError('');
    setVisualizerSvg(null);

    try {
      const nfa = parseRegex(value);
      const svg = visualizerType === 'nfa' ? buildNfaMarkup(nfa, value) : buildDfaMarkup(nfa, value);
      setVisualizerSvg(svg);
      setActiveSection('visualize');
    } catch (error) {
      setVisualizerError(`⚠ ${error.message}`);
    }
  }

  const visibleStrings = allStrings.slice(0, displayCount);
  const hasMoreStrings = displayCount < allStrings.length;

  return (
    <>
      <nav className="bg-red-900 p-1.5 m-3">
        <div className="nav-logo">
          RegEx
        </div>
        <div className="nav-links">
          <button className={`nav-link ${activeSection === 'home' ? 'active' : ''}`} type="button" onClick={() => showSection('home')}>
            Home
          </button>
          <button className={`nav-link ${activeSection === 'generate' ? 'active' : ''}`} type="button" onClick={() => showSection('generate')}>
            Generate
          </button>
          <button className={`nav-link ${activeSection === 'validate' ? 'active' : ''}`} type="button" onClick={() => showSection('validate')}>
            Validate
          </button>
          <button className={`nav-link ${activeSection === 'visualize' ? 'active' : ''}`} type="button" onClick={() => showSection('visualize')}>
            Visualize
          </button>
        </div>
        <button className="nav-cta" type="button" onClick={() => showSection('generate')}>
          Get Started
        </button>
      </nav>

      <section id="home" className={activeSection === 'home' ? 'active' : ''}>
        <div className="landing-frame">
          <div className="landing-glow landing-glow-top" />
          <div className="landing-glow landing-glow-mid" />

          <div className="home-top-row">
            <img src={nsutLogo} alt="NSUT Logo" className="home-logo" />
            <h1 className="home-title">
              TAFL Project Created
              <br />
              By
              <br />
              <span>Yash Tayal</span>
              <br />
              <span>2024UCS1647</span>
            </h1>
          </div>

          <div className="home-modules-wrap">
            <div className="home-modules-heading">MODULES</div>
            <div className="home-modules-panel">
              {modules.map((module) => (
                <button key={module.title} type="button" className="home-module-item" onClick={() => showSection(module.section)}>
                  <span className="home-module-icon" aria-hidden="true">
                    {module.icon}
                  </span>
                  <span>{module.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="home-explore-wrap">
            <h2>
              Explore
              <br />
              <em>Regular Expressions</em>
            </h2>
            <span className="home-spark">✦</span>
          </div>

          <div className="home-how-heading-row">
            <span className="home-how-line">←</span>
            <span className="home-how-heading">HOW IT WORKS</span>
            <span className="home-how-line">→</span>
          </div>

          <div className="home-how-grid">
            {howItWorks.map((card) => (
              <div key={card.title} className="home-how-card">
                <div className="home-how-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="generate" className={activeSection === 'generate' ? 'active' : ''}>
        <div className="tool-wrap">
          <div className="tool-header">
            <h2>
              String <span>Generator</span>
            </h2>
            <p>// Enter a regular expression and generate accepted strings in increasing order of length</p>
          </div>

          <div className="palette-label">Symbol Palette - click to insert</div>
          <div className="palette-row">
            {paletteValues.map((symbol) => (
              <button key={symbol} className="palette-btn" type="button" onClick={() => insertSymbol(generateInputRef, setGenerateInput, symbol)} title={`symbol ${symbol}`}>
                {symbol === 'ε' ? 'ε' : symbol === '*' ? '★' : symbol === '+' ? '＋' : symbol}
              </button>
            ))}
          </div>

          <div className="input-group">
            <label htmlFor="gen-input">Regular Expression</label>
            <input
              id="gen-input"
              ref={generateInputRef}
              className="regex-input"
              type="text"
              placeholder="e.g.  (a|b)*ab  or  a*b+"
              spellCheck="false"
              value={generateInput}
              onChange={(event) => setGenerateInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runGenerator();
              }}
            />
          </div>

          {generateError ? <div className="error-msg show">{generateError}</div> : null}

          <button className="run-btn" type="button" onClick={runGenerator}>
            ⚡ Generate Strings
          </button>

          {allStrings.length > 0 ? (
            <div className="strings-container">
              <div className="strings-header">
                <span>Accepted Strings</span>
                <span className="strings-count">
                  {displayCount} / {allStrings.length}
                </span>
              </div>
              <div className="strings-list">
                {visibleStrings.map((candidate, index) => (
                  <span key={`${candidate}-${index}`} className={`string-chip ${candidate === 'ε' ? 'epsilon' : ''}`} style={{ animationDelay: `${index * 0.03}s` }}>
                    {candidate}
                  </span>
                ))}
              </div>
              {hasMoreStrings ? (
                <button className="load-more-btn" type="button" onClick={loadMore} style={{ margin: '0 16px 16px', width: 'calc(100% - 32px)' }}>
                  Load 15 More →
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section id="validate" className={activeSection === 'validate' ? 'active' : ''}>
        <div className="tool-wrap">
          <div className="tool-header">
            <h2>
              Equivalence <span>Checker</span>
            </h2>
            <p>// Compare two regular expressions to check if they define the same language</p>
          </div>

          <div className="eq-grid">
            <div className="input-group">
              <label htmlFor="val-input1">Regular Expression 1</label>
              <input
                id="val-input1"
                ref={validatorInput1Ref}
                className="regex-input"
                type="text"
                placeholder="e.g.  (a|b)*"
                spellCheck="false"
                value={validatorInput1}
                onChange={(event) => setValidatorInput1(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runValidator();
                }}
              />
            </div>
            <div className="input-group">
              <label htmlFor="val-input2">Regular Expression 2</label>
              <input
                id="val-input2"
                ref={validatorInput2Ref}
                className="regex-input"
                type="text"
                placeholder="e.g.  a*b*"
                spellCheck="false"
                value={validatorInput2}
                onChange={(event) => setValidatorInput2(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runValidator();
                }}
              />
            </div>
          </div>

          <div className="palette-row" style={{ marginBottom: '24px' }}>
            {validatorPalette.map((symbol) => (
              <button key={`left-${symbol}`} className="palette-btn" type="button" onClick={() => insertSymbol(validatorInput1Ref, setValidatorInput1, symbol)}>
                {symbol === '*' ? '★' : symbol}
              </button>
            ))}
            <button className="palette-btn" type="button" style={{ background: 'rgba(200,241,53,0.05)', color: '#555', cursor: 'default' }}>
              -&gt; RE1
            </button>
            {validatorPalette.map((symbol) => (
              <button key={`right-${symbol}`} className="palette-btn" type="button" onClick={() => insertSymbol(validatorInput2Ref, setValidatorInput2, symbol)}>
                {symbol === '*' ? '★' : symbol}
              </button>
            ))}
            <button className="palette-btn" type="button" style={{ background: 'rgba(200,241,53,0.05)', color: '#555', cursor: 'default' }}>
              -&gt; RE2
            </button>
          </div>

          {validatorError ? <div className="error-msg show">{validatorError}</div> : null}

          <button className="run-btn" type="button" onClick={runValidator}>
            ⚖ Check Equivalence
          </button>

          {validatorResult ? (
            <div className={`result-box show ${validatorResult.equivalent ? 'equivalent' : 'not-equivalent'}`}>
              <div className="result-emoji">{validatorResult.equivalent ? '✅' : '❌'}</div>
              <div className="result-title">{validatorResult.equivalent ? 'EQUIVALENT' : 'NOT EQUIVALENT'}</div>
              <div className="result-detail">
                {validatorResult.equivalent ? (
                  <>
                    Both expressions <code style={{ color: 'var(--lime)' }}>{validatorResult.left}</code> and <code style={{ color: 'var(--lime)' }}>{validatorResult.right}</code> define the same language L(R1) = L(R2).
                  </>
                ) : (
                  <>
                    The expressions define different languages.
                    {validatorResult.mismatch ? (
                      <>
                        <br />
                        <br />
                        Counterexample: "{validatorResult.mismatch.string}" is {validatorResult.mismatch.leftAccepted ? 'accepted' : 'rejected'} by RE1 but {validatorResult.mismatch.rightAccepted ? 'accepted' : 'rejected'} by RE2.
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section id="visualize" className={activeSection === 'visualize' ? 'active' : ''}>
        <div className="tool-wrap">
          <div className="tool-header">
            <h2>
              Automata <span>Visualiser</span>
            </h2>
            <p>// Generate NFA or DFA diagrams from your regular expression</p>
          </div>

          <div className="palette-row" style={{ marginBottom: '16px' }}>
            {visualizerPalette.map((symbol) => (
              <button key={symbol} className="palette-btn" type="button" onClick={() => insertSymbol(visualizerInputRef, setVisualizerInput, symbol)}>
                {symbol === '*' ? '★' : symbol === '+' ? '＋' : symbol}
              </button>
            ))}
          </div>

          <div className="input-group">
            <label htmlFor="viz-input">Regular Expression</label>
            <input
              id="viz-input"
              ref={visualizerInputRef}
              className="regex-input"
              type="text"
              placeholder="e.g.  a(a|b)*b"
              spellCheck="false"
              value={visualizerInput}
              onChange={(event) => setVisualizerInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runVisualizer();
              }}
            />
          </div>

          <div className="viz-options">
            <button className={`type-btn ${visualizerType === 'nfa' ? 'active' : ''}`} type="button" onClick={() => setVisualizerType('nfa')}>
              NFA
            </button>
            <button className={`type-btn ${visualizerType === 'dfa' ? 'active' : ''}`} type="button" onClick={() => setVisualizerType('dfa')}>
              DFA
            </button>
          </div>

          {visualizerError ? <div className="error-msg show">{visualizerError}</div> : null}

          <button className="run-btn" type="button" onClick={runVisualizer}>
            ◎ Generate Automata
          </button>

          <div className="canvas-wrap">
            {visualizerSvg ? (
              <svg id="automata-svg" xmlns="http://www.w3.org/2000/svg" viewBox={visualizerSvg.viewBox} width="100%" height={visualizerSvg.height} dangerouslySetInnerHTML={{ __html: visualizerSvg.markup }} />
            ) : (
              <div id="canvas-placeholder" className="canvas-placeholder">
                <div className="big-icon">◎</div>
                <p>Enter a regex and click Generate Automata</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: '#666' }}>
              <svg width="20" height="20" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(200,241,53,0.5)" strokeWidth="2" />
              </svg>
              State
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: '#666' }}>
              <svg width="20" height="20" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(200,241,53,0.8)" strokeWidth="2.5" />
              </svg>
              Start State
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: '#666' }}>
              <svg width="20" height="20" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(200,241,53,0.5)" strokeWidth="2" />
                <circle cx="10" cy="10" r="5" fill="none" stroke="rgba(200,241,53,0.5)" strokeWidth="1.5" />
              </svg>
              Accept State
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default App;