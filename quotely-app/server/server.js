import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({}); // automatically uses GEMINI_API_KEY

app.post("/api/analyze-email", async (req, res) => {
  const { emailText } = req.body;
  if (!emailText)
    return res.status(400).json({ error: "No email text provided" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this supplier email and extract: price, timeline, quality info, and give a 5-star rating summary. Email:\n\n${emailText}`,
    });

    res.json({ analysis: response.text });
  } catch (err) {
    console.error("Error analyzing email:", err);
    res.status(500).json({ error: "Failed to analyze email" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
