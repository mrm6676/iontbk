import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Plus, 
  Trash2, 
  Key, 
  Send, 
  Sparkles, 
  Upload, 
  FileText, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  BookMarked,
  HelpCircle,
  Copy,
  Info,
  Globe,
  Volume2,
  VolumeX,
  RefreshCw,
  Image as ImageIcon,
  GraduationCap,
  Sparkle,
  Bookmark,
  Share2,
  Check,
  Play,
  Square
} from 'lucide-react';

// Setup external PDF.js for extraction if available, otherwise we use fallback text parsing
const PDF_JS_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';

export default function App() {
  // Theme & Layout State
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'study' | 'visuals'
  
  // API Key & Connection State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('io_notebook_gemini_key') || '');
  const [apiStatus, setApiStatus] = useState('idle'); // 'idle' | 'checking' | 'connected' | 'error'
  const [apiError, setApiError] = useState('');
  
  // Toast notifications state
  const [notifications, setNotifications] = useState([]);
  
  // Documents & Notebooks State
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('io_notebook_documents');
    return saved ? JSON.parse(saved) : [
      {
        id: 'welcome-doc',
        name: 'Quantum Computing Brief.txt',
        type: 'text/plain',
        content: `QUANTUM COMPUTING: AN ESSENTIAL OVERVIEW\n\nQuantum computing is an emerging field of computer science that harnesses the principles of quantum mechanics to process information in revolutionary ways. While classical computers rely on binary bits (0s and 1s) as their basic unit of information, quantum computers leverage qubits (quantum bits).\n\nKey Concepts:\n\n1. Superposition:\nSuperposition allows a qubit to exist in a state that is a linear combination of both 0 and 1 simultaneously. This enables quantum computers to evaluate multiple possibilities at once, exponentially accelerating certain calculation types.\n\n2. Entanglement:\nEntanglement is a unique quantum phenomenon where qubits become interconnected. The state of one qubit instantaneously determines the state of another, no matter how far apart they are. This allows highly synchronized and parallel computational performance.\n\n3. Decoherence:\nOne of the greatest engineering challenges is maintaining "coherence". Decoherence occurs when external environmental noise disrupts qubits, causing them to lose their quantum state and introduce errors. Quantum error correction is a crucial area of active research to build fault-tolerant machines.\n\nReal-World Applications:\n- Cryptography: Decrypting current encryption schemes and creating new quantum-resistant systems.\n- Molecular Modeling: Simulating molecular structures to accelerate vaccine and material developments.\n- Optimization: Enhancing supply-chain logistical operations on global scales.`,
        addedAt: new Date().toISOString()
      }
    ];
  });
  const [selectedDocId, setSelectedDocId] = useState('welcome-doc');
  
  // PDF.js library status
  const [pdfLibReady, setPdfLibReady] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Grounding and TTS Option States
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('Zephyr'); // 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const [ttsLoadingId, setTtsLoadingId] = useState(null);

  // Chat Scope & Persona States for the chatbot
  const [chatScope, setChatScope] = useState('document'); // 'document' | 'general'
  const [chatPersona, setChatPersona] = useState('scholar'); // 'scholar' | 'socratic' | 'analyst' | 'creative'
  const [generalChats, setGeneralChats] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your versatile IO Chatbot companion. I am currently running in General Knowledge mode (free of file constraints). Feel free to ask me anything, or switch to Document mode to focus on your uploaded file!',
      timestamp: new Date().toISOString()
    }
  ]);

  // Chat & Conversation state (per document)
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('io_notebook_chats');
    return saved ? JSON.parse(saved) : {
      'welcome-doc': [
        { 
          sender: 'assistant', 
          text: 'Welcome to the IO Notebook. I have initialized the Quantum Computing Overview. Check out the top workspace tabs: read the material on the [Document Canvas], generate structural mock exams on [Interactive Cards & Quizzes], or use Imagen 4.0 to render conceptual diagrams in the [Board (Visuals)]!', 
          timestamp: new Date().toISOString() 
        }
      ]
    };
  });
  
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Structured AI Flashcards & Quizzes State
  const [studyGuides, setStudyGuides] = useState({}); // mapped by doc.id
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({}); // mapped by docId -> { questionIdx: optionIdx }
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Concept illustrations state (Imagen)
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [sketchPrompt, setSketchPrompt] = useState('An elegant line-art schematic drawing explaining quantum superposition, dark minimalist vector style');

  // Refs for audio player and document scrolling
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeAudioRef = useRef(null);

  // Load PDF.js dynamically
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfLibReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = PDF_JS_LIB_URL;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      setPdfLibReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('io_notebook_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('io_notebook_chats', JSON.stringify(chats));
  }, [chats]);

  // Handle auto-scroll on new chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, generalChats, selectedDocId, isGenerating, chatScope]);

  // Auto-validate API key on load if it exists
  useEffect(() => {
    if (apiKey) {
      validateApiKey(apiKey);
    }
  }, []);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || null;

  // Custom Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Convert raw signed PCM 16-bit array buffer to browser-playable WAV container
  const pcmToWav = (pcm16, sampleRate) => {
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);
    
    // Write RIFF Header
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcm16.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate (SampleRate * Align)
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16-bit
    writeString(view, 36, 'data');
    view.setUint32(40, pcm16.length * 2, true);

    // Write PCM data samples
    for (let i = 0; i < pcm16.length; i++) {
      view.setInt16(44 + i * 2, pcm16[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Validate the API Key with a lightweight request to the Gemini models endpoint
  const validateApiKey = async (keyToValidate) => {
    if (!keyToValidate || keyToValidate.trim() === '') {
      setApiStatus('idle');
      return;
    }
    setApiStatus('checking');
    setApiError('');
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToValidate}`);
      if (response.ok) {
        setApiStatus('connected');
        localStorage.setItem('io_notebook_gemini_key', keyToValidate);
        addToast('Gemini API connection established successfully.', 'success');
      } else {
        const errData = await response.json();
        setApiStatus('error');
        setApiError(errData.error?.message || 'Invalid API key or network error.');
        addToast('Invalid API Key. Connection failed.', 'error');
      }
    } catch (err) {
      setApiStatus('error');
      setApiError('Network request failed. Please check connection.');
      addToast('Network request failed.', 'error');
    }
  };

  const handleApiKeyChange = (e) => {
    const key = e.target.value.trim();
    setApiKey(key);
    if (!key) {
      setApiStatus('idle');
      localStorage.removeItem('io_notebook_gemini_key');
    }
  };

  const processUploadedFile = async (file) => {
    if (!file) return;

    const fileId = 'doc_' + Date.now();
    const newDoc = {
      id: fileId,
      name: file.name,
      type: file.type,
      addedAt: new Date().toISOString(),
      content: ''
    };

    setIsExtracting(true);

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        newDoc.content = text;
        finalizeDocUpload(newDoc);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        if (!pdfLibReady || !window.pdfjsLib) {
          throw new Error('PDF processing engine is still loading. Please try again in a few seconds.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let extractedText = '';
        const maxPages = Math.min(pdf.numPages, 100);
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
        }

        if (pdf.numPages > 100) {
          extractedText += `\n[Truncated: PDF exceeded 100 pages limit for client-side extraction]`;
        }

        newDoc.content = extractedText.trim() || 'No readable text content extracted from this PDF.';
        finalizeDocUpload(newDoc);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or plain text file.');
      }
    } catch (err) {
      addToast(`Error reading file: ${err.message}`, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const finalizeDocUpload = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
    addToast(`Imported ${newDoc.name}`, 'success');
    
    setChats(prev => ({
      ...prev,
      [newDoc.id]: [
        { 
          sender: 'assistant', 
          text: `Successfully imported "${newDoc.name}". Switch to the [Interactive Cards] tab to generate flashcards, or ask direct analytical questions here.`, 
          timestamp: new Date().toISOString() 
        }
      ]
    }));
  };

  const handleDeleteDoc = (id, e) => {
    e.stopPropagation();
    if (documents.length <= 1) {
      addToast("You must maintain at least one context document.", 'info');
      return;
    }
    
    const updatedDocs = documents.filter(d => d.id !== id);
    setDocuments(updatedDocs);
    
    const updatedChats = { ...chats };
    delete updatedChats[id];
    setChats(updatedChats);

    if (selectedDocId === id) {
      setSelectedDocId(updatedDocs[0].id);
    }
    addToast('Document removed from workspace.', 'info');
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Query Gemini API using the standard model and optional search grounding
  const queryGemini = async (userPrompt, documentContent) => {
    if (!apiKey) {
      throw new Error("API Key is missing. Please set your Gemini API key.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    
    // Choose persona system instructions
    let personaPrompt = "You are IO Scholar, a high-performance minimalist research companion. Provide direct, highly precise, and well-structured scholarly answers.";
    if (chatPersona === 'socratic') {
      personaPrompt = "You are a Socratic Tutor. Do not give answers directly. Instead, ask thoughtful guiding questions to help the user discover the answer themselves based on current content.";
    } else if (chatPersona === 'analyst') {
      personaPrompt = "You are a Rigorous Technical Analyst. Deconstruct topics into key logic, pros/cons, critical metrics, and structural steps with Markdown tables if helpful.";
    } else if (chatPersona === 'creative') {
      personaPrompt = "You are a Creative Spark partner. Inspire the user with out-of-the-box ideas, vivid metaphors, and lateral thinking pathways.";
    }

    const systemPrompt = `${personaPrompt} Incorporate clean Markdown styling. If Web Search Grounding is activated, integrate factual discoveries alongside local file analytics. Always cite web research accurately.`;
    
    // Build context based on scope
    const contextHeader = chatScope === 'document' 
      ? `[LOCAL DOC CONTEXT]\n${documentContent || "No document loaded."}\n[END OF LOCAL DOC CONTEXT]` 
      : `[GENERAL CHAT ASSISTANT MODE - NO DOC ATTACHED]`;

    const userQuery = `
${contextHeader}

User Request: ${userPrompt}
`;

    const payload = {
      contents: [
        {
          parts: [
            { text: userQuery }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          { text: systemPrompt }
        ]
      }
    };

    // If search grounding is toggled on, attach the google_search tool
    if (searchGrounding) {
      payload.tools = [{ "google_search": {} }];
    }

    let retries = 3;
    let delay = 1000;
    
    while (retries > 0) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const candidate = result.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;
          
          if (text) {
            // Extract grounding attributions if any exist
            let sources = [];
            const groundingMetadata = candidate.groundingMetadata;
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
              sources = groundingMetadata.groundingAttributions
                .map(attribution => ({
                  uri: attribution.web?.uri,
                  title: attribution.web?.title,
                }))
                .filter(source => source.uri && source.title);
            }
            return { text, sources };
          } else {
            throw new Error("Gemini returned an empty content part.");
          }
        } else {
          const errData = await response.json();
          throw new Error(errData.error?.message || `API Response status ${response.status}`);
        }
      } catch (error) {
        retries -= 1;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;

    if (apiStatus !== 'connected') {
      addToast("Please input and validate a Gemini API Key first.", 'error');
      return;
    }

    const currentMessageText = promptInput;
    setPromptInput('');
    
    const userMessage = {
      sender: 'user',
      text: currentMessageText,
      timestamp: new Date().toISOString()
    };
    
    const currentDocId = selectedDocId;
    const isDocScope = chatScope === 'document';
    
    if (isDocScope) {
      setChats(prev => ({
        ...prev,
        [currentDocId]: [...(prev[currentDocId] || []), userMessage]
      }));
    } else {
      setGeneralChats(prev => [...prev, userMessage]);
    }

    setIsGenerating(true);

    try {
      const docContext = isDocScope && selectedDoc ? selectedDoc.content : '';
      const replyData = await queryGemini(currentMessageText, docContext);
      
      const assistantMessage = {
        sender: 'assistant',
        text: replyData.text,
        sources: replyData.sources || [],
        timestamp: new Date().toISOString()
      };

      if (isDocScope) {
        setChats(prev => ({
          ...prev,
          [currentDocId]: [...(prev[currentDocId] || []), assistantMessage]
        }));
      } else {
        setGeneralChats(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage = {
        sender: 'assistant',
        text: `⚠️ **Generation Error:** ${err.message || 'Could not connect to Gemini. Verify your key and status.'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      if (isDocScope) {
        setChats(prev => ({
          ...prev,
          [currentDocId]: [...(prev[currentDocId] || []), errorMessage]
        }));
      } else {
        setGeneralChats(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Play conversational reading using gemini-2.5-flash-preview-tts
  const playSpeech = async (msgId, textToSpeak) => {
    if (!apiKey) {
      addToast('No API Key detected. Audio compilation cancelled.', 'error');
      return;
    }
    
    // Clean string by removing raw markdown symbols for a more natural audio synthesis
    const cleanText = textToSpeak
      .replace(/[\*\#\_\`\[\]\(\)\-\+\=]/g, ' ')
      .slice(0, 700); // limit payload size for performance

    // Stop current track if already playing
    if (isPlayingAudio) {
      if (activeSpeechText === textToSpeak) {
        stopSpeech();
        return;
      }
      stopSpeech();
    }

    setTtsLoadingId(msgId);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [{ text: `Say naturally and clearly: ${cleanText}` }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: ttsVoice }
            }
          }
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('TTS API request failed');
      }

      const result = await response.json();
      const part = result?.candidates?.[0]?.content?.parts?.[0];
      const audioData = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType;

      if (audioData && mimeType && mimeType.startsWith("audio/")) {
        const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] || '24000', 10);
        const pcmData = base64ToArrayBuffer(audioData);
        const pcm16 = new Int16Array(pcmData);
        const wavBlob = pcmToWav(pcm16, sampleRate);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        const audioObj = new Audio(audioUrl);
        activeAudioRef.current = audioObj;
        setActiveSpeechText(textToSpeak);
        setIsPlayingAudio(true);
        
        audioObj.play();
        audioObj.onended = () => {
          setIsPlayingAudio(false);
          setActiveSpeechText('');
        };
      } else {
        throw new Error('Invalid audio data returned.');
      }
    } catch (err) {
      addToast(`TTS Error: ${err.message}`, 'error');
    } finally {
      setTtsLoadingId(null);
    }
  };

  const stopSpeech = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setActiveSpeechText('');
  };

  // Call Gemini structured LLM responses with defined Schema
  const generateStudyGuide = async () => {
    if (apiStatus !== 'connected') {
      addToast('Ensure API Key status is active.', 'error');
      return;
    }
    if (!selectedDoc) {
      addToast('No active document to summarize.', 'info');
      return;
    }

    setStudyGuideLoading(true);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{
          parts: [{
            text: `Analyze this material and compile exactly 5 comprehensive academic flashcards (providing specific questions and exhaustive answers) and exactly 3 complex multiple choice questions (composed of a high-quality question, an array of 4 logical string options, and the matching 0-indexed correctOptionIndex integer) summarizing the main concepts:\n\n${selectedDoc.content}`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              flashcards: {
                type: "ARRAY",
                description: "List of educational flashcards.",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING" },
                    answer: { type: "STRING" }
                  },
                  required: ["question", "answer"]
                }
              },
              quiz: {
                type: "ARRAY",
                description: "Factual multiple choice checking blocks.",
                items: {
                  type: "OBJECT",
                  properties: {
                    question: { type: "STRING" },
                    options: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    },
                    correctOptionIndex: { type: "INTEGER" }
                  },
                  required: ["question", "options", "correctOptionIndex"]
                }
              }
            },
            required: ["flashcards", "quiz"]
          }
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const contentJson = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (contentJson) {
        const parsedGuide = JSON.parse(contentJson);
        setStudyGuides(prev => ({
          ...prev,
          [selectedDoc.id]: parsedGuide
        }));
        setActiveCardIdx(0);
        setCardFlipped(false);
        // Reset active user selections
        setQuizAnswers(prev => ({ ...prev, [selectedDoc.id]: {} }));
        addToast('Interactive flashcards generated successfully.', 'success');
      } else {
        throw new Error('Received an empty structured object block.');
      }
    } catch (err) {
      addToast(`Study Guide Compilation Error: ${err.message}`, 'error');
    } finally {
      setStudyGuideLoading(false);
    }
  };

  const handleAnswerSelect = (questionIdx, optionIdx) => {
    setQuizAnswers(prev => ({
      ...prev,
      [selectedDoc.id]: {
        ...(prev[selectedDoc.id] || {}),
        [questionIdx]: optionIdx
      }
    }));
  };

  // Use Imagen model to visualize concepts
  const generateVisualDiagram = async () => {
    if (apiStatus !== 'connected') {
      addToast('API key connection required to invoke Imagen models.', 'error');
      return;
    }
    if (!sketchPrompt.trim()) return;

    setImageLoading(true);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const payload = {
        instances: { prompt: sketchPrompt },
        parameters: { sampleCount: 1 }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error?.message || 'Diagram compile crashed.');
      }

      const result = await response.json();
      const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;

      if (base64Data) {
        const finalUrl = `data:image/png;base64,${base64Data}`;
        setGeneratedImages(prev => [
          {
            id: 'img_' + Date.now(),
            url: finalUrl,
            prompt: sketchPrompt,
            docName: selectedDoc?.name || 'General Board',
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
        addToast('Conceptual diagram synthesized successfully.', 'success');
      } else {
        throw new Error('Imagen returned empty prediction array.');
      }
    } catch (err) {
      addToast(`Imagen Synthesis Error: ${err.message}`, 'error');
    } finally {
      setImageLoading(false);
    }
  };

  const triggerQuickAction = async (actionType) => {
    let actionPrompt = '';
    switch (actionType) {
      case 'summarize':
        actionPrompt = "Produce a clean comprehensive summary list highlighting all critical arguments in structured markdown.";
        break;
      case 'key_facts':
        actionPrompt = "Synthesize exactly 5 core data metrics or facts embedded inside this file.";
        break;
      case 'outline':
        actionPrompt = "Build an academic schematic outline representing the structural hierarchy of this text.";
        break;
      default:
        return;
    }
    setPromptInput(actionPrompt);
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      addToast('Copied content to clipboard!', 'success');
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleClearChatHistory = () => {
    if (chatScope === 'document') {
      setChats(prev => ({
        ...prev,
        [selectedDocId]: [
          {
            sender: 'assistant',
            text: 'Conversation history reset. How can I assist you with this document context?',
            timestamp: new Date().toISOString()
          }
        ]
      }));
    } else {
      setGeneralChats([
        {
          sender: 'assistant',
          text: 'General chat session cleared. Ask me anything!',
          timestamp: new Date().toISOString()
        }
      ]);
    }
    addToast('Conversation history reset.', 'info');
  };

  // Determine active chats depending on Chat Scope
  const activeChats = chatScope === 'document' ? (chats[selectedDocId] || []) : generalChats;
  const currentStudyGuide = studyGuides[selectedDocId] || null;
  const currentDocAnswers = quizAnswers[selectedDocId] || {};

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative select-none ${darkMode ? 'bg-[#0E0F11]' : 'bg-[#FAFAF9]'}`}>
      
      {/* Toast notifications container */}
      <div className="fixed top-20 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3.5 rounded-xl border text-xs font-medium shadow-lg pointer-events-auto animate-slide-in flex items-start gap-2.5 ${
              n.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/35 text-emerald-300'
                : n.type === 'error'
                  ? 'bg-red-950/90 border-red-500/35 text-red-300'
                  : 'bg-neutral-900/95 border-neutral-800 text-neutral-300'
            }`}
          >
            {n.type === 'success' && <CheckCircle2 size={15} className="shrink-0 text-emerald-400 mt-0.5" />}
            {n.type === 'error' && <XCircle size={15} className="shrink-0 text-red-400 mt-0.5" />}
            {n.type === 'info' && <Info size={15} className="shrink-0 text-blue-400 mt-0.5" />}
            <span className="leading-tight">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Premium Minimal Header */}
      <header className={`sticky top-0 z-40 px-6 py-4 flex flex-wrap gap-4 items-center justify-between border-b ${darkMode ? 'bg-[#0E0F11]/95 border-neutral-800/80' : 'bg-[#FAFAF9]/95 border-stone-200'} backdrop-blur-md`}>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-md transition-colors ${darkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-stone-200 text-stone-500 hover:text-stone-900'}`}
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${darkMode ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-emerald-600'}`}></div>
            <span className="font-semibold tracking-wide text-md">IO NOTEBOOK</span>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full ${darkMode ? 'bg-neutral-800/80 text-neutral-400' : 'bg-stone-200/80 text-stone-600'}`}>v1.2</span>
        </div>

        {/* Gemini API Input and Glowing Connection Indicator */}
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1 sm:flex-none max-w-md">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key size={14} className={darkMode ? 'text-neutral-500' : 'text-stone-400'} />
            </div>
            <input
              type="password"
              placeholder="Paste Gemini API Key..."
              value={apiKey}
              onChange={handleApiKeyChange}
              onBlur={() => validateApiKey(apiKey)}
              className={`w-full pl-9 pr-24 py-1.5 text-xs rounded-lg transition-all focus:outline-none focus:ring-1 ${
                darkMode 
                  ? 'bg-neutral-900 border-neutral-850 text-neutral-200 focus:ring-neutral-700 focus:border-neutral-700' 
                  : 'bg-white border-stone-200 text-stone-800 focus:ring-stone-400 focus:border-stone-400'
              } border`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {apiStatus === 'checking' && (
                <span className="text-[10px] animate-pulse text-yellow-500">Checking...</span>
              )}
              {apiStatus === 'connected' && (
                <span className="text-[10px] text-emerald-500 font-medium">Active</span>
              )}
              {apiStatus === 'error' && (
                <span className="text-[10px] text-red-500 font-medium">Invalid Key</span>
              )}
              {apiStatus === 'idle' && (
                <span className="text-[10px] text-neutral-500">No Key</span>
              )}
            </div>
          </div>

          {/* Glowing Status Dot */}
          <div className="flex items-center space-x-1.5" title={`Status: ${apiStatus}`}>
            <span className="relative flex h-3 w-3">
              {apiStatus === 'connected' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 transition-colors duration-500 ${
                apiStatus === 'connected' ? 'bg-emerald-400' :
                apiStatus === 'checking' ? 'bg-amber-400' :
                apiStatus === 'error' ? 'bg-red-500' : 'bg-neutral-600'
              }`}></span>
            </span>
            <span className="text-[11px] font-mono tracking-tight hidden md:inline">
              {apiStatus === 'connected' ? 'IO_ON' : 'IO_OFF'}
            </span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-350' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'}`}
            title="Toggle theme"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex min-h-[calc(100vh-73px)] relative overflow-x-hidden">

        {/* Document Directory Sidebar */}
        <aside className={`transition-all duration-300 ease-in-out border-r shrink-0 flex flex-col ${
          sidebarOpen ? 'w-80 opacity-100' : 'w-0 -translate-x-full opacity-0 pointer-events-none'
        } ${
          darkMode ? 'bg-[#0E0F11] border-neutral-800/80' : 'bg-[#FAFAF9] border-stone-200'
        }`}>
          
          <div className="p-4 flex flex-col h-full flex-1">
            {/* Minimal Dropping Workspace */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileUpload}
              className={`border-2 border-dashed rounded-xl p-5 mb-5 text-center cursor-pointer transition-all ${
                darkMode 
                  ? 'border-neutral-850 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-900/40' 
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100/50'
              }`}
            >
              <Upload size={24} className={`mx-auto mb-2.5 ${darkMode ? 'text-neutral-500' : 'text-stone-400'}`} />
              <p className="text-xs font-medium">Upload or Drop File Context</p>
              <p className="text-[10px] text-neutral-500 mt-1">PDF, TXT, or Markdown formats</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => processUploadedFile(e.target.files[0])}
                className="hidden" 
                accept=".pdf,.txt,.md"
              />
            </div>

            {/* Document Collection List */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold tracking-wider uppercase text-neutral-500">Document Shelf</span>
              <span className="text-[11px] text-neutral-400 font-mono">{documents.length} File{documents.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] pr-1">
              {documents.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setCardFlipped(false);
                      setActiveCardIdx(0);
                    }}
                    className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? (darkMode ? 'bg-neutral-900/90 border-emerald-500/40 text-white shadow-md shadow-emerald-950/10' : 'bg-white border-emerald-600/30 text-stone-900 shadow-md shadow-stone-200') 
                        : (darkMode ? 'hover:bg-neutral-950 bg-neutral-950/15 border-neutral-850/60 text-neutral-400 hover:text-neutral-200' : 'hover:bg-stone-100 bg-stone-100/30 border-stone-200/60 text-stone-600 hover:text-stone-800')
                    } border-2 pl-4`}
                  >
                    {/* Active state highlight strip */}
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-md" />
                    )}
                    <div className="flex items-center space-x-2.5 min-w-0 pr-6">
                      <FileText size={16} className={isSelected ? 'text-emerald-500' : 'text-neutral-500'} />
                      <div className="truncate">
                        <p className={`text-xs truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>{doc.name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {new Date(doc.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-all"
                      title="Remove file"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom Interactive Voices Panel for TTS */}
            <div className={`mt-auto pt-4 border-t ${darkMode ? 'border-neutral-800/85' : 'border-stone-200'}`}>
              <div className="p-3.5 rounded-lg bg-zinc-950/20 border border-neutral-800">
                <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase block mb-2">TTS Vocal Preset</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'Zephyr', label: 'Zephyr (Bright)' },
                    { id: 'Puck', label: 'Puck (Upbeat)' },
                    { id: 'Charon', label: 'Charon (Info)' },
                    { id: 'Kore', label: 'Kore (Firm)' },
                    { id: 'Fenrir', label: 'Fenrir (Live)' }
                  ].map((voiceObj) => (
                    <button
                      key={voiceObj.id}
                      onClick={() => {
                        setTtsVoice(voiceObj.id);
                        addToast(`Vocal model changed to ${voiceObj.id}`, 'info');
                      }}
                      className={`text-[10px] py-1 px-2 rounded font-medium text-left transition-all truncate border ${
                        ttsVoice === voiceObj.id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                          : 'bg-transparent border-neutral-800/40 text-neutral-400 hover:bg-neutral-900/60'
                      }`}
                    >
                      {voiceObj.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Workspace Tab Selector Grid */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          <section className={`flex-1 flex flex-col p-6 min-w-0 ${darkMode ? 'bg-[#0E0F11]' : 'bg-[#FAFAF9]'}`}>
            
            {/* Highly Visible Active File Bar */}
            {selectedDoc && (
              <div className={`p-4 rounded-xl border mb-5 flex flex-wrap gap-4 items-center justify-between transition-all ${
                darkMode 
                  ? 'bg-neutral-900/60 border-neutral-800/80 shadow-inner' 
                  : 'bg-stone-100/80 border-stone-200 shadow-sm'
              }`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2.5 rounded-lg ${
                    darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-600/10 text-emerald-600'
                  }`}>
                    <FileText size={18} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${
                      darkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      Current File Context
                    </span>
                    <h2 className="text-sm font-bold truncate mt-1">
                      {selectedDoc.name}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`text-[10px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-md border ${
                    darkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                    {selectedDoc.type?.includes('pdf') ? '📄 PDF Document' : '📝 Text/MD File'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedDoc.content)}
                    className={`p-2 rounded-lg transition-all border ${
                      darkMode 
                        ? 'bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white' 
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-500 hover:text-stone-900'
                    }`}
                    title="Copy full material content"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Tab navigation headers */}
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/60 pb-3 mb-5 gap-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('canvas')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-medium border ${
                    activeTab === 'canvas'
                      ? 'bg-neutral-900 border-neutral-850 text-white font-bold'
                      : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <BookOpen size={13} />
                  Document Canvas
                </button>
                <button
                  onClick={() => setActiveTab('study')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-medium border ${
                    activeTab === 'study'
                      ? 'bg-neutral-900 border-neutral-850 text-white font-bold'
                      : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <GraduationCap size={13} className="text-emerald-400" />
                  Interactive Cards & Quizzes
                </button>
                <button
                  onClick={() => setActiveTab('visuals')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-medium border ${
                    activeTab === 'visuals'
                      ? 'bg-neutral-900 border-neutral-850 text-white font-bold'
                      : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <ImageIcon size={13} className="text-blue-400" />
                  Board (Visuals)
                </button>
              </div>

              {/* Universal Document Quick Actions */}
              {selectedDoc && activeTab === 'canvas' && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => selectedDoc && copyToClipboard(selectedDoc.content)}
                    className={`p-1.5 rounded transition-colors ${
                      darkMode ? 'hover:bg-neutral-900 text-neutral-400 hover:text-white' : 'hover:bg-stone-200 text-stone-500 hover:text-stone-900'
                    }`}
                    title="Copy full material content"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Content Switcher depending on Tab */}
            <div className="flex-1 flex flex-col relative min-h-[350px]">
              
              {/* TAB 1: Classic Canvas */}
              {activeTab === 'canvas' && (
                <div className="flex-1 flex flex-col h-full">
                  {isExtracting ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-xs font-mono text-emerald-400 animate-pulse">EXTRACTING MATERIAL TEXT CONTEXT...</p>
                    </div>
                  ) : selectedDoc ? (
                    <div className="flex-1 flex flex-col h-full">
                      <div className={`flex-1 p-5 rounded-xl font-mono text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap max-h-[64vh] border shadow-sm ${
                        darkMode 
                          ? 'bg-[#121316] border-neutral-850 text-neutral-300 selection:bg-neutral-800' 
                          : 'bg-white border-stone-200 text-stone-700 selection:bg-stone-100'
                      }`}>
                        {selectedDoc.content}
                      </div>
                      
                      {/* Interactive Prompt Assist Chips */}
                      <div className="mt-4 pt-4 border-t border-neutral-800/40">
                        <p className="text-[11px] text-neutral-500 mb-2 font-mono uppercase tracking-wider">Fast-Track LLM Inputs:</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => triggerQuickAction('summarize')}
                            className="text-xs px-3 py-1.5 rounded-lg border bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 text-emerald-400 transition-all"
                          >
                            📝 Draft Summary
                          </button>
                          <button
                            onClick={() => triggerQuickAction('key_facts')}
                            className="text-xs px-3 py-1.5 rounded-lg border bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10 text-blue-400 transition-all"
                          >
                            💎 Synthesize Crucial Data
                          </button>
                          <button
                            onClick={() => triggerQuickAction('outline')}
                            className="text-xs px-3 py-1.5 rounded-lg border bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/10 text-purple-400 transition-all"
                          >
                            📋 Outline Conceptual Hierarchy
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl py-20 text-neutral-500">
                      <BookOpen size={40} className="mb-3 opacity-40" />
                      <p className="text-xs">Select or drop a file in the sidebar directory first.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Interactive Flashcard Study Guide */}
              {activeTab === 'study' && (
                <div className="flex-1 flex flex-col h-full">
                  
                  {!selectedDoc ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl py-20 text-neutral-500">
                      <GraduationCap size={40} className="mb-3 opacity-40 text-emerald-400" />
                      <p className="text-xs">No active file to generate cards for.</p>
                    </div>
                  ) : !currentStudyGuide ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-neutral-850 rounded-xl p-8 text-center bg-zinc-950/20">
                      <GraduationCap size={36} className="mx-auto mb-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold mb-2">Build Interactive Flashcard Suite</h3>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-6">
                        Uses strict JSON structure schema within the Gemini API to analyze document vocabulary and extract matching flipcards and graded study diagnostics.
                      </p>
                      
                      <button
                        onClick={generateStudyGuide}
                        disabled={studyGuideLoading || apiStatus !== 'connected'}
                        className={`text-xs font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 mx-auto ${
                          apiStatus === 'connected'
                            ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {studyGuideLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            Compiling JSON Schema...
                          </>
                        ) : (
                          <>
                            <Sparkle size={13} />
                            Generate Flashcard Deck
                          </>
                        )}
                      </button>
                      
                      {apiStatus !== 'connected' && (
                        <p className="text-[10px] text-red-400 mt-2">Verified Gemini Key validation required.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col md:flex-row gap-6">
                      
                      {/* Left: Study Flipcards */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Interactive Study Deck</span>
                          <span className="text-xs font-mono text-neutral-500">Card {activeCardIdx + 1} / {currentStudyGuide.flashcards.length}</span>
                        </div>

                        {/* Interactive Flip Card container */}
                        <div 
                          onClick={() => setCardFlipped(!cardFlipped)}
                          className={`flex-1 min-h-[190px] p-6 rounded-2xl border cursor-pointer select-none relative transition-all duration-300 flex items-center justify-center text-center ${
                            cardFlipped 
                              ? 'bg-neutral-950/80 border-emerald-500/40 shadow-sm shadow-emerald-500/5' 
                              : 'bg-zinc-900 border-neutral-800 hover:border-neutral-750'
                          }`}
                        >
                          <div className="absolute top-3 right-4 text-[9px] uppercase font-mono tracking-wider text-neutral-500">
                            {cardFlipped ? 'REVERSE (Answer)' : 'OBVERSE (Question)'}
                          </div>

                          <div className="max-w-md">
                            {!cardFlipped ? (
                              <p className="text-sm font-semibold leading-relaxed font-mono">
                                {currentStudyGuide.flashcards[activeCardIdx]?.question}
                              </p>
                            ) : (
                              <p className="text-xs font-medium leading-relaxed font-mono text-emerald-300">
                                {currentStudyGuide.flashcards[activeCardIdx]?.answer}
                              </p>
                            )}
                          </div>

                          <div className="absolute bottom-3 text-[10px] text-neutral-500 font-mono">
                            Click card body to flip and study
                          </div>
                        </div>

                        {/* Deck Control buttons */}
                        <div className="flex items-center justify-between mt-4">
                          <button
                            onClick={() => {
                              setActiveCardIdx(prev => Math.max(0, prev - 1));
                              setCardFlipped(false);
                            }}
                            disabled={activeCardIdx === 0}
                            className={`p-2 rounded-lg border ${
                              activeCardIdx === 0
                                ? 'border-neutral-900 text-neutral-700 cursor-not-allowed'
                                : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          <button
                            onClick={generateStudyGuide}
                            className="text-[10px] font-semibold text-neutral-400 hover:text-emerald-400 flex items-center gap-1 py-1 px-3 border border-neutral-800 rounded hover:bg-neutral-900"
                            title="Regenerate cards"
                          >
                            <RefreshCw size={11} /> Re-Generate
                          </button>

                          <button
                            onClick={() => {
                              setActiveCardIdx(prev => Math.min(currentStudyGuide.flashcards.length - 1, prev + 1));
                              setCardFlipped(false);
                            }}
                            disabled={activeCardIdx === currentStudyGuide.flashcards.length - 1}
                            className={`p-2 rounded-lg border ${
                              activeCardIdx === currentStudyGuide.flashcards.length - 1
                                ? 'border-neutral-900 text-neutral-700 cursor-not-allowed'
                                : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                            }`}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Right: Academic Quiz */}
                      <div className="w-full md:w-[280px] shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-neutral-800/60 md:pl-6 pt-4 md:pt-0">
                        <div className="mb-3">
                          <span className="text-xs font-mono uppercase tracking-wider text-blue-400">Mock Quiz Exam</span>
                          <p className="text-[10px] text-neutral-500">Graded study diagnostics</p>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 max-h-[40vh] md:max-h-[300px]">
                          {currentStudyGuide.quiz.map((q, qIdx) => {
                            const userAnswerIdx = currentDocAnswers[qIdx];
                            const isAnswered = userAnswerIdx !== undefined;
                            
                            return (
                              <div key={qIdx} className="p-3.5 rounded-xl bg-[#121316] border border-neutral-850">
                                <p className="text-[11px] font-bold leading-normal mb-2 font-mono">
                                  {qIdx + 1}. {q.question}
                                </p>
                                
                                <div className="space-y-1">
                                  {q.options.map((option, oIdx) => {
                                    const isSelected = userAnswerIdx === oIdx;
                                    const isCorrect = q.correctOptionIndex === oIdx;
                                    
                                    let optionStyle = 'border-neutral-850 hover:bg-neutral-900';
                                    if (isAnswered) {
                                      if (isSelected) {
                                        optionStyle = isCorrect 
                                          ? 'bg-emerald-950/40 border-emerald-500/35 text-emerald-400' 
                                          : 'bg-red-950/40 border-red-500/35 text-red-400';
                                      } else if (isCorrect) {
                                        optionStyle = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
                                      } else {
                                        optionStyle = 'opacity-50 border-transparent';
                                      }
                                    } else if (isSelected) {
                                      optionStyle = 'border-emerald-500 bg-emerald-500/5 text-emerald-400';
                                    }

                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() => !isAnswered && handleAnswerSelect(qIdx, oIdx)}
                                        disabled={isAnswered}
                                        className={`w-full text-left p-2 rounded text-[10px] font-mono leading-tight border transition-all flex items-start gap-1.5 ${optionStyle}`}
                                      >
                                        <span className="opacity-50 font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                        <span>{option}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Board (Visual Concept Generator) */}
              {activeTab === 'visuals' && (
                <div className="flex-1 flex flex-col h-full">
                  
                  {/* Generation Control bar */}
                  <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] mb-5">
                    <div className="mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-blue-400">Concept Illustration Studio</span>
                      <p className="text-[10px] text-neutral-500">Synthesize visual concept graphics and design layouts directly with Imagen 4.0</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Define desired visualization prompt..."
                        value={sketchPrompt}
                        onChange={(e) => setSketchPrompt(e.target.value)}
                        className={`flex-1 px-3.5 py-1.5 text-xs rounded-lg focus:outline-none transition-all ${
                          darkMode 
                            ? 'bg-neutral-950 border-neutral-800 text-neutral-200' 
                            : 'bg-white border-stone-200 text-stone-800'
                        } border`}
                        disabled={imageLoading || apiStatus !== 'connected'}
                      />
                      
                      <button
                        onClick={generateVisualDiagram}
                        disabled={imageLoading || apiStatus !== 'connected' || !sketchPrompt.trim()}
                        className={`text-xs font-semibold py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition-all ${
                          apiStatus === 'connected' && !imageLoading
                            ? 'bg-blue-500 text-white hover:bg-blue-450'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {imageLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            Synthesizing...
                          </>
                        ) : (
                          <>
                            <ImageIcon size={13} />
                            Visualize
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Visual assets container history */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {generatedImages.length === 0 ? (
                      <div className="h-full min-h-[180px] flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-center p-6">
                        <ImageIcon size={32} className="mb-2 opacity-30 text-blue-400" />
                        <p className="text-xs">No active concept illustrations synthesized yet.</p>
                        <p className="text-[10px] text-neutral-600 mt-1 max-w-sm">
                          Enter a schematic sketch outline concept prompt in the input above to visualize your active document theories.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {generatedImages.map((img) => (
                          <div key={img.id} className="rounded-xl border border-neutral-850 bg-[#121316] overflow-hidden p-3 group relative">
                            <div className="aspect-video w-full rounded-lg bg-neutral-950 overflow-hidden relative border border-neutral-900">
                              <img 
                                src={img.url} 
                                alt={img.prompt}
                                className="w-full h-full object-contain group-hover:scale-102 transition-all duration-300"
                              />
                            </div>
                            
                            <div className="mt-3.5">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">{img.docName}</p>
                              <p className="text-xs font-medium font-mono text-zinc-300 line-clamp-2 leading-relaxed">
                                {img.prompt}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

          </section>

          {/* Interactive Chat Console (Right Pane) */}
          <section className={`w-full md:w-[420px] shrink-0 border-t md:border-t-0 md:border-l flex flex-col p-6 ${
            darkMode ? 'bg-[#111215] border-neutral-800/80' : 'bg-[#F5F5F4] border-stone-200'
          }`}>
            
            {/* Console Header */}
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-neutral-800/30">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-emerald-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-neutral-500">IO Chatbot Studio</span>
              </div>
              
              {/* Reset Thread Action */}
              <button
                onClick={handleClearChatHistory}
                className={`p-1 rounded transition-all text-neutral-500 hover:text-red-400 hover:bg-neutral-900/60`}
                title="Clear Current Chat History"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Chat Mode / Scope and Search Grounding Controllers */}
            <div className="mb-4 flex flex-col gap-2 bg-neutral-950/20 p-2.5 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">Chat Mode scope:</span>
                
                <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                  <button
                    onClick={() => {
                      setChatScope('document');
                      addToast('Chatbound to Document Context.', 'info');
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded transition-all font-medium ${
                      chatScope === 'document'
                        ? 'bg-[#121316] text-white border border-neutral-850 shadow-sm font-bold'
                        : 'text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    📄 File Doc
                  </button>
                  <button
                    onClick={() => {
                      setChatScope('general');
                      addToast('Chatbound to General Knowledge.', 'info');
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded transition-all font-medium ${
                      chatScope === 'general'
                        ? 'bg-[#121316] text-white border border-neutral-850 shadow-sm font-bold'
                        : 'text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    🌐 General
                  </button>
                </div>
              </div>

              {/* Persona selection bar */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/30">
                <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">Persona:</span>
                <select
                  value={chatPersona}
                  onChange={(e) => {
                    setChatPersona(e.target.value);
                    addToast(`AI Persona set to ${e.target.value.toUpperCase()}`, 'success');
                  }}
                  className="text-[10px] bg-[#121316] border border-neutral-800 rounded px-2 py-0.5 text-neutral-300 focus:outline-none"
                >
                  <option value="scholar">Scholar (Direct)</option>
                  <option value="socratic">Socratic (Tutor)</option>
                  <option value="analyst">Analyst (Tech/Tables)</option>
                  <option value="creative">Creative Spark (Lateral)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/30">
                <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase font-bold">Search Grounding:</span>
                <button
                  onClick={() => {
                    setSearchGrounding(!searchGrounding);
                    addToast(
                      searchGrounding ? 'Google Search Grounding disabled.' : 'Google Search Grounding active.', 
                      'info'
                    );
                  }}
                  className={`text-[10px] font-semibold py-0.5 px-2.5 rounded border transition-all flex items-center gap-1 ${
                    searchGrounding
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-transparent border-neutral-800 text-neutral-500'
                  }`}
                  title="Toggles web search model validation checks"
                >
                  <Globe size={10} className={searchGrounding ? 'animate-pulse' : ''} />
                  {searchGrounding ? 'WEB_ON' : 'OFFLINE'}
                </button>
              </div>
            </div>

            {/* Chat History scroll panel */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 max-h-[50vh] md:max-h-none">
              {activeChats.map((chat, idx) => {
                const isAssistant = chat.sender === 'assistant';
                const msgId = `msg_${idx}`;
                const isSpeaking = isPlayingAudio && activeSpeechText === chat.text;

                return (
                  <div key={idx} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-mono text-neutral-500">
                        {isAssistant ? 'IO_CHATBOT' : 'USER'}
                      </span>
                      <span className="text-[9px] text-neutral-600">
                        {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Chat Bubble card */}
                    <div className={`p-3.5 rounded-xl text-xs max-w-[95%] leading-relaxed border relative group ${
                      chat.isError 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : isAssistant 
                          ? (darkMode ? 'bg-neutral-900/60 border-neutral-850 text-neutral-200' : 'bg-white text-stone-800 border-stone-200')
                          : (darkMode ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' : 'bg-emerald-600 border-transparent text-white')
                    }`}>
                      
                      <p className="whitespace-pre-wrap select-text font-mono leading-relaxed">{chat.text}</p>
                      
                      {/* Grounding Attributions & Citation widgets if search was used */}
                      {isAssistant && chat.sources && chat.sources.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-neutral-800/60">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase block mb-1">Grounding References:</span>
                          <div className="flex flex-wrap gap-1">
                            {chat.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] py-0.5 px-2 bg-neutral-950 border border-neutral-850 rounded hover:border-neutral-700 text-neutral-400 hover:text-white flex items-center gap-1 transition-all"
                              >
                                {src.title.length > 15 ? src.title.slice(0, 15) + '...' : src.title}
                                <ExternalLink size={8} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Floating Vocal Synthesis trigger button for replies & Copy response */}
                      {isAssistant && !chat.isError && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {/* Copy code/reply text button */}
                          <button
                            onClick={() => copyToClipboard(chat.text)}
                            className="p-1 rounded text-neutral-400 hover:bg-neutral-800 hover:text-white"
                            title="Copy reply text"
                          >
                            <Copy size={11} />
                          </button>
                          
                          <button
                            onClick={() => playSpeech(msgId, chat.text)}
                            className={`p-1 rounded transition-colors ${
                              isSpeaking 
                                ? 'text-red-400 hover:bg-red-500/10' 
                                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                            }`}
                            title={isSpeaking ? 'Stop vocal synthesis' : 'Stream raw PCM model reading'}
                            disabled={ttsLoadingId !== null}
                          >
                            {ttsLoadingId === msgId ? (
                              <RefreshCw size={11} className="animate-spin text-emerald-400" />
                            ) : isSpeaking ? (
                              <Square size={11} fill="currentColor" />
                            ) : (
                              <Volume2 size={11} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isGenerating && (
                <div className="flex flex-col items-start animate-pulse">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-mono text-neutral-500">COMPILING QUERY RESPONSE...</span>
                  </div>
                  <div className={`p-4 rounded-xl text-xs max-w-[90%] ${darkMode ? 'bg-neutral-900/40 text-neutral-400' : 'bg-stone-200/40 text-stone-600'}`}>
                    <div className="flex space-x-1.5 items-center py-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Prompt Form Textarea Console */}
            <form onSubmit={handleSendMessage} className="mt-auto">
              {apiStatus !== 'connected' && (
                <div className="text-[11px] text-amber-500/80 mb-2.5 flex items-start gap-2 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p className="leading-normal font-mono">
                    Paste a Gemini Developer API key in the status field at the top of the workbench to connect this workspace to LLMs.
                  </p>
                </div>
              )}
              
              <div className="relative">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={
                    chatScope === 'document'
                      ? "Ask chatbot about this active document..."
                      : "General Chatbot mode active... Ask me anything!"
                  }
                  rows={2}
                  className={`w-full p-3.5 pr-12 text-xs rounded-xl focus:outline-none focus:ring-1 resize-none ${
                    darkMode 
                      ? 'bg-neutral-950 border-neutral-850 text-neutral-205 focus:ring-neutral-700' 
                      : 'bg-white border-stone-200 text-stone-850 focus:ring-stone-400'
                  } border`}
                  disabled={apiStatus !== 'connected'}
                />
                
                <button
                  type="submit"
                  disabled={!promptInput.trim() || isGenerating || apiStatus !== 'connected'}
                  className={`absolute right-3.5 bottom-3.5 p-2 rounded-lg transition-all ${
                    promptInput.trim() && !isGenerating && apiStatus === 'connected'
                      ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : (darkMode ? 'bg-neutral-900 text-neutral-600' : 'bg-stone-100 text-stone-400')
                  }`}
                  title="Send Prompt"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 text-center mt-2.5 font-mono">
                Press Enter to compile. Shift+Enter for newline insertion.
              </p>
            </form>
          </section>

        </main>
      </div>
    </div>
  );
}