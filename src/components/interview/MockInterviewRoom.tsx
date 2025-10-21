import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, X, Video, Mic, MicOff, Volume2, AlertTriangle, Maximize } from 'lucide-react';
import { InterviewConfig, InterviewQuestion, MockInterviewSession } from '../../types/interview';
import { interviewService } from '../../services/interviewService';
import { interviewFeedbackService } from '../../services/interviewFeedbackService';
import { speechRecognitionService } from '../../services/speechRecognitionService';
import { textToSpeechService } from '../../services/textToSpeechService';
import { useFullScreenMonitor } from '../../hooks/useFullScreenMonitor';
import { useTabSwitchDetector } from '../../hooks/useTabSwitchDetector';

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
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiCurrentText, setAiCurrentText] = useState('');
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fullScreen = useFullScreenMonitor({
    onFullScreenExit: () => {
      setViolationMessage('⚠️ You exited full-screen mode. Please return to full-screen to continue.');
      setShowViolationWarning(true);
      handlePauseInterview();
    },
    onViolation: (type) => {
      console.log('Full-screen violation:', type);
    },
  });

  const tabDetector = useTabSwitchDetector({
    onTabSwitch: () => {
      setViolationMessage('⚠️ You switched tabs. Please stay on this page during the interview.');
      setShowViolationWarning(true);
      handlePauseInterview();
    },
    onWindowBlur: () => {
      setViolationMessage('⚠️ You switched to another application. Please stay focused on the interview.');
      setShowViolationWarning(true);
      handlePauseInterview();
    },
    onViolation: (type, duration) => {
      console.log(`Violation: ${type}, Duration: ${duration}s`);
    },
  });

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
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      videoStreamRef.current = stream;
      setIsMicrophoneEnabled(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error('Error playing video:', err);
          });
        };
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsMicrophoneEnabled(false);
      alert('Camera/microphone access denied. You can continue, but your responses will not be recorded.');
    }
  };

  const startQuestion = async () => {
    await fullScreen.requestFullScreen();

    setStage('question');
    setStatusMessage(`Question ${currentQuestionIndex + 1} of ${questions.length}`);
    setCurrentTranscript('');

    if (currentQuestion && textToSpeechService.isSupported()) {
      try {
        await textToSpeechService.speak(
          currentQuestion.question_text,
          (text, speaking) => {
            setAiSpeaking(speaking);
            setAiCurrentText(speaking ? text : '');
          },
          { rate: 0.9, pitch: 1.0 }
        );
      } catch (error) {
        console.error('Error with text-to-speech:', error);
      }
    }

    setTimeout(() => {
      startListening();
    }, 1000);
  };

  const startListening = async () => {
    setStage('listening');
    setStatusMessage('Listening to your answer...');
    startTimeRef.current = Date.now();

    if (isMicrophoneEnabled && videoStreamRef.current) {
      try {
        audioChunksRef.current = [];

        const options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(videoStreamRef.current, options);

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

  const moveToNextQuestion = async () => {
    speechRecognitionService.reset();
    setCurrentTranscript('');

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStage('question');

      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion && textToSpeechService.isSupported()) {
        try {
          await textToSpeechService.speak(
            nextQuestion.question_text,
            (text, speaking) => {
              setAiSpeaking(speaking);
              setAiCurrentText(speaking ? text : '');
            },
            { rate: 0.9, pitch: 1.0 }
          );
        } catch (error) {
          console.error('Error with text-to-speech:', error);
        }
      }

      setTimeout(() => startListening(), 1000);
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

      await interviewService.updateSessionWithSecurity(
        session.id,
        'completed',
        overallScore,
        actualDuration,
        {
          tabSwitchCount: tabDetector.tabSwitchCount,
          fullScreenExits: fullScreen.violations,
          totalViolationTime: tabDetector.totalTimeAway,
          violationsLog: tabDetector.violations
        }
      );

      fullScreen.exitFullScreen();
      onInterviewComplete(session.id);
    }
  };

  const handlePauseInterview = () => {
    setIsPaused(true);
    if (stage === 'listening') {
      if (speechRecognitionService.isSupported()) {
        speechRecognitionService.stopListening();
      }
    }
    textToSpeechService.pause();
  };

  const handleResumeInterview = () => {
    setIsPaused(false);
    setShowViolationWarning(false);
    textToSpeechService.resume();

    if (!fullScreen.isFullScreen) {
      fullScreen.requestFullScreen();
    }
  };

  const handlePause = () => {
    if (isPaused) {
      handleResumeInterview();
    } else {
      handlePauseInterview();
    }
  };

  const handleEndInterview = async () => {
    if (window.confirm('Are you sure you want to end the interview? Your progress will be saved.')) {
      if (session) {
        await interviewService.updateSessionStatus(session.id, 'abandoned');
      }
      cleanup();
      fullScreen.exitFullScreen();
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

    textToSpeechService.stop();
    speechRecognitionService.reset();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalViolations = tabDetector.tabSwitchCount + fullScreen.violations;

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
          <div className="bg-dark-300 rounded-lg p-4 mb-6 space-y-2">
            <p className="text-gray-300 text-sm">
              {isMicrophoneEnabled ? '✓ Camera and microphone are ready' : '⚠ Media devices not available'}
            </p>
            <p className="text-gray-300 text-sm">
              {textToSpeechService.isSupported() ? '✓ AI voice enabled' : '⚠ Text-to-speech not available'}
            </p>
            <p className="text-gray-300 text-sm">
              ✓ Full-screen security mode will be enabled
            </p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Important Guidelines:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• The interview will run in full-screen mode</li>
              <li>• Do not switch tabs or minimize the window</li>
              <li>• Do not open other applications</li>
              <li>• Violations will be tracked and reported</li>
            </ul>
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
      {showViolationWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-dark-200 rounded-2xl p-8 max-w-md w-full border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-xl font-bold text-red-400">Interview Paused</h3>
            </div>
            <p className="text-gray-300 mb-6">{violationMessage}</p>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                <strong>Violations Detected:</strong> {totalViolations}
              </p>
              <p className="text-red-300 text-sm mt-1">
                <strong>Time Away:</strong> {tabDetector.totalTimeAway}s
              </p>
            </div>
            <button
              onClick={handleResumeInterview}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Return to Interview
            </button>
          </div>
        </div>
      )}

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

              {totalViolations > 0 && (
                <>
                  <div className="h-8 w-px bg-dark-300"></div>
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">Violations: {totalViolations}</span>
                  </div>
                </>
              )}

              {!fullScreen.isFullScreen && stage !== 'completed' && (
                <>
                  <div className="h-8 w-px bg-dark-300"></div>
                  <button
                    onClick={fullScreen.requestFullScreen}
                    className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                    title="Enter Full-Screen"
                  >
                    <Maximize className="w-4 h-4" />
                    <span className="text-sm">Enter Full-Screen</span>
                  </button>
                </>
              )}
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
              <div className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${
                aiSpeaking
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse'
                  : 'bg-gradient-to-br from-blue-500/50 to-purple-600/50'
              }`}>
                <span className="text-4xl">🤖</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">AI Interviewer</p>
              {aiSpeaking && (
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-xs">Speaking...</span>
                </div>
              )}
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

                {aiSpeaking && aiCurrentText && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">AI is speaking:</span>
                    </div>
                    <p className="text-gray-300 text-sm italic">{aiCurrentText}</p>
                  </div>
                )}

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
                ref={videoRef}
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
                  <span className="text-red-500 text-sm font-semibold">Recording</span>
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
