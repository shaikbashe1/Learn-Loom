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
  let objectives = [
    `Understand the fundamental principles of ${modTitle}.`,
    `Identify the core syntax, constructs, and architecture associated with this topic.`,
    `Apply these concepts to solve real-world technical problems.`,
    `Analyze performance characteristics and potential pitfalls.`
  ];
  
  let explanation = '';
  let workflow = '';
  let codeSample = '';
  let breakdown = [];
  let useCases = [];
  let takeaways = [];

  // 1. Python Programming Masterclass
  if (courseTitle.includes("Python")) {
    if (modTitle.includes("Setup")) {
      explanation = `Setting up a local development environment is the first step in python engineering. Python is an interpreted, high-level, general-purpose programming language. The installation process places the Python interpreter on your system, allowing you to execute scripts. Configuring your Integrated Development Environment (IDE), such as VS Code or PyCharm, ensures syntax highlighting, linting, and debugging capabilities are active. When you run a Python script, the source code is compiled into bytecode (.pyc files) and executed by the Python Virtual Machine (PVM).`;
      workflow = `[Source Code: .py] ➔ [Bytecode Compiler] ➔ [Bytecode: .pyc] ➔ [Python Virtual Machine (PVM)] ➔ [Execution]`;
      codeSample = `import sys

def check_environment():
    print("Python Version:", sys.version)
    print("Executable Path:", sys.executable)
    print("Platform OS:", sys.platform)

if __name__ == "__main__":
    check_environment()`;
      breakdown = [
        "`import sys`: Imports the built-in system module to access interpreter variables.",
        "`sys.version`: Retrieves detailed version information for the active Python environment.",
        "`sys.executable`: Locates the absolute path of the Python interpreter executable.",
        "`if __name__ == '__main__'`: Ensures the script only runs when executed directly, not when imported."
      ];
      useCases = [
        "Verifying dependencies and environment variables before running automated deployments.",
        "System scripting and configuring environment configurations across server fleets."
      ];
      takeaways = [
        "Python requires the interpreter to translate source code into machine-executable PVM bytecode.",
        "Virtual environments are highly recommended to prevent dependency conflicts between projects."
      ];
    } else if (modTitle.includes("Variables")) {
      explanation = `Variables in Python act as named references to objects stored in system memory. Unlike static languages, Python uses dynamic typing, meaning variables do not have fixed types; instead, the types are bound to the values/objects themselves. Every object in Python has three properties: an Identity (its memory address, checkable using id()), a Type (e.g., int, str, checkable using type()), and a Value. When you reassign a variable, you are changing the memory reference it points to, not editing the object itself. Objects are categorized as mutable (like lists, dicts) or immutable (like integers, strings, tuples).`;
      workflow = `[Variable Name: x] ➔ Reference Pointer ➔ [Memory Address: 0x10A4 (Integer Object: 42)]`;
      codeSample = `# Variables, memory references, and types
x = 42
y = x

print("x id:", id(x), "type:", type(x))
print("y id:", id(y), "y matches x:", x is y)

# Reassignment points y to a new memory address
y = 100
print("y new id:", id(y), "y value:", y)`;
      breakdown = [
        "`x = 42`: Creates an integer object with value 42 and binds the name 'x' to it.",
        "`y = x`: Binds the name 'y' to the exact same memory address as 'x'. No object duplication occurs.",
        "`id(x)`: Returns the unique memory address identifier of the referenced object.",
        "`x is y`: Uses the identity operator to check if both variables reference the exact same memory object."
      ];
      useCases = [
        "Storing configuration settings dynamically in memory during backend controller runs.",
        "Memory-efficient data referencing in large data pipelines without copying heavy arrays."
      ];
      takeaways = [
        "Python variables are dynamic labels, not typed containers.",
        "Understanding mutability vs immutability prevents subtle bugs in functions and shared states."
      ];
    } else if (modTitle.includes("OOP")) {
      explanation = `Object-Oriented Programming (OOP) is a paradigm that structures programs by grouping related properties and behaviors into classes. In Python, a class acts as a blueprint, and instances are individual concrete objects created from that blueprint. Python supports single and multiple inheritance, encapsulation, and polymorphism. Class attributes are shared by all instances, while instance attributes (configured inside the __init__ constructor) are unique to each object. Python uses a Method Resolution Order (MRO) algorithm (C3 Linearization) to determine inheritance lookup routes when methods are overridden.`;
      workflow = `[Parent: Animal] ➔ [Inherited by] ➔ [Child: Dog] ➔ [Instance Object: my_dog]`;
      codeSample = `class Vehicle:
    def __init__(self, make, model):
        self.make = make      # Instance attribute
        self.model = model    # Instance attribute
    
    def get_info(self):
        return f"{self.make} {self.model}"

class ElectricCar(Vehicle):
    def __init__(self, make, model, battery_kwh):
        super().__init__(make, model)  # Delegate constructor to parent
        self.battery_kwh = battery_kwh # Unique subclass attribute

    def get_info(self):
        # Override method and extend behavior
        parent_info = super().get_info()
        return f"{parent_info} with {self.battery_kwh}kWh Battery"

tesla = ElectricCar("Tesla", "Model S", 100)
print(tesla.get_info())`;
      breakdown = [
        "`class Vehicle`: Defines a new class blueprint.",
        "`def __init__(self, ...)`: The instance initializer method, called automatically when creating objects.",
        "`super().__init__(make, model)`: Resolves the parent class and triggers its initializer safely.",
        "`ElectricCar(Vehicle)`: Specifies that ElectricCar inherits all attributes and methods of Vehicle."
      ];
      useCases = [
        "Building modular, scalable UI component trees or design patterns (e.g., repository class structures).",
        "Encapsulating connection pools, configurations, and state in database adapters."
      ];
      takeaways = [
        "OOP provides structure and code reusability via inheritance.",
        "Method overriding allows child classes to specialize parent behavior while maintaining the interface."
      ];
    } else {
      // General Python Module
      explanation = `In this module, we dive deep into the concepts of **${modTitle}** within the Python environment. Python's clean syntax and standard library utilities provide developers with expressive tools to build performant modules. This lesson covers syntax patterns, typical architectural structures, performance implications, and practical implementations. Mastering these concepts is essential to writing code that adheres to PEP 8 standards and is maintainable at enterprise scale.`;
      workflow = `[Input Data] ➔ [${modTitle} Processing Layer] ➔ [Optimized Output]`;
      codeSample = `# Python implementation of ${modTitle}
def process_data(data):
    if not isinstance(data, list):
        raise ValueError("Expected list input")
    
    results = []
    for item in data:
        # Core operational routine for ${modTitle}
        processed = str(item).upper().strip()
        results.append(processed)
    return results

if __name__ == "__main__":
    sample = ["  data1 ", "data2", "  data3  "]
    print("Processed:", process_data(sample))`;
      breakdown = [
        "`def process_data(data)`: Defines a processing helper with explicit parameter naming.",
        "`raise ValueError(...)`: Implements robust input validation and raises built-in exception types.",
        "`results = []`: Initializes a clean accumulator list to collect modified strings.",
        "`str(item).upper().strip()`: Formats elements by removing whitespace and capitalizing."
      ];
      useCases = [
        "Cleaning and pre-processing input payloads before entering database pipelines.",
        "Parsing configurations, files, or API responses inside integration systems."
      ];
      takeaways = [
        "Python's duck typing requires careful validation of inputs in public module boundaries.",
        "Accumulator patterns are standard for processing and returning new modified data structures."
      ];
    }
  }
  // 2. Java Programming: Core to Enterprise
  else if (courseTitle.includes("Java")) {
    if (modTitle.includes("Hello World")) {
      explanation = `Java is a class-based, object-oriented language designed to have as few implementation dependencies as possible. Java code is compiled into platform-independent bytecode (.class files) by the javac compiler. This bytecode is then executed by the Java Virtual Machine (JVM) using the Just-In-Time (JIT) compiler to compile hotspot code directly into native machine instructions. The static main method serves as the canonical entry point for all Java runtime applications. Since Java enforces strict object orientation, all execution logic must reside inside class definitions.`;
      workflow = `[Source: .java] ➔ Compile [javac] ➔ [Bytecode: .class] ➔ JVM Load ➔ [Native Machine Execution]`;
      codeSample = `public class HelloWorld {
    // Canonical entry point for Java execution
    public static void main(String[] args) {
        System.out.println("Hello, LearnLoom Developer!");
    }
}`;
      breakdown = [
        "`public class HelloWorld`: Declares a public class that must match the source file name.",
        "`public static void main`: Static access allows the JVM to invoke the method without creating an instance.",
        "`String[] args`: Captures command-line string arguments passed during launch.",
        "`System.out.println`: Standard output stream utility that prints text followed by a newline."
      ];
      useCases = [
        "Bootstrapping microservices, utility runtimes, or command-line scripts in enterprise systems.",
        "Verification of compilation toolchains, JVM classpath, and class path structures."
      ];
      takeaways = [
        "Java code is compiled to bytecode (.class) which runs on any OS equipped with a JVM.",
        "Object-oriented syntax structures enforce type safety and clear logical division from day one."
      ];
    } else if (modTitle.includes("Spring Boot")) {
      explanation = `Spring Boot is the standard framework for Java enterprise web applications. It implements the Dependency Injection (DI) and Inversion of Control (IoC) patterns, allowing the Spring container to manage the instantiation, lifecycle, and configuration of Java beans. It leverages annotation-driven configuration to reduce boilerplate code. A Spring REST Controller maps HTTP request endpoints directly to Java methods, parsing JSON payloads using Jackson serializers automatically.`;
      workflow = `[HTTP Request] ➔ [DispatcherServlet] ➔ [Spring RestController] ➔ Bean Injection ➔ [Response]`;
      codeSample = `import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/v1/status")
public class StatusController {

    @GetMapping
    public ResponseEntity<StatusResponse> getSystemStatus() {
        StatusResponse status = new StatusResponse("ONLINE", 200);
        return ResponseEntity.ok(status);
    }
}

class StatusResponse {
    private String status;
    private int code;
    public StatusResponse(String status, int code) {
        this.status = status;
        this.code = code;
    }
    public String getStatus() { return status; }
    public int getCode() { return code; }
}`;
      breakdown = [
        "`@RestController`: Combines @Controller and @ResponseBody to mark the class as a REST endpoint.",
        "`@RequestMapping`: Sets the base URL routing prefix for all handlers in the class.",
        "`ResponseEntity.ok`: Generates an HTTP 200 response envelope wrapping the payload object.",
        "`StatusResponse`: A POJO class that Spring automatically serializes to a JSON string."
      ];
      useCases = [
        "Exposing RESTful web APIs for SaaS platforms, mobile applications, and internal services.",
        "Integrating middleware, caching handlers, and database clients behind secure routing layers."
      ];
      takeaways = [
        "Spring Boot uses IoC and dependency injection to manage system resource and class lifecycles.",
        "Annotations simplify HTTP routing, parameter mapping, and JSON response serializations."
      ];
    } else {
      // General Java Module
      explanation = `Java's strict compilation, object-oriented enforcement, and cross-platform JVM runtime make it the backbone of enterprise computing. In this module, we analyze the implementation guidelines of **${modTitle}**. Writing clean Java code involves understanding class hierarchies, type systems, memory garbage collection parameters, and proper handling of exceptions. Following standard conventions ensures code is legible, scalable, and optimized.`;
      workflow = `[Java Source Compiler] ➔ [JVM ClassLoader] ➔ [Runtime Memory Allocation]`;
      codeSample = `package com.learnloom.core;

import java.util.ArrayList;
import java.util.List;

public class DataProcessor {
    public List<String> process(List<Object> inputs) {
        List<String> results = new ArrayList<>();
        if (inputs == null) {
            return results;
        }
        for (Object input : inputs) {
            if (input != null) {
                results.add(input.toString().trim().toUpperCase());
            }
        }
        return results;
    }
}`;
      breakdown = [
        "`package com.learnloom.core`: Configures the package namespace path to organize code.",
        "`List<String> results`: Leverages generics to enforce compile-time type safety for Collections.",
        "`inputs == null`: Checks for null values to prevent NullPointerExceptions during execution.",
        "`input.toString().trim()`: Safely converts objects and removes outer formatting whitespace."
      ];
      useCases = [
        "Processing database rows, payloads, or message streams inside background workers.",
        "Validating inputs and building safe transaction records inside backend workflows."
      ];
      takeaways = [
        "Strong typing and generic collections catch structural and logical errors during compilation.",
        "Handling edge cases like null references is crucial to prevent runtime service crashes."
      ];
    }
  }
  // 3. AI & Machine Learning Complete Guide
  else if (courseTitle.includes("AI & Machine Learning")) {
    if (modTitle.includes("Foundations")) {
      explanation = `Artificial Intelligence (AI) and Machine Learning (ML) shift the programming paradigm from rules-based algorithms to statistical data models. In classical programming, developers write instructions (rules) and inputs to get outputs. In Machine Learning, we feed inputs and outputs (labeled training data) to the machine, which then derives the mathematical model (rules). ML is categorized into Supervised Learning (predicting labeled values), Unsupervised Learning (clustering unlabeled data), and Reinforcement Learning (reward-based learning). Generalization is the core objective: the model must perform well on unseen test data, avoiding underfitting (high bias) and overfitting (high variance).`;
      workflow = `[Data Collection] ➔ [Preprocessing & Splits] ➔ [Model Training] ➔ [Evaluation] ➔ [Deployment]`;
      codeSample = `# Split data into training and validation sets
from sklearn.model_selection import train_test_split
import numpy as np

# Create synthetic features and labels
X = np.random.rand(100, 5) # 100 samples, 5 features
y = np.random.choice([0, 1], size=100) # Binary classification labels

# Perform 80/20 train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

print("Training samples:", X_train.shape[0])
print("Testing samples:", X_test.shape[0])`;
      breakdown = [
        "`train_test_split`: Shuffles and splits datasets into independent sets for training and validation.",
        "`test_size=0.20`: Allocates exactly 20% of the data samples for model verification testing.",
        "`random_state=42`: Seeds the randomizer to ensure split runs produce identical sets (reproducibility).",
        "`stratify=y`: Ensures the class distributions in training and testing splits match the original set."
      ];
      useCases = [
        "Preparing transaction histories, customer actions, or sensor data logs for predictive ML runs.",
        "Creating strict validation splits to monitor overfitting during iterative training epochs."
      ];
      takeaways = [
        "Machine Learning discovers functional rules statistically by minimizing a mathematical loss function.",
        "Independent validation sets are vital to accurately estimate real-world generalization performance."
      ];
    } else if (modTitle.includes("Regression")) {
      explanation = `Linear Regression models the relationship between dependent labels Y and independent features X by fitting a linear equation. The algorithm minimizes the Mean Squared Error (MSE) cost function, which measures the average squared distance between predicted values and actual labels. This minimization is achieved using Gradient Descent, which iteratively updates weights (w) and bias (b) by taking steps proportional to the negative gradient of the loss function. The size of the step is controlled by the learning rate (alpha).`;
      workflow = `Loss Function (MSE) ➔ Calculate Gradients ➔ Update weights: w = w - alpha * dw ➔ Model convergence`;
      codeSample = `# Linear Regression using Scikit-Learn
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error

# Synthetic training points: Y = 2*X + 1
X_train = np.array([[1], [2], [3], [4]])
y_train = np.array([3, 5, 7, 9])

# Train regression model
regressor = LinearRegression()
regressor.fit(X_train, y_train)

# Make predictions on new feature values
predictions = regressor.predict([[5]])
print("Prediction for X=5:", predictions[0]) # Output: 11.0
print("Weights:", regressor.coef_, "Bias:", regressor.intercept_)`;
      breakdown = [
        "`LinearRegression()`: Initializes the linear model using standard ordinary least squares formulation.",
        "`regressor.fit(...)`: Trains the model by solving the normal equation or running gradient updates.",
        "`regressor.predict(...)`: Executes inference by running the linear formula: y = wx + b.",
        "`regressor.coef_`: Retrieves the calculated linear coefficient (weight) for the input features."
      ];
      useCases = [
        "Forecasting sales trends, housing prices, stock valuations, or system resource demand limits.",
        "Analyzing correlations between user engagement metrics and business KPIs."
      ];
      takeaways = [
        "Linear Regression models continuous numerical outcomes using direct linear relationships.",
        "Model parameters (weights, bias) represent feature importances and base values respectively."
      ];
    } else {
      // General ML Module
      explanation = `Machine Learning leverages statistical algorithms to analyze data and extract predictive patterns. In this module, we focus on **${modTitle}**. Preparing an ML model involves careful feature engineering, choosing suitable model architectures, tuning hyperparameters (like validation rate and regularization constants), and verifying performance metrics. Avoiding bias and validating under independent datasets are crucial steps.`;
      workflow = `[Input Matrix X] ➔ [Model Prediction Function] ➔ [Loss Calculation] ➔ [Optimizer Updates]`;
      codeSample = `# Generic ML workflow setup
import numpy as np

def calculate_mse_loss(y_true, y_pred):
    # Calculate Mean Squared Error
    return np.mean((y_true - y_pred) ** 2)

true_values = np.array([1.5, 2.0, 3.0])
pred_values = np.array([1.4, 2.2, 2.9])
print("MSE Loss:", calculate_mse_loss(true_values, pred_values))`;
      breakdown = [
        "`calculate_mse_loss(...)`: Compares actual targets against predictions to output a loss score.",
        "`np.mean(...)`: Averages values over all dimensions of the calculated error array.",
        "`(y_true - y_pred) ** 2`: Calculates the squared differences to penalize larger errors more heavily.",
        "`true_values / pred_values`: Simulated arrays showing sample calculations."
      ];
      useCases = [
        "Measuring prediction variance during optimization checks for regression models.",
        "Defining customizable loss matrices for specialized reinforcement and clustering workflows."
      ];
      takeaways = [
        "Every machine learning model is optimized by defining and minimizing a loss function.",
        "Loss scores represent numerical error values and drive parameter updates."
      ];
    }
  }
  // 4. Building Autonomous AI Agents
  else if (courseTitle.includes("AI Agents")) {
    if (modTitle.includes("Introduction")) {
      explanation = `Autonomous AI Agents are software systems powered by Large Language Models (LLMs) that perceive their environment, execute logical planning, use tools, and act to achieve goals. Unlike static chat completion setups, agents operate in loops, dynamically deciding which actions to take. The core agent architecture consists of four pillars: 1. Profile (defining the role and goal), 2. Memory (short-term chat history and long-term vector store context), 3. Planning (reflecting on actions, breaking tasks down, and using methods like ReAct: Reasoning and Action), and 4. Tools (APIs, databases, web search, code execution).`;
      workflow = `[User Goal] ➔ [Agent Think (ReAct Loop)] ➔ [Tool Call (API/Search)] ➔ [Observation] ➔ [LLM Response]`;
      codeSample = `# Conceptual structure of a ReAct Agent loop
class SimpleAgent:
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = tools

    def run(self, task):
        print(f"Goal: {task}")
        # The agent thinks, selects a tool, runs it, and repeats until resolved
        thought = "I need to search the database for this user."
        action = "db_search"
        tool_input = "User 123"
        observation = self.tools[action](tool_input)
        
        final_answer = f"Found user details: {observation}"
        return final_answer

tools = {"db_search": lambda query: "Bashe, credits: 100"}
agent = SimpleAgent(llm="GPT-4", tools=tools)
print(agent.run("Get details for user 123"))`;
      breakdown = [
        "`SimpleAgent`: Encapsulates the agent configuration, state, and planning controls.",
        "`tools`: A dictionary mapping tool identifiers directly to executable functions.",
        "`agent.run(...)`: Bootstraps the reasoning loop to translate goals into concrete actions.",
        "`db_search`: A mock tool that retrieves database values to return as observations."
      ];
      useCases = [
        "Automating complex, multi-step workflows like customer support routing or database auditing.",
        "Building smart assistants that interact with external file explorers and code runtimes."
      ];
      takeaways = [
        "AI Agents use LLMs as reasoning engines to choose actions and interact with the environment.",
        "Combining planning, tool usage, and memory is required to build reliable autonomous workflows."
      ];
    } else if (modTitle.includes("RAG")) {
      explanation = `Retrieval-Augmented Generation (RAG) is a technique that references authoritative external databases to supplement LLM prompts before generating a response. RAG solves the core limitations of LLMs: hallucinations, outdated knowledge, and lack of private/enterprise context. The RAG pipeline consists of: 1. Ingestion (loading documents), 2. Chunking (splitting text into manageable segments), 3. Embedding (converting chunks into dense vector representations using neural embedding models), 4. Storage (indexing vectors in a Vector Database like Pinecone or Chroma), 5. Retrieval (calculating cosine similarity between user query vector and document vectors), and 6. Generation (passing the retrieved document text as context in the prompt).`;
      workflow = `[Query] ➔ Vector Match ➔ [Vector Database] ➔ Retrieve Chunks ➔ [Prompt Context + Query] ➔ [LLM]`;
      codeSample = `# Mock RAG Cosine Similarity Match
import numpy as np

def cosine_similarity(v1, v2):
    # Measure directional alignment of vectors
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

# Synthetic embeddings (e.g. from an LLM model)
query_vector = np.array([0.15, 0.82, 0.33])
doc_vector = np.array([0.18, 0.79, 0.31])

similarity = cosine_similarity(query_vector, doc_vector)
print("Query-Document Vector Similarity:", similarity) # High alignment: ~0.99`;
      breakdown = [
        "`cosine_similarity`: Measures vector alignment, returning a value between -1 and 1.",
        "`np.dot(v1, v2)`: Computes the dot product, representing structural covariance of coordinates.",
        "`np.linalg.norm`: Calculates the vector magnitude (Euclidean length) for normalizations.",
        "`similarity`: A score close to 1 indicates the document chunk is highly relevant to the query."
      ];
      useCases = [
        "Connecting internal company knowledge bases, wikis, or PDF directories to customer chatbots.",
        "Augmenting code generators with API documentations and library instructions."
      ];
      takeaways = [
        "RAG provides LLMs with real-time, external, context-specific facts to prevent hallucinations.",
        "Vector databases index text chunks by semantic similarity rather than simple keyword matches."
      ];
    } else {
      // General Agents Module
      explanation = `Autonomous AI Agent frameworks coordinate LLM reasoning loops with external tools to complete complex tasks. In this module, we focus on **${modTitle}**. Building robust agent architectures requires managing system prompts, configuring tools with clear descriptions (so the LLM understands when to call them), handling JSON format outputs, and managing conversations over long runs.`;
      workflow = `[LLM Controller] ➔ [Parser & Planner] ➔ [Tool Registry] ➔ [Observer]`;
      codeSample = `# Framework tool registration example
def web_search(query):
    """Searches the web for the query and returns top results."""
    return f"Top result for {query}: LearnLoom is an AI-first LMS."

# Tool schema exposed to the LLM agent
tool_schema = {
    "name": "web_search",
    "description": "Call this tool to search the internet for current facts.",
    "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
}`;
      breakdown = [
        "`web_search`: The actual Python function that queries external search API clients.",
        "`tool_schema`: Structured JSON structure passed to the LLM to explain tool capabilities.",
        "`description`: Crucial for the LLM to decide when to call the search tool during planning.",
        "`parameters`: Defines the expected input schema to prevent malformed tool calls."
      ];
      useCases = [
        "Exposing system utilities, compilers, or files safely to LLM agents.",
        "Configuring custom agents with specific tasks (e.g., code reviewer, text writer)."
      ];
      takeaways = [
        "Clear tool descriptions are required so the LLM reasoning loop knows when to trigger them.",
        "Schema parameters enforce input conventions during automated tool execution cycles."
      ];
    }
  }

  // Combine into clean, beautifully formatted Markdown
  let markdownObjectives = objectives.map(obj => `- ${obj}`).join('\n');
  let markdownBreakdown = breakdown.map(line => `- ${line}`).join('\n');
  let markdownUseCases = useCases.map(uc => `- ${uc}`).join('\n');
  let markdownTakeaways = takeaways.map(t => `- ${t}`).join('\n');

  return `### 🎯 Overview & Objectives
${explanation}

#### Learning Objectives
${markdownObjectives}

---

### 🗺️ Architectural Workflow
Below is the system workflow that illustrates the operational lifecycle of these concepts:

\`\`\`text
${workflow}
\`\`\`

---

### 💻 Step-by-Step Practical Code Walkthrough
Analyze this production-quality code snippet illustrating standard patterns and syntaxes:

\`\`\`python
${codeSample}
\`\`\`

#### Detailed Code Breakdown
${markdownBreakdown}

---

### 🏢 Real-World Use Cases
These concepts are implemented in standard industry workflows such as:
${markdownUseCases}

---

### 📚 Key Takeaways & Summary
${markdownTakeaways}

**Summary:** In this module, we analyzed the mechanics of **${modTitle}**. Ensuring your implementations follow these guidelines is critical to building scalable, robust architectures. In the next module, we will expand this setup with advanced testing architectures.`;
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
