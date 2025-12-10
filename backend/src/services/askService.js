/**
 * @author Shaikh Nahian
*/
import dotenv from "dotenv";
import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();
const { LLM_MODE, OLLAMA_MODEL, GEMINI_API_KEY, GEMINI_MODEL } = process.env;

/**
 * Ask question about some logs. `history` is optional array of {role:'user'|'assistant', content}
 * Returns string answer.
 */
export async function askAboutLogs({ logText, question, history = [] }) {
  const INSTRUCTION = `You are LogShark — an assistant that answers questions about application logs.
Use the provided logs to answer the user's question. If the logs do not contain enough info, say what to check next.
Be concise but include steps if troubleshooting.`;

  const maxLogLines = 800; // tune this for tokens
  const logLines = String(logText || "").split(/\r?\n/).slice(-maxLogLines).join("\n");

  const promptHeader = `${INSTRUCTION}\n\nLogs (most recent ${Math.min(maxLogLines, logLines.split("\n").length)} lines):\n${logLines}\n\n---\n`;

  // Construct messages array depending on model
  // pass as chat messages: system user/history...
  const messages = [];

  // System role
  messages.push({ role: "system", content: INSTRUCTION });

  // Attach a summarized context block as a user/system message
  messages.push({ role: "user", content: `Context logs (recent excerpt):\n${logLines}` });

  // Append conversation history
  if (Array.isArray(history) && history.length) {
    for (const m of history.slice(-10)) { // only keep last 10 messages of history
      messages.push({ role: m.role, content: m.content });
    }
  }

  // Finally user's question
  messages.push({ role: "user", content: `Question: ${question}` });

  try {
    let llm;
    if (LLM_MODE === "gemini") {
      llm = new ChatGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL || "gemini-2.5-pro",
        temperature: 0.0,
      });
    } else {
      llm = new ChatOllama({
        model: OLLAMA_MODEL || "phi3",
        temperature: 0.0,
      });
    }

    const resp = await llm.invoke(messages);
    // response may be in resp.content or resp.text depending on connector
    const ans = resp?.content ?? resp?.text ?? JSON.stringify(resp);
    return ans;
  } catch (err) {
    console.error("AskAboutLogs failed:", err);
    throw err;
  }
}
