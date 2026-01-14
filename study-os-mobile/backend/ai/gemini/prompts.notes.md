# Gemini Prompts: Notes Finalization

## notes_finalize

**Purpose:** Convert raw transcript-based notes into clean, structured study notes suitable for review and exam preparation.

**Context:** Raw notes are accumulated from live transcription segments during a lesson recording. They may contain repetition, incomplete sentences, and lack structure. The finalization prompt produces clean, organized study notes in a specific format.

### System Prompt

```
You are an expert study notes formatter specializing in creating comprehensive lecture notes for students. Your task is to convert raw, unstructured notes from a lecture transcription into clean, well-organized study notes that follow a specific academic format.

You must strictly follow the output format template provided. Use plain text formatting only (no markdown syntax like *, **, #, etc.). Write in clear, accessible language that any student can understand.

Keep the content accurate to the original. Do not add information not present in the raw notes. Focus on clarity, organization, and exam readiness.
```

### User Prompt Template

```
Convert these raw lecture notes into clean, structured study notes following the EXACT format below:

---RAW NOTES---
{raw_notes_text}
---END RAW NOTES---

OUTPUT FORMAT (follow exactly):

[Lecture Title]

Topic: [Primary topic or subject area]
Date: [Lecture date or "Not specified"]
Duration: [Total length of lecture or "Not specified"]

Key Takeaways

This lecture focused on [main idea or theme], explaining [why it matters or how it works]. A key distinction was made between [Concept A] and [Concept B], helping clarify [what differentiates them]. Additionally, [important formula / rule / principle] was introduced, which is especially relevant for [exams, applications, or problem-solving].

Core Concepts

[Concept 1 — Title]

This concept introduces [brief plain-language explanation]. It helps explain [what the concept does or represents] and how it fits into the broader topic of the lecture.

Key clarification: [important detail or nuance]

Example: [short example or scenario]

Why it matters: [reason this concept is important or commonly used]

[Concept 2 — Title]

This concept builds on earlier ideas by explaining [what this concept adds or changes]. It is commonly used when [conditions or situations where it applies].

Supporting detail: [additional explanation]

Comparison: [how it differs from or relates to another concept]

Use case: [when or why it is applied]

Examples Explained

The following examples were used to demonstrate how the concepts apply in practice.

Example 1: [step-by-step explanation or summary of the example]

Example 2: [explanation of a more advanced or alternative example]

Common Mistakes

Students often make the following mistakes when working with this material:

• Confusing [Concept / Term X] with [Concept / Term Y]
• Applying [formula / rule] outside of [its valid conditions]

Avoiding these errors is important for [accuracy, exams, or real-world use].

Definitions

[Term]: [clear, concise definition in simple language]

[Term]: [definition]

[Term]: [definition]

---END FORMAT---

IMPORTANT RULES:
1. Follow the template structure EXACTLY
2. Use plain text only (NO markdown syntax: no *, **, #, etc.)
3. Key Takeaways must be a cohesive paragraph (not bullet points)
4. Include 2-5 Core Concepts, each with all sub-sections (Key clarification, Example, Why it matters, etc.)
5. Only include "Examples Explained" section if specific examples were given
6. Only include "Common Mistakes" section if errors/pitfalls were mentioned
7. Include all technical terms in the Definitions section
8. Omit any section that has no relevant content
9. Date and Duration can be "Not specified" if not mentioned in the notes
10. Write in the same language as the input notes
```

### Example Input (Raw Notes)

```
Photosynthesis Converting Light to Energy

Topic Cellular Biology Energy Conversion

Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that can later be released to fuel the organism's activities. This chemical energy is stored in carbohydrate molecules like sugars which are synthesized from carbon dioxide and water.

Most photosynthesis occurs in chloroplasts which contain chlorophyll. Chlorophyll is the green pigment that absorbs light.

There are two main stages the light-dependent reactions and the light-independent reactions also known as the Calvin cycle.

Light-dependent reactions happen in the thylakoid membranes and produce ATP and NADPH. Water is split releasing oxygen.

The Calvin cycle happens in the stroma and uses ATP and NADPH to convert CO2 into glucose.

This is super important for life on Earth because it produces oxygen and is the base of most food chains.

Students often confuse the inputs and outputs of each stage. Another common mistake is thinking the Calvin cycle needs direct light when it actually just needs the products from the light reactions.
```

### Example Output (Final Notes)

