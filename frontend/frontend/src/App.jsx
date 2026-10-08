import { useState } from "react";
import "./App.css";

const CATEGORIES = [
  { name: "Normal",     key: "normal",     label: "No Clinical Concern" },
  { name: "Depression", key: "depression", label: "Depressive Indicators" },
  { name: "Anxiety",    key: "anxiety",    label: "Anxiety Indicators" },
  { name: "Suicidal",   key: "suicidal",   label: "Suicidal Ideation" },
];

/* ── SVG Icons ─────────────────────────────────────────── */
const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.24Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.24Z"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────── */
const getWordCount = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export default function App() {
  const [text,    setText]    = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [history, setHistory] = useState([]);

  const analyzeText = async () => {
    if (!text.trim()) {
      setError("Please enter a patient statement before running the analysis.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: text.trim() }),
      });
      if (!response.ok) throw new Error("The prediction service is currently unavailable.");
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const analysis = {
        id:              Date.now(),
        text:            text.trim(),
        prediction:      data.prediction,
        confidence:      data.confidence,
        confidenceLevel: data.confidence_level,
        isAmbiguous:     data.is_ambiguous,
        runnerUp:        data.runner_up,
        safetyOverride:  data.safety_override,
        warnings:        data.warnings || [],
        wordCount:       data.word_count,
        probabilities:   data.probabilities,
        description:     data.description,
        disclaimer:      data.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setResult(analysis);
      setHistory((prev) => [analysis, ...prev]);
    } catch (err) {
      setError(err.message || "Unable to complete the analysis. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyzeText();
    }
  };

  const wordCount  = getWordCount(text);
  const predKey    = result ? result.prediction.toLowerCase() : null;
  const category   = CATEGORIES.find((c) => c.name === result?.prediction);

  return (
    <div className="app-shell">

      {/* ═══════════════════════════════════════════════════
          TOP NAV
      ═══════════════════════════════════════════════════ */}
      <nav className="top-nav">

        <div className="nav-brand">
          <div className="nav-logo">
            <BrainIcon />
          </div>
          <div className="nav-title-block">
            <h1>MindScan AI</h1>
            <p>Mental Health Assessment System</p>
          </div>
        </div>

        <div className="nav-right">
          <span className="nav-badge nav-badge--live">
            <span className="live-dot" /> System Active
          </span>
          <span className="nav-badge nav-badge--research">
            Research Prototype
          </span>
        </div>

      </nav>


      {/* ═══════════════════════════════════════════════════
          WORKSPACE
      ═══════════════════════════════════════════════════ */}
      <div className="workspace">

        {/* ─── MAIN COLUMN ───────────────────────────────── */}
        <main className="main-column">

          {/* PATIENT STATEMENT INPUT */}
          <div className="clinical-card">

            <div className="card-header">
              <div className="card-header-left">
                <div className="card-icon">
                  <ClipboardIcon />
                </div>
                <div>
                  <div className="card-title">Patient Statement</div>
                  <div className="card-subtitle">Enter the subject's self-reported statement for classification</div>
                </div>
              </div>
            </div>

            <div className="card-body">
              <label className="field-label" htmlFor="patient-input">
                Statement Text
              </label>

              <textarea
                id="patient-input"
                className="text-field"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. I have been feeling empty and hopeless for several weeks and I have lost interest in the things I used to enjoy..."
                rows={6}
              />

              <div className="input-toolbar">
                <span className="char-stats">
                  {text.length > 0 ? (
                    <>
                      {text.length} chars ·{" "}
                      <span className={wordCount < 8 ? "word-count-warn" : "word-count-ok"}>
                        {wordCount} words
                        {wordCount < 8 && wordCount > 0 && " ⚠ add more for reliability"}
                      </span>
                    </>
                  ) : (
                    <span>Begin typing a statement above</span>
                  )}
                </span>
                <span className="shortcut-tag">Ctrl + Enter</span>
              </div>

              <button
                className="analyse-btn"
                onClick={analyzeText}
                disabled={loading || !text.trim()}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <ActivityIcon />
                    Run Clinical Analysis
                  </>
                )}
              </button>
            </div>

          </div>


          {/* ERROR */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>Analysis Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}


          {/* ─── RESULT CARD ────────────────────────────── */}
          {result && (
            <div className="result-card">

              {/* Diagnosis header strip */}
              <div className={`result-header result-header--${predKey}`}>
                <div>
                  <div className={`result-eyebrow ${result.safetyOverride ? "result-eyebrow--override" : `result-eyebrow--${predKey}`}`}>
                    {result.safetyOverride ? "⛔ Safety Override Active" : "Clinical Assessment Result"}
                  </div>
                  <div className={`result-diagnosis result-diagnosis--${predKey}`}>
                    {result.prediction}
                  </div>
                  {category && (
                    <div style={{ fontSize: "0.78rem", marginTop: "0.3rem", opacity: 0.7, color: "inherit" }}>
                      {category.label}
                    </div>
                  )}
                </div>

                <div className="conf-badge">
                  <span className="conf-label">Confidence</span>
                  <span className="conf-value">{result.confidence}%</span>
                  <span className={`conf-tier conf-tier--${result.confidenceLevel || "medium"}`}>
                    {(result.confidenceLevel || "medium").toUpperCase()}
                  </span>
                </div>
              </div>


              {/* White body */}
              <div className="result-body">

                {/* WARNINGS */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="warnings-block">
                    {result.warnings.map((w, i) => (
                      <div
                        key={i}
                        className={`warning-row ${result.safetyOverride && i === 0 ? "warning-row--safety" : "warning-row--info"}`}
                      >
                        <span className="warning-row-icon">
                          {result.safetyOverride && i === 0 ? "⛔" : "⚠️"}
                        </span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}


                {/* CONFIDENCE METER */}
                <div className="conf-meter-block">
                  <div className="conf-meter-header">
                    <span className="conf-meter-label">Model Confidence</span>
                    <span className="conf-meter-value">{result.confidence}%</span>
                  </div>
                  <div className="conf-track">
                    <div
                      className={`conf-fill conf-fill--${result.confidenceLevel || "medium"}`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>


                {/* PROBABILITY BREAKDOWN */}
                {result.probabilities && (
                  <div>
                    <div className="prob-section-title">Diagnostic Probability Breakdown</div>
                    <div className="prob-list">
                      {CATEGORIES.map((cat) => {
                        const prob = result.probabilities[cat.name] ?? 0;
                        return (
                          <div className="prob-row" key={cat.key}>
                            <div className="prob-row-top">
                              <div className="prob-class">
                                <span className={`class-dot class-dot--${cat.key}`} />
                                {cat.name}
                              </div>
                              <span className="prob-value">{prob}%</span>
                            </div>
                            <div className="prob-track">
                              <div
                                className={`prob-fill prob-fill--${cat.key}`}
                                style={{ width: `${prob}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* INTERPRETATION */}
                {result.description && (
                  <div className="interpretation-block">
                    <div className="interp-icon">i</div>
                    <div>
                      <span className="interp-label">System Interpretation</span>
                      <p className="interp-text">{result.description}</p>
                    </div>
                  </div>
                )}


                {/* DISCLAIMER */}
                <div className="disclaimer-block">
                  <span className="disclaimer-icon">⚠️</span>
                  <div>
                    <span className="disclaimer-title">Clinical Disclaimer</span>
                    <p className="disclaimer-text">
                      {result.disclaimer || "This is a research classification and is not a medical diagnosis."}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* CATEGORY REFERENCE */}
          <div className="category-ref">
            <div className="category-ref-title">Supported Diagnostic Categories</div>
            <div className="category-chips">
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className={`category-chip category-chip--${cat.key}`}>
                  <span className={`chip-dot chip-dot--${cat.key}`} />
                  {cat.name}
                </div>
              ))}
            </div>
          </div>


          <footer className="main-footer">
            MindScan AI · Research Prototype · Not for clinical use · Powered by DistilRoBERTa
          </footer>

        </main>


        {/* ─── SIDEBAR ─────────────────────────────────── */}
        <aside className="sidebar">

          {/* Session History */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div>
                <div className="sidebar-card-label">Session Log</div>
                <div className="sidebar-card-title">Recent Assessments</div>
              </div>
              {history.length > 0 && (
                <button className="clear-btn" onClick={() => setHistory([])}>
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <HistoryIcon />
                </div>
                <h4>No assessments yet</h4>
                <p>Run your first analysis and results will appear here for this session.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="history-item"
                    onClick={() => { setText(item.text); setResult(item); }}
                  >
                    <div className="history-item-top">
                      <div className="history-class">
                        <span className={`history-dot history-dot--${item.prediction.toLowerCase()}`} />
                        {item.prediction}
                      </div>
                      <time className="history-time">{item.time}</time>
                    </div>
                    <p className="history-excerpt">{item.text}</p>
                    <div className="history-conf">
                      <span>Confidence</span>
                      <strong>{item.confidence}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* System Info Panel */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <div>
                <div className="sidebar-card-label">System</div>
                <div className="sidebar-card-title">Model Information</div>
              </div>
            </div>
            <div className="info-panel">
              <div className="info-row">
                <div className="info-row-icon">🧠</div>
                <div className="info-row-text">
                  <strong>DistilRoBERTa-512</strong> fine-tuned transformer model
                </div>
              </div>
              <div className="info-row">
                <div className="info-row-icon">🔢</div>
                <div className="info-row-text">
                  <strong>4 classes:</strong> Normal · Depression · Anxiety · Suicidal
                </div>
              </div>
              <div className="info-row">
                <div className="info-row-icon">🛡️</div>
                <div className="info-row-text">
                  <strong>Hybrid safety layer</strong> active for high-risk escalation
                </div>
              </div>
              <div className="info-row">
                <div className="info-row-icon">📊</div>
                <div className="info-row-text">
                  <strong>96% accuracy</strong> across 26 evaluation samples
                </div>
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}