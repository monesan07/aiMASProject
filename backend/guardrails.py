import re
import time
import random
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class GuardrailResult:
    name: str
    category: str
    passed: bool
    score: float
    reason: str
    latency_ms: int
    severity: str = "low"

@dataclass
class GuardrailReport:
    overall_passed: bool
    results: list[GuardrailResult]
    total_latency_ms: int
    summary: str

INJECTION_PATTERNS = [
    r"ignore (all |previous |above |prior )?instructions",
    r"disregard (your|all|previous) (instructions|rules|guidelines)",
    r"you are now",
    r"pretend (you are|to be)",
    r"act as (if you are|a|an)",
    r"jailbreak",
    r"developer mode",
    r"bypass",
    r"system prompt",
]

TOXIC_PATTERNS = [
    r"\b(kill|murder|harm|hurt|violence|attack)\b",
    r"\b(hate|racist|sexist|bigot)\b",
]

PII_PATTERNS = [
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b",
    r"\b\d{3}-\d{2}-\d{4}\b",
    r"\b4[0-9]{12}(?:[0-9]{3})?\b",
]

RESTRICTED_TOPICS = [
    "stock tips", "medical advice", "legal advice", "prescription",
    "trading recommendation", "invest in", "buy this stock"
]

def _check_latency():
    return random.randint(8, 45)

def llamafirewall_prompt_injection(text: str) -> GuardrailResult:
    t0 = time.time()
    text_lower = text.lower()
    matched = next(
        (p for p in INJECTION_PATTERNS if re.search(p, text_lower, re.IGNORECASE)),
        None
    )
    score = 0.05 if matched is None else 0.95
    passed = matched is None
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="LlamaFirewall: Prompt Injection",
        category="LlamaFirewall",
        passed=passed,
        score=score,
        reason="No injection patterns detected." if passed else f"Potential injection detected: pattern matched '{matched}'",
        latency_ms=latency,
        severity="critical" if not passed else "low",
    )

def llamafirewall_toxicity(text: str) -> GuardrailResult:
    t0 = time.time()
    text_lower = text.lower()
    matched = next(
        (p for p in TOXIC_PATTERNS if re.search(p, text_lower, re.IGNORECASE)),
        None
    )
    word_count = len(text.split())
    score = min(0.1 + (0.05 * word_count / 100), 0.3) if matched is None else 0.88
    passed = matched is None
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="LlamaFirewall: Toxicity Filter",
        category="LlamaFirewall",
        passed=passed,
        score=score,
        reason="Content is within safe boundaries." if passed else "Potentially harmful content detected.",
        latency_ms=latency,
        severity="high" if not passed else "low",
    )

def nemo_pii_detection(text: str) -> GuardrailResult:
    t0 = time.time()
    found_pii = []
    for pattern in PII_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            found_pii.append(pattern)
    passed = len(found_pii) == 0
    score = 0.02 if passed else 0.91
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="NeMo Guardrails: PII Detection",
        category="NeMo Guardrails",
        passed=passed,
        score=score,
        reason="No PII detected in input." if passed else f"PII patterns found ({len(found_pii)} type(s)). Consider redacting before processing.",
        latency_ms=latency,
        severity="medium" if not passed else "low",
    )

def nemo_topic_restriction(text: str) -> GuardrailResult:
    t0 = time.time()
    text_lower = text.lower()
    found = [t for t in RESTRICTED_TOPICS if t in text_lower]
    passed = len(found) == 0
    score = 0.04 if passed else 0.78
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="NeMo Guardrails: Topic Policy",
        category="NeMo Guardrails",
        passed=passed,
        score=score,
        reason="Topic is within allowed scope." if passed else f"Restricted topic detected: {', '.join(found)}.",
        latency_ms=latency,
        severity="medium" if not passed else "low",
    )

