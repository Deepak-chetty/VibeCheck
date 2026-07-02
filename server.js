const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { connectDB, User, Gem, Review } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretvibecheckkey123!';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// DESTINATION ALIAS MAPPINGS & HELPER
// -------------------------------------------------------------
const DESTINATION_MAPPING = [
  { key: 'goa', aliases: ['goa', 'panjim', 'anjuna', 'canacona', 'south goa'] },
  { key: 'kerala', aliases: ['kerala', 'gods own country', 'wayanad', 'trivandrum', 'pathanamthitta', 'alleppey'] },
  { key: 'rajasthan', aliases: ['rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'abhaneri', 'shekhawati'] },
  { key: 'himachal', aliases: ['himachal', 'manali', 'shimla', 'spiti', 'tirthan', 'sangla', 'kullu'] },
  { key: 'ladakh', aliases: ['ladakh', 'leh', 'nubra', 'changthang', 'turtuk'] },
  { key: 'tamilnadu', aliases: ['tamil nadu', 'chennai', 'madurai', 'chettinad', 'salem', 'yercaud', 'kumbakonam'] },
  { key: 'meghalaya', aliases: ['meghalaya', 'shillong', 'northeast', 'cherrapunji', 'khasi', 'jaintia'] },
  { key: 'uttarakhand', aliases: ['uttarakhand', 'rishikesh', 'nainital', 'dehradun', 'chopta', 'sattal'] }
];

function findMatchedDestinationKey(input) {
  const norm = input.trim().toLowerCase();
  if (!norm) return null;
  const found = DESTINATION_MAPPING.find(d => 
    d.key === norm || d.aliases.some(a => norm.includes(a) || a.includes(norm))
  );
  return found ? found.key : null;
}

// -------------------------------------------------------------
// VOUCHERS LIST
// -------------------------------------------------------------
const AVAILABLE_VOUCHERS = [
  { id: 'v1', name: 'Free Sunset Tea at Cola Beach (South Goa)', cost: 60, description: 'Enjoy a warm kettle of chai with views of the hidden lagoon.' },
  { id: 'v2', name: '20% Off Kayaking in Mangrove Creeks (Anjuna)', cost: 120, description: 'Explore Goan mangroves off the beaten path.' },
  { id: 'v3', name: 'Free Ayurvedic Herb Pack (Kalpetta Retreat)', cost: 180, description: 'A family-prepared set of essential healing herbs.' },
  { id: 'v4', name: 'Lamayuru Monastery Tour & Tea Pass (Leh)', cost: 250, description: 'Private tour of Ladakh’s oldest monastery with a resident monk.' },
  { id: 'v5', name: 'Free Traditional Dinner at Bishnoi Village', cost: 300, description: 'An authentic Rajasthani village meal cooked on an earthen stove.' }
];

// -------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------------
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Helper to calculate user rank/badge based on points
function getUserBadge(points) {
  if (points >= 500) return 'Gold Pathfinder';
  if (points >= 250) return 'Silver Explorer';
  if (points >= 100) return 'Bronze Voyager';
  return 'Novice Wanderer';
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      points: 50, // Welcome points
      vouchers: []
    });

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        badge: getUserBadge(user.points),
        vouchers: user.vouchers
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        badge: getUserBadge(user.points),
        vouchers: user.vouchers
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// 3. GET CURRENT USER PROFILE
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    // Get user reviews
    const userReviews = await Review.find({ userEmail: req.user.email });

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        points: req.user.points,
        badge: getUserBadge(req.user.points),
        vouchers: req.user.vouchers
      },
      reviews: userReviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// 4. REDEEM REWARD
