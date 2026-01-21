# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Welcome back" [level=1] [ref=e4]
    - paragraph [ref=e5]: Sign in to AFGHCO Logistics
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: Email
        - textbox "name@example.com" [ref=e9]: e2e-admin@afghco.test
      - generic [ref=e10]:
        - generic [ref=e11]: Password
        - textbox "••••••••" [ref=e12]: AdminPassword123!
      - button "Sign in" [ref=e13]
    - generic [ref=e14]:
      - link "Forgot password?" [ref=e15] [cursor=pointer]:
        - /url: /auth/reset
      - link "Create account" [ref=e16] [cursor=pointer]:
        - /url: /auth/register
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - generic [ref=e25]:
      - text: Compiling
      - generic [ref=e26]:
        - generic [ref=e27]: .
        - generic [ref=e28]: .
        - generic [ref=e29]: .
  - alert [ref=e30]
```