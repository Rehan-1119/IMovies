import React, { useEffect, useState, useRef } from 'react';
import { Link, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import {
  Film,
  Calendar,
  Clock,
  MapPin,
  Search,
  Star,
  ShieldCheck,
  Ticket,
  User as UserIcon,
  Sparkles,
  LogOut,
  CheckCircle2,
  ChevronRight,
  X,
  CreditCard,
  Popcorn,
  Share2,
  Printer,
  SlidersHorizontal,
  PlusCircle,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from './api.js';

// Realtime WebSockets for instant live seat availability
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('imovies_user'));
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// STANDALONE QR CODE COMPONENT (Vector SVG, works 100% offline)
// -------------------------------------------------------------
function QRCodeSvg({ value = 'IMOVIES-TICKET', size = 110 }) {
  // Deterministic pattern generation based on hash of string
  const hash = value.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0);
  const matrix = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      // Corner alignment markers
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) {
        if (r === 1 && c === 1) return false;
        if (r === 1 && c === 7) return false;
        if (r === 7 && c === 1) return false;
        return true;
      }
      return ((hash ^ (r * 11 + c * 17)) % 3) === 0;
    })
  );

  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges">
      <rect width="9" height="9" fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((active, c) => (active ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0b0c10" /> : null))
      )}
    </svg>
  );
}

// -------------------------------------------------------------
// MAIN APP COMPONENT
// -------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [selectedCity, setSelectedCity] = useState(localStorage.getItem('imovies_city') || 'All Cities');
  const [cities, setCities] = useState(['All Cities', 'Indore', 'Mumbai', 'Delhi', 'Bengaluru']);

  useEffect(() => {
    api.get('/cities').then(res => {
      if (Array.isArray(res.data) && res.data.length) {
        setCities(['All Cities', ...res.data]);
      }
    }).catch(() => {});
  }, []);

  function handleCityChange(city) {
    setSelectedCity(city);
    localStorage.setItem('imovies_city', city);
  }

  function signOut() {
    localStorage.removeItem('imovies_token');
    localStorage.removeItem('imovies_user');
    setUser(null);
    toast.info('Signed out of IMovies');
  }

  return (
    <>
      {/* Ultra-Classy Glassmorphism Navbar */}
      <nav className="navbar navbar-expand-lg glass-nav py-3">
        <div className="container">
          <Link className="navbar-brand" to="/">
            <Popcorn size={26} color="#ff2a5f" />
            <span>I<span style={{ color: '#ff2a5f' }}>MOVIES</span></span>
            <span className="brand-badge">19 PRO</span>
          </Link>

          <button
            className="navbar-toggler border-0 text-white"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navContent"
          >
            <SlidersHorizontal size={22} />
          </button>

          <div className="collapse navbar-collapse" id="navContent">
            {/* City Selector */}
            <div className="d-flex align-items-center ms-lg-4 my-2 my-lg-0">
              <MapPin size={16} className="text-danger me-2" />
              <select
                className="city-select"
                value={selectedCity}
                onChange={e => handleCityChange(e.target.value)}
              >
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <ul className="navbar-nav ms-auto align-items-lg-center gap-2 my-2 my-lg-0">
              <li className="nav-item">
                <Link to="/" className="nav-link-custom">
                  <Film size={16} /> Movies
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/theatres" className="nav-link-custom">
                  <MapPin size={16} /> Theatres
                </Link>
              </li>
              {user && (
                <li className="nav-item">
                  <Link to="/bookings" className="nav-link-custom">
                    <Ticket size={16} /> My Bookings
                  </Link>
                </li>
              )}
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link-custom">
                    <ShieldCheck size={16} className="text-warning" /> Admin
                  </Link>
                </li>
              )}

              <li className="nav-item ms-lg-2">
                {user ? (
                  <div className="d-flex align-items-center gap-2">
                    <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1 rounded-pill border border-secondary">
                      <UserIcon size={14} className="text-danger" />
                      <span className="small fw-bold text-white">{user.name.split(' ')[0]}</span>
                      {user.role === 'admin' && <span className="badge bg-warning text-dark small" style={{ fontSize: '0.65rem' }}>Admin</span>}
                    </div>
                    <button onClick={signOut} className="btn-cinema-outline py-1 px-3" title="Sign out">
                      <LogOut size={14} />
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="btn-cinema py-2 px-3">
                    <UserIcon size={16} /> Sign In
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content View */}
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Home selectedCity={selectedCity} />} />
          <Route path="/login" element={<Auth setUser={setUser} />} />
          <Route path="/movie/:id" element={<MoviePage selectedCity={selectedCity} />} />
          <Route path="/show/:id" element={<ShowPage user={user} />} />
          <Route path="/theatres" element={<TheatresPage selectedCity={selectedCity} />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
          <Route path="/admin" element={<AdminDashboard user={user} />} />
          <Route path="*" element={<div className="text-center py-5"><h2>Page not found</h2><Link to="/" className="btn-cinema mt-3">Back to Movies</Link></div>} />
        </Routes>
      </main>

      {/* Modern Luxury Cinema Footer */}
      <footer className="container py-5 mt-5 border-top border-secondary border-opacity-25">
        <div className="row g-4">
          <div className="col-md-4">
            <h5 className="font-heading mb-2">
              I<span style={{ color: '#ff2a5f' }}>MOVIES</span> 19
            </h5>
            <p className="small text-muted mb-3">
              The next-generation cinema ticketing experience. Featuring instant Razorpay checkout, live seat synchronisation, and digital ticket passes.
            </p>
            <div className="d-flex gap-2">
              <span className="badge-gold">⚡ Ultra-Fast Response</span>
              <span className="razorpay-badge">Razorpay Verified</span>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <p className="small fw-bold text-white text-uppercase mb-2">Explore</p>
            <ul className="list-unstyled small text-muted d-flex flex-column gap-2">
              <li><Link to="/" className="text-muted text-decoration-none">Now Showing</Link></li>
              <li><Link to="/theatres" className="text-muted text-decoration-none">Cinemas & Screens</Link></li>
              <li><Link to="/bookings" className="text-muted text-decoration-none">My Tickets</Link></li>
            </ul>
          </div>
          <div className="col-md-2 col-6">
            <p className="small fw-bold text-white text-uppercase mb-2">Offers & Perks</p>
            <ul className="list-unstyled small text-muted d-flex flex-column gap-2">
              <li><span className="text-muted">Use code <strong>CINEMA50</strong></span></li>
              <li><span className="text-muted">Use code <strong>FESTIVE100</strong></span></li>
              <li><span className="text-muted">Dummy UPI & Cards</span></li>
            </ul>
          </div>
          <div className="col-md-4">
            <p className="small fw-bold text-white text-uppercase mb-2">Developer Demo Notice</p>
            <p className="small text-muted mb-0">
              Payments are in dummy/test mode powered by Razorpay API and internal sandbox engine. No real currency is charged.
            </p>
          </div>
        </div>
      </footer>

      <ToastContainer position="bottom-right" theme="dark" autoClose={3500} />
    </>
  );
}

