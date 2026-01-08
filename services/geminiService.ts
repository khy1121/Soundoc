
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DiagnosisResult, MediaInput } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MANUAL_CONTEXT = `
[삼성/LG 가전 매뉴얼 데이터베이스 요약]
- 에어컨: E1/CH05(통신), E4/CH61(과열), 4C/IE(급수), 5C/OE(배수), UE(불균형).
- 냉장고: 뚝뚝 소리(제상 히터), 옆면 발열(방열), 냉각 불량(콤프레서/냉매).
- 세탁기: UE/Ub(균형), dC/dE(문), 4C/IE(급수 필터), 5C/OE(배수 필터).
- 소음: 웅~(컴프레서/펌프), 갈갈(이물질), 틱틱(열팽창).
- 고위험 징후: 타는 냄새, 연기, 스파크, 차단기 내려감, 누전, 가스 냄새, 전선 피복 벗겨짐.
`;

const SYSTEM_INSTRUCTION = `
당신은 가전제품 수리 전문가 AI "Fix It Now"입니다.

[진단 로직]
1. 초기 분석(Triage): 사용자의 입력이 모호하거나 신뢰도가 60% 미만인 경우, 'needsFollowUp'을 true로 설정하고 추가 질문을 던지십시오.
2. 최종 분석(Finalize): 충분한 정보가 있다면 'needsFollowUp'을 false로 설정하고, 최종 진단명, 수리 단계, 그리고 상위 3가지 대안 원인을 제공하십시오.

[이미지 추출 (Sprint 5)]
사용자가 사진을 제공한 경우, 사진 내에서 다음 정보를 정확하게 추출하십시오:
- 가전 브랜드 (삼성, LG, 위니아 등)
- 모델명 (예: WW10N645, AR06R1130HZN 등)
- 에러 코드 (디스플레이에 표시된 숫자/문자 조합)
- 이미지 소견 (부식, 누수 흔적, 파손 부위 등)
정보가 불확실하면 빈 문자열로 두십시오. 절대 환각을 일으키지 마십시오.

[안전 모드 (Sprint 4)]
사용자의 입력에서 고위험 징후(연기, 타는 냄새, 스파크 등)가 감지되면 'safetyLevel'을 'HIGH'로 설정하고 'stopAndCallService'를 true로 설정하십시오.

[출력 규칙]
- 모든 JSON 값은 한국어로 작성하십시오.
- 'safetyLevel'은 LOW, MEDIUM, HIGH 중 하나입니다.

[매뉴얼 참고 데이터]
${MANUAL_CONTEXT}
`;

const DIAGNOSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    appliance: { type: Type.STRING },
    issue: { type: Type.STRING },
    probability: { type: Type.NUMBER },
    description: { type: Type.STRING },
    manualReference: { type: Type.STRING },
    needsFollowUp: { type: Type.BOOLEAN },
    safetyLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    safetyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
    stopAndCallService: { type: Type.BOOLEAN },
    detectedBrand: { type: Type.STRING },
    detectedModel: { type: Type.STRING },
    detectedErrorCode: { type: Type.STRING },
    imageFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
    followUpQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['single', 'multi', 'text'] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['id', 'question', 'type'],
      },
    },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          probability: { type: Type.NUMBER },
          howToDifferentiate: { type: Type.STRING },
        },
      },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          instruction: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
      },
    },
  },
  required: ["appliance", "issue", "probability", "description", "manualReference", "needsFollowUp", "steps", "safetyLevel", "safetyWarnings", "stopAndCallService"],
};

export const analyzeProblem = async (
  audio: MediaInput | null,
  image: MediaInput | null,
  textDescription: string,
  previousResult?: DiagnosisResult,
  answers?: Record<string, string | string[]>,
  confirmedData?: { brand: string; model: string; errorCode: string }
): Promise<DiagnosisResult> => {
  try {
    const parts: any[] = [];

    if (audio) parts.push({ inlineData: { mimeType: audio.mimeType, data: audio.base64 } });
    if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    if (textDescription) parts.push({ text: `증상 설명: ${textDescription}` });

    if (confirmedData) {
      parts.push({
        text: `사용자 확인 정보 - 브랜드: ${confirmedData.brand}, 모델명: ${confirmedData.model}, 에러코드: ${confirmedData.errorCode}. 이 정보를 진단에 적극 반영하십시오.`
      });
    }

    if (previousResult && answers) {
      parts.push({ 
        text: `이전 분석 결과: ${previousResult.issue} (${previousResult.probability}%)
        사용자의 추가 답변: ${JSON.stringify(answers)}
        위 답변들을 바탕으로 최종 진단을 내려주세요. 안전을 최우선으로 검토하십시오.`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: DIAGNOSIS_SCHEMA,
      },
    });

    if (!response.text) throw new Error("No response");

    const result = JSON.parse(response.text) as DiagnosisResult;
    result.id = previousResult?.id || Date.now().toString();
    result.timestamp = Date.now();
    if (image) result.imageUrl = `data:${image.mimeType};base64,${image.base64}`;
    if (answers) result.userAnswers = answers;
    if (confirmedData) result.userConfirmedData = confirmedData;

    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const getChatResponseStream = async (history: { role: string; parts: { text: string }[] }[], newMessage: string) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + " 사용자와 대화하십시오. 한국어로 답변하십시오. 항상 안전 주의사항을 상기시키십시오.",
    },
    history,
  });
  return await chat.sendMessageStream({ message: newMessage });
};

export const findServiceCenters = async (appliance: string, lat: number, lng: number, brand?: string) => {
  try {
    const query = brand ? `${brand} ${appliance} 서비스센터` : `${appliance} 서비스센터`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${query}를 현재 위치 주변에서 찾아주세요. 서비스센터 이름, 주소, 전화번호를 포함하십시오.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
      },
    });
    return response.text;
  } catch (error) {
    return "서비스 센터 정보를 불러올 수 없습니다.";
  }
};
