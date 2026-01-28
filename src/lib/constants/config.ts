import dotenv from "dotenv";

dotenv.config();

export const API_KEY = process.env.GEMINI_API_KEY || "";

export const FRONTEND_BASE_URL =
	process.env.FRONTEND_BASE_URL || "http://localhost:3000";

export const BASE_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const MAX_TOKENS = 2048;

export const TEMPERATURE = 0.7;

export const TRANSCRIPTION_PROMPT =
	"Transcribe this audio file. Return only the transcribed text without any additional commentary or formatting.";
