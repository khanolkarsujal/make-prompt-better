from fastapi import APIRouter

router = APIRouter()

BUILT_IN_TEMPLATES = [
    {
        "id": "dashboard",
        "name": "Dashboard",
        "icon": "📊",
        "prompt": "make dashboard",
        "description": "Admin or analytics dashboard with charts and KPIs",
        "category": "web"
    },
    {
        "id": "auth",
        "name": "Auth System",
        "icon": "🔐",
        "prompt": "create login and signup system with JWT auth",
        "description": "Full authentication flow with login, signup, and JWT",
        "category": "backend"
    },
    {
        "id": "landing",
        "name": "Landing Page",
        "icon": "🚀",
        "prompt": "create a modern SaaS landing page",
        "description": "Hero, features, pricing, CTA sections",
        "category": "web"
    },
    {
        "id": "api",
        "name": "REST API",
        "icon": "⚡",
        "prompt": "build a REST API with CRUD operations",
        "description": "Full CRUD REST API with validation and error handling",
        "category": "backend"
    },
    {
        "id": "crud-table",
        "name": "Data Table",
        "icon": "📋",
        "prompt": "create a data table with sorting filtering and pagination",
        "description": "Interactive table with full data management features",
        "category": "web"
    },
    {
        "id": "chatbot",
        "name": "Chat Interface",
        "icon": "💬",
        "prompt": "build a chat interface with message bubbles and real-time updates",
        "description": "Modern chat UI with streaming support",
        "category": "ai"
    },
    {
        "id": "ecommerce",
        "name": "Product Page",
        "icon": "🛒",
        "prompt": "create an ecommerce product listing page with cart",
        "description": "Product cards, filters, cart sidebar",
        "category": "web"
    },
    {
        "id": "settings",
        "name": "Settings Page",
        "icon": "⚙️",
        "prompt": "create a user settings and profile page",
        "description": "Profile, preferences, notifications, security tabs",
        "category": "web"
    }
]

@router.get("/templates")
async def get_templates():
    """Return all built-in prompt templates"""
    return {"templates": BUILT_IN_TEMPLATES}
