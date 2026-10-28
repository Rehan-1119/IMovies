import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Movie, Theatre, Show, Booking } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies';

console.log('[Seed] Connecting to MongoDB at', mongoUri);
await mongoose.connect(mongoUri);

// Create Demo Admin & Demo User
const adminPassword = await bcrypt.hash('Admin123!', 10);
await User.updateOne(
  { email: 'admin@imovies.local' },
  {
    $set: {
      name: 'IMovies Admin',
      email: 'admin@imovies.local',
      password: adminPassword,
      role: 'admin',
      phone: '+91 98765 43210'
    }
  },
  { upsert: true }
);

const userPassword = await bcrypt.hash('User123!', 10);
await User.updateOne(
  { email: 'rehan@example.com' },
  {
    $set: {
      name: 'Rehan Khan',
      email: 'rehan@example.com',
      password: userPassword,
      role: 'user',
      phone: '+91 91234 56789'
    }
  },
  { upsert: true }
);

// Wipe existing Movies, Theatres, Shows to provide clean, rich modern data
await Movie.deleteMany({});
await Theatre.deleteMany({});
await Show.deleteMany({});
await Booking.deleteMany({});

const moviesData = [
  {
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family in an epic galactic war.',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1800&q=80',
    genre: ['Sci-Fi', 'Action', 'Adventure'],
    language: 'English',
    duration: 166,
    rating: 8.8,
    releaseDate: '2026-03-01',
    certification: 'UA 16+',
    status: 'now_showing'
  },
  {
    title: 'Interstellar: Remastered',
    description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers through a mysterious wormhole.',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=80',
    genre: ['Sci-Fi', 'Drama', 'Adventure'],
    language: 'English',
    duration: 169,
    rating: 8.9,
    releaseDate: '2026-02-15',
    certification: 'UA',
    status: 'now_showing'
  },
  {
    title: 'Jawan: Return',
    description: 'A high-octane emotional action thriller outlining the journey of a man driven by a personal vendetta to rectify the evils in the society.',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1800&q=80',
    genre: ['Action', 'Thriller'],
    language: 'Hindi',
    duration: 168,
    rating: 8.4,
    releaseDate: '2026-04-10',
    certification: 'UA 16+',
    status: 'now_showing'
  },
  {
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1800&q=80',
    genre: ['Biography', 'Drama', 'History'],
    language: 'English',
    duration: 180,
    rating: 8.9,
    releaseDate: '2026-01-20',
    certification: 'A',
    status: 'now_showing'
  },
  {
    title: 'Kalki 2898 AD',
    description: 'A modern avatar of Vishnu descends on earth to protect the world from evil forces in a futuristic cyberpunk world.',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=80',
    genre: ['Sci-Fi', 'Action', 'Mythology'],
    language: 'Hindi',
    duration: 181,
    rating: 8.6,
    releaseDate: '2026-05-01',
    certification: 'UA 16+',
    status: 'now_showing'
  },
  {
    title: 'Spider-Man: Beyond The Multiverse',
    description: 'Miles Morales catapults across the Multiverse to face off against powerful adversaries and save every universe.',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1800&q=80',
    genre: ['Animation', 'Action', 'Adventure'],
    language: 'English',
    duration: 140,
    rating: 8.9,
    releaseDate: '2026-06-15',
    certification: 'U',
    status: 'now_showing'
  }
];

const movies = await Movie.insertMany(moviesData);

const theatresData = [
  {
    name: 'PVR INOX Gold Class',
    city: 'Indore',
    address: 'Treasure Island Mall, MG Road',
    screens: [{ name: 'Screen 1', format: 'IMAX Laser' }, { name: 'Screen 2', format: 'Dolby Atmos' }],
    amenities: ['Recliner Seats', 'Gourmet Food', 'Dolby Atmos', 'Valet Parking']
  },
  {
    name: 'Cinepolis Megaplex',
    city: 'Indore',
    address: 'C21 Mall, Vijay Nagar',
    screens: [{ name: 'Screen 1', format: '4DX' }, { name: 'Screen 2', format: 'VIP Lounge' }],
    amenities: ['4DX Motion', 'Push Back Seats', 'Snack Bar']
  },
  {
    name: 'IMAX Wadala Carnival',
    city: 'Mumbai',
    address: 'Bhakti Park, Wadala East',
    screens: [{ name: 'Screen IMAX', format: 'IMAX 70mm' }, { name: 'Screen 2', format: 'RealD 3D' }],
    amenities: ['Giant Dome Screen', 'Dolby 7.1', 'Food Court']
  },
  {
    name: 'PVR Directors Cut',
    city: 'Delhi',
    address: 'Ambience Mall, Vasant Kunj',
    screens: [{ name: 'Luxury Audi 1', format: 'Dolby Vision' }],
    amenities: ['Fine Dining', 'Ultra Recliners', 'Dedicated Butler']
  }
];

const theatres = await Theatre.insertMany(theatresData);

const now = Date.now();
const hourOffsets = [2, 5, 8, 24, 28, 32];

function generateSeatGrid() {
  const seats = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isVip = r === 0;
    const isPremium = r === 1 || r === 2;
    const tier = isVip ? 'vip' : isPremium ? 'premium' : 'classic';
    const price = isVip ? 380 : isPremium ? 260 : 180;

    for (let c = 1; c <= 10; c++) {
      const isBooked = Math.random() < 0.18;
      seats.push({
        code: `${row}${c}`,
        row,
        number: c,
        tier,
        price,
        status: isBooked ? 'booked' : 'available'
      });
    }
  }
  return seats;
}

const showDocs = [];
for (const movie of movies) {
  for (const theatre of theatres) {
    const selectedTimes = [hourOffsets[Math.floor(Math.random() * 3)], hourOffsets[3 + Math.floor(Math.random() * 3)]];
    for (const offset of selectedTimes) {
      const startsAt = new Date(now + offset * 3600 * 1000);
      showDocs.push({
        movie: movie._id,
        theatre: theatre._id,
        screenName: theatre.screens[0]?.name + ' (' + (theatre.screens[0]?.format || 'Dolby Atmos') + ')',
        format: theatre.screens[0]?.format?.includes('IMAX') ? 'IMAX 3D' : '2D',
        startsAt,
        endsAt: new Date(startsAt.getTime() + movie.duration * 60 * 1000),
        price: 180,
        pricing: { classic: 180, premium: 260, vip: 380 },
        seats: generateSeatGrid()
      });
    }
  }
}

await Show.insertMany(showDocs);

console.log('✅ Seed successful!');
console.log(`- Created ${movies.length} blockbuster movies`);
console.log(`- Created ${theatres.length} luxury theatres`);
console.log(`- Scheduled ${showDocs.length} showtimes`);
console.log(`- Admin login: admin@imovies.local / Admin123!`);
console.log(`- Demo user login: rehan@example.com / User123!`);

await mongoose.disconnect();
