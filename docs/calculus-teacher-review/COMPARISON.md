# Calculus teacher comparison

Compared with adaptive candidate 08a6d5aa97aee22fb8025940341334be5f43e120. All revised teaching remains pending educator review.

Review the selected strategy, not just the chapter. The browser evidence identifies which strategy the engine actually showed. Machine arithmetic checks and synthetic success do not demonstrate student understanding.

## MATH.calculus.derivatives#chapter

Revision: sha256:52576d45bdccd32d3a6fbabe0edfed5a782fef5da81b1a2f14d31f9823694c20
Status: pending_review

### Before

**The slope of the tangent**
f′(x) = lim (h → 0) [f(x + h) − f(x)] / h: the slope of the chord from x to x + h as the second point slides towards the first.
Simplify f(x + h) − f(x) until h is a factor of the top, cancel h, then let h → 0.
- f(x) = x² − 5x − 4
- f(x + h) = x² + 2xh + h² − 5x − 5h − 4
- f(x + h) − f(x) = 2xh + h² − 5h = h(2x + h − 5)
- Divide by h: 2x + h − 5; let h → 0: f′(x) = 2x − 5

**A fraction: one common denominator**
For a fraction, write f(x + h) − f(x) over one common denominator: the top becomes a multiple of h, which cancels.
- f(x) = 1/(x + 3)
- 1/(x + h + 3) − 1/(x + 3) = −h ⁄ [(x + h + 3)(x + 3)]
- Divide by h: −1 ⁄ [(x + h + 3)(x + 3)]
- Let h → 0: f′(x) = −1/(x + 3)²

**A square root: multiply by the sum of the roots**
For a square root, multiply top and bottom by the sum of the two roots. The top becomes (x + h + 2) − (x + 2) = h, which cancels.
- f(x) = √(x + 2)
- [√(x + h + 2) − √(x + 2)] × [√(x + h + 2) + √(x + 2)] = h
- So the chord slope is 1 ⁄ [√(x + h + 2) + √(x + 2)]
- Let h → 0: f′(x) = 1 ⁄ (2√(x + 2))

**Sine and cosine: the two special limits**
Expand with the compound-angle formula, then use the two limits (sin 2h)/h → 2 and (cos 2h − 1)/h → 0 as h → 0.
- sin(2x + 2h) − sin 2x = sin 2x (cos 2h − 1) + cos 2x sin 2h
- Divide by h: sin 2x × (cos 2h − 1)/h + cos 2x × (sin 2h)/h
- As h → 0: (cos 2h − 1)/h → 0 and (sin 2h)/h → 2
- f′(x) = 2cos 2x

**Instantaneous velocity from a distance–time formula**
Velocity is the instantaneous rate of change of distance: the slope of the distance–time graph at that moment, ds/dt.
Differentiate s term by term (d/dt tⁿ = n tⁿ⁻¹), then substitute the given time.
- A particle moves along a straight line so that its distance from a fixed point O after t seconds is s = t³ + 5t² + 3t metres. Find its instantaneous velocity, in m/s, at t = 2.
- v = ds/dt = 3t^2 + 10t + 3
- At t = 2: v = 35 m/s

### Revised student screens

