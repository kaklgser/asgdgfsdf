import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, X, FileText, Video, Mic, MicOff } from 'lucide-react';
import { InterviewConfig, InterviewQuestion, MockInterviewSession } from '../../types/interview';
import { interviewService } from '../../services/interviewService';
import { interviewFeedbackService } from '../../services/interviewFeedbackService';
import { speechRecognitionService } from '../../services/speechRecognitionService';

interface MockInterviewRoomProps {
  config: InterviewConfig;
  userId: string;
  userName: string;
  onInterviewComplete: (sessionId: string) => void;
  onBack: () => void;
}

type InterviewStage = 'loading' | 'ready' | 'question' | 'listening' | 'processing' | 'feedback' | 'completed';

export const MockInterviewRoom: React.FC<MockInterviewRoomProps> = ({
  config,
  userId,
  userName,
  onInterviewComplete,
  onBack
}) => {
  const [stage, setStage] = useState<InterviewStage>('loading');
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing interview...');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    initializeInterview();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isPaused && stage === 'listening') {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPaused, stage]);

  const initializeInterview = async () => {
    try {
      setStatusMessage('Setting up interview session...');

      const newSession = await interviewService.createSession(config, userId);
      setSession(newSession);

      setStatusMessage('Loading interview questions...');
      let loadedQuestions: InterviewQuestion[] = [];

      if (config.interviewCategory === 'technical') {
        loadedQuestions = await interviewService.getQuestionsByCategory(
          'Technical',
          10,
          config.companyName
        );
      } else if (config.interviewCategory === 'hr') {
        loadedQuestions = await interviewService.getMixedQuestions(
          ['HR', 'Behavioral'],
          10,
          config.companyName
        );
      } else {
        loadedQuestions = await interviewService.getMixedQuestions(
          ['Technical', 'HR', 'Behavioral'],
          10,
          config.companyName
        );
      }

      if (loadedQuestions.length === 0) {
        throw new Error('No questions available for this configuration');
      }

      setQuestions(loadedQuestions);
      setStatusMessage('Requesting camera and microphone access...');

      await requestMediaPermissions();

      setStage('ready');
      setStatusMessage('Ready to start interview');
    } catch (error) {
      console.error('Error initializing interview:', error);
      alert(`Failed to initialize interview: ${(error as Error).message}`);
      onBack();
    }
  };

  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      videoStreamRef.current = stream;
      setIsMicrophoneEnabled(true);

      const videoElement = document.getElementById('user-video') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsMicrophoneEnabled(false);
      alert('Camera/microphone access denied. You can continue, but your responses will not be recorded.');
    }
  };

  const startQuestion = () => {
    setStage('question');
    setStatusMessage(`Question ${currentQuestionIndex + 1} of ${questions.length}`);
    setCurrentTranscript('');

    setTimeout(() => {
      startListening();
    }, 2000);
  };

  const startListening = async () => {
    setStage('listening');
    setStatusMessage('Listening to your answer...');
    startTimeRef.current = Date.now();

    if (isMicrophoneEnabled && videoStreamRef.current) {
      try {
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(videoStreamRef.current, {
          mimeType: 'video/webm;codecs=vp8,opus'
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting media recorder:', error);
      }
    }

    if (speechRecognitionService.isSupported()) {
      try {
        await speechRecognitionService.startListening(
          (transcript) => setCurrentTranscript(transcript),
          (finalTranscript) => setCurrentTranscript(finalTranscript),
          (error) => console.error('Speech recognition error:', error)
        );
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  };

  const stopListening = async () => {
    const responseDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (speechRecognitionService.isSupported()) {
      speechRecognitionService.stopListening();
    }

    setStage('processing');
    setStatusMessage('Processing your answer...');

    await processAnswer(responseDuration);
  };

  const processAnswer = async (responseDuration: number) => {
    try {
      if (!session || !currentQuestion) return;

      const transcript = currentTranscript || 'No answer provided';

      setStatusMessage('Analyzing your answer with AI...');
      const feedback = await interviewFeedbackService.analyzeAnswer(
        currentQuestion.question_text,
        transcript,
        currentQuestion.category,
        currentQuestion.difficulty
      );

      setStatusMessage('Saving your response...');
      await interviewService.saveResponse(
        session.id,
        currentQuestion.id,
        currentQuestionIndex + 1,
        {
          userAnswerText: transcript,
          audioTranscript: transcript,
          aiFeedback: feedback,
          individualScore: feedback.score,
          toneRating: feedback.tone_confidence_rating,
          confidenceRating: feedback.score,
          responseDuration: responseDuration
        }
      );

      setStage('feedback');
      setStatusMessage('Feedback generated');

      setTimeout(() => {
        moveToNextQuestion();
      }, 3000);
    } catch (error) {
      console.error('Error processing answer:', error);
      alert('Failed to process answer. Moving to next question.');
      moveToNextQuestion();
    }
  };

  const moveToNextQuestion = () => {
    speechRecognitionService.reset();
    setCurrentTranscript('');

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStage('question');
      setTimeout(() => startListening(), 2000);
    } else {
      completeInterview();
    }
  };

  const completeInterview = async () => {
    setStage('completed');
    setStatusMessage('Completing interview...');

    if (session) {
      const actualDuration = config.durationMinutes * 60 - timeRemaining;
      const overallScore = await interviewService.calculateOverallScore(session.id);

      await interviewService.updateSessionStatus(
        session.id,
        'completed',
        overallScore,
        actualDuration
      );

      onInterviewComplete(session.id);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      if (stage === 'listening') {
        stopListening();
      }
    }
  };

  const handleEndInterview = async () => {
    if (window.confirm('Are you sure you want to end the interview? Your progress will be saved.')) {
      if (session) {
        await interviewService.updateSessionStatus(session.id, 'abandoned');
      }
      cleanup();
      onBack();
    }
  };

  const cleanup = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    speechRecognitionService.reset();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">{statusMessage}</p>
        </div>
      </div>
    );
  }

  if (stage === 'ready') {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center p-4">
        <div className="bg-dark-200 rounded-2xl p-8 max-w-2xl w-full text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">Ready to Start?</h2>
          <p className="text-gray-400 mb-6">
            You will answer {questions.length} questions in {config.durationMinutes} minutes.
            Take your time and speak clearly.
          </p>
          <div className="bg-dark-300 rounded-lg p-4 mb-6">
            <p className="text-gray-300 text-sm">
              {isMicrophoneEnabled ? '✓ Microphone and camera are ready' : '⚠ Media devices not available'}
            </p>
          </div>
          <button
            onClick={startQuestion}
            className="btn-primary px-8 py-4 text-lg"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100 flex flex-col">
      <div className="fixed top-0 left-0 right-0 bg-dark-200 border-b border-dark-300 shadow-xl z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="font-semibold text-gray-100">{userName}</div>
                <div className="text-sm text-gray-400">Mock Interview</div>
              </div>

              <div className="h-8 w-px bg-dark-300"></div>

              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-lg font-mono">{formatTime(timeRemaining)}</span>
              </div>

              <div className="h-8 w-px bg-dark-300"></div>

              <div className="text-gray-300">
                Question {currentQuestionIndex + 1} / {questions.length}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePause}
                className="p-2 hover:bg-dark-300 rounded-lg transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-5 h-5 text-gray-300" /> : <Pause className="w-5 h-5 text-gray-300" />}
              </button>

              <button
                onClick={handleEndInterview}
                className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
                title="End Interview"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-20 pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6 h-full">
          <div className="bg-dark-200 rounded-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🤖</span>
              </div>
              <p className="text-gray-400 text-sm">AI Interviewer</p>
            </div>
          </div>

          <div className="bg-dark-200 rounded-xl p-8 flex flex-col justify-center">
            {currentQuestion && (
              <div>
                <div className="text-sm text-blue-400 mb-4">
                  {currentQuestion.category} • {currentQuestion.difficulty}
                </div>
                <h3 className="text-2xl font-semibold text-gray-100 mb-6">
                  {currentQuestion.question_text}
                </h3>

                {stage === 'listening' && (
                  <div className="space-y-4">
                    <div className="bg-dark-300 rounded-lg p-4 min-h-[100px] max-h-[200px] overflow-y-auto">
                      <p className="text-gray-300 text-sm">
                        {currentTranscript || 'Start speaking...'}
                      </p>
                    </div>
                    <button
                      onClick={stopListening}
                      className="w-full btn-primary py-3"
                    >
                      Submit Answer
                    </button>
                  </div>
                )}

                {stage === 'processing' && (
                  <div className="text-center">
                    <div className="animate-pulse text-blue-400 mb-2">Processing...</div>
                    <p className="text-gray-400 text-sm">Analyzing your response</p>
                  </div>
                )}

                {stage === 'feedback' && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <p className="text-green-400">✓ Answer recorded successfully!</p>
                    <p className="text-gray-400 text-sm mt-2">Moving to next question...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-dark-200 rounded-xl p-6 flex flex-col">
            <div className="text-gray-400 text-sm mb-4">Your Camera</div>
            <div className="flex-1 bg-dark-300 rounded-lg overflow-hidden relative">
              <video
                id="user-video"
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isMicrophoneEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-400">
                  <div className="text-center">
                    <Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Camera not available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              {isRecording ? (
                <>
                  <Mic className="w-5 h-5 text-red-500 animate-pulse" />
                  <span className="text-red-500 text-sm">Recording</span>
                </>
              ) : (
                <>
                  <MicOff className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-500 text-sm">Not Recording</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-dark-200 border-t border-dark-300 py-3">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          {statusMessage}
        </div>
      </div>
    </div>
  );
};
