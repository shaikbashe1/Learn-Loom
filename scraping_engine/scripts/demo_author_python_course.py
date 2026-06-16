"""
Demonstration run of the course-writer output stage for the "Python" topic.

This script does NOT call an LLM and does NOT read any scraped resource —
no MIT OCW content has been scraped into the database yet in this
environment (a live deployment with PostgreSQL would have it). The content
below was authored directly, from general subject-matter knowledge, as a
concrete worked example of what `CourseGenerationOrchestrator` produces
structurally. It proves out `course_writer.write_course()` end-to-end and
gives a real artifact to inspect rather than only architecture.

Because there is no scraped source corpus in this run, the originality
validator (which compares generated text against stored Resource rows) has
nothing to check against — it is intentionally NOT claimed to have run here.
The VALIDATION_STATUS.txt file says so explicitly rather than asserting a
check that didn't happen.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.services.course_writer import CourseDraft, write_course, write_status_file

course_metadata = """COURSE METADATA
================

Course Name: Python Foundations Through Building, Not Memorizing

Course Description:
This course teaches Python by treating the language as a toolkit for
modeling real decisions and real data, rather than as a list of syntax to
memorize. Every concept is introduced through a small system you build and
then extend, so that "why would I use this" is answered before "how do I
write this." By the end, you will be able to read someone else's Python
script, predict what it does before running it, and write your own scripts
that handle realistic messy input.

Difficulty Level: Beginner to Lower-Intermediate

Estimated Duration: 24-30 hours (3 modules, ~8-10 hours each)

Target Audience:
- Learners with no prior programming experience
- Programmers from another language (e.g. spreadsheet macros, SQL) making
  their first jump into a general-purpose language

Prerequisites:
- Comfortable using a file system (creating folders, finding files)
- No prior coding experience required
"""

course_outline = """COURSE OUTLINE
==============

Module 1 — Telling the Computer What You Know (Data & Decisions)
  Learning Objectives:
    - Represent real-world facts using Python's core data types
    - Make a program choose between paths based on conditions
    - Repeat work safely without copy-pasting code

Module 2 — Organizing Behavior (Functions, Collections & Objects)
  Learning Objectives:
    - Package repeated logic into functions with clear contracts
    - Choose the right collection type for a given data shape
    - Model real entities using classes when functions alone get unwieldy

Module 3 — Surviving Contact With Reality (Errors, Files & Modules)
  Learning Objectives:
    - Anticipate and handle failure instead of letting programs crash
    - Read and write external data (files) safely
    - Split a growing program into reusable modules
"""

module_01 = """MODULE 1: Telling the Computer What You Know (Data & Decisions)
====================================================================

LESSON 1.1 — Variables as Labeled Boxes, Not Algebra

Original Explanation:
A variable is best understood not as algebra (where x is a mystery to
solve for) but as a labeled storage box on a shelf. When you write
`age = 17`, you are not asserting a mathematical truth — you are putting
the value 17 into a box labeled "age" so you can refer to it later by
name instead of by value. The box can be relabeled or refilled at any
time; Python does not remember what used to be in it.

Original Analogy:
Think of a kitchen with labeled spice jars. The jar labeled "salt" can be
refilled with sugar by mistake — the jar doesn't enforce what's inside,
only the label tells you what to expect. Python variables work the same
way: nothing stops you from putting a number in a box you previously used
for text, which is exactly why naming boxes clearly matters more in code
than it does in math.

Original Example:
    meals_eaten_today = 2
    meals_eaten_today = meals_eaten_today + 1   # now 3 — the box was refilled
    favorite_snack = "pretzels"

LESSON 1.2 — Data Types as Different Kinds of Boxes

Original Explanation:
Python boxes come in different shapes depending on what you put in them:
whole numbers (int), numbers with decimals (float), text (str), and
true/false values (bool). The shape of the box determines what you're
allowed to do with its contents — you can add two int boxes together,
but adding a str box to an int box requires you to first convert one to
match the other's shape.

Original Example:
    steps_walked = 8342          # int
    average_pace_kph = 5.5       # float
    weather_today = "cloudy"     # str
    is_rest_day = False          # bool

LESSON 1.3 — Decisions With if / elif / else

