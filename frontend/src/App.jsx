import { useState } from "react";

const SAMPLES = {
  spam: "URGENT! Your mobile number has won a 2000 pound cash prize. To claim, call 09061701461 now. Claim code KL341. Valid 12 hours only.",
  ham: "Hey, I'm running about 15 minutes late. Can you start the meeting without me and I'll join as soon as I get there?",
};

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function App() {
  // index.html already set data-theme from localStorage / system preference
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  }

  function fill(value) {
    setText(value);
    setResult(null);
    setError("");
  }

  const isSpam = result?.prediction === 1;
  const confidence = result?.confidence != null ? Math.round(result.confidence * 100) : null;

  return (
    <div className="page">
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <main className="card">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        <header className="header">
          <div className="logo"><ShieldIcon /></div>
          <div>
            <h1>Spam Detector</h1>
            <p className="subtitle">Paste an email or message and the model will tell you if it's spam.</p>
          </div>
        </header>

        <div className="field">
          <textarea
            rows={8}
            placeholder="Paste the email text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && check()}
          />
          <div className="field-footer">
            <div className="samples">
              <span>Try:</span>
              <button className="chip" onClick={() => fill(SAMPLES.spam)}>Spam example</button>
              <button className="chip" onClick={() => fill(SAMPLES.ham)}>Normal example</button>
              {text && <button className="chip ghost" onClick={() => fill("")}>Clear</button>}
            </div>
            <span className="count">{text.length} chars</span>
          </div>
        </div>

        <button className="primary" onClick={check} disabled={loading || !text.trim()}>
          {loading ? <span className="spinner" /> : "Analyze"}
          {!loading && <kbd>Ctrl ↵</kbd>}
        </button>

        {error && <p className="error">{error}</p>}

        {result && (
          <section className={`result ${isSpam ? "spam" : "ham"}`} key={text + result.prediction}>
            <div className="result-icon">{isSpam ? <AlertIcon /> : <CheckIcon />}</div>
            <div className="result-body">
              <div className="result-label">{isSpam ? "Spam" : "Not spam"}</div>
              <div className="result-hint">
                {isSpam ? "This looks like spam. Don't click links or reply." : "This message looks safe."}
              </div>
              {confidence != null && (
                <div className="meter">
                  <div className="meter-bar"><div className="meter-fill" style={{ width: `${confidence}%` }} /></div>
                  <span>{confidence}% confident</span>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="footer">CountVectorizer + Multinomial Naive Bayes · FastAPI · React</footer>
      </main>
    </div>
  );
}
