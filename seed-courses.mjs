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
  return `
    <div class="space-y-6">
      <section class="prose max-w-none">
        <h3 class="text-xl font-bold text-primary">Overview & Objectives</h3>
        <p>In this module, we will explore the core concepts of <strong>${modTitle}</strong> within the context of the <em>${courseTitle}</em> course. By the end of this module, you will understand how this concept forms the building block for robust, production-ready system architectures.</p>
        
        <h3 class="text-xl font-bold text-primary mt-6">Detailed Explanation</h3>
        <p>Understanding the theoretical foundations of this topic is critical for any developer or AI practitioner. We start by exploring the syntax, execution lifecycles, and memory allocation structures relevant to these patterns.</p>
        <div class="bg-surface-container border border-border-base p-4 rounded-xl font-mono text-sm my-4 shadow-inner">
          // Conceptual workflow diagram:
          [Client Application] ➔ [Service Controller Layer] ➔ [Data Mapping Engine]
        </div>
        <p>Additionally, we must consider the performance implications. Always avoid memory leaks, nested loops that yield O(N²) execution times, and blockages of the main execution thread when writing applications.</p>

        <h3 class="text-xl font-bold text-primary mt-6">Step-by-Step Code Example</h3>
        <p>Study this illustrative codebase example carefully. It demonstrates standard formatting, variable bounds, and typical application syntax:</p>
        <pre class="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-xs my-4 shadow-md font-mono">
# Code Demonstration: ${modTitle}
def run_process(*args, **kwargs):
    print("Initiating execution process for ${modTitle}...")
    try:
        # Business logic goes here
        result = "Success status code 200"
        return {"status": "ok", "payload": result}
    except Exception as err:
        return {"status": "error", "message": str(err)}
        </pre>

        <h3 class="text-xl font-bold text-primary mt-6">Summary</h3>
        <p>To conclude, keep this architecture clean, modular, and fully tested. We will leverage these foundational concepts in the subsequent chapters of the curriculum.</p>
      </section>
    </div>
  `;
}

// Seeding function
async function seedCourses() {
  console.log("🚀 Starting database course seeding pipeline...");

  // Sign in as admin
  const email = 'admin@demo.com';
  const password = 'admin123';
  console.log(`🔑 Attempting authentication as admin (${email})...`);
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("❌ Authentication failed:", authError.message);
    process.exit(1);
  }

  const userId = authData.user?.id;
  const token = authData.session?.access_token;
  console.log(`✅ Authenticated! Admin User ID: ${userId}`);

  // Create client with authenticated token headers
  const authSupabase = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

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
        const { data: cq, error: cqErr } = await authSupabase.from('coding_questions').insert({
          course_id: courseId,
          module_id: moduleId,
          title: `Coding Lab: Master ${mInfo.title}`,
          difficulty: cData.difficulty,
          problem_statement: `Implement a function that performs clean formatting, sorting, or validation matching **${mInfo.title}**.

Write a function \`solution(data)\` that filters null elements and returns a clean array/list.`,
          constraints: ["Data elements range from 0 to 1000", "Maximum array length: 100", "Execution time limit: 2 seconds"],
          starter_code: {
            "python": "def solution(data):\n    # Write your code here\n    return [x for x in data if x is not None]\n",
            "javascript": "function solution(data) {\n    // Write your code here\n    return data.filter(x => x !== null && x !== undefined);\n}"
          },
          is_assessment: true,
          sort_order: 0
        }).select('id').single();

        if (!cqErr && cq) {
          // Insert 3 test cases
          await authSupabase.from('coding_test_cases').insert([
            { question_id: cq.id, input: "[1, null, 2, 3]", expected_output: "[1, 2, 3]", is_hidden: false },
            { question_id: cq.id, input: "[null, null, 1]", expected_output: "[1]", is_hidden: false },
            { question_id: cq.id, input: "[]", expected_output: "[]", is_hidden: true }
          ]);
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
