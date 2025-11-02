import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

export default function LiveStream() {
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logPath, setLogPath] = useState("/tmp/therap-batch.log");
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [logs, setLogs] = useState([]);
  const socketRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setStreaming(false);
    });

    //chunk
    socket.on("log", (chunk) => {
      const lines = String(chunk).split(/\r?\n/).filter(Boolean);
      setLogs((prev) => {
        const next = [...prev, ...lines].slice(-2000); // limit retention
        return next;
      });
      //auto scroll
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
    });

    socket.on("info", (m) => {
      setLogs((prev) => [...prev, `[info] ${m}`].slice(-2000));
    });

    socket.on("error", (m) => {
      setLogs((prev) => [...prev, `[error] ${m}`].slice(-2000));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const start = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("start_stream", { host, username, password, logPath });
    setStreaming(true);
    setLogs([]);
  };

  const stop = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("stop_stream");
    setStreaming(false);
  };

  const colorize = (line) => {
    if (/error/i.test(line)) return "text-red-600";
    if (/warn/i.test(line)) return "text-amber-700";
    if (/info/i.test(line)) return "text-slate-700";
    return "text-gray-700";
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold mb-4">LogShark — Live Stream</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="host (IP)" className="border p-2 rounded" />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="border p-2 rounded" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="border p-2 rounded" />
          <input value={logPath} onChange={(e) => setLogPath(e.target.value)} placeholder="log path" className="border p-2 rounded" />
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={start} disabled={!connected || streaming} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">
            Start Stream
          </button>
          <button onClick={stop} disabled={!streaming} className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60">
            Stop Stream
          </button>
          <div className="ml-auto text-sm text-gray-500">
            Socket: {connected ? "connected" : "disconnected"}
          </div>
        </div>

        <div ref={containerRef} className="h-96 overflow-auto bg-black text-white p-4 rounded">
          {logs.map((l, i) => (
            <div key={i} className={`font-mono text-sm ${colorize(l)}`}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
