import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.warn("No OPENAI_API_KEY found in env");

export async function analyzeLogs(logText) {
  // instantiate the LLM (LangChain OpenAI integration)
  const llm = new ChatOpenAI({
    openAIApiKey: OPENAI_KEY,   // use this key field for @langchain/openai
    modelName: "gpt-4o-mini",    // change to a model you have access to if needed
    temperature: 0.2,
  });

  const prompt = `You are a log analysis assistant. From the logs below, produce:
1) A short summary (2-4 lines)
2) Top 3 recurring errors/warnings with counts if possible
3) Any immediate suggested next steps for investigation.

Logs:
${logText}`;

  const response = await llm.invoke([
    { role: "user", content: prompt }
  ]);

  return response.content;
}
