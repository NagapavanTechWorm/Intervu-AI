# Cell 1: Import libraries
import os
import getpass
from dotenv import load_dotenv
import bs4
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from langchain.chat_models import init_chat_model
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict


# Cell 2: Load Google API key from .env
load_dotenv()  # Load environment variables from .env file
# Use GEMINI_API_KEY from .env if GOOGLE_API_KEY is missing
if not os.environ.get("GOOGLE_API_KEY"):
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key
    else:
        print("Error: GOOGLE_API_KEY not found in .env file.")
        os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter API key for Google Gemini: ")  # Fallback to manual input

    # Cell 3: Initialize LLM and embeddings
llm = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

vector_store = None
all_splits = None
docs = None

# Flask server setup
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)
app.config['UPLOAD_FOLDER'] = 'uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
# Prompts and state
question_prompt = """You are an Interview AI. Based on the provided context from a document, generate a single, relevant, open-ended interview question. The question should be clear, professional, and encourage detailed responses. Avoid repeating questions already asked. Context: {context}"""
feedback_prompt = """You are an Interview AI. Based on the user's response and the context, provide brief feedback (1-2 sentences) on the response's relevance and quality, and suggest a follow-up question if appropriate. Context: {context} Response: {response} Feedback:"""
rating_prompt = """You are an expert interviewer. Based on the following interview questions and the candidate's responses, provide a concise rating out of 10 (e.g., 'Rating: 8/10') and a brief summary (1-2 sentences) of their performance. Context: {context} Questions and Responses: {answers_summary} Rating (out of 10):"""
final_feedback_prompt = """You are an expert interviewer. Based on the following interview questions and the candidate's responses, provide a concise rating out of 10 (e.g., 'Rating: 8/10') and a brief summary (1-2 sentences) of their performance. Context: {context} Questions and Responses: {answers_summary} Feedback:"""
class State(TypedDict):
    context: List[Document]
    question: str
    response: str
    feedback: str
    past_questions: List[str]

def retrieve_context(state: State):
    global vector_store
    if vector_store is None:
        print("[DEBUG] retrieve_context: vector_store is None")
        return {"context": []}
    retrieved_docs = vector_store.similarity_search(state.get("question", ""), k=4)
    print(f"[DEBUG] retrieve_context: Retrieved {len(retrieved_docs)} docs for question '{state.get('question', '')}'")
    return {"context": retrieved_docs}

