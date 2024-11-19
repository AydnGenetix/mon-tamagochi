'use client';
import { useState, useEffect } from 'react';
import { auth, db } from './firebaseConfig';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const StatsPanel = ({ isOpen, onClose, stats, level, selectedBg, onBgChange }) => {
  const getBgUnlockLevel = (bgNumber) => (bgNumber - 1) * 10;

  return (
  <>
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
    )}
    
    <div 
      className={`fixed left-0 top-0 h-full w-72 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-gray-800/95 shadow-lg z-50 p-6 text-sm overflow-y-auto backdrop-blur-md rounded-r-2xl font-early-gameboy`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-lg">
          ✨ Stats & Styles ✨
        </h2>
        <button 
          onClick={onClose}
          className="hover:opacity-70 text-lg"
        >
          ✖️
        </button>
      </div>
      
      <div className="space-y-3 mb-8">
        <div className="stat-item flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-800">
          <span>🍪 Repas donnés:</span>
          <span className="font-bold">{stats.totalFeeds}</span>
        </div>
        <div className="stat-item flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-800">
          <span>🚿 Douches prises:</span>
          <span className="font-bold">{stats.totalShowers}</span>
        </div>
        <div className="stat-item flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800">
          <span>⭐ Niveau max:</span>
          <span className="font-bold">{stats.maxLevel}</span>
        </div>
        <div className="stat-item flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-green-900/20 to-teal-900/20 border border-green-800">
          <span>🔄 Résurrections:</span>
          <span className="font-bold">{stats.totalRevives}</span>
        </div>
        <div className="stat-item flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-indigo-900/20 to-violet-900/20 border border-indigo-800">
          <span>✨ XP total:</span>
          <span className="font-bold">{stats.totalXP}</span>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <h3 className="font-bold mb-4 text-center">
          🎨 Backgrounds 🎨
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(20)].map((_, index) => {
            const bgNumber = index + 1;
            const unlockLevel = getBgUnlockLevel(bgNumber);
            const isUnlocked = level >= unlockLevel;

            return (
              <button
                key={bgNumber}
                onClick={() => isUnlocked && onBgChange(bgNumber)}
                className={`relative p-3 rounded-xl transition-all duration-200 ${
                  selectedBg === bgNumber 
                    ? 'ring-4 ring-pink-400 transform scale-105' 
                    : ''
                } ${
                  isUnlocked 
                    ? 'hover:transform hover:scale-105 hover:shadow-lg' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundImage: `url('/images/Backgrounds/bg${bgNumber}.jpeg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '80px'
                }}
                disabled={!isUnlocked}
              >
                <div className="absolute inset-0 rounded-xl bg-black/40"></div>
                <div className="relative z-10 text-center">
                  {!isUnlocked ? (
                    <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                      Niveau {unlockLevel}
                    </div>
                  ) : (
                    <div className="bg-white/60 text-black px-2 py-1 rounded-full text-xs">
                      Style {bgNumber}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </>
  );
};

export default function Tamagotchi() {
  // États pour l'authentification
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // États du jeu
  const [showConfirmRestart, setShowConfirmRestart] = useState(false);
  const [showConfirmRestartAgain, setShowConfirmRestartAgain] = useState(false);
  const [lastShowerDate, setLastShowerDate] = useState(null);
  const [showerAvailableMessage, setShowerAvailableMessage] = useState(false);
  const [isShowering, setIsShowering] = useState(false);
  const [showerTimeLeft, setShowerTimeLeft] = useState(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState(1);
  const [stats, setStats] = useState({
    totalFeeds: 0,
    totalShowers: 0,
    maxLevel: 1,
    totalRevives: 0,
    totalXP: 0
  });
  const [health, setHealth] = useState(100);
  const [lastFed, setLastFed] = useState(Date.now());
  const [animation, setAnimation] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isReviving, setIsReviving] = useState(false);
  const [reviveStartTime, setReviveStartTime] = useState(null);
  const [level, setLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [experienceToNextLevel, setExperienceToNextLevel] = useState(100);
  const [overfeedCount, setOverfeedCount] = useState(0);

  // Constantes
  const SHOWER_DURATION = 5;
  const ZOMBIE_DURATION = 14400; // 4 heures en secondes
  const XP_GAIN = 20;
  const SHOWER_XP_MULTIPLIER = 2;
  const OVERFEED_LIMIT = 10;

  // États du Tamagotchi
  const states = {
    dead: {
      image: '/images/7.gif',
      description: "Je suis mort... 💀"
    },
    zombie: {
      image: '/images/6.gif',
      description: "Je reviens à la vie... 🧟"
    },
    sad: {
      image: '/images/1.gif',
      description: "Je suis très triste... 😢"
    },
    bad: {
      image: '/images/2.gif',
      description: "J'ai vraiment faim... 😟"
    },
    ok: {
      image: '/images/4.gif',
      description: "Je vais bien ! 😊"
    },
    happy: {
      image: '/images/5.gif',
      description: "Je suis très heureux ! 😄"
    },
    eating: {
      image: '/images/3.gif',
      description: "Miam miam ! 😋"
    },
    showering: {
      image: '/images/8.gif',
      description: "Je me lave ! 🚿"
    },
    overfed: {
      image: '/images/9.gif',
      description: "Je suis trop nourri! 🤢"
    }
  };

  // Fonction de connexion Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      loadSavedData(result.user.uid);
    } catch (error) {
      console.error("Erreur de connexion:", error);
    }
  };

  // Fonction pour obtenir l'état actuel
  const getState = (healthValue) => {
    if (isDead) return 'dead';
    if (isReviving) return 'zombie';
    if (isShowering) return 'showering';
    if (animation) return 'eating';
    if (overfeedCount > 0 && health >= 100) return 'overfed';
    if (healthValue <= 20) return 'sad';
    if (healthValue <= 50) return 'bad';
    if (healthValue <= 80) return 'ok';
    return 'happy';
  };

  // Calcul de l'expérience requise pour le niveau suivant
  const calculateExperienceToNextLevel = (currentLevel) => {
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  };

  // Gestion de l'ajout d'expérience
  const addExperience = (amount) => {
    if (health < 100) {
      setStats(prev => ({
        ...prev,
        totalXP: prev.totalXP + amount
      }));
      setExperience(prev => {
        const newExp = prev + amount;
        if (newExp >= experienceToNextLevel) {
          const newLevel = level + 1;
          setLevel(newLevel);
          setStats(prev => ({
            ...prev,
            maxLevel: Math.max(prev.maxLevel, newLevel)
          }));
          setExperienceToNextLevel(calculateExperienceToNextLevel(newLevel));
          return newExp - experienceToNextLevel;
        }
        return newExp;
      });
    }
  };

  // Fonction de chargement des données depuis Firebase
  const loadSavedData = async (userId) => {
    try {
      const docRef = doc(db, 'saves', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setHealth(data.health);
        setLastFed(data.lastFed);
        setLevel(data.level);
        setExperience(data.experience);
        setExperienceToNextLevel(data.experienceToNextLevel);
        setOverfeedCount(data.overfeedCount || 0);
        setStats(data.stats);
        setSelectedBg(data.selectedBg);
        if (data.lastShowerDate) {
          setLastShowerDate(data.lastShowerDate);
        }
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  // Vérification de la disponibilité de la douche
  const canShower = () => {
    if (!lastShowerDate) return true;
    const lastShower = new Date(lastShowerDate);
    const now = new Date();
    return lastShower.getDate() !== now.getDate() || 
           lastShower.getMonth() !== now.getMonth() ||
           lastShower.getFullYear() !== now.getFullYear();
  };

  // Sauvegarde automatique dans Firebase
  useEffect(() => {
    if (user && !isDead) {
      const saveGameState = async () => {
        try {
          const dataToSave = {
            health,
            lastFed,
            level,
            experience,
            experienceToNextLevel,
            overfeedCount,
            stats,
            selectedBg,
            lastShowerDate,
            lastUpdate: Date.now()
          };
          
          await setDoc(doc(db, 'saves', user.uid), dataToSave);
        } catch (error) {
          console.error('Erreur de sauvegarde:', error);
        }
      };

      const saveTimeout = setTimeout(saveGameState, 1000);
      return () => clearTimeout(saveTimeout);
    }
  }, [health, lastFed, level, experience, experienceToNextLevel, isDead, stats, selectedBg, overfeedCount, lastShowerDate, user]);

  // Fonction de nourriture
  const feed = () => {
    if (!animation && !isDead && !isReviving && !isShowering) {
      setAnimation(true);
      
      if (health >= 100) {
        setOverfeedCount(prev => {
          const newCount = prev + 1;
          if (newCount >= OVERFEED_LIMIT) {
            setTimeout(() => {
              setIsDead(true);
              setHealth(0);
            }, 1000);
          }
          return newCount;
        });
      } else {
        setHealth(prev => Math.min(100, prev + 15));
        setOverfeedCount(0);
      }

      setStats(prev => ({
        ...prev,
        totalFeeds: prev.totalFeeds + 1
      }));

      setTimeout(() => {
        setLastFed(Date.now());
        setAnimation(false);
        if (health < 100) {
          addExperience(XP_GAIN);
        }
      }, 1000);
    }
  };

  // Fonction de douche
  const shower = () => {
    if (canShower() && !animation && !isDead && !isReviving && !isShowering) {
      setIsShowering(true);
      setShowerTimeLeft(SHOWER_DURATION);
      setStats(prev => ({
        ...prev,
        totalShowers: prev.totalShowers + 1
      }));

      const timer = setInterval(() => {
        setShowerTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            addExperience(XP_GAIN * SHOWER_XP_MULTIPLIER);
            setIsShowering(false);
            setLastShowerDate(new Date().toISOString());
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!canShower()) {
      setShowerAvailableMessage(true);
      setTimeout(() => {
        setShowerAvailableMessage(false);
      }, 3000);
    }
  };

// Fonction de résurrection modifiée
  const revive = () => {
    if (isDead) {
      setStats(prev => ({
        ...prev,
        totalRevives: prev.totalRevives + 1
      }));
      // Perte d'un niveau à la mort
      setLevel(prevLevel => Math.max(1, prevLevel - 1));
      setExperience(0);
      setExperienceToNextLevel(calculateExperienceToNextLevel(Math.max(1, level - 1)));
      setOverfeedCount(0);
      setIsDead(false);
      setIsReviving(true);
      setReviveStartTime(Date.now());
    }
  };

  // Reset du progrès
  const resetProgress = () => {
    setLevel(1);
    setExperience(0);
    setExperienceToNextLevel(100);
    setOverfeedCount(0);
  };

  // Redémarrage du jeu
  const restartGame = () => {
    setStats({
      totalFeeds: 0,
      totalShowers: 0,
      maxLevel: 1,
      totalRevives: 0,
      totalXP: 0
    });
    setHealth(100);
    setLastFed(Date.now());
    setAnimation(false);
    setIsDead(false);
    setIsReviving(false);
    setReviveStartTime(null);
    setLevel(1);
    setExperience(0);
    setExperienceToNextLevel(100);
    setSelectedBg(1);
    setOverfeedCount(0);
    setShowConfirmRestart(false);
    setShowConfirmRestartAgain(false);
  };

  // Effet de résurrection (4 heures)
  useEffect(() => {
    if (isReviving && reviveStartTime) {
      const timer = setInterval(() => {
        const timeSinceRevive = (Date.now() - reviveStartTime) / 1000;
        if (timeSinceRevive >= ZOMBIE_DURATION) {
          setIsReviving(false);
          setHealth(50);
          setLastFed(Date.now());
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isReviving, reviveStartTime]);

  // Effet pour réinitialiser overfeedCount quand la santé descend
  useEffect(() => {
    if (health < 100) {
      setOverfeedCount(0);
    }
  }, [health]);

  // Diminution de la santé (50% en 24h, mort en 48h)
  useEffect(() => {
    if (!isDead && !isReviving) {
      const timer = setInterval(() => {
        setHealth(prevHealth => {
          const hoursSinceLastFed = (Date.now() - lastFed) / (1000 * 60 * 60);
          // Perte linéaire : 50% en 24h, donc environ 2.083% par heure
          const decrease = (2.083 / 60); // Par minute pour une mise à jour plus fluide
          
          const newHealth = Math.max(0, prevHealth - decrease);
          
          if (newHealth <= 0 && !isDead) {
            setIsDead(true);
            return 0;
          }
          return newHealth;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isDead, isReviving, lastFed]);

  // Vérification de l'état de connexion au chargement
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadSavedData(user.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <h1 className="text-2xl text-white mb-4 font-early-gameboy">Mon Tamagotchi</h1>
          <button 
            onClick={signInWithGoogle}
            className="bg-white text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-colors font-early-gameboy"
          >
            Se connecter avec Google
          </button>
        </div>
      </div>
    );
  }

  const currentState = animation ? 'eating' : getState(health);

  return (
    <div className="w-full h-full flex items-center justify-center p-2 bg-gray-900">
      <StatsPanel 
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        level={level}
        selectedBg={selectedBg}
        onBgChange={setSelectedBg}
      />

      <div 
        className="relative w-full max-w-[320px] p-4 rounded-xl overflow-hidden shadow-xl bg-gray-800/30 backdrop-blur-sm"
        style={{
          backgroundImage: `url('/images/Backgrounds/bg${selectedBg}.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="relative z-10">
          <div className="flex justify-between mb-4">
            <button 
              onClick={() => setIsStatsOpen(true)}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors bg-white/20 backdrop-blur-sm
                border-b-4 border-r-4 border-l-2 border-t-2 border-gray-400/50
                transform active:translate-y-1 active:border-b-2 font-early-gameboy"
            >
              📊
            </button>
            <button
              onClick={() => setShowConfirmRestart(true)} 
              className="p-2 rounded-lg hover:bg-opacity-80 bg-white/20 border-gray-400/50
                border-b-4 border-r-4 border-l-2 border-t-2
                transform active:translate-y-1 active:border-b-2 font-early-gameboy"
            >
              ✖️
            </button>
          </div>

          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-1 rounded-xl backdrop-blur-sm border-2 border-white/30">
              <img 
                src={states[currentState].image}
                alt="Tamagotchi"
                className="w-32 h-32"
              />
            </div>
          </div>
          
          <p className="text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white font-early-gameboy">
            {states[currentState].description}
          </p>

          <div className="w-full bg-black/30 rounded-full h-2.5 mb-2 backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-pink-400 to-purple-400 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${isDead ? 0 : health}%` }}
            />
          </div>
          
          <div className="text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white text-xs font-early-gameboy">
            Santé: {isDead ? 0 : Math.round(health)}%
          </div>

          <div className="w-full bg-black/30 rounded-full h-2.5 mb-2 backdrop-blur-sm">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(experience / experienceToNextLevel) * 100}%` }}
            />
          </div>

          <div className="text-center space-y-1 mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2">
            <div className="text-xs text-white font-early-gameboy">
              Niveau {level}
            </div>
            <div className="text-xs text-white font-early-gameboy">
              XP: {experience}/{experienceToNextLevel}
            </div>
          </div>

          {isReviving && (
            <div className="text-xs text-white text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 font-early-gameboy">
              {(() => {
                const timeLeft = Math.max(0, Math.ceil(ZOMBIE_DURATION - ((Date.now() - reviveStartTime) / 1000)));
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                return `Résurrection dans ${hours}h ${minutes}m`;
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <button 
              className={`flex-1 px-4 py-3 rounded-lg text-white
                transition-all duration-100
                border-b-4 border-r-4 border-l-2 border-t-2
                ${isDead 
                  ? 'bg-purple-600 border-purple-900 hover:bg-purple-500' 
                  : 'bg-pink-500 border-pink-700 hover:brightness-110'}
                transform active:translate-y-1 active:border-b-2
                disabled:opacity-50 disabled:cursor-not-allowed
                font-early-gameboy`}
              onClick={isDead ? revive : feed}
              disabled={animation || isReviving || isShowering}
            >
              {isDead ? 'Ressusciter' : (isReviving ? 'En cours...' : (animation ? 'Miam...' : 'Nourrir'))}
            </button>

            <button 
              className={`px-4 py-3 rounded-lg text-white
                transition-all duration-100
                border-b-4 border-r-4 border-l-2 border-t-2
                ${canShower() 
                  ? 'bg-blue-500 border-blue-700 hover:brightness-110' 
                  : 'bg-gray-500 border-gray-700'}
                transform active:translate-y-1 active:border-b-2
                disabled:opacity-50 disabled:cursor-not-allowed
                font-early-gameboy`}
              onClick={shower}
              disabled={!canShower() || animation || isReviving || isDead || isShowering}
            >
              {isShowering ? `🚿 ${showerTimeLeft}s` : 'Douche'}
            </button>
          </div>
          
          {showerAvailableMessage && (
            <div className="text-xs text-center mt-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white font-early-gameboy">
              Douche disponible à nouveau demain
            </div>
          )}
        </div>
      </div>

      {showConfirmRestart && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-800/95 rounded-lg p-6 text-center">
            <p className="mb-4 text-white font-early-gameboy">Voulez-vous vraiment recommencer une nouvelle partie ?</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowConfirmRestartAgain(true)} 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-early-gameboy"
              >
                Oui
              </button>
              <button
                onClick={() => setShowConfirmRestart(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-early-gameboy"
              >
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmRestartAgain && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-800/95 rounded-lg p-6 text-center">
            <p className="mb-4 text-white font-early-gameboy">Êtes-vous sûr de vouloir redémarrer ? Tout votre progrès sera perdu.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={restartGame}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-early-gameboy"
              >
                Oui, redémarrer
              </button>
              <button
                onClick={() => {
                  setShowConfirmRestartAgain(false);
                  setShowConfirmRestart(false);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-early-gameboy"
              >
                Annuler
              </button>
            </div>
          </div>  
        </div>
      )}
    </div>
  );
}