import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  question: string;
  type: 'single-choice' | 'multiple-choice';
  options: string[];
  allowMultiple?: boolean;
}

interface IntakeFormModalProps {
  isOpen: boolean;
  onComplete: (responses: Record<string, any>) => void;
}

// Icon mapping for each answer option
const answerIcons: Record<string, string> = {
  // Music Experience
  'Less than 1 year': '🌱',
  '1-3 years': '🎵',
  '3-5 years': '🎼',
  '5+ years': '🏆',
  
  // Music Genre
  'Hip-Hop/Rap': '🎤',
  'Pop': '🌟',
  'R&B': '💫',
  'Rock': '🎸',
  'Electronic/EDM': '🎛️',
  'Country': '🤠',
  'Indie': '🎭',
  'Other': '🎨',
  
  // Age Range
  '16-20': '🎓',
  '21-25': '💪',
  '26-30': '🎯',
  '31-35': '👑',
  '36+': '🌟',
  
  // Spotify Releases
  'This is my first': '🚀',
  '2-5 songs': '📀',
  '6-15 songs': '📚',
  '16+ songs': '🔥',
  
  // Promotion Platform
  'Instagram': '📸',
  'TikTok': '💃',
  'YouTube': '📺',
  'Twitter / X': '🐦',
  'Facebook': '👥',
  'I don\'t promote much': '🤷',
  
  // Online Activity Time
  'Morning (6AM-12PM)': '🌅',
  'Afternoon (12PM-6PM)': '☀️',
  'Evening (6PM-12AM)': '🌆',
  'Late night (12AM-6AM)': '🌙'
};

const questions: Question[] = [
  {
    id: 'music_experience',
    question: 'How long have you been creating music/podcasts?',
    type: 'single-choice',
    options: ['Less than 1 year', '1-3 years', '3-5 years', '5+ years']
  },
  {
    id: 'primary_genre',
    question: 'What\'s your primary music genre?',
    type: 'single-choice',
    options: ['Hip-Hop/Rap', 'Pop', 'R&B', 'Rock', 'Electronic/EDM', 'Country', 'Indie', 'Other']
  },
  {
    id: 'age_range',
    question: 'What\'s your age range?',
    type: 'single-choice',
    options: ['16-20', '21-25', '26-30', '31-35', '36+']
  },
  {
    id: 'spotify_releases',
    question: 'How many songs have you released on Spotify?',
    type: 'single-choice',
    options: ['This is my first', '2-5 songs', '6-15 songs', '16+ songs']
  },
  {
    id: 'promotion_platform',
    question: 'Where do you primarily promote your music?',
    type: 'single-choice',
    options: ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'Facebook', 'I don\'t promote much']
  },
  {
    id: 'online_activity_time',
    question: 'What time of day are you most active online?',
    type: 'single-choice',
    options: ['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-12AM)', 'Late night (12AM-6AM)']
  }
];