**1. Why the square gives 2x**
First look at the x² part of our function. At x + h, the square means (x + h)(x + h). Multiply each term in the first bracket by each term in the second. The two cross terms are xh and hx; together they give 2xh.
Subtract the original x², then divide the change by h. For h ≠ 0 this is 2x + h. As h approaches zero, the slope approaches 2x. That is why the derivative of x² is 2x.
- (x + h)² = x² + xh + hx + h² = x² + 2xh + h²
- [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h (h ≠ 0)
- lim (h → 0) (2x + h) = 2x
Example: gen:aqfp:0,1,-5,-4

**2. Replace every x, then expand**
Now use the whole function f(x) = x² − 5x − 4. Replace every x by x + h, including the x in the linear term. The constant stays the same in f(x + h).
- f(x + h) = (x + h)² − 5(x + h) − 4
- f(x + h) = x² + 2xh + h² − 5x − 5h − 4
Example: gen:aqfp:0,1,-5,-4

**3. Subtract the whole original function**
The brackets matter: subtracting f(x) reverses the sign of every term in it. The x² terms, the original linear terms and the constants cancel. Only terms containing h remain.
- f(x + h) − f(x) = (x² + 2xh + h² − 5x − 5h − 4) − (x² − 5x − 4)
- = 2xh + h² − 5h
- = h(2x + h − 5)
Example: gen:aqfp:0,1,-5,-4

**4. Cancel first, then take the limit**
The chord slope is change in f divided by change in x, which is h. While h is non-zero, cancel the common factor h. Putting h = 0 into the original quotient would give 0/0, which is undefined.
Now take the limit of the simplified expression. The terms containing h tend to zero. This gives the tangent slope at x, not the height f(x). The constant cancelled; it contributes nothing to the derivative.
- [f(x + h) − f(x)]/h = h(2x + h − 5)/h = 2x + h − 5 (h ≠ 0)
- f′(x) = lim (h → 0) (2x + h − 5) = 2x − 5
Example: gen:aqfp:0,1,-5,-4

**5. A fraction: one common denominator**
For a fraction, write f(x + h) − f(x) over one common denominator: the top becomes a multiple of h, which cancels.
- f(x) = 1/(x + 3)
- 1/(x + h + 3) − 1/(x + 3) = −h ⁄ [(x + h + 3)(x + 3)]
- Divide by h: −1 ⁄ [(x + h + 3)(x + 3)]
- Let h → 0: f′(x) = −1/(x + 3)²
Example: gen:aqfp:1,1,3,0

**6. A square root: multiply by the sum of the roots**
For a square root, multiply top and bottom by the sum of the two roots. The top becomes (x + h + 2) − (x + 2) = h, which cancels.
- f(x) = √(x + 2)
- [√(x + h + 2) − √(x + 2)] × [√(x + h + 2) + √(x + 2)] = h
- So the chord slope is 1 ⁄ [√(x + h + 2) + √(x + 2)]
- Let h → 0: f′(x) = 1 ⁄ (2√(x + 2))
Example: gen:aqfp:2,1,2,0

**7. Sine and cosine: the two special limits**
Expand with the compound-angle formula, then use the two limits (sin 2h)/h → 2 and (cos 2h − 1)/h → 0 as h → 0. Angles must be measured in radians for these limits.
- sin(2x + 2h) − sin 2x = sin 2x (cos 2h − 1) + cos 2x sin 2h
- Divide by h: sin 2x × (cos 2h − 1)/h + cos 2x × (sin 2h)/h
- As h → 0: (cos 2h − 1)/h → 0 and (sin 2h)/h → 2
- f′(x) = 2cos 2x
Example: gen:aqfp:4,2,0,0

**8. Instantaneous velocity from a distance–time formula**
Velocity is the instantaneous rate of change of distance: the slope of the distance–time graph at that moment, ds/dt.
Differentiate s term by term (d/dt tⁿ = n tⁿ⁻¹), then substitute the given time.
- A particle moves along a straight line so that its distance from a fixed point O after t seconds is s = t³ + 5t² + 3t metres. Find its instantaneous velocity, in m/s, at t = 2.
- v = ds/dt = 3t^2 + 10t + 3
- At t = 2: v = 35 m/s
Example: prerequisite illustration

## MATH.calculus.derivatives#spot_the_mistake

Revision: sha256:1fe7a60193411b81a7dbdde9a831fd6524874e8e1832f39529be105d9f6830ec
Status: pending_review

### Before

**A common wrong answer**
A question: “Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 2x² + 4x − 1.” A common wrong answer is 4x + 3.
The constant −1 was kept; in f(x + h) − f(x) it cancels, so it does not appear in f′(x).
- Not 4x + 3, but 4x + 4

### Revised student screens

**1. A common wrong answer**
A question: “Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 2x² + 4x − 1.” A common wrong answer is 4x + 3.
The constant −1 was kept; in f(x + h) − f(x) it cancels, so it does not appear in f′(x).
- Not 4x + 3, but 4x + 4
Example: gen:aqfp:0,2,4,-1

**2. Why the square gives 2x**
First look at the x² part of our function. At x + h, the square means (x + h)(x + h). Multiply each term in the first bracket by each term in the second. The two cross terms are xh and hx; together they give 2xh.
Subtract the original x², then divide the change by h. For h ≠ 0 this is 2x + h. As h approaches zero, the slope approaches 2x. That is why the derivative of x² is 2x.
- (x + h)² = x² + xh + hx + h² = x² + 2xh + h²
- [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h (h ≠ 0)
- lim (h → 0) (2x + h) = 2x
Example: gen:aqfp:0,2,4,-1

**3. Replace every x, then expand**
Now use the whole function f(x) = 2x² + 4x − 1. Replace every x by x + h, including the x in the linear term. The constant stays the same in f(x + h).
- f(x + h) = 2(x + h)² + 4(x + h) − 1
- f(x + h) = 2x² + 4xh + 2h² + 4x + 4h − 1
Example: gen:aqfp:0,2,4,-1

**4. Subtract the whole original function**
The brackets matter: subtracting f(x) reverses the sign of every term in it. The x² terms, the original linear terms and the constants cancel. Only terms containing h remain.
- f(x + h) − f(x) = (2x² + 4xh + 2h² + 4x + 4h − 1) − (2x² + 4x − 1)
- = 4xh + 2h² + 4h
- = h(4x + 2h + 4)
Example: gen:aqfp:0,2,4,-1

**5. Cancel first, then take the limit**
The chord slope is change in f divided by change in x, which is h. While h is non-zero, cancel the common factor h. Putting h = 0 into the original quotient would give 0/0, which is undefined.
Now take the limit of the simplified expression. The terms containing h tend to zero. This gives the tangent slope at x, not the height f(x). The constant cancelled; it contributes nothing to the derivative.
- [f(x + h) − f(x)]/h = h(4x + 2h + 4)/h = 4x + 2h + 4 (h ≠ 0)
- f′(x) = lim (h → 0) (4x + 2h + 4) = 4x + 4
Example: gen:aqfp:0,2,4,-1

**Guided: gen:aqfp:0,4,-1,1**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 4x² − x + 1.
Answer: 8x − 1

**Independent recheck: gen:aqfp:0,1,-1,1:mc**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = x² − x + 1. Choose one.
A. 2x
B. 2x − 1
C. x^2 − x + 1
D. −(2x − 1)
Answer: B

## MATH.calculus.derivatives#expand_cancel

Revision: sha256:84207021e20331b9dc44ec069502921b703d31dfa804975b7820d4bfdc6acfab
Status: pending_review

### Before

**Three stages**
Stage one: write f(x + h) and simplify f(x + h) − f(x) until every term of the top has a factor h: expand a polynomial, combine fractions, or multiply by the sum of the roots. Stage two: cancel h. Stage three: let h → 0.
- Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = x² − 4x − 5.
- Write [f(x + h) − f(x)]/h for f(x) = x² − 4x − 5 and simplify until h cancels
- Let h → 0: f′(x) = 2x − 4

### Revised student screens

**1. Why the square gives 2x**
First look at the x² part of our function. At x + h, the square means (x + h)(x + h). Multiply each term in the first bracket by each term in the second. The two cross terms are xh and hx; together they give 2xh.
Subtract the original x², then divide the change by h. For h ≠ 0 this is 2x + h. As h approaches zero, the slope approaches 2x. That is why the derivative of x² is 2x.
- (x + h)² = x² + xh + hx + h² = x² + 2xh + h²
- [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h (h ≠ 0)
- lim (h → 0) (2x + h) = 2x
Example: gen:aqfp:0,1,-5,-4

**2. Replace every x, then expand**
Now use the whole function f(x) = x² − 5x − 4. Replace every x by x + h, including the x in the linear term. The constant stays the same in f(x + h).
- f(x + h) = (x + h)² − 5(x + h) − 4
- f(x + h) = x² + 2xh + h² − 5x − 5h − 4
Example: gen:aqfp:0,1,-5,-4

**3. Subtract the whole original function**
The brackets matter: subtracting f(x) reverses the sign of every term in it. The x² terms, the original linear terms and the constants cancel. Only terms containing h remain.
- f(x + h) − f(x) = (x² + 2xh + h² − 5x − 5h − 4) − (x² − 5x − 4)
- = 2xh + h² − 5h
- = h(2x + h − 5)
Example: gen:aqfp:0,1,-5,-4

**4. Cancel first, then take the limit**
The chord slope is change in f divided by change in x, which is h. While h is non-zero, cancel the common factor h. Putting h = 0 into the original quotient would give 0/0, which is undefined.
Now take the limit of the simplified expression. The terms containing h tend to zero. This gives the tangent slope at x, not the height f(x). The constant cancelled; it contributes nothing to the derivative.
- [f(x + h) − f(x)]/h = h(2x + h − 5)/h = 2x + h − 5 (h ≠ 0)
- f′(x) = lim (h → 0) (2x + h − 5) = 2x − 5
Example: gen:aqfp:0,1,-5,-4

**Guided: gen:aqfp:2,1,3,0**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = √(x + 3).
Answer: 1/(2√(x + 3))

**Independent recheck: gen:aqfp:0,2,4,-4:mc**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 2x² + 4x − 4. Choose one.
A. 4x
B. 4x + 4
C. 2x^2 + 4x − 4
D. −(4x + 4)
Answer: B

## MATH.calculus.derivatives#why_limit

Revision: sha256:2031fbc855013f685b678f268046d8168ee2ea1398f249aa8d655f0c17474b34
Status: pending_review

### Before

**A chord is not a tangent**
With h equal to zero straight away, the fraction is zero over zero: it has no value. The limit lets h shrink towards zero without reaching it. Cancelling h first removes the zero over zero and shows the value the chord slopes approach.

### Revised student screens

**1. A chord is not a tangent**
With h equal to zero straight away, the fraction is zero over zero: it has no value. The limit lets h shrink towards zero without reaching it. Cancelling h first removes the zero over zero and shows the value the chord slopes approach.
Example: gen:aqfp:0,1,-5,-4

**2. Why the square gives 2x**
First look at the x² part of our function. At x + h, the square means (x + h)(x + h). Multiply each term in the first bracket by each term in the second. The two cross terms are xh and hx; together they give 2xh.
Subtract the original x², then divide the change by h. For h ≠ 0 this is 2x + h. As h approaches zero, the slope approaches 2x. That is why the derivative of x² is 2x.
- (x + h)² = x² + xh + hx + h² = x² + 2xh + h²
- [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h (h ≠ 0)
- lim (h → 0) (2x + h) = 2x
Example: gen:aqfp:0,1,-5,-4

**3. Replace every x, then expand**
Now use the whole function f(x) = x² − 5x − 4. Replace every x by x + h, including the x in the linear term. The constant stays the same in f(x + h).
- f(x + h) = (x + h)² − 5(x + h) − 4
- f(x + h) = x² + 2xh + h² − 5x − 5h − 4
Example: gen:aqfp:0,1,-5,-4

**4. Subtract the whole original function**
The brackets matter: subtracting f(x) reverses the sign of every term in it. The x² terms, the original linear terms and the constants cancel. Only terms containing h remain.
- f(x + h) − f(x) = (x² + 2xh + h² − 5x − 5h − 4) − (x² − 5x − 4)
- = 2xh + h² − 5h
- = h(2x + h − 5)
Example: gen:aqfp:0,1,-5,-4

**5. Cancel first, then take the limit**
The chord slope is change in f divided by change in x, which is h. While h is non-zero, cancel the common factor h. Putting h = 0 into the original quotient would give 0/0, which is undefined.
Now take the limit of the simplified expression. The terms containing h tend to zero. This gives the tangent slope at x, not the height f(x). The constant cancelled; it contributes nothing to the derivative.
- [f(x + h) − f(x)]/h = h(2x + h − 5)/h = 2x + h − 5 (h ≠ 0)
- f′(x) = lim (h → 0) (2x + h − 5) = 2x − 5
Example: gen:aqfp:0,1,-5,-4

**Guided: gen:aqfp:0,1,-4,-2**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = x² − 4x − 2.
Answer: 2x − 4

**Independent recheck: gen:aqfp:1,2,-2,0**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 2/(x − 2).
Answer: −2/(x − 2)^2

## MATH.calculus.derivatives#expansion_check

Revision: sha256:35cb46509416a423c97bb155c01e2d6586d592cd6651f3aeb1bdb86c9e63af7b
Status: pending_review

### Before

**Do not lose the cross terms**
(x + h)² = x² + 2xh + h², not x² + h². (x + h)³ = x³ + 3x²h + 3xh² + h³. sin(A + B) = sin A cos B + cos A sin B and cos(A + B) = cos A cos B − sin A sin B. A missing middle term loses the answer.

### Revised student screens

**1. Why the square gives 2x**
First look at the x² part of our function. At x + h, the square means (x + h)(x + h). Multiply each term in the first bracket by each term in the second. The two cross terms are xh and hx; together they give 2xh.
Subtract the original x², then divide the change by h. For h ≠ 0 this is 2x + h. As h approaches zero, the slope approaches 2x. That is why the derivative of x² is 2x.
- (x + h)² = x² + xh + hx + h² = x² + 2xh + h²
- [(x + h)² − x²]/h = (2xh + h²)/h = 2x + h (h ≠ 0)
- lim (h → 0) (2x + h) = 2x
Example: gen:aqfp:0,1,-5,-4

**2. Do not lose the cross terms**
(x + h)² = x² + 2xh + h², not x² + h². (x + h)³ = x³ + 3x²h + 3xh² + h³. sin(A + B) = sin A cos B + cos A sin B and cos(A + B) = cos A cos B − sin A sin B. A missing middle term loses the answer.
Example: prerequisite illustration

**Guided: gen:aqfp:0,3,2,4**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 3x² + 2x + 4.
Answer: 6x + 2

**Independent recheck: gen:aqfp:0,3,2,1:mc**
Using the definition f′(x) = lim (h → 0) [f(x + h) − f(x)]/h, find f′(x) for f(x) = 3x² + 2x + 1. Choose one.
A. 6x
B. 6x + 2
C. 6x + 3
D. 3x^2 + 2x + 1
Answer: B

## MATH.calculus.integration-methods#chapter

Revision: sha256:8af9ef2ba85d450a36de7077e9c63d1f2bcc5f724ce59b31fa5e758c7459ac6d
Status: pending_review

### Before

**Spot u and du**
In ∫ 2x(x² + 1)² dx, call the inside of the bracket u = x² + 1. Its derivative, 2x, is already there: du = 2x dx. So the integral is ∫ u² du.
- u = x² + 1, du = 2x dx
- ∫ 2x(x² + 1)² dx = ∫ u² du = u³ ⁄ 3 + C

**Change the limits**
With limits, change them too: put each x limit into u = x² + 1, and integrate between those u values. You never go back to x.
- ∫ from 0 to 1 of 2x(x² + 1)² dx = ?
- Let u = x² + 1: x = 0 gives u = 1, x = 1 gives u = 2
- 2x dx = du, so the integral is ∫ u² du = u³ ⁄ 3
- 2³ = 8
- 1³ = 1
- Between u = 1 and u = 2: 7/3

**Integration using trigonometric identities and substitution**
Powers and products of sines and cosines are not standard integrals, but trigonometric identities turn them into sums of single sines and cosines, which are. A substitution u = g(x) works when g′(x) is also present.
Rewrite: sin²θ = (1 − cos 2θ)/2, cos²θ = (1 + cos 2θ)/2, tan²θ = sec²θ − 1, 2 sin A cos B = sin(A + B) + sin(A − B). Then integrate term by term. For f′(x)/f(x) the answer is log|f(x)| + C.
- Find ∫ 4tan²(5x) dx.
- Use tan²θ = sec²θ − 1
- (4/5)tan(5x) − 4x + C

**Integrals of the standard forms 1/(x² − a²), 1/(a² − x²), 1/√(x² ± a²), √(x² ± a²) and (px + q)/(x² + bx + c)**
Completing the square turns x² + bx + c into (x + h)² ± a², and each such shape has a standard antiderivative; a linear top px + q is split into a multiple of the bottom's derivative plus a constant.
Complete the square; match the form; write the standard result with u = x + h. For (px + q)/(x² + bx + c), write px + q = (p/2)(2x + b) + B: the first part gives (p/2) log|x² + bx + c|, the second a standard form.
- Find ∫ √(x² + 36) dx.
- The form is already standard, with a = 6
- ∫ √(x² + a²) dx = (x/2)√(x² + a²) + (a²/2) log|x + √(x² + a²)|
- (1/2)x√(x² + 36) + 18log|x + √(x² + 36)| + C

**Definite integrals of 1/(x² + a²), 1/√(a² − x²) and √(a² − x²)**
d/dx tan⁻¹(x/a) = a/(a² + x²) and d/dx sin⁻¹(x/a) = 1/√(a² − x²), so these integrands have inverse trigonometric antiderivatives; their values at the limits are standard angles. ∫₀ᵃ √(a² − x²) dx is a quarter of a circle of radius a.
∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a) + C; ∫ dx/√(a² − x²) = sin⁻¹(x/a) + C; ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. Evaluate at the limits in radians.
- Evaluate ∫ from 0 to 3/2 of 4/√(9 − x²) dx. Give the exact value in terms of π.
- ∫ dx/√(a² − x²) = sin⁻¹(x/a): sin⁻¹(1/2) − sin⁻¹(0) = π/6
- = 2π/3

**Integrating by partial fractions: repeated factors and improper fractions**
A repeated factor (x − a)² needs two partial fractions, A/(x − a) + B/(x − a)²: the first integrates to a logarithm, the second to a power, −B/(x − a). An improper fraction (top degree ≥ bottom degree) is first divided to give a polynomial plus a proper fraction.
If needed, divide. Split the proper part into partial fractions, find the constants (cover-up or comparing coefficients), integrate each term, add C.
- Find ∫ (−2x + 7)/(x − 2)² dx.
- Write the integrand as A/(x − a) + B/(x − a)²: −2/(x − 2) + 3/(x − 2)²
- ∫ dx/(x − a)² = −1/(x − a): −2log|x − 2| − 3/(x − 2) + C

**Integration by parts, Bernoulli's formula and ∫ eˣ[f(x) + f′(x)] dx**
The product rule read backwards gives ∫ u dv = uv − ∫ v du. Choose u to be the factor that becomes simpler when differentiated (x, x², log x); repeated parts on x² gives Bernoulli's formula with alternating signs.
Pick u and dv (ILATE order: inverse trig, log, algebraic, trig, exponential for u). Find du and v, write uv − ∫ v du, and integrate the last part. For eˣ[f + f′], the answer is eˣ f + C at once.
- Find ∫ 3x log(2x) dx (x > 0; log is the natural logarithm).
- By parts with u = log(ax) and dv = xⁿ dx
- (3/2)x^2 log(2x) − (3/4)x^2 + C

**A definite integral by substitution: ∫ c t/√(t² + d²) dt**
When the integrand contains a function and (a multiple of) its derivative, substitute u for the function: t dt is half of d(t² + d²). The limits change with the variable.
Let u = t² + d², so t dt = du/2. Change the limits (t = 0 gives u = d², t = b gives u = b² + d²), integrate (1/2)u^(−1/2) to √u, and subtract.
- Evaluate ∫ from 0 to 4 of 2t/√(t² + 9) dt, using the substitution u = t² + 9.
- u = t² + 9, du = 2t dt; the limits become u = 9 and u = 25
- 2(1/2)∫ u^(−1/2) du = 2√u
- 2 × (√25 − √9) = 2 × (5 − 3) = 4

**Integrals with inverse trigonometric answers: 1/(x² + a²), 1/√(a² − x²), √(a² − x²) and forms reducible to them**
d/dx tan⁻¹(x/a) = a/(x² + a²) and d/dx sin⁻¹(x/a) = 1/√(a² − x²), so these integrands have inverse trigonometric antiderivatives. Completing the square brings x² + bx + c to (x + h)² ± a², the same forms with u = x + h.
∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a) + C; ∫ dx/√(a² − x²) = sin⁻¹(x/a) + C; ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. For a linear top, split it into a multiple of the bottom's derivative (a logarithm) and a constant (a tan⁻¹).
- Find ∫ 3/(x² + 2x + 2) dx.
- Complete the square: x² + 2x + 2 = (x + 1)² + 1²
- ∫ dx/(u² + a²) = (1/a) tan⁻¹(u/a) + C
- 3tan⁻¹(x + 1) + C

**Integrating by partial fractions with an irreducible quadratic factor**
A factor x² + a² that does not factorise needs a linear top: (Bx + C)/(x² + a²). Its x part integrates to a logarithm and its constant part to a tan⁻¹.
Write the integrand as A/(x − r) + (Bx + C)/(x² + a²); find A by putting x = r, then B and C by comparing the x² and constant terms. Integrate: A log|x − r| + (B/2) log(x² + a²) + (C/a) tan⁻¹(x/a) + C.
- Find ∫
- Write the integrand as A/x + (Bx + C)/(x² + 4): A = 2, B = 3, C = 4
- A/(x − r) gives A log|x − r|; Bx/(x² + a²) gives (B/2) log(x² + a²); C/(x² + a²) gives (C/a) tan⁻¹(x/a)
- 2log|x| + (3/2)log(x² + 4) + 2tan⁻¹(x/2) + C

### Revised student screens

**1. Choose the inside expression**
We want ∫ from x = 0 to x = 1 of 2x(x² + 1)² dx. The bracket is repeated, so name it u = x² + 1. This makes (x² + 1)² become u². We must also account for 2x dx and the limits.
- u = x² + 1
- (x² + 1)² = u²
Example: gen:subst:0,1,1,2

**2. What du means**
The derivative of x² + 1 is 2x: expanding (x + h)² gives x² + 2xh + h²; subtracting x² and dividing by h gives 2x + h, whose limit is 2x. The constant 1 cancels.
We write du/dx = 2x, or du = 2x dx. This differential notation records the rate of change used in substitution. It does not say that a finite change in u is exactly 2x times a finite change in x; that finite change also has an h² term.
- [(x + h)² + 1 − (x² + 1)]/h = 2x + h (h ≠ 0)
- du/dx = 2x; du = 2x dx
Example: gen:subst:0,1,1,2

**3. Replace the whole matching factor**
Group the integrand as (x² + 1)² × (2x dx). The first part becomes u²; the whole second part becomes du. No extra factor 2 remains to divide by.
The simpler integral has antiderivative u³/3, because its derivative is u². For an indefinite integral, write (x² + 1)³/3 + C. Here we have a definite integral, so we will evaluate between the new limits.
- (x² + 1)² (2x dx) → u² du
- ∫ u² du = u³/3 + C
Example: gen:subst:0,1,1,2

**4. Change both endpoints**
The limits 0 and 1 describe x. Our new integral uses u, so substitute each endpoint into u = x² + 1. The lower u limit is 1 and the upper u limit is 2.
Keep one variable throughout the evaluation: use u limits with u³/3. Alternatively, substitute back to x before using x limits; never mix the two.
- x = 0 → u = 0² + 1 = 1
- x = 1 → u = 1² + 1 = 2
- ∫ (x = 0 to 1) 2x(x² + 1)² dx = ∫ (u = 1 to 2) u² du
Example: gen:subst:0,1,1,2

**5. Upper value minus lower value**
Evaluate u³/3 at the upper limit, then subtract its value at the lower limit. A cube means repeated multiplication: 2³ = 2 × 2 × 2 = 8. The integration constant cancels in this difference.
Check the result: the original integrand is non-negative between 0 and 1, so a positive answer is sensible. This is a useful sign check, not a proof of the answer.
- [u³/3] from 1 to 2 = 2³/3 − 1³/3
- = (8 − 1)/3 = 7/3
Example: gen:subst:0,1,1,2

**6. Integration using trigonometric identities and substitution**
Powers and products of sines and cosines are not standard integrals, but trigonometric identities turn them into sums of single sines and cosines, which are. A substitution u = g(x) works when g′(x) is also present.
Rewrite: sin²θ = (1 − cos 2θ)/2, cos²θ = (1 + cos 2θ)/2, tan²θ = sec²θ − 1, 2 sin A cos B = sin(A + B) + sin(A − B). Then integrate term by term. For f′(x)/f(x) the answer is log|f(x)| + C.
- Find ∫ 4tan²(5x) dx.
- Use tan²θ = sec²θ − 1
- (4/5)tan(5x) − 4x + C
Example: prerequisite illustration

**7. Integrals of the standard forms 1/(x² − a²), 1/(a² − x²), 1/√(x² ± a²), √(x² ± a²) and (px + q)/(x² + bx + c)**
Completing the square turns x² + bx + c into (x + h)² ± a², and each such shape has a standard antiderivative; a linear top px + q is split into a multiple of the bottom's derivative plus a constant.
Complete the square; match the form; write the standard result with u = x + h. For (px + q)/(x² + bx + c), write px + q = (p/2)(2x + b) + B: the first part gives (p/2) log|x² + bx + c|, the second a standard form.
- Find ∫ √(x² + 36) dx.
- The form is already standard, with a = 6
- ∫ √(x² + a²) dx = (x/2)√(x² + a²) + (a²/2) log|x + √(x² + a²)|
- (1/2)x√(x² + 36) + 18log|x + √(x² + 36)| + C
Example: prerequisite illustration

**8. Definite integrals of 1/(x² + a²), 1/√(a² − x²) and √(a² − x²)**
d/dx tan⁻¹(x/a) = a/(a² + x²) and d/dx sin⁻¹(x/a) = 1/√(a² − x²), so these integrands have inverse trigonometric antiderivatives; their values at the limits are standard angles. ∫₀ᵃ √(a² − x²) dx is a quarter of a circle of radius a.
∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a) + C; ∫ dx/√(a² − x²) = sin⁻¹(x/a) + C; ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. Evaluate at the limits in radians.
- Evaluate ∫ from 0 to 3/2 of 4/√(9 − x²) dx. Give the exact value in terms of π.
- ∫ dx/√(a² − x²) = sin⁻¹(x/a): sin⁻¹(1/2) − sin⁻¹(0) = π/6
- = 2π/3
Example: prerequisite illustration

**9. Integrating by partial fractions: repeated factors and improper fractions**
A repeated factor (x − a)² needs two partial fractions, A/(x − a) + B/(x − a)²: the first integrates to a logarithm, the second to a power, −B/(x − a). An improper fraction (top degree ≥ bottom degree) is first divided to give a polynomial plus a proper fraction.
If needed, divide. Split the proper part into partial fractions, find the constants (cover-up or comparing coefficients), integrate each term, add C.
- Find ∫ (−2x + 7)/(x − 2)² dx.
- Write the integrand as A/(x − a) + B/(x − a)²: −2/(x − 2) + 3/(x − 2)²
- ∫ dx/(x − a)² = −1/(x − a): −2log|x − 2| − 3/(x − 2) + C
Example: prerequisite illustration

**10. Integration by parts, Bernoulli's formula and ∫ eˣ[f(x) + f′(x)] dx**
The product rule read backwards gives ∫ u dv = uv − ∫ v du. Choose u to be the factor that becomes simpler when differentiated (x, x², log x); repeated parts on x² gives Bernoulli's formula with alternating signs.
Pick u and dv (ILATE order: inverse trig, log, algebraic, trig, exponential for u). Find du and v, write uv − ∫ v du, and integrate the last part. For eˣ[f + f′], the answer is eˣ f + C at once.
- Find ∫ 3x log(2x) dx (x > 0; log is the natural logarithm).
- By parts with u = log(ax) and dv = xⁿ dx
- (3/2)x^2 log(2x) − (3/4)x^2 + C
Example: prerequisite illustration

**11. A definite integral by substitution: ∫ c t/√(t² + d²) dt**
When the integrand contains a function and (a multiple of) its derivative, substitute u for the function: t dt is half of d(t² + d²). The limits change with the variable.
Let u = t² + d², so t dt = du/2. Change the limits (t = 0 gives u = d², t = b gives u = b² + d²), integrate (1/2)u^(−1/2) to √u, and subtract.
- Evaluate ∫ from 0 to 4 of 2t/√(t² + 9) dt, using the substitution u = t² + 9.
- u = t² + 9, du = 2t dt; the limits become u = 9 and u = 25
- 2(1/2)∫ u^(−1/2) du = 2√u
- 2 × (√25 − √9) = 2 × (5 − 3) = 4
Example: prerequisite illustration

**12. Integrals with inverse trigonometric answers: 1/(x² + a²), 1/√(a² − x²), √(a² − x²) and forms reducible to them**
d/dx tan⁻¹(x/a) = a/(x² + a²) and d/dx sin⁻¹(x/a) = 1/√(a² − x²), so these integrands have inverse trigonometric antiderivatives. Completing the square brings x² + bx + c to (x + h)² ± a², the same forms with u = x + h.
∫ dx/(x² + a²) = (1/a) tan⁻¹(x/a) + C; ∫ dx/√(a² − x²) = sin⁻¹(x/a) + C; ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2) sin⁻¹(x/a) + C. For a linear top, split it into a multiple of the bottom's derivative (a logarithm) and a constant (a tan⁻¹).
- Find ∫ 3/(x² + 2x + 2) dx.
- Complete the square: x² + 2x + 2 = (x + 1)² + 1²
- ∫ dx/(u² + a²) = (1/a) tan⁻¹(u/a) + C
- 3tan⁻¹(x + 1) + C
Example: prerequisite illustration

