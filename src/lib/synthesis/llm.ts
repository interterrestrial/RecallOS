import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import { MeetingMinutes } from '../utils/exporter';

export class LLMSynthesizer {
  private engine: MLCEngine | null = null;
  // Qwen2.5-0.5B is significantly smaller (~350MB) and faster than Llama 3.2 1B
  private readonly modelId = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

  async loadModel(onProgress?: (report: InitProgressReport) => void) {
    if (this.engine) return;
    this.engine = await CreateMLCEngine(this.modelId, { initProgressCallback: onProgress });
  }

  async generateMoM(transcript: string): Promise<MeetingMinutes> {
    if (!this.engine) throw new Error("Model not loaded");

    const prompt = `You are a helpful AI meeting assistant. Below is the transcript of a meeting. Please extract the following three components:
1. Executive Summary (a short paragraph summarizing the meeting)
2. Decisions Made (a bulleted list)
3. Action Items (a bulleted list)

Transcript:
${transcript}

Output ONLY valid JSON with keys: "executiveSummary" (string), "decisions" (array of strings), "actionItems" (array of strings). Do not output markdown code blocks or any other text. Return pure JSON.
CRITICAL INSTRUCTION: Even if the transcript is very short, you MUST provide an "executiveSummary" summarizing whatever was discussed. You MUST NOT leave "executiveSummary" empty. If there are no decisions or action items, return an empty array [] for those fields.`;

    const reply = await this.engine.chat.completions.create({
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1024
    });

    const content = reply.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    try {
      // In case the LLM returned markdown code blocks, strip them
      const cleanContent = content.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanContent) as Partial<MeetingMinutes>;
      return {
        executiveSummary: parsed.executiveSummary || "No summary generated.",
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : []
      };
    } catch (e) {
      throw new Error("Failed to parse LLM response into JSON: " + content);
    }
  }

  async disposeModel() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }
}
