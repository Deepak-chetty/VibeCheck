# VibeCheck — Place Review & AI Recommendation System

VibeCheck is a full-stack, gamified place discovery web application. It matches destinations to user preference patterns, allows travelers to review places, earns points for sharing insights, and provides voucher redemptions and real-time review analytics.

---

## Technical Stack & Features

- **Backend**: Node.js & Express.js
- **Database**: MongoDB (via Mongoose) with a transparent local JSON file fallback (`db.json`) for instant out-of-the-box execution without database configurations.
- **Security**: JWT-based user authentication and bcrypt password hashing.
- **AI Recommendation Engine**: Calculates personalized matching scores for destinations based on the user's selected interests (vibes) combined with their historical reviews ratings matrix.
- **Rewards System**: Gamified reward logic giving users points for posting reviews (+10 points for standard spots, and a +25 points double-bonus for discovering "Hidden Gems"). Points can be spent to claim travel vouchers.
- **Review Analytics**: A data-driven dashboard tracking platform-wide review metrics, popular vibe distributions, and traveler leaderboards.
- **Frontend**: Modular CSS, HTML, and vanilla Javascript featuring a responsive circular Vibe Compass dial, and premium glassmorphism layouts.

---

## Getting Started

Follow these steps to run the application locally:

### 1. Prerequisites
Ensure you have **Node.js** (version 16 or higher) installed on your system.

### 2. Install Dependencies
Open your terminal in the project directory (`Vibe/`) and install dependencies:
```bash
npm install
```

### 3. Setup Configuration
A default configuration is already set up in the `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/vibecheck
JWT_SECRET=supersecretvibecheckkey123!
```
*Note: If a local MongoDB instance is running, the app will connect to it. If not, the application will automatically fall back to serving data using the in-memory offline engine backed by a local `db.json` file.*

### 4. Seed the Database
Seed the 32 pre-mapped destinations and hidden gems into the database by running:
```bash
npm run seed
```
*(This command will output whether it seeded to MongoDB or to the fallback JSON database).*

### 5. Launch the Server
Start the Express server:
```bash
npm start
```
You should see:
```text
✨ MongoDB Connected successfully. (or warnings about falling back to JSON DB)
🚀 VibeCheck server is running at http://localhost:3000
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## Verifying the API (Automated Tests)

We have included a full verification suite to programmatically test registration, login, recommendations, review submissions, reward points math, voucher redemptions, and analytics calculations.

With your server running (`npm start`), open a separate terminal window and run:
```bash
node verify_endpoints.js
```
This will print a step-by-step log of the API interactions and verify everything works perfectly.

---

## Exploring the Web Application

1. **Sign Up**: Register a test account. You will start with **50 welcome points** and the rank **Novice Wanderer**.
2. **Vibe Compass**: Go to the compass, toggle multiple interests (e.g. Nature, Offbeat, Adventure), type a destination like `Goa` or `Kerala` (or leave it blank to match globally), and click **Calculate Recommendations**.
3. **Write a Review**: Click on a card (e.g. "Cola Beach" or "Gavi Rainforest") to open its detailed view, set a 5-star rating, write a short comment, and submit. You will instantly see your points balance increase in the top-right corner.
4. **Claim Vouchers**: Head to the **Rewards Club** tab to inspect available rewards. Spend your points to redeem a voucher code (e.g. 60 points for sunset tea).
5. **Insights**: Browse the **Review Analytics** dashboard to see chart graphs of popular vibes, rating distributions, and where you place on the global traveler leaderboard.
