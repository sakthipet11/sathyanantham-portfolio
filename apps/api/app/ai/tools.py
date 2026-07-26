import json
from typing import Dict, Any, List

RECORD_USER_DETAILS_TOOL = {
    "type": "function",
    "function": {
        "name": "record_user_details",
        "description": "Record visitor contact information (email, name, notes) when they express interest in connecting, hiring, or collaborating with Sathyanantham.",
        "parameters": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "Visitor's email address"},
                "name": {"type": "string", "description": "Visitor's name if provided"},
                "notes": {"type": "string", "description": "Additional context, project inquiry details, or message"}
            },
            "required": ["email"]
        }
    }
}

RECORD_UNKNOWN_QUESTION_TOOL = {
    "type": "function",
    "function": {
        "name": "record_unknown_question",
        "description": "Record any question that could not be answered using the available career context so Sathyanantham can review and answer later.",
        "parameters": {
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "The exact question asked by the visitor"}
            },
            "required": ["question"]
        }
    }
}

REQUEST_HUMAN_HANDOFF_TOOL = {
    "type": "function",
    "function": {
        "name": "request_human_handoff",
        "description": "Request live handoff to transfer the chat session directly to Sathyanantham V in real-time.",
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "Reason for live human handoff request"}
            },
            "required": []
        }
    }
}

ALL_TOOLS = [RECORD_USER_DETAILS_TOOL, RECORD_UNKNOWN_QUESTION_TOOL, REQUEST_HUMAN_HANDOFF_TOOL]

# In-memory storage for recorded leads and unknown questions
recorded_leads = []
recorded_unknown_questions = []
handoff_requests = []

def execute_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if tool_name == "record_user_details":
        email = arguments.get("email")
        name = arguments.get("name", "Visitor")
        notes = arguments.get("notes", "No notes provided")
        lead = {"email": email, "name": name, "notes": notes}
        recorded_leads.append(lead)
        return {
            "status": "success",
            "message": f"Successfully recorded contact details for {name} ({email}). Sathyanantham will get in touch shortly!",
            "data": lead
        }
    elif tool_name == "record_unknown_question":
        question = arguments.get("question", "")
        recorded_unknown_questions.append(question)
        return {
            "status": "success",
            "message": f"Recorded question for Sathyanantham's review: '{question}'",
            "question": question
        }
    elif tool_name == "request_human_handoff":
        reason = arguments.get("reason", "Visitor requested live chat")
        handoff_requests.append(reason)
        return {
            "status": "handoff_initiated",
            "message": "Live handoff request sent to Sathyanantham V. Checking online status...",
            "reason": reason
        }
    else:
        return {"status": "error", "message": f"Unknown tool name: {tool_name}"}