app.post('/api/auth/redeem', authenticateToken, async (req, res) => {
  try {
    const { voucherId } = req.body;
    const voucher = AVAILABLE_VOUCHERS.find(v => v.id === voucherId);

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    if (req.user.points < voucher.cost) {
      return res.status(400).json({ message: `Insufficient points. You need ${voucher.cost} points.` });
    }

    // Deduct points
    req.user.points -= voucher.cost;

    // Generate a unique voucher code
    const voucherCode = `VIBE-${voucherId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    req.user.vouchers.push({
      code: voucherCode,
      name: voucher.name,
      pointsCost: voucher.cost,
      redeemedAt: new Date()
    });

    await req.user.save();

    res.json({
      message: 'Redeemed successfully!',
      voucherCode,
      pointsRemaining: req.user.points,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        points: req.user.points,
        badge: getUserBadge(req.user.points),
        vouchers: req.user.vouchers
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error redeeming voucher' });
  }
});

// 5. GET VOUCHERS LIST
app.get('/api/vouchers', (req, res) => {
  res.json(AVAILABLE_VOUCHERS);
});

// 6. GET ALL PLACES (With query filters)
app.get('/api/places', async (req, res) => {
  try {
    const { destination } = req.query;
    let gems = [];

    if (destination) {
      const matchedKey = findMatchedDestinationKey(destination);
      if (matchedKey) {
        gems = await Gem.find({ destination: matchedKey });
      } else {
        const regex = new RegExp(destination.trim().toLowerCase(), 'i');
        const list = await Gem.find({});
        gems = list.filter(g => 
          regex.test(g.destination) || regex.test(g.area) || regex.test(g.name)
        );
      }
    } else {
      gems = await Gem.find({});
    }

    res.json(gems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching places' });
  }
});

// 7. GET SPECIFIC GEM DETAILS & REVIEWS
app.get('/api/places/gem/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const gem = await Gem.findOne({ name });
    if (!gem) {
      return res.status(404).json({ message: 'Place not found' });
    }

    const reviews = await Review.find({ gemName: name });
    res.json({ gem, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching place details' });
  }
});

// 8. WRITE A REVIEW & EARN POINTS
app.post('/api/places/gem/:name/reviews', authenticateToken, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating (1-5) and comment are required' });
    }

    const gem = await Gem.findOne({ name });
    if (!gem) {
      return res.status(404).json({ message: 'Place not found' });
    }

    // Check if user already reviewed this place to prevent spam
    const existingReview = await Review.findOne({ gemName: name, userEmail: req.user.email });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this location' });
    }

    // Save the review
    const review = new Review({
      gemName: name,
      userName: req.user.name,
      userEmail: req.user.email,
      rating: Number(rating),
      comment: comment.trim()
    });

    await review.save();

    // Recalculate Gem Average Rating
    const allReviews = await Review.find({ gemName: name });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    gem.rating = Number((totalRating / allReviews.length).toFixed(1));
    gem.reviewsCount = allReviews.length;
    await gem.save();

    // Reward calculation
    // "Hidden Gem" threshold >= 0.8 gets 25 points, else 10 points
    const pointReward = gem.gem >= 0.8 ? 25 : 10;
    req.user.points += pointReward;
    await req.user.save();

    res.status(201).json({
      message: `Review added! You earned +${pointReward} points!`,
      review,
      pointReward,
      updatedPoints: req.user.points,
      updatedBadge: getUserBadge(req.user.points),
      updatedGem: gem
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting review' });
  }
});

// 9. AI RECOMMENDATION ENGINE
app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const { destination, interests } = req.query;
    const selectedInterests = interests ? interests.split(',').filter(Boolean) : [];

    // 1. Fetch user reviews to understand preference patterns
    const userReviews = await Review.find({ userEmail: req.user.email });
    
    // Create tag weights based on the user's reviews
    const tagPreferenceWeights = {};
    for (const rev of userReviews) {
      const reviewedGem = await Gem.findOne({ name: rev.gemName });
      if (reviewedGem) {
        for (const tag of reviewedGem.tags) {
          if (!tagPreferenceWeights[tag]) tagPreferenceWeights[tag] = 1.0;
          if (rev.rating >= 4) {
            tagPreferenceWeights[tag] += (rev.rating - 3) * 0.5;
          } else if (rev.rating <= 2) {
            tagPreferenceWeights[tag] -= (3 - rev.rating) * 0.4;
          }
        }
      }
    }

    // 2. Fetch target gems
    let allGems = [];
    if (destination) {
      const matchedKey = findMatchedDestinationKey(destination);
      if (matchedKey) {
        allGems = await Gem.find({ destination: matchedKey });
      } else {
        const regex = new RegExp(destination.trim().toLowerCase(), 'i');
        const list = await Gem.find({});
        allGems = list.filter(g => 
          regex.test(g.destination) || regex.test(g.area) || regex.test(g.name)
        );
      }
    } else {
      allGems = await Gem.find({});
    }

    // Filter by selected interests if any are chosen
    let filteredGems = allGems;
    if (selectedInterests.length > 0) {
      filteredGems = allGems.filter(gem => 
        gem.tags.some(tag => selectedInterests.includes(tag))
      );
      // Fallback if no tag matches
      if (filteredGems.length === 0) {
        filteredGems = allGems;
      }
    }

    // 3. Score gems based on matches and preference weights
    const scoredGems = filteredGems.map(gem => {
      let tagScore = 0;
      
      gem.tags.forEach(tag => {
        const isMatched = selectedInterests.length === 0 || selectedInterests.includes(tag);
        if (isMatched) {
          const weight = tagPreferenceWeights[tag] !== undefined ? tagPreferenceWeights[tag] : 1.0;
          tagScore += weight;
        }
      });

      // AI Score Formula:
      // (Weighted Tag Score * 2.5) + (Rating * 0.8) + (Hidden Gem Factor * 3.0)
      const baseRatingScore = gem.rating * 0.8;
      const hiddenGemScore = gem.gem * 3.0;
      const totalScore = (tagScore * 2.5) + baseRatingScore + hiddenGemScore;

      return {
        gem,
        score: Number(totalScore.toFixed(2)),
        tagPreferenceWeights
      };
    });

    // Sort by final score descending
    scoredGems.sort((a, b) => b.score - a.score);

    // Return the top 6 recommendations
    res.json(scoredGems.slice(0, 6));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error getting recommendations' });
  }
});

// 10. REVIEWS ANALYTICS DASHBOARD
app.get('/api/analytics', async (req, res) => {
  try {
    const allReviews = await Review.find({});
    const allGems = await Gem.find({});
    const allUsers = await User.find({});

    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
      : 0;

    // Vibe popularity breakdown: count reviews per vibe
    const vibeCounts = {};
    for (const rev of allReviews) {
      const gem = allGems.find(g => g.name === rev.gemName);
      if (gem) {
        gem.tags.forEach(tag => {
          vibeCounts[tag] = (vibeCounts[tag] || 0) + 1;
        });
      }
    }

    // Ratings distribution breakdown: 1 to 5 stars
    const ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(rev => {
      const rounded = Math.round(rev.rating);
      if (ratingsDistribution[rounded] !== undefined) {
        ratingsDistribution[rounded]++;
      }
    });

    // Leaderboard of active travellers by reward points
    // Map offline users/mongoose users to clean response format
    const leaderboard = allUsers
      .map(u => ({
        name: u.name,
        points: u.points,
        badge: getUserBadge(u.points),
        reviewsCount: allReviews.filter(r => r.userEmail === u.email).length
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    res.json({
      totalReviews,
      totalGems: allGems.length,
      avgRating,
      vibeCounts,
      ratingsDistribution,
      leaderboard
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error retrieving analytics data' });
  }
});

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 VibeCheck server is running at http://localhost:${PORT}`);
  });
});