**13. Integrating by partial fractions with an irreducible quadratic factor**
A factor x² + a² that does not factorise needs a linear top: (Bx + C)/(x² + a²). Its x part integrates to a logarithm and its constant part to a tan⁻¹.
Write the integrand as A/(x − r) + (Bx + C)/(x² + a²); find A by putting x = r, then B and C by comparing the x² and constant terms. Integrate: A log|x − r| + (B/2) log(x² + a²) + (C/a) tan⁻¹(x/a) + C.
- Find ∫
- Write the integrand as A/x + (Bx + C)/(x² + 4): A = 2, B = 3, C = 4
- A/(x − r) gives A log|x − r|; Bx/(x² + a²) gives (B/2) log(x² + a²); C/(x² + a²) gives (C/a) tan⁻¹(x/a)
- 2log|x| + (3/2)log(x² + 4) + 2tan⁻¹(x/2) + C
Example: prerequisite illustration

## MATH.calculus.integration-methods#why_du

Revision: sha256:3e46c4cb715e9c12f2d02d203dc8e2a5548400f3933f6943340ca624367f1dd7
Status: pending_review

### Before

**Nothing left to divide by**
du ⁄ dx = 2x, so a small change dx in x changes u by 2x dx. The 2x in the integral is exactly what turns dx into du: there is no extra 2 to divide by.

