# Intervu-AI

Intervu-AI is an AI-powered interview assistant that generates personalized interview questions and feedback based on a candidate's resume. It uses advanced language models to simulate real interview scenarios and provide insightful evaluations.

## Features

- Upload a candidate's resume (PDF)
- Automatically extract context and generate interview questions
- Interactive interview session with real-time feedback
- Final evaluation and rating based on responses

## Project Structure

- `backend/`: Python Flask API for document processing and AI logic
- `frontend/`: Next.js web interface for user interaction

## Getting Started

### Backend

1. Install dependencies:
    ```sh
    cd backend
    pip install -r requirements.txt
    ```
2. Add your Google Gemini API key to `.env`:
    ```
    GEMINI_API_KEY="your_api_key_here"
    ```
3. Run the server:
    ```sh
    python [interviewer.py](http://_vscodecontentref_/0)
    ```

### Frontend

1. Install dependencies:
    ```sh
    cd frontend
    npm install
    ```
2. Start the development server:
    ```sh
    npm run dev
    ```

## Usage

1. Open the frontend in your browser (`http://localhost:3000`)
2. Upload a resume PDF
3. Start the interview and interact with the AI

## License

MIT

## Acknowledgements

- [LangChain](https://github.com/langchain-ai/langchain)
- [Google Gemini](https://ai.google.dev/)
- [Sentence Transformers](https://www.sbert.net/)