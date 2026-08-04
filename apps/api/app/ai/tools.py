import json
import asyncio
from typing import Dict, Any, List
from app.database.supabase_client import db_helper
from app.services.notifications import notify_admin_contact, notify_handoff_requested, send_pushover_notification

RECORD_USER_DETAILS_TOOL = {
    "type": "function",
    "function": {
        "name": "record_user_details",
        "description": "Record visitor contact information (name, email, phone, purpose, notes) when they express interest in connecting, hiring, or collaborating with Sathyanantham.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Visitor's name"},
                "email": {"type": "string", "description": "Visitor's email address"},
                "phone": {"type": "string", "description": "Visitor's phone number if provided"},
                "purpose": {"type": "string", "description": "Purpose of connection (e.g., hiring, project collaboration, general inquiry)"},
                "notes": {"type": "string", "description": "Additional context, project inquiry details, or message"}
            },
            "required": ["name", "email", "purpose"]
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

def execute_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    if tool_name == "record_user_details":
        email = arguments.get("email")
        name = arguments.get("name", "Visitor")
        phone = arguments.get("phone", "")
        purpose = arguments.get("purpose", "")
        notes = arguments.get("notes", "No notes provided")
        
        # Save to database
        db_helper.insert_contact(
            name=name, 
            email=email, 
            message=f"Phone: {phone}\nMessage: {notes}" if phone else notes, 
            purpose=purpose
        )
        
        # Notify admin via email & push
        asyncio.create_task(notify_admin_contact(
            name=name, 
            email=email, 
            message=f"Phone: {phone}\nMessage: {notes}" if phone else notes, 
            purpose=purpose
        ))
        
        return {
            "status": "success",
            "message": f"Successfully recorded contact details for {name} ({email}). Sathyanantham V has been notified!",
            "data": {"email": email, "name": name, "phone": phone, "purpose": purpose, "notes": notes}
        }
        
    elif tool_name == "record_unknown_question":
        question = arguments.get("question", "")
        
        # Save to database event logs
        db_helper.insert_visitor_event(
            session_id="ai_fallback",
            event_type="unknown_question",
            details={"question": question}
        )
        
        # Log locally to console
        print(f"Visitor asked a question the AI couldn't answer: '{question}' (Notification skipped).")
        
        return {
            "status": "success",
            "message": f"Recorded question for Sathyanantham's review: '{question}'",
            "question": question
        }
        
    elif tool_name == "request_human_handoff":
        reason = arguments.get("reason", "Visitor requested live chat")
        
        # Dispatch handoff pings
        asyncio.create_task(notify_handoff_requested("active_chat_session", reason))
        
        return {
            "status": "handoff_initiated",
            "message": "Live handoff request sent to Sathyanantham V. Checking online status...",
            "reason": reason
        }
        
    else:
        return {"status": "error", "message": f"Unknown tool name: {tool_name}"}
