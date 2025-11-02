import dotenv from "dotenv";
import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

dotenv.config();

const { LLM_MODE, OLLAMA_MODEL, GEMINI_API_KEY, GEMINI_MODEL } = process.env;

export async function analyzeLogs(logText) {
  const prompt = `
You are LogShark — an intelligent log analysis assistant.
Analyze the following application logs and produce:
1. A concise summary of what's happening overall.
2. A list of errors or warnings with short explanations.
3. Any patterns, trends, or recommendations for troubleshooting.

Logs:
${logText}
`;

  try {
    let llm;

    if (LLM_MODE === "gemini") {
      console.log("Using Gemini model:", GEMINI_MODEL);

      llm = new ChatGoogleGenerativeAI({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL || "gemini-2.5-flash-lite",
        temperature: 0.2,
      });
    } else {
      console.log("Using Ollama model:", OLLAMA_MODEL);

      llm = new ChatOllama({
        model: OLLAMA_MODEL || "phi3",
        temperature: 0.2,
      });
    }

    const response = await llm.invoke([{ role: "user", content: prompt }]);
    return response.content || response.text || "No response from model.";

  } catch (err) {
    console.error("Analysis failed:", err);
    return "Error: Could not analyze logs. Check your LLM settings or connectivity.";
  }
}
