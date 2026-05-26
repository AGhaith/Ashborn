import { useEffect, useState, useRef } from 'react';
import './index.css';
import HeroCanvas from './components/HeroCanvas';
import SmokeOverlay from './components/SmokeOverlay';
import { getVideoBlob, saveVideoBlob, deleteVideoBlob } from './utils/db';

const DEFAULT_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

const DEFAULT_CONTENT = {
  heroEyebrow: "Established 1928",
  heroTitle: "The absolute pursuit\nof perfection.",
  heroImage: "/assets/images/cream_hero.png",
  philEyebrow: "Our Philosophy",
  philTitle: "Silence.\nTime.\nMastery.",
  philText1: "True luxury cannot be rushed. It is cultivated in darkness, refined by generations of hands, and revealed only to those who understand the value of patience.",
  philText2: "Every Ashborn creation is an uncompromising testament to the art of the smoke.",
  videoEyebrow: "The Cinematic Experience",
  videoTitle: "A Symphony of\nSmoke and Time",
  collEyebrow: "The Collection",
  collTitle: "Curated Masterpieces",
  cigar1Name: "No. 1 Classic",
  cigar1Desc: "Ecuadorian Shade. Refined Elegance.",
  cigar1Image: "/assets/images/cigar1.png?v=2",
  cigar2Name: "No. 2 Reserve",
  cigar2Desc: "San Andrés Maduro. Absolute Depth.",
  cigar2Image: "/assets/images/cigar2.png?v=2",
  cigar3Name: "No. 3 Signature",
  cigar3Desc: "Habano Oscuro. Unapologetic Power.",
  cigar3Image: "/assets/images/cigar3.png?v=2",
  allocEyebrow: "Private Allocation Registry",
  allocTitle: "Apply for Allocation",
  allocIntro: "Due to the rare nature of our tobacco leaves and the time required for aging, Ashborn production is strictly limited. Admission to the allocation registry is by application only and does not guarantee approval.",
  cigar1Availability: "Highly Limited",
  cigar1AllocDesc: "Ecuadorian Shade. Refined elegance with tasting notes of cream, cedar, and white pepper.",
  cigar2Availability: "Reserved Allocation",
  cigar2AllocDesc: "San Andrés Maduro. Deep complexity with notes of dark cacao, leather, and espresso.",
  cigar3Availability: "Extremely Rare",
  cigar3AllocDesc: "Habano Oscuro. Unapologetic power featuring notes of black pepper, rich soil, and dark honey.",
};

const ImageUploadField = ({ id, label, recommendedSize, value, onChange, onFocus, onBlur, isHighlight }) => {
  return (
    <div id={id} className={`premium-upload-field ${isHighlight ? 'focused' : ''}`}>
      <div className="upload-header">
        <label>{label}</label>
        <span className="upload-hint">{recommendedSize}</span>
      </div>
      <div className="upload-preview-container" onFocus={onFocus} onBlur={onBlur} tabIndex="0">
        <img src={value} alt="Preview" className="upload-preview-image" />
        <label className="upload-overlay">
          <span>Replace Image</span>
          <input type="file" accept="image/*" onChange={onChange} style={{display: 'none'}} />
        </label>
      </div>
    </div>
  );
};