### Revised student screens

**1. Choose the inside expression**
We want ∫ from x = 0 to x = 1 of 2x(x² + 1)² dx. The bracket is repeated, so name it u = x² + 1. This makes (x² + 1)² become u². We must also account for 2x dx and the limits.
- u = x² + 1
- (x² + 1)² = u²
Example: gen:subst:0,1,1,2

**2. What du means**
The derivative of x² + 1 is 2x: expanding (x + h)² gives x² + 2xh + h²; subtracting x² and dividing by h gives 2x + h, whose limit is 2x. The constant 1 cancels.
We write du/dx = 2x, or du = 2x dx. This differential notation records the rate of change used in substitution. It does not say that a finite change in u is exactly 2x times a finite change in x; that finite change also has an h² term.
- [(x + h)² + 1 − (x² + 1)]/h = 2x + h (h ≠ 0)
- du/dx = 2x; du = 2x dx
Example: gen:subst:0,1,1,2

**3. Replace the whole matching factor**
Group the integrand as (x² + 1)² × (2x dx). The first part becomes u²; the whole second part becomes du. No extra factor 2 remains to divide by.
The simpler integral has antiderivative u³/3, because its derivative is u². For an indefinite integral, write (x² + 1)³/3 + C. Here we have a definite integral, so we will evaluate between the new limits.
- (x² + 1)² (2x dx) → u² du
- ∫ u² du = u³/3 + C
Example: gen:subst:0,1,1,2

