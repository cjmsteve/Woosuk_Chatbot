// server.js
require('dotenv').config(); 
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors'); 

const app = express();
const port = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors()); 
app.use(express.json()); 

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 챗봇 API 엔드포인트
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body; // history를 받아 연속성 구현 (선택 사항)

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    try {
        // 대화 연속성을 위한 메시지 배열 구성
        const messages = [
            { "role": "system", "content": "당신은 친절하고 도움이 되는 AI 챗봇입니다." },
            ...(history || []), // 이전 대화 기록
            { "role": "user", "content": message } // 현재 사용자 메시지
        ];
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: messages,
        });

        const botResponse = completion.choices[0].message.content;
        res.json({ response: botResponse });

    } catch (error) {
        console.error("OpenAI API 호출 중 오류 발생:", error);
        res.status(500).json({ error: "서버에서 오류가 발생했습니다." });
    }
});

// 서버 실행
app.listen(port, () => {
    console.log(`Windows 개발 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});