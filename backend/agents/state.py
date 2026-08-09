import operator
from typing import Annotated, Optional, Sequence, TypedDict
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str
    sender: str
    model_provider: Optional[str]
    model_id: Optional[str]