**4. Change both endpoints**
The limits 0 and 1 describe x. Our new integral uses u, so substitute each endpoint into u = x² + 1. The lower u limit is 1 and the upper u limit is 2.
Keep one variable throughout the evaluation: use u limits with u³/3. Alternatively, substitute back to x before using x limits; never mix the two.
- x = 0 → u = 0² + 1 = 1
- x = 1 → u = 1² + 1 = 2
- ∫ (x = 0 to 1) 2x(x² + 1)² dx = ∫ (u = 1 to 2) u² du
Example: gen:subst:0,1,1,2

**5. Upper value minus lower value**
Evaluate u³/3 at the upper limit, then subtract its value at the lower limit. A cube means repeated multiplication: 2³ = 2 × 2 × 2 = 8. The integration constant cancels in this difference.
Check the result: the original integrand is non-negative between 0 and 1, so a positive answer is sensible. This is a useful sign check, not a proof of the answer.
- [u³/3] from 1 to 2 = 2³/3 − 1³/3
- = (8 − 1)/3 = 7/3
Example: gen:subst:0,1,1,2

**Guided: gen:subst:0,1,2,2**
∫ from 0 to 1 of 2x(x² + 2)² dx = ? (A fraction is fine.)
Answer: 19/3

**Independent recheck: gen:subst:0,1,3,1**
∫ from 0 to 1 of 2x(x² + 3) dx = ? (A fraction is fine.)
Answer: 7/2

