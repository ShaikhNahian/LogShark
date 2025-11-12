import { useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function Home() {
  const [file, setFile] = useState(null);

  // For Q&A on uploaded logs
  const [lastUploadedLog, setLastUploadedLog] = useState(null); // stores the raw log text from upload
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]); // [{role:'user'|'assistant', content} ]
  const [uploading, setUploading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);

  // Upload only — no automatic analyze
  const handleUpload = async () => {
    if (!file) return alert("Choose a file first");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("logfile", file);
      const upRes = await axios.post("http://localhost:5000/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const logData = upRes.data.logData;
      setLastUploadedLog(logData); // save for Q/A
      // reset chat history when a new file is uploaded
      setChatHistory([]);
      alert("Upload complete — you can now ask questions about the uploaded log.");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check backend logs.");
    } finally {
      setUploading(false);
    }
  };

  // Ask question about the uploaded log (calls backend /query)
  const askUploadedLog = async () => {
    if (!lastUploadedLog) return alert("No uploaded log available. Upload a file first.");
    if (!question || !question.trim()) return;
    setAskLoading(true);
    try {
      // Push user message immediately to chat history
      setChatHistory((h) => [...h, { role: "user", content: question }]);

      const resp = await axios.post("http://localhost:5000/query", {
        logData: lastUploadedLog,
        question,
        // optionally send local chat history for context; here we send last 10 messages
        history: chatHistory.slice(-10),
      });

      const answer = resp.data?.answer ?? "No answer returned";
      setChatHistory((h) => [...h, { role: "assistant", content: answer }]);
      setQuestion("");
    } catch (err) {
      console.error("Query failed:", err);
      setChatHistory((h) => [...h, { role: "assistant", content: "Error: query failed. See console." }]);
    } finally {
      setAskLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">LogShark 🦈</h1>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative">
            <input
              id="file-input"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <label
              htmlFor="file-input"
              className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded cursor-pointer transition"
            >
              {file ? file.name : "Choose File"}
            </label>
          </div>

          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition disabled:opacity-60"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* Q/A for uploaded log */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Ask about the uploaded log</h3>

          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={lastUploadedLog ? "Ask a question about the uploaded log..." : "Upload a log file first to ask questions"}
              className="flex-1 border p-2 rounded"
              disabled={!lastUploadedLog || askLoading}
            />
            <button
              onClick={askUploadedLog}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
              disabled={!lastUploadedLog || askLoading}
            >
              {askLoading ? "Thinking..." : "Ask"}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {chatHistory.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block p-2 rounded max-w-full break-words ${
                    m.role === "user" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider line */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Live Stream link section */}
        <div className="text-center">
          <p className="mb-3 text-gray-600">Want to monitor live logs in real time?</p>
          <Link href="/livestream">
            <button className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 transition">
              Go to Live Stream
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
