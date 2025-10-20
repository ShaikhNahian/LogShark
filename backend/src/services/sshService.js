import { Client } from "ssh2";

export function streamRemoteLogs({ host, username, password, logPath }, onData, onClose) {
  const conn = new Client();
  conn
    .on("ready", () => {
      console.log("SSH connected");
      conn.exec(`tail -f ${logPath}`, (err, stream) => {
        if (err) throw err;
        stream
          .on("data", (data) => onData(data.toString()))
          .on("close", () => {
            console.log("SSH stream closed");
            conn.end();
            if (onClose) onClose();
          });
      });
    })
    .connect({ host, username, password });
}
