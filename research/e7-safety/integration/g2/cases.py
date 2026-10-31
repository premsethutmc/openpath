"""Boundary matrix for the legacy number grammar (G2): every (type, stored answer, response) pair, graded by the app and by the server."""
import json
d = lambda n: "1" + "0" * (n - 1)          # an n-digit number
z = lambda n: "0" * (n - 1) + "5"          # 5 written with n digits (leading zeros)
responses = ["5", "-5", "+5", "−5", "5.0", "5.5", "5.", ".5", "05", z(9), z(10), z(30), z(31), "5." + "0" * 9, "5." + "0" * 10, "5." + "0" * 30, "5." + "0" * 31,
             d(9), d(10), d(29), d(30), d(31), "-" + d(30), "-" + d(31), "1/2", "2/4", "-1/2", "1/-2", "1/0", "0/5", "1 1/2", "-1 1/2", "1e3", "0x10", "５", "5 5", "--5", "5-", "", " ", "abc", "5/", "/5",
             "0.5", "0." + "5" * 30, "0." + "5" * 31, d(30) + "/2", d(31) + "/2", "1/" + d(30), "1/" + d(31), d(30) + " 1/2", "1, 2", "{1, 2}", "1,2,2", ",".join(["1"] * 31)]
stored = {"integer": ["5", "-5", d(9), d(10), d(30), "0"], "fraction": ["1/2", "5", "-1/2", d(30) + "/2", "5/1"], "set": ["1,2", "5", "1/2"]}
cases = [{"type": t, "stored": s, "response": r} for t, ss in stored.items() for s in ss for r in responses]
json.dump(cases, open("cases.json", "w"))
print(len(cases))
