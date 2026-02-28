import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnv } from '../env-loader.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.GEMINI_API_KEY) {
    loadEnv(path.resolve(__dirname, '../../.env'));
}

let config = {
    "google-1": [], "google-2": [], "google-3": [],
    "openrouter-1": [], "openrouter-2": [], "openrouter-3": [],
    "groq": [], "huggingface": [],
    "settings": { "temperature": 0.7 }
};

try {
    const configPath = path.resolve(__dirname, '../../config/ai-models.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {
    console.warn(`[AI-ENGINE] Kon config niet laden.`);
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

async function withTimeout(promise, ms) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateWithAI(prompt, { isJson = true, modelStack = null, temp = config.settings.temperature } = {}) {
    const logPrefix = `[AI-ENGINE]`;

    let sequence = [];
    if (modelStack) {
        sequence = typeof modelStack === 'string' ? modelStack.split(',').map(m => m.trim()) : modelStack;
    } else {
        sequence = [
            ...config.groq,
            ...config["google-1"],
            ...config["openrouter-1"],
            ...config["google-2"],
            ...config["openrouter-2"],
            ...config["google-3"],
            ...config["openrouter-3"],
            ...config.huggingface
        ];
    }

    let lastError = null;
    const startTime = Date.now();

    for (const [index, modelName] of sequence.entries()) {
        const isGoogle = config["google-1"].includes(modelName) || config["google-2"].includes(modelName) || config["google-3"].includes(modelName) || (!modelName.includes('/') && !modelName.includes(':'));
        const isGroq = config.groq.includes(modelName);
        const isOR = config["openrouter-1"].includes(modelName) || config["openrouter-2"].includes(modelName) || config["openrouter-3"].includes(modelName) || modelName.includes(':');
        const isHF = config.huggingface.includes(modelName) || (modelName.includes('/') && !isOR);

        // Retry logic for 429
        let attempts = 0;
        const maxAttempts = 2; // 1 initial + 1 retry

        while (attempts < maxAttempts) {
            attempts++;
            const attemptStart = Date.now();
            try {
                console.log(`${logPrefix} [${index + 1}/${sequence.length}] Attempt ${attempts}: ${modelName}...`);

                let validResult = null;
                const callOptions = { modelName, prompt, isJson, temp };

                // Wrap in timeout
                if (isGroq) validResult = await withTimeout(tryGroq(callOptions), DEFAULT_TIMEOUT);
                else if (isGoogle) validResult = await withTimeout(tryGoogle(callOptions), DEFAULT_TIMEOUT);
                else if (isOR) validResult = await withTimeout(tryOpenRouter(callOptions), DEFAULT_TIMEOUT);
                else if (isHF) validResult = await withTimeout(tryHuggingFace(callOptions), DEFAULT_TIMEOUT);

                const duration = Date.now() - attemptStart;
                if (validResult) {
                    console.log(`${logPrefix} ✅ Success: ${modelName} (${duration}ms)`);
                    return validResult;
                }
            } catch (e) {
                lastError = e;
                const duration = Date.now() - attemptStart;
                const isRateLimit = e.message.includes('429') || e.message.includes('Quota') || e.message.includes('Too Many Requests');

                console.warn(`${logPrefix} ⚠️ ${modelName} failed (${duration}ms): ${e.message.substring(0, 100)}`);

                if (isRateLimit && attempts < maxAttempts) {
                    console.log(`${logPrefix} ⏳ Rate limit detected. Waiting 2s before retry...`);
                    await delay(2000);
                    continue; // Retry same model
                }
                break; // Move to next model
            }
        }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ CRITICAL: All models failed after ${totalDuration}ms.`);
    if (lastError) console.error(`${logPrefix} Last error: ${lastError.message}`);
    return null;
}

async function tryGoogle({ modelName, prompt, isJson, temp }) {
    if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini key");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: isJson ? "application/json" : "text/plain", temperature: temp }
    });
    const result = await model.generateContent(prompt);
    const text = result.response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || result.response.text();
    return parseOutput(text, isJson);
}

async function tryGroq({ modelName, prompt, isJson, temp }) {
    if (!process.env.GROQ_API_KEY) throw new Error("No Groq key");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            response_format: isJson ? { type: "json_object" } : undefined,
            temperature: temp
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return parseOutput(data.choices[0].message.content, isJson);
}

async function tryOpenRouter({ modelName, prompt, isJson, temp }) {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("No OR key");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "Athena" },
        body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            response_format: isJson ? { type: "json_object" } : undefined,
            temperature: temp
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return parseOutput(data.choices[0].message.content, isJson);
}

async function tryHuggingFace({ modelName, prompt, isJson, temp }) {
    if (!process.env.HF_TOKEN) throw new Error("No HF token");
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            inputs: prompt,
            parameters: { temperature: temp, return_full_text: false }
        })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const text = Array.isArray(data) ? data[0].generated_text : (data.generated_text || JSON.stringify(data));
    return parseOutput(text, isJson);
}

export function parseOutput(text, isJson) {
    if (!text) return null;
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!isJson) return cleanText;

    try {
        // Verwijder markdown code blocks
        let clean = cleanText.replace(/```json\n?|```/g, '').trim();

        // Zoek naar de eerste '[' of '{' en de laatste ']' of '}'
        const startArray = clean.indexOf('[');
        const startObject = clean.indexOf('{');

        let start = -1;
        let end = -1;

        if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
            start = startArray;
            end = clean.lastIndexOf(']');
        } else if (startObject !== -1) {
            start = startObject;
            end = clean.lastIndexOf('}');
        }

        if (start > -1 && end > -1) {
            clean = clean.substring(start, end + 1);
            return JSON.parse(clean);
        }

        return JSON.parse(clean);
    } catch (e) {
        console.warn(`[AI-ENGINE] JSON Parse error: ${e.message}. Raw text: ${text.substring(0, 100)}...`);
        return null;
    }
}