function App() {
  const [scrolled, setScrolled] = useState(false);
  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('ashborn_content');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Restore heroImage if it was lost from local storage during the canvas test
      if (!parsed.heroImage || parsed.heroImage.includes('editorial_hero') || parsed.heroImage.includes('leaf_realistic') || parsed.heroImage.includes('hero_premium') || parsed.heroImage.includes('silky_hero')) {
        parsed.heroImage = DEFAULT_CONTENT.heroImage;
      }
      
      // Fix broken .jpg collection images in local storage and force v2 paths
      if (parsed.cigar1Image && (!parsed.cigar1Image.includes('v=2') || parsed.cigar1Image.endsWith('.jpg'))) parsed.cigar1Image = DEFAULT_CONTENT.cigar1Image;
      if (parsed.cigar2Image && (!parsed.cigar2Image.includes('v=2') || parsed.cigar2Image.endsWith('.jpg'))) parsed.cigar2Image = DEFAULT_CONTENT.cigar2Image;
      if (parsed.cigar3Image && (!parsed.cigar3Image.includes('v=2') || parsed.cigar3Image.endsWith('.jpg'))) parsed.cigar3Image = DEFAULT_CONTENT.cigar3Image;

      return { ...DEFAULT_CONTENT, ...parsed };
    }
    return DEFAULT_CONTENT;
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef([]);
  const [activeField, setActiveField] = useState(null);

  const [adminTab, setAdminTab] = useState('home_editor'); // 'home_editor', 'alloc_editor', 'registry'
  const [view, setView] = useState('home'); // 'home' or 'allocation'
  const [fadeState, setFadeState] = useState('fade-in');
  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem('ashborn_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  // Load custom video from IndexedDB on mount
  useEffect(() => {
    let activeUrl = null;
    getVideoBlob().then(blob => {
      if (blob) {
        activeUrl = URL.createObjectURL(blob);
        setVideoUrl(activeUrl);
      }
    }).catch(err => {
      console.error("Failed to load video from IndexedDB", err);
    });

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, []);

  const navigateToView = (newView) => {
    if (newView === view) return;
    setFadeState('fade-out');
    setTimeout(() => {
      setView(newView);
      window.scrollTo(0, 0);
      setFadeState('fade-in');
    }, 500);
  };

  // Allocation Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedBlend, setSelectedBlend] = useState(() => content.cigar1Name || 'No. 1 Classic');
  const [quantity, setQuantity] = useState(1);
  const [tier, setTier] = useState('Collector'); // 'Connoisseur', 'Collector', 'Privé'
  const [intent, setIntent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    localStorage.setItem('ashborn_content', JSON.stringify(content));
  }, [content]);

  useEffect(() => {
    localStorage.setItem('ashborn_requests', JSON.stringify(requests));
  }, [requests]);

  const handleAllocationSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !email) {
      alert("Please provide your name and email address.");
      return;
    }
    const newRequest = {
      id: Date.now().toString(),
      fullName,
      email,
      selectedBlend,
      quantity,
      tier,
      intent,
      timestamp: new Date().toLocaleString()
    };
    setRequests(prev => [newRequest, ...prev]);
    setSubmitted(true);
  };

  const resetAllocationForm = () => {
    setFullName('');
    setEmail('');
    setSelectedBlend(content.cigar1Name || 'No. 1 Classic');
    setQuantity(1);
    setTier('Collector');
    setIntent('');
    setSubmitted(false);
  };

  const handleDeleteRequest = (id) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAllRequests = () => {
    if (window.confirm("Are you sure you want to clear all allocation requests?")) {
      setRequests([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isAdmin) {
          setIsAdmin(false);
          setActiveField(null);
        } else {
          setShowPinModal(true);
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

  const handleFocus = (key) => {
    setActiveField(key);
    
    const isAllocField = [
      'allocEyebrow', 'allocTitle', 'allocIntro',
      'cigar1Availability', 'cigar1AllocDesc',
      'cigar2Availability', 'cigar2AllocDesc',
      'cigar3Availability', 'cigar3AllocDesc'
    ].includes(key);

    if (isAllocField) {
      setView('allocation');
    } else {
      setView('home');
    }

    setTimeout(() => {
      const el = document.getElementById(`field-${key}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleBlur = () => {
    setActiveField(null);
  };

  const handleImageUpload = (key, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        try {
          handleChange(key, dataUrl);
        } catch {
          alert("Image too large to save. Try a smaller file.");
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert("Please upload a valid video file.");
      return;
    }

    try {
      await saveVideoBlob(file);
      
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      const newUrl = URL.createObjectURL(file);
      setVideoUrl(newUrl);
      setIsPlaying(true);
      setIsMuted(true);
      
      alert("Video uploaded and saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save video to browser database. Try a smaller file.");
    }
  };

  const handleRemoveVideo = async () => {
    if (window.confirm("Are you sure you want to revert to the default cinematic video?")) {
      try {
        await deleteVideoBlob();
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        setIsPlaying(true);
        setIsMuted(true);
      } catch (err) {
        console.error(err);
        alert("Failed to remove video.");
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Play failed: ", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (!element) return;

    // Offset for the fixed navbar if desired, here we just go exactly to the section
    const targetPosition = element.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 1400; // 1.4 seconds for an ultra-premium, slow ease
    let start = null;

    // Quartic easing in/out - acceleration until halfway, then deceleration
    const easeInOutQuart = time => time < 0.5 ? 8 * time * time * time * time : 1 - Math.pow(-2 * time + 2, 4) / 2;

    const animation = currentTime => {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const progress = Math.min(timeElapsed / duration, 1);
      
      const ease = easeInOutQuart(progress);
      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
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
  }, [view]);

  // Helper to attach focus/blur quickly
  const inputProps = (key) => ({
    id: `input-${key}`,
    onFocus: () => handleFocus(key),
    onBlur: handleBlur,
    onChange: (e) => handleChange(key, e.target.value)
  });

  const handleElementHover = (key) => {
    if (!isAdmin) return;
    setActiveField(key);
    
    const isAllocField = [
      'allocEyebrow', 'allocTitle', 'allocIntro',
      'cigar1Availability', 'cigar1AllocDesc',
      'cigar2Availability', 'cigar2AllocDesc',
      'cigar3Availability', 'cigar3AllocDesc'
    ].includes(key);
    
    setAdminTab(isAllocField ? 'alloc_editor' : 'home_editor');
    
    setTimeout(() => {
      const inputEl = document.getElementById(`input-${key}`);
      if (inputEl) {
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  const handleElementLeave = () => {
    if (!isAdmin) return;
    const activeElId = document.activeElement?.id;
    if (activeElId && activeElId.startsWith('input-')) {
      const activeKey = activeElId.replace('input-', '');
      setActiveField(activeKey);
    } else {
      setActiveField(null);
    }
  };

  const hoverProps = (key) => ({
    onMouseEnter: () => handleElementHover(key),
    onMouseLeave: handleElementLeave,
    onClick: () => {
      if (!isAdmin) return;
      const inputEl = document.getElementById(`input-${key}`);
      if (inputEl) {
        if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
          inputEl.focus();
          inputEl.select?.();
        } else {
          const fileInput = inputEl.querySelector('input[type="file"]');
          if (fileInput) {
            fileInput.click();
          } else {
            inputEl.focus();
          }
        }
      }
    }
  });

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
              <button type="button" onClick={() => { setShowPinModal(false); setPin(['','','','']); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={`admin-sidebar ${isAdmin ? 'open' : ''}`}>
        <div className="admin-header">
          <h3>Site Admin</h3>
          <button onClick={() => { setIsAdmin(false); setActiveField(null); }}>Close</button>
        </div>
        <div className="admin-tabs">
          <button 
            className={adminTab === 'home_editor' ? 'active' : ''} 
            onClick={() => { setAdminTab('home_editor'); setView('home'); }}
          >
            Home
          </button>
          <button 
            className={adminTab === 'alloc_editor' ? 'active' : ''} 
            onClick={() => { setAdminTab('alloc_editor'); setView('allocation'); }}
          >
            Allocation
          </button>
          <button 
            className={adminTab === 'registry' ? 'active' : ''} 
            onClick={() => setAdminTab('registry')}
          >
            Requests ({requests.length})
          </button>
        </div>

        {adminTab === 'home_editor' && (
          <div className="admin-fields">
            <div className="admin-field-group">
              <h4>Hero Section</h4>
              <div className="admin-field-item">
                <label>Subtitle</label>
                <input type="text" value={content.heroEyebrow} {...inputProps('heroEyebrow')} />
              </div>
              <div className="admin-field-item">
                <label>Title</label>
                <textarea value={content.heroTitle} {...inputProps('heroTitle')} />
              </div>
              <ImageUploadField 
                id="input-heroImage"
                label="Hero Image" 
                recommendedSize="Recommended: 1920x1080px"
                value={content.heroImage} 
                isHighlight={activeField === 'heroImage'}
                onFocus={() => handleFocus('heroImage')}
                onBlur={handleBlur}
                onChange={(e) => handleImageUpload('heroImage', e.target.files[0])}
              />
            </div>

            <div className="admin-field-group">
              <h4>Philosophy Section</h4>
              <div className="admin-field-item">
                <label>Subtitle</label>
                <input type="text" value={content.philEyebrow} {...inputProps('philEyebrow')} />
              </div>
              <div className="admin-field-item">
                <label>Title</label>
                <textarea value={content.philTitle} {...inputProps('philTitle')} />
              </div>
              <div className="admin-field-item">
                <label>Paragraph 1</label>
                <textarea value={content.philText1} {...inputProps('philText1')} />
              </div>
              <div className="admin-field-item">
                <label>Paragraph 2</label>
                <textarea value={content.philText2} {...inputProps('philText2')} />
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Cinematic Video</h4>
              <div className="admin-field-item">
                <label>Subtitle</label>
                <input type="text" value={content.videoEyebrow || ''} {...inputProps('videoEyebrow')} />
              </div>
              <div className="admin-field-item">
                <label>Title</label>
                <textarea value={content.videoTitle || ''} {...inputProps('videoTitle')} />
              </div>
              <div className="premium-upload-field">
                <div className="upload-header">
                  <label>Campaign Video</label>
                  <span className="upload-hint">MP4 or WebM</span>
                </div>
                <div 
                  id="input-videoCampaign" 
                  className={`video-upload-preview-container ${activeField === 'videoCampaign' ? 'focused' : ''}`}
                  onFocus={() => handleFocus('videoCampaign')} 
                  onBlur={handleBlur} 
                  tabIndex="0"
                >
                  {videoUrl ? (
                    <video src={videoUrl} className="upload-preview-video" muted playsInline autoPlay loop />
                  ) : (
                    <div className="upload-preview-video-placeholder">
                      <span>Default Video Active</span>
                    </div>
                  )}
                  <label className="upload-overlay">
                    <span>{videoUrl ? "Replace Video" : "Upload Video"}</span>
                    <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} style={{display: 'none'}} />
                  </label>
                </div>
                {videoUrl && (
                  <button 
                    type="button" 
                    className="delete-video-btn" 
                    onClick={handleRemoveVideo}
                  >
                    Remove Custom Video
                  </button>
                )}
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Collection Hero</h4>
              <div className="admin-field-item">
                <label>Subtitle</label>
                <input type="text" value={content.collEyebrow} {...inputProps('collEyebrow')} />
              </div>
              <div className="admin-field-item">
                <label>Title</label>
                <input type="text" value={content.collTitle} {...inputProps('collTitle')} />
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Cigar 1 ({content.cigar1Name || 'No. 1 Classic'})</h4>
              <div className="admin-field-item">
                <label>Name</label>
                <input type="text" value={content.cigar1Name} {...inputProps('cigar1Name')} />
              </div>
              <div className="admin-field-item">
                <label>Description</label>
                <input type="text" value={content.cigar1Desc} {...inputProps('cigar1Desc')} />
              </div>
              <ImageUploadField 
                id="input-cigar1Image"
                label="Product Image" 
                recommendedSize="Recommended: 800x1000px"
                value={content.cigar1Image} 
                isHighlight={activeField === 'cigar1Image'}
                onFocus={() => handleFocus('cigar1Image')}
                onBlur={handleBlur}
                onChange={(e) => handleImageUpload('cigar1Image', e.target.files[0])}
              />
            </div>

            <div className="admin-field-group">
              <h4>Cigar 2 ({content.cigar2Name || 'No. 2 Reserve'})</h4>
              <div className="admin-field-item">
                <label>Name</label>
                <input type="text" value={content.cigar2Name} {...inputProps('cigar2Name')} />
              </div>
              <div className="admin-field-item">
                <label>Description</label>
                <input type="text" value={content.cigar2Desc} {...inputProps('cigar2Desc')} />
              </div>
              <ImageUploadField 
                id="input-cigar2Image"
                label="Product Image" 
                recommendedSize="Recommended: 800x1000px"
                value={content.cigar2Image} 
                isHighlight={activeField === 'cigar2Image'}
                onFocus={() => handleFocus('cigar2Image')}
                onBlur={handleBlur}
                onChange={(e) => handleImageUpload('cigar2Image', e.target.files[0])}
              />
            </div>

            <div className="admin-field-group">
              <h4>Cigar 3 ({content.cigar3Name || 'No. 3 Signature'})</h4>
              <div className="admin-field-item">
                <label>Name</label>
                <input type="text" value={content.cigar3Name} {...inputProps('cigar3Name')} />
              </div>
              <div className="admin-field-item">
                <label>Description</label>
                <input type="text" value={content.cigar3Desc} {...inputProps('cigar3Desc')} />
              </div>
              <ImageUploadField 
                id="input-cigar3Image"
                label="Product Image" 
                recommendedSize="Recommended: 800x1000px"
                value={content.cigar3Image} 
                isHighlight={activeField === 'cigar3Image'}
                onFocus={() => handleFocus('cigar3Image')}
                onBlur={handleBlur}
                onChange={(e) => handleImageUpload('cigar3Image', e.target.files[0])}
              />
            </div>
          </div>
        )}

        {adminTab === 'alloc_editor' && (
          <div className="admin-fields">
            <div className="admin-field-group">
              <h4>Allocation Page General</h4>
              <div className="admin-field-item">
                <label>Subtitle</label>
                <input type="text" value={content.allocEyebrow} {...inputProps('allocEyebrow')} />
              </div>
              <div className="admin-field-item">
                <label>Title</label>
                <input type="text" value={content.allocTitle} {...inputProps('allocTitle')} />
              </div>
              <div className="admin-field-item">
                <label>Introduction</label>
                <textarea value={content.allocIntro} {...inputProps('allocIntro')} />
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Cigar 1 Allocation ({content.cigar1Name || 'No. 1 Classic'})</h4>
              <div className="admin-field-item">
                <label>Allocation Status</label>
                <input type="text" value={content.cigar1Availability} {...inputProps('cigar1Availability')} />
              </div>
              <div className="admin-field-item">
                <label>Allocation Description</label>
                <textarea value={content.cigar1AllocDesc} {...inputProps('cigar1AllocDesc')} />
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Cigar 2 Allocation ({content.cigar2Name || 'No. 2 Reserve'})</h4>
              <div className="admin-field-item">
                <label>Allocation Status</label>
                <input type="text" value={content.cigar2Availability} {...inputProps('cigar2Availability')} />
              </div>
              <div className="admin-field-item">
                <label>Allocation Description</label>
                <textarea value={content.cigar2AllocDesc} {...inputProps('cigar2AllocDesc')} />
              </div>
            </div>

            <div className="admin-field-group">
              <h4>Cigar 3 Allocation ({content.cigar3Name || 'No. 3 Signature'})</h4>
              <div className="admin-field-item">
                <label>Allocation Status</label>
                <input type="text" value={content.cigar3Availability} {...inputProps('cigar3Availability')} />
              </div>
              <div className="admin-field-item">
                <label>Allocation Description</label>
                <textarea value={content.cigar3AllocDesc} {...inputProps('cigar3AllocDesc')} />
              </div>
            </div>
          </div>
        )}

        {adminTab === 'registry' && (
          <div className="admin-requests-list">
            <div className="admin-requests-header">
              <h4>Registry Queue</h4>
              {requests.length > 0 && (
                <button className="clear-all-btn" onClick={handleClearAllRequests}>Clear All</button>
              )}
            </div>
            
            {requests.length === 0 ? (
              <p className="no-requests-msg">No allocation requests registered yet.</p>
            ) : (
              <div className="requests-container">
                {requests.map((req) => (
                  <div key={req.id} className={`admin-request-card tier-${req.tier.toLowerCase()}`}>
                    <div className="request-card-header">
                      <h5>{req.fullName}</h5>
                      <button className="delete-request-btn" onClick={() => handleDeleteRequest(req.id)}>×</button>
                    </div>
                    <p className="request-email">{req.email}</p>
                    <div className="request-details">
                      <span><strong>Blend:</strong> {req.selectedBlend}</span>
                      <span><strong>Qty:</strong> {req.quantity} box{req.quantity > 1 ? 'es' : ''}</span>
                      <span className={`request-tier-badge tier-${req.tier.toLowerCase()}`}>{req.tier}</span>
                    </div>
                    {req.intent && (
                      <p className="request-intent">
                        <strong>Note:</strong> "{req.intent}"
                      </p>
                    )}
                    <span className="request-time">{req.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`main-content ${isAdmin ? 'admin-active' : ''}`}>
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
          <div className="logo" onClick={() => { navigateToView('home'); resetAllocationForm(); }} style={{ cursor: 'pointer' }}>ASHBORN</div>
          <ul className="nav-links">
            {view === 'home' ? (
              <>
                <li><a href="#philosophy" onClick={(e) => scrollToSection(e, 'philosophy')}>Heritage</a></li>
                <li><a href="#cinematic" onClick={(e) => scrollToSection(e, 'cinematic')}>Experience</a></li>
                <li><a href="#collection" onClick={(e) => scrollToSection(e, 'collection')}>Collection</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToView('allocation'); }} className="nav-alloc-btn">Request Allocation</a></li>
              </>
            ) : (
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToView('home'); resetAllocationForm(); }}>← Back to Heritage</a></li>
            )}
            <li>
              <a href="https://www.instagram.com/ashborntobacco_official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="nav-instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </li>
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {view === 'allocation' && (
              <a href="#" onClick={(e) => { e.preventDefault(); navigateToView('home'); resetAllocationForm(); }} className="mobile-back-link">Back</a>
            )}
            <a href="https://www.instagram.com/ashborntobacco_official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="mobile-nav-instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </nav>

        <div className={`view-transition-container ${fadeState}`}>
          {view === 'home' ? (
          <>
            <header className="hero" id="home">
              <HeroCanvas />
              <SmokeOverlay />
              <div className="hero-editorial-layout">
                <div className="hero-text-content">
                  <span id="field-heroEyebrow" className={`eyebrow hero-anim-1 ${activeField === 'heroEyebrow' ? 'edit-highlight' : ''}`} {...hoverProps('heroEyebrow')}>{content.heroEyebrow}</span>
                  <h1 id="field-heroTitle" className={`hero-anim-2 ${activeField === 'heroTitle' ? 'edit-highlight' : ''}`} style={{ whiteSpace: 'pre-line' }} {...hoverProps('heroTitle')}>{content.heroTitle}</h1>
                  <div className="hero-divider hero-anim-3"></div>
                  <p className="hero-subtext hero-anim-4">A dedication to time-honored tradition and absolute mastery. Discover the Ashborn collection.</p>
                  <div className="hero-actions hero-anim-4" style={{ marginTop: '2.5rem' }}>
                    <button onClick={() => navigateToView('allocation')} className="btn-premium">Request Allocation</button>
                  </div>
                </div>
                <div className="hero-image-wrapper hero-anim-img">
                  <img id="field-heroImage" src={content.heroImage} alt="Ashborn Hero" className={`hero-editorial-image ${activeField === 'heroImage' ? 'edit-highlight' : ''}`} {...hoverProps('heroImage')} />
                </div>
              </div>
              <div className="scroll-indicator hero-anim-5">Scroll to discover</div>
            </header>

            <section id="philosophy" className="philosophy section-padding">
              <div className="philosophy-grid container">
                <div className="reveal">
                  <span id="field-philEyebrow" className={`eyebrow ${activeField === 'philEyebrow' ? 'edit-highlight' : ''}`} {...hoverProps('philEyebrow')}>{content.philEyebrow}</span>
                  <h2 id="field-philTitle" className={activeField === 'philTitle' ? 'edit-highlight' : ''} style={{ whiteSpace: 'pre-line' }} {...hoverProps('philTitle')}>{content.philTitle}</h2>
                </div>
                <div className="reveal">
                  <p id="field-philText1" className={activeField === 'philText1' ? 'edit-highlight' : ''} {...hoverProps('philText1')}>{content.philText1}</p>
                  <p id="field-philText2" className={activeField === 'philText2' ? 'edit-highlight' : ''} {...hoverProps('philText2')}>{content.philText2}</p>
                </div>
              </div>
            </section>

            <section id="cinematic" className="cinematic-section section-padding">
              <div className="container cinematic-container reveal">
                <div className="cinematic-header text-center">
                  <span id="field-videoEyebrow" className={`eyebrow ${activeField === 'videoEyebrow' ? 'edit-highlight' : ''}`} {...hoverProps('videoEyebrow')}>{content.videoEyebrow}</span>
                  <h2 id="field-videoTitle" className={activeField === 'videoTitle' ? 'edit-highlight' : ''} style={{ whiteSpace: 'pre-line' }} {...hoverProps('videoTitle')}>{content.videoTitle}</h2>
                  <div className="cinematic-divider"></div>
                </div>
                
                <div id="field-videoCampaign" className={`video-player-wrapper ${activeField === 'videoCampaign' ? 'edit-highlight' : ''}`} {...hoverProps('videoCampaign')}>
                  <video
                    ref={videoRef}
                    key={videoUrl || 'default'}
                    src={videoUrl || DEFAULT_VIDEO_URL}
                    className="cinematic-video"
                    loop
                    muted={isMuted}
                    autoPlay
                    playsInline
                  />
                  <div className="video-controls-overlay">
                    <button className="video-control-btn play-pause-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                    <button className="video-control-btn mute-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                      {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM12 4L9.91 6.09 12 8.18V4zm6.5 8c0 2.94-1.81 5.46-4.38 6.47l1.09 1.09C18.44 18.23 20.5 15.36 20.5 12c0-4.28-3.22-7.81-7.38-8.5v2.02c3.04.67 5.38 3.39 5.38 6.48zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03a11.59 11.59 0 0 0 3.66-1.72l2.32 2.3 1.27-1.27L4.27 3z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section id="collection" className="collection section-padding">
              <div className="container collection-split-layout">
                <div className="collection-header reveal">
                  <span id="field-collEyebrow" className={`eyebrow ${activeField === 'collEyebrow' ? 'edit-highlight' : ''}`} {...hoverProps('collEyebrow')}>{content.collEyebrow}</span>
                  <h2 id="field-collTitle" className={activeField === 'collTitle' ? 'edit-highlight' : ''} {...hoverProps('collTitle')}>{content.collTitle}</h2>
                  <div className="collection-divider"></div>
                </div>
                
                <div className="collection-grid">
                  <div className="product-card reveal" style={{transitionDelay: '0s'}}>
                    <div className="image-container" {...hoverProps('cigar1Image')}>
                      <img id="field-cigar1Image" src={content.cigar1Image} alt={content.cigar1Name} className={`product-image ${activeField === 'cigar1Image' ? 'edit-highlight' : ''}`} />
                    </div>
                    <h3 id="field-cigar1Name" className={activeField === 'cigar1Name' ? 'edit-highlight' : ''} {...hoverProps('cigar1Name')}>{content.cigar1Name}</h3>
                    <p id="field-cigar1Desc" className={activeField === 'cigar1Desc' ? 'edit-highlight' : ''} {...hoverProps('cigar1Desc')}>{content.cigar1Desc}</p>
                    <button onClick={() => { setSelectedBlend(content.cigar1Name || 'No. 1 Classic'); navigateToView('allocation'); }} className="product-action-btn">Apply for Allocation</button>
                  </div>
                  
                  <div className="product-card reveal" style={{transitionDelay: '0.2s'}}>
                    <div className="image-container" {...hoverProps('cigar2Image')}>
                      <img id="field-cigar2Image" src={content.cigar2Image} alt={content.cigar2Name} className={`product-image ${activeField === 'cigar2Image' ? 'edit-highlight' : ''}`} />
                    </div>
                    <h3 id="field-cigar2Name" className={activeField === 'cigar2Name' ? 'edit-highlight' : ''} {...hoverProps('cigar2Name')}>{content.cigar2Name}</h3>
                    <p id="field-cigar2Desc" className={activeField === 'cigar2Desc' ? 'edit-highlight' : ''} {...hoverProps('cigar2Desc')}>{content.cigar2Desc}</p>
                    <button onClick={() => { setSelectedBlend(content.cigar2Name || 'No. 2 Reserve'); navigateToView('allocation'); }} className="product-action-btn">Apply for Allocation</button>
                  </div>
                  
                  <div className="product-card reveal" style={{transitionDelay: '0.4s'}}>
                    <div className="image-container" {...hoverProps('cigar3Image')}>
                      <img id="field-cigar3Image" src={content.cigar3Image} alt={content.cigar3Name} className={`product-image ${activeField === 'cigar3Image' ? 'edit-highlight' : ''}`} />
                    </div>
                    <h3 id="field-cigar3Name" className={activeField === 'cigar3Name' ? 'edit-highlight' : ''} {...hoverProps('cigar3Name')}>{content.cigar3Name}</h3>
                    <p id="field-cigar3Desc" className={activeField === 'cigar3Desc' ? 'edit-highlight' : ''} {...hoverProps('cigar3Desc')}>{content.cigar3Desc}</p>
                    <button onClick={() => { setSelectedBlend(content.cigar3Name || 'No. 3 Signature'); navigateToView('allocation'); }} className="product-action-btn">Apply for Allocation</button>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="allocation-section section-padding">
            <div className="allocation-container container reveal active">
              <div className="allocation-header text-center">
                <span id="field-allocEyebrow" className={`eyebrow ${activeField === 'allocEyebrow' ? 'edit-highlight' : ''}`} {...hoverProps('allocEyebrow')}>{content.allocEyebrow}</span>
                <h2 id="field-allocTitle" className={activeField === 'allocTitle' ? 'edit-highlight' : ''} {...hoverProps('allocTitle')}>{content.allocTitle}</h2>
                <div className="allocation-divider-center"></div>
                <p id="field-allocIntro" className={`allocation-intro ${activeField === 'allocIntro' ? 'edit-highlight' : ''}`} {...hoverProps('allocIntro')}>
                  {content.allocIntro}
                </p>
              </div>

              {submitted ? (
                <div className="allocation-success text-center">
                  <div className="success-icon">✓</div>
                  <h3>Request Registered</h3>
                  <p>
                    Thank you, {fullName}. Your request for the <strong>{selectedBlend}</strong> allocation ({quantity} box{quantity > 1 ? 'es' : ''}, {tier} Tier) has been submitted to the Private Allocation board.
                  </p>
                  <p className="success-note">
                    Applications are reviewed on a rolling basis. An email invitation containing access credentials will be sent to <strong>{email}</strong> should your request be approved by our curators.
                  </p>
                  <button type="button" className="btn-premium" onClick={() => { navigateToView('home'); resetAllocationForm(); }}>
                    Return to Experience
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAllocationSubmit} className="allocation-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Alexander Sterling" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        placeholder="e.g. alex@sterling.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Select Blend</label>
                    <div className="blend-cards-grid">
                      <div 
                        className={`blend-select-card ${selectedBlend === (content.cigar1Name || 'No. 1 Classic') ? 'active' : ''}`}
                        onClick={() => setSelectedBlend(content.cigar1Name || 'No. 1 Classic')}
                      >
                        <div className="blend-card-header">
                          <h4>{content.cigar1Name}</h4>
                          <span id="field-cigar1Availability" className={`blend-availability ${activeField === 'cigar1Availability' ? 'edit-highlight' : ''}`} {...hoverProps('cigar1Availability')}>{content.cigar1Availability}</span>
                        </div>
                        <p id="field-cigar1AllocDesc" className={`blend-desc ${activeField === 'cigar1AllocDesc' ? 'edit-highlight' : ''}`} {...hoverProps('cigar1AllocDesc')}>{content.cigar1AllocDesc}</p>
                      </div>

                      <div 
                        className={`blend-select-card ${selectedBlend === (content.cigar2Name || 'No. 2 Reserve') ? 'active' : ''}`}
                        onClick={() => setSelectedBlend(content.cigar2Name || 'No. 2 Reserve')}
                      >
                        <div className="blend-card-header">
                          <h4>{content.cigar2Name}</h4>
                          <span id="field-cigar2Availability" className={`blend-availability ${activeField === 'cigar2Availability' ? 'edit-highlight' : ''}`} {...hoverProps('cigar2Availability')}>{content.cigar2Availability}</span>
                        </div>
                        <p id="field-cigar2AllocDesc" className={`blend-desc ${activeField === 'cigar2AllocDesc' ? 'edit-highlight' : ''}`} {...hoverProps('cigar2AllocDesc')}>{content.cigar2AllocDesc}</p>
                      </div>

                      <div 
                        className={`blend-select-card ${selectedBlend === (content.cigar3Name || 'No. 3 Signature') ? 'active' : ''}`}
                        onClick={() => setSelectedBlend(content.cigar3Name || 'No. 3 Signature')}
                      >
                        <div className="blend-card-header">
                          <h4>{content.cigar3Name}</h4>
                          <span id="field-cigar3Availability" className={`blend-availability ${activeField === 'cigar3Availability' ? 'edit-highlight' : ''}`} {...hoverProps('cigar3Availability')}>{content.cigar3Availability}</span>
                        </div>
                        <p id="field-cigar3AllocDesc" className={`blend-desc ${activeField === 'cigar3AllocDesc' ? 'edit-highlight' : ''}`} {...hoverProps('cigar3AllocDesc')}>{content.cigar3AllocDesc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Requested Quantity (Boxes of 10)</label>
                      <div className="qty-selector">
                        <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Registry Tier</label>
                      <div className="tier-cards">
                        {['Connoisseur', 'Collector', 'Privé'].map((t) => (
                          <div 
                            key={t}
                            className={`tier-card ${tier === t ? 'active' : ''}`}
                            onClick={() => setTier(t)}
                          >
                            <h5>{t}</h5>
                            <span className="tier-hint">
                              {t === 'Connoisseur' && 'Standard Review'}
                              {t === 'Collector' && 'Priority Review'}
                              {t === 'Privé' && 'VIP Board Review'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Statement of Intent (Optional)</label>
                    <textarea 
                      placeholder="Briefly tell our curators why you wish to receive an allocation of these limited releases..." 
                      rows="4"
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="form-submit-container text-center">
                    <button type="submit" className="btn-premium">
                      Submit Request to Registry
                    </button>
                    <p className="submit-disclaimer">
                      *Submission of this application constitutes registration in the queue and does not constitute a transaction or guarantee of delivery.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        <footer className="footer">
          <div className="footer-brand">ASHBORN</div>
          <div className="footer-social-and-legal">
            <div className="footer-social">
              <a href="https://www.instagram.com/ashborntobacco_official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="instagram-footer-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>@ashborntobacco_official</span>
              </a>
            </div>
            <div className="footer-legal">&copy; 2026 Ashborn. All rights reserved.</div>
          </div>
        </footer>
        </div>
      </div>
    </>
  );
}

export default App;
