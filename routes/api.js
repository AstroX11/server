import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { readFile, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { flipMedia } from './flipmedia.js';
import { audioToBlackVideo } from './blackVideo.js';
import { toSticker } from './stickermaker.js';
import { textToPdf } from './pdf.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const __dirname = dirname(fileURLToPath(import.meta.url));

router.get('/hello', (req, res) => {
	res.json({ message: 'Running' });
});

router.get('/facts', (req, res) => {
	const filePath = join(__dirname, 'json', 'facts.json');
	if (!existsSync(filePath)) return res.status(404).json({ error: 'Facts file not found' });
	readFile(filePath, 'utf-8', (err, data) => {
		if (err) return res.status(500).json({ error: 'Failed to read facts file' });
		const jsonData = JSON.parse(data);
		const randomIndex = Math.floor(Math.random() * jsonData.facts.length);
		const randomFact = jsonData.facts[randomIndex];

		res.json({ fact: randomFact });
	});
});

router.get('/quotes', (req, res) => {
	const filePath = join(__dirname, 'json', 'quotes.json');
	if (!existsSync(filePath)) return res.status(404).json({ error: 'Facts file not found' });
	readFile(filePath, 'utf-8', (err, data) => {
		if (err) return res.status(500).json({ error: 'Failed to read facts file' });
		const jsonData = JSON.parse(data);
		const randomIndex = Math.floor(Math.random() * jsonData.quotes.length);
		const randomQuote = jsonData.quotes[randomIndex];

		res.json(randomQuote);
	});
});

router.post('/flip', upload.single('media'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}
		const { direction } = req.query;
		if (!direction) {
			return res.status(400).json({ error: 'Direction query parameter is required' });
		}
		const flippedMedia = await flipMedia(req.file.buffer, direction);
		res.setHeader('Content-Type', req.file.mimetype);
		res.send(flippedMedia);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

router.post('/blackvideo', upload.single('audio'), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
		const videoBuffer = await audioToBlackVideo(req.file.buffer);
		res.setHeader('Content-Type', 'video/mp4');
		res.send(videoBuffer);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Failed to convert audio to video' });
	}
});

router.post('/sticker', upload.single('media'), async (req, res) => {
	try {
		const { packname = 'Default Pack', author = 'Unknown Author' } = req.body;

		if (!req.file) {
			return res.status(400).json({ error: 'No media file uploaded' });
		}

		const mimeType = req.file.mimetype;

		if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
			return res.status(400).json({ error: 'Unsupported media type. Only image or video is allowed.' });
		}

		const stickerBuffer = await toSticker(req.file.buffer, packname, author);

		res.setHeader('Content-Type', 'image/webp');
		res.send(stickerBuffer);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message });
	}
});

router.post('/topdf', async (req, res) => {
	const { text } = req.body;
	console.log('Received text:', text); // Debugging
	try {
		const pdfPath = await textToPdf(text);
		console.log('Generated PDF path:', pdfPath); // Debugging
		if (!existsSync(pdfPath)) {
			throw new Error('PDF file not found');
		}
		res.sendFile(pdfPath);
	} catch (error) {
		console.error('Error in /topdf:', error.message); // Debugging
		res.status(500).json({ error: error.message });
	}
});

export default router;