## MATH.calculus.integration-methods#limits_table

Revision: sha256:0742d4adb3fd0f6f05469004ac481c476e2ba4cfddf0db4eada144f835c6e75c
Status: pending_review

### Before

**x row, u row**
Write two rows, x and u. Under x put the two limits; under u put x² + c for each. Then integrate in u between the u values.
- ∫ from 0 to 1 of 2x(x² + 2) dx = ?
- Let u = x² + 2: x = 0 gives u = 2, x = 1 gives u = 3
- 2x dx = du, so the integral is ∫ u¹ du = u² ⁄ 2
- 3² = 9
- 2² = 4
- Between u = 2 and u = 3: 5/2

### Revised student screens

**1. Choose the inside expression**
We want ∫ from x = 0 to x = 1 of 2x(x² + 1)² dx. The bracket is repeated, so name it u = x² + 1. This makes (x² + 1)² become u². We must also account for 2x dx and the limits.
- u = x² + 1
- (x² + 1)² = u²
Example: gen:subst:0,1,1,2

**2. What du means**
The derivative of x² + 1 is 2x: expanding (x + h)² gives x² + 2xh + h²; subtracting x² and dividing by h gives 2x + h, whose limit is 2x. The constant 1 cancels.
We write du/dx = 2x, or du = 2x dx. This differential notation records the rate of change used in substitution. It does not say that a finite change in u is exactly 2x times a finite change in x; that finite change also has an h² term.
- [(x + h)² + 1 − (x² + 1)]/h = 2x + h (h ≠ 0)
- du/dx = 2x; du = 2x dx
Example: gen:subst:0,1,1,2

