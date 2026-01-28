import bodyParser from "body-parser";
import express from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

import api from "./routes/api";
import { FRONTEND_BASE_URL } from "./lib/constants/config";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "./lib/constants/file";

const app = express();

app.set("port", process.env.PORT || 3001);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE_BYTES },
	fileFilter: (_req, file, cb) => {
		if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error("Invalid file type. Supported formats: mp3, wav, ogg, webm"),
			);
		}
	},
});

const corsOptions: CorsOptions = {
	origin: [FRONTEND_BASE_URL],
	credentials: true,
};
app.use(cors(corsOptions));

app.get("/", (_req, res) => {
	res.send("API is Running");
});

app.use("", upload.single("audio"), api);

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== "1") {
	const port = app.get("port");
	app.listen(port, () => console.log(`Server started on port ${port}`));
}

export default app;
