# RegEx Visualizer & Analyzer 🚀

**A formal TAFL utility for Regular Expression generation and mathematical verification.**

### [🔗 View Live Project](https://regexproject.vercel.app/)

---

## ⚡ Core Features

### 1. 🔡 String Generator
* **BFS Engine:** Generates strings in strictly increasing order of length (Shortest → Longest).
* **Smart Palette:** Interactive UI for quick-entry of symbols like $\epsilon$, $|$, and Kleene operators.
* **Infinite Scroll:** Loads 15 strings per click with an internal cap of 150 for performance.

### 2. ⚖️ Equivalence Checker
* **DFA Isomorphism:** Uses Thompson’s Construction and Subset Construction to convert REs into Minimal DFAs.
* **Rigorous Logic:** Correctly identifies equivalence for complex nested identities (e.g., `(a*b*)* ≡ (a|b)*`) where standard string-sampling fails.

---

## 🛠️ Technical Implementation
* **Stack:** React.js + Tailwind CSS (High-contrast Dark Mode).
* **Algorithms:** BFS Frontier Search, NFA-to-DFA Transformation, DFA Minimization.
* **Deployment:** Vercel (CI/CD via GitHub).

---

## 👤 Student Details
* **Name:** Yash Tayal
* **Roll No:** 2024UCS1647
* **Institution:** Netaji Subhas University of Technology (NSUT)
* **Course:** Theory of Automata and Formal Languages (CSE-2)

---

## 🚀 Quick Start
```bash
# Clone the repository
git clone https://github.com/yashtayalcse/TAFL-project-RegEx

# Install dependencies
npm install

# Run locally
npm start