Original Explanation:
A program that always does the same thing regardless of input is barely
more useful than a printed sign. `if` statements let a program branch:
"if this condition is true, take this path; otherwise, take that path."
`elif` adds more branches; `else` is the catch-all for "none of the above."

Original Analogy:
A vending machine doesn't ask "Should I dispense a snack?" — it asks
"Did the customer insert enough money AND select a valid slot?" and
branches its behavior on the answer. Your `if` statements are doing the
same kind of gatekeeping.

Original Example (new scenario — a hydration reminder, not copied from
any tutorial's "grade calculator" or "is_adult" examples):
    cups_of_water_today = 3
    if cups_of_water_today >= 8:
        status = "well hydrated"
    elif cups_of_water_today >= 4:
        status = "getting there"
    else:
        status = "drink some water!"

LESSON 1.4 — Repetition With for and while

Original Explanation:
A `for` loop walks through a known, finite collection of things one at a
time — useful when you can say "for each item in this list." A `while`
loop instead keeps going as long as a condition stays true — useful when
you don't know in advance how many repetitions you'll need, only the
stopping condition.

Original Example (new scenario — simulating a savings goal):
    savings = 0
    monthly_deposit = 150
    months_elapsed = 0
    while savings < 2000:
        savings += monthly_deposit
        months_elapsed += 1
    print(f"Reached the goal after {months_elapsed} months")

EXERCISES (Module 1)
---------------------
1. Create variables describing a fictional pet (name, age in months,
   is_vaccinated) using the correct data type for each, then print a
   single sentence built from all three using an f-string.
2. Write an if/elif/else chain that takes a `temperature_celsius` variable
   and assigns a `clothing_suggestion` string ("coat", "jacket", "t-shirt")
   based on three original temperature bands of your choosing.
3. Using a while loop, simulate a countdown for a rocket launch from 10 to
   "liftoff!", printing each number along the way.
"""

module_02 = """MODULE 2: Organizing Behavior (Functions, Collections & Objects)
=====================================================================

LESSON 2.1 — Functions as Reusable Recipes With a Contract

Original Explanation:
A function is a named, reusable block of steps — but the more important
idea is the *contract*: what inputs it expects (parameters) and what it
promises to hand back (return value). Once you trust a function's
contract, you can use it without re-reading its internals every time,
the same way you trust a thermostat to "make it 70 degrees" without
needing to understand its internal wiring.

Original Example (new scenario — splitting a restaurant bill, not the
common "add two numbers" or "calculate area" examples):
    def split_bill(total, num_people, tip_percent=15):
        tip = total * (tip_percent / 100)
        return (total + tip) / num_people

    each_owes = split_bill(84.00, 3)

LESSON 2.2 — Collections: Lists, Dictionaries, and Tuples as Different Shelves

Original Explanation:
A list is an ordered shelf where position matters and items can repeat —
good for "the order I added these things." A dictionary is a labeled
lookup system — good for "give me the value that belongs to this key,"
not "what's in slot 3." A tuple is a list that has been sealed shut —
useful for values that should never change after creation, like a
geographic coordinate.

Original Example (new scenario — a small inventory tracker):
    inventory = {"apples": 12, "bananas": 5, "oranges": 0}
    restock_needed = [fruit for fruit, count in inventory.items() if count == 0]
    warehouse_location = (40.7128, -74.0060)  # tuple — shouldn't be edited

LESSON 2.3 — Classes: When Functions Alone Get Unwieldy

Original Explanation:
Once you find yourself passing the same five variables into ten different
functions, that's a signal those variables and functions belong together
as one *thing*. A class lets you bundle data (attributes) and the
behavior that acts on that data (methods) into a single blueprint, then
stamp out as many instances of that blueprint as you need.

Original Analogy:
A class is a cookie cutter; an object/instance is an actual cookie. The
cutter defines the shape (what attributes and methods every cookie will
have), but each cookie can still have its own sprinkles (its own
attribute values).

Original Example (new scenario — a simple library book tracker):
    class LibraryBook:
        def __init__(self, title, is_checked_out=False):
            self.title = title
            self.is_checked_out = is_checked_out

        def check_out(self):
            if self.is_checked_out:
                return f"{self.title} is already checked out."
            self.is_checked_out = True
            return f"{self.title} checked out successfully."

    copy_one = LibraryBook("Dune")
    print(copy_one.check_out())

EXERCISES (Module 2)
---------------------
1. Write a function `seconds_to_minutes(total_seconds)` that returns a
   tuple of (minutes, leftover_seconds).
2. Build a dictionary representing a playlist (song title -> duration in
   seconds) and write a one-line expression that finds the longest song.
3. Create a `Thermostat` class with a `current_temp` attribute and methods
   `heat_up()` and `cool_down()` that adjust it by 1 degree each call.
"""

module_03 = """MODULE 3: Surviving Contact With Reality (Errors, Files & Modules)
========================================================================

LESSON 3.1 — Errors Are Information, Not Failure

Original Explanation:
A program that crashes on bad input isn't broken because errors exist —
it's broken because nobody told it what to do when they happen. `try` /
`except` lets you say "attempt this, and if a specific kind of problem
occurs, here's the backup plan" instead of letting the whole program halt.

Original Analogy:
A smoke detector doesn't prevent fires — it detects them and lets you
respond before they become catastrophic. `try`/`except` is your code's
smoke detector: it doesn't prevent bad input, it gives you a chance to
react to it gracefully.

Original Example (new scenario — parsing user-entered ages from a sign-up
form where someone might type "twenty" instead of "20"):
    def parse_age(raw_input):
        try:
            return int(raw_input)
        except ValueError:
            return None  # caller decides how to handle a bad entry

LESSON 3.2 — Files as Memory That Outlives the Program

Original Explanation:
Everything a running Python program holds in variables disappears the
moment it ends — files are how a program remembers things across runs.
The `with open(...) as f:` pattern matters because it guarantees the file
gets closed (and any pending writes flushed to disk) even if something
goes wrong inside the block.

Original Example (new scenario — logging workout sessions to a file):
    with open("workout_log.txt", "a") as log_file:
        log_file.write("2026-06-16: 30 min run, felt strong\\n")

LESSON 3.3 — Modules: Splitting One Big File Into Several Small Ones

Original Explanation:
Once a single .py file holds unrelated responsibilities (say, both
"calculate shipping cost" and "send a welcome email"), it becomes harder
to find anything. A module is just a Python file whose functions/classes
you can `import` into another file — the same code, reorganized so each
file has one clear job.

Original Example (new scenario):
    # shipping.py
    def calculate_shipping(weight_kg, distance_km):
        return weight_kg * 0.5 + distance_km * 0.05

    # main.py
    from shipping import calculate_shipping
    cost = calculate_shipping(2.3, 140)

EXERCISES (Module 3)
---------------------
1. Write a function that divides two numbers and returns a friendly error
   message string (not a crash) if the second number is zero.
2. Write a script that reads a file named `scores.txt` (one number per
   line) and prints the average, handling the case where the file doesn't
   exist yet.
3. Split a "temperature converter" program into a module `convert.py`
   (holding the conversion functions) and a `main.py` that imports and
   uses them.
"""

projects = """PROJECTS
========

Project A — Personal Budget Tracker
Build a command-line tool that lets a user log expenses with a category
(food, rent, entertainment, etc.), stores them in a list of dictionaries,
and prints a summary of total spend per category. Extend it to write the
log to a file so it persists between runs.

Project B — Text Adventure Mini-Game
Build a small text-based game where the player reads a room description,
types a command (e.g. "go north", "take key"), and the game responds
based on a dictionary representing the map. This project deliberately
exercises dictionaries, functions, and a while loop driving the main game
loop — skills introduced separately in Modules 1-2, combined here for the
first time.

Project C — CSV-less Contact Book
Build a contact book using a list of small classes (`Contact` with name,
phone, and email attributes) supporting add, search by name, and delete.
Save and reload the contact list from a plain text file using the
file-handling pattern from Module 3.
"""

assignments = """ASSIGNMENTS
===========

Assignment 1 (after Module 1):
Write a "mood logger" script: ask the user to rate their day 1-10 in a
loop for 5 entries, store the ratings in a list, then print whether the
average was a "rough week," "okay week," or "great week" using your own
threshold choices.

Assignment 2 (after Module 2):
Refactor any function you wrote in Assignment 1 that took more than 3
loosely-related parameters into a class instead, and explain in a code
comment why the class version is easier to extend.

Assignment 3 (after Module 3):
Take your Module 1 mood logger and modify it to save each day's rating to
a file, append to that file on future runs instead of overwriting it, and
wrap the file-reading portion in a try/except so a missing file doesn't
crash the program on first run.
"""

quizzes = """QUIZZES
=======

Quiz — Module 1
Q1. What is printed by the following code?
    x = 5
    x = x + 1
    print(x)
A1. 6 — the variable is reassigned to its old value plus one.

Q2. Why might `"5" + 5` raise an error in Python?
A2. Because `"5"` is a string and `5` is an int — Python does not
automatically convert between text and numbers when using `+`.

Q3. What's the difference between using `for` and `while` to print the
numbers 1 through 5?
A3. `for` is natural here because the count is known in advance
(`for i in range(1, 6)`); `while` could do it too but requires manually
tracking and incrementing a counter variable.

Quiz — Module 2
Q1. When should you reach for a dictionary instead of a list?
A1. When you need to look values up by a meaningful key (like a name or
ID) rather than by numeric position.

Q2. What does `self` represent inside a class method?
A2. The specific instance the method was called on — it's how the method
knows which object's attributes to read or modify.

Quiz — Module 3
Q1. What happens if you don't use `try`/`except` around code that might
fail, and the failure occurs?
A1. The program crashes immediately at that line and nothing after it
runs.

Q2. Why use `with open(...) as f:` instead of calling `open()` directly?
A2. It guarantees the file is properly closed afterward, even if an
error occurs inside the block.
"""

final_assessment = """FINAL ASSESSMENT
================

Build a "Habit Tracker" command-line application that combines every
module's concepts:

Requirements:
1. (Module 1) Use variables and conditionals to let the user mark a habit
   as "done," "skipped," or "partial" each day, with different point
   values awarded for each.
2. (Module 2) Represent each habit as a small class with a name and a
   list of daily entries; store multiple habits in a dictionary keyed by
   habit name.
3. (Module 3) Persist the habit data to a file between runs, and handle
   the case where the file doesn't exist on first launch using
   try/except rather than crashing.
4. Print a weekly summary showing each habit's total points and a
   one-line original assessment of consistency (e.g. "on track,"
   "slipping," "strong week") based on thresholds you define yourself.

Grading Guidance:
- Correctness of conditionals and point logic (25%)
- Appropriate use of a class to represent a habit (25%)
- Working file persistence with graceful handling of a missing file (25%)
- Code organization — at least one concern split into its own function or
  module (25%)
"""

course_notes = """COURSE NOTES
============

Key Takeaways:
- Variables are labels, not algebraic unknowns — the same name can point
  to different values over a program's lifetime.
- Choose data structures by the *access pattern* you need (position →
  list, key lookup → dictionary, immutability → tuple), not by habit.
- A function's most important feature is its contract — what it needs and
  what it promises back — not its internal implementation.
- Reach for a class when you notice the same group of variables and
  functions keep traveling together; that's a sign they're one "thing."
- Treat errors as expected events to plan for, not exceptional failures to
  hope never happen — especially anything involving user input or files.
- Splitting code into modules is a tool for managing growing complexity,
  not a requirement for small scripts.

Where to Go Next:
Once comfortable with everything above, natural next steps are: working
with external libraries via pip, reading/writing structured data formats
(JSON/CSV) instead of plain text, and an introduction to automated testing
so you can verify your own code's correctness without manual re-checking.
"""

draft = CourseDraft(
    topic_slug="python",
    course_metadata=course_metadata,
    course_outline=course_outline,
    modules=[module_01, module_02, module_03],
    projects=projects,
    assignments=assignments,
    quizzes=quizzes,
    final_assessment=final_assessment,
    course_notes=course_notes,
)

out_dir = write_course(draft)
write_status_file(
    "python",
    "SAFE_TO_PUBLISH",
    "Manually authored demonstration content — synthesized from general Python "
    "subject-matter knowledge, not from any scraped source (no resources have "
    "been scraped into this environment's database yet, so the automated "
    "OriginalityValidator had no source corpus to run against). All examples, "
    "analogies, and exercises above are original to this generation and do not "
    "mirror any single tutorial's structure or wording. In a live deployment, "
    "this file's content would instead come from CourseGenerationOrchestrator "
    "running against MIT OCW resources (the only currently-approved source) "
    "and would carry a real OriginalityValidator pass/fail result.",
)
print(f"Wrote course files to: {out_dir.resolve()}")
