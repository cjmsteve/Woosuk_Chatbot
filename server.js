// server.js
require('dotenv').config(); 
const express = require('express');
//const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OpenAI 클라이언트 초기화
// const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY,});

// 1. Gemini 클라이언트 초기화
const ai = new GoogleGenAI({
    // .env 파일에서 GEMINI_API_KEY 변수를 읽어옵니다.
    apiKey: process.env.GEMINI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    // ... (유효성 검사 코드 생략)

    try {
        // 대화 연속성을 위한 메시지 배열 구성 (Gemini 형식으로 변환 필요)
        // 이전 history 배열을 Gemini API에서 요구하는 형식으로 변환해야 합니다.
        // 하지만 간단한 1회성 질문으로 시작하기 위해, 여기서는 현재 메시지만 사용합니다.

        const content = [
            // { role: "system", content: "..." } 은 별도의 구성이 필요함 (아래 참고)
            { role: "user", parts: [{ text: message }] } // 현재 사용자 메시지
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // 빠르고 가벼운 모델 (추천)
            contents: content,
        });

        // 챗봇 응답에서 텍스트 추출
        const botResponse = response.text;
        res.json({ response: botResponse });

    } catch (error) {
        console.error("Gemini API 호출 중 오류 발생:", error);
        res.status(500).json({ error: "서버에서 오류가 발생했습니다." });
    }
});

// 서버 실행
app.listen(port, () => {
    console.log(`Windows 개발 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});