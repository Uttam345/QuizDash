
import { GoogleGenAI, Type } from '@google/genai';
import { Difficulty, Question, QuestionType } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const singleCorrectResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questionText: {
      type: Type.STRING,
      description: 'The text of the multiple-choice question.',
    },
    options: {
      type: Type.ARRAY,
      description: 'An array of 4 strings representing the possible answers.',
      items: {
        type: Type.STRING,
      },
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: 'The 0-based index of the correct answer in the options array.',
    },
  },
  required: ['questionText', 'options', 'correctAnswerIndex'],
};

const multipleCorrectResponseSchema = {
    type: Type.OBJECT,
    properties: {
        questionText: {
            type: Type.STRING,
            description: 'The text of the multiple-choice question with potentially multiple correct answers.',
        },
        options: {
            type: Type.ARRAY,
            description: 'An array of 4 strings representing the possible answers.',
            items: {
                type: Type.STRING,
            },
        },
        correctAnswerIndices: {
            type: Type.ARRAY,
            description: 'A 0-based array of indices of the correct answers in the options array.',
            items: {
                type: Type.INTEGER,
            }
        },
    },
    required: ['questionText', 'options', 'correctAnswerIndices'],
};

const fillInTheBlankResponseSchema = {
    type: Type.OBJECT,
    properties: {
        questionText: {
            type: Type.STRING,
            description: 'The text of the fill-in-the-blank question. Use underscores `___` to represent the blank.',
        },
        correctAnswerText: {
            type: Type.STRING,
            description: 'The correct word or phrase that fills in the blank.',
        },
    },
    required: ['questionText', 'correctAnswerText'],
};


export const generateQuestionWithAI = async (topic: string, difficulty: Difficulty, questionType: QuestionType): Promise<Partial<Question> | null> => {
   if (!process.env.API_KEY) {
    alert("Gemini API key is not configured. Please set the API_KEY environment variable.");
    return null;
  }
  
  try {
    let prompt: string;
    let schema: object;

    switch (questionType) {
        case QuestionType.MultipleCorrect:
            prompt = `Generate a new, unique, ${difficulty}-level multiple-choice question about "${topic}" that has multiple correct answers. The question must have exactly 4 possible options. Clearly indicate which options are correct.`;
            schema = multipleCorrectResponseSchema;
            break;
        case QuestionType.FillInTheBlank:
            prompt = `Generate a new, unique, ${difficulty}-level fill-in-the-blank question about "${topic}". The question should have a clear, single correct answer. Use underscores '___' to indicate the blank part of the question.`;
            schema = fillInTheBlankResponseSchema;
            break;
        case QuestionType.SingleCorrect:
        default:
            prompt = `Generate a new, unique, ${difficulty}-level multiple-choice question about "${topic}". The question must have exactly 4 possible options. Ensure one option is clearly correct.`;
            schema = singleCorrectResponseSchema;
            break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 1, // Higher temperature for more creative/varied questions
      },
    });

    const jsonString = response.text;
    const parsed = JSON.parse(jsonString);
    
    const baseReturn: Partial<Question> = {
        type: questionType,
        text: parsed.questionText,
        difficulty: difficulty,
    };

    if (questionType === QuestionType.SingleCorrect || questionType === QuestionType.MultipleCorrect) {
        if (parsed.options.length !== 4) {
            throw new Error("AI did not generate exactly 4 options.");
        }
        baseReturn.options = parsed.options.map((o: string) => ({ text: o }));
    }

    if (questionType === QuestionType.SingleCorrect) {
        baseReturn.correctAnswerIndex = parsed.correctAnswerIndex;
    } else if (questionType === QuestionType.MultipleCorrect) {
        baseReturn.correctAnswerIndices = parsed.correctAnswerIndices;
    } else if (questionType === QuestionType.FillInTheBlank) {
        baseReturn.correctAnswerText = parsed.correctAnswerText;
    }

    return baseReturn;
    
  } catch (error) {
    console.error('Error generating question with AI:', error);
    // Let the user know something went wrong.
    alert(`Failed to generate question. Please check your prompt or API key. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};
