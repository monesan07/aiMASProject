import os
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.nodes import researcher_node, writer_node, supervisor_node

def create_graph():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("Researcher", researcher_node)
    workflow.add_node("Writer", writer_node)
    workflow.add_node("Supervisor", supervisor_node)

    # Add edges
    # The supervisor decides where to go next
    workflow.add_conditional_edges(
        "Supervisor",
        lambda x: x["next"],
        {
            "Researcher": "Researcher",
            "Writer": "Writer",
            "FINISH": END
        }
    )

    # Workers always report back to the supervisor
    workflow.add_edge("Researcher", "Supervisor")
    workflow.add_edge("Writer", "Supervisor")

    # Set entry point
    workflow.set_entry_point("Supervisor")

    return workflow.compile()

graph = create_graph()
