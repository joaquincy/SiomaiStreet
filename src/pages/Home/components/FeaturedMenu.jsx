import { useState } from 'react';
import { BiStar } from 'react-icons/bi';
import './FeaturedMenu.css';

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
];

const categories = ['All', 'Classic', 'Premium', 'Combos', 'Drinks'];

const FeaturedMenu = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <section className="featured-menu section" id="menu">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-badge">🍽️ Our Menu</span>
          <h2 className="section-title">
            <span className="text-gradient">Featured</span> Menu
          </h2>
          <p className="section-subtitle">
            From our signature Classic Pork Siomai to premium flavors and refreshing drinks —
            there's something for everyone.
          </p>
        </div>

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
            <div className={`menu-card reveal reveal-delay-${(index % 4) + 1}`} key={index}>
              <div className="menu-card-image">
                <img src={item.image} alt={item.name} />
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
  );
};

export default FeaturedMenu;
