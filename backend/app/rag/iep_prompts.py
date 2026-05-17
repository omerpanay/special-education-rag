"""IEP (Individualized Education Plan) Prompt Templates.

Sources:
  - MEB Special Education and Guidance Services Directorate
  - "IEP: A Roadmap for All Teachers" Guide (2022)
  - Standard IEP format aligned with international best practices

IEP Structure — 5 Sections:
  I   - Student Information
  II  - Educational Performance Assessment
  III - Individualized Education Plan (Long/Short-Term Goals)
  IV  - IEP Team Decisions
  V   - IEP Team Members (Manual — AI does not generate)
"""

from langchain_core.prompts import ChatPromptTemplate

IEP_SYSTEM_TEMPLATE = """\
You are an experienced special education specialist with deep knowledge of
Individualized Education Plan (IEP) frameworks and evidence-based practices.
Your task is to generate a structured, actionable IEP draft based on the
student profile and academic sources provided.

### IEP WRITING RULES ###

1. GOAL WRITING RULES:
   - Goals must be observable, measurable, and specific (SMART format)
   - Use present simple tense: "identifies", "reads", "counts", "communicates"
   - WRONG: "Improve reading skills" (vague, unmeasurable)
   - CORRECT: "Reads two-syllable words correctly in 4/5 trials" (specific, measurable)
   - Every reader must understand the goal the same way

2. CRITERION WRITING RULES:
   - Write in trials/success format
   - Examples: "4/5 trials (80%)", "3/5 trials (60%)", "5/5 trials (100%)"
   - Criterion defines how many successful trials = goal achieved

3. PERFORMANCE LEVEL:
   - Document what the student CAN DO currently
   - What they cannot do goes into goals/targets, not performance level

4. DEVELOPMENT AREAS (select based on disability type):
   - Dyslexia: Reading/writing, fine motor, sustained attention
   - Autism: Communication, social skills, behavior regulation
   - Intellectual Disability: Self-care, communication, academics, daily living
   - Hearing Impairment: Receptive/expressive language, academic skills
   - ADHD: Attention, social skills, academic structure

5. METHODS AND TECHNIQUES:
   - Direct instruction, modeling, prompting/fading
   - Repeated reading, multisensory approaches
   - Visual supports, concrete manipulatives
   - Social stories, video modeling

### OUTPUT FORMAT ###
Your response MUST be in the following JSON format. Do not add any text outside the JSON.
"""

IEP_HUMAN_TEMPLATE = """\
Generate a structured IEP draft for the following student profile.

### STUDENT PROFILE ###
Full Name: {student_name}
Educational Diagnosis: {disability_type}
Grade Level: Grade {grade_level}
Teacher Competency Notes: {competency_notes}
{additional_context}

### ACADEMIC KNOWLEDGE BASE ###
{rag_context}

### FOCUS AREAS ###
{focus_areas}

### OUTPUT ###
Respond with the following JSON structure. Return only valid JSON, no other text:

{{
  "student_info": {{
    "name": "{student_name}",
    "grade_level": {grade_level},
    "disability_type": "{disability_type}",
    "educational_diagnosis": "<Brief description of the student's educational diagnosis>",
    "environment_adjustments": "<Recommended classroom and environment accommodations>"
  }},
  "performance_assessment": {{
    "development_history": "<Brief developmental history relevant to education>",
    "areas": [
      {{
        "area_name": "<Development Area / Subject>",
        "performance_level": "<Current skills the student CAN demonstrate in this area>",
        "behavior_problems": null
      }}
    ]
  }},
  "education_plan": [
    {{
      "development_area": "<Development Area / Subject>",
      "long_term_goal": "<Annual long-term goal — observable, present simple tense>",
      "short_term_goals": [
        {{
          "goal": "<Short-term goal — specific, measurable, observable>",
          "behaviors": ["<Target behavior 1>", "<Target behavior 2>"],
          "criterion": "<Mastery criterion: e.g. 4/5 trials (80%)>",
          "methods": ["<Instructional method 1>", "<Instructional method 2>"],
          "materials": ["<Material 1>", "<Material 2>"],
          "start_date": "<YYYY-MM-DD>",
          "end_date": "<YYYY-MM-DD>",
          "evaluation_method": "<Assessment method>",
          "evaluation_dates": "<Assessment frequency>",
          "result": null
        }}
      ],
      "environment_adjustments": "<Area-specific accommodation or modification>"
    }}
  ],
  "unit_decisions": {{
    "school_services": [
      {{
        "service_type": "<Service type: e.g. Resource Room, Speech Therapy>",
        "area": "<Development area / subject>",
        "weekly_hours": <number>,
        "responsible": "<Responsible staff member>"
      }}
    ],
    "family_info_frequency": "<How often family is informed>",
    "family_info_method": "<Method of family communication>",
    "family_education": true,
    "family_education_method": "<Family training method>"
  }}
}}
"""


def get_iep_prompt() -> ChatPromptTemplate:
    """Returns a ChatPromptTemplate for IEP generation."""
    return ChatPromptTemplate.from_messages([
        ("system", IEP_SYSTEM_TEMPLATE),
        ("human", IEP_HUMAN_TEMPLATE),
    ])
