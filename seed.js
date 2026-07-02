const { connectDB, Gem, checkOfflineStatus } = require('./database');

const SEED_DESTINATIONS = [
  { key:'goa', label:'Goa', gems:[
    {name:'Cola Beach', area:'South Goa', tags:['nature','offbeat','photo'], rating:4.7, reviews:412, gem:0.88, blurb:'A lagoon-backed cove most tourists miss on the way to the bigger beaches.'},
    {name:'Mario Gallery', area:'Panjim', tags:['art','history'], rating:4.5, reviews:198, gem:0.7, blurb:'A quiet cartoon-and-print gallery tucked inside an old Goan house.'},
    {name:'Cabo de Rama Fort', area:'Canacona', tags:['history','offbeat','photo'], rating:4.6, reviews:301, gem:0.83, blurb:'Crumbling clifftop fort with almost nobody around at sunset.'},
    {name:'Curlies Backwater Kayak', area:'Anjuna', tags:['adventure','nature'], rating:4.4, reviews:156, gem:0.6, blurb:'Paddle through mangrove creeks away from the beach-party crowd.'}
  ]},
  { key:'kerala', label:'Kerala', gems:[
    {name:'Gavi Rainforest', area:'Pathanamthitta', tags:['nature','adventure','offbeat'], rating:4.8, reviews:264, gem:0.92, blurb:'Permit-only forest reserve with jeep trails and near-zero crowds.'},
    {name:'Wayanad Edakkal Caves', area:'Wayanad', tags:['history','adventure','photo'], rating:4.6, reviews:520, gem:0.65, blurb:'Prehistoric rock carvings reached by a short scramble up the hillside.'},
    {name:'Poovar Backwater Village', area:'Trivandrum', tags:['nature','wellness','offbeat'], rating:4.7, reviews:189, gem:0.8, blurb:'Golden sandbar where the backwaters meet the sea, quieter than Alleppey.'},
    {name:'Kalpetta Ayurveda Retreat', area:'Wayanad', tags:['wellness','spiritual'], rating:4.5, reviews:143, gem:0.72, blurb:'Small family-run centre doing traditional treatments without the resort price tag.'}
  ]},
  { key:'rajasthan', label:'Rajasthan', gems:[
    {name:'Kumbhalgarh Wall Walk', area:'near Udaipur', tags:['history','adventure','photo'], rating:4.8, reviews:377, gem:0.85, blurb:'Walk a stretch of the second-longest wall in the world, mostly to yourself.'},
    {name:'Nawalgarh Haveli Frescoes', area:'Shekhawati', tags:['art','history','offbeat'], rating:4.6, reviews:132, gem:0.9, blurb:'Open-air gallery of painted mansions in a town tour buses skip.'},
    {name:'Bishnoi Village Safari', area:'near Jodhpur', tags:['nature','offbeat'], rating:4.7, reviews:210, gem:0.86, blurb:'Morning jeep ride through blackbuck country and a village known for conservation.'},
    {name:'Chand Baori Stepwell', area:'Abhaneri', tags:['history','photo','spiritual'], rating:4.6, reviews:288, gem:0.66, blurb:'A dizzying 3,500-step geometric well, best visited at opening time.'}
  ]},
  { key:'himachal', label:'Himachal Pradesh', gems:[
    {name:'Jibhi Village', area:'Tirthan Valley', tags:['nature','offbeat','wellness'], rating:4.8, reviews:296, gem:0.9, blurb:'Wooden cottages, waterfalls and trout streams, quietly overtaking crowded Manali.'},
    {name:'Chitkul', area:'Sangla Valley', tags:['nature','adventure','photo'], rating:4.7, reviews:341, gem:0.78, blurb:'The last inhabited village before the Tibet border, ringed by peaks.'},
    {name:'Key Monastery', area:'Spiti Valley', tags:['spiritual','history','photo'], rating:4.8, reviews:187, gem:0.75, blurb:'A cliffside monastery in high-altitude desert, still lightly visited.'},
    {name:'Sainj Valley Trek', area:'Kullu', tags:['adventure','nature'], rating:4.6, reviews:98, gem:0.93, blurb:'A trekking valley just next to Great Himalayan National Park with almost no signage.'}
  ]},
  { key:'ladakh', label:'Ladakh', gems:[
    {name:'Turtuk Village', area:'Nubra Valley', tags:['offbeat','nature','history'], rating:4.8, reviews:214, gem:0.94, blurb:'A Balti village near the LoC, opened to tourists only in 2010.'},
    {name:'Tso Moriri Lake', area:'Changthang', tags:['nature','photo','offbeat'], rating:4.9, reviews:176, gem:0.88, blurb:'Higher, quieter, and bluer than Pangong, with a fraction of the visitors.'},
    {name:'Lamayuru Moonland Trail', area:'near Leh', tags:['adventure','nature','photo'], rating:4.6, reviews:245, gem:0.7, blurb:'Short walk through eroded badlands beside one of Ladakh\u2019s oldest monasteries.'},
    {name:'Hanle Dark Sky Reserve', area:'Changthang', tags:['nature','spiritual','offbeat'], rating:4.9, reviews:88, gem:0.96, blurb:'India\u2019s first dark sky reserve, remote enough to see the Milky Way clearly.'}
  ]},
  { key:'tamilnadu', label:'Tamil Nadu', gems:[
    {name:'Kanadukathan Chettinad Mansions', area:'Chettinad', tags:['art','history','offbeat'], rating:4.6, reviews:154, gem:0.85, blurb:'Belgian-glass mansions in a cluster of villages most travellers drive past.'},
    {name:'Yercaud Lake Loop', area:'Salem district', tags:['nature','wellness'], rating:4.5, reviews:203, gem:0.62, blurb:'A gentler, coffee-scented alternative to the crowded Ooty hills.'},
    {name:'Gangaikonda Cholapuram Temple', area:'near Kumbakonam', tags:['history','spiritual','photo'], rating:4.7, reviews:112, gem:0.87, blurb:'An 11th-century Chola capital temple with none of the queues of Thanjavur.'},
    {name:'Kodikkarai Bird Sanctuary', area:'Point Calimere', tags:['nature','offbeat'], rating:4.4, reviews:76, gem:0.9, blurb:'Coastal wetland on the migratory flyway, rarely crowded outside winter.'}
  ]},
  { key:'meghalaya', label:'Meghalaya', gems:[
    {name:'Mawlynnong Root Bridges', area:'East Khasi Hills', tags:['nature','adventure','offbeat'], rating:4.8, reviews:301, gem:0.72, blurb:'Living bridges grown from rubber tree roots, still tended by villagers.'},
    {name:'Krem Liat Prah Cave', area:'Jaintia Hills', tags:['adventure','nature'], rating:4.6, reviews:64, gem:0.95, blurb:'One of the longest cave systems in the subcontinent, guided treks only.'},
    {name:'Nongriat Double-Decker Bridge', area:'near Cherrapunji', tags:['nature','adventure','photo'], rating:4.9, reviews:410, gem:0.6, blurb:'A steep 3,500-step descent to a two-tier living root bridge.'},
    {name:'Dawki River', area:'near Bangladesh border', tags:['nature','photo','offbeat'], rating:4.7, reviews:198, gem:0.68, blurb:'Water so clear the boats appear to float mid-air.'}
  ]},
  { key:'uttarakhand', label:'Uttarakhand', gems:[
    {name:'Sattal Lakes', area:'near Nainital', tags:['nature','wellness','offbeat'], rating:4.7, reviews:224, gem:0.8, blurb:'A cluster of seven interconnected lakes in oak forest, calmer than Nainital town.'},
    {name:'Beatles Ashram', area:'Rishikesh', tags:['art','history','spiritual'], rating:4.5, reviews:389, gem:0.55, blurb:'Overgrown meditation domes covered in murals inside the forest reserve.'},
    {name:'Chopta Meadows', area:'Rudraprayag', tags:['nature','adventure','photo'], rating:4.8, reviews:267, gem:0.83, blurb:'Called \u201cmini Switzerland\u201d locally, a base for gentler high-altitude treks.'},
    {name:'Neelkanth Mahadev Trail', area:'near Rishikesh', tags:['spiritual','adventure'], rating:4.6, reviews:178, gem:0.66, blurb:'A forested pilgrim trail up to a Shiva temple with valley views.'}
  ]}
];

async function seed() {
  try {
    await connectDB();
    
    // Clear existing gems
    await Gem.deleteMany({});
    console.log('🧹 Cleared existing gems.');

    const gemsToInsert = [];
    for (const dest of SEED_DESTINATIONS) {
      for (const gem of dest.gems) {
        gemsToInsert.push({
          destination: dest.key,
          name: gem.name,
          area: gem.area,
          tags: gem.tags,
          rating: gem.rating,
          reviewsCount: gem.reviews,
          gem: gem.gem,
          blurb: gem.blurb
        });
      }
    }

    await Gem.insertMany(gemsToInsert);
    console.log(`✅ Successfully seeded ${gemsToInsert.length} hidden gems!`);
    
    if (checkOfflineStatus()) {
      console.log('💾 Data written to offline local database db.json.');
    } else {
      console.log('🗄️ Data written to MongoDB.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
}

seed();
