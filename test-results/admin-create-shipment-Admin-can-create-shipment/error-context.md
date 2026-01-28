# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Welcome back" [level=1] [ref=e4]
    - paragraph [ref=e5]: Sign in to AFGHCO Logistics
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: Email
        - textbox "name@example.com" [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]: Password
        - textbox "••••••••" [ref=e12]
      - button "Sign in" [ref=e13]
    - generic [ref=e14]:
      - link "Forgot password?" [ref=e15] [cursor=pointer]:
        - /url: /dashboard/auth/reset
      - link "Create account" [ref=e16] [cursor=pointer]:
        - /url: /dashboard/auth/register
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - img [ref=e23]
  - alert [ref=e26]
```