**3. Replace the whole matching factor**
Group the integrand as (x² + 1)² × (2x dx). The first part becomes u²; the whole second part becomes du. No extra factor 2 remains to divide by.
The simpler integral has antiderivative u³/3, because its derivative is u². For an indefinite integral, write (x² + 1)³/3 + C. Here we have a definite integral, so we will evaluate between the new limits.
- (x² + 1)² (2x dx) → u² du
- ∫ u² du = u³/3 + C
Example: gen:subst:0,1,1,2

**4. Change both endpoints**
The limits 0 and 1 describe x. Our new integral uses u, so substitute each endpoint into u = x² + 1. The lower u limit is 1 and the upper u limit is 2.
Keep one variable throughout the evaluation: use u limits with u³/3. Alternatively, substitute back to x before using x limits; never mix the two.
- x = 0 → u = 0² + 1 = 1
- x = 1 → u = 1² + 1 = 2
- ∫ (x = 0 to 1) 2x(x² + 1)² dx = ∫ (u = 1 to 2) u² du
Example: gen:subst:0,1,1,2

**5. Upper value minus lower value**
Evaluate u³/3 at the upper limit, then subtract its value at the lower limit. A cube means repeated multiplication: 2³ = 2 × 2 × 2 = 8. The integration constant cancels in this difference.
Check the result: the original integrand is non-negative between 0 and 1, so a positive answer is sensible. This is a useful sign check, not a proof of the answer.
- [u³/3] from 1 to 2 = 2³/3 − 1³/3
- = (8 − 1)/3 = 7/3
Example: gen:subst:0,1,1,2

