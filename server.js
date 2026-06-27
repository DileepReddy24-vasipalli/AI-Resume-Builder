require('dotenv').config(); // .env ఫైల్ లోని కీ ని చదవడానికి
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth'); 
const Tesseract = require('tesseract.js'); 
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini AI కోసం

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// జెమినీ ఏఐ సెటప్ (.env లో ఉన్న కీ ని తీసుకుంటుంది)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // వేగంగా పనిచేసే మోడల్

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir) },
    filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)) }
});
const upload = multer({ storage: storage });

// రెజ్యూమ్ అప్‌లోడ్ మరియు ఏఐ అనాలసిస్ API
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let resumeText = "";

        // యూజర్ ఫ్రంట్-ఎండ్ లో సెలెక్ట్ చేసిన ఆప్షన్లు
        const { addSkills, improveDesc, fixFormat } = req.body;

        console.log(`Processing file: ${req.file.originalname}`);

        // ఫైల్ రకాన్ని బట్టి టెక్స్ట్ చదవడం
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            resumeText = data.text;
        } 
        else if (ext === '.docx' || ext === '.doc') {
            const result = await mammoth.extractRawText({ path: filePath });
            resumeText = result.value;
        } 
        else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            resumeText = text;
        } 
        else {
            fs.unlinkSync(filePath); 
            return res.status(400).json({ error: "Unsupported file type." });
        }

        fs.unlinkSync(filePath); // టెక్స్ట్ చదవడం అయిపోయాక ఫైల్ డిలీట్ చేయడం

     // --- ఏఐ (AI) ప్రాంప్ట్ తయారు చేయడం ---
        let aiPrompt = `You are an Expert Resume Writer. I will provide you with a raw resume text. 
        Your task is to COMPLETELY REWRITE the resume to make it highly professional, ATS-friendly, and powerful.
        
        Apply these improvements based on user selection:\n`;
        
        if (addSkills === 'true') aiPrompt += "- Add relevant missing skills naturally into the profile and experience.\n";
        if (improveDesc === 'true') aiPrompt += "- Rewrite work experience and project descriptions using strong action verbs and metrics.\n";
        if (fixFormat === 'true') aiPrompt += "- Structure it beautifully with clear headings.\n";

        aiPrompt += `\nOriginal Resume:\n${resumeText}\n\n`;
        aiPrompt += `IMPORTANT INSTRUCTION: 
        1. DO NOT give me suggestions or feedback. 
        2. Give me ONLY the FINAL REWRITTEN RESUME.
        3. Format the entire output as clean HTML (use <h1>, <h2>, <ul>, <li>, <p>, <strong>).
        4. DO NOT wrap the output in \`\`\`html or any markdown. Return ONLY raw HTML code.`;

        // జెమినీ ఏఐ కి డేటా పంపి రెస్పాన్స్ తీసుకోవడం
        const aiResult = await model.generateContent(aiPrompt);
        const aiSuggestions = aiResult.response.text();
        // ఏఐ ఇచ్చిన సలహాలను ఫ్రంట్-ఎండ్‌కి పంపడం
        res.json({ message: "Analysis complete", suggestions: aiSuggestions });

    } catch (error) {
        console.error("Error during analysis:", error);
        res.status(500).send("AI Analysis failed.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});