import os
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.nodes import researcher_node, writer_node, supervisor_node
from dotenv import load_dotenv

load_dotenv(dotenv_path="../atlas-credentials.env")
load_dotenv()

def create_graph(checkpointer=None):
    workflow = StateGraph(AgentState)

    workflow.add_node("Researcher", researcher_node)
    workflow.add_node("Writer", writer_node)
    workflow.add_node("Supervisor", supervisor_node)

    workflow.add_conditional_edges(
        "Supervisor",
        lambda x: x["next"],
        {
            "Researcher": "Researcher",
            "Writer": "Writer",
            "FINISH": END
        }
    )

    workflow.add_edge("Researcher", "Supervisor")
    workflow.add_edge("Writer", "Supervisor")
    workflow.set_entry_point("Supervisor")

    return workflow.compile(checkpointer=checkpointer)

graph = create_graph()
