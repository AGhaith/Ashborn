import { useEffect, useState, useRef } from 'react';
import './index.css';

const DEFAULT_CONTENT = {
  heroEyebrow: "Established 1928",
  heroTitle: "The absolute pursuit\nof perfection.",
  heroImage: "/assets/images/hero_premium.png",
  philEyebrow: "Our Philosophy",
  philTitle: "Silence.\nTime.\nMastery.",
  philText1: "True luxury cannot be rushed. It is cultivated in darkness, refined by generations of hands, and revealed only to those who understand the value of patience.",
  philText2: "Every Ashborn creation is an uncompromising testament to the art of the smoke.",
  collEyebrow: "The Collection",
  collTitle: "Curated Masterpieces",
  cigar1Name: "No. 1 Classic",
  cigar1Desc: "Ecuadorian Shade. Refined Elegance.",
  cigar1Image: "/assets/images/cigar1.png",
  cigar2Name: "No. 2 Reserve",
  cigar2Desc: "San Andrés Maduro. Absolute Depth.",
  cigar2Image: "/assets/images/cigar2.png",
  cigar3Name: "No. 3 Signature",
  cigar3Desc: "Habano Oscuro. Unapologetic Power.",
  cigar3Image: "/assets/images/cigar3.png",
};

function App() {
  const [scrolled, setScrolled] = useState(false);
  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('ashborn_content');
    return saved ? JSON.parse(saved) : DEFAULT_CONTENT;
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    localStorage.setItem('ashborn_content', JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isAdmin) {
          setIsAdmin(false);
        } else {
          setShowPinModal(true);
          // Auto-focus first input when modal opens
          setTimeout(() => {
            if (inputRefs.current[0]) inputRefs.current[0].focus();
          }, 100);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  const handlePinChange = (index, value) => {
    const val = value.slice(-1);
    if (!/^\d*$/.test(val)) return;

    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);

    if (val && index < 3) {
      inputRefs.current[index + 1].focus();
    }

    if (index === 3 && val) {
      const fullPin = newPin.join('');
      setTimeout(() => {
        if (fullPin === '1234') {
          setIsAdmin(true);
          setShowPinModal(false);
        } else {
          alert('Incorrect PIN');
          inputRefs.current[0].focus();
        }
        setPin(['', '', '', '']);
      }, 200);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleChange = (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(reveal => {
      observer.observe(reveal);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      reveals.forEach(reveal => observer.unobserve(reveal));
    }
  }, []);

  return (
    <>
      {showPinModal && (
        <div className="pin-modal-overlay">
          <div className="pin-modal">
            <h3>Admin Access</h3>
            <p>Enter 4-digit PIN</p>
            <div className="pin-inputs">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="password"
                  value={digit}
                  onChange={e => handlePinChange(index, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(index, e)}
                />
              ))}
            </div>
            <div className="pin-actions">
              <button type="button" onClick={() => setShowPinModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="admin-sidebar">
          <div className="admin-header">
            <h3>Site Editor</h3>
            <button onClick={() => setIsAdmin(false)}>Close</button>
          </div>
          <div className="admin-fields">
            <h4>Hero Section</h4>
            <label>Subtitle</label>
            <input type="text" value={content.heroEyebrow} onChange={(e) => handleChange('heroEyebrow', e.target.value)} />
            <label>Title</label>
            <textarea value={content.heroTitle} onChange={(e) => handleChange('heroTitle', e.target.value)} />
            <label>Image URL</label>
            <input type="text" value={content.heroImage} onChange={(e) => handleChange('heroImage', e.target.value)} />

            <h4>Philosophy Section</h4>
            <label>Subtitle</label>
            <input type="text" value={content.philEyebrow} onChange={(e) => handleChange('philEyebrow', e.target.value)} />
            <label>Title</label>
            <textarea value={content.philTitle} onChange={(e) => handleChange('philTitle', e.target.value)} />
            <label>Paragraph 1</label>
            <textarea value={content.philText1} onChange={(e) => handleChange('philText1', e.target.value)} />
            <label>Paragraph 2</label>
            <textarea value={content.philText2} onChange={(e) => handleChange('philText2', e.target.value)} />

            <h4>Collection Hero</h4>
            <label>Subtitle</label>
            <input type="text" value={content.collEyebrow} onChange={(e) => handleChange('collEyebrow', e.target.value)} />
            <label>Title</label>
            <input type="text" value={content.collTitle} onChange={(e) => handleChange('collTitle', e.target.value)} />

            <h4>Cigar 1</h4>
            <label>Name</label>
            <input type="text" value={content.cigar1Name} onChange={(e) => handleChange('cigar1Name', e.target.value)} />
            <label>Description</label>
            <input type="text" value={content.cigar1Desc} onChange={(e) => handleChange('cigar1Desc', e.target.value)} />
            <label>Image URL</label>
            <input type="text" value={content.cigar1Image} onChange={(e) => handleChange('cigar1Image', e.target.value)} />

            <h4>Cigar 2</h4>
            <label>Name</label>
            <input type="text" value={content.cigar2Name} onChange={(e) => handleChange('cigar2Name', e.target.value)} />
            <label>Description</label>
            <input type="text" value={content.cigar2Desc} onChange={(e) => handleChange('cigar2Desc', e.target.value)} />
            <label>Image URL</label>
            <input type="text" value={content.cigar2Image} onChange={(e) => handleChange('cigar2Image', e.target.value)} />

            <h4>Cigar 3</h4>
            <label>Name</label>
            <input type="text" value={content.cigar3Name} onChange={(e) => handleChange('cigar3Name', e.target.value)} />
            <label>Description</label>
            <input type="text" value={content.cigar3Desc} onChange={(e) => handleChange('cigar3Desc', e.target.value)} />
            <label>Image URL</label>
            <input type="text" value={content.cigar3Image} onChange={(e) => handleChange('cigar3Image', e.target.value)} />
          </div>
        </div>
      )}

      <div className={`main-content ${isAdmin ? 'admin-active' : ''}`}>
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="logo">ASHBORN</div>
          <ul className="nav-links">
            <li><a href="#philosophy">Heritage</a></li>
            <li><a href="#collection">Collection</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>

        <header className="hero" id="home">
          <img src={content.heroImage} alt="Ashborn Hero" className="hero-bg" />
          <div className="hero-content reveal active">
            <span className="eyebrow">{content.heroEyebrow}</span>
            <h1 style={{ whiteSpace: 'pre-line' }}>{content.heroTitle}</h1>
          </div>
          <div className="scroll-indicator">Scroll to discover</div>
        </header>

        <section id="philosophy" className="philosophy section-padding">
          <div className="philosophy-grid container">
            <div className="reveal">
              <span className="eyebrow">{content.philEyebrow}</span>
              <h2 style={{ whiteSpace: 'pre-line' }}>{content.philTitle}</h2>
            </div>
            <div className="reveal">
              <p>{content.philText1}</p>
              <p>{content.philText2}</p>
            </div>
          </div>
        </section>

        <section id="collection" className="collection section-padding">
          <div className="container">
            <div className="text-center reveal">
              <span className="eyebrow">{content.collEyebrow}</span>
              <h2>{content.collTitle}</h2>
            </div>
            
            <div className="collection-grid mt-5">
              <div className="product-card reveal" style={{transitionDelay: '0s'}}>
                <div className="image-container">
                  <img src={content.cigar1Image} alt={content.cigar1Name} className="product-image" />
                </div>
                <h3>{content.cigar1Name}</h3>
                <p>{content.cigar1Desc}</p>
              </div>
              
              <div className="product-card reveal" style={{transitionDelay: '0.2s'}}>
                <div className="image-container">
                  <img src={content.cigar2Image} alt={content.cigar2Name} className="product-image" />
                </div>
                <h3>{content.cigar2Name}</h3>
                <p>{content.cigar2Desc}</p>
              </div>

              <div className="product-card reveal" style={{transitionDelay: '0.4s'}}>
                <div className="image-container">
                  <img src={content.cigar3Image} alt={content.cigar3Name} className="product-image" />
                </div>
                <h3>{content.cigar3Name}</h3>
                <p>{content.cigar3Desc}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-brand">ASHBORN</div>
          <div className="footer-legal">&copy; 2026 Ashborn. All rights reserved.</div>
        </footer>
      </div>
    </>
  );
}

export default App;