// -------------------------------------------------------------
// HOME PAGE: HERO SPOTLIGHT + FILTERED MOVIES
// -------------------------------------------------------------
function Home({ selectedCity }) {
  const [movies, setMovies] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeLang, setActiveLang] = useState('All');
  const [loading, setLoading] = useState(true);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const genres = ['All', 'Action', 'Sci-Fi', 'Drama', 'Adventure', 'Thriller', 'Animation'];
  const languages = ['All', 'Hindi', 'English'];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/movies'),
      api.get('/movies/featured')
    ])
      .then(([moviesRes, featRes]) => {
        setMovies(moviesRes.data.items || []);
        setFeatured(featRes.data.length ? featRes.data : moviesRes.data.items || []);
      })
      .catch(() => toast.error('Could not connect to cinema API.'))
      .finally(() => setLoading(false));
  }, []);

  // Filter movies based on search, genre, and language
  const filtered = movies.filter(m => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.genre && m.genre.some(g => g.toLowerCase().includes(search.toLowerCase())));
    const matchesGenre = activeGenre === 'All' || (m.genre && m.genre.includes(activeGenre));
    const matchesLang = activeLang === 'All' || m.language === activeLang;
    return matchesSearch && matchesGenre && matchesLang;
  });

  const currentHero = featured[spotlightIndex] || movies[0];

  return (
    <>
      {/* Featured Movie Spotlight Banner */}
      {currentHero && (
        <section
          className="hero-spotlight"
          style={{
            backgroundImage: `url(${currentHero.backdrop || currentHero.poster})`
          }}
        >
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge-gold">
                <Star size={13} fill="#f5ba42" /> {currentHero.rating} Rating
              </span>
              <span className="badge-cert">{currentHero.certification || 'UA 16+'}</span>
              <span className="badge-tag">{currentHero.language}</span>
              <span className="badge-tag">{currentHero.duration} min</span>
            </div>
            <h1 className="hero-title">{currentHero.title}</h1>
            <p className="hero-desc">{currentHero.description}</p>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Link to={`/movie/${currentHero._id}`} className="btn-cinema">
                <Ticket size={18} /> Book Tickets
              </Link>
              <Link to={`/movie/${currentHero._id}`} className="btn-cinema-outline">
                View Showtimes <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Discovery Header & Filters */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="badge-tag mb-1 d-inline-block">NOW SHOWING {selectedCity !== 'All Cities' && `IN ${selectedCity.toUpperCase()}`}</span>
          <h2 className="mb-0 font-heading">Explore Blockbusters</h2>
        </div>

        {/* Search Bar */}
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search movies, genres..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="btn btn-sm text-muted position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Genre & Language Filter Chips */}
      <div className="d-flex align-items-center gap-2 overflow-auto pb-3 mb-4">
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`filter-chip ${activeGenre === g ? 'active' : ''}`}
          >
            {g}
          </button>
        ))}
        <div className="border-start border-secondary mx-2" style={{ height: '22px' }} />
        {languages.map(l => (
          <button
            key={l}
            onClick={() => setActiveLang(l)}
            className={`filter-chip ${activeLang === l ? 'active' : ''}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status" />
          <p className="text-muted mt-3">Loading blockbuster movies...</p>
        </div>
      ) : (
        <div className="row g-4">
          {filtered.map(movie => (
            <div className="col-6 col-md-4 col-lg-3" key={movie._id}>
              <Link to={`/movie/${movie._id}`} className="movie-card-luxury">
                <div className="poster-box">
                  <img src={movie.poster} alt={movie.title} loading="lazy" />
                  <div className="poster-badge-top">
                    <span className="badge-cert">{movie.certification || 'UA'}</span>
                  </div>
                  <div className="poster-overlay-bottom">
                    <span className="badge-gold">
                      <Star size={12} fill="#f5ba42" /> {movie.rating}
                    </span>
                    <span className="small text-white fw-bold">{movie.duration}m</span>
                  </div>
                </div>
                <div className="movie-card-info">
                  <h3 className="movie-card-title">{movie.title}</h3>
                  <div className="movie-card-meta">
                    {movie.language} • {(movie.genre || []).slice(0, 2).join(', ')}
                  </div>
                  <div className="mt-auto">
                    <span className="btn-cinema w-100 py-2 small">
                      <Ticket size={14} /> Book Seats
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !filtered.length && (
        <div className="glass-panel text-center py-5 my-4">
          <Film size={40} className="text-muted mb-2" />
          <h4>No movies found</h4>
          <p className="text-muted">Try clearing your search query or selecting another genre filter.</p>
          <button onClick={() => { setSearch(''); setActiveGenre('All'); setActiveLang('All'); }} className="btn-cinema-outline mt-2">
            Reset Filters
          </button>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// THEATRES PAGE
// -------------------------------------------------------------
function TheatresPage({ selectedCity }) {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = selectedCity && selectedCity !== 'All Cities' ? `/theatres?city=${selectedCity}` : '/theatres';
    api.get(url)
      .then(res => setTheatres(res.data))
      .catch(() => toast.error('Could not load cinemas'))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  return (
    <>
      <div className="mb-4">
        <span className="badge-tag mb-1 d-inline-block">EXPERIENCE CINEMA LUXURY</span>
        <h2 className="font-heading">Premium Theatres & Megaplexes</h2>
        <p className="text-muted">Equipped with IMAX Laser, Dolby Atmos 7.1, 4DX motion, and VIP recliners.</p>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-danger" /></div>
      ) : (
        <div className="row g-4">
          {theatres.map(th => (
            <div className="col-md-6" key={th._id}>
              <div className="theatre-card h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h4 className="font-heading text-white mb-1">{th.name}</h4>
                    <p className="small text-muted mb-0 d-flex align-items-center gap-1">
                      <MapPin size={14} className="text-danger" /> {th.address}, {th.city}
                    </p>
                  </div>
                  <span className="badge bg-danger bg-opacity-25 text-danger px-2 py-1 small rounded">
                    {th.city}
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-2 my-3">
                  {(th.amenities || []).map(am => (
                    <span key={am} className="badge-tag">✓ {am}</span>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                  <span className="small text-muted">{th.screens?.length || 2} Screens Active</span>
                  <Link to="/" className="btn-cinema py-1 px-3 small">
                    Browse Shows <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// MOVIE DETAILS & SHOWTIME SELECTOR
// -------------------------------------------------------------
function MoviePage({ selectedCity }) {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Generate date tabs: Today, Tomorrow, +2 days, +3 days
  const dateTabs = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      offset: i,
      day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isoDate: d.toISOString().split('T')[0]
    };
  });

  useEffect(() => {
    setLoading(true);
    api.get(`/movies/${id}`)
      .then(res => setMovie(res.data))
      .catch(() => toast.error('Could not find movie'));

    api.get(`/shows?movie=${id}`)
      .then(res => setShows(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-danger" /></div>;
  if (!movie) return <div className="text-center py-5"><h3>Movie not found</h3><Link to="/" className="btn-cinema mt-2">Back to movies</Link></div>;

  // Filter shows by selected city (if city is not 'All Cities')
  const cityFilteredShows = shows.filter(s => {
    if (!selectedCity || selectedCity === 'All Cities') return true;
    return s.theatre?.city?.toLowerCase() === selectedCity.toLowerCase();
  });

  // Group shows by Theatre
  const showsByTheatre = cityFilteredShows.reduce((acc, show) => {
    const tId = show.theatre?._id || 'unknown';
    if (!acc[tId]) {
      acc[tId] = { theatre: show.theatre, shows: [] };
    }
    acc[tId].shows.push(show);
    return acc;
  }, {});

  return (
    <>
      {/* Immersive Header */}
      <div
        className="movie-backdrop-header"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(8,9,13,0.96) 20%, rgba(8,9,13,0.7) 100%), url(${movie.backdrop || movie.poster})`
        }}
      >
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <img src={movie.poster} alt={movie.title} className="movie-poster-large" />
          <div className="flex-grow-1" style={{ maxWidth: '680px' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge-cert">{movie.certification}</span>
              <span className="badge-gold">
                <Star size={14} fill="#f5ba42" /> {movie.rating} / 10
              </span>
              <span className="badge-tag">{movie.language}</span>
              <span className="badge-tag">{movie.duration} min</span>
            </div>
            <h1 className="font-heading mb-2 text-white" style={{ fontSize: '2.4rem' }}>{movie.title}</h1>
            <p className="text-danger fw-bold small mb-2">{(movie.genre || []).join(' • ')}</p>
            <p className="text-light text-opacity-75 mb-3" style={{ lineHeight: 1.6 }}>{movie.description}</p>
          </div>
        </div>
      </div>

      {/* Date Selector Strip */}
      <div className="mb-4">
        <h5 className="font-heading mb-3">Select Date</h5>
        <div className="date-strip">
          {dateTabs.map(tab => (
            <div
              key={tab.offset}
              onClick={() => setSelectedDayOffset(tab.offset)}
              className={`date-pill ${selectedDayOffset === tab.offset ? 'active' : ''}`}
            >
              <div className="day">{tab.day}</div>
              <div className="date">{tab.date}</div>
              <div className="day">{tab.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Theatres and Showtimes */}
      <div className="mb-5">
        <h4 className="font-heading mb-3">Available Theatres & Showtimes</h4>

        {Object.keys(showsByTheatre).length === 0 ? (
          <div className="glass-panel text-center py-5">
            <Popcorn size={36} className="text-muted mb-2" />
            <h5 className="text-white">No shows available in {selectedCity}</h5>
            <p className="text-muted small">Try switching your city dropdown to "All Cities" or check another day.</p>
          </div>
        ) : (
          Object.values(showsByTheatre).map(({ theatre, shows: tShows }) => (
            <div className="theatre-card" key={theatre?._id || Math.random()}>
              <div className="d-flex flex-wrap justify-content-between align-items-start mb-3 gap-2">
                <div>
                  <h5 className="font-heading text-white mb-1">{theatre?.name}</h5>
                  <p className="small text-muted mb-0 d-flex align-items-center gap-1">
                    <MapPin size={13} className="text-danger" /> {theatre?.address}, {theatre?.city}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <span className="badge-tag">⚡ M-Ticket</span>
                  <span className="badge-tag">Food & Beverage</span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-3">
                {tShows.map(show => {
                  const timeStr = new Date(show.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <Link
                      to={`/show/${show._id}`}
                      key={show._id}
                      className="showtime-btn"
                    >
                      <span className="time">{timeStr}</span>
                      <span className="format-sub">{show.screenName || 'Audi 1'}</span>
                      <span className="price-sub">₹{show.pricing?.classic || show.price} onwards</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// SHOW SEAT SELECTION & RAZORPAY CHECKOUT
// -------------------------------------------------------------
function ShowPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Load show details
  async function loadShow() {
    try {
      const res = await api.get(`/shows/${id}`);
      setShow(res.data);
    } catch {
      toast.error('Could not load show details');
    } finally {
      setLoading(false);
    }
  }

  // Socket.IO live seat synchronization
  useEffect(() => {
    loadShow();
    socket.connect();
    socket.emit('join-show', id);

    const onSeatsUpdate = () => {
      loadShow();
      toast.info('Live cinema seat availability updated');
    };

    socket.on('seats-updated', onSeatsUpdate);

    return () => {
      socket.off('seats-updated', onSeatsUpdate);
      socket.emit('leave-show', id);
      socket.disconnect();
    };
  }, [id]);

  function toggleSeat(seat) {
    if (seat.status !== 'available') return;
    const isSelected = selectedSeats.includes(seat.code);

    if (isSelected) {
      setSelectedSeats(prev => prev.filter(c => c !== seat.code));
    } else {
      if (selectedSeats.length >= 8) {
        toast.warning('Maximum 8 seats allowed per booking transaction.');
        return;
      }
      setSelectedSeats(prev => [...prev, seat.code]);
    }
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-danger" /></div>;
  if (!show) return <div className="text-center py-5"><h4>Show details unavailable</h4></div>;

  // Compute subtotal
  const selectedSeatObjects = show.seats.filter(s => selectedSeats.includes(s.code));
  const subtotal = selectedSeatObjects.reduce((acc, s) => acc + (s.price || show.price), 0);

  // Group seats by tier
  const vipSeats = show.seats.filter(s => s.tier === 'vip');
  const premiumSeats = show.seats.filter(s => s.tier === 'premium');
  const classicSeats = show.seats.filter(s => !s.tier || s.tier === 'classic');

  // Group seats by row helper
  function groupSeatsByRow(seatList) {
    const rows = {};
    seatList.forEach(s => {
      const r = s.row || s.code.charAt(0);
      if (!rows[r]) rows[r] = [];
      rows[r].push(s);
    });
    return rows;
  }

  return (
    <>
      {/* Show Breadcrumbs Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <span className="badge-tag mb-1 d-inline-block">SELECT YOUR CINEMA SEATS</span>
          <h2 className="font-heading mb-1 text-white">{show.movie?.title}</h2>
          <p className="small text-muted mb-0">
            {show.theatre?.name} • {show.screenName} • {new Date(show.startsAt).toLocaleString()}
          </p>
        </div>
        <Link to={`/movie/${show.movie?._id}`} className="btn-cinema-outline py-2 px-3 small">
          Change Show
        </Link>
      </div>

      {/* Main Seat Canvas */}
      <div className="seat-view-box mb-4">
        {/* Curved 3D Cinematic Screen */}
        <div className="cinema-screen-wrap">
          <div className="cinema-screen-curve" />
          <div className="screen-text">ALL EYES THIS WAY • CINEMA SCREEN</div>
        </div>

        {/* VIP Seats */}
        {vipSeats.length > 0 && (
          <div className="mb-4">
            <div className="tier-header">
              👑 VIP Recliner Lounge (₹{show.pricing?.vip || 380})
            </div>
            {Object.entries(groupSeatsByRow(vipSeats)).map(([rowLetter, seats]) => (
              <div className="seating-row" key={rowLetter}>
                <span className="row-label">{rowLetter}</span>
                {seats.map(seat => (
                  <button
                    key={seat.code}
                    disabled={seat.status !== 'available'}
                    onClick={() => toggleSeat(seat)}
                    className={`seat-btn tier-vip ${seat.status === 'booked' ? 'booked' : ''} ${selectedSeats.includes(seat.code) ? 'selected' : ''}`}
                    title={`${seat.code} - ₹${seat.price}`}
                  >
                    {seat.number || seat.code.slice(1)}
                  </button>
                ))}
                <span className="row-label">{rowLetter}</span>
              </div>
            ))}
          </div>
        )}

        {/* Premium Seats */}
        {premiumSeats.length > 0 && (
          <div className="mb-4">
            <div className="tier-header">
              💎 Premium Club (₹{show.pricing?.premium || 260})
            </div>
            {Object.entries(groupSeatsByRow(premiumSeats)).map(([rowLetter, seats]) => (
              <div className="seating-row" key={rowLetter}>
                <span className="row-label">{rowLetter}</span>
                {seats.map(seat => (
                  <button
                    key={seat.code}
                    disabled={seat.status !== 'available'}
                    onClick={() => toggleSeat(seat)}
                    className={`seat-btn ${seat.status === 'booked' ? 'booked' : ''} ${selectedSeats.includes(seat.code) ? 'selected' : ''}`}
                    title={`${seat.code} - ₹${seat.price}`}
                  >
                    {seat.number || seat.code.slice(1)}
                  </button>
                ))}
                <span className="row-label">{rowLetter}</span>
              </div>
            ))}
          </div>
        )}

        {/* Classic Seats */}
        {classicSeats.length > 0 && (
          <div className="mb-4">
            <div className="tier-header">
              🎟️ Classic Standard (₹{show.pricing?.classic || 180})
            </div>
            {Object.entries(groupSeatsByRow(classicSeats)).map(([rowLetter, seats]) => (
              <div className="seating-row" key={rowLetter}>
                <span className="row-label">{rowLetter}</span>
                {seats.map(seat => (
                  <button
                    key={seat.code}
                    disabled={seat.status !== 'available'}
                    onClick={() => toggleSeat(seat)}
                    className={`seat-btn ${seat.status === 'booked' ? 'booked' : ''} ${selectedSeats.includes(seat.code) ? 'selected' : ''}`}
                    title={`${seat.code} - ₹${seat.price}`}
                  >
                    {seat.number || seat.code.slice(1)}
                  </button>
                ))}
                <span className="row-label">{rowLetter}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seating Legend */}
        <div className="d-flex justify-content-center align-items-center gap-4 flex-wrap mt-4 pt-3 border-top border-secondary border-opacity-25 small text-muted">
          <div className="d-flex align-items-center gap-2">
            <div className="seat-btn" style={{ width: '22px', height: '22px', cursor: 'default' }} />
            <span>Available</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="seat-btn selected" style={{ width: '22px', height: '22px', cursor: 'default' }} />
            <span className="text-white">Selected</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="seat-btn booked" style={{ width: '22px', height: '22px', cursor: 'default' }} />
            <span>Booked / Reserved</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="seat-btn tier-vip" style={{ width: '22px', height: '22px', cursor: 'default' }} />
            <span>VIP Recliner</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Booking Checkout Bar */}
      {selectedSeats.length > 0 && (
        <div className="sticky-booking-bar">
          <div>
            <div className="small text-muted">Selected Seats:</div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <strong className="text-white font-heading" style={{ fontSize: '1.2rem' }}>
                {selectedSeats.join(', ')}
              </strong>
              <span className="badge-tag">({selectedSeats.length} Tickets)</span>
            </div>
            <div className="small text-danger fw-bold mt-1">Subtotal: ₹{subtotal}</div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button
              onClick={() => {
                if (!user) {
                  toast.info('Please sign in or create an account to proceed.');
                  navigate('/login');
                  return;
                }
                setIsCheckoutOpen(true);
              }}
              className="btn-cinema py-3 px-4 font-heading"
            >
              <CreditCard size={18} /> Pay with Razorpay • ₹{subtotal + selectedSeats.length * 20}
            </button>
          </div>
        </div>
      )}

      {/* Razorpay Checkout Modal */}
      {isCheckoutOpen && (
        <RazorpayCheckoutModal
          show={show}
          selectedSeats={selectedSeats}
          user={user}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={booking => {
            setIsCheckoutOpen(false);
            navigate(`/confirmation/${booking._id}`);
          }}
        />
      )}
    </>
  );
}

// -------------------------------------------------------------
// RAZORPAY CHECKOUT MODAL & DUMMY/TEST PAYMENT SIMULATOR
// -------------------------------------------------------------
function RazorpayCheckoutModal({ show, selectedSeats, user, onClose, onSuccess }) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customer, setCustomer] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '+91 98765 43210'
  });
  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi | card | netbanking

  // Subtotal calculation
  const seatObjects = show.seats.filter(s => selectedSeats.includes(s.code));
  const subtotal = seatObjects.reduce((acc, s) => acc + (s.price || show.price), 0);
  const convenienceFee = selectedSeats.length * 20;
  const grandTotal = Math.max(1, subtotal + convenienceFee - discount);

  function applyCoupon() {
    const code = promoCode.trim().toUpperCase();
    if (code === 'CINEMA50' || code === 'IMOVIES50') {
      setDiscount(50);
      setAppliedPromo(code);
      toast.success('Promo code CINEMA50 applied! ₹50 discount');
    } else if (code === 'FESTIVE100' || code === 'BLOCKBUSTER') {
      setDiscount(100);
      setAppliedPromo(code);
      toast.success('Promo code FESTIVE100 applied! ₹100 discount');
    } else {
      toast.error('Invalid promo code. Try CINEMA50 or FESTIVE100');
    }
  }

  // Trigger Razorpay Payment Flow
  async function handlePay() {
    setIsProcessing(true);
    try {
      // 1. Create order on backend
      const { data: orderData } = await api.post('/payment/create-order', {
        showId: show._id,
        seats: selectedSeats,
        promoCode: appliedPromo
      });

      // 2. Check if official window.Razorpay script loaded and ready
      if (window.Razorpay && orderData.keyId && !orderData.isSimulated) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'IMovies 19 Cinema',
          description: `${show.movie?.title} (${selectedSeats.length} Seats)`,
          image: show.movie?.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100',
          order_id: orderData.orderId,
          prefill: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone
          },
          theme: { color: '#ff2a5f' },
          handler: async function (response) {
            // Verify payment on backend
            await verifyAndConfirmBooking({
              orderId: response.razorpay_order_id || orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              method: 'Razorpay Official Checkout'
            });
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              toast.info('Payment window closed');
            }
          }
        };

        const rzpInstance = new window.Razorpay(options);
        rzpInstance.on('payment.failed', function (resp) {
          toast.error(resp.error?.description || 'Payment rejected by bank');
          setIsProcessing(false);
        });
        rzpInstance.open();
        return;
      }

      // 3. Built-in Razorpay Test Payment Simulator (Fast, instant, guaranteed)
      // Simulates real payment latency with authentic transaction IDs
      await new Promise(r => setTimeout(r, 1200));

      const fakePaymentId = `pay_rzp_test_${Math.random().toString(36).substring(2, 10)}`;
      const fakeSignature = `demo_sig_${Math.random().toString(36).substring(2, 12)}`;

      await verifyAndConfirmBooking({
        orderId: orderData.orderId,
        paymentId: fakePaymentId,
        signature: fakeSignature,
        method: `Razorpay (${paymentMethod.toUpperCase()} Test Mode)`
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment processing failed');
      setIsProcessing(false);
    }
  }

  async function verifyAndConfirmBooking({ orderId, paymentId, signature, method }) {
    try {
      const { data: confirmData } = await api.post('/payment/verify-and-book', {
        showId: show._id,
        seats: selectedSeats,
        orderId,
        paymentId,
        signature,
        paymentMethod: method,
        promoCode: appliedPromo,
        customerInfo: customer
      });

      toast.success('Payment verified! Booking confirmed.');
      onSuccess(confirmData.booking);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking confirmation failed');
      setIsProcessing(false);
    }
  }

  return (
    <div className="modal-cinema-backdrop">
      <div className="modal-cinema-content p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <span className="razorpay-badge">Razorpay</span>
            <h4 className="font-heading mb-0 text-white">Secure Checkout</h4>
          </div>
          <button onClick={onClose} className="btn btn-sm text-muted border-0 bg-transparent">
            <X size={20} />
          </button>
        </div>

        {/* Order Details Header */}
        <div className="bg-dark bg-opacity-50 p-3 rounded-3 mb-3 border border-secondary border-opacity-25">
          <h5 className="font-heading text-white mb-1">{show.movie?.title}</h5>
          <p className="small text-muted mb-1">
            {show.theatre?.name} • {show.screenName}
          </p>
          <div className="d-flex justify-content-between small text-white">
            <span>Seats: <strong>{selectedSeats.join(', ')}</strong></span>
            <span>Time: <strong>{new Date(show.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">Ticket Delivery Information</label>
          <div className="row g-2">
            <div className="col-6">
              <input
                className="form-control cinema-input"
                placeholder="Full Name"
                value={customer.name}
                onChange={e => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div className="col-6">
              <input
                className="form-control cinema-input"
                placeholder="Mobile (+91)"
                value={customer.phone}
                onChange={e => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Promo Code Strip */}
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">Have a promo code?</label>
          <div className="d-flex gap-2">
            <input
              className="form-control cinema-input text-uppercase"
              placeholder="e.g. CINEMA50"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
            />
            <button onClick={applyCoupon} className="btn-cinema-outline py-2 px-3">
              Apply
            </button>
          </div>
          <div className="small text-muted mt-1">Try: <span className="text-danger fw-bold">CINEMA50</span> (₹50 off) or <span className="text-danger fw-bold">FESTIVE100</span> (₹100 off)</div>
        </div>

        {/* Payment Method Selector */}
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">Select Payment Mode</label>
          <div className="d-flex flex-column gap-2">
            <div
              onClick={() => setPaymentMethod('upi')}
              className={`payment-method-card ${paymentMethod === 'upi' ? 'active' : ''}`}
            >
              <div className="d-flex align-items-center gap-2">
                <Sparkles size={16} className="text-danger" />
                <span className="small fw-bold text-white">UPI / QR (Google Pay, PhonePe, Paytm)</span>
              </div>
              <span className="badge bg-success bg-opacity-25 text-success small">Instant</span>
            </div>

            <div
              onClick={() => setPaymentMethod('card')}
              className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
            >
              <div className="d-flex align-items-center gap-2">
                <CreditCard size={16} className="text-info" />
                <span className="small fw-bold text-white">Credit / Debit Card (Visa, MasterCard, RuPay)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="border-top border-secondary border-opacity-25 pt-2 mb-3 small">
          <div className="d-flex justify-content-between text-muted mb-1">
            <span>Ticket Price ({selectedSeats.length} seats)</span>
            <span>₹{subtotal}</span>
          </div>
          <div className="d-flex justify-content-between text-muted mb-1">
            <span>Convenience & Booking Fee</span>
            <span>₹{convenienceFee}</span>
          </div>
          {discount > 0 && (
            <div className="d-flex justify-content-between text-success mb-1">
              <span>Coupon Discount ({appliedPromo})</span>
              <span>-₹{discount}</span>
            </div>
          )}
          <div className="d-flex justify-content-between text-white fw-bold font-heading fs-5 border-top border-secondary border-opacity-25 pt-2 mt-2">
            <span>Grand Total</span>
            <span style={{ color: '#ff2a5f' }}>₹{grandTotal}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="btn-cinema w-100 py-3 font-heading"
        >
          {isProcessing ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" />
              Processing Razorpay Payment...
            </>
          ) : (
            <>
              <ShieldCheck size={18} /> Pay ₹{grandTotal} & Confirm Ticket
            </>
          )}
        </button>

        <p className="text-center small text-muted mt-2 mb-0" style={{ fontSize: '0.72rem' }}>
          🔒 256-Bit SSL Encrypted Razorpay Sandbox Checkout. Safe & Instant.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// BOOKING CONFIRMATION & DIGITAL TICKET PASS
// -------------------------------------------------------------
function ConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fire celebration confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    api.get(`/bookings/${bookingId}`)
      .then(res => setBooking(res.data))
      .catch(() => toast.error('Booking details not found'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-danger" /></div>;
  if (!booking) return <div className="text-center py-5"><h4>Booking not found</h4></div>;

  const show = booking.show || {};
  const movie = show.movie || {};
  const theatre = show.theatre || {};

  return (
    <div className="py-4">
      <div className="text-center mb-4">
        <CheckCircle2 size={54} className="text-success mb-2" />
        <h2 className="font-heading text-white">Booking Confirmed!</h2>
        <p className="text-muted">A confirmation SMS & Email has been simulated to {booking.customerInfo?.email || 'your email'}.</p>
      </div>

      {/* Tear-away Digital Boarding Pass */}
      <div className="ticket-pass" id="printableTicket">
        <div className="ticket-header">
          <div>
            <h5 className="font-heading mb-0">IMOVIES 19 PASS</h5>
            <span className="small opacity-75">Boarding Code: {booking.bookingCode}</span>
          </div>
          <span className="badge bg-black bg-opacity-50 text-white border border-white border-opacity-25 px-2 py-1 small">
            {booking.payment?.status?.toUpperCase() || 'PAID'}
          </span>
        </div>

        <div className="ticket-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <img
              src={movie.poster}
              alt={movie.title}
              style={{ width: '65px', height: '90px', objectFit: 'cover', borderRadius: '8px' }}
            />
            <div>
              <h4 className="font-heading text-white mb-1">{movie.title}</h4>
              <p className="small text-muted mb-0">{movie.language} • {movie.certification} • {movie.duration}m</p>
              <p className="small text-danger fw-bold mb-0">{theatre.name}</p>
            </div>
          </div>

          <div className="row g-2 mb-3 bg-dark bg-opacity-40 p-2 rounded-3 border border-secondary border-opacity-25 small">
            <div className="col-6">
              <span className="text-muted d-block">Date & Time</span>
              <strong className="text-white">{new Date(show.startsAt).toLocaleDateString()} at {new Date(show.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
            <div className="col-6">
              <span className="text-muted d-block">Screen</span>
              <strong className="text-white">{show.screenName || 'Audi 1'}</strong>
            </div>
            <div className="col-6 mt-2">
              <span className="text-muted d-block">Seats</span>
              <strong className="text-danger fs-6">{booking.seats.map(s => (typeof s === 'string' ? s : s.code)).join(', ')}</strong>
            </div>
            <div className="col-6 mt-2">
              <span className="text-muted d-block">Payment ID</span>
              <strong className="text-white small text-truncate d-block">{booking.payment?.paymentId || 'RAZORPAY_DEMO'}</strong>
            </div>
          </div>
        </div>

        {/* Ticket Perforation */}
        <div className="ticket-perforation">
          <div className="ticket-perforation-line" />
        </div>

        <div className="ticket-body d-flex justify-content-between align-items-center pt-2">
          <div>
            <span className="small text-muted d-block">Total Paid</span>
            <h3 className="font-heading text-white mb-0" style={{ color: '#ff2a5f' }}>₹{booking.total}</h3>
            <span className="small text-muted" style={{ fontSize: '0.7rem' }}>Includes GST & Fees</span>
          </div>

          <div className="qr-box text-center">
            <QRCodeSvg value={`IMOVIES:${booking.bookingCode}:${booking.total}`} size={90} />
            <div className="text-dark small fw-bold mt-1" style={{ fontSize: '0.62rem' }}>SCAN AT GATE</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-center gap-3 no-print mt-4">
        <button onClick={() => window.print()} className="btn-cinema-outline py-2 px-3">
          <Printer size={16} /> Print Ticket Pass
        </button>
        <Link to="/bookings" className="btn-cinema py-2 px-3">
          <Ticket size={16} /> Go to My Bookings
        </Link>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// USER BOOKINGS PAGE
// -------------------------------------------------------------
function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadBookings() {
    api.get('/bookings/mine')
      .then(res => setBookings(res.data))
      .catch(() => toast.error('Could not load your bookings'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking(id) {
    if (!window.confirm('Are you sure you want to cancel this booking? A refund will be initiated.')) return;
    try {
      await api.post(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled and refund initiated.');
      loadBookings();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancellation failed');
    }
  }

  return (
    <>
      <div className="mb-4">
        <span className="badge-tag mb-1 d-inline-block">YOUR CINEMA HISTORY</span>
        <h2 className="font-heading">My Bookings & Passes</h2>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-danger" /></div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel text-center py-5">
          <Ticket size={42} className="text-muted mb-2" />
          <h4 className="text-white">No bookings yet</h4>
          <p className="text-muted">You have not booked any movie tickets yet.</p>
          <Link to="/" className="btn-cinema mt-2">Browse Movies</Link>
        </div>
      ) : (
        <div className="row g-4">
          {bookings.map(b => {
            const show = b.show || {};
            const movie = show.movie || {};
            const isConfirmed = b.status === 'confirmed';

            return (
              <div className="col-md-6" key={b._id}>
                <div className="glass-panel p-4 h-100 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h4 className="font-heading text-white mb-1">{movie.title || 'Movie'}</h4>
                      <p className="small text-muted mb-0">{show.theatre?.name} • {show.theatre?.city}</p>
                    </div>
                    <span className={`badge ${isConfirmed ? 'bg-success' : 'bg-danger'} bg-opacity-25 ${isConfirmed ? 'text-success' : 'text-danger'} px-2 py-1 small rounded`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="row g-2 mb-3 bg-dark bg-opacity-40 p-3 rounded-3 small">
                    <div className="col-6">
                      <span className="text-muted d-block">Showtime</span>
                      <strong className="text-white">{new Date(show.startsAt).toLocaleString()}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Seats</span>
                      <strong className="text-danger">{b.seats.map(s => (typeof s === 'string' ? s : s.code)).join(', ')}</strong>
                    </div>
                    <div className="col-6 mt-2">
                      <span className="text-muted d-block">Booking Code</span>
                      <strong className="text-white">{b.bookingCode || 'IMV-TICKET'}</strong>
                    </div>
                    <div className="col-6 mt-2">
                      <span className="text-muted d-block">Amount Paid</span>
                      <strong className="text-white">₹{b.total} ({b.payment?.gateway || 'Razorpay'})</strong>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 d-flex justify-content-between align-items-center">
                    <Link to={`/confirmation/${b._id}`} className="btn-cinema-outline py-1 px-3 small">
                      <Printer size={14} /> View Digital Pass
                    </Link>
                    {isConfirmed && new Date(show.startsAt) > new Date() && (
                      <button onClick={() => cancelBooking(b._id)} className="btn btn-sm btn-outline-danger">
                        Cancel & Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// AUTHENTICATION: SIGN IN / REGISTER WITH 1-CLICK DEMO LOGIN
// -------------------------------------------------------------
function Auth({ setUser }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem('imovies_token', data.token);
      localStorage.setItem('imovies_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome to IMovies, ${data.user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    }
  }


  return (
    <div className="row justify-content-center py-4">
      <div className="col-md-6 col-lg-5">
        <div className="glass-panel p-4 p-md-5">
          <div className="text-center mb-4">
            <Popcorn size={38} className="text-danger mb-2" />
            <h2 className="font-heading text-white">
              {mode === 'login' ? 'Sign in to IMovies' : 'Create an Account'}
            </h2>
            <p className="small text-muted">
              {mode === 'login' ? 'Enter your cinema credentials below' : 'Join IMovies to book seats & earn loyalty discounts'}
            </p>
          </div>


          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="form-label small text-muted mb-1">Full Name</label>
                  <input
                    className="form-control cinema-input"
                    placeholder="e.g. Rahul Sharma"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label small text-muted mb-1">Mobile Number</label>
                  <input
                    className="form-control cinema-input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <label className="form-label small text-muted mb-1">Email Address</label>
              <input
                className="form-control cinema-input"
                type="email"
                placeholder="name@example.com"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label small text-muted mb-1">Password</label>
              <input
                className="form-control cinema-input"
                type="password"
                placeholder="At least 6 characters"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-cinema w-100 py-3 mt-2 font-heading">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="btn btn-link text-muted small text-decoration-none"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// ADMIN DASHBOARD: FULL CINEMA OPERATIONS SUITE
// -------------------------------------------------------------
function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Form states
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    poster: '',
    backdrop: '',
    language: 'Hindi',
    duration: 120,
    rating: 8.0,
    genre: 'Action, Thriller',
    certification: 'UA 16+'
  });

  const [theatreForm, setTheatreForm] = useState({
    name: '',
    city: 'Indore',
    address: '',
    amenities: 'IMAX Laser, Dolby Atmos, Recliners'
  });

  const [showForm, setShowForm] = useState({
    movie: '',
    theatre: '',
    startsAt: '',
    screenName: 'Audi 1 (IMAX)',
    rows: 6,
    columns: 10,
    classicPrice: 180,
    premiumPrice: 260,
    vipPrice: 380
  });

  function loadAll() {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/movies?limit=50').then(r => setMovies(r.data.items)).catch(() => {});
    api.get('/theatres').then(r => setTheatres(r.data)).catch(() => {});
    api.get('/admin/bookings').then(r => setBookings(r.data)).catch(() => {});
  }

  useEffect(() => {
    if (user?.role === 'admin') loadAll();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="glass-panel text-center py-5 my-4">
        <ShieldCheck size={48} className="text-warning mb-2" />
        <h3 className="text-white">Admin Privileges Required</h3>
        <p className="text-muted">Please sign in using the demo admin account: admin@imovies.local / Admin123!</p>
        <Link to="/login" className="btn-cinema mt-2">Sign In as Admin</Link>
      </div>
    );
  }

  async function handleAddMovie(e) {
    e.preventDefault();
    try {
      await api.post('/admin/movies', {
        ...movieForm,
        duration: Number(movieForm.duration),
        rating: Number(movieForm.rating),
        genre: movieForm.genre.split(',').map(s => s.trim()).filter(Boolean)
      });
      toast.success('Movie created successfully!');
      setMovieForm({ title: '', description: '', poster: '', backdrop: '', language: 'Hindi', duration: 120, rating: 8.0, genre: 'Action', certification: 'UA 16+' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating movie');
    }
  }

  async function handleDeleteMovie(id) {
    if (!window.confirm('Delete this movie?')) return;
    try {
      await api.delete(`/admin/movies/${id}`);
      toast.success('Movie deleted');
      loadAll();
    } catch {
      toast.error('Could not delete movie');
    }
  }

  async function handleAddTheatre(e) {
    e.preventDefault();
    try {
      await api.post('/admin/theatres', {
        ...theatreForm,
        amenities: theatreForm.amenities.split(',').map(s => s.trim()).filter(Boolean)
      });
      toast.success('Theatre registered!');
      setTheatreForm({ name: '', city: 'Indore', address: '', amenities: 'IMAX Laser, Dolby Atmos, Recliners' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding theatre');
    }
  }

  async function handleScheduleShow(e) {
    e.preventDefault();
    try {
      await api.post('/admin/shows', showForm);
      toast.success('Show scheduled with custom seat matrix!');
      setShowForm({ ...showForm, startsAt: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule show');
    }
  }

  return (
    <div className="py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <span className="badge-tag mb-1 d-inline-block">CONTROL CENTRE</span>
          <h2 className="font-heading mb-0 text-white">Cinema Operations & Analytics</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4 overflow-auto pb-2">
        <button onClick={() => setActiveTab('stats')} className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}>
          <Layers size={16} /> Overview & Analytics
        </button>
        <button onClick={() => setActiveTab('movies')} className={`admin-tab ${activeTab === 'movies' ? 'active' : ''}`}>
          <Film size={16} /> Movies ({movies.length})
        </button>
        <button onClick={() => setActiveTab('theatres')} className={`admin-tab ${activeTab === 'theatres' ? 'active' : ''}`}>
          <MapPin size={16} /> Theatres ({theatres.length})
        </button>
        <button onClick={() => setActiveTab('shows')} className={`admin-tab ${activeTab === 'shows' ? 'active' : ''}`}>
          <Clock size={16} /> Schedule Shows
        </button>
        <button onClick={() => setActiveTab('bookings')} className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}>
          <Ticket size={16} /> Bookings ({bookings.length})
        </button>
      </div>

      {/* Overview Stats */}
      {activeTab === 'stats' && (
        <div className="row g-4">
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <span className="small text-muted text-uppercase fw-bold">Total Revenue</span>
              <div className="val" style={{ color: '#ff2a5f' }}>₹{stats?.revenue || 0}</div>
              <span className="small text-success">Via Razorpay Online</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <span className="small text-muted text-uppercase fw-bold">Total Tickets Sold</span>
              <div className="val text-white">{stats?.totalBookings || 0}</div>
              <span className="small text-muted">Confirmed passes</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <span className="small text-muted text-uppercase fw-bold">Active Movies</span>
              <div className="val text-white">{stats?.movies || 0}</div>
              <span className="small text-muted">Catalog size</span>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stat-card">
              <span className="small text-muted text-uppercase fw-bold">Theatres Registered</span>
              <div className="val text-white">{stats?.theatres || 0}</div>
              <span className="small text-muted">Across Indian hubs</span>
            </div>
          </div>
        </div>
      )}

      {/* Movies Management */}
      {activeTab === 'movies' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="font-heading mb-3 text-white">Add New Movie</h4>
              <form onSubmit={handleAddMovie} className="d-flex flex-column gap-3">
                <input
                  className="form-control cinema-input"
                  placeholder="Movie Title"
                  required
                  value={movieForm.title}
                  onChange={e => setMovieForm({ ...movieForm, title: e.target.value })}
                />
                <textarea
                  className="form-control cinema-input"
                  rows="3"
                  placeholder="Synopsis / Description"
                  value={movieForm.description}
                  onChange={e => setMovieForm({ ...movieForm, description: e.target.value })}
                />
                <input
                  className="form-control cinema-input"
                  placeholder="Poster Image URL"
                  value={movieForm.poster}
                  onChange={e => setMovieForm({ ...movieForm, poster: e.target.value })}
                />
                <input
                  className="form-control cinema-input"
                  placeholder="Backdrop Banner Image URL"
                  value={movieForm.backdrop}
                  onChange={e => setMovieForm({ ...movieForm, backdrop: e.target.value })}
                />
                <div className="row g-2">
                  <div className="col">
                    <input
                      className="form-control cinema-input"
                      placeholder="Language"
                      value={movieForm.language}
                      onChange={e => setMovieForm({ ...movieForm, language: e.target.value })}
                    />
                  </div>
                  <div className="col">
                    <input
                      className="form-control cinema-input"
                      type="number"
                      placeholder="Duration (m)"
                      value={movieForm.duration}
                      onChange={e => setMovieForm({ ...movieForm, duration: e.target.value })}
                    />
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col">
                    <input
                      className="form-control cinema-input"
                      type="number"
                      step="0.1"
                      placeholder="Rating (0-10)"
                      value={movieForm.rating}
                      onChange={e => setMovieForm({ ...movieForm, rating: e.target.value })}
                    />
                  </div>
                  <div className="col">
                    <input
                      className="form-control cinema-input"
                      placeholder="Cert (UA 16+)"
                      value={movieForm.certification}
                      onChange={e => setMovieForm({ ...movieForm, certification: e.target.value })}
                    />
                  </div>
                </div>
                <input
                  className="form-control cinema-input"
                  placeholder="Genres (comma separated)"
                  value={movieForm.genre}
                  onChange={e => setMovieForm({ ...movieForm, genre: e.target.value })}
                />
                <button type="submit" className="btn-cinema w-100 py-2">
                  <PlusCircle size={16} /> Save Movie to Catalog
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="font-heading mb-3 text-white">Active Catalog ({movies.length})</h4>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {movies.map(m => (
                  <div key={m._id} className="d-flex align-items-center justify-content-between p-2 rounded-2 border border-secondary border-opacity-25 bg-dark bg-opacity-30">
                    <div className="d-flex align-items-center gap-3">
                      <img src={m.poster} alt={m.title} style={{ width: '40px', height: '55px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <strong className="text-white d-block">{m.title}</strong>
                        <span className="small text-muted">{m.language} • {m.duration}m • ★ {m.rating}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteMovie(m._id)} className="btn btn-sm btn-outline-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theatres Management */}
      {activeTab === 'theatres' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="font-heading mb-3 text-white">Register Theatre</h4>
              <form onSubmit={handleAddTheatre} className="d-flex flex-column gap-3">
                <input
                  className="form-control cinema-input"
                  placeholder="Theatre Name (e.g. PVR INOX Gold Class)"
                  required
                  value={theatreForm.name}
                  onChange={e => setTheatreForm({ ...theatreForm, name: e.target.value })}
                />
                <input
                  className="form-control cinema-input"
                  placeholder="City (e.g. Indore, Mumbai, Delhi)"
                  required
                  value={theatreForm.city}
                  onChange={e => setTheatreForm({ ...theatreForm, city: e.target.value })}
                />
                <input
                  className="form-control cinema-input"
                  placeholder="Mall / Area Address"
                  value={theatreForm.address}
                  onChange={e => setTheatreForm({ ...theatreForm, address: e.target.value })}
                />
                <input
                  className="form-control cinema-input"
                  placeholder="Amenities (comma separated)"
                  value={theatreForm.amenities}
                  onChange={e => setTheatreForm({ ...theatreForm, amenities: e.target.value })}
                />
                <button type="submit" className="btn-cinema w-100 py-2">
                  Add Theatre
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4">
              <h4 className="font-heading mb-3 text-white">Registered Theatres ({theatres.length})</h4>
              <div className="d-flex flex-column gap-2">
                {theatres.map(th => (
                  <div key={th._id} className="p-3 rounded-2 border border-secondary border-opacity-25 bg-dark bg-opacity-30">
                    <div className="d-flex justify-content-between align-items-center">
                      <strong className="text-white fs-6">{th.name}</strong>
                      <span className="badge bg-danger bg-opacity-25 text-danger small">{th.city}</span>
                    </div>
                    <p className="small text-muted mb-1">{th.address}</p>
                    <div className="d-flex gap-1 flex-wrap">
                      {(th.amenities || []).map(a => (
                        <span key={a} className="badge-tag" style={{ fontSize: '0.65rem' }}>{a}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Shows */}
      {activeTab === 'shows' && (
        <div className="glass-panel p-4" style={{ maxWidth: '640px' }}>
          <h4 className="font-heading mb-3 text-white">Schedule New Show Session</h4>
          <form onSubmit={handleScheduleShow} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label small text-muted mb-1">Select Movie</label>
              <select
                className="form-control cinema-input"
                required
                value={showForm.movie}
                onChange={e => setShowForm({ ...showForm, movie: e.target.value })}
              >
                <option value="">-- Choose Movie --</option>
                {movies.map(m => (
                  <option key={m._id} value={m._id}>{m.title} ({m.language})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label small text-muted mb-1">Select Theatre</label>
              <select
                className="form-control cinema-input"
                required
                value={showForm.theatre}
                onChange={e => setShowForm({ ...showForm, theatre: e.target.value })}
              >
                <option value="">-- Choose Theatre --</option>
                {theatres.map(t => (
                  <option key={t._id} value={t._id}>{t.name} ({t.city})</option>
                ))}
              </select>
            </div>

            <div className="row g-2">
              <div className="col-7">
                <label className="form-label small text-muted mb-1">Show Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-control cinema-input"
                  required
                  value={showForm.startsAt}
                  onChange={e => setShowForm({ ...showForm, startsAt: e.target.value })}
                />
              </div>
              <div className="col-5">
                <label className="form-label small text-muted mb-1">Audi / Screen</label>
                <input
                  className="form-control cinema-input"
                  value={showForm.screenName}
                  onChange={e => setShowForm({ ...showForm, screenName: e.target.value })}
                />
              </div>
            </div>

            <div className="row g-2">
              <div className="col-4">
                <label className="form-label small text-muted mb-1">Classic ₹</label>
                <input
                  type="number"
                  className="form-control cinema-input"
                  value={showForm.classicPrice}
                  onChange={e => setShowForm({ ...showForm, classicPrice: e.target.value })}
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-muted mb-1">Premium ₹</label>
                <input
                  type="number"
                  className="form-control cinema-input"
                  value={showForm.premiumPrice}
                  onChange={e => setShowForm({ ...showForm, premiumPrice: e.target.value })}
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-muted mb-1">VIP Recliner ₹</label>
                <input
                  type="number"
                  className="form-control cinema-input"
                  value={showForm.vipPrice}
                  onChange={e => setShowForm({ ...showForm, vipPrice: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-cinema py-3 mt-2 font-heading">
              Publish Show & Generate Seating Matrix
            </button>
          </form>
        </div>
      )}

      {/* Bookings View */}
      {activeTab === 'bookings' && (
        <div className="glass-panel p-4">
          <h4 className="font-heading mb-3 text-white">Live Transactions Log ({bookings.length})</h4>
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle small">
              <thead>
                <tr className="text-muted">
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Movie</th>
                  <th>Theatre</th>
                  <th>Seats</th>
                  <th>Total</th>
                  <th>Payment ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td><strong className="text-white">{b.bookingCode || '—'}</strong></td>
                    <td>{b.user?.name || b.customerInfo?.name || 'Customer'}<br /><span className="text-muted" style={{ fontSize: '0.7rem' }}>{b.user?.email || b.customerInfo?.email}</span></td>
                    <td>{b.show?.movie?.title || '—'}</td>
                    <td>{b.show?.theatre?.name || '—'}</td>
                    <td><span className="badge bg-secondary">{b.seats?.map(s => (typeof s === 'string' ? s : s.code)).join(', ')}</span></td>
                    <td><strong className="text-danger">₹{b.total}</strong></td>
                    <td><span className="small text-muted font-monospace">{b.payment?.paymentId || 'DEMO_PAID'}</span></td>
                    <td>
                      <span className={`badge ${b.status === 'confirmed' ? 'bg-success' : 'bg-danger'} bg-opacity-25 ${b.status === 'confirmed' ? 'text-success' : 'text-danger'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