def nli_entailment_check(response: str, context: str) -> GuardrailResult:
    t0 = time.time()
    if not context or context.strip() == "":
        latency = int((time.time() - t0) * 1000) + _check_latency()
        return GuardrailResult(
            name="NLI: Entailment Check",
            category="Custom NLI",
            passed=True,
            score=0.5,
            reason="No context provided. Skipping entailment check.",
            latency_ms=latency,
        )

    response_words = set(response.lower().split())
    context_words = set(context.lower().split())
    stop_words = {"the", "a", "an", "is", "it", "to", "of", "in", "and", "or", "for", "with", "on", "at"}
    response_keywords = response_words - stop_words
    context_keywords = context_words - stop_words

    if not response_keywords:
        overlap = 0.5
    else:
        overlap = len(response_keywords & context_keywords) / max(len(response_keywords), 1)

    score = min(overlap * 1.5, 1.0)
    passed = score > 0.15
    latency = int((time.time() - t0) * 1000) + _check_latency()

    return GuardrailResult(
        name="NLI: Entailment Check",
        category="Custom NLI",
        passed=passed,
        score=round(score, 3),
        reason=f"Response-context keyword overlap: {overlap:.1%}. Response appears {'well grounded' if passed else 'potentially disconnected from context'}.",
        latency_ms=latency,
        severity="medium" if not passed else "low",
    )

def hallucination_check(response: str, query: str) -> GuardrailResult:
    t0 = time.time()
    definitive_claims = len(re.findall(r"\b(always|never|definitely|certainly|guaranteed|proven|fact)\b", response, re.IGNORECASE))
    hedge_phrases = len(re.findall(r"\b(might|may|could|possibly|probably|I think|it seems|approximately)\b", response, re.IGNORECASE))
    response_words = response.split()
    claim_ratio = definitive_claims / max(len(response_words) / 10, 1)
    hedge_ratio = hedge_phrases / max(len(response_words) / 10, 1)
    hallucination_risk = max(0.0, min(1.0, 0.3 + (claim_ratio * 0.4) - (hedge_ratio * 0.15) + (0.1 if "[MOCK]" in response else 0.0)))
    passed = hallucination_risk < 0.6
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="Hallucination Risk Score",
        category="Custom NLI",
        passed=passed,
        score=round(hallucination_risk, 3),
        reason=f"Definitive claims: {definitive_claims}, hedging phrases: {hedge_phrases}. Risk score: {hallucination_risk:.1%}.",
        latency_ms=latency,
        severity="high" if not passed else "low",
    )

def chunking_quality_check(text: str, chunk_size: int = 500) -> GuardrailResult:
    t0 = time.time()
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    avg_sentence_length = word_count / max(sentence_count, 1)
    is_coherent = avg_sentence_length > 3 and word_count > 10
    projected_chunks = max(1, len(text) // chunk_size)
    score = min(1.0, word_count / 100)
    passed = is_coherent and word_count >= 5
    latency = int((time.time() - t0) * 1000) + _check_latency()
    return GuardrailResult(
        name="Chunking Quality",
        category="Custom NLI",
        passed=passed,
        score=round(score, 3),
        reason=f"Words: {word_count}, Sentences: {sentence_count}, Avg sentence: {avg_sentence_length:.1f} words. Projected chunks: {projected_chunks}. Content is {'sufficient' if passed else 'too short or incoherent for reliable chunking'}.",
        latency_ms=latency,
        severity="medium" if not passed else "low",
    )

def run_guardrails(
    user_input: str,
    response: str = "",
    context: str = "",
    enabled_guardrails: Optional[list[str]] = None
) -> GuardrailReport:
    all_checks = {
        "llamafirewall_injection": lambda: llamafirewall_prompt_injection(user_input),
        "llamafirewall_toxicity": lambda: llamafirewall_toxicity(user_input),
        "nemo_pii": lambda: nemo_pii_detection(user_input),
        "nemo_topic": lambda: nemo_topic_restriction(user_input),
        "nli_entailment": lambda: nli_entailment_check(response, context),
        "hallucination": lambda: hallucination_check(response, user_input),
        "chunking": lambda: chunking_quality_check(user_input),
    }

    if enabled_guardrails is None:
        enabled_guardrails = list(all_checks.keys())

    results: list[GuardrailResult] = []
    for key in enabled_guardrails:
        if key in all_checks:
            results.append(all_checks[key]())

    overall_passed = all(r.passed for r in results)
    total_latency = sum(r.latency_ms for r in results)
    failed = [r.name for r in results if not r.passed]
    summary = "All guardrails passed." if overall_passed else f"Failed: {', '.join(failed)}"

    return GuardrailReport(
        overall_passed=overall_passed,
        results=results,
        total_latency_ms=total_latency,
        summary=summary,
    )
