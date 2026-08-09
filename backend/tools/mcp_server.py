# Mock implementation of an MCP (Model Context Protocol) server
# In a real setup, this would run as a separate process or service 
# and expose resources and tools via JSON-RPC.

from typing import List, Dict, Any

class MockMCPServer:
    def __init__(self):
        self.tools = {
            "search_vector_db": {
                "description": "Searches the Pinecone database for context.",
                "parameters": {
                    "query": "string"
                }
            },
            "web_search": {
                "description": "Searches the web for recent information.",
                "parameters": {
                    "query": "string"
                }
            }
        }
        
    def list_tools(self) -> Dict[str, Any]:
        return self.tools
        
    def call_tool(self, name: str, arguments: Dict[str, Any]) -> str:
        if name == "search_vector_db":
            return f"Found relevant information for '{arguments.get('query')}' in vector DB."
        elif name == "web_search":
            return f"Web search results for '{arguments.get('query')}'."
        else:
            return "Tool not found."

# Singleton instance
mcp_server = MockMCPServer()
