import { useState } from 'react';
import { BiStar } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import './Menu.css';

const menuItems = [
  {
    name: 'Classic Pork Siomai',
    description: 'Our signature blend of seasoned pork wrapped in a delicate wonton wrapper.',
    price: '₱35',
    rating: 4.9,
    image: '/images/menu-pork.png',
    category: 'Classic',
    badge: 'Best Seller',
  },
  {
    name: 'Shrimp Siomai',
    description: 'Premium shrimp filling with a burst of ocean-fresh flavor in every bite.',
    price: '₱45',
    rating: 4.8,
    image: '/images/menu-shrimp.png',
    category: 'Premium',
    badge: null,
  },
  {
    name: 'Japanese Siomai',
    description: 'A fusion twist with Japanese seasonings and premium pork belly filling.',
    price: '₱50',
    rating: 4.7,
    image: '/images/menu-classic.png',
    category: 'Premium',
    badge: 'New',
  },
  {
    name: 'Siomai Rice Meal',
    description: 'Complete meal with 4pcs siomai, steamed rice, and your choice of sauce.',
    price: '₱65',
    rating: 4.9,
    image: '/images/menu-pork.png',
    category: 'Combos',
    badge: null,
  },
  {
    name: 'Chicken Siomai',
    description: 'Light and savory chicken filling — perfect for health-conscious diners.',
    price: '₱35',
    rating: 4.6,
    image: '/images/menu-shrimp.png',
    category: 'Classic',
    badge: null,
  },
  {
    name: 'Shanghai Siomai',
    description: 'Crispy fried spring roll meets siomai — the ultimate street food combo.',
    price: '₱40',
    rating: 4.7,
    image: '/images/menu-classic.png',
    category: 'Classic',
    badge: 'Popular',
  },
  {
    name: 'Iced Gulaman',
    description: 'Refreshing Filipino classic — sweet jelly with sago and brown sugar.',
    price: '₱25',
    rating: 4.5,
    image: '/images/menu-drinks.png',
    category: 'Drinks',
    badge: null,
  },
  {
    name: 'Mango Shake',
    description: 'Fresh Philippine mango blended into a creamy, ice-cold shake.',
    price: '₱35',
    rating: 4.8,
    image: '/images/menu-drinks.png',
    category: 'Drinks',
    badge: 'Refreshing',
  },
  {
    name: 'Beef Siomai',
    description: 'Juicy beef filling seasoned with garlic and a hint of sesame — a bold, savory bite.',
    price: '₱40',
    rating: 4.6,
    image: '/images/menu-pork.png',
    category: 'Premium',
    badge: null,
  },
  {
    name: 'Siomai Family Pack',
    description: '20pcs mixed siomai perfect for sharing — includes our Classic, Shrimp, and Chicken.',
    price: '₱120',
    rating: 4.9,
    image: '/images/menu-classic.png',
    category: 'Combos',
    badge: 'Value',
  },
  {
    name: 'Calamansi Juice',
    description: 'Freshly squeezed Filipino citrus — the perfect tangy companion to your siomai.',
    price: '₱20',
    rating: 4.7,
    image: '/images/menu-drinks.png',
    category: 'Drinks',
    badge: null,
  },
  {
    name: 'Tofu Siomai',
    description: 'A plant-based delight filled with seasoned tofu and vegetables — surprisingly delicious.',
    price: '₱30',
    rating: 4.5,
    image: '/images/menu-shrimp.png',
    category: 'Classic',
    badge: 'Vegan',
  },
];

const categories = ['All', 'Classic', 'Premium', 'Combos', 'Drinks'];

const MenuPage = () => {
  useScrollReveal();
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <main className="menu-page">
      {/* Page Hero */}
      <section className="menu-page-hero">
        <div className="menu-page-hero-overlay"></div>
        <div className="container">
          <div className="menu-page-hero-content reveal">
            <span className="section-badge">🍽️ Our Menu</span>
            <h1 className="menu-page-title">
              Every Bite is a <span className="text-gradient">Street Classic</span>
            </h1>
            <p className="menu-page-subtitle">
              From our beloved siomai staples to refreshing drinks and hearty combos —
              freshly made, always affordable, loved by millions.
            </p>
            <Link to="/application" className="btn btn-primary btn-lg">
              Franchise & Serve This Menu
            </Link>
          </div>
        </div>
      </section>

      {/* Full Menu */}
      <section className="menu-full section">
        <div className="container">
          <div className="menu-categories reveal">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`menu-category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="menu-grid">
            {filteredItems.map((item, index) => (
              <div className={`menu-card reveal reveal-delay-${(index % 4) + 1}`} key={item.name}>
                <div className="menu-card-image">
                  <img src={item.image} alt={item.name} loading="lazy" width="400" height="300" />
                  {item.badge && <span className="menu-card-badge">{item.badge}</span>}
                </div>
                <div className="menu-card-info">
                  <h3 className="menu-card-name">{item.name}</h3>
                  <p className="menu-card-description">{item.description}</p>
                  <div className="menu-card-footer">
                    <span className="menu-card-price">{item.price}</span>
                    <span className="menu-card-rating">
                      <BiStar className="star" />
                      {item.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default MenuPage;
