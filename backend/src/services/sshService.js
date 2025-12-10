/**
 * @author Shaikh Nahian
*/
import { Client } from "ssh2";
export function startSSHStream({ host, username, password, logPath }, onData, onClose) {
  const conn = new Client();
  let closed = false;
  let streamRef = null;

  conn.on("ready", () => {
    console.log(`SSH connected to ${host}`);
    conn.exec(`tail -n 100 -f ${logPath}`, (err, stream) => {
      if (err) {
        console.error("SSH exec error:", err);
        if (onClose) onClose(err);
        conn.end();
        return;
      }
      streamRef = stream;
      stream.on("data", (data) => {
        const text = data.toString();
        if (onData) onData(text);
      });
      stream.stderr?.on("data", (d) => {
        const text = d.toString();
        if (onData) onData(text);
      });
      stream.on("close", () => {
        if (!closed) {
          closed = true;
          conn.end();
          if (onClose) onClose();
        }
      });
    });
  });

  conn.on("error", (err) => {
    console.error(`SSH connection error to ${host}:`, err);
    if (!closed) {
      closed = true;
      if (onClose) onClose(err);
    }
  });

  conn.on("end", () => {
    console.log(`SSH connection ended for ${host}`);
  });

  conn.connect({ host, username, password, readyTimeout: 20000 });

  return {
    stop: () => {
      if (closed) return;
      closed = true;
      try {
        if (streamRef && streamRef.close) streamRef.close();
      } catch (e) { /* ignore */ }
      try {
        conn.end();
      } catch (e) { /* ignore */ }
      if (onClose) onClose();
    },
  };
}
