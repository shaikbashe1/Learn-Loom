import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file if process.env variables are missing
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const k = trimmed.substring(0, firstEqual).trim();
            const v = trimmed.substring(firstEqual + 1).trim();
            process.env[k] = v;
          }
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to parse local .env file:", err.message);
  }
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(url, key);

// Course definitions
const coursesData = [
  {
    title: "Python Programming Masterclass",
    category: "Programming",
    difficulty: "Beginner",
    description: "Learn Python from scratch. Master variables, OOP, file handling, databases, data analysis, web scraping, and build real-world applications.",
    level: "All Levels",
    duration_weeks: 4,
    duration_hours: 32,
    topics: ["Python", "OOP", "Data Structures", "APIs", "Pandas", "BeautifulSoup"],
    modules: [
      { title: "Introduction to Python & Setup", desc: "Install Python and configure your editor. Write your first print statements and simple variables." },
      { title: "Python Variables & Data Types", desc: "Learn about integers, floats, strings, booleans, and type casting." },
      { title: "Control Flow & Decision Making", desc: "Master if-elif-else statements, logical operators, and flow control." },
      { title: "Loops & Iterations", desc: "Work with while and for loops, break, continue, and loop nesting." },
      { title: "Functions & Scope", desc: "Define functions, parameters, return values, and understand local vs. global scope." },
      { title: "Strings & String Manipulation", desc: "Master string slicing, formatting, methods, and processing techniques." },
      { title: "Lists & Tuples", desc: "Learn sequential data structures, indexing, slicing, methods, and mutability." },
      { title: "Dictionaries & Sets", desc: "Master key-value storage, sets operations, dictionary methods, and loop applications." },
      { title: "Object-Oriented Programming (OOP) Basics", desc: "Understand classes, objects, attributes, methods, and self." },
      { title: "OOP: Inheritance & Polymorphism", desc: "Master parent-child classes, method overriding, and super()." },
      { title: "File Operations (I/O)", desc: "Read and write text and CSV files using python context managers." },
      { title: "Error & Exception Handling", desc: "Handle runtime errors using try-except-finally blocks and raise statements." },
      { title: "Python Modules & Packages", desc: "Import internal modules, install external packages using pip, and build custom modules." },
      { title: "Decorators & Generators", desc: "Learn functional programming patterns, wrapper functions, yield, and iterators." },
      { title: "List Comprehensions & Lambdas", desc: "Write concise, expressive Python lists and anonymous expressions." },
      { title: "Working with APIs & JSON", desc: "Fetch online data using the requests library and parse JSON payloads." },
      { title: "Database Integration with SQLite", desc: "Create tables, insert data, and query databases using SQL in Python." },
      { title: "Web Scraping with BeautifulSoup", desc: "Extract structured data from HTML pages and crawl simple sites." },
      { title: "Data Analysis with Pandas", desc: "Load datasets, filter columns, calculate aggregations, and process dataframes." },
      { title: "Unit Testing & Best Practices", desc: "Write tests using unittest and assert statements, and follow PEP 8 standards." }
    ]
  },
  {
    title: "Java Programming: Core to Enterprise",
    category: "Programming",
    difficulty: "Intermediate",
    description: "Go from Java basics to Spring Boot enterprise APIs. Master OOP, collections, multithreading, databases, and microservices.",
    level: "Intermediate",
    duration_weeks: 6,
    duration_hours: 45,
    topics: ["Java", "OOP", "Concurrency", "Maven", "Spring Boot", "REST APIs"],
    modules: [
      { title: "JDK Installation & Hello World", desc: "Configure Java SE, set environment variables, and compile your first class." },
      { title: "Variables, Primitive Types & Operators", desc: "Understand primitive data types, operators, and expression evaluation." },
      { title: "Control Flow Statements", desc: "Work with if-else conditions, switch-case, for, while, and do-while loops." },
      { title: "Java Arrays & String class", desc: "Master single and multidimensional arrays, string memory pool, and builder utilities." },
      { title: "Methods, Parameters & Recursion", desc: "Learn how to define methods, pass parameters by value, and solve recursive problems." },
      { title: "Java Classes & Object Basics", desc: "Master instance fields, constructor overloading, and access modifiers." },
      { title: "Java Interfaces & Abstract Classes", desc: "Understand polymorphism, dynamic method dispatch, and interface contracts." },
      { title: "Exceptions & Assertion Handling", desc: "Handle checked and unchecked exceptions using try-catch-finally and try-with-resources." },
      { title: "Java Collections Framework", desc: "Master Lists, Sets, and Maps, and understand internal implementation details." },
      { title: "Java Generics", desc: "Write type-safe classes, methods, and understand wildcard constraints." },
      { title: "Lambda Expressions & Streams", desc: "Leverage functional programming with stream map-filter-reduce operations." },
      { title: "Multithreading & Concurrency", desc: "Create threads, synchronize shared memory, and work with ExecutorService." },
      { title: "Java File I/O and NIO", desc: "Read and write data using streams, channels, and modern path utilities." },
      { title: "JDBC Database Connectivity", desc: "Connect to databases, execute queries, and handle statement parameters." },
      { title: "Design Patterns in Java", desc: "Implement Singleton, Factory, Builder, and Observer patterns in Java." },
      { title: "Introduction to Maven & Gradle", desc: "Manage project dependencies, configure plugins, and package JARs." },
      { title: "Spring Boot Essentials", desc: "Understand dependency injection, auto-configuration, and start projects." },
      { title: "Spring Boot REST Controller", desc: "Build RESTful endpoints, map request payloads, and handle status codes." },
      { title: "Spring Data JPA & Hibernate", desc: "Map entities, define repositories, and perform CRUD operations against a database." },
      { title: "Spring Security & JWT", desc: "Implement token-based authentication, user roles, and secure endpoints." }
    ]
  },
  {
    title: "AI & Machine Learning Complete Guide",
    category: "AI & Machine Learning",
    difficulty: "Advanced",
    description: "Deep dive into Artificial Intelligence and Machine Learning. Master regression, classification, deep neural networks, CNNs, NLP, and MLOps.",
    level: "Advanced",
    duration_weeks: 8,
    duration_hours: 60,
    topics: ["Machine Learning", "Neural Networks", "TensorFlow", "NLP", "MLOps", "AI Ethics"],
    modules: [
      { title: "Foundations of AI & ML", desc: "Understand supervised vs unsupervised learning, and the machine learning lifecycle." },
      { title: "Python for Data Science Recap", desc: "Prepare tools: Jupyter Notebook, pip, and core math/scientific libraries." },
      { title: "NumPy for Math Computing", desc: "Master multidimensional arrays, vector operations, and matrix algebra." },
      { title: "Pandas for Data Manipulation", desc: "Clean datasets, handle missing values, and join tables for ML modeling." },
      { title: "Data Visualization in ML", desc: "Build plots using Matplotlib and Seaborn to gain statistical insights." },
      { title: "Linear Regression Analysis", desc: "Implement single and multivariate regression, cost functions, and gradient descent." },
      { title: "Logistic Regression Classification", desc: "Master binary classification, decision boundaries, and sigmoid logic." },
      { title: "Decision Trees & Random Forests", desc: "Build decision nodes, calculate entropy/Gini, and harness ensemble forests." },
      { title: "Support Vector Machines (SVM)", desc: "Understand margin optimization, hyperplanes, and kernel tricks." },
      { title: "K-Nearest Neighbors & Clustering", desc: "Implement similarity distance metrics, KNN classification, and K-Means clustering." },
      { title: "Evaluation Metrics & Validation", desc: "Use accuracy, precision, recall, F1-score, ROC-AUC, and cross-validation." },
      { title: "Introduction to Neural Networks", desc: "Build a single perceptron, understand weights, biases, and activation functions." },
      { title: "Deep Learning with TensorFlow/Keras", desc: "Compile sequential models, adjust learning rates, and use Adam optimization." },
      { title: "Convolutional Neural Networks (CNN)", desc: "Master convolutional layers, pooling, stride, and image feature maps." },
      { title: "Recurrent Neural Networks (RNN)", desc: "Model sequential data, understand LSTMs, GRUs, and time series concepts." },
      { title: "Natural Language Processing (NLP)", desc: "Preprocess text, tokenize corpus, and implement TF-IDF representations." },
      { title: "Transfer Learning & Transformers", desc: "Fine-tune pre-trained models (ResNet, BERT) and leverage self-attention." },
      { title: "MLOps: Model Deployment", desc: "Save models to disk, build prediction endpoints with FastAPI, and dockerize." },
      { title: "AI Ethics & Fairness", desc: "Understand algorithmic bias, transparency, explainability, and regulatory guidelines." },
      { title: "Capstone: End-to-End ML Pipeline", desc: "Train a deep learning model, evaluate performance, deploy, and verify predictions." }
    ]
  },
  {
    title: "Building Autonomous AI Agents",
    category: "AI & Machine Learning",
    difficulty: "Advanced",
    description: "Master LLM agents, prompt engineering, sequential reasoning, multi-agent frameworks, tool usage, RAG, and production deployment.",
    level: "Advanced",
    duration_weeks: 6,
    duration_hours: 40,
    topics: ["AI Agents", "LangChain", "CrewAI", "RAG", "Vector DB", "LLM APIs"],
    modules: [
      { title: "Introduction to AI Agents", desc: "Define what an agent is, master sensory-reasoning-action loops, and map the agent stack." },
      { title: "LLM Fundamentals & APIs", desc: "Interact with GPT-4, Claude, and Gemini APIs, manage system prompts, and handle JSON outputs." },
      { title: "Prompt Engineering & Prompt Chains", desc: "Master Few-Shot, Chain-of-Thought (CoT), and sequential processing pipelines." },
      { title: "Introduction to LangChain", desc: "Understand LangChain Expression Language (LCEL), prompts, models, and output parsers." },
      { title: "Chains, Models & Runnables", desc: "Build sequential runnables, chain inputs to outputs, and configure model parameters." },
      { title: "Tool Use & Function Calling", desc: "Expose search, calculator, and database functions as executable tools to LLMs." },
      { title: "Retrieval Augmented Generation (RAG)", desc: "Supplement agent context with document retrieval pipelines." },
      { title: "Embeddings & Vector Databases", desc: "Convert text to vectors, store in Pinecone/Chroma, and query semantically." },
      { title: "Memory Architectures in Agents", desc: "Configure conversation buffer, summary, and windowed memory for ongoing state." },
      { title: "ReAct Agent Framework", desc: "Understand Reason-Action loop syntax, parser tokens, and execution iterations." },
      { title: "Plan-and-Execute Architectures", desc: "Build agents that decompose tasks into sub-tasks, execute sequentially, and review." },
      { title: "Introduction to CrewAI", desc: "Define task schedules, delegate workloads to distinct agents, and manage crews." },
      { title: "AutoGen & Agent Conversations", desc: "Implement conversational multi-agent systems that coordinate automatically." },
      { title: "Stateful Agents with LangGraph", desc: "Design cyclic agent workflows using graphs, nodes, edges, and state management." },
      { title: "Agent Evaluation & Testing", desc: "Assess agent safety, response accuracy, and evaluate tool call accuracy." },
      { title: "Safety, Guardrails & LLM Shield", desc: "Filter prompts, block malicious injections, and build secure guardrails." },
      { title: "Building a Research Agent System", desc: "Implement an agent crew that researches online, aggregates content, and drafts reports." },
      { title: "Building a Code Generator Agent", desc: "Build an agent that writes, executes, test-validates, and refactors program code." },
      { title: "Agent Orchestration at Scale", desc: "Deploy multi-agent fleets behind asynchronous task queues (Celery/Redis)." },
      { title: "Capstone: Production Agent Platform", desc: "Construct a complete multi-agent support team API, dockerize, and test." }
    ]
  }
];

