import { useEffect, useRef, useState } from 'react';
import {
  buildDfaMarkup,
  buildNfaMarkup,
  generateStrings,
  generateTestStrings,
  parseRegex,
  testString,
} from './lib/regex';

const modules = [
  {
    icon: '⌨',
    title: 'Regex Palette',
    description: 'Input expressions using symbol palette',
    section: 'generate',
  },
  {
    icon: '⚖',
    title: 'Equivalence Checker',
    description: 'Compare two regex for language equality',
    section: 'validate',
  },
  {
    icon: '≡',
    title: 'String Generator',
    description: 'Generate accepted strings by length',
    section: 'generate',
  },
  {
    icon: '◎',
    title: 'Automata Visualiser',
    description: 'Render NFA / DFA diagrams visually',
    section: 'visualize',
  },
];

const howItWorks = [
  {
    icon: '⌨',
    title: 'Enter RegEx & Get Strings',
    description: 'Use the palette to input an expression and instantly view a generated set of valid strings.',
  },
  {
    icon: '⚡',
    title: 'Compare Two Expressions',
    description: 'Verify whether two expressions define the same language using the built-in equivalence checker.',
  },
  {
    icon: '◎',
    title: 'Generate Finite Automata',
    description: 'Convert a regular expression into its corresponding NFA or DFA diagram.',
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
      <nav>
        <div className="nav-logo">
          RegEx <span>Visualizer</span>
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
        <div className="hero-inner">
          <div className="hero-badge">TAFL PROJECT · NSUT · 2024UCS1647</div>

          <div className="hero-top">
            <div className="hero-text">
              <h1>
                Explore
                <br />
                <em>Regular</em>
                <br />
                Expressions
              </h1>
              <p>A complete Theory of Automata and Formal Languages toolkit. Generate strings, validate equivalence, and visualize finite automata - all in one place.</p>
              <div className="hero-actions">
                <button className="btn-primary" type="button" onClick={() => showSection('generate')}>
                  Start Exploring →
                </button>
                <button className="btn-ghost" type="button" onClick={() => showSection('visualize')}>
                  View Automata
                </button>
              </div>
            </div>

            <div className="hero-logo-card">
              <svg className="nsut-logo-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="100" cy="100" r="95" stroke="#cc0000" strokeWidth="4" fill="white" />
                <circle cx="100" cy="100" r="85" stroke="#cc0000" strokeWidth="1.5" fill="none" />
                <ellipse cx="100" cy="100" rx="60" ry="38" stroke="#cc0000" strokeWidth="2.5" fill="none" />
                <ellipse cx="100" cy="100" rx="60" ry="38" transform="rotate(60 100 100)" stroke="#cc0000" strokeWidth="2.5" fill="none" />
                <ellipse cx="100" cy="100" rx="60" ry="38" transform="rotate(120 100 100)" stroke="#cc0000" strokeWidth="2.5" fill="none" />
                <circle cx="100" cy="62" r="5" fill="#cc0000" />
                <circle cx="134" cy="81" r="5" fill="#cc0000" />
                <circle cx="134" cy="119" r="5" fill="#cc0000" />
                <circle cx="100" cy="138" r="5" fill="#cc0000" />
                <circle cx="66" cy="119" r="5" fill="#cc0000" />
                <circle cx="66" cy="81" r="5" fill="#cc0000" />
                <rect x="74" y="82" width="52" height="36" rx="3" fill="white" stroke="#cc0000" strokeWidth="2" />
                <text x="100" y="105" fontFamily="Arial" fontWeight="900" fontSize="16" fill="#cc0000" textAnchor="middle">
                  NSUT
                </text>
                <text x="100" y="168" fontFamily="Arial" fontSize="6.5" fill="#cc0000" textAnchor="middle">
                  NETAJI SUBHAS UNIVERSITY OF TECHNOLOGY
                </text>
                <text x="100" y="40" fontFamily="Arial" fontSize="6" fill="#cc0000" textAnchor="middle" transform="rotate(-2 100 40)">
                  आ नो भद्रा क्रतवो यन्तु विश्वतः
                </text>
              </svg>

              <h2>
                TAFL Project
                <br />
                Created By
                <br />
                <strong>Yash Tayal</strong>
              </h2>
              <span className="roll">2024UCS1647</span>
            </div>
          </div>
        </div>

        <div className="modules-section">
          <div className="section-label">Modules</div>
          <div className="modules-grid">
            {modules.map((module) => (
              <button key={module.title} type="button" className="module-card" onClick={() => showSection(module.section)}>
                <div className="module-icon">{module.icon}</div>
                <div>
                  <div className="module-name">{module.title}</div>
                  <div className="module-desc">{module.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="hiw-section">
          <div className="section-label">How It Works</div>
          <div className="hiw-grid">
            {howItWorks.map((card) => (
              <div key={card.title} className="hiw-card">
                <div className="hiw-icon">{card.icon}</div>
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