const IntakeFormModal: React.FC<IntakeFormModalProps> = ({ isOpen, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  console.log('📋 INTAKE-FORM-MODAL: Component rendered', { 
    isOpen, 
    currentQuestionIndex, 
    totalQuestions: questions.length,
    responses: Object.keys(responses).length 
  });

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentQuestionIndex(0);
      setResponses({});
      setIsAnimating(false);
      setShowCompletion(false);
      setSelectedAnswer(null);
      setCountdown(5);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (showCompletion && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCompletion && countdown === 0) {
      // Auto-close when countdown reaches 0
      onComplete(responses);
    }
  }, [showCompletion, countdown, responses, onComplete]);

  // Handle answer selection
  const handleAnswerSelect = async (answer: string) => {
    if (isAnimating) return;

    console.log('📋 INTAKE-FORM: Answer selected:', { 
      questionId: currentQuestion.id, 
      answer,
      questionIndex: currentQuestionIndex 
    });

    setIsAnimating(true);
    setSelectedAnswer(answer);

    // Update responses (all questions are single-choice)
    const newResponses = {
      ...responses,
      [currentQuestion.id]: answer
    };
    setResponses(newResponses);

    // Show selection animation briefly
    setTimeout(async () => {
      if (isLastQuestion) {
        console.log('📋 INTAKE-FORM: Last question completed, showing completion');
        setShowCompletion(true);
        
        // Submit the form
        setTimeout(async () => {
          console.log('📋 INTAKE-FORM: Submitting final responses:', newResponses);
          await handleSubmit(newResponses);
        }, 2000); // Wait 2 seconds before submitting
      } else {
        console.log('📋 INTAKE-FORM: Moving to next question');
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null); // Reset for next question
      }
      setIsAnimating(false);
    }, 1200); // Extended pause to show selection animation
  };



  // Handle back button
  const handleBack = () => {
    if (currentQuestionIndex > 0 && !isAnimating) {
      console.log('📋 INTAKE-FORM: Going back to previous question');
      setIsAnimating(true);
      setSelectedAnswer(null); // Reset selection
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  // Submit form
  const handleSubmit = async (finalResponses: Record<string, any>) => {
    try {
      console.log('📋 INTAKE-FORM: Submitting to API...', finalResponses);
      
      const response = await fetch('/api/intake-form/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: finalResponses
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ INTAKE-FORM: Successfully submitted:', data);
        
        // Start countdown timer
        setCountdown(5);
      } else {
        console.error('❌ INTAKE-FORM: Submission failed:', data);
        // Handle error - could show error message
      }
    } catch (error) {
      console.error('❌ INTAKE-FORM: Submission error:', error);
      // Handle error - could show error message
    }
  };

  // Animation variants
  const slideVariants = {
    enter: {
      x: 300,
      opacity: 0,
    },
    center: {
      x: 0,
      opacity: 1,
    },
    exit: {
      x: -300,
      opacity: 0,
    }
  };

  const cardVariants = {
    unselected: {
      scale: 1,
      borderColor: '#374151', // gray-700
      backgroundColor: '#1f2937', // gray-800
    },
    selected: {
      scale: 1.02,
      borderColor: '#10b981', // green-500
      backgroundColor: '#065f46', // green-800
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-[#1a1b2e] rounded-xl shadow-2xl border border-gray-700 p-8 my-8">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-6">🚀 Let's Complete Your Account...</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Back Button */}
        {currentQuestionIndex > 0 && !showCompletion && (
          <button
            onClick={handleBack}
            disabled={isAnimating}
            className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {/* Question Content */}
        <AnimatePresence mode="wait">
          {showCompletion ? (
            <motion.div
              key="completion"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-4">Thank you!</h2>
              <p className="text-gray-400 mb-6">Your responses have been submitted successfully.</p>
              
              {/* Countdown and Manual Close */}
              <div className="text-center space-y-3">
                <p className="text-gray-300 text-sm">
                  This popup will automatically close within ({countdown}) seconds
                </p>
                <button 
                  onClick={() => onComplete(responses)}
                  className="underline text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  CLOSE THIS POPUP MANUALLY
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestionIndex}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5 }}
            >
              {/* Question */}
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                {currentQuestion.question}
              </h2>

                             {/* Answer Options */}
               <div className={`py-4 ${(currentQuestion.options.length > 6 || currentQuestion.id === 'promotion_platform') ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
                 {currentQuestion.options.map((option, index) => {
                   const isSelected = selectedAnswer === option;
                   return (
                     <motion.button
                       key={option}
                       onClick={() => handleAnswerSelect(option)}
                       disabled={isAnimating}
                       variants={cardVariants}
                       whileHover={!isAnimating ? { scale: 1.02 } : {}}
                       whileTap={!isAnimating ? { scale: 0.98 } : {}}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ 
                         opacity: 1, 
                         y: 0,
                         scale: isSelected ? 1.02 : 1,
                         borderColor: isSelected ? '#10b981' : '#374151',
                         backgroundColor: isSelected ? '#065f46' : '#1f2937',
                       }}
                       transition={{ delay: index * 0.1, duration: 0.3 }}
                       className="w-full p-4 text-left border-2 rounded-lg transition-all duration-300 disabled:opacity-50 group relative overflow-hidden"
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                           <span className="text-xl">{answerIcons[option] || '🎯'}</span>
                           <span className={`font-medium transition-colors duration-300 ${isSelected ? 'text-green-100' : 'text-white'}`}>
                             {option}
                           </span>
                         </div>
                         {/* Checkmark Animation */}
                         <AnimatePresence>
                           {isSelected && (
                             <motion.div
                               initial={{ scale: 0, opacity: 0 }}
                               animate={{ scale: 1, opacity: 1 }}
                               exit={{ scale: 0, opacity: 0 }}
                               transition={{ type: "spring", stiffness: 200, damping: 15 }}
                               className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                             >
                               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                               </svg>
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                       
                       {/* Green glow effect for selected option */}
                       {isSelected && (
                         <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 0.3 }}
                           transition={{ duration: 0.3 }}
                           className="absolute inset-0 bg-green-500 rounded-lg pointer-events-none"
                         />
                       )}
                     </motion.button>
                   );
                 })}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IntakeFormModal; 