**6. x row, u row**
Write two rows, x and u. Under x put the two limits; under u put x² + c for each. Then integrate in u between the u values.
- ∫ from 0 to 1 of 2x(x² + 2) dx = ?
- Let u = x² + 2: x = 0 gives u = 2, x = 1 gives u = 3
- 2x dx = du, so the integral is ∫ u¹ du = u² ⁄ 2
- 3² = 9
- 2² = 4
- Between u = 2 and u = 3: 5/2
Example: gen:subst:0,1,2,1

**Guided: gen:subst:0,2,4,2**
∫ from 0 to 2 of 2x(x² + 4)² dx = ? (A fraction is fine.)
Answer: 448/3

**Independent recheck: gen:subst:0,3,1,2:mc**
∫ from 0 to 3 of 2x(x² + 1)² dx = ? Choose one.
A. 9
B. 333/2
C. 333
D. 999
Answer: C

## MATH.calculus.integration-methods#powers_check

Revision: sha256:f68ced57e9f1a9880d4c895c6458af4950a9a6af21058639afe286bbb659b237
Status: pending_review

### Before

**The last step is arithmetic**
The last step is powers of whole numbers, like 2³ = 8 and 5³ = 125, then a subtraction and a division. A power is repeated multiplication, not the number times the power.

### Revised student screens

**1. The last step is arithmetic**
The last step is powers of whole numbers, like 2³ = 8 and 5³ = 125, then a subtraction and a division. A power is repeated multiplication, not the number times the power.
Example: prerequisite illustration

**Guided: gen:subst:0,2,4,3**
∫ from 0 to 2 of 2x(x² + 4)³ dx = ? (A fraction is fine.)
Answer: 960

**Independent recheck: gen:subst:0,3,1,3**
∫ from 0 to 3 of 2x(x² + 1)³ dx = ? (A fraction is fine.)
Answer: 9999/4

