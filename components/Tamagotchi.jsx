'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../components/firebaseConfig';
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
        } bg-gray-800/95 shadow-lg z-50 p-6 text-sm overflow-y-auto backdrop-blur-md rounded-r-2xl`}
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
  // États pour Firebase et authentification
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // États du jeu
  const [animation, setAnimation] = useState(false);
  const [isOverfed, setIsOverfed] = useState(false);
  const [overfedTimeout, setOverfedTimeout] = useState(null);
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
  const OVERFEED_LIMIT = 6;

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
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      console.log("Auth result:", result);
      setUser(result.user);
      await loadSavedData(result.user.uid);
    } catch (error) {
      console.error("Erreur de connexion:", error);
    }
  };

  // Fonction pour obtenir l'état actuel
  const getState = (healthValue) => {
    console.log("État actuel:", {
      healthValue,
      isDead,
      isReviving,
      isShowering,
      isOverfed,
      animation
    });
    
    if (isDead) return 'dead';
    if (isReviving) return 'zombie';
    if (isShowering) return 'showering';
    if (isOverfed) return 'overfed';
    if (animation) return 'eating';
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
};

  // Fonction de chargement des données depuis Firebase
  const loadSavedData = async (userId) => {
    try {
      console.log("Chargement des données pour:", userId);
      const docRef = doc(db, 'saves', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Données chargées:", data);
        setHealth(data.health);
        setLastFed(data.lastFed);
        setLevel(data.level);
        setExperience(data.experience);
        setExperienceToNextLevel(data.experienceToNextLevel);
        setOverfeedCount(data.overfeedCount || 0);
        setIsOverfed(data.isOverfed || false);
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

const restartGame = () => {
  // Reset game states to initial values
  setHealth(100);
  setLastFed(Date.now());
  setIsDead(false);
  setIsReviving(false);
  setReviveStartTime(null);
  setLevel(1);
  setExperience(0);
  setExperienceToNextLevel(100);
  setOverfeedCount(0);
  setIsOverfed(false);
  setStats({
    totalFeeds: 0,
    totalShowers: 0,
    maxLevel: 1,
    totalRevives: 0,
    totalXP: 0
  });
  setSelectedBg(1);
  setLastShowerDate(null);

  // Close the confirmation modals
  setShowConfirmRestartAgain(false);
  setShowConfirmRestart(false);
};


  // Vérification de la disponibilité de la douche
  const canShower = () => {
    console.log("Vérification douche:", { lastShowerDate, now: new Date() });
    if (!lastShowerDate) return true;
    const lastShower = new Date(lastShowerDate);
    const now = new Date();
    return lastShower.getDate() !== now.getDate() || 
           lastShower.getMonth() !== now.getMonth() ||
           lastShower.getFullYear() !== now.getFullYear();
  };

// Fonction feed modifiée avec vérification de santé pour l'XP
const feed = () => {
  console.log("Feed appelé:", { health, isOverfed, overfeedCount, lastFed });

  if (!animation && !isDead && !isReviving && !isShowering) {
    setStats(prev => ({
      ...prev,
      totalFeeds: prev.totalFeeds + 1
    }));

    if (health === 100) {
      // Logique pour overfed
      const newOverfeedCount = overfeedCount + 1;
      console.log("Overfeed:", { newOverfeedCount });
      setOverfeedCount(newOverfeedCount);
      setIsOverfed(true);

      if (overfedTimeout) {
        clearTimeout(overfedTimeout);
      }

      const timeout = setTimeout(() => {
        console.log("Réinitialisation overfed");
        setIsOverfed(false);
      }, 3000);
      setOverfedTimeout(timeout);

      if (newOverfeedCount >= OVERFEED_LIMIT) {
        setIsDead(true);
        setHealth(0);
        setOverfeedCount(0);
      }
    } else {
      // Nourrir complètement le Tamagotchi
      setAnimation(true);
      setHealth(100);

      setTimeout(() => {
        setAnimation(false);
        // On ne donne de l'XP que si la santé n'était pas à 100 avant de nourrir
        const hoursSinceLastFed = (Date.now() - lastFed) / (1000 * 60 * 60);
        let experienceGained = 0;

        // Attribution d'XP basée sur le temps écoulé depuis le dernier repas
        if (hoursSinceLastFed <= 24) {
          experienceGained = 20;
        } else if (hoursSinceLastFed <= 48) {
          experienceGained = 10;
        } else if (hoursSinceLastFed <= 72) {
          experienceGained = 5;
        }

        if (experienceGained > 0) {
          addExperience(experienceGained);
        }
      }, 1000);
    }

    setLastFed(Date.now());
  }
};

const shower = () => {
  console.log("Douche appelée:", { canShower: canShower(), isShowering });
  
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

// Effet de résurrection
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
}, [isReviving, reviveStartTime, ZOMBIE_DURATION]);

// Effet pour réinitialiser overfeedCount
useEffect(() => {
  if (health < 100) {
    setOverfeedCount(0);
    setIsOverfed(false);
    if (overfedTimeout) {
      clearTimeout(overfedTimeout);
    }
  }
}, [health, overfedTimeout]);

// Effet pour nettoyer les timers
useEffect(() => {
  return () => {
    if (overfedTimeout) {
      clearTimeout(overfedTimeout);
    }
  };
}, [overfedTimeout]);

// Diminution de la santé
useEffect(() => {
  if (!isDead && !isReviving) {
    const timer = setInterval(() => {
      setHealth(prevHealth => {
        const hoursSinceLastFed = (Date.now() - lastFed) / (1000 * 60 * 60);

        if (hoursSinceLastFed <= 24) {
          return Math.max(80, prevHealth);
        } else if (hoursSinceLastFed <= 48) {
          return Math.max(40, prevHealth);
        } else if (hoursSinceLastFed <= 72) {
          return Math.max(20, prevHealth);
        } else {
          setIsDead(true);
          return 0;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }
}, [isDead, isReviving, lastFed]);

// Vérification de l'état de connexion
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user);
    setUser(user);
    if (user) {
      loadSavedData(user.uid);
    }
    setFirebaseInitialized(true);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

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
          isOverfed,
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
}, [health, lastFed, level, experience, experienceToNextLevel, isDead, stats, selectedBg, overfeedCount, lastShowerDate, isOverfed, user]);

// Écran de chargement
if (!firebaseInitialized || loading) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-white">Chargement...</div>
    </div>
  );
}

// Écran de connexion
if (!user) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center space-y-4">
        <h1 className="text-2xl text-white mb-4">Mon Tamagotchi</h1>
        <button 
          onClick={signInWithGoogle}
          className="bg-white text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
        >
          Se connecter avec Google
        </button>
      </div>
    </div>
  );
}

const currentState = animation ? 'eating' : getState(health);

// Interface principale
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
      className="relative w-full max-w-[800px] p-4 rounded-xl overflow-hidden shadow-xl bg-gray-800/30 backdrop-blur-sm"
      style={{
        backgroundImage: `url('/images/Backgrounds/bg${selectedBg}.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative z-10">
        {/* Boutons du haut */}
        <div className="flex justify-between mb-4">
          <button 
            onClick={() => setIsStatsOpen(true)}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors bg-white/20 backdrop-blur-sm
              border-b-4 border-r-4 border-l-2 border-t-2 border-gray-400/50
              transform active:translate-y-1 active:border-b-2"
          >
            📊
          </button>
          <button
            onClick={() => setShowConfirmRestart(true)} 
            className="p-2 rounded-lg hover:bg-opacity-80 bg-white/20 border-gray-400/50
              border-b-4 border-r-4 border-l-2 border-t-2
              transform active:translate-y-1 active:border-b-2"
          >
            ✖️
          </button>
        </div>

        {/* Zone de l'appartement avec le Tamagotchi */}
        <div className="relative aspect-video mb-4 bg-black/20 rounded-xl backdrop-blur-sm border-2 border-white/30">
          {/* Grille de l'appartement (pour plus tard) */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-0.5 opacity-10">
            {[...Array(48)].map((_, index) => (
              <div key={index} className="border border-white/20" />
            ))}
          </div>

          {/* Tamagotchi au centre */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img 
              src={states[currentState].image}
              alt="Tamagotchi"
              className="w-32 h-32"
            />
          </div>
        </div>
        
        {/* Description et état */}
        <p className="text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white">
          {states[currentState].description}
        </p>

        {/* Barre de santé */}
        <div className="w-full bg-black/30 rounded-full h-2.5 mb-2 backdrop-blur-sm">
          <div 
            className="bg-gradient-to-r from-pink-400 to-purple-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${isDead ? 0 : health}%` }}
          />
        </div>
        
        <div className="text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
          Santé: {isDead ? 0 : Math.round(health)}%
        </div>

        {/* Barre d'XP */}
        <div className="w-full bg-black/30 rounded-full h-2.5 mb-2 backdrop-blur-sm">
          <div 
            className="bg-gradient-to-r from-green-400 to-blue-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(experience / experienceToNextLevel) * 100}%` }}
          />
        </div>

        <div className="text-center space-y-1 mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2">
          <div className="text-xs text-white">
            Niveau {level}
          </div>
          <div className="text-xs text-white">
            XP: {experience}/{experienceToNextLevel}
          </div>
        </div>

        {/* Temps de résurrection */}
        {isReviving && (
          <div className="text-xs text-white text-center mb-4 bg-black/40 backdrop-blur-sm rounded-lg p-2">
            {(() => {
              const timeLeft = Math.max(0, Math.ceil(ZOMBIE_DURATION - ((Date.now() - reviveStartTime) / 1000)));
              const hours = Math.floor(timeLeft / 3600);
              const minutes = Math.floor((timeLeft % 3600) / 60);
              return `Résurrection dans ${hours}h ${minutes}m`;
            })()}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button 
            className={`flex-1 px-4 py-3 rounded-lg text-white
              transition-all duration-100
              border-b-4 border-r-4 border-l-2 border-t-2
              ${isDead 
                ? 'bg-purple-600 border-purple-900 hover:bg-purple-500' 
                : 'bg-pink-500 border-pink-700 hover:brightness-110'}
              transform active:translate-y-1 active:border-b-2
              disabled:opacity-50 disabled:cursor-not-allowed`}
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
              disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={shower}
            disabled={!canShower() || animation || isReviving || isDead || isShowering}
          >
            {isShowering ? `🚿 ${showerTimeLeft}s` : 'Douche'}
          </button>
        </div>
        
        {/* Message de disponibilité de la douche */}
        {showerAvailableMessage && (
          <div className="text-xs text-center mt-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 text-white">
            Douche disponible à nouveau demain
          </div>
        )}
      </div>
    </div>

    {/* Modales de confirmation */}
    {showConfirmRestart && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-gray-800/95 rounded-lg p-6 text-center">
          <p className="mb-4 text-white">Voulez-vous vraiment recommencer une nouvelle partie ?</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowConfirmRestartAgain(true)} 
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Oui
            </button>
            <button
              onClick={() => setShowConfirmRestart(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
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
          <p className="mb-4 text-white">Êtes-vous sûr de vouloir redémarrer ? Tout votre progrès sera perdu.</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={restartGame}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Oui, redémarrer
            </button>
            <button
              onClick={() => {
                setShowConfirmRestartAgain(false);
                setShowConfirmRestart(false);
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
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
