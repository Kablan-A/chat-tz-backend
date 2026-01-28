import { Router, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import HttpStatusCodes from "http-status-codes";
import { GoogleGenAI } from "@google/genai";
import {
	API_KEY,
	MAX_TOKENS,
	BASE_MODEL,
	TEMPERATURE,
	TRANSCRIPTION_PROMPT,
} from "../../lib/constants/config";
import { ALLOWED_MIME_TYPES } from "../../lib/constants/file";
import type { ApiError } from "../../lib/types/error";

const router = Router();

const genai = new GoogleGenAI({ apiKey: API_KEY });

router.post(
	"/transcribe",
	[
		check("audio").custom((_, { req }) => {
			if (!req.file) {
				throw new Error("Audio file is required");
			}

			if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
				throw new Error(
					"Unsupported audio format. Supported formats: mp3, wav, ogg, webm",
				);
			}
			return true;
		}),
	],
	async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(HttpStatusCodes.BAD_REQUEST)
					.json({ errors: errors.array() });
			}

			if (!req.file) {
				return res
					.status(HttpStatusCodes.BAD_REQUEST)
					.json({ error: "No audio file provided" });
			}

			const audioBase64 = req.file.buffer.toString("base64");

			const response = await genai.models.generateContent({
				model: BASE_MODEL,
				contents: [
					{
						role: "user",
						parts: [
							{
								inlineData: {
									mimeType: req.file.mimetype,
									data: audioBase64,
								},
							},
							{ text: TRANSCRIPTION_PROMPT },
						],
					},
				],
			});

			const transcribedText = response.text || "";

			return res.status(HttpStatusCodes.OK).json({
				success: true,
				data: {
					text: transcribedText,
					language: "auto-detected",
				},
			});
		} catch (err: unknown) {
			const error = err instanceof Error ? err : new Error(String(err));
			console.error("Transcription error:", error.message);

			const apiError = err as ApiError;
			if (apiError.status === 401 || apiError.status === 403) {
				return res
					.status(HttpStatusCodes.UNAUTHORIZED)
					.json({ error: "Invalid Gemini API key" });
			}

			if (apiError.status === 429) {
				return res
					.status(HttpStatusCodes.TOO_MANY_REQUESTS)
					.json({ error: "Rate limit exceeded. Please try again later." });
			}

			return res
				.status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
				.json({ error: "Transcription failed. Please try again." });
		}
	},
);

router.post(
	"/prompt",
	[
		check("prompt")
			.notEmpty()
			.withMessage("Prompt is required")
			.trim()
			.escape(),
	],
	async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res
					.status(HttpStatusCodes.BAD_REQUEST)
					.json({ errors: errors.array() });
			}

			const { prompt } = req.body;
			const model = BASE_MODEL;

			const response = await genai.models.generateContent({
				model,
				contents: prompt,
				config: {
					temperature: TEMPERATURE,
					maxOutputTokens: MAX_TOKENS,
				},
			});

			const responseText = response.text || "No response generated";

			return res.status(HttpStatusCodes.OK).json({
				success: true,
				data: {
					response: responseText,
					model,
					usage: {
						promptTokens: response.usageMetadata?.promptTokenCount || 0,
						completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
						totalTokens: response.usageMetadata?.totalTokenCount || 0,
					},
				},
			});
		} catch (err: unknown) {
			const error = err instanceof Error ? err : new Error(String(err));
			console.error("Prompt processing error:", error.message);

			const apiError = err as ApiError;
			if (apiError.status === 401 || apiError.status === 403) {
				return res
					.status(HttpStatusCodes.UNAUTHORIZED)
					.json({ error: "Invalid Gemini API key" });
			}

			if (apiError.status === 429) {
				return res
					.status(HttpStatusCodes.TOO_MANY_REQUESTS)
					.json({ error: "Rate limit exceeded. Please try again later." });
			}

			if (apiError.status === 400) {
				return res
					.status(HttpStatusCodes.BAD_REQUEST)
					.json({ error: error.message || "Invalid request to Gemini" });
			}

			return res
				.status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
				.json({ error: "Prompt processing failed. Please try again." });
		}
	},
);

export default router;
