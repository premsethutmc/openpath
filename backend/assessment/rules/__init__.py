"""Assessment rules, one module per task type.

A task type describes what the learner is asked to do, independently of the
subject or the artwork around it. New activities (science, language) register
their own task types here and reuse everything downstream.
"""

from . import produce_set

RULES = {
    produce_set.TASK_TYPE: produce_set,
}
