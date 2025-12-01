
import React, { useState, useRef, useEffect } from 'react';
import { Difficulty, QuestionType, QuestionOption } from '../types';
import { apiCreateQuestion } from '../services/apiService';
import { generateQuestionWithAI } from '../services/geminiService';
import Button from './common/Button';
import Modal from './common/Modal';
import Spinner from './common/Spinner';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  subjectName: string;
  onQuestionAdded: () => void;
}

const ImageUploader: React.FC<{ imageUrl: string, setImageUrl: (url: string) => void, placeholder: string }> = ({ imageUrl, setImageUrl, placeholder }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImageUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    return (
        <div className="flex items-center gap-2">
            {imageUrl ? (
                <div className="relative group">
                    <img src={imageUrl} alt="Preview" className="h-10 w-10 object-cover rounded-md" />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setImageUrl('')} className="text-white text-xs bg-red-600 hover:bg-red-700 p-1 rounded-full">
                           &times;
                        </button>
                    </div>
                </div>
            ) : (
                 <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} className="text-xs p-2">
                    {placeholder}
                </Button>
            )}
            <input
                type="file"
                ref={inputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ isOpen, onClose, teacherId, subjectName, onQuestionAdded }) => {
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.SingleCorrect);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState<QuestionOption[]>([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [correctAnswerIndices, setCorrectAnswerIndices] = useState<number[]>([]);
  const [correctAnswerText, setCorrectAnswerText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>(QuestionType.SingleCorrect);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync AI question type with the main question type
  useEffect(() => {
    setAiQuestionType(questionType);
  }, [questionType]);

  const resetForm = () => {
    setQuestionType(QuestionType.SingleCorrect);
    setText('');
    setImageUrl('');
    setMarks(1);
    setOptions([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
    setCorrectAnswerIndex(0);
    setCorrectAnswerIndices([]);
    setCorrectAnswerText('');
    setDifficulty(Difficulty.Medium);
    setAiTopic('');
    setAiQuestionType(QuestionType.SingleCorrect);
    onClose();
  };

  const handleSaveQuestion = async () => {
    const questionToAdd: any = {
      type: questionType,
      text: text.trim(),
      imageUrl: imageUrl || undefined,
      marks,
      difficulty,
      authorId: teacherId,
      subject: subjectName,
    };

    if (questionType === QuestionType.FillInTheBlank) {
      if (!text.trim() || !correctAnswerText.trim()) {
        alert('Please fill in the question text and the correct answer.');
        return;
      }
      questionToAdd.options = [];
      questionToAdd.correctAnswerText = correctAnswerText.trim();
    } else {
      if (!text.trim() || options.some(o => o.text.trim() === '')) {
        alert('Please fill out the question and all option texts.');
        return;
      }
      questionToAdd.options = options.map(o => ({ text: o.text, imageUrl: o.imageUrl || undefined }));
      if (questionType === QuestionType.SingleCorrect) {
        questionToAdd.correctAnswerIndex = correctAnswerIndex;
      } else {
        if (correctAnswerIndices.length === 0) {
          alert('Please select at least one correct answer.');
          return;
        }
        questionToAdd.correctAnswerIndices = correctAnswerIndices.sort();
      }
    }
    
    try {
      await apiCreateQuestion(questionToAdd);
      onQuestionAdded();
      resetForm();
    } catch (err: any) {
      console.error('Error creating question:', err);
      alert(err.message || 'Failed to create question');
    }
  };
  
  const handleGenerateAI = async () => {
      const topic = aiTopic.trim() || subjectName;
      setIsGenerating(true);
      const generated = await generateQuestionWithAI(topic, difficulty, aiQuestionType);
      setIsGenerating(false);
      if (generated) {
          setQuestionType(generated.type || QuestionType.SingleCorrect);
          setText(generated.text || '');
          setImageUrl(''); // AI doesn't generate images

          const generatedOptions = generated.options || [{ text: '' }, { text: '' }, { text: '' }, { text: '' }];
          setOptions(generatedOptions.length < 4 
            ? [...generatedOptions, ...Array(4 - generatedOptions.length).fill({text: ''})]
            : generatedOptions
          );
          
          if (generated.type === QuestionType.SingleCorrect) {
              setCorrectAnswerIndex(generated.correctAnswerIndex ?? 0);
              setCorrectAnswerIndices([]);
              setCorrectAnswerText('');
          } else if (generated.type === QuestionType.MultipleCorrect) {
              setCorrectAnswerIndices(generated.correctAnswerIndices || []);
              setCorrectAnswerIndex(0);
              setCorrectAnswerText('');
          } else if (generated.type === QuestionType.FillInTheBlank) {
              setCorrectAnswerText(generated.correctAnswerText || '');
              setCorrectAnswerIndex(0);
              setCorrectAnswerIndices([]);
          }
          
          setDifficulty(generated.difficulty || Difficulty.Medium);
      }
  };

  const handleOptionChange = (index: number, field: 'text' | 'imageUrl', value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };
  
  const handleMultiCorrectChange = (index: number) => {
    const newIndices = correctAnswerIndices.includes(index)
      ? correctAnswerIndices.filter(i => i !== index)
      : [...correctAnswerIndices, index];
    setCorrectAnswerIndices(newIndices);
  }

  const renderAnswerFields = () => {
    switch(questionType) {
      case QuestionType.SingleCorrect:
        return options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correctAnswer" checked={correctAnswerIndex === i} onChange={() => setCorrectAnswerIndex(i)} className="form-radio h-5 w-5 text-indigo-500 bg-gray-800 border-gray-600 focus:ring-indigo-500 flex-shrink-0"/>
            <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${i + 1} Text`} className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"/>
            <ImageUploader imageUrl={opt.imageUrl || ''} setImageUrl={(url) => handleOptionChange(i, 'imageUrl', url)} placeholder="Add Image" />
          </div>
        ));
      case QuestionType.MultipleCorrect:
        return options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="checkbox" checked={correctAnswerIndices.includes(i)} onChange={() => handleMultiCorrectChange(i)} className="form-checkbox h-5 w-5 text-indigo-500 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500 flex-shrink-0"/>
            <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${i + 1} Text`} className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"/>
            <ImageUploader imageUrl={opt.imageUrl || ''} setImageUrl={(url) => handleOptionChange(i, 'imageUrl', url)} placeholder="Add Image" />
          </div>
        ));
      case QuestionType.FillInTheBlank:
        return <input type="text" value={correctAnswerText} onChange={e => setCorrectAnswerText(e.target.value)} placeholder="Correct Answer" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"/>;
      default: return null;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetForm} title={`Add Question to ${subjectName}`} size="xl">
        <div className="space-y-4">
          <div className="p-3 bg-gray-900/50 rounded-lg space-y-2">
            <h3 className="font-semibold text-indigo-300">Generate with AI</h3>
            <div className="flex flex-wrap gap-2 items-center">
                <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder={`Topic (e.g., 'React Hooks')`} className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm min-w-[200px]"/>
                <select value={aiQuestionType} onChange={e => setAiQuestionType(e.target.value as QuestionType)} className="bg-gray-700 border border-gray-600 rounded-md p-2 text-sm">
                    {Object.values(QuestionType).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <Button onClick={handleGenerateAI} disabled={isGenerating} className="whitespace-nowrap">
                    {isGenerating ? <Spinner size="sm"/> : 'Generate'}
                </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400">Question Type</label>
              <select value={questionType} onChange={e => setQuestionType(e.target.value as QuestionType)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1">
                {Object.values(QuestionType).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-400">Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1">
                    {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400">Marks</label>
                    <input type="number" value={marks} min="1" onChange={e => setMarks(parseInt(e.target.value) || 1)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1"/>
                </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Question Text" rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" />
            <div className="pt-1">
              <ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} placeholder="Add Question Image" />
            </div>
          </div>
         
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-medium text-gray-400">{questionType === QuestionType.FillInTheBlank ? "Correct Answer" : "Options & Correct Answer(s)"}</h4>
            {renderAnswerFields()}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSaveQuestion}>Save Question</Button>
          </div>
        </div>
    </Modal>
  );
};

export default AddQuestionModal;
