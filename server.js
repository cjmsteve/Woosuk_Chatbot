require('dotenv').config(); 
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,  // .env 파일에서 API 키 로드
});

let academicEmbeddings = [];

function dotProduct(vecA, vecB) {
    return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
}

async function initializeAcademicData() {
    try {
        console.log("학사 정보 임베딩을 시작합니다...");
        const dataPath = path.join(__dirname, 'data', 'academics.txt');
        const fileCotent = fs.readFileSync(dataPath, 'utf-8');

        const chunks = fileCotent.split('---').map(c => c.trim()).filter(c => c.length > 0 && !c.startsWith('문서'));

        console.log(`총 ${chunks.length}개의 청크를 임베딩합니다...`);

        const embeddingPromises = chunks.map(async (text) => {
            const response = await ai.embeddings.createEmbedding({
                model: "text-embedding-004",
                input: text,
            });
            return {
                text: text,
                embedding: response.embedding.values
            };
        });

        academicEmbeddings = await Promise.all(embeddingPromises);
        console.log("학사 정보 임베딩이 완료되었습니다.");
    } catch (error) {
        console.error("학사 정보 임베딩 중 오류 발생:", error);
    }
}



// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gemini 클라이언트 초기화

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    
    if (!message || academicEmbeddings.length === 0) {
        return res.status(400).json({ error: "메시지 또는 임베딩 데이터가 없습니다." });
    }

    try {

        const questoinEmbeddingResponse = await ai.embeddings.createEmbedding({
            model: "gemini-2.5-flash-embedding",
            input: message,
        });
        const questionEmbedding = questoinEmbeddingResponse.embedding.values;
    
        const questionVector = questoinEmbeddingResponse.embedding.values;

        const similarities = academicEmbeddings.map(doc => ({
            text: doc.text, //질문 벡터 문서 벡터 유사도 계산
            similarity: dotProduct(questionVector, doc.embedding)
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const relevantDocs = similarities.slice(0, 2);


        const context = relevantDocs.map(doc => `[문서] ${doc.text}`).join('\n---\n');
        
        const systemInstruction = `당신은 친절하고 전문적인 **[우석대학교] 학사 정보 도우미**입니다. 사용자의 질문에 답변할 때, 반드시 제공된 '참고 문서'를 기반으로 답변해야 합니다. 만약 참고 문서에 답변이 없다면, "관련 정보를 찾을 수 없습니다."라고 응답하세요.`;

        const userPrompt = `사용자 질문: "${message}"\n\n--- 참고 문서 ---\n${context}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemInstruction,
            },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }]

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
    initializeAcademicData();
});