import dotenv from "dotenv";
import { ChatOllama } from "@langchain/ollama";

dotenv.config();

const MODEL = process.env.OLLAMA_MODEL || "phi3";

export async function analyzeLogs(logText) {
  try {
    // Initialize the Ollama model
    const llm = new ChatOllama({
      model: MODEL,
      temperature: 0.2,
    });

    // Construct the prompt for log analysis
    const prompt = `
You are LogShark — an intelligent log analysis assistant.
Analyze the following application logs and produce:
1. A concise summary of what's happening overall.
2. A list of errors or warnings with short explanations.
3. Any patterns, trends, or recommendations for troubleshooting.

Logs:
${logText}
`;

    // Send the request to Ollama
    const response = await llm.invoke([{ role: "user", content: prompt }]);
    return response.content;

  } catch (err) {
    console.error("❌ Ollama analysis failed:", err);
    return "⚠️ Error: Could not analyze logs. Make sure Ollama is running locally (http://localhost:11434) and that your model is installed.";
  }
}
