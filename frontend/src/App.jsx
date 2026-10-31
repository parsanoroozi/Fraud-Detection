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

export default function App() {
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
