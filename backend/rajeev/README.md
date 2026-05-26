# Rajeev Intelligence Layer
## Owner
Rajeev
## Overview
This module contains the Intelligence Orchestration Layer responsible for improving prompt understanding, ambiguity detection, context analysis, and intelligent prompt enhancement.

The goal of this subsystem is to improve the quality, clarity, and production-readiness of generated prompts while remaining modular and integration-safe.
---
## Features
### 1. Intent Classification
Detects:

- primary intent
- project domain
- confidence score
- complexity level

File:
```text
intent_classifier.py
```

---
### 2. Context Detection
Extracts:

- tech stack hints
- project type
- features
- missing context

File:
```text
context_detector.py
```

---
### 3. Ambiguity Detection
Identifies:

- vague requirements
- missing technical details
- architecture uncertainty
- UX/design ambiguity
- deployment uncertainty

Outputs:

- ambiguity score
- missing requirements
- clarification need
- risk level

File:
```text
ambiguity_detector.py
```

---
### 4. Suggestion Engine
Generates intelligent clarification questions based on:

- intent
- context
- ambiguity

File:
```text
suggestion_engine.py
```

---
### 5. Prompt Enhancement
Transforms vague prompts into:

- production-ready prompts
- structured requirements
- clearer architecture guidance

File:
```text
prompt_enhancer.py
```

---
### 6. Intelligence Orchestration
Central pipeline controller coordinating:

Prompt
→ Intent Analysis
→ Context Detection
→ Ambiguity Detection
→ Suggestion Generation
→ Prompt Enhancement

File:
```text
orchestration.py
```

---
## Notes
This subsystem is modular by design to reduce merge conflicts and improve maintainability.
Changes to orchestration logic may impact API behavior.
Entry points:
```text
orchestration.py
prompt_enhancer.py
```