// Helper to generate module content HTML programmatically
function generateModuleContent(courseTitle, modTitle, index) {
  let explanation = `In this module, we dive deep into the concepts of <strong>${modTitle}</strong>. You will learn the best practices, syntax, and architectural patterns needed to master this topic.`;
  let diagram = `[User/System] ➔ [${modTitle} Handler] ➔ [Execution Engine]`;
  let codeSample = `// Code Demonstration: ${modTitle}
public class Demo {
    public static void main(String[] args) {
        System.out.println("Executing ${modTitle} demo...");
    }
}`;

  // Let's write topic-aware contents
  if (courseTitle.includes("Python")) {
    codeSample = `# Python Demonstration: ${modTitle}
def main():
    print("Running Python sample for ${modTitle}...")
    
if __name__ == "__main__":
    main()`;
    if (modTitle.includes("Variables")) {
      explanation = `Variables in Python are dynamically typed references to objects. Unlike static languages (such as Java), you do not need to declare types explicitly. You simply assign a name to an object using the equal sign (<code>=</code>) operator.`;
      diagram = `width = 10 (name reference) ➔ [Integer Object: 10]`;
      codeSample = `# Python Variables & Assignment
width = 10
height = 20
area = width * height
print(f"Area: {area}") # Output: 200`;
    } else if (modTitle.includes("OOP")) {
      explanation = `Object-Oriented Programming (OOP) allows developers to structure programs by grouping related properties and behaviors into individual objects. In Python, this is achieved using the <code>class</code> keyword.`;
      diagram = `[Parent Class: Animal] ➔ Inherited by ➔ [Child Class: Dog]`;
      codeSample = `# Python Class OOP inheritance
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return "Generic sound"

class Dog(Animal):
    def speak(self):
        return "Bark!"

my_dog = Dog("Buddy")
print(my_dog.speak()) # Output: Bark!`;
    }
  } else if (courseTitle.includes("Java")) {
    if (modTitle.includes("Hello World")) {
      explanation = `The entry point of any standalone Java application is the static <code>main</code> method inside a class. Java is strictly object-oriented, requiring all code to reside within a class definition.`;
      diagram = `[JVM Execution] ➔ public static void main(String[] args) ➔ Console`;
      codeSample = `// Hello World class definition
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;
    } else if (modTitle.includes("Spring Boot")) {
      explanation = `Spring Boot provides an production-ready, auto-configured framework to build standalone enterprise applications quickly. Dependency injection handles class lifecycle management automatically.`;
      diagram = `[Client REST Request] ➔ @RestController ➔ @Service ➔ Database`;
      codeSample = `@RestController
@RequestMapping("/api/courses")
public class CourseController {
    @GetMapping
    public ResponseEntity<String> getCourses() {
        return ResponseEntity.ok("Python, Java, AI, AI Agents");
    }
}`;
    }
  } else if (courseTitle.includes("AI & Machine Learning")) {
    codeSample = `# NumPy / Scikit-Learn Demonstration: ${modTitle}
import numpy as np
data = np.array([1.2, 2.5, 3.1])
print(data.mean())`;
    if (modTitle.includes("Regression")) {
      explanation = `Linear Regression attempts to model the relationship between a dependent scalar variable Y and one or more explanatory variables X by fitting a linear equation to the observed data.`;
      diagram = `Data Points (X, Y) ➔ Linear fit line: Y = wX + b`;
      codeSample = `# Linear Regression Fit
import numpy as np
from sklearn.linear_model import LinearRegression
X = np.array([[1], [2], [3]])
y = np.dot(X, [2]) + 1
model = LinearRegression().fit(X, y)
print(f"Intercept: {model.intercept_}, Coefficient: {model.coef_}")`;
    }
  } else if (courseTitle.includes("AI Agents")) {
    codeSample = `# LangChain / CrewAI Agent definition
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
# Agent definitions`;
    if (modTitle.includes("RAG")) {
      explanation = `Retrieval-Augmented Generation (RAG) optimizes the output of a large language model by referencing an authoritative external knowledge base outside of its training data sources before generating a response.`;
      diagram = `[User Question] ➔ [Vector DB Embeddings Match] ➔ [LLM Prompt Context]`;
      codeSample = `# Simple Vector Retrieval Query
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

vector_store = Chroma(persist_directory="./db", embedding_function=OpenAIEmbeddings())
retriever = vector_store.as_retriever(search_kwargs={"k": 2})
docs = retriever.get_relevant_documents("What is LangGraph?")
print(docs[0].page_content)`;
    }
  }

  return `
    <div class="space-y-6">
      <section class="prose max-w-none">
        <h3 class="text-xl font-bold text-primary">Overview & Objectives</h3>
        <p>${explanation}</p>
        
        <h3 class="text-xl font-bold text-primary mt-6">Architectural Workflow</h3>
        <div class="bg-surface-container border border-border-base p-4 rounded-xl font-mono text-sm my-4 shadow-inner text-center select-none text-primary">
          ${diagram}
        </div>

        <h3 class="text-xl font-bold text-primary mt-6">Step-by-Step Code Example</h3>
        <p>Analyze this production-quality code snippet illustrating standard patterns and syntaxes:</p>
        <pre class="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs my-4 shadow-md font-mono select-text">
${codeSample}
        </pre>

        <h3 class="text-xl font-bold text-primary mt-6">Summary</h3>
        <p>To conclude, ensure these concepts are modularized, clean, and fully covered. In the next module, we will expand this setup with advanced testing architectures.</p>
      </section>
    </div>
  `;
}

// Helper to generate topic-appropriate realistic coding questions
function getRealisticCodingQuestion(courseTitle, modTitle, orderIndex) {
  let title = `Coding Lab: Implement ${modTitle}`;
  let problem_statement = `Write a function \`solution(data)\` that cleans, processes, or formats a given input list \`data\`.`;
  let starter_code = {
    "python": "def solution(data):\n    # Write your code here\n    return [x for x in data if x is not None]\n",
    "javascript": "function solution(data) {\n    // Write your code here\n    return data.filter(x => x !== null && x !== undefined);\n}"
  };
  let test_cases = [
    { input: "[1, null, 2, 3]", expected_output: "[1, 2, 3]", is_hidden: false },
    { input: "[null, null, 1]", expected_output: "[1]", is_hidden: false },
    { input: "[]", expected_output: "[]", is_hidden: true }
  ];

  if (courseTitle.includes("Python")) {
    if (modTitle.includes("Variables")) {
      title = "Python Lab: Celsius to Fahrenheit Converter";
      problem_statement = `Implement a function \`solution(celsius)\` that converts a temperature value from Celsius to Fahrenheit.
Formula: F = C * 1.8 + 32`;
      starter_code = {
        "python": "def solution(celsius):\n    # Convert and return fahrenheit\n    return celsius * 1.8 + 32\n",
        "javascript": "function solution(celsius) {\n    return celsius * 1.8 + 32;\n}"
      };
      test_cases = [
        { input: "0", expected_output: "32", is_hidden: false },
        { input: "100", expected_output: "212", is_hidden: false },
        { input: "-40", expected_output: "-40", is_hidden: true }
      ];
    } else if (modTitle.includes("Loops")) {
      title = "Python Lab: Sum Even Numbers";
      problem_statement = `Implement a function \`solution(limit)\` that computes the sum of all even numbers from 1 up to \`limit\` (inclusive).`;
      starter_code = {
        "python": "def solution(limit):\n    # Return sum of all even numbers\n    return sum(x for x in range(1, limit + 1) if x % 2 == 0)\n",
        "javascript": "function solution(limit) {\n    let sum = 0;\n    for(let i=1; i<=limit; i++) { if(i%2===0) sum+=i; }\n    return sum;\n}"
      };
      test_cases = [
        { input: "10", expected_output: "30", is_hidden: false },
        { input: "5", expected_output: "6", is_hidden: false },
        { input: "1", expected_output: "0", is_hidden: true }
      ];
    }
  } else if (courseTitle.includes("Java")) {
    if (modTitle.includes("Hello World") || modTitle.includes("Variables")) {
      title = "Java Lab: Reverse a String";
      problem_statement = `Implement a function \`solution(str)\` that returns the reversed string representation.`;
      starter_code = {
        "python": "def solution(str):\n    return str[::-1]\n",
        "javascript": "function solution(str) {\n    return str.split('').reverse().join('');\n}"
      };
      test_cases = [
        { input: "'java'", expected_output: "'avaj'", is_hidden: false },
        { input: "'loom'", expected_output: "'mool'", is_hidden: false },
        { input: "''", expected_output: "''", is_hidden: true }
      ];
    }
  } else if (courseTitle.includes("AI & Machine Learning")) {
    if (modTitle.includes("NumPy") || modTitle.includes("Math")) {
      title = "ML Lab: Vector Dot Product";
      problem_statement = `Write a function \`solution(arr1, arr2)\` that calculates the dot product of two arrays. Assume the arrays are of equal length.`;
      starter_code = {
        "python": "def solution(arr1, arr2):\n    # Return dot product\n    return sum(a*b for a,b in zip(arr1, arr2))\n",
        "javascript": "function solution(arr1, arr2) {\n    return arr1.reduce((sum, val, idx) => sum + val * arr2[idx], 0);\n}"
      };
      test_cases = [
        { input: "[1, 2], [3, 4]", expected_output: "11", is_hidden: false },
        { input: "[0, 5], [10, 0]", expected_output: "0", is_hidden: false },
        { input: "[1, 1], [1, 1]", expected_output: "2", is_hidden: true }
      ];
    }
  } else if (courseTitle.includes("AI Agents")) {
    if (modTitle.includes("Prompt") || modTitle.includes("Chains")) {
      title = "Agent Lab: Prompt Token Replacer";
      problem_statement = `Write a function \`solution(template, user)\` that replaces all occurrences of \`{user}\` with the provided string value \`user\`.`;
      starter_code = {
        "python": "def solution(template, user):\n    return template.replace('{user}', user)\n",
        "javascript": "function solution(template, user) {\n    return template.replace(/{user}/g, user);\n}"
      };
      test_cases = [
        { input: "'Hello {user}!', 'Alice'", expected_output: "'Hello Alice!'", is_hidden: false },
        { input: "'{user} left the channel.', 'Bob'", expected_output: "'Bob left the channel.'", is_hidden: false },
        { input: "'No tokens here.', 'Charlie'", expected_output: "'No tokens here.'", is_hidden: true }
      ];
    }
  }

  return { title, problem_statement, starter_code, test_cases };
}

// Seeding function
async function seedCourses() {
  console.log("🚀 Starting database course seeding pipeline...");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  let authSupabase;
  let userId = null;

  if (serviceKey && serviceKey !== 'your_service_role_key_here') {
    console.log("🔑 Initializing Supabase client with administrative Service Role Key...");
    authSupabase = createClient(url, serviceKey);
    
    // Fetch a valid creator profile ID to satisfy foreign key constraints
    const { data: adminUser } = await authSupabase.from('profiles').select('id').eq('role', 'admin').limit(1);
    if (adminUser && adminUser.length > 0) {
      userId = adminUser[0].id;
    } else {
      const { data: anyUser } = await authSupabase.from('profiles').select('id').limit(1);
      if (anyUser && anyUser.length > 0) {
        userId = anyUser[0].id;
      }
    }
    console.log(`✅ Service client initialized. Creator Profile ID: ${userId || 'None'}`);
  } else {
    // Sign in as admin fallback
    const email = 'admin@demo.com';
    const password = 'admin123';
    console.log(`🔑 Service key not found. Attempting admin password login (${email})...`);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error("❌ Authentication failed:", authError.message);
      console.error("💡 Please configure SUPABASE_SERVICE_ROLE_KEY in your .env file or run with correct credentials.");
      process.exit(1);
    }

    userId = authData.user?.id;
    const token = authData.session?.access_token;
    console.log(`✅ Authenticated! Admin User ID: ${userId}`);

    // Create client with authenticated token headers
    authSupabase = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }

  // 🧹 Clear existing courses and sub-resources to guarantee only the 4 core courses remain
  console.log("🧹 Clearing all existing courses and resources for a clean setup...");
  try {
    const { error: dtcErr } = await authSupabase.from('coding_test_cases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dqErr } = await authSupabase.from('coding_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dqqErr } = await authSupabase.from('quiz_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dqizErr } = await authSupabase.from('quizzes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dasgErr } = await authSupabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dmodErr } = await authSupabase.from('course_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: dcErr } = await authSupabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (dcErr) {
      console.warn("⚠️ Warning: Failed to clear courses:", dcErr.message);
    } else {
      console.log("✅ Database courses and all linked sub-resources cleared successfully.");
    }
  } catch (err) {
    console.warn("⚠️ Warning: Error during database cleanup:", err.message);
  }

  for (const cData of coursesData) {
    console.log(`\n📚 Seeding course: "${cData.title}"...`);

    // 1. Insert Course Row
    const { data: course, error: cErr } = await authSupabase.from('courses').insert({
      title: cData.title,
      description: cData.description,
      difficulty: cData.difficulty,
      category: cData.category,
      instructor: "LearnLoom AI",
      instructor_name: "LearnLoom AI",
      rating: 4.8,
      student_count: Math.floor(Math.random() * 500) + 120,
      duration_weeks: cData.duration_weeks,
      duration_hours: cData.duration_hours,
      level: cData.level,
      topics: cData.topics,
      is_published: false, // Seed in draft mode
      status: 'pending_review', // Set explicit status so it appears in the Moderation Queue
      created_by: userId
    }).select('id').single();


    if (cErr) {
      console.error(`❌ Failed to create course "${cData.title}":`, cErr);
      continue;
    }

    const courseId = course.id;
    console.log(`✅ Course row created (ID: ${courseId}). Seeding modules...`);

    // 2. Insert Modules, Quizzes, Coding assessments, and Cisco Assignments
    for (let i = 0; i < cData.modules.length; i++) {
      const mInfo = cData.modules[i];
      const order = i;
      const type = (i + 1) % 2 === 0 ? 'coding' : 'reading';

      const contentHtml = generateModuleContent(cData.title, mInfo.title, i);

      const { data: mod, error: mErr } = await authSupabase.from('course_modules').insert({
        course_id: courseId,
        title: mInfo.title,
        description: mInfo.desc,
        content_url: null,
        order_index: order,
        type: type,
        is_free_preview: i === 0,
        duration_minutes: 30,
        learning_objectives: `Understand ${mInfo.title}.\nImplement simple coding routines.\nEvaluate performance parameters.`,
        content: contentHtml,
        key_takeaways: ["Modular coding is crucial.", "Optimize thread performance.", "Isolate functions correctly."],
        examples: [`<p>Example: Simple implementation showing class encapsulation of ${mInfo.title}.</p>`],
        real_world_use_cases: [`Used in asynchronous task execution loops.`],
        key_concepts: [`Encapsulation`, `Time Complexity`, `Thread Control`],
        summary: `This module covers the core concepts of ${mInfo.title} and prepares you for functional scaling.`
      }).select('id').single();

      if (mErr) {
        console.error(`❌ Failed to insert module ${i + 1} ("${mInfo.title}"):`, mErr);
        continue;
      }

      const moduleId = mod.id;

      // 3. Cisco-Style: Add Assignment to EVERY module
      const { error: asgErr } = await authSupabase.from('assignments').insert({
        course_id: courseId,
        module_id: moduleId,
        title: `Assignment: ${mInfo.title}`,
        instructions: `### Module Lab Exercise: ${mInfo.title}

Welcome to your practical lab assignment for this module. Follow these instructions:
1. Implement a module-isolated function or class that models the concepts of **${mInfo.title}**.
2. Add comprehensive documentation comments explaining the code logic.
3. Handle any potential runtime exceptions gracefully (e.g. invalid bounds, missing indices).
4. Provide a sample usage demonstration at the bottom of your program.

Submit your complete source code implementation in the field below for instructor review.`,
        due_days: 7
      });

      if (asgErr) {
        console.error(`❌ Failed to insert assignment for module ${i + 1}:`, asgErr);
      }

      // 4. Add Quiz 1 (Basic Knowledge)
      const { data: q1, error: q1Err } = await authSupabase.from('quizzes').insert({
        course_id: courseId,
        module_id: moduleId,
        title: `Quiz 1 (Basics): ${mInfo.title}`,
        is_grand_test: false,
        passing_score: 80,
        quiz_type: 'quiz_1'
      }).select('id').single();

      if (!q1Err && q1) {
        // Insert 5 basic questions
        await authSupabase.from('quiz_questions').insert([
          { quiz_id: q1.id, question: `What is the primary objective of ${mInfo.title}?`, options: ["To store temporary data", "To solve sequential operations", "To encapsulate module behavior", "All of the above"], answer_index: 2, explanation: "Encapulsation helps modularize project logic.", sort_order: 0 },
          { quiz_id: q1.id, question: `Which syntax is commonly associated with ${mInfo.title}?`, options: ["Direct keyword parsing", "Parenthetical nesting", "JSON data mapping", "It depends on language/framework"], answer_index: 3, explanation: "Syntax varies across platforms and scripting engines.", sort_order: 1 },
          { quiz_id: q1.id, question: `True or False: ${mInfo.title} requires compilation to run.`, options: ["True", "False", "Only in strict typing", "Depends on execution runtime"], answer_index: 3, explanation: "Compilation depends entirely on the backing runtime (e.g. Python vs Java).", sort_order: 2 },
          { quiz_id: q1.id, question: `What is a common pitfall of scaling ${mInfo.title}?`, options: ["Memory leaks", "Thread starvation", "Tight coupling", "All of the above"], answer_index: 3, explanation: "All these factors must be addressed when scaling systems.", sort_order: 3 },
          { quiz_id: q1.id, question: `Which layer handles execution routing for ${mInfo.title}?`, options: ["Controller Layer", "Hardware Layer", "Logical Data Layer", "Routing is dynamic"], answer_index: 0, explanation: "The controller layer manages sequential call routing.", sort_order: 4 }
        ]);
      } else if (q1Err) {
        console.error(`❌ Failed to create Quiz 1:`, q1Err);
      }

      // 5. Add Quiz 2 (Scenario-Based)
      const { data: q2, error: q2Err } = await authSupabase.from('quizzes').insert({
        course_id: courseId,
        module_id: moduleId,
        title: `Quiz 2 (Scenarios): ${mInfo.title}`,
        is_grand_test: false,
        passing_score: 80,
        quiz_type: 'quiz_2'
      }).select('id').single();

      if (!q2Err && q2) {
        // Insert 5 scenario questions
        await authSupabase.from('quiz_questions').insert([
          { quiz_id: q2.id, question: `You observe a thread lock when executing ${mInfo.title}. What is the first debug step?`, options: ["Clear the data cache", "Analyze thread dump allocations", "Restart the backend server", "Recompile components"], answer_index: 1, explanation: "Analyzing thread dumps shows where resources are waiting.", sort_order: 0 },
          { quiz_id: q2.id, question: `An external API response format changes. How should ${mInfo.title} handle this?`, options: ["Fail silently", "Throw an unhandled Exception", "Sanitize and map with fallback logic", "Halt the runtime thread"], answer_index: 2, explanation: "Graceful fallbacks prevent cascade failure.", sort_order: 1 },
          { quiz_id: q2.id, question: `A client reports O(N^2) latency on a search action using ${mInfo.title}. How do you optimize it?`, options: ["Introduce database indices", "Refactor nested loops to map lookups", "Add server memory hardware", "None of the above"], answer_index: 1, explanation: "Replacing nested loops with maps drops time complexity to O(N).", sort_order: 2 },
          { quiz_id: q2.id, question: `How do you secure access scopes for ${mInfo.title}?`, options: ["Enforce user tokens on endpoints", "Inject mock data testing parameters", "Bypass security checks during test cycles", "Restrict internal object interfaces"], answer_index: 0, explanation: "Endpoint authentication restricts calls to validated users.", sort_order: 3 },
          { quiz_id: q2.id, question: `A memory leak is reported in our ${mInfo.title} module. Which tool identifies this?`, options: ["Network traffic inspector", "A dedicated memory profiler", "Database query optimizer", "Console output logs"], answer_index: 1, explanation: "Profilers track object allocations over time.", sort_order: 4 }
        ]);
      }

      // 6. Add Coding Assessment to every second module
      if (type === 'coding') {
        const cqData = getRealisticCodingQuestion(cData.title, mInfo.title, i);
        const { data: cq, error: cqErr } = await authSupabase.from('coding_questions').insert({
          course_id: courseId,
          module_id: moduleId,
          title: cqData.title,
          difficulty: cData.difficulty,
          problem_statement: cqData.problem_statement,
          constraints: ["Execution time limit: 2 seconds", "Memory limit: 512MB"],
          starter_code: cqData.starter_code,
          is_assessment: true,
          sort_order: 0
        }).select('id').single();

        if (!cqErr && cq) {
          // Insert test cases
          await authSupabase.from('coding_test_cases').insert(
            cqData.test_cases.map(tc => ({
              question_id: cq.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden
            }))
          );
        }
      }
    }

    // 7. Add Grand Test (Final Exam)
    console.log(`🏆 Creating Final Grand Test for "${cData.title}"...`);
    const { data: fq, error: fqErr } = await authSupabase.from('quizzes').insert({
      course_id: courseId,
      title: `Final Comprehensive Grand Test: ${cData.title}`,
      is_grand_test: true,
      passing_score: 75,
      quiz_type: 'final_assessment'
    }).select('id').single();

    if (!fqErr && fq) {
      const gQuestions = [];
      for (let qNum = 1; qNum <= 30; qNum++) {
        gQuestions.push({
          quiz_id: fq.id,
          question: `Comprehensive Assessment Question ${qNum}: Which pattern describes best practice implementation in the ${cData.title} course?`,
          options: ["Strict encapsulation with test coverage", "Bypassing controller layer constraints", "Hardcoding variable indices directly", "Dynamic unchecked runtime casting"],
          answer_index: 0,
          explanation: "Best practices mandate strict encapsulation and unit testing.",
          sort_order: qNum - 1
        });
      }
      await authSupabase.from('quiz_questions').insert(gQuestions);
      console.log(`✅ Grand Test with 30 MCQs created successfully.`);
    } else if (fqErr) {
      console.error(`❌ Failed to create Grand Test:`, fqErr);
    }
  }

  console.log("\n⭐️ Database course seeding pipeline completed successfully! All courses set up in draft mode.");
}

seedCourses();
