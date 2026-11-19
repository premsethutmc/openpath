"""Send six made-up pieces of writing through the live writing-feedback path and print what came back.

Run once on the server after switching writing feedback on, to measure the real cost per piece and read the feedback:
    OPENPATH_WRITING_FEEDBACK_SELFTEST=1 (deploy/pilot/start.sh runs this, then the setting is turned off again)

Synthetic writing only: no learner's writing is used. It goes through the same gateway as the app (same prompt, model,
limits and site ceiling), under a reserved test account number, so no family's weekly pieces are used. The output is
the feedback and the token counts; nothing is stored apart from the gateway's daily request count.
"""

import time

from django.core.management.base import BaseCommand

from evaluation import gateway, llm
from family import writing_feedback as wf

# a reserved number for the gateway's per-account daily count; no account has it
TEST_ACCOUNT = 900_000_001

PIECES = [
    ("c1.rw8.w1", "good, short", "This is my family. My mother is tall and my father is kind. I have one brother. We play in the park after school."),
    ("c3.rw6.w1", "letter with greeting and closing",
     "Dear Grandmother,\n\nI hope you are well. This week was busy at school. On Monday we planted beans in small pots, and mine has already grown two leaves. On Wednesday our class went to the library and I borrowed a book about elephants. My friend Kavi and I read it together at lunch. On Saturday it rained all day, so I helped Amma make sweets in the kitchen. I miss you and your stories. Please come and stay with us in the holidays.\n\nWith love,\nAnu"),
    ("c3.rw6.w1", "letter with no greeting or closing, little about the week",
     "I am fine. School is fine. The weather is hot. We have a test next week. I do not like tests. My brother is fine. Our dog is fine. I watched television on Sunday. It was a long programme about cars. I like red cars the most. Red cars are fast. I want a red car when I am big. My father says I must study first. I think that is true. Mother says hello. The mango tree has many mangoes this year. That is all the news I have for now."),
    ("c4.rw7.w1", "story with a clear order and feelings",
     "Ravi swung his bag as he walked home from school. When he reached the gate, he put his hand in his pocket. The key was gone! His heart started to beat fast. He emptied his bag on the step, but there were only books and a squashed banana. Then he remembered stopping at the shop to buy a pencil. He ran back down the road, looking at the ground the whole way. The shopkeeper smiled and held up a small silver key. \"Is this yours?\" she asked. Ravi felt his whole body relax. He thanked her twice and walked home slowly, holding the key tightly in his fist. That evening he tied it to a long red string so it could never fall out again."),
    ("c6.w2.w1", "argument with a view but no reasons",
     "Homework is a big topic in schools. Some people like homework and some people do not like homework. Teachers give homework on many days. Parents check homework at night. Some pupils do homework quickly and some pupils take a long time. In my class we get homework in maths and English. Sometimes we also get science homework. Homework is written in a diary. The diary is signed by a parent. In other countries homework may be different. Some schools give homework on weekends too. Homework can be on paper or on a computer. At the end of the day homework is part of school life. I think homework should be every day. That is my view on this question and many people will agree with me when they think about it carefully. Homework will always be there in schools, whether we like it or not, and pupils must learn to live with it every single day of the year."),
    ("c5.rw7.w1", "off the topic",
     "Cricket is the best game in the world. I play cricket every evening with my friends in the street. My favourite player is a fast bowler who can bowl very quickly. Last week we played a match against the boys from the next street. We batted first and made sixty runs in ten overs. I hit two fours and one six. Then they batted and they were all out for forty. We were very happy and we shouted a lot.\n\nNext month there is a tournament at our school. I want to be the captain of our team. I practise bowling every morning before school. My father bought me a new bat for my birthday. It is made of willow and it is very light. I keep it in a cover so that it does not get wet. I hope we win the tournament and get a big cup."),
]


class Command(BaseCommand):
    help = "Send six synthetic pieces through writing feedback and print the feedback and token counts."

    def handle(self, *args, **opts):
        why = wf.enabled()
        if why:
            self.stdout.write(f"writing-feedback selftest: not run ({why})")
            return
        config = wf._config()
        self.stdout.write(f"writing-feedback selftest: provider={config.provider} model={config.model} pieces={len(PIECES)}")
        total_in = total_out = ok = 0
        for task_id, kind, text in PIECES:
            started = time.monotonic()
            try:
                done = gateway.execute("writing.feedback", {"task": task_id, "text": text, "checked": []}, TEST_ACCOUNT, transport=llm.urllib_transport)
            except gateway.GatewayDenied as e:
                self.stdout.write(f"  {task_id} [{kind}]: refused by the gateway ({e})")
                continue
            except llm.LLMError as e:
                self.stdout.write(f"  {task_id} [{kind}]: provider error ({str(e)[:160]})")
                continue
            ms = int((time.monotonic() - started) * 1000)
            total_in += done.input_tokens
            total_out += done.output_tokens
            try:
                result = wf.parse(done.text, len(wf.tasks()[task_id]["look"]))
            except wf.Unusable as e:
                self.stdout.write(f"  {task_id} [{kind}]: reply not usable ({e}); tokens {done.input_tokens}/{done.output_tokens}")
                continue
            ok += 1
            looks = wf.tasks()[task_id]["look"]
            self.stdout.write(f"  {task_id} [{kind}]: tokens in {done.input_tokens} out {done.output_tokens}, {ms} ms")
            for look, p in zip(looks, result["points"]):
                self.stdout.write(f"    {p['met']:>6} | {look}: {p['note']}")
            self.stdout.write(f"    strength: {result['strength']}")
            self.stdout.write(f"    next: {result['next']}")
        self.stdout.write(f"writing-feedback selftest: {ok} of {len(PIECES)} usable; tokens in {total_in} out {total_out}")
