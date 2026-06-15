export interface Resource {
  title: string;
  type: 'video' | 'article' | 'book' | 'project';
  url: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Phase {
  phase: number;
  title: string;
  duration_weeks: number;
  topics: string[];
  learning_objectives: string[];
  resources: Resource[];
  assignments: string[];
  practice_questions: string[];
  quiz_questions: QuizQuestion[];
  milestone: string;
}

export interface StaticRoadmap {
  id: string;
  domain: string;
  title: string;
  description: string;
  estimated_weeks: number;
  phases: Phase[];
}

export const staticRoadmaps: Record<string, StaticRoadmap> = {
  'web-development': {
    id: 'web-development',
    domain: 'web-development',
    title: 'Full Stack Web Development',
    description: 'Build scalable web applications from scratch using React, Node, and modern databases.',
    estimated_weeks: 16,
    phases: [
      {
        phase: 1,
        title: 'Frontend Fundamentals',
        duration_weeks: 3,
        topics: ['HTML5/CSS3', 'JavaScript ES6+', 'DOM Manipulation', 'Responsive Design'],
        learning_objectives: [
          'Understand semantic HTML structure',
          'Style web pages using CSS Flexbox and Grid',
          'Write interactive scripts using vanilla JavaScript',
          'Fetch data from REST APIs using fetch/async-await'
        ],
        resources: [
          { title: 'MDN Web Docs - HTML Basics', type: 'article', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML' },
          { title: 'JavaScript Crash Course', type: 'video', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c' }
        ],
        assignments: [
          'Build a personal portfolio website',
          'Create a weather app fetching data from an API'
        ],
        practice_questions: [
          'Explain the difference between let, const, and var.',
          'What is event delegation in JavaScript?'
        ],
        quiz_questions: [
          {
            question: 'Which HTML tag is used for the largest heading?',
            options: ['<heading>', '<h6>', '<head>', '<h1>'],
            correct_index: 3,
            explanation: '<h1> represents the highest level and largest heading in HTML.'
          },
          {
            question: 'What does CSS stand for?',
            options: ['Cascading Style Sheets', 'Colorful Style Sheets', 'Computer Style Sheets', 'Creative Style Sheets'],
            correct_index: 0,
            explanation: 'CSS stands for Cascading Style Sheets.'
          }
        ],
        milestone: 'Build responsive, interactive websites using vanilla JS'
      },
      {
        phase: 2,
        title: 'React & State Management',
        duration_weeks: 4,
        topics: ['Components & Hooks', 'Context API', 'React Router', 'TailwindCSS'],
        learning_objectives: [
          'Build reusable UI components',
          'Manage complex state using React Hooks',
          'Implement client-side routing',
          'Style applications rapidly with Tailwind'
        ],
        resources: [
          { title: 'React Official Documentation', type: 'article', url: 'https://react.dev/learn' },
          { title: 'React Context API Tutorial', type: 'video', url: 'https://www.youtube.com/watch?v=5LrDIWkK_Bc' }
        ],
        assignments: [
          'Build a task management application with React',
          'Create a multi-page e-commerce storefront layout'
        ],
        practice_questions: [
          'What is the Virtual DOM and why is it useful?',
          'Explain the useEffect hook dependency array.'
        ],
        quiz_questions: [
          {
            question: 'Which hook is used to manage side effects in React?',
            options: ['useState', 'useReducer', 'useEffect', 'useMemo'],
            correct_index: 2,
            explanation: 'useEffect is used to perform side effects in functional components.'
          }
        ],
        milestone: 'Develop scalable Single Page Applications with React'
      }
    ]
  },
  'data-science': {
    id: 'data-science',
    domain: 'data-science',
    title: 'Data Science Master Track',
    description: 'Master data manipulation, analysis, and visualization using Python and modern data science tools.',
    estimated_weeks: 12,
    phases: [
      {
        phase: 1,
        title: 'Python for Data Science',
        duration_weeks: 2,
        topics: ['Variables & Data Types', 'Loops & Functions', 'NumPy Basics'],
        learning_objectives: [
          'Write Python scripts fluently',
          'Utilize NumPy arrays for fast numerical computation'
        ],
        resources: [
          { title: 'Python for Beginners', type: 'video', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' }
        ],
        assignments: [
          'Analyze an array of sales data using NumPy'
        ],
        practice_questions: [
          'What is the difference between a list and a tuple in Python?'
        ],
        quiz_questions: [
          {
            question: 'Which library is standard for scientific computing in Python?',
            options: ['Pandas', 'NumPy', 'Matplotlib', 'Scikit-Learn'],
            correct_index: 1,
            explanation: 'NumPy is the foundational library for scientific computing and array manipulation.'
          }
        ],
        milestone: 'Comfortably write Python scripts for basic data manipulation'
      }
    ]
  },
  'ai-ml': {
    id: 'ai-ml',
    domain: 'ai-ml',
    title: 'Artificial Intelligence & Machine Learning',
    description: 'Dive deep into machine learning algorithms, deep learning, and AI model deployment.',
    estimated_weeks: 20,
    phases: [
      {
        phase: 1,
        title: 'Mathematics & Statistics',
        duration_weeks: 4,
        topics: ['Linear Algebra', 'Calculus', 'Probability'],
        learning_objectives: [
          'Understand matrices and vectors',
          'Grasp the concept of derivatives for gradient descent'
        ],
        resources: [
          { title: 'Essence of Linear Algebra', type: 'video', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' }
        ],
        assignments: [
          'Implement Matrix Multiplication from scratch in Python'
        ],
        practice_questions: [
          'Explain what an eigenvector is.'
        ],
        quiz_questions: [
          {
            question: 'What mathematical concept is primarily used for optimizing machine learning models?',
            options: ['Graph Theory', 'Number Theory', 'Calculus (Derivatives)', 'Geometry'],
            correct_index: 2,
            explanation: 'Derivatives are used to calculate gradients to minimize the loss function during optimization.'
          }
        ],
        milestone: 'Understand the math behind ML algorithms'
      }
    ]
  },
  'cybersecurity': {
    id: 'cybersecurity',
    domain: 'cybersecurity',
    title: 'Cybersecurity Foundations',
    description: 'Learn network security, ethical hacking, and how to defend against modern threats.',
    estimated_weeks: 14,
    phases: [
      {
        phase: 1,
        title: 'Networking & Protocols',
        duration_weeks: 3,
        topics: ['TCP/IP', 'DNS & HTTP', 'Network Topologies'],
        learning_objectives: [
          'Analyze network traffic',
          'Understand the OSI model'
        ],
        resources: [
          { title: 'Networking Basics', type: 'video', url: 'https://www.youtube.com/watch?v=IPvYjXCsTg8' }
        ],
        assignments: [
          'Use Wireshark to capture and analyze HTTP traffic'
        ],
        practice_questions: [
          'What is the difference between TCP and UDP?'
        ],
        quiz_questions: [
          {
            question: 'Which port is typically used for HTTPS?',
            options: ['80', '21', '443', '22'],
            correct_index: 2,
            explanation: 'Port 443 is the standard port for secure HTTPS traffic.'
          }
        ],
        milestone: 'Understand how networks operate and can be exploited'
      }
    ]
  },
  'dsa': {
    id: 'dsa',
    domain: 'dsa',
    title: 'Data Structures & Algorithms',
    description: 'Master DSA for technical interviews and competitive programming.',
    estimated_weeks: 18,
    phases: [
      {
        phase: 1,
        title: 'Basic Data Structures',
        duration_weeks: 3,
        topics: ['Arrays & Strings', 'Linked Lists', 'Stacks & Queues'],
        learning_objectives: [
          'Implement basic data structures',
          'Understand Big-O time and space complexity'
        ],
        resources: [
          { title: 'Big O Notation', type: 'video', url: 'https://www.youtube.com/watch?v=v4cd1O4zkGw' }
        ],
        assignments: [
          'Reverse a Linked List',
          'Implement a Queue using Stacks'
        ],
        practice_questions: [
          'What is the time complexity of searching in a Hash Map?'
        ],
        quiz_questions: [
          {
            question: 'What is the time complexity of accessing an element in an array by its index?',
            options: ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'],
            correct_index: 1,
            explanation: 'Array access by index is an O(1) operation because memory addresses are calculated directly.'
          }
        ],
        milestone: 'Solve fundamental algorithmic problems'
      }
    ]
  }
};