```
Photosynthesis: Converting Light Energy to Chemical Energy

Topic: Cellular Biology and Energy Conversion
Date: Not specified
Duration: Not specified

Key Takeaways

This lecture focused on photosynthesis as a fundamental biological process, explaining how plants and other organisms convert light energy into usable chemical energy stored in carbohydrates. A key distinction was made between light-dependent reactions and light-independent reactions (Calvin cycle), helping clarify what happens in each stage and where they occur within the chloroplast. Additionally, the role of chlorophyll as the primary light-absorbing pigment was introduced, which is especially relevant for understanding energy capture and the production of oxygen as a byproduct.

Core Concepts

Photosynthesis Overview

This concept introduces the fundamental process by which plants convert light energy into chemical energy. It helps explain how organisms capture solar energy and transform it into glucose molecules that can be used to fuel cellular activities and growth.

Key clarification: The process requires carbon dioxide, water, and light as inputs, producing glucose and oxygen as outputs.

Example: When a plant leaf is exposed to sunlight, chlorophyll absorbs the light energy and initiates the chemical reactions that eventually produce sugar molecules the plant can use for energy.

Why it matters: Photosynthesis is the foundation of nearly all food chains on Earth and is responsible for producing the atmospheric oxygen that supports aerobic life.

Light-Dependent Reactions

This concept builds on earlier ideas by explaining what happens in the first stage of photosynthesis. It is commonly used when describing how light energy is captured and converted into chemical energy carriers ATP and NADPH.

Supporting detail: These reactions occur specifically in the thylakoid membranes within chloroplasts, where chlorophyll molecules are embedded in the membrane structure.

Comparison: Unlike the Calvin cycle, light-dependent reactions require direct light input and produce oxygen as a byproduct from water splitting, while the Calvin cycle uses the energy carriers to build sugars.

Use case: This stage is essential for generating the energy carriers ATP and NADPH that power the second stage of photosynthesis where actual glucose is synthesized.

Calvin Cycle (Light-Independent Reactions)

This concept introduces the second stage of photosynthesis, which does not require direct light. It helps explain how the chemical energy from ATP and NADPH is used to fix carbon dioxide molecules into glucose through a series of enzymatic reactions.

Key clarification: Despite being called light-independent, this cycle still depends completely on the products ATP and NADPH from light-dependent reactions, so it indirectly requires light.

Example: The Calvin cycle takes three CO2 molecules from the air and, through multiple reaction steps in the stroma, assembles them into a three-carbon sugar molecule that can be combined to form glucose.

Why it matters: This is the stage where actual carbohydrates are synthesized, making it crucial for plant growth, energy storage, and the production of food that supports the entire food chain.

Common Mistakes

Students often make the following mistakes when working with this material:

• Confusing the inputs and outputs of light-dependent reactions with those of the Calvin cycle
• Thinking the Calvin cycle requires direct light when it only needs the ATP and NADPH produced by the light-dependent reactions

Avoiding these errors is important for accurately understanding the complete photosynthesis process and performing well on biology exams where this distinction is frequently tested.

Definitions

Chloroplast: An organelle found in plant cells and some algae where photosynthesis takes place, containing internal membrane systems where light and dark reactions occur.

Chlorophyll: The green pigment molecule in plants responsible for absorbing light energy, primarily in the blue and red wavelengths while reflecting green light.

ATP: Adenosine triphosphate, a molecule that stores and transfers chemical energy within cells to power various cellular processes.

NADPH: Nicotinamide adenine dinucleotide phosphate, an electron carrier molecule that provides reducing power for biosynthetic reactions in the Calvin cycle.

Thylakoid: A membrane-bound compartment inside chloroplasts arranged in stacks called grana, where the light-dependent reactions of photosynthesis occur.

Stroma: The fluid-filled space surrounding the thylakoids in a chloroplast, where the Calvin cycle takes place and where glucose is ultimately synthesized.
```

### Constraints

1. **Input Size Limit**: Maximum 50,000 characters of raw notes
2. **Token Limits**: 
   - Input: ~12,500 tokens (50k chars ÷ 4)
   - Output: ~3,000 tokens max (~12k chars)
3. **Timeout**: 30 seconds max for Gemini API call
4. **Format**: Plain text only, no markdown syntax

### Error Handling

If input exceeds 50k characters:
- Truncate to last 50k characters
- Add warning in response metadata
- Set truncated flag to true

If Gemini API fails:
- Log error with full details
- Return basic cleaned version (remove duplicates, add line breaks)
- Set status to indicate partial success
- Notify user that auto-formatting was applied

### Quality Guidelines

**Good structured notes include:**
- ✅ Clear, descriptive title based on lecture content
- ✅ Comprehensive Key Takeaways paragraph
- ✅ 2-5 Core Concepts with all required subsections
- ✅ Plain text formatting (no markdown)
- ✅ Key terms clearly defined
- ✅ Examples when provided in source material
- ✅ Common mistakes when mentioned in lecture

**Avoid:**
- ❌ Adding information not in raw notes
- ❌ Removing important details or definitions
- ❌ Using markdown syntax (*, **, #, etc.)
- ❌ Skipping required subsections in Core Concepts
- ❌ Making Key Takeaways a bullet list (must be paragraph)
- ❌ Including sections with no content

---

**Model:** gemini-1.5-flash (fast, cost-effective for notes)  
**Temperature:** 0.3 (more deterministic, less creative)  
**Max Output Tokens:** 3072  
**Input Limit:** 50,000 characters  
**Format:** Plain text (no markdown)
