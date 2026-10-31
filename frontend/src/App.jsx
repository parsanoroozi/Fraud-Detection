import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function check() {
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

  const isSpam = result?.prediction === 1;

  return (
    <main className="container">
      <h1>Email Spam Detector</h1>
      <textarea
        rows={10}
        placeholder="Paste the email text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={check} disabled={loading || !text.trim()}>
        {loading ? "Checking..." : "Check"}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className={`result ${isSpam ? "spam" : "ham"}`}>
          {isSpam ? "SPAM" : "NOT SPAM"}
        </div>
      )}
    </main>
  );
}
