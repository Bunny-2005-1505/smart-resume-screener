# Smart Resume Screener

An AI-powered resume screening system that intelligently parses resumes, extracts skills, and matches them with job descriptions.

## Features

- Resume Parsing: Extract text from PDF and TXT resumes
- Skill Extraction: Automatically identify technical skills from resumes
- AI-Powered Matching: Pluggable LLM provider (OpenAI GPT, local Ollama, or offline mock scoring) to provide semantic matching scores (1-10)
- Comprehensive Analysis: Skills match, experience match, education match
- Candidate Shortlisting: View and manage processed candidates
- Dashboard: Interactive UI for uploading and viewing results

## Tech Stack

- Backend: Node.js, Express.js
- Frontend: HTML, CSS, JavaScript
- AI/ML: OpenAI GPT-3.5 Turbo
- Database: MongoDB (optional)
- File Processing: pdf-parse, multer

## LLM Provider Options

This app supports three interchangeable scoring backends, set via `LLM_PROVIDER` in `.env`:

| `LLM_PROVIDER` | Requires | Notes |
|---|---|---|
| `mock` (default) | Nothing | Rule-based scoring, works fully offline |
| `openai` | `OPENAI_API_KEY` + billing on your OpenAI account | Real GPT-3.5 Turbo scoring |
| `ollama` | [Ollama](https://ollama.com) installed locally | Real local LLM scoring, no API key, no cost |

To use Ollama:
1. Install Ollama from https://ollama.com
2. Run `ollama pull llama3` (downloads the model once)
3. Ollama runs automatically on `http://localhost:11434`
4. In `.env`, set `LLM_PROVIDER=ollama`
5. Start the backend as usual (`npm start`) — it will call your local model instead of OpenAI

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (optional - mock scoring works without it)
- MongoDB (optional - works without it)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/smart-resume-screener.git
cd smart-resume-screener