def generate_question(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    formatted_prompt = question_prompt.format(context=docs_content)
    past_questions = state.get("past_questions", [])
    max_retries = 5
    for _ in range(max_retries):
        try:
            response = llm.invoke(formatted_prompt)
            new_question = response.content.strip()
            # Check for uniqueness
            if new_question not in past_questions:
                past_questions = past_questions + [new_question]
                return {"question": new_question, "past_questions": past_questions}
        except Exception as e:
            print(f"Error generating question: {str(e)}")
            break
    # If all retries fail or only duplicates are generated, return last question
    return {"question": "No new unique question found.", "past_questions": past_questions}

def generate_feedback(state: State):
    if state["response"].lower() == "exit":
        return {"feedback": ""}
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    formatted_prompt = feedback_prompt.format(context=docs_content, response=state["response"])
    try:
        response = llm.invoke(formatted_prompt)
        return {"feedback": response.content.strip()}
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        return {"feedback": "Feedback generation failed."}

# Flask endpoints
@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    global vector_store, all_splits, docs
    print("[DEBUG] upload_pdf: Called")
    if 'pdf' not in request.files:
        print("[DEBUG] upload_pdf: No PDF file part in request")
        return jsonify({'error': 'No PDF file part'}), 400
    file = request.files['pdf']
    if file.filename == '':
        print("[DEBUG] upload_pdf: No selected file")
        return jsonify({'error': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    print(f"[DEBUG] upload_pdf: Saved file to {filepath}")
    # Load and process PDF
    loader = PyPDFLoader(filepath)
    docs = loader.load()
    print(f"[DEBUG] upload_pdf: Loaded {len(docs)} pages from PDF")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    all_splits = text_splitter.split_documents(docs)
    print(f"[DEBUG] upload_pdf: Split into {len(all_splits)} chunks")
    vector_store = FAISS.from_documents(all_splits, embeddings)
    print("[DEBUG] upload_pdf: Vector store created")
    # Start interview: get first question
    # Extract candidate name from PDF (first page or pattern)
    candidate_name = "Candidate"
    if docs and hasattr(docs[0], 'page_content'):
        import re
        first_page = docs[0].page_content
        # Try to find a name pattern (e.g., Name: John Doe)
        match = re.search(r'Name[:\s]+([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)*)', first_page)
        if match:
            candidate_name = match.group(1)
            print(f"[DEBUG] upload_pdf: Candidate name found by pattern: {candidate_name}")
        else:
            # Fallback: use first line as name if it looks like a name
            first_line = first_page.split('\n')[0]
            if len(first_line.split()) <= 4 and all(x[0].isupper() for x in first_line.split() if x):
                candidate_name = first_line.strip()
                print(f"[DEBUG] upload_pdf: Candidate name found by first line: {candidate_name}")
    # First question is greeting, expect reply 'start' to begin
    greeting = f"Hello {candidate_name}, welcome to your interview! Let's begin. Reply 'start' to begin."
    state = {'past_questions': [], 'question': greeting, 'response': '', 'feedback': '', 'context': [], 'question_count': 0}
    print(f"[DEBUG] upload_pdf: Greeting='{greeting}'")
    return jsonify({
        'message': 'PDF uploaded and processed successfully.',
        'first_question': greeting,
        'past_questions': [],
        'question_count': 0
    })

@app.route('/chat', methods=['POST'])
def chat():
    global vector_store
    print("[DEBUG] chat: Called")
    data = request.get_json()
    print(f"[DEBUG] chat: Received data={data}")
    question = data.get('question', '')
    past_questions = data.get('past_questions', [])
    user_response = data.get('response', '')
    past_responses = data.get('past_responses', [])
    question_count = data.get('question_count', 0 if user_response.lower() == 'start' else len(past_questions) + 1)
    print(f"[DEBUG] chat: question='{question}', past_questions={past_questions}, response='{user_response}', past_responses={past_responses}, question_count={question_count}")
    
    if vector_store is None:
        print("[DEBUG] chat: No PDF uploaded yet.")
        return jsonify({'error': 'No PDF uploaded yet.'}), 400
    
    state = {
        'past_questions': past_questions,
        'past_responses': past_responses,
        'question': question,
        'response': user_response,
        'feedback': '',
        'context': [],
        'question_count': question_count
    }
    
    # If first reply is not 'start', repeat greeting
    if question_count == 0:
        if user_response.strip().lower() != 'start':
            print("[DEBUG] chat: Waiting for user to reply 'start'")
            greeting = question if question else "Hello, welcome to your interview! Let's begin. Reply 'start' to begin."
            return jsonify({
                'question': greeting,
                'feedback': '',
                'past_questions': past_questions,
                'past_responses': past_responses,
                'question_count': 0
            })
        # User replied 'start', begin interview
        print("[DEBUG] chat: User replied 'start', beginning interview")
        state.update(retrieve_context(state))
        state.update(generate_question(state))
        return jsonify({
            'question': state['question'],
            'feedback': state['feedback'],
            'past_questions': state['past_questions'],
            'past_responses': past_responses,
            'question_count': 1
        })
    
    state.update(retrieve_context(state))
    
    # If user says 'stop', end interview
    if user_response.strip().lower() == 'stop':
        print("[DEBUG] chat: User requested to stop interview")
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        answers_summary = '\n'.join([f'Q{i+1}: {q}\nA{i+1}: {r}' for i, (q, r) in enumerate(zip(past_questions, past_responses))])
        print(f"[DEBUG] chat: Final feedback prompt='{final_feedback_prompt.format(context=docs_content, answers_summary=answers_summary)}'")
        try:
            response = llm.invoke(final_feedback_prompt.format(context=docs_content, answers_summary=answers_summary))
            feedback = response.content.strip() if response.content.strip() else "Unable to generate feedback due to empty response."
            print(f"[DEBUG] chat: Final feedback='{feedback}'")
            return jsonify({
                'question': 'Interview complete.',
                'feedback': feedback,
                'past_questions': past_questions,
                'past_responses': past_responses,
                'question_count': question_count
            })
        except Exception as e:
            print(f"[DEBUG] chat: Exception during final feedback: {e}")
            return jsonify({'error': f'Error during final feedback: {str(e)}'}), 500
    
    # If user says 'done', evaluate and rate
    if user_response.strip().lower() == 'done':
        print("[DEBUG] chat: User requested rating/evaluation")
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        answers_summary = '\n'.join([f'Q{i+1}: {q}\nA{i+1}: {r}' for i, (q, r) in enumerate(zip(past_questions, past_responses))])
        print(f"[DEBUG] chat: Rating prompt='{rating_prompt.format(context=docs_content, answers_summary=answers_summary)}'")
        print(f"[DEBUG] chat: Resume context='{docs_content}'")
        try:
            response = llm.invoke(rating_prompt.format(context=docs_content, answers_summary=answers_summary))
            rating = response.content.strip() if response.content.strip() else "Unable to generate rating due to empty response."
            print(f"[DEBUG] chat: Final rating='{rating}'")
            return jsonify({
                'question': 'Interview evaluation complete.',
                'feedback': rating,
                'past_questions': past_questions,
                'past_responses': past_responses,
                'question_count': question_count
            })
        except Exception as e:
            print(f"[DEBUG] chat: Exception during evaluation: {e}")
            return jsonify({'error': f'Error during evaluation: {str(e)}'}), 500
    
    # Interview logic: ask up to 3 questions, then give feedback
    if question_count > 3:
        print("[DEBUG] chat: Interview question count exceeded 3, providing final feedback")
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        answers_summary = '\n'.join([f'Q{i+1}: {q}\nA{i+1}: {r}' for i, (q, r) in enumerate(zip(past_questions, past_responses))])
        print(f"[DEBUG] chat: Final feedback prompt='{final_feedback_prompt.format(context=docs_content, answers_summary=answers_summary)}'")
        print(f"[DEBUG] chat: Resume context='{docs_content}'")
        try:
            response = llm.invoke(final_feedback_prompt.format(context=docs_content, answers_summary=answers_summary))
            feedback = response.content.strip() if response.content.strip() else "Unable to generate feedback due to empty response."
            print(f"[DEBUG] chat: Final feedback='{feedback}'")
            return jsonify({
                'question': 'Interview complete.',
                'feedback': feedback,
                'past_questions': past_questions,
                'past_responses': past_responses,
                'question_count': question_count
            })
        except Exception as e:
            print(f"[DEBUG] chat: Exception during final feedback: {e}")
            return jsonify({'error': f'Error during final feedback: {str(e)}'}), 500
    
    # Otherwise, continue interview
    print("[DEBUG] chat: Continuing interview, generating next question and feedback")
    state.update(generate_feedback(state))
    state['past_responses'] = past_responses + [user_response]
    state.update(generate_question(state))
    return jsonify({
        'question': state['question'],
        'feedback': state['feedback'],
        'past_questions': state['past_questions'],
        'past_responses': state['past_responses'],
        'question_count': question_count + 1
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)